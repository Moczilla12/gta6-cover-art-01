// Wires the Solmar Cover Lab editor: state, history (undo/redo), panel picking,
// drag-to-pan and scroll-to-zoom per panel, sample photos and uploads, lettering,
// grades, layouts and PNG export in four post sizes. A `?shot=` query sets up a
// fixed scene for a screenshot instead (./shots.js).
import { drawCover, layoutPanels, LAYOUTS, GRADES, SIZES, SAMPLES, defaultState } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('preview');
const $ = (id) => document.getElementById(id);
const images = new Map(); // photo key -> HTMLImageElement
const uploads = new Map(); // upload key -> { name }
let state = defaultState();
let geo = null;
let history = [];
let hIndex = -1;
let activePhoto = 'car';
let drag = null;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSample(key) {
  if (images.has(key)) return images.get(key);
  const s = SAMPLES.find((x) => x.key === key);
  if (!s) return null;
  const img = await loadImage(s.file);
  images.set(key, img);
  return img;
}

async function ensureImages() {
  const keys = [...new Set(state.panels.map((p) => p.src))];
  await Promise.all(keys.map((k) => loadSample(k).catch(() => null)));
}

/** Draws the cover and the selected-panel outline, and refreshes the status line. */
function render() {
  geo = drawCover(canvas, state, images);
  const ctx = canvas.getContext('2d');
  const sel = geo.panels[state.selected];
  if (sel && geo.band && !document.body.classList.contains('shot-cover')) {
    ctx.save();
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = Math.max(3, sel.w * 0.008);
    ctx.setLineDash([14, 8]);
    ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
    ctx.setLineDash([]);
    ctx.restore();
  }
  const size = SIZES[state.size];
  const panel = state.panels[state.selected];
  const name = uploads.get(panel.src)?.name ?? SAMPLES.find((s) => s.key === panel.src)?.name ?? 'Your photo';
  $('statusbar').textContent =
    `${LAYOUTS[state.layout].name} · ${GRADES[state.grade].name} · ${size.label} — ` +
    `Panel ${state.selected + 1} · ${name} — drag to pan, scroll to zoom`;
  $('panelHint').textContent = `Panel ${state.selected + 1} · ${name} — drag to pan · scroll to zoom · drop a photo here`;
  syncControls();
}

function snapshot() { return JSON.stringify(state); }

function pushHistory() {
  history = history.slice(0, hIndex + 1);
  history.push(snapshot());
  if (history.length > 60) history.shift();
  hIndex = history.length - 1;
  updateUndoRedo();
}

function restore(i) {
  state = JSON.parse(history[i]);
  hIndex = i;
  ensureImages().then(render);
  updateUndoRedo();
}

function updateUndoRedo() {
  $('undo').disabled = hIndex <= 0;
  $('redo').disabled = hIndex >= history.length - 1;
}

function undo() { if (hIndex > 0) restore(hIndex - 1); }
function redo() { if (hIndex < history.length - 1) restore(hIndex + 1); }

/** Keeps a panel's pan inside the photo so no gap ever shows. */
function clampCrop(panel, rect) {
  const img = images.get(panel.src);
  if (!img) return;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const pw = img.naturalWidth * base * panel.zoom;
  const ph = img.naturalHeight * base * panel.zoom;
  const mx = Math.max(0, (pw - rect.w) / 2 / rect.w);
  const my = Math.max(0, (ph - rect.h) / 2 / rect.h);
  panel.ox = Math.min(mx, Math.max(-mx, panel.ox));
  panel.oy = Math.min(my, Math.max(-my, panel.oy));
}

function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (canvas.width / r.width),
    y: (e.clientY - r.top) * (canvas.height / r.height),
  };
}

function panelAt(p) {
  if (!geo) return -1;
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const r = geo.panels[i];
    if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
  }
  return -1;
}

/** Puts the active photo into a panel (and re-renders). */
function assignPhoto(index, key) {
  state.panels[index] = { src: key, zoom: 1, ox: 0, oy: 0 };
  state.selected = index;
  ensureImages().then(render);
  pushHistory();
}

function buildThumbs() {
  const box = $('thumbs');
  box.innerHTML = '';
  const all = [...SAMPLES.map((s) => ({ key: s.key, name: s.name, file: s.file }))];
  for (const [key, u] of uploads) all.push({ key, name: u.name, file: null, upload: true });
  for (const s of all) {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'thumb' + (s.key === activePhoto ? ' active' : '');
    d.title = s.name;
    const img = document.createElement('img');
    img.alt = s.name;
    img.src = s.upload ? images.get(s.key)?.src ?? '' : s.file;
    d.appendChild(img);
    const lab = document.createElement('span');
    lab.textContent = s.name;
    d.appendChild(lab);
    d.addEventListener('click', () => {
      activePhoto = s.key;
      buildThumbs();
      assignPhoto(state.selected, s.key);
    });
    box.appendChild(d);
  }
}

