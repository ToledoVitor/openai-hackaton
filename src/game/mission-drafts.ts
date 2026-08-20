import type { LearningMissionId } from "../domain/learning-journey";

/** Browser-session drafts only. Deliberately never serializes user prompt text. */
export function createMissionDrafts() {
  const drafts = new Map<LearningMissionId, string>();

  return {
    read(missionId: LearningMissionId): string {
      return drafts.get(missionId) ?? "";
    },
    save(missionId: LearningMissionId, draft: string): void {
      drafts.set(missionId, draft);
    },
    clear(): void {
      drafts.clear();
    },
  };
}
