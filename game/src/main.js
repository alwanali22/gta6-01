// main.js — boot, loop, state, screens and shot staging.
// Chunk B owns player + vehicles + traffic + missions; chunk C owns
// police, combat, respect, hud, audio and saves.
import * as THREE from 'three';
import { CARS, MISSIONS, WORLD, WEAPONS, ECONOMY } from './config.js';
import { buildCity } from './city.js';
import { createInput } from './input.js';
import { createWorld } from './render.js';
import { createPlayer, updatePlayer } from './player.js';
import { updateVehicle } from './vehicles.js';
import { createTraffic, updateTraffic } from './traffic.js';
import {
  createMissions, startMission, updateMissions, updateDraft, pickDraft,
  objectiveText,
} from './missions.js';
import { createPolice, updatePolice } from './police.js';
import { fire, cycleWeapon, selectWeapon } from './combat.js';
import { respectTick } from './respect.js';
import { createAudio, radioCycle, stationName, shotSound } from './audio.js';
import { syncHud, renderTitle, renderGarage, renderStats, garageClick } from './hud.js';
import { loadSlot } from './save.js';

const $ = (sel) => document.querySelector(sel);

export function makeState() {
  return {
    time: 0,
    screen: 'title',
    player: { x: -160, z: -60, heading: 0, speed: 0, onFoot: true, vehicleId: null },
    cars: CARS.map((c) => ({
      id: c.id, name: c.name, x: c.spawn.x, z: c.spawn.z,
      heading: 0, color: c.color, price: c.price, owner: c.id === 'comet' ? 'player' : 'street',
      hp: 100, visible: true, stolen: false,
    })),
    traffic: [],
    police: null,
    target: null,
    cash: 0,
    rep: 0,
    heat: 0,
    chain: 1,
    mission: 0,
    done: [],
    perks: [],
    garage: {},
    feats: [],
    muted: false,
    runActive: false,
    // Chunk B run state.
    nitro: 1,
    missionPhase: 'drive',
    missionTimer: 0,
    missionChoice: null,
    raceClock: 0,
    raceCp: 0,
    raceCheckpoints: [],
    branchMarkers: [],
    event: null,
    eventClock: 0,
    eventAt: 40,
    boss: null,
    shotsAt: 0,
    earned: 0,
    maxHeat: 0,
    bestChain: 1,
    nearMisses: 0,
    draftOptions: [],
    convoy: null,
    shadowTimer: 0,
    // Chunk C state.
    heatFlags: { face: false, fit: false, car: false, crew: false },
    pursuit: null,
    weapon: 'pistol',
    owned: ['pistol'],
    ammo: { pistol: -1, shotgun: 0, smg: 0, rifle: 0 },
    respect: 0,
    districtRep: {},
    outfit: 0,
    standoff: null,
    missionGrades: [],
    career: { carsStolen: 0, copsEvaded: 0, takenOut: 0, shotsFired: 0 },
    cleanUsed: false,
    combatCd: 0,
  };
}

const state = makeState();
const city = buildCity(1337);
const input = createInput();
const audioSys = createAudio();
let world = null;
let playerSys = null;
let trafficSys = null;
let missionsSys = null;
let policeSys = null;

const ctx = {
  audio: audioSys,
  audioName: () => stationName(audioSys),
  toast: (m) => toast(m),
  setScreen: (n) => setScreen(n),
  loadGame: (i) => loadGame(i),
};

export function setScreen(name) {
  state.screen = name;
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('hidden', el.dataset.screen !== name);
  });
  $('#hud').classList.toggle('hidden', name === 'title' || name === 'stats');
  if (world) world.setMode(name === 'play' ? 'chase' : 'orbit');
  if (name === 'garage') renderGarage(state, ctx);
  if (name === 'title') renderTitle(state);
  if (name === 'stats') renderStats(state);
}

export function stageShot(name) {
  const pl = state.player;
  if (name === 'chase') {
    setScreen('play'); // shows the HUD, hides the title overlay
    state.screen = 'play';
    pl.onFoot = false;
    pl.vehicleId = 'comet';
    pl.x = -160; pl.z = -60; pl.heading = 0; // on the x=-160 road, driving +z
    state.heat = 4;
    state.chain = 2;
    state.cash = 3313;
    state.mission = 0;
    state.target = { x: -160, z: 120 };
    state.heatFlags = { face: true, fit: true, car: true, crew: false };
    state.pursuit = 'PURSUIT';
    state.police = {
      units: [
        { tag: 'KITE-1', role: 'MARKSMAN', x: -152, z: -20, heading: 0, speed: 16, hp: 100, disabled: 0, standoff: false },
        { tag: 'CORAL-48', role: 'RAMMING', x: -168, z: 10, heading: 0, speed: 16, hp: 100, disabled: 0, standoff: false },
      ],
      heli: { x: -160, z: -100, alt: 26, heading: 0, retreat: 0 },
      roadblocks: [{ x: -160, z: 40, heading: 0 }],
      bustT: 0, hotZone: null, standoff: null,
    };
    const back = pl.heading + Math.PI;
    world.setShotCam(
      [pl.x + Math.sin(back) * 16, 4.5, pl.z + Math.cos(back) * 16],
      [pl.x, 2, pl.z + 20],
    );
  } else if (name === 'start') {
    setScreen('title');
  } else if (name === 'draft') {
    setScreen('draft');
  } else if (name === 'victory') {
    setScreen('victory');
  }
  syncHud(state, ctx);
}

