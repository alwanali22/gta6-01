// Story missions, perk drafts, side gigs and random events.
// All 12 missions from config.js, each with a real target on the
// map, a timer where the brief promises one, and a pay on arrival.
// A mission pays only when its condition is really met in play;
// the grade at the end comes from cash actually earned.
import { CONFIG } from "./config.js";

// Where each mission ends. Race checkpoints are visited in order.
const TARGETS = {
  m1: { x: -280, z: -160 },
  m2: { x: -160, z: 240 },
  m3: { x: 200, z: -200 },
  m4: { x: 200, z: 200 },
  m5: { x: -160, z: -240 },
  m6: { x: 240, z: 240 },
  m7: { x: 80, z: 80 },
  m8: { x: 160, z: -160 },
  m9: { x: -240, z: 200 },
  m10: { x: -160, z: -160 },
  m11: { x: -300, z: -160 },
  m12: { x: 160, z: -240 },
};

const RACE_POINTS = [
  { x: 80, z: 80 }, { x: 240, z: 80 }, { x: 240, z: 240 },
  { x: 80, z: 240 }, { x: 160, z: 160 },
];

export function gradeFor(earned) {
  if (earned >= CONFIG.economy.grades.S) return "S";
  if (earned >= CONFIG.economy.grades.A) return "A";
  if (earned >= CONFIG.economy.grades.B) return "B";
  return "C";
}

export function createRunner(rng) {
  return {
    rng,
    phase: 0,
    timer: 0,
    checkpoint: 0,
    holdTime: 0,
    followTime: 0,
    branch: null,
    target: null,
    gig: null,
    eventTimer: 42,
    rivalTime: [0, 0],
    bossHp: 100,
    done: false,
  };
}

export function missionTarget(m) {
  return TARGETS[m.id] || { x: 0, z: 0 };
}

export function startMission(runner, state) {
  const m = CONFIG.missions[state.missionIndex];
  if (!m) return;
  runner.phase = 0;
  runner.checkpoint = 0;
  runner.holdTime = 0;
  runner.followTime = 0;
  runner.branch = null;
  runner.bossHp = 100;
  runner.timer = m.id === "m7" ? m.limit : m.id === "m4" ? 90 : 0;
  runner.rivalTime = [runner.rng.range(88, 97), runner.rng.range(90, 99)];
  runner.target = { ...missionTarget(m) };
  if (m.id === "m7") runner.target = { ...RACE_POINTS[0] };
  if (m.id === "m9") runner.target = { x: -240, z: 200 };
  state.objective = { ...runner.target };
  state.missionTimer = runner.timer;
  state.toast = `MISSION ${state.missionIndex + 1}/12 — ${m.name}`;
  state.dialogue = `NADIA: "${m.line}"`;
}

// Branch choice for TWO WAYS OUT: 1 = silent, 2 = loud.
export function chooseBranch(runner, state, loud) {
  const m = CONFIG.missions[state.missionIndex];
  if (!m || m.id !== "m8" || runner.branch) return false;
  runner.branch = loud ? "LOUD" : "SILENT";
  runner.target = loud ? { x: -80, z: -240 } : { x: 160, z: -160 };
  state.objective = { ...runner.target };
  if (loud) state.wanted = Math.min(5, state.wanted + 2);
  state.toast = loud ? "LOUD — ROOK HEARD THAT" : "SILENT — NO ALARM";
  return true;
}

// Perk draft: 3 distinct perks Milo does not own yet. If the deck
// is nearly empty, the remaining perks fill the draft.
export function makeDraft(runner, state) {
  const owned = state.perks || new Set();
  const pool = CONFIG.perks.filter((p) => !owned.has(p.id));
  const deck = pool.length >= 3 ? pool : CONFIG.perks;
  const options = [];
  while (options.length < 3 && deck.length) {
    const p = deck[Math.floor(runner.rng.next() * deck.length)];
    if (!options.includes(p)) options.push(p);
  }
  state.draft = { options };
  state.screen = "draft";
  return options;
}

export function pickPerk(runner, state, idx) {
  if (!state.draft) return false;
  const p = state.draft.options[idx];
  if (!p) return false;
  if (!state.perks) state.perks = new Set();
  state.perks.add(p.id);
  state.toast = `PERK — ${p.name}: ${p.text}`;
  state.draft = null;
  state.screen = "play";
  if (state.missionIndex < CONFIG.missions.length) startMission(runner, state);
  else finishRun(state);
  return true;
}

