import { describe, expect, it, vi } from "vitest";

import type { EvaluationRequest, PromptExtraction } from "../../domain/contracts";
import { selectFallback } from "../../domain/fallback-bank";
import { ModerationUnavailableError } from "./errors";
import { evaluatePrompt, type ExtractionGateway, type ModerationGateway } from "./evaluate-prompt";

const request: EvaluationRequest = {
  prompt: "Build Town Hall with a step-free entrance and a clear CITY HALL sign.",
  questId: "town-hall",
  currentPassedNeeds: ["accessibleEntrance"],
  safetyIdentifier: "install_1234567890abcdef",
};

const validExtraction: PromptExtraction = {
  offTopic: false,
  promptBlueprint: { goal: true, context: true, constraints: true, output: true },
  civicTraits: { accessibleEntrance: true, clearSign: true, weatherCover: false },
  evidence: ["The plan specifies an accessible entrance and readable sign."],
  citizenLine: "Every neighbor can enter and identify Town Hall.",
  nextHint: "requireWeatherCover",
};

function dependencies(input: {
  flagged?: boolean;
  extract?: () => Promise<unknown>;
  moderation?: () => Promise<boolean>;
  calls?: string[];
} = {}): { moderation: ModerationGateway; extraction: ExtractionGateway } {
  return {
    moderation: {
      isFlagged: async () => {
        input.calls?.push("moderation");
        return input.moderation ? input.moderation() : (input.flagged ?? false);
      },
    },
    extraction: {
      extract: async () => {
        input.calls?.push("extraction");
        return input.extract ? input.extract() : validExtraction;
      },
    },
  };
}

describe("evaluatePrompt", () => {
  it("moderates before extracting and runs the deterministic quest engine", async () => {
    const calls: string[] = [];

    await expect(evaluatePrompt(request, dependencies({ calls }))).resolves.toEqual({
      source: "live",
      offTopic: false,
      repairDelta: ["clearSign"],
      passedNeeds: ["accessibleEntrance", "clearSign"],
      nextStage: "partial",
      citizenLine: "Every neighbor can enter and identify Town Hall.",
      nextHint: "requireWeatherCover",
      celebration: false,
    });
    expect(calls).toEqual(["moderation", "extraction"]);
  });

  it("returns a live playful redirect without extracting flagged input", async () => {
    const calls: string[] = [];

    await expect(evaluatePrompt(request, dependencies({ flagged: true, calls }))).resolves.toEqual({
      source: "live",
      offTopic: true,
      repairDelta: [],
      passedNeeds: ["accessibleEntrance"],
      nextStage: "partial",
      citizenLine: "Let’s keep our attention on making Town Hall work for everyone.",
      nextHint: "playfulRedirect",
      celebration: false,
    });
    expect(calls).toEqual(["moderation"]);
  });

  it("keeps existing progress unchanged for a live off-topic extraction", async () => {
    const offTopicExtraction: PromptExtraction = {
      ...validExtraction,
      offTopic: true,
      civicTraits: { accessibleEntrance: true, clearSign: true, weatherCover: true },
    };

    await expect(
      evaluatePrompt(request, dependencies({ extract: async () => offTopicExtraction })),
    ).resolves.toMatchObject({
      source: "live",
      offTopic: true,
      repairDelta: [],
      passedNeeds: ["accessibleEntrance"],
      nextHint: "playfulRedirect",
    });
  });

  it.each([
    ["a rejected extraction", async () => Promise.reject(new Error("network failed"))],
    ["a timed-out extraction", async () => Promise.reject(new Error("request timed out"))],
    ["schema-invalid extraction output", async () => ({ offTopic: false })],
  ])("uses the prepared fallback after %s", async (_name, extract) => {
    await expect(evaluatePrompt(request, dependencies({ extract }))).resolves.toEqual(
      selectFallback(["accessibleEntrance"]),
    );
  });

  it("propagates a deterministic quest-engine failure after valid extraction", async () => {
    vi.resetModules();
    vi.doMock("../../domain/quest-engine", async () => {
      const actual = await vi.importActual<typeof import("../../domain/quest-engine")>(
        "../../domain/quest-engine",
      );
      let calls = 0;

      return {
        ...actual,
        evaluateQuest: (...input: Parameters<typeof actual.evaluateQuest>) => {
          calls += 1;
          if (calls === 1) {
            throw new Error("quest engine defect");
          }

          return actual.evaluateQuest(...input);
        },
      };
    });

    try {
      const { evaluatePrompt: evaluateWithFailingQuest } = await import("./evaluate-prompt");

      await expect(
        evaluateWithFailingQuest(request, dependencies({ extract: async () => validExtraction })),
      ).rejects.toThrow("quest engine defect");
    } finally {
      vi.doUnmock("../../domain/quest-engine");
      vi.resetModules();
    }
  });

  it("propagates moderation unavailability without extracting", async () => {
    const calls: string[] = [];
    const moderationError = new ModerationUnavailableError();

    await expect(
      evaluatePrompt(
        request,
        dependencies({
          calls,
          moderation: async () => Promise.reject(moderationError),
        }),
      ),
    ).rejects.toBe(moderationError);
    expect(calls).toEqual(["moderation"]);
  });
});