function showVictory(s) {
  const grade = s.earned >= ECONOMY.gradeS ? 'S'
    : s.earned >= 60000 ? 'A' : s.earned >= 40000 ? 'B' : 'C';
  const owned = s.cars.filter((c) => c.owner === 'player').length;
  const vals = [
    '$' + s.earned.toLocaleString('en-US'), '10 / 10', '★' + s.maxHeat,
    'x' + s.bestChain.toFixed(1), String(s.nearMisses), String(s.perks.length),
    String(owned), 'GRADE ' + grade,
  ];
  document.querySelectorAll('.stat-grid div b').forEach((el, i) => {
    if (vals[i] !== undefined) el.textContent = vals[i];
  });
  const p = document.querySelector('[data-screen="victory"] p');
  if (p) p.textContent = 'Grade ' + grade + '. The Broker pays. Solmar is yours tonight, Milo.';
  setScreen('victory');
}

let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  toastTimer = 3;
}

const fx = {
  toast,
  setScreen,
  showVictory,
  busted: (s) => { s.runActive = false; setScreen('busted'); },
};

function loadGame(i) {
  if (!loadSlot(state, i)) return false;
  // Recreate every system: a reload leaves the module-level systems null,
  // and the loop would die on the first frame after load.
  playerSys = createPlayer();
  trafficSys = createTraffic(city);
  missionsSys = createMissions(city);
  policeSys = createPolice(city);
  state.police = policeSys;
  state.runActive = true;
  setScreen('play');
  syncHud(state, ctx);
  return true;
}

function step(dt) {
  state.time += dt;
  if (state.screen === 'play' && state.runActive) {
    state.combatCd = Math.max(0, state.combatCd - dt);
    updatePlayer(playerSys, state, input, city, dt, fx);
    if (!state.player.onFoot) updateVehicle(state, input, city, dt, fx);
    updateTraffic(trafficSys, state, dt);
    if (policeSys) updatePolice(policeSys, state, dt, fx);
    updateMissions(missionsSys, state, dt, fx);
    respectTick(state, fx);
    state.maxHeat = Math.max(state.maxHeat, state.heat);
    state.bestChain = Math.max(state.bestChain, state.chain);
    // Wasted: every car wrecked or sold while on foot.
    if (state.player.onFoot && state.cars.every((c) => c.hp <= 0 || !c.visible)) {
      state.runActive = false;
      setScreen('wasted');
    }
    // Combat + radio + garage keys.
    if (input.tapped('fire') && fire(state, state.police, fx)) shotSound(audioSys);
    if (input.tapped('wheel')) cycleWeapon(state);
    if (input.tapped('radio')) toast('RADIO — ' + radioCycle(audioSys));
    if (input.tapped('one')) selectWeapon(state, 0);
    if (input.tapped('two')) selectWeapon(state, 1);
    if (input.tapped('three')) selectWeapon(state, 2);
    if (input.tapped('four')) selectWeapon(state, 3);
  }
  if (state.screen === 'draft' && missionsSys) updateDraft(missionsSys, state, input, fx);
  if (input.tapped('pause')) {
    if (state.screen === 'play') setScreen('pause');
    else if (state.screen === 'pause') setScreen('play');
  }
  if (input.tapped('shop')) {
    if (state.screen === 'play') setScreen('garage');
    else if (state.screen === 'garage') setScreen('play');
  }
  if (input.tapped('interact') && state.screen === 'title') startRun();
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) $('#toast')?.classList.add('hidden');
  }
  input.endFrame();
}

function startRun() {
  Object.assign(state, makeState());
  state.runActive = true;
  state.player = { x: -140, z: -60, heading: 0, speed: 0, onFoot: true, vehicleId: null };
  playerSys = createPlayer();
  trafficSys = createTraffic(city);
  missionsSys = createMissions(city);
  policeSys = createPolice(city);
  state.police = policeSys;
  setScreen('play');
  startMission(state, 0, fx);
  syncHud(state, ctx);
}

function frame(t) {
  const dt = Math.min(0.05, (t - frame.last) / 1000 || 0.016);
  frame.last = t;
  step(dt);
  world.update(state, dt, state.time);
  const mm = $('#minimap');
  if (mm && mm.getContext) {
    const ctx2d = mm.getContext('2d');
    world.drawMinimap(ctx2d, mm.width, mm.height, state);
  }
  syncHud(state, ctx);
  requestAnimationFrame(frame);
}

function boot() {
  const canvas = $('#game');
  world = createWorld(canvas, city);
  input.attach(window);
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) stageShot(shot);
  else setScreen('title');
  syncHud(state, ctx);
  window.__solmar = {
    state, city, input,
    police: { createPolice, updatePolice },
    combat: { fire, cycleWeapon, selectWeapon },
    audio: { radioCycle, stationName },
    save: { loadSlot },
    hud: { syncHud },
  };
  window.__world = world;
  let frames = 0;
  const ready = () => {
    frames += 1;
    if (frames >= 3) window.__shotReady = true;
    else requestAnimationFrame(ready);
  };
  requestAnimationFrame(ready);
  window.addEventListener('resize', () => world.resize(window.innerWidth, window.innerHeight));
  $('#btn-start')?.addEventListener('click', startRun);
  $('#btn-again')?.addEventListener('click', startRun);
  $('#btn-resume')?.addEventListener('click', () => setScreen('play'));
  $('#btn-title')?.addEventListener('click', () => setScreen('title'));
  document.querySelectorAll('[data-goto]').forEach((b) =>
    b.addEventListener('click', () => setScreen(b.dataset.goto)));
  document.querySelectorAll('.perk-card').forEach((el, i) =>
    el.addEventListener('click', () => {
      if (state.screen === 'draft' && missionsSys) pickDraft(missionsSys, state, i, fx);
    }));
  document.addEventListener('click', (ev) => garageClick(state, ctx, ev));
  requestAnimationFrame((t) => { frame.last = t; requestAnimationFrame(frame); });
}

boot();