export function finishRun(state) {
  const earned = state.stats ? state.stats.earned : state.cash;
  state.grade = gradeFor(earned);
  state.screen = "victory";
  state.toast = `SOLMAR IS YOURS — GRADE ${state.grade}`;
}

// Side gigs: a timed run to a district centre. Pay on arrival.
export function startGig(runner, state, gigId) {
  const gig = CONFIG.gigs.find((g) => g.id === gigId) || CONFIG.gigs[0];
  const spots = [
    { x: -160, z: -160 }, { x: 160, z: -160 },
    { x: -160, z: 160 }, { x: 160, z: 160 },
  ];
  const target = spots[Math.floor(runner.rng.next() * spots.length)];
  runner.gig = { id: gig.id, name: gig.name, pay: gig.pay, target, timer: gig.id === "parcel" ? 60 : gig.id === "stunt" ? 30 : 45 };
  state.objective = { ...target };
  state.toast = `GIG — ${gig.name}: ${gig.text}`;
  return runner.gig;
}

function pay(state, amount, why) {
  state.cash += amount;
  if (state.stats) {
    state.stats.earned += amount;
    if (why === "mission") state.stats.missionsDone += 1;
    if (why === "gig") state.stats.gigsDone += 1;
  }
}

function completeMission(runner, state) {
  const m = CONFIG.missions[state.missionIndex];
  if (!m) return;
  pay(state, m.pay, "mission");
  state.rep = (state.rep || 0) + 120;
  state.toast = `MISSION COMPLETE — ${m.name} +$${m.pay.toLocaleString("en-US")}`;
  state.missionIndex += 1;
  state.objective = null;
  runner.target = null;
  if (state.missionIndex >= CONFIG.missions.length) {
    finishRun(state);
  } else {
    makeDraft(runner, state);
  }
}

function failMission(runner, state, why) {
  state.toast = `MISSION FAILED — ${why}`;
  state.objective = null;
  runner.target = null;
  // A failed mission can be retried: restart the same mission.
  startMission(runner, state);
}

