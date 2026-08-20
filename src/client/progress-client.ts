import {
  progressRequestSchema,
  progressResponseSchema,
  type ProgressRequest,
  type ProgressResponse,
} from "../domain/progress-contracts";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function fetchVerifiedProgress(
  request: ProgressRequest,
  options: { fetcher?: Fetcher; signal?: AbortSignal } = {},
): Promise<ProgressResponse> {
  const safeRequest = progressRequestSchema.parse(request);
  const response = await (options.fetcher ?? fetch)("/api/progress", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(safeRequest),
    signal: options.signal ?? AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("progress_unavailable");
  const parsed = progressResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("invalid_progress_response");
  return parsed.data;
}
