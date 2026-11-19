# CHUNK B REPORT — rewrite2 gta6-01 (mengemudi + misi)

**Tanggal:** 19 Nov 2026 (~19:41–19:50 WIB) · **Koordinator:** sesi ffec5e37
**Recording:** `01a1f3d5-0cfa-7151-a93a-a17ecede1e66` (recorder PID 7591 — dicek
hidup sebelum baca spek, sebelum tulis kode, sebelum probe, sebelum commit;
tidak pernah mati)
**Commit:** "rewrite B: driving + missions (fresh, recording 01a1f3d5)"

## Yang ditulis (semua segar dari dokumen desain + interface chunk A)

| File | Byte | Isi |
|---|---|---|
| `game/src/player.js` | 3.120 | Jalan kaki (pindah dari main.js, interface sama) + masuk/keluar mobil: hotwire tahan-E 2,5 dtk (perk HOTWIRE ACE −50%), mobil milik sendiri masuk instan, STEAL_HEAT +1, keluar hanya saat hampir berhenti. `hasPerk`/`nearestCar` dipakai chunk C/D. |
| `game/src/vehicles.js` | 3.472 | Fisika mengemudi: akselerasi, steer skala-kecepatan, nitro (Shift, resource 0..1, NOS upgrade), handbrake, drag, off-road cap ×0,6, tabrakan gedung (damage × (1−armor)), tabrakan traffic, near-miss +$250 × chain (×2 LUCKY CHARM). `carSpec()` = base × upgrade garage (ENGINE/BRAKES/NOS). `damageCar()` → WRECKED saat hp 0 (paksa jalan kaki). |
| `game/src/traffic.js` | 2.004 | 12 mobil ambient seeded (rng 20240): jalan di grid, belok di ujung jalan (seeded), rem untuk pemain/mobil di depan. Deterministik. |
| `game/src/pedestrians.js` | 550 | `pedOffset()` — pejalan kaki lari menjauh saat pemain dekat + heat ≥2 atau tembakan <3 dtk lalu. Fungsi murni (state, x, z, time); render.js tetap pemilik posisi. |
| `game/src/missions.js` | 11.947 | Mesin 10 misi + draft perk + random event (lihat § misi). |
| `game/src/config.js` (edit) | +~1.000 | Tabel HOTWIRE / RACE / BRANCH / HEIST / EVENTS (angka chunk B; misi 10 sudah final di chunk A). |
| `game/src/main.js` (edit) | — | Wiring: createPlayer/createTraffic/createMissions, fx {toast,setScreen,showVictory}, startMission(0) saat boot run, loop memanggil updatePlayer/updateVehicle/updateTraffic/updateMissions + updateDraft di layar draft; syncHud pakai objectiveText(); victory diisi statistik run asli; klik .perk-card + tombol RUN IT AGAIN. |
| `game/src/render.js` (edit) | +~2.000 | Traffic InstancedMesh (16 slot, warna per mobil, rival balap terlihat beda); minimap: checkpoint race (cyan), branch choice (oranye), event (ungu); pejalan kaki + pedOffset. |
| `game/index.html` | 0 | TIDAK DIUBAH — title sudah '10 MISSIONS', kartu draft diisi dinamis, sel victory diisi showVictory. |

Total sumber: 41.255 B → **66.629 B** (+25.374 B).
**Dossier text: 41.848 B → 67.615 B (+25.767 B, target ≤82.000 B — LOLOS).**
Cap 163.840 B; sisa ~96.200 B untuk chunk C/D/E.

## Misi (10) — struktur final (mengikuti config chunk A)

