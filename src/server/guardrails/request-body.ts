export const MAX_JSON_BODY_BYTES = 1_000_000;

export type RequestBodyErrorCode =
  | "UNSUPPORTED_CONTENT_TYPE"
  | "CONTENT_LENGTH_EXCEEDED"
  | "BODY_TOO_LARGE"
  | "BODY_READ_FAILED"
  | "EMPTY_BODY"
  | "INVALID_JSON"
  | "JSON_OBJECT_REQUIRED";

export class RequestBodyError extends Error {
  readonly code: RequestBodyErrorCode;

  constructor(code: RequestBodyErrorCode) {
    super(code);
    this.name = "RequestBodyError";
    this.code = code;
  }
}

export async function readJsonWithLimit(
  request: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  validateMaxBytes(maxBytes);
  validateJsonContentType(request.headers.get("content-type"));
  validateDeclaredLength(request.headers.get("content-length"), maxBytes);

  const bytes = await readBodyWithLimit(request, maxBytes);
  if (bytes.byteLength === 0) {
    throw new RequestBodyError("EMPTY_BODY");
  }
  if (bytes.byteLength > maxBytes) {
    throw new RequestBodyError("BODY_TOO_LARGE");
  }

  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new RequestBodyError("INVALID_JSON");
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new RequestBodyError("JSON_OBJECT_REQUIRED");
  }
  return value as Record<string, unknown>;
}

function validateMaxBytes(maxBytes: number): void {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > MAX_JSON_BODY_BYTES) {
    throw new RangeError("maxBytes must be a positive safe integer within the supported range.");
  }
}

function validateJsonContentType(contentType: string | null): void {
  const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new RequestBodyError("UNSUPPORTED_CONTENT_TYPE");
  }
}

function validateDeclaredLength(contentLength: string | null, maxBytes: number): void {
  if (contentLength === null || !/^\d+$/.test(contentLength)) {
    return;
  }
  if (Number(contentLength) > maxBytes) {
    throw new RequestBodyError("CONTENT_LENGTH_EXCEEDED");
  }
}

async function readBodyWithLimit(request: Request, maxBytes: number): Promise<Uint8Array> {
  const body = request.body;
  if (body === null || body === undefined) {
    return new Uint8Array();
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          // Preserve the stable oversized-body error if cancellation itself fails.
        }
        throw new RequestBodyError("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof RequestBodyError) {
      throw error;
    }
    throw new RequestBodyError("BODY_READ_FAILED");
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
