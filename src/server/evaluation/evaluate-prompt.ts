import {
  type EvaluationRequest,
  type PromptExtraction,
  promptExtractionSchema,
  type TurnResult,
} from "../../domain/contracts";
import { selectFallback } from "../../domain/fallback-bank";
import { evaluateQuest } from "../../domain/quest-engine";

export interface ModerationGateway {
  isFlagged(prompt: string): Promise<boolean>;
}

export interface ExtractionGateway {
  extract(prompt: string, safetyIdentifier: string): Promise<unknown>;
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

  try {
    const extraction = promptExtractionSchema.parse(
      await dependencies.extraction.extract(request.prompt, request.safetyIdentifier),
    );

    return evaluateQuest({
      currentPassedNeeds: request.currentPassedNeeds,
      extraction,
      source: "live",
    });
  } catch {
    return selectFallback(request.currentPassedNeeds);
  }
}
