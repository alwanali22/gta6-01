// sim.js — deterministic autopilot for SOLMAR.
// The autopilot plays through the same keyboard input a human uses
// (input.inject), one fixed-dt step at a time, so a whole run is
// reproducible from its seed alone. The probe drives it with
// window.__solmar.fastForward(); a human never sees it unless ?sim=1
// is in the URL. Nothing here changes payouts or rules — the sim only
// presses keys, and every dollar it earns comes from the game's own
// gigs, events, near-misses and mission payouts.
import { WORLD } from './config.js';
import { makeRng } from './random.js';
import { nearestRoadPoint } from './city.js';
import { nearestCar } from './player.js';

const CODE = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
  nitro: 'ShiftLeft', brake: 'Space', interact: 'KeyE',
  fire: 'KeyF', one: 'Digit1', two: 'Digit2', three: 'Digit3',
};
const ALL = Object.keys(CODE);

const snap = (v) => Math.round((v + 400) / 80) * 80 - 400;
const wrap = (a) => {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
};

// Manhattan route on the road grid: every leg is axis-aligned and runs
// along a road centreline, so the car never cuts through a block of
// buildings. Route: player -> along its current road to the target's
// intersection -> across -> target's road point -> target. (The first
// hop, getting the player onto the grid, is a short axis-aligned step
// that may cross a kerb.)
export function routeTo(px, pz, tx, tz) {
  const wps = [];
  let cx = px, cz = pz;
  const push = (x, z) => {
    const last = wps[wps.length - 1];
    if (!last || Math.hypot(x - last.x, z - last.z) > 0.5) wps.push({ x, z });
  };
  // Push an axis-aligned leg's intermediate grid intersections, then the
  // endpoint. A long leg (e.g. 483u down one road) used to be a single
  // waypoint: the angular error to a 483u-away point is <0.03 rad even
  // 14u off the road line, inside the 0.05 steering dead zone, so the
  // car never corrected its lateral drift and arrived at the next corner
  // 14u off the road — facing the wrong way, needing a 180 deg
  // reverse-to-turn that threw it into a building (race, (226,-243)).
  // Aiming at the next intersection 80u ahead keeps the error visible
  // and the car on the road line.
  const pushLine = (x0, z0, x1, z1) => {
    if (x0 === x1) {
      const step = z1 > z0 ? 80 : -80;
      let z = step > 0 ? Math.floor(z0 / 80) * 80 + 80 : Math.ceil(z0 / 80) * 80 - 80;
      for (; step > 0 ? z < z1 : z > z1; z += step) push(x0, z);
    } else if (z0 === z1) {
      const step = x1 > x0 ? 80 : -80;
      let x = step > 0 ? Math.floor(x0 / 80) * 80 + 80 : Math.ceil(x0 / 80) * 80 - 80;
      for (; step > 0 ? x < x1 : x > x1; x += step) push(x, z0);
    }
    push(x1, z1);
  };
  // 0. Player and target share a road line: drive straight along it.
  // The old code always routed via the nearest intersection, which sent
  // the car 20u south at the start of mission 1 (target straight north
  // on the same road) and triggered a reverse-to-turn that left it
  // drifting off the road into a building.
  const vx = snap(cx), hz = snap(cz);
  if (Math.abs(cx - vx) <= 6 && Math.abs(tx - vx) <= 6) {
    if (Math.abs(cx - vx) > 0.5) { push(vx, cz); cx = vx; }
    pushLine(cx, cz, tx, tz);
    return wps;
  }
  if (Math.abs(cz - hz) <= 6 && Math.abs(tz - hz) <= 6) {
    if (Math.abs(cz - hz) > 0.5) { push(cx, hz); cz = hz; }
    pushLine(cx, cz, tx, tz);
    return wps;
  }
  // 1. Get onto a road line with axis-aligned hops. Only the axis that
  // is off the grid is snapped: the player stays on the road it is
  // already driving, it is NOT dragged to the nearest intersection.
  // (The old code snapped both axes, which sent the car 15u south to
  // z=0 when a gig spawned mid-drive north — the hard brake + reverse
  // that followed spun it off the road facing east, deadlocked.)
  const dxL = Math.abs(cx - snap(cx)), dzL = Math.abs(cz - snap(cz));
  if (dxL > 6 && dzL > 6) {
    const rp = nearestRoadPoint(cx, cz);
    push(rp.x, rp.z); cx = rp.x; cz = rp.z;
  } else if (dxL > 6) {
    push(cx, snap(cz)); cz = snap(cz);
  } else if (dzL > 6) {
    push(snap(cx), cz); cx = snap(cx);
  } else if (dxL > 0.5 || dzL > 0.5) {
    // Near an intersection: snap the nearer axis only.
    if (dxL <= dzL) { push(snap(cx), cz); cx = snap(cx); }
    else { push(cx, snap(cz)); cz = snap(cz); }
  }
  // 2. Route along the CURRENT road line to the target's intersection,
  // then across — never back along a road already passed.
  const txI = snap(tx), tzI = snap(tz);
  if (Math.abs(cx - snap(cx)) <= 0.5) {
    pushLine(cx, cz, cx, tzI); // on a vertical line: stay on it to the target's z
  } else {
    pushLine(cx, cz, txI, cz); // on a horizontal line: stay on it to the target's x
  }
  push(txI, tzI);
  // 3. From the target intersection to the target's road point, then the target.
  const tg = nearestRoadPoint(tx, tz);
  push(tg.x, tg.z);
  push(tx, tz);
  return wps;
}

