// Self-hosted build: hints are answered by the published TUHK server.
import { supabase } from "@/integrations/supabase/client";

const HINT_API = "https://project--6aa7091a-e1a0-44e0-acc2-d7f4ec79a34e.lovable.app/api/public/hint";

export const askHint = async ({ data }: { data: { question: string; context: string } }): Promise<{ ok: true; answer: string } | { ok: false; error: string }> => {
  const { data: s } = await supabase.auth.getSession();
  const token = s.session?.access_token;
  if (!token) return { ok: false, error: "📻 Vihjete jaoks logi sisse (Mitmikmäng → Konto)." };
  try {
    const r = await fetch(HINT_API, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(data) });
    const j = await r.json().catch(() => null);
    if (j && typeof j.ok === "boolean") return j;
    return { ok: false, error: "Vihjete server ei vasta. Proovi hiljem." };
  } catch {
    return { ok: false, error: "Vihjete serveriga ei saanud ühendust." };
  }
};
