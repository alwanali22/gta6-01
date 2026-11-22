// Boot + loop + on-foot play + staged shots. Chunk A owns the world
// and the frame; driving, missions, police and combat arrive in B/C.
import * as THREE from "three";
import { CONFIG, districtAt, respectRank, missionPayTotal } from "./config.js";
import { makeRng } from "./random.js";
import { buildCity, playerSpawn, carSpawn } from "./city.js";
import { bindInput, isHeld, wasPressed, driveAxis, endFrame } from "./input.js";
import { createView, drawMinimap } from "./render.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const shot = params.get("shot") || "";

const rng = makeRng(CONFIG.seed);
const view = createView($("scene"));
const city = buildCity(THREE, rng);
view.scene.add(city.group);

const state = {
  x: 0, z: 0, heading: 0, mode: "foot", speed: 0,
  cash: CONFIG.economy.startCash, wanted: 0, chain: 1.0, rep: 0,
  day: 0, time: 0, missionIndex: 0, radio: 0, weapon: 0,
  objective: null, police: [], screen: "title", ready: false,
  buildings: city.buildings, missionPay: missionPayTotal(),
};

// Milo on foot: jacket body, head, legs — readable at minimap zoom.
const milo = new THREE.Group();
const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 1.5, 8),
  new THREE.MeshLambertMaterial({ color: 0xd8402e }));
body.position.y = 1.1;
milo.add(body);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8),
  new THREE.MeshLambertMaterial({ color: 0xd8a075 }));
head.position.y = 2.2;
milo.add(head);
view.scene.add(milo);

// Stand-in cars for staged shots; chunk B replaces these with vehicles.js.
function makeCar(color, police = false) {
  const g = new THREE.Group();
  const paint = police ? 0x1a2a44 : color;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 4.4),
    new THREE.MeshLambertMaterial({ color: paint }));
  hull.position.y = 0.55;
  g.add(hull);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.2),
    new THREE.MeshLambertMaterial({ color: police ? 0xd8dee8 : 0x1a1a22 }));
  cabin.position.set(0, 1.2, -0.2);
  g.add(cabin);
  const wheelG = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelM = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-1, 1.5], [1, 1.5], [-1, -1.5], [1, -1.5]]) {
    const w = new THREE.Mesh(wheelG, wheelM);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
  }
  if (police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0x881111 }));
    bar.position.set(0, 1.65, -0.2);
    g.add(bar);
  }
  return g;
}

const playerCar = makeCar(CONFIG.cars[2].color);
playerCar.visible = false;
view.scene.add(playerCar);
const copCars = [makeCar(0, true), makeCar(0, true), makeCar(0, true)];
for (const c of copCars) { c.visible = false; view.scene.add(c); }

function showScreen(name) {
  state.screen = name;
  for (const id of ["title", "pause", "wasted", "busted", "draft", "victory"]) {
    $(`screen-${id}`).classList.toggle("hidden", id !== name);
  }
  $("hud").classList.toggle("hidden", name === "title");
}

function starsText(n) {
  return "★".repeat(n) + "☆".repeat(CONFIG.police.maxWanted - n);
}

function syncHud() {
  $("cash").textContent = "$" + state.cash.toLocaleString("en-US");
  $("speedo").textContent = Math.round(state.speed) + " mph";
  $("chain").textContent = "CHAIN x" + state.chain.toFixed(1);
  $("stars").textContent = starsText(state.wanted);
  $("districtName").textContent = districtAt(state.x, state.z).name.toUpperCase();
  $("repName").textContent = respectRank(state.rep).name;
  $("radioName").textContent = CONFIG.radio[state.radio].name;
  $("weaponName").textContent = CONFIG.weapons[state.weapon].name;
  const m = CONFIG.missions[state.missionIndex];
  $("objective").textContent = m ? `${m.name} — ${m.brief}` : "FREE ROAM — SOLMAR IS YOURS";
  $("objTimer").textContent = state.wanted > 0 ? "LOSE: BUSTED OR WASTED" : "LOSE: MISSION FAILED";
  $("dispatch").textContent = state.police.length
    ? `UNITS IN PURSUIT: ${state.police.length} — ${state.police.map((u) => u.kind).join(", ")}`
    : "NO UNITS IN PURSUIT";
  $("toast").textContent = state.toast || "";
  $("dialogue").textContent = m ? `NADIA: "${m.line}"` : "";
  drawMinimap($("minimap"), state);
}

function slotLabel(i) {
  try {
    const raw = localStorage.getItem(`solmar-save-${i}`);
    if (!raw) return "EMPTY SLOT";
    const s = JSON.parse(raw);
    return `ACT ${s.act} — ${s.percent}% — ${s.district} — $${s.cash.toLocaleString("en-US")}`;
  } catch {
    return "EMPTY SLOT";
  }
}

