// Character perks, rare relics (items with random affixes) and multi-stage expeditions.
import { ITEMS, REGIONS } from "./data";
import { territoryBonus } from "./world";
import { add, armorDef, canStart, gainXp, gameLog as log, weekKey, type GameState } from "./engine";

const rnd = Math.random;

// ---------- perks (skill tree) ----------
export interface Perk { id: string; branch: string; tier: number; name: string; icon: string; desc: string; minLevel: number }
export const BRANCHES = [
  { id: "fighter", name: "Võitleja", icon: "⚔️" },
  { id: "scav", name: "Korjaja", icon: "🪓" },
  { id: "wander", name: "Rändur", icon: "🧭" },
] as const;
export const PERKS: Perk[] = [
  { id: "f1", branch: "fighter", tier: 1, name: "Raske käsi", icon: "👊", desc: "+2 kahju igas löögis.", minLevel: 2 },
  { id: "f2", branch: "fighter", tier: 2, name: "Paks nahk", icon: "🛡️", desc: "+2 kaitset.", minLevel: 5 },
  { id: "f3", branch: "fighter", tier: 3, name: "Verejanu", icon: "🩸", desc: "Iga võit taastab 8 HP.", minLevel: 9 },
  { id: "s1", branch: "scav", tier: 1, name: "Terav silm", icon: "👁️", desc: "+15% kogumissaaki.", minLevel: 2 },
  { id: "s2", branch: "scav", tier: 2, name: "Sügavad taskud", icon: "🎒", desc: "Veel +15% kogumissaaki.", minLevel: 5 },
  { id: "s3", branch: "scav", tier: 3, name: "Aardeküti vaist", icon: "💎", desc: "Haruldasi esemeid leiad 2× sagedamini.", minLevel: 9 },
  { id: "w1", branch: "wander", tier: 1, name: "Kiire õppija", icon: "📚", desc: "+10% kogemust (XP).", minLevel: 2 },
  { id: "w2", branch: "wander", tier: 2, name: "Ettevaatlik samm", icon: "🥾", desc: "Ekspeditsioonidel saad 30% vähem kahju.", minLevel: 5 },
  { id: "w3", branch: "wander", tier: 3, name: "Retkejuht", icon: "🗺️", desc: "Ekspeditsioonide saak +50%.", minLevel: 9 },
];
export const hasPerk = (s: GameState, id: string) => (s.perks || []).includes(id);
export const perkPoints = (s: GameState) => Math.max(0, s.level - 1 - (s.perks || []).length);
export function perkBlocked(s: GameState, p: Perk): string | null {
  if (hasPerk(s, p.id)) return "Juba õpitud.";
  if (s.level < p.minLevel) return `Vajab taset ${p.minLevel}.`;
  const prev = PERKS.find((x) => x.branch === p.branch && x.tier === p.tier - 1);
  if (prev && !hasPerk(s, prev.id)) return `Õpi enne: ${prev.name}.`;
  if (perkPoints(s) < 1) return "Oskuspunkte pole. Tõuse tasemel.";
  return null;
}
export function learnPerk(s: GameState, id: string): string | null {
  const p = PERKS.find((x) => x.id === id); if (!p) return "Tundmatu oskus.";
  const err = perkBlocked(s, p); if (err) return err;
  s.perks = [...(s.perks || []), id];
  log(s, `${p.icon} Õppisid uue oskuse: ${p.name} — ${p.desc}`, "good");
  return null;
}

