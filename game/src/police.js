// Police pursuit: named units, wanted heat, helicopter, roadblocks,
// bust on foot and rams in a chase. Units are real meshes that chase
// Milo; the HUD reads their live names, roles and distances.
import { CONFIG } from "./config.js";
import { buildCarMesh } from "./vehicles.js";

const ROSTER = [
  { name: "KITE-1", role: "MARKSMAN", kind: "CRUISER" },
  { name: "CRUISER-2", role: "PATROL", kind: "CRUISER" },
  { name: "VIPER-1", role: "INTERCEPTOR", kind: "INTERCEPTOR" },
  { name: "CRUISER-3", role: "PATROL", kind: "CRUISER" },
];

export function createPolice(THREE, scene) {
  const units = ROSTER.map((r) => {
    const mesh = buildCarMesh(THREE, 0, true);
    mesh.visible = false;
    scene.add(mesh);
    return { ...r, mesh, x: 0, z: 0, heading: 0, hp: 100, down: false, active: false, dist: 999, mode: "chase", ramCd: 0 };
  });
  // HAWK-1, the air unit: a dark heli body with a spinning rotor.
  const heli = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.1, 6.5),
    new THREE.MeshLambertMaterial({ color: 0x1a2a44 })
  );
  body.position.y = 26;
  heli.add(body);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.15, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x888888 })
  );
  rotor.position.y = 27;
  heli.add(rotor);
  heli.visible = false;
  scene.add(heli);
  const air = { name: "HAWK-1", role: "AIR UNIT", kind: "AIR UNIT", mesh: heli, rotor, x: 0, z: 0, hp: 200, down: false, active: false, dist: 999, heli: true };
  return { units, air, bustTimer: 0, evadeTimer: 0, heliAnnounced: false, standoffCd: 0 };
}

// Which ground units run at each wanted level. The air unit joins
// at wanted 3, the second roadblock pair at wanted 4 and 5.
export function activateFor(pol, wanted) {
  const count = [0, 1, 2, 3, 4, 4][Math.max(0, Math.min(5, wanted))];
  pol.units.forEach((u, i) => {
    u.active = i < count && !u.down;
    u.mesh.visible = u.active;
    if (u.active && u.mode !== "block") u.mode = "chase";
  });
  pol.air.active = wanted >= 3 && !pol.air.down;
  pol.air.mesh.visible = pol.air.active;
  return activeUnits(pol);
}

export function activeUnits(pol) {
  const list = pol.units.filter((u) => u.active);
  if (pol.air.active) list.push(pol.air);
  return list;
}

// Put one named unit at an exact spot (staged shots, roadblocks).
export function placeUnit(pol, name, x, z, mode) {
  const u = name === "HAWK-1" ? pol.air : pol.units.find((v) => v.name === name);
  if (!u) return;
  u.x = x; u.z = z;
  if (mode) u.mode = mode;
  u.active = true;
  u.mesh.visible = true;
  if (u.heli) { u.mesh.position.set(x, 0, z); }
  else { u.mesh.position.set(x, 0, z); u.mesh.rotation.y = u.heading; }
}

function chaseStep(u, tx, tz, dt, speed) {
  const dx = tx - u.x;
  const dz = tz - u.z;
  const d = Math.hypot(dx, dz);
  // Slow down close in: at full speed and a 2.2 rad/s turn the unit
  // would orbit Milo at ~10 m forever and never make the bust.
  const sp = speed * Math.min(1, Math.max(0.25, d / 40));
  const want = Math.atan2(dx, dz);
  let turn = want - u.heading;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  u.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, turn));
  u.x += Math.sin(u.heading) * sp * 0.55 * dt;
  u.z += Math.cos(u.heading) * sp * 0.55 * dt;
  u.mesh.position.set(u.x, 0, u.z);
  u.mesh.rotation.y = u.heading;
  u.dist = d;
}

// Recompute live distances from the player. Staged shots never run
// updatePolice, so the shot setup calls this once after placing.
export function refreshDist(pol, x, z) {
  for (const u of activeUnits(pol)) u.dist = Math.hypot(x - u.x, z - u.z);
}

