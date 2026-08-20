import { describe, expect, it, vi } from "vitest";

import type { RealtimeSessionRequest } from "../domain/mission-contracts";
import { RealtimeClientError, requestRealtimeCredential } from "./realtime-credential";

const session: RealtimeSessionRequest = {
  missionId: "apartment_construction",
  stepId: "plan",
  language: "english",
  attempt: 1,
  satisfiedCriteria: [],
  safetyIdentifier: "install_1234567890abcdef",
};

describe("requestRealtimeCredential", () => {
  it("requests a mission-scoped ephemeral credential from same-origin route", async () => {
    const fetcher = vi.fn(async () => Response.json({ value: "ek_short_lived", expiresAt: 1_755_600_000 }));

    await expect(requestRealtimeCredential(session, { fetcher })).resolves.toEqual({
      value: "ek_short_lived",
      expiresAt: 1_755_600_000,
    });
    expect(fetcher).toHaveBeenCalledWith("/api/realtime-token", expect.objectContaining({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(session),
    }));
  });

  it.each([
    [Response.json({ value: "", expiresAt: 1 }), "invalid_credential"],
    [Response.json({ value: "ek", expiresAt: "tomorrow" }), "invalid_credential"],
    [Response.json({ error: "rate_limited" }, { status: 429 }), "rate_limited"],
    [Response.json({ error: "service_unavailable" }, { status: 503 }), "unavailable"],
  ] as const)("maps malformed or failed credential response without leaking payload", async (response, code) => {
    const error = await requestRealtimeCredential(session, { fetcher: async () => response }).catch((cause) => cause);

    expect(error).toBeInstanceOf(RealtimeClientError);
    expect(error.code).toBe(code);
  });
});
