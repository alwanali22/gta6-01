# CHUNK C REPORT — rewrite2 gta6-01 (police + combat + respect + audio + save)

**Tanggal:** 19 Nov 2026 (~20:00–20:15 WIB) · **Koordinator:** sesi 20ef46f7
**Recording:** `01a1f3e3-f9a6-7736-8513-858206889d8f` (recorder PID 10176 — dicek
hidup sebelum baca brief, sebelum tulis kode, sebelum probe, sebelum dossier,
sebelum commit; tidak pernah mati)
**Commit:** "rewrite C: police + combat + respect + audio + save (fresh, recording 01a1f3e3)"

## Yang ditulis (semua segar dari design doc + interface chunk A/B)

| File | Byte | Isi |
|---|---|---|
| `game/src/police.js` | 7.417 | Dispatch ★1–5 (1 unit per bintang, ceil), unit BERNAMA + peran (KITE-1 MARKSMAN, MARLIN-3 SHORE WATCH, CORAL-48 RAMMING, GULL-7 FLANKING, PIER-2 FOOT CHASE, SHORE-5 IN PURSUIT), spawn 60–120u dari pemain, heli ★≥3 + "AIR UNIT DEPLOYED" + retreat 10 dtk saat ditembak, roadblock ★≥4 (tabrak −25 HP), bust 2 dtk dalam 4,5u saat lambat (CLEAN HANDS maafkan 1x), HEAT 4 flag (FACE/FIT/CAR/CREW), pursuit SEARCHING/PURSUIT/ESCAPED, hot zone 30 dtk + re-spot, decay lambat bila flag dikenal + cepat dengan GHOST PLATES + respect, STANDOFF lite (3 wave × 2 unit, +$600/+10 rep). |
| `game/src/combat.js` | 4.026 | 4 senjata: PISTOL ∞, SHOTGUN $1.200, SMG $900, RIFLE $1.500 (pack 30 $250). F tembak unit/boss terdekat dalam range (unit down 12 dtk, +0,12 heat/tembakan, heli retreat), Q ganti senjata, Digit 1–4 pilih, buyWeapon/buyAmmo dengan diskon respect. Boss MARCUS VOSS hanya bisa ditembak di fase vault. |
| `game/src/respect.js` | 1.427 | Rank ROOKIE 0 / STREET 100 / NOTORIOUS 200 / LEGEND 300, diskon garage 0/10/20/30%, decay ×1/1,2/1,5, chain floor 1/1,5/2/2,5, home turf (distrik terbaik, Lv = rep/100 + 1), bonus job LEGEND'S LAST RUN $6.000. |
| `game/src/audio.js` | 2.663 | 3 stasiun radio WebAudio prosedural (SOLMAR FM 92 BPM / NEON NIGHTS 116 / DOCKSIDE DUB 74), step sequencer deterministik, tanpa file audio. R: OFF → SOLMAR → NEON → DOCKSIDE → OFF (tekan pertama = SOLMAR). AudioContext lazy + best-effort (headless tetap ganti nama stasiun). |
| `game/src/save.js` | 2.969 | 3 slot localStorage `solmar-save-v1`: SEMUA field chunk B (nitro, missionPhase/Timer/Choice, raceClock/Cp, event, eventClock/At, boss, shotsAt, earned, maxHeat, bestChain, nearMisses, draftOptions, convoy, shadowTimer) + SEMUA field chunk C. Load tidak pernah lanjutkan standoff/kejar-kejaran (police + standoff reset; main.js bikin ulang semua sistem). |
| `game/src/hud.js` | 9.780 | syncHud: bintang, 4 flag HEAT, dispatch bernama + jarak live, cash/rep, chain, rank + progress rank berikut, home turf, nama distrik, dialog kru, senjata + amunisi, radio, speed. renderTitle (slot berisi ACT + % + distrik + misi + cash + waktu), renderGarage (upgrade engine/brakes/NOS, neon $400, spoiler $350, jual 40%, beli senjata/amunisi, ganti outfit), renderStats (grade per misi + career counters + completion %). Satu delegated click handler. |
| `game/src/config.js` (edit) | +~2.000 | RIFLE, RESPECT, HEAT_FLAGS, POLICE_UNITS, CREW (MIRA KESANG, 10 dialog per misi), STANDOFF, GARAGE_EXTRAS, event kind STANDOFF. |
| `game/src/main.js` (rewrite) | — | Import 6 modul baru; state +16 field chunk C; urutan frame police → missions → combat → respect; tombol F/Q/R/B/Digit 1–4; fx.busted; loadGame bikin ulang SEMUA sistem (player/traffic/missions/police); stageShot chase menampilkan 2 unit bernama + heli + roadblock; `window.__solmar` + police/combat/audio/save/hud. |
| `game/src/missions.js` (edit) | — | Grade per misi saat selesai (S ≥ chain 4, A ≥ 2,5, B ≥ 1,5, C); event STANDOFF → startStandoff. |
| `game/src/player.js` (edit) | — | Mobil curian ditandai `car.stolen = true`; `career.carsStolen` naik. |
| `game/src/input.js` (edit) | — | Aksi `four` (Digit4). |
| `game/src/render.js` (edit) | +~3.500 | Neon underglow + spoiler per mobil (dari garage), pool cahaya heli di tanah, cruiser polisi (biru) + roadblock (abu) sebagai InstancedMesh, minimap: nama distrik (teks), hot zone (oranye), roadblock, unit polisi (titik biru). |
| `game/index.html` (edit) | — | Baris HUD baru (heat flags, pursuit, respect, turf, distrik, dialog kru), tombol SAVE ×3 + STATS di pause, layar STATS baru (#stats-body), tombol STATS di title. `.screen` jadi scrollable (overflow-y auto — title meluap di viewport 400px). |

Total sumber: 66.629 B → **~103.000 B**. **Dossier text: 67.615 B → 107.193 B (+39.578 B).**

## RANK 1 LESSONS (Karimbu @madsrepo, dari screenshot Wowo 19:58 WIB) — semua masuk

- Unit polisi bernama + peran + jarak live di HUD (`KITE-1 MARKSMAN 63m`).
- Dialog kru bernama per misi (`MIRA KESANG: Comet's yours, Milo...` di HUD).
- Grade per misi (S/A/B/C) + completion % + career counters (cars stolen, cops
  evaded, taken out, shots fired) di layar STATS.
- Slot save menampilkan progres nyata (ACT · % · distrik · misi · cash · waktu).
- Nama distrik di minimap (teks) + label distrik di HUD.
- Adegan combat on-foot (STANDOFF) + slot senjata dengan amunisi di HUD.
- Heli berlabel "AIR UNIT DEPLOYED" saat spawn + pool cahaya di tanah.

## Verifikasi (semua lolos)

- `node --check` 12/12 file: **OK**.
- **Probe headless** (`out/probe/probe-chunk-c.py`, Playwright chromium, serve.ts
  port 8933, viewport 640×400): **CHUNK-C-PROBE OK — 43/43 cek, 0 console error,
  0 pageerror** (3 run: run 1 gagal 34/43 → 2 bug game + 2 artefak probe
  diperbaiki; run 2–3 OK penuh). Yang dites: 5 scene load bersih, start run,
  dialog kru + label distrik, hotwire hauler (heat naik, 1 unit KITE-1, teks
  dispatch bernama, flag FACE), heat 5 → heli + 2 roadblock + PURSUIT +
  "AIR UNIT DEPLOYED", decay heat 1 → 0,89, garage (RIFLE $1.500, engine Lv1,
  neon), pilih rifle Digit4 + tembak unit (hp 100→45, amunisi 30→29), radio
  4× (SOLMAR → NEON → DOCKSIDE → OFF), respect 100 → STREET, save slot 1
  (cash $5.432, nitro 0,37, misi 2) → reload → LOAD pulih semua, STANDOFF
  3 wave → clear +$600, stats (grade S misi 1, career 3 cars stolen), teks
  nama distrik di minimap (maxbright 198), 0 error.
- **Dossier rebuild 2× byte-identik** (sha256 `5691cfe1…`, file 535.540 B,
  teks 107.193 B, 4 gambar, 19 file game).

## Bug yang ditemukan probe (diperbaiki di chunk ini)

1. **Dispatch pakai `Math.floor(heat)`** — heat desimal 0,99 langsung
   menghilangkan unit yang baru spawn (floor = 0). Diperbaiki: `Math.ceil`.
2. **Spawn unit bisa 445 m jauhnya** — road point acak di seluruh kota; unit
   tiba setelah heat habis decay. Diperbaiki: spawn di jalan 60–120u dari
   pemain (sudut + jarak acak, snap ke grid jalan); probe: 63 m.
3. **`loadGame` tidak membuat ulang sistem** — setelah reload, trafficSys /
   missionsSys / playerSys null → `updateTraffic(null)` melempar
   "Cannot read properties of null (reading 'cars')" dan game loop mati.
   Diperbaiki: loadGame membuat ulang player + traffic + missions + police.
4. **Artefak probe (bukan bug game):** tombol START di luar viewport 400px
   (title meluap setelah tombol STATS ditambah) → klik via JS + `.screen`
   jadi scrollable; ekspektasi heat steal `== h0+1` → `> h0` (heat decay);
   toleransi nitro `±0,01` → `±0,06` (nitro regen setelah load).

## Penyimpangan dari spek + alasannya

- **Dossier +39.578 B vs target ≤28.000 B** (kelebihan ~11.600 B — standoff +
  HUD lengkap + save + pelajaran rank 1 semua masuk di C, seperti chunk C
  lama). Sisa 56.647 B untuk D/E — cukup (chunk D lama butuh ~42.500 B).
- **Radio pertama = SOLMAR FM** (bukan OFF) — sesuai spek (first-press fix).
- **Grade misi dari chain saat selesai** (S ≥ x4, A ≥ x2,5, B ≥ x1,5, C) —
  definisi saya; grade tidak memengaruhi payout.
- **Unit standoff yang down tidak bangkit** selama standoff (tidak ada
  decrement disabled di tengah standoff) — wave clear saat semua unit down
  bersamaan; playable dan deterministik.
- **Heli terlihat dari pool cahaya + cone** di sudut kamera chase; mesh heli
  di atas frame pada beberapa sudut — pool + label "AIR UNIT DEPLOYED"
  yang dibaca pemain.

## Interface untuk chunk D/E

- `state.police = { units: [{tag, role, x, z, heading, speed, hp, disabled, standoff}], heli: {x, z, alt, heading, retreat} | null, roadblocks: [{x, z, heading}], bustT, hotZone, standoff }` — updatePolice pemiliknya; combat membaca via `state.police`.
- `state.heat` (0–5 float), `state.heatFlags {face, fit, car, crew}`, `state.pursuit`, hot zone di `state.police.hotZone` (`{x, z, r, ttl} | null`).
- `state.weapon`, `state.owned[]`, `state.ammo {pistol: -1, shotgun, smg, rifle}`, `state.combatCd`.
- `state.respect` (0–3), `state.rep`, `state.districtRep {district: rep}`, `state.outfit`, `state.standoff = {wave, ttl, x, z, left} | null` (field `standoff` di objek police tidak dipakai).
- `state.missionGrades [{mission, grade}]`, `state.career {carsStolen, copsEvaded, takenOut, shotsFired}`.
- `window.__solmar` exposes: `state`, `input`, `police` (createPolice/updatePolice), `combat` (fire/cycleWeapon/selectWeapon), `audio` (radioCycle/stationName), `save` (loadSlot), `hud` (syncHud).
- `saveSlot(state, i)` / `loadSlot(state, i)` / `listSlots()` / `slotLabel(s)` / `completionOf(state)` di save.js; slot di `localStorage['solmar-save-v1']` (array 3).
- `spawnWave(P, state, n)` dan `startStandoff(state, fx)` di police.js; `addHeat(state, n)` hormati IRON NERVES.
- Sim hooks utuh: `input.inject`, `window.__solmar`; `state.shotsAt` diisi combat (dipakai chunk D untuk trigger pedestrian flee — sudah ada di chunk B).
