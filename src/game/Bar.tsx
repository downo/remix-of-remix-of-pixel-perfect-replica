import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { BAR_BUY, BAR_SELL, ENEMIES, ITEMS, REGIONS, BAR_REGION } from "./data";
import {
  atBar, barBuy, barSell, cardDraw, claimContract, contractProgress, contractsFor, hiloCashOut, hiloPay, playBottle, playDice, playRats, bountyFor, weekKey, type GameState,
} from "./engine";
import { PlayerQuests } from "./Online";

type Mut = (fn: (g: GameState) => string | null | void) => void;
const H = ({ children }: { children: React.ReactNode }) => <h2 className="px-title mb-2 mt-1 text-primary">&gt; {children}</h2>;
const lbl = (id: string) => `${ITEMS[id].icon} ${ITEMS[id].name}`;
type Sub = "counter" | "jobs" | "games" | "board";

import { PARDI_JUTUD } from "./tekstid";
// Pärdi jutud on failis tekstid.ts
export const PART_LINES = PARDI_JUTUD;

export function BarTab({ s, mut, user, toast }: { s: GameState; mut: Mut; user: User | null; toast: (t: string) => void }) {
  const [sub, setSub] = useState<Sub>("counter");
  const here = atBar(s);
  return (
    <div className="space-y-3">
      <H>🍺 Baar «Roostes Kruus»</H>
      <p className="text-base text-muted-foreground">
        Varemete keldris suitsune kõrts. Leti taga seisab <span className="text-accent">Pärt</span> — pika musta habemega salapärane mees, kes pühib klaasi, mis ei saa kunagi puhtaks. Sul on <span className="text-accent">🪙 {s.inv.cash || 0} korki</span>.
      </p>
      <PartTalk s={s} />
      {!here && <p className="border-2 border-accent/60 p-2 text-accent">Baar asub piirkonnas {REGIONS[BAR_REGION].icon} {REGIONS[BAR_REGION].name}. Ränna sinna, et osta, müüa, mängida või lepingute tasu kätte saada.</p>}
      <div className="flex flex-wrap gap-1">
        {([["counter", "🛒 Lett"], ["jobs", "📜 Lepingud"], ["games", "🎲 Mängud"], ["board", "📌 Mängijate tellimused"]] as const).map(([id, l]) => (
          <button key={id} className={`px-btn ${sub === id ? "px-btn-active" : ""}`} onClick={() => setSub(id)}>{l}</button>
        ))}
      </div>
      {sub === "counter" && <Counter s={s} mut={mut} here={here} />}
      {sub === "jobs" && <Jobs s={s} mut={mut} here={here} />}
      {sub === "games" && <Games s={s} mut={mut} here={here} />}
      {sub === "board" && (user ? <PlayerQuests s={s} mut={mut} user={user} toast={toast} /> : <p className="text-muted-foreground">Teiste mängijate tellimuste nägemiseks logi sisse: 🌐 Mitmikmäng → Konto.</p>)}
    </div>
  );
}

function PartTalk({ s }: { s?: GameState }) {
  const [line, setLine] = useState<string | null>(null);
  const wk = weekKey(new Date()); const b = ENEMIES[bountyFor(wk)];
  return (
    <div className="space-y-1">
      {s && <div className="border-2 border-accent p-2 text-base">📜 <span className="text-accent">Pärdi pearahatahvel:</span> {b.icon} {b.name} — 50 🪙 + 100 XP. {s.bountyWeek === wk ? "✅ Selle nädala pearaha makstud." : "«Too mulle tõestust. Kõrv, saba, kroon — mis iganes tal on. Ainult mitte lõhn.»"}</div>}
      <button className="px-btn" onClick={() => setLine(PART_LINES[Math.floor(Math.random() * PART_LINES.length)])}>🗣️ Küsi Pärdilt nõu</button>
      {line && <p className="fadein border-2 border-primary/50 p-2 text-base italic text-primary">{line}</p>}
    </div>
  );
}

