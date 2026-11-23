// Solmar as a place, not an empty arena: a seeded road grid, 119 named
// buildings across four districts, a palm boulevard, a marina pier and
// dockside cranes. Everything here is boxes, cylinders and colour — no
// outside assets, so the city loads offline and looks the same every run.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { createRandom, range } from './random.js';

const ROAD = 0x2b2b33;
const PAVEMENT = 0x3d3a36;
const SAND = 0xc9a86a;

function districtAt(x, z) {
  for (const d of WORLD.districts) {
    const b = d.bounds;
    if (x >= b[0] && x < b[1] && z >= b[2] && z < b[3]) return d;
  }
  return WORLD.districts[3];
}

function box(w, h, d, colour) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color: colour }),
  );
  mesh.position.y = h / 2;
  return mesh;
}

function palm(rng) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.3, 5.5, 6),
    new THREE.MeshLambertMaterial({ color: 0x7a5230 }),
  );
  trunk.position.y = 2.75;
  group.add(trunk);
  for (let i = 0; i < 5; i += 1) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 2.6, 4),
      new THREE.MeshLambertMaterial({ color: 0x2f9e5f }),
    );
    const a = (i / 5) * Math.PI * 2 + rng() * 0.5;
    leaf.position.set(Math.cos(a) * 1.1, 5.6, Math.sin(a) * 1.1);
    leaf.rotation.z = Math.cos(a) * 0.9;
    leaf.rotation.x = -Math.sin(a) * 0.9;
    group.add(leaf);
  }
  return group;
}

function crane() {
  const group = new THREE.Group();
  const leg = new THREE.MeshLambertMaterial({ color: 0xd8a020 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 2), leg);
  base.position.y = 7;
  group.add(base);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 1.2), leg);
  arm.position.set(6, 14, 0);
  group.add(arm);
  const hook = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshLambertMaterial({ color: 0x333333 }));
  hook.position.set(12, 10, 0);
  group.add(hook);
  return group;
}

export function buildCity(scene, seed) {
  const rng = createRandom(seed);
  const group = new THREE.Group();
  const buildings = [];
  const half = WORLD.size / 2;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, WORLD.size),
    new THREE.MeshLambertMaterial({ color: 0x4a4038 }),
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Roads: a grid every 42 units, plus the palm boulevard down the middle.
  const roadMat = new THREE.MeshLambertMaterial({ color: ROAD });
  for (let p = -half; p <= half; p += WORLD.roadGap) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, 7), roadMat);
    a.rotation.x = -Math.PI / 2;
    a.position.set(0, 0.02, p);
    group.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(7, WORLD.size), roadMat);
    b.rotation.x = -Math.PI / 2;
    b.position.set(p, 0.02, 0);
    group.add(b);
  }
  const boulevard = new THREE.Mesh(
    new THREE.PlaneGeometry(10, WORLD.size),
    new THREE.MeshLambertMaterial({ color: 0x8a6b3a }),
  );
  boulevard.rotation.x = -Math.PI / 2;
  boulevard.position.set(21, 0.03, 0);
  group.add(boulevard);

  // 119 buildings, kept off the roads, taller and glassier in Palm Heights.
  let placed = 0;
  let guard = 0;
  while (placed < WORLD.buildingCount && guard < 4000) {
    guard += 1;
    const x = range(rng, -half + 14, half - 14);
    const z = range(rng, -half + 14, half - 14);
    if (Math.abs(x % WORLD.roadGap) < 7 || Math.abs(z % WORLD.roadGap) < 7) continue;
    if (buildings.some((b) => Math.abs(b.x - x) < 12 && Math.abs(b.z - z) < 12)) continue;
    const d = districtAt(x, z);
    const tall = d.id === 'palm' ? range(rng, 14, 34) : range(rng, 6, 20);
    const w = range(rng, 7, 12);
    const dep = range(rng, 7, 12);
    const colour = new THREE.Color(d.tint).offsetHSL(0, 0, range(rng, -0.08, 0.12)).getHex();
    const m = box(w, tall, dep, colour);
    m.position.x = x;
    m.position.z = z;
    group.add(m);
    const lit = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.55, 0.5, 0.2),
      new THREE.MeshBasicMaterial({ color: d.accent }),
    );
    lit.position.set(x, Math.min(tall - 1, 4 + rng() * 6), z + dep / 2 + 0.12);
    group.add(lit);
    buildings.push({ x, z, w, h: tall, d: dep, district: d.id, name: `${d.name} ${placed + 1}` });
    placed += 1;
  }

  // Palms along the boulevard, lamps along every road crossing.
  for (let z = -half + 20; z < half - 10; z += 28) {
    const p1 = palm(rng);
    p1.position.set(16, 0, z);
    group.add(p1);
    const p2 = palm(rng);
    p2.position.set(26, 0, z + 14);
    group.add(p2);
  }
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let x = -half + 21; x < half; x += WORLD.roadGap) {
    for (let z = -half + 21; z < half; z += WORLD.roadGap) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      pole.position.set(x + 4, 2.5, z + 4);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 5), lampMat);
      bulb.position.set(x + 4, 5.1, z + 4);
      group.add(bulb);
    }
  }

  // Marina pier out to the west, with a sand strip; cranes over Dockside.
  const pier = new THREE.Mesh(new THREE.BoxGeometry(46, 1, 8), new THREE.MeshLambertMaterial({ color: 0x9a7a4a }));
  pier.position.set(-half - 16, 0.5, -110);
  group.add(pier);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(40, WORLD.size / 2), new THREE.MeshLambertMaterial({ color: SAND }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-half - 8, 0.01, -105);
  group.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(60, WORLD.size), new THREE.MeshLambertMaterial({ color: 0x1d6f7a }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-half - 55, 0, 0);
  group.add(sea);
  for (const [cx, cz] of [[-170, 80], [-150, 150], [-185, 160]]) {
    const c = crane();
    c.position.set(cx, 0, cz);
    group.add(c);
  }
  for (let i = 0; i < 8; i += 1) {
    const boxMesh = box(6, 2.4, 2.4, [0xc23b2e, 0x2e7fc2, 0x3aa84f, 0xd8a020][i % 4]);
    boxMesh.position.set(-180 + (i % 4) * 9, 0, 60 + Math.floor(i / 4) * 8);
    group.add(boxMesh);
  }

  scene.add(group);
  return { group, buildings, palms: 30, lamps: 100 };
}
