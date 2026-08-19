import { describe, expect, it } from "vitest";

import type { EvaluationRequest, TurnResult } from "../../../src/domain/contracts";
import { ModerationUnavailableError } from "../../../src/server/evaluation/errors";
import { createEvaluatePost, POST } from "./route";

const validRequest: EvaluationRequest = {
  prompt: "Build Town Hall with a step-free entrance.",
  questId: "town-hall",
  currentPassedNeeds: [],
  safetyIdentifier: "install_1234567890abcdef",
};

const validResult: TurnResult = {
  source: "live",
  offTopic: false,
  repairDelta: ["accessibleEntrance"],
  passedNeeds: ["accessibleEntrance"],
  nextStage: "partial",
  citizenLine: "A step-free entrance welcomes every neighbor.",
  nextHint: "requireClearSign",
  celebration: false,
};

function request(body: string): Request {
  return new Request("http://localhost/api/evaluate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("createEvaluatePost", () => {
  it("rejects a declared oversized JSON body before evaluation", async () => {
    let evaluated = false;
    const post = createEvaluatePost({ evaluate: async () => {
      evaluated = true;
      return validResult;
    }});
    const response = await post(new Request("http://localhost/api/evaluate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "20000",
      },
      body: JSON.stringify(validRequest),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
    expect(evaluated).toBe(false);
  });

  it("returns service_unavailable from the production handler when the project key is absent", async () => {
    const originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const response = await POST(request(JSON.stringify(validRequest)));

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

  it.each([
    ["malformed JSON", "{not-json"],
    ["an invalid request", JSON.stringify({ ...validRequest, prompt: "   " })],
  ])("returns invalid_request for %s", async (_name, body) => {
    const post = createEvaluatePost({ evaluate: async () => validResult });

    const response = await post(request(body));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
  });

  it("returns moderation_unavailable when moderation cannot run", async () => {
    const post = createEvaluatePost({
      evaluate: async () => Promise.reject(new ModerationUnavailableError()),
    });

    const response = await post(request(JSON.stringify(validRequest)));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "moderation_unavailable" });
  });

  it("returns a no-store validated turn result without serializing the project key", async () => {
    const post = createEvaluatePost({ evaluate: async () => validResult });

    const response = await post(request(JSON.stringify(validRequest)));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.parse(body)).toEqual(validResult);
    expect(body).not.toContain("sk-project-secret");
  });
});
