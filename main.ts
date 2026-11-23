// Solmar entry point (Node 22, standard library only): the game is the
// static files in game/ beside this file — index.html and its modules,
// no network at run time — and this script hands them in. It copies
// game/ and screenshots/ to the output folder and writes the dossier
// the judge reads, using the vendored make.fun library.
// Chunk A: foundation + world — 119 buildings, 12 missions ($37,000),
// 6 cars, 12 perks, 4 districts, 3 gigs, sunset-to-night render.
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer caps (reference/gate.json): text_max_bytes shapes the bytes;
// the rest refuse an entry the scorer would refuse — more than 4 shots,
// a shot over 256 KiB, more than 993 files or 48 MiB in game/, or a
// game path over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
