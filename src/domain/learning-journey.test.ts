import { describe, expect, it } from "vitest";

import {
  LEARNING_MISSIONS,
  completeLearningMission,
  canonicalMissionCriteria,
  createInitialJourneyState,
  getMissionAccess,
  isLearningMissionId,
  localizeMission,
  parseJourneyState,
  recommendNextMission,
  selectLearningMission,
} from "./learning-journey";

describe("learning journey", () => {
  it("centralizes complete bilingual teaching metadata for independent missions", () => {
    expect(LEARNING_MISSIONS.map((mission) => mission.id)).toEqual([
      "apartment_construction",
      "hospital_construction",
      "urban_repair",
      "school_construction",
    ]);
    for (const mission of LEARNING_MISSIONS) {
      for (const language of ["portuguese", "english"] as const) {
        const copy = localizeMission(mission.id, language);
        expect(Object.values(copy).every((value) => value.trim().length > 0)).toBe(true);
        expect(copy.objective).not.toBe(copy.expectedOutcome);
        expect(copy.purpose).not.toBe(copy.objective);
      }
    }
  });

  it("offers school construction independently from the first visit", () => {
    const initial = createInitialJourneyState();

    expect(isLearningMissionId("school_construction")).toBe(true);
    expect(getMissionAccess(initial, "school_construction")).toBe("available");
    expect(selectLearningMission(initial, "school_construction")).toEqual({
      state: { ...initial, activeMissionId: "school_construction" },
      error: null,
    });
  });

  it("canonicalizes each mission snapshot to its own declared criteria", () => {
    expect(canonicalMissionCriteria({
      school_construction: ["school_accessible", "invented", "school_scale_defined"],
      apartment_construction: ["school_accessible", "housing_budget_defined"],
    })).toMatchObject({
      school_construction: ["school_scale_defined", "school_accessible"],
      apartment_construction: ["housing_budget_defined"],
    });
  });

  it("returns a human-readable fallback for an unknown translation field", () => {
    expect(localizeMission("apartment_construction", "english", "missing_translation")).toBe(
      "Missing translation",
    );
  });

  it("completes any chosen mission only after authoritative success", () => {
    const initial = createInitialJourneyState();
    expect(initial.activeMissionId).toBeNull();
    expect(recommendNextMission(initial)).toBe("apartment_construction");
    expect(LEARNING_MISSIONS.map(({ id }) => getMissionAccess(initial, id))).toEqual([
      "available", "available", "available", "available",
    ]);

    const partial = completeLearningMission(initial, "hospital_construction", "partial");
    expect(partial.state).toEqual(initial);
    expect(partial.error).toBe("evaluation_incomplete");

    const hospitalComplete = completeLearningMission(initial, "hospital_construction", "success");
    expect(hospitalComplete.error).toBeNull();
    expect(hospitalComplete.state.completedMissionIds).toEqual(["hospital_construction"]);
    expect(hospitalComplete.state.activeMissionId).toBe("hospital_construction");
    expect(recommendNextMission(hospitalComplete.state)).toBe("apartment_construction");
  });

  it("selects any mission from start and rejects only unknown missions", () => {
    const initial = createInitialJourneyState();

    expect(selectLearningMission(initial, "hospital_construction")).toEqual({
      state: { ...initial, activeMissionId: "hospital_construction" },
      error: null,
    });
    expect(selectLearningMission(initial, "not-a-mission")).toEqual({
      state: initial,
      error: "invalid_mission",
    });
  });

  it("preserves the player's current mission when another mission finishes asynchronously", () => {
    const hospitalSelected = selectLearningMission(
      createInitialJourneyState(),
      "hospital_construction",
    ).state;

    const apartmentComplete = completeLearningMission(
      hospitalSelected,
      "apartment_construction",
      "success",
    );

    expect(apartmentComplete.error).toBeNull();
    expect(apartmentComplete.state.completedMissionIds).toEqual(["apartment_construction"]);
    expect(apartmentComplete.state.activeMissionId).toBe("hospital_construction");
  });

  it("recovers persisted completion as a canonical independent set", () => {
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
      completedMissionIds: ["hospital_construction", "hospital_construction", "unknown"],
      activeMissionId: "hospital_construction",
    }))).toEqual({
      version: 1,
      completedMissionIds: ["hospital_construction"],
      activeMissionId: "hospital_construction",
    });
    expect(parseJourneyState(JSON.stringify({ completedMissionIds: [] })).activeMissionId).toBeNull();
  });
});
