import { describe, expect, it } from "vitest";

import { checkpointGroups } from "./checkpoint-groups";

describe("mission checkpoint groups", () => {
  it("separates newly fixed, stable, pending, and revised requirements", () => {
    const groups = checkpointGroups({
      satisfied: ["school_goal_clear", "school_accessible"],
      newlySatisfied: ["school_accessible"],
      regressed: ["school_scale_defined"],
      missing: ["school_scale_defined", "school_safety_defined"],
    }, "portuguese");

    expect(groups).toEqual([
      { id: "complete", title: "Concluído", criteria: ["school_goal_clear"] },
      { id: "new", title: "Corrigido agora", criteria: ["school_accessible"] },
      { id: "pending", title: "Ainda falta", criteria: ["school_scale_defined", "school_safety_defined"] },
      { id: "regressed", title: "Revisado", criteria: ["school_scale_defined"] },
    ]);
  });
});