function buildPills() {
  const lb = $('layouts');
  lb.innerHTML = '';
  for (const [key, l] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill' + (state.layout === key ? ' active' : '');
    b.textContent = l.name;
    b.addEventListener('click', () => {
      state.layout = key;
      state.selected = 0;
      render();
      pushHistory();
      buildPills();
    });
    lb.appendChild(b);
  }
  const gb = $('grades');
  gb.innerHTML = '';
  for (const [key, g] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (state.grade === key ? ' active' : '');
    b.style.background = g.swatch;
    b.title = g.name;
    b.setAttribute('aria-label', g.name);
    b.addEventListener('click', () => {
      state.grade = key;
      render();
      pushHistory();
      buildPills();
    });
    gb.appendChild(b);
  }
  const fb = $('titleFills');
  fb.innerHTML = '';
  for (const [key, label] of [['sunset', 'Sunset gradient'], ['white', 'Solid white'], ['halftone', 'Halftone dots']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill' + (state.titleFill === key ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      state.titleFill = key;
      render();
      pushHistory();
      buildPills();
    });
    fb.appendChild(b);
  }
  const sb = $('sizes');
  sb.innerHTML = '';
  for (const [key, s] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pill' + (state.size === key ? ' active' : '');
    b.textContent = s.label;
    b.addEventListener('click', () => {
      state.size = key;
      render();
      pushHistory();
      buildPills();
    });
    sb.appendChild(b);
  }
  const hs = $('heatStars');
  hs.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'star' + (i <= state.heat ? ' on' : '');
    s.textContent = '★';
    s.setAttribute('aria-label', `${i} stars`);
    s.addEventListener('click', () => {
      state.heat = i;
      render();
      pushHistory();
      buildPills();
    });
    hs.appendChild(s);
  }
}

function syncControls() {
  $('inTitle').value = state.title;
  $('inSubtitle').value = state.subtitle;
  $('inTagline').value = state.tagline;
  $('inPlace').value = state.place;
  $('inSticker').value = state.sticker;
  $('inRibbon').value = state.ribbon;
  $('ckSkyline').checked = state.skyline;
  $('ckGrain').checked = state.grain;
  $('ckVignette').checked = state.vignette;
  const panel = state.panels[state.selected];
  $('zoom').value = panel ? panel.zoom : 1;
  document.querySelectorAll('#layouts .pill').forEach((b, i) => b.classList.toggle('active', Object.keys(LAYOUTS)[i] === state.layout));
  document.querySelectorAll('#grades .swatch').forEach((b, i) => b.classList.toggle('active', Object.keys(GRADES)[i] === state.grade));
  document.querySelectorAll('#sizes .pill').forEach((b, i) => b.classList.toggle('active', Object.keys(SIZES)[i] === state.size));
}

function bindLettering(id, key) {
  $(id).addEventListener('input', (e) => {
    state[key] = e.target.value;
    render();
  });
  $(id).addEventListener('change', pushHistory);
}

/** Renders the cover at a post size on a fresh canvas and returns its PNG blob. */
function exportSize(sizeKey) {
  const off = document.createElement('canvas');
  const saved = state.size;
  state.size = sizeKey;
  drawCover(off, state, images);
  state.size = saved;
  return new Promise((resolve) => off.toBlob((b) => resolve(b), 'image/png'));
}

