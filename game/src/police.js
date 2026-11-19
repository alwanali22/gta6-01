// police.js — 5-star dispatch, named units, helicopter, roadblocks, bust,
// HEAT flags, hot zones, and the STANDOFF lite event. All numbers live in
// config.js; this module only moves numbers around.
import { POLICE, POLICE_UNITS, STANDOFF, RESPECT } from './config.js';
import { randomRoadPoint, nearestRoadPoint } from './city.js';
import { makeRng } from './random.js';
import { damageCar } from './vehicles.js';
import { hasPerk } from './player.js';

const rng = makeRng(777);

export function createPolice(city) {
  return { city, units: [], heli: null, roadblocks: [], bustT: 0, hotZone: null, standoff: null };
}

export function addHeat(state, n) {
  const f = hasPerk(state, 'nerves') ? 0.8 : 1;
  state.heat = Math.min(5, Math.max(0, state.heat + n * f));
}

function spawnUnit(P, state, i) {
  // Spawn on a road 60–120 u from the player: pick a point at that range and
  // snap it to the road grid, so the chase starts close enough to matter.
  const a = rng.next() * Math.PI * 2;
  const d = 60 + rng.next() * 60;
  const p = nearestRoadPoint(
    state.player.x + Math.sin(a) * d, state.player.z + Math.cos(a) * d);
  const def = POLICE_UNITS[i % POLICE_UNITS.length];
  return {
    tag: def.tag, role: def.role, x: p.x, z: p.z, heading: 0,
    speed: 16, hp: POLICE.unitHp, disabled: 0, standoff: false,
  };
}

function nearestUnit(P, state) {
  let best = null, bd = 1e9;
  for (const u of P.units) {
    if (u.disabled > 0) continue;
    const d = Math.hypot(u.x - state.player.x, u.z - state.player.z);
    if (d < bd) { bd = d; best = u; }
  }
  return { unit: best, dist: bd };
}

export function changeOutfit(state) {
  state.heatFlags.face = false;
  state.heatFlags.fit = false;
  state.heatFlags.crew = false;
  state.outfit = (state.outfit || 0) + 1;
}

export function startStandoff(state, fx) {
  const p = nearestRoadPoint(state.player.x + 40, state.player.z + 40);
  state.standoff = { wave: 1, ttl: STANDOFF.ttl, x: p.x, z: p.z, left: STANDOFF.perWave };
  if (state.police) spawnWave(state.police, state, STANDOFF.perWave);
  if (fx && fx.toast) fx.toast('STANDOFF — HOLD THE CORNER, 3 WAVES');
}

export function spawnWave(P, state, n) {
  for (let k = 0; k < n; k++) {
    const a = rng.next() * Math.PI * 2;
    P.units.push({
      tag: 'WAVE-' + state.standoff.wave + '.' + (k + 1), role: 'STANDOFF',
      x: state.standoff.x + Math.sin(a) * 18, z: state.standoff.z + Math.cos(a) * 18,
      heading: 0, speed: 12, hp: POLICE.unitHp, disabled: 0, standoff: true,
    });
  }
}

function updateStandoff(P, state, dt, fx) {
  const s = state.standoff;
  if (!s) return;
  s.ttl -= dt;
  const wave = P.units.filter((u) => u.standoff);
  const down = wave.filter((u) => u.disabled > 0).length;
  if (wave.length > 0 && down === wave.length) {
    // Clear the downed wave for good (they do not get back up mid-standoff).
    P.units = P.units.filter((u) => !u.standoff);
    if (s.wave >= STANDOFF.waves) {
      state.cash += STANDOFF.pay; state.earned += STANDOFF.pay;
      state.rep += STANDOFF.rep;
      addHeat(state, STANDOFF.heat);
      if (fx && fx.toast) fx.toast('STANDOFF CLEARED +$' + STANDOFF.pay);
      state.standoff = null;
      return;
    }
    s.wave++;
    spawnWave(P, state, STANDOFF.perWave);
    if (fx && fx.toast) fx.toast('STANDOFF — WAVE ' + s.wave + '/' + STANDOFF.waves);
  }
  if (s.ttl <= 0) {
    P.units = P.units.filter((u) => !u.standoff);
    state.standoff = null;
    addHeat(state, 1);
    if (fx && fx.toast) fx.toast('STANDOFF LOST — HEAT +1');
  }
}

