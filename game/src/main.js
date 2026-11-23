// Boot and the one loop: read input, move Milo on foot or in the car,
// step the two police cars after him, paint, and publish the state for
// the probe and the sim. ?shot=start|chase|draft|victory stages a scene
// instead of running, paints twice and sets window.__shotReady.
import { CARS, ECONOMY, GAME, MISSIONS, MISSION_TOTAL, PLAYER, POLICE } from './config.js';
import { createRandom } from './random.js';
import { ACT_PAUSE, ACT_START, createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedValue = Number.parseInt(params.get('seed') || '1', 10);
const seed = Number.isInteger(seedValue) ? seedValue : 1;
const rng = createRandom(seed);

const canvas = document.getElementById('game');
const minimap = document.getElementById('minimap');
const status = document.getElementById('status');

export const state = {
  cash: PLAYER.startCash,
  wanted: 0,
  chain: 1.0,
  speed: 0,
  night: 0,
  inCar: false,
  grade: 'C',
  missionsDone: 0,
  missionTotal: MISSION_TOTAL,
  missions: MISSIONS,
  cars: CARS,
  nearMiss: 0,
  carsStolen: 0,
  copsEvaded: 0,
  bestChain: 1.0,
  player: { x: PLAYER.startPos[0], z: PLAYER.startPos[1], heading: 0 },
  police: [],
  mission: null,
  draft: null,
};

function syncHud(screen) {
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  set('hud-cash', `$${state.cash.toLocaleString('en-US')}`);
  set('hud-speed', `${Math.round(state.speed)} km/h`);
  set('hud-chain', `CHAIN x${state.chain.toFixed(1)}`);
  set('hud-wanted', '★'.repeat(state.wanted) + '☆'.repeat(POLICE.maxWanted - state.wanted));
  set('hud-units', `UNITS IN PURSUIT: ${state.police.length} — CRUISER x2`);
  set('hud-mission', state.mission ? `${state.mission.name} — ${state.mission.timeLeft}s LEFT / LOSE: ${state.mission.lose}` : 'FREE ROAM — STEAL A CAR');
  set('hud-district', 'Marina Row');
  set('hud-heat', 'HEAT: FACE KNOWN — SWAP CAR TO CLEAR');
  set('hud-air', state.wanted >= POLICE.heliAt ? 'AIR UNIT DEPLOYED' : '');
  document.querySelectorAll('.screen').forEach((el) => { el.hidden = screen === 'play' ? true : el.id !== `screen-${screen}`; });
  const hud = document.getElementById('hud');
  if (hud) hud.hidden = screen === 'title';
  if (status) status.textContent = `${GAME.title} — ${screen}. Cash $${state.cash}.`;
}

const renderer = createRenderer(canvas, minimap);
window.__solmar = { state, game: GAME, seed, buildings: renderer.city.buildings.length };
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
  let hotwire = 0;
  syncHud(screen);

  function step(dt) {
    const fwd = input.forward() - input.back();
    const steer = input.steer();
    if (screen !== 'play') return;
    state.player.heading += steer * dt * 1.9;
    const speed = state.inCar ? 26 : PLAYER.walk;
    const moving = fwd !== 0;
    if (moving) {
      state.player.x += Math.sin(state.player.heading) * speed * dt * fwd;
      state.player.z += Math.cos(state.player.heading) * speed * dt * fwd;
      state.speed = Math.abs(speed * 3.6 * fwd);
    } else {
      state.speed *= 0.92;
    }
    state.player.x = Math.max(-200, Math.min(200, state.player.x));
    state.player.z = Math.max(-200, Math.min(200, state.player.z));
    if (input.hotwireHeld() && !state.inCar) {
      hotwire += dt;
      if (hotwire >= PLAYER.hotwireSeconds) {
        state.inCar = true;
        state.carsStolen += 1;
        state.wanted = Math.min(POLICE.maxWanted, state.wanted + 1);
        hotwire = 0;
      }
    } else hotwire = 0;
    if (state.inCar && state.wanted > 0) {
      state.police = [
        { id: 'KITE-1', role: 'MARKSMAN', kind: 'CRUISER', x: state.player.x - 9, z: state.player.z - 14, heading: state.player.heading, dist: 15 },
        { id: 'KITE-2', role: 'BLOCKER', kind: 'CRUISER', x: state.player.x + 10, z: state.player.z - 18, heading: state.player.heading, dist: 22 },
      ];
      if (rng() < 0.002) {
        state.nearMiss += 1;
        state.cash += ECONOMY.nearMiss;
        state.chain = Math.min(ECONOMY.chainMax, state.chain + ECONOMY.chainStep);
        state.bestChain = Math.max(state.bestChain, state.chain);
      }
    } else if (!state.inCar) {
      state.police = [];
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
      state.mission = { name: 'THE MARINA JOB', timeLeft: 120, lose: 'CAR LOST' };
    } else if (acts & ACT_PAUSE && screen === 'play') screen = 'pause';
    else if (acts & ACT_PAUSE && screen === 'pause') screen = 'play';
    step(dt);
    syncHud(screen);
    renderer.draw(state, screen);
  }
  requestAnimationFrame(frame);
}

if (shotName) runShot(shotName);
else runGame();
