// Tiny WebAudio engine — no audio files. Toggle stored in device prefs ("tuhk-prefs".sound).
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

export function soundOn() {
  try { return JSON.parse(localStorage.getItem("tuhk-prefs") || "{}").sound === "on"; } catch { return false; }
}

function ac(): AudioContext | null {
  if (typeof window === "undefined" || !soundOn()) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

const TONES: Record<string, [number, number, OscillatorType, number?]> = {
  good: [660, 0.12, "square"], loot: [880, 0.08, "triangle"], bad: [160, 0.2, "sawtooth"],
  combat: [240, 0.06, "square"], lore: [440, 0.3, "sine"], info: [520, 0.04, "triangle"], chat: [990, 0.05, "sine"],
  step: [190, 0.03, "square", 120], door: [130, 0.1, "square", 70], switch: [1300, 0.02, "square", 900],
  pain: [120, 0.16, "sawtooth", 80], death: [420, 0.9, "sawtooth", 55], craft: [520, 0.07, "square"],
  build: [300, 0.1, "square", 420], heal: [620, 0.2, "sine", 880], hit: [210, 0.05, "square", 120],
  run: [340, 0.07, "triangle", 520],
};

function tone(c: AudioContext, f: number, d: number, wave: OscillatorType, vol = 0.06, to?: number) {
  if (!master) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = wave; o.frequency.setValueAtTime(f, c.currentTime);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), c.currentTime + d);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d);
  o.connect(g).connect(master); o.start(); o.stop(c.currentTime + d);
}

export function blip(type: string) {
  const c = ac(); if (!c) return;
  try {
    if (type === "level" || type === "win") {
      [0, 1, 2].forEach((i) => setTimeout(() => { const cc = ac(); if (cc) tone(cc, [523, 659, 784][i], 0.18, "square", 0.05); }, i * 90));
      return;
    }
    const [f, d, wave, to] = TONES[type] ?? TONES.info;
    tone(c, f, d, wave, 0.06, to);
  } catch { /* audio unavailable */ }
}

// ---------- ambient scenes ----------
export type Scene = "off" | "camp" | "forest" | "water" | "city" | "ruins" | "magic" | "bar" | "waste" | "depths";
let ambNodes: AudioNode[] = [];
let ambTimers: number[] = [];
let ambScene = "";
let ambMusic = false;
let ambNight = false;

function stopAmb() {
  ambTimers.forEach((t) => clearInterval(t)); ambTimers = [];
  ambNodes.forEach((n) => {
    try { const s = n as AudioScheduledSourceNode; if (typeof s.stop === "function") s.stop(); } catch { /* not a source */ }
    try { n.disconnect(); } catch { /* already gone */ }
  });
  ambNodes = [];
}

function noiseSource(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s;
}

/** Filtered noise loop with a slow gust LFO — wind, water, rumble. */
function hiss(c: AudioContext, type: BiquadFilterType, freq: number, q: number, vol: number, lfo: number) {
  if (!master) return;
  const s = noiseSource(c); const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = vol;
  const o = c.createOscillator(); o.frequency.value = lfo;
  const og = c.createGain(); og.gain.value = vol * 0.6;
  o.connect(og).connect(g.gain);
  s.connect(f).connect(g).connect(master);
  s.start(); o.start();
  ambNodes.push(s, o, f, g, og);
}

/** Random short events: bird chirps, barrel crackle, distant metal clinks. */
function events(c: AudioContext, every: number, chance: number, make: () => void) {
  const id = window.setInterval(() => { if (soundOn() && Math.random() < chance) make(); }, every);
  ambTimers.push(id);
}

function startMusic(c: AudioContext, night: boolean) {
  const root = night ? 98 : 110; const step = night ? 900 : 620;
  const SCALE = [0, 3, 5, 7, 10, 12]; const MEL = [0, 2, 4, 2, 5, 3, 1, 4];
  let i = 0;
  const id = window.setInterval(() => {
    if (!soundOn() || !master) return;
    const n = MEL[i % MEL.length]; const semi = SCALE[n % SCALE.length];
    tone(c, root * 2 ** (semi / 12), (step / 1000) * 1.7, "triangle", 0.03);
    if (i % 4 === 0) tone(c, root / 2, (step / 1000) * 3, "sine", 0.028);
    i++;
  }, step);
  ambTimers.push(id);
}

