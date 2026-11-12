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
  anchors: ({x: number; y: number} | null)[];
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
 * timeline; the completion under Titus is in the timeline strip below.
 * Materials and entrances are the story hotspots and Wikipedia. Values are
 * kept short so each fits its column in the facts band on one line. */
export const POSTER_FACTS: {label: string; value: string}[] = [
  {label: 'Built', value: 'AD 70 to 80'},
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

/** Shorten a hotspot text to a complete thought that fits a callout in two
 * lines, using only words from the verified text. A long first sentence is
 * cut at its first colon or semicolon when that leaves a complete clause;
 * nothing is invented and no ellipsis is left hanging. */
export function shortCallout(text: string): string {
  const s = firstSentence(text);
  if (s.length <= 100) return s;
  const cut = s.search(/[:;]/);
  if (cut >= 40 && cut <= 100) return s.slice(0, cut) + '.';
  const sp = s.lastIndexOf(' ', 100);
  return s.slice(0, sp > 40 ? sp : 100) + '.';
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

/** Draw an image inside a rect, clipped to it. Cover fit, so the rect is
 * filled; when cover would discard more than 30 percent of either
 * dimension (a portrait viewport into a landscape rect, or the reverse),
 * contain fit instead so the whole render stays visible. Pass cover to
 * force cover fit: for the section inset, the discarded top and bottom
 * are empty backdrop, so cropping them is what makes the cutaway fill
 * its box. Returns the placed image rect, so layer anchors can be mapped
 * into poster space. */
function drawFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  cover = false,
): {dx: number; dy: number; scale: number} {
  let scale = Math.max(w / img.width, h / img.height);
  let dw = img.width * scale;
  let dh = img.height * scale;
  if (!cover && (1 - w / dw > 0.3 || 1 - h / dh > 0.3)) {
    scale = Math.min(w / img.width, h / img.height);
    dw = img.width * scale;
    dh = img.height * scale;
  }
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return {dx, dy, scale};
}

/** Draw the poster onto a 1600 by 1100 canvas. The main image is the live
 * Floors render; the three insets are live renders of the real model.
 * Layout: header with title, intro and a facts band across the top; the
 * live render as a wide band in the middle; layer callouts and the three
 * insets in the right column; the timeline strip and footer along the
 * bottom. Images are drawn first and clipped to their rects, so no image
 * can ever cover the text. */
export async function composePoster(
  canvas: HTMLCanvasElement,
  capture: PosterCapture,
  layers: PosterLayer[],
  timeline: PosterTimelineEntry[],
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('poster canvas unavailable');
  const W = 1600;
  const H = 1100;
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
  const glow = ctx.createRadialGradient(600, 580, 60, 600, 580, 620);
  glow.addColorStop(0, 'rgba(88, 110, 135, 0.55)');
  glow.addColorStop(1, 'rgba(30, 41, 54, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const ink = '#eef3f6';
  const muted = '#b9c7d2';
  const gold = '#c9a86a';
  const line = '#3a4a5a';

  // Center: the live Floors render, drawn first so it can never cover text.
  const mainRect = {x: 48, y: 280, w: 1104, h: 600};
  const fit = drawFit(ctx, mainImg, mainRect.x, mainRect.y, mainRect.w, mainRect.h);

  // Header: title, subtitle, intro.
  const lx = 48;
  ctx.fillStyle = ink;
  ctx.font = '700 56px Georgia, "Times New Roman", serif';
  ctx.fillText('The Colosseum', lx, 100);
  ctx.font = '400 21px Georgia, "Times New Roman", serif';
  ctx.fillStyle = muted;
  ctx.fillText('The Flavian Amphitheatre, Rome', lx, 136);
  ctx.fillStyle = gold;
  ctx.fillRect(lx, 154, 72, 3);
  ctx.font = '400 20px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = ink;
  ctx.fillText(POSTER_INTRO, lx, 192);

  // Facts band across the top, under the intro.
  const bandY = 212;
  const bandH = 50;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(lx, bandY, 1104, bandH);
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.strokeRect(lx + 0.5, bandY + 0.5, 1104, bandH);
  const colX = [68, 284, 500, 716, 932];
  POSTER_FACTS.forEach((f, i) => {
    const cx = colX[i];
    ctx.fillStyle = muted;
    ctx.font = '700 11px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(f.label.toUpperCase(), cx, bandY + 20);
    ctx.fillStyle = ink;
    ctx.font = '400 13px "Helvetica Neue", Arial, sans-serif';
    if (ctx.measureText(f.value).width > 200) ctx.font = '400 12px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(f.value, cx, bandY + 40);
  });

  // Right column: layer callouts with leader lines to the render. Listed
  // top layer first, the same order as the layers appear in the render,
  // so the lines never cross. Each line is an elbow: out from its layer
  // anchor, then along a staggered vertical bus just right of the render,
  // then into its callout row. A dark under-stroke keeps the line
  // readable where it crosses pale stone.
  const rx = 1184;
  ctx.font = '700 15px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = ink;
  ctx.fillText('LAYERS', rx, 64);
  let cy = 96;
  const displayOrder = layers.map((_, i) => i).reverse();
  displayOrder.forEach((li, j) => {
    const layer = layers[li];
    const text = shortCallout(layer.text);
    ctx.fillStyle = ink;
    ctx.font = '700 17px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(layer.name, rx, cy);
    ctx.font = '400 14px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = muted;
    const textLines = wrapText(ctx, text, 368);
    textLines.forEach((l, k) => ctx.fillText(l, rx, cy + 22 + k * 19));
    // Leader line from the callout to its layer anchor in the render.
    const a = capture.anchors[li];
    if (a) {
      const ax = fit.dx + (a.x / capture.viewWidth) * mainImg.width * fit.scale;
      const ay = fit.dy + (a.y / capture.viewHeight) * mainImg.height * fit.scale;
      const rowY = cy - 4;
      const busX = 1156 + j * 6;
      const ex = rx - 10;
      ctx.strokeStyle = 'rgba(16, 24, 32, 0.85)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(busX, ay);
      ctx.lineTo(busX, rowY);
      ctx.lineTo(ex, rowY);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200, 212, 222, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(busX, ay);
      ctx.lineTo(busX, rowY);
      ctx.lineTo(ex, rowY);
      ctx.stroke();
      ctx.fillStyle = '#c8d4de';
      ctx.beginPath();
      ctx.arc(ax, ay, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    cy += 22 + textLines.length * 19 + 14;
  });

  // Insets in the right column: plan, facade detail, section cutaway.
  const insetW = 368;
  const insetH = 160;
  const drawInset = (img: HTMLImageElement, label: string, top: number, cover = false): number => {
    ctx.fillStyle = ink;
    ctx.font = '700 14px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(label, rx, top);
    drawFit(ctx, img, rx, top + 14, insetW, insetH, cover);
    ctx.strokeStyle = line;
    ctx.strokeRect(rx + 0.5, top + 14.5, insetW, insetH);
    return top + 14 + insetH + 30;
  };
  let iy = cy + 30;
  iy = drawInset(planImg, 'PLAN, TOP VIEW', iy);
  iy = drawInset(facadeImg, 'FACADE DETAIL', iy);
  iy = drawInset(sectionImg, 'SECTION CUTAWAY', iy, true);

  // Timeline strip along the bottom. Labels are centered on their marker
  // and clamped inside the canvas, so the first and last labels are never
  // cut off at the edges.
  const ty = 1018;
  ctx.strokeStyle = '#54687c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, ty);
  ctx.lineTo(1552, ty);
  ctx.stroke();
  const clampX = (cx: number, w: number) => Math.min(Math.max(cx, 48), 1552 - w);
  const marks = timeline.slice(0, 6);
  marks.forEach((m, i) => {
    const x = 48 + (i * (1504 / Math.max(1, marks.length - 1)));
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(x, ty, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.font = '700 14px "Helvetica Neue", Arial, sans-serif';
    const dw = ctx.measureText(m.date).width;
    ctx.fillText(m.date, clampX(x - dw / 2, dw), ty - 14);
    ctx.fillStyle = muted;
    ctx.font = '400 13px "Helvetica Neue", Arial, sans-serif';
    const labelLines = wrapText(ctx, m.label, 210);
    labelLines.forEach((l, k) => {
      const lw = ctx.measureText(l).width;
      ctx.fillText(l, clampX(x - lw / 2, lw), ty + 22 + k * 17);
    });
  });

  // Footer.
  ctx.fillStyle = muted;
  ctx.font = '400 13px "Helvetica Neue", Arial, sans-serif';
  ctx.fillText('Architectural Atlas · architecturalatlas.com', 48, 1090);
  const sources = 'Sources: Wikipedia (Colosseum), Ancient Rome Live, thecolosseum.org';
  ctx.fillText(sources, 1552 - ctx.measureText(sources).width, 1090);
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
