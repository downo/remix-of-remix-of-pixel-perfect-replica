// Faction depth: relations between factions, contracts, rank perks, secrets, exclusive gear and a daily reputation event.
import { ITEMS } from "./data";
import { add, clock, gainXp, gameLog as log, has, type GameState } from "./engine";
import { FACTIONS, addRep, repOf } from "./world";

type C = Record<string, number>;
const costStr = (c: C) => Object.entries(c).map(([k, v]) => `${ITEMS[k]?.icon ?? k}${v}`).join(" ");
const pairKey = (a: string, b: string) => [a, b].sort().join("|");

// ---------- relations: -2 war · -1 tense · 0 neutral · 1 friendly · 2 allied ----------
export const BASE_REL: Record<string, number> = { [pairKey("settlers", "wanderers")]: 1, [pairKey("settlers", "order")]: -2, [pairKey("wanderers", "order")]: -1 };
export const relOf = (s: GameState, a: string, b: string) => s.facRel?.[pairKey(a, b)] ?? BASE_REL[pairKey(a, b)] ?? 0;
export const REL_LABEL: Record<number, string> = { [-2]: "⚔️ sõjas", [-1]: "⚠️ pinges", 0: "· neutraalne", 1: "🤝 sõbralik", 2: "🤝 liidus" };
export function shiftRel(s: GameState, a: string, b: string, d: number) {
  const k = pairKey(a, b); const v = Math.max(-2, Math.min(2, relOf(s, a, b) + d));
  if (v === relOf(s, a, b)) return;
  s.facRel = { ...(s.facRel || {}), [k]: v };
  const n = (id: string) => FACTIONS.find((f) => f.id === id)?.name;
  log(s, `🌐 ${n(a)} ja ${n(b)} on nüüd ${REL_LABEL[v].replace(/^\S+ /, "")}.`, "lore");
}
/** Reputation with ripple: allies of f gain a little, its enemies lose some. */
export function repAction(s: GameState, f: string, n: number) {
  addRep(s, f, n);
  for (const o of FACTIONS) {
    if (o.id === f) continue;
    const r = relOf(s, f, o.id);
    if (r >= 1 && n > 0) addRep(s, o.id, Math.round(n * 0.2 * r));
    if (r <= -1 && n > 0) addRep(s, o.id, -Math.round(n * 0.2 * -r));
  }
}

// ---------- rank perks (each faction a different play style) ----------
export interface FacPerk { at: number; text: string; b: { dmg?: number; def?: number; gather?: number; xp?: number; heal?: number } }
export const FAC_PERKS: Record<string, FacPerk[]> = {
  settlers: [
    { at: 250, text: "+1 kaitse", b: { def: 1 } },
    { at: 500, text: "+3 kaitse, +4 HP pärast võitu — Asunikud aitavad sind", b: { def: 3, heal: 4 } },
    { at: 1000, text: "+5 kaitse, +6 HP pärast võitu", b: { def: 5, heal: 6 } },
  ],
  wanderers: [
    { at: 250, text: "+5% saaki", b: { gather: 0.05 } },
    { at: 500, text: "+10% saaki, +5% XP", b: { gather: 0.1, xp: 0.05 } },
    { at: 1000, text: "+15% saaki, +10% XP", b: { gather: 0.15, xp: 0.1 } },
  ],
  order: [
    { at: 250, text: "+1 kahju", b: { dmg: 1 } },
    { at: 500, text: "+3 kahju, aga −1 kaitse", b: { dmg: 3, def: -1 } },
    { at: 1000, text: "+5 kahju, aga −2 kaitse", b: { dmg: 5, def: -2 } },
  ],
};
export const STYLE: Record<string, string> = { settlers: "Ehitus ja kaitse", wanderers: "Liikumine ja kaup", order: "Maagia ja risk" };
/** Highest unlocked perk per faction, summed. Used in progress.bonus(). */
export function factionBonus(s: GameState) {
  const t = { dmg: 0, def: 0, gather: 0, xp: 0, heal: 0 };
  for (const [f, list] of Object.entries(FAC_PERKS)) {
    const p = [...list].reverse().find((x) => repOf(s, f) >= x.at); if (!p) continue;
    for (const [k, v] of Object.entries(p.b)) t[k as keyof typeof t] += v;
  }
  return t;
}

