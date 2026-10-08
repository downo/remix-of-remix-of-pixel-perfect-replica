import { describe, it, expect } from "vitest";
import { newGame, tick, stayAtBase, dampLoot } from "../engine";
describe("away & loot", () => {
  it("loot bonus capped at 2.5x", () => { expect(dampLoot(10)).toBe(2.5); expect(dampLoot(2)).toBe(1.5); });
  it("stay at base keeps HP while away", () => {
    const g = newGame(); g.region = "camp"; g.food = 0; g.water = 0; g.hp = 50;
    expect(stayAtBase(g)).toBeNull(); tick(g, g.lastTick + 3600_000); expect(g.hp).toBeGreaterThanOrEqual(50);
  });
  it("away outside base loses HP but not below 1", () => {
    const g = newGame(); g.region = "forest"; g.hp = 10; tick(g, g.lastTick + 3600_000);
    expect(g.hp).toBeLessThan(10); expect(g.hp).toBeGreaterThanOrEqual(1);
  });
});
import { markInput } from "../engine";
describe("tab left open", () => {
  it("idle player with open tab never dies of thirst", () => {
    const g = newGame(); g.water = 0; g.food = 0; g.hp = 5; markInput(g.lastTick);
    for (let t = 1; t <= 600; t++) tick(g, g.lastTick + 10_000); // 100 min of 10s ticks
    expect(g.hp).toBeGreaterThanOrEqual(1); expect(g.deaths).toBe(0);
  });
});
