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
  { id: "surv", name: "Ellujääja", icon: "🔥" },
] as const;
/** Tier → minimum level and point cost. Points come every 2nd level, so a full tree takes a long time. */
export const TIER_LEVEL = [0, 2, 5, 9, 14, 20];
export const TIER_COST = [0, 1, 1, 2, 2, 3];
const P = (id: string, branch: string, tier: number, name: string, icon: string, desc: string): Perk => ({ id, branch, tier, name, icon, desc, minLevel: TIER_LEVEL[tier] });
export const PERKS: Perk[] = [
  P("f1", "fighter", 1, "Raske käsi", "👊", "+2 kahju igas löögis."),
  P("f2", "fighter", 2, "Paks nahk", "🛡️", "+2 kaitset."),
  P("f3", "fighter", 3, "Verejanu", "🩸", "Iga võit taastab 8 HP."),
  P("f4", "fighter", 4, "Lahingurütm", "🥁", "Veel +3 kahju."),
  P("f5", "fighter", 5, "Raudne tahe", "🗿", "+4 kaitset ja võit taastab veel 6 HP."),
  P("s1", "scav", 1, "Terav silm", "👁️", "+15% kogumissaaki."),
  P("s2", "scav", 2, "Sügavad taskud", "🎒", "Veel +15% kogumissaaki."),
  P("s3", "scav", 3, "Aardeküti vaist", "💎", "Haruldasi esemeid leiad 2× sagedamini."),
  P("s4", "scav", 4, "Romumeister", "🔩", "Veel +20% kogumissaaki."),
  P("s5", "scav", 5, "Tuhaprohvet", "🔮", "Haruldasi leiad veel 1,5× sagedamini."),
  P("w1", "wander", 1, "Kiire õppija", "📚", "+10% kogemust (XP)."),
  P("w2", "wander", 2, "Ettevaatlik samm", "🥾", "Retkedel saad 30% vähem kahju."),
  P("w3", "wander", 3, "Retkejuht", "🗺️", "Retkede saak +50%."),
  P("w4", "wander", 4, "Vana rebane", "🦊", "Veel +10% XP."),
  P("w5", "wander", 5, "Teeraja legend", "🌄", "Retkedel veel 30% vähem kahju ja saak +30%."),
  P("u1", "surv", 1, "Kõhn kõht", "🍂", "Nälg ja janu kasvavad 15% aeglasemalt."),
  P("u2", "surv", 2, "Välipraktik", "🩹", "Iga võit taastab 5 HP."),
  P("u3", "surv", 3, "Kaameli kurk", "🐪", "Nälg ja janu veel 15% aeglasemalt."),
  P("u4", "surv", 4, "Tuhakindel", "🧱", "+3 kaitset."),
  P("u5", "surv", 5, "Viimane ellujääja", "🔥", "+10% saaki ja +10% XP."),
];
export const hasPerk = (s: GameState, id: string) => (s.perks || []).includes(id);
export const perkCost = (p: Perk) => TIER_COST[p.tier] || 1;
const spent = (s: GameState) => (s.perks || []).reduce((t, id) => { const p = PERKS.find((x) => x.id === id); return t + (p ? perkCost(p) : 1); }, 0);
/** One point every second level (lvl 2, 4, 6 ...). */
export const perkPoints = (s: GameState) => Math.max(0, Math.floor(s.level / 2) - spent(s));
export function perkBlocked(s: GameState, p: Perk): string | null {
  if (hasPerk(s, p.id)) return "Juba õpitud.";
  if (s.level < p.minLevel) return `Vajab taset ${p.minLevel}.`;
  const prev = PERKS.find((x) => x.branch === p.branch && x.tier === p.tier - 1);
  if (prev && !hasPerk(s, prev.id)) return `Õpi enne: ${prev.name}.`;
  if (perkPoints(s) < perkCost(p)) return `Vajab ${perkCost(p)} punkti.`;
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
  const c = chance * (hasPerk(s, "s3") ? 2 : 1) * (hasPerk(s, "s5") ? 1.5 : 1);
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
    dmg: (hasPerk(s, "f1") ? 2 : 0) + (hasPerk(s, "f4") ? 3 : 0) + (a.dmg || 0) + t.dmg,
    def: (hasPerk(s, "f2") ? 2 : 0) + (hasPerk(s, "f5") ? 4 : 0) + (hasPerk(s, "u4") ? 3 : 0) + (a.def || 0) + t.def,
    gather: (hasPerk(s, "s1") ? 0.15 : 0) + (hasPerk(s, "s2") ? 0.15 : 0) + (hasPerk(s, "s4") ? 0.2 : 0) + (hasPerk(s, "u5") ? 0.1 : 0) + (a.gather || 0) / 100 + t.gather,
    xp: (hasPerk(s, "w1") ? 0.1 : 0) + (hasPerk(s, "w4") ? 0.1 : 0) + (hasPerk(s, "u5") ? 0.1 : 0) + (a.xp || 0) / 100 + t.xp,
    needs: (hasPerk(s, "u1") ? 0.15 : 0) + (hasPerk(s, "u3") ? 0.15 : 0),
    heal: (hasPerk(s, "f3") ? 8 : 0) + (hasPerk(s, "f5") ? 6 : 0) + (hasPerk(s, "u2") ? 5 : 0) + (a.heal || 0),
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
  const lootMult = depth * (hasPerk(s, "w3") ? 1.5 : 1) * (hasPerk(s, "w5") ? 1.3 : 1);
  if (roll < 0.5) {
    const [id, max] = x.loot[Math.floor(rnd() * x.loot.length)];
    const n = Math.max(1, Math.round((1 + rnd() * max) * Math.min(2.2, 1 + (lootMult - 1) * 0.5)));
    r.loot[id] = (r.loot[id] || 0) + n;
    r.log.push(`Etapp ${r.stage}: leidsid ${ITEMS[id]?.icon ?? ""} ${ITEMS[id]?.name ?? id} ×${n}.`);
  } else if (roll < 0.82) {
    const raw = Math.round(x.danger * 5 * depth * (0.7 + rnd() * 0.6));
    const dmg = Math.max(1, Math.round((raw - armorDef(s) * 0.5) * (hasPerk(s, "w2") ? 0.7 : 1) * (hasPerk(s, "w5") ? 0.7 : 1)));
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

/** Reset the skill tree for a fee; all spent points come back. */
export const RESPEC_COST = 500;
export function respecPerks(s: GameState): string | null {
  if (!(s.perks || []).length) return "Sul pole veel ühtegi oskust.";
  if ((s.inv.cash || 0) < RESPEC_COST) return `Vajad ${RESPEC_COST} 🪙.`;
  s.inv.cash -= RESPEC_COST; s.perks = [];
  log(s, `🔄 Oskuspuu nullitud (−${RESPEC_COST} 🪙). Kõik punktid on tagasi — vali uuesti.`, "good");
  return null;
}
