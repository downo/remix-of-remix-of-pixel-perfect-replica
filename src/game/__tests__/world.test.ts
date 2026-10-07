import { describe, it, expect } from "vitest";
import { newGame } from "../engine";
import { donate, repOf, startNewGamePlus, enemyScale, worldEventFor } from "../world";

describe("factions", () => {
  it("helping gives +10 and rival -3, once per day", () => {
    const s = newGame(); s.inv.wood = 20; s.inv.stone = 20;
    expect(donate(s, "settlers")).toBeNull();
    expect(repOf(s, "settlers")).toBe(10); expect(repOf(s, "order")).toBe(-3);
    expect(donate(s, "settlers")).not.toBeNull();
  });
});
describe("new game+", () => {
  it("keeps perks and adds 30% enemy strength per cycle", () => {
    const s = newGame(); s.perks = ["f1"]; s.level = 7; s.sealed = true;
    const g = startNewGamePlus(s);
    expect(g.perks).toEqual(["f1"]); expect(g.level).toBe(7); expect(g.ngp).toBe(1);
    expect(enemyScale(g) - worldEventFor(g).enemy).toBeCloseTo(1.3);
  });
});
