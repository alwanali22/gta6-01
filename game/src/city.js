// Solmar itself: roads, 119 buildings, palms, the pier, the harbour
// cranes, lamps and the sea. Seeded, so one seed builds one city.
// Returns the group plus the solid footprints later chunks collide with.
import { CONFIG } from "./config.js";

const PALETTES = {
  marina: [0x3f6d7a, 0x54707e, 0x6d8a94, 0x2e5a6b],
  oldtown: [0x8a5a34, 0x9c6a3e, 0x77502e, 0xa87a48],
  dockside: [0x5a6672, 0x4a5560, 0x6b7a88, 0x3e4852],
  palm: [0x7a4a86, 0x8f5a9c, 0x6b3f7d, 0x9c6a8a],
};

const HEIGHTS = { marina: [10, 26], oldtown: [8, 18], dockside: [12, 30], palm: [20, 48] };

function box(THREE, w, h, d, color, x, y, z, emissive = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color, emissive })
  );
  m.position.set(x, y, z);
  return m;
}

function palmTree(THREE, rng, x, z) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.55, 7, 6),
    new THREE.MeshLambertMaterial({ color: 0x6b4a2e })
  );
  trunk.position.y = 3.5;
  g.add(trunk);
  const top = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 3.4, 7),
    new THREE.MeshLambertMaterial({ color: 0x2e7a3e, emissive: 0x0a2a10 })
  );
  top.position.y = 8.2;
  g.add(top);
  g.position.set(x, 0, z);
  g.rotation.y = rng.next() * Math.PI;
  return g;
}

export function buildCity(THREE, rng) {
  const group = new THREE.Group();
  const solids = [];
  const lamps = [];
  const half = CONFIG.world.half;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshLambertMaterial({ color: 0x52403a })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  // Sea along the west edge, beach sand beside it.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 700),
    new THREE.MeshLambertMaterial({ color: 0x14586e, emissive: 0x06222e })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-311, 0.05, 0);
  group.add(sea);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 700),
    new THREE.MeshLambertMaterial({ color: 0xc2a06a })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-295, 0.06, 0);
  group.add(sand);

  // Road grid: one dark strip every 80 units, both directions.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e2a26 });
  for (let p = -half; p <= half; p += CONFIG.world.roadGap) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(640, 14), roadMat);
    a.rotation.x = -Math.PI / 2;
    a.position.set(0, 0.08, p);
    group.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(14, 640), roadMat);
    b.rotation.x = -Math.PI / 2;
    b.position.set(p, 0.08, 0);
    group.add(b);
  }

  // Buildings: two per block where they fit, first 119 of them.
  const centers = [];
  for (let x = -280; x <= 280; x += 80)
    for (let z = -280; z <= 280; z += 80) centers.push([x, z]);
  const spots = [];
  for (const [cx, cz] of centers) {
    spots.push([cx - 16, cz - 16], [cx + 16, cz + 16]);
  }
  // Keep the pier approach and the neon plaza clear.
  const clear = spots.filter(([x, z]) => x >= -270 && !(x < -240 && z > -200 && z < -120) && !(x > 200 && z > 200));
  let made = 0;
  for (const [x, z] of clear) {
    if (made >= CONFIG.world.buildings) break;
    const d = districtOf(x, z);
    const [lo, hi] = HEIGHTS[d.id];
    const h = rng.range(lo, hi);
    const w = rng.range(18, 32);
    const dep = rng.range(18, 30);
    const color = rng.pick(PALETTES[d.id]);
    const b = box(THREE, w, h, dep, color, x, h / 2, z, 0x1a1210);
    group.add(b);
    const roof = box(THREE, w * 0.5, 1.2, dep * 0.5, 0x2a2118, x, h + 0.6, z);
    group.add(roof);
    solids.push({ x, z, hx: w / 2, hz: dep / 2 });
    made++;
  }

  // Beach shacks along the sand fill the count to 119.
  for (const z of [-280, -200, -40, 40, 120, 280]) {
    if (made >= CONFIG.world.buildings) break;
    group.add(box(THREE, 10, 6, 8, 0x8a6a44, -270, 3, z, 0x221100));
    solids.push({ x: -270, z, hx: 5, hz: 4 });
    made++;
  }

  // Palm boulevard down Palm Heights + a row along the beach.
  for (let z = -280; z <= 280; z += 40) {
    group.add(palmTree(THREE, rng, 44, z));
    if (z % 80 === 0) group.add(palmTree(THREE, rng, -284, z));
  }

  // Marina pier: deck out over the sea, posts, hut at the end.
  const pier = box(THREE, 30, 1.5, 10, 0x7a5a38, -305, 0.8, -160);
  group.add(pier);
  for (let i = 0; i < 4; i++) {
    group.add(box(THREE, 1.4, 5, 1.4, 0x5a4028, -318 + i * 8, 1, -164));
    group.add(box(THREE, 1.4, 5, 1.4, 0x5a4028, -318 + i * 8, 1, -156));
  }
  group.add(box(THREE, 8, 5, 7, 0x8a6a44, -317, 4, -160, 0x332211));

  // Dockside: three harbour cranes + container stacks.
  const craneCols = [0xc23a2e, 0xd8a03a, 0x3a7ad8];
  for (let i = 0; i < 3; i++) {
    const cx = -200 + i * 80;
    const cz = 200;
    group.add(box(THREE, 4, 42, 4, 0x3a3f45, cx, 21, cz));
    group.add(box(THREE, 34, 3, 3, craneCols[i], cx + 8, 40, cz));
    group.add(box(THREE, 1, 18, 1, 0x222222, cx + 20, 30, cz));
    for (let k = 0; k < 3; k++) {
      group.add(box(THREE, 10, 3, 4, rng.pick(craneCols), cx - 14 + k * 11, 1.5 + (k % 2) * 3, cz + 14));
    }
  }

  // Landmarks: Old Town clock tower, Palm Heights neon strip.
  group.add(box(THREE, 14, 52, 14, 0x9c6a3e, 240, 26, -240, 0x1a1210));
  group.add(box(THREE, 15, 2, 15, 0xffd27a, 240, 53, -240, 0x664411));
  group.add(box(THREE, 46, 2.5, 2.5, 0xff7ad9, 120, 12, 280, 0x881155));

  // Street lamps at every other intersection, warm glow, no lights.
  for (let x = -240; x <= 240; x += 80) {
    for (let z = -240; z <= 240; z += 80) {
      if ((x + z) % 160 !== 0) continue;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 7, 5),
        new THREE.MeshLambertMaterial({ color: 0x2a2a2a })
      );
      pole.position.set(x + 9, 3.5, z + 9);
      group.add(pole);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0xffd27a, emissive: 0xaa7711 })
      );
      head.position.set(x + 9, 7.2, z + 9);
      group.add(head);
      lamps.push({ x: x + 9, z: z + 9 });
    }
  }

  return { group, solids, lamps, buildings: made };
}

function districtOf(x, z) {
  for (const d of CONFIG.districts) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  }
  return CONFIG.districts[0];
}

export function playerSpawn() {
  return { x: -240, z: -160, heading: -Math.PI / 2 };
}

export function carSpawn(car) {
  const d = CONFIG.districts.find((q) => q.id === car.spawn) || CONFIG.districts[0];
  return { x: (d.x0 + d.x1) / 2, z: (d.z0 + d.z1) / 2 + 40, heading: 0 };
}
