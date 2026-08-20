import {
  completeLearningMission,
  type JourneyError,
  type JourneyState,
  type LearningMissionId,
} from "../domain/learning-journey";
import type { EvaluateMissionResponse, Language } from "../domain/mission-contracts";

type ResolveMissionEvaluationInput = {
  journey: JourneyState;
  requestMissionId: LearningMissionId;
  requestLanguage: Language;
  currentLanguage: Language;
  status: EvaluateMissionResponse["status"];
};

export function resolveMissionEvaluation(input: ResolveMissionEvaluationInput): {
  journey: JourneyState;
  shouldPresent: boolean;
  completionError: JourneyError | null;
} {
  const shouldPresent = input.journey.activeMissionId === input.requestMissionId
    && input.currentLanguage === input.requestLanguage;
  if (input.status !== "success") {
    return { journey: input.journey, shouldPresent, completionError: null };
  }

  const completion = completeLearningMission(
    input.journey,
    input.requestMissionId,
    input.status,
  );
  return {
    journey: completion.state,
    shouldPresent,
    completionError: completion.error,
  };
}
