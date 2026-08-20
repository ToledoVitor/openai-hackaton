import type { RealtimeVoice } from './realtime';

export type VoiceClient = Pick<RealtimeVoice, 'isConnected' | 'connect' | 'disconnect'>;
type VoiceModule = { RealtimeVoice: new () => VoiceClient };
type VoiceLoader = () => Promise<VoiceModule>;

export function createLazyVoice(load: VoiceLoader = () => import('./realtime')) {
  let instance: VoiceClient | null = null;
  return {
    current: () => instance,
    async get() {
      if (instance) return instance;
      const { RealtimeVoice } = await load();
      instance = new RealtimeVoice();
      return instance;
    },
  };
}
