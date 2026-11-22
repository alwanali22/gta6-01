// SOLMAR: SUNSET GETAWAY — harness entrypoint.
// Copies game/ and screenshots/ into the output directory and writes
// dossier.json with the kit's buildDossier, exactly as the scorer
// rebuilds it. Run: MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR || "/output");

if (!existsSync(join(root, "game", "index.html"))) {
  throw new Error("game/index.html is missing; nothing to hand in");
}
if (!existsSync(join(root, "screenshots"))) {
  throw new Error("screenshots/ is missing; the entry needs 3-4 shots");
}

mkdirSync(out, { recursive: true });
cpSync(join(root, "game"), join(out, "game"), { recursive: true });
cpSync(join(root, "screenshots"), join(out, "screenshots"), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(out, "dossier.json"), dossier);
console.log(`dossier written: ${join(out, "dossier.json")} (${dossier.length} bytes)`);
