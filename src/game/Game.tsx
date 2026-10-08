import { AFFIX, RARITY, relicName, scrapRelic, wearRelic, wornRelic, type AffixKey, type Relic } from "./progress";
import { useCallback, useEffect, useRef, useState } from "react";
import { CODEX, CODEX_FINAL, PET_KINDS, ENEMIES, EVENTS, ITEMS, NPCS, RECIPES, REGIONS, SKILLS, STRUCTURES, LORE, applyTekstid, type ItemType, type SkillId } from "./data";
import {
  QUESTS, ACHIEVEMENTS, ENDINGS, hasB, dropItem, chestPut, chestTake, chestCap, chestLoad, armorDef, canStart, capacity, clock, combatAct, durationFor, equipItem, has, hasCompanion, load, loadSave, newGame,
  resolveEvent, save, canTame, tame, feedPet, renamePet, releasePet, kennelSlots, kennelStore, kennelTake, kennelRelease, breedPets, BREED_COST, BREED_COOLDOWN, WEATHER_FX, baseDefense, raidPower, repairStructure, repairCost, startBoss, bossReady, bountyFor, trophyCount, weekKey, isMini, isBoss, intentText, PHASES, MINI_FOR_DANGER, dailyFor, dailyProgress, claimDaily, weeklyFor, weeklyContribution, sealRift, skillLevel, startAction, tick, useItem, weaponDmg, weatherFor, seasonFor, PET_MUTS, wipe, xpForLevel, type GameState, stayAtBase, markInput
} from "./engine";
import { OnlineTab, syncOnline, useOnlineUser, fetchCloudSave, ResetPassword, Account } from "./Online";
import { blip, setScene, soundForLog, type Scene } from "./sound";
import { BarTab } from "./Bar";
import { WorldTab } from "./WorldTab";
import { StoryQuests } from "./StoryQuests";
import { Knowledge } from "./LoreTabs";
import { TodayTab, ExpTab, PerkAndRelics } from "./ProgressTabs";
import { Portrait, BASE_IMG, REGION_IMG, PLAYER_IMG } from "./portraits";
import { TUTORIAL_STEPS } from "./tutorial";
import { Button } from "@/components/ui/button";
import { ArrowDownToLine, Shield, Swords } from "lucide-react";

/** Shows a portrait card the moment the player meets a new survivor. */
function MeetPopup({ s }: { s: GameState }) {
  const seen = useRef<string[] | null>(null);
  const [who, setWho] = useState<string | null>(null);
  useEffect(() => {
    const now = s.npcs.filter((n) => NPCS[n]);
    if (seen.current) { const fresh = now.find((n) => !seen.current!.includes(n)); if (fresh) setWho(fresh); }
    seen.current = now;
  }, [s.npcs.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!who) return null; const n = NPCS[who];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={() => setWho(null)}>
      <div className="px-panel fadein flex max-w-md flex-col items-center gap-2 p-4 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="px-title text-primary">Kohtusid: {n.name}</div>
        <Portrait id={who} icon={n.icon} alt={n.name} size="lg" />
        <div className="text-base text-accent">{n.faction}</div>
        <p className="text-base text-muted-foreground">{n.desc}</p>
        <button className="px-btn" onClick={() => setWho(null)}>Edasi</button>
      </div>
    </div>
  );
}

type Tab = "today" | "exp" | "world" | "base" | "map" | "inv" | "gear" | "craft" | "quests" | "npc" | "pet" | "bar" | "skills" | "ach" | "stats" | "log" | "online" | "settings";
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "today", icon: "☀️", label: "Täna" }, { id: "exp", icon: "🧭", label: "Retked" }, { id: "world", icon: "🌍", label: "Maailm" },
  { id: "base", icon: "🏠", label: "Baas" }, { id: "map", icon: "🗺️", label: "Kaart" },
  { id: "inv", icon: "🎒", label: "Inventar" }, { id: "gear", icon: "🧍", label: "Tegelane" },
  { id: "craft", icon: "🔨", label: "Crafting" }, { id: "quests", icon: "📖", label: "Ülesanded" },
  { id: "npc", icon: "👥", label: "NPC-d" }, { id: "pet", icon: "🐾", label: "Lemmik" }, { id: "bar", icon: "🍺", label: "Baar" },
  { id: "stats", icon: "📊", label: "Statistika" }, { id: "log", icon: "📜", label: "Päevik" },
  { id: "online", icon: "🌐", label: "Mitmikmäng" }, { id: "settings", icon: "⚙️", label: "Seaded" },
];

// Varustus, Oskuspuu and Saavutused share one menu button ("Tegelane") with sub-tabs.
const HERO_TABS: { id: Tab; label: string }[] = [{ id: "gear", label: "⚔️ Varustus" }, { id: "skills", label: "⭐ Oskuspuu" }, { id: "ach", label: "🏆 Saavutused" }];
const isHeroTab = (t: Tab) => t === "gear" || t === "skills" || t === "ach";

