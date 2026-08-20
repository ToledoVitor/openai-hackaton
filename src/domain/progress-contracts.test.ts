import { describe, expect, it } from "vitest";

import { progressResponseSchema } from "./progress-contracts";

describe("progress contract", () => {
  it("accepts independent mission completions in canonical registry order", () => {
    expect(progressResponseSchema.safeParse({
      completedMissionIds: ["apartment_construction", "urban_repair"],
      criteria: { school_construction: ["school_scale_defined", "school_accessible"] },
      choices: { school_construction: "school_hub" },
    }).success).toBe(true);
    expect(progressResponseSchema.safeParse({
      completedMissionIds: ["urban_repair", "apartment_construction"],
    }).success).toBe(false);
  });

  it("rejects duplicate mission completions", () => {
    expect(progressResponseSchema.safeParse({
      completedMissionIds: ["hospital_construction", "hospital_construction"],
    }).success).toBe(false);
  });
});
