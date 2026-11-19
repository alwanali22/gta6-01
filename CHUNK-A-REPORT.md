# CHUNK A REPORT — rewrite2 gta6-01 (fondasi + dunia)

**Tanggal:** 19 Nov 2026 (~19:28–19:37 WIB) · **Koordinator:** sesi a6d773e9
**Recording:** `01a1f3c7-4bef-74dc-a25a-adaa7970a446` (recorder PID 4647 — dicek
hidup sebelum tiap fase: baca spek, unduh three.js, tulis kode, probe, dossier,
commit; tidak pernah mati)
**Commit:** `rewrite A: foundation + world (fresh, recording 01a1f3c7)` — satu
commit di atas anchor 37487aa + LICENSE 263bc06.

## Yang ditulis (semua segar dari dokumen desain — repo lama TIDAK PERNAH dibuka)

| File | Byte | Isi |
|---|---|---|
| `game/src/random.js` | 1.218 | mulberry32 + range/int/pick/shuffle/hash2. Tanpa Math.random()/Date.now() di jalur gameplay. |
| `game/src/config.js` | 5.783 | WORLD (±400, grid 80u, safehouse −160,−40), 4 distrik, 6 mobil + harga + spawn, 12 perk, 10 misi (total payout $30.600), 3 gig, ECONOMY (near-miss $250, chain x1–x5, fence 40%, grade S ≥$90k), UPGRADES ENGINE/BRAKES/NOS ×3 level, POLICE (heli ★3, alt 26, speed 55, hp 100/disabled 12 dtk), WEAPONS pistol/shotgun/smg (angka persis FIX5), RADIO 3 stasiun (BPM/root/wave persis FIX5), PLAYER, CAMERA. |
| `game/src/city.js` | 3.954 | Road grid 80u, `isOnRoad`, `nearestRoadPoint`, `buildCity(seed)` (119 bangunan, palms, landmark pier + 2 crane), `collidesBuilding`, `resolveCollision` (AABB push-out), `randomRoadPoint`. |
| `game/src/input.js` | 2.242 | Keyboard state + edge `tapped()` + `axis()` + `inject()` untuk sim/probe. Aksi: WASD/arrows, Shift nitro, Space handbrake, E, P/Esc, G, M, R, F, Q, B, 1/2/3. |
| `game/src/render.js` | 14.176 | three.js r160: sunset lighting, sun disc, sea, district tint, road strips + dashes, buildings (InstancedMesh + lit windows), palms, lamps, pier/cranes, 48 pejalan kaki (posisi = fungsi murni waktu), 6 mobil (pooled meshes), player figure, heli (hidden sampai chunk C), kamera orbit/chase/top/shot, `drawMinimap` 2D. |
| `game/src/main.js` | 5.927 | Boot + loop + state + gerak jalan kaki + collision + `stageShot()` (?shot=chase/start/draft/victory) + `syncHud()` minimal + toast minimal + `window.__shotReady` + `window.__solmar`. |
| `game/index.html` | 7.802 | Import map three → ./vendor/three.min.js; HUD lengkap (wanted, cash/REP, chain, objective, minimap 180×144, weapon panel, radio panel, speed, toast); 7 layar (title, pause, garage, draft, victory, busted, wasted) dengan ID yang dipakai FIX5 (`#radio-value`, `#weapon-value`, `#save-slots`, `#garage-cars`, `.perk-card`). |
| `main.ts` | 866 | Entrypoint: wipe + copy game/ + screenshots/ → OUT, `buildDossier` (text cap 163.840), tulis dossier.json. |
| `serve.ts` | 1.344 | Static server Node, port 8080 (atau --port). |
| `shots.json` | 448 | 4 scene: chase (cover), start, draft, victory. |
| `vendor/makefun-game.ts` | 56.282 | **File kit, disalin per instruksi header-nya** — bukan karya entry, tidak masuk dossier (di luar game/). |
| `game/vendor/three.min.js` | 670.681 | **three.js r160 ESM build (`three.module.min.js`), diunduh segar dari unpkg dalam sesi ini**, sha256 `3e690ac7…`. Bukan salinan file lama. |
| `screenshots/` | 4 JPG | **Provisional, render asli dunia chunk A** (1-chase 54.214 B, 2-start 93.924 B, 3-draft 86.687 B, 4-victory 83.663 B — semua ≤256 KiB, 1280×800). Chunk D men-shoot ulang 4 scene final dan menimpa file-file ini. |

