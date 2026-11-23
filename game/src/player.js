// Milo on foot: walk, run, hotwire a parked car, get in and out.
// A car is only stealable when Milo stands close to its spawn point;
// the hold time shrinks when the QUICK HANDS perk is owned.
import { CARS, PLAYER } from './config.js';

export function nearestCar(state) {
  let best = null;
  let bestD = 9;
  for (const car of CARS) {
    const dx = state.player.x - car.spawn[0];
    const dz = state.player.z - car.spawn[1];
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function hotwireSeconds(state) {
  const quick = (state.perks || []).includes('hands');
  return quick ? PLAYER.hotwireSeconds / 2 : PLAYER.hotwireSeconds;
}

export function moveOnFoot(state, input, dt) {
  const fwd = input.forward() - input.back();
  const steer = input.steer();
  state.player.heading += steer * dt * 2.2;
  const speed = fwd !== 0 ? PLAYER.walk : 0;
  if (fwd !== 0) {
    state.player.x += Math.sin(state.player.heading) * speed * dt * fwd;
    state.player.z += Math.cos(state.player.heading) * speed * dt * fwd;
    state.speed = speed * 3.6;
  } else {
    state.speed *= 0.9;
  }
  state.player.x = Math.max(-200, Math.min(200, state.player.x));
  state.player.z = Math.max(-200, Math.min(200, state.player.z));
}

export function stepPlayer(state, input, dt) {
  // Returns 'stolen' the frame a hotwire finishes, else null.
  if (state.inCar) return null;
  moveOnFoot(state, input, dt);
  const car = nearestCar(state);
  state.nearCar = car ? car.id : null;
  if (!car) { state.hotwire = 0; return null; }
  if (input.hotwireHeld()) {
    state.hotwire += dt;
    if (state.hotwire >= hotwireSeconds(state)) {
      state.hotwire = 0;
      state.inCar = true;
      state.currentCar = car.id;
      state.carHealth = 100;
      state.nitro = 100;
      state.carsStolen += 1;
      state.player.x = car.spawn[0];
      state.player.z = car.spawn[1];
      return 'stolen';
    }
  } else {
    state.hotwire = 0;
  }
  return null;
}

export function exitCar(state) {
  if (!state.inCar) return;
  state.inCar = false;
  state.currentCar = null;
  state.speed = 0;
  state.player.x += 3;
}
