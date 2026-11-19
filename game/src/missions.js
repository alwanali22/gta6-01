// missions.js — the 10-job chain, perk drafts, street race, branching
// choice, 3-phase heist, and seeded random events. Every payout and
// timer comes from config.js; every target sits on a road.
import { MISSIONS, WORLD, PERKS, RACE, BRANCH, HEIST, EVENTS, GIGS } from './config.js';
import { makeRng } from './random.js';
import { nearestRoadPoint, randomRoadPoint } from './city.js';
import { startStandoff } from './police.js';
import { hasPerk } from './player.js';

const snap = (x, z) => nearestRoadPoint(x, z);
const TARGETS = [
  snap(-160, 120), snap(0, 240), snap(160, -80), snap(-80, -240), snap(240, 240),
  snap(80, 160), null, null, null, null,
];
const LOOP = [{ x: -240, z: -240 }, { x: 240, z: -240 }, { x: 240, z: 240 }, { x: -240, z: 240 }];
const RACE_CPS = [LOOP[0], LOOP[1], LOOP[2], LOOP[3], LOOP[0]];
const CONVOY_LOOP = [{ x: -160, z: -160 }, { x: 160, z: -160 }, { x: 160, z: 160 }, { x: -160, z: 160 }];
const HEIST_PREP = [snap(0, -240), snap(-240, 80)];
const HEIST_VAULT = snap(-240, 240);
const BRANCH_MARKERS = [
  { kind: 'silent', ...snap(-80, 80) },
  { kind: 'loud', ...snap(240, -240) },
];

function loopLength(loop) {
  let s = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    s += Math.abs(b.x - a.x) + Math.abs(b.z - a.z);
  }
  return s;
}

function loopPoint(loop, dist) {
  let d = dist;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    const seg = Math.abs(b.x - a.x) + Math.abs(b.z - a.z);
    if (d <= seg) {
      const f = seg === 0 ? 0 : d / seg;
      return {
        x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f,
        heading: Math.atan2(b.x - a.x, b.z - a.z),
      };
    }
    d -= seg;
  }
  return { x: loop[0].x, z: loop[0].z, heading: 0 };
}

function arrive(state, x, z, r) {
  return Math.hypot(state.player.x - x, state.player.z - z) <= r;
}

export function createMissions(city) {
  return { city, rng: makeRng(4242), eventCount: 0, gigRng: makeRng(7777), gigAt: 5 };
}

export function startMission(state, i, fx) {
  state.mission = i;
  state.missionPhase = 'drive';
  state.missionTimer = 0;
  state.missionChoice = null;
  state.raceClock = 0; state.raceCp = 0; state.raceCheckpoints = [];
  state.branchMarkers = [];
  state.boss = null;
  state.shadowTimer = 0;
  state.convoy = null;
  const m = MISSIONS[i];
  if (i === 0) state.missionPhase = 'steal';
  if (i === 5) state.missionPhase = 'vault';
  if (i === 6) { state.missionPhase = 'race'; state.raceCheckpoints = RACE_CPS; }
  if (i === 7) { state.missionPhase = 'branch'; state.branchMarkers = BRANCH_MARKERS; }
  if (i === 8) {
    state.missionPhase = 'shadow';
    state.convoy = { dist: 0, x: CONVOY_LOOP[0].x, z: CONVOY_LOOP[0].z };
  }
  if (i === 9) state.missionPhase = 'prep1';
  state.target = TARGETS[i] || null;
  if (i === 6) state.target = RACE_CPS[0];
  if (i === 8) state.target = { x: CONVOY_LOOP[0].x, z: CONVOY_LOOP[0].z };
  if (i === 9) state.target = HEIST_PREP[0];
  if (fx && fx.toast) fx.toast('JOB ' + (i + 1) + ' — ' + m.name);
}

export function renderDraft(state) {
  const cards = document.querySelectorAll('.perk-card');
  state.draftOptions.forEach((p, i) => {
    const el = cards[i];
    if (!el) return;
    const h = el.querySelector('h3'); if (h) h.textContent = p.name;
    const pp = el.querySelector('p'); if (pp) pp.textContent = p.text;
  });
}