// ---------- exclusive gear (bought at Austatud) ----------
export const FAC_GEAR: Record<string, { item: string; at: number; cost: C }> = {
  settlers: { item: "bastion", at: 1000, cost: { cash: 400, ore: 10, stone: 20 } },
  wanderers: { item: "caravanboots", at: 1000, cost: { cash: 350, hide: 10, cloth: 10 } },
  order: { item: "dawnblade", at: 1000, cost: { cash: 450, crystal: 6, voidshard: 1 } },
};
export function buyFacGear(s: GameState, f: string): string | null {
  const g = FAC_GEAR[f]; if (!g) return "Tundmatu.";
  if (repOf(s, f) < g.at) return `Vaja ${g.at} mainet.`;
  if (!has(s, g.cost)) return `Vaja: ${costStr(g.cost)}`;
  Object.entries(g.cost).forEach(([k, v]) => add(s, k, -v)); add(s, g.item, 1);
  log(s, `${ITEMS[g.item].icon} Said fraktsiooni eriseme: ${ITEMS[g.item].name}!`, "good");
  return null;
}

// ---------- contracts (open at Tuttav, one per faction per day) ----------
export interface Contract { id: string; name: string; need: C; relics?: number; rep: number; reward: C }
export const CONTRACT_AT = 100;
export const CONTRACTS: Record<string, Contract[]> = {
  settlers: [
    { id: "c_s1", name: "🪵 Too ehitusmaterjali müüri jaoks", need: { wood: 12, stone: 8 }, rep: 50, reward: { cash: 100 } },
    { id: "c_s2", name: "🩹 Varusta Asunike haigla", need: { cloth: 6, herb: 6 }, rep: 60, reward: { cash: 60, bandage: 2 } },
    { id: "c_s3", name: "⚙️ Paranda vana pump", need: { scrap: 10, wire: 4 }, rep: 70, reward: { cash: 80, water: 3 } },
  ],
  wanderers: [
    { id: "c_w1", name: "🐪 Leia kadunud kaupmees ja vii talle varusid", need: { can: 3, water: 3 }, rep: 75, reward: { cash: 70 } },
    { id: "c_w2", name: "🧵 Kangad karavanile", need: { cloth: 8, hide: 4 }, rep: 60, reward: { cash: 90 } },
    { id: "c_w3", name: "🔌 Traat ja romu turule", need: { wire: 6, scrap: 8 }, rep: 70, reward: { cash: 110 } },
  ],
  order: [
    { id: "c_o1", name: "🌑 Too 3 varjatud reliikviat (talismani)", need: {}, relics: 3, rep: 100, reward: { crystal: 2 } },
    { id: "c_o2", name: "💎 Kristallid uurimiseks", need: { crystal: 3, ore: 4 }, rep: 80, reward: { cash: 90, antirad: 1 } },
    { id: "c_o3", name: "📜 Ruunid Lõhe servalt", need: { rune: 2, crystal: 1 }, rep: 90, reward: { cash: 120 } },
  ],
};
export const contractFor = (s: GameState, f: string) => { const l = CONTRACTS[f]; return l[clock(s).day % l.length]; };
export const contractDoneToday = (s: GameState, f: string) => s.facDone?.[f] === clock(s).day;
export function doContract(s: GameState, f: string): string | null {
  if (repOf(s, f) < CONTRACT_AT) return `Lepingud avanevad ${CONTRACT_AT} mainega.`;
  if (contractDoneToday(s, f)) return "Tänane leping on tehtud. Uus tuleb homme.";
  const c = contractFor(s, f);
  const spare = (s.relics || []).filter((r) => r.uid !== s.charm);
  if (c.relics && spare.length < c.relics) return `Vaja ${c.relics} talismani (kantav ei lähe arvesse).`;
  if (!has(s, c.need)) return `Vaja: ${costStr(c.need)}`;
  Object.entries(c.need).forEach(([k, v]) => add(s, k, -v));
  if (c.relics) { const gone = new Set(spare.slice(0, c.relics).map((r) => r.uid)); s.relics = s.relics.filter((r) => !gone.has(r.uid)); }
  Object.entries(c.reward).forEach(([k, v]) => add(s, k, v));
  s.facDone = { ...(s.facDone || {}), [f]: clock(s).day };
  repAction(s, f, c.rep); gainXp(s, 40);
  log(s, `📜 Leping täidetud: ${c.name} (+${c.rep} mainet).`, "good");
  return null;
}