// ---------- relics (rare loot with affixes) ----------
export type Rarity = "rare" | "epic" | "legendary";
export type AffixKey = "dmg" | "def" | "gather" | "xp" | "heal";
export interface Relic { uid: string; base: string; rarity: Rarity; affixes: Partial<Record<AffixKey, number>> }
export const RARITY: Record<Rarity, { name: string; n: number; color: string }> = {
  rare: { name: "Haruldane", n: 1, color: "text-primary" },
  epic: { name: "Eepiline", n: 2, color: "text-accent" },
  legendary: { name: "Legendaarne", n: 3, color: "text-destructive" },
};
const BASES: Record<string, { name: string; icon: string }> = {
  amulet: { name: "Kiirgusamulett", icon: "📿" }, ring: { name: "Roostes sõrmus", icon: "💍" },
  shard: { name: "Lõhekild", icon: "🔮" }, badge: { name: "KOIDIKu märk", icon: "🎖️" }, fang: { name: "Mutandihammas", icon: "🦷" },
};
export const AFFIX: Record<AffixKey, { label: (v: number) => string; roll: () => number }> = {
  dmg: { label: (v) => `+${v} kahju`, roll: () => 1 + Math.floor(rnd() * 4) },
  def: { label: (v) => `+${v} kaitset`, roll: () => 1 + Math.floor(rnd() * 3) },
  gather: { label: (v) => `+${v}% kogumissaaki`, roll: () => 5 + Math.floor(rnd() * 16) },
  xp: { label: (v) => `+${v}% XP`, roll: () => 5 + Math.floor(rnd() * 11) },
  heal: { label: (v) => `+${v} HP iga võidu järel`, roll: () => 2 + Math.floor(rnd() * 5) },
};
export const relicName = (r: Relic) => `${BASES[r.base].icon} ${BASES[r.base].name}`;
export const MAX_RELICS = 12;

export function makeRelic(boost = 0): Relic {
  const roll = rnd() + boost;
  const rarity: Rarity = roll > 0.95 ? "legendary" : roll > 0.7 ? "epic" : "rare";
  const keys = (Object.keys(AFFIX) as AffixKey[]).sort(() => rnd() - 0.5).slice(0, RARITY[rarity].n);
  const mult = rarity === "legendary" ? 1.5 : 1;
  const affixes: Relic["affixes"] = {};
  for (const k of keys) affixes[k] = Math.round(AFFIX[k].roll() * mult);
  const bases = Object.keys(BASES);
  return { uid: Math.random().toString(36).slice(2, 9), base: bases[Math.floor(rnd() * bases.length)], rarity, affixes };
}
/** Chance-based relic drop; returns true when one was found. */
export function maybeRelic(s: GameState, chance: number, boost = 0): boolean {
  const c = chance * (hasPerk(s, "s3") ? 2 : 1);
  if (rnd() >= c) return false;
  giveRelic(s, makeRelic(boost));
  return true;
}
export function giveRelic(s: GameState, r: Relic) {
  s.relics = s.relics || [];
  if (s.relics.length >= MAX_RELICS) { add(s, "cash", 15); log(s, `✨ Leidsid ${RARITY[r.rarity].name.toLowerCase()} eseme, kuid kott on täis — müüsid selle 15 🪙 eest.`, "loot"); return; }
  s.relics.push(r);
  log(s, `✨ ${RARITY[r.rarity].name.toUpperCase()} LEID: ${relicName(r)} (${Object.entries(r.affixes).map(([k, v]) => AFFIX[k as AffixKey].label(v!)).join(", ")}). Kanna seda: 🎒 Inventar → Talismanid.`, "loot");
}
export function wearRelic(s: GameState, uid: string | null) { s.charm = uid; }
export function scrapRelic(s: GameState, uid: string): string | null {
  const i = (s.relics || []).findIndex((r) => r.uid === uid); if (i < 0) return "Pole sellist.";
  const r = s.relics[i]; s.relics.splice(i, 1); if (s.charm === uid) s.charm = null;
  const pay = r.rarity === "legendary" ? 60 : r.rarity === "epic" ? 30 : 12;
  add(s, "cash", pay); log(s, `Müüsid ${relicName(r)} — +${pay} 🪙`, "info");
  return null;
}
export const wornRelic = (s: GameState) => (s.relics || []).find((r) => r.uid === s.charm) || null;

