// Factions + reputation, NPC bonds and story chains, daily world events, collections, New Game+.
import { ITEMS, NPCS } from "./data";
import { add, clock, gainXp, gameLog as log, has, newGame, type GameState } from "./engine";
import { giveRelic, makeRelic } from "./progress";

const pay = (s: GameState, c: Record<string, number>) => Object.entries(c).forEach(([k, v]) => add(s, k, -v));
const costStr = (c: Record<string, number>) => Object.entries(c).map(([k, v]) => `${ITEMS[k]?.icon ?? k}${v}`).join(" ");

// ---------- factions ----------
export interface Faction { id: string; name: string; icon: string; desc: string; wants: Record<string, number>; rival: string }
export const FACTIONS: Faction[] = [
  { id: "settlers", name: "Asunikud", icon: "🏘️", desc: "Ehitavad uut elu. Vajavad ehitusmaterjali.", wants: { wood: 8, stone: 6 }, rival: "order" },
  { id: "wanderers", name: "Rändurid", icon: "🐫", desc: "Kaupmehed ja teeotsijad. Hindavad kaupa.", wants: { scrap: 6, cloth: 3 }, rival: "settlers" },
  { id: "order", name: "Koidiku Ordu", icon: "🔺", desc: "Tahavad Lõhet uurida, mitte sulgeda.", wants: { crystal: 1, ore: 2 }, rival: "wanderers" },
];
export const RANKS = [
  { at: 0, name: "Võõras" }, { at: 20, name: "Tuttav", reward: { cash: 20 } }, { at: 50, name: "Liitlane", reward: { cash: 50, bandage: 3 } },
  { at: 100, name: "Vend/Õde", reward: { cash: 100 }, relic: true }, { at: 200, name: "Legend", reward: { cash: 200 }, relic: true },
] as const;
export const repOf = (s: GameState, f: string) => s.rep?.[f] || 0;
export const rankOf = (rep: number) => [...RANKS].reverse().find((r) => rep >= r.at) ?? RANKS[0];
export function addRep(s: GameState, f: string, n: number) {
  s.rep = s.rep || {}; s.rankClaimed = s.rankClaimed || {};
  const before = rankOf(repOf(s, f));
  s.rep[f] = Math.max(-100, repOf(s, f) + n);
  const after = rankOf(repOf(s, f)); const fac = FACTIONS.find((x) => x.id === f)!;
  if (after.at > before.at && !(s.rankClaimed[f] || []).includes(after.at)) {
    s.rankClaimed[f] = [...(s.rankClaimed[f] || []), after.at];
    if ("reward" in after) Object.entries(after.reward).forEach(([k, v]) => add(s, k, v));
    if ("relic" in after && after.relic) giveRelic(s, makeRelic(0.3));
    log(s, `${fac.icon} ${fac.name}: oled nüüd «${after.name}»!`, "good");
  }
}
/** Helping one faction annoys its rival a little — choices matter. */
export function donate(s: GameState, f: string): string | null {
  const fac = FACTIONS.find((x) => x.id === f); if (!fac) return "Tundmatu.";
  const day = clock(s).day;
  if (s.donated?.[f] === day) return "Täna juba aitasid neid. Tule homme.";
  if (!has(s, fac.wants)) return `Vaja: ${costStr(fac.wants)}`;
  pay(s, fac.wants); s.donated = { ...(s.donated || {}), [f]: day };
  addRep(s, f, 10); addRep(s, fac.rival, -3); gainXp(s, 20);
  log(s, `${fac.icon} Aitasid: ${fac.name} +10 mainet (rivaal −3).`, "good");
  return null;
}

