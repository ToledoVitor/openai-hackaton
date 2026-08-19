import { describe, expect, test } from "vitest";
import type { QuestState } from "../game/quest-state";
import * as questStorage from "./quest-storage";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const persistedState: QuestState = {
  beat: "guidedRetry",
  discoveredNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
  passedNeeds: ["accessibleEntrance", "clearSign"],
  attemptCount: 2,
  helpTier: 1,
  promptBlueprintVisible: true,
  voiceEnabled: true,
  source: "fallback",
  pendingRequestId: "never-persist-this",
  completed: false,
};

describe("persistQuestState", () => {
  test("round-trips only durable quest progress and preferences", () => {
    // This catches a persistence regression leaking request IDs or changing reload progress.
    const storage = new MemoryStorage();

    expect(questStorage.persistQuestState(storage, persistedState)).toBe(true);
    expect(JSON.parse(storage.getItem(questStorage.QUEST_STORAGE_KEY)!)).toEqual({
      version: 1,
      discoveredNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
      passedNeeds: ["accessibleEntrance", "clearSign"],
      attemptCount: 2,
      helpTier: 1,
      promptBlueprintVisible: true,
      voiceEnabled: true,
      source: "fallback",
      completed: false,
    });
    expect(questStorage.hydrateQuestState(storage)).toEqual({
      ...persistedState,
      beat: "readyToPrompt",
      pendingRequestId: null,
    });
  });

  test.each([
    ["malformed JSON", "{"],
    ["non-object", JSON.stringify([])],
    ["unknown version", JSON.stringify({ version: 2 })],
    ["extra Player content", JSON.stringify({
      version: 1,
      discoveredNeeds: [],
      passedNeeds: [],
      attemptCount: 0,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      completed: false,
      playerPrompt: "do not persist me",
    })],
    ["duplicate needs", JSON.stringify({
      version: 1,
      discoveredNeeds: ["accessibleEntrance", "accessibleEntrance"],
      passedNeeds: [],
      attemptCount: 0,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      completed: false,
    })],
    ["unknown needs", JSON.stringify({
      version: 1,
      discoveredNeeds: ["madeUpNeed"],
      passedNeeds: [],
      attemptCount: 0,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      completed: false,
    })],
    ["noncanonical needs", JSON.stringify({
      version: 1,
      discoveredNeeds: ["clearSign", "accessibleEntrance"],
      passedNeeds: [],
      attemptCount: 0,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      completed: false,
    })],
    ["negative attempts", JSON.stringify({
      version: 1,
      discoveredNeeds: [],
      passedNeeds: [],
      attemptCount: -1,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      completed: false,
    })],
    ["out-of-range help", JSON.stringify({
      version: 1,
      discoveredNeeds: [],
      passedNeeds: [],
      attemptCount: 0,
      helpTier: 4,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      completed: false,
    })],
    ["fractional attempts", JSON.stringify({
      version: 1,
      discoveredNeeds: [],
      passedNeeds: [],
      attemptCount: 0.5,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      completed: false,
    })],
    ["invalid source", JSON.stringify({
      version: 1,
      discoveredNeeds: [],
      passedNeeds: [],
      attemptCount: 0,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "scripted",
      completed: false,
    })],
    ["invalid preference type", JSON.stringify({
      version: 1,
      discoveredNeeds: [],
      passedNeeds: [],
      attemptCount: 0,
      helpTier: 0,
      promptBlueprintVisible: "yes",
      voiceEnabled: false,
      source: "live",
      completed: false,
    })],
    ["passed needs before discovery", JSON.stringify({
      version: 1,
      discoveredNeeds: [],
      passedNeeds: ["accessibleEntrance"],
      attemptCount: 1,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      completed: false,
    })],
    ["incomplete completion", JSON.stringify({
      version: 1,
      discoveredNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
      passedNeeds: ["accessibleEntrance"],
      attemptCount: 1,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      completed: true,
    })],
    ["unmarked completed quest", JSON.stringify({
      version: 1,
      discoveredNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
      passedNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
      attemptCount: 1,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      completed: false,
    })],
    ["blueprint before an attempt", JSON.stringify({
      version: 1,
      discoveredNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
      passedNeeds: [],
      attemptCount: 0,
      helpTier: 0,
      promptBlueprintVisible: true,
      voiceEnabled: false,
      source: "live",
      completed: false,
    })],
  ])("returns safe defaults for %s", (_name, payload) => {
    // This catches malformed browser data corrupting the quest on load.
    const storage = new MemoryStorage();
    storage.setItem(questStorage.QUEST_STORAGE_KEY, payload);

    expect(questStorage.hydrateQuestState(storage)).toEqual({
      beat: "arrival",
      discoveredNeeds: [],
      passedNeeds: [],
      attemptCount: 0,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      pendingRequestId: null,
      completed: false,
    });
  });

  test("keeps playing without a working localStorage", () => {
    // This catches privacy-mode storage errors preventing an in-memory session.
    const unavailable = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };

    expect(questStorage.persistQuestState(unavailable, persistedState)).toBe(false);
    expect(questStorage.hydrateQuestState(unavailable)).toEqual({
      beat: "arrival",
      discoveredNeeds: [],
      passedNeeds: [],
      attemptCount: 0,
      helpTier: 0,
      promptBlueprintVisible: false,
      voiceEnabled: false,
      source: "live",
      pendingRequestId: null,
      completed: false,
    });
  });
});
