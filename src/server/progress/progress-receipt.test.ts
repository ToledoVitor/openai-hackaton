import { describe, expect, it } from "vitest";

import { createProgressAuthority } from "./progress-receipt";

describe("progress receipts", () => {
  it("authenticates independent mission progress for one installation", () => {
    const authority = createProgressAuthority("offline-test-secret");
    const receipt = authority.issue("install_1234567890abcdef", {
      completedMissionIds: ["urban_repair", "apartment_construction"],
      criteria: {
        school_construction: ["school_accessible", "school_scale_defined", "invented"],
      },
      choices: { school_construction: "school_hub" },
    });

    expect(authority.verify(receipt, "install_1234567890abcdef")).toEqual({
      completedMissionIds: ["apartment_construction", "urban_repair"],
      criteria: { school_construction: ["school_scale_defined", "school_accessible"] },
      choices: { school_construction: "school_hub" },
    });
    expect(authority.verify(receipt, "install_other_1234567890")).toBeNull();
    expect(authority.verify(`${receipt}tampered`, "install_1234567890abcdef")).toBeNull();
  });

  it("refuses duplicate progress entries", () => {
    const authority = createProgressAuthority("offline-test-secret");
    expect(() => authority.issue("install_1234567890abcdef", {
      completedMissionIds: ["hospital_construction", "hospital_construction"],
      criteria: {},
      choices: {},
    })).toThrow();
  });
});
