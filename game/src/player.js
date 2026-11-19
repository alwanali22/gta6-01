// player.js — on-foot movement, entering / leaving cars, hotwire.
// Own cars open instantly; street cars need a held-E hotwire (2.5 s,
// 1.25 s with HOTWIRE ACE) and cost +1 heat when stolen.
import { PLAYER, HOTWIRE } from './config.js';
import { resolveCollision } from './city.js';

export function hasPerk(state, id) {
  return state.perks.includes(id);
}

export function nearestCar(state, x, z, maxD) {
  let best = null, bd = maxD;
  for (const car of state.cars) {
    if (!car.visible || car.hp <= 0) continue;
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

export function createPlayer() {
  return { hotwire: 0, hotwireCar: null };
}

function enterCar(state, car, fx) {
  const pl = state.player;
  pl.onFoot = false;
  pl.vehicleId = car.id;
  pl.x = car.x; pl.z = car.z; pl.heading = car.heading;
  pl.speed = 0;
  if (fx && fx.toast) fx.toast(car.name + ' — YOURS NOW');
}

export function exitCar(state, fx) {
  const pl = state.player;
  const car = state.cars.find((c) => c.id === pl.vehicleId);
  pl.onFoot = true;
  pl.vehicleId = null;
  pl.speed = 0;
  if (car) { pl.x = car.x + 3; pl.z = car.z; }
  if (fx && fx.toast) fx.toast('ON FOOT');
}

export function updatePlayer(p, state, input, city, dt, fx) {
  const pl = state.player;
  if (pl.onFoot) {
    // Walk (moved here from main.js; same interface).
    const axis = input.axis();
    const speed = (input.held('nitro') ? PLAYER.sprintSpeed : PLAYER.walkSpeed)
      * (hasPerk(state, 'light') ? 1.2 : 1);
    if (axis.x || axis.y) {
      const target = Math.atan2(axis.x, -axis.y);
      let d = target - pl.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      pl.heading += d * Math.min(1, dt * 10);
      pl.x += Math.sin(pl.heading) * speed * dt;
      pl.z += Math.cos(pl.heading) * speed * dt;
      pl.speed = speed;
    } else {
      pl.speed = 0;
    }
    const fixed = resolveCollision(city, pl.x, pl.z, PLAYER.radius);
    pl.x = fixed.x; pl.z = fixed.z;

    // Enter / steal the nearest car.
    const car = nearestCar(state, pl.x, pl.z, 4);
    if (car) {
      if (car.owner === 'player') {
        if (input.tapped('interact')) enterCar(state, car, fx);
        p.hotwire = 0; p.hotwireCar = null;
      } else if (input.held('interact')) {
        if (p.hotwireCar !== car.id) { p.hotwireCar = car.id; p.hotwire = 0; }
        const secs = HOTWIRE.secs * (hasPerk(state, 'hotwire') ? HOTWIRE.aceFactor : 1);
        p.hotwire += dt;
        if (p.hotwire >= secs) {
          car.owner = 'player';
          state.heat = Math.min(5, state.heat + HOTWIRE.stealHeat);
          p.hotwire = 0; p.hotwireCar = null;
          enterCar(state, car, fx);
          if (fx && fx.toast) fx.toast('STOLEN — HEAT +1');
        }
      } else {
        p.hotwire = 0; p.hotwireCar = null;
      }
    } else {
      p.hotwire = 0; p.hotwireCar = null;
    }
  } else if (input.tapped('interact') && Math.abs(pl.speed) < 1) {
    // Step out, only once the car has nearly stopped.
    exitCar(state, fx);
  }
}
