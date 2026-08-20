import type {
  EffectKey,
  Language,
  MissionId,
  MissionStepId,
} from "../mission-contracts";

export type MissionDefinition = {
  id: MissionId;
  steps: readonly MissionStepId[];
  paths: readonly string[];
  criteria: readonly string[];
  criteriaByStep: Readonly<Record<string, readonly string[]>>;
  choiceCriterion: string;
  choiceDependentCriteria?: readonly string[];
  teachingConcept: Readonly<Record<Language, string>>;
  instructions: Readonly<Record<Language, string>>;
  failureEffectByCriterion: Readonly<Record<string, EffectKey>>;
  successEffectByPath: Readonly<Record<string, EffectKey>>;
};
