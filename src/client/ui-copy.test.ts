import { describe, expect, it } from "vitest";

import { REQUIRED_UI_KEYS, UI_COPY, uiText } from "./ui-copy";

describe("bilingual interface copy", () => {
  it.each(["portuguese", "english"] as const)("covers primary, loading, empty, and error states in %s", (language) => {
    for (const key of REQUIRED_UI_KEYS) {
      expect(UI_COPY[language][key], `${language}.${key}`).toBeTruthy();
    }
  });

  it("uses readable text instead of leaking missing translation keys", () => {
    expect(uiText("english", "future_missing_label")).toBe("Future missing label");
    expect(uiText("portuguese", "future_missing_label")).toBe("Future missing label");
  });

  it("keeps player-facing recovery errors distinct and localized", () => {
    expect(UI_COPY.english.error_timeout).toContain("timed out");
    expect(UI_COPY.portuguese.error_timeout).toContain("tempo");
    expect(UI_COPY.english.error_rate_limited).not.toBe(UI_COPY.portuguese.error_rate_limited);
  });
});
