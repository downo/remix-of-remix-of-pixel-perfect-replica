import { type GameState } from "./engine";
import { QUEST_GROUPS, STORY_QUESTS, advanceQuest, qCost, qOpen, qStep } from "./quests";

import { Portrait } from "./portraits";
const GROUP_NPC: Record<string, string> = { liis: "liis", tom: "kid", koidik: "archivist", ruins: "part" };

type Mut = (fn: (g: GameState) => string | null | void) => void;

export function StoryQuests({ s, mut }: { s: GameState; mut: Mut }) {
  const doneN = STORY_QUESTS.filter((q) => qStep(s, q.id) >= q.steps.length).length;
  return (
    <div className="mb-3">
      <h2 className="px-title mb-2 mt-1 text-primary">&gt; Loo ülesanded ({doneN}/{STORY_QUESTS.length})</h2>
      {Object.entries(QUEST_GROUPS).map(([g, name]) => {
        const qs = STORY_QUESTS.filter((q) => q.group === g);
        return (
          <details key={g} className="mb-2 border-2 p-2" open={qs.some((q) => qOpen(s, q) && qStep(s, q.id) < q.steps.length)}>
            <summary className="cursor-pointer">{GROUP_NPC[g] && <span className="mr-2 inline-block align-middle"><Portrait id={GROUP_NPC[g]} alt={g} size="sm" /></span>}{name} <span className="text-muted-foreground">({qs.filter((q) => qStep(s, q.id) >= q.steps.length).length}/{qs.length})</span></summary>
            <ul className="mt-2 space-y-2">
              {qs.map((q) => {
                const i = qStep(s, q.id); const st = q.steps[i]; const open = qOpen(s, q);
                if (!st) return <li key={q.id} className="text-muted-foreground"><span className="text-primary">[✓]</span> {q.title}</li>;
                if (!open) return <li key={q.id} className="opacity-50">🔒 {q.title}{q.reqText ? ` — ${q.reqText}` : ""}</li>;
                return (
                  <li key={q.id} className="border-2 p-2">
                    <div className="text-accent">{q.title} <span className="text-base text-muted-foreground">· samm {i + 1}/{q.steps.length} · tasu +{q.reward.xp} XP{q.reward.items ? ` ${qCost(q.reward.items)}` : ""}{q.reward.relic ? " + talisman" : ""}</span></div>
                    <p className="my-1 text-base">{st.text}</p>
                    {st.need && <p className="text-base text-muted-foreground">Vaja: {qCost(st.need)}</p>}
                    {st.condText && <p className="text-base text-muted-foreground">Eesmärk: {st.condText}</p>}
                    {st.choice ? (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {st.choice.map((c, k) => <button key={c.tag} className="px-btn" onClick={() => mut((g) => advanceQuest(g, q.id, k))}>{c.label}</button>)}
                      </div>
                    ) : <button className="px-btn px-btn-primary mt-1" onClick={() => mut((g) => advanceQuest(g, q.id))}>Jätka</button>}
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