// One pursuit step. Returns events the caller turns into HUD text,
// stats, bust and wasted screens. opts: { onFoot }.
export function updatePolice(pol, state, dt) {
  const evs = [];
  activateFor(pol, state.wanted);
  const onFoot = state.mode === "foot";
  const speed = 24 + state.wanted * 3.5;
  const px = state.x;
  const pz = state.z;

  // Wanted 4+: two units park ahead of Milo as a roadblock. Only a
  // unit far from Milo is pulled into the block — one already on
  // top of him keeps closing in for the bust.
  if (state.wanted >= 4) {
    const blockers = pol.units.filter((u) => u.active && u.mode === "block");
    if (blockers.length < 2) {
      const far = pol.units
        .filter((u) => u.active && u.mode !== "block" && u.dist > 30)
        .sort((a, b) => b.dist - a.dist);
      if (far.length) {
        const b = far[0];
        b.mode = "block";
        b.x = px + Math.sin(state.heading) * 26;
        b.z = pz + Math.cos(state.heading) * 26;
        b.mesh.position.set(b.x, 0, b.z);
      }
    }
  }

  for (const u of pol.units) {
    if (!u.active) continue;
    u.ramCd = Math.max(0, u.ramCd - dt);
    if (u.mode === "block") {
      u.dist = Math.hypot(px - u.x, pz - u.z);
      if (u.dist < 10) u.mode = "chase";
      continue;
    }
    if (u.mode === "hold") {
      // STANDOFF ring: the unit holds its distance, it does not close.
      u.dist = Math.hypot(px - u.x, pz - u.z);
      u.mesh.position.set(u.x, 0, u.z);
      continue;
    }
    chaseStep(u, px, pz, dt, speed);
    if (!onFoot && u.dist < 3.6 && u.ramCd <= 0) {
      u.ramCd = 1;
      evs.push({ kind: "ram", dmg: 9, name: u.name });
    }
  }

  if (pol.air.active) {
    const a = pol.air;
    a.x += (px - a.x) * Math.min(1, dt * 0.8);
    a.z += (pz - a.z) * Math.min(1, dt * 0.8);
    a.mesh.position.set(a.x, 0, a.z);
    a.rotor.rotation.y += dt * 14;
    a.dist = Math.hypot(px - a.x, pz - a.z);
    if (!pol.heliAnnounced) {
      pol.heliAnnounced = true;
      evs.push({ kind: "heli" });
    }
  } else {
    pol.heliAnnounced = false;
  }

  // Bust: a unit stays on top of Milo on foot for 2.5 s.
  const near = pol.units.filter((u) => u.active).sort((a, b) => a.dist - b.dist)[0];
  if (onFoot && near && near.dist < 5) {
    pol.bustTimer += dt;
    if (pol.bustTimer > 2.5) {
      pol.bustTimer = 0;
      evs.push({ kind: "bust", name: near.name });
    }
  } else {
    pol.bustTimer = Math.max(0, pol.bustTimer - dt * 2);
  }

  // Heat fades when every unit is far away. GHOST PLATES halves
  // the wait. Losing all heat counts as evading the cops.
  const allFar = activeUnits(pol).every((u) => u.dist > 70);
  if (state.wanted > 0 && allFar) {
    pol.evadeTimer += dt;
    const wait = state.perks && state.perks.has("ghost") ? 4 : 8;
    if (pol.evadeTimer >= wait) {
      pol.evadeTimer = 0;
      state.wanted -= 1;
      if (state.wanted === 0) evs.push({ kind: "evaded" });
    }
  } else {
    pol.evadeTimer = 0;
  }
  if (pol.standoffCd > 0) pol.standoffCd -= dt;
  return evs;
}

// "UNITS IN PURSUIT: 3 — CRUISER x2, INTERCEPTOR x1"
export function pursuitText(pol) {
  const list = activeUnits(pol);
  if (!list.length) return "NO UNITS IN PURSUIT";
  const counts = {};
  for (const u of list) counts[u.kind] = (counts[u.kind] || 0) + 1;
  const parts = Object.entries(counts).map(([k, n]) => `${k} x${n}`);
  return `UNITS IN PURSUIT: ${list.length} — ${parts.join(", ")}`;
}

// Named units with role and live distance, one line each.
export function unitLines(pol) {
  return activeUnits(pol).map((u) => `${u.name} ${u.role} ${Math.round(u.dist)}m`);
}
