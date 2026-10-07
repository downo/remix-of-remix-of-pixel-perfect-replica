import { ITEMS, REGIONS } from "./data";
import { clock, dailyFor, dailyProgress, QUESTS, seasonFor, weatherFor, weeklyContribution, weeklyFor, type GameState } from "./engine";
import {
  AFFIX, BRANCHES, EXPEDITIONS, EXP_ENERGY, EXP_WEEK_GOAL, PERKS, RARITY, bonus, claimExpWeek, expAdvance, expAvailable, expRetreat, expWeekCount,
  hasPerk, learnPerk, perkBlocked, perkPoints, relicName, scrapRelic, startExpedition, wearRelic, type AffixKey, type Relic,
} from "./progress";
import { PARDI_JUTUD } from "./tekstid";
import { WorldEventLine } from "./WorldTab";
import { PathPanel } from "./LoreTabs";

type Mut = (fn: (g: GameState) => string | null | void) => void;
function H({ children }: { children: React.ReactNode }) { return <h2 className="px-title mb-2 mt-1 text-primary">&gt; {children}</h2>; }
const affixText = (r: Relic) => Object.entries(r.affixes).map(([k, v]) => AFFIX[k as AffixKey].label(v!)).join(" · ");

const NPC_LINES = [
  ["👩‍🔧 Liis", ["Sidemed hakkavad otsa saama. Too riiet.", "Vanametall on alati teretulnud.", "Keldrites on veel tööriistu, olen kindel."]],
  ["📚 Arhivaar", ["Leidsin uue KOIDIKU signaali. Uuri piirkondi.", "Šahti sügavuses on midagi, mis kumab.", "Lõhe serv laulab öösiti. Ära mine üksi."]],
] as const;

export function TodayTab({ s, mut, go }: { s: GameState; mut: Mut; go: (tab: "exp" | "skills" | "quests" | "world") => void }) {
  const c = clock(s); const w = weatherFor(s); const se = seasonFor(s);
  const pick = <T,>(arr: readonly T[], k: number) => arr[(c.day * 7 + k) % arr.length];
  const nextQuest = QUESTS.find((q) => !q.done(s));
  const wk = weeklyFor(s.wk.week || "x-W01");
  const expN = expWeekCount(s); const pts = perkPoints(s);
  const goals: { done: boolean; text: string }[] = [
    ...dailyFor(s.daily.day).map((q) => ({ done: dailyProgress(s, q) >= q.n, text: `${q.icon} ${q.name} (${Math.min(q.n, dailyProgress(s, q))}/${q.n})` })),
    ...(nextQuest ? [{ done: false, text: `📖 Lugu: ${nextQuest.name} — ${nextQuest.desc}` }] : []),
    ...(pts ? [{ done: false, text: `⭐ Sul on ${pts} oskuspunkt${pts > 1 ? "i" : ""} — õpi uus oskus` }] : []),
  ];
  return (
    <div>
      <H>TUHK — täna (päev {c.day}, {c.label})</H>
      <p className="mb-3 text-muted-foreground">{w.icon} {w.name} · {se.icon} {se.name} {c.night ? "· 🌙 öö" : ""}</p>
      <WorldEventLine s={s} />
      <PathPanel s={s} mut={mut} />
      <ul className="mb-3 space-y-1">
        <li className="border-2 p-2"><span className="text-accent">🧔 Pärt:</span> «{pick(PARDI_JUTUD, 0)}»</li>
        {NPC_LINES.map(([who, lines], i) => <li key={who} className="border-2 p-2"><span className="text-accent">{who}:</span> «{pick(lines, i + 1)}»</li>)}
      </ul>
      <H>Sinu eesmärgid</H>
      <ul className="mb-3 space-y-1">
        {goals.map((g, i) => <li key={i} className={`border-2 p-2 ${g.done ? "text-muted-foreground" : ""}`}><span className={g.done ? "text-primary" : "text-accent"}>{g.done ? "[✓]" : "[ ]"}</span> {g.text}</li>)}
      </ul>
      <div className="mb-2 border-2 p-2">🧭 Nädala retked: <span className="text-accent">{Math.min(expN, EXP_WEEK_GOAL)} / {EXP_WEEK_GOAL}</span> ekspeditsiooni</div>
      <div className="mb-3 border-2 p-2">🌍 Kogukonna väljakutse: {wk.icon} {wk.name} — sinu panus {weeklyContribution(s)} / ühine eesmärk {wk.goal}</div>
      <div className="flex flex-wrap gap-2">
        <button className="px-btn px-btn-primary" onClick={() => go("exp")}>🧭 Ekspeditsioonid</button>
        <button className="px-btn" onClick={() => go("skills")}>⭐ Oskused ja talismanid</button>
        <button className="px-btn" onClick={() => go("world")}>🌍 Maailm ja fraktsioonid</button>
        <button className="px-btn" onClick={() => go("quests")}>📖 Kõik ülesanded</button>
      </div>
    </div>
  );
}

