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

import { chestPut, chestTake, dropItem, hasB, payB } from "../engine";
describe("backpack and chest", () => {
  it("can drop items", () => { const s = newGame(); s.inv.wood = 5; expect(dropItem(s, "wood", 5)).toBeNull(); expect(s.inv.wood).toBeUndefined(); });
  it("chest only works at camp and frees backpack space", () => {
    const s = newGame(); s.structures.chest = 1; s.inv.wood = 20;
    expect(chestPut(s, "wood", 20)).toBeNull(); expect(s.inv.wood).toBeUndefined(); expect(s.stash?.wood).toBe(20);
    expect(hasB(s, { wood: 15 })).toBe(true); payB(s, { wood: 15 }); expect(s.stash?.wood).toBe(5);
    s.region = "forest"; expect(chestTake(s, "wood", 1)).not.toBeNull(); expect(hasB(s, { wood: 1 })).toBe(false);
  });
});
