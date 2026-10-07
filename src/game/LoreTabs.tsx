import { REGIONS } from "./data";
import { type GameState } from "./engine";
import { PATH_LEN, SECRETS, claimPath, pathCanClaim, pathReward } from "./lore";

type Mut = (fn: (g: GameState) => string | null | void) => void;
function H({ children }: { children: React.ReactNode }) { return <h2 className="px-title mb-2 mt-1 text-primary">&gt; {children}</h2>; }

export function PathPanel({ s, mut }: { s: GameState; mut: Mut }) {
  const n = s.path?.n || 0; const can = pathCanClaim(s);
  const next = n < PATH_LEN ? pathReward(n + 1) : null;
  return (
    <div className="mb-3 border-2 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1">🔥 Tuhkade tee: <span className="text-accent">{n}/{PATH_LEN}</span> päeva {next && <span className="text-base text-muted-foreground">· järgmine: {Object.entries(next.items).map(([k, v]) => `${k === "cash" ? "🪙" : ""}${v}`).join(" ")}{next.relic ? " + talisman" : ""}{next.title ? ` + tiitel ${next.title}` : ""}</span>}</span>
        {n >= PATH_LEN ? <span className="text-primary">🔥 Tuhastaja</span> : <button disabled={!can} className="px-btn px-btn-primary" onClick={() => mut(claimPath)}>{can ? "Astu tänane samm" : "Homme jälle"}</button>}
      </div>
      <div className="mt-1 flex flex-wrap gap-0.5" aria-hidden>
        {Array.from({ length: PATH_LEN }, (_, i) => <span key={i} className={`inline-block h-2 w-2 ${i < n ? "bg-primary" : "bg-muted"}`} />)}
      </div>
    </div>
  );
}

export function Knowledge({ s }: { s: GameState }) {
  const found = SECRETS.filter((x) => (s.secrets || []).includes(x.id));
  const hinted = SECRETS.filter((x) => (s.hints || []).includes(x.id) && !(s.secrets || []).includes(x.id));
  return (
    <div className="mb-3">
      <H>Teadmised — saladused {found.length}/{SECRETS.length}</H>
      <p className="mb-2 text-base text-muted-foreground">Uurides piirkondi saad vihjeid. Saladus avaneb, kui uurid õiges kohas õigel ajal.</p>
      <ul className="space-y-1">
        {hinted.map((x) => <li key={x.id} className="border-2 p-2">💭 {REGIONS[x.region].icon} {REGIONS[x.region].name}: <span className="text-muted-foreground">{x.hint}</span></li>)}
        {found.map((x) => <li key={x.id} className="border-2 border-primary/50 p-2">🗝️ <span className="text-primary">{x.name}</span> — <span className="text-base text-muted-foreground">{x.text}</span></li>)}
        {!hinted.length && !found.length && <li className="text-muted-foreground">Sa ei tea veel ühtegi saladust. Uuri ohtlikumaid piirkondi.</li>}
      </ul>
    </div>
  );
}
