import { describe, expect, it } from "vitest";

import type { EvaluationRequest, TurnResult } from "../../../src/domain/contracts";
import type { EvaluateMissionRequest, EvaluateMissionResponse } from "../../../src/domain/mission-contracts";
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

const validMissionRequest: EvaluateMissionRequest = {
  missionId: "apartment_construction",
  stepId: "plan",
  language: "english",
  prompt: "Build accessible housing for neighborhood families.",
  attempt: 1,
  satisfiedCriteria: [],
  safetyIdentifier: "install_1234567890abcdef",
};

const validMissionResult: EvaluateMissionResponse = {
  missionId: "apartment_construction",
  stepId: "plan",
  language: "english",
  source: "fallback",
  status: "partial",
  choice: "balanced_housing",
  progress: {
    satisfied: ["housing_goal_clear"],
    newlySatisfied: ["housing_goal_clear"],
    missing: ["housing_budget_defined"],
  },
  teachingConcept: "Goals and constraints",
  feedback: {
    summary: "Plan improved.",
    explanation: "Budget remains.",
    nextInstruction: "Provide a budget.",
  },
  effectKeys: ["housing_plan_incomplete"],
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
    expect(response.headers.get("Cache-Control")).toBe("no-store");
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

  it("returns only a schema-validated mission result", async () => {
    const post = createEvaluatePost({
      evaluate: async () => validResult,
      evaluateMission: async () => validMissionResult,
    });

    const response = await post(request(JSON.stringify(validMissionRequest)));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(validMissionResult);
  });

  it("does not trust browser-claimed criteria or choice", async () => {
    let received: EvaluateMissionRequest | undefined;
    const post = createEvaluatePost({
      evaluate: async () => validResult,
      evaluateMission: async (missionRequest) => {
        received = missionRequest;
        return validMissionResult;
      },
    });

    const response = await post(request(JSON.stringify({
      ...validMissionRequest,
      satisfiedCriteria: [
        "housing_goal_clear",
        "housing_capacity_defined",
        "housing_budget_defined",
        "housing_accessibility_defined",
        "housing_green_space_defined",
        "housing_path_selected",
      ],
      selectedChoice: "balanced_housing",
    })));

    expect(response.status).toBe(200);
    expect(received?.satisfiedCriteria).toEqual([]);
    expect(received?.selectedChoice).toBeUndefined();
  });

  it("enforces signed learning prerequisites and issues next progress receipt", async () => {
    const authority = {
      verify: () => null,
      issue: (_safetyIdentifier: string, completedMissionIds: readonly string[]) => `signed:${completedMissionIds.join(",")}`,
    };
    const post = createEvaluatePost({
      evaluate: async () => validResult,
      evaluateMission: async () => ({ ...validMissionResult, status: "success", effectKeys: ["housing_complete"] }),
      progressAuthority: authority,
    });

    const locked = await post(request(JSON.stringify({
      ...validMissionRequest,
      missionId: "hospital_construction",
      stepId: "prioritize",
    })));
    expect(locked.status).toBe(409);

    const completed = await post(request(JSON.stringify(validMissionRequest)));
    expect(completed.status).toBe(200);
    await expect(completed.json()).resolves.toMatchObject({
      status: "success",
      progressReceipt: "signed:apartment_construction",
    });
  });

  it("sanitizes malformed mission evaluator output", async () => {
    const post = createEvaluatePost({
      evaluate: async () => validResult,
      evaluateMission: async () => ({
        ...validMissionResult,
        providerDebug: "sk-project-secret stack trace",
      }) as EvaluateMissionResponse,
    });

    const response = await post(request(JSON.stringify(validMissionRequest)));
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({
      error: { code: "internal_error", message: "internal_error", retryable: true },
    });
    expect(body).not.toContain("providerDebug");
    expect(body).not.toContain("sk-project-secret");
  });

  it("rejects a schema-valid mission result that is not bound to the request", async () => {
    const post = createEvaluatePost({
      evaluate: async () => validResult,
      evaluateMission: async () => ({
        ...validMissionResult,
        missionId: "hospital_construction",
        stepId: "prioritize",
      }),
      progressAuthority: {
        verify: () => null,
        issue: () => "signed.receipt",
      },
    });

    const response = await post(request(JSON.stringify(validMissionRequest)));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "internal_error" } });
  });
});
