// Renders the GTA-style multi-panel cover onto a canvas: photo panels, a sunset/neon
// grade, the title band with skyline, starburst, sticker, ribbon, barcode and logo mark.
// Pure canvas 2D, no network, no fonts beyond the system stack.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide · 1920 × 1080' },
  story: { w: 1080, h: 1920, label: 'Story · 1080 × 1920' },
};

export const LAYOUTS = {
  'hero-four': { name: 'Hero + Four', count: 5 },
  'hero-three': { name: 'Hero + Three', count: 4 },
  nine: { name: 'Nine Panel', count: 9 },
  collage: { name: 'Collage', count: 4 },
  duo: { name: 'Duo', count: 2 },
  full: { name: 'Full Bleed', count: 1 },
  tilted: { name: 'Tilted Snaps', count: 3 },
  split: { name: 'Split Duo', count: 3 },
};

export const GRADES = {
  sunset: {
    name: 'Sunset', filter: 'saturate(1.3) contrast(1.06) sepia(0.28) brightness(1.02)',
    tint: [[0, 'rgba(255,170,60,0.10)'], [1, 'rgba(255,60,140,0.20)']],
    band: ['#ff2e63', '#a4138f', '#2b0a3d'],
    swatch: 'linear-gradient(135deg,#ffb347,#ff2e63)',
  },
  neon: {
    name: 'Neon', filter: 'saturate(1.55) contrast(1.12) hue-rotate(-12deg)',
    tint: [[0, 'rgba(255,0,128,0.16)'], [1, 'rgba(0,220,255,0.14)']],
    band: ['#ff0090', '#6a1fb5', '#12082b'],
    swatch: 'linear-gradient(135deg,#ff0090,#00dcff)',
  },
  golden: {
    name: 'Golden', filter: 'sepia(0.5) saturate(1.35) brightness(1.06)',
    tint: [[0, 'rgba(255,190,60,0.16)'], [1, 'rgba(255,120,40,0.14)']],
    band: ['#ff9a3d', '#d6336c', '#2b0a3d'],
    swatch: 'linear-gradient(135deg,#ffd166,#ff7b2e)',
  },
  vivid: {
    name: 'Vivid', filter: 'saturate(1.7) contrast(1.15)',
    tint: [[0, 'rgba(255,80,180,0.10)'], [1, 'rgba(120,40,255,0.12)']],
    band: ['#ff2e88', '#7b2ff7', '#160a2e'],
    swatch: 'linear-gradient(135deg,#ff2e88,#7b2ff7)',
  },
};

export const SAMPLES = [
  { key: 'boulevard', name: 'Boulevard', file: 'samples/boulevard.jpg' },
  { key: 'car', name: 'Orange Chase', file: 'samples/car.jpg' },
  { key: 'boardwalk', name: 'Neon Boardwalk', file: 'samples/boardwalk.jpg' },
  { key: 'pier', name: 'Pier Day', file: 'samples/pier.jpg' },
  { key: 'rooftop', name: 'Rooftop', file: 'samples/rooftop.jpg' },
];

export const DEFAULT_PHOTOS = ['car', 'boulevard', 'boardwalk', 'pier', 'rooftop', 'car', 'boulevard', 'boardwalk', 'pier'];

/** The editor's starting state: the winning Hero + Four layout, sunset grade, square. */
export function defaultState() {
  return {
    layout: 'hero-four', grade: 'sunset', size: 'square',
    title: 'SUNSET STRIP', subtitle: 'chasing the last light',
    tagline: 'EVERY STREET HAS A STORY', place: 'SOLMAR BAY',
    sticker: 'COLLECTORS EDITION', ribbon: 'GOLDEN HOUR',
    titleFill: 'sunset', heat: 4,
    skyline: true, grain: true, vignette: true,
    panels: DEFAULT_PHOTOS.map((src) => ({ src, zoom: 1, ox: 0, oy: 0 })),
    selected: 0,
  };
}

