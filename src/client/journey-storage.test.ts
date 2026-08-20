import { describe, expect, it } from "vitest";

import { createInitialJourneyState } from "../domain/learning-journey";
import {
  JOURNEY_STORAGE_KEY,
  loadJourneyState,
  saveJourneyState,
  loadProgressReceipt,
  saveProgressReceipt,
  clearProgressReceipt,
} from "./journey-storage";

describe("journey storage", () => {
  it("persists and restores ordered progress", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    const state = {
      version: 1 as const,
      completedMissionIds: ["apartment_construction" as const],
      activeMissionId: "hospital_construction" as const,
    };

    expect(saveJourneyState(storage, state)).toBe(true);
    expect(values.has(JOURNEY_STORAGE_KEY)).toBe(true);
    expect(loadJourneyState(storage)).toEqual(state);
  });

  it("stores only an opaque server progress receipt beside display state", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    expect(saveProgressReceipt(storage, "signed.receipt")).toBe(true);
    expect(loadProgressReceipt(storage)).toBe("signed.receipt");
    expect(clearProgressReceipt(storage)).toBe(true);
    expect(loadProgressReceipt(storage)).toBeUndefined();
  });

  it("recovers safely when storage is unavailable or throws", () => {
    expect(loadJourneyState(null)).toEqual(createInitialJourneyState());
    expect(loadJourneyState({
      getItem: () => { throw new Error("private mode"); },
      setItem: () => { throw new Error("private mode"); },
    })).toEqual(createInitialJourneyState());
    expect(saveJourneyState({
      getItem: () => null,
      setItem: () => { throw new Error("quota"); },
    }, createInitialJourneyState())).toBe(false);
  });
});
