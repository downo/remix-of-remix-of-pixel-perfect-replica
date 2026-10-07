import { FACTION_IMG } from "./portraits";
import { ITEMS, NPCS } from "./data";
import { type GameState } from "./engine";
import { Portrait } from "./portraits";
import {
  COLLECTIONS, FACTIONS, RANKS, STORIES, advanceStory, bondOf, claimCollection, collected, donate, enemyScale, rankOf, repOf, startNewGamePlus, storyStep, worldEventFor,
} from "./world";

type Mut = (fn: (g: GameState) => string | null | void) => void;
function H({ children }: { children: React.ReactNode }) { return <h2 className="px-title mb-2 mt-1 text-primary">&gt; {children}</h2>; }
const costStr = (c: Record<string, number>) => Object.entries(c).map(([k, v]) => `${ITEMS[k]?.icon ?? k}${v}`).join(" ");

export function WorldEventLine({ s }: { s: GameState }) {
  const e = worldEventFor(s);
  return <div className="mb-3 border-2 p-2">🌍 Maailma sündmus täna: <span className="text-accent">{e.icon} {e.name}</span> — {e.desc}</div>;
}

export function WorldTab({ s, mut, onNgp }: { s: GameState; mut: Mut; onNgp: (g: GameState) => void }) {
  const known = Object.keys(STORIES).filter((n) => s.npcs.includes(n));
  return (
    <div>
      <WorldEventLine s={s} />
      <H>Fraktsioonid</H>
      <p className="mb-2 text-base text-muted-foreground">Aita fraktsioone kord päevas. Ühe aitamine pahandab tema rivaali. Uued auastmed annavad tasu.</p>
      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        {FACTIONS.map((f) => { const r = repOf(s, f.id); const rank = rankOf(r); const next = RANKS.find((x) => x.at > r); return (
          <div key={f.id} className="border-2 p-2">
            {FACTION_IMG[f.id] && <img src={FACTION_IMG[f.id]} alt={f.name} loading="lazy" width={256} height={256} className="mb-2 aspect-square w-full border-2 object-cover [image-rendering:pixelated]" />}
            <div>{f.icon} {f.name}</div>
            <div className="text-accent">{rank.name} · {r} mainet{next ? ` (järgmine ${next.at})` : ""}</div>
            <div className="text-base text-muted-foreground">{f.desc} Rivaal: {FACTIONS.find((x) => x.id === f.rival)?.name}</div>
            <button className="px-btn mt-1" onClick={() => mut((g) => donate(g, f.id))}>Aita: {costStr(f.wants)}</button>
          </div>); })}
      </div>
      <H>Lood ja suhted</H>
      {!known.length && <p className="mb-3 text-muted-foreground">Leia maailmast ellujäänuid — igaühel neist on oma lugu.</p>}
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        {known.map((n) => { const st = STORIES[n]; const i = storyStep(s, n); const step = st.steps[i]; return (
          <div key={n} className="border-2 p-2">
            <div className="flex items-center gap-2"><Portrait id={n} icon={NPCS[n].icon} alt={NPCS[n].name} size="sm" />{NPCS[n].name} — {st.title} <span className="text-accent">{"♥".repeat(bondOf(s, n))}{"♡".repeat(st.steps.length - bondOf(s, n))}</span></div>
            {step ? (<>
              <p className="my-1 text-base">{step.text}</p>
              {Object.keys(step.need).length > 0 && <p className="text-base text-muted-foreground">Vaja: {costStr(step.need)}</p>}
              {step.choice ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  <button className="px-btn" onClick={() => mut((g) => advanceStory(g, n, "a"))}>{step.choice.a[1]}</button>
                  <button className="px-btn" onClick={() => mut((g) => advanceStory(g, n, "b"))}>{step.choice.b[1]}</button>
                </div>
              ) : <button className="px-btn mt-1" onClick={() => mut((g) => advanceStory(g, n))}>Aita</button>}
            </>) : <p className="text-base text-primary">Lugu lõpetatud.</p>}
          </div>); })}
      </div>
      <H>Kollektsioonid</H>
      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        {COLLECTIONS.map((c) => { const done = (s.collDone || []).includes(c.id); const full = c.items.every((i) => collected(s, i)); return (
          <div key={c.id} className="border-2 p-2">
            <div>{c.icon} {c.name} <span className="text-base text-muted-foreground">· tasu {costStr(c.reward)}</span></div>
            <div className="my-1 text-xl">{c.items.map((i) => <span key={i} title={ITEMS[i].name} className={collected(s, i) ? "" : "opacity-25"}>{ITEMS[i].icon} </span>)}</div>
            {done ? <span className="text-primary">[✓]</span> : <button disabled={!full} className="px-btn" onClick={() => mut((g) => claimCollection(g, c.id))}>Võta tasu</button>}
          </div>); })}
      </div>
      <H>Uus mäng+ {s.ngp ? `(praegu ${s.ngp})` : ""}</H>
      <p className="mb-2 text-base text-muted-foreground">Vaenlased on praegu {Math.round((enemyScale(s) - 1) * 100)}% tugevamad. Pärast Lõhe sulgemist võid alustada uuesti: säilivad tase, oskused, talismanid, maine, kollektsioonid, saavutused ja arhiiv. Iga tsükkel teeb vaenlased +30% tugevamaks.</p>
      <button disabled={!s.sealed} className="px-btn px-btn-primary" onClick={() => { if (confirm("Alusta uut mängu+? Baas, inventar ja kaart algavad otsast.")) onNgp(startNewGamePlus(s)); }}>
        {s.sealed ? "🔁 Alusta Uut mängu+" : "🔒 Sulge enne Lõhe"}
      </button>
    </div>
  );
}