export function updatePolice(P, state, dt, fx) {
  const pl = state.player;
  if (state.standoff) { updateStandoff(P, state, dt, fx); return; }

  // --- Dispatch: one unit per whole star, capped. Ceil, not floor: heat
  // decays continuously, and floor would drop a 0.99-star tail instantly.
  const want = Math.min(Math.ceil(state.heat), POLICE.maxUnits);
  while (P.units.filter((u) => !u.standoff).length < want) {
    P.units.push(spawnUnit(P, state, P.units.length));
  }
  while (P.units.filter((u) => !u.standoff).length > want) {
    const i = P.units.findIndex((u) => !u.standoff);
    if (i < 0) break;
    P.units.splice(i, 1);
  }

  // --- Helicopter at 3+ stars. ---
  if (state.heat >= POLICE.heliAtStars && !P.heli) {
    P.heli = { x: pl.x, z: pl.z - 60, alt: POLICE.heliAlt, heading: 0, retreat: 0 };
    if (fx && fx.toast) fx.toast('AIR UNIT DEPLOYED');
  }
  if (P.heli) {
    const h = P.heli;
    if (h.retreat > 0) {
      h.retreat -= dt;
      h.z -= POLICE.heliSpeed * dt * 0.5;
    } else {
      const dx = pl.x - h.x, dz = pl.z - h.z;
      const d = Math.hypot(dx, dz) || 1;
      h.x += (dx / d) * POLICE.heliSpeed * dt;
      h.z += (dz / d) * POLICE.heliSpeed * dt;
      h.heading = Math.atan2(dx, dz);
    }
    if (state.heat < POLICE.heliAtStars && h.retreat <= 0) P.heli = null;
  }

  // --- Roadblocks at 4+ stars, ahead of the player. ---
  if (state.heat >= 4 && P.roadblocks.length < 2) {
    const a = pl.heading;
    const p = nearestRoadPoint(pl.x + Math.sin(a) * 46, pl.z + Math.cos(a) * 46);
    P.roadblocks.push({ x: p.x, z: p.z, heading: a });
  }
  if (state.heat < 4) P.roadblocks = [];
  const car = state.cars.find((c) => c.id === pl.vehicleId);
  for (let i = P.roadblocks.length - 1; i >= 0; i--) {
    const rb = P.roadblocks[i];
    const d = Math.hypot(rb.x - pl.x, rb.z - pl.z);
    if (car && d < 4 && Math.abs(pl.speed) > 10) {
      damageCar(state, car, 25, fx);
      P.roadblocks.splice(i, 1);
      if (fx && fx.toast) fx.toast('ROADBLOCK SMASHED — CAR -25 HP');
    }
  }

  // --- Units chase; close units spot the player (FACE flag). ---
  let nearest = 1e9;
  for (const u of P.units) {
    if (u.disabled > 0) { u.disabled -= dt; continue; }
    const dx = pl.x - u.x, dz = pl.z - u.z;
    const d = Math.hypot(dx, dz) || 1;
    nearest = Math.min(nearest, d);
    u.heading = Math.atan2(dx, dz);
    u.x += Math.sin(u.heading) * u.speed * dt;
    u.z += Math.cos(u.heading) * u.speed * dt;
    if (d < 10) state.heatFlags.face = true;
  }
  if (P.heli && Math.hypot(P.heli.x - pl.x, P.heli.z - pl.z) < 40) {
    state.heatFlags.fit = true;
  }
  if (state.heat >= 3) state.heatFlags.fit = true;
  if (car && car.stolen) state.heatFlags.car = true;
  if (state.heat >= 2 && state.perks.length > 0) state.heatFlags.crew = true;

  // --- Pursuit state + heat decay (only once the tail is lost). ---
  const seen = nearest < 30 || (P.heli && P.heli.retreat <= 0 && state.heat >= 3);
  if (state.heat > 0) {
    state.pursuit = seen ? 'PURSUIT' : 'SEARCHING';
    if (!seen) {
      const known = Object.values(state.heatFlags).filter(Boolean).length;
      const rank = state.respect || 0;
      let rate = 0.08 * RESPECT.decayMult[rank] * (hasPerk(state, 'ghost') ? 2 : 1);
      if (known > 0) rate *= 0.5;
      state.heat = Math.max(0, state.heat - rate * dt);
      if (state.heat === 0) {
        state.pursuit = 'ESCAPED';
        P.hotZone = { x: pl.x, z: pl.z, r: 60, ttl: 30 };
        state.heatFlags.face = false;
        state.career.copsEvaded += P.units.length;
        P.units = [];
        P.heli = null;
        P.roadblocks = [];
      }
    }
  } else {
    state.pursuit = null;
  }
  if (P.hotZone) {
    P.hotZone.ttl -= dt;
    if (P.hotZone.ttl <= 0) P.hotZone = null;
    else if (Math.hypot(pl.x - P.hotZone.x, pl.z - P.hotZone.z) < P.hotZone.r
      && state.heat === 0) {
      // Walked back into the hot zone: spotted again.
      state.heat = 1;
      P.hotZone = null;
    }
  }

  // --- Bust: a unit on top of a slow player for 2 seconds. ---
  if (nearest < 4.5 && Math.abs(pl.speed) < 2 && state.heat > 0) {
    P.bustT += dt;
    if (P.bustT >= 2) {
      P.bustT = 0;
      if (hasPerk(state, 'clean') && !state.cleanUsed) {
        state.cleanUsed = true;
        state.heat = 0;
        P.units = [];
        if (fx && fx.toast) fx.toast('CLEAN HANDS — FIRST BUST FORGIVEN');
      } else if (fx && fx.busted) {
        fx.busted(state);
      }
    }
  } else {
    P.bustT = 0;
  }
}
