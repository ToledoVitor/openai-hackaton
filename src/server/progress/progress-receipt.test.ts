import { describe, expect, it } from "vitest";

import { createProgressAuthority } from "./progress-receipt";

describe("progress receipts", () => {
  it("authenticates ordered progress for one installation", () => {
    const authority = createProgressAuthority("offline-test-secret");
    const receipt = authority.issue("install_1234567890abcdef", ["apartment_construction"]);

    expect(authority.verify(receipt, "install_1234567890abcdef")).toEqual({
      completedMissionIds: ["apartment_construction"],
    });
    expect(authority.verify(receipt, "install_other_1234567890")).toBeNull();
    expect(authority.verify(`${receipt}tampered`, "install_1234567890abcdef")).toBeNull();
  });

  it("refuses to issue inconsistent progress", () => {
    const authority = createProgressAuthority("offline-test-secret");
    expect(() => authority.issue("install_1234567890abcdef", ["hospital_construction"])).toThrow();
  });
});
