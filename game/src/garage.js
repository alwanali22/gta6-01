// Garage: buy / equip the 6 named cars, upgrade ENGINE, BRAKES
// and NOS three levels each, and fence a car at the chop shop for
// 40 percent of its price. The driven car reads its upgrades here.
import { CONFIG } from "./config.js";

export function ensureGarage(state) {
  if (!state.garage) {
    state.garage = {
      owned: ["comet"], equipped: "comet",
      upgrades: { comet: { engine: 0, brakes: 0, nos: 0 } },
    };
  }
  for (const id of state.garage.owned) {
    if (!state.garage.upgrades[id]) state.garage.upgrades[id] = { engine: 0, brakes: 0, nos: 0 };
  }
  return state.garage;
}

export function buyCar(state, id) {
  const g = ensureGarage(state);
  const car = CONFIG.cars.find((c) => c.id === id);
  if (!car) return false;
  if (g.owned.includes(id)) { state.toast = `${car.name} — ALREADY OWNED`; return false; }
  if (state.cash < car.price) { state.toast = `NEED $${car.price} FOR ${car.name}`; return false; }
  state.cash -= car.price;
  g.owned.push(id);
  g.upgrades[id] = { engine: 0, brakes: 0, nos: 0 };
  state.toast = `BOUGHT ${car.name} — $${car.price}`;
  return true;
}

export function equipCar(state, id) {
  const g = ensureGarage(state);
  if (!g.owned.includes(id)) return buyCar(state, id);
  g.equipped = id;
  state.toast = `EQUIPPED ${CONFIG.cars.find((c) => c.id === id).name}`;
  return true;
}

// Chop shop: fence an owned car (not the equipped one, not the one
// Milo is driving) for 40 percent of its list price.
export function sellCar(state, id) {
  const g = ensureGarage(state);
  if (!g.owned.includes(id) || g.owned.length < 2) { state.toast = "CANNOT FENCE THIS CAR"; return false; }
  if (g.equipped === id) { state.toast = "UNEQUIP IT FIRST"; return false; }
  if (state.car && state.car.spec.id === id) { state.toast = "PARK IT FIRST"; return false; }
  const car = CONFIG.cars.find((c) => c.id === id);
  const pay = Math.floor(car.price * CONFIG.economy.fence);
  state.cash += pay;
  if (state.stats) state.stats.earned += pay;
  g.owned = g.owned.filter((v) => v !== id);
  delete g.upgrades[id];
  state.toast = `FENCED ${car.name} — +$${pay}`;
  return true;
}

export function buyUpgrade(state, carId, kind) {
  const g = ensureGarage(state);
  if (!g.owned.includes(carId)) { state.toast = "BUY THE CAR FIRST"; return false; }
  const lvl = g.upgrades[carId][kind] || 0;
  if (lvl >= 3) { state.toast = `${kind.toUpperCase()} MAXED`; return false; }
  const cost = CONFIG.upgrades[kind][lvl];
  if (state.cash < cost) { state.toast = `NEED $${cost} FOR ${kind.toUpperCase()} ${lvl + 1}`; return false; }
  state.cash -= cost;
  g.upgrades[carId][kind] = lvl + 1;
  if (state.car && state.car.spec.id === carId) state.car.upgrades = { ...g.upgrades[carId] };
  state.toast = `${kind.toUpperCase()} LV${lvl + 1} — $${cost}`;
  return true;
}
