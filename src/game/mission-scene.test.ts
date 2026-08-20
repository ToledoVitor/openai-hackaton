import { describe, expect, it } from "vitest";

import { LEARNING_MISSION_IDS } from "../domain/learning-journey";
import { MISSION_SCENE_LOCATIONS, urbanProblemRemains } from "./mission-scene";

describe("mission scene composition", () => {
  it("centralizes camera, highlight, and character placement for every learning mission", () => {
    expect(Object.keys(MISSION_SCENE_LOCATIONS)).toEqual(LEARNING_MISSION_IDS);
    for (const missionId of LEARNING_MISSION_IDS) {
      const location = MISSION_SCENE_LOCATIONS[missionId];
      expect(location.cameraTarget[0]).toBe(location.highlight[0]);
      expect(location.cameraTarget[2]).toBe(location.highlight[1]);
      for (const character of location.characters) {
        expect(Math.hypot(character[0] - location.highlight[0], character[1] - location.highlight[1])).toBeLessThan(8);
      }
    }
  });

  it("keeps solved urban waste hidden when mission focus changes", () => {
    expect(urbanProblemRemains([])).toBe(true);
    expect(urbanProblemRemains(["urban_repair"])).toBe(false);
    expect(urbanProblemRemains(["limpeza"])).toBe(false);
  });
});
