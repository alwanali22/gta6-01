// Rendering: three.js sunset scene, day-to-night light, chase camera
// and the 2D minimap. No asset files — sky, sun and lamps are code.
import * as THREE from "three";
import { CONFIG, districtAt } from "./config.js";

const SUNSET = { sky: 0x4a2540, fog: 0x6b4a3e, sun: 0xffb27a, sunI: 1.7, hemi: 0x7a5a8a };
const NIGHT = { sky: 0x0a0e22, fog: 0x0d1426, sun: 0x8aa8ff, sunI: 0.5, hemi: 0x2a3550 };

function lerpColor(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SUNSET.sky);
  scene.fog = new THREE.Fog(SUNSET.fog, 120, 620);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);
  const sun = new THREE.DirectionalLight(SUNSET.sun, SUNSET.sunI);
  sun.position.set(-140, 70, -90);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffc890, SUNSET.hemi, 1.0);
  scene.add(hemi);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false })
  );
  disc.position.set(-300, 42, -160);
  disc.lookAt(0, 42, -160);
  scene.add(disc);

  function setDay(t) {
    scene.background.copy(lerpColor(SUNSET.sky, NIGHT.sky, t));
    scene.fog.color.copy(lerpColor(SUNSET.fog, NIGHT.fog, t));
    sun.color.copy(lerpColor(SUNSET.sun, NIGHT.sun, t));
    sun.intensity = SUNSET.sunI + (NIGHT.sunI - SUNSET.sunI) * t;
    hemi.color.copy(lerpColor(0xffc890, 0x4a5a8a, t));
    hemi.groundColor.copy(lerpColor(SUNSET.hemi, NIGHT.hemi, t));
    disc.visible = t < 0.5;
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // Chase camera: behind the focus point, looking slightly ahead.
  // Per-district accent: the fog leans toward the district's sky
  // colour, so each quarter of Solmar reads differently.
  function frame(focus) {
    const d = districtAt(focus.x, focus.z);
    scene.fog.color.lerp(new THREE.Color(d.sky), 0.06);
    const dist = focus.mode === "chase" ? CONFIG.camera.chaseDist : CONFIG.camera.footDist;
    const height = focus.mode === "chase" ? CONFIG.camera.chaseHeight : CONFIG.camera.footHeight;
    const fx = Math.sin(focus.heading);
    const fz = Math.cos(focus.heading);
    camera.position.set(
      focus.x - fx * dist,
      height,
      focus.z - fz * dist
    );
    camera.lookAt(focus.x + fx * 8, 1.5, focus.z + fz * 8);
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, setDay, resize, frame };
}

// Minimap: districts, roads, sea, player, police, objective marker.
export function drawMinimap(map, state) {
  const ctx = map.getContext("2d");
  const W = map.width;
  const H = map.height;
  const scale = (W - 8) / 640;
  const toX = (x) => 4 + (x + 320) * scale;
  const toY = (z) => 4 + (z + 320) * scale;
  ctx.fillStyle = "#101018";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#14586e";
  ctx.fillRect(toX(-320), toY(-320), 16 * scale, 640 * scale);
  for (const d of CONFIG.districts) {
    ctx.fillStyle = "#1c1c26";
    ctx.fillRect(toX(d.x0), toY(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
    ctx.strokeStyle = d.accent;
    ctx.globalAlpha = 0.7;
    ctx.strokeRect(toX(d.x0), toY(d.z0), (d.x1 - d.x0) * scale, (d.z1 - d.z0) * scale);
    ctx.globalAlpha = 1;
    ctx.fillStyle = d.accent;
    ctx.font = "8px sans-serif";
    ctx.fillText(d.name.toUpperCase(), toX(d.x0) + 4, toY(d.z0) + 12);
  }
  ctx.strokeStyle = "#3a3a48";
  for (let p = -320; p <= 320; p += 80) {
    ctx.beginPath(); ctx.moveTo(toX(p), 4); ctx.lineTo(toX(p), H - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, toY(p)); ctx.lineTo(W - 4, toY(p)); ctx.stroke();
  }
  const dot = (x, z, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(toX(x), toY(z), r, 0, Math.PI * 2);
    ctx.fill();
  };
  if (state.objective) dot(state.objective.x, state.objective.z, "#ffd23a", 4);
  for (const u of state.police || []) dot(u.x, u.z, u.heli ? "#7ab8ff" : "#ff4a3a", 3);
  dot(state.x, state.z, "#ffffff", 4);
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(toX(state.x), toY(state.z), 6, 0, Math.PI * 2);
  ctx.stroke();
}
