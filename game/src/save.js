// save.js — 3 save slots in localStorage ('solmar-save-v1'). Every run field
// is saved, including ALL chunk B fields (nitro, mission timers, race clock,
// event, boss, convoy, shadow timer) so a load never breaks the run mid-job.
// A saved mid-standoff event is dropped on load — never resume a shootout.
import { districtAt } from './config.js';

const KEY = 'solmar-save-v1';

const FIELDS = [
  'time', 'cash', 'rep', 'heat', 'chain', 'mission', 'done', 'perks',
  'garage', 'feats', 'runActive',
  // Chunk B run state — all of it, or the run breaks across loads.
  'nitro', 'missionPhase', 'missionTimer', 'missionChoice', 'raceClock',
  'raceCp', 'raceCheckpoints', 'branchMarkers', 'event', 'eventClock',
  'eventAt', 'boss', 'shotsAt', 'earned', 'maxHeat', 'bestChain',
  'nearMisses', 'draftOptions', 'convoy', 'shadowTimer',
  // Chunk C state.
  'weapon', 'owned', 'ammo', 'respect', 'districtRep', 'outfit',
  'heatFlags', 'missionGrades', 'career', 'cleanUsed', 'combatCd',
];

export function listSlots() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return [0, 1, 2].map((i) => arr[i] || null);
  } catch (e) {
    return [null, null, null];
  }
}

export function slotLabel(s) {
  if (!s) return null;
  const pct = s.completion || 0;
  const missions = (s.done || []).length;
  return {
    pct, missions,
    cash: s.cash || 0,
    time: Math.round(s.time || 0),
    district: s.district || 'MARINA ROW',
    act: s.mission != null ? 'ACT ' + (Math.floor(s.mission / 5) + 1) : 'ACT 1',
  };
}

export function completionOf(state) {
  const owned = state.cars.filter((c) => c.owner === 'player').length;
  return Math.min(100, Math.round(
    state.done.length * 10 + state.perks.length + owned + (state.respect || 0) * 2,
  ));
}

export function saveSlot(state, i) {
  const snap = { savedAt: Date.now(), completion: completionOf(state) };
  snap.district = districtAt(state.player.x, state.player.z).name;
  for (const f of FIELDS) snap[f] = JSON.parse(JSON.stringify(state[f] ?? null));
  snap.player = JSON.parse(JSON.stringify(state.player));
  snap.cars = JSON.parse(JSON.stringify(state.cars));
  snap.target = state.target ? { ...state.target } : null;
  const arr = listSlots();
  arr[i] = snap;
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) { return false; }
  return true;
}

export function loadSlot(state, i) {
  const snap = listSlots()[i];
  if (!snap) return false;
  for (const f of FIELDS) {
    if (snap[f] !== undefined) state[f] = JSON.parse(JSON.stringify(snap[f]));
  }
  state.player = JSON.parse(JSON.stringify(snap.player));
  state.cars = JSON.parse(JSON.stringify(snap.cars));
  state.target = snap.target ? { ...snap.target } : null;
  // Never resume a shootout or a chase mid-load: police and standoff reset
  // (main.js recreates the police system right after load).
  state.standoff = null;
  state.pursuit = null;
  state.screen = 'play';
  return true;
}