async function downloadExport(sizeKey) {
  const blob = await exportSize(sizeKey);
  const a = document.createElement('a');
  const s = SIZES[sizeKey];
  a.href = URL.createObjectURL(blob);
  a.download = `cover-${sizeKey}-${s.w}x${s.h}.png`;
  a.click();
  $('status').textContent = `Saved ${a.download}`;
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

let uploadSeq = 0;
async function addUpload(file) {
  const key = `upload:${++uploadSeq}`;
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  images.set(key, img);
  uploads.set(key, { name: file.name.replace(/\.[^.]+$/, '').slice(0, 14) || 'Your photo' });
  activePhoto = key;
  buildThumbs();
  assignPhoto(state.selected, key);
}

function shuffle() {
  const rnd = Math.random;
  const layoutKeys = Object.keys(LAYOUTS);
  state.layout = layoutKeys[Math.floor(rnd() * layoutKeys.length)];
  const gradeKeys = Object.keys(GRADES);
  state.grade = gradeKeys[Math.floor(rnd() * gradeKeys.length)];
  const keys = [...SAMPLES.map((s) => s.key), ...uploads.keys()];
  const count = LAYOUTS[state.layout].count;
  for (let i = 0; i < count; i++) {
    state.panels[i] = { src: keys[Math.floor(rnd() * keys.length)], zoom: 1, ox: 0, oy: 0 };
  }
  state.selected = 0;
  ensureImages().then(render);
  pushHistory();
}

function bindEvents() {
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('shuffle').addEventListener('click', shuffle);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    }
  });
  bindLettering('inTitle', 'title');
  bindLettering('inSubtitle', 'subtitle');
  bindLettering('inTagline', 'tagline');
  bindLettering('inPlace', 'place');
  bindLettering('inSticker', 'sticker');
  bindLettering('inRibbon', 'ribbon');
  $('ckSkyline').addEventListener('change', (e) => { state.skyline = e.target.checked; render(); pushHistory(); });
  $('ckGrain').addEventListener('change', (e) => { state.grain = e.target.checked; render(); pushHistory(); });
  $('ckVignette').addEventListener('change', (e) => { state.vignette = e.target.checked; render(); pushHistory(); });
  $('zoom').addEventListener('input', (e) => {
    const panel = state.panels[state.selected];
    panel.zoom = Number(e.target.value);
    clampCrop(panel, geo.panels[state.selected]);
    render();
  });
  $('zoom').addEventListener('change', pushHistory);
  $('resetCrop').addEventListener('click', () => {
    const panel = state.panels[state.selected];
    panel.zoom = 1; panel.ox = 0; panel.oy = 0;
    render();
    pushHistory();
  });
  $('fillAll').addEventListener('click', () => {
    const count = LAYOUTS[state.layout].count;
    for (let i = 0; i < count; i++) state.panels[i] = { src: activePhoto, zoom: 1, ox: 0, oy: 0 };
    ensureImages().then(render);
    pushHistory();
  });
  $('addPhotos').addEventListener('change', async (e) => {
    for (const f of e.target.files) await addUpload(f);
    e.target.value = '';
  });
  $('exportOne').addEventListener('click', () => downloadExport(state.size));
  $('exportAll').addEventListener('click', async () => {
    for (const key of Object.keys(SIZES)) {
      await downloadExport(key);
      await new Promise((r) => setTimeout(r, 350));
    }
  });
  canvas.addEventListener('pointerdown', (e) => {
    const p = canvasPoint(e);
    const i = panelAt(p);
    if (i < 0) return;
    state.selected = i;
    drag = { x: p.x, y: p.y, ox: state.panels[i].ox, oy: state.panels[i].oy, moved: false };
    canvas.setPointerCapture(e.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = canvasPoint(e);
    const rect = geo.panels[state.selected];
    const panel = state.panels[state.selected];
    const dx = (p.x - drag.x) / rect.w;
    const dy = (p.y - drag.y) / rect.h;
    if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
    panel.ox = drag.ox + dx;
    panel.oy = drag.oy + dy;
    clampCrop(panel, rect);
    render();
  });
  canvas.addEventListener('pointerup', () => {
    if (drag?.moved) pushHistory();
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = canvasPoint(e);
    const i = panelAt(p);
    if (i < 0) return;
    state.selected = i;
    const panel = state.panels[i];
    panel.zoom = Math.min(4, Math.max(1, panel.zoom * Math.exp(-e.deltaY * 0.0012)));
    clampCrop(panel, geo.panels[i]);
    render();
  }, { passive: false });
  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    const p = canvasPoint(e);
    const i = panelAt(p);
    if (i >= 0) state.selected = i;
    for (const f of e.dataTransfer.files) {
      if (f.type.startsWith('image/')) await addUpload(f);
    }
  });
}

async function init() {
  buildThumbs();
  buildPills();
  bindEvents();
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      state,
      loadSample,
      ensureImages,
      render,
      applyState(patch) { Object.assign(state, patch); },
      setPanelPhotos(photos) {
        photos.forEach((key, i) => {
          if (state.panels[i]) state.panels[i] = { src: key, zoom: 1, ox: 0, oy: 0 };
        });
      },
      markReady() { window.__shotReady = true; },
    });
    buildThumbs();
    buildPills();
    render();
  } else {
    await ensureImages();
    render();
  }
  pushHistory();
}

init();
