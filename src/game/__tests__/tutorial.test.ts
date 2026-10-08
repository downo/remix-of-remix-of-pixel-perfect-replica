import { describe, expect, it } from "vitest";
import { add, newGame, tick } from "../engine";
import { updateTutorial } from "../tutorial";

describe("first day milestones", () => {
  it("keeps the three-wood goal after spending wood", () => {
    const s = newGame();
    add(s, "wood", 1);
    add(s, "wood", -3);
    expect(s.inv.wood).toBeUndefined();
    expect(s.tutorialDone).toContain("wood");
  });
  it("keeps the over-50 needs goal after hunger and thirst drop", () => {
    const s = newGame();
    updateTutorial(s);
    s.food = 20; s.water = 20;
    updateTutorial(s);
    expect(s.tutorialDone).toContain("needs");
  });
  it("includes wood in the chest", () => {
    const s = newGame(); s.inv.wood = 0; s.stash = { wood: 3 };
    updateTutorial(s);
    expect(s.tutorialDone).toContain("wood");
  });
  it("recovers spent wood progress from an existing campfire", () => {
    const s = newGame(); s.inv.wood = 0; s.structures.campfire = 1;
    tick(s, s.lastTick);
    expect(s.tutorialDone).toContain("wood");
    expect(s.tutorialDone).toContain("campfire");
  });
  it("permanently completes once all six goals have been met across different moments", () => {
    const s = newGame();
    add(s, "wood", 1);
    s.equip.tool = "stoneaxe"; s.structures = { campfire: 1, shelter: 1 };
    updateTutorial(s);
    s.food = 10; s.water = 10; s.equip.tool = null; s.inv.wood = 0;
    s.kills = 3; s.discovered = ["camp", "forest", "ruins", "swamp", "city"];
    updateTutorial(s);
    expect(s.tutorialDone).toHaveLength(6);
    expect(s.tut).toBe(true);
    const restored = JSON.parse(JSON.stringify(s));
    tick(restored, restored.lastTick);
    expect(restored.tut).toBe(true);
    expect(restored.tutorialDone).toHaveLength(6);
  });
  it("does not complete exploration below three kills or five regions", () => {
    const s = newGame(); s.kills = 2; s.discovered = ["camp", "forest", "ruins", "swamp", "city"];
    updateTutorial(s);
    expect(s.tutorialDone).not.toContain("explore");
    s.kills = 3; s.discovered.pop(); updateTutorial(s);
    expect(s.tutorialDone).not.toContain("explore");
  });
});