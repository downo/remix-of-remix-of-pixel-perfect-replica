import { useState } from "react";
import { ITEMS } from "./data";
import { type GameState } from "./engine";
import {
  CONTRACT_AT, FAC_GEAR, FAC_LORE, FAC_PERKS, REL_LABEL, SECRET_AT, STYLE, buyFacGear, contractDoneToday, contractFor, doContract,
  facEventFor, facEventOpen, relOf, resolveFacEvent,
} from "./factions";
import { FACTION_IMG } from "./portraits";
import { FACTIONS, RANKS, donate, rankOf, repOf } from "./world";

type Mut = (fn: (g: GameState) => string | null | void) => void;
const costStr = (c: Record<string, number>) => Object.entries(c).map(([k, v]) => `${ITEMS[k]?.icon ?? k}${v}`).join(" ");
const fname = (id: string) => FACTIONS.find((f) => f.id === id);

function RepBar({ r }: { r: number }) {
  const rank = rankOf(r); const next = RANKS.find((x) => x.at > r);
  const pct = next ? Math.max(0, Math.min(100, ((r - rank.at) / (next.at - rank.at)) * 100)) : 100;
  return (
    <div>
      <div className="flex justify-between text-base"><span className={r < 0 ? "text-destructive" : "text-accent"}>{rank.name} · {r} mainet</span>{next && <span className="text-muted-foreground">→ {next.name} {next.at}</span>}</div>
      <div className="mt-1 h-2 w-full bg-muted"><div className={`h-2 ${r < 0 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function DailyEvent({ s, mut }: { s: GameState; mut: Mut }) {
  const e = facEventFor(s); const open = facEventOpen(s);
  const delta = (c: Record<string, number>) => Object.entries(c).map(([f, n]) => `${n > 0 ? "+" : ""}${n} ${fname(f)?.name}`).join(" · ");
  return (
    <div className="mb-3 border-2 border-accent p-2">
      <div className="px-title text-accent">{e.title}</div>
      <p className="my-1">{e.text}</p>
      {open ? (
        <div className="grid gap-1 sm:grid-cols-3">
          {e.choices.map((c, i) => (
            <button key={i} className="px-btn flex h-auto flex-col items-start py-1 text-left" onClick={() => mut((g) => resolveFacEvent(g, i))}>
              <span>[ {c.label} ]</span>
              <span className="text-base text-muted-foreground whitespace-normal">{delta(c.rep) || "mainet ei muuda"}{c.items ? ` · ${costStr(c.items)}` : ""}</span>
            </button>
          ))}
        </div>
      ) : <p className="text-base text-muted-foreground">Otsustasid täna. Uus sündmus tuleb homme.</p>}
    </div>
  );
}

function Detail({ s, mut, id, onBack }: { s: GameState; mut: Mut; id: string; onBack: () => void }) {
  const f = fname(id)!; const r = repOf(s, id); const c = contractFor(s, id); const gear = FAC_GEAR[id]; const lore = FAC_LORE[id];
  const Sec = ({ t, children }: { t: string; children: React.ReactNode }) => <div className="border-2 p-2"><div className="px-title mb-1 text-primary">{t}</div>{children}</div>;
  return (
    <div className="mb-3 space-y-2">
      <button className="px-btn" onClick={onBack}>← Kõik fraktsioonid</button>
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        {FACTION_IMG[id] && <img src={FACTION_IMG[id]} alt={f.name} width={256} height={256} className="aspect-square w-full border-2 object-cover [image-rendering:pixelated]" />}
        <div className="space-y-2">
          <div className="px-title text-accent">{f.icon} {f.name.toUpperCase()} <span className="text-base text-muted-foreground">· {STYLE[id]}</span></div>
          <p>{f.desc}</p>
          <RepBar r={r} />
          <button className="px-btn" onClick={() => mut((g) => donate(g, id))}>Aita täna: {costStr(f.wants)} (+25)</button>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <Sec t="Hüved">
          {FAC_PERKS[id].map((p) => <div key={p.at} className={r >= p.at ? "text-primary" : "text-muted-foreground"}>{r >= p.at ? "✓" : "🔒"} {rankOf(p.at).name} ({p.at}): {p.text}</div>)}
          <p className="mt-1 text-base text-muted-foreground">Kehtib kõrgeim avatud hüve.</p>
        </Sec>
        <Sec t="Leping täna">
          {r < CONTRACT_AT ? <p className="text-muted-foreground">🔒 Avaneb «Tuttav» astmel ({CONTRACT_AT} mainet).</p> : contractDoneToday(s, id) ? <p className="text-primary">✓ Tehtud. Uus leping homme.</p> : (<>
            <div>{c.name}</div>
            <div className="text-base text-muted-foreground">Vaja: {c.relics ? `📿${c.relics} ` : ""}{costStr(c.need)} · tasu +{c.rep} mainet {costStr(c.reward)}</div>
            <button className="px-btn px-btn-primary mt-1" onClick={() => mut((g) => doContract(g, id))}>Täida leping</button>
          </>)}
        </Sec>
        <Sec t="Suhted">
          {FACTIONS.filter((o) => o.id !== id).map((o) => <div key={o.id}>{o.icon} {o.name}: {REL_LABEL[relOf(s, id, o.id)]}</div>)}
          <p className="mt-1 text-base text-muted-foreground">Kui aitad neid, rõõmustavad sõbrad ja pahandavad vaenlased. Suhted muutuvad sinu valikutega.</p>
        </Sec>
        <Sec t="Eriese">
          <div>{ITEMS[gear.item].icon} {ITEMS[gear.item].name} <span className="text-base text-muted-foreground">({ITEMS[gear.item].def ? `+${ITEMS[gear.item].def} kaitse` : `+${ITEMS[gear.item].dmg} kahju`})</span></div>
          <div className="text-base text-muted-foreground">{rankOf(gear.at).name} ({gear.at}) · {costStr(gear.cost)}</div>
          <button disabled={r < gear.at} className="px-btn mt-1" onClick={() => mut((g) => buyFacGear(g, id))}>{r < gear.at ? "🔒 Lukus" : "Osta"}</button>
        </Sec>
        <Sec t="Ajalugu"><p className="text-base">{lore.history}</p></Sec>
        <Sec t="Saladus">{r >= SECRET_AT ? <><div className="text-accent">🔓 Salajane teadmine avastatud</div><p className="text-base">{lore.secret}</p></> : <p className="text-muted-foreground">🔒 Avaneb «Liitlane» astmel ({SECRET_AT} mainet).</p>}</Sec>
      </div>
    </div>
  );
}

export function FactionsPanel({ s, mut }: { s: GameState; mut: Mut }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <DailyEvent s={s} mut={mut} />
      {open ? <Detail s={s} mut={mut} id={open} onBack={() => setOpen(null)} /> : (
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          {FACTIONS.map((f) => { const rival = FACTIONS.filter((o) => o.id !== f.id).sort((a, b) => relOf(s, f.id, a.id) - relOf(s, f.id, b.id))[0]; return (
            <button key={f.id} onClick={() => setOpen(f.id)} className="border-2 p-2 text-left transition-colors hover:border-primary">
              {FACTION_IMG[f.id] && <img src={FACTION_IMG[f.id]} alt={f.name} loading="lazy" width={256} height={256} className="mb-2 aspect-square w-full border-2 object-cover [image-rendering:pixelated]" />}
              <div className="px-title text-accent">{f.icon} {f.name.toUpperCase()}</div>
              <RepBar r={repOf(s, f.id)} />
              <p className="mt-1 text-base text-muted-foreground">{f.desc}</p>
              <p className="text-base">Rivaal: {rival.icon} {rival.name}</p>
              <span className="px-btn mt-1 inline-flex">[ VAATA FRAKTSIOONI ]</span>
            </button>); })}
        </div>
      )}
    </>
  );
}
