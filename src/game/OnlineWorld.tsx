import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { type GameState } from "./engine";
import { SEASON_GOAL, TERRITORIES, claimSeason, ensureSeason, seasonContribution, seasonKey, seasonTheme } from "./world";
import { FACTION_IMG } from "./portraits";

type Mut = (fn: (g: GameState) => string | null | void) => void;
type P = { s: GameState; mut: Mut; user: User | null; toast: (t: string) => void };
const H = ({ children }: { children: React.ReactNode }) => <h2 className="px-title mb-2 mt-1 text-primary">&gt; {children}</h2>;

export function Territories({ s, mut, user, toast }: P) {
  const [rows, setRows] = useState<{ id: string; owner: string | null; owner_name: string | null }[]>([]);
  const [mine, setMine] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [{ data: t }, me] = await Promise.all([
      supabase.from("territories").select("id,owner,owner_name"),
      user ? supabase.from("clan_members").select("clan_id").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const clan = (me.data as { clan_id: string } | null)?.clan_id ?? null;
    setRows(t ?? []); setMine(clan);
    const owned = (t ?? []).filter((r) => clan && r.owner === clan).map((r) => r.id).sort();
    if (owned.join() !== [...(s.terr || [])].sort().join()) mut((g) => { g.terr = owned; });
  }, [user, mut, s.terr]);
  useEffect(() => { load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const attack = async (id: string) => {
    const { data, error } = await supabase.rpc("claim_territory", { _id: id });
    if (error) toast(error.message); else toast((data as { won: boolean }).won ? "🏴 Ala vallutatud!" : "❌ Rünnak löödi tagasi.");
    load();
  };
  return (
    <div className="space-y-2">
      <H>Klannide alad</H>
      {FACTION_IMG.clan && <img src={FACTION_IMG.clan} alt="Klannide asula" loading="lazy" className="max-h-44 w-full border-2 border-border object-cover" style={{ imageRendering: "pixelated" }} />}
      <p className="text-muted-foreground">Iga ala annab kogu valdavale klannile püsiboonuse. Tühja ala saab kohe endale, teise klanni oma tuleb vallutada (kaitsjal on 15% eelis). Sama ala saab rünnata kord poole tunni jooksul.</p>
      {!user && <p className="text-muted-foreground">Logi sisse ja liitu klanniga, et alasid vallutada.</p>}
      {user && !mine && <p className="text-accent">Liitu enne klanniga (🤝 Klann).</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {TERRITORIES.map((t) => { const r = rows.find((x) => x.id === t.id); const ours = !!mine && r?.owner === mine; return (
          <div key={t.id} className={`border-2 p-2 ${ours ? "border-primary" : ""}`}>
            <div>{t.icon} {t.name}</div>
            <div className="text-base text-muted-foreground">{t.desc}</div>
            <div className="text-base">Valdaja: <span className={ours ? "text-primary" : "text-accent"}>{r?.owner_name ?? "— vaba —"}</span></div>
            {user && mine && !ours && <button className="px-btn mt-1" onClick={() => attack(t.id)}>{r?.owner ? "⚔️ Vallutada" : "🏴 Võta endale"}</button>}
          </div>); })}
      </div>
      <button className="px-btn" onClick={load}>↻ Värskenda</button>
    </div>
  );
}

export function Season({ s, mut, user }: P) {
  const key = seasonKey(); const th = seasonTheme(key);
  const [rows, setRows] = useState<{ user_id: string; username: string; amount: number }[]>([]);
  const load = useCallback(() => {
    supabase.from("season_contrib").select("user_id,username,amount").eq("season", key).order("amount", { ascending: false }).limit(500).then(({ data }) => setRows(data ?? []));
  }, [key]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (s.sea?.key !== key) mut((g) => { ensureSeason(g); }); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const mineN = seasonContribution(s);
  const total = rows.reduce((a, r) => a + (r.user_id === user?.id ? 0 : r.amount), 0) + mineN;
  return (
    <div className="space-y-2">
      <H>Hooaeg · {key}</H>
      <div className="text-xl text-accent">{th.icon} {th.name}</div>
      <p className="text-muted-foreground">{th.desc} Loeb iga kogumine, võit, uurimine ja valmistamine. Uus hooaeg algab iga kuu alguses.</p>
      <div className="px-bar text-primary"><span style={{ width: `${Math.min(100, (total / SEASON_GOAL) * 100)}%` }} /></div>
      <p>Kogu maailm: <span className="text-primary">{total}</span> / {SEASON_GOAL} · Sinu panus: <span className="text-accent">{mineN}</span></p>
      {s.seaClaimed === key ? <p className="text-primary">[✓] Hooaja tasu võetud.</p>
        : <button disabled={total < SEASON_GOAL} className="px-btn px-btn-primary" onClick={() => mut((g) => claimSeason(g, total))}>Võta hooaja tasu (100 🪙, 200 XP, talisman)</button>}
      <h3 className="text-accent">Suurimad panustajad</h3>
      <ol className="space-y-1">
        {rows.slice(0, 10).map((r, i) => <li key={r.user_id} className="flex justify-between"><span>{i + 1}. {r.username}</span><span>{r.amount}</span></li>)}
        {!rows.length && <li className="text-muted-foreground">Veel pole keegi panustanud.</li>}
      </ol>
      <button className="px-btn" onClick={load}>↻ Värskenda</button>
    </div>
  );
}
