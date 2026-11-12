/** Colosseum Poster pilot: compose a downloadable poster PNG from the live
 * Floors view. Every fact here is verified: dimensions from Wikipedia
 * (Colosseum, read 2026-11-12), everything else from stories/colosseum.json
 * and its cited sources. Nothing comes from the AI-generated reference
 * poster, which is style reference only. */

export interface PosterCapture {
  main: string;
  plan: string;
  section: string;
  facade: string;
  anchors: {x: number; y: number}[];
  viewWidth: number;
  viewHeight: number;
}

export interface PosterLayer {
  name: string;
  text: string;
}

export interface PosterTimelineEntry {
  date: string;
  label: string;
}

/** Key facts, verified 2026-11-12 against Wikipedia (Colosseum) and the
 * story file. Size 189 m by 156 m, 48 m high is Wikipedia, Physical
 * description, Exterior. Capacity 50,000 to 80,000 is Wikipedia and the
 * story intro. Built AD 70 to 80 is the Wikipedia infobox and the story
 * timeline. Materials and entrances are the story hotspots and Wikipedia. */
export const POSTER_FACTS: {label: string; value: string}[] = [
  {label: 'Built', value: 'AD 70 to 80, completed under Titus'},
  {label: 'Size', value: '189 m by 156 m, 48 m high'},
  {label: 'Capacity', value: '50,000 to 80,000 spectators'},
  {label: 'Materials', value: 'Travertine, tuff, concrete'},
  {label: 'Entrances', value: '76 numbered arches'},
];

export const POSTER_INTRO =
  'The largest amphitheatre ever built held up to 80,000 Romans.';

/** Timeline markers for the poster strip. Short labels drawn from the story
 * timeline in stories/colosseum.json; used only if the page did not inject
 * window.__TIMELINE__. */
export const POSTER_TIMELINE_FALLBACK: PosterTimelineEntry[] = [
  {date: 'AD 64', label: 'Great Fire of Rome'},
  {date: 'AD 70 to 72', label: 'Building begins'},
  {date: 'AD 80', label: 'Completed under Titus'},
  {date: 'AD 81 to 96', label: 'Hypogeum added'},
  {date: '1349', label: 'South wall falls'},
  {date: '2007', label: 'New7Wonders'},
];

export function firstSentence(text: string): string {
  const cut = text.indexOf('. ');
  return cut > 0 ? text.slice(0, cut + 1) : text;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(' ', max);
  return text.slice(0, cut > 40 ? cut : max) + '...';
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('poster image failed to load'));
    img.src = src;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): {dx: number; dy: number; scale: number} {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  return {dx, dy, scale};
}

/** Draw the poster onto a 1600 by 1000 canvas. The main image is the live
 * Floors render; the three insets are live renders of the real model. */
