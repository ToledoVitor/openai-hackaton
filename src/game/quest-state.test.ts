import { describe, expect, test } from "vitest";
import type { TurnResult } from "../domain/contracts";
import * as questState from "./quest-state";

function result(overrides: Partial<TurnResult> = {}): TurnResult {
  return {
    source: "live",
    offTopic: false,
    repairDelta: [],
    passedNeeds: [],
    nextStage: "ready",
    citizenLine: "Please make the Town Hall welcoming.",
    nextHint: "stateGoal",
    celebration: false,
    ...overrides,
  };
}

function promptReadyState() {
  let state = questState.createInitialQuestState();
  state = questState.reduceQuestState(state, { type: "inspectTownHall" });
  state = questState.reduceQuestState(state, { type: "discoverNeed", need: "accessibleEntrance" });
  state = questState.reduceQuestState(state, { type: "discoverNeed", need: "clearSign" });
  return questState.reduceQuestState(state, { type: "discoverNeed", need: "weatherCover" });
}

describe("createInitialQuestState", () => {
  test("starts the mayor at Town Hall with no quest progress", () => {
    // This would catch a regression that starts the player after Town Hall inspection.
    expect(questState.createInitialQuestState()).toEqual({
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

describe("reduceQuestState", () => {
  test("unlocks prompting only after all three citizen needs are discovered", () => {
    // This catches a regression that exposes prompts before the Project Brief is complete.
    let state = questState.reduceQuestState(questState.createInitialQuestState(), { type: "inspectTownHall" });
    state = questState.reduceQuestState(state, { type: "discoverNeed", need: "weatherCover" });
    state = questState.reduceQuestState(state, { type: "discoverNeed", need: "accessibleEntrance" });

    expect(state).toMatchObject({
      beat: "discoverNeeds",
      discoveredNeeds: ["accessibleEntrance", "weatherCover"],
    });

    expect(questState.reduceQuestState(state, { type: "discoverNeed", need: "clearSign" })).toMatchObject({
      beat: "readyToPrompt",
      discoveredNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
    });
  });

  test("ignores a stale or duplicate result after its request has settled", () => {
    // This catches a late network response changing a newer attempt's quest progress.
    let state = questState.reduceQuestState(promptReadyState(), { type: "submitAttempt", requestId: "first" });
    state = questState.reduceQuestState(state, {
      type: "applyTurnResult",
      requestId: "other",
      result: result({ repairDelta: ["clearSign"], passedNeeds: ["clearSign"], nextStage: "partial" }),
    });

    expect(state).toMatchObject({ beat: "evaluating", pendingRequestId: "first", passedNeeds: [] });

    state = questState.reduceQuestState(state, {
      type: "applyTurnResult",
      requestId: "first",
      result: result({ repairDelta: ["clearSign"], passedNeeds: ["clearSign"], nextStage: "partial" }),
    });
    const settled = state;

    expect(questState.reduceQuestState(state, {
      type: "applyTurnResult",
      requestId: "first",
      result: result({ repairDelta: ["weatherCover"], passedNeeds: ["clearSign", "weatherCover"], nextStage: "partial" }),
    })).toEqual(settled);
  });

  test("merges repaired needs monotonically in project brief order", () => {
    // This catches a result overwriting previous repairs or preserving server ordering.
    let state = questState.reduceQuestState(promptReadyState(), { type: "submitAttempt", requestId: "one" });
    state = questState.reduceQuestState(state, {
      type: "applyTurnResult",
      requestId: "one",
      result: result({
        repairDelta: ["weatherCover", "accessibleEntrance"],
        passedNeeds: ["weatherCover", "accessibleEntrance"],
        nextStage: "partial",
      }),
    });
    state = questState.reduceQuestState(state, { type: "submitAttempt", requestId: "two" });

    expect(questState.reduceQuestState(state, {
      type: "applyTurnResult",
      requestId: "two",
      result: result({ repairDelta: ["clearSign"], passedNeeds: ["clearSign"], nextStage: "partial" }),
    }).passedNeeds).toEqual(["accessibleEntrance", "clearSign", "weatherCover"]);
  });

  test("keeps city progress unchanged for off-topic results", () => {
    // This catches redirect results applying an accidental repair delta.
    let state = questState.reduceQuestState(promptReadyState(), { type: "submitAttempt", requestId: "one" });
    state = questState.reduceQuestState(state, {
      type: "applyTurnResult",
      requestId: "one",
      result: result({ repairDelta: ["accessibleEntrance"], passedNeeds: ["accessibleEntrance"], nextStage: "partial" }),
    });
    state = questState.reduceQuestState(state, { type: "submitAttempt", requestId: "two" });

    expect(questState.reduceQuestState(state, {
      type: "applyTurnResult",
      requestId: "two",
      result: result({
        offTopic: true,
        repairDelta: [],
        passedNeeds: ["accessibleEntrance"],
        nextStage: "partial",
        nextHint: "playfulRedirect",
      }),
    })).toMatchObject({ beat: "readyToPrompt", passedNeeds: ["accessibleEntrance"], helpTier: 0 });
  });

  test("reveals the blueprint and caps help after unsuccessful on-topic attempts", () => {
    // This catches weak prompts failing to unlock guidance or help tier growing without a bound.
    let state = promptReadyState();
    for (const requestId of ["one", "two", "three", "four", "five"]) {
      state = questState.reduceQuestState(state, { type: "submitAttempt", requestId });
      state = questState.reduceQuestState(state, { type: "applyTurnResult", requestId, result: result() });
    }

    expect(state).toMatchObject({
      beat: "guidedRetry",
      attemptCount: 5,
      promptBlueprintVisible: true,
      helpTier: 3,
    });
  });

  test("marks the restored result complete and advances its celebration", () => {
    // This catches completion being based on an animation rather than the validated restored result.
    let state = questState.reduceQuestState(promptReadyState(), { type: "submitAttempt", requestId: "complete" });
    state = questState.reduceQuestState(state, {
      type: "applyTurnResult",
      requestId: "complete",
      result: result({
        repairDelta: ["accessibleEntrance", "clearSign", "weatherCover"],
        passedNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
        nextStage: "restored",
        celebration: true,
        nextHint: "celebrate",
      }),
    });

    expect(state).toMatchObject({ beat: "restored", completed: true });
    expect(questState.reduceQuestState(state, { type: "advanceRestoredCelebration" }).beat).toBe("celebration");
    expect(questState.reduceQuestState(
      questState.reduceQuestState(state, { type: "advanceRestoredCelebration" }),
      { type: "advanceRestoredCelebration" },
    ).beat).toBe("districtTeaser");
  });

  test("clears only a matching failed request and reset preserves voice preference", () => {
    // This catches reset losing an accessibility preference or a stale failure cancelling active work.
    let state = questState.reduceQuestState(promptReadyState(), { type: "setVoicePreference", enabled: true });
    state = questState.reduceQuestState(state, { type: "submitAttempt", requestId: "active" });

    expect(questState.reduceQuestState(state, { type: "failAttempt", requestId: "stale" })).toEqual(state);

    state = questState.reduceQuestState(state, { type: "failAttempt", requestId: "active" });
    expect(state).toMatchObject({ beat: "readyToPrompt", pendingRequestId: null });
    expect(questState.reduceQuestState(state, { type: "reset" })).toEqual(
      questState.createInitialQuestState(true),
    );
  });
});
