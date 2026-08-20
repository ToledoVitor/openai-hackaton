import { describe, expect, it } from "vitest";

import { createProgressPost } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/progress", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("progress verification route", () => {
  it("returns only server-verified completion", async () => {
    const post = createProgressPost({
      verify: (receipt, safetyIdentifier) => receipt === "signed.receipt" && safetyIdentifier === "install_1234567890abcdef"
        ? {
            completedMissionIds: ["apartment_construction"],
            criteria: { school_construction: ["school_scale_defined", "school_accessible"] },
            choices: { school_construction: "school_hub" },
          }
        : null,
    });

    const response = await post(request({
      progressReceipt: "signed.receipt",
      safetyIdentifier: "install_1234567890abcdef",
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      completedMissionIds: ["apartment_construction"],
      criteria: { school_construction: ["school_scale_defined", "school_accessible"] },
      choices: { school_construction: "school_hub" },
      progressReceipt: "signed.receipt",
    });
  });

  it("recovers a forged receipt to empty progress", async () => {
    const post = createProgressPost({ verify: () => null });
    const response = await post(request({
      progressReceipt: "forged.receipt",
      safetyIdentifier: "install_1234567890abcdef",
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      completedMissionIds: [], criteria: {}, choices: {},
    });
  });
});
