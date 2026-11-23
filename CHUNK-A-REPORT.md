# CHUNK A REPORT — gta6-01 rewrite4 — foundation + world

## What was built, fresh in this session
SOLMAR: SUNSET GETAWAY, an original three.js open-world crime game, chunk A
only: foundation plus world. No code was carried over from any earlier run;
every file below was written fresh in this recorded session, in my own words.

- `game/src/config.js` — world, 4 districts (Marina Row, Old Town, Dockside,
  Palm Heights), 6 named cars with prices and spawns, 12 perks, 12 missions
  with payouts totalling $37,000, 3 gigs, economy (near-miss $250, chain
  x1.0–x5.0, fence 40%), upgrades ENGINE/BRAKES/NOS, police, 4 weapons
  (RIFLE $1,500), 3 radio stations, respect ranks, heat tracks, player/camera.
- `game/src/random.js` — seeded mulberry32, plus pick/range/shuffle.
- `game/src/city.js` — 119 buildings across the 4 districts, road grid,
  palm boulevard, marina pier + sand + sea, dockside cranes + containers,
  100 street lamps. Verified: `__solmar.buildings` is 119 in the probe.
- `game/src/input.js` — WASD/arrows, hold-E hotwire, Space start, P pause.
- `game/src/render.js` — three.js r160 sunset, fog, sky, chase/on-foot
  camera, sunset-to-night lerp, 2D minimap with player + police dots.
- `game/src/main.js` — boot, loop, on-foot + in-car movement, hotwire
  2.5s, wanted + police follow, near-miss chain, HUD sync, `__shotReady`
  and `window.__solmar` for the probe/sim.
- `game/src/shots.js` — 4 staged scenes: chase, start, draft, victory.
- `game/index.html` — full HUD (wanted stars, cash, speed, chain, mission
  banner with timer + lose condition, units in pursuit, heat, air unit,
  minimap) + 7 screens (title, play, pause, draft, victory, wasted,
  busted). Title shows the tagline "STEAL THE CAR. OUTRUN THE LAW. OWN
  THE NIGHT." and the counts 4 districts, 12 missions, 6 cars, 12 perks.
- `main.ts` — harness entrypoint, written then revised in a second edit.
- `serve.ts`, `shots.json` (4 scenes), `LICENSE` (SPDX MIT line).
- `game/vendor/three.min.js` — three r160 ESM build, downloaded fresh in
  this session from unpkg, 670,681 bytes,
  sha256 3e690ac7d180b0aadf0891bea39eec643e29e2d3e75c99b18689518665f69ba6.
- `vendor/makefun-game.ts` — kit infrastructure, untouched.

Anchor, quoted before the first write:
`makefun anchor fd129bd60e749826d54c2ea961d1dff005730517 round 34200366`

## Probe (Playwright, Chromium, headless, 1280x800, seed 1)
- 4/4 shots reached `window.__shotReady=true`: chase, start, draft,
  victory. 0 console errors, 0 page errors in all four.
- Chase: wanted 5, cash $12,450, speed 118 km/h, NEON RUN 42s left.
- Victory: grade A, $76,400, 12/12 missions. Start: $500, wanted 0.
- Screenshots (provisional, from this build): 1-chase.jpg 49K,
  2-start.jpg 53K, 3-draft.jpg 32K, 4-victory.jpg 29K — all under 256 KiB.
  One fix during probing: the `.screen` CSS overrode the `hidden`
  attribute, so every screen stacked at once; fixed with
  `.screen[hidden]{display:none}` and by hiding all screens in play mode.
  Police cars were then moved ahead in the chase staging so they read
  in the cover frame.
- `node --check` passed on all 7 game/src JS files. TS files run under
  Node 24 type-stripping (main.ts / serve.ts execute cleanly).
- `node main.ts` twice to different dirs: byte-identical dossier,
  sha256 026ae8cc18e0a2da40f20a0825cbc9a00c53b016ec24f3286c757a0789b53d24.
- Dossier: 255,302 bytes total, text 32,781 bytes — inside the chunk A
  budget of 42,000 bytes, with headroom for chunks B–D.

## What is NOT done yet
Chunk B (driving + missions), C (police + combat + systems) and D
(sim + polish) are still to come. No seal, no submit. The recorder was
alive at the end of this chunk (PID 22532).
