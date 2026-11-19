// main.ts — entrypoint: wipe + copy game/ + screenshots/ into the output dir,
// then write the dossier the scorer will recompute byte-for-byte.
import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.env.MAKEFUN_OUTPUT_DIR || 'out';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync('game', join(out, 'game'), { recursive: true });
cpSync('screenshots', join(out, 'screenshots'), { recursive: true });
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log('dossier written:', out + '/dossier.json', dossier.length, 'bytes');
