import { describe, expect, it } from "vitest";

import { type NeedKey, turnResultSchema } from "./contracts";
import { selectFallback } from "./fallback-bank";

describe("selectFallback", () => {
  it.each<{
    name: string;
    currentPassedNeeds: NeedKey[];
    repairDelta: NeedKey[];
    passedNeeds: NeedKey[];
  }>([
    {
      name: "starts with the accessible entrance",
      currentPassedNeeds: [],
      repairDelta: ["accessibleEntrance"],
      passedNeeds: ["accessibleEntrance"],
    },
    {
      name: "adds only the civic sign after the entrance",
      currentPassedNeeds: ["accessibleEntrance"],
      repairDelta: ["clearSign"],
      passedNeeds: ["accessibleEntrance", "clearSign"],
    },
    {
      name: "adds only weather cover after two passed needs",
      currentPassedNeeds: ["accessibleEntrance", "clearSign"],
      repairDelta: ["weatherCover"],
      passedNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
    },
    {
      name: "keeps a completed Town Hall complete",
      currentPassedNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
      repairDelta: [],
      passedNeeds: ["accessibleEntrance", "clearSign", "weatherCover"],
    },
  ])("$name", ({ currentPassedNeeds, repairDelta, passedNeeds }) => {
    const result = selectFallback(currentPassedNeeds);

    expect(result.source).toBe("fallback");
    expect(result.repairDelta).toEqual(repairDelta);
    expect(result.passedNeeds).toEqual(passedNeeds);
    expect(turnResultSchema.safeParse(result).success).toBe(true);
  });
});
