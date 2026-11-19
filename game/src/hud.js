// hud.js — owns syncHud (stars, HEAT flags, named dispatch, cash/rep, chain,
// respect + next rank, home turf, district, crew line, weapon + ammo, radio,
// speed) and the screen renderers: title save rows, garage shop, stats
// screen with per-mission grades + career counters. main.js wires the clicks.
import { CARS, MISSIONS, UPGRADES, ECONOMY, WEAPONS, WEAPON_ORDER, CREW, RESPECT, GARAGE_EXTRAS, districtAt } from './config.js';
import { carSpec, nearSafehouse } from './vehicles.js';
import { buyWeapon, buyAmmo, ammoText } from './combat.js';
import { changeOutfit } from './police.js';
import { listSlots, slotLabel, saveSlot, loadSlot, completionOf } from './save.js';
import { rankName, nextRank, homeTurf } from './respect.js';

const $ = (sel) => document.querySelector(sel);
const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };

export function syncHud(state, ctx) {
  set('#hud-cash', '$' + state.cash.toLocaleString('en-US'));
  set('#hud-rep', 'REP ' + state.rep);
  set('#hud-chain', 'CHAIN x' + state.chain.toFixed(1));
  set('#hud-stars', '★'.repeat(Math.round(state.heat)) + '☆'.repeat(5 - Math.round(state.heat)));
  const f = state.heatFlags || {};
  set('#hud-heat-flags', 'FACE ' + (f.face ? '●' : '○') + '  FIT ' + (f.fit ? '●' : '○')
    + '  CAR ' + (f.car ? '●' : '○') + '  CREW ' + (f.crew ? '●' : '○'));
  // Named dispatch: callsign + role + live distance, not just stars.
  const P = state.police;
  let dispatch = '';
  if (P && P.units.length) {
    const shown = P.units.filter((u) => u.disabled <= 0).slice(0, 2).map((u) => {
      const d = Math.round(Math.hypot(u.x - state.player.x, u.z - state.player.z));
      return u.tag + ' ' + u.role + ' ' + d + 'm';
    });
    dispatch = 'UNITS IN PURSUIT: ' + P.units.length + ' — ' + shown.join(' · ');
  }
  if (P && P.heli) dispatch += (dispatch ? '  |  ' : '') + 'AIR UNIT DEPLOYED';
  if (state.pursuit === 'ESCAPED') dispatch = 'ESCAPED — LAY LOW';
  set('#hud-pursuit', dispatch);
  const nx = nextRank(state);
  set('#hud-respect', 'RANK ' + rankName(state)
    + (nx ? ' — ' + nx.need + ' REP TO ' + nx.name : ' — MAX RANK'));
  const turf = homeTurf(state);
  set('#hud-turf', turf ? 'HOME TURF: ' + turf.name + ' Lv' + turf.level : 'HOME TURF: —');
  set('#hud-district', districtAt(state.player.x, state.player.z).name);
  set('#hud-crew', CREW.name + ': ' + (CREW.lines[state.mission] || ''));
  set('#hud-speed', Math.round(Math.abs(state.player.speed) * 3.6) + ' km/h');
  const w = WEAPONS[state.weapon];
  set('#weapon-value', (w ? w.name : 'PISTOL') + ' · ' + ammoText(state) + ' [Q] [F]');
  set('#radio-value', ctx && ctx.audio ? 'RADIO — ' + ctx.audioName() : 'RADIO OFF');
}

export function renderTitle(state) {
  const box = $('#save-slots');
  if (!box) return;
  const slots = listSlots();
  box.innerHTML = slots.map((s, i) => {
    if (!s) return '<div class="slot-row"><span>SLOT ' + (i + 1) + ' — EMPTY</span></div>';
    const L = slotLabel(s);
    const mm = String(Math.floor(L.time / 60)).padStart(2, '0');
    const ss = String(L.time % 60).padStart(2, '0');
    return '<div class="slot-row"><span>SLOT ' + (i + 1) + ' — ' + L.act + ' · ' + L.pct
      + '% · ' + L.district + ' · ' + L.missions + '/10 missions · $'
      + L.cash.toLocaleString('en-US') + ' · ' + mm + ':' + ss + '</span>'
      + '<button class="btn ghost" data-load-slot="' + i + '">LOAD</button></div>';
  }).join('');
}

