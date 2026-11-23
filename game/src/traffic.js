// Ambient traffic: 12 seeded cars that cruise the road grid, turn at
// crossings and wrap around the city edge. They are the near-miss
// targets, the race rivals and the cars a chase has to thread through.
import { createRandom, range } from './random.js';

const PAINTS = [0xd8d8d8, 0x3a5a8a, 0x8a3a3a, 0x3a8a5a, 0xc2a23e, 0x6a4a8a];

export function spawnTraffic(seed) {
  const rng = createRandom(seed + 77);
  const cars = [];
  for (let i = 0; i < 12; i += 1) {
    const along = i % 2 === 0;
    cars.push({
      id: `T${i + 1}`,
      x: Math.round(range(rng, -180, 180) / 42) * 42,
      z: Math.round(range(rng, -180, 180) / 42) * 42,
      heading: along ? 0 : Math.PI / 2,
      speed: range(rng, 9, 16),
      colour: PAINTS[i % PAINTS.length],
      passed: false,
    });
  }
  return cars;
}

export function stepTraffic(cars, dt, rng) {
  for (const car of cars) {
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    // Turn at a crossing, seeded so two runs of one seed match.
    const nearCross = Math.abs(car.x % 42) < 1.2 && Math.abs(car.z % 42) < 1.2;
    if (nearCross && rng && rng() < 0.25) {
      car.heading += (rng() < 0.5 ? 1 : -1) * Math.PI / 2;
    }
    if (car.x > 205) car.x = -205;
    if (car.x < -205) car.x = 205;
    if (car.z > 205) car.z = -205;
    if (car.z < -205) car.z = 205;
  }
  return cars;
}

export function resetPassed(cars) {
  for (const car of cars) car.passed = false;
}
