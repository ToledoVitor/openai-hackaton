import { describe, expect, it } from "vitest";

import { createInitialJourneyState } from "./learning-journey";
import { NPC_IDS, getNpcDialogue } from "./npc-dialogue";

describe("deterministic city NPC dialogue", () => {
  it("links one NPC to each learning mission", () => {
    expect(NPC_IDS).toEqual(["housing_resident", "hospital_nurse", "urban_guardian"]);
  });

  it.each([
    ["housing_resident", "apartment_construction"],
    ["hospital_nurse", "hospital_construction"],
    ["urban_guardian", "urban_repair"],
  ] as const)("reports %s issue until %s is complete, then acknowledges improvement", (npcId, missionId) => {
    const before = getNpcDialogue(npcId, createInitialJourneyState(), "english");
    const after = getNpcDialogue(npcId, {
      ...createInitialJourneyState(),
      completedMissionIds: ["apartment_construction", "hospital_construction", "urban_repair"],
    }, "english");

    expect(before.state).toBe("unsolved");
    expect(before.relatedMissionId).toBe(missionId);
    expect(after.state).toBe("improved");
    expect(after.line).not.toBe(before.line);
  });

  it("returns complete, distinct lines in both languages", () => {
    const state = createInitialJourneyState();
    for (const npcId of NPC_IDS) {
      const portuguese = getNpcDialogue(npcId, state, "portuguese");
      const english = getNpcDialogue(npcId, state, "english");
      expect(portuguese.name).toBeTruthy();
      expect(portuguese.line).toBeTruthy();
      expect(english.line).toBeTruthy();
      expect(english.line).not.toBe(portuguese.line);
    }
  });
});
