// Boot + loop + on-foot play + driving + missions. Chunk B wires
// player.js, vehicles.js, traffic.js, pedestrians.js and
// missions.js into the Chunk A frame: hotwire a parked car, drive
// it, dodge traffic, bank near-miss cash, and run all 12 missions.
import * as THREE from "three";
import { CONFIG, districtAt, respectRank, missionPayTotal } from "./config.js";
import { makeRng } from "./random.js";
import { buildCity, playerSpawn } from "./city.js";
import { bindInput, isHeld, wasPressed, driveAxis, endFrame } from "./input.js";
import { createView, drawMinimap } from "./render.js";
import { createWalker, footStep, hotwireTick, exitCar } from "./player.js";
import { buildCarMesh, createParkedCars, nearestParked, driveStep, takeCar } from "./vehicles.js";
import { createTraffic, updateTraffic } from "./traffic.js";
import { createPedestrians, updatePedestrians } from "./pedestrians.js";
import {
  createRunner, startMission, updateMission, missionHud,
  chooseBranch, pickPerk, startGig,
} from "./missions.js";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const shot = params.get("shot") || "";

const rng = makeRng(CONFIG.seed);
const view = createView($("scene"));
const city = buildCity(THREE, rng);
view.scene.add(city.group);

const chainObj = { value: 1.0, timer: 0 };
const state = {
  x: 0, z: 0, heading: 0, mode: "foot", speed: 0,
  cash: CONFIG.economy.startCash, wanted: 0, chain: 1.0, rep: 0,
  day: 0, time: 0, missionIndex: 0, radio: 0, weapon: 0,
  objective: null, police: [], screen: "title", ready: false,
  buildings: city.buildings, missionPay: missionPayTotal(),
  perks: new Set(), draft: null, grade: null, bossHp: 100,
  missionTimer: 0, hotwire: { progress: 0, need: 2.5, target: null },
  car: null, toast: "", dialogue: "",
  stats: { stolen: 0, evaded: 0, nearMiss: 0, bestChain: 1.0, earned: 0, missionsDone: 0, gigsDone: 0 },
};
const runner = createRunner(rng);
state.runner = runner;

const milo = createWalker();
view.scene.add(milo);
const parked = createParkedCars(THREE, view.scene, rng);
state.parked = parked;
const traffic = createTraffic(THREE, view.scene, rng);
state.traffic = traffic;
const walkers = createPedestrians(THREE, view.scene, CONFIG.seed);
state.walkers = walkers;

// Police stand-ins for staged shots; live pursuit arrives in C.
const copCars = [buildCarMesh(THREE, 0, true), buildCarMesh(THREE, 0, true), buildCarMesh(THREE, 0, true)];
for (const c of copCars) { c.visible = false; view.scene.add(c); }

