// Deterministic autopilot: plays SOLMAR end to end through the
// real game systems — hotwire, driving, missions, drafts, gigs,
// near-miss chains, police — on a fixed 0.05 s step, with its own
// seeded RNG. No wall clock, no Math.random, so two runs of one
// seed produce the same hash. Grade A comes from real earnings:
// missions pay $37,000; gigs + near-miss chains earn the rest.
import { CONFIG } from "./config.js";
import { makeRng } from "./random.js";
import { driveStep, takeCar, nearestParked } from "./vehicles.js";
import { footStep, hotwireTick } from "./player.js";
import {
  createRunner, startMission, updateMission,
  chooseBranch, pickPerk, startGig,
} from "./missions.js";
import { updatePolice, activeUnits } from "./police.js";
import { updateTraffic } from "./traffic.js";
import { updateStandoff } from "./combat.js";
import { inject } from "./input.js";
import { addRep, checkFeats } from "./respect.js";
import { ensureGarage } from "./garage.js";
import { saveGame } from "./save.js";

const DT = 0.05;
const GIGS = ["parcel", "cab", "stunt"];
const SAFEHOUSE = { x: -280, z: 280 };

function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function norm(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const snap = (v) => Math.max(-320, Math.min(320, Math.round(v / 80) * 80));

// Road-grid route: axis-aligned legs only — first to the nearest
// road, then along roads, then the target itself. A diagonal
// first leg cuts across building blocks and wrecks cars.
function route(x, z, tx, tz) {
  const cx = snap(x), cz = snap(z), rx = snap(tx), rz = snap(tz);
  const first = Math.abs(x - cx) <= Math.abs(z - cz) ? { x: cx, z } : { x, z: cz };
  const pts = [first, { x: cx, z: cz }, { x: cx, z: rz }, { x: rx, z: rz }, { x: tx, z: tz }];
  const out = [];
  let px = x, pz = z;
  for (const p of pts) {
    if (Math.hypot(p.x - px, p.z - pz) > 8) { out.push(p); px = p.x; pz = p.z; }
  }
  return out;
}

function steal(S, target) {
  const st = S.state;
  const car = takeCar(target);
  car.parked = target;
  ensureGarage(st);
  if (!st.garage.owned.includes(car.spec.id)) st.garage.owned.push(car.spec.id);
  car.upgrades = { ...(st.garage.upgrades[car.spec.id] || { engine: 0, brakes: 0, nos: 0 }) };
  st.car = car;
  st.mode = "chase";
  st.heading = car.heading;
  st.stats.stolen += 1;
  addRep(st, 20);
  if (!st.perks.has("wiring")) st.wanted = Math.min(5, st.wanted + 1);
  st.toast = `STOLEN — ${car.spec.name} (WANTED ${st.wanted})`;
  S.milo.visible = false;
}

function wreck(S) {
  const st = S.state;
  const ref = st.car && st.car.parked;
  if (ref) { ref.x = st.car.x; ref.z = st.car.z; ref.stolen = false; }
  st.car = null;
  st.mode = "foot";
  st.speed = 0;
  S.milo.visible = true;
  S.milo.position.set(st.x, 0, st.z);
  st.toast = "WRECKED — MILO IS ON FOOT";
}

// One fixed step: move (foot or car), then traffic, police,
// standoff, feats and the mission — the same calls main.js makes.
function tick(S, axis) {
  const st = S.state;
  S.steps += 1;
  st.time += DT;
  st.dayT = Math.min(1, st.time / 600);
  if (S.view) S.view.setDay(st.dayT);
  if (st.mode === "foot") {
    inject("left", axis.steer < -0.1);
    inject("right", axis.steer > 0.1);
    inject("up", axis.gas > 0);
    inject("run", true);
    footStep(st, DT, S.collide);
    S.milo.position.set(st.x, 0, st.z);
    S.milo.rotation.y = st.heading;
    const target = nearestParked(S.parked, st.x, st.z);
    if (hotwireTick(st, DT, target) === "done" && target) steal(S, target);
    inject("left", false); inject("right", false);
    inject("up", false); inject("run", false);
  } else if (st.mode === "chase" && st.car) {
    const car = st.car;
    const evs = driveStep(car, axis, DT, {
      nitroHeld: !!axis.nitro, perks: st.perks,
      traffic: S.traffic, chain: S.chain, collide: S.collide,
    });
    st.x = car.x; st.z = car.z; st.heading = car.heading;
    st.speed = Math.abs(car.speed);
    st.chain = S.chain.value;
    st.stats.bestChain = Math.max(st.stats.bestChain, st.chain);
    for (const ev of evs) {
      if (ev.kind === "nearMiss") {
        const award = Math.round(ev.pay * st.chain);
        st.cash += award;
        st.stats.earned += award;
        st.stats.nearMiss += 1;
        addRep(st, 5);
        st.toast = `NEAR MISS +$${award} — CHAIN x${st.chain.toFixed(1)}`;
      } else if (ev.kind === "wrecked") {
        wreck(S);
      }
    }
  }
  updateTraffic(S.traffic, DT, st);
  const pev = updatePolice(S.pol, st, DT);
  st.police = activeUnits(S.pol);
  for (const ev of pev) {
    if (ev.kind === "ram" && st.car) {
      st.car.hp = Math.max(0, st.car.hp - ev.dmg);
      if (st.car.hp <= 0) wreck(S);
    } else if (ev.kind === "bust") {
      S.stop = true; S.fail = "busted";
    } else if (ev.kind === "evaded") {
      st.stats.evaded += 1;
      addRep(st, 60);
    }
  }
  updateStandoff(st, DT, S.pol);
  checkFeats(st);
  const pos = st.mode === "chase" && st.car ? st.car : st;
  updateMission(S.runner, st, DT, pos);
  const m = CONFIG.missions[st.missionIndex];
  if (m && m.id === "m8" && !S.runner.branch) chooseBranch(S.runner, st, false);
  if (st.screen === "draft") {
    // Pick by preference, not by slot: WIRING first — without
    // it every re-steal adds a wanted level, and wrecks spiral
    // into a permanent wanted-5 chase. Then GHOST (faster fade),
    // GLOVE (hotwire beats the bust window), ARMOR, NITRO, FUEL.
    const opts = (st.draft && st.draft.options) || [];
    const pref = ["wiring", "ghost", "glove", "armor", "nitro", "fuel"];
    let idx = 0;
    for (const id of pref) {
      const i = opts.findIndex((o) => o.id === id);
      if (i >= 0) { idx = i; break; }
    }
    const p = opts[idx];
    pickPerk(S.runner, st, idx);
    if (p) S.log.push(`perk ${p.name}`);
  }
  if (st.stats.missionsDone !== S.saved) {
    S.saved = st.stats.missionsDone;
    const done = CONFIG.missions[S.saved - 1];
    if (done) S.perMission.push({ m: done.name, earned: st.stats.earned });
    saveGame(st, S.runner, 0);
  }
  if (st.screen === "victory" || st.screen === "busted" || st.screen === "wasted") S.stop = true;
}

function steerAxis(S, tx, tz) {
  const st = S.state;
  const diff = norm(Math.atan2(tx - st.x, tz - st.z) - st.heading);
  return {
    steer: diff > 0.25 ? 1 : diff < -0.25 ? -1 : diff * 3,
    gas: Math.abs(diff) > 1.0 ? 0.35 : 1,
    nitro: Math.abs(diff) < 0.15,
  };
}

// Drive the waypoint route. Returns "arrived", "mission" (the
// mission changed under us), "gig" (a gig just paid), "foot"
// (wrecked to foot) or "stop".
function driveTo(S, tx, tz, opt = {}) {
  const radius = opt.radius || 12;
  const timeout = opt.timeout || 1500;
  // Default speed cap 40 mph: a 60 mph scrape costs 19 HP and
  // wrecks the car in a handful of hits; at 40 it costs 9 and
  // near-misses (over 30 mph) still pay. Timed legs opt out.
  const cap = opt.cap !== undefined ? opt.cap : (opt.nocap ? undefined : 40);
  const mi = S.state.missionIndex;
  const hadGig = !!S.runner.gig;
  for (const wp of route(S.state.x, S.state.z, tx, tz)) {
    let best = Infinity, stall = 0, stuck = 0, n = 0;
    while (n++ < timeout) {
      if (S.stop) return "stop";
      if (S.state.screen !== "play") return "screen";
      if (S.state.missionIndex !== mi) return "mission";
      if (hadGig && !S.runner.gig) return "gig";
      if (S.state.mode === "foot") return "foot";
      const d = Math.hypot(wp.x - S.state.x, wp.z - S.state.z);
      if (d < radius) break;
      if (d < best - 0.5) { best = d; stall = 0; }
      else if (++stall > 60) {
        stall = 0;
        if (++stuck > 3) break;
        for (let k = 0; k < 20; k++) tick(S, { steer: 1, gas: -0.6 });
      }
      // Speed cap: at 60 mph a building scrape costs ~19 HP; at
      // 40 mph it costs ~9, at 34 mph ~6. Untimed legs run capped.
      const ax = steerAxis(S, wp.x, wp.z);
      if (cap && S.state.speed > cap) ax.gas = 0;
      tick(S, ax);
    }
    if (S.stop || S.state.missionIndex !== mi) return S.stop ? "stop" : "mission";
    if (hadGig && !S.runner.gig) return "gig";
  }
  // Confirming tick: the arrival itself must be observed by the
  // mission logic. A route that starts at the target makes zero
  // ticks, and the mission would never register the arrival —
  // the run then spins forever on a mission already reached.
  if (!S.stop && S.state.screen === "play") tick(S, { steer: 0, gas: 0 });
  return "arrived";
}

function walkTo(S, tx, tz) {
  // Cross-map on foot is ~900 units at 11 u/s: 2000 ticks.
  let n = 0;
  while (n++ < 2000 && !S.stop && S.state.mode === "foot") {
    if (Math.hypot(tx - S.state.x, tz - S.state.z) < 3) return true;
    tick(S, steerAxis(S, tx, tz));
  }
  return S.state.mode !== "foot";
}

// Outrun the pursuit until wanted is 0: alternate far corners at
// full speed so every unit stays 70 m+ for the 8 s fade.
function coolDown(S) {
  let legs = 0;
  while (S.state.wanted > 0 && legs < 6 && !S.stop) {
    const tx = S.state.x > 0 ? -240 : 240;
    const tz = S.state.z > 0 ? -240 : 240;
    // Full speed on purpose: shedding heat is a race against the
    // pursuit, and a capped car only outruns wanted 1-2 by a
    // hair — without GHOST PLATES the 8 s fade never holds.
    // Everything else in the run is capped; this is the exception.
    driveTo(S, tx, tz, { radius: 20, timeout: 1200, nocap: true });
    legs += 1;
    if (S.state.mode === "foot") return;
  }
}

function doGig(S) {
  // Never stack a gig on a live one: each restart refreshes the
  // timer, and a live gig pauses the mission behind it — the
  // convoy would never roll while gigs keep re-arming.
  if (S.runner.gig) return;
  if (S.state.missionIndex >= CONFIG.missions.length) return;
  const id = GIGS[S.gigN++ % GIGS.length];
  startGig(S.runner, S.state, id);
  const t = S.runner.gig && S.runner.gig.target;
  if (!t) return;
  driveTo(S, t.x, t.z, { radius: 14, timeout: 1200, gig: true });
}

// Farm gigs + near-miss laps until the run can reach grade A.
// Only called while an untimed mission is live, never mid-race.
function farm(S) {
  const need = CONFIG.economy.grades.A - 1800 - 3200;
  let laps = 0;
  while (S.state.stats.earned < need && laps < 20 && !S.stop) {
    if (S.state.wanted >= 1) coolDown(S);
    doGig(S);
    if (S.state.stats.earned >= need) break;
    driveTo(S, 240, -160, { radius: 14, timeout: 1200, cap: 34 });
    driveTo(S, -240, -160, { radius: 14, timeout: 1200, cap: 34 });
    laps += 1;
    if (S.state.mode === "foot") return;
  }
}

function race(S) {
  let tries = 0;
  while (S.state.missionIndex === 6 && tries++ < 4 && !S.stop) {
    const t = S.runner.target;
    if (!t) return;
    driveTo(S, t.x, t.z, { radius: 16, timeout: 900, nocap: true });
    if (S.runner.checkpoint >= 5) return;
  }
}

function convoy(S) {
  // Shadow the truck from the z=160 road, tracking its x: 40 m
  // off, the far edge of the follow window, but on a road — the
  // truck's own z=200 line runs through building blocks.
  let n = 0;
  while (S.state.missionIndex === 8 && n++ < 3000 && !S.stop) {
    // Bail to a cooldown the moment any heat appears: at
    // wanted 3+ the heli pins the heat (it counts for the 70 m
    // fade and never gets that far), so never let it reach 3 —
    // and 2 is one unlucky event away from 3.
    if (S.state.wanted >= 1) return;
    const t = S.runner.target;
    if (!t) return;
    const fx = t.x, fz = 160;
    const d = Math.hypot(fx - S.state.x, fz - S.state.z);
    tick(S, d > 6 ? steerAxis(S, fx, fz) : { steer: 0, gas: 0 });
    if (S.state.mode === "foot") return;
  }
}

function heist(S) {
  while (S.state.missionIndex === 9 && S.runner.phase < 2 && !S.stop) {
    // Bail at the first heat, like the convoy: the heist drives
    // are long and slow, and wanted 2 is one event from the
    // heli ratchet at 3.
    if (S.state.wanted >= 1) return;
    const t = S.runner.target;
    if (!t) return;
    driveTo(S, t.x, t.z, { radius: 14, timeout: 900, cap: 34 });
    if (S.state.mode === "foot") return;
  }
  coolDown(S);
  if (S.stop || S.state.missionIndex !== 9) return;
  const t = S.runner.target;
  if (t) driveTo(S, t.x, t.z, { radius: 14, timeout: 900, cap: 34 });
  // Boss drain: idle by the boss until his HP hits 0. Abort if
  // the car wrecks — standing on foot here is a bust, not a wait.
  let n = 0;
  while (S.state.missionIndex === 9 && n++ < 800 && !S.stop && S.state.mode === "chase") {
    tick(S, { steer: 0, gas: 0 });
  }
}

function reset(S, seed) {
  const st = S.state;
  if (!S.base) {
    S.base = {
      traffic: S.traffic.map((t) => ({ ...t, mesh: undefined })),
      parked: S.parked.map((p) => ({ x: p.x, z: p.z, heading: p.heading })),
    };
  }
  S.traffic.forEach((t, i) => {
    const b = S.base.traffic[i];
    Object.assign(t, { x: b.x, z: b.z, pos: b.pos, line: b.line, along: b.along, dir: b.dir, speed: b.speed, heading: b.heading, nearMissed: false });
    t.mesh.position.set(t.x, 0, t.z);
    t.mesh.rotation.y = t.heading;
  });
  S.parked.forEach((p, i) => {
    const b = S.base.parked[i];
    p.x = b.x; p.z = b.z; p.heading = b.heading; p.stolen = false;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
  });
  for (const u of S.pol.units) {
    Object.assign(u, { active: false, down: false, hp: 100, mode: "chase", dist: 999, ramCd: 0, x: 0, z: 0 });
    u.mesh.visible = false;
  }
  Object.assign(S.pol.air, { active: false, down: false, hp: 200, dist: 999, x: 0, z: 0 });
  S.pol.air.mesh.visible = false;
  S.pol.bustTimer = 0; S.pol.evadeTimer = 0;
  S.pol.heliAnnounced = false; S.pol.standoffCd = 0;
  Object.assign(S.runner, createRunner(makeRng(seed)));
  Object.assign(st, {
    x: -240, z: -160, heading: -Math.PI / 2, mode: "foot", speed: 0,
    cash: CONFIG.economy.startCash, wanted: 0, chain: 1, rep: 0,
    day: 0, time: 0, dayT: 0, missionIndex: 0, radio: 0, weapon: 0,
    objective: null, police: [], screen: "play", staged: false,
    perks: new Set(), draft: null, grade: null, bossHp: 100,
    missionTimer: 0, hotwire: { progress: 0, need: 2.5, target: null },
    car: null, toast: "", dialogue: "", hp: 100, fireCd: 0, toastTimer: 0,
    ammo: { pistol: -1, shotgun: 0, smg: 0, rifle: 0 },
    weaponsOwned: new Set(["pistol"]), grades: Array(12).fill(null),
    feats: new Set(), standoff: null, soundOn: true, lastSavedMissions: 0,
    garage: { owned: ["comet"], equipped: "comet", upgrades: { comet: { engine: 0, brakes: 0, nos: 0 } } },
    stats: { stolen: 0, evaded: 0, nearMiss: 0, bestChain: 1, earned: 0, missionsDone: 0, gigsDone: 0 },
    safehouse: { visits: 0, last: 0 },
  });
  st.sim = null;
  S.milo.visible = true;
  S.milo.position.set(st.x, 0, st.z);
  S.chain = { value: 1, timer: 0 };
  S.steps = 0; S.saved = 0; S.gigN = 0;
  S.log = []; S.perMission = []; S.stop = false; S.fail = null;
}

// Full run for one seed. Returns real stats + a hash that must
// match across two runs of the same seed.
export function runSim(ctx, seed = 1) {
  const S = {
    state: ctx.state, runner: ctx.runner, pol: ctx.pol,
    traffic: ctx.traffic, parked: ctx.parked, city: ctx.city,
    milo: ctx.milo, view: ctx.view, collide: ctx.collide,
    base: ctx._simBase || null,
  };
  ctx._simBase = S.base;
  reset(S, seed);
  ctx._simBase = S.base;
  const st = S.state;
  startMission(S.runner, st);
  st.screen = "play";
  // Steal the roadster by the pier, on foot, hold E like a player.
  const roadster = S.parked[5];
  walkTo(S, roadster.x, roadster.z);
  inject("enter", true);
  let n = 0;
  while (st.mode === "foot" && n++ < 200 && !S.stop) tick(S, { steer: 0, gas: 0 });
  inject("enter", false);
  // All 12 missions, with a gig after each untimed one. The
  // step cap guarantees the run ends even if a mission can
  // never complete: a sim that never returns proves nothing.
  let miStart = S.steps, lastMi = -1;
  while (st.missionIndex < 12 && !S.stop) {
    if (st.missionIndex !== lastMi) { lastMi = st.missionIndex; miStart = S.steps; }
    if (S.steps - miStart > 60000) { S.fail = `stuck m${st.missionIndex + 1}`; break; }
    // Keep the heat down: even one unit on Milo's tail turns a
    // wreck into a bust race — hotwire is 2.5 s without LUCKY
    // GLOVE, exactly the bust window. Only on untimed missions;
    // a timed run cannot spare the detour.
    const liveId = CONFIG.missions[st.missionIndex] && CONFIG.missions[st.missionIndex].id;
    if (!S.stop && st.wanted >= 1 && liveId !== "m4" && liveId !== "m7") coolDown(S);
    const m = CONFIG.missions[st.missionIndex];
    if (!m) break;
    if (m.id === "m8" && !S.runner.branch) chooseBranch(S.runner, st, false);
    if (st.mode === "foot") {
      // Wrecked mid-run: steal the nearest parked car and go on.
      // The wrecked car itself is left at the wreck site and is
      // stealable again; if Milo somehow stands nowhere near a
      // car, walk to the closest parked car of any distance.
      let near = nearestParked(S.parked, st.x, st.z);
      if (!near) {
        let bd = Infinity;
        for (const p of S.parked) {
          const d = Math.hypot(p.x - st.x, p.z - st.z);
          if (d < bd) { bd = d; near = p; }
        }
      }
      if (near) {
        walkTo(S, near.x, near.z);
        inject("enter", true);
        let k = 0;
        while (st.mode === "foot" && k++ < 200 && !S.stop) tick(S, { steer: 0, gas: 0 });
        inject("enter", false);
      }
      if (st.mode === "foot" && !S.stop) { S.fail = "no car"; break; }
    }
    if (m.id === "m7") race(S);
    else if (m.id === "m9") { coolDown(S); convoy(S); }
    else if (m.id === "m10") heist(S);
    else if (m.id === "m11") {
      farm(S);
      coolDown(S);
      const t = S.runner.target;
      if (t) driveTo(S, t.x, t.z, { radius: 12, timeout: 1200, cap: 34 });
      // Hold the pier 20 s. Abort the hold if the car wrecks:
      // standing on foot here for 800 ticks is a bust, not a hold.
      let k = 0;
      while (st.missionIndex === 10 && k++ < 800 && !S.stop && st.mode === "chase") tick(S, { steer: 0, gas: 0 });
    } else {
      const t = S.runner.target;
      // NEON RUN is timed (90 s): full speed. The rest run capped.
      if (t) driveTo(S, t.x, t.z, { radius: 14, timeout: 1500, nocap: m.id === "m4" });
    }
    if (S.stop) break;
    // A gig pauses the live mission's logic, so never start one
    // while a timed mission (m4 90 s, m7 race 100 s) is live —
    // the gig would eat the race's whole time budget.
    const live = CONFIG.missions[st.missionIndex];
    if (st.missionIndex < 12 && m.id !== "m4" && m.id !== "m7"
      && live && live.id !== "m4" && live.id !== "m7") doGig(S);
  }
  // Safehouse: end the run at the garage hub, save there. The
  // victory screen pauses play, so drive there as play, then
  // put the victory screen back up.
  if (st.screen === "victory" && st.mode === "chase") {
    st.screen = "play";
    driveTo(S, SAFEHOUSE.x, SAFEHOUSE.z, { radius: 20, timeout: 1200 });
    st.screen = "victory";
    st.safehouse.visits += 1;
    st.safehouse.last = Math.round(st.time);
    saveGame(st, S.runner, 0);
  }
  const result = {
    seed, ok: st.screen === "victory" && st.stats.earned >= CONFIG.economy.grades.A,
    grade: st.grade, earned: st.stats.earned, cash: st.cash,
    missions: st.stats.missionsDone, gigs: st.stats.gigsDone,
    nearMiss: st.stats.nearMiss, stolen: st.stats.stolen,
    evaded: st.stats.evaded, bestChain: +st.stats.bestChain.toFixed(1),
    perks: [...st.perks], grades: [...st.grades],
    steps: S.steps, gameTime: Math.round(st.time),
    dayT: +st.dayT.toFixed(2), safehouseVisits: st.safehouse.visits,
    perMission: S.perMission, fail: S.fail,
  };
  result.hash = hashStr(JSON.stringify([
    seed, result.earned, result.cash, result.missions, result.gigs,
    result.nearMiss, result.stolen, result.evaded, result.grades, result.perks,
  ]));
  st.sim = result;
  inject("enter", false);
  return result;
}
