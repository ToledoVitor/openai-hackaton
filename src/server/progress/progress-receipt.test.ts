import { describe, expect, it } from "vitest";

import { createProgressAuthority } from "./progress-receipt";

describe("progress receipts", () => {
  it("authenticates independent mission progress for one installation", () => {
    const authority = createProgressAuthority("offline-test-secret");
    const receipt = authority.issue("install_1234567890abcdef", ["urban_repair", "apartment_construction"]);

    expect(authority.verify(receipt, "install_1234567890abcdef")).toEqual({
      completedMissionIds: ["apartment_construction", "urban_repair"],
    });
    expect(authority.verify(receipt, "install_other_1234567890")).toBeNull();
    expect(authority.verify(`${receipt}tampered`, "install_1234567890abcdef")).toBeNull();
  });

  it("refuses duplicate progress entries", () => {
    const authority = createProgressAuthority("offline-test-secret");
    expect(() => authority.issue("install_1234567890abcdef", ["hospital_construction", "hospital_construction"])).toThrow();
  });
});
