// combat.js — 4 weapons, fire / cycle / buy. F shoots the nearest unit (or
// the boss) inside the weapon's range; a hit disables a unit for 12 s and a
// heli hit sends it retreating for 10 s. Prices live in config.js.
import { WEAPONS, WEAPON_ORDER, POLICE, RESPECT } from './config.js';
import { addHeat } from './police.js';

export function weaponPrice(state, id) {
  const rank = state.respect || 0;
  return Math.round(WEAPONS[id].price * (1 - RESPECT.discount[rank]));
}

export function cycleWeapon(state) {
  const owned = WEAPON_ORDER.filter((id) => state.owned.includes(id));
  if (owned.length < 2) return;
  const i = owned.indexOf(state.weapon);
  state.weapon = owned[(i + 1) % owned.length];
}

export function selectWeapon(state, idx) {
  const id = WEAPON_ORDER[idx];
  if (id && state.owned.includes(id)) state.weapon = id;
}

export function buyWeapon(state, id, fx) {
  const w = WEAPONS[id];
  if (!w || state.owned.includes(id)) return false;
  const price = weaponPrice(state, id);
  if (state.cash < price) {
    if (fx && fx.toast) fx.toast('NOT ENOUGH CASH — ' + w.name + ' $' + price);
    return false;
  }
  state.cash -= price;
  state.owned.push(id);
  state.ammo[id] = w.pack;
  if (fx && fx.toast) fx.toast(w.name + ' BOUGHT — $' + price);
  return true;
}

export function buyAmmo(state, id, fx) {
  const w = WEAPONS[id];
  if (!w || !state.owned.includes(id) || w.pack === 0) return false;
  const rank = state.respect || 0;
  const price = Math.round(w.packPrice * (1 - RESPECT.discount[rank]));
  if (state.cash < price) {
    if (fx && fx.toast) fx.toast('NOT ENOUGH CASH — AMMO $' + price);
    return false;
  }
  state.cash -= price;
  state.ammo[id] = (state.ammo[id] || 0) + w.pack;
  if (fx && fx.toast) fx.toast(w.name + ' AMMO +' + w.pack);
  return true;
}

export function ammoText(state) {
  const w = WEAPONS[state.weapon];
  if (!w) return '';
  const a = state.ammo[state.weapon];
  return a === Infinity || a === -1 ? '∞ RDS' : a + ' RDS';
}

export function fire(state, P, fx) {
  if (!state.runActive || state.screen !== 'play') return false;
  if (state.combatCd > 0) return false;
  const w = WEAPONS[state.weapon];
  if (!w) return false;
  const a = state.ammo[state.weapon];
  if (a !== Infinity && a !== -1 && a <= 0) {
    if (fx && fx.toast) fx.toast('NO AMMO — BUY MORE [B]');
    return false;
  }
  state.combatCd = w.cd;
  if (a !== Infinity && a !== -1) state.ammo[state.weapon] = a - 1;
  state.shotsAt = state.time;
  state.career.shotsFired = (state.career.shotsFired || 0) + 1;
  const pl = state.player;
  // Nearest live target: the boss (only at the vault, where he stands) or a unit.
  let best = null, bd = w.range, kind = 'unit';
  if (state.boss && state.boss.hp > 0 && state.missionPhase === 'vault'
    && state.target) {
    const d = Math.hypot(state.target.x - pl.x, state.target.z - pl.z);
    if (d <= w.range) { best = state.boss; bd = d; kind = 'boss'; }
  }
  if (P) {
    for (const u of P.units) {
      if (u.disabled > 0) continue;
      const d = Math.hypot(u.x - pl.x, u.z - pl.z);
      if (d < bd) { bd = d; best = u; kind = 'unit'; }
    }
  }
  if (!best && P && P.heli && P.heli.retreat <= 0) {
    const d = Math.hypot(P.heli.x - pl.x, P.heli.z - pl.z);
    if (d <= w.range + 40) {
      P.heli.retreat = 10;
      if (fx && fx.toast) fx.toast('HELI HIT — AIR UNIT RETREATING');
      return true;
    }
  }
  if (!best) return true; // shot fired, nothing in range
  if (kind === 'boss') {
    best.hp -= w.dmg;
    if (fx && fx.toast) fx.toast('VOSS HIT — HP ' + Math.max(0, best.hp));
    if (best.hp <= 0) {
      best.phase = 2;
      if (fx && fx.toast) fx.toast('VOSS DOWN — PHASE 2');
    }
    return true;
  }
  best.hp -= w.dmg;
  addHeat(state, 0.12);
  if (best.hp <= 0) {
    best.disabled = POLICE.disabledSecs;
    best.hp = POLICE.unitHp;
    state.career.takenOut = (state.career.takenOut || 0) + 1;
    if (fx && fx.toast) fx.toast(best.tag + ' DOWN');
  }
  return true;
}