/** Seeded random so grain, skyline and barcode are identical on every render. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Panel rectangles for a layout, plus the title band (null for Full Bleed). */
export function layoutPanels(layout, W, H) {
  const m = Math.max(6, Math.round(W * 0.012));
  const g = Math.max(6, Math.round(W * 0.012));
  const ratio = H / W;
  const bandH = layout === 'full' ? 0 : Math.round(H * (ratio > 1.15 ? 0.22 : ratio < 0.7 ? 0.30 : 0.26));
  const ax = m, ay = m, aw = W - 2 * m, ah = H - bandH - 2 * m;
  const P = [];
  if (layout === 'full') {
    P.push({ x: 0, y: 0, w: W, h: H });
  } else if (layout === 'hero-four') {
    const hw = Math.round((aw - g) * 0.58);
    P.push({ x: ax, y: ay, w: hw, h: ah });
    const gx = ax + hw + g, gw = aw - hw - g;
    const cw = Math.round((gw - g) / 2), ch = Math.round((ah - g) / 2);
    P.push({ x: gx, y: ay, w: cw, h: ch });
    P.push({ x: gx + cw + g, y: ay, w: cw, h: ch });
    P.push({ x: gx, y: ay + ch + g, w: cw, h: ch });
    P.push({ x: gx + cw + g, y: ay + ch + g, w: cw, h: ch });
  } else if (layout === 'hero-three') {
    const hw = Math.round((aw - g) * 0.58);
    P.push({ x: ax, y: ay, w: hw, h: ah });
    const gx = ax + hw + g, gw = aw - hw - g;
    const ch = Math.round((ah - 2 * g) / 3);
    P.push({ x: gx, y: ay, w: gw, h: ch });
    P.push({ x: gx, y: ay + ch + g, w: gw, h: ch });
    P.push({ x: gx, y: ay + 2 * (ch + g), w: gw, h: ch });
  } else if (layout === 'nine') {
    const cw = Math.round((aw - 2 * g) / 3), ch = Math.round((ah - 2 * g) / 3);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      P.push({ x: ax + c * (cw + g), y: ay + r * (ch + g), w: cw, h: ch });
    }
  } else if (layout === 'collage') {
    const hw = Math.round((aw - g) * 0.55);
    P.push({ x: ax, y: ay, w: hw, h: ah });
    const gx = ax + hw + g, gw = aw - hw - g;
    const th = Math.round((ah - g) * 0.55), bh = ah - th - g;
    P.push({ x: gx, y: ay, w: gw, h: th });
    const bw = Math.round((gw - g) / 2);
    P.push({ x: gx, y: ay + th + g, w: bw, h: bh });
    P.push({ x: gx + bw + g, y: ay + th + g, w: bw, h: bh });
  } else if (layout === 'duo') {
    const cw = Math.round((aw - g) / 2);
    P.push({ x: ax, y: ay, w: cw, h: ah });
    P.push({ x: ax + cw + g, y: ay, w: cw, h: ah });
  } else if (layout === 'tilted') {
    const pw = Math.round(aw * 0.40), ph = Math.round(ah * 0.88);
    const rots = [-4, 3, -2];
    for (let i = 0; i < 3; i++) {
      P.push({ x: ax + Math.round(i * aw * 0.30), y: ay + Math.round(ah * 0.06), w: pw, h: ph, rot: rots[i] });
    }
  } else if (layout === 'split') {
    const lw = Math.round((aw - g) * 0.5);
    P.push({ x: ax, y: ay, w: lw, h: ah });
    const gx = ax + lw + g, gw = aw - lw - g;
    const ch = Math.round((ah - g) / 2);
    P.push({ x: gx, y: ay, w: gw, h: ch });
    P.push({ x: gx, y: ay + ch + g, w: gw, h: ch });
  }
  const band = layout === 'full' ? null : { x: 0, y: H - bandH, w: W, h: bandH };
  return { panels: P, band, margin: m, gap: g };
}

