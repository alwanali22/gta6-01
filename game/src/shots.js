// The four staged scenes behind ?shot=. Each one sets the same real
// state the loop uses — a chase, a title, a perk draft, a victory — then
// the loop paints it. Same seed, same frame, every time.
import { SCREEN_DRAFT, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';

export function stageShot(name, state) {
  state.cash = 500;
  state.wanted = 3;
  state.chain = 2.0;
  state.speed = 0;
  state.night = 0;
  state.inCar = true;
  state.player.x = 0;
  state.player.z = 0;
  state.player.heading = 0;
  state.police = [
    { id: 'KITE-1', role: 'MARKSMAN', kind: 'CRUISER', x: -9, z: -14, heading: 0.2, dist: 15 },
    { id: 'KITE-2', role: 'BLOCKER', kind: 'CRUISER', x: 10, z: -18, heading: -0.2, dist: 22 },
  ];
  if (name === 'chase') {
    state.wanted = 5;
    state.chain = 3.5;
    state.speed = 118;
    state.cash = 12450;
    state.mission = { name: 'NEON RUN', timeLeft: 42, lose: 'PACKAGE LOST' };
    state.police = [
      { id: 'KITE-1', role: 'MARKSMAN', kind: 'CRUISER', x: -7, z: 26, heading: 3.1, dist: 15 },
      { id: 'KITE-2', role: 'BLOCKER', kind: 'CRUISER', x: 8, z: 34, heading: 3.1, dist: 22 },
    ];
    return { screen: SCREEN_PLAY, label: 'chase' };
  }
  if (name === 'draft') {
    state.mission = { name: 'THE MARINA JOB', timeLeft: 0, lose: '' };
    state.draft = ['NITRO RIG', 'ARMOR PLATE', 'GHOST PLATES'];
    return { screen: SCREEN_DRAFT, label: 'draft' };
  }
  if (name === 'victory') {
    state.cash = 76400;
    state.grade = 'A';
    state.missionsDone = 12;
    state.night = 0.8;
    return { screen: SCREEN_VICTORY, label: 'victory' };
  }
  state.inCar = false;
  state.wanted = 0;
  state.chain = 1.0;
  return { screen: SCREEN_TITLE, label: 'start' };
}
