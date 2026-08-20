import { describe, expect, it } from "vitest";

import type { RealtimeSessionRequest } from "../../../src/domain/mission-contracts";
import { createRealtimeTokenPost, POST } from "./route";

const session: RealtimeSessionRequest = {
  missionId: "new_school",
  stepId: "design",
  language: "english",
  attempt: 1,
  satisfiedCriteria: [],
  safetyIdentifier: "install_1234567890abcdef",
};
const credential = {
  value: "ek_realtime_ephemeral_secret",
  expiresAt: 1_755_600_000,
};

function request(body: unknown = session, headers: HeadersInit = {}): Request {
  return new Request("http://localhost/api/realtime-token", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("createRealtimeTokenPost", () => {
  it("validates mission scope and returns only a no-store ephemeral credential", async () => {
    const received: RealtimeSessionRequest[] = [];
    const post = createRealtimeTokenPost({
      createClientSecret: async (validatedSession) => {
        received.push(validatedSession);
        return credential;
      },
    });

    const response = await post(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    await expect(response.json()).resolves.toEqual(credential);
    expect(received).toEqual([session]);
  });

  it.each([
    ["malformed JSON", "{not-json"],
    ["unsupported language", { ...session, language: "spanish" }],
    ["invalid mission step", { ...session, stepId: "response_plan" }],
    ["unknown fields", { ...session, apiKey: "sk-project-secret" }],
  ])("rejects %s before creating a credential", async (_name, body) => {
    let called = false;
    const post = createRealtimeTokenPost({
      createClientSecret: async () => {
        called = true;
        return credential;
      },
    });

    const response = await post(request(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
    expect(called).toBe(false);
  });

  it("rejects a declared oversized body before creating a credential", async () => {
    let called = false;
    const post = createRealtimeTokenPost({
      createClientSecret: async () => {
        called = true;
        return credential;
      },
    });

    const response = await post(request(session, { "content-length": "9000" }));

    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  it("returns realtime_unavailable without exposing project key or upstream details", async () => {
    const post = createRealtimeTokenPost({
      createClientSecret: async () => Promise.reject(new Error("upstream secret: sk-project-secret")),
    });

    const response = await post(request());
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual({ error: "realtime_unavailable" });
    expect(body).not.toContain("sk-project-secret");
    expect(body).not.toContain("upstream secret");
  });

  it("returns service_unavailable when production project key is absent", async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "service_unavailable" });
  });
});