function discount(state) {
  return 1 - RESPECT.discount[state.respect || 0];
}

export function renderGarage(state, ctx) {
  const box = $('#garage-cars');
  if (!box) return;
  const d = discount(state);
  const price = (n) => Math.round(n * d);
  let html = '';
  for (const car of state.cars) {
    if (car.owner !== 'player') continue;
    const up = state.garage[car.id] || {};
    const spec = carSpec(state, car);
    html += '<div class="car-row"><span><b>' + car.name + '</b> · HP ' + Math.round(car.hp)
      + ' · TOP ' + Math.round(spec.top) + '</span><span>'
      + '<button class="btn ghost" data-upgrade="engine:' + car.id + '">ENGINE Lv' + (up.engine || 0)
      + ' $' + price(UPGRADES.engine[Math.min(up.engine || 0, 2)]) + '</button> '
      + '<button class="btn ghost" data-upgrade="brakes:' + car.id + '">BRAKES Lv' + (up.brakes || 0)
      + ' $' + price(UPGRADES.brakes[Math.min(up.brakes || 0, 2)]) + '</button> '
      + '<button class="btn ghost" data-upgrade="nos:' + car.id + '">NOS Lv' + (up.nos || 0)
      + ' $' + price(UPGRADES.nos[Math.min(up.nos || 0, 2)]) + '</button> '
      + '<button class="btn ghost" data-extra="neon:' + car.id + '">NEON $'
      + price(GARAGE_EXTRAS.neon) + (up.neon ? ' ✓' : '') + '</button> '
      + '<button class="btn ghost" data-extra="spoiler:' + car.id + '">SPOILER $'
      + price(GARAGE_EXTRAS.spoiler) + (up.spoiler ? ' ✓' : '') + '</button> '
      + '<button class="btn ghost" data-sell="' + car.id + '">SELL $'
      + Math.round(car.price * ECONOMY.fenceRate) + '</button></span></div>';
  }
  html += '<div class="car-row"><span><b>WEAPONS</b></span><span>'
    + WEAPON_ORDER.map((id) => {
      const w = WEAPONS[id];
      const owned = state.owned.includes(id);
      const btn = owned
        ? (w.pack ? '<button class="btn ghost" data-ammo="' + id + '">AMMO +' + w.pack + ' $' + price(w.packPrice) + '</button>' : '')
        : '<button class="btn ghost" data-weapon="' + id + '">BUY ' + w.name + ' $' + price(w.price) + '</button>';
      return owned ? w.name + ' ✓ ' + btn : btn;
    }).join(' ') + '</span></div>';
  const atHome = nearSafehouse(state, state.player.x, state.player.z);
  html += '<div class="car-row"><span><b>CHANGE OUTFIT</b> — clears FACE / FIT / CREW flags'
    + (atHome ? '' : ' (only at the safehouse)') + '</span>'
    + '<button class="btn ghost" data-outfit="1"' + (atHome ? '' : ' disabled') + '>CHANGE $0</button></div>';
  box.innerHTML = html;
}