/** Summed bonuses from perks and the worn relic. Used by engine formulas. */
export function bonus(s: GameState) {
  const a = wornRelic(s)?.affixes || {}; const t = territoryBonus(s);
  return {
    dmg: (hasPerk(s, "f1") ? 2 : 0) + (a.dmg || 0) + t.dmg,
    def: (hasPerk(s, "f2") ? 2 : 0) + (a.def || 0) + t.def,
    gather: (hasPerk(s, "s1") ? 0.15 : 0) + (hasPerk(s, "s2") ? 0.15 : 0) + (a.gather || 0) / 100 + t.gather,
    xp: (hasPerk(s, "w1") ? 0.1 : 0) + (a.xp || 0) / 100 + t.xp,
    heal: (hasPerk(s, "f3") ? 8 : 0) + (a.heal || 0),
  };
}

// ---------- expeditions ----------
export interface Expedition { id: string; name: string; icon: string; region: string; stages: number; danger: number; loot: [string, number][]; desc: string }
export const EXPEDITIONS: Expedition[] = ([
  { id: "x_forest", name: "Sügav mets", icon: "🌲", region: "forest", stages: 3, danger: 1, loot: [["wood", 4], ["herb", 2], ["meat", 2], ["hide", 1]], desc: "Lühike retk metsa südamesse." },
  { id: "x_ruins", name: "Varemete keldrid", icon: "🏚️", region: "ruins", stages: 4, danger: 1.5, loot: [["scrap", 4], ["cloth", 2], ["wire", 2], ["can", 1]], desc: "Keldrid, kuhu keegi pole ammu läinud." },
  { id: "x_mine", name: "Hüljatud šaht", icon: "⛏️", region: "mine", stages: 4, danger: 2.2, loot: [["ore", 3], ["stone", 4], ["crystal", 1]], desc: "Rauamaak ja harva kristallid. Ja pimedus." },
  { id: "x_city", name: "Surnud linn", icon: "🏙️", region: "city", stages: 5, danger: 3, loot: [["scrap", 5], ["wire", 3], ["antirad", 1], ["can", 2]], desc: "Pikk ja ohtlik. Hea saak." },
  { id: "x_rift", name: "Lõhe serv", icon: "🌀", region: "depths3", stages: 6, danger: 4.5, loot: [["crystal", 2], ["voidshard", 1], ["ore", 3]], desc: "Kõige ohtlikum retk. Lõpus ootab legendaarne leid." },
] as Expedition[]).filter((x) => REGIONS[x.region]);
export const EXP_GEAR: Record<string, string> = { x_forest: "hideboots", x_ruins: "scraphelm", x_mine: "minerhelm", x_city: "steelboots", x_rift: "voidboots" };
export const EXP_WEEK_GOAL = 5;
export const EXP_ENERGY = 8;
export interface ExpRun { id: string; stage: number; loot: Record<string, number>; log: string[] }

export const expAvailable = (s: GameState, x: Expedition) => s.discovered.includes(x.region);
export const expWeekCount = (s: GameState) => (s.expWeek?.week === weekKey(new Date()) ? s.expWeek.n : 0);

export function startExpedition(s: GameState, id: string): string | null {
  const x = EXPEDITIONS.find((e) => e.id === id); if (!x) return "Tundmatu retk.";
  if (s.exp) return "Oled juba retkel.";
  if (!canStart(s)) return "Oled hõivatud.";
  if (!expAvailable(s, x)) return `Avasta enne ${REGIONS[x.region].name}.`;
  if (s.energy < EXP_ENERGY * 2) return "Liiga väsinud. Puhka enne.";
  s.exp = { id, stage: 0, loot: {}, log: [`${x.icon} Alustasid retke: ${x.name}.`] };
  log(s, `${x.icon} Alustasid ekspeditsiooni: ${x.name} (${x.stages} etappi).`, "info");
  return null;
}

