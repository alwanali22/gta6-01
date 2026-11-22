// Pedestrians: 14 seeded walkers on the sidewalks. They stroll
// along the roads, turn at intersections, and scatter sideways
// when a fast car comes close, so the city reads as lived-in.
import { makeRng } from "./random.js";

export function createPedestrians(THREE, scene, seed) {
  const rng = makeRng(seed + 77);
  const walkers = [];
  const shirtColors = [0xe8d8a8, 0x7ab8d8, 0xd87a7a, 0x8ad88a, 0xd8a03a, 0xb88ad8];
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.42, 1.2, 6),
      new THREE.MeshLambertMaterial({ color: shirtColors[i % shirtColors.length] })
    );
    body.position.y = 0.9;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xc89878 })
    );
    head.position.y = 1.75;
    g.add(head);
    const line = rng.pick([-240, -160, -80, 0, 80, 160, 240]);
    const alongRoad = rng.chance(0.5);
    const pos = rng.range(-280, 280);
    const w = {
      mesh: g,
      along: alongRoad ? "x" : "z",
      line: line + 9,
      pos,
      dir: rng.pick([1, -1]),
      speed: rng.range(1.2, 2.4),
      x: alongRoad ? pos : line + 9,
      z: alongRoad ? line + 9 : pos,
      flee: 0,
    };
    g.position.set(w.x, 0, w.z);
    scene.add(g);
    walkers.push(w);
  }
  return walkers;
}

export function updatePedestrians(walkers, dt, player) {
  for (const w of walkers) {
    // Scatter: a fast car within 10 units makes them step aside.
    if (player && player.mode === "chase" && Math.abs(player.speed || 0) > 25) {
      const d = Math.hypot(player.x - w.x, player.z - w.z);
      if (d < 10) w.flee = 1.2;
    }
    if (w.flee > 0) {
      w.flee -= dt;
      const away = Math.atan2(w.x - (player ? player.x : w.x), w.z - (player ? player.z : w.z));
      w.x += Math.sin(away) * 3 * dt;
      w.z += Math.cos(away) * 3 * dt;
    } else {
      w.pos += w.dir * w.speed * dt;
      if (w.pos > 310 || w.pos < -310) w.dir *= -1;
      w.x = w.along === "x" ? w.pos : w.line;
      w.z = w.along === "x" ? w.line : w.pos;
    }
    w.mesh.position.set(w.x, 0, w.z);
    w.mesh.rotation.y = w.along === "x" ? (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (w.dir > 0 ? 0 : Math.PI);
    // A small walk bob so they read as moving, not statues.
    w.mesh.position.y = Math.abs(Math.sin(w.pos * 2)) * 0.08;
  }
}
