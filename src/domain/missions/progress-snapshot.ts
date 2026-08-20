import { MISSION_IDS, MISSION_PATHS, type MissionId } from "../mission-contracts";
import { getMissionDefinition } from "./mission-registry";

export type MissionCriteriaSnapshot = Readonly<Partial<Record<MissionId, readonly string[]>>>;
export type MissionChoiceSnapshot = Readonly<Partial<Record<MissionId, string>>>;
export type MissionProgressSnapshot = {
  completedMissionIds: readonly import("../learning-journey").LearningMissionId[];
  criteria: MissionCriteriaSnapshot;
  choices: MissionChoiceSnapshot;
};

export function canonicalMissionCriteria(values: MissionCriteriaSnapshot): Partial<Record<MissionId, string[]>> {
  return Object.fromEntries(MISSION_IDS.flatMap((missionId) => {
    const allowed = getMissionDefinition(missionId).criteria;
    const actual = new Set(values[missionId]?.filter((criterion): criterion is string =>
      typeof criterion === "string" && allowed.includes(criterion),
    ) ?? []);
    const criteria = allowed.filter((criterion) => actual.has(criterion));
    return criteria.length === 0 ? [] : [[missionId, criteria] as const];
  })) as Partial<Record<MissionId, string[]>>;
}

export function canonicalMissionChoices(values: MissionChoiceSnapshot): Partial<Record<MissionId, string>> {
  return Object.fromEntries(MISSION_IDS.flatMap((missionId) => {
    const choice = values[missionId];
    return typeof choice === "string" && MISSION_PATHS[missionId].includes(choice)
      ? [[missionId, choice] as const]
      : [];
  })) as Partial<Record<MissionId, string>>;
}

export function isCanonicalMissionCriteria(values: unknown): values is MissionCriteriaSnapshot {
  if (typeof values !== "object" || values === null || Array.isArray(values)) return false;
  const record = values as Record<string, unknown>;
  if (!Object.keys(record).every((missionId) => MISSION_IDS.includes(missionId as MissionId))) return false;
  const canonical = canonicalMissionCriteria(record as MissionCriteriaSnapshot);
  return JSON.stringify(record) === JSON.stringify(canonical);
}

export function isCanonicalMissionChoices(values: unknown): values is MissionChoiceSnapshot {
  if (typeof values !== "object" || values === null || Array.isArray(values)) return false;
  const record = values as Record<string, unknown>;
  if (!Object.keys(record).every((missionId) => MISSION_IDS.includes(missionId as MissionId))) return false;
  const canonical = canonicalMissionChoices(record as MissionChoiceSnapshot);
  return JSON.stringify(record) === JSON.stringify(canonical);
}