/** Push one stage deeper. Risk and reward grow with every stage. */
export function expAdvance(s: GameState): string | null {
  const r = s.exp; if (!r) return "Pole retkel.";
  const x = EXPEDITIONS.find((e) => e.id === r.id)!;
  if (s.energy < EXP_ENERGY) return "Liiga väsinud edasi minna. Pöördu tagasi.";
  s.energy -= EXP_ENERGY; r.stage++;
  const depth = 1 + (r.stage - 1) * 0.35;
  const roll = rnd();
  const lootMult = depth * (hasPerk(s, "w3") ? 1.5 : 1);
  if (roll < 0.5) {
    const [id, max] = x.loot[Math.floor(rnd() * x.loot.length)];
    const n = Math.max(1, Math.round((1 + rnd() * max) * lootMult));
    r.loot[id] = (r.loot[id] || 0) + n;
    r.log.push(`Etapp ${r.stage}: leidsid ${ITEMS[id]?.icon ?? ""} ${ITEMS[id]?.name ?? id} ×${n}.`);
  } else if (roll < 0.82) {
    const raw = Math.round(x.danger * 5 * depth * (0.7 + rnd() * 0.6));
    const dmg = Math.max(1, Math.round((raw - armorDef(s) * 0.5) * (hasPerk(s, "w2") ? 0.7 : 1)));
    s.hp -= dmg; gainXp(s, Math.round(6 * x.danger), "combat");
    const [id] = x.loot[0]; r.loot[id] = (r.loot[id] || 0) + 1;
    r.log.push(`Etapp ${r.stage}: varitsus! −${dmg} HP. Võitsid, said ${ITEMS[id]?.icon ?? ""} ×1.`);
  } else if (roll < 0.92) {
    const rad = Math.round(4 * x.danger); s.rad = Math.min(100, s.rad + rad);
    r.log.push(`Etapp ${r.stage}: kiirgustasku. +${rad} kiirgust.`);
  } else {
    r.log.push(`Etapp ${r.stage}: peidik!`);
    giveRelic(s, makeRelic(x.danger * 0.05));
  }
  gainXp(s, Math.round(5 * x.danger * depth), "exploration");
  if (s.hp <= 0) {
    s.hp = 1; s.exp = null;
    log(s, `💀 Ekspeditsioon ${x.name} lõppes katastroofiga. Roomasid tagasi peaaegu surnuna — kogu retke saak jäi maha.`, "bad");
    s.hp = Math.max(1, Math.round(s.maxHp * 0.15));
    return null;
  }
  if (r.stage >= x.stages) {
    r.log.push("Jõudsid retke lõppu!");
    giveRelic(s, makeRelic(x.id === "x_rift" ? 0.3 : x.danger * 0.06));
    const gear = EXP_GEAR[x.id]; if (gear && rnd() < 0.4) { r.loot[gear] = (r.loot[gear] || 0) + 1; r.log.push(`Leidsid varustuse: ${ITEMS[gear]?.icon ?? ""} ${ITEMS[gear]?.name ?? gear}!`); }
    return finishExp(s, true);
  }
  return null;
}

export function expRetreat(s: GameState): string | null { return s.exp ? finishExp(s, false) : "Pole retkel."; }

function finishExp(s: GameState, full: boolean): null {
  const r = s.exp!; const x = EXPEDITIONS.find((e) => e.id === r.id)!;
  Object.entries(r.loot).forEach(([k, v]) => add(s, k, v));
  const wk = weekKey(new Date());
  if (s.expWeek?.week !== wk) s.expWeek = { week: wk, n: 0, claimed: false };
  if (r.stage > 0) s.expWeek.n++;
  const got = Object.entries(r.loot).map(([k, v]) => `${ITEMS[k]?.icon ?? ""}×${v}`).join(" ") || "mitte midagi";
  if (full) gainXp(s, Math.round(20 * x.danger), "exploration");
  log(s, `${full ? "🏁 Retk lõpetatud" : "↩️ Pöördusid tagasi"}: ${x.name}, ${r.stage}/${x.stages} etappi. Tõid kaasa: ${got}.`, "good");
  s.exp = null;
  return null;
}

export function claimExpWeek(s: GameState): string | null {
  if (expWeekCount(s) < EXP_WEEK_GOAL) return "Nädala eesmärk pole veel täis.";
  if (s.expWeek!.claimed) return "Juba võetud.";
  s.expWeek!.claimed = true;
  add(s, "cash", 40); gainXp(s, 150);
  giveRelic(s, makeRelic(0.25));
  log(s, "🗓️ Nädala retked tehtud! +40 🪙, +150 XP ja eriline leid.", "good");
  return null;
}
