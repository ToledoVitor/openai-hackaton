import { NEED_KEYS, type NeedKey, type TurnResult } from "../domain/contracts";

export type NarrativeBeat =
  | "arrival"
  | "discoverNeeds"
  | "readyToPrompt"
  | "evaluating"
  | "guidedRetry"
  | "restored"
  | "celebration"
  | "districtTeaser";

export type HelpTier = 0 | 1 | 2 | 3;

export interface QuestState {
  beat: NarrativeBeat;
  discoveredNeeds: NeedKey[];
  passedNeeds: NeedKey[];
  attemptCount: number;
  helpTier: HelpTier;
  promptBlueprintVisible: boolean;
  voiceEnabled: boolean;
  source: "live" | "fallback";
  pendingRequestId: string | null;
  completed: boolean;
}

export type QuestAction =
  | { type: "inspectTownHall" }
  | { type: "discoverNeed"; need: NeedKey }
  | { type: "submitAttempt"; requestId: string }
  | { type: "applyTurnResult"; requestId: string; result: TurnResult }
  | { type: "failAttempt"; requestId: string }
  | { type: "advanceRestoredCelebration" }
  | { type: "setVoicePreference"; enabled: boolean }
  | { type: "reset" };

export function createInitialQuestState(voiceEnabled = false): QuestState {
  return {
    beat: "arrival",
    discoveredNeeds: [],
    passedNeeds: [],
    attemptCount: 0,
    helpTier: 0,
    promptBlueprintVisible: false,
    voiceEnabled,
    source: "live",
    pendingRequestId: null,
    completed: false,
  };
}

function orderedNeeds(needs: readonly NeedKey[]): NeedKey[] {
  const includedNeeds = new Set(needs);
  return NEED_KEYS.filter((need) => includedNeeds.has(need));
}

function isPromptingBeat(beat: NarrativeBeat): boolean {
  return beat === "readyToPrompt" || beat === "guidedRetry";
}

export function reduceQuestState(state: QuestState, action: QuestAction): QuestState {
  switch (action.type) {
    case "inspectTownHall":
      return state.beat === "arrival" ? { ...state, beat: "discoverNeeds" } : state;

    case "discoverNeed": {
      if (state.beat !== "discoverNeeds") {
        return state;
      }

      const discoveredNeeds = orderedNeeds([...state.discoveredNeeds, action.need]);
      return {
        ...state,
        discoveredNeeds,
        beat: discoveredNeeds.length === NEED_KEYS.length ? "readyToPrompt" : "discoverNeeds",
      };
    }

    case "submitAttempt":
      if (!isPromptingBeat(state.beat) || state.pendingRequestId !== null || action.requestId.length === 0) {
        return state;
      }
      return {
        ...state,
        beat: "evaluating",
        attemptCount: state.attemptCount + 1,
        pendingRequestId: action.requestId,
      };

    case "applyTurnResult": {
      if (state.pendingRequestId !== action.requestId) {
        return state;
      }

      const common = {
        ...state,
        pendingRequestId: null,
        source: action.result.source,
      } as const;

      if (action.result.offTopic) {
        return { ...common, beat: "readyToPrompt" };
      }

      const passedNeeds = orderedNeeds([...state.passedNeeds, ...action.result.passedNeeds]);
      if (action.result.nextStage === "restored") {
        return { ...common, passedNeeds, beat: "restored", completed: true };
      }

      const unsuccessful = action.result.repairDelta.length === 0;
      return {
        ...common,
        passedNeeds,
        beat: "guidedRetry",
        promptBlueprintVisible: state.promptBlueprintVisible || unsuccessful,
        helpTier: unsuccessful ? Math.min(3, state.helpTier + 1) as HelpTier : state.helpTier,
      };
    }

    case "failAttempt":
      return state.pendingRequestId === action.requestId
        ? { ...state, beat: "readyToPrompt", pendingRequestId: null }
        : state;

    case "advanceRestoredCelebration":
      if (state.beat === "restored") {
        return { ...state, beat: "celebration" };
      }
      return state.beat === "celebration" ? { ...state, beat: "districtTeaser" } : state;

    case "setVoicePreference":
      return { ...state, voiceEnabled: action.enabled };

    case "reset":
      return createInitialQuestState(state.voiceEnabled);
  }
}
