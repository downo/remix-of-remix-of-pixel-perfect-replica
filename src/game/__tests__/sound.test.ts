import { describe, it, expect } from "vitest";
import { soundForLog } from "../sound";

// Each journal line plays one sound. The mapping must stay narrow: a level-up and a death
// must never play the same blip, and an unknown line must fall back to its entry type.
describe("journal line sounds", () => {
  it("plays a fanfare for a level up and a low knell for death", () => {
    expect(soundForLog("good", "⭐ TASE ÜLES! Oled nüüd tasemel 2. Max HP 110.")).toBe("level");
    expect(soundForLog("bad", "💀 SA SURID. Ärkad uuesti laagris, kuid kaotasid pool ressurssidest.")).toBe("death");
  });

  it("separates building, crafting, combat hits and loot", () => {
    expect(soundForLog("good", "🏗️ Ehitatud: 🧱 Sein (tase 1)")).toBe("build");
    expect(soundForLog("good", "🔨 Valmistasid: 🪓 Kivikirves ×1")).toBe("craft");
    expect(soundForLog("bad", "🐺 Hunt ründab: −7 HP.")).toBe("hit");
    expect(soundForLog("loot", "Kogusid: 🪵 Puit ×2")).toBe("loot");
    expect(soundForLog("good", "✅ Hunt on alistatud! +12 XP.")).toBe("win");
  });

  it("falls back to the entry type when no rule matches", () => {
    expect(soundForLog("lore", "📼 KOIDIKU FRAGMENT: «Esimene öö» — Taevas virvendab.")).toBe("lore");
    expect(soundForLog("info", "Järgmine samm on sinu otsustada.")).toBe("info");
  });
});
