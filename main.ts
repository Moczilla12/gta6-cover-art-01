// Solmar Cover Lab — the entrypoint for make.fun's "Make GTA 6 Cover Art" bounty.
//
// What this program hands in: the cover maker that lives in app/ beside this file.
// The app is plain static files (index.html plus its own ES modules, no libraries and
// no network calls) that open in a desktop browser and work fully offline. It turns a
// photo and a caption into GTA-style multi-panel cover art: eight layouts (Hero+Four
// by default, plus Hero+Three, Nine Panel, Collage, Duo, Full Bleed, Tilted Snaps and
// Split Duo), five sample photos (two from the kit, three generated for this entry),
// four colour grades (Sunset, Neon, Golden, Vivid), full lettering controls (title,
// script subtitle, tagline, place, sticker and ribbon text, title fill, star rating,
// skyline strip, film grain and vignette) and PNG export in four post sizes
// (Square 1080x1080, Portrait 1080x1350, Wide 1920x1080, Story 1080x1920).
//
// The program runs on Node 22 with the standard library only. It copies app/ and
// screenshots/ into the output directory and asks the vendored make.fun library
// (vendor/makefun-app.ts) to write /output/dossier.json, the summary the judge reads.
// The first screenshot by name is the cover.
//
// Try the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the rest refuse an entry the scorer would refuse — more than 4 screenshots or one
// over 256 KiB; more than 993 files in app/ or 48 MiB of app files in all; or a path
// under app/ over 1000 bytes (app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
const SCREENSHOT_MAX_BYTES = 262144;
const SCREENSHOT_MAX_COUNT = 4;
const DOSSIER_TEXT_MAX_BYTES = 163840;

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The cover is the first screenshot by name, so the folder must hold at least one
// image, and every image must fit the scorer's per-file cap. Checking here, before
// the dossier is built, turns a silent rejection into a loud, readable error.
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).sort()
  : [];
if (shots.length === 0) {
  throw new Error('screenshots/ holds no image: put 3 or 4 screenshots in it, the first by name being the cover');
}
if (shots.length > SCREENSHOT_MAX_COUNT) {
  throw new Error(`screenshots/ holds ${shots.length} images, more than the ${SCREENSHOT_MAX_COUNT} the scorer accepts`);
}
for (const name of shots) {
  const bytes = statSync(join(shotsDir, name)).size;
  if (bytes > SCREENSHOT_MAX_BYTES) {
    throw new Error(`screenshots/${name} is ${bytes} bytes, over the ${SCREENSHOT_MAX_BYTES} byte cap per screenshot`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: DOSSIER_TEXT_MAX_BYTES,
    screenshots: { max: SCREENSHOT_MAX_COUNT, max_bytes: SCREENSHOT_MAX_BYTES },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Solmar Cover Lab handed in: ${shots.length} screenshot(s) (cover: ${shots[0]}), dossier written to ${join(out, 'dossier.json')}`);
