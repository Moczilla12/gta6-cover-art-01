# Solmar Cover Lab — GTA-style cover art maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Moczilla12/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Moczilla12/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns any photo and a caption into GTA-style multi-panel cover art — hero photo plus a grid of panels, bold condensed lettering, a Vice City sunset or neon grade, starburst and sticker badges — exported as a PNG to share.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Everything runs offline: photos never leave the machine.

## What it does

- **8 layouts** — Hero + Four (default), Hero + Three, Nine Panel, Collage, Duo, Full Bleed, Tilted Snaps, Split Duo
- **5 sample photos** (boulevard, orange sports car, neon boardwalk, pier, rooftop) plus your own uploads — click a photo, then a panel to place it; drag to pan, scroll to zoom, drop files straight on the preview
- **4 grades** — Sunset, Neon, Golden, Vivid, applied consistently to every panel
- **Lettering** — title, script subtitle, tagline, place, sticker and ribbon text; title fill in sunset gradient, solid white or halftone dots; 1–5 star heat; skyline strip, film grain and vignette toggles
- **Export** — Square 1080 × 1080, Portrait 1080 × 1350, Wide 1920 × 1080, Story 1080 × 1920, one at a time or all four at once
- **Undo / Redo / Shuffle** — full history, Ctrl+Z / Ctrl+Shift+Z

## Layout

- `app/` — the static web app (`index.html`, `style.css`, `src/cover.js` renders the cover, `src/main.js` wires the editor, `src/shots.js` sets up fixed screenshot scenes)
- `main.ts` — hands the app in: copies `app/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — 1-cover.jpg (the cover), 2-editor.jpg (the editor), 3-cover.jpg (wide cover), 4-cover.jpg (collage portrait cover)

All artwork, lettering and fonts are original or system fonts — no Rockstar Games logo, artwork or fonts.

---

<sub>Entered on [make.fun](https://make.fun/?ref=scsgreax&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