Urutan (nama + payout dari config, total **$30.600**): THE MARINA JOB $1.200 →
DOCKSIDE DELIVERY $1.800 → ROOK'S ROADBLOCK $2.400 → NEON RUN $2.600 →
THE BROKER'S PRICE $3.000 → PALM HEIST $3.200 → MIDNIGHT MILE $3.600
(street race, 5 checkpoint, 2 rival AI murni fungsi raceClock, limit 100 dtk,
menang = finis sebelum rival tercepat ~91 dtk) → TWO WAYS OUT $3.800
(cabang: SILENT full bila heat <1 saat tiba, kalau tidak setengah; LOUD
full + heat→3) → GHOST CONVOY $4.000 (bayangi konvoi 5 dtk dalam 25u) →
THE LONG WAY HOME $5.000 (heist 3 fase: PREP 2 titik → VAULT tahan 5 dtk →
ESCAPE ke safehouse, heat→5, boss MARCUS VOSS fase 1/2).
Setiap misi selesai: cash += payout, rep +25, chain +0,5 (cap x5) →
draft perk 1-dari-3 (seeded per indeks misi, klik kartu atau tombol 1/2/3)
→ misi berikut. Semua 10 selesai → victory screen dari statistik run
asli (grade S ≥$90k / A ≥$60k / B ≥$40k / C).

**Random event (seeded, deterministik):** event pertama 40 dtk play, lalu
tiap 50 dtk — ATM JOB (+$400, heat+1), STALLED DRIVER (+$300), WITNESS
(+$250; bila kedaluwarsa heat+1), ROADBLOCK JAM (+$150). Penanda ungu di
minimap + toast. rng event mulberry32(4242), posisi randomRoadPoint.

## Verifikasi (semua lolos)

- `node --check` semua file baru/diubah: **OK** (player, vehicles, traffic,
  pedestrians, missions, config, main, render).
- **Probe headless** (`out/probe/probe-chunk-b.py`, Playwright chromium-1255,
  serve.ts port 8932, viewport 640×400): **CHUNK-B-PROBE OK — 48/48 cek,
  0 console error, 0 pageerror.** Yang dites: 5 scene load bersih, start
  run, traffic 12, walk, enter Comet instan, drive (speed 23–29), nitro
  drain 1,00→0,80, exit + re-enter, hotwire hauler (heat 0→1), event spawn
  + resolve (+$400), misi 0→draft 3 opsi→perk, misi 1–5, vault m6 hold 5 dtk,
  race start + 2 rival di traffic (14 mobil) + menang, branch SILENT full
  $3.800 (heat 0), convoy shadow 5 dtk, heist prep 1/2 + vault + boss fase 2
  + escape heat 5 → victory '10 / 10', EARNED $31.000.
- **Dossier rebuild 2× byte-identik** (sha256 `7d8ef7ce…`, file 494.840 B,
  teks 67.615 B, 4 gambar, semua 12 sumber lengkap dalam teks).
- Sim hooks utuh: `window.__solmar` kini `{state, city, input}` (input
  diekspos untuk sim chunk D); `input.inject()` tersedia.

## Interface untuk chunk C/D

- **State baru:** `nitro (0..1)`, `missionPhase`, `missionTimer` (vault hold),
  `missionChoice` ('silent'|'loud'), `raceClock`, `raceCp`,
  `raceCheckpoints[]`, `branchMarkers`, `event {id,x,z,ttl,reward,heat}`,
  `eventClock`, `eventAt`, `boss {name,phase,hp}|null`, `shotsAt` (0 = belum
  ada tembakan; combat chunk C yang mengisinya), `earned`, `maxHeat`,
  `bestChain`, `nearMisses`, `draftOptions[]`, `convoy {dist,x,z}|null`,
  `shadowTimer`.
- **player.js:** `createPlayer()`, `updatePlayer(p,state,input,city,dt,fx)`,
  `exitCar(state,fx)`, `hasPerk(state,id)`, `nearestCar(state,x,z,maxD)`.
- **vehicles.js:** `carSpec(state,car)`, `updateVehicle(state,input,city,dt,fx)`,
  `damageCar(state,car,dmg,fx)`, `nearSafehouse(state,x,z)`.
- **traffic.js:** `createTraffic(city)` → `{cars,rng,city}`,
  `updateTraffic(t,state,dt)` (menulis `state.traffic`; missions
  menambahkan rival balap SETELAH pemanggilan ini — jaga urutan di main.js).
