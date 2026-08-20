import type { LearningMissionId } from "../domain/learning-journey";

type DisconnectableVoice = { disconnect(notify?: boolean): void };
export type VoiceScopeToken = Readonly<{ requestId: number; missionId: LearningMissionId }>;

export function createVoiceScope() {
  let requestId = 0;
  let voice: DisconnectableVoice | null = null;

  return {
    begin(missionId: LearningMissionId): VoiceScopeToken {
      requestId += 1;
      return { requestId, missionId };
    },
    attach(token: VoiceScopeToken, nextVoice: DisconnectableVoice) {
      if (token.requestId !== requestId) {
        nextVoice.disconnect(false);
        return false;
      }
      voice = nextVoice;
      return true;
    },
    isCurrent(token: VoiceScopeToken, missionId: LearningMissionId) {
      return token.requestId === requestId && token.missionId === missionId;
    },
    stop() {
      requestId += 1;
      voice?.disconnect(false);
      voice = null;
    },
  };
}

export function stopVoiceInteraction(
  scope: Pick<ReturnType<typeof createVoiceScope>, "stop">,
  audio?: { endVoice(): void },
) {
  scope.stop();
  audio?.endVoice();
  return "ready" as const;
}
