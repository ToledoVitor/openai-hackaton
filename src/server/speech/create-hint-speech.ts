import { z } from "zod";

import { HINT_TEXT } from "../../domain/hints";
import { HINT_KEYS, type HintKey } from "../../domain/contracts";

const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const hintKeySchema = z.enum(HINT_KEYS);

export interface SpeechGateway {
  create(input: {
    model: "gpt-4o-mini-tts";
    voice: "coral";
    input: string;
    responseFormat: "mp3";
  }): Promise<ArrayBuffer>;
}

export class SpeechUnavailableError extends Error {
  constructor() {
    super("Hint speech is unavailable.");
    this.name = "SpeechUnavailableError";
  }
}

export async function createHintSpeech(hintKey: HintKey, gateway: SpeechGateway): Promise<ArrayBuffer> {
  let approvedHintKey: HintKey;

  try {
    approvedHintKey = hintKeySchema.parse(hintKey);
  } catch {
    throw new SpeechUnavailableError();
  }

  try {
    const audio = await gateway.create({
      model: "gpt-4o-mini-tts",
      voice: "coral",
      input: HINT_TEXT[approvedHintKey],
      responseFormat: "mp3",
    });

    if (audio.byteLength === 0 || audio.byteLength > MAX_AUDIO_BYTES) {
      throw new SpeechUnavailableError();
    }

    return audio;
  } catch (error) {
    if (error instanceof SpeechUnavailableError) {
      throw error;
    }

    throw new SpeechUnavailableError();
  }
}
