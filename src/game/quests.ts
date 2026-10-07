// Story quests (40): data-driven chains with item, condition and choice steps.
import { ITEMS, REGIONS } from "./data";
import { add, clock, gainXp, gameLog as log, has, type GameState } from "./engine";
import { giveRelic, makeRelic } from "./progress";
import { addRep } from "./world";

type C = Record<string, number>;
export interface QChoice { label: string; tag: string; rep?: C; items?: C }
export interface QStep { text: string; need?: C; cond?: (s: GameState) => boolean; condText?: string; choice?: QChoice[] }
export interface StoryQuest { id: string; group: string; title: string; req?: (s: GameState) => boolean; reqText?: string; steps: QStep[]; reward: { xp: number; items?: C; relic?: boolean } }

const at = (r: string) => (s: GameState) => s.region === r;
const night = (s: GameState) => clock(s).night;
const disc = (r: string) => (s: GameState) => s.discovered.includes(r);
const npc = (n: string) => (s: GameState) => s.npcs.includes(n);
const chose = (s: GameState, tag: string) => (s.choices || []).includes(`q:${tag}`);
const atR = (r: string, t: string): QStep => ({ text: t, cond: at(r), condText: `Ole piirkonnas: ${REGIONS[r]?.name ?? r}` });
const atNight = (r: string, t: string): QStep => ({ text: t, cond: (s) => at(r)(s) && night(s), condText: `Ole öösel (21–05) piirkonnas: ${REGIONS[r]?.name ?? r}` });

export const QUEST_GROUPS: Record<string, string> = {
  start: "🟢 Algus ja ellujäämine", liis: "🟡 Liisi lugu", tom: "🔵 Väikse Tomi lugu", koidik: "🟣 Arhivaar ja KOIDIK",
  ruins: "🔴 Varemed ja Roostes Kruus", mine: "🟠 Kaevandus", rad: "☢️ Kiirgusala", ind: "🟤 Tööstusala", magic: "🌌 Maagiline tsoon", watcher: "⚫ VAATLEJA",
};

