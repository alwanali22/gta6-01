# CHUNK D REPORT — rewrite2 (sim autopilot + victory grade A + 9 shots + day cycle + safehouse)

Chunk D, on top of chunk C (0a6679e). Recording R4 01a1f3f3 (recorder PID 13562,
verified alive before every phase: read brief, write code, probe, dossier,
commit). Do NOT seal / submit / push — the main agent does that.

## Result: VICTORY, GRADE A, $72,801 — all seeds

Headless probe (Playwright/Chromium, `probe-chunk-d.py`, logs in `probe-logs/`):

| seed | screen | missions | earned | grade | time | near-misses | hash |
|------|--------|----------|--------|-------|------|-------------|------|
| 1 | victory | 10/10 | $72,801 | **A** | 620s | 16 | d4c5e17a |
| 2 | victory | 10/10 | $72,801 | **A** | 620s | 16 | d4c5e17a |
| 3 | victory | 10/10 | $72,801 | **A** | 620s | 16 | d4c5e17a |
| 1 repeat | victory | 10/10 | $72,801 | **A** | 620s | 16 | d4c5e17a |

- **Hash repeat MATCH** (d4c5e17a vs d4c5e17a) — the run is deterministic.
- Income mix (seed 1): missions $30,600 + gigs $3,701 + near-miss $38,500
  (16 near-misses) + events $0 = $72,801. Grade A needs ≥ $60,000.
- Mission timeline (all seeds identical): M1 7s, M2 20s, M3 35s, M4 52s,
  M5 80s, M6 (race) 125s, M7 225s, M8 244s, M9 (shadow) 269s,
  M10 (heist) 619s → victory.
- **Save/load round-trip: PASS** (cash/earned/done/nitro/timeOfDay/gig all match
  after reload, incl. new chunk D fields).
- **Safehouse: ALL PASS** — enter (interior=true), garage opens from inside,
  back to play, exit (interior=false).
- **9/9 shots load clean** (`__shotReady`, 0 console error, 0 pageerror), all
  < 262,144 B. Day cycle: sunset luminance 30.6, night 29.9 → **DARKER ✓**.
- **Console/page errors: 0.**
- `node --check` every JS file: OK. `makefun check --worktree`: **ok: true,
  failed: []** (25 checks; transcript checks skip until submit, as expected).
- **Dossier rebuild 2× byte-identical** (sha256 `edfbd7f4…`, file 620,565 B,
  text **149,387 B**, +42,194 B vs A+B+C 107,193 B — inside the ≤ ~42,500 B
  target; **14,453 B left for chunk E** of the 163,840 B cap; 4 images).

## What was built (all fresh, from this brief + the chunk A/B/C interfaces)

- **`game/src/sim.js` (NEW, ~28 KB): deterministic autopilot.** Plays through
  `input.inject` / `window.__solmar` at fixed dt (1/60), reproducible from
  seed; driven by `window.__solmar.fastForward(n)`; in sim mode (`?sim=1&seed=N`)
  the rAF loop renders only, never steps logic. Brain: title → E, draft →
  Digit1 (smart pick, see below), standoff → drive/walk to point + fire,
  vault hold → park (see below), race → checkpoints with nitro, shadow →
  intercept 15u ahead of the convoy, branch → SILENT if heat<1 else LOUD,
  gig/event detour if within 300u, otherwise mission target. Manhattan route
  planner `routeTo()` (axis-aligned, road centrelines, same-road fast path);
  drive controller (steer/throttle/brake-before-corners/nitro on straights/
  reverse-to-turn when |err|>1.1 at speed<3); on-foot controller uses
  ABSOLUTE heading keys (up=+z, right=+x) plus a road route (see below).
  Run hash = djb2 over [done, earned, cash, nearMisses, perks,
  missionGrades, maxHeat, bestChain, career, floor(time)]. Income tracking
  {missions, gigs, events, nearMiss, other} attributed per-step from deltas.
  Probe hooks: `__solmar.sim.setGoal('safehouse'|'exit')`, `summary()`,
  `hash()`, `result()`, `active()`.
- **Gigs wired as a REAL mechanic in `missions.js`** (config GIGS existed but
  was unused): spawn after 5s then every 5s after completion/expiry, seeded
  rng(7777) separate from events rng(4242); TTL 45s, arrive r=8, payouts
  PARCEL $450 / SHADOW CAB $350 / STUNT JUMP $600 (×1.25 with SMOOTH TALKER);
  toast + gold-diamond minimap marker. `renderDraft` exported for the draft shot.
