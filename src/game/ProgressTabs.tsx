import { ITEMS, REGIONS } from "./data";
import { clock, dailyFor, dailyProgress, QUESTS, seasonFor, weatherFor, weeklyContribution, weeklyFor, type GameState } from "./engine";
import {
  AFFIX, BRANCHES, EXPEDITIONS, EXP_ENERGY, EXP_WEEK_GOAL, PERKS, RARITY, bonus, claimExpWeek, expAdvance, expAvailable, expRetreat, expWeekCount,
  hasPerk, learnPerk, perkCost, perkBlocked, perkPoints, relicName, scrapRelic, startExpedition, wearRelic, type AffixKey, type Relic,
} from "./progress";
import { PARDI_JUTUD } from "./tekstid";
import { WorldEventLine } from "./WorldTab";
import { REGION_IMG } from "./portraits";
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
      {REGION_IMG[x.id] && <img src={REGION_IMG[x.id]} alt={x.name} className="mb-2 max-h-48 w-full border-2 border-border object-cover" style={{ imageRendering: "pixelated" }} />}
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
            {REGION_IMG[e.id] && <img src={REGION_IMG[e.id]} alt={e.name} loading="lazy" className="mb-1 max-h-32 w-full border-2 border-border object-cover" style={{ imageRendering: "pixelated" }} />}
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
      <div className="mb-3 border-b border-[#2a2a2a] pb-3">
        <H>Oskuspuu — vabu punkte: <span className="text-[#e85d3a]">{perkPoints(s)}</span></H>
        <p className="text-sm text-muted-foreground">Iga teine tase annab ühe punkti. Kõrgemad oskused maksavad rohkem (1–3 punkti). Kõike ei jõua — vali, milline ellujääja sinust saab.</p>
      </div>
      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BRANCHES.map((br) => { const c = BRANCH_COLOR[br.id]; return (
          <section key={br.id}>
            <div className="mb-3 flex items-center gap-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center border text-lg" style={{ borderColor: c, background: c + "1a" }}>{br.icon}</div>
              <h3 className="font-bold uppercase italic tracking-tight" style={{ color: c }}>{br.name}</h3>
            </div>
            <div className="flex flex-col gap-2">
              {PERKS.filter((p) => p.branch === br.id).map((p) => { const got = hasPerk(s, p.id); const why = perkBlocked(s, p); const locked = !got && !!why; return (
                <div key={p.id} className={`border-l-2 p-3 ${locked ? "border-transparent bg-[#111] opacity-40" : got ? "" : "border-[#2a2a2a] bg-[#1a1a1a]/60"}`}
                  style={got ? { borderColor: c, background: c + "0d" } : undefined}>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="font-bold" style={{ color: locked ? undefined : c }}>{p.icon} {p.name}</span>
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px]" style={{ background: locked ? "#1f2937" : c + "33", color: locked ? "#6b7280" : c }}>tase {p.minLevel} · {perkCost(p)} p</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.desc}</p>
                  {got
                    ? <div className="mt-2 text-[10px] font-bold text-[#4ade80]">[ ✓ ÕPITUD ]</div>
                    : <button disabled={!!why} title={why ?? ""} className="mt-2 w-full cursor-pointer border py-1.5 text-xs font-bold uppercase transition-all disabled:cursor-not-allowed disabled:opacity-50"
                        style={{ borderColor: c, color: c, background: c + "1a" }}
                        onMouseEnter={(e) => { if (!why) { e.currentTarget.style.background = c; e.currentTarget.style.color = "#000"; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = c + "1a"; e.currentTarget.style.color = c; }}
                        onClick={() => mut((g) => learnPerk(g, p.id))}>Õpi</button>}
                </div>); })}
            </div>
          </section>); })}
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