function completeMission(m, state, fx, payout) {
  const pay = payout !== undefined ? payout : MISSIONS[state.mission].payout;
  state.cash += pay; state.earned += pay; state.rep += 25;
  state.chain = Math.min(5, state.chain + 0.5);
  // Mission letter grade from the chain held at the finish.
  const grade = state.chain >= 4 ? 'S' : state.chain >= 2.5 ? 'A'
    : state.chain >= 1.5 ? 'B' : 'C';
  state.missionGrades.push({ mission: state.mission, grade });
  state.done.push(state.mission);
  state.target = null; state.event = null;
  state.raceCheckpoints = []; state.branchMarkers = [];
  if (state.mission >= 9) { fx.showVictory(state); return; }
  // Perk draft 1-of-3, seeded per mission index.
  const rng = makeRng(9000 + state.mission);
  const pool = rng.shuffle(PERKS.filter((p) => !state.perks.includes(p.id)));
  state.draftOptions = pool.slice(0, 3);
  if (state.draftOptions.length === 0) {
    startMission(state, state.mission + 1, fx);
    return;
  }
  renderDraft(state);
  fx.setScreen('draft');
}

export function pickDraft(m, state, idx, fx) {
  const pick = state.draftOptions[idx];
  if (!pick) return;
  state.perks.push(pick.id);
  state.draftOptions = [];
  fx.setScreen('play');
  startMission(state, state.mission + 1, fx);
}

export function updateDraft(m, state, input, fx) {
  if (state.screen !== 'draft') return;
  if (input.tapped('one')) pickDraft(m, state, 0, fx);
  else if (input.tapped('two')) pickDraft(m, state, 1, fx);
  else if (input.tapped('three')) pickDraft(m, state, 2, fx);
}

export function objectiveText(state) {
  const m = MISSIONS[state.mission];
  if (!m) return 'FREE ROAM — SOLMAR';
  const n = state.mission + 1;
  if (state.mission === 0 && state.missionPhase === 'steal') {
    return 'M1 ' + m.name + ' — STEAL THE COMET [E]';
  }
  if (state.mission === 5) {
    return 'M6 ' + m.name + ' — HOLD THE VAULT '
      + Math.max(0, HEIST.vaultHold - Math.floor(state.missionTimer)) + 's';
  }
  if (state.mission === 6) {
    if (state.raceCp === 0) return 'M7 ' + m.name + ' — REACH THE START LINE';
    return 'M7 ' + m.name + ' — CHECKPOINT ' + state.raceCp + '/4 — '
      + Math.max(0, Math.ceil(RACE.limit - state.raceClock)) + 's';
  }
  if (state.mission === 7) return 'M8 ' + m.name + ' — SILENT OR LOUD?';
  if (state.mission === 8) {
    return 'M9 ' + m.name + ' — SHADOW THE CONVOY ' + Math.floor(state.shadowTimer) + '/5s';
  }
  if (state.mission === 9) {
    if (state.missionPhase === 'prep1') return 'M10 ' + m.name + ' — PREP 1/2';
    if (state.missionPhase === 'prep2') return 'M10 ' + m.name + ' — PREP 2/2';
    if (state.missionPhase === 'vault') {
      return 'M10 ' + m.name + ' — HOLD THE VAULT '
        + Math.max(0, HEIST.vaultHold - Math.floor(state.missionTimer)) + 's';
    }
    return 'M10 ' + m.name + ' — ESCAPE TO THE SAFEHOUSE';
  }
  return 'M' + n + ' ' + m.name + ' — DRIVE TO THE MARKER';
}

