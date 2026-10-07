import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ITEMS } from "./data";
import { add, weeklyFor, weeklyContribution, migrateSave, type GameState } from "./engine";
import { blip } from "./sound";
import { ensureSeason, seasonContribution } from "./world";
import { Territories, Season } from "./OnlineWorld";

type Mut = (fn: (g: GameState) => string | null | void) => void;
/** True in the self-hosted (PHP server) download build: username accounts, no email. */
const SELF_HOSTED = import.meta.env.VITE_SELFHOST === "1";
type Sub = "account" | "board" | "chat" | "week" | "season" | "terr" | "clan" | "market" | "gift";

export const scoreOf = (s: GameState) =>
  s.level * 100 + s.kills * 10 + s.discovered.length * 25 + s.lore * 30 + Object.values(s.structures).reduce((a, b) => a + b, 0) * 15
  + (s.ach?.length || 0) * 40 + (s.sealed ? 500 : 0);

const H = ({ children }: { children: React.ReactNode }) => <h2 className="px-title mb-2 mt-1 text-primary">&gt; {children}</h2>;
const itemLabel = (id: string) => (ITEMS[id] ? `${ITEMS[id].icon} ${ITEMS[id].name}` : id);

export function useOnlineUser(onRecovery?: () => void) {
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = still checking
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((e, sess) => {
      if (e === "PASSWORD_RECOVERY") onRecovery?.();
      if (e === "SIGNED_IN" || e === "SIGNED_OUT" || e === "USER_UPDATED" || e === "INITIAL_SESSION") setUser(sess?.user ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}

// Must satisfy the database rule: 3–20 chars of letters, digits, _ or - (emails like "space.mongols" would otherwise be rejected).
const nameOf = (u: User) => {
  const raw = (u.user_metadata?.username as string) || (u.user_metadata?.full_name as string) || u.email?.split("@")[0] || "Rändur";
  const clean = raw.replace(/[^A-Za-z0-9_õäöüÕÄÖÜ-]/g, "_").slice(0, 20);
  return clean.length >= 3 ? clean : (clean + "___").slice(0, 3);
};

/** Reads the server save (if any) for this user. */
export async function fetchCloudSave(user: User): Promise<GameState | null> {
  const { data, error } = await supabase.from("saves").select("state").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error(error.message); // never mistake a failed read for "no save yet"
  return data ? migrateSave(data.state as unknown as Partial<GameState>) : null;
}

export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setMsg("Paroolid ei ühti.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg(error.message);
    onDone();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <form onSubmit={submit} className="px-panel fadein w-full max-w-sm space-y-2 p-5" role="dialog" aria-label="Uus parool">
        <H>🔑 Määra uus parool</H>
        <input className="px-panel w-full px-2 py-1" type="password" placeholder="Uus parool" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} required />
        <input className="px-panel w-full px-2 py-1" type="password" placeholder="Korda parooli" minLength={6} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
        {msg && <p className="text-destructive">{msg}</p>}
        <button className="px-btn px-btn-primary" disabled={busy}>Salvesta parool</button>
      </form>
    </div>
  );
}

/** Pushes score + cloud save periodically. */
export async function syncOnline(user: User, s: GameState, day: number) {
  await supabase.from("profiles").upsert({ id: user.id, username: nameOf(user).slice(0, 24), score: scoreOf(s), day, level: s.level, updated_at: new Date().toISOString() });
  if (s.wk.week) await supabase.from("weekly_contrib").upsert({ week: s.wk.week, user_id: user.id, username: nameOf(user).slice(0, 24), amount: Math.min(100000, weeklyContribution(s)), updated_at: new Date().toISOString() });
  ensureSeason(s);
  if (s.sea) await supabase.from("season_contrib").upsert({ season: s.sea.key, user_id: user.id, username: nameOf(user).slice(0, 24), amount: Math.min(1000000, seasonContribution(s)), updated_at: new Date().toISOString() });
  await supabase.from("saves").upsert({ user_id: user.id, state: s as never, updated_at: new Date().toISOString() });
}

export function OnlineTab({ s, mut, user, onLoadCloud, toast }: { s: GameState; mut: Mut; user: User | null; onLoadCloud: (g: GameState) => void; toast: (t: string) => void }) {
  const [sub, setSub] = useState<Sub>(user ? "board" : "account");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {([["account", "👤 Konto"], ["board", "🏆 Edetabel"], ["chat", "💬 Vestlus"], ["week", "🗓️ Nädal"], ["season", "🌍 Hooaeg"], ["clan", "🤝 Klann"], ["terr", "🏴 Alad"], ["market", "⚖️ Turg"], ["gift", "🎁 Kingid"]] as const).map(([id, l]) => (
          <button key={id} className={`px-btn ${sub === id ? "px-btn-active" : ""}`} onClick={() => setSub(id)}>{l}</button>
        ))}
      </div>
      {sub === "account" && <Account user={user} onLoadCloud={onLoadCloud} toast={toast} />}
      {sub === "board" && <Board user={user} />}
      {sub === "week" && <Week s={s} user={user} />}
      {sub === "season" && <Season s={s} mut={mut} user={user} toast={toast} />}
      {sub === "terr" && <Territories s={s} mut={mut} user={user} toast={toast} />}
      {sub !== "account" && sub !== "board" && sub !== "week" && sub !== "season" && sub !== "terr" && !user && <p className="text-muted-foreground">Logi sisse (👤 Konto), et teiste mängijatega koostööd teha ja kaubelda.</p>}
      {sub === "chat" && user && <Chat user={user} />}
      {sub === "clan" && user && <Clan s={s} mut={mut} user={user} toast={toast} />}
      {sub === "market" && user && <Market s={s} mut={mut} user={user} toast={toast} />}
      {sub === "gift" && user && <Gifts s={s} mut={mut} user={user} toast={toast} />}
    </div>
  );
}

