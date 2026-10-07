import { describe, expect, it } from "vitest";
import { combatAct, newGame, PHASES } from "../engine";

describe("boss phases", () => {
  it("boss enters phase 2 below 70% HP", () => {
    const s = newGame() as any;
    s.hp = 9999; s.maxHp = 9999;
    s.combat = { enemy: "ratking", hp: 70, defending: false, intent: "swipe" };
    combatAct(s, "defend");
    expect(PHASES[0].at).toBe(0.7);
    expect(s.combat.phase).toBeGreaterThanOrEqual(1);
  });
  it("special can be used once per fight", () => {
    const s = newGame() as any;
    s.hp = 9999; s.energy = 100;
    s.combat = { enemy: "golem", hp: 5000, defending: false, intent: "swipe" };
    combatAct(s, "special");
    const e = s.energy;
    combatAct(s, "special");
    expect(e).toBe(88);
    expect(s.energy).toBe(88);
  });
});
