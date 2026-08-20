import { describe, expect, it, vi } from "vitest";

import { fetchVerifiedProgress } from "./progress-client";

describe("verified progress client", () => {
  it("loads strict server-verified progress through same-origin route", async () => {
    const fetcher = vi.fn(async () => Response.json({
      completedMissionIds: ["apartment_construction"],
      progressReceipt: "signed.receipt",
    }));

    await expect(fetchVerifiedProgress({
      safetyIdentifier: "install_1234567890abcdef",
      progressReceipt: "signed.receipt",
    }, { fetcher })).resolves.toEqual({
      completedMissionIds: ["apartment_construction"],
      progressReceipt: "signed.receipt",
    });
    expect(fetcher).toHaveBeenCalledWith("/api/progress", expect.objectContaining({ method: "POST" }));
  });

  it("rejects malformed progress responses", async () => {
    await expect(fetchVerifiedProgress({
      safetyIdentifier: "install_1234567890abcdef",
      progressReceipt: "signed.receipt",
    }, { fetcher: async () => Response.json({ completedMissionIds: ["urban_repair"] }) })).rejects.toThrow("invalid_progress_response");
  });
});