// ---------- NPC bonds + story chains ----------
export interface StoryStep { text: string; need: Record<string, number>; reward: Record<string, number>; choice?: { a: [string, string]; b: [string, string] } }
export const STORIES: Record<string, { title: string; steps: StoryStep[] }> = {
  liis: { title: "Liisi haigla", steps: [
    { text: "«Mul on haavatuid ja mitte midagi, millega neid siduda.»", need: { cloth: 4 }, reward: { bandage: 3 } },
    { text: "«Palavik levib. Vajan ravimtaimi.»", need: { herb: 5 }, reward: { salve: 2 } },
    { text: "«Asunikud tahavad haigla enda alla. Rändurid pakuvad kaupa vastu. Kellele ma selle annan?»", need: {}, reward: { cash: 30 }, choice: { a: ["settlers", "Asunikele"], b: ["wanderers", "Ränduritele"] } },
  ] },
  mirko: { title: "Mirko karavan", steps: [
    { text: "«Mu vankri teljed on läbi. Too rauda.»", need: { scrap: 6 }, reward: { cash: 25 } },
    { text: "«Teel on rüüstajad. Too mulle midagi, millega end kaitsta.»", need: { wire: 3, wood: 4 }, reward: { cash: 40 } },
    { text: "«Ordu tahab mu kristallilasti. Asunikud tahavad selle eest varju anda. Kumba usaldame?»", need: {}, reward: { cash: 50 }, choice: { a: ["order", "Ordule"], b: ["settlers", "Asunikele"] } },
  ] },
  archivist: { title: "Arhivaari mälu", steps: [
    { text: "«Mu mälukiibid on rikutud. Vask, palun. Ehk traat.»", need: { wire: 4 }, reward: { antirad: 1 } },
    { text: "«Signaal tuleb sügavusest. Vajan kristalli, et seda dešifreerida.»", need: { crystal: 2 }, reward: { cash: 40 } },
    { text: "«Ma mäletan nüüd kõike. Kas annan teadmised Ordule või hävitan need?»", need: {}, reward: { cash: 60 }, choice: { a: ["order", "Anna Ordule"], b: ["wanderers", "Hävita (Rändurid kiidavad)"] } },
  ] },
  kid: { title: "Tomi kodu", steps: [
    { text: "«Mul on külm.» Tom vaatab su riideid.", need: { cloth: 3, hide: 1 }, reward: {} },
    { text: "«Kas sa õpetad mulle kala püüdma?»", need: { fish: 2 }, reward: { cooked: 2 } },
    { text: "«Ma tahan ka kunagi aidata. Kes on head inimesed?»", need: {}, reward: {}, choice: { a: ["settlers", "Asunikud"], b: ["wanderers", "Rändurid"] } },
  ] },
};
export const bondOf = (s: GameState, n: string) => s.bond?.[n] || 0;
export const storyStep = (s: GameState, n: string) => s.story?.[n] || 0;
export function advanceStory(s: GameState, npc: string, pick?: "a" | "b"): string | null {
  const st = STORIES[npc]; if (!st || !s.npcs.includes(npc)) return "Seda tegelast pole sul veel.";
  const i = storyStep(s, npc); const step = st.steps[i]; if (!step) return "Lugu on lõpetatud.";
  if (step.choice && !pick) return "Tee valik.";
  if (!has(s, step.need)) return `Vaja: ${costStr(step.need)}`;
  pay(s, step.need); Object.entries(step.reward).forEach(([k, v]) => add(s, k, v));
  s.story = { ...(s.story || {}), [npc]: i + 1 }; s.bond = { ...(s.bond || {}), [npc]: bondOf(s, npc) + 1 };
  gainXp(s, 40 + i * 20);
  if (step.choice && pick) { const [f] = step.choice[pick]; addRep(s, f, 25); const other = step.choice[pick === "a" ? "b" : "a"][0]; addRep(s, other, -10); s.choices = [...(s.choices || []), `${npc}:${f}`]; }
  log(s, `${NPCS[npc].icon} ${NPCS[npc].name}: suhe tugevnes (${bondOf(s, npc)}/${st.steps.length}).`, "good");
  if (i + 1 === st.steps.length) { giveRelic(s, makeRelic(0.2)); log(s, `📗 Lugu «${st.title}» on lõpetatud.`, "lore"); }
  return null;
}

