import {
  realtimeSessionRequestSchema,
  type RealtimeSessionRequest,
} from "../../../src/domain/mission-contracts";
import { readJsonWithLimit } from "../../../src/server/guardrails";
import { createRealtimeClientSecret } from "../../../src/server/realtime/create-client-secret";
export const runtime = "nodejs";

type RealtimeCredential = { value: string; expiresAt: number; model?: string };
type CreateClientSecret = (session: RealtimeSessionRequest) => Promise<RealtimeCredential>;

const REALTIME_BODY_LIMIT_BYTES = 8 * 1024;

function json(body: unknown, status: number, cacheControl?: string): Response {
  return Response.json(body, {
    status,
    headers: cacheControl ? { "Cache-Control": cacheControl } : undefined,
  });
}

export function createRealtimeTokenPost(dependencies: { createClientSecret: CreateClientSecret }) {
  return async function post(request: Request): Promise<Response> {
    let session: RealtimeSessionRequest;
    try {
      session = realtimeSessionRequestSchema.parse(
        await readJsonWithLimit(request, REALTIME_BODY_LIMIT_BYTES),
      );
    } catch {
      return json({ error: "invalid_request" }, 400);
    }

    try {
      const credential = await dependencies.createClientSecret(session);

      return json(credential, 200, "no-store");
    } catch {
      return json({ error: "realtime_unavailable" }, 503);
    }
  };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return json({ error: "service_unavailable" }, 503);
  }

  return createRealtimeTokenPost({
    createClientSecret: (session) =>
      createRealtimeClientSecret({
        apiKey,
        session,
        model: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime",
      }),
  })(request);
}
