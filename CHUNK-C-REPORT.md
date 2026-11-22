# CHUNK C REPORT — rewrite3 — SOLMAR: SUNSET GETAWAY

Chunk C: police + combat + systems, on top of Chunk B commit 9263272.
Written fresh in this session under recording
01a20395-fd5a-7099-ac13-08b8758d66ba (recorder PID 33631,
alive before the first write and after the probe).

## What was built

- `game/src/police.js` — live pursuit: 4 named ground units
  (KITE-1 MARKSMAN, CRUISER-2 PATROL, VIPER-1 INTERCEPTOR,
  CRUISER-3 PATROL) + HAWK-1 AIR UNIT heli, wanted 1–5 roster,
  heli at wanted 3, roadblocks at wanted 4+, rams in a chase,
  bust on foot (unit within 5 m for 2.5 s), heat fade when all
  units are far (GHOST PLATES halves the wait, losing all heat
  counts as an evade, +60 rep). HUD reads the live names, roles
  and distances; pursuit line counts kinds
  ("UNITS IN PURSUIT: 5 — CRUISER x3, INTERCEPTOR x1, AIR UNIT x1").
- `game/src/combat.js` — weapon wheel (Q cycles owned weapons),
  fire (F) with per-weapon range/cooldown/ammo, downed units pay
  a $150 bounty and raise heat, police fire on Milo on foot at
  wanted 2+ (BULLETPROOF halves it, 0 HP is WASTED), and the
  STANDOFF lite event: on foot at wanted 4+, three units ring
  Milo at 14 m for 10 s; survive and heat drops to 2, +$500,
  +150 rep. Weapon shop gates: SMG needs STREET rep, RIFLE
  needs NOTORIOUS.
- `game/src/respect.js` — rep, rank-ups with toast, 6 feats
  (CAR THIEF, GHOST, NEAR-MISS KING, CHAIN MASTER, HUSTLER,
  SOLMAR LEGEND, +100 rep each), progress to the next rank.
- `game/src/audio.js` — 3 WebAudio synth stations (SUNSET FM
  96 bpm, NEON WAVE 122, DOCK TALK 80), switchable with R,
  siren wail that grows with wanted, sound toggle. No audio
  files, everything guarded so a headless or denied context
  can never throw.