- **Day cycle:** `state.timeOfDay` = done.length/10 (0=sunset → 1=night,
  deterministic); `render.js` lerps sun color/intensity/position, sky, fog,
  ambient, hemi, sun disc (sinks), window + lamp-glow colors by timeOfDay.
- **District accents:** window instance colors lean toward the district tint;
  lamp glows tinted per district; 4 tall neon pylons (one per district
  center, tint color + white cap); ground texture already district-tinted.
- **Safehouse interior:** room group at (-160,-40) — floor 16×12, walls h=4.5
  with south door gap, bed, table, neon sign, warm point light; hidden until
  entered. Enter: on foot within 8u + tap E → teleport to room center,
  `world.setInterior(true)`; exit: tap E at z>-36 → teleport outside
  (-160,-30). Player clamped to room bounds while interior. Interior camera =
  high chase cam (7.5 high, 6u back) looking over roofless walls. Garage (B)
  + pause/save (P) work from inside since screen stays ‘play’.
- **9 shots:** `shots.json` expanded to 9 scenes (chase, start, draft,
  victory, heli, standoff, garage, night, safehouse); `stageShot()` extended
  for 5 new scenes + draft now sets draftOptions + renderDraft, victory now
  stages real grade-A numbers (earned $72,801, 10/10, 16 near-misses,
  bestChain 5) and calls showVictory.
- **Save:** `save.js` FIELDS += ‘timeOfDay’, ‘gig’; `loadSlot` sets
  interior=false; `loadGame` resets interior + setInterior(false).
- **`main.js`:** imports sim + PERKS + renderDraft; simMode/simSeed from URL
  params; `step()` calls simUpdate first when simMode, updates timeOfDay,
  handles safehouse enter/exit; `frame()` skips step() in simMode; `startRun`
  calls resetSim(seed, city) when simMode; `__solmar.fastForward(n)` steps
  n×(1/60s) and returns simSummary.

## Deviations / decisions (must be reported)

- **SCREENSHOT CAP — the brief's "9 shots in the dossier" is impossible:**
  `competition.yaml` + `vendor/makefun-game.ts` cap dossier screenshots at
  **4** (`main.ts` `screenshots: { max: 4, max_bytes: 262144 }`). All 9 scenes
  are stageable via `?shot=` and probed (screenshots in `probe-logs/`), but
  only the 4 existing dossier shots (1-chase, 2-start, 3-draft, 4-victory —
  re-shot to show new features) go in `screenshots/`. `shots.json` with 9
  scenes is just a game data file; the kit CLI has no shots.json validation.
- **Smart draft pick (not always Digit1):** the sim picks the highest-value
  perk offered — ARMOR > LUCKY > SMOOTH > GHOST > NERVES, else first.
  ARMOR keeps the car alive through the heat-5 escape; LUCKY doubles
  near-miss payouts (the grade-A lever). LUCKY is confirmed present in
  the final run by the near-miss math alone: 16 near-misses = $38,500
  requires the ×2 multiplier (without it the max at chain 5 is
  $1,250 × 16 = $20,000).
- **Near-miss farm before the final heist (the grade-A lever):** missions pay
  $30,600 total and the final heist $5,000, so the sim needs $56,000 banked
  before mission 10. When mission===9 and earned < $56,000 (prep1/prep2
  only — never vault/escape), the sim farms traffic: drives at the nearest
  traffic car (skipping its 4s near-miss cooldown) and passes within 7u.
  Chain is 5 after 9 missions and LUCKY doubles it, so each near-miss is
  **$2,500** (250 × 5 × 2). 16 near-misses = $38,500. The farm overshoots
  the $56,000 line (the sim kept earning near-misses incidentally while
  driving mission 9) — final $72,801, comfortably grade A.

## Fixes made during the probe cycle (each found by tracing, not guessing)

1. **Sim stuck on title:** `resetSim()` was only called inside `startRun()`
   after E, but `sim.active` was false until then, so the sim never pressed
   E. Fix: `main.js` boot() calls `resetSim(simSeed, city)` immediately when
   `?sim=1`; `startRun()` re-seeds with the same seed (determinism unaffected).
