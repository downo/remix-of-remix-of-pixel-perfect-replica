import { describe, it, expect } from "vitest";
import { newGame, weaponDmg, armorDef } from "../engine";
import { rankOf } from "../world";
import { doContract, repAction, resolveFacEvent, relOf, facEventFor, buyFacGear } from "../factions";

describe("factions", () => {
  it("rank ladder from the plan", () => {
    expect(rankOf(-500).name).toBe("Vannutatud vaenlane"); expect(rankOf(-100).name).toBe("Vaenlane");
    expect(rankOf(0).name).toBe("Võõras"); expect(rankOf(100).name).toBe("Tuttav"); expect(rankOf(250).name).toBe("Sõber");
    expect(rankOf(500).name).toBe("Liitlane"); expect(rankOf(1000).name).toBe("Austatud"); expect(rankOf(2000).name).toBe("Fraktsiooni meister");
  });
  it("contracts open at 100 reputation", () => {
    const s = newGame(); s.inv = { ...s.inv, wood: 50, stone: 50, cloth: 50, herb: 50, scrap: 50, wire: 50 };
    expect(doContract(s, "settlers")).not.toBeNull();
    s.rep = { settlers: 100 }; expect(doContract(s, "settlers")).toBeNull(); expect(doContract(s, "settlers")).not.toBeNull();
  });
  it("helping settlers annoys the Order (at war)", () => {
    const s = newGame(); expect(relOf(s, "settlers", "order")).toBe(-2);
    repAction(s, "settlers", 50); expect(s.rep.settlers).toBe(50); expect(s.rep.order).toBe(-20); expect(s.rep.wanderers).toBe(10);
  });
  it("Order Liitlane gives +3 dmg and -1 def", () => {
    const s = newGame(); const d = weaponDmg(s), a = armorDef(s); s.rep = { order: 500 };
    expect(weaponDmg(s)).toBe(d + 3); expect(armorDef(s)).toBe(a - 1);
  });
  it("daily event once per day", () => {
    const s = newGame(); const i = facEventFor(s).choices.findIndex((c) => !c.items || Object.values(c.items).every((v) => v > 0));
    expect(resolveFacEvent(s, i)).toBeNull(); expect(resolveFacEvent(s, i)).not.toBeNull();
  });
  it("exclusive gear needs Austatud (1000)", () => {
    const s = newGame(); s.inv = { ...s.inv, cash: 999, ore: 99, stone: 99 }; s.rep = { settlers: 999 };
    expect(buyFacGear(s, "settlers")).not.toBeNull(); s.rep.settlers = 1000; expect(buyFacGear(s, "settlers")).toBeNull(); expect(s.inv.bastion).toBe(1);
  });
});
