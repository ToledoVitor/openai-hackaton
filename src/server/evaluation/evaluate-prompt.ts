import {
  type EvaluationRequest,
  type PromptExtraction,
  promptExtractionSchema,
  type TurnResult,
} from "../../domain/contracts";
import type {
  EvaluateMissionRequest,
  EvaluateMissionResponse,
  MissionExtraction,
  TemperatureTrial,
} from "../../domain/mission-contracts";
import { selectFallback } from "../../domain/fallback-bank";
import { evaluateMission } from "../../domain/missions/evaluate-mission";
import { fallbackMissionExtraction } from "../../domain/missions/fallback";
import { getMissionDefinition } from "../../domain/missions/mission-registry";
import { evaluateQuest } from "../../domain/quest-engine";

export interface ModerationGateway {
  isFlagged(prompt: string): Promise<boolean>;
}

export interface ExtractionGateway {
  extract(prompt: string, safetyIdentifier: string): Promise<unknown>;
}

export interface MissionExtractionGateway {
  extractMission(request: EvaluateMissionRequest): Promise<MissionExtraction>;
}

export interface TemperatureTrialGateway {
  run(request: EvaluateMissionRequest): Promise<TemperatureTrial>;
}

const FLAGGED_EXTRACTION: PromptExtraction = {
  offTopic: true,
  promptBlueprint: { goal: false, context: false, constraints: false, output: false },
  civicTraits: { accessibleEntrance: false, clearSign: false, weatherCover: false },
  evidence: [],
  citizenLine: "Let’s return to the Town Hall project and make the civic plan more useful.",
  nextHint: "playfulRedirect",
};

export async function evaluatePrompt(
  request: EvaluationRequest,
  dependencies: {
    moderation: ModerationGateway;
    extraction: ExtractionGateway;
  },
): Promise<TurnResult> {
  if (await dependencies.moderation.isFlagged(request.prompt)) {
    return evaluateQuest({
      currentPassedNeeds: request.currentPassedNeeds,
      extraction: FLAGGED_EXTRACTION,
      source: "live",
    });
  }

  let extraction: PromptExtraction;

  try {
    extraction = promptExtractionSchema.parse(
      await dependencies.extraction.extract(request.prompt, request.safetyIdentifier),
    );
  } catch {
    return selectFallback(request.currentPassedNeeds);
  }

  return evaluateQuest({
    currentPassedNeeds: request.currentPassedNeeds,
    extraction,
    source: "live",
  });
}

function emptyMissionExtraction(request: EvaluateMissionRequest): MissionExtraction {
  const definition = getMissionDefinition(request.missionId);
  return {
    offTopic: true,
    choice: null,
    criteria: Object.fromEntries(
      definition.criteria.map((criterion) => [criterion, { met: false, evidence: "" }]),
    ),
  };
}

export async function evaluateMissionPrompt(
  request: EvaluateMissionRequest,
  dependencies: {
    moderation: ModerationGateway;
    extraction: MissionExtractionGateway;
    temperature?: TemperatureTrialGateway;
  },
): Promise<EvaluateMissionResponse> {
  if (await dependencies.moderation.isFlagged(request.prompt)) {
    const result = evaluateMission({
      request,
      extraction: emptyMissionExtraction(request),
      source: "live",
    });
    return { ...result, effectKeys: ["unsafe_input_no_change"] };
  }

  const extractionPromise = dependencies.extraction
    .extractMission(request)
    .then((extraction) => ({ extraction, source: "live" as const }))
    .catch(() => ({
      extraction: fallbackMissionExtraction(request),
      source: "fallback" as const,
    }));
  const temperaturePromise =
    request.missionId === "city_school" && dependencies.temperature
      ? dependencies.temperature.run(request)
      : Promise.resolve(undefined);
  const [{ extraction, source }, temperatureTrial] = await Promise.all([
    extractionPromise,
    temperaturePromise,
  ]);
  const result = evaluateMission({
    request,
    extraction,
    source,
    ...(temperatureTrial ? { temperatureTrial } : {}),
  });
  const fallbackMiss =
    source === "fallback" &&
    extraction.choice === null &&
    Object.values(extraction.criteria).every((criterion) => !criterion.met) &&
    temperatureTrial?.status !== "generated";

  return fallbackMiss
    ? { ...result, status: "retry", effectKeys: ["evaluation_unavailable_no_change"] }
    : result;
}
