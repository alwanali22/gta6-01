// Combat: weapon wheel, firing, ammo, police fire on Milo, and the
// STANDOFF event. Weapons come from config.js; only the pistol is
// free and infinite, the rest are bought in the garage.
import { CONFIG } from "./config.js";

const START_AMMO = { shotgun: 12, smg: 60, rifle: 20 };
const RANK_NEED = { smg: 400, rifle: 1200 };

export function weaponOf(state) {
  return CONFIG.weapons[state.weapon] || CONFIG.weapons[0];
}

export function ammoOf(state, id) {
  if (id === "pistol") return -1;
  return state.ammo ? state.ammo[id] || 0 : 0;
}

// Buy a weapon. SMG needs STREET rep, RIFLE needs NOTORIOUS.
export function buyWeapon(state, id) {
  const w = CONFIG.weapons.find((v) => v.id === id);
  if (!w) return false;
  if (state.weaponsOwned && state.weaponsOwned.has(id)) { state.toast = `${w.name} — ALREADY OWNED`; return false; }
  if ((RANK_NEED[id] || 0) > (state.rep || 0)) {
    state.toast = `${w.name} NEEDS ${RANK_NEED[id]} REP`;
    return false;
  }
  if (state.cash < w.price) { state.toast = `NEED $${w.price} FOR ${w.name}`; return false; }
  state.cash -= w.price;
  if (!state.weaponsOwned) state.weaponsOwned = new Set(["pistol"]);
  state.weaponsOwned.add(id);
  if (!state.ammo) state.ammo = {};
  state.ammo[id] = START_AMMO[id] || 0;
  state.toast = `BOUGHT ${w.name} — $${w.price}`;
  return true;
}

// Q cycles to the next owned weapon.
export function cycleWeapon(state) {
  const owned = CONFIG.weapons.filter((w) => state.weaponsOwned && state.weaponsOwned.has(w.id));
  if (owned.length < 2) return false;
  const cur = weaponOf(state);
  const next = owned[(owned.indexOf(cur) + 1) % owned.length];
  state.weapon = CONFIG.weapons.indexOf(next);
  state.toast = `WEAPON — ${next.name}`;
  return true;
}

// Fire (F held). Hits the nearest live police unit inside the
// weapon's range. A downed unit pays a bounty and raises heat.
export function fireTick(state, dt, pol, firing) {
  state.fireCd = Math.max(0, (state.fireCd || 0) - dt);
  if (!firing || state.fireCd > 0) return [];
  const w = weaponOf(state);
  const evs = [];
  state.fireCd = w.cd;
  if (w.id !== "pistol") {
    if (ammoOf(state, w.id) <= 0) {
      state.toast = `${w.name} EMPTY — BACK TO PISTOL`;
      state.weapon = 0;
      return evs;
    }
    state.ammo[w.id] -= 1;
  }
  const targets = pol ? pol.units.filter((u) => u.active && !u.down).concat(pol.air.active && !pol.air.down ? [pol.air] : []) : [];
  let best = null;
  let bestD = w.range;
  for (const u of targets) {
    const d = Math.hypot(u.x - state.x, u.z - state.z);
    if (d < bestD) { bestD = d; best = u; }
  }
  if (!best) return evs;
  const dmg = Math.round(w.dmg * (state.perks && state.perks.has("sharp") ? 1.25 : 1));
  best.hp -= dmg;
  state.toast = `${w.name} HIT ${best.name} — ${Math.max(0, Math.round(best.hp))} HP`;
  if (best.hp <= 0) {
    best.down = true;
    best.active = false;
    best.mesh.visible = false;
    state.cash += 150;
    if (state.stats) state.stats.earned += 150;
    state.rep = (state.rep || 0) + 40;
    state.wanted = Math.min(5, state.wanted + 1);
    evs.push({ kind: "unitDown", name: best.name });
    state.toast = `UNIT DOWN — ${best.name} +$150`;
  }
  return evs;
}

// Police shoot back at Milo on foot when heat is 2+ and a unit is
// close. BULLETPROOF halves the damage. Returns "wasted" at 0 HP.
export function policeFire(state, dt, pol) {
  if (state.mode !== "foot" || state.wanted < 2) return null;
  // Units holding the STANDOFF ring aim but do not shoot.
  const near = pol.units.filter((u) => u.active && u.dist < 25 && u.mode !== "hold").length;
  if (!near) return null;
  const rate = 4 * near * (state.perks && state.perks.has("proof") ? 0.5 : 1);
  state.hp = Math.max(0, (state.hp ?? 100) - rate * dt);
  if (state.hp <= 0) return "wasted";
  return null;
}

// STANDOFF lite: on foot at wanted 4+, three units ring Milo at
// 14 m for 10 s. Survive and heat drops to 2 with a payout.
export function startStandoff(state, pol) {
  if (state.standoff || state.mode !== "foot" || state.wanted < 4) return false;
  if ((pol.standoffCd || 0) > 0) return false;
  const ring = pol.units.filter((u) => u.active).slice(0, 3);
  if (ring.length < 2) return false;
  ring.forEach((u, i) => {
    const a = (i / ring.length) * Math.PI * 2;
    u.x = state.x + Math.sin(a) * 14;
    u.z = state.z + Math.cos(a) * 14;
    u.mode = "hold";
    u.mesh.position.set(u.x, 0, u.z);
  });
  state.standoff = { timer: 10 };
  state.toast = "STANDOFF — HOLD THE RING";
  return true;
}

export function updateStandoff(state, dt, pol) {
  if (!state.standoff) return null;
  state.standoff.timer -= dt;
  for (const u of pol.units) {
    if (u.active && u.mode === "hold") u.dist = Math.hypot(state.x - u.x, state.z - u.z);
  }
  if (state.standoff.timer <= 0) {
    state.standoff = null;
    for (const u of pol.units) if (u.mode === "hold") u.mode = "chase";
    state.wanted = 2;
    state.rep = (state.rep || 0) + 150;
    state.cash += 500;
    if (state.stats) state.stats.earned += 500;
    pol.standoffCd = 30;
    state.toast = "STANDOFF SURVIVED — +$500, WANTED 2";
    return "survived";
  }
  return null;
}
