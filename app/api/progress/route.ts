import { progressRequestSchema, progressResponseSchema } from "../../../src/domain/progress-contracts";
import { readJsonWithLimit } from "../../../src/server/guardrails";
import {
  createProgressAuthority,
  type ProgressAuthority,
} from "../../../src/server/progress/progress-receipt";

export const runtime = "nodejs";

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

export function createProgressPost(authority: Pick<ProgressAuthority, "verify">) {
  return async function post(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await readJsonWithLimit(request, 4 * 1024);
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
    const parsed = progressRequestSchema.safeParse(body);
    if (!parsed.success) return json({ error: "invalid_request" }, 400);
    if (!parsed.data.progressReceipt) return json({ completedMissionIds: [] }, 200);

    const verified = authority.verify(parsed.data.progressReceipt, parsed.data.safetyIdentifier);
    const response = verified
      ? { ...verified, progressReceipt: parsed.data.progressReceipt }
      : { completedMissionIds: [] };
    return json(progressResponseSchema.parse(response), 200);
  };
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  const authority = apiKey ? createProgressAuthority(apiKey) : { verify: () => null };
  return createProgressPost(authority)(request);
}