function updateRace(m, state, dt, fx) {
  const cps = state.raceCheckpoints;
  // Rivals are a pure function of the race clock — no AI state, fully
  // deterministic for the sim. Appended after traffic (see main.js).
  const per = loopLength(LOOP);
  const rivals = RACE.rivalSpeeds.map((sp, k) => {
    const pos = loopPoint(LOOP, Math.min(state.raceClock * sp, per));
    return {
      id: 'rival' + k, x: pos.x, z: pos.z, heading: pos.heading,
      color: k === 0 ? 0xff4a4a : 0x4affff, speed: sp, rival: true,
    };
  });
  state.traffic = [...(state.traffic || []), ...rivals];
  if (state.raceCp === 0) {
    // Reach the start line first; the clock starts there.
    state.target = cps[0];
    if (arrive(state, cps[0].x, cps[0].z, 12)) {
      state.raceCp = 1;
      fx.toast('GREEN LIGHT — GO');
    }
    return;
  }
  state.raceClock += dt;
  state.target = cps[state.raceCp];
  const fastestFinish = per / RACE.rivalSpeeds[0];
  if (state.raceClock > RACE.limit || state.raceClock >= fastestFinish) {
    const lost = state.raceClock >= fastestFinish;
    state.raceClock = 0; state.raceCp = 0;
    fx.toast(lost ? 'RIVAL WON — RACE AGAIN' : 'TIME UP — RACE AGAIN');
    return;
  }
  if (arrive(state, cps[state.raceCp].x, cps[state.raceCp].z, 12)) {
    state.raceCp++;
    if (state.raceCp >= cps.length) { completeMission(m, state, fx); return; }
    fx.toast('CHECKPOINT ' + state.raceCp + ' / 4');
  }
}

function updateHeist(m, state, dt, fx) {
  if (state.missionPhase === 'prep1') {
    state.target = HEIST_PREP[0];
    if (arrive(state, HEIST_PREP[0].x, HEIST_PREP[0].z, 10)) {
      state.missionPhase = 'prep2';
      state.target = HEIST_PREP[1];
      fx.toast('PREP 1/2 — NEXT MARKER');
    }
  } else if (state.missionPhase === 'prep2') {
    if (arrive(state, HEIST_PREP[1].x, HEIST_PREP[1].z, 10)) {
      state.missionPhase = 'vault';
      state.target = HEIST_VAULT;
      state.boss = { name: 'MARCUS VOSS', phase: 1, hp: 100 };
      fx.toast('VOSS IS HERE — HOLD THE VAULT');
    }
  } else if (state.missionPhase === 'vault') {
    if (arrive(state, HEIST_VAULT.x, HEIST_VAULT.z, 8)) {
      state.missionTimer += dt;
      if (state.missionTimer >= HEIST.vaultHold) {
        state.missionPhase = 'escape';
        state.boss.phase = 2;
        state.heat = 5;
        state.target = { x: WORLD.safehouse.x, z: WORLD.safehouse.z };
        fx.toast('VAULT CRACKED — RUN FOR THE SAFEHOUSE');
      }
    } else {
      state.missionTimer = 0;
    }
  } else if (state.missionPhase === 'escape') {
    if (arrive(state, WORLD.safehouse.x, WORLD.safehouse.z, 10)) {
      completeMission(m, state, fx);
    }
  }
}

