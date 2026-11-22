// Ambient traffic: 12 seeded cars that cruise the road grid.
// They stay on roads (multiples of 80), wrap at the city edge,
// and slow down when a car is close ahead of them.
import { CONFIG } from "./config.js";
import { buildCarMesh } from "./vehicles.js";

const PALETTE = [0x8a8a92, 0x3a5a8a, 0x7a3a3a, 0xc2a03a, 0x4a7a4a, 0x9a9aa8];

export function createTraffic(THREE, scene, rng) {
  const cars = [];
  for (let i = 0; i < 12; i++) {
    const alongRoad = rng.chance(0.5);
    const line = rng.pick([-240, -160, -80, 0, 80, 160, 240]);
    const pos = rng.range(-280, 280);
    const dir = rng.pick([1, -1]);
    const mesh = buildCarMesh(THREE, rng.pick(PALETTE));
    scene.add(mesh);
    cars.push({
      mesh,
      along: alongRoad ? "x" : "z",
      line,
      pos,
      dir,
      speed: rng.range(18, 28),
      x: alongRoad ? pos : line,
      z: alongRoad ? line : pos,
      heading: alongRoad ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      nearMissed: false,
    });
  }
  return cars;
}

export function updateTraffic(cars, dt, player) {
  for (const t of cars) {
    // Slow if the player's car is close ahead on the same road.
    let want = t.speed;
    if (player && player.mode === "chase") {
      const dx = player.x - t.x;
      const dz = player.z - t.z;
      const ahead = t.along === "x" ? dx * t.dir : dz * t.dir;
      const side = t.along === "x" ? Math.abs(dz) : Math.abs(dx);
      if (ahead > 0 && ahead < 14 && side < 4) want = t.speed * 0.25;
    }
    t.pos += t.dir * want * 0.55 * dt;
    if (t.pos > 320) t.pos = -320;
    if (t.pos < -320) t.pos = 320;
    t.x = t.along === "x" ? t.pos : t.line;
    t.z = t.along === "x" ? t.line : t.pos;
    t.mesh.position.set(t.x, 0, t.z);
    t.mesh.rotation.y = t.heading;
  }
  void CONFIG;
}
