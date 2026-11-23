# CHUNK B REPORT — gta6-01 rewrite4 — driving + missions

## Anchor, quoted before the first write
`makefun anchor fd129bd60e749826d54c2ea961d1dff005730517 round 34200366`

Recording 01a206a2-e9d2-7163-9481-ab71e2f68fff, recorder PID 7539 alive
before the first write and at the end (see below). No seal, no submit.

## What was built, fresh in this session
Chunk B only, on top of chunk A commit 06d911b: driving plus missions.
No code was read, opened, copied or git-shown from repo, rewrite,
rewrite2, rewrite3 or any old commit. Design docs only, plus the chunk A
files in rewrite4 that chunk B wires into.

- `game/src/player.js` — Milo on foot, nearest parked car, hold-E
  hotwire 2.5s (half with QUICK HANDS), enter/exit car.
- `game/src/vehicles.js` — car spec with ENGINE/BRAKES/NOS upgrades
  and HEAVY FOOT top speed, Shift nitro, near-miss +$250 times the
  chain, bump damage and WRECKED at 0 health.
- `game/src/traffic.js` — 12 seeded ambient cars on the road grid,
  turning at crossings, wrapping at the city edge.
- `game/src/pedestrians.js` — 10 walkers who stroll, flee a fast car
  or wanted 3+, and drift back when the street calms.
- `game/src/missions.js` — all 12 missions from config ($37,000):
  drive-to-target with timer and lose condition, NEON RUN and
  MIDNIGHT MILE as 5-checkpoint jobs (race: 100s, 2 rivals, lose if
  rivals finish first), TWO WAYS OUT silent/loud branch (loud: 90s,
  wanted +2, pay x1.2), GHOST CONVOY tail window 12–30m for 20s,
  THE LONG WAY HOME 3 phases plus boss MARCUS VOSS HP 100, phases
  1/2, perk draft 1 of 3 after each job, 4 seeded random events
  (ATM, stranded driver, sudden roadblock, witness), gig payouts,
  grades S >= $90k, A >= $60k, B >= $40k from real cash.
- Wiring: `main.js` now steps traffic, walkers, player, vehicle and
  missions in order, shows a draft screen on job completion (pick
  with keys 1/2/3, next job starts), victory when 12/12 done with
  the grade from real stats; `render.js` draws the 12 traffic cars,
  10 walkers and a gold mission beacon, and the minimap shows
  traffic dots plus the mission target; `input.js` adds Shift nitro;
  `index.html` adds a nitro/health line, a near-miss/event toast and
  a live draft-options line.

## Probe (Playwright, Chromium, headless, 1280x800, seed 1)
- 4/4 shots reached `window.__shotReady=true`: chase, start, draft,
  victory. 0 console errors, 0 page errors in all four and in the
  live run. Screenshots re-taken from this build: 1-chase.jpg 52K,
  2-start.jpg 54K, 3-draft.jpg 35K, 4-victory.jpg 32K — all under
  256 KiB.
- Live run: START opened THE MARINA JOB; traffic 12, walkers 10.
  Hotwire at the COMET GT spawn: inCar true, carsStolen 1, wanted 1
  (headless frames run slow and dt is capped at 0.05, so the hold
  took longer than 2.5s wall-clock; at 60 fps it is 2.5s).
  Near miss: 1, chain x1.0 to x1.5, cash $2,875 after job 1
  ($500 start + $2,000 job + $375 near-miss).
  Draft offered GHOST PLATES / ARMOR PLATE / NITRO RIG; key 1 picked
  a perk and started DOCKSIDE DELIVERY. MIDNIGHT MILE finished
  through all 5 checkpoints (missionsDone 2). GHOST CONVOY finished
  in the tail window (missionsDone 3). THE LONG WAY HOME went
  phase 1 to 2 to 3 and Voss fell (missionsDone 4). Random event
  fired (STRANDED DRIVER +$250). Grade A at $65,000, grade S at
  $95,000, both from real cash.
- `node --check` passed on all 12 game/src JS files. serve.ts is
  TypeScript and runs under Node 24 type-stripping, as in chunk A.
- `node main.ts` twice to different dirs: byte-identical dossier,
  sha256 5ba03757fe3bfd840222c670c88d257b4ada8bae4958754119448526015d7cfa.
- Dossier: 288,674 bytes total, text 52,259 bytes — inside the
  chunk B budget of 68,000 bytes, with headroom for chunks C–D.

## What is NOT done yet
Chunk C (police + combat + systems) and D (sim + polish) are still to
come. No seal, no submit. The recorder was alive at the end of this
chunk (PID 7539).
