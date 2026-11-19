// Fixed scenes for screenshots: ?shot=editor shows the full editor with a sample
// cover loaded; ?shot=cover shows the cover alone, filling the viewport.
// Query knobs: layout, grade, size, title, subtitle, tagline, place, sticker,
// ribbon, photo (hero) and photos (comma list, one per panel, cycled).
// window.__shotReady is set once painted.
export async function runShot(shot, query, env) {
  const patch = {};
  if (query.get('layout')) patch.layout = query.get('layout');
  if (query.get('grade')) patch.grade = query.get('grade');
  if (query.get('size')) patch.size = query.get('size');
  if (query.get('title')) patch.title = query.get('title');
  if (query.get('subtitle')) patch.subtitle = query.get('subtitle');
  if (query.get('tagline')) patch.tagline = query.get('tagline');
  if (query.get('place')) patch.place = query.get('place');
  if (query.get('sticker')) patch.sticker = query.get('sticker');
  if (query.get('ribbon')) patch.ribbon = query.get('ribbon');
  if (query.get('heat')) patch.heat = Math.min(5, Math.max(1, Number(query.get('heat')) || 4));
  env.applyState(patch);
  const photos = (query.get('photos') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (query.get('photo')) photos[0] = query.get('photo');
  if (photos.length) env.setPanelPhotos(photos);
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await env.ensureImages();
  env.render();
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  env.markReady();
}
