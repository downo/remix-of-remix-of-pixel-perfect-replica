import { describe, it, expect } from "vitest";
import { newGame, dailyFor } from "../engine";
import { claimPath, PATH_LEN, exploreSecrets } from "../lore";

describe("Tuhkade tee", () => {
  it("one step per calendar day, 30 total", () => {
    const s = newGame();
    expect(claimPath(s)).toBeNull(); expect(s.path?.n).toBe(1);
    expect(claimPath(s)).not.toBeNull();
    s.path = { n: PATH_LEN, last: "2000-01-01" }; expect(claimPath(s)).not.toBeNull();
  });
});
describe("dailies", () => { it("5 different daily tasks", () => { const d = dailyFor(4); expect(d.length).toBe(5); expect(new Set(d).size).toBe(5); }); });
describe("secrets", () => {
  it("mine cache opens when exploring with a tool", () => {
    const s = newGame(); s.region = "mine"; s.equip.tool = "stoneaxe";
    expect(exploreSecrets(s)).toBe(true); expect(s.secrets).toContain("sec_cache");
  });
});