/** Draws one photo panel: cover-fit with pan/zoom, the grade filter and tint, white border. */
function drawPanel(ctx, rect, img, panel, grade) {
  ctx.save();
  if (rect.rot) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate((rect.rot * Math.PI) / 180);
    ctx.translate(-rect.w / 2, -rect.h / 2);
  }
  ctx.beginPath();
  ctx.rect(rect.rot ? 0 : rect.x, rect.rot ? 0 : rect.y, rect.w, rect.h);
  ctx.clip();
  const ox = rect.rot ? 0 : rect.x, oy = rect.rot ? 0 : rect.y;
  if (img) {
    const g = GRADES[grade];
    const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
    const s = base * (panel ? panel.zoom : 1);
    const pw = img.naturalWidth * s, ph = img.naturalHeight * s;
    const cx = ox + rect.w / 2 + (panel ? panel.ox * rect.w : 0);
    const cy = oy + rect.h / 2 + (panel ? panel.oy * rect.h : 0);
    ctx.filter = g.filter;
    ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'overlay';
    const tint = ctx.createLinearGradient(ox, oy, ox, oy + rect.h);
    g.tint.forEach(([o, c]) => tint.addColorStop(o, c));
    ctx.fillStyle = tint;
    ctx.fillRect(ox, oy, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
  } else {
    const grad = ctx.createLinearGradient(ox, oy, ox + rect.w, oy + rect.h);
    grad.addColorStop(0, '#3a1c5c'); grad.addColorStop(1, '#1a0b2e');
    ctx.fillStyle = grad;
    ctx.fillRect(ox, oy, rect.w, rect.h);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, rect.w * 0.006);
  ctx.strokeRect(ox, oy, rect.w, rect.h);
  ctx.restore();
}

/** The biggest size that still fits `text` inside maxW, for the condensed title font. */
function fitSize(ctx, text, maxW, start) {
  let s = start;
  while (s > 12) {
    ctx.font = `900 ${s}px 'Arial Narrow','Liberation Sans Narrow','DejaVu Sans',sans-serif`;
    if (ctx.measureText(text).width * 0.84 <= maxW) return s;
    s -= 2;
  }
  return s;
}

function halftonePattern(ctx) {
  const p = document.createElement('canvas');
  p.width = 10; p.height = 10;
  const pc = p.getContext('2d');
  pc.fillStyle = '#ffffff'; pc.fillRect(0, 0, 10, 10);
  pc.fillStyle = '#1a0b2e';
  pc.beginPath(); pc.arc(5, 5, 2.2, 0, Math.PI * 2); pc.fill();
  return ctx.createPattern(p, 'repeat');
}

