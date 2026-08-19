import { NEED_KEYS, type HintKey, type NeedKey, type PromptExtraction, type TurnResult } from "./contracts";

const REDIRECT_CITIZEN_LINE = "Let’s keep our attention on making Town Hall work for everyone.";

function stageFor(passedNeeds: readonly NeedKey[]): TurnResult["nextStage"] {
  if (passedNeeds.length === 0) {
    return "ready";
  }

  return passedNeeds.length === NEED_KEYS.length ? "restored" : "partial";
}

function hintForNextNeed(passedNeeds: readonly NeedKey[]): HintKey {
  const nextNeed = NEED_KEYS.find((need) => !passedNeeds.includes(need));

  switch (nextNeed) {
    case "accessibleEntrance":
      return "requireAccessibleEntrance";
    case "clearSign":
      return "requireClearSign";
    case "weatherCover":
      return "requireWeatherCover";
    default:
      return "celebrate";
  }
}

export function evaluateQuest(input: {
  currentPassedNeeds: readonly NeedKey[];
  extraction: PromptExtraction;
  source: "live" | "fallback";
}): TurnResult {
  const existingNeeds = new Set(input.currentPassedNeeds);
  const traitNeeds = input.extraction.offTopic
    ? []
    : NEED_KEYS.filter((need) => input.extraction.civicTraits[need]);
  const passedNeeds = NEED_KEYS.filter((need) => existingNeeds.has(need) || traitNeeds.includes(need));
  const repairDelta = traitNeeds.filter((need) => !existingNeeds.has(need));
  const nextStage = stageFor(passedNeeds);

  if (input.extraction.offTopic) {
    return {
      source: input.source,
      offTopic: true,
      repairDelta: [],
      passedNeeds,
      nextStage,
      citizenLine: REDIRECT_CITIZEN_LINE,
      nextHint: "playfulRedirect",
      celebration: nextStage === "restored",
    };
  }

  return {
    source: input.source,
    offTopic: false,
    repairDelta,
    passedNeeds,
    nextStage,
    citizenLine: input.extraction.citizenLine,
    nextHint: hintForNextNeed(passedNeeds),
    celebration: nextStage === "restored",
  };
}
