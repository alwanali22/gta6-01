// The 12 story jobs, the perk draft between them, and the seeded
// random events that pay extra on the street. Every job is a drive to
// a point with a timer and a lose condition; the race, the branch, the
// convoy tail and the final heist each add one twist on top of that.
import { ECONOMY, GIGS, MISSIONS, PERKS } from './config.js';
import { createRandom, shuffle } from './random.js';

const TARGETS = {
  marina: [-170, -140], oldtown: [-40, -90], dockside: [-160, 120], palm: [60, 120],
};

export function missionTarget(mission) {
  return TARGETS[mission.district] || [0, 0];
}

export function startMission(state, index) {
  const def = MISSIONS[index];
  if (!def) return null;
  const target = missionTarget(def);
  const time = def.id === 'midnight' ? 100 : def.id === 'long-way' ? 180 : def.id === 'two-ways' ? 150 : 120;
  state.mission = {
    id: def.id, name: def.name, pay: def.pay, district: def.district,
    brief: def.brief, crew: def.crew, timeLeft: time, lose: 'TIME UP',
    target, phase: 1, checkpoints: [], checkIndex: 0, tailTime: 0,
    bossHp: def.id === 'long-way' ? 100 : 0, bossPhase: 1,
    branch: def.id === 'two-ways' ? 'silent' : null, rivals: 0,
  };
  if (def.id === 'neon-run') {
    state.mission.checkpoints = [[-170, -140], [60, 120], [-40, -90]];
    state.mission.target = state.mission.checkpoints[0];
  }
  if (def.id === 'midnight') {
    state.mission.checkpoints = [[-150, -80], [60, 120], [-160, 120], [-40, -90], [0, 0]];
    state.mission.target = state.mission.checkpoints[0];
    state.mission.rivals = 0;
  }
  if (def.id === 'long-way') {
    state.mission.checkpoints = [[60, 120], [-160, 120], [0, 0]];
    state.mission.target = state.mission.checkpoints[0];
  }
  state.missionIndex = index;
  state.event = null;
  return state.mission;
}

export function chooseBranch(state, branch) {
  const m = state.mission;
  if (!m || m.id !== 'two-ways') return;
  m.branch = branch;
  if (branch === 'loud') {
    m.timeLeft = 90;
    m.pay = Math.round(m.pay * 1.2);
    state.wanted = Math.min(5, state.wanted + 2);
  }
}

function atTarget(state, radius) {
  const m = state.mission;
  if (!m || !m.target) return false;
  const dx = state.player.x - m.target[0];
  const dz = state.player.z - m.target[1];
  return Math.sqrt(dx * dx + dz * dz) < (radius || 10);
}

export function offerDraft(state) {
  const rng = createRandom(state.seed * 1000 + state.missionsDone * 17 + 5);
  const owned = new Set(state.perks || []);
  const pool = shuffle(rng, PERKS.filter((p) => !owned.has(p.id)));
  state.draft = pool.slice(0, 3).map((p) => p.name);
  state.draftIds = pool.slice(0, 3).map((p) => p.id);
  return state.draft;
}

export function applyPerk(state, index) {
  if (!state.draftIds || !state.draftIds[index]) return null;
  const id = state.draftIds[index];
  state.perks = [...(state.perks || []), id];
  state.draft = null;
  state.draftIds = null;
  return id;
}

export function completeMission(state) {
  const m = state.mission;
  if (!m) return 0;
  const nightBonus = (state.perks || []).includes('owl') && state.night > 0.5 ? Math.round(m.pay * 0.1) : 0;
  const pay = m.pay + nightBonus;
  state.cash += pay;
  state.missionsDone += 1;
  state.mission = null;
  offerDraft(state);
  return pay;
}

export function gradeFromStats(state) {
  if (state.cash >= ECONOMY.gradeS) return 'S';
  if (state.cash >= ECONOMY.gradeA) return 'A';
  if (state.cash >= ECONOMY.gradeB) return 'B';
  return 'C';
}

const EVENTS = [
  { id: 'atm', name: 'ATM JOB', text: 'A cash machine, no queue. +$300.', cash: 300, wanted: 0 },
  { id: 'stranded', name: 'STRANDED DRIVER', text: 'A lift across town. +$250.', cash: 250, wanted: 0 },
  { id: 'roadblock', name: 'SUDDEN ROADBLOCK', text: 'Rook moves a van into your road.', cash: 0, wanted: 1 },
  { id: 'witness', name: 'WITNESS', text: 'Someone saw the plates. Wanted up.', cash: 0, wanted: 1 },
];

export function triggerRandomEvent(state) {
  const rng = createRandom(state.seed * 31 + state.missionsDone * 7 + state.nearMiss);
  const ev = EVENTS[Math.floor(rng() * EVENTS.length)];
  state.event = { name: ev.name, text: ev.text };
  state.cash += ev.cash;
  state.wanted = Math.min(5, state.wanted + ev.wanted);
  return state.event;
}

export function runGig(state, gigId) {
  const gig = GIGS.find((g) => g.id === gigId) || GIGS[0];
  const bonus = (state.perks || []).includes('glove') ? Math.round(gig.pay * 0.2) : 0;
  state.cash += gig.pay + bonus;
  state.gigsDone = (state.gigsDone || 0) + 1;
  return gig.pay + bonus;
}

export function updateMissions(state, dt) {
  const m = state.mission;
  if (!m) return null;
  m.timeLeft -= dt;
  if (m.timeLeft <= 0) {
    state.failed = m.lose;
    return 'failed';
  }
  // Race: rivals gain ground over time; checkpoints in order.
  if (m.id === 'midnight') {
    m.rivals += dt * 0.9;
    if (m.rivals >= 5) { state.failed = 'RIVALS WON THE MILE'; return 'failed'; }
  }
  // Convoy: stay in the tail window of the moving convoy car.
  if (m.id === 'convoy' && state.traffic && state.traffic[2]) {
    const c = state.traffic[2];
    const dx = state.player.x - c.x;
    const dz = state.player.z - c.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d >= 12 && d <= 30) {
      m.tailTime += dt;
      if (m.tailTime >= 20) return completeMission(state) ? 'done' : 'done';
    } else if (d < 8) { state.failed = 'SPOTTED BY THE CONVOY'; return 'failed'; }
    return null;
  }
  // Final heist: three phases, then Voss himself.
  if (m.id === 'long-way') {
    if (m.phase < 3 && atTarget(state, 12)) {
      m.phase += 1;
      m.checkIndex += 1;
      m.target = m.checkpoints[Math.min(m.checkIndex, 2)];
      if (m.phase === 3) m.lose = 'VOSS ESCAPED';
      return null;
    }
    if (m.phase === 3) {
      const dx = state.player.x - m.target[0];
      const dz = state.player.z - m.target[1];
      if (Math.sqrt(dx * dx + dz * dz) < 25) {
        m.bossHp -= dt * 20;
        if (m.bossHp <= 50 && m.bossPhase === 1) m.bossPhase = 2;
        if (m.bossHp <= 0) return completeMission(state) ? 'done' : 'done';
      }
      return null;
    }
    return null;
  }
  // Checkpoint jobs: neon run and the race advance point by point.
  if (m.checkpoints.length > 0 && atTarget(state, 12)) {
    m.checkIndex += 1;
    if (m.checkIndex >= m.checkpoints.length) return completeMission(state) ? 'done' : 'done';
    m.target = m.checkpoints[m.checkIndex];
    return null;
  }
  if (m.checkpoints.length === 0 && atTarget(state, 12)) {
    return completeMission(state) ? 'done' : 'done';
  }
  return null;
}
