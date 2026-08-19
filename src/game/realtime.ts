type VoiceAction = (name: string, args: Record<string, unknown>) => Promise<unknown> | unknown;

type VoiceCallbacks = {
  onState: (state: 'connecting' | 'listening' | 'speaking' | 'paused' | 'error') => void;
  onMayorText: (text: string) => void;
  onAction: VoiceAction;
};

type RealtimeEvent = {
  type?: string;
  delta?: string;
  transcript?: string;
  response?: {
    output?: Array<{
      type?: string;
      name?: string;
      call_id?: string;
      arguments?: string;
    }>;
  };
};

export class RealtimeVoice {
  private peer: RTCPeerConnection | null = null;
  private channel: RTCDataChannel | null = null;
  private stream: MediaStream | null = null;
  private audio: HTMLAudioElement | null = null;
  private callbacks: VoiceCallbacks | null = null;
  private paused = false;
  private muted = true;
  private transcript = '';

  async connect(playerName: string, callbacks: VoiceCallbacks) {
    this.callbacks = callbacks;
    callbacks.onState('connecting');

    try {
      const safetyIdentifier = this.safetyIdentifier();
      const tokenResponse = await fetch('/api/realtime-token', {
        method: 'POST',
        headers: { 'x-safety-identifier': safetyIdentifier },
      });
      if (!tokenResponse.ok) throw new Error('token');
      const token = await tokenResponse.json() as { value?: string };
      if (!token.value) throw new Error('token');

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

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.stream = stream;
      this.applyMicrophone();
      for (const track of stream.getAudioTracks()) peer.addTrack(track, stream);

      const channel = peer.createDataChannel('oai-events');
      this.channel = channel;
      channel.addEventListener('message', (event) => void this.handleEvent(JSON.parse(event.data) as RealtimeEvent));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const answerResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'application/sdp',
        },
      });
      if (!answerResponse.ok) throw new Error('webrtc');
      await peer.setRemoteDescription({ type: 'answer', sdp: await answerResponse.text() });
      await this.waitForChannel(channel);
      this.applyMicrophone();

      callbacks.onState('listening');
      this.send({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text: `[CONTEXTO DO JOGO] O jogador se chama ${playerName}. O jogo começou. Faça só a abertura: cumprimente, diga que vocês vão construir uma escola e peça que ele descreva a escola. Não chame ferramenta. Espere a resposta.`,
          }],
        },
      });
      this.send({
        type: 'response.create',
        response: { tool_choice: 'none' },
      });
    } catch {
      callbacks.onState('error');
      this.disconnect();
    }
  }

  startMission(_index: number) {
    if (!this.channel || this.channel.readyState !== 'open') return;
    const text = '[CONTEXTO DO JOGO] Retome a missão A Nova Escola exatamente do ponto atual.';
    this.send({
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
    });
    this.send({ type: 'response.create' });
  }

  togglePause() {
    this.paused = !this.paused;
    this.applyMicrophone();
    if (this.paused) {
      this.send({ type: 'response.cancel' });
      this.audio?.pause();
      this.callbacks?.onState('paused');
    } else {
      void this.audio?.play();
      this.callbacks?.onState('listening');
    }
    return this.paused;
  }

  toggleMute() {
    this.muted = !this.muted;
    this.applyMicrophone();
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  disconnect() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.channel?.close();
    this.peer?.close();
    this.audio?.remove();
    this.stream = null;
    this.channel = null;
    this.peer = null;
    this.audio = null;
  }

  private applyMicrophone() {
    const live = !this.muted && !this.paused;
    this.stream?.getAudioTracks().forEach((track) => { track.enabled = live; });
    this.peer?.getSenders().forEach((sender) => {
      if (sender.track?.kind === 'audio') sender.track.enabled = live;
    });
    if (!live && this.channel?.readyState === 'open') {
      this.send({ type: 'input_audio_buffer.clear' });
    }
  }

  private async handleEvent(event: RealtimeEvent) {
    if (event.type === 'input_audio_buffer.speech_started') {
      if (this.muted || this.paused) {
        this.send({ type: 'input_audio_buffer.clear' });
        return;
      }
      this.callbacks?.onState('listening');
    }
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
        if (output.type !== 'function_call' || !output.name || !output.call_id) continue;
        usedTool = true;
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(output.arguments ?? '{}') as Record<string, unknown>; } catch { /* empty args */ }
        const result = await this.callbacks?.onAction(output.name, args);
        this.send({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: output.call_id,
            output: JSON.stringify(result ?? { ok: true }),
          },
        });
      }
      if (usedTool) this.send({ type: 'response.create' });
      else if (!this.paused) this.callbacks?.onState('listening');
    }
    if (event.type === 'error') this.callbacks?.onState('error');
  }

  private send(event: unknown) {
    if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify(event));
  }

  private waitForChannel(channel: RTCDataChannel) {
    if (channel.readyState === 'open') return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('channel')), 8_000);
      channel.addEventListener('open', () => { window.clearTimeout(timeout); resolve(); }, { once: true });
      channel.addEventListener('error', () => { window.clearTimeout(timeout); reject(new Error('channel')); }, { once: true });
    });
  }

  private safetyIdentifier() {
    const key = 'ai-city-safety-id';
    try {
      const current = localStorage.getItem(key);
      if (current) return current;
      const created = `aicity_${crypto.randomUUID().replaceAll('-', '')}`;
      localStorage.setItem(key, created);
      return created;
    } catch {
      return `aicity_${crypto.randomUUID().replaceAll('-', '')}`;
    }
  }
}