- **missions.js:** `createMissions(city)`, `startMission(state,i,fx)`,
  `updateMissions(m,state,dt,fx)`, `updateDraft(m,state,input,fx)`,
  `pickDraft(m,state,idx,fx)`, `objectiveText(state)`. `fx = {toast, setScreen, showVictory}`.
- **render.js:** traffic mesh memakai `t.color`; minimap membaca
  `state.raceCheckpoints`, `state.branchMarkers`, `state.event`.
- **Yang BELUM ada (chunk C/D):** police.js (dispatch, heli AI, roadblock,
  bust — membaca `state.heat`, `state.boss`), combat.js (senjata + F/Q,
  mengisi `state.shotsAt`, boss hp), hud.js (ambil alih syncHud/toast),
  audio.js (radio + WebAudio), save.js (3 slot — `state.nitro` dan field
  baru chunk B HARUS ikut disimpan/dipulihkan), respect.js (P0-1),
  shots.js + sim.js (chunk D).

## Penyimpangan dari spek + alasannya

1. **Urutan + nama misi mengikuti config chunk A rewrite2** (bukan CHUNK-B
   REPORT lama): DOCKSIDE DELIVERY (bukan DROP), NEON RUN, PALM HEIST,
   GHOST CONVOY sebagai misi 2/4/6/9; race tetap misi 7, branch misi 8,
   heist final misi 10. Total payout tetap $30.600.
2. **Branch LOUD = $3.800 (sama dengan SILENT full), bukan $4.200** —
   config mengunci payout m8 di $3.800 dan total $30.600; LOUD membayar
   penuh tapi heat→3, SILENT penuh hanya bila heat <1. Pilihan tetap
   berarti (risiko vs hadiah).
3. **Race clock mulai saat pemain mencapai garis start** (checkpoint 0),
   bukan saat misi dimulai — adil: pemain tidak dihukum oleh jarak
   tempuh ke garis start; rival mulai bergerak di saat yang sama.
4. **STANDOFF (P2-1) TIDAK masuk** — butuh combat.js (chunk C).
5. **Grade victory: S ≥$90k / A ≥$60k / B ≥$40k / C** — ambang A/B pilihan
   saya (hanya S ada di config); run misi-only $30.600 = grade C, grade A
   butuh gig + near-miss (tugas sim chunk D).
6. **Spawn pemain di startRun (-140,-60)** — dikembalikan seperti chunk A
   (bukan -160,-60 dari makeState) supaya pemain tidak lahir menumpuk
   Comet.

## Catatan environment (bukan bug game)

- Headless Chromium (SwiftShader) lambat: probe 78–128 dtk untuk 48 cek.
- 2 kegagalan probe awal adalah artefak probe (bukan bug game): header
  komentar `//` di file Python, dan kondisi selesai convoy menunggu
  `mission == 9` padahal indeks misi baru naik setelah draft pick —
  sinyal selesai yang benar adalah layar draft. Semua diperbaiki di sisi
  probe; kode game tidak diubah untuk itu.
- `pkill -f "serve.ts --port 8932"` ikut membunuh shell-nya sendiri
  (pola cocok dengan baris perintah) — server tetap mati, recorder
  tidak tersentuh (PID 7591 hidup).

## Catatan authorship

- Repo lama (`repo/`) dan commit lama TIDAK PERNAH dibuka/dibaca/diff
  selama chunk ini. Satu-satunya sumber: dokumen desain di atas +
  rewrite/CHUNK-B-REPORT.md (spesifikasi chunk B) + rewrite2/CHUNK-A-REPORT.md
  + kode chunk A di rewrite2/ (interface yang dibangun di atasnya).
- Angka-angka (payout misi, harga, timer, kecepatan rival) diambil dari
  laporan desain/config sebagai SPESIFIKASI, lalu ditulis ulang dengan
  struktur/kata sendiri — bukan salinan baris kode.