export async function composePoster(
  canvas: HTMLCanvasElement,
  capture: PosterCapture,
  layers: PosterLayer[],
  timeline: PosterTimelineEntry[],
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('poster canvas unavailable');
  const W = 1600;
  const H = 1000;
  canvas.width = W;
  canvas.height = H;
  const [mainImg, planImg, sectionImg, facadeImg] = await Promise.all([
    loadImage(capture.main),
    loadImage(capture.plan),
    loadImage(capture.section),
    loadImage(capture.facade),
  ]);

  // Backdrop: dark slate blue with a soft lighter glow behind the model.
  ctx.fillStyle = '#1e2936';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(760, 480, 60, 760, 480, 620);
  glow.addColorStop(0, 'rgba(88, 110, 135, 0.55)');
  glow.addColorStop(1, 'rgba(30, 41, 54, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const ink = '#eef3f6';
  const muted = '#b9c7d2';
  const gold = '#c9a86a';
  const line = '#3a4a5a';

  // Left column: title, intro, key facts.
  const lx = 48;
  ctx.fillStyle = ink;
  ctx.font = '700 62px Georgia, "Times New Roman", serif';
  ctx.fillText('The Colosseum', lx, 96);
  ctx.font = '400 23px Georgia, "Times New Roman", serif';
  ctx.fillStyle = muted;
  ctx.fillText('The Flavian Amphitheatre, Rome', lx, 134);
  ctx.fillStyle = gold;
  ctx.fillRect(lx, 156, 72, 3);

  ctx.font = '400 20px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = ink;
  const introLines = wrapText(ctx, POSTER_INTRO, 330);
  introLines.forEach((l, i) => ctx.fillText(l, lx, 204 + i * 28));

  // Key facts box.
  const boxY = 268;
  const boxH = 256;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(lx, boxY, 336, boxH);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.strokeRect(lx + 0.5, boxY + 0.5, 336, boxH);
  ctx.fillStyle = ink;
  ctx.font = '700 15px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('KEY FACTS', lx + 20, boxY + 32);
  ctx.font = '400 15px "Helvetica Neue", Arial, sans-serif';
  let fy = boxY + 62;
  for (const f of POSTER_FACTS) {
    ctx.fillStyle = muted;
    ctx.fillText(f.label, lx + 20, fy);
    ctx.fillStyle = ink;
    const valueLines = wrapText(ctx, f.value, 336 - 20 - 118);
    valueLines.forEach((l, i) => ctx.fillText(l, lx + 138, fy + i * 20));
    fy += Math.max(30, valueLines.length * 20 + 10);
  }

  // Section cutaway inset, bottom left.
  const secY = 540;
  ctx.fillStyle = ink;
  ctx.font = '700 14px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('SECTION CUTAWAY', lx, secY);
  ctx.save();
  ctx.beginPath();
  ctx.rect(lx, secY + 12, 336, 300);
  ctx.clip();
  drawCover(ctx, sectionImg, lx, secY + 12, 336, 300);
  ctx.restore();
  ctx.strokeStyle = line;
  ctx.strokeRect(lx + 0.5, secY + 12.5, 336, 300);

  // Center: the live Floors render.
  const mainRect = {x: 420, y: 60, w: 740, h: 800};
  const fit = drawCover(ctx, mainImg, mainRect.x, mainRect.y, mainRect.w, mainRect.h);

  // Right column: layer callouts with leader lines to the render.
  const rx = 1200;
  ctx.font = '700 15px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = ink;
  ctx.fillText('LAYERS', rx, 96);
  let cy = 128;
  layers.forEach((layer, i) => {
    const text = truncate(firstSentence(layer.text), 150);
    ctx.fillStyle = ink;
    ctx.font = '700 17px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(layer.name, rx, cy);
    ctx.font = '400 14px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = muted;
    const textLines = wrapText(ctx, text, 352);
    textLines.forEach((l, k) => ctx.fillText(l, rx, cy + 22 + k * 19));
    // Leader line from the callout to its layer anchor in the render.
    const a = capture.anchors[i];
    if (a) {
      const ax = fit.dx + (a.x / capture.viewWidth) * mainImg.width * fit.scale;
      const ay = fit.dy + (a.y / capture.viewHeight) * mainImg.height * fit.scale;
      ctx.strokeStyle = 'rgba(200, 212, 222, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx - 10, cy - 4);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      ctx.fillStyle = '#c8d4de';
      ctx.beginPath();
      ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    cy += 34 + textLines.length * 19 + 14;
  });

  // Insets: plan and facade detail, right column.
  const insetW = 352;
  const insetH = 148;
  const planY = cy + 6;
  ctx.fillStyle = ink;
  ctx.font = '700 14px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('PLAN, TOP VIEW', rx, planY);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, planY + 10, insetW, insetH);
  ctx.clip();
  drawCover(ctx, planImg, rx, planY + 10, insetW, insetH);
  ctx.restore();
  ctx.strokeStyle = line;
  ctx.strokeRect(rx + 0.5, planY + 10.5, insetW, insetH);
  const facY = planY + 10 + insetH + 28;
  ctx.fillStyle = ink;
  ctx.fillText('FACADE DETAIL', rx, facY);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, facY + 10, insetW, insetH);
  ctx.clip();
  drawCover(ctx, facadeImg, rx, facY + 10, insetW, insetH);
  ctx.restore();
  ctx.strokeStyle = line;
  ctx.strokeRect(rx + 0.5, facY + 10.5, insetW, insetH);

  // Timeline strip along the bottom.
  const ty = 908;
  ctx.strokeStyle = '#54687c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, ty);
  ctx.lineTo(1552, ty);
  ctx.stroke();
  const marks = timeline.slice(0, 6);
  marks.forEach((m, i) => {
    const x = 80 + (i * (1472 / Math.max(1, marks.length - 1)));
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(x, ty, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.font = '700 14px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(m.date, x - 4, ty - 14);
    ctx.fillStyle = muted;
    ctx.font = '400 13px "Helvetica Neue", Arial, sans-serif';
    const labelLines = wrapText(ctx, m.label, 210);
    labelLines.forEach((l, k) => ctx.fillText(l, x - 4, ty + 22 + k * 17));
  });

  // Footer.
  ctx.fillStyle = muted;
  ctx.font = '400 13px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('Architectural Atlas · architecturalatlas.com', 48, 984);
  ctx.fillText('Sources: Wikipedia (Colosseum), Ancient Rome Live, thecolosseum.org', 900, 984);
}

export function downloadPoster(canvas: HTMLCanvasElement): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'colosseum-poster.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}
