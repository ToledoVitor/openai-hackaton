import { describe, expect, it } from "vitest";

import { deriveCityState } from "./city-state";

describe("city state for independent missions", () => {
  it("charges only completed mission effects regardless of completion order", () => {
    expect(deriveCityState(["hospital_construction"])).toEqual({
      completed: 1,
      day: 2,
      budget: 1_620_000,
      health: 80,
    });
    expect(deriveCityState(["urban_repair", "apartment_construction"]).budget).toBe(1_790_000);
    expect(deriveCityState(["school_construction"]).budget).toBe(1_790_000);
  });
});
