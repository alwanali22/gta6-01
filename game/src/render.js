// render.js — three.js r160 view of Solmar at sunset. update() keeps no state
// of its own except the pedestrians, whose positions are a pure function of
// time (so a screenshot is reproducible from the clock alone).
import * as THREE from 'three';
import { WORLD, DISTRICTS, CAMERA } from './config.js';
import { hash2 } from './random.js';
import { pedOffset } from './pedestrians.js';

const SUNSET = {
  sky: 0x2b1a4e, fog: 0x3a2350, sun: 0xff8c3a, ambient: 0x8a5a9a,
  ground: 0x1e1a2e, road: 0x241f33, dash: 0xf5c96b, sea: 0x0e6a6a,
};

const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const lerpHex = (a, b, t) => _c1.setHex(a).lerp(_c2.setHex(b), t).getHex();

export function createWorld(canvas, city) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(canvas.clientWidth || 1280, canvas.clientHeight || 800, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SUNSET.sky);
  scene.fog = new THREE.Fog(SUNSET.fog, 260, 900);

  const camera = new THREE.PerspectiveCamera(62, 1280 / 800, 0.1, 2000);
  camera.position.set(0, CAMERA.orbitHeight, 120);

  // Sunset: low orange sun from the west (the sea side), purple fill.
  const sun = new THREE.DirectionalLight(SUNSET.sun, 2.2);
  sun.position.set(-300, 90, 60);
  scene.add(sun);
  const amb = new THREE.AmbientLight(SUNSET.ambient, 1.1);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(0xff9a5a, 0x2a1a3a, 0.7);
  scene.add(hemi);

  // Sun disc on the horizon over the sea.
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(34, 40),
    new THREE.MeshBasicMaterial({ color: 0xffb347, fog: false }),
  );
  disc.position.set(-460, 42, 0);
  disc.lookAt(0, 42, 0);
  scene.add(disc);

  // Ground, tinted per district with a canvas texture.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2, WORLD.half * 2),
    new THREE.MeshLambertMaterial({ map: districtTexture() }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // The sea, west of the city edge.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(260, WORLD.half * 2 + 260),
    new THREE.MeshLambertMaterial({ color: SUNSET.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(-WORLD.half - 130, -0.4, 0);
  scene.add(sea);

  // Roads: dark strips + centre dashes, one plane per grid line.
  const roadMat = new THREE.MeshLambertMaterial({ color: SUNSET.road });
  const dashMat = new THREE.MeshBasicMaterial({ color: SUNSET.dash });
  for (const v of city.roads) {
    for (const [w, d, x, z] of [
      [WORLD.half * 2, WORLD.roadHalf * 2, 0, v],
      [WORLD.roadHalf * 2, WORLD.half * 2, v, 0],
    ]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      strip.rotation.x = -Math.PI / 2;
      strip.position.set(x, 0.05, z);
      scene.add(strip);
    }
    for (let t = -WORLD.half + 20; t < WORLD.half; t += 40) {
      for (const [x, z, rot] of [[t, v, 0], [v, t, Math.PI / 2]]) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.2), dashMat);
        dash.rotation.x = -Math.PI / 2;
        dash.rotation.z = rot;
        dash.position.set(x, 0.08, z);
        scene.add(dash);
      }
    }
  }

  // Buildings: one InstancedMesh + a second for lit windows (emissive dots).
  const box = new THREE.BoxGeometry(1, 1, 1);
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const inst = new THREE.InstancedMesh(box, wallMat, city.buildings.length);
  const winGeo = new THREE.PlaneGeometry(1, 1);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const wins = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const col = new THREE.Color();
  city.buildings.forEach((b, i) => {
    p.set(b.x, b.h / 2, b.z); s.set(b.w, b.h, b.d);
    m.compose(p, q, s);
    inst.setMatrixAt(i, m);
    inst.setColorAt(i, col.setHex(b.color));
    if (b.lit) {
      const rows = Math.max(1, Math.floor(b.h / 9));
      const cols = Math.max(1, Math.floor(Math.min(b.w, b.d) / 6));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (hash2(i * 31 + r, c, 5) < 0.45) {
            wins.push({
              x: b.x - b.w / 2 + 2 + c * 6, y: 5 + r * 9, z: b.z + b.d / 2 + 0.1,
              d: b.district,
            });
          }
        }
      }
    }
  });
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  scene.add(inst);
  const winMesh = new THREE.InstancedMesh(winGeo, winMat, Math.max(1, wins.length));
  wins.forEach((w, i) => {
    p.set(w.x, w.y, w.z); s.set(2.2, 3, 1);
    m.compose(p, q, s);
    winMesh.setMatrixAt(i, m);
    // District accent: each district's windows lean toward its tint.
    const d = DISTRICTS.find((dd) => dd.id === w.d) || DISTRICTS[0];
    winMesh.setColorAt(i, col.setHex(0xffd27a).lerp(new THREE.Color(d.tint), 0.35));
  });
  winMesh.instanceMatrix.needsUpdate = true;
  if (winMesh.instanceColor) winMesh.instanceColor.needsUpdate = true;
  winMesh.count = wins.length;
  scene.add(winMesh);

  // Palms: trunk + frond cone.
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 9, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  const frondGeo = new THREE.ConeGeometry(4.5, 5, 7);
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x1e7a3a });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, city.palms.length);
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, city.palms.length);
  city.palms.forEach((pl, i) => {
    p.set(pl.x, pl.h / 2, pl.z); s.set(1, pl.h / 9, 1);
    m.compose(p, q, s); trunks.setMatrixAt(i, m);
    p.set(pl.x, pl.h + 1.5, pl.z); s.set(1, 1, 1);
    m.compose(p, q, s); fronds.setMatrixAt(i, m);
  });
  trunks.instanceMatrix.needsUpdate = true;
  fronds.instanceMatrix.needsUpdate = true;
  scene.add(trunks); scene.add(fronds);

  // Street lamps: pole + warm glow sphere.
  const poleGeo = new THREE.CylinderGeometry(0.25, 0.25, 7, 5);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a44 });
  const glowGeo = new THREE.SphereGeometry(0.9, 8, 6);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffc46b });
  const lampSpots = [];
  for (let v = -WORLD.half + WORLD.roadStep; v < WORLD.half; v += WORLD.roadStep) {
    for (let t = -WORLD.half + 60; t < WORLD.half; t += 120) lampSpots.push({ x: v + 8, z: t });
  }
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampSpots.length);
  const glows = new THREE.InstancedMesh(glowGeo, glowMat, lampSpots.length);
  lampSpots.forEach((lp, i) => {
    p.set(lp.x, 3.5, lp.z); s.set(1, 1, 1);
    m.compose(p, q, s); poles.setMatrixAt(i, m);
    p.set(lp.x, 7.2, lp.z);
    m.compose(p, q, s); glows.setMatrixAt(i, m);
    // District accent: each lamp's glow leans toward its district tint.
    const d = DISTRICTS.find((dd) =>
      lp.x >= dd.x0 && lp.x < dd.x1 && lp.z >= dd.z0 && lp.z < dd.z1) || DISTRICTS[0];
    glows.setColorAt(i, col.setHex(0xffc46b).lerp(new THREE.Color(d.tint), 0.3));
  });
  poles.instanceMatrix.needsUpdate = true;
  glows.instanceMatrix.needsUpdate = true;
  if (glows.instanceColor) glows.instanceColor.needsUpdate = true;
  scene.add(poles); scene.add(glows);

  // District pylons (chunk D): one tall neon marker per district, so the
  // four quarters read differently from the street and from above.
  for (const d of DISTRICTS) {
    const px = (d.x0 + d.x1) / 2, pz = (d.z0 + d.z1) / 2;
    const pylon = new THREE.Mesh(
      new THREE.BoxGeometry(3, 30, 3),
      new THREE.MeshBasicMaterial({ color: d.tint, fog: false }),
    );
    pylon.position.set(px, 15, pz);
    scene.add(pylon);
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(5, 2, 5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }),
    );
    cap.position.set(px, 31, pz);
    scene.add(cap);
  }

  // Safehouse room (chunk D): a small interior at the safehouse door
  // (-160,-40) — floor, walls with a south door gap, bed, table, neon
  // sign, warm light. Hidden until the player steps inside.
  const room = new THREE.Group();
  const roomMat = new THREE.MeshLambertMaterial({ color: 0x6a4a3a });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshLambertMaterial({ color: 0x5a4030 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-160, 0.1, -40);
  room.add(floor);
  const wall = (w, d, x, z) => {
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(w, 4.5, d), roomMat);
    m2.position.set(x, 2.25, z);
    room.add(m2);
  };
  wall(16, 0.5, -160, -46);       // north wall
  wall(0.5, 12, -168, -40);       // west wall
  wall(0.5, 12, -152, -40);       // east wall
  wall(6, 0.5, -165, -34);        // south wall, west of the door
  wall(6, 0.5, -155, -34);        // south wall, east of the door
  const bed = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 6), new THREE.MeshLambertMaterial({ color: 0x2a4a7a }));
  bed.position.set(-165.5, 0.5, -43);
  room.add(bed);
  const table = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 2), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
  table.position.set(-155, 0.5, -44);
  room.add(table);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 1.6),
    new THREE.MeshBasicMaterial({ color: 0x2a3f5e, fog: false }),
  );
  sign.position.set(-160, 3.4, -45.7);
  room.add(sign);
  const lamp = new THREE.PointLight(0xffc46b, 60, 22);
  lamp.position.set(-160, 4, -40);
  room.add(lamp);
  room.visible = false;
  scene.add(room);

  // Landmarks: pier deck + two dock cranes.
  for (const lm of city.landmarks) {
    if (lm.kind === 'pier') {
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(lm.w, 2, lm.d),
        new THREE.MeshLambertMaterial({ color: 0x7a5a3a }),
      );
      deck.position.set(lm.x, 0.6, lm.z);
      scene.add(deck);
    } else {
      const mast = new THREE.Mesh(
        new THREE.BoxGeometry(3, lm.h, 3),
        new THREE.MeshLambertMaterial({ color: 0xd4a02a }),
      );
      mast.position.set(lm.x, lm.h / 2, lm.z);
      scene.add(mast);
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(26, 2, 2),
        new THREE.MeshLambertMaterial({ color: 0xd4a02a }),
      );
      arm.position.set(lm.x + 8, lm.h - 3, lm.z);
      scene.add(arm);
    }
  }

  // Pedestrians: 48 walkers, positions a pure function of time.
  const pedGeo = new THREE.CapsuleGeometry(0.7, 1.6, 3, 6);
  const pedMat = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });
  const peds = new THREE.InstancedMesh(pedGeo, pedMat, 48);
  peds.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(peds);

  // Cars: pooled meshes, one per car slot (6). Player figure: a standing
  // capsule, hidden while driving (chunk B owns that switch). Chunk C adds
  // visible customization: neon underglow + spoiler, driven by garage.
  const carGeo = new THREE.BoxGeometry(4.4, 1.3, 2.1);
  const carTop = new THREE.BoxGeometry(2.4, 0.9, 1.9);
  const neonGeo = new THREE.PlaneGeometry(4.8, 2.6);
  const spoilGeo = new THREE.BoxGeometry(0.25, 0.5, 2.3);
  const carMeshes = [];
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(carGeo, new THREE.MeshLambertMaterial({ color: 0x888888 }));
    body.position.y = 0.8;
    const top = new THREE.Mesh(carTop, new THREE.MeshLambertMaterial({ color: 0x222222 }));
    top.position.set(-0.3, 1.8, 0);
    const neon = new THREE.Mesh(neonGeo, new THREE.MeshBasicMaterial({
      color: 0x4ae8ff, transparent: true, opacity: 0.55,
    }));
    neon.rotation.x = -Math.PI / 2;
    neon.position.y = 0.15;
    neon.visible = false;
    const spoiler = new THREE.Mesh(spoilGeo, new THREE.MeshLambertMaterial({ color: 0x111111 }));
    spoiler.position.set(-2.1, 1.9, 0);
    spoiler.visible = false;
    g.add(body); g.add(top); g.add(neon); g.add(spoiler);
    g.visible = false;
    g.userData.neon = neon;
    g.userData.spoiler = spoiler;
    scene.add(g);
    carMeshes.push(g);
  }
  const figure = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.7, 1.7, 3, 8),
    new THREE.MeshLambertMaterial({ color: 0xffd24a }),
  );
  figure.position.y = 1.6;
  scene.add(figure);

  // Traffic: pooled instanced boxes, one per ambient car + race rival.
  const trafficGeo = new THREE.BoxGeometry(4.2, 1.2, 2);
  const trafficMesh = new THREE.InstancedMesh(
    trafficGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 16);
  trafficMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(trafficMesh);

  // Police helicopter: built now, hidden until chunk C dispatches it.
  const heli = new THREE.Group();
  const heliBody = new THREE.Mesh(
    new THREE.BoxGeometry(5, 2, 2.4),
    new THREE.MeshLambertMaterial({ color: 0x1a2a4a }),
  );
  const heliRotor = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.2, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x333333 }),
  );
  heliRotor.position.y = 1.4;
  const heliLight = new THREE.Mesh(
    new THREE.ConeGeometry(6, 18, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
  );
  heliLight.position.y = -10;
  heli.add(heliBody); heli.add(heliRotor); heli.add(heliLight);
  heli.visible = false;
  heli.userData.rotor = heliRotor;
  scene.add(heli);
  // Heli searchlight pool on the ground (chunk C): a bright disc that
  // follows the helicopter, so "heli overhead" reads even from above.
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(9, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.28 }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.12;
  pool.visible = false;
  scene.add(pool);
  // Police cruisers + roadblocks: pooled boxes (chunk C).
  const policeGeo = new THREE.BoxGeometry(4.4, 1.3, 2.1);
  const policeMesh = new THREE.InstancedMesh(
    policeGeo, new THREE.MeshLambertMaterial({ color: 0x2244cc }), 6);
  policeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(policeMesh);
  const blockGeo = new THREE.BoxGeometry(5, 1.6, 1);
  const blockMesh = new THREE.InstancedMesh(
    blockGeo, new THREE.MeshLambertMaterial({ color: 0x888888 }), 2);
  blockMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(blockMesh);

  let mode = 'orbit';
  let shotCam = null;

  function districtTexture() {
    const c = document.createElement('canvas');
    c.width = 4; c.height = 4;
    const ctx = c.getContext('2d');
    for (const d of DISTRICTS) {
      const x = Math.round(((d.x0 + WORLD.half) / (WORLD.half * 2)) * 4);
      const z = Math.round(((d.z0 + WORLD.half) / (WORLD.half * 2)) * 4);
      const w = Math.max(1, Math.round(((d.x1 - d.x0) / (WORLD.half * 2)) * 4));
      const h = Math.max(1, Math.round(((d.z1 - d.z0) / (WORLD.half * 2)) * 4));
      ctx.fillStyle = '#' + d.tint.toString(16).padStart(6, '0');
      ctx.fillRect(x, z, w, h);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  return {
    renderer, scene, camera,
    resize(w, h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    setMode(next) { mode = next; shotCam = null; },
    setShotCam(pos, look) { mode = 'shot'; shotCam = { pos, look }; },
    setInterior(b) { room.visible = b; },
    update(state, dt, time) {
      // Day cycle (chunk D): sunset (0) lerps to night (1) as the run
      // progresses — the sun sinks and cools, the sky darkens, windows
      // and lamps brighten.
      const tod = state.timeOfDay || 0;
      sun.color.setHex(lerpHex(0xff8c3a, 0x8fa8ff, tod));
      sun.intensity = 2.2 - 1.6 * tod;
      sun.position.set(-300 + 200 * tod, 90 + 170 * tod, 60 + 40 * tod);
      scene.background.setHex(lerpHex(0x2b1a4e, 0x04040c, tod));
      scene.fog.color.setHex(lerpHex(0x3a2350, 0x0a0a18, tod));
      amb.color.setHex(lerpHex(0x8a5a9a, 0x232348, tod));
      amb.intensity = 1.1 - 0.65 * tod;
      hemi.color.setHex(lerpHex(0xff9a5a, 0x223355, tod));
      hemi.groundColor.setHex(lerpHex(0x2a1a3a, 0x0a0a14, tod));
      hemi.intensity = 0.7 - 0.4 * tod;
      disc.position.y = 42 - 72 * tod;
      disc.material.color.setHex(lerpHex(0xffb347, 0x555566, tod));
      winMat.color.setHex(lerpHex(0xffd27a, 0xffe9b0, tod));
      glowMat.color.setHex(lerpHex(0xffc46b, 0xfff0c0, tod));
      // Pedestrians wander the sidewalks on fixed loops; they flee the
      // player when the heat is on (chunk B pedOffset).
      for (let i = 0; i < 48; i++) {
        const lane = -360 + (i % 12) * 66;
        const speed = 2 + hash2(i, 3) * 2;
        const along = ((time * speed + i * 53) % 760) - 380;
        const side = i % 2 === 0 ? 1 : -1;
        const px = i < 24 ? lane : along;
        const pz = i < 24 ? along : lane;
        const off = pedOffset(state, px, pz + side * 9, time);
        p.set(px + off.x, 1.6, pz + side * 9 + off.z);
        s.set(1, 1, 1);
        m.compose(p, q, s);
        peds.setMatrixAt(i, m);
      }
      peds.instanceMatrix.needsUpdate = true;

      // Traffic: ambient cars + race rivals, coloured per entry.
      const tLen = Math.min(16, (state.traffic || []).length);
      for (let i = 0; i < tLen; i++) {
        const t = state.traffic[i];
        p.set(t.x, 0.7, t.z); s.set(1, 1, 1);
        m.compose(p, q, s);
        trafficMesh.setMatrixAt(i, m);
        trafficMesh.setColorAt(i, col.setHex(t.color || 0x888888));
      }
      trafficMesh.count = tLen;
      trafficMesh.instanceMatrix.needsUpdate = true;
      if (trafficMesh.instanceColor) trafficMesh.instanceColor.needsUpdate = true;

      // Cars: place pooled meshes on the state.
      state.cars.forEach((car, i) => {
        const g = carMeshes[i];
        if (!g) return;
        g.visible = !!car.visible;
        if (!car.visible) return;
        g.position.set(car.x, 0, car.z);
        g.rotation.y = -car.heading;
        g.children[0].material.color.setHex(car.color);
        // Visible customization from the garage (chunk C).
        const up = (state.garage || {})[car.id] || {};
        g.userData.neon.visible = !!up.neon;
        g.userData.neon.material.color.setHex(car.color);
        g.userData.spoiler.visible = !!up.spoiler;
      });
      figure.visible = state.player.onFoot;
      figure.position.set(state.player.x, 1.6, state.player.z);
      figure.rotation.y = -state.player.heading;

      // Helicopter (hidden until chunk C).
      if (state.police && state.police.heli) {
        heli.visible = true;
        heli.position.set(state.police.heli.x, 26, state.police.heli.z);
        heli.userData.rotor.rotation.y += dt * 18;
        pool.visible = true;
        pool.position.set(state.police.heli.x, 0.12, state.police.heli.z);
      } else {
        heli.visible = false;
        pool.visible = false;
      }

      // Police cruisers + roadblocks (chunk C).
      const units = (state.police && state.police.units) || [];
      const uLen = Math.min(6, units.length);
      for (let i = 0; i < uLen; i++) {
        const u = units[i];
        p.set(u.x, 0.7, u.z); s.set(1, 1, 1);
        m.compose(p, q, s);
        policeMesh.setMatrixAt(i, m);
        policeMesh.setColorAt(i, col.setHex(u.disabled > 0 ? 0x555555 : 0x2244cc));
      }
      policeMesh.count = uLen;
      policeMesh.instanceMatrix.needsUpdate = true;
      if (policeMesh.instanceColor) policeMesh.instanceColor.needsUpdate = true;
      const blocks = (state.police && state.police.roadblocks) || [];
      const bLen = Math.min(2, blocks.length);
      for (let i = 0; i < bLen; i++) {
        p.set(blocks[i].x, 0.8, blocks[i].z); s.set(1, 1, 1);
        m.compose(p, q, s);
        blockMesh.setMatrixAt(i, m);
      }
      blockMesh.count = bLen;
      blockMesh.instanceMatrix.needsUpdate = true;

      // Camera.
      const pl = state.player;
      if (mode === 'shot' && shotCam) {
        camera.position.set(...shotCam.pos);
        camera.lookAt(...shotCam.look);
      } else if (state.interior) {
        // Inside the safehouse: high chase cam, looking over the walls
        // into the roofless room.
        const back = pl.heading + Math.PI;
        camera.position.set(
          pl.x + Math.sin(back) * 6, 7.5, pl.z + Math.cos(back) * 6);
        camera.lookAt(pl.x, 1, pl.z);
      } else if (mode === 'chase') {
        const back = pl.heading + Math.PI;
        const cx = pl.x + Math.sin(back) * CAMERA.chaseDist;
        const cz = pl.z + Math.cos(back) * CAMERA.chaseDist;
        camera.position.set(cx, CAMERA.chaseHeight, cz);
        camera.lookAt(pl.x, 2, pl.z);
      } else if (mode === 'top') {
        camera.position.set(pl.x, 180, pl.z + 1);
        camera.lookAt(pl.x, 0, pl.z);
      } else {
        const a = time * 0.05;
        camera.position.set(pl.x + Math.sin(a) * 90, CAMERA.orbitHeight, pl.z + Math.cos(a) * 90);
        camera.lookAt(pl.x, 0, pl.z);
      }
      renderer.render(scene, camera);
    },
    drawMinimap(ctx, w, h, state) {
      const sx = (x) => ((x + WORLD.half) / (WORLD.half * 2)) * w;
      const sz = (z) => ((z + WORLD.half) / (WORLD.half * 2)) * h;
      ctx.fillStyle = '#14101f';
      ctx.fillRect(0, 0, w, h);
      // Sea strip on the west edge.
      ctx.fillStyle = '#0e6a6a';
      ctx.fillRect(0, 0, 4, h);
      for (const d of DISTRICTS) {
        ctx.fillStyle = '#' + d.tint.toString(16).padStart(6, '0');
        ctx.fillRect(sx(d.x0), sz(d.z0), sx(d.x1) - sx(d.x0), sz(d.z1) - sz(d.z0));
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      for (const v of city.roads) {
        ctx.beginPath(); ctx.moveTo(sx(v), 0); ctx.lineTo(sx(v), h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, sz(v)); ctx.lineTo(w, sz(v)); ctx.stroke();
      }
      // Safehouse: gold square.
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(sx(WORLD.safehouse.x) - 3, sz(WORLD.safehouse.z) - 3, 6, 6);
      // Target marker.
      if (state.target) {
        ctx.fillStyle = '#ff4a4a';
        ctx.beginPath();
        ctx.arc(sx(state.target.x), sz(state.target.z), 4, 0, Math.PI * 2);
        ctx.fill();
      }
      // Race checkpoints (cyan, next one filled), branch choices
      // (orange), live random event (purple).
      if (state.raceCheckpoints && state.raceCheckpoints.length) {
        for (let i = 0; i < state.raceCheckpoints.length; i++) {
          const c = state.raceCheckpoints[i];
          ctx.strokeStyle = '#4ae8ff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx(c.x), sz(c.z), 5, 0, Math.PI * 2); ctx.stroke();
          if (i === state.raceCp) {
            ctx.fillStyle = '#4ae8ff';
            ctx.beginPath(); ctx.arc(sx(c.x), sz(c.z), 3, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      if (state.branchMarkers && state.branchMarkers.length) {
        for (const b of state.branchMarkers) {
          ctx.fillStyle = '#ff8c3a';
          ctx.beginPath(); ctx.arc(sx(b.x), sz(b.z), 4, 0, Math.PI * 2); ctx.fill();
        }
      }
      if (state.event) {
        ctx.fillStyle = '#c04aff';
        ctx.beginPath(); ctx.arc(sx(state.event.x), sz(state.event.z), 4, 0, Math.PI * 2); ctx.fill();
      }
      // Active gig (chunk D): gold diamond.
      if (state.gig) {
        ctx.fillStyle = '#ffd24a';
        const gx = sx(state.gig.x), gz = sz(state.gig.z);
        ctx.beginPath();
        ctx.moveTo(gx, gz - 5); ctx.lineTo(gx + 5, gz);
        ctx.lineTo(gx, gz + 5); ctx.lineTo(gx - 5, gz);
        ctx.closePath(); ctx.fill();
      }
      // District names on the map (chunk C, RANK 1 lesson).
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      for (const d of DISTRICTS) {
        ctx.fillText(d.name, sx((d.x0 + d.x1) / 2), sz((d.z0 + d.z1) / 2));
      }
      // Hot zone (orange) + roadblocks (grey) + police units (blue).
      const P = state.police;
      if (P && P.hotZone) {
        ctx.strokeStyle = '#ff8c3a'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx(P.hotZone.x), sz(P.hotZone.z), (P.hotZone.r / (WORLD.half * 2)) * w, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (P && P.roadblocks) {
        ctx.fillStyle = '#999999';
        for (const rb of P.roadblocks) ctx.fillRect(sx(rb.x) - 3, sz(rb.z) - 3, 6, 6);
      }
      if (P && P.units) {
        ctx.fillStyle = '#4a7aff';
        for (const u of P.units) {
          ctx.beginPath(); ctx.arc(sx(u.x), sz(u.z), 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Cars + player.
      for (const car of state.cars) {
        if (!car.visible) continue;
        ctx.fillStyle = '#' + car.color.toString(16).padStart(6, '0');
        ctx.fillRect(sx(car.x) - 2, sz(car.z) - 2, 4, 4);
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx(state.player.x), sz(state.player.z), 3.5, 0, Math.PI * 2);
      ctx.fill();
    },
  };
}