function Counter({ s, mut, here }: { s: GameState; mut: Mut; here: boolean }) {
  const sellable = Object.keys(BAR_SELL).filter((k) => (s.inv[k] || 0) > 0);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <h3 className="mb-1 text-accent">Osta</h3>
        <ul className="space-y-1">
          {Object.entries(BAR_BUY).map(([id, p]) => (
            <li key={id} className="flex items-center justify-between gap-2 border-2 p-1 pl-2">
              <span>{lbl(id)} <span className="text-base text-muted-foreground">(sul {s.inv[id] || 0})</span></span>
              <button className="px-btn px-btn-primary" disabled={!here || (s.inv.cash || 0) < p} onClick={() => mut((g) => barBuy(g, id))}>🪙 {p}</button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-1 text-accent">Müü romu</h3>
        {!sellable.length && <p className="text-base text-muted-foreground">Sul pole midagi, mida Pärt ostaks.</p>}
        <ul className="space-y-1">
          {sellable.map((id) => { const [u, p] = BAR_SELL[id]; return (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2 border-2 p-1 pl-2">
              <span>{lbl(id)} ×{s.inv[id]} <span className="text-base text-muted-foreground">· {u} tk → 🪙{p}</span></span>
              <span className="flex gap-1">
                <button className="px-btn" disabled={!here} onClick={() => mut((g) => barSell(g, id, 1))}>Müü</button>
                <button className="px-btn" disabled={!here} onClick={() => mut((g) => barSell(g, id, 999))}>Kõik</button>
              </span>
            </li>); })}
        </ul>
      </div>
    </div>
  );
}

function Jobs({ s, mut, here }: { s: GameState; mut: Mut; here: boolean }) {
  return (
    <div>
      <p className="mb-2 text-base text-muted-foreground">Pärt jagab iga mängupäev 3 lepingut. Kohaletoimetamise puhul too asjad baari; ülesannete edenemine loetakse tänasest alates.</p>
      <ul className="space-y-1">
        {contractsFor(s.bar.day).map((c) => {
          const p = contractProgress(s, c); const done = s.bar.done.includes(c.id);
          return (
            <li key={c.id} className={`flex flex-wrap items-center gap-2 border-2 p-2 ${done ? "text-muted-foreground" : ""}`}>
              <span className="flex-1">{c.icon} {c.name} — {c.kind === "deliver" ? `too ${lbl(c.item!)} ×${c.n}` : `${c.n}×`} <span className="text-accent">{p}/{c.n}</span> <span className="text-base text-muted-foreground">· 🪙{c.cash} +{c.xp} XP</span></span>
              {done ? <span className="text-primary">[✓]</span> : <button className="px-btn px-btn-primary" disabled={!here || p < c.n} onClick={() => mut((g) => claimContract(g, c.id))}>Anna üle</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Games({ s, mut, here }: { s: GameState; mut: Mut; here: boolean }) {
  const [stake, setStake] = useState(5);
  const [msg, setMsg] = useState<string>("");
  const cash = s.inv.cash || 0;
  const can = here && cash >= stake;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type R = { err?: string; msg?: string } & Record<string, any>;
  const run = (fn: (g: GameState) => R, after?: (r: R) => void) => {
    let r: R | null = null;
    mut((g) => { r = fn(g); return r.err ?? null; });
    const res = r as R | null;
    if (res && !res.err) { setMsg(res.msg ?? ""); after?.(res); }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span>Panus:</span>
        {[1, 5, 10, 25, 50].map((n) => <button key={n} className={`px-btn ${stake === n ? "px-btn-active" : ""}`} onClick={() => setStake(n)}>🪙{n}</button>)}
      </div>
      {msg && <p className="fadein border-2 border-accent p-2 text-accent">{msg}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        <Dice can={can} onPlay={(after) => run((g) => playDice(g, stake), after)} />
        <Rats can={can} onPlay={(pick, after) => run((g) => playRats(g, stake, pick), after)} />
        <Bottle can={can} onPlay={(pos) => run((g) => playBottle(g, stake, pos))} />
        <HiLo can={can} stake={stake} mut={mut} setMsg={setMsg} />
      </div>
      <p className="text-base text-muted-foreground">Pärt võtab alati oma osa — maja võidab pikas plaanis. Mängi mõõdukalt.</p>
    </div>
  );
}

const Box = ({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) => (
  <div className="border-2 p-2"><div className="text-accent">{title}</div><div className="mb-2 text-base text-muted-foreground">{desc}</div>{children}</div>
);
const FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function Dice({ can, onPlay }: { can: boolean; onPlay: (after: (r: { msg?: string; me?: number[]; him?: number[] }) => void) => void }) {
  const [r, setR] = useState<{ me: number[]; him: number[] } | null>(null);
  return (
    <Box title="🎲 Täringud" desc="Kaks täringut sinul, kaks Pärtul. Suurem summa võidab ×2, viik tagastab panuse.">
      {r && <div className="mb-2 text-3xl">Sina {r.me.map((d) => FACES[d]).join("")} · Pärt {r.him.map((d) => FACES[d]).join("")}</div>}
      <button className="px-btn px-btn-primary" disabled={!can} onClick={() => onPlay((x) => x.me && setR({ me: x.me, him: x.him! }))}>Viska</button>
    </Box>
  );
}

function Rats({ can, onPlay }: { can: boolean; onPlay: (pick: number, after: (r: { msg?: string; winner?: number }) => void) => void }) {
  const [pick, setPick] = useState(0); const [win, setWin] = useState<number | null>(null);
  return (
    <Box title="🐀 Rotivõistlus" desc="Vali rott. Kui see jõuab esimesena kohale, saad ×3,5.">
      <div className="mb-2 space-y-1">
        {[0, 1, 2, 3].map((i) => (
          <button key={i} className={`px-btn block w-full text-left ${pick === i ? "px-btn-active" : ""}`} onClick={() => setPick(i)}>
            🐀 nr {i + 1} {win === i && "🏁"}
          </button>
        ))}
      </div>
      <button className="px-btn px-btn-primary" disabled={!can} onClick={() => onPlay(pick, (x) => setWin(x.winner ?? null))}>Start!</button>
    </Box>
  );
}

function Bottle({ can, onPlay }: { can: boolean; onPlay: (pos: number) => void }) {
  const [running, setRunning] = useState(false);
  const [pos, setPos] = useState(0);
  const raf = useRef(0); const t0 = useRef(0);
  useEffect(() => {
    if (!running) return;
    t0.current = performance.now();
    const loop = (t: number) => { setPos((Math.sin((t - t0.current) / 260) + 1) / 2); raf.current = requestAnimationFrame(loop); };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [running]);
  return (
    <Box title="🍾 Pudelivise" desc="Peata liikuv nool keskel. Roheline ×2, täpselt keskel ×4.">
      <div className="relative mb-2 h-6 border-2">
        <div className="absolute inset-y-0 bg-primary/30" style={{ left: "38%", width: "24%" }} />
        <div className="absolute inset-y-0 bg-primary" style={{ left: "46%", width: "8%" }} />
        <div className="absolute inset-y-0 w-1 bg-accent" style={{ left: `calc(${pos * 100}% - 2px)` }} />
      </div>
      {running
        ? <button className="px-btn px-btn-primary" onClick={() => { setRunning(false); onPlay(pos); }}>VISKA!</button>
        : <button className="px-btn px-btn-primary" disabled={!can} onClick={() => setRunning(true)}>Võta pudel</button>}
    </Box>
  );
}

const CARD = ["", "Ä", "2", "3", "4", "5", "6", "7", "8", "9", "10", "P", "E", "K"];
function HiLo({ can, stake, mut, setMsg }: { can: boolean; stake: number; mut: Mut; setMsg: (m: string) => void }) {
  const [card, setCard] = useState<number | null>(null);
  const [pot, setPot] = useState(0);
  const start = () => {
    let ok = false;
    mut((g) => { const e = hiloPay(g, stake); ok = !e; return e; });
    if (ok) { setCard(cardDraw()); setPot(stake); setMsg(""); }
  };
  const guess = (up: boolean) => {
    if (card == null) return;
    const next = cardDraw();
    const wins = up ? 13 - card : card - 1;
    const ok = up ? next > card : next < card;
    if (!ok || wins === 0) { setMsg(`Kaart oli ${CARD[next]} — kaotasid 🪙${pot}.`); setCard(null); setPot(0); return; }
    const np = Math.min(500, Math.max(pot + 1, Math.floor(pot * 0.9 * 13 / wins)));
    setCard(next); setPot(np);
  };
  const cashOut = () => { const p = pot; mut((g) => hiloCashOut(g, p)); setMsg(`Võtsid välja 🪙${p}.`); setCard(null); setPot(0); };
  return (
    <Box title="🃏 Kõrgem või madalam" desc="Arva, kas järgmine kaart on kõrgem või madalam. Iga õige arvamus kasvatab potti. Viik kaotab.">
      {card == null
        ? <button className="px-btn px-btn-primary" disabled={!can} onClick={start}>Jaga kaart</button>
        : <div className="space-y-2">
            <div className="text-3xl">🂠 {CARD[card]} <span className="text-base text-accent">pott 🪙{pot}</span></div>
            <div className="flex flex-wrap gap-1">
              <button className="px-btn" onClick={() => guess(true)}>⬆ Kõrgem</button>
              <button className="px-btn" onClick={() => guess(false)}>⬇ Madalam</button>
              <button className="px-btn px-btn-primary" onClick={cashOut}>💰 Võta välja</button>
            </div>
          </div>}
    </Box>
  );
}
