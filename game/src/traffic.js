// traffic.js — 12 seeded ambient cars on the road grid. Deterministic:
// same seed, same cars, same turns, every run. Race rivals are appended
// by missions.js AFTER this update runs (see main.js ordering).
import { makeRng } from './random.js';
import { randomRoadPoint, collidesBuilding, nearestRoadPoint } from './city.js';

const COLORS = [0x8a8a9a, 0x5a6a7a, 0x9a7a5a, 0x6a8a5a, 0x7a5a8a, 0x9a9a9a];
const HEADINGS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

export function createTraffic(city) {
  const rng = makeRng(20240);
  const cars = [];
  for (let i = 0; i < 12; i++) {
    const p = randomRoadPoint(rng, city);
    cars.push({
      id: 't' + i, x: p.x, z: p.z,
      heading: HEADINGS[Math.floor(rng.next() * 4)],
      color: COLORS[i % COLORS.length],
      speed: 8 + rng.next() * 6,
      turn: rng.next() < 0.5 ? 1 : -1,
    });
  }
  return { cars, rng, city };
}

export function updateTraffic(t, state, dt) {
  const pl = state.player;
  for (const c of t.cars) {
    // Brake for the player's car (or another car) ahead in the same lane.
    let sp = c.speed;
    const aheadOf = (x, z) => {
      const dx = x - c.x, dz = z - c.z;
      const ahead = Math.sin(c.heading) * dx + Math.cos(c.heading) * dz;
      const side = Math.abs(Math.cos(c.heading) * dx - Math.sin(c.heading) * dz);
      return ahead > 0 && ahead < 14 && side < 4;
    };
    if (!pl.onFoot && aheadOf(pl.x, pl.z)) sp *= 0.25;
    for (const o of t.cars) {
      if (o !== c && aheadOf(o.x, o.z)) { sp *= 0.25; break; }
    }
    const nx = c.x + Math.sin(c.heading) * sp * dt;
    const nz = c.z + Math.cos(c.heading) * sp * dt;
    if (collidesBuilding(t.city, nx, nz, 2.4) || Math.abs(nx) > 392 || Math.abs(nz) > 392) {
      // Block end: turn (seeded direction) and snap back onto a road.
      c.heading += c.turn * Math.PI / 2;
      const snapped = nearestRoadPoint(c.x, c.z);
      c.x = snapped.x; c.z = snapped.z;
    } else {
      c.x = nx; c.z = nz;
    }
  }
  state.traffic = t.cars;
}