Total sumber chunk A: **41.255 B** (game/ + main.ts + serve.ts + shots.json, tanpa vendor).

## Verifikasi (semua lolos)

- `node --check` tiap file JS/TS karya entry: **OK semua** (6/6 src + main.ts + serve.ts).
- **Probe headless** (`/tmp/probe-a.py`, Playwright chromium-1255, serve.ts
  port 8932): **5/5 load** (`chase`, `start`, `draft`, `victory`, plain) →
  `ready=True`, **0 console error, 0 pageerror**, 6 mobil, 119 bangunan, screen
  benar per scene. Dijalankan 3× (run 1 gagal total karena three.min.js UMD,
  run 2 lolos 5/5 tapi shot chase menampakkan title screen, run 3 lolos 5/5
  setelah perbaikan staging).
- **Verifikasi visual** (dibaca langsung): chase.jpg — HUD lengkap (★4, $3.313,
  CHAIN x2.0, objective THE MARINA JOB, minimap + safehouse + target, weapon/radio
  panel), Comet GT merah di jalan dengan garis tengah + kota senja di belakang.
  start.jpg — title screen lengkap (GOAL/WIN/LOSE, HOW TO PLAY, counts, START)
  di atas kota yang mengorbit.
- **Dossier** (`MAKEFUN_OUTPUT_DIR=/tmp/out-a1` dan `/tmp/out-a2`): **byte-identik
  2×** (sha256 `395cd504…`), 468.359 B file, **teks 41.848 B** (cap 163.840 —
  headroom ~122 KB untuk chunk B/C/D), 4 gambar, **semua 7 sumber lengkap** dalam
  teks, urutan import benar (index.html → main.js → config → city → random →
  render → input).

## Interface antar-modul (kontrak untuk chunk B/C/D)

- **State** (`main.js makeState()`): `time, screen, player{x,z,heading,speed,onFoot,vehicleId},
  cars[{id,name,x,z,heading,color,price,owner,hp,visible}], traffic[], police(null|{units,heli}),
  target(null|{x,z}), cash, rep, heat(0..5), chain(1..5), mission(0..9), done[], perks[],
  garage{}, feats[], muted`.
- **render.js** `createWorld(canvas, city)` → `{renderer, scene, camera, resize, update(state,dt,time),
  drawMinimap(ctx,w,h,state), setMode('orbit'|'chase'|'top'|'shot'), setShotCam(pos,look)}`.
  `update()` tidak memiliki state sendiri kecuali pejalan kaki (fungsi waktu).
- **city.js**: `buildCity(seed)` → `{seed, roads, buildings, palms, landmarks, bounds}`;
  `isOnRoad(x,z)`, `nearestRoadPoint(x,z)`, `collidesBuilding(city,x,z,r)`,
  `resolveCollision(city,x,z,r)`, `randomRoadPoint(rng,city)`.
- **input.js**: `createInput()` → `{attach, detach, inject(code,down), held(action),
  tapped(action), axis(), endFrame(), snapshot()}`. Aksi di `ACTIONS`.
- **config.js**: semua angka gameplay; chunk B/C/D DILARANG hard-code angka di tempat lain.
- **main.js**: `window.__solmar = {state, city}`, `window.__world`, `window.__shotReady`
  (true setelah frame ke-3). `setScreen(state, world, name)` + `stageShot(state, world, name)`.

## Yang BELUM ada (milik chunk B/C/D — jangan dicari di sini)

- player.js (hotwire, drive, keluar/masuk mobil), vehicles.js (gerak + garage +
  fence + upgrades), traffic.js, pedestrians.js (logika gerak; render hanya menggambar),
  police.js (dispatch, heli AI, roadblock, bust), missions.js (objective, draft
  perk, gig), combat.js (senjata), hud.js (mengambil alih `syncHud` + toast +
  semua handler tombol), audio.js (WebAudio + radio), save.js (3 slot),
  shots.js (scene staging lanjutan), sim.js (autopilot deterministik).

