// Milo on foot: the walker mesh, walking, and the hotwire.
// Hotwire is a hold: keep E down for 2.5 s (1.25 s with LUCKY
// GLOVE) beside a parked car. Let go and the progress drains.
import * as THREE from "three";
import { CONFIG } from "./config.js";
import { driveAxis, isHeld } from "./input.js";

export function createWalker() {
  const milo = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 1.5, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8402e })
  );
  body.position.y = 1.1;
  milo.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8a075 })
  );
  head.position.y = 2.2;
  milo.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2a34 });
  for (const lx of [-0.2, 0.2]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), legMat);
    leg.position.set(lx, 0.45, 0);
    milo.add(leg);
  }
  return milo;
}

// One on-foot step. Returns the distance walked this frame.
export function footStep(state, dt, collide) {
  const { steer, gas } = driveAxis();
  state.heading += steer * dt * 2.4;
  const v = gas * (isHeld("run") ? CONFIG.player.run : CONFIG.player.walk);
  state.speed = Math.abs(v) * 3.2;
  const nx = state.x + Math.sin(state.heading) * v * dt;
  const nz = state.z + Math.cos(state.heading) * v * dt;
  const [x, z] = collide(nx, nz);
  const moved = Math.hypot(x - state.x, z - state.z);
  state.x = x;
  state.z = z;
  return moved;
}

// Hotwire tick. state.hotwire is { progress, need, target }.
// Returns "done" when the car is wired, "busy" while holding,
// "idle" when no car is in reach or E is released.
export function hotwireTick(state, dt, target) {
  const need = CONFIG.player.hotwire * (state.perks && state.perks.has("glove") ? 0.5 : 1);
  if (!target) {
    state.hotwire = { progress: 0, need, target: null };
    return "idle";
  }
  if (!state.hotwire || state.hotwire.target !== target) {
    state.hotwire = { progress: 0, need, target };
  }
  state.hotwire.need = need;
  if (isHeld("enter")) {
    state.hotwire.progress += dt;
    if (state.hotwire.progress >= need) {
      state.hotwire.progress = 0;
      return "done";
    }
    return "busy";
  }
  state.hotwire.progress = Math.max(0, state.hotwire.progress - dt * 2);
  return state.hotwire.progress > 0 ? "busy" : "idle";
}

// Step out of the driven car onto the road beside it, facing out.
export function exitCar(state, car) {
  const side = 3.2;
  const x = car.x + Math.cos(car.heading) * side;
  const z = car.z - Math.sin(car.heading) * side;
  state.x = Math.max(-318, Math.min(318, x));
  state.z = Math.max(-318, Math.min(318, z));
  state.heading = car.heading;
  state.speed = 0;
  state.mode = "foot";
}