export function ExpTab({ s, mut }: { s: GameState; mut: Mut }) {
  const run = s.exp; const x = run && EXPEDITIONS.find((e) => e.id === run.id);
  const n = expWeekCount(s);
  if (run && x) return (
    <div>
      <H>{x.icon} {x.name} — etapp {run.stage}/{x.stages}</H>
      <div className="px-bar my-2 text-primary"><span style={{ width: `${(run.stage / x.stages) * 100}%` }} /></div>
      <p className="mb-2 text-muted-foreground">❤️ {s.hp}/{s.maxHp} · ⚡ {Math.round(s.energy)} · ☢️ {Math.round(s.rad)}. Mida sügavamale, seda suurem saak — ja oht. Kui HP otsa saab, kaotad kogu retke saagi.</p>
      <p className="mb-2">Kaasas: {Object.entries(run.loot).map(([k, v]) => `${ITEMS[k]?.icon ?? ""}×${v}`).join(" ") || "—"}</p>
      <ul className="mb-3 max-h-60 space-y-1 overflow-auto text-base">{[...run.log].reverse().map((l, i) => <li key={i} className="border-l-2 pl-2">{l}</li>)}</ul>
      <div className="flex flex-wrap gap-2">
        <button className="px-btn px-btn-primary" onClick={() => mut(expAdvance)}>⬇️ Mine edasi (−{EXP_ENERGY} ⚡)</button>
        <button className="px-btn" onClick={() => mut(expRetreat)}>↩️ Pööra tagasi ja võta saak</button>
      </div>
    </div>
  );
  return (
    <div>
      <H>Ekspeditsioonid</H>
      <p className="mb-2 text-muted-foreground">Mitmeetapilised retked. Iga etapp kulutab {EXP_ENERGY} energiat. Võid igal hetkel tagasi pöörata ja saagi alles hoida. Retke lõpus ootab alati haruldane leid.</p>
      <div className="mb-3 flex flex-wrap items-center gap-2 border-2 p-2">
        <span className="flex-1">🗓️ Nädala eesmärk: {Math.min(n, EXP_WEEK_GOAL)}/{EXP_WEEK_GOAL} retke · tasu 40 🪙, 150 XP ja eriline leid</span>
        {s.expWeek?.claimed && n >= EXP_WEEK_GOAL ? <span className="text-primary">[✓]</span> : <button disabled={n < EXP_WEEK_GOAL} className="px-btn px-btn-primary" onClick={() => mut(claimExpWeek)}>Võta tasu</button>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {EXPEDITIONS.map((e) => { const ok = expAvailable(s, e); return (
          <div key={e.id} className={`border-2 p-2 ${ok ? "" : "opacity-50"}`}>
            <div className="flex justify-between"><span>{e.icon} {e.name}</span><span className="text-accent">{"☠".repeat(Math.ceil(e.danger))}</span></div>
            <div className="text-base text-muted-foreground">{e.desc} {e.stages} etappi · {REGIONS[e.region].icon} {REGIONS[e.region].name}</div>
            <div className="text-base">Saak: {e.loot.map(([k]) => ITEMS[k]?.icon ?? "").join(" ")}</div>
            <button disabled={!ok} className="px-btn mt-1" onClick={() => mut((g) => startExpedition(g, e.id))}>{ok ? "Alusta" : "Avasta piirkond enne"}</button>
          </div>); })}
      </div>
    </div>
  );
}

export function PerkAndRelics({ s, mut }: { s: GameState; mut: Mut }) {
  const b = bonus(s);
  return (
    <div>
      <H>Oskuspuu — vabu punkte: {perkPoints(s)}</H>
      <p className="mb-2 text-base text-muted-foreground">Iga tasemetõus annab ühe punkti. Vali, milline ellujääja sinust saab.</p>
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        {BRANCHES.map((br) => (
          <div key={br.id} className="border-2 p-2">
            <div className="mb-1 text-accent">{br.icon} {br.name}</div>
            {PERKS.filter((p) => p.branch === br.id).map((p) => { const got = hasPerk(s, p.id); const why = perkBlocked(s, p); return (
              <div key={p.id} className={`mb-1 border-l-2 pl-2 ${got ? "border-primary" : ""}`}>
                <div>{p.icon} {p.name} {got && <span className="text-primary">[✓]</span>}</div>
                <div className="text-base text-muted-foreground">{p.desc} (tase {p.minLevel})</div>
                {!got && <button disabled={!!why} title={why ?? ""} className="px-btn mt-1" onClick={() => mut((g) => learnPerk(g, p.id))}>Õpi</button>}
              </div>); })}
          </div>
        ))}
      </div>
      <H>Talismanid ({(s.relics || []).length})</H>
      <p className="mb-2 text-base text-muted-foreground">Haruldased leiud vaenlastelt, uurimisel ja retkedelt. Kanna korraga ühte. Praegused boonused: +{b.dmg} kahju, +{b.def} kaitset, +{Math.round(b.gather * 100)}% saaki, +{Math.round(b.xp * 100)}% XP{b.heal ? `, +${b.heal} HP võidust` : ""}.</p>
      {(s.relics || []).length === 0 && <p className="text-muted-foreground">Veel pole ühtegi. Minibossid ja retkede lõpud annavad neid kõige kindlamalt.</p>}
      <ul className="space-y-1">
        {(s.relics || []).map((r) => { const worn = s.charm === r.uid; return (
          <li key={r.uid} className={`flex flex-wrap items-center gap-2 px-row ${worn ? "border-primary" : ""}`}>
            <span className="flex-1"><span className={RARITY[r.rarity].color}>{RARITY[r.rarity].name}</span> {relicName(r)} <span className="text-base text-muted-foreground">· {affixText(r)}</span></span>
            <button className="px-btn" onClick={() => mut((g) => wearRelic(g, worn ? null : r.uid))}>{worn ? "Võta ära" : "Kanna"}</button>
            <button className="px-btn" onClick={() => mut((g) => scrapRelic(g, r.uid))}>Müü</button>
          </li>); })}
      </ul>
    </div>
  );
}