- `game/src/save.js` — 3 slots in localStorage holding the
  whole run: cash, wanted, chain, rep, HP, day/time, mission
  index, radio, weapon, ammo, owned weapons, perks, grades,
  feats, stats, garage, position, driven car, and the mission
  runner (phase, checkpoint, timers, branch, boss HP, target).
  Slot labels show real progress ("ACT 1 — 0% — Old Town —
  $1,200"). Autosave to slot 1 on every banked mission; L/O
  quick-save/load, pause-screen buttons, title slots load.
- `game/src/garage.js` — buy/equip the 6 named cars, ENGINE /
  BRAKES / NOS upgrades 3 levels each at config prices, chop
  shop fences a car for 40% of its price (never the equipped
  or driven one). The driven car reads its upgrades here.
- `game/src/hud.js` — takes over syncHud/toast: cash, stars,
  district, rep bar, objective banner + lose condition, named
  unit lines, Milo HP bar, VOSS boss HP bar, weapon + ammo,
  radio, toast with a 4 s decay, Nadia dialogue, nitro,
  hotwire bar, draft perks, minimap. Also fills the STATS
  screen (mission letter grades, completion %, career
  counters, feats) and renders the garage rows.
- `game/src/missions.js` — mission letter grades recorded on
  completion from the real run: A for a clean getaway (wanted
  0), S for the race beaten by 5 s+ and the heist with Milo
  healthy, B otherwise.
- Wiring in `game/src/main.js` (police pool + audio + garage +
  stats + save/load keys B/T/L/O, weapon wheel Q, radio
  station switching, autosave, car re-link on load),
  `game/src/input.js` (B/T/L/O), `game/index.html` (unit
  panel, HP + boss bars, rep bar, STANDOFF banner, garage
  and stats screens, pause save/load buttons), `shots.json`
  (3 new stageable scenes: heli, standoff, garage).

## Real bugs found and fixed by the probe

- START froze the game: staged shots set `state.staged` and
  nothing ever cleared it, so clicking START on the title
  screen left the sim frozen. START and load now clear it.
  (The chunk B probe never clicked START, so this was live
  since chunk A.)
- Roadblocks yanked close units away: the block code took
  the first free unit even when it was on top of Milo and
  parked it 26 m ahead, so bust and police fire could never
  trigger. Only units farther than 30 m are pulled now.
- Pursuit orbit: at full speed a unit circled a stationary
  Milo at ~10–15 m forever and never closed for the bust.
  Units now slow down as they close (quarter speed under
  10 m), so the bust is reachable.

## Probe results (headless Playwright, Chromium, 1280x800)

`node --check` passes on all 19 game sources + main.ts +
serve.ts. Zero network references in the authored sources.
Probe `probe-chunk-c.py`: PROBE PASS, exit 0.

| shot | __shotReady | console/page errors | state |
|---|---|---|---|
| cover | true | 0 | chase, Spyder, wanted 5, chain x2.0, $12,450, 87 mph, KITE-1 22m |
| title | true | 0 | title screen, tagline + counts + slots |
| marina | true | 0 | on foot by the pier, mission 1 live, wanted 0 |
| night | true | 0 | chase, Roadster, wanted 3, chain x3.0, $31,200, HAWK-1 28m |
| heli | true | 0 | chase, Spyder, wanted 3, chain x2.5, $18,400, 72 mph, AIR UNIT |
| standoff | true | 0 | on foot, wanted 4, STANDOFF 10s, ring all 14m |
| garage | true | 0 | garage screen, $8,500, RIFLE (20), ROADSTER equipped |

Live tests (all on the drive/marina scenes, 0 errors):
pursuit — KITE-1 closed 36 m; fire — PISTOL HIT KITE-1,
60 HP left; radio — R cycled to NEON WAVE; garage via UI —
bought RIFLE $1,500 (ammo 20), bought DUSKLINE $3,200,
equipped it, parked the COMET and fenced it +$1,800, ENGINE
LV1 $900, final cash exactly $1,200; wheel — Q cycled to
RIFLE (20); save/load — L saved slot 1, cash set to $1,
O restored $1,200, slot label "ACT 1 — 0% — Old Town —
$1,200"; bust — VIPER-1 at 2 m, BUSTED screen; wasted —
hp 5 drained to 0, WASTED screen; regression — hotwire
COMET stolen (stolen=1, wanted 1, +20 rep), mission 1
paid $1,500, grade B recorded, draft picked, STATS screen
lists "1. THE MARINA JOB — B".

Visual read of the 3 new shots: heli shows the Spyder with
2 police cars ahead and the full named-unit HUD; standoff
shows Milo ringed by police cars with the red STANDOFF
banner and 10 s timer; garage shows all 6 cars with
BUY/EQUIP/FENCE/upgrades and the weapon shop with RIFLE
owned. The heli mesh itself sits outside the frame in the
heli shot — the HUD ("AIR UNIT DEPLOYED", "HAWK-1 AIR UNIT
20m") carries it; chunk D may reposition it.

Headless note (as in B): the headless browser runs rAF at
~4–5 fps and `dt` is capped at 0.05, so in-game timers run
~0.2x wall time there. On a real 60 fps browser the timers
run at real speed. This is a probe-environment artifact,
not a game bug.

## Dossier

`MAKEFUN_OUTPUT_DIR=out node main.ts` run twice to different
dirs: byte-identical dossier.json, sha256
`69c7e87e2b716a8704cd83d35f5428d5ed9387027c0878074a021c077bfd55eb`,
381,548 bytes total. Dossier text 109,154 bytes — Chunk B
was 68,515, so Chunk C adds 40,639 bytes, OVER the chunk C
budget of 28,000 by 12,639 (hud.js + police.js ran long).
Total headroom to 163,840 is 54,686 bytes: chunk D must
stay inside ~42,000 and chunk E minimal (owner.json +
README badges) to fit. Source files 19, vendored 1
(three.min.js). Dossier ≤1.5 MiB. Screenshots unchanged
(4 files, all under the 256 KiB cap).

`makefun check --repo . --worktree` → 4 passed, 0 failed,
17 skipped, 5 checked at submission. The 5 submission
items (repo_public, repo_owner, repo_created_after_open,
commit_in_repo, duplicate_snapshot) are the expected
pre-submit notes: owner.json and the push arrive with
chunk E; no submit was made.

## What is NOT in this chunk (later chunks)

Sim + polish + day-cycle scenes + safehouse (D), final
check + compare-first (E). No submit, no seal — the main
agent seals and submits after compare-first.
