import type { LearningMissionId } from "../domain/learning-journey";

const MISSION_COST: Readonly<Record<LearningMissionId, number>> = {
  apartment_construction: 450_000,
  hospital_construction: 780_000,
  urban_repair: 160_000,
};

export function deriveCityState(completedMissionIds: readonly LearningMissionId[]) {
  const completed = new Set(completedMissionIds);
  const spent = [...completed].reduce((sum, missionId) => sum + MISSION_COST[missionId], 0);
  return {
    completed: completed.size,
    day: 1 + completed.size,
    budget: 2_400_000 - spent,
    health: 72 + completed.size * 8,
  };
}