/** The giant condensed title, white / sunset-gradient / halftone, with a thick black outline. */
function drawTitle(ctx, text, cx, baselineY, size, fill) {
  ctx.save();
  ctx.translate(cx, baselineY);
  ctx.scale(0.84, 1);
  ctx.font = `900 ${size}px 'Arial Narrow','Liberation Sans Narrow','DejaVu Sans',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.03;
  ctx.strokeStyle = '#0d0518';
  ctx.lineWidth = size * 0.11;
  ctx.strokeText(text, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (fill === 'white') ctx.fillStyle = '#ffffff';
  else if (fill === 'halftone') ctx.fillStyle = halftonePattern(ctx);
  else {
    const gr = ctx.createLinearGradient(0, -size, 0, size * 0.2);
    gr.addColorStop(0, '#fff7d6'); gr.addColorStop(0.45, '#ffd166'); gr.addColorStop(1, '#ff5fa2');
    ctx.fillStyle = gr;
  }
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawPalm(ctx, x, baseY, h) {
  ctx.save();
  ctx.strokeStyle = '#0d0518';
  ctx.lineWidth = Math.max(2, h * 0.03);
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + h * 0.06, baseY - h * 0.6, x + h * 0.02, baseY - h);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, h * 0.022);
  const topX = x + h * 0.02, topY = baseY - h;
  for (let i = 0; i < 5; i++) {
    const a = (-Math.PI * 0.15) - (i * Math.PI * 0.17);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * h * 0.28, topY + Math.sin(a) * h * 0.28 - h * 0.06, topX + Math.cos(a) * h * 0.5, topY + Math.sin(a) * h * 0.5 + h * 0.14);
    ctx.stroke();
  }
  ctx.restore();
}

/** Dark city skyline with a few lit windows, plus palm silhouettes at the ends. */
function drawSkyline(ctx, x, y, w, h, seed) {
  const rnd = mulberry32(seed);
  ctx.fillStyle = '#0d0518';
  let cx = x;
  while (cx < x + w) {
    const bw = 14 + rnd() * w * 0.045;
    const bh = h * (0.35 + rnd() * 0.6);
    ctx.fillRect(cx, y + h - bh, bw, bh);
    ctx.fillStyle = 'rgba(255,209,102,0.85)';
    for (let wy = y + h - bh + 4; wy < y + h - 6; wy += 9) {
      for (let wx = cx + 3; wx < cx + bw - 3; wx += 8) {
        if (rnd() < 0.28) ctx.fillRect(wx, wy, 3, 4);
      }
    }
    ctx.fillStyle = '#0d0518';
    cx += bw + 2 + rnd() * 8;
  }
  drawPalm(ctx, x + w * 0.03, y + h, h * 0.95);
  drawPalm(ctx, x + w * 0.97, y + h, h * 0.8);
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI * i) / 5 - Math.PI / 2;
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** The 5-star heat rating. */
function drawStars(ctx, cx, y, size, heat) {
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, cx + (i - 2) * size * 1.25, y, size / 2, i < heat ? '#ffd166' : 'rgba(255,255,255,0.35)');
  }
}

/** Yellow starburst badge, e.g. EST. / 2026. */
function drawStarburst(ctx, cx, cy, r, lines) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  ctx.beginPath();
  const spikes = 16;
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.72;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd60a';
  ctx.fill();
  ctx.strokeStyle = '#0d0518';
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.stroke();
  ctx.fillStyle = '#0d0518';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(r * 0.30)}px 'DejaVu Sans',sans-serif`;
  lines.forEach((t, i) => ctx.fillText(t, 0, (i - (lines.length - 1) / 2) * r * 0.38));
  ctx.restore();
}

/** White barcode card with a caption line. */
function drawBarcode(ctx, x, y, w, h) {
  ctx.fillStyle = '#ffffff';
  roundRectPath(ctx, x, y, w, h, Math.min(6, h * 0.12));
  ctx.fill();
  const rnd = mulberry32(7);
  let bx = x + w * 0.08;
  ctx.fillStyle = '#111111';
  while (bx < x + w * 0.92) {
    const bw = 1 + rnd() * 4;
    if (rnd() < 0.75) ctx.fillRect(bx, y + h * 0.12, bw, h * 0.58);
    bx += bw + 1 + rnd() * 3;
  }
  ctx.fillStyle = '#111111';
  ctx.font = `700 ${Math.max(7, Math.round(h * 0.13))}px 'DejaVu Sans',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EST. 2026', x + w / 2, y + h * 0.86);
}

/** The SB logo mark with its edition line. */
function drawLogo(ctx, x, y, size) {
  ctx.fillStyle = '#0d0518';
  roundRectPath(ctx, x, y, size, size, size * 0.14);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.font = `900 ${Math.round(size * 0.42)}px 'DejaVu Sans',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SB', x + size / 2, y + size / 2 + 1);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `700 ${Math.round(size * 0.16)}px 'DejaVu Sans',sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SOLMAR BAY EDITION', x + size + 8, y + size * 0.36);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `400 ${Math.round(size * 0.14)}px 'DejaVu Sans',sans-serif`;
  ctx.fillText('MAKE YOUR OWN LEGEND', x + size + 8, y + size * 0.68);
}

