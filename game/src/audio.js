// audio.js — 3 procedural WebAudio radio stations. Deterministic step
// sequencers, no RNG, no audio files. AudioContext is created lazily on the
// first user gesture; station switching always works (name + index) even
// when audio cannot start (headless). R cycles OFF → SOLMAR → NEON → DOCKSIDE.
import { RADIO } from './config.js';

export function createAudio() {
  return { station: -1, ctx: null, master: null, step: 0, nextT: 0, timer: null };
}

export function stationName(a) {
  return a.station < 0 ? 'RADIO OFF' : RADIO[a.station].name;
}

function ensureCtx(a) {
  if (a.ctx) return a.ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    a.ctx = new AC();
    a.master = a.ctx.createGain();
    a.master.gain.value = 0.12;
    a.master.connect(a.ctx.destination);
    return a.ctx;
  } catch (e) {
    return null;
  }
}

function note(a, freq, t, dur, wave) {
  try {
    const o = a.ctx.createOscillator();
    const g = a.ctx.createGain();
    o.type = wave; o.frequency.value = freq;
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + dur);
    o.connect(g); g.connect(a.master);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { /* audio is best-effort */ }
}

function playStep(a) {
  if (a.station < 0 || !a.ctx) return;
  const st = RADIO[a.station];
  const beat = 60 / st.bpm / 2; // eighth notes
  const scale = [0, 3, 5, 7, 10, 12];
  const n = scale[a.step % scale.length];
  const freq = st.root * Math.pow(2, n / 12);
  note(a, freq, a.ctx.currentTime, beat * 0.9, st.wave);
  if (a.step % 4 === 0) note(a, st.root / 2, a.ctx.currentTime, beat * 2, 'sine');
  a.step++;
  a.timer = setTimeout(() => playStep(a), beat * 1000);
}

export function radioCycle(a) {
  a.station = a.station >= RADIO.length - 1 ? -1 : a.station + 1;
  if (a.station < 0) { stopRadio(a); return stationName(a); }
  const ctx = ensureCtx(a);
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    a.step = 0;
    clearTimeout(a.timer);
    playStep(a);
  }
  return stationName(a);
}

export function stopRadio(a) {
  clearTimeout(a.timer);
  a.timer = null;
}

export function shotSound(a) {
  const ctx = ensureCtx(a);
  if (!ctx || !a.master) return;
  try {
    const len = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(a.master);
    src.start();
  } catch (e) { /* best-effort */ }
}