function showScreen(name) {
  state.screen = name;
  for (const id of ["title", "pause", "wasted", "busted", "draft", "victory"]) {
    $(`screen-${id}`).classList.toggle("hidden", id !== name);
  }
  $("hud").classList.toggle("hidden", name === "title");
  if (name === "victory") {
    $("v-cash").textContent = "$" + state.cash.toLocaleString("en-US");
    $("v-missions").textContent = `${state.stats.missionsDone}/12`;
    $("v-stolen").textContent = String(state.stats.stolen);
    $("v-evaded").textContent = String(state.stats.evaded);
    $("v-near").textContent = String(state.stats.nearMiss);
    $("v-chain").textContent = "x" + state.stats.bestChain.toFixed(1);
    $("v-rep").textContent = respectRank(state.rep).name;
    $("v-time").textContent = `${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, "0")}`;
    const tag = document.querySelector("#screen-victory .tagline");
    if (tag) tag.textContent = `GRADE ${state.grade || "C"} — VOSS IS DONE. THE NIGHT IS YOURS.`;
  }
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
  const hud = missionHud(runner, state);
  $("objective").textContent = hud.objective;
  $("objTimer").textContent = hud.timer;
  $("dispatch").textContent = state.police.length
    ? `UNITS IN PURSUIT: ${state.police.length} — ${state.police.map((u) => u.kind).join(", ")}`
    : "NO UNITS IN PURSUIT";
  $("toast").textContent = state.toast || "";
  const m = CONFIG.missions[state.missionIndex];
  $("dialogue").textContent = m ? `NADIA: "${m.line}"` : "";
  const nitro = state.car ? Math.round(state.car.nitro) : 100;
  $("nitroFill").textContent = "█".repeat(Math.round(nitro / 10)) + "░".repeat(10 - Math.round(nitro / 10));
  const hw = state.hotwire;
  const hwBox = $("hotwireBox");
  if (state.mode === "foot" && hw && hw.target && hw.progress > 0) {
    hwBox.classList.remove("hidden");
    const filled = Math.round((hw.progress / hw.need) * 10);
    $("hotwireFill").textContent = "▓".repeat(filled) + "░".repeat(10 - filled);
  } else if (state.mode === "foot" && hw && hw.target) {
    hwBox.classList.remove("hidden");
    $("hotwireFill").textContent = "HOLD E — " + hw.target.spec.name;
  } else {
    hwBox.classList.add("hidden");
  }
  if (state.draft) {
    state.draft.options.forEach((p, i) => {
      const el = $(`draft-${i}`);
      if (el) el.innerHTML = `<b>${p.name}</b><br>${p.text}`;
    });
  }
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

function placeCops(list) {
  list.forEach((c, i) => {
    if (i >= copCars.length) return;
    copCars[i].visible = true;
    copCars[i].position.set(c.x, 0, c.z);
    copCars[i].rotation.y = state.heading;
  });
}

function stageShot(name) {
  const spawn = playerSpawn();
  // Staged shots freeze the player + mission logic so the HUD
  // values the shot promises (speed, chain, wanted) do not decay
  // while the screenshot is taken. The drive probe scene is live.
  state.staged = name !== "drive";
  if (name === "cover") {
    const spyder = parked[2];
    state.car = takeCar(spyder);
    state.car.x = -120; state.car.z = -160; state.car.heading = -Math.PI / 2;
    state.car.mesh.position.set(-120, 0, -160);
    state.car.mesh.rotation.y = state.car.heading;
    state.mode = "chase";
    state.x = -120; state.z = -160; state.heading = -Math.PI / 2;
    state.wanted = 5; state.chain = 2.0; state.cash = 12450; state.speed = 87;
    state.car.speed = 87;
    state.police = [
      { kind: "CRUISER", x: -142, z: -164 }, { kind: "CRUISER", x: -142, z: -156 },
      { kind: "INTERCEPTOR", x: -160, z: -160 },
    ];
    state.objective = { x: -290, z: -160 };
    state.toast = "NEAR MISS +250";
    state.missionIndex = 0;
    milo.visible = false;
    placeCops(state.police);
    showScreen("play");
  } else if (name === "title") {
    state.mode = "foot";
    state.x = spawn.x; state.z = spawn.z; state.heading = Math.PI / 2;
    showScreen("title");
  } else if (name === "night") {
    const roadster = parked[5];
    state.car = takeCar(roadster);
    state.car.x = 160; state.car.z = 200; state.car.heading = 0;
    state.car.mesh.position.set(160, 0, 200);
    state.mode = "chase";
    state.day = 1;
    state.x = 160; state.z = 200; state.heading = 0;
    state.wanted = 3; state.chain = 3.0; state.cash = 31200; state.speed = 64;
    state.car.speed = 64;
    state.police = [
      { kind: "CRUISER", x: 160, z: 224 }, { kind: "CRUISER", x: 160, z: 248 },
      { kind: "AIR UNIT", x: 140, z: 180, heli: true },
    ];
    state.objective = { x: 240, z: 280 };
    state.toast = "AIR UNIT DEPLOYED";
    state.missionIndex = 3;
    milo.visible = false;
    placeCops(state.police);
    showScreen("play");
  } else if (name === "drive") {
    // Probe-only scene: Milo driving, traffic and pedestrians live.
    const comet = parked[0];
    state.car = takeCar(comet);
    state.car.x = 0; state.car.z = -80; state.car.heading = 0;
    state.car.mesh.position.set(0, 0, -80);
    state.car.speed = 54;
    state.mode = "chase";
    state.x = 0; state.z = -80; state.heading = 0;
    state.wanted = 2; state.chain = 1.5; state.speed = 54;
    state.missionIndex = 1;
    startMission(runner, state);
    milo.visible = false;
    showScreen("play");
  } else {
    // marina (default): Milo on foot by the pier, first mission live.
    state.mode = "foot";
    state.x = spawn.x; state.z = spawn.z; state.heading = spawn.heading;
    state.missionIndex = 0;
    startMission(runner, state);
    showScreen("play");
  }
  view.setDay(state.day);
}

function collide(x, z, radius = 0.6) {
  let hit = false;
  for (const s of city.solids) {
    if (Math.abs(x - s.x) < s.hx + radius && Math.abs(z - s.z) < s.hz + radius) {
      hit = true;
      const dx = s.hx + radius - Math.abs(x - s.x);
      const dz = s.hz + radius - Math.abs(z - s.z);
      if (dx < dz) x = s.x + Math.sign(x - s.x || 1) * (s.hx + radius);
      else z = s.z + Math.sign(z - s.z || 1) * (s.hz + radius);
    }
  }
  x = Math.max(-318, Math.min(318, x));
  z = Math.max(-318, Math.min(318, z));
  return [x, z, hit];
}

function step(dt) {
  if (state.screen === "play" && !state.staged) {
    if (state.mode === "foot") {
      footStep(state, dt, (x, z) => collide(x, z, 0.6));
      milo.position.set(state.x, 0, state.z);
      milo.rotation.y = state.heading;
      const target = nearestParked(parked, state.x, state.z);
      const res = hotwireTick(state, dt, target);
      if (res === "done" && target) {
        const car = takeCar(target);
        car.parked = target;
        state.car = car;
        state.mode = "chase";
        state.heading = car.heading;
        state.stats.stolen += 1;
        if (!state.perks.has("wiring")) state.wanted = Math.min(5, state.wanted + 1);
        state.toast = `STOLEN — ${car.spec.name} (WANTED ${state.wanted})`;
        milo.visible = false;
      }
    } else if (state.mode === "chase" && state.car) {
      const car = state.car;
      if (wasPressed("enter")) {
        const ref = car.parked;
        if (ref) { ref.x = car.x; ref.z = car.z; ref.heading = car.heading; ref.stolen = false; }
        state.car = null;
        exitCar(state, car);
        milo.visible = true;
        milo.position.set(state.x, 0, state.z);
        state.toast = "ON FOOT — CAR PARKED";
      } else {
        const axis = driveAxis();
        const evs = driveStep(car, axis, dt, {
          nitroHeld: isHeld("nitro"),
          perks: state.perks,
          traffic,
          chain: chainObj,
          collide: (x, z, r) => collide(x, z, r),
        });
        state.x = car.x; state.z = car.z; state.heading = car.heading;
        state.speed = Math.abs(car.speed);
        state.chain = chainObj.value;
        state.stats.bestChain = Math.max(state.stats.bestChain, state.chain);
        for (const ev of evs) {
          if (ev.kind === "nearMiss") {
            const award = Math.round(ev.pay * state.chain);
            state.cash += award;
            state.stats.earned += award;
            state.stats.nearMiss += 1;
            state.toast = `NEAR MISS +$${award} — CHAIN x${state.chain.toFixed(1)}`;
          } else if (ev.kind === "crash") {
            state.toast = `CRASH — CAR -$${ev.dmg} HP`;
          } else if (ev.kind === "wrecked") {
            const ref = car.parked;
            if (ref) { ref.x = car.x; ref.z = car.z; ref.stolen = false; }
            state.car = null;
            state.mode = "foot";
            state.speed = 0;
            milo.visible = true;
            milo.position.set(state.x, 0, state.z);
            state.toast = "WRECKED — MILO IS ON FOOT";
          }
        }
      }
    }
    updateTraffic(traffic, dt, state);
    updatePedestrians(walkers, dt, state);
    const pos = state.mode === "chase" && state.car ? state.car : state;
    updateMission(runner, state, dt, pos);
    // Mission 8 branch: 1 silent, 2 loud.
    if (CONFIG.missions[state.missionIndex] && CONFIG.missions[state.missionIndex].id === "m8" && !runner.branch) {
      if (wasPressed("choice1")) chooseBranch(runner, state, false);
      else if (wasPressed("choice2")) chooseBranch(runner, state, true);
    }
    if (wasPressed("gig") && !runner.gig && state.missionIndex < CONFIG.missions.length) {
      startGig(runner, state, "parcel");
    }
    if (state.screen === "draft") showScreen("draft");
    if (state.screen === "victory") showScreen("victory");
  }
  // Perk draft: 1/2/3 picks a perk. This runs outside the play
  // block because the draft screen itself is the active screen.
  if (state.screen === "draft") {
    let picked = false;
    if (wasPressed("choice1")) picked = pickPerk(runner, state, 0);
    else if (wasPressed("choice2")) picked = pickPerk(runner, state, 1);
    else if (wasPressed("choice3")) picked = pickPerk(runner, state, 2);
    if (picked) showScreen(state.screen);
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
    state.missionIndex = 0;
    startMission(runner, state);
    showScreen("play");
  });
  $("btn-sound").addEventListener("click", (e) => {
    const on = e.target.textContent.includes("ON");
    e.target.textContent = on ? "SOUND: OFF" : "SOUND: ON";
  });
  for (let i = 0; i < 3; i++) {
    $(`draft-${i}`).addEventListener("click", () => { if (pickPerk(runner, state, i)) showScreen(state.screen); });
    $(`slot-${i}`).textContent = `SAVE ${i + 1} — ${slotLabel(i)}`;
  }
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
