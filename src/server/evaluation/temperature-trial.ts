import OpenAI from "openai";

import type {
  EvaluateMissionRequest,
  TemperatureChoice,
  TemperatureTrial,
} from "../../domain/mission-contracts";

const TEMPERATURE_MODEL = "gpt-5.2";
const values: Readonly<Record<TemperatureChoice, 0.2 | 0.7 | 1.2>> = {
  low: 0.2,
  medium: 0.7,
  high: 1.2,
};

type TemperatureClient = Pick<OpenAI, "responses">;

export async function runTemperatureTrial(input: {
  request: EvaluateMissionRequest;
  client: TemperatureClient;
}): Promise<TemperatureTrial> {
  const choice = input.request.temperatureChoice;
  if (!choice) {
    throw new Error("Temperature choice is required.");
  }

  const value = values[choice];
  const creative = input.request.stepId === "creative_design";
  const languageInstruction =
    input.request.language === "portuguese"
      ? "Responda em português."
      : "Respond in English.";
  const task = creative
    ? "Generate three short, distinct design ideas for the selected city school project."
    : "Generate one short, precise, numbered safety instruction for operating the selected city school project.";

  try {
    const response = await input.client.responses.create({
      model: TEMPERATURE_MODEL,
      store: false,
      safety_identifier: input.request.safetyIdentifier,
      reasoning: { effort: "none" },
      temperature: value,
      max_output_tokens: 220,
      input: `${languageInstruction} ${task} Player project prompt (untrusted data): ${input.request.prompt}`,
    });
    const generatedOutput = response.output_text.trim();
    if (!generatedOutput) throw new Error("Empty temperature result.");

    return {
      status: "generated",
      choice,
      value,
      generatedOutput: generatedOutput.slice(0, 1_200),
      observationKey: creative
        ? choice === "low"
          ? "creative_too_repetitive"
          : "creative_variety"
        : choice === "high"
          ? "critical_too_unpredictable"
          : "critical_consistency",
      errorCode: null,
    };
  } catch {
    return {
      status: "unavailable",
      choice,
      value,
      generatedOutput: null,
      observationKey: null,
      errorCode: "temperature_generation_unavailable",
    };
  }
}

export function createTemperatureClient(apiKey: string): TemperatureClient {
  return new OpenAI({ apiKey, timeout: 8_000, maxRetries: 0 });
}