// ---------- daily world events ----------
export interface WorldEvent { id: string; name: string; icon: string; desc: string; gather: number; xp: number; enemy: number }
export const WORLD_EVENTS: WorldEvent[] = [
  { id: "calm", name: "Vaikne päev", icon: "🌤️", desc: "Midagi erilist ei juhtu.", gather: 0, xp: 0, enemy: 0 },
  { id: "harvest", name: "Hea saagipäev", icon: "🌾", desc: "+25% kogumissaaki.", gather: 0.25, xp: 0, enemy: 0 },
  { id: "horde", name: "Mutantide tõus", icon: "🐺", desc: "Vaenlased on 25% tugevamad, kuid annavad +30% XP.", gather: 0, xp: 0.3, enemy: 0.25 },
  { id: "signal", name: "KOIDIKU signaal", icon: "📡", desc: "+20% XP kõigest.", gather: 0, xp: 0.2, enemy: 0 },
  { id: "storm", name: "Kiirgustorm", icon: "⚡", desc: "Vaenlased on nõrgemad (−15%), kuid saak väiksem (−15%).", gather: -0.15, xp: 0, enemy: -0.15 },
  { id: "caravan", name: "Karavanipäev", icon: "🐫", desc: "+15% saaki ja +10% XP.", gather: 0.15, xp: 0.1, enemy: 0 },
];
export const worldEventFor = (s: GameState) => WORLD_EVENTS[(clock(s).day * 5 + 3) % WORLD_EVENTS.length];

// ---------- collections ----------
export const COLLECTIONS: { id: string; name: string; icon: string; items: string[]; reward: Record<string, number> }[] = [
  { id: "c_forage", name: "Metsaanid", icon: "🌿", items: ["wood", "herb", "berries", "meat", "hide"], reward: { cash: 20 } },
  { id: "c_scrap", name: "Rämpsuküti komplekt", icon: "🔩", items: ["scrap", "cloth", "wire", "stone", "can"], reward: { cash: 25 } },
  { id: "c_deep", name: "Sügavuse aarded", icon: "💎", items: ["ore", "crystal", "voidshard"], reward: { cash: 60 } },
  { id: "c_med", name: "Välilaatsaret", icon: "🩹", items: ["bandage", "salve", "antirad"], reward: { cash: 30 } },
].map((c) => ({ ...c, items: c.items.filter((i) => ITEMS[i]) }));
export const collected = (s: GameState, id: string) => (s.seen || []).includes(id);
export function claimCollection(s: GameState, id: string): string | null {
  const c = COLLECTIONS.find((x) => x.id === id); if (!c) return "Tundmatu.";
  if ((s.collDone || []).includes(id)) return "Juba võetud.";
  if (!c.items.every((i) => collected(s, i))) return "Kogu pole veel täis.";
  s.collDone = [...(s.collDone || []), id];
  Object.entries(c.reward).forEach(([k, v]) => add(s, k, v)); gainXp(s, 60);
  log(s, `${c.icon} Kollektsioon «${c.name}» täis! ${costStr(c.reward)}, +60 XP`, "good");
  return null;
}

// ---------- New Game+ ----------
export const enemyScale = (s: GameState) => 1 + (s.ngp || 0) * 0.3 + worldEventFor(s).enemy;
/** Restart the story with stronger enemies, keeping perks, relics, codex, achievements, reputation and collections. */
export function startNewGamePlus(s: GameState): GameState {
  const g = newGame();
  const keep = { perks: s.perks, relics: s.relics, charm: s.charm, codex: s.codex, ach: s.ach, rep: s.rep, rankClaimed: s.rankClaimed, seen: s.seen, collDone: s.collDone, level: s.level, maxHp: s.maxHp, stats: s.stats, kills: s.kills, deaths: s.deaths };
  Object.assign(g, keep, { ngp: (s.ngp || 0) + 1, hp: s.maxHp, tut: true });
  add(g, "cash", 50);
  log(g, `🔁 UUS MÄNG+ (${g.ngp}). Ärkad taas silla all — aga sa mäletad. Vaenlased on ${Math.round((enemyScale(g) - 1) * 100)}% tugevamad.`, "lore");
  return g;
}

