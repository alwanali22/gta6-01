# CHUNK B REPORT — rewrite3 — SOLMAR: SUNSET GETAWAY

Chunk B: driving + missions, on top of Chunk A commit 801a527.
Written fresh in this session under recording
01a20395-fd5a-7099-ac13-08b8758d66ba (recorder PID 33631,
alive before the first write and after the probe).

## What was built

- `game/src/player.js` — Milo on foot (walker mesh, walk/run) and
  the hotwire: hold E for 2.5 s beside a parked car (1.25 s with
  LUCKY GLOVE); letting go drains the progress. E again steps out
  of the car and parks it where it stands.
- `game/src/vehicles.js` — car mesh (hull, cabin, wheels,
  headlights, police light bar), `carSpec` with engine/brakes/NOS
  upgrades, 6 parked stealable cars (one per spec, near its home
  district), driving physics (accel, grip steering, nitro on
  Space, drain/refill), near-miss +$250 x chain (once per traffic
  car until it is 12 units away), building-crash damage and the
  WRECKED state (Milo ends up on foot).
- `game/src/traffic.js` — 12 seeded ambient cars on the road grid
  (multiples of 80), wrapping at the city edge, slowing when the
  player's car is close ahead on the same road.
- `game/src/pedestrians.js` — 14 seeded walkers on the sidewalks
  who stroll, turn at intersections, bob while walking, and
  scatter sideways when a fast car comes close.
- `game/src/missions.js` — all 12 story missions from config.js
  with real map targets: steal/deliver/escape/chase/heist,
  MIDNIGHT MILE (5 checkpoints in order, 100 s, rivals on their
  own clocks), TWO WAYS OUT (press 1 SILENT / 2 LOUD, loud adds
  wanted 2), GHOST CONVOY (shadow 8–40 m for 20 s), THE LONG WAY
  HOME (3 phases, boss MARCUS VOSS HP 100 draining 8/s in the
  boss zone), PIER PRESSURE (hold 20 s), plus perk drafts (pick 1
  of 3 distinct unowned perks, keyboard 1/2/3 or click), side
  gigs (G key, timed, paid on arrival), random events every
  ~42 s, and victory with the grade from cash actually earned
  (S $90k / A $60k / B $40k / C).
- Wiring in `game/src/main.js` (stand-in cars replaced by
  vehicles.js, drive mode, hotwire, exit, mission HUD from
  `missionHud`), `game/src/input.js` (choice keys 1/2/3, G for
  gigs), `game/index.html` (nitro meter, hotwire bar, clickable
  draft perks). Staged shots freeze player + mission logic so
  the cover keeps its promised speed/chain instead of decaying
  while the screenshot is taken; the `?shot=drive` scene stays
  live for probing.

Nothing was read, copied or carried over from repo/, rewrite/ or
rewrite2/ or any old commit.

## Probe results (headless Playwright, Chromium, 1280x800)

`node --check` passes on all 12 game sources + main.ts + serve.ts.
Zero network references in the authored sources.

| shot | __shotReady | console/page errors | state |
|---|---|---|---|
| cover | true | 0 | chase, Spyder, wanted 5, chain x2.0, $12,450, 87 mph |
| title | true | 0 | title screen, tagline + counts |
| marina | true | 0 | on foot by the pier, mission 1 live, wanted 0 |
| night | true | 0 | chase, Roadster, wanted 3, chain x3.0, $31,200, 64 mph |

Drive probe (`?shot=drive`, COMET): W held 2.5 s, speed
51 → 57 mph, car HP 100, nitro 100. 6 parked cars, 12 traffic
cars, 14 pedestrians, 119 buildings in every shot.

Mission walkthrough (teleport to each live objective, pick perk
1 after each): missions 1–6 paid $1,500/$2,200/$2,800/$3,000/
$4,500/$3,800; race won (5/5 checkpoints, $3,200); branch LOUD
chosen (wanted 0 → 2, $3,400); convoy shadowed to completion
($2,600, earned $27,000 at that point); heist phases 1–3 done,
boss HP 100 → 0 ($5,000, earned $32,000). Focused re-probe:
hotwire completed (COMET stolen, stolen=1, mode chase), exit
back on foot, PIER PRESSURE held to completion ($1,800),
final mission paid $3,200, VICTORY screen, grade C from real
earned cash $5,000 in that focused run (it skipped the earlier
missions), 0 console/page errors.

Headless note: the headless browser runs rAF at ~4–5 fps and
`dt` is capped at 0.05, so in-game timers run ~0.2x wall time
there (the 2.5 s hotwire needed ~12 s held, the 20 s hold
~100 s). On a real 60 fps browser the timers run at real
speed. This is a probe-environment artifact, not a game bug.

Screenshots (JPEG, 1280x800): 1-cover.jpg 49,507 B,
2-title.jpg 62,307 B, 3-marina.jpg 45,425 B, 4-night.jpg
43,247 B — all under the 256 KiB cap. Cover read back
visually: green Spyder centre, 2 police cars ahead plus one
further back, full HUD (5 stars, $12,450, CHAIN x2.0,
87 mph, NEAR MISS +250, NADIA line, minimap with
district names, UNITS IN PURSUIT: 3). Marina: Milo from
behind on the pier road, pier hut, red car, MISSION 1/12.

## Dossier

`MAKEFUN_OUTPUT_DIR=out node main.ts` run twice to different
dirs: byte-identical dossier.json, sha256
`e26ebfeffbeeb596de0d470b8694f3de8b98025d5517a531438ea3c2003b2c89`,
339,539 bytes total. Dossier text 68,515 bytes — Chunk A was
37,091, so Chunk B adds 31,424 bytes, inside the chunk B
budget of 68,000 new bytes (total headroom to 163,840:
95,325 B). Source files 12 (68,515 B text counted, game/
total ~750 KiB), vendored 1 (three.min.js). Dossier ≤1.5 MiB.

`makefun check --repo . --worktree` → ok: true, failed: [].
The four `submission` items (repo_owner, repo_created_after_
open, commit_in_repo, duplicate_snapshot) are the expected
pre-submit notes: owner.json and the push arrive with chunk E;
no submit was made.

## What is NOT in this chunk (later chunks)

Police pursuit + combat + respect HUD + audio + save (C), sim
+ polish + day-cycle scenes (D), final check + compare-first
(E). Garage buy/equip + chop shop, weapon wheel/fire, and the
save/load round-trip arrive with C. No submit, no seal — the
main agent seals and submits after compare-first.
