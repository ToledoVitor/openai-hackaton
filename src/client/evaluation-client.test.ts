import { describe, expect, it, vi } from "vitest";

import type { EvaluateMissionRequest, EvaluateMissionResponse } from "../domain/mission-contracts";
import { ClientEvaluationError, evaluateMissionOnServer } from "./evaluation-client";

const request: EvaluateMissionRequest = {
  missionId: "apartment_construction",
  stepId: "plan",
  language: "english",
  prompt: "Build accessible apartments.",
  attempt: 1,
  satisfiedCriteria: [],
  safetyIdentifier: "install_1234567890abcdef",
};

const result: EvaluateMissionResponse = {
  missionId: "apartment_construction",
  stepId: "plan",
  language: "english",
  source: "fallback",
  status: "partial",
  choice: "balanced_housing",
  progress: {
    satisfied: ["housing_goal_clear"],
    newlySatisfied: ["housing_goal_clear"],
    regressed: [],
    missing: ["housing_budget_defined"],
  },
  teachingConcept: "Goals and constraints",
  feedback: {
    summary: "Plan improved.",
    explanation: "Budget remains.",
    nextInstruction: "Add a budget.",
  },
  effectKeys: ["housing_plan_incomplete"],
  progressReceipt: "signed.partial-progress",
};

describe("evaluateMissionOnServer", () => {
  it("posts only to the same-origin server route and validates success", async () => {
    const fetcher = vi.fn(async () => Response.json(result));

    await expect(evaluateMissionOnServer(request, { fetcher })).resolves.toEqual(result);
    expect(fetcher).toHaveBeenCalledWith("/api/evaluate", expect.objectContaining({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    }));
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain("OPENAI_API_KEY");
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain("Bearer");
  });

  it.each([
    [429, "rate_limited", "rate_limited"],
    [503, "moderation_unavailable", "provider_unavailable"],
    [500, "internal_error", "provider_unavailable"],
    [400, "invalid_request", "invalid_request"],
  ] as const)("maps HTTP %s/%s to %s", async (status, serverCode, clientCode) => {
    const fetcher = async () => Response.json(
      { error: { code: serverCode, message: "sensitive provider detail", retryable: status >= 500 } },
      { status },
    );

    await expect(evaluateMissionOnServer(request, { fetcher })).rejects.toMatchObject({
      name: "ClientEvaluationError",
      code: clientCode,
    });
  });

  it("rejects malformed success without exposing payload details", async () => {
    const fetcher = async () => Response.json({ ...result, secret: "sk-project-secret" });

    const error = await evaluateMissionOnServer(request, { fetcher }).catch((cause) => cause);

    expect(error).toBeInstanceOf(ClientEvaluationError);
    expect(error.code).toBe("invalid_response");
    expect(String(error)).not.toContain("sk-project-secret");
  });

  it("rejects learning mission success without a server progress receipt", async () => {
    const { progressReceipt: _receipt, ...unsigned } = result;
    const fetcher = async () => Response.json({
      ...unsigned,
      status: "success",
      effectKeys: ["housing_complete"],
    });

    await expect(evaluateMissionOnServer(request, { fetcher })).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("rejects partial progress without a server progress receipt", async () => {
    const { progressReceipt: _receipt, ...unsigned } = result;
    const fetcher = async () => Response.json(unsigned);

    await expect(evaluateMissionOnServer(request, { fetcher })).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("maps offline and timeout failures to recoverable client codes", async () => {
    const offline = async () => Promise.reject(new TypeError("Failed to fetch private URL"));
    const timeout = async () => Promise.reject(new DOMException("provider stack", "TimeoutError"));

    await expect(evaluateMissionOnServer(request, { fetcher: offline })).rejects.toMatchObject({ code: "network_error" });
    await expect(evaluateMissionOnServer(request, { fetcher: timeout })).rejects.toMatchObject({ code: "timeout" });
  });
});