export function renderStats(state) {
  const box = $('#stats-body');
  if (!box) return;
  const grades = MISSIONS.map((m, i) => {
    const g = (state.missionGrades || []).find((x) => x.mission === i);
    return '<div><b>' + (g ? g.grade : '—') + '</b><span>M' + (i + 1) + ' ' + m.name + '</span></div>';
  }).join('');
  const c = state.career || {};
  const owned = state.cars.filter((x) => x.owner === 'player').length;
  box.innerHTML = '<p>COMPLETE ' + completionOf(state) + '% · RANK ' + rankName(state)
    + ' · ' + owned + ' CARS OWNED</p>'
    + '<div class="stat-grid">' + grades + '</div>'
    + '<div class="stat-grid"><div><b>' + (c.carsStolen || 0) + '</b><span>CARS STOLEN</span></div>'
    + '<div><b>' + (c.copsEvaded || 0) + '</b><span>COPS EVADED</span></div>'
    + '<div><b>' + (c.takenOut || 0) + '</b><span>TAKEN OUT</span></div>'
    + '<div><b>' + (c.shotsFired || 0) + '</b><span>SHOTS FIRED</span></div>'
    + '<div><b>' + state.nearMisses + '</b><span>NEAR MISSES</span></div>'
    + '<div><b>x' + state.bestChain.toFixed(1) + '</b><span>BEST CHAIN</span></div>'
    + '<div><b>$' + state.earned.toLocaleString('en-US') + '</b><span>EARNED</span></div>'
    + '<div><b>' + state.perks.length + '</b><span>PERKS</span></div></div>';
}

// One delegated click handler for garage + title-slot buttons.
export function garageClick(state, ctx, ev) {
  const t = ev.target.closest('[data-upgrade],[data-extra],[data-sell],[data-weapon],[data-ammo],[data-outfit],[data-load-slot],[data-save-slot]');
  if (!t) return;
  const toast = (m) => { if (ctx.toast) ctx.toast(m); };
  if (t.dataset.upgrade) {
    const [kind, carId] = t.dataset.upgrade.split(':');
    const up = state.garage[carId] || (state.garage[carId] = {});
    const lvl = up[kind] || 0;
    if (lvl >= 3) { toast('MAX LEVEL'); return; }
    const cost = Math.round(UPGRADES[kind][lvl] * discount(state));
    if (state.cash < cost) { toast('NOT ENOUGH CASH'); return; }
    state.cash -= cost;
    up[kind] = lvl + 1;
    toast(kind.toUpperCase() + ' Lv' + (lvl + 1) + ' — $' + cost);
    renderGarage(state, ctx);
  } else if (t.dataset.extra) {
    const [kind, carId] = t.dataset.extra.split(':');
    const up = state.garage[carId] || (state.garage[carId] = {});
    if (up[kind]) { toast('ALREADY FITTED'); return; }
    const cost = Math.round(GARAGE_EXTRAS[kind] * discount(state));
    if (state.cash < cost) { toast('NOT ENOUGH CASH'); return; }
    state.cash -= cost;
    up[kind] = true;
    toast(kind.toUpperCase() + ' FITTED — $' + cost);
    renderGarage(state, ctx);
  } else if (t.dataset.sell) {
    const car = state.cars.find((c) => c.id === t.dataset.sell);
    if (!car || car.owner !== 'player') return;
    if (car.id === state.player.vehicleId) { toast('CANNOT SELL THE CAR YOU ARE IN'); return; }
    const gain = Math.round(car.price * ECONOMY.fenceRate);
    car.owner = 'street'; car.visible = false;
    state.cash += gain; state.earned += gain;
    toast(car.name + ' SOLD +$' + gain);
    renderGarage(state, ctx);
  } else if (t.dataset.weapon) {
    if (buyWeapon(state, t.dataset.weapon, { toast })) renderGarage(state, ctx);
  } else if (t.dataset.ammo) {
    if (buyAmmo(state, t.dataset.ammo, { toast })) renderGarage(state, ctx);
  } else if (t.dataset.outfit) {
    changeOutfit(state);
    toast('OUTFIT CHANGED — FACE / FIT / CREW CLEARED');
    renderGarage(state, ctx);
  } else if (t.dataset.loadSlot !== undefined) {
    const i = Number(t.dataset.loadSlot);
    if (ctx.loadGame(i)) toast('LOADED SLOT ' + (i + 1));
    else toast('SLOT EMPTY');
  } else if (t.dataset.saveSlot !== undefined) {
    const i = Number(t.dataset.saveSlot);
    if (saveSlot(state, i)) toast('SAVED TO SLOT ' + (i + 1));
    else toast('SAVE FAILED');
    renderTitle(state);
  }
}
