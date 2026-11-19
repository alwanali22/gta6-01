// vehicles.js — driving physics, nitro, damage, near-miss payouts, wrecks.
// carSpec() folds garage upgrades and perks into the base car numbers.
import { CARS, ECONOMY, WORLD } from './config.js';
import { collidesBuilding, resolveCollision, isOnRoad } from './city.js';
import { hasPerk } from './player.js';

export function carSpec(state, car) {
  const base = CARS.find((c) => c.id === car.id);
  const up = state.garage[car.id] || {};
  const eng = up.engine || 0, brk = up.brakes || 0, nos = up.nos || 0;
  return {
    top: base.top * (1 + eng * 0.12),
    accel: base.accel * (1 + eng * 0.15),
    grip: base.grip * (1 + brk * 0.08),
    nosTime: 1 + nos * 0.5,
  };
}

export function nearSafehouse(state, x, z) {
  return Math.hypot(x - WORLD.safehouse.x, z - WORLD.safehouse.z) < 12;
}

export function damageCar(state, car, dmg, fx) {
  if (car.hp <= 0) return;
  const armored = hasPerk(state, 'armor') ? 0.75 : 1;
  car.hp = Math.max(0, car.hp - dmg * armored);
  if (car.hp <= 0) {
    if (fx && fx.toast) fx.toast(car.name + ' WRECKED');
    const pl = state.player;
    if (pl.vehicleId === car.id) {
      pl.onFoot = true;
      pl.vehicleId = null;
      pl.speed = 0;
      pl.x = car.x + 3; pl.z = car.z;
    }
  }
}

export function updateVehicle(state, input, city, dt, fx) {
  const pl = state.player;
  const car = state.cars.find((c) => c.id === pl.vehicleId);
  if (!car || car.hp <= 0) return;
  const spec = carSpec(state, car);
  const axis = input.axis();

  // Top speed drops off-road; nitro (Shift) boosts it while the tank lasts.
  let top = spec.top * (isOnRoad(car.x, car.z) ? 1 : 0.6);
  if (input.held('nitro') && state.nitro > 0 && axis.y < 0) {
    top *= 1.35;
    const drain = dt / (4 * spec.nosTime * (hasPerk(state, 'nitro') ? 1.5 : 1));
    state.nitro = Math.max(0, state.nitro - drain);
  } else {
    state.nitro = Math.min(1, state.nitro + dt * 0.12);
  }

  if (axis.y < 0) pl.speed += spec.accel * dt;
  else if (axis.y > 0) pl.speed -= spec.accel * 0.9 * dt;
  else pl.speed *= Math.max(0, 1 - 0.5 * dt);
  if (input.held('brake')) pl.speed *= Math.max(0, 1 - 2.2 * dt);
  pl.speed = Math.max(-14, Math.min(top, pl.speed));

  const steer = axis.x * 1.9 * (pl.speed / spec.top) * spec.grip
    * (input.held('brake') ? 1.6 : 1);
  pl.heading += steer * dt;
  car.heading = pl.heading;

  const nx = car.x + Math.sin(pl.heading) * pl.speed * dt;
  const nz = car.z + Math.cos(pl.heading) * pl.speed * dt;
  if (collidesBuilding(city, nx, nz, 2.4)) {
    if (Math.abs(pl.speed) > 8) damageCar(state, car, (Math.abs(pl.speed) - 8) * 0.8, fx);
    pl.speed *= -0.2;
  } else {
    car.x = nx; car.z = nz;
  }
  const fixed = resolveCollision(city, car.x, car.z, 2.4);
  car.x = fixed.x; car.z = fixed.z;

  // Traffic: bump (damage) or near-miss (cash) on a close pass.
  for (const t of state.traffic || []) {
    if (t.rival) continue;
    const d = Math.hypot(t.x - car.x, t.z - car.z);
    if (d < 3.4) {
      damageCar(state, car, 4, fx);
      pl.speed *= 0.6;
      t.x += (t.x - car.x) * 0.3; t.z += (t.z - car.z) * 0.3;
    } else if (d < 7 && Math.abs(pl.speed) > 12
      && (!t.nearAt || state.time - t.nearAt > 4)) {
      t.nearAt = state.time;
      const gain = ECONOMY.nearMiss * state.chain * (hasPerk(state, 'lucky') ? 2 : 1);
      state.cash += gain; state.earned += gain; state.nearMisses++;
      if (fx && fx.toast) fx.toast('NEAR MISS +$' + gain);
    }
  }
  pl.x = car.x; pl.z = car.z;
}