export function Account({ user, onLoadCloud, toast }: { user: User | null; onLoadCloud: (g: GameState) => void; toast: (t: string) => void }) {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const forgot = async () => {
    if (!email) return toast("Sisesta enne oma e-post");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
    setBusy(false);
    toast(error ? error.message : "Parooli lähtestamise link saadeti e-postile ✉️");
  };

  if (user) {
    const loadCloud = async () => {
      const { data } = await supabase.from("saves").select("state").eq("user_id", user.id).maybeSingle();
      if (!data) return toast("Pilvesalvestust pole veel");
      if (confirm("Laadi pilvesalvestus? Praegune kohalik progress asendatakse.")) onLoadCloud(migrateSave(data.state as unknown as Partial<GameState>));
    };
    return (
      <div className="space-y-2">
        <H>Konto</H>
        <p>Sisse logitud: <span className="text-accent">{nameOf(user)}</span></p>
        <p className="text-muted-foreground">Sinu mäng salvestub serverisse automaatselt iga 30 sekundi järel ja lehelt lahkudes. Teises seadmes sisse logides pakutakse salvestuse laadimist.</p>
        <div className="flex flex-wrap gap-2">
          <button className="px-btn" onClick={loadCloud}>☁️ Laadi pilvesalvestus</button>
          <button className="px-btn px-btn-danger" onClick={() => supabase.auth.signOut()}>🚪 Logi välja</button>
        </div>
      </div>
    );
  }

  // Managed Google sign-in relies on Lovable hosting (/~oauth); hide it on self-hosted domains.
  const googleAvailable = () => typeof window !== "undefined" && /(\.lovable\.app|\.lovableproject\.com|\.lovable\.dev|^localhost)$/.test(window.location.hostname);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const r = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password: pw })
      : await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin, data: { username: name.trim() || email.split("@")[0] } } });
    setBusy(false);
    if (r.error) return toast(r.error.message);
    if (mode === "up" && !r.data.session) toast("Kontrolli e-posti ja kinnita konto ✉️");
  };

  if (SELF_HOSTED) return (
    <form onSubmit={submit} className="max-w-sm space-y-2">
      <H>{mode === "in" ? "Logi sisse" : "Loo konto"}</H>
      <input className="px-panel w-full px-2 py-1" placeholder="Kasutajanimi" autoComplete="username" value={email} maxLength={24} pattern="[A-Za-z0-9_.\-]{3,24}" title="3–24 tähte, numbrit või _ . -" onChange={(e) => setEmail(e.target.value)} required />
      <input className="px-panel w-full px-2 py-1" type="password" placeholder="Parool" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} required />
      <button className="px-btn px-btn-primary" disabled={busy}>{mode === "in" ? "Sisene" : "Registreeru"}</button>
      <button type="button" className="block text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Pole kontot? Registreeru" : "Konto olemas? Logi sisse"}
      </button>
      {mode === "in" && <p className="text-base text-muted-foreground">Unustasid parooli? Palu serveri adminil see lähtestada.</p>}
    </form>
  );

  return (
    <form onSubmit={submit} className="max-w-sm space-y-2">
      <H>{mode === "in" ? "Logi sisse" : "Loo konto"}</H>
      {mode === "up" && <input className="px-panel w-full px-2 py-1" placeholder="Kasutajanimi" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} required />}
      <input className="px-panel w-full px-2 py-1" type="email" placeholder="E-post" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="px-panel w-full px-2 py-1" type="password" placeholder="Parool" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} required />
      <div className="flex flex-wrap gap-2">
        <button className="px-btn px-btn-primary" disabled={busy}>{mode === "in" ? "Sisene" : "Registreeru"}</button>
        {googleAvailable() && <button type="button" className="px-btn" onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })}>G Google</button>}
      </div>
      {!googleAvailable() && <p className="text-base text-muted-foreground">Google'iga sisselogimine töötab ainult mängu ametlikul lehel. Siin kasuta e-posti ja parooli.</p>}
      <button type="button" className="text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Pole kontot? Registreeru" : "Konto olemas? Logi sisse"}
      </button>
      {mode === "in" && <button type="button" disabled={busy} className="block text-muted-foreground underline" onClick={forgot}>Unustasid parooli?</button>}
    </form>
  );
}