export const STORY_QUESTS: StoryQuest[] = [
  // ---- start
  { id: "s1", group: "start", title: "Esimene tuli", steps: [
    { text: "Laagris on vana, peaaegu kustunud lõkkeplats. Too puitu ja kive, et see uuesti süüdata.", need: { wood: 5, stone: 3 } },
    { text: "Ehita lõke.", cond: (s) => !!s.structures.campfire, condText: "Ehitis: lõke" },
  ], reward: { xp: 50, items: { cash: 10 } } },
  { id: "s2", group: "start", title: "Kes ma olen?", req: (s) => qDone(s, "s1"), steps: [
    { text: "Seljakotist leiad kulunud metallplaadi: «E. TAMM». Otsi vanu dokumente — uuri piirkondi.", cond: (s) => s.codex.length >= 3, condText: "Leia 3 KOIDIKu fragmenti" },
    { text: "Fragmentidest selgub: Dr. Elo Tamm töötas KOIDIKUS. Kas see oled sina — või keegi, keda sa tundsid?" },
  ], reward: { xp: 120, items: { antirad: 1 } } },
  { id: "s3", group: "start", title: "Esimene veri", req: (s) => s.kills >= 1, reqText: "Alista üks vaenlane", steps: [
    { text: "Koletise külge oli kinnitatud vana sõjaväeline märk. Mida sellega teed?", choice: [
      { label: "Viska minema", tag: "badge_drop", items: { scrap: 2 } },
      { label: "Vii Arhivaarile", tag: "badge_arch", rep: { order: 10 } },
      { label: "Vii Pärdile", tag: "badge_part", items: { cash: 20 } },
    ] },
  ], reward: { xp: 60 } },
  { id: "s4", group: "start", title: "Vesi kõrbes", req: (s) => qDone(s, "s1"), steps: [
    { text: "Laagri kaev hakkab kuivama. Vana veepuhastaja peaks olema Kõrbes.", cond: disc("desert"), condText: "Avasta Kõrb" },
    atR("desert", "Kaeva liiva alt veepuhastaja välja."),
    { text: "Puhastaja vajab parandamist.", need: { scrap: 4, cloth: 2 } },
  ], reward: { xp: 120, items: { water: 6 } } },
  { id: "s5", group: "start", title: "Öö tuleb", req: (s) => qDone(s, "s1"), steps: [
    { text: "Pärt hoiatab: «Kui päike kukub, hakkab mets sind vaatama.» Mine öösel metsa.", ...atNight("forest", "") },
    { text: "Ela üle. Alista öösel üks vaenlane.", cond: (s) => s.kills >= (s.qd?.s5 ?? 0) + 1, condText: "1 võit pärast öösse minekut" },
  ], reward: { xp: 150, items: { leather: 1 } } },
  // ---- Liis
  { id: "l1", group: "liis", title: "Haavatud võõras", req: npc("liis"), reqText: "Leia Liis", steps: [
    { text: "Liis on haavatud. Ta vajab sidemeid, ravimtaime ja puhast vett.", need: { bandage: 2, herb: 1, water: 1 } },
  ], reward: { xp: 80, items: { salve: 1 } } },
  { id: "l2", group: "liis", title: "Kadunud ravimikott", req: (s) => qDone(s, "l1"), steps: [
    { text: "Liisi ravimikott jäi Linna vanasse haiglasse, mis on täis ghoule. Kuidas lähed?", choice: [
      { label: "Hiili sisse", tag: "bag_sneak", items: { medkit: 1 } },
      { label: "Võitle", tag: "bag_fight", items: { medkit: 1, scrap: 4 } },
      { label: "Mine öösel", tag: "bag_night", items: { medkit: 2 } },
    ] },
    atR("city", "Leia haigla Linnas."),
  ], reward: { xp: 150 } },
  { id: "l3", group: "liis", title: "Viimane patsient", req: (s) => qDone(s, "l2"), steps: [
    { text: "Haiglas on keegi veel elus — tugevalt kiiritatud.", choice: [
      { label: "Kasuta oma ravimit", tag: "pat_save", items: { antirad: -1 }, rep: { settlers: 15 } },
      { label: "Anna ta Liisile", tag: "pat_liis" },
      { label: "Jäta maha", tag: "pat_leave", items: { cash: 15 }, rep: { settlers: -10 } },
    ] },
  ], reward: { xp: 120 } },
  { id: "l4", group: "liis", title: "Liisi saladus", req: (s) => qDone(s, "l3"), steps: [
    { text: "Liis tunnistab: ta töötas KOIDIKU meditsiiniprogrammis. Leia tema vana ID-kaart Sügavikust.", cond: disc("depths1"), condText: "Jõua Kaevanduse šahti" },
    atR("depths1", "Otsi pimeduses kaarti."),
  ], reward: { xp: 200, items: { medkit: 1 } } },
  { id: "l5", group: "liis", title: "Patsient number 17", req: (s) => qDone(s, "l4"), steps: [
    { text: "Kaardil on märge: «Patsient 17 — immuunne». Kas see oled sina? Liis tahab võtta vereproovi.", choice: [
      { label: "Luba", tag: "p17_yes", rep: { order: 10 }, items: { antirad: 2 } },
      { label: "Keeldu", tag: "p17_no", rep: { wanderers: 10 } },
    ] },
  ], reward: { xp: 250, relic: true } },
  // ---- Tom
  { id: "t1", group: "tom", title: "Kividega poiss", req: npc("kid"), reqText: "Leia Väike Tom", steps: [
    { text: "Tom loobib kive rottide pihta. Õpeta talle paremat moodi — tee talle lingu.", need: { hide: 1, wood: 2 } },
  ], reward: { xp: 80 } },
  { id: "t2", group: "tom", title: "Tom kadunud", req: (s) => qDone(s, "t1"), steps: [
    { text: "Hommikul on Tomi ase tühi. Jäljed viivad Metsa.", ...atR("forest", "") },
    { text: "Ta on kinni koletise pesas. Alista üks vaenlane.", cond: (s) => s.kills >= (s.qd?.t2 ?? 0) + 1, condText: "1 võit" },
  ], reward: { xp: 150, items: { cooked: 2 } } },
  { id: "t3", group: "tom", title: "Vana sõber", req: (s) => qDone(s, "t2"), steps: [
    { text: "Tom leidis koera, kes ei karda teda. Kas võtad ta laagrisse?", choice: [
      { label: "Jah", tag: "dog_yes", items: { meat: -1 } },
      { label: "Ei", tag: "dog_no", items: { cash: 5 } },
    ] },
  ], reward: { xp: 100 } },
  { id: "t4", group: "tom", title: "Tom tahab relva", req: (s) => qDone(s, "t3"), steps: [
    { text: "«Ma tahan ka sõdida!» Mida talle annad?", choice: [
      { label: "Noa", tag: "tom_knife", items: { knife: -1 } },
      { label: "Tööriista", tag: "tom_tool", items: { stonetool: -1 } },
      { label: "Raamatu", tag: "tom_book", rep: { order: 5 } },
    ] },
  ], reward: { xp: 100 } },
  { id: "t5", group: "tom", title: "Meie poiss", req: (s) => qDone(s, "t4") && s.kills >= 30, reqText: "30 võitu kokku", steps: [
    { text: "Tom kaitseb laagrit rüüstajate eest. Aita teda — ehita müür.", cond: (s) => !!s.structures.wall, condText: "Ehitis: müür" },
  ], reward: { xp: 300, relic: true } },
  // ---- Archivist / KOIDIK
  { id: "k1", group: "koidik", title: "Signaal", req: npc("archivist"), reqText: "Leia Arhivaar", steps: [
    { text: "Arhivaar püüab vana raadiosignaali. Too traati, et antenni parandada.", need: { wire: 3 } },
    atR("mountains", "Signaal on tugevaim Mägedes."),
  ], reward: { xp: 150 } },
  { id: "k2", group: "koidik", title: "Varjend 7", req: (s) => qDone(s, "k1"), steps: [
    { text: "Signaal viib maa-alusesse varjendisse nr 7 Tööstusalal.", ...atR("industrial", "") },
    { text: "Uks on kinni roostes. Tee see lahti.", need: { scrap: 5 } },
  ], reward: { xp: 180, items: { core: 1 } } },
  { id: "k3", group: "koidik", title: "Kolm akut", req: (s) => qDone(s, "k2"), steps: [
    { text: "Varjendi terminal vajab kolme energiaakut.", need: { core: 2, wire: 4 } },
  ], reward: { xp: 200 } },
  { id: "k4", group: "koidik", title: "Viimane salvestus", req: (s) => qDone(s, "k3"), steps: [
    { text: "Terminal ärkab: «Kui keegi seda kuuleb — KOIDIK ei olnud energiaprojekt. Me avasime ukse.» Kellele sellest räägid?", choice: [
      { label: "Ordule", tag: "rec_order", rep: { order: 20 } },
      { label: "Asunikele", tag: "rec_settlers", rep: { settlers: 20 } },
      { label: "Hoia saladuseks", tag: "rec_keep", rep: { wanderers: 20 } },
    ] },
  ], reward: { xp: 250 } },
  { id: "k5", group: "koidik", title: "Vaatleja", req: (s) => qDone(s, "k4"), steps: [
    { text: "Salvestusel on taustal keegi, kes ütleb: «Ta vaatab meid.» Leia kõik 14 fragmenti, et mõista.", cond: (s) => s.codex.length >= 10, condText: "Leia 10 KOIDIKu fragmenti" },
  ], reward: { xp: 300, relic: true } },
  // ---- ruins / bar
  { id: "r1", group: "ruins", title: "Roostes Kruusi võlg", req: disc("ruins"), steps: [
    { text: "Pärt: «Keegi Kalju jäi mulle võlgu. Too korgid tagasi — või maksa ise.»", choice: [
      { label: "Maksa ise (20 🪙)", tag: "debt_pay", items: { cash: -20 } },
      { label: "Otsi Kalju Linnast", tag: "debt_hunt" },
    ] },
    atR("city", "Kalju peidab end Linnas."),
  ], reward: { xp: 120, items: { cash: 40 } } },
  { id: "r2", group: "ruins", title: "Kadunud joogid", req: (s) => qDone(s, "r1"), steps: [
    { text: "Baari lastist on kadunud kast «Tuhaviina». Rotid! Too neile pähe 10 liha asemel.", need: { meat: 3 } },
    atR("flooded", "Kast ujus üleujutatud alale."),
  ], reward: { xp: 150, items: { cash: 30 } } },
  { id: "r3", group: "ruins", title: "Baarimängu meister", req: (s) => qDone(s, "r2"), steps: [
    { text: "Täida baaris lepinguid.", cond: (s) => (s.bar?.done?.length || 0) >= 2, condText: "Täida täna 2 baari lepingut" },
  ], reward: { xp: 200, items: { cash: 50 } } },
  { id: "r4", group: "ruins", title: "Pärdi vanasõna", req: (s) => qDone(s, "r3"), steps: [
    { text: "Pärt: «Rott ei karda pimedust. Rott on pimedus.» Ta tahab, et sa tooksid Rotikuninga krooni.", cond: (s) => (s.trophies?.ratking || 0) >= 1, condText: "Alista Rotikuningas" },
  ], reward: { xp: 250, relic: true } },
  // ---- mine
  { id: "m1", group: "mine", title: "Kolmas tunnel", req: disc("mine"), steps: [
    atR("mine", "Kaevanduses on kolmas tunnel, mida kaardil pole."),
    { text: "Tunnel on varisenud. Kaeva läbi.", need: { wood: 6, stone: 4 } },
  ], reward: { xp: 150, items: { ore: 4 } } },
  { id: "m2", group: "mine", title: "Kaevurite kummitus", req: (s) => qDone(s, "m1"), steps: [
    atNight("mine", "Öösel kuuleb tunnelist kirka häält."),
    { text: "Kummitus palub: «Mata mind.» Mida teed?", choice: [
      { label: "Mata ta", tag: "ghost_bury", rep: { settlers: 10 } },
      { label: "Võta ta kirka", tag: "ghost_pick", items: { irontool: 1 } },
    ] },
  ], reward: { xp: 200 } },
  { id: "m3", group: "mine", title: "Elav kristall", req: (s) => qDone(s, "m2"), steps: [
    { text: "Kristall tunnelis tuksub nagu süda. Too sellele toitu.", need: { crystal: 2 } },
    { text: "Kristall laulab. Mida teed?", choice: [
      { label: "Vii Ordule", tag: "cry_order", rep: { order: 15 } },
      { label: "Lõhu", tag: "cry_break", items: { voidshard: 1 } },
    ] },
  ], reward: { xp: 250 } },
  { id: "m4", group: "mine", title: "Sügavik", req: (s) => qDone(s, "m3"), steps: [
    { text: "Laskusid sügavamale kui keegi enne sind.", cond: disc("depths2"), condText: "Jõua Sügavikku" },
    { text: "Alista Raudkrabi.", cond: (s) => (s.trophies?.ironcrab || 0) >= 1, condText: "Raudkrabi trofee" },
  ], reward: { xp: 350, relic: true } },
  // ---- radiation
  { id: "x1", group: "rad", title: "Roheline mees", req: disc("radiation"), steps: [
    atR("radiation", "Kiirgusalal kõnnib roheliselt helendav mees. Ta ei ründa."),
    { text: "Ta palub antiradi.", choice: [
      { label: "Anna", tag: "green_give", items: { antirad: -1 }, rep: { wanderers: 15 } },
      { label: "Keeldu", tag: "green_no" },
    ] },
  ], reward: { xp: 180 } },
  { id: "x2", group: "rad", title: "Mutatsiooni hind", req: (s) => qDone(s, "x1"), steps: [
    { text: "Roheline mees näitab, kuidas kiirgust taluda. Kogu see kogemus — kannata kiirgust.", cond: (s) => s.rad >= 40, condText: "Kiirgus vähemalt 40" },
    { text: "Ja nüüd ravi end.", cond: (s) => s.rad <= 10, condText: "Kiirgus alla 10" },
  ], reward: { xp: 250, items: { antirad: 2 } } },
  { id: "x3", group: "rad", title: "Kiirgusvihm", req: (s) => qDone(s, "x2"), steps: [
    { text: "Tulekul on kiirgusvihm. Kaitse laagrit: varu vett ja ehita varjend.", cond: (s) => !!s.structures.shelter, condText: "Ehitis: varjualune" },
    { text: "Varu.", need: { water: 4, can: 2 } },
  ], reward: { xp: 250, relic: true } },
  // ---- industrial
  { id: "i1", group: "ind", title: "Tehas ärkab", req: disc("industrial"), steps: [
    atR("industrial", "Tööstusalal hakkab üks tehas iseenesest tööle."),
    { text: "Tehas tootis kunagi droone. Kas lülitad välja või käivitad?", choice: [
      { label: "Lülita välja", tag: "fac_off", rep: { settlers: 15 } },
      { label: "Käivita enda jaoks", tag: "fac_on", items: { scrap: 10, wire: 4 } },
    ] },
  ], reward: { xp: 200 } },
  { id: "i2", group: "ind", title: "Valvurdroon", req: (s) => qDone(s, "i1"), steps: [
    { text: "Valvurdroon jälgib sind. Alista droone, et ligi pääseda.", cond: (s) => s.kills >= (s.qd?.i2 ?? 0) + 3, condText: "3 võitu" },
    { text: "Paranda droon endale.", need: { wire: 4, core: 1 } },
  ], reward: { xp: 300, relic: true } },
  // ---- magic
  { id: "g1", group: "magic", title: "Teisel pool", req: disc("magic"), steps: [
    atR("magic", "Lõhe lähedal näed endast teist versiooni."),
    { text: "Ta ulatab käe.", choice: [
      { label: "Võta käest kinni", tag: "other_take", items: { rune: 2 } },
      { label: "Astu tagasi", tag: "other_back", rep: { order: 10 } },
    ] },
  ], reward: { xp: 250 } },
  { id: "g2", group: "magic", title: "Hääl", req: (s) => qDone(s, "g1"), steps: [
    atNight("magic", "Öösiti kuuleb Lõhest häält, mis teab su nime."),
  ], reward: { xp: 250, items: { crystal: 2 } } },
  { id: "g3", group: "magic", title: "Kolm võtit", req: (s) => qDone(s, "g2"), steps: [
    { text: "Hääl räägib kolmest võtmest: rauast, kristallist ja ruunist.", need: { ore: 5, crystal: 3, rune: 3 } },
  ], reward: { xp: 400, items: { voidshard: 1 }, relic: true } },
  // ---- watcher
  { id: "w1", group: "watcher", title: "Vaatleja jälg", req: (s) => qDone(s, "k5"), reqText: "Lõpeta «Vaatleja»", steps: [
    { text: "Igal pool, kus käinud oled, on keegi juba enne olnud. Rända.", cond: (s) => s.discovered.length >= 10, condText: "Avasta 10 piirkonda" },
  ], reward: { xp: 300 } },
  { id: "w2", group: "watcher", title: "Mees ilma näota", req: (s) => qDone(s, "w1"), steps: [
    atNight("depths3", "Lõhe äärel ootab mees ilma näota."),
    { text: "«Ma olen see, kes sa olid enne.» Mida teed?", choice: [
      { label: "Kuula teda", tag: "face_listen", rep: { order: 20 } },
      { label: "Ründa", tag: "face_attack", rep: { wanderers: 20 } },
    ] },
  ], reward: { xp: 400 } },
  { id: "w3", group: "watcher", title: "Esimene elu", req: (s) => qDone(s, "w2"), steps: [
    { text: "Sa oled juba korra surnud — ja tagasi tulnud.", cond: (s) => s.deaths >= 1, condText: "Sure vähemalt korra" },
  ], reward: { xp: 300, items: { medkit: 2 } } },
  { id: "w4", group: "watcher", title: "Teine Lõhe", req: (s) => qDone(s, "w3"), steps: [
    { text: "Lõhesid on rohkem kui üks. Sulge see, mis on siin.", cond: (s) => s.sealed, condText: "Sulge Lõhe" },
  ], reward: { xp: 800, relic: true } },
];