export function gradeOf(state) {
  return state.earned >= 90000 ? 'S'
    : state.earned >= 60000 ? 'A' : state.earned >= 40000 ? 'B' : 'C';
}

// djb2 over the run's outcome fields — identical across two runs of the
// same seed only if the sim is fully deterministic.
export function simHash(state) {
  const core = JSON.stringify([
    state.done, state.earned, state.cash, state.nearMisses, state.perks,
    state.missionGrades, state.maxHeat, state.bestChain, state.career,
    Math.floor(state.time),
  ]);
  let h = 5381;
  for (let i = 0; i < core.length; i++) h = ((h << 5) + h + core.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

export function simSummary(state) {
  return {
    screen: state.screen,
    mission: state.mission,
    missionPhase: state.missionPhase,
    earned: state.earned,
    cash: state.cash,
    nearMisses: state.nearMisses,
    maxHeat: state.maxHeat,
    bestChain: state.bestChain,
    chain: Math.round(state.chain * 10) / 10,
    heat: Math.round(state.heat * 100) / 100,
    grade: gradeOf(state),
    done: [...state.done],
    perks: [...state.perks],
    time: Math.round(state.time),
    timeOfDay: Math.round((state.timeOfDay || 0) * 100) / 100,
    pos: [Math.round(state.player.x), Math.round(state.player.z)],
    car: state.player.vehicleId,
    carHp: state.player.vehicleId
      ? Math.round((state.cars.find((c) => c.id === state.player.vehicleId) || {}).hp || 0) : 0,
    speed: Math.round(state.player.speed * 10) / 10,
    gig: state.gig ? state.gig.name : null,
    event: state.event ? state.event.name : null,
    standoff: !!state.standoff,
    interior: !!state.interior,
    income: { ...sim.income },
    hash: simHash(state),
    log: [...sim.log].slice(-8),
  };
}

const sim = {
  active: false, seed: 1, city: null,
  rng: null,
  held: new Set(),
  goal: null, wps: [], wpI: 0,
  forceGoal: null,
  steps: 0, result: null,
  log: [],
  lastPos: null, stuckT: 0,
  income: { missions: 0, gigs: 0, events: 0, nearMiss: 0, other: 0 },
  prev: null,
};

export function isSimActive() { return sim.active; }
export function setSimGoal(kind) { sim.forceGoal = kind; }
export function simResult() { return sim.result; }

export function resetSim(seed, city) {
  sim.active = true;
  sim.seed = seed;
  sim.city = city;
  sim.rng = makeRng(1000 + seed);
  sim.goal = null; sim.wps = []; sim.wpI = 0;
  sim.posMark = null; sim.lastGoal = null;
  sim.prevConvoy = null;
  sim.steps = 0; sim.result = null;
  sim.log = [];
  sim.lastPos = null; sim.stuckT = 0;
  sim.income = { missions: 0, gigs: 0, events: 0, nearMiss: 0, other: 0 };
  sim.prev = null;
}

export function stopSim() { sim.active = false; }

function note(state, msg) {
  sim.log.push(Math.round(state.time) + 's ' + msg);
  if (sim.log.length > 60) sim.log.shift();
}

function setKeys(input, want) {
  // Sync the real input to the want set every step, comparing against
  // input.held — NOT a shadow set. resetSim() used to clear the sim's
  // shadow while the title-screen E stayed held in the input, so the
  // arrival inject of the same key produced no pressed edge and the sim
  // stood next to the Comet holding a dead E forever.
  for (const a of ALL) {
    const w = want.has(a);
    const h = input.held(a);
    if (w && !h) input.inject(CODE[a], true);
    else if (!w && h) input.inject(CODE[a], false);
  }
}

// Drive the car toward a waypoint: steer, throttle, brake for corners,
// nitro on long straights. Reverses to turn around when facing the
// wrong way at low speed.
function driveKeys(state, input, want, goal) {
  const pl = state.player;
  if (!sim.goal || sim.goal.kind !== goal.kind || sim.goal.x !== goal.x || sim.goal.z !== goal.z) {
    sim.goal = { ...goal };
    sim.wps = routeTo(pl.x, pl.z, goal.x, goal.z);
    sim.wpI = 0;
  }
  while (sim.wpI < sim.wps.length) {
    const w = sim.wps[sim.wpI];
    if (Math.hypot(w.x - pl.x, w.z - pl.z) < 10) sim.wpI++;
    else break;
  }
  const wp = sim.wps[sim.wpI] || goal;
  const dist = Math.hypot(goal.x - pl.x, goal.z - pl.z);
  // A moving target (shadow: the convoy) must be trailed, not stopped
  // at — the arrive-brake parks the car at speed < 2 while the convoy
  // drives on and the police close in (busted at t=402). follow skips
  // the brake; the cruise/slowNear speed match does the work.
  if (dist <= (goal.arrive || 10) && !goal.follow) {
    if (pl.speed > 2) want.add('brake');
    return;
  }
  // Roadblock ahead: slow below the 10-speed hit threshold.
  const P = state.police;
  let slow = false;
  if (P && P.roadblocks) {
    for (const rb of P.roadblocks) {
      if (Math.hypot(rb.x - pl.x, rb.z - pl.z) < 26 && pl.speed > 9) slow = true;
    }
  }
  const dx = wp.x - pl.x, dz = wp.z - pl.z;
  const desired = Math.atan2(dx, dz);
  const err = wrap(desired - pl.heading);
  const speed = pl.speed;
  const wdist = Math.hypot(dx, dz);
  // Effective cruise: slowNear caps the speed close to the goal so the
  // car arrives gently and can stop/turn instead of overshooting (the
  // race start line: cruise 46 out, 8 within 120u).
  const effCruise = (goal.slowNear !== undefined && dist < goal.slowNear)
    ? (goal.slowSpeed !== undefined ? goal.slowSpeed : 8)
    : goal.cruise;
  let sharp = false;
  if (sim.wpI + 1 < sim.wps.length) {
    const n = sim.wps[sim.wpI + 1];
    const a1 = Math.atan2(wp.x - pl.x, wp.z - pl.z);
    const a2 = Math.atan2(n.x - wp.x, n.z - wp.z);
    if (Math.abs(wrap(a2 - a1)) > 0.9 && wdist < 45) sharp = true;
  }
  // Distance to the next sharp turn along the route (for nitro): scan
  // ahead for the first waypoint where the direction changes >0.9 rad.
  // The old check used wdist (distance to the next waypoint), which is
  // now <=80u because pushLine splits long legs into intersections —
  // nitro would never fire. A turn is what matters, not a waypoint.
  let turnDist = Infinity;
  for (let i = sim.wpI; i + 1 < sim.wps.length; i++) {
    const a = sim.wps[i], b = sim.wps[i + 1];
    const prev = i === 0 ? { x: pl.x, z: pl.z } : sim.wps[i - 1];
    const d1 = Math.atan2(a.x - prev.x, a.z - prev.z);
    const d2 = Math.atan2(b.x - a.x, b.z - a.z);
    if (Math.abs(wrap(d2 - d1)) > 0.9) {
      turnDist = Math.hypot(a.x - pl.x, a.z - pl.z);
      break;
    }
  }
  if (Math.abs(err) > 1.1 && speed < 3) {
    // Facing well away from the waypoint and (nearly) stopped: reverse
    // with steering to spin the car around in place instead of creeping
    // forward into the block. The old 2.2 threshold left a 63-126 deg
    // dead zone: the car crept forward at 3 u/s while turning at
    // 0.2 rad/s and drove into a building (mission 3, (136,-38)).
    want.add('down');
    if (err > 0.15) want.add('left');
    else if (err < -0.15) want.add('right');
  } else {
    // Tight dead zone: the car drifts off a 6u-half-width road on a
    // long straight if the heading error sits inside a 0.12 dead zone
    // (mission 1 drifted 6u east at nitro speed and hit a building).
    if (err > 0.05) want.add('right');
    else if (err < -0.05) want.add('left');
    if (Math.abs(err) < 1.1) {
      if (effCruise !== undefined) {
        if (speed < effCruise) want.add('up');
        else if (speed > effCruise + 3) want.add('brake');
      } else if (!sharp || speed < 14) want.add('up');
      if (goal.nitro !== false && Math.abs(err) < 0.15 && speed > 20
        && state.nitro > 0.25 && turnDist > 80) want.add('nitro');
    } else if (speed > 8 || sharp) want.add('brake');
  }
  if (slow) { want.delete('up'); want.delete('nitro'); want.add('brake'); }
  // Probe safehouse exit: stopped at the door, step out.
  if (goal.kind === 'safehouse' && dist < 12) {
    if (speed > 1) { want.add('brake'); want.delete('up'); }
    else want.add('interact');
  }
}

// On foot, follow the road route to the goal instead of walking in a
// straight line. footKeys walks directly toward the goal with absolute
// headings, so a building in the way wedges the player forever (the
// car wrecked at (-317,-320) left the player stuck at (-148,-214)
// holding nitro+right into a wall for 600s). The road route keeps the
// player on roads, where there are no buildings.
function walkRouteKeys(state, input, want, goal) {
  const pl = state.player;
  if (!sim.goal || sim.goal.kind !== goal.kind || sim.goal.x !== goal.x || sim.goal.z !== goal.z) {
    sim.goal = { ...goal };
    sim.wps = routeTo(pl.x, pl.z, goal.x, goal.z);
    sim.wpI = 0;
  }
  while (sim.wpI < sim.wps.length) {
    const w = sim.wps[sim.wpI];
    if (Math.hypot(w.x - pl.x, w.z - pl.z) < 4) sim.wpI++;
    else break;
  }
  const wp = sim.wps[sim.wpI] || goal;
  const dist = Math.hypot(goal.x - pl.x, goal.z - pl.z);
  if (dist <= (goal.arrive || 4)) {
    if (goal.kind === 'safehouse' || goal.kind === 'exit'
      || goal.kind === 'steal' || goal.kind === 'enter') {
      want.add('interact');
    }
    return;
  }
  // Walk toward the current route waypoint (on a road) with absolute
  // headings: up = +z, right = +x.
  const h = Math.atan2(wp.x - pl.x, wp.z - pl.z);
  const sx = Math.sin(h), cz = Math.cos(h);
  if (cz > 0.3) want.add('up');
  else if (cz < -0.3) want.add('down');
  if (sx > 0.3) want.add('right');
  else if (sx < -0.3) want.add('left');
  if (dist > 40) want.add('nitro');
  // A police unit closing in on foot: shoot it before it gets close.
  const P = state.police;
  if (P && P.units && state.combatCd <= 0) {
    for (const u of P.units) {
      if (u.disabled <= 0 && Math.hypot(u.x - pl.x, u.z - pl.z) < 30) {
        want.add('fire');
        break;
      }
    }
  }
}

// On foot the heading follows the pressed keys absolutely:
// up = +z, right = +x. Convert the desired heading into keys.
function footKeys(state, input, want, goal) {
  const pl = state.player;
  const dist = Math.hypot(goal.x - pl.x, goal.z - pl.z);
  if (dist <= (goal.arrive || 4)) {
    if (goal.kind === 'safehouse' || goal.kind === 'exit'
      || goal.kind === 'steal' || goal.kind === 'enter') {
      want.add('interact');
    }
    return;
  }
  const h = Math.atan2(goal.x - pl.x, goal.z - pl.z);
  const sx = Math.sin(h), cz = Math.cos(h);
  if (cz > 0.3) want.add('up');
  else if (cz < -0.3) want.add('down');
  if (sx > 0.3) want.add('right');
  else if (sx < -0.3) want.add('left');
  if (dist > 40) want.add('nitro');
  // A police unit closing in on foot: shoot it before it gets close.
  const P = state.police;
  if (P && P.units && state.combatCd <= 0) {
    for (const u of P.units) {
      if (u.disabled <= 0 && Math.hypot(u.x - pl.x, u.z - pl.z) < 30) {
        want.add('fire');
        break;
      }
    }
  }
}

function standoffKeys(state, input, want) {
  const pl = state.player;
  const s = state.standoff;
  const d = Math.hypot(s.x - pl.x, s.z - pl.z);
  if (pl.onFoot) {
    if (d > 30) footKeys(state, input, want, { kind: 'standoff', x: s.x, z: s.z, arrive: 30 });
    else if (state.combatCd <= 0) want.add('fire');
  } else if (d > 30) {
    driveKeys(state, input, want, { kind: 'standoff', x: s.x, z: s.z, arrive: 30 });
  } else if (pl.speed > 1) {
    want.add('brake');
  } else if (state.combatCd <= 0) {
    want.add('fire');
  }
}

function pickGoal(state) {
  const pl = state.player;
  if (sim.forceGoal === 'safehouse') {
    if (state.interior) { sim.forceGoal = null; return null; }
    return { kind: 'safehouse', x: WORLD.safehouse.x, z: WORLD.safehouse.z, arrive: 8 };
  }
  if (sim.forceGoal === 'exit') {
    if (!state.interior) { sim.forceGoal = null; return null; }
    return { kind: 'exit', x: -160, z: -33, arrive: 2 };
  }
  // On foot: get a car first (except the safehouse, handled above).
  if (pl.onFoot) {
    // Escape on foot: the heist escape completes when the PLAYER reaches
    // the safehouse, car or no car. After the Comet wrecks, chasing a
    // moving traffic car on foot is futile (it outruns the player) and
    // the straight-line walk wedges the player against a building
    // (stuck at (-148,-214) for 600s). Walk the road route to the
    // safehouse instead.
    if (state.mission === 9 && state.missionPhase === 'escape' && state.target) {
      return { kind: 'mission', x: state.target.x, z: state.target.z, arrive: 10 };
    }
    if (state.standoff) {
      return { kind: 'standoff', x: state.standoff.x, z: state.standoff.z, arrive: 30 };
    }
    const owned = state.cars.filter((c) => c.owner === 'player' && c.hp > 0 && c.visible);
    let car = null;
    if (owned.length) {
      car = owned[0];
      let bd = 1e9;
      for (const c of owned) {
        const d = Math.hypot(c.x - pl.x, c.z - pl.z);
        if (d < bd) { bd = d; car = c; }
      }
    } else {
      car = nearestCar(state, pl.x, pl.z, 500);
    }
    if (car) {
      return {
        kind: car.owner === 'player' ? 'enter' : 'steal',
        x: car.x, z: car.z, arrive: 4,
      };
    }
    return null;
  }
  // Mission 1: steal the Comet before anything else.
  if (state.mission === 0 && state.missionPhase === 'steal') {
    const comet = state.cars.find((c) => c.id === 'comet');
    if (comet) return { kind: 'steal', x: comet.x, z: comet.z, arrive: 4 };
  }
  // Branch choice: silent when the heat is low, loud otherwise.
  if (state.mission === 7 && state.missionPhase === 'branch') {
    const kind = state.heat < 1 ? 'silent' : 'loud';
    const mk = (state.branchMarkers || []).find((m) => m.kind === kind);
    if (mk) return { kind: 'branch', x: mk.x, z: mk.z, arrive: 10 };
  }
  // Shadow the convoy: tail it at cruise speed.
  // INTERCEPT, not chase: aim 15u ahead of the convoy along its
  // direction of travel. Chasing its exact position always arrives
  // where the convoy WAS; the car overshoots the corner at 30 u/s,
  // reverses, and gets busted (t=279). The lead point moves with the
  // convoy, so the car trails it at a constant ~15u and the 5s timer
  // ticks without stopping. Cruise 30 to close, slowNear 40u to drop
  // to 12 and match the convoy once close, follow (never brake on
  // arrival — a moving target must be trailed, not stopped at).
  if (state.mission === 8 && state.missionPhase === 'shadow' && state.convoy) {
    const cv = state.convoy;
    let dx = 0, dz = 0;
    if (sim.prevConvoy) {
      dx = cv.x - sim.prevConvoy.x;
      dz = cv.z - sim.prevConvoy.z;
    }
    sim.prevConvoy = { x: cv.x, z: cv.z };
    // Direction of travel (axis-aligned, 0.2u/step at 12 u/s). If the
    // convoy just spawned, fall back to no lead.
    const m = Math.hypot(dx, dz);
    const lead = 15;
    const lx = m > 0.01 ? cv.x + (dx / m) * lead : cv.x;
    const lz = m > 0.01 ? cv.z + (dz / m) * lead : cv.z;
    return {
      kind: 'shadow', x: lx, z: lz,
      arrive: 25, cruise: 30, slowNear: 40, slowSpeed: 12,
      nitro: false, follow: true,
    };
  }
  // Near-miss farm (grade A): before the final heist, when the chain
  // is maxed (5 after 9 missions) and LUCKY doubles the payout, each
  // near-miss is $2,500. Missions pay $30,600 total and the final
  // heist $5,000, so the sim needs $56,000 banked before mission 10
  // to land grade A (>= $60k). Farm traffic during prep1/prep2 (no
  // time limit there — the clock only matters in the race): drive at
  // the nearest traffic car and pass within 7u. A bump at <3.4u is
  // only 4 damage, worth it. Skip cars on their 4s near-miss
  // cooldown. The farm never fires during the vault/escape (the vault
  // branch in simUpdate returns before pickGoal, and the phase guard
  // below keeps it out of the escape).
  if (state.mission === 9 && state.earned < 56000 && !pl.onFoot
    && (state.missionPhase === 'prep1' || state.missionPhase === 'prep2')) {
    const cars = (state.traffic || []).filter((t) => !t.rival);
    if (cars.length) {
      let best = null, bd = 1e9;
      for (const t of cars) {
        const cd = t.nearAt ? state.time - t.nearAt : 1e9;
        if (cd < 5) continue; // on cooldown, skip
        const d = Math.hypot(t.x - pl.x, t.z - pl.z);
        if (d < bd) { bd = d; best = t; }
      }
      // If every car is on cooldown, take the nearest anyway (it will
      // be off cooldown by the time the car gets there).
      if (!best) {
        for (const t of cars) {
          const d = Math.hypot(t.x - pl.x, t.z - pl.z);
          if (d < bd) { bd = d; best = t; }
        }
      }
      if (best) {
        return {
          kind: 'farm', x: best.x, z: best.z, arrive: 6, cruise: 30,
          nitro: false, follow: true,
        };
      }
    }
  }
  // Race (mission 6): the clock runs from the start line and the fastest
  // rival finishes the 1920u loop in 91.4s, so the car must average
  // >21 u/s — but a 12u-wide road with buildings 3.4u off it punishes
  // 46 u/s + nitro: the car drifts off the road, and the 180 deg
  // reversal at the start line flings it off the map (z=-384) and the
  // recovery wedges it against a building. So: cruise 46 to the start
  // line but slowNear 120u (cap 8) so the car arrives gently, stops,
  // and reverse-to-turns in place; cruise 36 on the loop (fast enough
  // for ~80s, slow enough to stay on the road). No gig/event detours
  // during the race — the clock is ticking. (This branch returns before
  // the gig/event detour below, so the race is never diverted.)
  if (state.mission === 6 && state.missionPhase === 'race' && state.target) {
    const racing = state.raceCp >= 1;
    return {
      kind: 'mission', x: state.target.x, z: state.target.z, arrive: 10,
      cruise: racing ? 36 : 46, nitro: false,
      ...(racing ? {} : { slowNear: 120, slowSpeed: 8 }),
    };
  }
  // Opportunistic income: a gig or event close enough to be worth it.
  const gig = state.gig;
  if (gig && gig.ttl > 10) {
    const d = Math.hypot(gig.x - pl.x, gig.z - pl.z);
    if (d < 300) return { kind: 'gig', x: gig.x, z: gig.z, arrive: 8 };
  }
  const ev = state.event;
  if (ev && ev.ttl > 8) {
    const d = Math.hypot(ev.x - pl.x, ev.z - pl.z);
    if (d < 300) return { kind: 'event', x: ev.x, z: ev.z, arrive: 6 };
  }
  // Otherwise: the mission target.
  if (state.target) {
    return { kind: 'mission', x: state.target.x, z: state.target.z, arrive: 10 };
  }
  return null;
}

export function simUpdate(state, input, dt, fx, city) {
  if (!sim.active) return;
  sim.steps++;
  // Attribute this step's earned dollars to whatever just happened, so
  // the probe can report the income mix (missions / gigs / events /
  // near-misses). Approximate when two things land on the same step.
  const prev = sim.prev;
  if (prev) {
    const dEarned = state.earned - prev.earned;
    if (dEarned > 0) {
      if (state.nearMisses > prev.nearMisses) sim.income.nearMiss += dEarned;
      else if (state.done.length > prev.done) sim.income.missions += dEarned;
      else if (prev.gig && !state.gig) sim.income.gigs += dEarned;
      else if (prev.event && !state.event) sim.income.events += dEarned;
      else sim.income.other += dEarned;
    }
    if (state.done.length > prev.done) {
      note(state, 'MISSION ' + state.done[state.done.length - 1] + ' DONE earned $' + state.earned);
    }
  }
  sim.prev = {
    earned: state.earned, nearMisses: state.nearMisses, done: state.done.length,
    gig: !!state.gig, event: !!state.event,
  };
  const want = new Set();
  const screen = state.screen;

  if (screen === 'title') { want.add('interact'); setKeys(input, want); return; }
  if (screen === 'draft') {
    // Smart draft: pick the highest-value perk offered, not always the
    // first. ARMOR keeps the car alive through the heat-5 escape (the
    // car enters mission 9 at 48 hp and the escape wrecks it); LUCKY
    // doubles near-miss payouts (the grade-A lever); SMOOTH boosts
    // gigs; GHOST/NERVES cut police pressure. Priority order below.
    const opts = state.draftOptions || [];
    const have = new Set(state.perks || []);
    const prio = ['armor', 'lucky', 'smooth', 'ghost', 'nerves'];
    let idx = 0;
    for (const p of prio) {
      const i = opts.findIndex((o) => o.id === p && !have.has(p));
      if (i >= 0) { idx = i; break; }
    }
    want.add(['one', 'two', 'three'][idx] || 'one');
    setKeys(input, want);
    return;
  }
  if (screen === 'victory' || screen === 'busted' || screen === 'wasted') {
    if (!sim.result) {
      sim.result = {
        screen, steps: sim.steps, earned: state.earned, grade: gradeOf(state),
        log: [...sim.log],
      };
      note(state, 'END ' + screen + ' earned $' + state.earned + ' grade ' + gradeOf(state));
      sim.active = false;
    }
    setKeys(input, want);
    return;
  }
  if (screen !== 'play' || !state.runActive) { setKeys(input, want); return; }

  // Stuck watch: less than 1u of movement in a second of game time,
  // sustained for 10 s, means the route is blocked — clear it and
  // re-plan. (Per-step movement is <2u even at full speed, so the old
  // per-step check fired constantly.)
  const pl = state.player;
  if (!sim.posMark) sim.posMark = { x: pl.x, z: pl.z, t: state.time };
  if (state.time - sim.posMark.t >= 1) {
    const moved = Math.hypot(pl.x - sim.posMark.x, pl.z - sim.posMark.z);
    const exempt = state.standoff
      || ((state.mission === 5 || state.mission === 9) && state.missionPhase === 'vault');
    if (moved < 1 && !exempt) {
      sim.stuckT += 1;
      if (sim.stuckT > 10) {
        note(state, 'STUCK at ' + Math.round(pl.x) + ',' + Math.round(pl.z)
          + ' goal ' + (sim.lastGoal || 'none'));
        sim.wps = []; sim.wpI = 0; sim.goal = null;
        sim.stuckT = 0;
      }
    } else {
      sim.stuckT = 0;
    }
    sim.posMark = { x: pl.x, z: pl.z, t: state.time };
  }

  // A shootout: fight it, nothing else matters.
  if (state.standoff) { standoffKeys(state, input, want); setKeys(input, want); return; }

  // Vault hold: PARK on the vault, do not orbit. The vault timer needs
  // 5 continuous seconds within 8 u, and the car's minimum turning
  // radius is top/(1.9*grip) = 24 u for the Comet — a 5 u orbit is
  // physically impossible, so the car swung out to r=12 and the timer
  // kept resetting (max 2.2 s in the t=140-290 trace). Parking is
  // safe: a bust needs heat > 0 AND a unit within 4.5 u AND speed < 2
  // for 2 s, and heat is 0 when the vault phase starts; units spawn
  // 60-120 u away and cannot close in the 5 s the hold takes.
  // Approach gently (cruise 8) so the car stops near the vault instead
  // of overshooting past it at 46 u/s.
  if ((state.mission === 5 || state.mission === 9) && state.missionPhase === 'vault') {
    const v = state.target;
    const d = Math.hypot(v.x - pl.x, v.z - pl.z);
    if (d > 4) {
      driveKeys(state, input, want, {
        kind: 'vault', x: v.x, z: v.z, arrive: 4, cruise: 8, nitro: false,
      });
    } else if (Math.abs(pl.speed) > 1) {
      want.add('brake');
    }
    // else: parked on the vault — hold still, the timer ticks.
    if (state.boss && state.boss.hp > 0 && state.combatCd <= 0) want.add('fire');
    setKeys(input, want);
    return;
  }

  const goal = pickGoal(state);
  sim.lastGoal = goal ? goal.kind : 'none';
  if (!goal) { setKeys(input, want); return; }
  if (pl.onFoot) walkRouteKeys(state, input, want, goal);
  else driveKeys(state, input, want, goal);
  setKeys(input, want);
}
