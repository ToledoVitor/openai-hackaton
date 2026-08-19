import { NEED_KEYS, type NeedKey, type PromptExtraction, type TurnResult } from "./contracts";
import { evaluateQuest } from "./quest-engine";

const FALLBACK_EXTRACTIONS: Readonly<Record<NeedKey, PromptExtraction>> = Object.freeze({
  accessibleEntrance: {
    offTopic: false,
    promptBlueprint: { goal: true, context: true, constraints: true, output: true },
    civicTraits: { accessibleEntrance: true, clearSign: false, weatherCover: false },
    evidence: ["Prepared fallback: a step-free entrance is included."],
    citizenLine: "The entrance can welcome visitors using wheels, canes, and strollers.",
    nextHint: "requireClearSign",
  },
  clearSign: {
    offTopic: false,
    promptBlueprint: { goal: true, context: true, constraints: true, output: true },
    civicTraits: { accessibleEntrance: false, clearSign: true, weatherCover: false },
    evidence: ["Prepared fallback: a readable CITY HALL sign is included."],
    citizenLine: "A clear CITY HALL sign will help every neighbor find the door.",
    nextHint: "requireWeatherCover",
  },
  weatherCover: {
    offTopic: false,
    promptBlueprint: { goal: true, context: true, constraints: true, output: true },
    civicTraits: { accessibleEntrance: false, clearSign: false, weatherCover: true },
    evidence: ["Prepared fallback: an entrance canopy is included."],
    citizenLine: "The new canopy gives visitors a dry place to arrive.",
    nextHint: "celebrate",
  },
});

const COMPLETE_EXTRACTION: PromptExtraction = {
  offTopic: false,
  promptBlueprint: { goal: true, context: true, constraints: true, output: true },
  civicTraits: { accessibleEntrance: false, clearSign: false, weatherCover: false },
  evidence: [],
  citizenLine: "Town Hall is restored and ready for its next civic gathering.",
  nextHint: "celebrate",
};

export function selectFallback(currentPassedNeeds: readonly NeedKey[]): TurnResult {
  const nextNeed = NEED_KEYS.find((need) => !currentPassedNeeds.includes(need));

  return evaluateQuest({
    currentPassedNeeds,
    extraction: nextNeed ? FALLBACK_EXTRACTIONS[nextNeed] : COMPLETE_EXTRACTION,
    source: "fallback",
  });
}
