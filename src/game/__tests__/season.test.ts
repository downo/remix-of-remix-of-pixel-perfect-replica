import { describe, it, expect } from "vitest";
import { newGame } from "../engine";
import { bonus } from "../progress";
import { claimSeason, ensureSeason, SEASON_GOAL } from "../world";

describe("territories", () => {
  it("Raudkaevandus gives +10% gather and Relvaladu +2 damage", () => {
    const s = newGame(); const b0 = bonus(s); s.terr = ["t_mine", "t_depot"];
    expect(bonus(s).gather - b0.gather).toBeCloseTo(0.1); expect(bonus(s).dmg - b0.dmg).toBe(2);
  });
});
describe("season", () => {
  it("reward only when the community goal is reached and only once", () => {
    const s = newGame(); ensureSeason(s); s.kills += 25;
    expect(claimSeason(s, SEASON_GOAL - 1)).not.toBeNull();
    expect(claimSeason(s, SEASON_GOAL)).toBeNull();
    expect(claimSeason(s, SEASON_GOAL)).not.toBeNull();
  });
});