// One mission step. pos is Milo's position (foot or car).
export function updateMission(runner, state, dt, pos) {
  if (state.screen !== "play") return;
  const m = CONFIG.missions[state.missionIndex];
  if (!m) return;

  // Random event every ~42 s while driving the story.
  runner.eventTimer -= dt;
  if (runner.eventTimer <= 0) {
    runner.eventTimer = runner.rng.range(38, 55);
    const roll = runner.rng.next();
    if (roll < 0.4) {
      pay(state, 300, "event");
      state.toast = "LOOSE CASH — +$300 FOUND ON THE BOULEVARD";
    } else if (roll < 0.7) {
      state.wanted = Math.min(5, state.wanted + 1);
      state.toast = "ROOK PATROL — WANTED UP";
    } else {
      state.chain = Math.min(5, (state.chain || 1) + 1);
      state.toast = "GETAWAY RUSH — CHAIN UP";
    }
  }

  // A gig overrides the mission target until it ends.
  if (runner.gig) {
    const g = runner.gig;
    g.timer -= dt;
    state.missionTimer = g.timer;
    if (Math.hypot(pos.x - g.target.x, pos.z - g.target.z) < 14) {
      pay(state, g.pay, "gig");
      state.toast = `GIG DONE — ${g.name} +$${g.pay}`;
      runner.gig = null;
      state.objective = runner.target ? { ...runner.target } : null;
      return;
    }
    if (g.timer <= 0) {
      state.toast = `GIG FAILED — ${g.name} TOO SLOW`;
      runner.gig = null;
      state.objective = runner.target ? { ...runner.target } : null;
    }
    return;
  }

  // Timed missions: the race and the neon run.
  if (runner.timer > 0) {
    runner.timer -= dt;
    state.missionTimer = runner.timer;
    if (runner.timer <= 0) {
      failMission(runner, state, m.id === "m7" ? "RACE TIME UP" : "TOO SLOW");
      return;
    }
  }

  const dist = runner.target ? Math.hypot(pos.x - runner.target.x, pos.z - runner.target.z) : 9999;

  if (m.id === "m7") {
    // Race: 5 checkpoints in order, rivals finish on their own clock.
    if (dist < 16) {
      runner.checkpoint += 1;
      state.toast = `CHECKPOINT ${runner.checkpoint}/5`;
      if (runner.checkpoint >= RACE_POINTS.length) {
        const rivalBest = Math.min(...runner.rivalTime);
        const myTime = m.limit - runner.timer;
        if (myTime <= rivalBest) completeMission(runner, state);
        else failMission(runner, state, "RIVALS BEAT YOU");
        return;
      }
      runner.target = { ...RACE_POINTS[runner.checkpoint] };
      state.objective = { ...runner.target };
    }
    return;
  }

  if (m.id === "m8" && !runner.branch) {
    state.toast = "TWO WAYS OUT — PRESS 1 SILENT, 2 LOUD";
    return;
  }

  if (m.id === "m9") {
    // Ghost convoy: the target truck rolls east along Dockside.
    runner.target.x = Math.min(240, runner.target.x + 12 * 0.55 * dt);
    state.objective = { ...runner.target };
    if (dist >= 8 && dist <= 40) {
      runner.followTime += dt;
      state.toast = `SHADOWING CONVOY — ${Math.ceil(20 - runner.followTime)}s LEFT`;
      if (runner.followTime >= 20) { completeMission(runner, state); return; }
    } else if (dist < 8) {
      state.toast = "TOO CLOSE — BACK OFF";
      runner.followTime = Math.max(0, runner.followTime - dt);
    }
    return;
  }

  if (m.id === "m10") {
    // Three-phase heist: two drops, then hold the boss zone.
    if (runner.phase === 0 && dist < 14) {
      runner.phase = 1;
      runner.target = { x: 0, z: -160 };
      state.objective = { ...runner.target };
      state.toast = "PHASE 1 DONE — INSIDE";
      return;
    }
    if (runner.phase === 1 && dist < 14) {
      runner.phase = 2;
      runner.target = { x: 160, z: -160 };
      state.objective = { ...runner.target };
      state.toast = "PHASE 2 DONE — VOSS IS HERE";
      return;
    }
    if (runner.phase === 2) {
      if (dist < 18) {
        runner.bossHp -= 8 * dt;
        state.bossHp = Math.max(0, runner.bossHp);
        state.toast = `MARCUS VOSS — HP ${Math.ceil(state.bossHp)}`;
        if (runner.bossHp <= 0) { completeMission(runner, state); return; }
      }
      return;
    }
    return;
  }

  if (m.id === "m11") {
    if (dist < 12) {
      runner.holdTime += dt;
      state.toast = `HOLD THE PIER — ${Math.ceil(20 - runner.holdTime)}s LEFT`;
      if (runner.holdTime >= 20) { completeMission(runner, state); return; }
    } else {
      runner.holdTime = Math.max(0, runner.holdTime - dt * 0.5);
    }
    return;
  }

  // Steal / deliver / escape / chase / heist: reach the marker.
  if (dist < 14) {
    completeMission(runner, state);
  }
}

// HUD lines for the objective box: name, timer, progress.
export function missionHud(runner, state) {
  const m = CONFIG.missions[state.missionIndex];
  if (!m) return { objective: "FREE ROAM — SOLMAR IS YOURS", timer: "ALL 12 MISSIONS DONE" };
  let timer = "LOSE: BUSTED OR WASTED";
  if (runner.gig) timer = `GIG ${runner.gig.name} — ${Math.max(0, Math.ceil(runner.gig.timer))}s LEFT`;
  else if (runner.timer > 0) timer = `TIME LEFT ${Math.max(0, Math.ceil(runner.timer))}s — LOSE: TIME UP`;
  else if (m.id === "m7") timer = `CHECKPOINT ${runner.checkpoint + 1}/5 — LOSE: TIME UP`;
  else if (m.id === "m10") timer = `HEIST PHASE ${runner.phase + 1}/3 — BOSS HP ${Math.ceil(state.bossHp ?? 100)}`;
  else if (m.id === "m9") timer = `SHADOW THE CONVOY — ${Math.ceil(Math.max(0, 20 - runner.followTime))}s TO GO`;
  else if (m.id === "m11") timer = `HOLD — ${Math.ceil(Math.max(0, 20 - runner.holdTime))}s TO GO`;
  return { objective: `${m.name} — ${m.brief}`, timer };
}
