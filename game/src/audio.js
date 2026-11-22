// Radio: three WebAudio synth stations, no audio files. The
// sequencer schedules a short loop per station; a siren wail rides
// over it while the police are after Milo. Everything is guarded
// so a headless browser or a denied context can never throw.
import { CONFIG } from "./config.js";

const SCALES = {
  sunset: [0, 4, 7, 12, 16, 19],
  neon: [0, 3, 5, 7, 10, 12],
  dock: [0, 5, 7, 10, 12],
};
const ROOTS = { sunset: 220, neon: 196, dock: 164.81 };

export function createAudio() {
  const a = { ctx: null, master: null, siren: null, sirenGain: null, on: true, step: 0, nextAt: 0, dead: false };
  a.ensure = () => {
    if (a.ctx || a.dead) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { a.dead = true; return; }
      a.ctx = new AC();
      a.master = a.ctx.createGain();
      a.master.gain.value = a.on ? 0.12 : 0;
      a.master.connect(a.ctx.destination);
      const o1 = a.ctx.createOscillator();
      const o2 = a.ctx.createOscillator();
      o1.frequency.value = 700;
      o2.frequency.value = 950;
      a.sirenGain = a.ctx.createGain();
      a.sirenGain.gain.value = 0;
      o1.connect(a.sirenGain); o2.connect(a.sirenGain);
      a.sirenGain.connect(a.master);
      o1.start(); o2.start();
      a.siren = [o1, o2];
      a.nextAt = a.ctx.currentTime + 0.1;
    } catch { a.dead = true; }
  };
  a.setStation = (i) => { a.step = 0; if (a.ctx) a.nextAt = a.ctx.currentTime + 0.05; };
  a.setOn = (on) => {
    a.on = on;
    if (a.master && a.ctx) a.master.gain.setValueAtTime(on ? 0.12 : 0, a.ctx.currentTime);
  };
  a.note = (freq, at, dur, type, vol) => {
    try {
      const o = a.ctx.createOscillator();
      const g = a.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, at);
      g.gain.exponentialRampToValueAtTime(0.001, at + dur);
      o.connect(g); g.connect(a.master);
      o.start(at); o.stop(at + dur + 0.02);
    } catch { /* a dead context never blocks the game */ }
  };
  // One sequencer tick per frame: schedule any beats that fall due.
  a.tick = (state) => {
    if (!a.ctx || !a.on || a.ctx.state !== "running") return;
    try {
      const st = CONFIG.radio[state.radio || 0];
      const beat = 60 / st.tempo;
      const scale = SCALES[st.id] || SCALES.sunset;
      const root = ROOTS[st.id] || 220;
      while (a.nextAt < a.ctx.currentTime + 0.25) {
        const s = a.step % 16;
        const deg = scale[s % scale.length];
        const f = root * Math.pow(2, deg / 12) * (s >= 8 ? 2 : 1);
        if (s % 2 === 0) a.note(f, a.nextAt, beat * 0.9, st.id === "neon" ? "sawtooth" : "triangle", 0.5);
        if (s % 8 === 0) a.note(root / 2, a.nextAt, beat * 1.8, "sine", 0.7);
        if (st.id === "dock" && s % 4 === 2) a.note(root * 3, a.nextAt, 0.05, "square", 0.08);
        a.step += 1;
        a.nextAt += beat / 2;
      }
      if (a.sirenGain) {
        const w = state.wanted > 0 ? 0.05 + state.wanted * 0.012 : 0;
        a.sirenGain.gain.setTargetAtTime(w, a.ctx.currentTime, 0.3);
        if (a.siren) a.siren.forEach((o, i) => o.frequency.setTargetAtTime(i ? 950 : 700, a.ctx.currentTime, 0.4));
      }
    } catch { a.dead = true; }
  };
  return a;
}
