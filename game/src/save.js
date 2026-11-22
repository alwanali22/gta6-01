// Save / load: 3 slots in localStorage holding the whole run —
// cash, heat, rep, perks, grades, stats, garage, car, mission
// runner and position. Slot labels show real progress.
import { districtAt } from "./config.js";

export const saveKey = (i) => `solmar-save-${i}`;

export function actOf(missionIndex) {
  return missionIndex < 4 ? 1 : missionIndex < 8 ? 2 : 3;
}

export function percentOf(state) {
  return Math.round(((state.stats?.missionsDone || 0) / 12) * 100);
}

export function collect(state, runner) {
  return {
    v: 1, cash: state.cash, wanted: state.wanted, chain: state.chain,
    rep: state.rep, hp: state.hp, day: state.day, time: state.time,
    missionIndex: state.missionIndex, radio: state.radio, weapon: state.weapon,
    ammo: { ...state.ammo }, weaponsOwned: [...(state.weaponsOwned || ["pistol"])],
    perks: [...(state.perks || [])], grades: [...(state.grades || [])],
    feats: [...(state.feats || [])], stats: { ...(state.stats || {}) },
    garage: {
      owned: [...state.garage.owned], equipped: state.garage.equipped,
      upgrades: JSON.parse(JSON.stringify(state.garage.upgrades)),
    },
    x: state.x, z: state.z, heading: state.heading, mode: state.mode,
    car: state.car ? {
      spec: state.car.spec.id, x: state.car.x, z: state.car.z,
      heading: state.car.heading, speed: state.car.speed, hp: state.car.hp,
      nitro: state.car.nitro, upgrades: { ...state.car.upgrades },
    } : null,
    runner: {
      phase: runner.phase, checkpoint: runner.checkpoint,
      holdTime: runner.holdTime, followTime: runner.followTime,
      branch: runner.branch, timer: runner.timer, bossHp: runner.bossHp,
      target: runner.target ? { ...runner.target } : null,
    },
    soundOn: state.soundOn !== false,
    act: actOf(state.missionIndex), percent: percentOf(state),
    district: districtAt(state.x, state.z).name,
  };
}

export function saveGame(state, runner, i) {
  try {
    localStorage.setItem(saveKey(i), JSON.stringify(collect(state, runner)));
    return true;
  } catch { return false; }
}

export function readSlot(i) {
  try {
    const raw = localStorage.getItem(saveKey(i));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// Restore scalars, sets and the runner. The car mesh is re-linked
// by main.js from data.car.spec. Returns the data or null.
export function loadGame(state, runner, i) {
  const d = readSlot(i);
  if (!d || d.v !== 1) return null;
  state.cash = d.cash; state.wanted = d.wanted; state.chain = d.chain;
  state.rep = d.rep; state.hp = d.hp; state.day = d.day; state.time = d.time;
  state.missionIndex = d.missionIndex; state.radio = d.radio; state.weapon = d.weapon;
  state.ammo = { ...d.ammo };
  state.weaponsOwned = new Set(d.weaponsOwned);
  state.perks = new Set(d.perks);
  state.grades = [...d.grades];
  state.feats = new Set(d.feats);
  state.stats = { ...d.stats };
  state.garage = {
    owned: [...d.garage.owned], equipped: d.garage.equipped,
    upgrades: JSON.parse(JSON.stringify(d.garage.upgrades)),
  };
  state.x = d.x; state.z = d.z; state.heading = d.heading; state.mode = d.mode;
  state.soundOn = d.soundOn !== false;
  Object.assign(runner, d.runner);
  runner.target = d.runner.target ? { ...d.runner.target } : null;
  state.bossHp = d.runner.bossHp;
  return d;
}

export function slotLabel(i) {
  const s = readSlot(i);
  if (!s) return "EMPTY SLOT";
  return `ACT ${s.act} — ${s.percent}% — ${s.district} — $${s.cash.toLocaleString("en-US")}`;
}