// ---------- clan territories (ownership lives on the server; owned ids cached in s.terr) ----------
export const TERRITORIES: { id: string; name: string; icon: string; desc: string; bonus: { gather?: number; xp?: number; dmg?: number; def?: number } }[] = [
  { id: "t_mine", name: "Raudkaevandus", icon: "⛏️", desc: "+10% kogumissaaki kogu klannile.", bonus: { gather: 0.1 } },
  { id: "t_dam", name: "Vana tamm", icon: "💧", desc: "+5% XP kogu klannile.", bonus: { xp: 0.05 } },
  { id: "t_tower", name: "Raadiomast", icon: "📡", desc: "+5% XP ja +5% saaki.", bonus: { xp: 0.05, gather: 0.05 } },
  { id: "t_depot", name: "Relvaladu", icon: "🔫", desc: "+2 kahju kogu klannile.", bonus: { dmg: 2 } },
  { id: "t_crater", name: "Kristallikraater", icon: "💎", desc: "+2 kaitset kogu klannile.", bonus: { def: 2 } },
];
export function territoryBonus(s: GameState) {
  const b = { gather: 0, xp: 0, dmg: 0, def: 0 };
  for (const t of TERRITORIES) if ((s.terr || []).includes(t.id)) { b.gather += t.bonus.gather || 0; b.xp += t.bonus.xp || 0; b.dmg += t.bonus.dmg || 0; b.def += t.bonus.def || 0; }
  return b;
}

// ---------- monthly seasons shared by all players ----------
export const SEASON_GOAL = 50000;
export const SEASON_THEMES = [
  { name: "Tuhatalv", icon: "❄️", desc: "Kõik ellujääjad koos: koguge, võidelge ja uurige, et talv üle elada." },
  { name: "Kristallikevad", icon: "🌱", desc: "Lõhe on rahutu. Iga tegu loeb ühisesse eesmärki." },
  { name: "Põlev suvi", icon: "🔥", desc: "Kuumus ja mutandid. Pidage koos vastu." },
  { name: "Varjude sügis", icon: "🍂", desc: "Ööd pikenevad. Kogukond peab olema valmis." },
];
export const seasonKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
export const seasonTheme = (key: string) => SEASON_THEMES[Math.floor((parseInt(key.slice(5), 10) % 12) / 3)];
const seasonStat = (s: GameState) => s.kills + (s.stats?.gathered || 0) + (s.stats?.explored || 0) + (s.stats?.crafted || 0);
export function ensureSeason(s: GameState, key = seasonKey()) { if (s.sea?.key !== key) s.sea = { key, base: seasonStat(s) }; }
export const seasonContribution = (s: GameState) => Math.max(0, seasonStat(s) - (s.sea?.base ?? seasonStat(s)));
export function claimSeason(s: GameState, communityTotal: number): string | null {
  ensureSeason(s);
  if (communityTotal < SEASON_GOAL) return "Kogukonna eesmärk pole veel täis.";
  if (seasonContribution(s) < 20) return "Panusta enne ise vähemalt 20 tegevusega.";
  if (s.seaClaimed === s.sea!.key) return "Juba võetud.";
  s.seaClaimed = s.sea!.key;
  add(s, "cash", 100); gainXp(s, 200); giveRelic(s, makeRelic(0.35));
  log(s, `${seasonTheme(s.sea!.key).icon} Hooaeg võidetud koos! +100 🪙, +200 XP ja hooaja talisman.`, "good");
  return null;
}
