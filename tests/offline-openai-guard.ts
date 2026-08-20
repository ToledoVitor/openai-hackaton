import { vi } from "vitest";

type FetchInput = Parameters<typeof fetch>[0];

export function isOpenAIProviderUrl(input: FetchInput): boolean {
  try {
    const rawUrl = input instanceof Request ? input.url : String(input);
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return hostname === "openai.com" || hostname.endsWith(".openai.com");
  } catch {
    return false;
  }
}

const nativeFetch = globalThis.fetch;

delete process.env.OPENAI_API_KEY;

vi.stubGlobal("fetch", (input: FetchInput, init?: RequestInit) => {
  if (isOpenAIProviderUrl(input)) {
    throw new Error("Automated tests must not call an OpenAI provider endpoint.");
  }

  return nativeFetch(input, init);
});