function stageShot(name) {
  const spawn = playerSpawn();
  if (name === "cover") {
    state.mode = "chase";
    state.x = -120; state.z = -160; state.heading = -Math.PI / 2;
    state.wanted = 5; state.chain = 2.0; state.cash = 12450; state.speed = 87;
    state.police = [
      { kind: "CRUISER", x: -142, z: -164 }, { kind: "CRUISER", x: -142, z: -156 },
      { kind: "INTERCEPTOR", x: -160, z: -160 },
    ];
    state.objective = { x: -290, z: -160 };
    state.toast = "NEAR MISS +250";
    state.missionIndex = 0;
    playerCar.visible = true;
    playerCar.position.set(state.x, 0, state.z);
    playerCar.rotation.y = state.heading;
    copCars[0].position.set(-142, 0, -164); copCars[0].rotation.y = state.heading;
    copCars[1].position.set(-142, 0, -156); copCars[1].rotation.y = state.heading;
    copCars[2].position.set(-160, 0, -160); copCars[2].rotation.y = state.heading;
    copCars[0].visible = copCars[1].visible = copCars[2].visible = true;
    milo.visible = false;
    showScreen("play");
  } else if (name === "title") {
    state.mode = "foot";
    state.x = spawn.x; state.z = spawn.z; state.heading = Math.PI / 2;
    showScreen("title");
  } else if (name === "night") {
    state.mode = "chase";
    state.day = 1;
    state.x = 160; state.z = 200; state.heading = 0;
    state.wanted = 3; state.chain = 3.0; state.cash = 31200; state.speed = 64;
    state.police = [
      { kind: "CRUISER", x: 160, z: 224 }, { kind: "CRUISER", x: 160, z: 248 },
      { kind: "AIR UNIT", x: 140, z: 180, heli: true },
    ];
    state.objective = { x: 240, z: 280 };
    state.toast = "AIR UNIT DEPLOYED";
    state.missionIndex = 3;
    playerCar.visible = true;
    playerCar.position.set(state.x, 0, state.z);
    playerCar.rotation.y = state.heading;
    copCars[0].position.set(160, 0, 224); copCars[0].rotation.y = state.heading;
    copCars[1].position.set(160, 0, 248); copCars[1].rotation.y = state.heading;
    copCars[0].visible = copCars[1].visible = true;
    milo.visible = false;
    showScreen("play");
  } else {
    // marina (default): Milo on foot by the pier, first mission live.
    state.mode = "foot";
    state.x = spawn.x; state.z = spawn.z; state.heading = spawn.heading;
    state.objective = { x: -290, z: -160 };
    state.missionIndex = 0;
    showScreen("play");
  }
  view.setDay(state.day);
}

function collide(x, z) {
  for (const s of city.solids) {
    if (Math.abs(x - s.x) < s.hx + 0.6 && Math.abs(z - s.z) < s.hz + 0.6) {
      const dx = s.hx + 0.6 - Math.abs(x - s.x);
      const dz = s.hz + 0.6 - Math.abs(z - s.z);
      if (dx < dz) x = s.x + Math.sign(x - s.x || 1) * (s.hx + 0.6);
      else z = s.z + Math.sign(z - s.z || 1) * (s.hz + 0.6);
    }
  }
  x = Math.max(-318, Math.min(318, x));
  z = Math.max(-318, Math.min(318, z));
  return [x, z];
}

function step(dt) {
  if (state.screen === "play" && state.mode === "foot") {
    const { steer, gas } = driveAxis();
    state.heading += steer * dt * 2.4;
    const v = gas * (isHeld("run") ? CONFIG.player.run : CONFIG.player.walk);
    state.speed = Math.abs(v) * 3.2;
    const nx = state.x + Math.sin(state.heading) * v * dt;
    const nz = state.z + Math.cos(state.heading) * v * dt;
    [state.x, state.z] = collide(nx, nz);
    milo.position.set(state.x, 0, state.z);
    milo.rotation.y = state.heading;
  }
  if (wasPressed("pause")) showScreen(state.screen === "pause" ? "play" : "pause");
  if (wasPressed("radio")) state.radio = (state.radio + 1) % CONFIG.radio.length;
  view.frame({ x: state.x, z: state.z, heading: state.heading, mode: state.mode });
  syncHud();
  endFrame();
}

function boot() {
  bindInput();
  view.resize();
  window.addEventListener("resize", view.resize);
  $("btn-start").addEventListener("click", () => {
    state.x = playerSpawn().x; state.z = playerSpawn().z;
    state.heading = playerSpawn().heading;
    state.objective = { x: -290, z: -160 };
    showScreen("play");
  });
  $("btn-sound").addEventListener("click", (e) => {
    const on = e.target.textContent.includes("ON");
    e.target.textContent = on ? "SOUND: OFF" : "SOUND: ON";
  });
  for (let i = 0; i < 3; i++) $(`slot-${i}`).textContent = `SAVE ${i + 1} — ${slotLabel(i)}`;
  $("counts").textContent = "4 DISTRICTS — 12 MISSIONS — 6 CARS — 12 PERKS";
  stageShot(shot || "marina");
  view.resize();
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.time += dt;
    step(dt);
    if (!state.ready) {
      state.ready = true;
      window.__solmar = state;
      window.__shotReady = true;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

window.__solmar = state;
window.__shotReady = false;
boot();
