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

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch {
    throw new RequestBodyError("BODY_READ_FAILED");
  }
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
