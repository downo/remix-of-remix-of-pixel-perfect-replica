import type { GameState } from "./engine";

// Stable IDs keep completed goals independent of current supplies.
export const TUTORIAL_STEPS = [
  { id: "wood", label: "Kogu ressursse (Kaart → 🪓 Kogu), kuni sul on 3 puitu", done: (s: GameState) => (s.inv.wood || 0) + (s.stash?.wood || 0) >= 3 || !!s.structures.campfire || !!s.structures.shelter },
  { id: "campfire", label: "Ehita lõkkeplats (Baas → ehitamine)", done: (s: GameState) => !!s.structures.campfire },
  { id: "tool", label: "Valmista kivikirves ja varusta see (Crafting → Varustus)", done: (s: GameState) => s.equip.tool !== null },
  { id: "shelter", label: "Ehita varjualune, et öösel turvaliselt puhata", done: (s: GameState) => !!s.structures.shelter },
  { id: "needs", label: "Hoia söök ja jook üle 50 enne ööd (🍖/💧)", done: (s: GameState) => s.food > 50 && s.water > 50 },
  { id: "explore", label: "Alista 3 vaenlast ja avasta 5 piirkonda (Kaart)", done: (s: GameState) => s.kills >= 3 && s.discovered.length >= 5 },
];

export function updateTutorial(s: GameState) {
  const completed = new Set(s.tutorialDone ?? []);
  for (const step of TUTORIAL_STEPS) if (step.done(s)) completed.add(step.id);
  s.tutorialDone = [...completed];
  if (TUTORIAL_STEPS.every((step) => completed.has(step.id))) s.tut = true;
}