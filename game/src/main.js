// Boot and the one loop: Milo on foot, the car, traffic, walkers and
// the 12 missions, all stepped in order, then paint. ?shot= stages a
// scene instead of running, paints twice and sets window.__shotReady.
import { CARS, ECONOMY, GAME, MISSIONS, MISSION_TOTAL, PLAYER, POLICE } from './config.js';
import { createRandom } from './random.js';
import { ACT_PAUSE, ACT_START, createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import { exitCar, stepPlayer } from './player.js';
import { driveVehicle } from './vehicles.js';
import { spawnTraffic, stepTraffic } from './traffic.js';
import { spawnWalkers, stepWalkers } from './pedestrians.js';
import { applyPerk, completeMission, gradeFromStats, startMission, triggerRandomEvent, updateMissions } from './missions.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedValue = Number.parseInt(params.get('seed') || '1', 10);
const seed = Number.isInteger(seedValue) ? seedValue : 1;
const rng = createRandom(seed);

const canvas = document.getElementById('game');
const minimap = document.getElementById('minimap');
const status = document.getElementById('status');

export const state = {
  seed,
  cash: PLAYER.startCash,
  wanted: 0,
  chain: 1.0,
  speed: 0,
  night: 0,
  inCar: false,
  currentCar: null,
  carHealth: 100,
  nitro: 100,
  hotwire: 0,
  nearCar: null,
  grade: 'C',
  missionsDone: 0,
  missionTotal: MISSION_TOTAL,
  missions: MISSIONS,
  cars: CARS,
  perks: [],
  upgrades: { ENGINE: 0, BRAKES: 0, NOS: 0 },
  nearMiss: 0,
  carsStolen: 0,
  copsEvaded: 0,
  bestChain: 1.0,
  gigsDone: 0,
  player: { x: PLAYER.startPos[0], z: PLAYER.startPos[1], heading: 0 },
  police: [],
  traffic: spawnTraffic(seed),
  walkers: spawnWalkers(seed),
  mission: null,
  missionIndex: -1,
  draft: null,
  draftIds: null,
  event: null,
  lastNearMiss: '',
  failed: null,
  wrecked: false,
};

function syncHud(screen) {
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('hud-cash', `$${state.cash.toLocaleString('en-US')}`);
  set('hud-speed', `${Math.round(Math.abs(state.speed))} km/h`);
  set('hud-chain', `CHAIN x${state.chain.toFixed(1)}`);
  set('hud-wanted', '★'.repeat(state.wanted) + '☆'.repeat(POLICE.maxWanted - state.wanted));
  set('hud-units', `UNITS IN PURSUIT: ${state.police.length} — CRUISER x2, INTERCEPTOR x1`);
  set('hud-mission', state.mission ? `${state.mission.name} — ${Math.max(0, Math.ceil(state.mission.timeLeft))}s LEFT / LOSE: ${state.mission.lose}` : 'FREE ROAM — STEAL A CAR');
  set('hud-district', 'Marina Row');
  set('hud-heat', 'HEAT: FACE KNOWN — SWAP CAR TO CLEAR');
  set('hud-air', state.wanted >= POLICE.heliAt ? 'AIR UNIT DEPLOYED' : '');
  set('hud-toast', state.lastNearMiss || (state.event ? `${state.event.name} — ${state.event.text}` : ''));
  set('hud-nitro', state.inCar ? `NITRO ${Math.round(state.nitro)}% · HEALTH ${Math.round(state.carHealth)}%` : (state.nearCar ? `HOLD E — HOTWIRE ${state.nearCar.toUpperCase()} (${state.hotwire.toFixed(1)}s)` : ''));
  const draftEl = document.getElementById('draft-options');
  if (draftEl && state.draft) draftEl.textContent = state.draft.join(' · ');
  document.querySelectorAll('.screen').forEach((el) => { el.hidden = screen === 'play' ? true : el.id !== `screen-${screen}`; });
  const hud = document.getElementById('hud');
  if (hud) hud.hidden = screen === 'title';
  if (status) status.textContent = `${GAME.title} — ${screen}. Cash $${state.cash}.`;
}

const renderer = createRenderer(canvas, minimap);
window.__solmar = {
  state, game: GAME, seed, buildings: renderer.city.buildings.length,
  startMission: (i) => startMission(state, i),
  completeMission: () => completeMission(state),
  applyPerk: (i) => applyPerk(state, i),
  triggerEvent: () => triggerRandomEvent(state),
  grade: () => gradeFromStats(state),
  exitCar: () => exitCar(state),
};
window.__shotReady = false;

function runShot(name) {
  const scene = stageShot(name, state);
  syncHud(scene.screen);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = 'title';
  let last = performance.now();
  let eventTimer = 45;
  syncHud(screen);

  function step(dt) {
    if (screen !== 'play') return;
    stepTraffic(state.traffic, dt, rng);
    stepWalkers(state.walkers, state, dt);
    if (state.inCar) {
      const result = driveVehicle(state, input, dt, state.traffic);
      if (result === 'wrecked') { screen = 'wasted'; state.failed = 'WRECKED'; }
    } else {
      const stolen = stepPlayer(state, input, dt);
      if (stolen === 'stolen') {
        state.wanted = Math.min(POLICE.maxWanted, state.wanted + 1);
        if (state.missionIndex < 0) startMission(state, 0);
      }
    }
    if (state.inCar && state.wanted > 0) {
      state.police = [
        { id: 'KITE-1', role: 'MARKSMAN', kind: 'CRUISER', x: state.player.x - 9, z: state.player.z - 14, heading: state.player.heading, dist: 15 },
        { id: 'KITE-2', role: 'BLOCKER', kind: 'CRUISER', x: state.player.x + 10, z: state.player.z - 18, heading: state.player.heading, dist: 22 },
        { id: 'FALCON-1', role: 'INTERCEPTOR', kind: 'INTERCEPTOR', x: state.player.x - 4, z: state.player.z + 20, heading: state.player.heading, dist: 28 },
      ];
    } else if (!state.inCar) {
      state.police = [];
    }
    const outcome = updateMissions(state, dt);
    if (outcome === 'done') {
      if (state.missionsDone >= MISSIONS.length) {
        state.grade = gradeFromStats(state);
        screen = 'victory';
      } else {
        screen = 'draft';
      }
    } else if (outcome === 'failed') {
      screen = state.wanted >= POLICE.maxWanted ? 'busted' : 'wasted';
    }
    eventTimer -= dt;
    if (eventTimer <= 0 && !state.mission) {
      triggerRandomEvent(state);
      eventTimer = 45;
    }
    state.night = Math.min(1, state.night + dt * 0.002);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const acts = input.take();
    if (acts & ACT_START && screen === 'title') {
      screen = 'play';
      startMission(state, 0);
    } else if (acts & ACT_PAUSE && screen === 'play') screen = 'pause';
    else if (acts & ACT_PAUSE && screen === 'pause') screen = 'play';
    else if (screen === 'draft') {
      // Number keys pick a perk: 1, 2 or 3, then the next job starts.
      if (window.__draftPick !== undefined && window.__draftPick !== null) {
        applyPerk(state, window.__draftPick);
        window.__draftPick = null;
        startMission(state, state.missionsDone);
        screen = 'play';
      }
    }
    step(dt);
    syncHud(screen);
    renderer.draw(state, screen);
  }
  window.addEventListener('keydown', (e) => {
    if (screen !== 'draft') return;
    if (e.code === 'Digit1') window.__draftPick = 0;
    if (e.code === 'Digit2') window.__draftPick = 1;
    if (e.code === 'Digit3') window.__draftPick = 2;
  });
  requestAnimationFrame(frame);
}

if (shotName) runShot(shotName);
else runGame();
