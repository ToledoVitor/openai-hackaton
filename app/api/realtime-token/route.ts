import { createRealtimeClientSecret } from "../../../src/server/realtime/create-client-secret";

export const runtime = "nodejs";

type RealtimeCredential = { value: string; expiresAt: number };
type CreateClientSecret = () => Promise<RealtimeCredential>;

function json(body: unknown, status: number, cacheControl?: string): Response {
  return Response.json(body, {
    status,
    headers: cacheControl ? { "Cache-Control": cacheControl } : undefined,
  });
}

export function createRealtimeTokenPost(dependencies: { createClientSecret: CreateClientSecret }) {
  return async function post(request: Request): Promise<Response> {
    void request;

    try {
      const credential = await dependencies.createClientSecret();

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
    createClientSecret: () => createRealtimeClientSecret({ apiKey }),
  })(request);
}