2. **Sim stuck next to the Comet, held E forever, busted at ~76s:**
   `setKeys()` compared against the sim's shadow `sim.held` set, which
   `resetSim()` cleared while E stayed held in real input — re-inject
   produced no pressed edge, so `player.js` never saw `tapped('interact')`.
   Fix: `setKeys()` syncs against `input.held(a)` directly; `sim.held`
   removed. Also the stuck watch was per-step (<2u per 1/60s step fires even
   at full speed) — rewrote to a 1-second window (<1u in 1s, sustained 10s).
3. **All 9 shots identical (title screen):** probe used `?shot=<name>` (e.g.
   `1-chase`) but `stageShot()` matches the `shot` field (e.g. `chase`).
   Fix: probe uses (name, shot) pairs from shots.json. Probe also counted
   SwiftShader "GPU stall due to ReadPixels" console.warnings as errors —
   now counts only console.error + pageerror.
4. **Car reversed off-road into a building at (-150,8), busted:** `routeTo()`
   always routed via the nearest intersection, sending the car 20u south at
   mission 1 start (target straight north on the same road x=-160). Fix:
   same-road-line fast path (drive straight if player+target share a
   vertical/horizontal line within 6u). Steering dead zone tightened
   0.12 → 0.05. Route test: 1,075 routes, 0 bad.
5. **Wedged at (-160,24), hp 100→76→54:** a building overlapped road x=-160
   (at (-144.857, 34.886), w 25.84, d 17.54). Root cause in `city.js`
   `buildCity()`: centre margin 14u from block edge allowed a 26u-wide
   tower's edge 1u from the road centreline. Fix: margin = roadHalf + 3.4,
   footprint fully out of corridors. Verified: **0 buildings overlap any
   road line** (x and z, -400 to 400 step 80).
6. **Gig detour deadlock:** old routeTo snapped BOTH axes to the nearest
   intersection — a gig spawning mid-drive north sent the car 15u south to
   z=0, hard brake + reverse spun it off-road facing east, deadlocked at
   speed ~0. Fix: snap only the off-grid axis; route along the CURRENT road
   line to the target's intersection, then across — never back along a road
   already passed. Plus a stationary creep fix (if speed <3 and facing away,
   also add ‘up’ so steering can turn the car).
7. **Mission 3 NEON RUN wedge at (136,-38), busted at 140s:** the car needed
   a ~135° turn at the corner (160,-80) → (-80,-240) and crept forward at
   3 u/s while turning at 0.2 rad/s, driving into a building. Fix: the
   reverse-to-turn threshold lowered 2.2 → 1.1 rad (the old threshold left a
   63–126° dead zone); the creep-forward was removed (now redundant).
8. **Mission 5 PALM HEIST vault never completed (timer max 2.2s, 1200s
   stall):** the sim orbited the vault at r=5, but the car's minimum turning
   radius is top/(1.9×grip) = 24u for the Comet — a 5u orbit is physically
   impossible, so the car swung out to r=12 and the timer kept resetting.
   Fix: **PARK on the vault** (drive in at cruise 8, brake, hold still).
   Parking is safe: a bust needs heat > 0 AND a unit within 4.5u AND speed
   < 2 for 2s, and heat is 0 when the vault phase starts; units spawn
   60–120u away and cannot close in the 5s the hold takes. (Same fix
   applies to mission 9's vault.)
9. **Mission 6 MIDNIGHT MILE race: stuck at (253,-206), timed out, busted
   at 420s:** the race resets if the fastest rival (21 u/s) finishes the
   1920u loop first — **91.4s limit**. The car overshot the NE corner
   (240,-240) at 46 u/s, wedged against a building, and the 180° reversal
   at the start line flung it off the map (z=-396). Fixes: (a) `routeTo`
   `pushLine` — intermediate grid intersections every 80u along long legs,
   so the angular error to a 483u-away waypoint ( <0.03 rad even 14u off the
   road, inside the 0.05 dead zone) no longer lets lateral drift accumulate
   uncorrected; (b) nitro now keys on distance to the next sharp turn
   (turnDist scan), not wdist, since waypoints are now ≤80u apart; (c) race
   branch in `pickGoal`: cruise 46 to the start line but `slowNear` 120u
   (cap 8) so the car arrives gently, stops, and reverse-to-turns in place;
   cruise 36 on the loop (fast enough for ~80s, slow enough to stay on the
   road); no gig/event detours during the race.
10. **Mission 8 GHOST CONVOY shadow never completed, busted at 402s:** the
    old cruise-14 tail never caught up (closing at 2 u/s from 250u behind =
    125s) and the arrive-brake stopped the car dead within 25u — speed < 2
    with police on top of it = busted. Fix: **intercept, not chase** — aim
    15u ahead of the convoy along its direction of travel (computed from
    its step-to-step movement, stored in `sim.prevConvoy`); cruise 30 to
    close, `slowNear` 40u → 12 to match the convoy once close, and
    `follow: true` (never brake on arrival — a moving target must be
    trailed, not stopped at). The shadowTimer is cumulative (no reset), so
    trailing at ~15u ticks it to 5s.
11. **Mission 9 THE LONG WAY HOME: car wrecked during the escape, player
    stuck on foot at (-148,-214) for 600s:** the Comet entered mission 9 at
    48 hp, took a 24-damage building hit during prep1 (it was off-road at
    (398,-80) after the shadow), and the heat-5 escape finished it. The
    player then chased a moving traffic car on foot (futile — it outruns
    the player) in a straight line into a building. Fixes: (a) smart draft
    (ARMOR when offered); (b) **on-foot road navigation** — new
    `walkRouteKeys()` follows the `routeTo` waypoints on roads instead of
    walking straight at the goal; (c) **escape on foot** — when on foot
    during mission 9's escape, `pickGoal` returns the safehouse (the mission
    target) instead of a car, because the escape completes when the PLAYER
    reaches the safehouse, car or no car. In the final run the car still
    wrecked at t≈400 (hp 0), the sim stole a fresh car (hp 100 at t=600)
    and finished — the recovery path works either way.

