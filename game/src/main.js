// Boot + loop + on-foot play + driving + missions. Chunk B wires
// player.js, vehicles.js, traffic.js, pedestrians.js and
// missions.js into the Chunk A frame: hotwire a parked car, drive
// it, dodge traffic, bank near-miss cash, and run all 12 missions.
import * as THREE from "three";
import { CONFIG, respectRank, missionPayTotal } from "./config.js";
import { makeRng } from "./random.js";
import { buildCity, playerSpawn } from "./city.js";
import { bindInput, isHeld, wasPressed, driveAxis, endFrame } from "./input.js";
import { createView } from "./render.js";
import { createWalker, footStep, hotwireTick, exitCar } from "./player.js";
import { createParkedCars, nearestParked, driveStep, takeCar } from "./vehicles.js";
import { createTraffic, updateTraffic } from "./traffic.js";
import { createPedestrians, updatePedestrians } from "./pedestrians.js";
import {
  createRunner, startMission, updateMission,
  chooseBranch, pickPerk, startGig,
} from "./missions.js";
import { createPolice, activateFor, activeUnits, placeUnit, refreshDist, updatePolice } from "./police.js";
import { cycleWeapon, fireTick, policeFire, startStandoff, updateStandoff, buyWeapon } from "./combat.js";
import { addRep, checkFeats } from "./respect.js";
import { createAudio } from "./audio.js";
import { saveGame, loadGame, slotLabel } from "./save.js";
import { ensureGarage, buyCar, equipCar, sellCar, buyUpgrade } from "./garage.js";
import { syncHud, toastTick, showStats, renderGarage } from "./hud.js";

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
  car: null, toast: "", dialogue: "", hp: 100, fireCd: 0, toastTimer: 0,
  ammo: { pistol: -1, shotgun: 0, smg: 0, rifle: 0 },
  weaponsOwned: new Set(["pistol"]), grades: Array(12).fill(null),
  feats: new Set(), standoff: null, soundOn: true, lastSavedMissions: 0,
  garage: { owned: ["comet"], equipped: "comet", upgrades: { comet: { engine: 0, brakes: 0, nos: 0 } } },
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

// Live police pool and the radio synth. The pool owns its meshes;
// state.police is the active-unit list the HUD and minimap read.
const pol = createPolice(THREE, view.scene);
state.pol = pol;
const audio = createAudio();
state.police = [];

