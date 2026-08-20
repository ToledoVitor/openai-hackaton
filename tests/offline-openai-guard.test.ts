import { describe, expect, it } from "vitest";

import { isOpenAIProviderUrl } from "./offline-openai-guard";

describe("offline OpenAI test guard", () => {
  it("blocks every OpenAI provider hostname while allowing local application routes", () => {
    expect(isOpenAIProviderUrl("https://api.openai.com/v1/responses")).toBe(true);
    expect(isOpenAIProviderUrl("https://platform.openai.com/docs")).toBe(true);
    expect(isOpenAIProviderUrl("http://localhost/api/evaluate")).toBe(false);
  });
});
