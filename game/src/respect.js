// respect.js — respect ranks from rep, district standing, home turf, and the
// LEGEND bonus job. Rank-ups toast and unlock the garage discount.
import { RESPECT, DISTRICTS, districtAt } from './config.js';

export function rankFor(rep) {
  let r = 0;
  RESPECT.ranks.forEach((rk, i) => { if (rep >= rk.rep) r = i; });
  return r;
}

export function rankName(state) {
  return RESPECT.ranks[state.respect || 0].name;
}

export function nextRank(state) {
  const r = state.respect || 0;
  if (r >= RESPECT.ranks.length - 1) return null;
  return { name: RESPECT.ranks[r + 1].name, need: RESPECT.ranks[r + 1].rep - state.rep };
}

export function homeTurf(state) {
  let best = null, br = -1;
  for (const d of DISTRICTS) {
    const v = (state.districtRep || {})[d.id] || 0;
    if (v > br) { br = v; best = d; }
  }
  if (!best || br <= 0) return null;
  return { name: best.name, level: Math.floor(br / 100) + 1 };
}

export function respectTick(state, fx) {
  const r = rankFor(state.rep);
  if (r > (state.respect || 0)) {
    state.respect = r;
    if (fx && fx.toast) {
      fx.toast('RESPECT UP — ' + RESPECT.ranks[r].name
        + (r >= 2 ? ' — BONUS JOB UNLOCKED' : ''));
    }
  }
  // District standing grows where the player works.
  const d = districtAt(state.player.x, state.player.z);
  if (!state.districtRep) state.districtRep = {};
  state.districtRep[d.id] = (state.districtRep[d.id] || 0) + 0.02;
}
