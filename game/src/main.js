// main.js — boot, loop, state, screens and shot staging.
// Chunk B owns player + vehicles + traffic + missions; chunk C owns
// police, combat, hud, audio and saves. HUD depth lives in hud.js (chunk C).
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

const $ = (sel) => document.querySelector(sel);

export function makeState() {
  return {
    time: 0,
    screen: 'title',
    player: { x: -160, z: -60, heading: 0, speed: 0, onFoot: true, vehicleId: null },
    cars: CARS.map((c) => ({
      id: c.id, name: c.name, x: c.spawn.x, z: c.spawn.z,
      heading: 0, color: c.color, price: c.price, owner: c.id === 'comet' ? 'player' : 'street',
      hp: 100, visible: true,
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
  };
}

const state = makeState();
const city = buildCity(1337);
const input = createInput();
let world = null;
let playerSys = null;
let trafficSys = null;
let missionsSys = null;

export function setScreen(name) {
  state.screen = name;
  document.querySelectorAll('.screen').forEach((el) => {
    el.classList.toggle('hidden', el.dataset.screen !== name);
  });
  $('#hud').classList.toggle('hidden', name === 'title');
  if (world) world.setMode(name === 'play' ? 'chase' : 'orbit');
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
  syncHud();
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

function syncHud() {
  const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };
  set('#hud-cash', '$' + state.cash.toLocaleString('en-US'));
  set('#hud-rep', 'REP ' + state.rep);
  set('#hud-chain', 'CHAIN x' + state.chain.toFixed(1));
  set('#hud-stars', '★'.repeat(Math.round(state.heat)) + '☆'.repeat(5 - Math.round(state.heat)));
  if (state.runActive) set('#hud-objective', objectiveText(state));
  else {
    const m = MISSIONS[state.mission];
    set('#hud-objective', m ? m.name + ' — ' + m.text : 'FREE ROAM — SOLMAR');
  }
  set('#hud-speed', Math.round(Math.abs(state.player.speed) * 3.6) + ' km/h');
  set('#weapon-value', WEAPONS.pistol.name + ' · ∞ RDS [Q] [F]');
  set('#radio-value', 'RADIO OFF');
}

let toastTimer = 0;
function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  toastTimer = 3;
}

const fx = { toast, setScreen, showVictory };

function step(dt) {
  state.time += dt;
  if (state.screen === 'play' && state.runActive) {
    updatePlayer(playerSys, state, input, city, dt, fx);
    if (!state.player.onFoot) updateVehicle(state, input, city, dt, fx);
    updateTraffic(trafficSys, state, dt);
    updateMissions(missionsSys, state, dt, fx);
    state.maxHeat = Math.max(state.maxHeat, state.heat);
    state.bestChain = Math.max(state.bestChain, state.chain);
  }
  if (state.screen === 'draft' && missionsSys) updateDraft(missionsSys, state, input, fx);
  if (input.tapped('pause')) {
    if (state.screen === 'play') setScreen('pause');
    else if (state.screen === 'pause') setScreen('play');
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
  setScreen('play');
  startMission(state, 0, fx);
  syncHud();
}

function frame(t) {
  const dt = Math.min(0.05, (t - frame.last) / 1000 || 0.016);
  frame.last = t;
  step(dt);
  world.update(state, dt, state.time);
  const mm = $('#minimap');
  if (mm && mm.getContext) {
    const ctx = mm.getContext('2d');
    world.drawMinimap(ctx, mm.width, mm.height, state);
  }
  syncHud();
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
  syncHud();
  window.__solmar = { state, city, input };
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
  requestAnimationFrame((t) => { frame.last = t; requestAnimationFrame(frame); });
}

boot();
