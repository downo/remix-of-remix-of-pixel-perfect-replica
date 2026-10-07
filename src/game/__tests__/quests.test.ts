import { describe, expect, it } from "vitest";
import { newGame, pickEnding } from "../engine";
import { STORY_QUESTS, advanceQuest, qDone } from "../quests";

describe("story quests", () => {
  it("has 40 quests", () => expect(STORY_QUESTS.length).toBe(40));
  it("Esimene tuli consumes items and needs a campfire", () => {
    const s = newGame(); s.inv.wood = 5; s.inv.stone = 3;
    expect(advanceQuest(s, "s1")).toBeNull(); expect(s.inv.wood || 0).toBe(0);
    expect(advanceQuest(s, "s1")).not.toBeNull();
    s.structures.campfire = 1; expect(advanceQuest(s, "s1")).toBeNull(); expect(qDone(s, "s1")).toBe(true);
  });
  it("locked quest cannot advance", () => expect(advanceQuest(newGame(), "s2")).not.toBeNull());
  it("ending follows highest reputation", () => { const s = newGame(); s.rep = { order: 50, settlers: 10 }; expect(pickEnding(s)).toBe("order"); });
});
