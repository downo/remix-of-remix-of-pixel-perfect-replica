// "Tuhkade tee" 30-day path, secrets found by exploring under the right conditions, and the knowledge journal.
import { ITEMS, REGIONS } from "./data";
import { add, clock, gainXp, gameLog as log, weatherFor, type GameState } from "./engine";
import { giveRelic, makeRelic } from "./progress";

// ---------- 30-day path (one step per real calendar day you play) ----------
export const PATH_LEN = 30;
export const pathReward = (n: number): { items: Record<string, number>; relic?: boolean; title?: string } => {
  if (n === 30) return { items: { cash: 300 }, relic: true, title: "🔥 Tuhastaja" };
  if (n % 7 === 0) return { items: { cash: 60, antirad: 1 }, relic: true };
  if (n % 5 === 0) return { items: { cash: 30, bandage: 2 } };
  return { items: { cash: 10 + n, can: 1 } };
};
export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);
export const pathCanClaim = (s: GameState) => (s.path?.n || 0) < PATH_LEN && s.path?.last !== todayKey();
export function claimPath(s: GameState): string | null {
  if (!pathCanClaim(s)) return (s.path?.n || 0) >= PATH_LEN ? "Tee on läbitud." : "Tänane samm on juba tehtud. Tule homme tagasi.";
  const n = (s.path?.n || 0) + 1; s.path = { n, last: todayKey() };
  const r = pathReward(n);
  Object.entries(r.items).forEach(([k, v]) => add(s, k, v)); gainXp(s, 20 + n * 3);
  if (r.relic) giveRelic(s, makeRelic(n >= 30 ? 0.4 : 0.15));
  log(s, `🔥 Tuhkade tee — päev ${n}/${PATH_LEN}${r.title ? `. Said tiitli ${r.title}!` : ""}`, "good");
  return null;
};

// ---------- secrets ----------
export interface Secret { id: string; region: string; name: string; hint: string; cond: (s: GameState) => boolean; condText: string; reward: Record<string, number>; text: string }
export const SECRETS: Secret[] = ([
  { id: "sec_bunker", region: "ruins", name: "Peidetud punker", hint: "Vanad varemed peidavad midagi, mida näeb ainult udus.", cond: (s: GameState) => weatherFor(s).id === "fog", condText: "uuri udus", reward: { can: 3, antirad: 1, cash: 30 }, text: "Udu varjus märkad roostes luuki. All on kuivad konservid ja KOIDIKu logo." },
  { id: "sec_altar", region: "forest", name: "Kuuvalguse altar", hint: "Metsas on koht, mis helendab ainult öösel.", cond: (s: GameState) => clock(s).night, condText: "uuri öösel", reward: { herb: 6, salve: 2 }, text: "Kuuvalgel helendab sammaldunud kivialtar. Selle ümber kasvavad imelised taimed." },
  { id: "sec_cache", region: "mine", name: "Kaevurite varamu", hint: "Kaevurid peitsid oma palga sinna, kuhu tööriistata ei ulatu.", cond: (s: GameState) => !!s.equip.tool, condText: "uuri tööriistaga", reward: { ore: 6, crystal: 2 }, text: "Kirkaga murrad lahti vale seina. Taga on kaevurite unustatud varamu." },
  { id: "sec_radio", region: "city", name: "Viimane raadiosaade", hint: "Linnas räägib keegi endiselt — aga ainult siis, kui sa tead KOIDIKust piisavalt.", cond: (s: GameState) => (s.codex?.length || 0) >= 3, condText: "uuri, kui tead vähemalt 3 Koidiku fragmenti", reward: { wire: 6, cash: 50 }, text: "Mahajäetud stuudios mängib lindistus: «...Lõhe ei olnud õnnetus...»" },
  { id: "sec_glass", region: "desert", name: "Klaasiks sulanud linn", hint: "Kõrbes, kui kristallituul puhub, paistab liiva alt midagi.", cond: (s: GameState) => weatherFor(s).id === "crystal", condText: "uuri kristallituulega", reward: { crystal: 4, cash: 40 }, text: "Tuul puhub liiva minema ja paljastab klaasiks sulanud tänavad." },
  { id: "sec_tom", region: "flooded", name: "Tomi vana kodu", hint: "Väike Tom mäletab maja vee ääres.", cond: (s: GameState) => s.npcs.includes("kid"), condText: "uuri koos Väikese Tomiga", reward: { fish: 4, cloth: 4 }, text: "Tom näitab sulle oma vana kodu. Pööningul on tema isa päevik." },
  { id: "sec_echo", region: "magic", name: "Lõhe kaja", hint: "Lõhe lähedal kuuled oma häält — kuid ainult siis, kui oled juba korra surnud.", cond: (s: GameState) => s.deaths >= 1, condText: "uuri pärast esimest surma", reward: { voidshard: 1, cash: 80 }, text: "Kuuled oma häält Lõhest: «Sa oled siin olnud. Mitu korda.»" },
] as Secret[]).filter((x) => REGIONS[x.region]);

/** Called on every explore: maybe reveal a hint, and find the secret when its condition holds. */
export function exploreSecrets(s: GameState): boolean {
  const sec = SECRETS.find((x) => x.region === s.region && !(s.secrets || []).includes(x.id));
  if (!sec) return false;
  if (sec.cond(s)) {
    s.secrets = [...(s.secrets || []), sec.id];
    Object.entries(sec.reward).forEach(([k, v]) => { if (ITEMS[k]) add(s, k, v); });
    gainXp(s, 60);
    log(s, `🗝️ SALADUS: ${sec.name}! ${sec.text}`, "lore");
    return true;
  }
  if (!(s.hints || []).includes(sec.id) && Math.random() < 0.35) {
    s.hints = [...(s.hints || []), sec.id];
    log(s, `💭 Vihje: ${sec.hint} (Vaata: 📜 Päevik → Teadmised)`, "lore");
  }
  return false;
}
