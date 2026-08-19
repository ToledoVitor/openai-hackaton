import { describe, expect, it } from "vitest";

import { HINT_TEXT } from "../../domain/hints";
import { HINT_KEYS, type HintKey } from "../../domain/contracts";
import {
  createHintSpeech,
  SpeechUnavailableError,
  type SpeechGateway,
} from "./create-hint-speech";

const requestShape = {
  model: "gpt-4o-mini-tts" as const,
  voice: "coral" as const,
  responseFormat: "mp3" as const,
};

function gatewayReturning(audio: ArrayBuffer): {
  gateway: SpeechGateway;
  calls: Array<Parameters<SpeechGateway["create"]>[0]>;
} {
  const calls: Array<Parameters<SpeechGateway["create"]>[0]> = [];

  return {
    gateway: {
      create: async (input) => {
        calls.push(input);
        return audio;
      },
    },
    calls,
  };
}

describe("createHintSpeech", () => {
  it.each(HINT_KEYS)("uses the approved %s hint text and speech request", async (hintKey) => {
    const fake = gatewayReturning(new ArrayBuffer(24));

    await expect(createHintSpeech(hintKey, fake.gateway)).resolves.toBeInstanceOf(ArrayBuffer);

    expect(fake.calls).toEqual([
      {
        ...requestShape,
        input: HINT_TEXT[hintKey],
      },
    ]);
  });

  it("rejects an unknown hint key before calling the speech gateway", async () => {
    const fake = gatewayReturning(new ArrayBuffer(24));

    await expect(createHintSpeech("madeUpHint" as HintKey, fake.gateway)).rejects.toBeInstanceOf(
      SpeechUnavailableError,
    );
    expect(fake.calls).toEqual([]);
  });

  it.each([
    ["empty audio", new ArrayBuffer(0)],
    ["audio larger than 2 MiB", new ArrayBuffer(2 * 1024 * 1024 + 1)],
  ])("rejects %s", async (_name, audio) => {
    const fake = gatewayReturning(audio);

    await expect(createHintSpeech("requireClearSign", fake.gateway)).rejects.toBeInstanceOf(
      SpeechUnavailableError,
    );
  });
});