// ---------- history + secrets ----------
export const FAC_LORE: Record<string, { history: string; secret: string }> = {
  settlers: {
    history: "Asunikud olid enne Lõhet tavalised linnaelanikud. Nad jäid paigale, kui teised põgenesid, ja ehitasid vanade majade varemetest esimese müüri.",
    secret: "Asunike müüri all on vana varjend, kus peidavad end need, kes on Lõhest puudutatud. Asunikud ei kaitse ainult ennast — nad varjavad omasid Ordu eest.",
  },
  wanderers: {
    history: "Rändurid ei usu müüridesse. Nende karavanid ühendavad varemeid, kõrbe ja vett ning nende sõnal on suurem hind kui kullal.",
    secret: "Rändurite karavanid ei käi juhuslikult. Nad kannavad tükkhaaval kokku vana KOIDIKU masinat — et Lõhe ühel päeval ise sulgeda, ilma Orduta.",
  },
  order: {
    history: "Koidiku Ordu tekkis KOIDIKU uurimisjaama ellujäänutest. Nemad avasid Lõhe esimesena ja väidavad, et ainult nemad oskavad seda mõista.",
    secret: "Ordu ei taha Lõhet uurida. Nad tahavad seda laiendada — nende juhid usuvad, et Lõhe taga ootab uus maailm ainult valitutele.",
  },
};
export const SECRET_AT = 500;

// ---------- daily reputation event ----------
export interface FacChoice { label: string; rep: C; rel?: [string, string, number]; items?: C }
export interface FacEvent { id: string; title: string; text: string; choices: FacChoice[] }
export const FAC_EVENTS: FacEvent[] = [
  { id: "caravan", title: "⚔️ Rändurite karavan sattus rünnaku alla", text: "Ordu salk ründab karavani teel. Kaupmehed hüüavad appi.", choices: [
    { label: "Aita Rändureid", rep: { wanderers: 40, order: -20 }, rel: ["wanderers", "order", -1] },
    { label: "Ära sekku", rep: {} },
    { label: "Ründa karavani", rep: { wanderers: -100, order: 30 }, items: { scrap: 4, cloth: 3 } },
  ] },
  { id: "wall", title: "🧱 Asunike müür variseb", text: "Torm lõhkus müüri. Rändurid pakuvad materjali, aga tahavad selle eest kaubaõigust.", choices: [
    { label: "Aita ise ehitada", rep: { settlers: 40 }, items: { wood: -4 } },
    { label: "Vii Rändurid kokku Asunikega", rep: { settlers: 20, wanderers: 20 }, rel: ["settlers", "wanderers", 1] },
    { label: "Varasta materjali", rep: { settlers: -60 }, items: { wood: 6, stone: 4 } },
  ] },
  { id: "relic", title: "🔺 Ordu leidis Lõhe kivi", text: "Ordu tahab, et viiksid kivi oma laborisse. Asunikud anuvad, et selle hävitaksid.", choices: [
    { label: "Vii Ordule", rep: { order: 40, settlers: -20 }, rel: ["settlers", "order", -1] },
    { label: "Hävita kivi", rep: { settlers: 35, order: -40 } },
    { label: "Müü Ränduritele", rep: { wanderers: 25, order: -20 }, items: { cash: 40 } },
  ] },
  { id: "refugees", title: "🏚️ Põgenikud teel", text: "Pere otsib varju. Asunikud ei taha suuremat suud, Rändurid võtaksid nad kaasa.", choices: [
    { label: "Vii Asunike juurde", rep: { settlers: 30 }, items: { can: -1 } },
    { label: "Saada karavaniga", rep: { wanderers: 30 } },
    { label: "Anna nad Ordule katseteks", rep: { order: 40, settlers: -40, wanderers: -30 } },
  ] },
  { id: "peace", title: "🕊️ Rahuläbirääkimised", text: "Ordu ja Asunikud on nõus kohtuma — kui keegi neutraalne vahendab.", choices: [
    { label: "Vahenda rahu", rep: { settlers: 20, order: 20 }, rel: ["settlers", "order", 1] },
    { label: "Õhuta tüli", rep: { wanderers: 30 }, rel: ["settlers", "order", -1] },
    { label: "Ära mine", rep: {} },
  ] },
];
export const facEventFor = (s: GameState) => FAC_EVENTS[clock(s).day % FAC_EVENTS.length];
export const facEventOpen = (s: GameState) => s.facEvent !== clock(s).day;
export function resolveFacEvent(s: GameState, i: number): string | null {
  if (!facEventOpen(s)) return "Tänane sündmus on läbi. Uus tuleb homme.";
  const e = facEventFor(s); const c = e.choices[i]; if (!c) return "Tundmatu valik.";
  const cost = Object.fromEntries(Object.entries(c.items || {}).filter(([, v]) => v < 0).map(([k, v]) => [k, -v]));
  if (!has(s, cost)) return `Vaja: ${costStr(cost)}`;
  Object.entries(c.items || {}).forEach(([k, v]) => add(s, k, v));
  Object.entries(c.rep).forEach(([f, n]) => addRep(s, f, n));
  if (c.rel) shiftRel(s, c.rel[0], c.rel[1], c.rel[2]);
  s.facEvent = clock(s).day;
  log(s, `${e.title}: ${c.label}.`, "lore");
  return null;
}
