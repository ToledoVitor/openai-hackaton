import { NEED_KEYS, type NeedKey } from "../domain/contracts";
import { createInitialQuestState, type HelpTier, type QuestState } from "../game/quest-state";

export const QUEST_STORAGE_KEY = "ai-city-mayor:quest-state:v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface PersistedQuestState {
  version: 1;
  discoveredNeeds: NeedKey[];
  passedNeeds: NeedKey[];
  attemptCount: number;
  helpTier: HelpTier;
  promptBlueprintVisible: boolean;
  voiceEnabled: boolean;
  source: "live" | "fallback";
  completed: boolean;
}

const PERSISTED_KEYS = [
  "version",
  "discoveredNeeds",
  "passedNeeds",
  "attemptCount",
  "helpTier",
  "promptBlueprintVisible",
  "voiceEnabled",
  "source",
  "completed",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCanonicalNeeds(value: unknown): value is NeedKey[] {
  if (!Array.isArray(value) || new Set(value).size !== value.length) {
    return false;
  }

  return value.every((need, index) => NEED_KEYS[index] === need || NEED_KEYS.indexOf(need as NeedKey) > index);
}

function hasSameKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length === PERSISTED_KEYS.length && PERSISTED_KEYS.every((key) => key in value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isHelpTier(value: unknown): value is HelpTier {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3;
}

function isPersistedQuestState(value: unknown): value is PersistedQuestState {
  if (!isRecord(value) || !hasSameKeys(value)) {
    return false;
  }

  if (
    value.version !== 1 ||
    !isCanonicalNeeds(value.discoveredNeeds) ||
    !isCanonicalNeeds(value.passedNeeds) ||
    !isNonNegativeSafeInteger(value.attemptCount) ||
    !isHelpTier(value.helpTier) ||
    typeof value.promptBlueprintVisible !== "boolean" ||
    typeof value.voiceEnabled !== "boolean" ||
    (value.source !== "live" && value.source !== "fallback") ||
    typeof value.completed !== "boolean"
  ) {
    return false;
  }

  const discoveredNeeds = value.discoveredNeeds;
  const passedNeeds = value.passedNeeds;
  const allNeedsDiscovered = discoveredNeeds.length === NEED_KEYS.length;
  const allNeedsPassed = passedNeeds.length === NEED_KEYS.length;
  return (
    passedNeeds.every((need) => discoveredNeeds.includes(need)) &&
    (passedNeeds.length === 0 || allNeedsDiscovered) &&
    value.completed === allNeedsPassed &&
    (!value.promptBlueprintVisible || value.attemptCount > 0) &&
    value.helpTier <= value.attemptCount
  );
}

export function serializeQuestState(state: QuestState): string {
  const persisted: PersistedQuestState = {
    version: 1,
    discoveredNeeds: [...state.discoveredNeeds],
    passedNeeds: [...state.passedNeeds],
    attemptCount: state.attemptCount,
    helpTier: state.helpTier,
    promptBlueprintVisible: state.promptBlueprintVisible,
    voiceEnabled: state.voiceEnabled,
    source: state.source,
    completed: state.completed,
  };
  return JSON.stringify(persisted);
}

export function persistQuestState(storage: StorageLike | null | undefined, state: QuestState): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(QUEST_STORAGE_KEY, serializeQuestState(state));
    return true;
  } catch {
    return false;
  }
}

export function hydrateQuestState(storage: StorageLike | null | undefined): QuestState {
  if (!storage) {
    return createInitialQuestState();
  }

  try {
    const serialized = storage.getItem(QUEST_STORAGE_KEY);
    if (serialized === null) {
      return createInitialQuestState();
    }

    const persisted: unknown = JSON.parse(serialized);
    if (!isPersistedQuestState(persisted)) {
      return createInitialQuestState();
    }

    const beat = persisted.completed
      ? "restored"
      : persisted.discoveredNeeds.length === 0
        ? "arrival"
        : persisted.discoveredNeeds.length === NEED_KEYS.length
          ? "readyToPrompt"
          : "discoverNeeds";
    return {
      beat,
      discoveredNeeds: [...persisted.discoveredNeeds],
      passedNeeds: [...persisted.passedNeeds],
      attemptCount: persisted.attemptCount,
      helpTier: persisted.helpTier,
      promptBlueprintVisible: persisted.promptBlueprintVisible,
      voiceEnabled: persisted.voiceEnabled,
      source: persisted.source,
      pendingRequestId: null,
      completed: persisted.completed,
    };
  } catch {
    return createInitialQuestState();
  }
}
