import { exploreSecrets } from "./lore";
import { enemyScale, worldEventFor } from "./world";
import { bonus, giveRelic, makeRelic, maybeRelic, type ExpRun, type Relic } from "./progress";
import { BAR_BUY, BAR_REGION, BAR_SELL, CONTRACT_POOL, type Contract, CODEX, PET_KINDS, ENEMIES, EVENTS, ITEMS, LORE, RECIPES, REGIONS, STRUCTURES, type Quest, type SkillId } from "./data";

export type LogType = "info" | "good" | "bad" | "loot" | "lore" | "combat";
export interface LogEntry { t: number; text: string; type: LogType }
export interface Action { kind: "gather" | "explore" | "travel" | "build" | "craft" | "rest" | "heal" | "fish" | "hunt"; label: string; start: number; end: number; target?: string }

export interface GameState {
  v: number; started: number; lastTick: number; gameMins?: number;
  hp: number; maxHp: number; energy: number; food: number; water: number; rad: number;
  level: number; xp: number;
  skills: Record<SkillId, number>;
  inv: Record<string, number>;
  equip: { weapon: string | null; armor: string | null; head: string | null; boots: string | null; tool: string | null };
  region: string; discovered: string[];
  structures: Record<string, number>;
  action: Action | null;
  combat: { enemy: string; hp: number; defending: boolean; intent?: string; rage?: boolean } | null;
  damaged: Record<string, number>; bossDay: Record<string, number>; trophies: Record<string, number>; bountyWeek: string;
  event: string | null;
  log: LogEntry[];
  npcs: string[]; lore: number; kills: number; deaths: number;
  lastProduce: number; lastNight: number;
  ach: string[]; tut: boolean; sealed: boolean; seenEnding: boolean; tomDay: number; warn: string[]; lastDeath: { cause: string; t: number } | null;
  stats: Record<StatKey, number>;
  daily: { day: number; base: Record<string, number>; claimed: string[] };
  wk: { week: string; base: number };
  pet: Pet | null;
  codex: string[];
  kennel: Pet[]; lastBreed: number; lastRandom: number;
  bar: { day: number; base: Record<string, number>; done: string[] };
  perks: string[]; relics: Relic[]; charm: string | null; exp: ExpRun | null; expWeek: { week: string; n: number; claimed: boolean } | null;
  rep: Record<string, number>; rankClaimed: Record<string, number[]>; donated: Record<string, number>; bond: Record<string, number>; story: Record<string, number>; choices: string[]; seen: string[]; collDone: string[]; ngp: number;
  terr: string[]; sea: { key: string; base: number } | null; seaClaimed: string;
  path: { n: number; last: string } | null; secrets: string[]; hints: string[];
  qs?: Record<string, number>; stash?: Record<string, number>; qd?: Record<string, number>; ending?: string;
}
export interface Pet { kind: string; kind2?: string; name: string; lvl: number; xp: number; fed: number; gen?: number; mut?: string }
export type StatKey = "gathered" | "crafted" | "built" | "traveled" | "fished" | "explored" | "raids" | "bosses";
const emptyStats = (): Record<StatKey, number> => ({ gathered: 0, crafted: 0, built: 0, traveled: 0, fished: 0, explored: 0, raids: 0, bosses: 0 });

export const GAME_MIN_PER_SEC = 0.5; // 1 real second = 0.5 game minutes (a game day lasts 48 real minutes)
export const SPEED = 1;

export function newGame(now = Date.now()): GameState {
  return {
    v: 1, started: now, lastTick: now,
    hp: 80, maxHp: 100, energy: 80, food: 70, water: 60, rad: 0,
    level: 1, xp: 0,
    skills: { survival: 0, combat: 0, crafting: 0, medicine: 0, exploration: 0, engineering: 0 },
    inv: { knife: 1, rags: 1, can: 1, dirtywater: 2, cloth: 2, wood: 2 },
    equip: { weapon: "knife", armor: "rags", head: null, boots: null, tool: null },
    region: "camp", discovered: ["camp", "forest", "ruins"],
    structures: {}, action: null, combat: null, event: null,
    log: [{ t: now, type: "lore", text: "Ärkad külma raudteesilla all. Sa ei mäleta, kuidas siia jõudsid. Seljakotis on vaid paar asja. Taevas virvendab roheliselt." }],
    npcs: [], lore: 0, kills: 0, deaths: 0, lastProduce: now, lastNight: 0,
    ach: [], tut: false, sealed: false, seenEnding: false, tomDay: 0, warn: [], lastDeath: null,
    stats: emptyStats(), daily: { day: 0, base: {}, claimed: [] }, wk: { week: "", base: 0 }, pet: null, codex: [], kennel: [], lastBreed: 0, lastRandom: now, bar: { day: 0, base: {}, done: [] },
    damaged: {}, bossDay: {}, trophies: {}, bountyWeek: "",
    perks: [], relics: [], charm: null, exp: null, expWeek: null,
    rep: {}, rankClaimed: {}, donated: {}, bond: {}, story: {}, choices: [], seen: [], collDone: [], ngp: 0, terr: [], sea: null, seaClaimed: "", path: null, secrets: [], hints: [],
  };
}

// ---------- helpers ----------
const rnd = Math.random;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const skillLevel = (xp: number) => Math.floor(Math.sqrt(xp / 10)) + 1;
export const xpForLevel = (l: number) => l * l * 25;

