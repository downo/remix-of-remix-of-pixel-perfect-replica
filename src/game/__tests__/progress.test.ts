import { describe, it, expect } from "vitest";
import { newGame, weaponDmg } from "../engine";
import { learnPerk, perkPoints, startExpedition } from "../progress";

describe("perks", () => {
  it("one perk point every second level", () => { const s = newGame(); s.level = 4; expect(perkPoints(s)).toBe(2); s.level = 5; expect(perkPoints(s)).toBe(2); });
  it("tier 5 perk costs 3 points", () => { const s = newGame(); s.level = 20; s.perks = ["f1", "f2", "f3", "f4"]; expect(perkPoints(s)).toBe(4); expect(learnPerk(s, "f5")).toBeNull(); expect(perkPoints(s)).toBe(1); });
  it("Raske käsi adds 2 damage", () => { const s = newGame(); s.level = 2; const d = weaponDmg(s); expect(learnPerk(s, "f1")).toBeNull(); expect(weaponDmg(s)).toBe(d + 2); });
  it("tier 2 needs tier 1", () => { const s = newGame(); s.level = 6; expect(learnPerk(s, "f2")).not.toBeNull(); });
});
describe("expeditions", () => {
  it("needs the region discovered", () => { const s = newGame(); expect(startExpedition(s, "x_mine")).not.toBeNull(); expect(startExpedition(s, "x_forest")).toBeNull(); });
});
