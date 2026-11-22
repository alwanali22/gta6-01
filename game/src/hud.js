// HUD: every number on screen lives here now — cash, stars,
// district, rep bar, objective banner, named police units, boss
// and Milo HP, weapon + ammo, radio, toast, dialogue, the STATS
// screen and the garage rows. main.js only calls syncHud.
import { CONFIG, districtAt, respectRank } from "./config.js";
import { missionHud } from "./missions.js";
import { drawMinimap } from "./render.js";
import { pursuitText, unitLines } from "./police.js";
import { repProgress, featNames } from "./respect.js";
import { weaponOf, ammoOf } from "./combat.js";

const $ = (id) => document.getElementById(id);
const starsText = (n) => "★".repeat(n) + "☆".repeat(CONFIG.police.maxWanted - n);

export function toast(state, msg) {
  state.toast = msg;
  state.toastTimer = 4;
}

export function toastTick(state, dt) {
  if (state.toastTimer > 0) {
    state.toastTimer -= dt;
    if (state.toastTimer <= 0) state.toast = "";
  }
}

export function syncHud(state, runner, pol) {
  $("cash").textContent = "$" + state.cash.toLocaleString("en-US");
  $("speedo").textContent = Math.round(state.speed) + " mph";
  $("chain").textContent = "CHAIN x" + state.chain.toFixed(1);
  $("stars").textContent = starsText(state.wanted);
  $("districtName").textContent = districtAt(state.x, state.z).name.toUpperCase();
  const rp = repProgress(state);
  $("repName").textContent = `${rp.rank} ${Math.round(rp.pct * 100)}%`;
  $("repFill").style.width = `${Math.round(rp.pct * 100)}%`;
  $("radioName").textContent = CONFIG.radio[state.radio].name;
  const w = weaponOf(state);
  const ammo = ammoOf(state, w.id);
  $("weaponName").textContent = `${w.name}${ammo < 0 ? "" : ` (${ammo})`}`;
  const hud = missionHud(runner, state);
  $("objective").textContent = hud.objective;
  $("objTimer").textContent = hud.timer;
  $("dispatch").textContent = pursuitText(pol);
  $("units").textContent = unitLines(pol).join("  •  ") || "—";
  $("hpFill").style.width = `${Math.max(0, Math.round(state.hp ?? 100))}%`;
  const bossBox = $("bossBox");
  const isBoss = CONFIG.missions[state.missionIndex] && CONFIG.missions[state.missionIndex].id === "m10";
  bossBox.classList.toggle("hidden", !isBoss);
  if (isBoss) $("bossFill").style.width = `${Math.max(0, Math.round(state.bossHp ?? 100))}%`;
  const so = $("standoff");
  so.classList.toggle("hidden", !state.standoff);
  if (state.standoff) so.textContent = `STANDOFF — ${Math.ceil(state.standoff.timer)}s — HOLD THE RING`;
  $("toast").textContent = state.toast || "";
  const m = CONFIG.missions[state.missionIndex];
  $("dialogue").textContent = m ? `NADIA: "${m.line}"` : "";
  const nitro = state.car ? Math.round(state.car.nitro) : 100;
  $("nitroFill").textContent = "█".repeat(Math.round(nitro / 10)) + "░".repeat(10 - Math.round(nitro / 10));
  const hw = state.hotwire;
  const hwBox = $("hotwireBox");
  if (state.mode === "foot" && hw && hw.target && hw.progress > 0) {
    hwBox.classList.remove("hidden");
    const filled = Math.round((hw.progress / hw.need) * 10);
    $("hotwireFill").textContent = "▓".repeat(filled) + "░".repeat(10 - filled);
  } else if (state.mode === "foot" && hw && hw.target) {
    hwBox.classList.remove("hidden");
    $("hotwireFill").textContent = "HOLD E — " + hw.target.spec.name;
  } else {
    hwBox.classList.add("hidden");
  }
  if (state.draft) {
    state.draft.options.forEach((p, i) => {
      const el = $(`draft-${i}`);
      if (el) el.innerHTML = `<b>${p.name}</b><br>${p.text}`;
    });
  }
  drawMinimap($("minimap"), state);
}

// STATS screen: mission letter grades, completion %, career
// counters, feats and rep — all from real run state.
export function showStats(state) {
  const rows = CONFIG.missions.map((mm, i) => {
    const g = state.grades && state.grades[i];
    return `<div>${i + 1}. ${mm.name} — ${g || "—"}</div>`;
  }).join("");
  const feats = featNames(state).join(", ") || "NONE YET";
  $("statsGrid").innerHTML = `${rows}<div>COMPLETION: ${Math.round(((state.stats?.missionsDone || 0) / 12) * 100)}%</div>`
    + `<div>CARS STOLEN: ${state.stats.stolen} — COPS EVADED: ${state.stats.evaded}</div>`
    + `<div>NEAR MISSES: ${state.stats.nearMiss} — BEST CHAIN: x${state.stats.bestChain.toFixed(1)}</div>`
    + `<div>GIGS DONE: ${state.stats.gigsDone} — EARNED: $${state.stats.earned.toLocaleString("en-US")}</div>`
    + `<div>REP: ${respectRank(state.rep).name} — FEATS: ${feats}</div>`;
}

// Garage rows: cars with buy/equip/fence + upgrades, then the
// weapon shop. Buttons carry data-act; main.js handles clicks.
export function renderGarage(state) {
  const g = state.garage;
  const cars = CONFIG.cars.map((c) => {
    const owned = g.owned.includes(c.id);
    const up = g.upgrades[c.id] || { engine: 0, brakes: 0, nos: 0 };
    const ups = ["engine", "brakes", "nos"].map((k) =>
      `<button data-act="up" data-car="${c.id}" data-kind="${k}">${k.toUpperCase()} LV${up[k]} ($${CONFIG.upgrades[k][up[k]] ?? "MAX"})</button>`).join(" ");
    return `<div class="grow"><b>${c.name}</b> — $${c.price} — TOP ${c.top} mph`
      + (owned
        ? ` <button data-act="eq" data-car="${c.id}">${g.equipped === c.id ? "EQUIPPED" : "EQUIP"}</button>`
          + ` <button data-act="sell" data-car="${c.id}">FENCE 40%</button> ${ups}`
        : ` <button data-act="buy" data-car="${c.id}">BUY</button>`)
      + `</div>`;
  }).join("");
  const guns = CONFIG.weapons.map((w) => {
    const owned = state.weaponsOwned && state.weaponsOwned.has(w.id);
    return `<div class="grow"><b>${w.name}</b> — DMG ${w.dmg} — RANGE ${w.range}m`
      + (owned ? ` — OWNED (AMMO ${ammoOf(state, w.id) < 0 ? "∞" : ammoOf(state, w.id)})` : ` — $${w.price} <button data-act="gun" data-car="${w.id}">BUY</button>`)
      + `</div>`;
  }).join("");
  $("garageRows").innerHTML = cars + guns;
  $("garageCash").textContent = "$" + state.cash.toLocaleString("en-US");
}