function Board({ user }: { user: User | null }) {
  const [rows, setRows] = useState<{ id: string; username: string; score: number; level: number; day: number }[]>([]);
  useEffect(() => {
    // Refresh regularly: a new player's first score upload can land after this tab first opens.
    const load = () => supabase.from("profiles").select("id,username,score,level,day").order("score", { ascending: false }).limit(50).then(({ data }) => setRows(data ?? []));
    load(); const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      <H>Edetabel</H>
      {!rows.length && <p className="text-muted-foreground">Veel pole ellujääjaid kirjas.</p>}
      <ol className="space-y-1">
        {rows.map((r, i) => (
          <li key={r.id} className={`flex justify-between gap-2 ${r.id === user?.id ? "text-accent" : ""}`}>
            <span>{i < 3 ? ["🥇", "🥈", "🥉"][i] : `${i + 1}.`} {r.username}</span>
            <span className="text-muted-foreground">LVL {r.level} · Päev {r.day} · <span className="text-primary">{r.score}</span></span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Clan({ s, mut, user, toast }: { s: GameState; mut: Mut; user: User; toast: (t: string) => void }) {
  const [clans, setClans] = useState<{ id: string; name: string }[]>([]);
  const [mine, setMine] = useState<string | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [stash, setStash] = useState<{ item: string; qty: number }[]>([]);
  const [newName, setNewName] = useState("");

  const refresh = useCallback(async () => {
    const [{ data: cl }, { data: me }] = await Promise.all([
      supabase.from("clans").select("id,name").order("created_at"),
      supabase.from("clan_members").select("clan_id").eq("user_id", user.id).maybeSingle(),
    ]);
    setClans(cl ?? []); setMine(me?.clan_id ?? null);
    if (me?.clan_id) {
      const { data: mem } = await supabase.from("clan_members").select("user_id").eq("clan_id", me.clan_id);
      const ids = (mem ?? []).map((m) => m.user_id);
      const { data: pr } = await supabase.from("profiles").select("username").in("id", ids);
      setMembers((pr ?? []).map((p) => p.username));
      const { data: st } = await supabase.from("clan_stash").select("item,qty").eq("clan_id", me.clan_id);
      setStash(st ?? []);
    }
  }, [user.id]);
  useEffect(() => { refresh(); }, [refresh]);

  const rpc = async (fn: () => PromiseLike<{ error: { message: string } | null }>) => { const { error } = await fn(); if (error) toast(error.message); await refresh(); return !error; };

  if (!mine) return (
    <div className="space-y-2">
      <H>Klannid</H>
      <p className="text-muted-foreground">Liitu klanniga, et jagada ühist varamut teiste ellujääjatega.</p>
      <div className="flex gap-2">
        <input className="px-panel flex-1 px-2 py-1" placeholder="Uue klanni nimi" maxLength={30} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="px-btn px-btn-primary" disabled={newName.trim().length < 2} onClick={() => rpc(() => supabase.rpc("create_clan", { _name: newName }))}>Loo</button>
      </div>
      <ul className="space-y-1">
        {clans.map((c) => <li key={c.id} className="flex justify-between"><span>🛡 {c.name}</span><button className="px-btn" onClick={() => rpc(() => supabase.rpc("join_clan", { _clan: c.id }))}>Liitu</button></li>)}
      </ul>
    </div>
  );

  const clan = clans.find((c) => c.id === mine);
  const deposit = async (id: string) => {
    if (!s.inv[id]) return;
    if (await rpc(() => supabase.rpc("stash_deposit", { _item: id, _qty: 1 }))) mut((g) => { add(g, id, -1); });
  };
  const withdraw = async (id: string) => {
    const { data, error } = await supabase.rpc("stash_withdraw", { _item: id, _qty: 1 });
    if (error || !data) toast("Ei saanud võtta"); else mut((g) => { add(g, id, 1); });
    refresh();
  };
  return (
    <div className="space-y-3">
      <H>🛡 {clan?.name}</H>
      <p className="text-muted-foreground">Liikmed: {members.join(", ")}</p>
      <div>
        <h3 className="text-accent">Ühine varamu (klõpsa, et võtta 1)</h3>
        {!stash.length && <p className="text-muted-foreground">Tühi.</p>}
        <div className="flex flex-wrap gap-1">{stash.map((x) => <button key={x.item} className="px-btn" onClick={() => withdraw(x.item)}>{itemLabel(x.item)} ×{x.qty}</button>)}</div>
      </div>
      <div>
        <h3 className="text-accent">Sinu seljakott (klõpsa, et anda 1)</h3>
        <div className="flex flex-wrap gap-1">{Object.entries(s.inv).map(([k, v]) => <button key={k} className="px-btn" onClick={() => deposit(k)}>{itemLabel(k)} ×{v}</button>)}</div>
      </div>
      <ClanWars mine={mine} clans={clans} toast={toast} onDone={refresh} />
      <button className="px-btn px-btn-danger" onClick={() => confirm("Lahku klannist?") && rpc(() => supabase.rpc("leave_clan"))}>Lahku klannist</button>
    </div>
  );
}

type War = { id: string; attacker_name: string; defender_name: string; won: boolean; loot: string; created_at: string };
function ClanWars({ mine, clans, toast, onDone }: { mine: string; clans: { id: string; name: string }[]; toast: (t: string) => void; onDone: () => void }) {
  const [wars, setWars] = useState<War[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("clan_wars").select("*").order("created_at", { ascending: false }).limit(15);
    setWars((data ?? []) as War[]);
  }, []);
  useEffect(() => { load(); }, [load]);
  const raid = async (id: string, name: string) => {
    if (!confirm(`Rünnata klanni ${name}? Võitja võtab 20% kaotaja varamust.`)) return;
    const { data, error } = await supabase.rpc("clan_raid", { _target: id });
    if (error) return toast(error.message);
    const r = data as { won: boolean; loot: string };
    const loot = r.loot ? r.loot.split(" ").map((x) => { const [i, n] = x.split(":"); return `${itemLabel(i)} ×${n}`; }).join(", ") : "midagi";
    toast(r.won ? `⚔️ Võit! Saite: ${loot}` : `💀 Kaotus! Vaenlane võttis: ${loot}`);
    load(); onDone();
  };
  return (
    <div>
      <h3 className="text-accent">⚔️ Klannisõjad</h3>
      <p className="text-muted-foreground">Ründa teist klanni. Tugevus = liikmete punktid + õnn. Võitja võtab 20% kaotaja varamust. Iga klann saab rünnata kord tunnis.</p>
      <div className="flex flex-wrap gap-1">{clans.filter((c) => c.id !== mine).map((c) => <button key={c.id} className="px-btn" onClick={() => raid(c.id, c.name)}>⚔️ {c.name}</button>)}</div>
      <ul className="mt-2 space-y-1 text-sm">{wars.map((w) => <li key={w.id}>{w.won ? "🏆" : "💀"} {w.attacker_name} → {w.defender_name}: {w.won ? "ründaja võitis" : "kaitsja pidas vastu"}</li>)}</ul>
    </div>
  );
}

function Gifts({ s, mut, user, toast }: { s: GameState; mut: Mut; user: User; toast: (t: string) => void }) {
  const keys = Object.keys(s.inv).filter((k) => s.inv[k] > 0);
  const [to, setTo] = useState(""); const [item, setItem] = useState(keys[0] ?? ""); const [qty, setQty] = useState(1);
  const [sent, setSent] = useState<{ id: string; to_id: string; item: string; qty: number; claimed: boolean }[]>([]);
  const claim = useCallback(async () => {
    const { data } = await supabase.rpc("gift_claim");
    const got = (data ?? []) as { item: string; qty: number; from_name: string }[];
    if (got.length) { mut((g) => { got.forEach((c) => add(g, c.item, c.qty)); }); toast(`🎁 Said kingid: ${got.map((c) => `${itemLabel(c.item)} ×${c.qty} (${c.from_name})`).join(", ")}`); }
    const { data: mine } = await supabase.from("gifts").select("id,to_id,item,qty,claimed").eq("from_id", user.id).order("created_at", { ascending: false }).limit(10);
    setSent(mine ?? []);
  }, [mut, toast, user.id]);
  useEffect(() => { claim(); }, [claim]);
  const send = async () => {
    if ((s.inv[item] || 0) < qty) return toast("Pole piisavalt");
    const { error } = await supabase.rpc("gift_send", { _to: to.trim(), _item: item, _qty: qty });
    if (error) return toast(error.message);
    mut((g) => { add(g, item, -qty); }); toast(`🎁 Saadetud mängijale ${to}!`); claim();
  };
  return (
    <div className="space-y-2">
      <H>🎁 Kingitused</H>
      <p className="text-muted-foreground">Saada teisele mängijale asju otse. Sulle saadetud kingid tulevad seljakotti, kui avad selle lehe.</p>
      <input className="px-panel w-full px-2 py-1" placeholder="Mängija nimi (nagu edetabelis)" value={to} onChange={(e) => setTo(e.target.value)} />
      <div className="flex gap-2">
        <select className="px-panel flex-1 px-2 py-1" value={item} onChange={(e) => setItem(e.target.value)}>{keys.map((k) => <option key={k} value={k}>{itemLabel(k)} ({s.inv[k]})</option>)}</select>
        <input type="number" min={1} max={999} className="px-panel w-20 px-2 py-1" value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value || 1))} />
      </div>
      <div className="flex gap-2"><button className="px-btn px-btn-primary" disabled={!to.trim() || !item} onClick={send}>Saada</button><button className="px-btn" onClick={claim}>🔄 Kontrolli kinke</button></div>
      {!!sent.length && <ul className="text-sm text-muted-foreground">{sent.map((g) => <li key={g.id}>➜ {itemLabel(g.item)} ×{g.qty} {g.claimed ? "✓ kätte saadud" : "… ootel"}</li>)}</ul>}
    </div>
  );
}

type Offer = { id: string; seller_id: string; give_item: string; give_qty: number; want_item: string; want_qty: number; status: string; seller_claimed: boolean };

function Market({ s, mut, user, toast }: { s: GameState; mut: Mut; user: User; toast: (t: string) => void }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const invKeys = Object.keys(s.inv);
  const [give, setGive] = useState(invKeys[0] ?? ""); const [gq, setGq] = useState(1);
  const [want, setWant] = useState("can"); const [wq, setWq] = useState(1);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("market_offers").select("*").or(`status.eq.open,seller_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(100);
    const list = (data ?? []) as Offer[]; setOffers(list);
    const ids = [...new Set(list.map((o) => o.seller_id))];
    if (ids.length) { const { data: pr } = await supabase.from("profiles").select("id,username").in("id", ids); setNames(Object.fromEntries((pr ?? []).map((p) => [p.id, p.username]))); }
    // collect payment for my sold offers
    const { data: claimed } = await supabase.rpc("market_claim");
    if (claimed?.length) { mut((g) => { claimed.forEach((c) => add(g, c.item, c.qty)); }); toast(`Kaup müüdud! Said: ${claimed.map((c) => `${itemLabel(c.item)} ×${c.qty}`).join(", ")}`); }
  }, [user.id, mut, toast]);
  useEffect(() => { refresh(); }, [refresh]);

  const post = async () => {
    if ((s.inv[give] || 0) < gq) return toast("Pole piisavalt");
    const { error } = await supabase.rpc("market_post", { _give: give, _gq: gq, _want: want, _wq: wq });
    if (error) return toast(error.message);
    mut((g) => { add(g, give, -gq); }); refresh();
  };
  const accept = async (o: Offer) => {
    if ((s.inv[o.want_item] || 0) < o.want_qty) return toast(`Vajad ${itemLabel(o.want_item)} ×${o.want_qty}`);
    const { data } = await supabase.rpc("market_accept", { _offer: o.id });
    if (!data) { toast("Pakkumine pole enam saadaval"); return refresh(); }
    mut((g) => { add(g, o.want_item, -o.want_qty); add(g, o.give_item, o.give_qty); }); toast("Tehing tehtud ✓"); refresh();
  };
  const cancel = async (o: Offer) => {
    const { data } = await supabase.rpc("market_cancel", { _offer: o.id });
    if (data) mut((g) => { add(g, o.give_item, o.give_qty); });
    refresh();
  };

  const open = offers.filter((o) => o.status === "open");
  const sel = "px-panel px-2 py-1";
  return (
    <div className="space-y-3">
      <H>Turg</H>
      <div className="flex flex-wrap items-center gap-2">
        <span>Annan</span>
        <input type="number" min={1} max={999} className={`${sel} w-16`} value={gq} onChange={(e) => setGq(Math.max(1, +e.target.value))} />
        <select className={sel} value={give} onChange={(e) => setGive(e.target.value)}>{invKeys.map((k) => <option key={k} value={k}>{itemLabel(k)} ({s.inv[k]})</option>)}</select>
        <span>vastu</span>
        <input type="number" min={1} max={999} className={`${sel} w-16`} value={wq} onChange={(e) => setWq(Math.max(1, +e.target.value))} />
        <select className={sel} value={want} onChange={(e) => setWant(e.target.value)}>{Object.keys(ITEMS).map((k) => <option key={k} value={k}>{itemLabel(k)}</option>)}</select>
        <button className="px-btn px-btn-primary" disabled={!give} onClick={post}>Postita</button>
        <button className="px-btn" onClick={refresh}>↻</button>
      </div>
      {!open.length && <p className="text-muted-foreground">Avatud pakkumisi pole.</p>}
      <ul className="space-y-1">
        {open.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-2">
            <span><span className="text-muted-foreground">{names[o.seller_id] ?? "?"}:</span> {itemLabel(o.give_item)} ×{o.give_qty} → {itemLabel(o.want_item)} ×{o.want_qty}</span>
            {o.seller_id === user.id
              ? <button className="px-btn px-btn-danger" onClick={() => cancel(o)}>Tühista</button>
              : <button className="px-btn px-btn-primary" onClick={() => accept(o)}>Vaheta</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

type PQ = { id: string; poster_id: string; title: string; want_item: string; want_qty: number; reward_item: string; reward_qty: number; status: string; helper_id: string | null };
export function PlayerQuests({ s, mut, user, toast }: { s: GameState; mut: Mut; user: User; toast: (t: string) => void }) {
  const [list, setList] = useState<PQ[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const invKeys = Object.keys(s.inv);
  const [title, setTitle] = useState("");
  const [want, setWant] = useState("crystal"); const [wq, setWq] = useState(1);
  const [reward, setReward] = useState(invKeys.includes("cash") ? "cash" : invKeys[0] ?? ""); const [rq, setRq] = useState(1);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from("player_quests").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(100);
    const l = (data ?? []) as PQ[]; setList(l);
    const ids = [...new Set(l.map((o) => o.poster_id))];
    if (ids.length) { const { data: pr } = await supabase.from("profiles").select("id,username").in("id", ids); setNames(Object.fromEntries((pr ?? []).map((p) => [p.id, p.username]))); }
    const { data: got } = await supabase.rpc("quest_claim");
    if (got?.length) { mut((g) => { got.forEach((c) => add(g, c.item, c.qty)); }); toast(`Sinu tellimus täideti! Said: ${got.map((c) => `${itemLabel(c.item)} ×${c.qty}`).join(", ")}`); }
  }, [mut, toast]);
  useEffect(() => { refresh(); }, [refresh]);

  const post = async () => {
    if (!title.trim()) return toast("Kirjuta, mida vajad");
    if ((s.inv[reward] || 0) < rq) return toast("Sul pole nii palju tasu anda");
    const { error } = await supabase.rpc("quest_post", { _title: title.trim(), _want: want, _wq: wq, _reward: reward, _rq: rq });
    if (error) return toast(error.message.includes("too many") ? "Korraga võib olla 5 avatud tellimust" : error.message);
    mut((g) => { add(g, reward, -rq); }); setTitle(""); toast("Tellimus üles pandud ✓"); refresh();
  };
  const fulfill = async (q: PQ) => {
    if ((s.inv[q.want_item] || 0) < q.want_qty) return toast(`Vajad ${itemLabel(q.want_item)} ×${q.want_qty}`);
    const { data } = await supabase.rpc("quest_fulfill", { _quest: q.id });
    if (!data) { toast("Keegi jõudis ette"); return refresh(); }
    mut((g) => { add(g, q.want_item, -q.want_qty); add(g, q.reward_item, q.reward_qty); }); toast(`Tellimus täidetud! Said ${itemLabel(q.reward_item)} ×${q.reward_qty}`); refresh();
  };
  const cancel = async (q: PQ) => {
    const { data } = await supabase.rpc("quest_cancel", { _quest: q.id });
    if (data) mut((g) => { add(g, q.reward_item, q.reward_qty); });
    refresh();
  };
  const sel = "px-panel px-2 py-1";
  return (
    <div className="space-y-3">
      <p className="text-base text-muted-foreground">Pane üles tellimus — tasu võetakse kohe hoiule. Kui keegi toob asjad, saad need järgmisel korral siia tulles.</p>
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${sel} min-w-48 flex-1`} placeholder="Nt: Vajan kristalle mõõga jaoks" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
        <span>Vajan</span>
        <input type="number" min={1} max={999} className={`${sel} w-16`} value={wq} onChange={(e) => setWq(Math.max(1, +e.target.value))} />
        <select className={sel} value={want} onChange={(e) => setWant(e.target.value)}>{Object.keys(ITEMS).map((k) => <option key={k} value={k}>{itemLabel(k)}</option>)}</select>
        <span>tasu</span>
        <input type="number" min={1} max={999} className={`${sel} w-16`} value={rq} onChange={(e) => setRq(Math.max(1, +e.target.value))} />
        <select className={sel} value={reward} onChange={(e) => setReward(e.target.value)}>{invKeys.map((k) => <option key={k} value={k}>{itemLabel(k)} ({s.inv[k]})</option>)}</select>
        <button className="px-btn px-btn-primary" disabled={!reward} onClick={post}>Pane üles</button>
        <button className="px-btn" onClick={refresh}>↻</button>
      </div>
      {!list.length && <p className="text-muted-foreground">Tahvel on tühi.</p>}
      <ul className="space-y-1">
        {list.map((q) => (
          <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 px-row">
            <span><span className="text-accent">📌 {q.title}</span> <span className="text-muted-foreground">— {names[q.poster_id] ?? "?"}</span><br />
              <span className="text-base">Too {itemLabel(q.want_item)} ×{q.want_qty} → tasu {itemLabel(q.reward_item)} ×{q.reward_qty}</span></span>
            {q.poster_id === user.id
              ? <button className="px-btn px-btn-danger" onClick={() => cancel(q)}>Tühista</button>
              : <button className="px-btn px-btn-primary" disabled={(s.inv[q.want_item] || 0) < q.want_qty} onClick={() => fulfill(q)}>Täida</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Msg = { id: string; clan_id: string | null; user_id: string; username: string; body: string; created_at: string };

function Chat({ user }: { user: User }) {
  const [clan, setClan] = useState<string | null>(null);
  const [chan, setChan] = useState<"global" | "clan">("global");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const clanId = chan === "clan" ? clan : null;

  useEffect(() => {
    supabase.from("clan_members").select("clan_id").eq("user_id", user.id).maybeSingle().then(({ data }) => setClan(data?.clan_id ?? null));
  }, [user.id]);

  useEffect(() => {
    if (chan === "clan" && !clanId) { setMsgs([]); return; }
    let q = supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(60);
    q = clanId ? q.eq("clan_id", clanId) : q.is("clan_id", null);
    q.then(({ data }) => setMsgs(((data ?? []) as Msg[]).reverse()));
    const ch = supabase.channel(`chat-${clanId ?? "global"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => {
        const m = p.new as Msg;
        if ((m.clan_id ?? null) !== clanId) return;
        setMsgs((xs) => (xs.some((x) => x.id === m.id) ? xs : [...xs, m].slice(-100)));
        if (m.user_id !== user.id) blip("chat");
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (p) => setMsgs((xs) => xs.filter((x) => x.id !== (p.old as Msg).id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clanId, chan, user.id]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim().slice(0, 300); if (!body) return;
    setText("");
    const { data } = await supabase.from("chat_messages").insert({ clan_id: clanId, user_id: user.id, username: nameOf(user).slice(0, 24), body }).select().single();
    if (data) setMsgs((xs) => (xs.some((x) => x.id === data.id) ? xs : [...xs, data as Msg]));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <button className={`px-btn ${chan === "global" ? "px-btn-active" : ""}`} onClick={() => setChan("global")}>🌍 Kõik</button>
        <button className={`px-btn ${chan === "clan" ? "px-btn-active" : ""}`} onClick={() => setChan("clan")}>🛡 Klann</button>
      </div>
      {chan === "clan" && !clan ? <p className="text-muted-foreground">Liitu klanniga (🤝 Klann), et klanni vestlust kasutada.</p> : (
        <>
          <div className="flex h-80 flex-col-reverse overflow-y-auto border-2 p-2" aria-live="polite">
            <ul className="space-y-1">
              {!msgs.length && <li className="text-muted-foreground">Raadio on vaikne. Ütle tere!</li>}
              {msgs.map((m) => (
                <li key={m.id} className="group break-words">
                  <span className="text-base text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} </span>
                  <span className={m.user_id === user.id ? "text-accent" : "text-primary"}>{m.username}:</span> {m.body}
                  {m.user_id === user.id && <button className="ml-2 text-base text-muted-foreground opacity-0 group-hover:opacity-100" aria-label="Kustuta" onClick={() => supabase.from("chat_messages").delete().eq("id", m.id).then(() => setMsgs((xs) => xs.filter((x) => x.id !== m.id)))}>✕</button>}
                </li>
              ))}
            </ul>
          </div>
          <form onSubmit={send} className="flex gap-2">
            <input className="px-panel flex-1 px-2 py-1" placeholder="Kirjuta sõnum…" maxLength={300} value={text} onChange={(e) => setText(e.target.value)} />
            <button className="px-btn px-btn-primary" disabled={!text.trim()}>Saada</button>
          </form>
        </>
      )}
    </div>
  );
}

function Week({ s, user }: { s: GameState; user: User | null }) {
  const wk = weeklyFor(s.wk.week || "x-W01");
  const [rows, setRows] = useState<{ user_id: string; username: string; amount: number }[]>([]);
  const load = useCallback(() => {
    if (!s.wk.week) return;
    supabase.from("weekly_contrib").select("user_id,username,amount").eq("week", s.wk.week).order("amount", { ascending: false }).limit(200).then(({ data }) => setRows(data ?? []));
  }, [s.wk.week]);
  useEffect(() => { load(); }, [load]);
  const mine = weeklyContribution(s);
  const total = rows.reduce((a, r) => a + (r.user_id === user?.id ? 0 : r.amount), 0) + mine;
  const p = Math.min(100, (total / wk.goal) * 100);
  return (
    <div className="space-y-2">
      <H>Nädala väljakutse · {s.wk.week}</H>
      <div className="text-xl text-accent">{wk.icon} {wk.name}</div>
      <p className="text-muted-foreground">{wk.desc} Uus väljakutse algab igal esmaspäeval.</p>
      <div className="px-bar text-primary"><span style={{ width: `${p}%` }} /></div>
      <p>Kogukond: <span className="text-primary">{total}</span> / {wk.goal} {total >= wk.goal && "✅ Eesmärk täidetud!"} · Sinu panus: <span className="text-accent">{mine}</span></p>
      {!user && <p className="text-muted-foreground">Logi sisse, et sinu panus loeks kogukonna eesmärki.</p>}
      <h3 className="text-accent">Suurimad panustajad</h3>
      <ol className="space-y-1">
        {rows.slice(0, 10).map((r, i) => <li key={r.user_id} className={`flex justify-between ${r.user_id === user?.id ? "text-accent" : ""}`}><span>{i + 1}. {r.username}</span><span>{r.amount}</span></li>)}
        {!rows.length && <li className="text-muted-foreground">Veel pole keegi panustanud.</li>}
      </ol>
      <button className="px-btn" onClick={load}>↻ Värskenda</button>
    </div>
  );
}