export function clock(s: GameState, now = Date.now()) {
  // Game time only advances while playing (see tick); old saves derive it from real time once.
  const base = s.gameMins ?? Math.floor(((now - s.started) / 1000) * GAME_MIN_PER_SEC);
  const mins = Math.floor(base) + 8 * 60;
  const day = Math.floor(mins / 1440) + 1;
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  const night = h >= 21 || h < 5;
  return { day, h, m, night, label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
}

// ---------- seasons (each lasts 7 game days) ----------
export const SEASONS = [
  { id: "spring", name: "Kevad", icon: "🌱", fx: "Kevad: janu kasvab aeglasemalt, taimi leiab rohkem." },
  { id: "summer", name: "Suvi", icon: "🔥", fx: "Suvi: põud — vesi kulub 30% kiiremini." },
  { id: "autumn", name: "Sügis", icon: "🍂", fx: "Sügis: kogudes saad 20% rohkem saaki." },
  { id: "winter", name: "Talv", icon: "❄️", fx: "Talv: külm — toit kulub 30% kiiremini, väljas taastub energia aeglasemalt." },
] as const;
export function seasonFor(s: GameState, now = Date.now()) { return SEASONS[Math.floor((clock(s, now).day - 1) / 7) % 4]; }

export const PET_MUTS: Record<string, { name: string; icon: string; perk: string }> = {
  tough: { name: "Raudnahk", icon: "🪨", perk: "+1 kaitset" },
  lucky: { name: "Õnnelaps", icon: "🍀", perk: "+10% kogumissaaki" },
  glow: { name: "Helendav", icon: "✨", perk: "Juhuslikud sündmused on sagedamini head" },
};
const petMut = (s: GameState, m: string) => s.pet?.mut === m;

export function weatherFor(s: GameState, now = Date.now()) {
  const { day, h } = clock(s, now);
  const seed = (day * 7 + Math.floor(h / 6) * 13) % 6;
  return [
    { id: "clear", name: "Selge", icon: "☀️" }, { id: "fog", name: "Udu", icon: "🌫️" },
    { id: "rain", name: "Vihm", icon: "🌧️" }, { id: "ash", name: "Tuhasadu", icon: "🌋" },
    { id: "cloudy", name: "Pilves", icon: "☁️" }, { id: "crystal", name: "Kristallituul", icon: "✨" },
  ][seed];
}
export const WEATHER_FX: Record<string, string> = {
  clear: "Tavaline päev.", cloudy: "Tavaline päev.",
  fog: "Udu: kogumisel suurem varitsuse oht, kuid uurides leiad rohkem.",
  rain: "Vihm: vihmakogujad toodavad topelt, janu kasvab aeglasemalt.",
  ash: "Tuhasadu: väljaspool laagrit koguneb kiirgust.",
  crystal: "Kristallituul: kogudes võid leida kristalle.",
};

export { log as gameLog };
function log(s: GameState, text: string, type: LogType = "info") {
  s.log = [{ t: Date.now(), text, type }, ...s.log].slice(0, 120);
}
export function add(s: GameState, id: string, n: number) {
  s.inv[id] = (s.inv[id] || 0) + n;
  if (n > 0 && s.seen && !s.seen.includes(id)) s.seen.push(id);
  if (s.inv[id] <= 0) delete s.inv[id];
}
export const has = (s: GameState, cost: Record<string, number>) => Object.entries(cost).every(([k, v]) => (s.inv[k] || 0) >= v);
const pay = (s: GameState, cost: Record<string, number>) => Object.entries(cost).forEach(([k, v]) => add(s, k, -v));

// ---------- storage chest (camp) ----------
export const CHEST_PER_LVL = 150;
export const chestCap = (s: GameState) => (s.structures.chest || 0) * CHEST_PER_LVL;
export const chestLoad = (s: GameState) => Object.values(s.stash || {}).reduce((a, b) => a + b, 0);
const useChest = (s: GameState) => s.region === "camp" && (s.structures.chest || 0) > 0;
/** Building/crafting at camp may also use items from the chest. */
export const hasB = (s: GameState, cost: Record<string, number>) => Object.entries(cost).every(([k, v]) => (s.inv[k] || 0) + (useChest(s) ? s.stash?.[k] || 0 : 0) >= v);
export function payB(s: GameState, cost: Record<string, number>) {
  for (const [k, v] of Object.entries(cost)) {
    const fromInv = Math.min(v, s.inv[k] || 0); add(s, k, -fromInv);
    const rest = v - fromInv; if (rest > 0 && s.stash) { s.stash[k] = (s.stash[k] || 0) - rest; if (s.stash[k] <= 0) delete s.stash[k]; }
  }
}
export function dropItem(s: GameState, id: string, n = 1): string | null {
  const have = s.inv[id] || 0; if (!have) return "Sul pole seda.";
  n = Math.min(n, have);
  if (have - n <= 0 && Object.values(s.equip).includes(id)) return "Võta see enne seljast/käest ära.";
  add(s, id, -n); log(s, `🗑️ Viskasid ära: ${ITEMS[id]?.name ?? id} ×${n}.`); return null;
}
export function chestPut(s: GameState, id: string, n = 1): string | null {
  if (!useChest(s)) return "Kast on laagris (ehita 🧰 Kast).";
  const have = s.inv[id] || 0; if (!have || id === "cash") return "Seda ei saa kasti panna.";
  n = Math.min(n, have, chestCap(s) - chestLoad(s));
  if (have - n <= 0 && Object.values(s.equip).includes(id)) n = have - 1;
  if (n <= 0) return "Kast on täis!";
  add(s, id, -n); s.stash = { ...(s.stash || {}), [id]: (s.stash?.[id] || 0) + n }; return null;
}
export function chestTake(s: GameState, id: string, n = 1): string | null {
  if (!useChest(s)) return "Kast on laagris.";
  const have = s.stash?.[id] || 0; if (!have) return "Kastis pole seda.";
  n = Math.min(n, have, capacity(s) - load(s)); if (n <= 0) return "Seljakott on täis!";
  s.stash![id] = have - n; if (s.stash![id] <= 0) delete s.stash![id]; add(s, id, n); return null;
}

export function gainXp(s: GameState, n: number, skill?: SkillId) {
  n = Math.round(n * (1 + bonus(s).xp + worldEventFor(s).xp));
  s.xp += n;
  if (skill) s.skills[skill] += n;
  while (s.xp >= xpForLevel(s.level)) {
    s.xp -= xpForLevel(s.level);
    s.level++; s.maxHp += 10; s.hp = s.maxHp;
    log(s, `⭐ TASE ÜLES! Oled nüüd tasemel ${s.level}. Max HP ${s.maxHp}.`, "good");
  }
}

function rollLoot(s: GameState, table: [string, number, number][], mult = 1) {
  const got: string[] = [];
  for (const [id, ch, max] of table) {
    if (rnd() < ch) {
      const n = Math.max(1, Math.round((1 + Math.floor(rnd() * max)) * mult));
      add(s, id, n); got.push(`${ITEMS[id].icon} ${ITEMS[id].name} ×${n}`);
    }
  }
  return got;
}

export const capacity = (s: GameState) => 60 + (s.structures.storage || 0) * 40 + s.level * 2;
export const load = (s: GameState) => Object.entries(s.inv).reduce((a, [k, b]) => a + (k === "cash" ? 0 : b), 0);
export const petIs = (s: GameState, k: string) => !!s.pet && (s.pet.kind === k || s.pet.kind2 === k);

export function weaponDmg(s: GameState) {
  const base = s.equip.weapon ? ITEMS[s.equip.weapon].dmg || 2 : 2;
  return base + skillLevel(s.skills.combat) - 1 + bonus(s).dmg;
}
export const armorDef = (s: GameState) => (["armor", "head", "boots"] as const).reduce((t, k) => t + (s.equip[k] ? ITEMS[s.equip[k]!]?.def || 0 : 0), 0) + (petIs(s, "scorpion") ? 2 : 0) + (petMut(s, "tough") ? 1 : 0) + bonus(s).def;
const toolBonus = (s: GameState) => (s.equip.tool ? ITEMS[s.equip.tool].gather || 0 : 0);

// ---------- action durations ----------
export function durationFor(s: GameState, kind: Action["kind"], target?: string) {
  const craftSpeed = 1 - Math.min(0.5, (skillLevel(s.skills.crafting) - 1) * 0.05);
  const engSpeed = 1 - Math.min(0.5, (skillLevel(s.skills.engineering) - 1) * 0.05);
  switch (kind) {
    case "gather": return Math.round(30 / (1 + toolBonus(s) * 0.3));
    case "explore": return 90;
    case "travel": return REGIONS[target!].travel;
    case "build": return Math.round(STRUCTURES[target!].time * engSpeed);
    case "craft": return Math.round(RECIPES.find((r) => r.id === target)!.time * craftSpeed);
    case "rest": return 60;
    case "heal": return 30;
    case "fish": return 45;
    case "hunt": return 50;
  }
}

export function canStart(s: GameState) {
  return !s.action && !s.combat && !s.event && !s.exp && s.hp > 0;
}

export const HOSPITAL_COST: Record<string, number> = { herb: 2, cloth: 1 };

export function startAction(s: GameState, kind: Action["kind"], label: string, target?: string): string | null {
  if (!canStart(s)) return "Oled juba hõivatud.";
  const energyCost = { gather: 8, explore: 12, travel: 10, build: 10, craft: 4, rest: 0, heal: 0, fish: 6, hunt: 10 }[kind];
  if (s.energy < energyCost && !(kind === "travel" && target === "camp")) return "Liiga väsinud. Puhka enne.";
  if (kind === "build") {
    const st = STRUCTURES[target!];
    if (!hasB(s, st.cost)) return "Pole piisavalt materjale.";
    payB(s, st.cost);
  }
  if (kind === "craft") {
    const r = RECIPES.find((x) => x.id === target)!;
    if (!hasB(s, r.cost)) return "Pole piisavalt materjale.";
    payB(s, r.cost);
  }
  if (kind === "heal") {
    if (!s.structures.hospital || s.region !== "camp") return "Vajad laagris haiglat.";
    if (!has(s, HOSPITAL_COST)) return "Ravi vajab 2 ravimtaime ja 1 riide.";
    pay(s, HOSPITAL_COST);
  }
  if (kind === "hunt" && REGIONS[s.region].danger === 0) return "Siin pole midagi jahtida.";
  if (kind === "gather" && load(s) >= capacity(s)) return "Seljakott on täis!";
  s.energy -= energyCost;
  // Effort makes you hungry and thirsty: each action costs a little food/water based on how tiring it is.
  if (energyCost > 0) {
    const effort = energyCost * (1 - Math.min(0.4, (skillLevel(s.skills.survival) - 1) * 0.04));
    s.food = clamp(s.food - effort * 0.12, 0, 100);
    s.water = clamp(s.water - effort * 0.14, 0, 100);
  }
  const now = Date.now();
  s.action = { kind, label, start: now, end: now + durationFor(s, kind, target) * 1000 / SPEED, target };
  return null;
}

function finishAction(s: GameState) {
  const a = s.action!; s.action = null;
  const reg = REGIONS[s.region];
  switch (a.kind) {
    case "gather": {
      let mult = 1 + toolBonus(s) * 0.5 + (skillLevel(s.skills.survival) - 1) * 0.1;
      if (hasCompanion(s)) mult *= 1.2;
      if (petIs(s, "ratdog")) mult *= 1.15;
      if (petMut(s, "lucky")) mult *= 1.1;
      mult *= Math.max(0.1, 1 + bonus(s).gather + worldEventFor(s).gather);
      { const se = seasonFor(s).id; if (se === "autumn") mult *= 1.2; }
      const got = rollLoot(s, reg.loot, mult);
      if (weatherFor(s).id === "crystal" && rnd() < 0.25) { add(s, "crystal", 1); got.push("💎 Kristall ×1 (tuul)"); }
      s.stats.gathered++;
      if (s.pet) {
        const ch = 0.15 + s.pet.lvl * 0.03;
        if (petIs(s, "ratdog") && rnd() < ch) { const id = reg.loot[Math.floor(rnd() * reg.loot.length)][0]; add(s, id, 1); got.push(`${PET_KINDS.ratdog.icon} ${ITEMS[id].name} ×1`); }
        if (petIs(s, "crawler") && rnd() < ch) { const id = rnd() < 0.3 ? "crystal" : "ore"; add(s, id, 1); got.push(`${PET_KINDS.crawler.icon} ${ITEMS[id].name} ×1`); }
        petXp(s, 1);
      }
      log(s, got.length ? `Kogusid: ${got.join(", ")}` : "Ei leidnud midagi kasulikku.", got.length ? "loot" : "info");
      gainXp(s, 4 + reg.danger * 2, "survival");
      if (reg.danger > 0 && rnd() < 0.12 + reg.danger * 0.05 + (weatherFor(s).id === "fog" ? 0.1 : 0)) startCombat(s);
      break;
    }
    case "explore": {
      gainXp(s, 8 + reg.danger * 3, "exploration");
      s.stats.explored++;
      if (reg.danger > 0) maybeRelic(s, 0.04 + reg.danger * 0.01);
      if (exploreSecrets(s)) break;
      const frag = CODEX.find((f) => f.region === s.region && !s.codex.includes(f.id));
      if (frag && rnd() < 0.3) { s.codex.push(frag.id); log(s, `📼 KOIDIKU FRAGMENT: «${frag.title}» — ${frag.text}`, "lore"); gainXp(s, 20, "exploration"); if (s.codex.length === CODEX.length) log(s, "🔓 Kõik Koidiku fragmendid on koos. Ava Ülesanded → Koidiku arhiiv.", "lore"); break; }
      const expl = skillLevel(s.skills.exploration);
      const hidden = reg.neighbors.filter((n) => !s.discovered.includes(n));
      const r = rnd() - (weatherFor(s).id === "fog" ? 0.08 : 0);
      if (hidden.length && r < 0.35 + expl * 0.03) {
        const n = hidden[Math.floor(rnd() * hidden.length)];
        s.discovered.push(n);
        log(s, `🗺️ Avastasid uue piirkonna: ${REGIONS[n].icon} ${REGIONS[n].name}!`, "good");
      } else if (r < 0.6) {
        const ev = EVENTS[Math.floor(rnd() * EVENTS.length)];
        s.event = ev.id;
      } else if (reg.danger > 0 && r < 0.8) {
        startCombat(s);
      } else {
        const got = rollLoot(s, reg.loot, 1.5);
        log(s, `Leidsid peidetud ruumi! ${got.join(", ") || "...kuid see oli tühi."}`, "loot");
      }
      break;
    }
    case "travel": {
      s.region = a.target!; s.stats.traveled++;
      const r2 = REGIONS[s.region];
      log(s, `Jõudsid: ${r2.icon} ${r2.name}. ${r2.desc}`, "info");
      gainXp(s, 3, "exploration");
      if (r2.danger > 0 && rnd() < 0.15 + r2.danger * 0.04) startCombat(s);
      break;
    }
    case "build": {
      const st = STRUCTURES[a.target!];
      s.structures[st.id] = (s.structures[st.id] || 0) + 1; s.stats.built++;
      log(s, `🏗️ Ehitatud: ${st.icon} ${st.name} (tase ${s.structures[st.id]})`, "good");
      gainXp(s, 15, "engineering");
      break;
    }
    case "craft": {
      const r = RECIPES.find((x) => x.id === a.target)!;
      add(s, r.out, r.qty); s.stats.crafted++;
      log(s, `🔨 Valmistasid: ${ITEMS[r.out].icon} ${ITEMS[r.out].name} ×${r.qty}`, "good");
      gainXp(s, 10, r.skill);
      break;
    }
    case "rest": {
      if (s.region !== "camp") {
        s.energy = clamp(s.energy + 25, 0, 100);
        s.hp = clamp(s.hp + 3, 0, s.maxHp);
        log(s, "🏕️ Puhkasid välitingimustes. Energia taastus osaliselt.", "good");
        break;
      }
      const sh = s.structures.shelter || 0; const bed = s.structures.bed || 0;
      s.energy = clamp(s.energy + 40 + sh * 15 + bed * 10, 0, 100);
      s.hp = clamp(s.hp + 5 + sh * 5 + bed * 8 + (s.structures.infirmary || 0) * 8, 0, s.maxHp);
      log(s, bed ? "🛏️ Magasid voodis. Energia ja tervis taastusid." : "😴 Puhkasid. Energia taastus.", "good");
      break;
    }
    case "heal": {
      s.hp = s.maxHp; s.rad = clamp(s.rad - 40, 0, 100);
      log(s, "🏨 Haiglas ravitud. Tervis täis, kiirgus vähenes.", "good");
      gainXp(s, 12, "medicine");
      break;
    }
    case "hunt": {
      const d = reg.danger; const r = rnd();
      const bigChance = 0.3 + d * 0.08 + (s.pet ? 0.1 : 0);
      if (r < bigChance) {
        const beast = d >= 3 && rnd() < 0.4 ? "bear" : d >= 2 && rnd() < 0.5 ? "elk" : "boar";
        log(s, "🏹 Leidsid suure looma jäljed...", "info");
        startCombat(s, beast);
      } else {
        const got = rollLoot(s, [["roach", .8, 4], ["frog", .5, 2], ["meat", .35, 1]], 1 + (skillLevel(s.skills.survival) - 1) * 0.1);
        log(s, got.length ? `🪤 Jahisaak: ${got.join(", ")}` : "🪤 Saak pääses minema.", got.length ? "loot" : "info");
      }
      gainXp(s, 6, "survival");
      break;
    }
    case "fish": {
      s.stats.fished++;
      const got = rollLoot(s, [["fish", .85, 2], ["dirtywater", .3, 1], ["scrap", .2, 1], ["crystal", .06, 1]]);
      log(s, got.length ? `🎣 Sai püütud: ${got.join(", ")}` : "🎣 Midagi ei hammustanud.", got.length ? "loot" : "info");
      gainXp(s, 6, "survival");
      break;
    }
  }
}

export function startCombat(s: GameState, forced?: string) {
  const reg = REGIONS[s.region];
  const { night } = clock(s);
  let pool = reg.enemies.filter((e) => !["behemoth", "wraith", "heart"].includes(e) || rnd() < 0.12);
  if (!pool.length) pool = reg.enemies;
  if (night && reg.danger >= 2 && !pool.includes("shade")) pool = [...pool, "shade"];
  const id = forced || pool[Math.floor(rnd() * pool.length)];
  if (!id) return;
  const e = ENEMIES[id];
  s.combat = { enemy: id, hp: Math.round(e.hp * enemyScale(s)), defending: false };
  log(s, `☠️ ${e.icon} ${e.name.toUpperCase()} ilmub! ${e.desc}`, "bad");
}

// ---------- mini-bosses ----------
export const MINI_FOR_DANGER = ["ratking", "ratking", "ironcrab", "ashgiant", "radmother", "radmother"];
export const INTENTS: Record<string, { icon: string; text: string; hint: string }> = {
  swipe: { icon: "🗡️", text: "valmistub tavaliseks löögiks", hint: "Ründa julgelt." },
  smash: { icon: "🔨", text: "tõstab käpad kõrgele — HIIGELLÖÖK tuleb!", hint: "🛡️ Kaitse! Täiuslik tõrje lööb tagasi." },
  charge: { icon: "⚡", text: "kogub jõudu ja hakkab hõõguma…", hint: "💥 Raske löök katkestab ta (tabab kindlalt)." },
  roar: { icon: "📣", text: "möirgab ja ravib end — kaitse on lahti!", hint: "⚔️ Ründa — saad topeltkahju." },
};
export const bountyFor = (wk: string) => { let h = 0; for (const ch of wk) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ["ratking", "ironcrab", "ashgiant", "radmother"][h % 4]; };
export const isMini = (id: string) => MINI_FOR_DANGER.includes(id);
export const bossReady = (s: GameState) => REGIONS[s.region].danger > 0 && s.bossDay[s.region] !== clock(s).day;
export function startBoss(s: GameState): string | null {
  if (!bossReady(s)) return "Koletis on täna juba alistatud või siin pole pesa. Tule homme tagasi.";
  if (!canStart(s)) return "Pole praegu sobiv hetk.";
  if (s.energy < 15) return "Vajad vähemalt 15 energiat.";
  s.energy -= 15;
  const id = MINI_FOR_DANGER[REGIONS[s.region].danger];
  startCombat(s, id);
  if (s.combat) s.combat.intent = "swipe";
  return null;
}
function nextIntent(s: GameState) {
  const r = rnd(); const c = s.combat!;
  c.intent = r < 0.35 ? "swipe" : r < 0.6 ? "smash" : r < 0.85 ? "charge" : "roar";
}

export function combatAct(s: GameState, act: "attack" | "heavy" | "defend" | "flee" | "heal") {
  if (!s.combat) return;
  const e = ENEMIES[s.combat.enemy];
  const dmg = weaponDmg(s);
  s.combat.defending = false;
  if (act === "attack") {
    const hit = rnd() < 0.85 + skillLevel(s.skills.combat) * 0.01;
    const d = hit ? Math.round(dmg * (0.8 + rnd() * 0.4)) : 0;
    s.combat.hp -= d;
    log(s, hit ? `Lööd: −${d} HP vaenlasele.` : "Mööda!", "combat");
    if (hit && hasCompanion(s) && s.combat.hp > 0 && rnd() < 0.35) {
      const a = Math.max(1, Math.round(dmg * 0.35));
      s.combat.hp -= a;
      log(s, `🧒 Tom viskab kivi: −${a} HP!`, "combat");
    }
    if (hit && s.pet && s.combat.hp > 0 && rnd() < (petIs(s, "wolf") ? 0.55 : 0.25)) {
      const a = Math.max(1, Math.round(dmg * (petIs(s, "wolf") ? 0.5 : 0.25) + s.pet.lvl));
      s.combat.hp -= a;
      log(s, `${PET_KINDS[s.pet.kind].icon} ${s.pet.name} hammustab: −${a} HP!`, "combat");
    }
  } else if (act === "heavy") {
    if (s.energy < 6) { log(s, "Liiga väsinud raskeks löögiks.", "bad"); return; }
    s.energy -= 6;
    const hit = rnd() < 0.6;
    const d = hit ? Math.round(dmg * 1.9) : 0;
    s.combat.hp -= d;
    log(s, hit ? `💥 Raske löök: −${d} HP!` : "Raske löök läks mööda!", "combat");
  } else if (act === "defend") {
    s.combat.defending = true; s.energy = clamp(s.energy + 4, 0, 100);
    log(s, "🛡️ Võtad kaitseasendi.", "combat");
  } else if (act === "heal") {
    const med = (["salve", "bandage"] as const).find((m) => s.inv[m]);
    if (!med) { log(s, "Sul pole ravimeid!", "bad"); return; }
    useItem(s, med);
  } else if (act === "flee") {
    if (rnd() < 0.5) { s.combat = null; log(s, "🏃 Põgenesid!", "info"); return; }
    log(s, "Põgenemine ebaõnnestus!", "bad");
  }
  const mini = isMini(e.id) ? s.combat.intent || "swipe" : null;
  let skipEnemy = false; let mult = 1;
  if (mini) {
    if (mini === "roar" && act === "attack" && s.combat.hp > 0) { const b = Math.round(dmg * 0.9); s.combat.hp -= b; log(s, `🎯 Ta on lahti! Lisakahju −${b} HP.`, "combat"); }
    if (mini === "charge") {
      if (act === "heavy") { const b = Math.round(dmg * 1.2); s.combat.hp -= b; skipEnemy = true; log(s, `⛓️ Katkestasid ta jõukogumise! Lisaks −${b} HP ja ta on uimane.`, "good"); }
      else mult = 2.6;
    }
    if (mini === "smash") {
      if (act === "defend") { const b = Math.round(dmg * 1.1); s.combat.hp -= b; mult = 0.1; log(s, `✨ TÄIUSLIK TÕRJE! Lööd vastu: −${b} HP.`, "good"); }
      else mult = 2.1;
    }
    if (mini === "roar") { mult = 0; const h = Math.round(e.hp * 0.08); s.combat.hp = Math.min(e.hp, s.combat.hp + h); log(s, `${e.icon} ${e.name} möirgab ja ravib end +${h} HP.`, "bad"); }
    if (!s.combat.rage && s.combat.hp > 0 && s.combat.hp < e.hp / 2) { s.combat.rage = true; log(s, `🔥 ${e.name} läheb MARRU! Tema löögid on nüüd tugevamad.`, "bad"); }
    if (s.combat.rage) mult *= 1.3;
  }
  if (s.combat.hp <= 0) {
    if (mini) {
      s.stats.bosses++; s.trophies[e.id] = (s.trophies[e.id] || 0) + 1;
      log(s, `🏆 Said trofee: ${e.icon} ${e.name}. Riputa see laagri seinale — iga trofee annab +1 kaitset (kuni 10).`, "loot");
      const wk = weekKey(new Date());
      if (bountyFor(wk) === e.id && s.bountyWeek !== wk) { s.bountyWeek = wk; add(s, "cash", 50); gainXp(s, 100); log(s, `🧔 Pärdi pearaha! «Ma ütlesin, et see on raske. Ma ei öelnud, et võimatu. Need on erinevad sõnad, vaata sõnaraamatust.» +50 🪙, +100 XP`, "good"); }
      s.bossDay[s.region] = clock(s).day; log(s, `👑 MINIBOSS ALISTATUD! ${e.icon} ${e.name} — uus ilmub siia homme.`, "good"); }
    const got = rollLoot(s, e.loot);
    log(s, `✅ ${e.name} on alistatud! +${e.xp} XP. ${got.join(", ")}`, "good");
    gainXp(s, e.xp, "combat");
    if (e.id === "wraith" && !s.npcs.includes("__wraith")) { s.npcs.push("__wraith"); log(s, "🌀 Lõhe sulgub su silme all. Maailm hingab välja. Tulevik on nüüd sinu otsustada.", "lore"); }
    if (e.id === "heart" && !s.npcs.includes("__heart")) { s.npcs.push("__heart"); log(s, "💠 Lõhe Süda laguneb tuhandeteks kildadeks. Üks neist jääb su käte vahele — veel soe.", "lore"); }
    if (s.pet) petXp(s, 3);
    { const h = bonus(s).heal; if (h) s.hp = Math.min(s.maxHp, s.hp + h); }
    maybeRelic(s, mini ? 0.6 : 0.05, mini ? 0.15 : 0);
    s.kills++; s.combat = null; return;
  }
  // enemy turn
  if (mini) nextIntent(s);
  if (skipEnemy) return;
  const raw = Math.round(e.dmg * enemyScale(s) * (0.7 + rnd() * 0.6) * mult);
  const taken = Math.max(0, Math.round((raw - armorDef(s)) * (s.combat.defending ? 0.4 : 1)));
  s.hp -= taken;
  log(s, `${e.icon} ${e.name} ründab: −${taken} HP.`, "bad");
  if (s.hp <= 0) die(s, `${e.icon} ${e.name} tappis sind lahingus.`);
}

function die(s: GameState, cause: string) {
  s.deaths++; s.lastDeath = { cause, t: Date.now() }; s.warn = [];
  s.combat = null; s.action = null; s.event = null;
  const lost: string[] = [];
  for (const k of Object.keys(s.inv)) {
    if (ITEMS[k].type === "resource" || ITEMS[k].type === "food") {
      const l = Math.ceil(s.inv[k] * 0.5); add(s, k, -l); if (l) lost.push(ITEMS[k].name);
    }
  }
  s.hp = Math.round(s.maxHp * 0.5); s.energy = 40; s.food = Math.max(s.food, 30); s.water = Math.max(s.water, 30); s.rad = Math.min(s.rad, 30);
  s.region = "camp";
  log(s, `💀 SA SURID. Ärkad uuesti laagris, kuid kaotasid pool ressurssidest${lost.length ? " (" + lost.slice(0, 5).join(", ") + ")" : ""}.`, "bad");
}

export function useItem(s: GameState, id: string) {
  const it = ITEMS[id]; if (!s.inv[id]) return;
  const medBonus = 1 + (skillLevel(s.skills.medicine) - 1) * 0.1;
  if (it.type === "food") { s.food = clamp(s.food + (it.food || 0), 0, 100); if (it.water) s.water = clamp(s.water + it.water, 0, 100); if (it.heal) s.hp = clamp(s.hp + it.heal, 0, s.maxHp); }
  else if (it.type === "drink") { s.water = clamp(s.water + (it.water || 0), 0, 100); }
  else if (it.type === "medicine") {
    if (it.heal) s.hp = clamp(s.hp + Math.round(it.heal * medBonus), 0, s.maxHp);
    gainXp(s, 3, "medicine");
  } else return equipItem(s, id);
  if (it.rad) s.rad = clamp(s.rad + it.rad, 0, 100);
  add(s, id, -1);
  log(s, `Kasutasid: ${it.icon} ${it.name}`, "info");
}

export function equipItem(s: GameState, id: string) {
  const it = ITEMS[id];
  const slot = (["weapon", "armor", "head", "boots", "tool"] as const).find((k) => k === it.type) ?? null;
  if (!slot) return;
  s.equip[slot] = id;
  log(s, `Varustasid: ${it.icon} ${it.name}`, "info");
}

export function resolveEvent(s: GameState, choice: string) {
  const ev = s.event; s.event = null;
  const meet = (id: string) => { if (!s.npcs.includes(id)) s.npcs.push(id); };
  switch (`${ev}:${choice}`) {
    case "cry:help":
      if (rnd() < 0.55) { meet("kid"); add(s, "berries", 3); log(s, "Leiad hirmunud poisi nimega Tom. Ta liitub sinuga ja jagab oma marju.", "good"); gainXp(s, 20, "survival"); }
      else { log(s, "See oli lõks!", "bad"); startCombat(s); }
      break;
    case "cry:watch":
      if (rnd() < 0.5) { log(s, "Näed, kuidas Vari imiteerib häält. Hiilid minema ja leiad selle pesa juurest kristalli.", "loot"); add(s, "crystal", 1); }
      else { meet("kid"); log(s, "See oli päris laps. Võtad ta enda juurde — Tom.", "good"); }
      break;
    case "cache:open": {
      if (rnd() < 0.75) { const g = rollLoot(s, [["bandage", .8, 2], ["can", .8, 2], ["scrap", .9, 4], ["core", .15, 1]]); log(s, `Kastis oli: ${g.join(", ")}`, "loot"); }
      else { s.hp -= 15; log(s, "💥 Lõks! Plahvatus. −15 HP.", "bad"); if (s.hp <= 0) die(s, "💥 Lõks plahvatas su jalge all."); }
      break;
    }
    case "trader:trade":
      if ((s.inv.scrap || 0) >= 5) { add(s, "scrap", -5); add(s, "can", 1); add(s, "bandage", 1); meet("mirko"); log(s, "Mirko naeratab. \"Head teed, sõber. Näeme veel.\"", "good"); }
      else { meet("mirko"); log(s, "\"Pole metalli? Tule tagasi, kui oled rikkam.\"", "info"); }
      break;
    case "storm:hide": s.energy = clamp(s.energy - 5, 0, 100); log(s, "Ootad tormi varjus ära.", "info"); break;
    case "storm:risk": add(s, "crystal", 2); s.rad = clamp(s.rad + 15, 0, 100); s.hp -= 10; log(s, "Korjad 2 kristalli, kuid torm põletab su nahka. −10 HP, +15 kiirgust.", "loot"); if (s.hp <= 0) die(s, "⛈️ Kristallitorm põletas su surnuks."); break;
    case "wounded:give":
      if (s.inv.water || s.inv.dirtywater) { add(s, s.inv.water ? "water" : "dirtywater", -1); meet("liis"); add(s, "salve", 2); log(s, "Naine nimega Liis tänab sind ja annab kaks taimesalvi. \"Settlers ei unusta.\"", "good"); gainXp(s, 15, "medicine"); }
      else log(s, "Sul pole vett anda. Ta vaatab sind tühjade silmadega.", "bad");
      break;
    case "wounded:rob": add(s, "bandage", 1); add(s, "scrap", 2); log(s, "Võtad, mis saad. Su südametunnistus kaalub raskemalt kui seljakott.", "bad"); break;
    case "terminal:read":
      if (s.lore < LORE.length) { log(s, `📜 ${LORE[s.lore]}`, "lore"); s.lore++; gainXp(s, 25, "exploration"); if (s.lore >= 3) meet("archivist"); }
      else log(s, "Logid on läbi loetud. Ekraan kustub.", "info");
      break;
    case "terminal:salvage": add(s, "wire", 3); add(s, "scrap", 2); log(s, "Saad juhtmeid ja metalli.", "loot"); break;
    default: log(s, "Lähed edasi.", "info");
  }
}

// ---------- tick (timestamp based, works offline) ----------
export function tick(s: GameState, now = Date.now()) {
  const dt = Math.min((now - s.lastTick) / 1000, 60 * 30); // cap 30 min offline drain
  s.lastTick = now;
  if (dt <= 0) return;
  const surv = skillLevel(s.skills.survival);
  const slow = 1 - Math.min(0.4, (surv - 1) * 0.04);
  const atCamp = s.region === "camp";
  // Needs: slow passive drain (full bar lasts ~3h water / ~4h food of active play), slower when resting or
  // sheltered at camp, much slower while away. Most hunger/thirst now comes from effort (see startAction).
  const wid = weatherFor(s, now).id;
  const away = dt > 15;
  const resting = !s.action || s.action.kind === "rest";
  const calm = atCamp && resting ? 0.6 - Math.min(0.2, (s.structures.shelter || 0) * 0.05) : 1;
  const sea = seasonFor(s, now).id;
  const pace = slow * calm;
  // While away from the browser, game time stands still: days, seasons, hunger and thirst do not move.
  if (!away) {
    s.gameMins = (s.gameMins ?? Math.floor(((now - s.started) / 1000) * GAME_MIN_PER_SEC)) + dt * GAME_MIN_PER_SEC;
    s.food = clamp(s.food - dt * 0.007 * pace * (sea === "winter" ? 1.3 : 1), 0, 100);
    s.water = clamp(s.water - dt * 0.009 * pace * (sea === "summer" ? 1.3 : sea === "spring" ? 0.85 : 1) * (wid === "rain" ? 0.7 : wid === "ash" ? 1.2 : 1), 0, 100);
  }
  const reg = REGIONS[s.region];
  if (wid === "ash" && !atCamp) s.rad = clamp(s.rad + dt * 0.015, 0, 100);
  if (reg.rad) s.rad = clamp(s.rad + dt * reg.rad * 0.01, 0, 100);
  else s.rad = clamp(s.rad - dt * 0.01, 0, 100);
  if (!s.action || s.action.kind === "rest") s.energy = clamp(s.energy + dt * (atCamp ? 0.08 + (s.structures.generator || 0) * 0.03 : sea === "winter" ? 0.02 : 0.03), 0, 100);
  if (atCamp && s.structures.infirmary && !s.combat) s.hp = clamp(s.hp + dt * 0.02 * s.structures.infirmary, 0, s.maxHp);
  // danger warnings (once per crossing)
  const W: [string, boolean, string][] = [
    ["food", s.food < 20, "⚠️ Kõht on väga tühi! Söö midagi, muidu hakkab tervis langema."],
    ["water", s.water < 20, "⚠️ Janu on suur! Joo vett, muidu hakkab tervis langema."],
    ["rad", s.rad >= 65, "⚠️ Kiirgus on ohtlik! Mine laagrisse või kasuta kiirgusravimit."],
  ];
  for (const [k, bad, msg] of W) {
    if (bad && !s.warn.includes(k)) { s.warn.push(k); log(s, msg, "bad"); }
    else if (!bad && s.warn.includes(k)) s.warn = s.warn.filter((x) => x !== k);
  }
  let drain = 0;
  if (s.food <= 0) drain += 0.03; if (s.water <= 0) drain += 0.045; if (s.rad >= 80) drain += 0.05;
  if (drain && !s.combat) {
    const offline = dt > 15; // away from the game: never die from needs, stop at 1 HP
    s.hp -= dt * drain;
    if (offline && s.hp < 1) { s.hp = 1; log(s, "🩸 Olid eemal ja su keha on kurnatud — ainult 1 HP alles! Söö, joo ja ravi end kohe.", "bad"); }
    if (s.hp <= 0) {
      const why = s.water <= 0 ? "💧 Suri janu kätte." : s.food <= 0 ? "🍖 Suri nälga." : "☣️ Kiirgus tappis sind.";
      die(s, why); return;
    }
  }
  else if (s.food > 50 && s.water > 50 && !s.combat) s.hp = clamp(s.hp + dt * 0.02, 0, s.maxHp);

  // passive production (every 2 min game-time)
  const prodEvery = 120_000;
  while (now - s.lastProduce >= prodEvery) {
    s.lastProduce += prodEvery;
    if (lvl(s, "collector")) add(s, "water", lvl(s, "collector") * (weatherFor(s, s.lastProduce).id === "rain" ? 2 : 1));
    if (lvl(s, "well")) add(s, "water", lvl(s, "well") * 2);
    if (s.structures.smokehouse && s.inv.meat) { const n = Math.min(s.inv.meat, s.structures.smokehouse); add(s, "meat", -n); add(s, "cooked", n); }
    if (s.structures.generator) add(s, "scrap", 1);
    if (lvl(s, "garden")) add(s, "berries", lvl(s, "garden"));
  }

  // night raid check
  const c = clock(s, now);
  if (hasCompanion(s) && c.day !== s.tomDay) {
    s.tomDay = c.day;
    log(s, TOM_LINES[c.day % TOM_LINES.length], "info");
    const br = Object.keys(s.damaged || {}).find((k) => s.damaged[k] > 0);
    if (br) { s.damaged[br]--; if (!s.damaged[br]) delete s.damaged[br]; log(s, `🧒 Tom nokitses öö läbi ja parandas: ${STRUCTURES[br]?.icon} ${STRUCTURES[br]?.name}!`, "good"); }
  }
  if (c.night && c.day !== s.lastNight && Object.keys(s.structures).length >= 2) {
    s.lastNight = c.day;
    // raids are rarer: roughly every third night, never in the first 3 days
    if (c.day > 3 && rnd() < 0.33) {
      let power = raidPower(c.day) + rnd() * 5;
      if (s.inv.trap) { add(s, "trap", -1); power -= 8; log(s, "🪤 Mutandid astusid su lõksu! Rünnak nõrgenes.", "good"); }
      const def = baseDefense(s);
      s.stats.raids++;
      if (power > def) {
        const hits = Math.min(3, Math.ceil((power - def) / 6));
        const broke: string[] = [];
        for (let i = 0; i < hits; i++) {
          const ok = Object.keys(s.structures).filter((k) => lvl(s, k) > 0);
          if (!ok.length) break;
          const k = ok[Math.floor(rnd() * ok.length)];
          s.damaged[k] = (s.damaged[k] || 0) + 1;
          broke.push(STRUCTURES[k]?.name || k);
        }
        const lost = Math.ceil((power - def) / 3);
        ["wood", "stone", "scrap"].forEach((k) => add(s, k, -Math.min(s.inv[k] || 0, lost)));
        if (atCamp) s.hp -= lost * 2;
        log(s, `🚨 ÖINE RÜNNAK! Mutandid tungisid baasi ja lõhkusid: ${broke.join(", ") || "midagi ei jõudnud"}. Parandada saad Baasi lehel. (−${lost} puitu, kivi, metalli)`, "bad");
        if (s.hp <= 0) die(s, "🚨 Öine rünnak — mutandid murdsid baasi ja tapsid sind.");
      } else log(s, `🌙 Öösel ründasid mutandid baasi, kuid seinad pidasid vastu.`, "good");
    }
  }

  if (!away && !s.combat) randomEvent(s, now);
  if (s.action && now >= s.action.end) finishAction(s);
  if (s.daily.day !== c.day) s.daily = { day: c.day, base: snapshot(s), claimed: [] };
  ensureBarDay(s);
  const wk = weekKey(new Date(now));
  if (s.wk.week !== wk) s.wk = { week: wk, base: statOf(s, weeklyFor(wk).stat) };
  checkAch(s);
}

export const QUESTS: Quest[] = [
  { id: "q1", name: "Esimene öö", desc: "Ehita lõkkeplats.", done: (s) => !!s.structures.campfire },
  { id: "q2", name: "Tööriistad", desc: "Valmista kivikirves ja varusta see.", done: (s) => s.equip.tool !== null },
  { id: "q3", name: "Katus pea kohal", desc: "Ehita varjualune.", done: (s) => !!s.structures.shelter },
  { id: "q4", name: "Kaardistaja", desc: "Avasta 5 piirkonda.", done: (s) => s.discovered.length >= 5 },
  { id: "q5", name: "Jahimees", desc: "Alista 5 vaenlast.", done: (s) => s.kills >= 5 },
  { id: "q6", name: "Pole üksi", desc: "Kohtu kahe ellujäänuga.", done: (s) => s.npcs.length >= 2 },
  { id: "q7", name: "Kindlus", desc: "Ehita kaitsesein tasemele 3.", done: (s) => (s.structures.wall || 0) >= 3 },
  { id: "q8", name: "Sepp", desc: "Ehita sepikoda.", done: (s) => !!s.structures.forge },
  { id: "q9", name: "Mis juhtus?", desc: "Loe läbi kõik PROJEKT KOIDIKu logid.", done: (s) => s.lore >= LORE.length },
  { id: "q10", name: "Lõhe süda", desc: "Jõua Maagilisse tsooni ja alista Lõhe Vaim.", done: (s) => s.npcs.includes("__wraith") },
  { id: "q11", name: "Sügavik", desc: "Jõua Lõhe äärde (kaevanduse sügavused).", done: (s) => s.discovered.includes("depths3") },
  { id: "q12", name: "Pitseerija", desc: "Sulge Lõhe Maagilises tsoonis.", done: (s) => s.sealed },
];

// ---------- companion (Väike Tom) ----------
export const hasCompanion = (s: GameState) => s.npcs.includes("kid");

const TOM_LINES = [
  "🧒 Tom: \"Kas tuled varsti tagasi? Ma hoidsin lõket elus.\"",
  "🧒 Tom: \"Ma sõin ainult ühe konservi. Ausalt.\"",
  "🧒 Tom: \"Mul on uus kepp. See on nüüd minu mõõk.\"",
  "🧒 Tom: \"Kas mäletad, kui sa mind metsast leidsid?\"",
  "🧒 Tom: \"Ma joonistasin meid kahekesi. Sa oled pikem.\"",
  "🧒 Tom: \"Kui ma suureks saan, kaitsen sind ka.\"",
  "🧒 Tom: \"Täna ei näinud ühtegi koledat asja. Vähemalt mitte siin.\"",
];

// ---------- achievements ----------
export interface Achievement { id: string; name: string; desc: string; icon: string; done: (s: GameState) => boolean }
export const ACHIEVEMENTS: Achievement[] = [
  { id: "boss1", name: "Koletisekütt", desc: "Alista oma esimene miniboss.", icon: "👹", done: (s) => (s.stats.bosses || 0) >= 1 },
  { id: "boss_all", name: "Trofeekoguja", desc: "Alista kõik neli minibossi.", icon: "🏆", done: (s) => Object.keys(s.trophies || {}).length >= 4 },
  { id: "boss10", name: "Koletiste õudus", desc: "Alista 10 minibossi.", icon: "💀", done: (s) => (s.stats.bosses || 0) >= 10 },
  { id: "first_blood", name: "Esimene veri", desc: "Alista oma esimene vaenlane.", icon: "⚔️", done: (s) => s.kills >= 1 },
  { id: "hunter", name: "Jaht", desc: "Alista 25 vaenlast.", icon: "🏹", done: (s) => s.kills >= 25 },
  { id: "week", name: "Üle elanud nädala", desc: "Jõua 7. päevani.", icon: "📅", done: (s) => clock(s).day >= 7 },
  { id: "month", name: "Vana kättija", desc: "Jõua 30. päevani.", icon: "🗓️", done: (s) => clock(s).day >= 30 },
  { id: "lvl10", name: "Kogenud", desc: "Saavuta 10. tase.", icon: "⭐", done: (s) => s.level >= 10 },
  { id: "cartographer", name: "Kartograaf", desc: "Avasta kõik piirkonnad.", icon: "🗺️", done: (s) => s.discovered.length >= Object.keys(REGIONS).length },
  { id: "scholar", name: "Arhivaari sõber", desc: "Loe läbi kõik KOIDIKu logid.", icon: "📜", done: (s) => s.lore >= LORE.length },
  { id: "builder", name: "Ehitusmeister", desc: "Ehita iga hoonet vähemalt korra.", icon: "🏗️", done: (s) => Object.keys(STRUCTURES).every((k) => s.structures[k]) },
  { id: "friend", name: "Pole üksi", desc: "Kohtu kolme ellujäänuga.", icon: "🤝", done: (s) => s.npcs.length >= 3 },
  { id: "hoarder", name: "Aaretekoguja", desc: "Täida seljakott täielikult.", icon: "🎒", done: (s) => load(s) >= capacity(s) },
  { id: "boss_slayer", name: "Lõhe Süda", desc: "Alista kaevanduse boss.", icon: "💠", done: (s) => s.npcs.includes("__heart") },
  { id: "tamer", name: "Loomasõber", desc: "Taltsuta mutant.", icon: "🐾", done: (s) => !!s.pet },
  { id: "packleader", name: "Karjajuht", desc: "Arenda lemmik 5. tasemele.", icon: "🐺", done: (s) => (s.pet?.lvl || 0) >= 5 },
  { id: "truth", name: "Koidiku tõde", desc: "Kogu kõik Koidiku fragmendid.", icon: "📼", done: (s) => s.codex.length >= CODEX.length },
  { id: "sealed", name: "Maailma Päästja", desc: "Sulge Lõhe.", icon: "🌍", done: (s) => s.sealed },
];

export function checkAch(s: GameState) {
  for (const a of ACHIEVEMENTS) {
    if (!s.ach.includes(a.id) && a.done(s)) {
      s.ach.push(a.id);
      log(s, `🏆 SAAVUTUS: ${a.icon} ${a.name} — ${a.desc}`, "good");
    }
  }
}

// ---------- seal the rift (finale) ----------
export function sealRift(s: GameState): string | null {
  if (s.region !== "magic") return "Lõhet saab pitseerida ainult Maagilises tsoonis.";
  if (!s.inv.sealer) return "Vajad Lõhe Pitseerijat (sepista laboris Lõhe kildast).";
  if (s.combat || s.action || s.event) return "Pole praegu sobiv hetk.";
  add(s, "sealer", -1);
  s.sealed = true; s.seenEnding = false; s.ending = pickEnding(s);
  log(s, "🌀 Pitseerija sumiseb, tõuseb õhku ja LÕHE SULGUB. Taevas paraneb. Maailm on päästetud — ja sina oled see, kes selle ära tegi.", "lore");
  gainXp(s, 300);
  checkAch(s);
  return null;
}

/** Three endings: the faction you stood closest to shapes the new world. */
export const ENDINGS: Record<string, { title: string; text: string }> = {
  settlers: { title: "🏘️ UUS KOIDIK", text: "Asunikud ehitavad Lõhe varemetele linna. Sinu nimi raiutakse esimese maja uksepiidale. Inimesed jäävad paigale — ja hakkavad jälle unistama." },
  wanderers: { title: "🐫 VABA TUUL", text: "Rändurid viivad sõnumi kõigisse varemetesse: taevas on puhas. Keegi ei valitse, keegi ei käsi. Sina kaod koos karavaniga silmapiiri taha." },
  order: { title: "🔆 ORDU VALGUS", text: "Koidiku Ordu hoiab Pitseerija saladust. Nad lubavad, et teist Lõhet ei tule — aga nende tornides põlevad tuled kogu öö. Kas see oli õige valik?" },
};
export function pickEnding(s: GameState) {
  const r = s.rep || {}; return (["settlers", "wanderers", "order"] as const).reduce((a, b) => ((r[b] || 0) > (r[a] || 0) ? b : a), "settlers");
}

// ---------- base defense ----------
export const raidPower = (day: number) => day * 1.5;
export const lvl = (s: GameState, id: string) => Math.max(0, (s.structures[id] || 0) - (s.damaged?.[id] || 0));
export const repairCost = (id: string) => Object.fromEntries(Object.entries(STRUCTURES[id]?.cost || {}).map(([k, v]) => [k, Math.max(1, Math.ceil(v / 3))]));
export function repairStructure(s: GameState, id: string): string | null {
  if (!s.damaged[id]) return null;
  if (s.region !== "camp") return "Parandada saad ainult laagris.";
  const cost = repairCost(id);
  for (const [k, v] of Object.entries(cost)) if ((s.inv[k] || 0) < v) return `Puudu: ${ITEMS[k]?.name || k}`;
  if (s.energy < 5) return "Liiga väsinud.";
  for (const [k, v] of Object.entries(cost)) add(s, k, -v);
  s.energy -= 5; s.damaged[id]--; if (!s.damaged[id]) delete s.damaged[id];
  gainXp(s, 8, "engineering");
  log(s, `🔧 Parandasid: ${STRUCTURES[id].icon} ${STRUCTURES[id].name}`, "good");
  return null;
}
export const trophyCount = (s: GameState) => Object.values(s.trophies || {}).reduce((a, b) => a + b, 0);
export const baseDefense = (s: GameState) =>
  Math.min(10, trophyCount(s)) + lvl(s, "wall") * 4 + lvl(s, "tower") * 3 + lvl(s, "turret") * 7 + s.level + (hasCompanion(s) ? 1 : 0) + (petIs(s, "scorpion") ? 3 : 0);

// ---------- stats, daily & weekly ----------
export type Counter = StatKey | "kills";
export const statOf = (s: GameState, k: Counter) => (k === "kills" ? s.kills : s.stats[k] || 0);
const snapshot = (s: GameState) => Object.fromEntries((["kills", ...Object.keys(s.stats)] as Counter[]).map((k) => [k, statOf(s, k)]));
export interface DailyQuest { id: string; name: string; icon: string; stat: Counter; n: number; reward: Record<string, number>; xp: number }
const DAILY_POOL: DailyQuest[] = [
  { id: "d_gather", name: "Korja 6 korda", icon: "🪓", stat: "gathered", n: 6, reward: { can: 1, water: 1 }, xp: 25 },
  { id: "d_kill", name: "Alista 3 vaenlast", icon: "⚔️", stat: "kills", n: 3, reward: { bandage: 2 }, xp: 35 },
  { id: "d_craft", name: "Valmista 3 asja", icon: "🔨", stat: "crafted", n: 3, reward: { scrap: 4, wire: 1 }, xp: 25 },
  { id: "d_explore", name: "Uuri 3 korda", icon: "🧭", stat: "explored", n: 3, reward: { salve: 1 }, xp: 30 },
  { id: "d_travel", name: "Ränna 4 korda", icon: "🚶", stat: "traveled", n: 4, reward: { cooked: 2 }, xp: 20 },
  { id: "d_fish", name: "Püüa 2 korda kala", icon: "🎣", stat: "fished", n: 2, reward: { antirad: 1 }, xp: 25 },
  { id: "d_build", name: "Ehita või arenda 1 hoone", icon: "🏗️", stat: "built", n: 1, reward: { stone: 6, wood: 6 }, xp: 30 },
];
export function dailyFor(day: number) {
  const out: DailyQuest[] = []; let i = day * 3;
  while (out.length < 5) { const q = DAILY_POOL[(i * 5 + 1) % DAILY_POOL.length]; if (!out.includes(q)) out.push(q); i++; }
  return out;
}
export const dailyProgress = (s: GameState, q: DailyQuest) => Math.max(0, statOf(s, q.stat) - (s.daily.base[q.stat] ?? statOf(s, q.stat)));
export function claimDaily(s: GameState, id: string): string | null {
  const q = dailyFor(s.daily.day).find((x) => x.id === id);
  if (!q || s.daily.claimed.includes(id)) return "Juba võetud.";
  if (dailyProgress(s, q) < q.n) return "Pole veel tehtud.";
  s.daily.claimed.push(id);
  Object.entries(q.reward).forEach(([k, v]) => add(s, k, v));
  gainXp(s, q.xp);
  log(s, `📅 Päevane ülesanne tehtud: ${q.name}! Said ${Object.entries(q.reward).map(([k, v]) => `${ITEMS[k].icon}×${v}`).join(" ")}`, "good");
  return null;
}
export function weekKey(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((+t - +y0) / 864e5 + 1) / 7)).padStart(2, "0")}`;
}
export interface Weekly { name: string; icon: string; desc: string; stat: Counter; goal: number }
const WEEKLY_POOL: Weekly[] = [
  { name: "Mutandijaht", icon: "🐺", desc: "Kõik ellujääjad koos: alistage vaenlasi.", stat: "kills", goal: 500 },
  { name: "Suur korjamine", icon: "🪓", desc: "Koguge ühiselt ressursse.", stat: "gathered", goal: 1000 },
  { name: "Kaardistajad", icon: "🧭", desc: "Uurige ühiselt maailma.", stat: "explored", goal: 400 },
  { name: "Ehitusnädal", icon: "🏗️", desc: "Ehitage ja arendage hooneid.", stat: "built", goal: 150 },
  { name: "Kalanädal", icon: "🎣", desc: "Püüdke Üleujutatud alal kala.", stat: "fished", goal: 300 },
];
export const weeklyFor = (wk: string) => WEEKLY_POOL[parseInt(wk.slice(-2), 10) % WEEKLY_POOL.length];
export const weeklyContribution = (s: GameState) => Math.max(0, statOf(s, weeklyFor(s.wk.week).stat) - s.wk.base);

// ---------- pets ----------
function petXp(s: GameState, n: number) {
  if (!s.pet) return;
  s.pet.xp += n;
  const need = s.pet.lvl * 15;
  if (s.pet.xp >= need && s.pet.lvl < 10) { s.pet.xp -= need; s.pet.lvl++; log(s, `🐾 ${s.pet.name} tõusis tasemele ${s.pet.lvl}!`, "good"); }
}
export const canTame = (s: GameState) => !!s.combat && !!PET_KINDS[s.combat.enemy] && s.combat.hp <= ENEMIES[s.combat.enemy].hp * 0.35;
export function tame(s: GameState): string | null {
  if (!s.combat || !canTame(s)) return "Vaenlane peab olema nõrgestatud (alla 35% HP).";
  if (!s.inv.meat && !s.inv.cooked) return "Vajad liha, et teda meelitada.";
  add(s, s.inv.meat ? "meat" : "cooked", -1);
  const kind = PET_KINDS[s.combat.enemy];
  if (rnd() < 0.45 + skillLevel(s.skills.survival) * 0.03) {
    if (s.pet) log(s, `${PET_KINDS[s.pet.kind].icon} ${s.pet.name} jookseb tagasi metsa. Uus kaaslane võtab tema koha.`, "info");
    s.pet = { kind: kind.id, name: kind.name, lvl: 1, xp: 0, fed: Date.now() };
    s.combat = null;
    log(s, `🐾 TALTSUTATUD! ${kind.icon} ${kind.name} sööb su käest ja järgneb sulle. ${kind.perk}`, "good");
    gainXp(s, 25, "survival");
  } else log(s, `${kind.icon} Ta haarab liha ja urineb. Taltsutamine ebaõnnestus.`, "bad");
  return null;
}
export function feedPet(s: GameState): string | null {
  if (!s.pet) return null;
  const f = (["meat", "cooked", "fish"] as const).find((x) => s.inv[x]);
  if (!f) return "Pole liha ega kala, mida anda.";
  add(s, f, -1); s.pet.fed = Date.now(); petXp(s, 6);
  log(s, `${PET_KINDS[s.pet.kind].icon} ${s.pet.name} sööb rõõmsalt.`, "good");
  return null;
}
export function renamePet(s: GameState, name: string) { if (s.pet && name.trim()) s.pet.name = name.trim().slice(0, 20); }
export function releasePet(s: GameState) { if (s.pet) { log(s, `${PET_KINDS[s.pet.kind].icon} Lasid ${s.pet.name} vabaks.`, "info"); s.pet = null; } }

// ---------- kennel & breeding ----------
export const kennelSlots = (s: GameState) => (s.structures.kennel || 0) * 2;
export const BREED_COST: Record<string, number> = { meat: 2, herb: 1 };
export const BREED_COOLDOWN = 1440 * 1000; // one game day
export function kennelStore(s: GameState): string | null {
  if (!s.pet) return null;
  if (s.kennel.length >= kennelSlots(s)) return "Kennelis pole ruumi. Ehita või arenda kennel.";
  s.kennel.push(s.pet); log(s, `🏠 ${s.pet.name} läks kennelisse puhkama.`, "info"); s.pet = null; return null;
}
export function kennelTake(s: GameState, i: number): string | null {
  const p = s.kennel[i]; if (!p) return null;
  s.kennel.splice(i, 1);
  if (s.pet) s.kennel.push(s.pet);
  s.pet = p; log(s, `🐾 ${p.name} tuleb nüüd sinuga kaasa.`, "good"); return null;
}
export function kennelRelease(s: GameState, i: number) { const p = s.kennel[i]; if (p) { s.kennel.splice(i, 1); log(s, `Lasid ${p.name} vabaks.`, "info"); } }
export function breedPets(s: GameState, a: number, b: number, now = Date.now()): string | null {
  // indices: -1 = active pet, otherwise kennel index
  const get = (i: number) => (i < 0 ? s.pet : s.kennel[i]);
  const A = get(a), B = get(b);
  if (!A || !B || a === b) return "Vali kaks erinevat lemmikut.";
  if (!s.structures.kennel) return "Aretamiseks on vaja kennelit.";
  if (s.region !== "camp") return "Aretada saab ainult laagris.";
  if (s.kennel.length >= kennelSlots(s)) return "Kennelis pole kutsika jaoks ruumi.";
  if (now - s.lastBreed < BREED_COOLDOWN) return `Loomad vajavad puhkust. Proovi ${Math.ceil((BREED_COOLDOWN - (now - s.lastBreed)) / 60000)} min pärast.`;
  if (A.lvl < 3 || B.lvl < 3) return "Mõlemad vanemad peavad olema vähemalt 3. tasemel.";
  if (!has(s, BREED_COST)) return "Aretus vajab 2 toorest liha ja 1 ravimtaime.";
  pay(s, BREED_COST);
  const [main, other] = rnd() < 0.5 ? [A, B] : [B, A];
  const traits = [main.kind, main.kind2, other.kind, other.kind2].filter(Boolean) as string[];
  const kind = main.kind;
  const second = traits.find((t) => t !== kind);
  const lvl = Math.min(6, 1 + Math.floor((A.lvl + B.lvl) / 4) + (second ? 0 : 1));
  const gen = Math.max(A.gen || 1, B.gen || 1) + 1;
  const inherited = [A.mut, B.mut].filter(Boolean) as string[];
  const mkeys = Object.keys(PET_MUTS);
  const mut = inherited.length && rnd() < 0.5 ? inherited[Math.floor(rnd() * inherited.length)] : rnd() < 0.15 ? mkeys[Math.floor(rnd() * mkeys.length)] : undefined;
  const pup: Pet = { kind, kind2: second, name: `Kutsikas ${gen}. põlv`, lvl, xp: 0, fed: now, gen, mut };
  if (mut) log(s, `🧬 Haruldane mutatsioon! Kutsikal on omadus ${PET_MUTS[mut].icon} ${PET_MUTS[mut].name} (${PET_MUTS[mut].perk}).`, "good");
  s.kennel.push(pup); s.lastBreed = now;
  log(s, `🍼 Sündis kutsikas! ${PET_KINDS[kind].icon}${second ? "+" + PET_KINDS[second].icon : ""} LVL ${lvl}${second ? ` — päris mõlema vanema võimed (${PET_KINDS[kind].name} + ${PET_KINDS[second].name})` : " — puhtatõuline, tugevam algtase"}.`, "good");
  gainXp(s, 30, "survival");
  return null;
}

// ---------- random events (roughly every 6-12 minutes of play) ----------
const RANDOM_EVENTS: { w: number; good: boolean; run: (s: GameState) => string }[] = [
  { w: 3, good: true, run: (s) => { const n = 2 + Math.floor(rnd() * 4); add(s, "cash", n); return `🐫 Möödus karavan. Aitasid neil vankrit lükata ja said ${n} korki.`; } },
  { w: 2, good: true, run: (s) => { add(s, "crystal", 1); add(s, "stone", 2); return "☄️ Taevast kukkus väike meteoriit! Leidsid kraatrist kristalli ja kive."; } },
  { w: 3, good: true, run: (s) => { const it = rnd() < 0.5 ? "water" : "can"; add(s, it, 2); return `🧳 Rändkaupmees jättis sulle tänutäheks ${ITEMS[it].name} ×2. «Head teed, rändaja!»`; } },
  { w: 2, good: true, run: (s) => { add(s, "dirtywater", 3); return "🌧️ Äkiline paduvihm täitis su anumad — must vesi ×3."; } },
  { w: 2, good: true, run: (s) => { s.energy = clamp(s.energy + 20, 0, 100); return "🎶 Kauge raadio mängis vana laulu. Tunned end värskemana (+20 energiat)."; } },
  { w: 2, good: false, run: (s) => { const it = ["wood", "stone", "scrap", "cloth"].find((k) => (s.inv[k] || 0) > 1); if (!it) return "🦝 Keegi sobras su asjades, aga ei leidnud midagi. Ha!"; add(s, it, -1); return `🦝 Mutantpesukaru varastas ühe ${ITEMS[it].name}.`; } },
  { w: 1, good: false, run: (s) => { s.rad = clamp(s.rad + 8, 0, 100); return "☢️ Kiirgustuul puhus üle. Kiirgus +8."; } },
  // big events
  { w: 1, good: true, run: (s) => { add(s, "cash", 25); add(s, "can", 3); add(s, "scrap", 4); return "🚂 RONG TULEB TAGASI! Vana rong vuras rööbastel mööda ja kaotas lasti. Korjasid 25 🪙, konserve ja romu."; } },
  { w: 1, good: false, run: (s) => { s.rad = clamp(s.rad + 15, 0, 100); s.energy = clamp(s.energy - 15, 0, 100); add(s, "dirtywater", 4); return "🌑 MUST VIHM! Taevast sadas tuhka ja kiirgust (kiirgus +15, energia −15), aga anumad said täis."; } },
  { w: 1, good: true, run: (s) => { add(s, "crystal", 3); return "💎 KRISTALLÖÖ! Taevast kukkus helendavaid kristalle — said 3."; } },
  { w: 1, good: true, run: (s) => { add(s, "medkit", 1); add(s, "cloth", 3); add(s, "wood", 4); return "🏚️ HÜLJATUD LAAGER! Leidsid tühja laagri: esmaabikarp, riie ja puit."; } },
  { w: 1, good: true, run: (s) => { const n = 1 + Math.floor(rnd() * 3); add(s, "bandage", n); gainXp(s, 40); return `📻 SOS! Raadiost kostis appihüüd. Aitasid ellujäänu turvalisse kohta (+40 XP, sidemeid ${n}).`; } },
  { w: 1, good: false, run: (s) => {
    if (s.combat || s.action || !REGIONS[s.region].danger) { s.energy = clamp(s.energy - 10, 0, 100); return "🌘 TUHAKUU! Kuu värvus halliks ja öö tundus lõputu (energia −10)."; }
    startCombat(s, "shade"); return "🌘 TUHAKUU! Varjust kerkis vari-koletis.";
  } },
  { w: 1, good: false, run: (s) => {
    if (s.combat || s.action || REGIONS[s.region].danger < 3) return "🐾 BEHEMOTI JÄLJED! Leidsid hiiglaslikud jäljed. Kiirgusala poole…";
    startCombat(s, "behemoth"); return "🐾 BEHEMOTI JÄLJED! Jäljed lõppesid — behemot seisab su ees!";
  } },
  { w: 1, good: true, run: (s) => { add(s, "cash", 30); gainXp(s, 60); return "🍺 PÄRT KAOB! Roostes Kruus oli tühi. Leidsid Pärdi varemetest, jalg kivi all. Tänutäheks 30 🪙 (+60 XP)."; } },
  { w: 1, good: false, run: (s) => { s.rad = clamp(s.rad + 10, 0, 100); add(s, "crystal", 2); if (rnd() < 0.3) add(s, "voidshard", 1); return "🌀 LÕHE LIIGUB! Taevas nihkus, maa värises. Kiirgus +10, aga maast kerkis kristalle."; } },
  { w: 1, good: true, run: (s) => {
    const d = clock(s).day; if (d % 30 !== 0 || s.qd?.dawnDay === d) { add(s, "cash", 5); return "🌅 Koit oli täna eriti punane. Leidsid maast 5 korki."; }
    s.qd = { ...(s.qd || {}), dawnDay: d }; giveRelic(s, makeRelic(0.3)); gainXp(s, 200);
    return "🌅 KOIDIKU PÄEV! Kord 30 päeva jooksul tõuseb Lõhest valgus. Said legendaarse leiu ja +200 XP.";
  } },
  { w: 2, good: false, run: (s) => {
    const d = REGIONS[s.region].danger;
    if (!d || s.combat || s.action) return "👣 Kuskil kaugel kõndis midagi suurt. Maa värises.";
    startCombat(s, MINI_FOR_DANGER[d]); const c = s.combat as GameState["combat"]; if (c) c.intent = "swipe";
    return "⚠️ VARITSUS! Piirkonna miniboss tuli ise sulle järele!";
  } },
];
function randomEvent(s: GameState, now: number) {
  if (!s.lastRandom) s.lastRandom = now;
  if (now - s.lastRandom < 6 * 60_000) return;
  if (rnd() > 0.004) return; // ~1 per extra few minutes after the cooldown
  s.lastRandom = now;
  let pool = RANDOM_EVENTS;
  if (petMut(s, "glow") && rnd() < 0.5) pool = pool.filter((e) => e.good);
  const total = pool.reduce((a, e) => a + e.w, 0); let r = rnd() * total;
  const ev = pool.find((e) => (r -= e.w) < 0) || pool[0];
  log(s, ev.run(s), ev.good ? "good" : "bad");
}

// ---------- bar ----------
export const atBar = (s: GameState) => s.region === BAR_REGION;
export function barBuy(s: GameState, id: string): string | null {
  const p = BAR_BUY[id]; if (!p) return null;
  if (!atBar(s)) return "Baar on Varemetes.";
  if ((s.inv.cash || 0) < p) return "Pole piisavalt korke.";
  if (load(s) >= capacity(s)) return "Seljakott on täis!";
  add(s, "cash", -p); add(s, id, 1); return null;
}
export function barSell(s: GameState, id: string, lots = 1): string | null {
  const t = BAR_SELL[id]; if (!t) return null;
  if (!atBar(s)) return "Baar on Varemetes.";
  const owned = s.inv[id] || 0;
  const usable = Object.values(s.equip).includes(id) ? owned - 1 : owned;
  const n = Math.min(lots, Math.floor(usable / t[0]));
  if (n < 1) return `Vajad vähemalt ${t[0]} tk (varustuses olev ese ei lähe müüki).`;
  add(s, id, -n * t[0]); add(s, "cash", n * t[1]);
  log(s, `🍺 Müüsid baarmenile ${ITEMS[id].icon} ${ITEMS[id].name} ×${n * t[0]} → 🪙 ${n * t[1]}`, "loot");
  return null;
}
export function contractsFor(day: number): Contract[] {
  const out: Contract[] = []; let i = day * 7 + 3;
  while (out.length < 3) { const c = CONTRACT_POOL[(i * 7 + 2) % CONTRACT_POOL.length]; if (!out.includes(c)) out.push(c); i++; }
  return out;
}
export function ensureBarDay(s: GameState) {
  const day = clock(s).day;
  if (s.bar.day !== day) s.bar = { day, base: snapshot(s), done: [] };
}
export const contractProgress = (s: GameState, c: Contract) =>
  c.kind === "deliver" ? Math.min(c.n, s.inv[c.item!] || 0) : Math.min(c.n, Math.max(0, statOf(s, c.stat!) - (s.bar.base[c.stat!] ?? statOf(s, c.stat!))));
export function claimContract(s: GameState, id: string): string | null {
  const c = contractsFor(s.bar.day).find((x) => x.id === id);
  if (!c || s.bar.done.includes(id)) return "Juba tehtud.";
  if (!atBar(s)) return "Tasu saab kätte baarist (Varemed).";
  if (contractProgress(s, c) < c.n) return "Pole veel tehtud.";
  if (c.kind === "deliver") add(s, c.item!, -c.n);
  s.bar.done.push(id); add(s, "cash", c.cash); gainXp(s, c.xp);
  log(s, `📜 Leping täidetud: ${c.name}! +🪙${c.cash} +${c.xp} XP`, "good");
  return null;
}
// minigames: pay bet first, then resolve. Returns message for the UI.
function bet(s: GameState, n: number): string | null {
  if (!atBar(s)) return "Baar on Varemetes.";
  if (n < 1 || n > 50) return "Panus 1–50 korki.";
  if ((s.inv.cash || 0) < n) return "Pole piisavalt korke.";
  add(s, "cash", -n); return null;
}
const d6 = () => 1 + Math.floor(rnd() * 6);
export function playDice(s: GameState, n: number) {
  const e = bet(s, n); if (e) return { err: e };
  const me = [d6(), d6()], him = [d6(), d6()];
  const a = me[0] + me[1], b = him[0] + him[1];
  let win = 0;
  if (a > b) win = n * 2; else if (a === b) win = n;
  add(s, "cash", win);
  return { me, him, win, msg: a > b ? `Võitsid! +🪙${win}` : a === b ? "Viik — panus tagasi." : "Baarmen võitis." };
}
export function playRats(s: GameState, n: number, pick: number) {
  const e = bet(s, n); if (e) return { err: e };
  const speeds = [0, 1, 2, 3].map(() => rnd());
  const winner = speeds.indexOf(Math.max(...speeds));
  const win = winner === pick ? Math.floor(n * 3.5) : 0;
  add(s, "cash", win);
  return { winner, speeds, win, msg: win ? `Sinu rott võitis! +🪙${win}` : `Võitis rott nr ${winner + 1}.` };
}
export function playBottle(s: GameState, n: number, pos: number) {
  // pos 0..1 where the player stopped the marker; bullseye at 0.5
  const e = bet(s, n); if (e) return { err: e };
  const d = Math.abs(pos - 0.5);
  const win = d < 0.04 ? n * 4 : d < 0.12 ? n * 2 : 0;
  add(s, "cash", win);
  return { win, msg: d < 0.04 ? `TÄPNE! +🪙${win}` : win ? `Pudel kukkus! +🪙${win}` : "Mööda..." };
}
export function cardDraw() { return 1 + Math.floor(rnd() * 13); }
export function hiloPay(s: GameState, n: number): string | null { return bet(s, n); }
export function hiloCashOut(s: GameState, amount: number) { if (amount > 0) { add(s, "cash", amount); log(s, `🃏 Kõrgem-madalam: võitsid 🪙${amount}`, "loot"); } }

const KEY = "tuhk-save-v1";
export function save(s: GameState) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
export function loadSave(): GameState | null {
  try {
    const r = localStorage.getItem(KEY); if (!r) return null;
    return migrateSave(JSON.parse(r) as Partial<GameState>);
  } catch { return null; }
}
export function migrateSave(p: Partial<GameState>): GameState {
  {
    const base = newGame();
    return { ...base, ...p, skills: { ...base.skills, ...p.skills }, equip: { ...base.equip, ...p.equip }, stats: { ...base.stats, ...p.stats }, daily: p.daily ?? base.daily, wk: p.wk ?? base.wk, pet: p.pet ?? null, codex: p.codex ?? [], kennel: p.kennel ?? [], lastBreed: p.lastBreed ?? 0, bar: p.bar ?? base.bar, damaged: p.damaged ?? {}, bossDay: p.bossDay ?? {}, trophies: p.trophies ?? {}, bountyWeek: p.bountyWeek ?? "", perks: p.perks ?? [], relics: p.relics ?? [], charm: p.charm ?? null, exp: p.exp ?? null, expWeek: p.expWeek ?? null, rep: p.rep ?? {}, rankClaimed: p.rankClaimed ?? {}, donated: p.donated ?? {}, bond: p.bond ?? {}, story: p.story ?? {}, choices: p.choices ?? [], seen: p.seen ?? Object.keys(p.inv ?? {}), collDone: p.collDone ?? [], ngp: p.ngp ?? 0, terr: p.terr ?? [], sea: p.sea ?? null, seaClaimed: p.seaClaimed ?? "", path: p.path ?? null, secrets: p.secrets ?? [], hints: p.hints ?? [] };
  }
}
export function wipe() { localStorage.removeItem(KEY); }
