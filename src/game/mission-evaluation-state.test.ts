import { describe, expect, it } from "vitest";

import { createInitialJourneyState, selectLearningMission } from "../domain/learning-journey";
import { resolveMissionEvaluation } from "./mission-evaluation-state";

describe("mission evaluation response scope", () => {
  it("applies signed completion without presenting stale feedback after mission switch", () => {
    const hospitalSelected = selectLearningMission(
      createInitialJourneyState(),
      "hospital_construction",
    ).state;

    const resolved = resolveMissionEvaluation({
      journey: hospitalSelected,
      requestMissionId: "apartment_construction",
      requestLanguage: "english",
      currentLanguage: "english",
      status: "success",
    });

    expect(resolved.journey.completedMissionIds).toEqual(["apartment_construction"]);
    expect(resolved.journey.activeMissionId).toBe("hospital_construction");
    expect(resolved.shouldPresent).toBe(false);
    expect(resolved.completionError).toBeNull();
  });

  it("does not present feedback returned in a previously selected language", () => {
    const apartmentSelected = selectLearningMission(
      createInitialJourneyState(),
      "apartment_construction",
    ).state;

    const resolved = resolveMissionEvaluation({
      journey: apartmentSelected,
      requestMissionId: "apartment_construction",
      requestLanguage: "portuguese",
      currentLanguage: "english",
      status: "partial",
    });

    expect(resolved.journey).toEqual(apartmentSelected);
    expect(resolved.shouldPresent).toBe(false);
  });
});