export const qStep = (s: GameState, id: string) => s.qs?.[id] || 0;
export const qDone = (s: GameState, id: string) => { const q = STORY_QUESTS.find((x) => x.id === id); return !!q && qStep(s, id) >= q.steps.length; };
export const qOpen = (s: GameState, q: StoryQuest) => !q.req || q.req(s);
export const qChose = chose;
const costStr = (c: C) => Object.entries(c).map(([k, v]) => `${ITEMS[k]?.icon ?? k}${v}`).join(" ");
export { costStr as qCost };

/** Advance one step. Returns error text or null. */
export function advanceQuest(s: GameState, id: string, pick?: number): string | null {
  const q = STORY_QUESTS.find((x) => x.id === id); if (!q) return "Tundmatu ülesanne.";
  if (!qOpen(s, q)) return q.reqText || "Pole veel avatud.";
  const i = qStep(s, id); const st = q.steps[i]; if (!st) return "Juba tehtud.";
  if (st.need && !has(s, st.need)) return `Vaja: ${costStr(st.need)}`;
  if (st.cond && !st.cond(s)) return st.condText || "Tingimus pole täidetud.";
  let ch: QChoice | undefined;
  if (st.choice) {
    ch = st.choice[pick ?? -1]; if (!ch) return "Tee valik.";
    const cost = Object.fromEntries(Object.entries(ch.items || {}).filter(([, v]) => v < 0).map(([k, v]) => [k, -v]));
    if (!has(s, cost)) return `Vaja: ${costStr(cost)}`;
  }
  if (st.need) Object.entries(st.need).forEach(([k, v]) => add(s, k, -v));
  if (ch) { Object.entries(ch.items || {}).forEach(([k, v]) => add(s, k, v)); Object.entries(ch.rep || {}).forEach(([f, n]) => addRep(s, f, n)); s.choices = [...(s.choices || []), `q:${ch.tag}`]; }
  s.qs = { ...(s.qs || {}), [id]: i + 1 };
  s.qd = { ...(s.qd || {}), [id]: s.kills }; // kill baseline for "win after this step" goals
  if (i + 1 >= q.steps.length) {
    gainXp(s, q.reward.xp); Object.entries(q.reward.items || {}).forEach(([k, v]) => add(s, k, v));
    if (q.reward.relic) giveRelic(s, makeRelic(0.2));
    log(s, `📗 Ülesanne «${q.title}» täidetud! +${q.reward.xp} XP`, "good");
  }
  return null;
}
