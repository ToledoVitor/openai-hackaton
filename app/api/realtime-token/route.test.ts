import { describe, expect, it } from "vitest";

import { createRealtimeTokenPost, POST } from "./route";

const credential = {
  value: "ek_realtime_ephemeral_secret",
  expiresAt: 1_755_600_000,
};

function request(): Request {
  return new Request("http://localhost/api/realtime-token", { method: "POST" });
}

describe("createRealtimeTokenPost", () => {
  it("returns a no-store ephemeral credential", async () => {
    const post = createRealtimeTokenPost({ createClientSecret: async () => credential });

    const response = await post(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(credential);
  });

  it("returns realtime_unavailable without exposing the project key or upstream details", async () => {
    const post = createRealtimeTokenPost({
      createClientSecret: async () => Promise.reject(new Error("upstream secret detail: sk-project-secret")),
    });

    const response = await post(request());
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(JSON.parse(body)).toEqual({ error: "realtime_unavailable" });
    expect(body).not.toContain("sk-project-secret");
    expect(body).not.toContain("upstream secret detail");
  });

  it("returns service_unavailable from the production handler when the project key is absent", async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const response = await POST(request());

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({ error: "service_unavailable" });
    } finally {
      if (originalApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalApiKey;
      }
    }
  });
});
