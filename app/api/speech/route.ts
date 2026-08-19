import OpenAI from "openai";
import { z } from "zod";

import { HINT_KEYS, type HintKey } from "../../../src/domain/contracts";
import {
  createHintSpeech,
  type SpeechGateway,
} from "../../../src/server/speech/create-hint-speech";

export const runtime = "nodejs";

const speechRequestSchema = z.object({ hintKey: z.enum(HINT_KEYS) }).strict();

type CreateHintSpeech = (hintKey: HintKey) => Promise<ArrayBuffer>;
type OpenAISpeechRequest = {
  model: "gpt-4o-mini-tts";
  voice: "coral";
  input: string;
  response_format: "mp3";
};
type OpenAISpeechClient = {
  audio: {
    speech: {
      create(input: OpenAISpeechRequest): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
    };
  };
};
type OpenAISpeechClientFactory = (
  options: ConstructorParameters<typeof OpenAI>[0],
) => OpenAISpeechClient;

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

export function createOpenAISpeechGateway(
  apiKey: string,
  createClient: OpenAISpeechClientFactory = (options) => new OpenAI(options),
): SpeechGateway {
  const openai = createClient({ apiKey, timeout: 15_000 });

  return {
    create: async ({ responseFormat, ...input }) => {
      const response = await openai.audio.speech.create({
        ...input,
        response_format: responseFormat,
      });

      return response.arrayBuffer();
    },
  };
}

export function createSpeechPost(dependencies: { createHintSpeech: CreateHintSpeech }) {
  return async function post(request: Request): Promise<Response> {
    let hintKey: HintKey;

    try {
      ({ hintKey } = speechRequestSchema.parse(await request.json()));
    } catch {
      return json({ error: "invalid_request" }, 400);
    }

    try {
      const audio = await dependencies.createHintSpeech(hintKey);

      return new Response(audio, {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "audio/mpeg",
          "X-AI-Generated-Voice": "true",
        },
      });
    } catch {
      return json({ error: "speech_unavailable" }, 503);
    }
  };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return json({ error: "service_unavailable" }, 503);
  }

  const gateway = createOpenAISpeechGateway(apiKey);

  return createSpeechPost({
    createHintSpeech: (hintKey) => createHintSpeech(hintKey, gateway),
  })(request);
}