## Penyimpangan dari spek + alasannya

1. **Gerak jalan kaki ditulis di main.js, bukan player.js** — player.js milik chunk B.
   main.js menandai blok itu "chunk B's player.js takes this over". Interface player
   (posisi/heading/speed/onFoot/vehicleId) sudah final.
2. **10 misi di config (bukan 8)** — chunk A rewrite pertama memakai 8 misi
   ($22.800), tapi chunk B rewrite pertama membangun 10 misi (total $30.600) dan
   COMPARE-REWRITE menetapkan 10 misi sebagai P0. Config rewrite2 langsung
   memakai 10 misi dengan nama + payout final (MIDNIGHT MILE, TWO WAYS OUT,
   THE LONG WAY HOME termasuk), supaya chunk B tidak perlu mengubah config.
3. **Harga upgrade garage + 7 nama perk baru + payout gig adalah pilihan saya**
   (tidak ada di FIX2/FIX5): UPGRADES ENGINE $800/1600/3200, BRAKES $600/1200/2400,
   NOS $1000/2000/4000; perk baru HOTWIRE ACE, SPOTTER, CLEAN HANDS, DECOY,
   LIGHT FOOT, SMOOTH TALKER, LUCKY CHARM, QUICK HANDS, IRON NERVES (efek di
   config.js); gig PARCEL RUN $450, SHADOW CAB $350, STUNT JUMP $600.
   Semua terdokumentasi di config.js.
4. **three.js yang diunduh adalah `three.module.min.js` (ESM), bukan
   `three.min.js` (UMD)** — file `three.min.js` r160 di unpkg ternyata masih
   build UMD lawas (peringatan deprecated r150+ di header-nya) dan
   `import * as THREE` dari UMD menghasilkan namespace kosong
   (`THREE.WebGLRenderer is not a constructor`, probe run 1 gagal 0/5).
   File ESM diunduh segar ke path yang sama (`game/vendor/three.min.js`),
   sha256 `3e690ac7…`, probe langsung 5/5.
5. **Spawn Comet + player di jalan x=−160** (bukan −140,−60): posisi lama
   berada di dalam blok bangunan (bukan di jalan), sehingga shot chase pertama
   menabrak dinding bangunan. Spawn baru di garis jalan, heading 0 (menyusuri
   jalan +z); kamera shot chase dihitung dari heading (16u di belakang mobil).
6. **Sun disc** tampil sebagai lingkaran datar (bukan gradien) — cukup untuk chunk A;
   chunk D boleh memoles.
7. **Pejalan kaki dihitung di render.js** (posisi = fungsi waktu, tanpa state) —
   keputusan sadar: tidak ada state untuk di-save; traffic.js nanti boleh memindahkan
   mereka ke sistem state bila perlu.
8. **Dossier saat ini 41.848 B** — jauh di bawah cap; chunk B/C/D punya ~122 KB.
   Peringatan: game lama mencapai 163.793 B dengan 18 file — jaga hemat byte,
   potong flavor text dulu bila mendekati cap.

## Catatan authorship

- Repo lama (`repo/`) dan commit lama TIDAK PERNAH dibuka/dibaca/diff selama chunk ini.
  Satu-satunya sumber: STRATEGY.md, BUILD-PLAN.md, TOP-ENTRIES-STUDY.md,
  FIX5-REPORT, FIX2-REPORT, COMPARE-REWRITE, GAME-SPECS-POPULER (dokumen desain)
  + rewrite/CHUNK-A-REPORT.md (spesifikasi chunk A) + kit starter
  `vendor/makefun-game.ts` (infrastruktur kompetisi, disalin per instruksi kit)
  + three.js r160 ESM yang diunduh segar dari unpkg.
- Angka-angka (harga mobil, senjata, radio, payout misi, safehouse −160,−40)
  diambil dari laporan desain sebagai SPESIFIKASI, lalu ditulis ulang dengan
  struktur/kata sendiri — bukan salinan baris kode.
