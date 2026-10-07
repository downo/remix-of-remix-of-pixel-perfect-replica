// Tiny WebAudio blips — no assets. Toggle stored in device prefs ("tuhk-prefs".sound).
let ctx: AudioContext | null = null;
const TONES: Record<string, [number, number, OscillatorType]> = {
  good: [660, 0.12, "square"], loot: [880, 0.08, "triangle"], bad: [160, 0.2, "sawtooth"],
  combat: [240, 0.06, "square"], lore: [440, 0.3, "sine"], info: [520, 0.04, "triangle"], chat: [990, 0.05, "sine"],
};
export function soundOn() {
  try { return JSON.parse(localStorage.getItem("tuhk-prefs") || "{}").sound === "on"; } catch { return false; }
}
export function blip(type: string) {
  if (typeof window === "undefined" || !soundOn()) return;
  try {
    ctx ??= new AudioContext();
    const [f, d, wave] = TONES[type] ?? TONES.info;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = wave; o.frequency.value = f;
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + d);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + d);
  } catch { /* audio unavailable */ }
}