## Determinism notes

- No `Math.random` in game logic (only `audio.js` noise buffer); all RNG
  seeded (traffic 20240, events 4242, gigs 7777, police 777, city 1337);
  race rivals are pure functions of raceClock. Fixed-dt stepping ⇒
  deterministic. Hash repeat MATCH on seed 1 (d4c5e17a).
- Police/bust facts the sim relies on: heat decays only when unseen
  (0.08/s × rank mult, ×2 GHOST PLATES, ×0.5 if flags known); bust needs a
  unit <4.5u AND player speed<2 for 2s; during a standoff `updatePolice`
  returns early (no bust, units don't damage the player); standoff clear
  +$600 +2 heat, loss +1 heat; fire adds +0.12 heat per HIT on units (not
  on boss); heli at heat≥3, roadblocks at heat≥4 (hit only if speed>10,
  −25 HP); police units run 16 u/s; traffic bump is 4 damage at d<3.4,
  near-miss is $250 × chain (×2 LUCKY) at d<7, speed>12, 4s cooldown per
  traffic car; chain = 1 + 0.5 per mission completed, capped at 5.

## Files changed (chunk D)

- NEW `game/src/sim.js` (~28 KB) — the autopilot.
- `game/src/main.js` — sim wiring (boot resetSim, step/frame simMode,
  safehouse enter/exit, fastForward).
- `game/src/missions.js` — gigs wired as a real mechanic.
- `game/src/city.js` — building margin fix (no building overlaps a road).
- `game/src/render.js` — day-cycle lerp + district accents + safehouse
  interior + neon pylons.
- `game/src/save.js` — new fields (timeOfDay, gig), interior reset on load.
- `shots.json` — 9 scenes. `screenshots/` — 4 dossier shots re-shot.
- `probe-chunk-d.py` + `probe-logs/` — probe harness (NOT committed; dev
  artifacts, like earlier chunks' probe files). `out/` — build output
  (regenerated by `bun main.ts`, NOT committed).

## Remaining for chunk E (main agent)

- Verify, `makefun check` with exactly the submitted recordings' sessions,
  authorship ≥60%, commit owner.json, README badges + GitHub About BEFORE
  submit, push to alwanali22/gta6-01, quota check, fresh COMPARE-FIRST,
  submit with `--recording R1,R2,R3,R4` + full run-record flags + title.
- **Hard limit: seal by night of 23 Nov.** Dossier headroom for chunk E:
  **14,453 B** (text 149,387 B of 163,840 B cap).
- **Screenshot cap reminder:** only 4 dossier images are allowed; the 9
  scenes stay stageable via `?shot=` but the dossier takes 4.
- The sim's victory screen shows the REAL grade-A numbers ($72,801,
  10/10, 16 near-misses, bestChain 5) — never invented numbers.
