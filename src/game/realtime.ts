import type { RealtimeSessionRequest } from '../domain/mission-contracts';
import { requestRealtimeCredential } from '../client/realtime-credential';
import { classifyVoiceFailure, type VoiceUiState } from './voice-state';

type VoiceCallbacks = {
  onState: (state: Exclude<VoiceUiState, 'ready'> | 'closed') => void;
  onMayorText: (text: string) => void;
  onPrompt: (prompt: string) => Promise<unknown>;
};

type RealtimeVoiceDependencies = {
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  requestCredential: typeof requestRealtimeCredential;
};

type RealtimeEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  response?: { output?: Array<{
    type?: string;
    name?: string;
    call_id?: string;
    arguments?: string;
  }> };
};

export class RealtimeVoice {
  private peer: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private stream: MediaStream | null = null;
  private audio: HTMLAudioElement | null = null;
  private callbacks: VoiceCallbacks | null = null;
  private transcript = '';
  private connectionId = 0;

  constructor(private readonly dependencies: Partial<RealtimeVoiceDependencies> = {}) {}

  isConnected() {
    return this.channel?.readyState === 'open';
  }

  async connect(playerName: string, session: RealtimeSessionRequest, callbacks: VoiceCallbacks) {
    if (this.isConnected()) return;
    const connectionId = ++this.connectionId;
    this.callbacks = callbacks;
    callbacks.onState('connecting');

    try {
      const getUserMedia = this.dependencies.getUserMedia
        ?? navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
      if (!getUserMedia) {
        callbacks.onState('unavailable');
        return;
      }
      const stream = await getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (connectionId !== this.connectionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      const token = await (this.dependencies.requestCredential ?? requestRealtimeCredential)(session);
      if (connectionId !== this.connectionId) return;

      const peer = new RTCPeerConnection();
      this.peer = peer;
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', 'true');
      document.body.append(audio);
      this.audio = audio;
      peer.ontrack = (event) => {
        audio.srcObject = event.streams[0] ?? new MediaStream([event.track]);
        void audio.play().catch(() => undefined);
      };

      for (const track of stream.getAudioTracks()) peer.addTrack(track, stream);

      const channel = peer.createDataChannel('oai-events');
      this.channel = channel;
      channel.addEventListener('message', (event) => {
        try {
          void this.handleEvent(JSON.parse(String(event.data)) as RealtimeEvent);
        } catch {
          callbacks.onState('error');
        }
      });

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (connectionId !== this.connectionId) return;
      const answerResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: { Authorization: `Bearer ${token.value}`, 'Content-Type': 'application/sdp' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!answerResponse.ok) throw new Error('realtime_connection_failed');
      if (connectionId !== this.connectionId) return;
      await peer.setRemoteDescription({ type: 'answer', sdp: await answerResponse.text() });
      await this.waitForChannel(channel);

      callbacks.onState('listening');
      this.send({
        type: 'conversation.item.create',
        item: {
          type: 'message', role: 'user', content: [{
            type: 'input_text',
            text: `[GAME CONTEXT] Player name: ${playerName}. Introduce current mission in configured language. Do not call a tool yet.`,
          }],
        },
      });
      this.send({ type: 'response.create', response: { tool_choice: 'none' } });
    } catch (error) {
      if (connectionId !== this.connectionId) return;
      callbacks.onState(classifyVoiceFailure(error));
      this.disconnect(false);
    }
  }

  disconnect(notify = true) {
    this.connectionId += 1;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.channel?.close();
    this.peer?.close();
    this.audio?.remove();
    this.stream = null;
    this.channel = null;
    this.peer = null;
    this.audio = null;
    if (notify) this.callbacks?.onState('closed');
  }

  private async handleEvent(event: RealtimeEvent) {
    if (event.type === 'response.created') {
      this.transcript = '';
      this.callbacks?.onState('speaking');
    }
    if (event.type === 'response.output_audio_transcript.delta' && event.delta) {
      this.transcript += event.delta;
      this.callbacks?.onMayorText(this.transcript);
    }
    if (event.type === 'response.output_audio_transcript.done' && event.transcript) {
      this.callbacks?.onMayorText(event.transcript);
    }
    if (event.type === 'response.done') {
      let usedTool = false;
      for (const output of event.response?.output ?? []) {
        if (output.type !== 'function_call' || output.name !== 'submit_prompt' || !output.call_id) continue;
        usedTool = true;
        let prompt = '';
        try {
          const args = JSON.parse(output.arguments ?? '{}') as { prompt?: unknown };
          if (typeof args.prompt === 'string') prompt = args.prompt.slice(0, 600);
        } catch {
          prompt = '';
        }
        const result = prompt ? await this.callbacks?.onPrompt(prompt) : { error: 'invalid_request' };
        this.send({
          type: 'conversation.item.create',
          item: { type: 'function_call_output', call_id: output.call_id, output: JSON.stringify(result) },
        });
      }
      if (usedTool) this.send({ type: 'response.create' });
      else this.callbacks?.onState('listening');
    }
    if (event.type === 'error') this.callbacks?.onState('error');
  }

  private send(event: unknown) {
    if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(event));
  }

  private waitForChannel(channel: RTCDataChannel) {
    if (channel.readyState === 'open') return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('realtime_channel_timeout')), 8_000);
      channel.addEventListener('open', () => { window.clearTimeout(timeout); resolve(); }, { once: true });
      channel.addEventListener('error', () => { window.clearTimeout(timeout); reject(new Error('realtime_channel_error')); }, { once: true });
    });
  }
}
