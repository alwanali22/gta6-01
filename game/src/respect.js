// Respect ranks and feats. Rep comes from missions, near-miss
// chains, downed units and feats; ranks gate the weapon shop.
import { CONFIG, respectRank } from "./config.js";

const FEATS = [
  { id: "thief", name: "CAR THIEF", test: (s) => s.stats.stolen >= 5 },
  { id: "ghost", name: "GHOST", test: (s) => s.stats.evaded >= 10 },
  { id: "king", name: "NEAR-MISS KING", test: (s) => s.stats.nearMiss >= 25 },
  { id: "chain", name: "CHAIN MASTER", test: (s) => s.stats.bestChain >= 4 },
  { id: "hustler", name: "HUSTLER", test: (s) => s.stats.gigsDone >= 10 },
  { id: "legend", name: "SOLMAR LEGEND", test: (s) => s.stats.missionsDone >= 12 },
];

// Add rep; on a rank-up announce it and return the new rank name.
export function addRep(state, n) {
  const before = respectRank(state.rep || 0).name;
  state.rep = (state.rep || 0) + n;
  const after = respectRank(state.rep).name;
  if (after !== before) {
    state.toast = `RANK UP — ${after}`;
    return after;
  }
  return null;
}

// Feats Milo just earned: +100 rep each, once ever.
export function checkFeats(state) {
  if (!state.feats) state.feats = new Set();
  const won = [];
  for (const f of FEATS) {
    if (!state.feats.has(f.id) && f.test(state)) {
      state.feats.add(f.id);
      state.rep = (state.rep || 0) + 100;
      state.toast = `FEAT — ${f.name} +100 REP`;
      won.push(f.id);
    }
  }
  return won;
}

export function featNames(state) {
  return FEATS.filter((f) => state.feats && state.feats.has(f.id)).map((f) => f.name);
}

// Progress to the next rank, 0..1, for the HUD bar.
export function repProgress(state) {
  const ranks = CONFIG.respect;
  const rank = respectRank(state.rep || 0);
  const i = ranks.indexOf(rank);
  if (i >= ranks.length - 1) return { rank: rank.name, next: "MAX", pct: 1 };
  const next = ranks[i + 1];
  const pct = Math.min(1, Math.max(0, ((state.rep || 0) - rank.at) / (next.at - rank.at)));
  return { rank: rank.name, next: next.name, pct };
}
