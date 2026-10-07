/**
 * Self-hosted replacement for the cloud client, used only in the PHP download build.
 * Implements the small subset of the client API the game uses and talks to ./api/api.php.
 */
type Row = Record<string, unknown>;
type Res = { data: any; error: { message: string } | null };
type User = { id: string; email: string; user_metadata: { username: string } };
type Session = { access_token: string; user: User };

const API = "./api/api.php";
const KEY = "tuhk-self-session";

let session: Session | null = null;
try { session = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { session = null; }
const listeners = new Set<(e: string, s: Session | null) => void>();
const setSession = (s: Session | null, ev: string) => {
  session = s;
  if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY);
  listeners.forEach((l) => l(ev, s));
};

async function call(action: string, payload: Row = {}): Promise<Res> {
  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(session ? { "X-Tuhk-Token": session.access_token } : {}) },
      body: JSON.stringify({ action, ...payload }),
    });
    const j = await r.json().catch(() => ({ error: `Server vastas veaga (${r.status})` }));
    if (r.status === 401 && session && action !== "login") setSession(null, "SIGNED_OUT");
    if (j.error) return { data: null, error: { message: String(j.error) } };
    return { data: j.data ?? null, error: null };
  } catch {
    return { data: null, error: { message: "Serveriga ei saa ühendust" } };
  }
}

class Query implements PromiseLike<Res> {
  private q: Row;
  constructor(table: string) { this.q = { table, op: "select", cols: "*", filters: [] as unknown[] }; }
  select(cols = "*") { if (this.q.op === "select") this.q.cols = cols; else this.q.returning = true; return this; }
  insert(values: Row) { this.q.op = "insert"; this.q.values = values; return this; }
  upsert(values: Row) { this.q.op = "upsert"; this.q.values = values; return this; }
  delete() { this.q.op = "delete"; return this; }
  eq(col: string, val: unknown) { (this.q.filters as unknown[]).push([col, "eq", val]); return this; }
  is(col: string, val: unknown) { (this.q.filters as unknown[]).push([col, "is", val]); return this; }
  in(col: string, vals: unknown[]) { (this.q.filters as unknown[]).push([col, "in", vals]); return this; }
  or(expr: string) { this.q.or = expr; return this; }
  order(col: string, o?: { ascending?: boolean }) { this.q.order = [col, o?.ascending === false ? "desc" : "asc"]; return this; }
  limit(n: number) { this.q.limit = n; return this; }
  single() { this.q.single = "single"; return this; }
  maybeSingle() { this.q.single = "maybe"; return this; }
  then<A = Res, B = never>(ok?: ((v: Res) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return call("query", { q: this.q }).then(ok, bad);
  }
}

type Handler = { event: string; cb: (p: { new?: Row; old?: Row }) => void };
const channels = new Set<Channel>();
class Channel {
  handlers: Handler[] = [];
  timer: ReturnType<typeof setInterval> | null = null;
  last = -1;
  on(_t: string, f: { event: string }, cb: Handler["cb"]) { this.handlers.push({ event: f.event, cb }); return this; }
  subscribe() {
    const poll = async () => {
      const { data } = await call("chat_since", { after: this.last });
      if (!data) return;
      const first = this.last < 0;
      this.last = data.max;
      if (first) return;
      for (const m of data.rows as Row[]) this.handlers.filter((h) => h.event === "INSERT").forEach((h) => h.cb({ new: m }));
    };
    poll(); this.timer = setInterval(poll, 4000); channels.add(this);
    return this;
  }
  stop() { if (this.timer) clearInterval(this.timer); channels.delete(this); }
}

const authResult = (r: Res, ev: string) => {
  if (r.error) return { data: { session: null, user: null }, error: r.error };
  setSession(r.data as Session, ev);
  return { data: { session: r.data, user: (r.data as Session).user }, error: null };
};

export const supabase = {
  auth: {
    async getUser() { return { data: { user: session?.user ?? null }, error: null }; },
    async getSession() { return { data: { session }, error: null }; },
    onAuthStateChange(cb: (e: string, s: Session | null) => void) {
      listeners.add(cb);
      setTimeout(() => cb("INITIAL_SESSION", session), 0);
      return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      return authResult(await call("login", { username: email, password }), "SIGNED_IN");
    },
    async signUp({ email, password }: { email: string; password: string }) {
      return authResult(await call("register", { username: email, password }), "SIGNED_IN");
    },
    async signOut() { await call("logout"); setSession(null, "SIGNED_OUT"); return { error: null }; },
    async updateUser({ password }: { password: string }) {
      const r = await call("change_password", { password });
      if (!r.error) listeners.forEach((l) => l("USER_UPDATED", session));
      return { data: { user: session?.user ?? null }, error: r.error };
    },
    async resetPasswordForEmail() { return { data: null, error: { message: "Palu serveri adminil parool lähtestada." } }; },
  },
  from: (table: string) => new Query(table),
  rpc: (fn: string, args: Row = {}) => call("rpc", { fn, args }),
  channel: (_name: string) => new Channel(),
  removeChannel: (c: Channel) => { c.stop(); },
};

export const lovable = { auth: { async signInWithOAuth() { return { error: new Error("Pole saadaval") }; } } };