export function updateMissions(m, state, dt, fx) {
  if (!state.runActive || state.screen !== 'play') return;
  const i = state.mission;

  // --- Random events: first at 40 s of play, then every 50 s. ---
  if (!state.event) {
    state.eventClock += dt;
    if (state.eventClock >= state.eventAt) {
      const kind = EVENTS.kinds[m.eventCount % EVENTS.kinds.length];
      const p = randomRoadPoint(m.rng, m.city);
      state.event = {
        id: kind.id, name: kind.name, x: p.x, z: p.z,
        ttl: kind.ttl, reward: kind.reward, heat: kind.heat,
      };
      m.eventCount++;
      state.eventClock = 0;
      state.eventAt = EVENTS.every;
      fx.toast('EVENT — ' + kind.name + ' (+$' + kind.reward + ')');
    }
  } else {
    const ev = state.event;
    ev.ttl -= dt;
    if (arrive(state, ev.x, ev.z, 6)) {
      if (ev.id === 'standoff') {
        state.event = null;
        startStandoff(state, fx);
      } else {
        state.cash += ev.reward; state.earned += ev.reward;
        fx.toast(ev.name + ' DONE +$' + ev.reward);
        state.event = null;
      }
    } else if (ev.ttl <= 0) {
      if (ev.heat > 0) {
        state.heat = Math.min(5, state.heat + ev.heat);
        fx.toast(ev.name + ' GOT AWAY — HEAT +1');
      } else {
        fx.toast(ev.name + ' EXPIRED');
      }
      state.event = null;
    }
  }

  // --- Gigs: timed side jobs, one at a time (chunk D). Seeded, so a
  // run's gigs are the same every time. Worth real money on the way
  // to a mission marker — the difference between grade C and grade A.
  if (!state.gig) {
    state.gigClock = (state.gigClock || 0) + dt;
    if (state.gigClock >= m.gigAt) {
      const g = GIGS[Math.floor(m.gigRng.next() * GIGS.length)];
      const p = randomRoadPoint(m.gigRng, m.city);
      state.gig = { id: g.id, name: g.name, x: p.x, z: p.z, ttl: 45, reward: g.payout };
      state.gigClock = 0;
      m.gigAt = 5;
      fx.toast('GIG — ' + g.name + ' (+$' + g.payout + ')');
    }
  } else {
    const gig = state.gig;
    gig.ttl -= dt;
    if (arrive(state, gig.x, gig.z, 8)) {
      const pay = Math.round(gig.reward * (hasPerk(state, 'smooth') ? 1.25 : 1));
      state.cash += pay; state.earned += pay;
      fx.toast(gig.name + ' DONE +$' + pay);
      state.gig = null;
      state.gigClock = 0;
      m.gigAt = 5;
    } else if (gig.ttl <= 0) {
      fx.toast(gig.name + ' EXPIRED');
      state.gig = null;
      state.gigClock = 0;
      m.gigAt = 5;
    }
  }

  // --- Mission logic. ---
  if (i === 0) {
    if (state.missionPhase === 'steal') {
      if (state.player.vehicleId === 'comet') {
        state.missionPhase = 'drive';
        state.target = TARGETS[0];
        fx.toast('COMET YOURS — DRIVE NORTH');
      }
    } else if (arrive(state, TARGETS[0].x, TARGETS[0].z, 10)) {
      completeMission(m, state, fx);
    }
  } else if (i >= 1 && i <= 4) {
    if (arrive(state, TARGETS[i].x, TARGETS[i].z, 10)) completeMission(m, state, fx);
  } else if (i === 5) {
    state.target = TARGETS[5];
    if (arrive(state, TARGETS[5].x, TARGETS[5].z, 8)) {
      state.missionTimer += dt;
      if (state.missionTimer >= HEIST.vaultHold) completeMission(m, state, fx);
    } else {
      state.missionTimer = 0;
    }
  } else if (i === 6) {
    updateRace(m, state, dt, fx);
  } else if (i === 7) {
    for (const mk of state.branchMarkers) {
      if (arrive(state, mk.x, mk.z, 10)) {
        state.missionChoice = mk.kind;
        if (mk.kind === 'silent') {
          const full = state.heat < BRANCH.silentHeatMax;
          const pay = full ? MISSIONS[7].payout : Math.floor(MISSIONS[7].payout / 2);
          fx.toast(full ? 'SILENT AND CLEAN — FULL PAY' : 'SILENT, BUT THEY SAW YOU — HALF PAY');
          completeMission(m, state, fx, pay);
        } else {
          state.heat = Math.min(5, BRANCH.loudHeat);
          fx.toast('LOUD — HEAT 3, FULL PAY');
          completeMission(m, state, fx, MISSIONS[7].payout);
        }
        break;
      }
    }
  } else if (i === 8) {
    const per = loopLength(CONVOY_LOOP);
    state.convoy.dist = (state.convoy.dist + 12 * dt) % per;
    const pos = loopPoint(CONVOY_LOOP, state.convoy.dist);
    state.convoy.x = pos.x; state.convoy.z = pos.z;
    state.target = { x: pos.x, z: pos.z };
    if (Math.hypot(state.player.x - pos.x, state.player.z - pos.z) <= 25) {
      state.shadowTimer += dt;
      if (state.shadowTimer >= 5) completeMission(m, state, fx);
    }
  } else if (i === 9) {
    updateHeist(m, state, dt, fx);
  }
}
