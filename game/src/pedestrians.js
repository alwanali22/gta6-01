// Walkers who make Solmar feel lived in: they stroll the pavements,
// scatter when a car screams past or the wanted level climbs, and
// drift back once the street calms down.
import { createRandom, range } from './random.js';

export function spawnWalkers(seed) {
  const rng = createRandom(seed + 311);
  const walkers = [];
  for (let i = 0; i < 10; i += 1) {
    walkers.push({
      id: `W${i + 1}`,
      x: range(rng, -180, 180),
      z: range(rng, -180, 180),
      heading: range(rng, 0, Math.PI * 2),
      speed: range(rng, 1, 2),
      fleeing: false,
      colour: [0xffc93d, 0x7fe3e0, 0xff5da2, 0xd8d8d8][i % 4],
    });
  }
  return walkers;
}

export function stepWalkers(walkers, state, dt) {
  const panic = state.wanted >= 3 || (state.inCar && Math.abs(state.speed) > 60);
  for (const w of walkers) {
    const dx = w.x - state.player.x;
    const dz = w.z - state.player.z;
    const near = Math.sqrt(dx * dx + dz * dz);
    w.fleeing = panic && near < 30;
    if (w.fleeing) {
      w.heading = Math.atan2(dx, dz);
      w.x += Math.sin(w.heading) * 5 * dt;
      w.z += Math.cos(w.heading) * 5 * dt;
    } else {
      w.x += Math.sin(w.heading) * w.speed * dt;
      w.z += Math.cos(w.heading) * w.speed * dt;
      if (Math.abs(w.x) > 200 || Math.abs(w.z) > 200) w.heading += Math.PI / 2;
    }
    w.x = Math.max(-200, Math.min(200, w.x));
    w.z = Math.max(-200, Math.min(200, w.z));
  }
  return walkers;
}
