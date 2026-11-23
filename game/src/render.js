// Three.js sunset rendering only: sky, sun, fog, a chase camera and a
// 2D minimap painted on top. No game rules live here — it paints the
// state the loop hands it, and the day-to-night lerp is one number.
import * as THREE from 'three';
import { CAMERA, WORLD } from './config.js';
import { buildCity } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_BUSTED = 'busted';

export function createRenderer(canvas, minimap) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a1a3a, 90, 320);
  const sun = new THREE.DirectionalLight(0xff9a3d, 1.6);
  sun.position.set(-60, 48, -80);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x8a6aa8, 0.9));
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xff7a3d, side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  const city = buildCity(scene, WORLD.seed);
  const carMat = new THREE.MeshLambertMaterial({ color: 0xff4d3d });
  const playerCar = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 4.4), carMat);
  body.position.y = 0.55;
  playerCar.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.0), new THREE.MeshLambertMaterial({ color: 0x1a2433 }));
  cabin.position.set(0, 1.1, -0.3);
  playerCar.add(cabin);
  scene.add(playerCar);
  const walker = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 0.7), new THREE.MeshLambertMaterial({ color: 0xffc93d }));
  walker.position.y = 0.9;
  scene.add(walker);
  const policeCars = [];
  for (let i = 0; i < 2; i += 1) {
    const pc = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 4.4), new THREE.MeshLambertMaterial({ color: 0x223344 }));
    b.position.y = 0.55;
    pc.add(b);
    const light = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.8), new THREE.MeshBasicMaterial({ color: i === 0 ? 0xff2222 : 0x2244ff }));
    light.position.y = 1.1;
    pc.add(light);
    scene.add(pc);
    policeCars.push(pc);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // 0 is full sunset, 1 is full neon night.
  function setNight(t) {
    const k = Math.max(0, Math.min(1, t));
    sky.material.color.setHSL(0.07 - k * 0.04, 0.85, 0.55 - k * 0.35);
    sun.intensity = 1.6 - k * 1.0;
    sun.color.setHSL(0.08 - k * 0.05, 0.9, 0.6 - k * 0.2);
    scene.fog.color.setHSL(0.75, 0.4, 0.22 - k * 0.14);
  }

  function drawMinimap(state) {
    if (!minimap) return;
    const ctx = minimap.getContext('2d');
    const s = minimap.width / WORLD.size;
    ctx.fillStyle = '#14101f';
    ctx.fillRect(0, 0, minimap.width, minimap.height);
    ctx.fillStyle = '#3a2f4a';
    for (const b of city.buildings) {
      ctx.fillRect((b.x + 210) * s, (b.z + 210) * s, Math.max(2, b.w * s), Math.max(2, b.d * s));
    }
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc((state.player.x + 210) * s, (state.player.z + 210) * s, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff4444';
    for (const p of state.police) {
      ctx.beginPath();
      ctx.arc((p.x + 210) * s, (p.z + 210) * s, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw(state, screen) {
    setNight(state.night || 0);
    const inCar = state.inCar;
    const px = state.player.x;
    const pz = state.player.z;
    const heading = state.player.heading;
    const back = inCar ? CAMERA.chaseBack : CAMERA.onFootBack;
    const height = inCar ? CAMERA.chaseHeight : CAMERA.onFootHeight;
    camera.position.set(px - Math.sin(heading) * back, height, pz - Math.cos(heading) * back);
    camera.lookAt(px, 1.2, pz);
    playerCar.visible = inCar;
    walker.visible = !inCar;
    if (inCar) {
      playerCar.position.set(px, 0, pz);
      playerCar.rotation.y = heading;
    } else {
      walker.position.set(px, 0.9, pz);
    }
    state.police.forEach((p, i) => {
      const pc = policeCars[i];
      if (!pc) return;
      pc.visible = true;
      pc.position.set(p.x, 0, p.z);
      pc.rotation.y = p.heading || 0;
    });
    renderer.render(scene, camera);
    drawMinimap(state);
  }

  return { draw, city, setNight };
}
