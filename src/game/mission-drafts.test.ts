import { describe, expect, it } from "vitest";

import { createMissionDrafts } from "./mission-drafts";

describe("in-memory mission drafts", () => {
  it("keeps each incomplete mission draft while switching", () => {
    const drafts = createMissionDrafts();

    drafts.save("apartment_construction", "  Housing draft  ");
    drafts.save("school_construction", "School draft");

    expect(drafts.read("apartment_construction")).toBe("  Housing draft  ");
    expect(drafts.read("school_construction")).toBe("School draft");
  });

  it("forgets drafts only when the browser runtime is reset", () => {
    const drafts = createMissionDrafts();
    drafts.save("apartment_construction", "Housing draft");

    drafts.clear();

    expect(drafts.read("apartment_construction")).toBe("");
  });
});