export function setScene(scene: Scene, opts: { music?: boolean; night?: boolean } = {}) {
  const music = !!opts.music; const night = !!opts.night;
  if (scene === ambScene && music === ambMusic && night === ambNight) return;
  ambScene = scene; ambMusic = music; ambNight = night;
  stopAmb();
  const c = ac(); if (!c || scene === "off") return;
  try {
    switch (scene) {
      case "camp":
        hiss(c, "lowpass", 420, 0.6, 0.03, 0.07);
        events(c, 5000, 0.3, () => tone(c, 300 + Math.random() * 120, 0.09, "square", 0.012, 180));
        if (music) startMusic(c, night);
        break;
      case "forest":
        hiss(c, "lowpass", 700, 0.6, 0.028, 0.1);
        events(c, 2600, 0.45, () => { const n = 1800 + Math.random() * 1400; tone(c, n, 0.07, "sine", 0.02, n * 1.4); setTimeout(() => tone(c, n * 1.2, 0.05, "sine", 0.015, n), 110); });
        break;
      case "water":
        hiss(c, "bandpass", 800, 0.7, 0.05, 0.5);
        hiss(c, "highpass", 2400, 0.4, 0.012, 1.1);
        break;
      case "city":
        hiss(c, "lowpass", 300, 0.7, 0.035, 0.05);
        events(c, 4200, 0.25, () => tone(c, 900 + Math.random() * 600, 0.12, "square", 0.01, 600));
        break;
      case "ruins":
        hiss(c, "lowpass", 500, 0.5, 0.03, 0.09);
        events(c, 6000, 0.3, () => tone(c, 240 + Math.random() * 200, 0.14, "sawtooth", 0.01, 140));
        break;
      case "magic":
        hiss(c, "bandpass", 1600, 3, 0.02, 0.2);
        events(c, 3000, 0.4, () => tone(c, 1200 + Math.random() * 900, 0.3, "sine", 0.012, 2200));
        break;
      case "bar":
        hiss(c, "lowpass", 380, 0.6, 0.022, 0.13);
        hiss(c, "bandpass", 480, 4, 0.014, 0.3);
        events(c, 700, 0.35, () => tone(c, 1400 + Math.random() * 1200, 0.02, "square", 0.008));
        events(c, 3400, 0.3, () => tone(c, 200 + Math.random() * 160, 0.1, "sawtooth", 0.012, 120));
        break;
      case "waste":
        hiss(c, "lowpass", 900, 0.4, 0.04, 0.16);
        break;
      case "depths":
        hiss(c, "lowpass", 220, 0.8, 0.03, 0.04);
        events(c, 7000, 0.35, () => tone(c, 90 + Math.random() * 60, 0.4, "sine", 0.015, 60));
        break;
    }
  } catch { /* audio unavailable */ }
}

// ---------- which sound a journal line makes ----------
const SFX: [RegExp, string][] = [
  [/TASE ÜLES/i, "level"], [/SA SURID/i, "death"],
  [/Ehitatud|Ehitasid|parand/i, "build"], [/Valmistasid|Sepistasid/i, "craft"],
  [/Kasutasid|ravitud|ravib|Tervis taast|Magasid|Puhkasid/i, "heal"],
  [/ründab|Lööd:|lööb|mööda!|TÕRJE|viskab kivi|hammustab/i, "hit"],
  [/Kogusid|Leidsid|saak|püütud|trofee|Varast|kaduma|kaotasid/i, "loot"],
  [/Jõudsid|Avastasid|Naased|Tagasi laagrisse/i, "step"],
  [/Põgenesid/i, "run"], [/ilmub!/i, "pain"],
  [/alistatud|MINIBOSS|Võitsid|KAITSID|katsed läbi/i, "win"],
  [/Kasti|Kastist|kast/i, "door"],
];
export function soundForLog(type: string, text: string) {
  for (const [re, s] of SFX) if (re.test(text)) return s;
  return type;
}