/** The gradient title band: sunburst rays, skyline, place, title, script subtitle, tagline. */
function drawTitleBand(ctx, geo, state, W, H) {
  const band = geo.band;
  const g = GRADES[state.grade];
  const grad = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  grad.addColorStop(0, g.band[0]); grad.addColorStop(0.55, g.band[1]); grad.addColorStop(1, g.band[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(band.x, band.y, band.w, band.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(band.x, band.y, band.w, band.h);
  ctx.clip();
  const cx = W / 2, cy = band.y + band.h * 1.35;
  for (let i = 0; i < 16; i++) {
    const a0 = (Math.PI * i) / 8, a1 = a0 + Math.PI / 16;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a0 - Math.PI / 2) * band.h * 2.2, cy + Math.sin(a0 - Math.PI / 2) * band.h * 2.2);
    ctx.lineTo(cx + Math.cos(a1 - Math.PI / 2) * band.h * 2.2, cy + Math.sin(a1 - Math.PI / 2) * band.h * 2.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  if (state.skyline) drawSkyline(ctx, band.x, band.y + band.h * 0.88, band.w, band.h * 0.12, 11);
  ctx.fillStyle = '#ffd166';
  ctx.font = `700 ${Math.round(band.h * 0.085)}px 'DejaVu Sans',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '6px';
  ctx.fillText(`★  ${state.place.toUpperCase()}  ★`, W / 2, band.y + band.h * 0.16);
  ctx.letterSpacing = '0px';
  const titleSize = fitSize(ctx, state.title.toUpperCase(), W * 0.84, Math.round(band.h * 0.34));
  drawTitle(ctx, state.title.toUpperCase(), W / 2, band.y + band.h * 0.56, titleSize, state.titleFill);
  ctx.fillStyle = '#ff8fd1';
  ctx.font = `italic 700 ${Math.round(band.h * 0.115)}px Georgia,'Times New Roman',serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.subtitle, W / 2, band.y + band.h * 0.70);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 ${Math.round(band.h * 0.07)}px 'DejaVu Sans',sans-serif`;
  ctx.letterSpacing = '4px';
  ctx.fillText(state.tagline.toUpperCase(), W / 2, band.y + band.h * 0.82);
  ctx.letterSpacing = '0px';
  drawStars(ctx, W - geo.margin - band.h * 0.30, band.y + band.h * 0.16, band.h * 0.085, state.heat);
}

/** Full Bleed: the title floats over the photo on a bottom scrim. */
function drawFullBleedText(ctx, state, W, H) {
  const scrim = ctx.createLinearGradient(0, H * 0.40, 0, H * 0.88);
  scrim.addColorStop(0, 'rgba(10,4,20,0)');
  scrim.addColorStop(1, 'rgba(10,4,20,0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.40, W, H * 0.60);
  ctx.fillStyle = '#ffd166';
  ctx.font = `700 ${Math.round(H * 0.022)}px 'DejaVu Sans',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '6px';
  ctx.fillText(`★  ${state.place.toUpperCase()}  ★`, W / 2, H * 0.52);
  ctx.letterSpacing = '0px';
  const titleSize = fitSize(ctx, state.title.toUpperCase(), W * 0.88, Math.round(H * 0.105));
  drawTitle(ctx, state.title.toUpperCase(), W / 2, H * 0.66, titleSize, state.titleFill);
  ctx.fillStyle = '#ff8fd1';
  ctx.font = `italic 700 ${Math.round(H * 0.028)}px Georgia,'Times New Roman',serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.subtitle, W / 2, H * 0.725);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `700 ${Math.round(H * 0.018)}px 'DejaVu Sans',sans-serif`;
  ctx.letterSpacing = '4px';
  ctx.fillText(state.tagline.toUpperCase(), W / 2, H * 0.775);
  ctx.letterSpacing = '0px';
  drawStars(ctx, W / 2, H * 0.83, H * 0.022, state.heat);
}

/** Starburst, ribbon, sticker, barcode and logo mark, placed per layout. */
function drawBadges(ctx, geo, state, W, H) {
  const m = geo.margin;
  const full = !geo.band;
  const heroLike = ['hero-four', 'hero-three', 'collage', 'split'].includes(state.layout);
  // Starburst: at the hero/grid junction, or top-right for the other layouts.
  const sr = Math.round(W * 0.042);
  if (heroLike) {
    const hero = geo.panels[0];
    drawStarburst(ctx, hero.x + hero.w, hero.y + hero.h * 0.55, sr, ['EST.', '2026']);
  } else if (full) {
    drawStarburst(ctx, W * 0.90, H * 0.09, sr, ['EST.', '2026']);
  } else {
    drawStarburst(ctx, W - m - sr, m + sr, sr, ['EST.', '2026']);
  }
  // Ribbon: pink bar across the top-left of the hero panel.
  const p0 = geo.panels[0];
  const rh = Math.round(W * 0.030);
  const rw = Math.round(W * 0.17);
  ctx.save();
  ctx.translate(p0.x + 2, (full ? H * 0.06 : p0.y + p0.h * 0.07));
  ctx.rotate(-0.03);
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(0, 0, rw, rh);
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(rh * 0.52)}px 'DejaVu Sans',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.ribbon.toUpperCase(), rw / 2, rh / 2 + 1);
  ctx.restore();
  // Sticker: yellow pill on the last panel's bottom-right corner.
  const last = geo.panels[geo.panels.length - 1];
  const sh = Math.round(W * 0.034);
  ctx.save();
  ctx.font = `800 ${Math.round(sh * 0.5)}px 'DejaVu Sans',sans-serif`;
  const sw = ctx.measureText(state.sticker.toUpperCase()).width + sh * 1.6;
  const sx = last.x + last.w - sw - 8;
  const sy = full ? H - m - sh - 8 : last.y + last.h - sh - 8;
  ctx.translate(sx + sw / 2, sy + sh / 2);
  ctx.rotate(-0.03);
  ctx.fillStyle = '#ffd60a';
  roundRectPath(ctx, -sw / 2, -sh / 2, sw, sh, sh / 2);
  ctx.fill();
  ctx.strokeStyle = '#0d0518';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#0d0518';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.sticker.toUpperCase(), 0, 1);
  ctx.restore();
  // Barcode bottom-right, logo bottom-left.
  const bw = Math.round(W * 0.095), bh = Math.round((full ? H : geo.band.h) * 0.30);
  if (full) {
    drawBarcode(ctx, W - m - bw, H - m - bh, bw, bh);
    drawLogo(ctx, m, H - m - bh, bh);
  } else {
    drawBarcode(ctx, W - m - bw, geo.band.y + geo.band.h - m - bh, bw, bh);
    drawLogo(ctx, m, geo.band.y + geo.band.h - m - bh, bh);
  }
}

/** Deterministic film grain over the whole cover. */
function drawGrain(ctx, W, H) {
  const rnd = mulberry32(20261119);
  const n = Math.round((W * H) / 260);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rnd() * W, rnd() * H, 1.4, 1.4);
  }
}

/** Darkened corners. */
function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

/** Draws `state` onto the canvas at its export size; returns the panel geometry. */
export function drawCover(canvas, state, images) {
  const size = SIZES[state.size] || SIZES.square;
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  const W = size.w, H = size.h;
  ctx.fillStyle = '#160a2e';
  ctx.fillRect(0, 0, W, H);
  const geo = layoutPanels(state.layout, W, H);
  const count = LAYOUTS[state.layout].count;
  for (let i = 0; i < count; i++) {
    const rect = geo.panels[i];
    const panel = state.panels[i];
    const img = panel ? images.get(panel.src) : null;
    drawPanel(ctx, rect, img, panel, state.grade);
  }
  if (geo.band) drawTitleBand(ctx, geo, state, W, H);
  else drawFullBleedText(ctx, state, W, H);
  drawBadges(ctx, geo, state, W, H);
  if (state.grain) drawGrain(ctx, W, H);
  if (state.vignette) drawVignette(ctx, W, H);
  return geo;
}
