// Cars: mesh, parked spawns, driving physics, nitro, near-miss
// cash, damage and the WRECKED state. One car spec drives both
// the parked cars Milo can steal and the car he is driving.
import { CONFIG } from "./config.js";

// A readable low-poly car: hull, cabin, wheels, headlights, and a
// red/blue light bar when it is a police unit. Police paint is
// fixed dark blue; civilian paint comes from the car spec.
export function buildCarMesh(THREE, color, police = false) {
  const g = new THREE.Group();
  const paint = police ? 0x1a2a44 : color;
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.7, 4.4),
    new THREE.MeshLambertMaterial({ color: paint })
  );
  hull.position.y = 0.55;
  g.add(hull);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.6, 2.2),
    new THREE.MeshLambertMaterial({ color: police ? 0xd8dee8 : 0x1a1a22 })
  );
  cabin.position.set(0, 1.2, -0.2);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-1, 1.5], [1, 1.5], [-1, -1.5], [1, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
  }
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0x664411 });
  for (const lx of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.15), lampMat);
    lamp.position.set(lx, 0.6, 2.22);
    g.add(lamp);
  }
  if (police) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0x881111 })
    );
    bar.position.set(0, 1.65, -0.2);
    g.add(bar);
  }
  return g;
}

// Effective spec for one car id, with garage upgrades applied.
// Engine raises top speed, brakes raise grip, NOS raises accel.
export function carSpec(id, upgrades = {}) {
  const base = CONFIG.cars.find((c) => c.id === id) || CONFIG.cars[0];
  const eng = upgrades.engine || 0;
  const brk = upgrades.brakes || 0;
  const nos = upgrades.nos || 0;
  return {
    ...base,
    top: base.top * (1 + 0.08 * eng),
    accel: base.accel * (1 + 0.12 * nos),
    grip: Math.min(0.99, base.grip + 0.02 * brk),
  };
}

// Parked, stealable cars: one per spec, placed on a road near its
// home district so every district has something worth stealing.
export function createParkedCars(THREE, scene, rng) {
  const spots = [
    { x: -240, z: -120 }, { x: 200, z: -200 }, { x: -200, z: -200 },
    { x: 200, z: 240 }, { x: -160, z: 200 }, { x: -280, z: -160 },
  ];
  return CONFIG.cars.map((spec, i) => {
    const mesh = buildCarMesh(THREE, spec.color);
    const s = spots[i % spots.length];
    mesh.position.set(s.x + rng.range(-4, 4), 0, s.z + rng.range(-4, 4));
    mesh.rotation.y = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    scene.add(mesh);
    return {
      spec, mesh, x: mesh.position.x, z: mesh.position.z,
      heading: mesh.rotation.y, stolen: false, hp: 100, alarm: false,
    };
  });
}

// Nearest parked car Milo can reach on foot, within 5 units.
export function nearestParked(parked, x, z) {
  let best = null;
  let bestD = 5;
  for (const p of parked) {
    if (p.stolen) continue;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

// One driving step. speed is mph; world movement is mph * 0.55
// units per second, so a 60 mph car crosses a block in ~2.5 s.
// Returns events the caller turns into HUD text and stats.
export function driveStep(car, axis, dt, opts) {
  const ev = [];
  const spec = carSpec(car.spec.id, car.upgrades || {});
  const nitroOn = opts.nitroHeld && car.nitro > 0 && axis.gas > 0;
  const nitroBoost = nitroOn ? 1.6 : 1;
  const nitroTime = opts.perks && opts.perks.has("nitro") ? 2 : 1;
  if (nitroOn) car.nitro = Math.max(0, car.nitro - dt * 18 / nitroTime);
  else if (opts.perks && opts.perks.has("fuel")) car.nitro = Math.min(car.nitroMax, car.nitro + dt * 4);
  else car.nitro = Math.min(car.nitroMax, car.nitro + dt * 1.5);

  const top = spec.top * (opts.perks && opts.perks.has("foot") ? 1.1 : 1) * nitroBoost;
  if (axis.gas > 0) car.speed += spec.accel * nitroBoost * dt;
  else if (axis.gas < 0) car.speed += spec.accel * 0.7 * axis.gas * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 18 * dt);
  if (car.speed > top) car.speed = top;
  if (car.speed < -18) car.speed = -18;

  const steerRate = 1.9 * spec.grip * Math.min(1, 0.35 + Math.abs(car.speed) / 40);
  car.heading += axis.steer * steerRate * dt * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 12 + 0.15);

  let nx = car.x + Math.sin(car.heading) * car.speed * 0.55 * dt;
  let nz = car.z + Math.cos(car.heading) * car.speed * 0.55 * dt;

  // Building collision: slide along the wall, hard hits cost HP.
  if (opts.collide) {
    const before = Math.hypot(nx - car.x, nz - car.z);
    const [cx, cz, hit] = opts.collide(nx, nz, 1.4);
    nx = cx; nz = cz;
    if (hit && Math.abs(car.speed) > 22) {
      const dmg = (Math.abs(car.speed) - 22) * 0.5 * (opts.perks && opts.perks.has("armor") ? 0.5 : 1);
      car.hp -= dmg;
      ev.push({ kind: "crash", dmg: Math.round(dmg) });
      car.speed *= 0.45;
    } else if (hit) {
      car.speed *= 0.7;
    }
    void before;
  }
  car.x = Math.max(-318, Math.min(318, nx));
  car.z = Math.max(-318, Math.min(318, nz));
  if (Math.abs(car.x) >= 318 || Math.abs(car.z) >= 318) car.speed *= 0.6;

  // Near-miss: fast pass within 3.5 units of a traffic car, once
  // per traffic car until it is 12 units away again.
  if (opts.traffic && Math.abs(car.speed) > 30) {
    for (const t of opts.traffic) {
      const d = Math.hypot(t.x - car.x, t.z - car.z);
      if (d < 3.5 && !t.nearMissed) {
        t.nearMissed = true;
        const pay = CONFIG.economy.nearMiss * (opts.perks && opts.perks.has("smarts") ? 2 : 1);
        ev.push({ kind: "nearMiss", pay });
      } else if (d > 12) {
        t.nearMissed = false;
      }
    }
  }

  // Chain: climbs 0.5 per near-miss, floor x2 with GETAWAY KING,
  // decays to the floor after 6 s without one.
  if (opts.chain) {
    const floor = opts.perks && opts.perks.has("king") ? 2.0 : 1.0;
    if (ev.some((e) => e.kind === "nearMiss")) {
      opts.chain.value = Math.min(CONFIG.economy.chainMax, opts.chain.value + CONFIG.economy.chainStep);
      opts.chain.timer = 6;
    } else if (opts.chain.timer > 0) {
      opts.chain.timer -= dt;
      if (opts.chain.timer <= 0) opts.chain.value = floor;
    } else {
      opts.chain.value = floor;
    }
  }

  if (car.hp <= 0 && !car.wrecked) {
    car.wrecked = true;
    car.speed = 0;
    ev.push({ kind: "wrecked" });
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  return ev;
}

// Turn a parked car into Milo's driven car. The parked mesh stays
// in the scene and becomes the driven mesh.
export function takeCar(parkedCar) {
  parkedCar.stolen = true;
  return {
    spec: parkedCar.spec, mesh: parkedCar.mesh,
    x: parkedCar.x, z: parkedCar.z, heading: parkedCar.heading,
    speed: 0, hp: 100, nitro: 100, nitroMax: 100,
    upgrades: { engine: 0, brakes: 0, nos: 0 }, wrecked: false,
  };
}
