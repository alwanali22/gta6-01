// city.js — Solmar's road grid, buildings, palms and landmarks. All layout is a
// pure function of the seed: same seed, same city, every run.
import { WORLD, DISTRICTS } from './config.js';
import { makeRng, hash2 } from './random.js';

const { half, roadStep, roadHalf } = WORLD;

// Road lines sit at -400, -320, ..., 400 on both axes.
export function roadLines() {
  const lines = [];
  for (let v = -half; v <= half; v += roadStep) lines.push(v);
  return lines;
}

export function isOnRoad(x, z) {
  for (let v = -half; v <= half; v += roadStep) {
    if (Math.abs(x - v) <= roadHalf || Math.abs(z - v) <= roadHalf) return true;
  }
  return false;
}

// Snap a point to the nearest road centreline (keeps spawns on asphalt).
export function nearestRoadPoint(x, z) {
  const snap = (v) => Math.round((v + half) / roadStep) * roadStep - half;
  const sx = snap(x), sz = snap(z);
  return Math.abs(x - sx) <= Math.abs(z - sz) ? { x: sx, z } : { x, z: sz };
}

export function buildCity(seed = 1337) {
  const rng = makeRng(seed);
  const buildings = [];
  // One block = the square between four roads. Fill each block with 1-3 towers.
  for (let bx = -half + roadStep; bx < half; bx += roadStep) {
    for (let bz = -half + roadStep; bz < half; bz += roadStep) {
      if (hash2(bx, bz, seed) < 0.08) continue; // a few open plazas
      const n = 1 + Math.floor(rng.next() * 3);
      for (let i = 0; i < n; i++) {
        const cx = bx + rng.range(14, roadStep - 14);
        const cz = bz + rng.range(14, roadStep - 14);
        const w = rng.range(12, 26);
        const d = rng.range(12, 26);
        const h = rng.range(10, 62);
        const district = DISTRICTS.find((dd) =>
          cx >= dd.x0 && cx < dd.x1 && cz >= dd.z0 && cz < dd.z1) || DISTRICTS[0];
        buildings.push({
          x: cx, z: cz, w, d, h,
          color: 0x2c2f45 + Math.floor(rng.next() * 0x30303),
          lit: rng.next() < 0.7,
          district: district.id,
        });
        if (buildings.length >= 119) break;
      }
      if (buildings.length >= 119) break;
    }
    if (buildings.length >= 119) break;
  }

  // Palms line the boulevards (road edges), never on the asphalt.
  const palms = [];
  for (let v = -half + roadStep; v < half; v += roadStep) {
    for (let t = -half + 20; t < half; t += 40) {
      if (hash2(v, t, seed + 7) < 0.5) palms.push({ x: v + roadHalf + 3, z: t, h: 9 + hash2(t, v) * 4 });
      if (hash2(t, v, seed + 11) < 0.5) palms.push({ x: t, z: v + roadHalf + 3, h: 9 + hash2(v, t) * 4 });
    }
  }

  const landmarks = [
    { kind: 'pier', x: -half + 6, z: -120, w: 14, d: 160 },
    { kind: 'crane', x: -240, z: 240, h: 58 },
    { kind: 'crane', x: -180, z: 300, h: 46 },
  ];

  return {
    seed, roads: roadLines(), buildings, palms, landmarks,
    bounds: { min: -half, max: half },
  };
}

// Circle vs building AABB. Returns the building hit, or null.
export function collidesBuilding(city, x, z, r) {
  for (const b of city.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r) return b;
  }
  return null;
}

// Push a circle out of any building it overlaps; also clamps to the world edge.
export function resolveCollision(city, x, z, r) {
  const b = collidesBuilding(city, x, z, r);
  if (b) {
    const dx = x - b.x, dz = z - b.z;
    const px = b.w / 2 + r - Math.abs(dx);
    const pz = b.d / 2 + r - Math.abs(dz);
    if (px < pz) x = b.x + Math.sign(dx || 1) * (b.w / 2 + r);
    else z = b.z + Math.sign(dz || 1) * (b.d / 2 + r);
  }
  const m = WORLD.half - 2;
  x = Math.max(-m, Math.min(m, x));
  z = Math.max(-m, Math.min(m, z));
  return { x, z };
}

export function randomRoadPoint(rng, city) {
  const lines = city.roads;
  const horizontal = rng.next() < 0.5;
  const line = lines[Math.floor(rng.next() * lines.length)];
  const along = rng.range(-WORLD.half + 20, WORLD.half - 20);
  return horizontal ? { x: along, z: line } : { x: line, z: along };
}
