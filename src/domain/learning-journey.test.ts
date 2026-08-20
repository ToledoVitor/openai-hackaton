import { describe, expect, it } from "vitest";

import {
  LEARNING_MISSIONS,
  completeLearningMission,
  createInitialJourneyState,
  getMissionAccess,
  localizeMission,
  parseJourneyState,
  recommendNextMission,
  selectLearningMission,
} from "./learning-journey";

describe("learning journey", () => {
  it("centralizes complete bilingual teaching metadata in prerequisite order", () => {
    expect(LEARNING_MISSIONS.map((mission) => mission.id)).toEqual([
      "apartment_construction",
      "hospital_construction",
      "urban_repair",
    ]);
    expect(LEARNING_MISSIONS.map((mission) => mission.prerequisite)).toEqual([
      null,
      "apartment_construction",
      "hospital_construction",
    ]);

    for (const mission of LEARNING_MISSIONS) {
      for (const language of ["portuguese", "english"] as const) {
        const copy = localizeMission(mission.id, language);
        expect(Object.values(copy).every((value) => value.trim().length > 0)).toBe(true);
        expect(copy.objective).not.toBe(copy.expectedOutcome);
      }
    }
  });

  it("returns a human-readable fallback for an unknown translation field", () => {
    expect(localizeMission("apartment_construction", "english", "missing_translation")).toBe(
      "Missing translation",
    );
  });

  it("advances only after authoritative mission success", () => {
    const initial = createInitialJourneyState();
    expect(recommendNextMission(initial)).toBe("apartment_construction");
    expect(getMissionAccess(initial, "hospital_construction")).toBe("locked");

    const partial = completeLearningMission(initial, "apartment_construction", "partial");
    expect(partial.state).toEqual(initial);
    expect(partial.error).toBe("evaluation_incomplete");

    const housingComplete = completeLearningMission(initial, "apartment_construction", "success");
    expect(housingComplete.error).toBeNull();
    expect(housingComplete.state.completedMissionIds).toEqual(["apartment_construction"]);
    expect(housingComplete.state.activeMissionId).toBe("hospital_construction");
    expect(recommendNextMission(housingComplete.state)).toBe("hospital_construction");
  });

  it("cannot select a locked prerequisite or unknown mission", () => {
    const initial = createInitialJourneyState();

    expect(selectLearningMission(initial, "hospital_construction")).toEqual({
      state: initial,
      error: "mission_locked",
    });
    expect(selectLearningMission(initial, "not-a-mission")).toEqual({
      state: initial,
      error: "invalid_mission",
    });
  });

  it("recovers corrupted or inconsistent persisted state to longest valid prefix", () => {
    expect(parseJourneyState("not-json")).toEqual(createInitialJourneyState());
    expect(parseJourneyState(JSON.stringify({
      version: 1,
      completedMissionIds: ["hospital_construction", "apartment_construction"],
      activeMissionId: "urban_repair",
    }))).toEqual({
      version: 1,
      completedMissionIds: ["apartment_construction", "hospital_construction"],
      activeMissionId: "urban_repair",
    });
    expect(parseJourneyState(JSON.stringify({
      version: 1,
      completedMissionIds: ["hospital_construction"],
      activeMissionId: "hospital_construction",
    }))).toEqual(createInitialJourneyState());
  });
});
