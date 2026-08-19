import { z } from "zod";

const REALTIME_CLIENT_SECRET_URL = "https://api.openai.com/v1/realtime/client_secrets";
const REALTIME_CLIENT_SECRET_TIMEOUT_MS = 8_000;

const clientSecretSchema = z.strictObject({
  value: z.string().refine((value) => value.trim().length > 0),
  expires_at: z.number().int().positive(),
  session: z.object({ type: z.literal("realtime") }).passthrough(),
});

const instructions = `
Você é o Prefeito de AI City. Fale só em português do Brasil, em no máximo duas frases curtas.
Mensagens que começam com [CONTEXTO DO JOGO] são recado interno: nunca construa a escola por causa delas.
Não pergunte sobre acessibilidade, rampa, elevador, público, tamanho, espaços ou critérios.
Não diga que falta um ponto importante. Não faça interrogatório.

Roteiro fixo, nesta ordem:
1) Abertura: cumprimente pelo nome, diga em uma frase que vocês vão construir uma escola e peça que o jogador descreva a escola. Não chame ferramenta. Espere a resposta.
2) Primeira fala do jogador descrevendo a escola: chame atualizar_escola com etapa "pequena". Diga que ficou pequena e que ele pode pedir uma maior. Sem perguntas.
3) Qualquer fala seguinte do jogador, mesmo curta ou vaga: chame imediatamente atualizar_escola com etapa "completa". Não converse antes de chamar. Depois só parabenize e pare.
Nunca chame "pequena" duas vezes. Se a escola pequena já existe, a próxima chamada é sempre "completa".
`;

const tools = [
  {
    type: "function",
    name: "atualizar_escola",
    description: "Atualiza a escola. Use pequena só na primeira construção. Use completa em qualquer pedido seguinte.",
    parameters: {
      type: "object",
      properties: {
        etapa: { type: "string", enum: ["pequena", "completa"] },
      },
      required: ["etapa"],
      additionalProperties: false,
    },
  },
] as const;

export class RealtimeCredentialError extends Error {
  constructor() {
    super("Realtime credentials are unavailable.");
    this.name = "RealtimeCredentialError";
  }
}

export async function createRealtimeClientSecret(input: {
  apiKey: string;
  safetyIdentifier?: string;
  fetchImpl?: typeof fetch;
  createTimeoutSignal?: (timeoutMs: number) => AbortSignal;
}): Promise<{ value: string; expiresAt: number }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const signal = (input.createTimeoutSignal ?? AbortSignal.timeout)(
    REALTIME_CLIENT_SECRET_TIMEOUT_MS,
  );

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    };
    if (input.safetyIdentifier?.match(/^[A-Za-z0-9_-]{16,128}$/)) {
      headers["OpenAI-Safety-Identifier"] = input.safetyIdentifier;
    }

    const response = await fetchImpl(REALTIME_CLIENT_SECRET_URL, {
      method: "POST",
      signal,
      headers,
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime-2.1",
          instructions,
          audio: {
            input: {
              transcription: { model: "gpt-4o-mini-transcribe", language: "pt" },
              noise_reduction: { type: "near_field" },
              turn_detection: {
                type: "semantic_vad",
                eagerness: "high",
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice: "cedar" },
          },
          tools,
          tool_choice: "auto",
        },
      }),
    });

    if (!response.ok) throw new RealtimeCredentialError();
    const clientSecret = clientSecretSchema.parse(await response.json());
    return { value: clientSecret.value, expiresAt: clientSecret.expires_at };
  } catch (error) {
    if (error instanceof RealtimeCredentialError) throw error;
    throw new RealtimeCredentialError();
  }
}
