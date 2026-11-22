# CHUNK A REPORT — rewrite3 — SOLMAR: SUNSET GETAWAY

Chunk A: foundation + world. Written fresh in this session under
recording 01a20395-fd5a-7099-ac13-08b8758d66ba (recorder PID 33631,
alive before the first write and after the probe).

Anchor quoted before the first write:

`makefun anchor ef5d4242aa4ce7d86a1b6c3909f298c9114e72ec round 34100348`

## What was built

- `game/src/config.js` — one source of truth: 4 districts (Marina Row,
  Old Town, Dockside, Palm Heights), 6 named cars with prices/spawns,
  12 named perks, 12 named missions with payouts totalling $37,000,
  3 side gigs, economy (near-miss $250, chain x1.0–x5.0, fence 40%,
  grades S $90k / A $60k / B $40k), upgrades, police, 4 weapons
  (RIFLE $1,500), 3 radio stations, respect ranks, player, camera.
  Mission 7 is the MIDNIGHT MILE street race (5 checkpoints, 2 rivals,
  100s); mission 8 TWO WAYS OUT is the SILENT/LOUD branch; mission 10
  THE LONG WAY HOME is the 3-phase heist against boss MARCUS VOSS.
  Every mission carries a Nadia crew line for the dialogue box.
- `game/src/random.js` — mulberry32 seeded RNG (seed 20261122).
- `game/src/city.js` — the city: road grid, exactly 119 buildings
  (seeded, per-district palettes and heights), palm boulevard, Marina
  pier + hut, 3 harbour cranes + containers, clock tower, neon strip,
  street lamps, sea + beach. Exports solid footprints for collision.
- `game/src/input.js` — shared keyboard state + drive axis.
- `game/src/render.js` — three.js r160 sunset scene, sunset-to-night
  light lerp, chase camera, 2D minimap with district names, roads,
  player/police/objective dots.
- `game/src/main.js` — boot + loop + on-foot play (WASD, collision,
  camera follow) + 4 staged `?shot=` scenes + `window.__shotReady`
  + `window.__solmar`. Title START, pause (P), radio cycle (R),
  sound toggle, 3 save-slot labels read from localStorage.
- `game/index.html` — full HUD (wanted stars, district, REP, objective
  banner + lose condition, cash, chain, speed, minimap, dispatch,
  radio, weapon, toast, Nadia dialogue) + 7 screens (title, HUD play,
  pause, WASTED, BUSTED, perk draft, victory). Title shows the tagline
  "STEAL THE CAR. OUTRUN THE LAW. OWN THE NIGHT.", the identity line
  "EVERY NEAR-MISS FEEDS THE CHAIN" (P0-3), and the counts
  4 districts / 12 missions / 6 cars / 12 perks.
- `main.ts` (written in 2 messages: initial write + guard revision),
  `serve.ts`, `shots.json` (4 scenes), `LICENSE` (init, SPDX MIT).
- `game/vendor/three.min.js` — downloaded FRESH in-session from unpkg,
  three r160 ESM build `three.module.min.js`, 670,681 bytes,
  sha256 `3e690ac7d180b0aadf0891bea39eec643e29e2d3e75c99b18689518665f69ba6`,
  verified `REVISION 160` by node import.
- `vendor/makefun-game.ts` — kit copy, sha256 matches the fresh kit.

Nothing was read, copied or carried over from repo/, rewrite/ or
rewrite2/ or any old commit. The previous Nov 19 files in rewrite3/
were deleted unread before the fresh write.

## Probe results (headless Playwright, Chromium 1255, 1280x800)

`node --check` passes on all 7 game sources + main.ts + serve.ts.
Zero network references in the authored sources.

| shot | __shotReady | console/page errors | state |
|---|---|---|---|
| cover | true | 0 | chase, wanted 5, chain x2.0, $12,450, 87 mph, 3 units |
| title | true | 0 | title screen, tagline + counts + slots |
| marina | true | 0 | on foot by the pier, mission 1 live, wanted 0 |
| night | true | 0 | chase, day 1, wanted 3, chain x3.0, AIR UNIT |

City check from `__solmar`: 119 buildings, mission payouts $37,000.
Screenshots (JPEG, 1280x800): 1-cover.jpg 41,882 B, 2-title.jpg
53,143 B, 3-marina.jpg 36,708 B, 4-night.jpg 36,067 B — all under
the 256 KiB cap. All four were read back visually: the cover shows
the sunset disc down the pier road with the player car and 3 police
cars ahead, full HUD; title teaches the whole game; marina shows
Milo, pier, sea; night shows the neon strip and 2 police cars ahead.

Two staging fixes were made after the first visual read (both in this
session): police cars were behind the camera in the first cover, and
the night cops sat off-frame; both now stage ahead on the road.

## Dossier

`MAKEFUN_OUTPUT_DIR=out node main.ts` run twice to different dirs:
byte-identical dossier.json, sha256
`7e35c48eca577fe2b637ca5f9e43ba563bca080b6249dcbe5b3532b7c5355397`,
263,129 bytes total. Dossier text 37,091 bytes — inside the chunk A
budget of 42,000 (headroom 4,909 B). Source files 7 (36,500 B);
vendored 1 (three.min.js); game/ total 707,181 bytes, well under
48 MiB. Dossier ≤1.5 MiB.

## What is NOT in this chunk (later chunks)

Driving + missions (B), police + combat + respect HUD + audio + save
(C), sim + polish + day-cycle scenes (D), final check + compare-first
(E). The draft/victory/wasted/busted screens exist in the HTML with
placeholder content; their live logic arrives with C/D. The cover and
night shots are provisional: the sunset reads, but the city is still
flat-shaded low-poly and the police cars are stand-ins — chunk D
polish (and chunk B vehicles) will deepen them. No submit, no seal —
the main agent seals and submits after compare-first.
