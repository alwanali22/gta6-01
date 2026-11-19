import { buildDossier } from "./vendor/makefun-game.ts";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";

const caps = {
  screenshots: { max: 4, max_bytes: 262144 },
  text_max_bytes: 163840,
  game_max_files: 993,
  game_max_bytes: 50331648,
};

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync("game", join(outDir, "game"), { recursive: true });
cpSync("screenshots", join(outDir, "screenshots"), { recursive: true });

const dossier = await buildDossier(outDir, caps);
const dossierPath = join(outDir, "dossier.json");
writeFileSync(dossierPath, dossier);
console.log(`${dossierPath}: ${dossier.length} bytes`);
