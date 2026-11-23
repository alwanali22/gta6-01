// Driving: one car spec, steering that bites harder at speed, nitro,
// damage and the near-miss chain. A wreck ends the drive, not the run.
import { CARS, ECONOMY, UPGRADES } from './config.js';

export function carSpec(id, upgrades, perks) {
  const base = CARS.find((c) => c.id === id) || CARS[0];
  const up = upgrades || { ENGINE: 0, BRAKES: 0, NOS: 0 };
  const top = base.top + up.ENGINE * 5 + ((perks || []).includes('foot') ? 6 : 0);
  return {
    id: base.id,
    name: base.name,
    colour: base.colour,
    top,
    accel: base.accel + up.ENGINE * 2,
    grip: Math.min(0.99, base.grip + up.BRAKES * 0.02),
    nitroMax: 100 + up.NOS * 40,
  };
}

export function driveVehicle(state, input, dt, traffic) {
  const spec = carSpec(state.currentCar, state.upgrades, state.perks);
  const fwd = input.forward() - input.back();
  const steer = input.steer();
  const boosting = input.nitroHeld ? input.nitroHeld() : false;
  const wantNitro = boosting && state.nitro > 0 && fwd > 0;
  if (wantNitro) state.nitro = Math.max(0, state.nitro - dt * 45);
  else state.nitro = Math.min(spec.nitroMax, state.nitro + dt * 12);
  const target = fwd * spec.top * (wantNitro ? 1.35 : 1);
  const rate = fwd !== 0 ? spec.accel : 18;
  state.speed += (target - state.speed) * Math.min(1, (rate / 60) * dt * 3);
  if (Math.abs(state.speed) < 0.5 && fwd === 0) state.speed = 0;
  state.player.heading += steer * dt * (1.1 + Math.abs(state.speed) / 40) * spec.grip * Math.sign(state.speed || 1);
  state.player.x += Math.sin(state.player.heading) * state.speed * dt;
  state.player.z += Math.cos(state.player.heading) * state.speed * dt;
  state.player.x = Math.max(-200, Math.min(200, state.player.x));
  state.player.z = Math.max(-200, Math.min(200, state.player.z));
  // Near miss: fast pass within 4 units of a traffic car, once per car.
  if (traffic && Math.abs(state.speed) > 55) {
    for (const car of traffic) {
      if (car.passed) continue;
      const dx = state.player.x - car.x;
      const dz = state.player.z - car.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < 4.5) {
        car.passed = true;
        state.nearMiss += 1;
        const step = (state.perks || []).includes('chain') ? 1.0 : ECONOMY.chainStep;
        state.chain = Math.min(ECONOMY.chainMax, state.chain + step);
        state.bestChain = Math.max(state.bestChain, state.chain);
        state.cash += Math.round(ECONOMY.nearMiss * state.chain);
        state.lastNearMiss = `NEAR MISS +$${Math.round(ECONOMY.nearMiss * state.chain)}`;
      }
    }
  }
  // Bump: slow scrape with traffic costs health; a wreck stops the car.
  if (traffic) {
    for (const car of traffic) {
      const dx = state.player.x - car.x;
      const dz = state.player.z - car.z;
      if (Math.sqrt(dx * dx + dz * dz) < 2.6 && Math.abs(state.speed) > 8) {
        const armour = (state.perks || []).includes('armor');
        state.carHealth -= armour ? 4 : 8;
        state.speed *= 0.55;
        car.x += dx * 0.6;
        car.z += dz * 0.6;
        if (state.carHealth <= 0) {
          state.carHealth = 0;
          state.wrecked = true;
          state.inCar = false;
          state.currentCar = null;
          state.speed = 0;
          return 'wrecked';
        }
      }
    }
  }
  return wantNitro ? 'nitro' : null;
}

export function carPrice(id) {
  const car = CARS.find((c) => c.id === id);
  return car ? car.price : 0;
}

export function upgradeCost(kind, level) {
  return UPGRADES[kind] ? UPGRADES[kind][level] || 0 : 0;
}