const costText = (c: Record<string, number>) => Object.entries(c).map(([k, v]) => `${ITEMS[k].icon}${v}`).join(" ");
const fmt = (sec: number) => (sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60 ? (sec % 60) + "s" : ""}` : `${sec}s`);
const TYPE_LABEL: Record<ItemType, string> = {
  resource: "resurss", food: "toit", drink: "jook", medicine: "meditsiin",
  weapon: "relv", armor: "rüü", head: "müts", boots: "saapad", tool: "tööriist", rare: "haruldane",
};

function useInputTracker() {
  useEffect(() => {
    const f = () => markInput();
    // Hidden tab = player is away right now (no 5-minute wait).
    const vis = () => { if (document.hidden) markInput(0); };
    const ev = ["pointerdown", "keydown", "touchstart", "wheel"];
    ev.forEach((e) => window.addEventListener(e, f, { passive: true }));
    document.addEventListener("visibilitychange", vis);
    return () => { ev.forEach((e) => window.removeEventListener(e, f)); document.removeEventListener("visibilitychange", vis); };
  }, []);
}
// Which ambient scene plays in each region.
const SCENE_FOR: Record<string, Scene> = {
  camp: "camp", forest: "forest", flooded: "water", city: "city", ruins: "ruins", magic: "magic",
  mine: "depths", depths1: "depths", depths2: "depths", depths3: "depths",
  desert: "waste", radiation: "waste", industrial: "waste", mountains: "waste",
};

export default function Game() {
  useInputTracker();
  const [s, setS] = useState<GameState | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [toast, setToast] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [, force] = useState(0);
  const ref = useRef<GameState | null>(null);
  const [recovery, setRecovery] = useState(false);
  const authUser = useOnlineUser(() => setRecovery(true));
  const user = authUser ?? null;
  const signedIn = useRef(false); signedIn.current = !!user;

  // Server save: on sign-in, check the server copy BEFORE uploading, so a fresh device never overwrites progress.
  useEffect(() => {
    if (!user) return;
    let id: ReturnType<typeof setInterval> | undefined; let alive = true;
    // Only the visible tab uploads; a forgotten background tab/device must not overwrite newer progress.
    const push = () => ref.current && document.visibilityState === "visible" && syncOnline(user, ref.current, clock(ref.current).day).catch(() => {});
    (async () => {
      let cloud: GameState | null;
      try { cloud = await fetchCloudSave(user); } catch { if (alive) id = setInterval(push, 30000); return; } // read failed: don't prompt or overwrite right away
      if (!alive) return;
      const local = ref.current;
      const syncedKey = `tuhk-synced-${user.id}`;
      const synced = localStorage.getItem(syncedKey) === "1";
      if (cloud && local && !synced) {
        // First time on this device: take the server save silently (it is the account's progress).
        keepBestPath(cloud, local); ref.current = cloud; save(cloud); setS({ ...cloud });
      } else if (cloud && local && cloud.lastTick > local.lastTick + 60_000) {
        // Played elsewhere since: newer server save wins.
        keepBestPath(cloud, local); ref.current = cloud; save(cloud); setS({ ...cloud });
      } else if (!cloud && !synced) {
        // Brand-new account: start clean, without asking.
        const g = newGame(); ref.current = g; save(g); setS({ ...g });
      }
      localStorage.setItem(syncedKey, "1");
      push(); id = setInterval(push, 30000);
    })();
    const onHide = () => { if (document.visibilityState === "hidden" && ref.current) syncOnline(user, ref.current, clock(ref.current).day).catch(() => {}); };
    document.addEventListener("visibilitychange", onHide);
    return () => { alive = false; if (id) clearInterval(id); document.removeEventListener("visibilitychange", onHide); };
  }, [user]);

  useEffect(() => { applyPrefs(loadPrefs()); }, []);
  // Self-hosted: optional tekstid.json next to index.html overrides names/descriptions without rebuilding.
  useEffect(() => {
    if (import.meta.env.VITE_SELFHOST !== "1") return;
    fetch("tekstid.json", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((t) => { if (t) { applyTekstid(t); setS((g) => (g ? { ...g } : g)); } }).catch(() => {});
  }, []);

  useEffect(() => {
    const g = loadSave() ?? newGame();
    tick(g); ref.current = g; setS({ ...g });
    const id = setInterval(() => {
      if (!ref.current || !signedIn.current) return; // no account = game paused
      tick(ref.current); setS({ ...ref.current }); force((x) => x + 1);
    }, 500);
    const sv = setInterval(() => ref.current && save(ref.current), 5000);
    const onHide = () => ref.current && save(ref.current);
    window.addEventListener("beforeunload", onHide);
    return () => { clearInterval(id); clearInterval(sv); window.removeEventListener("beforeunload", onHide); };
  }, []);

  const mut = useCallback((fn: (g: GameState) => string | null | void) => {
    const g = ref.current; if (!g) return;
    const err = fn(g);
    if (typeof err === "string") { setToast(err); setTimeout(() => setToast(null), 2000); }
    save(g); setS({ ...g });
  }, []);

  const lastLog = s?.log[0]?.t;
  const [notes, setNotes] = useState<{ t: number; text: string; type: string }[]>([]);
  useEffect(() => {
    if (!s || !lastLog || Date.now() - lastLog >= 1500) return;
    const e = s.log[0]; blip(soundForLog(e.type, e.text));
    if (e.type === "good" || e.type === "bad") {
      setNotes((n) => [{ t: e.t, text: e.text, type: e.type }, ...n].slice(0, 3));
      setTimeout(() => setNotes((n) => n.filter((x) => x.t !== e.t)), 5000);
    }
  }, [lastLog]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ambient sound follows where you are; the base plays a slow melody that gets slower at night.
  const isNight = s ? clock(s).night : false;
  const [prefsTick, setPrefsTick] = useState(0);
  useEffect(() => {
    const f = () => setPrefsTick((x) => x + 1);
    window.addEventListener("tuhk-prefs", f);
    return () => { window.removeEventListener("tuhk-prefs", f); setScene("off"); };
  }, []);
  useEffect(() => {
    if (!s) return;
    const sc: Scene = tab === "bar" ? "bar" : SCENE_FOR[s.region] ?? "waste";
    setScene(sc, { music: sc === "camp", night: isNight });
  }, [s?.region, tab, isNight, prefsTick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return <div className="flex min-h-screen items-center justify-center px-title text-primary glow">LAADIN<span className="blink">_</span></div>;

  if (authUser === undefined) return <div className="flex min-h-screen items-center justify-center px-title text-primary glow">LAADIN<span className="blink">_</span></div>;
  if (!user) return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-3">
      <h1 className="px-title text-center text-primary glow">☢ TUHK</h1>
      <p className="text-center text-muted-foreground">Mängimiseks logi sisse või loo konto.</p>
      <div className="px-panel p-3"><Account user={null} onLoadCloud={(g) => { ref.current = g; save(g); setS({ ...g }); }} toast={(m) => { setToast(m); setTimeout(() => setToast(null), 3000); }} /></div>
      {toast && <div className="px-panel p-2 text-center">{toast}</div>}
      {recovery && <ResetPassword onDone={() => setRecovery(false)} />}
    </div>
  );

  const c = clock(s); const w = weatherFor(s); const se = seasonFor(s); const reg = REGIONS[s.region];
  const busy = !canStart(s);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-2 p-2 md:p-3">
      <div className="pointer-events-none fixed right-2 top-2 z-50 flex w-80 max-w-[90vw] flex-col gap-1" aria-live="polite">
        {notes.map((n) => <div key={n.t} className={`px-panel fadein px-3 py-2 text-base ${n.type === "bad" ? "border-destructive text-destructive" : "border-primary text-primary"}`}>{n.text}</div>)}
      </div>
      <MeetPopup s={s} />
      {/* HUD */}
      <header className="px-panel grid min-w-0 items-center gap-3 px-3 py-2 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-2">
          {PLAYER_IMG.tuhk && <img src={PLAYER_IMG.tuhk} alt="Sinu tegelane" loading="lazy" width={256} height={256} className="h-11 w-11 shrink-0 border-2 border-border object-cover" style={{ imageRendering: "pixelated" }} />}
          <div className="min-w-0">
            <h1 className="px-title text-primary glow">☢ TUHK</h1>
            <div className="text-muted-foreground">Päev {c.day} | {c.label} {c.night ? "🌙" : "☀️"} · <span title={WEATHER_FX[w.id]}>{w.icon} {w.name}</span> · <span title={se.fx}>{se.icon} {se.name}</span></div>
            <div className="text-base text-muted-foreground">{WEATHER_FX[w.id]} {se.fx}</div>
          </div>
        </div>
        <div aria-label="Mängija näitajad" className="grid min-w-0 grid-cols-6 items-center gap-2 sm:gap-4 xl:w-[35rem]">
        <Stat icon="❤️" v={s.hp} max={s.maxHp} cls="text-destructive" danger={s.hp < s.maxHp * 0.25} />
        <Stat icon="⚡" v={s.energy} max={100} cls="text-primary" />
        <Stat icon="🍖" v={s.food} max={100} cls="text-food" danger={s.food < 20} />
        <Stat icon="💧" v={s.water} max={100} cls="text-water" danger={s.water < 20} />
        <Stat icon="☣️" v={s.rad} max={100} cls="text-rad" danger={s.rad >= 65} />
        <div className="min-w-0 text-right"><div className="px-title text-accent">LVL {s.level}</div><div className="text-muted-foreground text-base">{s.xp}/{xpForLevel(s.level)} XP</div></div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2 md:flex-row">
        <nav aria-label="Mängu menüü" className="px-panel flex shrink-0 gap-1 overflow-x-auto p-1 md:w-44 md:flex-col md:overflow-visible">
          {TABS.map((t) => (
            <button key={t.id} title={t.label} aria-label={t.label} aria-current={(t.id === "gear" ? isHeroTab(tab) : tab === t.id) ? "page" : undefined} onClick={() => setTab(t.id === "gear" && isHeroTab(tab) ? tab : t.id)} className={`flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded px-2 text-left transition-colors hover:bg-muted ${(t.id === "gear" ? isHeroTab(tab) : tab === t.id) ? "bg-muted text-primary" : "text-muted-foreground"}`}>
              <span aria-hidden="true" className="w-6 shrink-0 text-center">{t.icon}</span><span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>

        <main className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="px-panel px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="px-title text-accent">{reg.icon} {reg.name}</span>
              <span className="text-muted-foreground">Oht: {"☠".repeat(reg.danger) || "turvaline"}</span>
            </div>
            <div className="flex items-start gap-3">
              <p className="flex-1 text-muted-foreground">{reg.desc}</p>
              <MiniMap s={s} />
            </div>
          </div>
          {s.action && <ActionBar s={s} />}
          {s.combat && <Combat s={s} mut={mut} />}
          {s.event && <EventCard s={s} mut={mut} />}
          {toast && <div className="px-panel shake border-destructive px-3 py-2 text-destructive">⚠ {toast}</div>}

          <section key={tab} className="fadein px-panel flex-1 p-3">
            {isHeroTab(tab) && (
              <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Tegelane">
                {HERO_TABS.map((h) => <button key={h.id} role="tab" aria-selected={tab === h.id} className={`px-btn ${tab === h.id ? "px-btn-active" : ""}`} onClick={() => setTab(h.id)}>{h.label}</button>)}
              </div>
            )}
            {tab === "today" && <TodayTab s={s} mut={mut} go={setTab} />}
            {tab === "exp" && <ExpTab s={s} mut={mut} />}
            {tab === "world" && <WorldTab s={s} mut={mut} onNgp={(g) => { ref.current = g; save(g); setS({ ...g }); setTab("today"); }} />}
            {tab === "base" && <BaseTab s={s} mut={mut} busy={busy} />}
            {tab === "map" && <MapTab s={s} mut={mut} busy={busy} />}
            {tab === "inv" && <InvTab s={s} mut={mut} onDetail={setDetail} />}
            {tab === "gear" && <GearTab s={s} mut={mut} onDetail={setDetail} />}
            {tab === "craft" && <CraftTab s={s} mut={mut} busy={busy} onDetail={setDetail} />}
            {tab === "quests" && <QuestTab s={s} mut={mut} />}
            {tab === "npc" && <NpcTab s={s} />}
            {tab === "pet" && <PetTab s={s} mut={mut} />}
            {tab === "bar" && <BarTab s={s} mut={mut} user={user} toast={(m) => { setToast(m); setTimeout(() => setToast(null), 3000); }} />}
            {tab === "skills" && <><PerkAndRelics s={s} mut={mut} /><SkillTab s={s} /></>}
            {tab === "ach" && <AchTab s={s} />}
            {tab === "stats" && <StatsTab s={s} />}
            {tab === "log" && <><Knowledge s={s} /><LogList s={s} n={120} /></>}
            {tab === "online" && <OnlineTab s={s} mut={mut} user={user} toast={(m) => { setToast(m); setTimeout(() => setToast(null), 3000); }} onLoadCloud={(g) => { ref.current = g; save(g); setS({ ...g }); }} />}
            {tab === "settings" && <Settings mut={mut} onToast={(t) => { setToast(t); setTimeout(() => setToast(null), 2000); }} setS={(g) => { ref.current = g; save(g); setS({ ...g }); }} />}
          </section>
        </main>

        <aside className="px-panel p-3 text-[0.75em] leading-snug md:w-80">
          <h2 className="px-title mb-2 text-primary">&gt; Päevik</h2>
          <LogList s={s} n={18} />
        </aside>
      </div>

      {detail && <ItemDetail id={detail} s={s} onClose={() => setDetail(null)} />}
      {recovery && <ResetPassword onDone={() => { setRecovery(false); setToast("Parool muudetud ✅"); setTimeout(() => setToast(null), 3000); }} />}
      {s.lastDeath && <DeathScreen d={s.lastDeath} deaths={s.deaths} onClose={() => mut((g) => { g.lastDeath = null; })} />}
      {s.sealed && !s.seenEnding && <Ending s={s} onClose={() => mut((g) => { g.seenEnding = true; })} />}
    </div>
  );
}

function Stat({ icon, v, max, cls, danger }: { icon: string; v: number; max: number; cls: string; danger?: boolean }) {
  const p = Math.max(0, Math.min(100, (v / max) * 100));
  return (
    <div className={`min-w-0 w-full ${danger ? "danger-flash" : ""}`} title={danger ? "Ohtlikult madal!" : undefined}>
      <div className="flex justify-between text-base"><span>{icon}</span><span>{Math.round(v)}</span></div>
      <div className={`px-bar ${cls}`}><span style={{ width: `${p}%` }} /></div>
    </div>
  );
}

function ActionBar({ s }: { s: GameState }) {
  const a = s.action!; const now = Date.now();
  const p = Math.min(100, ((now - a.start) / (a.end - a.start)) * 100);
  const left = Math.max(0, Math.ceil((a.end - now) / 1000));
  return (
    <div className="px-panel border-primary px-3 py-2">
      <div className="flex justify-between"><span className="text-primary">{a.label}<span className="blink">...</span></span><span>{fmt(left)}</span></div>
      <div className="px-bar mt-1 text-primary"><span style={{ width: `${p}%` }} /></div>
    </div>
  );
}

type Mut = (fn: (g: GameState) => string | null | void) => void;

const ENEMY_IMG: Record<string, string> = Object.fromEntries(Object.entries(import.meta.glob("@/assets/enemies/*.jpg", { eager: true, import: "default" }) as Record<string, string>).map(([k, v]) => [k.split("/").pop()!.replace(".jpg", ""), v]));

function Combat({ s, mut }: { s: GameState; mut: Mut }) {
  const e = ENEMIES[s.combat!.enemy];
  const prev = useRef(s.combat!.hp);
  const [hits, setHits] = useState(0);
  useEffect(() => {
    if (s.combat!.hp < prev.current) setHits((x) => x + 1);
    prev.current = s.combat!.hp;
  }, [s.combat!.hp]);
  return (
    <div className="px-panel border-destructive p-3">
      <div className="flex items-center gap-3">
        <div key={hits} className={`shrink-0 ${hits ? "hit" : ""}`}>
          {ENEMY_IMG[e.id] ? <img src={ENEMY_IMG[e.id]} alt={e.name} className={`border-2 object-cover ${isBoss(e.id) ? "h-36 w-36 border-destructive" : "h-24 w-24 border-border"}`} style={{ imageRendering: "pixelated" }} /> : <span className="text-5xl">{e.icon}</span>}
        </div>
        <div className="flex-1">
          <div className="px-title text-destructive">☠ {e.name}{e.id === "heart" && " — BOSS"}{isMini(e.id) && " — MINIBOSS"}{isBoss(e.id) && (s.combat!.phase ? ` · ${PHASES[s.combat!.phase - 1].name}` : " · FAAS 1")}</div>
          <div className="text-muted-foreground">{e.desc}</div>
          <div className="px-bar mt-1 text-destructive"><span style={{ width: `${(s.combat!.hp / e.hp) * 100}%` }} /></div>
          <div className="text-base">HP {Math.max(0, s.combat!.hp)}/{e.hp} · Kahju ~{e.dmg} · Sinu relv {weaponDmg(s)} · Kaitse {armorDef(s)}</div>
        </div>
      </div>
      {(() => { const it = intentText(s); return it && (
        <div key={s.combat!.hp + s.combat!.intent!} className="pulse mt-2 border-2 border-accent p-2">
          <div className="text-accent">{it.icon} {e.name} {it.text}</div>
          <div className="text-base text-muted-foreground">Vihje: {it.hint}</div>
        </div>
      ); })()}
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="px-btn px-btn-primary" onClick={() => mut((g) => combatAct(g, "attack"))}>⚔️ Ründa</button>
        <button className="px-btn" onClick={() => mut((g) => combatAct(g, "heavy"))}>💥 Raske löök (−6⚡)</button>
        <button className="px-btn" onClick={() => mut((g) => combatAct(g, "defend"))}>🛡️ Kaitse</button>
        <button className="px-btn" disabled={!!s.combat!.special} title="Kord lahingus: 1,5× kahju ja vaenlane jääb käigust ilma" onClick={() => mut((g) => combatAct(g, "special"))}>🌟 Erivõime (−12⚡)</button>
        <button className="px-btn" onClick={() => mut((g) => combatAct(g, "heal"))}>🩹 Ravi ({(s.inv.bandage || 0) + (s.inv.salve || 0)})</button>
        {PET_KINDS[s.combat!.enemy] && <button disabled={!canTame(s)} title="Vaenlane peab olema alla 35% HP ja sul peab olema liha" className="px-btn" onClick={() => mut((g) => tame(g))}>🐾 Taltsuta (🥩1)</button>}
        <button className="px-btn px-btn-danger" onClick={() => mut((g) => combatAct(g, "flee"))}>🏃 Põgene</button>
      </div>
    </div>
  );
}

function EventCard({ s, mut }: { s: GameState; mut: Mut }) {
  const ev = EVENTS.find((e) => e.id === s.event)!;
  return (
    <div className="px-panel border-accent p-3">
      <div className="px-title mb-1 text-accent">! Sündmus</div>
      <p className="mb-2">{ev.text}</p>
      <div className="flex flex-wrap gap-2">
        {ev.choices.map((ch) => <button key={ch.id} className="px-btn" onClick={() => mut((g) => resolveEvent(g, ch.id))}>[{ch.label}]</button>)}
      </div>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) { return <h2 className="px-title mb-2 mt-1 text-primary">&gt; {children}</h2>; }

// ---------- tutorial ----------
const TUT_STEPS = TUTORIAL_STEPS;

function Tutorial({ s, mut }: { s: GameState; mut: Mut }) {
  if (s.tut) return null;
  const done = (id: string) => s.tutorialDone?.includes(id) ?? false;
  const all = TUT_STEPS.every((t) => done(t.id));
  if (all) return null;
  const n = TUT_STEPS.filter((t) => done(t.id)).length;
  return (
    <div className="border-2 border-primary/60 p-3">
      <div className="flex items-center justify-between">
        <span className="px-title text-primary">📌 Esimene päev ({n}/{TUT_STEPS.length})</span>
        <button className="px-btn" onClick={() => mut((g) => { g.tut = true; })}>✕ Peida</button>
      </div>
      <ul className="mt-1 space-y-0.5">
        {TUT_STEPS.map((t) => {
          const d = done(t.id);
          return <li key={t.label} className={`text-base ${d ? "text-muted-foreground line-through" : ""}`}>{d ? "[✓]" : "[ ]"} {t.label}</li>;
        })}
      </ul>
    </div>
  );
}

function BaseTab({ s, mut, busy }: { s: GameState; mut: Mut; busy: boolean }) {
  const reg = REGIONS[s.region];
  const atCamp = s.region === "camp";
  return (
    <div className="space-y-4">
      <Tutorial s={s} mut={mut} />
      <div>
        <H>Laager</H>
        <p className="mb-2 text-base text-muted-foreground">Kogumine, uurimine, jaht ja kalapüük on nüüd 🗺️ Kaardi all — seal, kus sa parajasti oled.</p>
        <div className="flex flex-wrap gap-2">
          {atCamp && <button disabled={busy} className="px-btn" onClick={() => mut((g) => startAction(g, "rest", s.structures.bed ? "🛏️ Magad voodis" : "😴 Puhkad"))}>{s.structures.bed ? "🛏️ Maga" : "😴 Puhka"} (1m)</button>}
          {atCamp && <button disabled={!!s.combat} className="px-btn px-btn-primary" title="Vajuta enne mängust lahkumist — eemal olles ei juhtu sulle midagi" onClick={() => mut(stayAtBase)}>{s.restAway ? "🛏️ Puhkad baasis — võid lahkuda" : "🚪 Jää baasi (lahku mängust)"}</button>}
          {atCamp && !!s.structures.hospital && <button disabled={busy} className="px-btn" title="2 ravimtaime + 1 riie" onClick={() => mut((g) => startAction(g, "heal", "🏨 Ravid end haiglas"))}>🏨 Ravi haiglas ({fmt(durationFor(s, "heal"))})</button>}
          {!atCamp && <button disabled={busy} className="px-btn" onClick={() => mut((g) => startAction(g, "travel", "🚶 Naased laagrisse", "camp"))}>🏕️ Tagasi laagrisse</button>}
        </div>
      </div>
      {hasCompanion(s) && (
        <div className="border-2 border-primary/50 p-2">
          <span className="px-title text-primary">🧒 Väike Tom</span>
          <div className="text-base text-muted-foreground">Tom elab sinu laagris. Kogumine +20% ja võitluses viskab ta vaenlasele kive. Näed teda igal päeval päevikus.</div>
        </div>
      )}
      <div>
        <H>Baas {atCamp ? "" : "(ehitamine ainult laagris)"}</H>
        {BASE_IMG.camp && <img src={BASE_IMG.camp} alt="Laager" className="mb-2 w-full border-2 border-border object-cover" style={{ imageRendering: "pixelated" }} />}
        <DefensePanel s={s} mut={mut} />
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.values(STRUCTURES).map((st) => {
            const lvl = s.structures[st.id] || 0;
            const locked = st.requires && !s.structures[st.requires];
            const maxed = lvl >= st.maxLevel;
            return (
              <div key={st.id} className={`flex gap-2 border-2 p-2 ${lvl ? "border-primary/50" : ""} ${locked ? "opacity-50" : ""}`}>
                {BASE_IMG[st.id] && <img src={BASE_IMG[st.id]} alt={st.name} loading="lazy" className="h-16 w-16 shrink-0 border-2 border-border object-cover" style={{ imageRendering: "pixelated" }} />}
                <div className="min-w-0 flex-1">
                <div className="flex justify-between"><span>{st.icon} {st.name}</span><span className="text-accent">{lvl}/{st.maxLevel}</span></div>
                <div className="text-base text-muted-foreground">{st.desc}</div>
                {locked ? <div className="text-base text-destructive">Vajab: {STRUCTURES[st.requires!].name}</div> : !maxed && (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className={`text-base ${hasB(s, st.cost) ? "" : "text-destructive"}`}>{costText(st.cost)} · {fmt(durationFor(s, "build", st.id))}</span>
                    <button disabled={busy || !atCamp || !hasB(s, st.cost)} className="px-btn" onClick={() => mut((g) => startAction(g, "build", `🏗️ Ehitad: ${st.name}`, st.id))}>{lvl ? "Arenda" : "Ehita"}</button>
                  </div>
                )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RegionActions({ s, mut, busy }: { s: GameState; mut: Mut; busy: boolean }) {
  const reg = REGIONS[s.region];
  const atCamp = s.region === "camp";
  return (
    <div className="mb-4 space-y-4">
      <div>
        <H>Tegevused: {reg.icon} {reg.name}</H>
        {(REGION_IMG[s.region] || (atCamp && BASE_IMG.camp)) && <img src={REGION_IMG[s.region] ?? BASE_IMG.camp} alt={reg.name} loading="lazy" className="mb-2 max-h-48 w-full border-2 border-border object-cover" style={{ imageRendering: "pixelated" }} />}
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} className="px-btn px-btn-primary" onClick={() => mut((g) => startAction(g, "gather", `🔨 Kogud ressursse: ${reg.name}`))}>🪓 Kogu ({fmt(durationFor(s, "gather"))})</button>
          <button disabled={busy} className="px-btn" onClick={() => mut((g) => startAction(g, "explore", `🧭 Uurid ümbrust`))}>🧭 Uuri ({fmt(durationFor(s, "explore"))})</button>
          {s.region === "flooded" && <button disabled={busy} className="px-btn" onClick={() => mut((g) => startAction(g, "fish", "🎣 Püüd kala"))}>🎣 Püüda ({fmt(durationFor(s, "fish"))})</button>}
          {reg.danger > 0 && <button disabled={busy} className="px-btn" onClick={() => mut((g) => startAction(g, "hunt", "🏹 Jahid"))}>🏹 Jahi ({fmt(durationFor(s, "hunt"))})</button>}
          {reg.danger > 0 && <button disabled={busy || !bossReady(s)} title={bossReady(s) ? "Vajab 15 energiat" : "Alistatud — uus koletis homme"} className="px-btn px-btn-danger" onClick={() => mut((g) => startBoss(g))}>👹 {ENEMIES[MINI_FOR_DANGER[reg.danger]].name} {bossReady(s) ? "(−15⚡)" : "✓"}</button>}
        </div>
        <p className="mt-1 text-base text-muted-foreground">Võimalikud leiud: {reg.loot.map(([id]) => ITEMS[id].icon).join(" ")}</p>
      </div>
      {s.region === "magic" && s.inv.sealer ? (
        <div className="border-2 border-magic p-3">
          {REGION_IMG.rift && <img src={REGION_IMG.rift} alt="Lõhe" loading="lazy" className="mb-2 max-h-44 w-full border-2 border-border object-cover" style={{ imageRendering: "pixelated" }} />}
          <div className="px-title text-magic">🌀 LÕHE PITSEERIJA</div>
          <p className="my-1 text-muted-foreground">See on hetk, kogu see teekond oli selleks. Sulge Lõhe. (Lõpetab loo.)</p>
          <button className="px-btn px-btn-primary" onClick={() => { if (confirm("Sulge Lõhe igaveseks? See lõpetab loo.")) mut((g) => sealRift(g)); }}>🌀 Pitseeri Lõhe</button>
        </div>
      ) : s.region === "magic" && (
        <div className="border-2 border-border p-3">
          {REGION_IMG.rift && <img src={REGION_IMG.rift} alt="Lõhe" loading="lazy" className="mb-2 max-h-44 w-full border-2 border-border object-cover" style={{ imageRendering: "pixelated" }} />}
          <p className="text-base text-muted-foreground">💠 Lõhe virvendab siin. Selle sulgemiseks vajad Lõhe Pitseerijat — sepista see laboris Lõhe kildast (sügavustest).</p>
        </div>
      )}    </div>
  );
}

// ---------- world map (visual) ----------
const MAP_POS: Record<string, [number, number]> = {
  camp: [480, 470], forest: [270, 360], ruins: [690, 390], mine: [140, 280],
  mountains: [70, 140], flooded: [470, 220], city: [880, 400], industrial: [950, 250],
  radiation: [900, 80], desert: [730, 190], magic: [560, 60],
  depths1: [180, 430], depths2: [260, 500], depths3: [390, 545],
};

function MapTab({ s, mut, busy }: { s: GameState; mut: Mut; busy: boolean }) {
  const cur = REGIONS[s.region];
  const canGo = (id: string) => s.discovered.includes(id) && id !== s.region && (cur.neighbors.includes(id) || id === "camp");
  const go = (id: string) => mut((g) => startAction(g, "travel", `🚶 Rändad: ${REGIONS[id].name}`, id));
  return (
    <div>
      <RegionActions s={s} mut={mut} busy={busy} />
      <H>Maailma kaart</H>
      <svg viewBox="0 0 1020 590" className="w-full" role="img" aria-label="Maailma kaart">
        {Object.values(REGIONS).flatMap((r) => {
          const [x1, y1] = MAP_POS[r.id];
          return r.neighbors.filter((n) => n > r.id && MAP_POS[n]).map((n) => {
            const [x2, y2] = MAP_POS[n];
            const known = s.discovered.includes(r.id) && s.discovered.includes(n);
            return <line key={`${r.id}-${n}`} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={known ? "var(--border)" : "var(--muted)"} strokeWidth={3} strokeDasharray={known ? undefined : "6 8"} />;
          });
        })}
        {Object.values(REGIONS).map((r) => {
          const [x, y] = MAP_POS[r.id];
          const known = s.discovered.includes(r.id);
          const here = r.id === s.region;
          const travelable = canGo(r.id) && !busy;
          return (
            <g key={r.id} transform={`translate(${x},${y})`} className={travelable ? "cursor-pointer" : ""}
              onClick={() => travelable && go(r.id)}>
              {here && <circle r={30} fill="none" stroke="var(--primary)" strokeWidth={2} className="pulse" />}
              <circle r={22} fill={known ? "var(--card)" : "var(--muted)"} stroke={here ? "var(--primary)" : "var(--border)"} strokeWidth={here ? 4 : 2} />
              <text y={8} textAnchor="middle" fontSize={22}>{known ? r.icon : "❓"}</text>
              <text y={40} textAnchor="middle" fontSize={14} fill={known ? "var(--foreground)" : "var(--muted-foreground)"}>{known ? r.name : "Tundmatu"}</text>
              {known && <text y={56} textAnchor="middle" fontSize={12} fill="var(--destructive)">{"☠".repeat(r.danger)}{r.rad ? " ☢" : ""}</text>}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-base text-muted-foreground">Klõpsa naabruses olevale alale, et sinna rändata. Uuri piirkondi, et avastada uusi alasid.</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {Object.values(REGIONS).filter((r) => canGo(r.id)).map((r) => (
          <button key={r.id} disabled={busy} className="px-btn" onClick={() => go(r.id)}>
            {r.icon} {r.name} ({fmt(r.id === "camp" ? cur.travel || 40 : r.travel)})
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- item detail popup ----------
function sourcesOf(id: string) {
  const regions = Object.values(REGIONS).filter((r) => r.loot.some(([lid]) => lid === id));
  const enemies = Object.values(ENEMIES).filter((e) => e.loot.some(([lid]) => lid === id));
  const recipe = RECIPES.find((r) => r.out === id);
  return { regions, enemies, recipe };
}

function ItemDetail({ id, s, onClose }: { id: string; s: GameState; onClose: () => void }) {
  const it = ITEMS[id];
  if (!it) return null;
  const { regions, enemies, recipe } = sourcesOf(id);
  const stats: string[] = [];
  if (it.dmg) stats.push(`⚔️ Kahju ${it.dmg}`);
  if (it.def) stats.push(`🛡️ Kaitse ${it.def}`);
  if (it.gather) stats.push(`⛏️ Kogumine +${it.gather}`);
  if (it.food) stats.push(`🍖 Toit +${it.food}`);
  if (it.water) stats.push(`💧 Vesi +${it.water}`);
  if (it.heal) stats.push(`❤️ Ravi +${it.heal}`);
  if (it.rad) stats.push(`☣️ Kiirgus ${it.rad > 0 ? "+" : ""}${it.rad}`);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="px-panel fadein max-w-md w-full p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-4xl">{it.icon}</span>
            <div>
              <div className="px-title text-accent">{it.name}</div>
              <div className="text-base text-muted-foreground">{TYPE_LABEL[it.type]}{(s.inv[id] || 0) > 0 && ` · sul: ×${s.inv[id]}`}</div>
            </div>
          </div>
          <button className="px-btn" onClick={onClose}>✕</button>
        </div>
        <p className="mt-2">{it.desc}</p>
        {stats.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{stats.map((t) => <span key={t} className="border-2 px-2 py-0.5 text-base">{t}</span>)}</div>}
        <div className="mt-3 space-y-1 text-base">
          {recipe && <div>🔨 Valmistatav: {costText(recipe.cost)} {recipe.station ? `(vajab ${STRUCTURES[recipe.station].name})` : ""} · {fmt(recipe.time)}</div>}
          {regions.length > 0 && <div>🗺️ Leidub: {regions.map((r) => `${r.icon} ${r.name}`).join(", ")}</div>}
          {enemies.length > 0 && <div>☠️ Saak: {enemies.map((e) => `${e.icon} ${e.name}`).join(", ")}</div>}
          {!recipe && !regions.length && !enemies.length && <div className="text-muted-foreground">Päritolu teadmata.</div>}
        </div>
      </div>
    </div>
  );
}

const TYPE_NAMES: Record<string, string> = { "": "Kõik", resource: "Materjal", food: "Toit", drink: "Jook", medicine: "Ravim", weapon: "Relv", armor: "Rüü", head: "Müts", boots: "Saapad", tool: "Tööriist", rare: "Haruldane" };
const relicAffixes = (r: Relic) => Object.entries(r.affixes).map(([k, v]) => AFFIX[k as AffixKey].label(v!)).join(", ");
function InvTab({ s, mut, onDetail }: { s: GameState; mut: Mut; onDetail: (id: string) => void }) {
  const [q, setQ] = useState(""); const [type, setType] = useState(""); const [sort, setSort] = useState<"name" | "qty" | "type">("type");
  const chestHere = s.region === "camp" && (s.structures.chest || 0) > 0;
  const worn = Object.values(s.equip);
  const items = Object.entries(s.inv)
    .map(([id, n]) => [id, n - (worn.includes(id) ? 1 : 0)] as [string, number])
    .filter(([id, n]) => n > 0 && ITEMS[id] && (!type || ITEMS[id].type === type) && ITEMS[id].name.toLowerCase().includes(q.toLowerCase()))
    .sort(([a, x], [b, y]) => sort === "qty" ? y - x : sort === "name" ? ITEMS[a].name.localeCompare(ITEMS[b].name, "et") : ITEMS[a].type.localeCompare(ITEMS[b].type) || ITEMS[a].name.localeCompare(ITEMS[b].name, "et"));
  return (
    <div>
      <H>Seljakott ({load(s)}/{capacity(s)})</H>
      {load(s) >= capacity(s) && <p className="mb-2 text-destructive">Seljakott on täis! Viska midagi ära (🗑️){chestHere ? " või pane kasti (🧰)" : ""}.</p>}
      <div className="mb-2 flex flex-wrap gap-2">
        <input className="px-panel flex-1 px-2 py-1" placeholder="🔍 Otsi..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Otsi seljakotist" />
        <select className="px-panel px-2 py-1" value={type} onChange={(e) => setType(e.target.value)} aria-label="Tüüp">{Object.entries(TYPE_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="px-panel px-2 py-1" value={sort} onChange={(e) => setSort(e.target.value as "name" | "qty" | "type")} aria-label="Sorteeri"><option value="type">Tüübi järgi</option><option value="name">Nime järgi</option><option value="qty">Koguse järgi</option></select>
      </div>
      {!items.length && <p className="text-muted-foreground">Tühi.</p>}
      <div className="grid gap-1 sm:grid-cols-2">
        {items.map(([id, n]) => {
          const it = ITEMS[id];
          const usable = ["food", "drink", "medicine", "weapon", "armor", "head", "boots", "tool"].includes(it.type);
          return (
            <div key={id} className="flex cursor-pointer items-center gap-2 border-2 p-1 hover:border-primary" onClick={() => onDetail(id)}>
              <span className="text-2xl">{it.icon}</span>
              <div className="min-w-0 flex-1"><div>{it.name} <span className="text-accent">×{n}</span></div><div className="truncate text-base text-muted-foreground">{it.desc}</div></div>
              {usable && <button className="px-btn" onClick={(e) => { e.stopPropagation(); mut((g) => useItem(g, id)); }}>{["weapon", "armor", "head", "boots", "tool"].includes(it.type) ? "Varusta" : "Kasuta"}</button>}
              {chestHere && id !== "cash" && <button className="px-btn" title="Pane kõik kasti" onClick={(e) => { e.stopPropagation(); mut((g) => chestPut(g, id, n)); }}>🧰</button>}
              {id !== "cash" && <button className="px-btn" title="Viska üks ära (Shift = kõik)" aria-label={`Viska ära ${it.name}`} onClick={(e) => { e.stopPropagation(); const all = e.shiftKey || (n > 1 && confirm(`Viska ära kõik ${it.name} ×${n}? (Tühista = ainult 1)`)); mut((g) => dropItem(g, id, all ? n : 1)); }}>🗑️</button>}
            </div>
          );
        })}
      </div>
      <H>📿 Talismanid ({(s.relics || []).filter((r) => r.uid !== s.charm).length})</H>
      {!(s.relics || []).filter((r) => r.uid !== s.charm).length && <p className="text-muted-foreground">Kotis pole talismane.{s.charm ? " Kantav on näha Varustuse all." : ""}</p>}
      <div className="grid gap-1 sm:grid-cols-2">
        {(s.relics || []).filter((r) => r.uid !== s.charm).map((r) => (
          <div key={r.uid} className="flex items-center gap-2 border-2 p-1">
            <div className="min-w-0 flex-1"><div><span className={RARITY[r.rarity].color}>{RARITY[r.rarity].name}</span> {relicName(r)}</div><div className="truncate text-base text-muted-foreground">{relicAffixes(r)}</div></div>
            <button className="px-btn" onClick={() => mut((g) => wearRelic(g, r.uid))}>Kanna</button>
            <button className="px-btn" title="Müü" onClick={() => { if (confirm(`Müüd ${relicName(r)}?`)) mut((g) => scrapRelic(g, r.uid)); }}>🪙</button>
          </div>))}
      </div>
      {(s.structures.chest || 0) > 0 && (<>
        <H>🧰 Kast laagris ({chestLoad(s)}/{chestCap(s)})</H>
        {!chestHere && <p className="mb-1 text-base text-muted-foreground">Kasti saab kasutada ainult laagris. Laagris ehitades ja meisterdades võetakse materjale ka kastist.</p>}
        {chestHere && <button className="px-btn mb-2" onClick={() => mut((g) => { Object.keys(g.inv).filter((k) => ITEMS[k]?.type === "resource").forEach((k) => chestPut(g, k, g.inv[k])); })}>Pane kõik materjalid kasti</button>}
        {!Object.keys(s.stash || {}).length && <p className="text-muted-foreground">Kast on tühi.</p>}
        <div className="grid gap-1 sm:grid-cols-2">
          {Object.entries(s.stash || {}).map(([id, n]) => (
            <div key={id} className="flex items-center gap-2 border-2 p-1">
              <span className="text-2xl">{ITEMS[id]?.icon}</span>
              <div className="flex-1">{ITEMS[id]?.name} <span className="text-accent">×{n}</span></div>
              {chestHere && <><button className="px-btn" onClick={() => mut((g) => chestTake(g, id, 1))}>Võta 1</button><button className="px-btn" onClick={() => mut((g) => chestTake(g, id, n))}>Kõik</button></>}
            </div>))}
        </div>
      </>)}
      <p className="mt-2 text-base text-muted-foreground">Klõpsa esemele, et näha üksikasju.</p>
    </div>
  );
}

function GearTab({ s, mut, onDetail }: { s: GameState; mut: Mut; onDetail: (id: string) => void }) {
  const slots = [["head", "Müts", "🧢"], ["weapon", "Relv", "🗡️"], ["armor", "Rüü", "🛡️"], ["boots", "Saapad", "🥾"], ["tool", "Tööriist", "⛏️"]] as const;
  const relic = wornRelic(s);
  const equipped = slots.filter(([k]) => s.equip[k]).length + (relic ? 1 : 0);
  return (
    <div className="min-w-0">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
        <H>Varustus</H><span className="text-base text-muted-foreground">{equipped} / 6 kantud</span>
      </div>
      <div className="mb-5 grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[128px_minmax(0,1fr)]">
        {PLAYER_IMG.tuhk && <img src={PLAYER_IMG.tuhk} alt="Tuhk" className="aspect-square w-full border-2 border-border object-cover" />}
        <div className="min-w-0">
          <h3 className="px-title mb-3 text-foreground">TUHK <span className="font-term text-base text-muted-foreground">· Tase {s.level}</span></h3>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <div className="flex items-center gap-2 text-accent"><Swords size={22} /><div><div className="text-base text-muted-foreground">Kahju</div><strong className="text-3xl font-normal">{weaponDmg(s)}</strong></div></div>
            <div className="flex items-center gap-2 text-primary"><Shield size={22} /><div><div className="text-base text-muted-foreground">Kaitse</div><strong className="text-3xl font-normal">{armorDef(s)}</strong></div></div>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {slots.map(([k, label, icon]) => {
          const id = s.equip[k]; const item = id ? ITEMS[id] : null;
          const options = Object.keys(s.inv).filter((x) => ITEMS[x]?.type === k && x !== id);
          return (
            <section key={k} className={`flex min-w-0 flex-col border bg-card p-3 ${item ? "border-primary/50" : "border-border"}`}>
              <div className="mb-3 flex items-center justify-between gap-2"><h3 className="px-title text-muted-foreground">{label}</h3><span className={`text-sm ${item ? "text-primary" : "text-muted-foreground"}`}>{item ? "● KANTUD" : "○ TÜHI"}</span></div>
              <div className="flex min-h-20 min-w-0 items-center gap-3">
                <span className={`flex h-16 w-16 shrink-0 items-center justify-center border text-4xl ${item ? "border-primary/30 bg-primary/10" : "border-border bg-muted text-muted-foreground"}`}>{item?.icon ?? icon}</span>
                <div className="min-w-0 flex-1">
                  {item && id ? <Button variant="link" className="h-auto max-w-full justify-start whitespace-normal p-0 text-left font-term text-xl leading-tight" onClick={() => onDetail(id)}>{item.name}</Button> : <p className="text-lg text-muted-foreground">Varustamata</p>}
                  {item && <p className="mt-1 text-base text-accent">{item.dmg ? `Kahju +${item.dmg}` : item.def ? `Kaitse +${item.def}` : `Kogumine +${item.gather}`}</p>}
                </div>
                {item && <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" title="Võta ära" aria-label={`Võta ära: ${item.name}`} onClick={() => mut((g) => { g.equip[k] = null; })}><ArrowDownToLine /></Button>}
              </div>
              <div className="mt-3 border-t border-border pt-2">
                <p className="mb-2 text-sm text-muted-foreground">SELJAKOTIS · {options.length}</p>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((o) => <Button key={o} variant="outline" size="sm" className="h-auto min-h-8 max-w-full whitespace-normal text-left font-term text-base" title={ITEMS[o].desc} onClick={() => mut((g) => equipItem(g, o))}>{ITEMS[o].icon} {ITEMS[o].name}</Button>)}
                  {!options.length && <span className="text-base text-muted-foreground">—</span>}
                </div>
              </div>
            </section>
          );
        })}
        <section className={`flex min-w-0 flex-col border bg-card p-3 ${relic ? "border-magic/50" : "border-border"}`}>
          <div className="mb-3 flex items-center justify-between gap-2"><h3 className="px-title text-muted-foreground">Talisman</h3><span className={`text-sm ${relic ? "text-magic" : "text-muted-foreground"}`}>{relic ? "● KANTUD" : "○ TÜHI"}</span></div>
          <div className="flex min-h-20 items-center gap-3"><span className="flex h-16 w-16 shrink-0 items-center justify-center border border-magic/30 bg-magic/10 text-4xl">📿</span><div className="min-w-0 flex-1">{relic ? <><p className={`text-sm ${RARITY[relic.rarity].color}`}>{RARITY[relic.rarity].name}</p><p className="text-xl leading-tight">{relicName(relic)}</p><p className="mt-1 text-base text-magic">{relicAffixes(relic)}</p></> : <p className="text-lg text-muted-foreground">Varustamata</p>}</div>{relic && <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" title="Võta ära" aria-label="Võta talisman ära" onClick={() => mut((g) => wearRelic(g, null))}><ArrowDownToLine /></Button>}</div>
        </section>
      </div>
    </div>
  );
}

function CraftTab({ s, mut, busy, onDetail }: { s: GameState; mut: Mut; busy: boolean; onDetail: (id: string) => void }) {
  return (
    <div>
      <H>Valmistamine</H>
      <details className="mb-3 border-2 p-2"><summary className="cursor-pointer text-accent">🌳 Näita valmistamise puud</summary><CraftTree s={s} onDetail={onDetail} /></details>
      <div className="grid gap-2 sm:grid-cols-2">
        {RECIPES.map((r) => {
          const it = ITEMS[r.out];
          const stationOk = !r.station || s.structures[r.station];
          return (
            <div key={r.id} className={`border-2 p-2 ${stationOk ? "" : "opacity-50"}`}>
              <div><span className="cursor-pointer hover:text-primary" onClick={() => onDetail(r.out)}>{it.icon} {it.name}</span> {r.qty > 1 && `×${r.qty}`}</div>
              <div className="text-base text-muted-foreground">{it.desc}</div>
              {!stationOk ? <div className="text-base text-destructive">Vajab: {STRUCTURES[r.station!].icon} {STRUCTURES[r.station!].name}</div> : (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className={`text-base ${hasB(s, r.cost) ? "" : "text-destructive"}`}>{costText(r.cost)} · {fmt(durationFor(s, "craft", r.id))}</span>
                  <button disabled={busy || !hasB(s, r.cost)} className="px-btn" onClick={() => mut((g) => startAction(g, "craft", `🔨 Valmistad: ${it.name}`, r.id))}>Tee</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestTab({ s, mut }: { s: GameState; mut: Mut }) {
  const wk = weeklyFor(s.wk.week || "x-W01");
  return (
    <div>
      <H>Päevased ülesanded (päev {s.daily.day})</H>
      <ul className="mb-3 space-y-1">
        {dailyFor(s.daily.day).map((q) => {
          const p = Math.min(q.n, dailyProgress(s, q)); const claimed = s.daily.claimed.includes(q.id);
          return (
            <li key={q.id} className={`flex flex-wrap items-center gap-2 px-row ${claimed ? "text-muted-foreground" : ""}`}>
              <span className="flex-1">{q.icon} {q.name} <span className="text-accent">{p}/{q.n}</span> <span className="text-base text-muted-foreground">· {costText(q.reward)} +{q.xp} XP</span></span>
              {claimed ? <span className="text-primary">[✓]</span> : <button disabled={p < q.n} className="px-btn px-btn-primary" onClick={() => mut((g) => claimDaily(g, q.id))}>Võta tasu</button>}
            </li>
          );
        })}
      </ul>
      <p className="mb-3 text-base text-muted-foreground">🗓️ Nädala väljakutse: {wk.icon} {wk.name} — sinu panus {weeklyContribution(s)}. Vaata kogu kogukonna edenemist: 🌐 Mitmikmäng → Nädal.</p>
      <StoryQuests s={s} mut={mut} />
      <H>Ülesanded</H>
      <ul className="space-y-1">
        {QUESTS.map((q) => { const d = q.done(s); return (
          <li key={q.id} className={`border-2 p-2 ${d ? "border-primary/50 text-muted-foreground" : ""}`}>
            <span className={d ? "text-primary" : "text-accent"}>{d ? "[✓]" : "[ ]"}</span> {q.name} — <span className="text-muted-foreground">{q.desc}</span>
          </li>); })}
      </ul>
      <H>Koidiku arhiiv ({s.codex.length}/{CODEX.length})</H>
      <p className="mb-2 text-base text-muted-foreground">Uuri piirkondi (🧭), et leida Projekt KOIDIKu fragmente — igas piirkonnas on üks. Terminalilogisid loetud: {s.lore}/{LORE.length}</p>
      <div className="grid gap-1 sm:grid-cols-2">
        {CODEX.map((f, i) => {
          const got = s.codex.includes(f.id); const r = REGIONS[f.region];
          return (
            <details key={f.id} className={`border-2 p-2 ${got ? "border-magic/60" : "opacity-60"}`}>
              <summary className="cursor-pointer">{got ? "📼" : "🔒"} #{i + 1} {got ? f.title : "???"} <span className="text-base text-muted-foreground">· {r.icon} {s.discovered.includes(f.region) ? r.name : "tundmatu ala"}</span></summary>
              <p className="mt-1 text-base text-magic">{got ? f.text : "Fragment on veel leidmata."}</p>
            </details>
          );
        })}
      </div>
      {s.codex.length >= CODEX.length && <div className="mt-2 border-2 border-magic p-3 text-magic">🔓 {CODEX_FINAL}</div>}
    </div>
  );
}

// ---------- minimap / compass ----------
function MiniMap({ s }: { s: GameState }) {
  const [cx, cy] = MAP_POS[s.region];
  const nb = REGIONS[s.region].neighbors.filter((n) => MAP_POS[n]);
  const dir = (n: string) => {
    const [x, y] = MAP_POS[n]; const a = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
    return ["P", "KI", "I", "KaI", "L", "KaL", "Lä", "LoE"][Math.round(((a + 360) % 360) / 45) % 8];
  };
  return (
    <div className="shrink-0 text-center" aria-label="Kompass">
      <svg viewBox="-60 -60 120 120" className="h-24 w-24">
        <circle r={56} fill="var(--card)" stroke="var(--border)" strokeWidth={2} />
        <text y={-44} textAnchor="middle" fontSize={11} fill="var(--primary)">P</text>
        {nb.map((n) => {
          const [x, y] = MAP_POS[n]; const dx = x - cx, dy = y - cy; const L = Math.hypot(dx, dy) || 1;
          const px = (dx / L) * 34, py = (dy / L) * 34; const known = s.discovered.includes(n);
          return (
            <g key={n}>
              <line x1={0} y1={0} x2={px} y2={py} stroke={known ? "var(--primary)" : "var(--muted)"} strokeWidth={2} strokeDasharray={known ? undefined : "3 3"} />
              <text x={px * 1.25} y={py * 1.25 + 5} textAnchor="middle" fontSize={14}><title>{known ? `${REGIONS[n].name} (${dir(n)})` : "Tundmatu"}</title>{known ? REGIONS[n].icon : "❓"}</text>
            </g>
          );
        })}
        <circle r={7} fill="var(--primary)" className="pulse" />
      </svg>
      <div className="text-base text-muted-foreground">{nb.filter((n) => s.discovered.includes(n)).map((n) => `${REGIONS[n].icon}${dir(n)}`).join(" ")}</div>
    </div>
  );
}

function DefensePanel({ s, mut }: { s: GameState; mut: Mut }) {
  const dmg = Object.entries(s.damaged || {}).filter(([, n]) => n > 0);
  const c = clock(s); const def = baseDefense(s); const atk = Math.round(raidPower(c.day));
  const safe = def >= atk + 5; const risky = def >= atk;
  const prod: string[] = [];
  if (s.structures.collector) prod.push(`💧 ${s.structures.collector}${weatherFor(s).id === "rain" ? "×2" : ""}`);
  if (s.structures.garden) prod.push(`🫐 ${s.structures.garden}`);
  if (s.structures.smokehouse) prod.push(`🥩→🍖 ${s.structures.smokehouse}`);
  if (s.structures.generator) prod.push("🔩 1");
  return (
    <div className="mb-2 grid gap-2 border-2 p-2 sm:grid-cols-2">
      <div>
        <div className="text-accent">🛡️ Kaitse {def} vs rünnak ~{atk}–{atk + 5}</div>
        <div className={`text-base ${safe ? "text-primary" : risky ? "text-accent" : "text-destructive"}`}>{safe ? "Baas on täna öösel kindel." : risky ? "Võib vastu pidada — juhuse küsimus." : "Ohtlik! Ehita seinu, torne või kahureid."}</div>
        <div className="text-base text-muted-foreground">Rünnakuid: {s.stats.raids}. Rünnakud tulevad umbes igal kolmandal ööl. Kaotus lõhub hooneid — need jäävad alles, aga ei tööta enne parandamist.</div>
        {dmg.length > 0 && <div className="mt-1 space-y-1">
          <div className="text-destructive">🔧 Lõhutud hooned</div>
          {dmg.map(([id, n]) => (
            <div key={id} className="flex flex-wrap items-center gap-2 text-base">
              <span>{STRUCTURES[id]?.icon} {STRUCTURES[id]?.name} ({n} taset katki)</span>
              <button className="px-btn" title="Parandamine kulutab 5 energiat" onClick={() => mut((g) => repairStructure(g, id))}>Paranda: {Object.entries(repairCost(id)).map(([k, v]) => `${ITEMS[k]?.icon}${v}`).join(" ")}</button>
            </div>
          ))}
        </div>}
      </div>
      <div>
        <div className="text-accent">🏆 Trofeesein ({trophyCount(s)})</div>
        <div className="text-base text-muted-foreground">{Object.keys(s.trophies || {}).length ? Object.entries(s.trophies).map(([id, n]) => `${ENEMIES[id]?.icon}×${n}`).join(" ") : "Tühi. Alista minibosse!"} · +{Math.min(10, trophyCount(s))} kaitset</div>
        <div className="text-base text-muted-foreground">🪤 Lõkse: {s.inv.trap || 0} (valmista töölaual) · {hasCompanion(s) ? "🧒 Tom parandab igal ööl ühe katkise hoone." : ""}</div>
        <div className="text-accent">⚙️ Tootmine (iga 2 min)</div>
        <div className="text-base text-muted-foreground">{prod.length ? prod.join(" · ") : "Ehita vihmakoguja, peenar või suitsuahi."}</div>
      </div>
    </div>
  );
}

function StatsTab({ s }: { s: GameState }) {
  const c = clock(s);
  const rows: [string, string | number][] = [
    ["📅 Päevi elatud", c.day], ["⭐ Tase", s.level], ["⚔️ Vaenlasi alistatud", s.kills], ["💀 Surmasid", s.deaths],
    ["🪓 Kogumiskordi", s.stats.gathered], ["🧭 Uurimiskordi", s.stats.explored], ["🚶 Rännakuid", s.stats.traveled],
    ["🔨 Valmistatud", s.stats.crafted], ["🏗️ Ehitatud/arendatud", s.stats.built], ["🎣 Kalapüüke", s.stats.fished],
    ["🌙 Öiseid rünnakuid", s.stats.raids], ["👹 Minibosse alistatud", s.stats.bosses || 0], ["🗺️ Avastatud alad", `${s.discovered.length}/${Object.keys(REGIONS).length}`],
    ["📜 Logisid loetud", `${s.lore}/${LORE.length}`], ["🏆 Saavutusi", `${s.ach.length}/${ACHIEVEMENTS.length}`],
  ];
  return (
    <div>
      <H>Statistika</H>
      <div className="grid gap-1 sm:grid-cols-2">
        {rows.map(([l, v]) => <div key={l} className="flex justify-between border-2 px-2 py-1"><span>{l}</span><span className="text-accent">{v}</span></div>)}
      </div>
    </div>
  );
}

function PetTab({ s, mut }: { s: GameState; mut: Mut }) {
  return <div className="space-y-4"><ActivePet s={s} mut={mut} /><Kennel s={s} mut={mut} /></div>;
}
const petIcon = (p: { kind: string; kind2?: string; mut?: string }) => PET_KINDS[p.kind].icon + (p.kind2 ? PET_KINDS[p.kind2].icon : "") + (p.mut && PET_MUTS[p.mut] ? PET_MUTS[p.mut].icon : "");
function Kennel({ s, mut }: { s: GameState; mut: Mut }) {
  const [a, setA] = useState<number | null>(null); const [b, setB] = useState<number | null>(null);
  const slots = kennelSlots(s);
  const all = [...(s.pet ? [{ i: -1, p: s.pet }] : []), ...s.kennel.map((p, i) => ({ i, p }))];
  const wait = Math.max(0, BREED_COOLDOWN - (Date.now() - s.lastBreed));
  const pick = (i: number) => { if (a === i) setA(null); else if (b === i) setB(null); else if (a == null) setA(i); else setB(i); };
  return (
    <div>
      <H>Kennel ja aretus ({s.kennel.length}/{slots} kohta)</H>
      {!slots ? <p className="text-muted-foreground">Ehita laagrisse 🏠 Kennel, et hoida mitut lemmikut ja neid aretada.</p> : (
        <>
          {s.pet && <button className="px-btn mb-2" onClick={() => mut((g) => kennelStore(g))}>🏠 Pane {s.pet.name} kennelisse</button>}
          <ul className="mb-3 space-y-1">
            {s.kennel.map((p, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-row">
                <span className="flex items-center gap-2"><Portrait id={p.kind} icon={petIcon(p)} alt={p.name} size="sm" />{p.name} <span className="text-accent">LVL {p.lvl}</span>{p.kind2 && <span className="text-base text-muted-foreground"> · {PET_KINDS[p.kind].name} + {PET_KINDS[p.kind2].name}</span>}</span>
                <span className="flex gap-1">
                  <button className="px-btn" onClick={() => mut((g) => kennelTake(g, i))}>Võta kaasa</button>
                  <button className="px-btn px-btn-danger" onClick={() => confirm(`Lase ${p.name} vabaks?`) && mut((g) => kennelRelease(g, i))}>✕</button>
                </span>
              </li>
            ))}
          </ul>
          <h3 className="text-accent">🍼 Aretus</h3>
          <p className="mb-2 text-base text-muted-foreground">Vali kaks vanemat (vähemalt LVL 3). Kutsikas pärib ühe vanema liigi ja teise vanema võime — nii saad näiteks hundi, kes ka maaki nuusib. Sama liigi vanemad annavad tugevama algtaseme. Hind: {costText(BREED_COST)} · laagris · kord mängupäevas. Kutsikas läheb kennelisse.</p>
          <div className="mb-2 flex flex-wrap gap-1">
            {all.map(({ i, p }) => (
              <button key={i} className={`px-btn ${a === i || b === i ? "px-btn-active" : ""}`} disabled={p.lvl < 3} onClick={() => pick(i)}>{petIcon(p)} {p.name} ({p.lvl})</button>
            ))}
          </div>
          <button className="px-btn px-btn-primary" disabled={a == null || b == null || wait > 0} onClick={() => { mut((g) => breedPets(g, a!, b!)); setA(null); setB(null); }}>
            {wait > 0 ? `Puhkavad veel ${Math.ceil(wait / 60000)} min` : "Areta"}
          </button>
        </>
      )}
    </div>
  );
}
function ActivePet({ s, mut }: { s: GameState; mut: Mut }) {
  const [name, setName] = useState("");
  if (!s.pet) return (
    <div>
      <H>Lemmik</H>
      <p className="text-muted-foreground">Sul pole veel lemmikut. Nõrgesta võitluses loom alla 35% elust ja vajuta 🐾 Taltsuta (vajad toorest või küpsetatud liha).</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {Object.values(PET_KINDS).map((k) => (
          <div key={k.id} className="flex gap-3 border-2 p-2"><Portrait id={k.id} icon={k.icon} alt={k.name} size="sm" /><div><div className="text-xl">{k.name}</div><div className="text-base text-accent">{k.perk}</div><div className="text-base text-muted-foreground">Leidub: {Object.values(REGIONS).filter((r) => r.enemies.includes(k.id)).map((r) => r.name).join(", ")}</div></div></div>
        ))}
      </div>
    </div>
  );
  const k = PET_KINDS[s.pet.kind]; const need = s.pet.lvl * 15;
  return (
    <div className="space-y-3">
      <H>Lemmik</H>
      <div className="flex items-center gap-3 border-2 border-primary/50 p-3">
        <Portrait id={s.pet.kind} icon={petIcon(s.pet)} alt={s.pet.name} />
        <div className="flex-1">
          <div className="px-title text-primary">{s.pet.name} <span className="text-accent">LVL {s.pet.lvl}</span></div>
          <div className="text-base text-muted-foreground">{k.name} · {k.desc}</div>
          <div className="text-base text-accent">{k.perk}</div>
          {s.pet.mut && PET_MUTS[s.pet.mut] && <div className="text-base text-magic">🧬 {PET_MUTS[s.pet.mut].icon} {PET_MUTS[s.pet.mut].name}: {PET_MUTS[s.pet.mut].perk}</div>}
          {s.pet.kind2 && <div className="text-base text-accent">{PET_KINDS[s.pet.kind2].icon} Päritud: {PET_KINDS[s.pet.kind2].perk}</div>}
          <div className="px-bar mt-1 text-primary"><span style={{ width: `${(s.pet.xp / need) * 100}%` }} /></div>
          <div className="text-base text-muted-foreground">{s.pet.xp}/{need} XP — kasvab koos kogumise, võitluse ja toitmisega.</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="px-btn px-btn-primary" onClick={() => mut((g) => feedPet(g))}>🍖 Toida (🥩/🍖/🐟)</button>
        <input className="px-panel px-2 py-1" placeholder="Uus nimi" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="px-btn" disabled={!name.trim()} onClick={() => { mut((g) => renamePet(g, name)); setName(""); }}>✏️ Nimeta</button>
        <button className="px-btn px-btn-danger" onClick={() => confirm("Lase lemmik vabaks?") && mut((g) => releasePet(g))}>Lase vabaks</button>
      </div>
    </div>
  );
}

// ---------- crafting tree ----------
function CraftTree({ s, onDetail }: { s: GameState; onDetail: (id: string) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const tier: Record<string, number> = {};
  const tierOf = (id: string, seen = new Set<string>()): number => {
    if (tier[id] !== undefined) return tier[id];
    const r = RECIPES.find((x) => x.out === id);
    if (!r || seen.has(id)) return (tier[id] = 0);
    seen.add(id);
    return (tier[id] = 1 + Math.max(...Object.keys(r.cost).map((c) => tierOf(c, seen))));
  };
  const ids = [...new Set(RECIPES.flatMap((r) => [r.out, ...Object.keys(r.cost)]))];
  ids.forEach((i) => tierOf(i));
  const cols: string[][] = [];
  ids.forEach((i) => { (cols[tier[i]] ??= []).push(i); });
  const CW = 170, RH = 44, H0 = Math.max(...cols.map((c) => c.length)) * RH + 20;
  const pos: Record<string, [number, number]> = {};
  cols.forEach((c, x) => c.forEach((id, y) => { pos[id] = [20 + x * CW, 20 + y * RH + ((H0 - 20 - c.length * RH) / 2)]; }));
  const edges = RECIPES.flatMap((r) => Object.keys(r.cost).map((c) => ({ from: c, to: r.out })));
  const related = (id: string) => !sel || id === sel || edges.some((e) => (e.from === sel && e.to === id) || (e.to === sel && e.from === id));
  return (
    <div className="overflow-x-auto">
      <svg width={cols.length * CW + 20} height={H0} role="img" aria-label="Valmistamise puu">
        {edges.map((e, i) => {
          const [x1, y1] = pos[e.from], [x2, y2] = pos[e.to]; const hot = sel && (e.from === sel || e.to === sel);
          return <path key={i} d={`M${x1 + 140},${y1 + 15} C${x1 + 160},${y1 + 15} ${x2 - 20},${y2 + 15} ${x2},${y2 + 15}`} fill="none"
            stroke={hot ? "var(--primary)" : "var(--border)"} strokeWidth={hot ? 2.5 : 1} opacity={sel && !hot ? 0.15 : 0.8} />;
        })}
        {ids.map((id) => {
          const [x, y] = pos[id]; const r = RECIPES.find((q) => q.out === id); const it = ITEMS[id];
          const owned = (s.inv[id] || 0) > 0; const ok = r && hasB(s, r.cost) && (!r.station || s.structures[r.station]);
          return (
            <g key={id} transform={`translate(${x},${y})`} className="cursor-pointer" opacity={related(id) ? 1 : 0.25}
              onClick={() => setSel(sel === id ? null : id)} onDoubleClick={() => onDetail(id)}>
              <rect width={140} height={30} fill="var(--card)" stroke={sel === id ? "var(--accent)" : ok ? "var(--primary)" : "var(--border)"} strokeWidth={sel === id || ok ? 2 : 1} />
              <text x={8} y={20} fontSize={13} fill={owned ? "var(--accent)" : "var(--foreground)"}>{it.icon} {it.name.slice(0, 14)}</text>
            </g>
          );
        })}
      </svg>
      <p className="text-base text-muted-foreground">Vasakul toorained, paremal kõrgemad esemed. Klõpsa, et näha seoseid; topeltklõps avab detailid. Roheline raam = saad kohe valmistada, oranž tekst = sul on olemas.</p>
    </div>
  );
}

function NpcTab({ s }: { s: GameState }) {
  const list = s.npcs.filter((n) => NPCS[n]);
  return (
    <div>
      <H>Ellujäänud</H>
      {!list.length && <p className="text-muted-foreground">Sa oled veel üksi. Uuri maailma, et leida teisi.</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((id) => { const n = NPCS[id]; return (
          <div key={id} className="flex gap-3 border-2 p-2"><Portrait id={id} icon={n.icon} alt={n.name} /><div><div className="text-xl">{n.name}</div><div className="text-base text-accent">{n.faction}</div><div className="text-base text-muted-foreground">{n.desc}</div></div></div>
        ); })}
      </div>
    </div>
  );
}

function SkillTab({ s }: { s: GameState }) {
  return (
    <div>
      <H>Oskused</H>
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(SKILLS) as SkillId[]).map((k) => {
          const xp = s.skills[k]; const l = skillLevel(xp); const next = l * l * 10; const prev = (l - 1) * (l - 1) * 10;
          return (
            <div key={k} className="border-2 p-2">
              <div className="flex justify-between"><span>{SKILLS[k].icon} {SKILLS[k].name}</span><span className="text-accent">Lv {l}</span></div>
              <div className="px-bar my-1 text-primary"><span style={{ width: `${((xp - prev) / (next - prev)) * 100}%` }} /></div>
              <div className="text-base text-muted-foreground">{SKILLS[k].desc}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-muted-foreground">Tapetud: {s.kills} · Surmad: {s.deaths} · Avastatud alad: {s.discovered.length}/{Object.keys(REGIONS).length}</p>
    </div>
  );
}

function AchTab({ s }: { s: GameState }) {
  const unlocked = ACHIEVEMENTS.filter((a) => s.ach.includes(a.id)).length;
  return (
    <div>
      <H>Saavutused ({unlocked}/{ACHIEVEMENTS.length})</H>
      <div className="grid gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a) => {
          const got = s.ach.includes(a.id);
          return (
            <div key={a.id} className={`border-2 p-2 ${got ? "border-primary/60" : "opacity-50"}`}>
              <div className={got ? "text-primary" : "text-muted-foreground"}>{got ? a.icon : "🔒"} <span className={got ? "" : "text-muted-foreground"}>{a.name}</span></div>
              <div className="text-base text-muted-foreground">{a.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const LOG_CLS: Record<string, string> = { info: "", good: "text-primary", bad: "text-destructive", loot: "text-accent", lore: "text-magic", combat: "text-muted-foreground" };
const LOG_IC: Record<string, string> = { info: "•", good: "✓", bad: "✗", loot: "◆", lore: "❖", combat: "⚔" };
function logIcon(l: { text: string; type: string }) {
  const t = l.text;
  if (/TASE ÜLES/i.test(t)) return "⭐";
  if (/SURID/i.test(t)) return "💀";
  if (/Ehitatud|Ehitasid|parand/i.test(t)) return "🏗️";
  if (/Valmistasid|Sepistasid/i.test(t)) return "🔨";
  if (/Kasutasid|ravitud|Magasid|Puhkasid|Kastist|Kasti/i.test(t)) return "🧰";
  if (/ründab|Lööd:|mööda!|TÕRJE|hammustab|viskab kivi/i.test(t)) return "⚔️";
  if (/Kogusid|Leidsid|saak|püütud|trofee|Varast/i.test(t)) return "📦";
  if (/Jõudsid|Avastasid|Tagasi laagrisse/i.test(t)) return "🚶";
  if (/Põgenesid/i.test(t)) return "🏃";
  if (/ilmub!/i.test(t)) return "⚠️";
  if (/alistatud|MINIBOSS|KAITSID/i.test(t)) return "👑";
  if (/hoiatus|Ohtlikult|jan|näl/i.test(t)) return "❗";
  return LOG_IC[l.type] ?? "•";
}
function LogList({ s, n }: { s: GameState; n: number }) {
  return (
    <ul className="space-y-1">
      {s.log.slice(0, n).map((l, i) => (
        <li key={l.t + "-" + i} className={`${LOG_CLS[l.type]} ${i === 0 ? "log-new" : "opacity-80"}`}>
          <span className="log-ic" aria-hidden="true">{logIcon(l)}</span>{l.text}
        </li>
      ))}
    </ul>
  );
}

function DeathScreen({ d, deaths, onClose }: { d: { cause: string; t: number }; deaths: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="px-panel fadein w-full max-w-md border-destructive p-5 text-center" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-label="Sa surid">
        <div className="px-title text-destructive">💀 SA SURID</div>
        <p className="my-3 text-lg">{d.cause}</p>
        <p className="mb-3 text-base text-muted-foreground">Mäng on peatatud. Ärkad laagris 30% elu ja energiaga, kiirgus kaob, aga pool ressurssidest on kadunud. Surmasid kokku: {deaths}.</p>
        <p className="mb-4 text-base text-muted-foreground">Nõuanne: hoia toit ja vesi üle 20, ehita seinu öiste rünnakute vastu ja võta kaasa sidemeid.</p>
        <button className="px-btn px-btn-primary" onClick={onClose}>🕯️ Ärka ellu</button>
      </div>
    </div>
  );
}

function Ending({ s, onClose }: { s: GameState; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div className="px-panel fadein max-w-lg w-full border-magic p-5 text-center" onClick={(e) => e.stopPropagation()}>
        {REGION_IMG.rift && <img src={REGION_IMG.rift} alt="Lõhe" loading="lazy" className="mb-3 max-h-40 w-full border-2 border-border object-cover" style={{ imageRendering: "pixelated" }} />}
        <div className="px-title endglow text-magic">🌍 MAAILM PITSEERITUD</div>
        <p className="my-3">Pitseerija toimis. Lõhe sulgus — taevas paranes ja roheline virvendus kadus.</p>
        <div className="px-title text-accent">{ENDINGS[s.ending || "settlers"].title}</div>
        <p className="my-3">{ENDINGS[s.ending || "settlers"].text}</p>
        <div className="grid grid-cols-2 gap-2 text-left text-base sm:grid-cols-3">
          <div className="border-2 p-2">📅 Päev {clock(s).day}</div>
          <div className="border-2 p-2">⭐ Tase {s.level}</div>
          <div className="border-2 p-2">☠️ {s.kills} alistatud</div>
          <div className="border-2 p-2">🗺️ {s.discovered.length} ala</div>
          <div className="border-2 p-2">🏆 {s.ach.length} saavutus</div>
          <div className="border-2 p-2">💀 {s.deaths} surma</div>
        </div>
        <button className="px-btn px-btn-primary mt-4" onClick={onClose}>Jätka ellujäämist →</button>
      </div>
    </div>
  );
}

function Settings({ mut, onToast, setS }: { mut: Mut; onToast: (t: string) => void; setS: (g: GameState) => void }) {
  return (
    <div className="space-y-3">
      <H>Seaded</H>
      <p className="text-muted-foreground">Mäng salvestub automaatselt iga 5 sekundi järel. Tegevused jätkuvad ka siis, kui sulged brauseri.</p>
      <div className="flex flex-wrap gap-2">
        <A11ySettings />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="px-btn px-btn-primary" onClick={() => { mut(() => {}); onToast("Salvestatud ✓"); }}>💾 Salvesta käsitsi</button>
        <button className="px-btn px-btn-danger" onClick={() => { if (confirm("Alusta uut mängu? Kogu progress kaob.")) { wipe(); const g = newGame(); save(g); setS(g); } }}>☠ Uus mäng</button>
      </div>
    </div>
  );
}

type Prefs = { theme: "dark" | "light"; text: "s" | "m" | "l" | "xl"; contrast: "normal" | "high"; motion: "full" | "reduced"; sound: "on" | "off" };
const PREFS_KEY = "tuhk-prefs";
function loadPrefs(): Prefs {
  const def: Prefs = { theme: "dark", sound: "off", text: "m", contrast: "normal", motion: typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full" };
  try { return { ...def, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }; } catch { return def; }
}
function applyPrefs(p: Prefs) {
  const el = document.documentElement;
  el.dataset.text = p.text; el.dataset.contrast = p.contrast; el.dataset.motion = p.motion; el.dataset.theme = p.theme;
  try { window.dispatchEvent(new Event("tuhk-prefs")); } catch { /* no window (SSR) */ }
}

function A11ySettings() {
  const [p, setP] = useState<Prefs | null>(null);
  useEffect(() => { setP(loadPrefs()); }, []);
  if (!p) return null;
  const set = (patch: Partial<Prefs>) => { const n = { ...p, ...patch }; setP(n); localStorage.setItem(PREFS_KEY, JSON.stringify(n)); applyPrefs(n); };
  const Row = <K extends keyof Prefs>({ k, label, opts }: { k: K; label: string; opts: [Prefs[K], string][] }) => (
    <div className="flex w-full flex-wrap items-center gap-2" role="radiogroup" aria-label={label}>
      <span className="w-40 text-muted-foreground">{label}</span>
      {opts.map(([v, l]) => (
        <button key={v} role="radio" aria-checked={p[k] === v} className={`px-btn ${p[k] === v ? "px-btn-active" : ""}`} onClick={() => set({ [k]: v } as Partial<Prefs>)}>{l}</button>
      ))}
    </div>
  );
  return (
    <div className="w-full space-y-2 border-2 p-2">
      <div className="px-title text-primary">Mugavus ja ligipääsetavus</div>
      <Row k="theme" label="Teema" opts={[["dark", "🌙 Tume"], ["light", "☀️ Hele"]]} />
      <Row k="text" label="Teksti suurus" opts={[["s", "Väike"], ["m", "Tavaline"], ["l", "Suur"], ["xl", "Väga suur"]]} />
      <Row k="contrast" label="Kontrast" opts={[["normal", "Tavaline"], ["high", "Kõrge"]]} />
      <Row k="motion" label="Liikumisefektid" opts={[["full", "Sees"], ["reduced", "Vähendatud"]]} />
      <Row k="sound" label="Heliefektid" opts={[["on", "Sees"], ["off", "Väljas"]]} />
    </div>
  );
}