function showScreen(name) {
  state.screen = name;
  for (const id of ["title", "pause", "wasted", "busted", "draft", "victory", "garage", "stats"]) {
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

// HUD lives in hud.js now: syncHud(state, runner, pol).

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
    state.objective = { x: -290, z: -160 };
    state.toast = "NEAR MISS +250";
    state.missionIndex = 0;
    milo.visible = false;
    activateFor(pol, 5);
    placeUnit(pol, "KITE-1", -142, -164);
    placeUnit(pol, "CRUISER-2", -142, -156);
    placeUnit(pol, "VIPER-1", -160, -160);
    placeUnit(pol, "CRUISER-3", -180, -180);
    placeUnit(pol, "HAWK-1", -180, -140);
    refreshDist(pol, state.x, state.z);
    state.police = activeUnits(pol);
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
    state.objective = { x: 240, z: 280 };
    state.toast = "AIR UNIT DEPLOYED";
    state.missionIndex = 3;
    milo.visible = false;
    activateFor(pol, 3);
    placeUnit(pol, "KITE-1", 160, 224);
    placeUnit(pol, "CRUISER-2", 160, 248);
    placeUnit(pol, "VIPER-1", 180, 200);
    placeUnit(pol, "HAWK-1", 140, 180);
    refreshDist(pol, state.x, state.z);
    state.police = activeUnits(pol);
    showScreen("play");
  } else if (name === "heli") {
    // Police heli pursuit: wanted 3, air unit over the chase.
    const spyder = parked[2];
    state.car = takeCar(spyder);
    state.car.x = -120; state.car.z = -160; state.car.heading = -Math.PI / 2;
    state.car.mesh.position.set(-120, 0, -160);
    state.car.mesh.rotation.y = state.car.heading;
    state.mode = "chase";
    state.x = -120; state.z = -160; state.heading = -Math.PI / 2;
    state.wanted = 3; state.chain = 2.5; state.cash = 18400; state.speed = 72;
    state.car.speed = 72;
    state.objective = { x: -290, z: -160 };
    state.toast = "AIR UNIT DEPLOYED";
    state.missionIndex = 3;
    milo.visible = false;
    activateFor(pol, 3);
    placeUnit(pol, "KITE-1", -142, -164);
    placeUnit(pol, "CRUISER-2", -142, -156);
    placeUnit(pol, "VIPER-1", -100, -140);
    placeUnit(pol, "HAWK-1", -120, -140);
    refreshDist(pol, state.x, state.z);
    state.police = activeUnits(pol);
    showScreen("play");
  } else if (name === "standoff") {
    // STANDOFF on foot: wanted 4, three units ring Milo.
    state.mode = "foot";
    state.x = spawn.x; state.z = spawn.z; state.heading = spawn.heading;
    state.wanted = 4; state.hp = 100; state.cash = 8200;
    state.missionIndex = 2;
    milo.visible = true;
    milo.position.set(state.x, 0, state.z);
    activateFor(pol, 4);
    placeUnit(pol, "KITE-1", state.x + 14, state.z);
    placeUnit(pol, "CRUISER-2", state.x - 7, state.z + 12);
    placeUnit(pol, "VIPER-1", state.x - 7, state.z - 12);
    placeUnit(pol, "CRUISER-3", state.x, state.z + 14);
    placeUnit(pol, "HAWK-1", state.x + 20, state.z - 20);
    pol.units.forEach((u) => { if (u.active) u.mode = "hold"; });
    state.standoff = { timer: 10 };
    refreshDist(pol, state.x, state.z);
    state.police = activeUnits(pol);
    state.toast = "STANDOFF — HOLD THE RING";
    showScreen("play");
  } else if (name === "garage") {
    // Garage + RIFLE: the buy/equip screen with cash to spend.
    state.mode = "foot";
    state.x = spawn.x; state.z = spawn.z; state.heading = spawn.heading;
    state.cash = 8500; state.rep = 1300;
    state.garage = {
      owned: ["comet", "spyder", "roadster"], equipped: "roadster",
      upgrades: {
        comet: { engine: 0, brakes: 0, nos: 0 },
        spyder: { engine: 1, brakes: 0, nos: 0 },
        roadster: { engine: 2, brakes: 1, nos: 1 },
      },
    };
    state.weaponsOwned = new Set(["pistol", "rifle"]);
    state.ammo = { pistol: -1, shotgun: 0, smg: 0, rifle: 20 };
    state.weapon = 3;
    milo.visible = true;
    milo.position.set(state.x, 0, state.z);
    activateFor(pol, 0);
    state.police = [];
    renderGarage(state);
    showScreen("garage");
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
    activateFor(pol, 2);
    placeUnit(pol, "KITE-1", 40, -80);
    placeUnit(pol, "CRUISER-2", -40, -120);
    state.police = activeUnits(pol);
    showScreen("play");
  } else {
    // marina (default): Milo on foot by the pier, first mission live.
    state.mode = "foot";
    state.x = spawn.x; state.z = spawn.z; state.heading = spawn.heading;
    state.missionIndex = 0;
    startMission(runner, state);
    activateFor(pol, 0);
    state.police = [];
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
        ensureGarage(state);
        if (!state.garage.owned.includes(car.spec.id)) state.garage.owned.push(car.spec.id);
        car.upgrades = { ...(state.garage.upgrades[car.spec.id] || { engine: 0, brakes: 0, nos: 0 }) };
        state.car = car;
        state.mode = "chase";
        state.heading = car.heading;
        state.stats.stolen += 1;
        addRep(state, 20);
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
            addRep(state, 5);
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
    // Live pursuit: named units chase, ram, bust and lose heat.
    const pev = updatePolice(pol, state, dt);
    state.police = activeUnits(pol);
    for (const ev of pev) {
      if (ev.kind === "ram" && state.car) {
        state.car.hp = Math.max(0, state.car.hp - ev.dmg);
        state.toast = `${ev.name} RAM — CAR HP ${Math.round(state.car.hp)}`;
        if (state.car.hp <= 0) {
          const ref = state.car.parked;
          if (ref) { ref.x = state.car.x; ref.z = state.car.z; ref.stolen = false; }
          state.car = null;
          state.mode = "foot";
          state.speed = 0;
          milo.visible = true;
          milo.position.set(state.x, 0, state.z);
          state.toast = "RAMMED TO A WRECK — MILO IS ON FOOT";
        }
      } else if (ev.kind === "bust") {
        state.toast = `BUSTED BY ${ev.name}`;
        showScreen("busted");
      } else if (ev.kind === "evaded") {
        state.stats.evaded += 1;
        addRep(state, 60);
        state.toast = "EVADED — HEAT GONE +60 REP";
      } else if (ev.kind === "heli") {
        state.toast = "AIR UNIT DEPLOYED";
      }
    }
    // Return fire and the police shooting back on foot.
    fireTick(state, dt, pol, isHeld("fire"));
    if (policeFire(state, dt, pol) === "wasted") {
      state.toast = "WASTED";
      showScreen("wasted");
    }
    if (state.mode === "foot" && state.wanted >= 4 && !state.standoff) startStandoff(state, pol);
    updateStandoff(state, dt, pol);
    checkFeats(state);
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
    // Autosave slot 1 whenever a mission is banked.
    if (state.stats.missionsDone !== state.lastSavedMissions) {
      state.lastSavedMissions = state.stats.missionsDone;
      if (saveGame(state, runner, 0)) refreshSlots();
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
  if (wasPressed("radio")) {
    state.radio = (state.radio + 1) % CONFIG.radio.length;
    audio.setStation(state.radio);
  }
  if (wasPressed("wheel")) cycleWeapon(state);
  if (wasPressed("garage") && (state.screen === "play" || state.screen === "garage")) {
    if (state.screen === "garage") showScreen("play");
    else { renderGarage(state); showScreen("garage"); }
  }
  if (wasPressed("stats") && (state.screen === "play" || state.screen === "stats")) {
    if (state.screen === "stats") showScreen("play");
    else { showStats(state); showScreen("stats"); }
  }
  if (wasPressed("save")) {
    if (saveGame(state, runner, 0)) { state.toast = "SAVED — SLOT 1"; refreshSlots(); }
  }
  if (wasPressed("load")) {
    const d = loadGame(state, runner, 0);
    if (d) { relinkCar(d); state.toast = "LOADED — SLOT 1"; refreshSlots(); }
    else state.toast = "SLOT 1 EMPTY";
  }
  view.frame({ x: state.x, z: state.z, heading: state.heading, mode: state.mode });
  syncHud(state, runner, pol);
  toastTick(state, dt);
  audio.tick(state);
  endFrame();
}

// After a load, re-link the saved car to its parked mesh and put
// the live police units back on the road near Milo.
function relinkCar(d) {
  state.car = null;
  state.staged = false;
  if (d.car) {
    const ref = parked.find((p) => p.spec.id === d.car.spec && p.stolen)
      || parked.find((p) => p.spec.id === d.car.spec);
    if (ref) {
      const car = takeCar(ref);
      car.parked = ref;
      car.x = d.car.x; car.z = d.car.z; car.heading = d.car.heading;
      car.speed = d.car.speed; car.hp = d.car.hp; car.nitro = d.car.nitro;
      car.upgrades = { ...d.car.upgrades };
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.heading;
      state.car = car;
    }
  }
  state.mode = d.mode;
  if (state.mode === "chase" && state.car) {
    milo.visible = false;
    state.x = state.car.x; state.z = state.car.z; state.heading = state.car.heading;
  } else {
    state.mode = "foot";
    milo.visible = true;
    milo.position.set(state.x, 0, state.z);
  }
  state.objective = runner.target ? { ...runner.target } : null;
  activateFor(pol, state.wanted);
  activeUnits(pol).forEach((u, i) => {
    if (!u.heli) placeUnit(pol, u.name, state.x + 30 + i * 14, state.z - 20);
  });
  state.police = activeUnits(pol);
  showScreen("play");
}

function refreshSlots() {
  for (let i = 0; i < 3; i++) {
    $(`slot-${i}`).textContent = `SAVE ${i + 1} — ${slotLabel(i)}`;
  }
}

function boot() {
  bindInput();
  view.resize();
  window.addEventListener("resize", view.resize);
  $("btn-start").addEventListener("click", () => {
    audio.ensure();
    // The title shot is staged; pressing START unfreezes the sim.
    state.staged = false;
    state.x = playerSpawn().x; state.z = playerSpawn().z;
    state.heading = playerSpawn().heading;
    state.missionIndex = 0;
    startMission(runner, state);
    showScreen("play");
  });
  $("btn-sound").addEventListener("click", (e) => {
    const on = e.target.textContent.includes("ON");
    e.target.textContent = on ? "SOUND: OFF" : "SOUND: ON";
    state.soundOn = !on;
    audio.ensure();
    audio.setOn(state.soundOn);
  });
  // Garage rows: one delegated handler for buy/equip/fence/upgrades.
  $("garageRows").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "buy") buyCar(state, b.dataset.car);
    else if (act === "eq") equipCar(state, b.dataset.car);
    else if (act === "sell") sellCar(state, b.dataset.car);
    else if (act === "up") buyUpgrade(state, b.dataset.car, b.dataset.kind);
    else if (act === "gun") buyWeapon(state, b.dataset.car);
    renderGarage(state);
  });
  $("btn-garage-close").addEventListener("click", () => showScreen("play"));
  $("btn-stats-close").addEventListener("click", () => showScreen("play"));
  for (let i = 0; i < 3; i++) {
    $(`draft-${i}`).addEventListener("click", () => { if (pickPerk(runner, state, i)) showScreen(state.screen); });
    $(`slot-${i}`).addEventListener("click", () => {
      const d = loadGame(state, runner, i);
      if (d) { relinkCar(d); state.toast = `LOADED — SLOT ${i + 1}`; }
    });
    $(`btn-save-${i}`).addEventListener("click", () => { if (saveGame(state, runner, i)) refreshSlots(); });
    $(`btn-load-${i}`).addEventListener("click", () => {
      const d = loadGame(state, runner, i);
      if (d) relinkCar(d);
    });
    refreshSlots();
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
