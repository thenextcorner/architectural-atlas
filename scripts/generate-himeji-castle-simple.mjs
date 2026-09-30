// Simplified schematic Himeji Castle for the Architectural Atlas.
//
// The "simple" variant of Himeji Castle: same footprint, massing and
// proportions as the detailed model (see scripts/generate-himeji-castle.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// 34 named parts across 7 systems instead of 102 across 10. Keep floors,
// gates, walls and turrets are merged into group parts; interior detail
// (pillars aside), gables, ridge tiles and loopholes are omitted or merged.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-himeji-castle.mjs for the full attribution):
//   "White Heron Castle" (Shirasagi-jo); built 1601-1609 by Ikeda Terumasa;
//   Nishinomaru after 1617 under Honda Tadamasa, residence of Princess Sen;
//   never faced battle; UNESCO World Heritage 11 December 1993; eight
//   National Treasure structures; 74 Important Cultural Properties (11
//   corridors, 16 turrets, 15 gates, 32 earthen walls); three premier
//   castles; renritsu-shiki cluster keep: main keep (Daitenshu) plus three
//   subsidiary keeps (Higashi, Nishi, Inui) linked by roofed watariyagura;
//   main keep 46.4 m high, 92 m above sea level; five stories outside, six
//   floors plus basement inside; first floor 554 m2 thousand-mat room with
//   330 plus tatami mats and bugukake racks (280 guns, 90 spears); second
//   floor about 550 m2; basement 385 m2; east pillar 97 cm (fir), west
//   pillar 85 by 95 cm (cypress), 26.4 m Kiso replacement joined on the
//   third floor; top-floor shrine; stone walls to 26 m; white plaster walls
//   of sand and clay bound with rice glue; karahafu and chidori hafu
//   gables; shachihoko fire-protection ornaments; 83 buildings; three
//   concentric moats (inner/Sangoku, middle, outer); Otemon over the
//   Sakuramon-bashi bridge; Hishi Gate to the castle proper; I, Ro, Ha, Ni,
//   Ho, He, Chi, Ri, Ru, Nu and Mizuno gates; Bizenmaru; Nishi-no-maru with
//   Hyakken Roka and Kesho Yagura; Harakiri-maru; Okiku-ido well;
//   Ubagaishi legend.
// Schematic (not sourced, never stated as fact in the UI): exact footprint
// placement and orientation of every structure; heights of subsidiary
// keeps, gates, yagura and stone bases; per-story floor heights; roof
// profiles; moat widths; merged group geometry. The model covers the inner
// citadel at roughly 300 m across, a fraction of the full 233-hectare
// complex.
//
// Writes:
//   public/models/himeji-castle-simple/atlas.json
//   public/models/himeji-castle-simple/himeji-castle-simple-0.bin
//
// Usage: node scripts/generate-himeji-castle-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'himeji-castle-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest modeled dimension (~300 m) maps to 2.4 units (same as
// detailed).
const S = 2.4 / 300;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// Battered (sloping) rectangular wall. Rotate geometry BEFORE translating.
function frustumBox(x0, x1, y0, y1, z0, z1, topScale = 0.85) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0, 1, 2, 1);
  const pos = g.attributes.position;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + (y1 - y0) / 2) / (y1 - y0);
    const s = 1 - (1 - topScale) * t;
    pos.setX(i, cx + (pos.getX(i) - cx) * s);
    pos.setZ(i, cz + (pos.getZ(i) - cz) * s);
  }
  g.computeVertexNormals();
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
// Japanese hip roof: pyramid plus a thin eave slab. Rotate BEFORE translate.
function hipRoof(w, d, h, x, y, z) {
  const pyr = new THREE.ConeGeometry(1, h, 4, 1);
  pyr.rotateY(Math.PI / 4);
  pyr.scale(w / Math.SQRT2, 1, d / Math.SQRT2);
  pyr.translate(x, y + h / 2, z);
  const eave = box(x - w / 2 - 0.6, x + w / 2 + 0.6, y - 0.35, y + 0.15, z - d / 2 - 0.6, z + d / 2 + 0.6);
  return [pyr, eave];
}
function corridor(x0, z0, x1, z1, wallY0, wallY1, w = 4.5) {
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dx, dz);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const base = box(-w / 2, w / 2, 0, wallY0, -len / 2, len / 2);
  const walls = box(-w / 2, w / 2, wallY0, wallY1, -len / 2, len / 2);
  const [pyr, eave] = hipRoof(w + 2.5, len + 2.5, 2.4, 0, wallY1, 0);
  for (const g of [base, walls, pyr, eave]) {
    g.rotateY(ang);
    g.translate(cx, 0, cz);
  }
  return [base, walls, pyr, eave];
}
function gatehouse(x, z, w, d, wallH, rotY = 0) {
  const pierW = w * 0.28;
  const p1 = box(-w / 2, -w / 2 + pierW, 0, wallH, -d / 2, d / 2);
  const p2 = box(w / 2 - pierW, w / 2, 0, wallH, -d / 2, d / 2);
  const upper = box(-w / 2, w / 2, wallH * 0.55, wallH, -d / 2, d / 2);
  const [pyr, eave] = hipRoof(w + 2.5, d + 2.5, 2.6, 0, wallH, 0);
  const geoms = [p1, p2, upper, pyr, eave];
  if (rotY) for (const g of geoms) g.rotateY(rotY);
  for (const g of geoms) g.translate(x, 0, z);
  return geoms;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// === KEEPS.
{
  // Tenshudai stone base with the basement merged in (sourced base concept;
  // heights schematic).
  const base = frustumBox(-23, 23, 0, 15, -21, 21, 0.76);
  const lip = box(-18.5, 18.5, 14.2, 15.4, -16.5, 16.5);
  const basement = box(-11, 11, 9, 13.5, -10, 10);
  addPart('tenshudai', 'Main keep stone base', 'keeps', [base, lip, basement]);
}
{
  // All six wooden floors merged (sourced: five stories outside, six floors
  // plus basement inside; 46.4 m total; taper schematic).
  const geoms = [];
  const fw = [27, 25, 23, 21, 19, 17], fd = [25, 23, 21, 19, 17, 15];
  for (let i = 0; i < 6; i++) {
    geoms.push(box(-fw[i] / 2, fw[i] / 2, 15 + i * 4.8, 15 + (i + 1) * 4.8, -fd[i] / 2, fd[i] / 2));
  }
  addPart('keep-walls', 'Main keep walls', 'keeps', geoms);
}
{
  // All roof tiers merged (sourced layered roofs; profiles schematic).
  const geoms = [];
  const fw = [27, 25, 23, 21, 19], fd = [25, 23, 21, 19, 17];
  for (let i = 0; i < 5; i++) {
    geoms.push(...hipRoof(fw[i] + 5, fd[i] + 5, 3.4, 0, 15 + (i + 1) * 4.8, 0));
  }
  geoms.push(...hipRoof(25, 23, 5.5, 0, 15 + 6 * 4.8, 0));
  addPart('keep-roofs', 'Main keep roofs', 'keeps', geoms);
}
{
  // Golden shachihoko pair on the great roof ridge (sourced).
  const geoms = [];
  for (const sx of [-1, 1]) {
    const body = new THREE.ConeGeometry(0.9, 2.6, 8);
    body.translate(sx * 10.5, 15 + 6 * 4.8 + 6.2, 0);
    geoms.push(body);
  }
  addPart('keep-shachihoko', 'Main keep shachihoko', 'keeps', geoms);
}
{
  // The two great pillars, east (fir) and west (cypress), shown full length
  // (sourced; positions schematic).
  addPart('keep-pillars', 'Main keep great pillars', 'keeps', [
    cyl(0.55, 0.62, 24.6, 5.5, 8 + 12.3, 2, 8),
    cyl(0.55, 0.6, 24.6, -5.5, 8 + 12.3, -2, 8),
  ]);
}
{
  // Keep defenses merged: stairs, weapon racks, corner strong points,
  // stone-drop windows (sourced concepts; forms schematic).
  const geoms = [];
  for (let s = 0; s < 8; s++) {
    geoms.push(box(-5.5, -2.5, 15 + s * 0.6, 15 + s * 0.6 + 0.35, -2 + s * 0.55, -1.4 + s * 0.55));
  }
  for (let i = 0; i < 6; i++) {
    geoms.push(box(-12.5 + i * 4.4, -12 + i * 4.4, 15, 17.2, 11.4, 11.9));
  }
  geoms.push(box(10, 12.8, 15, 17.6, 8, 10.8), box(-12.8, -10, 15, 17.6, 8, 10.8));
  addPart('keep-defenses', 'Main keep defenses', 'keeps', geoms);
}
// Three subsidiary keeps merged each (sourced cluster; heights schematic).
const SMALL_KEEPS = [
  { id: 'higashi', name: 'East small keep', x: 52, z: 4 },
  { id: 'nishi', name: 'West small keep', x: -52, z: -4 },
  { id: 'inui', name: 'Northwest small keep', x: -40, z: -46 },
];
for (const k of SMALL_KEEPS) {
  const geoms = [frustumBox(k.x - 12, k.x + 12, 0, 8, k.z - 11, k.z + 11, 0.8)];
  const fw = [15, 13.5, 12], fd = [13, 11.5, 10];
  for (let i = 0; i < 3; i++) {
    geoms.push(box(k.x - fw[i] / 2, k.x + fw[i] / 2, 8 + i * 4.2, 8 + (i + 1) * 4.2, k.z - fd[i] / 2, k.z + fd[i] / 2));
  }
  for (let i = 0; i < 2; i++) {
    geoms.push(...hipRoof(fw[i] + 4, fd[i] + 4, 2.8, k.x, 8 + (i + 1) * 4.2, k.z));
  }
  geoms.push(...hipRoof(fw[2] + 5.5, fd[2] + 5.5, 3.6, k.x, 8 + 3 * 4.2, k.z));
  addPart(`${k.id}-keep`, k.name, 'keeps', geoms);
}

// === CORRIDORS.
{
  const geoms = [
    ...corridor(13.5, 2, 40, 3.5, 8, 12.5),
    ...corridor(-13.5, -2, -40, -3.5, 8, 12.5),
    ...corridor(-44, -12, -40, -38, 8, 12.5),
    ...corridor(-32, -46, -12, -12, 8, 12.5),
  ];
  addPart('watariyagura', 'Connecting corridors', 'corridors', geoms);
}
{
  const kw = box(-34, -25, 8, 12, -58, -51);
  const [pyr, eave] = hipRoof(11.5, 9.5, 2.6, -29.5, 12, -54.5);
  addPart('kitchen', 'Castle kitchen', 'corridors', [kw, pyr, eave]);
}

// === GATES.
{
  const deck = box(-2.5, 2.5, 1.2, 2, 138, 166);
  const r1 = box(-2.9, -2.5, 2, 3.1, 138, 166);
  const r2 = box(2.5, 2.9, 2, 3.1, 138, 166);
  addPart('sakuramon-bridge', 'Sakura Gate bridge', 'gates', [deck, r1, r2]);
}
{
  const w = 24, d = 10, x = 0, z = 128;
  const geoms = [
    box(x - w / 2, x - w / 2 + w * 0.24, 0, 7.5, z - d / 2, z + d / 2),
    box(x + w / 2 - w * 0.24, x + w / 2, 0, 7.5, z - d / 2, z + d / 2),
    box(x - w / 2, x + w / 2, 4.2, 7.5, z - d / 2, z + d / 2),
    box(x - w / 2 + 1.5, x + w / 2 - 1.5, 7.5, 11, z - d / 2 + 1, z + d / 2 - 1),
    ...hipRoof(w + 3, d + 3, 3.4, x, 11, z),
  ];
  addPart('otemon', 'Otemon main gate', 'gates', geoms);
}
{
  const w = 18, d = 8, x = 0, z = 62;
  const geoms = [
    box(x - w / 2, x - w / 2 + w * 0.26, 0, 6.5, z - d / 2, z + d / 2),
    box(x + w / 2 - w * 0.26, x + w / 2, 0, 6.5, z - d / 2, z + d / 2),
    box(x - w / 2, x + w / 2, 3.8, 6.5, z - d / 2, z + d / 2),
    ...hipRoof(w + 3, d + 3, 3, x, 6.5, z),
  ];
  addPart('hishinomon', 'Hishi Gate', 'gates', geoms);
}
{
  // Inner maze gates merged (sourced names; positions schematic).
  const spots = [
    [28, 48, 0.3], [-20, 36, -0.3], [18, 18, 0.25], [-12, 8, -0.2],
    [-30, -18, 0.35], [30, -28, -0.3], [44, 8, 0.2], [52, -14, -0.25],
    [-48, 20, 0.3], [-58, -38, -0.35], [58, -30, 0.25],
  ];
  const geoms = [];
  for (const [x, z, rot] of spots) geoms.push(...gatehouse(x, z, 10, 5.5, 4.5, rot));
  addPart('maze-gates', 'Inner maze gates', 'gates', geoms);
}
{
  const geoms = [
    ...gatehouse(-40, -64, 9, 5, 4.2, 0.15),
    ...gatehouse(-28, -70, 9, 5, 4.2, -0.1),
    ...gatehouse(-16, -64, 9, 5, 4.2, 0.2),
  ];
  addPart('mizuno-gates', 'Mizuno Gates', 'gates', geoms);
}

// === WALLS AND TURRETS.
{
  // Citadel wall ring merged (sourced max 26 m; runs schematic).
  addPart('citadel-walls', 'Citadel stone walls', 'walls', [
    frustumBox(-95, 95, 0, 14, -84, -78, 0.8),
    frustumBox(91, 97, 0, 14, -80, 90, 0.8),
    frustumBox(-95, 95, 0, 14, 86, 92, 0.8),
    frustumBox(-97, -91, 0, 14, -80, 90, 0.8),
  ]);
}
{
  // Keep enclosure walls and platform merged.
  addPart('keep-enclosure', 'Keep enclosure walls and platform', 'walls', [
    frustumBox(-65, 65, 0, 7, -60, 50, 0.88),
    box(-45, 45, 7, 12, -50, -47),
    box(42, 45, 7, 12, -47, 40),
    box(-45, 45, 7, 12, 37, 40),
    box(-45, -42, 7, 12, -47, 40),
  ]);
}
{
  // 32 earthen walls merged (sourced count; runs schematic).
  addPart('earthen-walls', 'Outer earthen walls', 'walls', [
    box(-125, 125, 0, 4.5, -118, -115.5),
    box(122.5, 125, 0, 4.5, -115.5, 118),
    box(-125, 125, 0, 4.5, 115.5, 118),
    box(-125, -122.5, 0, 4.5, -115.5, 118),
  ]);
}
{
  // Aburakabe oil wall (single-source account).
  addPart('aburakabe', 'Aburakabe oil wall', 'walls', [
    box(-45, -5, 0, 5, -26, -23.5),
  ]);
}
{
  // Turret towers merged (sourced: 16 turrets among the Important Cultural
  // Properties; positions schematic).
  const geoms = [];
  for (const [x, z] of [[88, -72], [88, 82], [-88, 60], [-60, 88], [20, 88], [-88, -60], [-72, 88]]) {
    geoms.push(box(x - 4, x + 4, 14, 21, z - 4, z + 4));
    geoms.push(...hipRoof(10.5, 10.5, 2.6, x, 21, z));
  }
  addPart('turrets', 'Turret towers', 'walls', geoms);
}
{
  // Ubagaishi millstone legend.
  const stone = new THREE.CylinderGeometry(1.6, 1.6, 0.5, 12);
  stone.rotateX(Math.PI / 2);
  stone.translate(30, 7, 89.2);
  addPart('ubagaishi', 'Ubagaishi millstone', 'walls', [stone]);
}
{
  // Wall defenses merged: sama loopholes and maze approach walls (sourced
  // concepts; forms schematic).
  const geoms = [];
  for (let i = 0; i < 24; i++) {
    const x = -88 + i * 7.6;
    geoms.push(box(x - 0.5, x + 0.5, 9, 10.2, -81.4, -80.6));
  }
  for (const [x0, x1, z0, z1] of [[-14, 14, 100, 103], [14, 40, 78, 81], [-40, -14, 78, 81], [-14, 14, 52, 55]]) {
    geoms.push(box(x0, x1, 0, 3.2, z0, z1));
  }
  addPart('wall-defenses', 'Wall loopholes and maze walls', 'walls', geoms);
}

// === WEST BAILEY (Nishi-no-maru).
{
  const walls = box(-185, -85, 0, 4.5, -23.5, -16.5);
  const [pyr, eave] = hipRoof(102.5, 9.5, 2.6, -135, 4.5, -20);
  addPart('hyakken-roka', 'Hyakken Roka corridor', 'west-bailey', [walls, pyr, eave]);
}
{
  const walls = box(-140, -130, 0, 8, 30, 39);
  const [pyr, eave] = hipRoof(12.5, 11.5, 3, -135, 8, 34.5);
  addPart('kesho-yagura', 'Kesho Yagura', 'west-bailey', [walls, pyr, eave]);
}
{
  addPart('nishinomaru-grounds', 'Nishi-no-maru grounds', 'west-bailey', [
    box(-165, -105, 0, 0.4, -10, 50),
    frustumBox(-172, -166, 0, 9, -40, 60, 0.85),
    ...gatehouse(-135, 56, 9, 5, 4.2, 0),
  ]);
}

// === MOATS.
function waterRing(x0, x1, z0, z1, wdt) {
  return [
    box(x0, x1, -1.2, 0.4, z0, z0 + wdt),
    box(x0, x1, -1.2, 0.4, z1 - wdt, z1),
    box(x0, x0 + wdt, -1.2, 0.4, z0 + wdt, z1 - wdt),
    box(x1 - wdt, x1, -1.2, 0.4, z0 + wdt, z1 - wdt),
  ];
}
addPart('inner-moat', 'Inner moat', 'moats', waterRing(-125, 125, -115, 125, 18));
{
  addPart('outer-moats', 'Middle and outer moats', 'moats', [
    box(-150, 150, -1.2, 0.4, -148, -132),
    box(134, 150, -1.2, 0.4, -132, 150),
    box(-80, 80, -1.2, 0.4, 168, 184),
  ]);
}
{
  const rim = new THREE.CylinderGeometry(1.6, 1.8, 1.2, 10, 1, true);
  rim.translate(62, 0.6, -28);
  const dark = new THREE.CircleGeometry(1.5, 10);
  dark.rotateX(-Math.PI / 2);
  dark.translate(62, 0.15, -28);
  const [pyr, eave] = hipRoof(5.4, 4.6, 1.4, 62, 2.6, -28);
  addPart('okiku-well', 'Okiku well', 'moats', [rim, dark, box(60.2, 60.6, 0, 2.6, -28.4, -28), box(63.4, 63.8, 0, 2.6, -28.4, -28), pyr, eave]);
}

// === BAILEYS.
addPart('bizenmaru', 'Bizenmaru bailey', 'baileys', [box(37, 87, 0, 0.4, -45, -5)]);
{
  addPart('ninomaru', 'Ni-no-maru bailey', 'baileys', [
    box(10, 70, 0, 0.4, 50, 100),
    ...gatehouse(70, 75, 8, 4.5, 3.8, Math.PI / 2),
  ]);
}
addPart('sannomaru', 'San-no-maru bailey', 'baileys', [box(-90, -30, 0, 0.4, 50, 100)]);
addPart('harakiri-maru', 'Harakiri-maru courtyard', 'baileys', [box(22, 38, 0, 0.4, 38, 54)]);
addPart('otemae-square', 'Otemae entrance square', 'baileys', [box(-20, 20, 0, 0.4, 168, 193)]);

// ---------------------------------------------------------------- colors
// Schematic light palette (same family as the detailed model).
function colorFor(id) {
  if (id === 'tenshudai' || id === 'citadel-walls' || id === 'keep-enclosure') return '#9a958a';
  if (id === 'keep-walls' || id.endsWith('-keep') && id !== 'keep-defenses') return '#f4efe3';
  if (id === 'keep-roofs') return '#4b4c50';
  if (id === 'keep-shachihoko') return '#c9a227';
  if (id === 'keep-pillars' || id === 'keep-defenses') return '#7a5c3e';
  if (id === 'watariyagura' || id === 'kitchen') return '#ded4ba';
  if (id === 'sakuramon-bridge') return '#6b4f35';
  if (id === 'otemon' || id === 'hishinomon' || id === 'maze-gates' || id === 'mizuno-gates') return '#e9e1cd';
  if (id === 'earthen-walls') return '#ddd2b8';
  if (id === 'aburakabe') return '#b98d55';
  if (id === 'turrets') return '#ece4d0';
  if (id === 'ubagaishi') return '#6e6960';
  if (id === 'wall-defenses') return '#8a857a';
  if (id === 'hyakken-roka' || id === 'kesho-yagura') return '#e9e1cd';
  if (id === 'nishinomaru-grounds') return '#b3a88f';
  if (id === 'inner-moat' || id === 'outer-moats') return '#86aec9';
  if (id === 'okiku-well') return '#8a857a';
  if (id === 'bizenmaru' || id === 'ninomaru' || id === 'sannomaru' || id === 'harakiri-maru' || id === 'otemae-square') return '#b3a88f';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'keeps', name: 'Keeps', color: '#f4efe3', description: 'The 46.4 m main keep with its stone base, layered roofs and great pillars, plus the three subsidiary keeps of the cluster.' },
  { id: 'corridors', name: 'Connecting corridors', color: '#ded4ba', description: 'The roofed watariyagura passages linking the keeps, with the castle kitchen.' },
  { id: 'gates', name: 'Gates', color: '#e9e1cd', description: 'The Otemon main gate, the Hishi Gate, the Sakura bridge and the inner maze gates.' },
  { id: 'walls', name: 'Walls and turrets', color: '#a09a8e', description: 'Battered stone walls, earthen walls, the oil wall, turret towers and wall defenses.' },
  { id: 'west-bailey', name: 'West bailey', color: '#e9e1cd', description: 'Princess Sen’s Nishi-no-maru: the hundred-meter corridor and the Kesho Yagura.' },
  { id: 'moats', name: 'Moats and water', color: '#86aec9', description: 'The three concentric moats and the legendary Okiku well.' },
  { id: 'baileys', name: 'Baileys and courtyards', color: '#b3a88f', description: 'The walled baileys and courtyards between the gates.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'main keep stone base': 'The great stone base carrying the main keep, with battered musha-gaeshi style walls; castle stone walls rise to 26 m at their highest. Exact base height is schematic.',
  'main keep walls': 'The six wooden floors of the 46.4 m main keep, which shows five stories from outside: the second and third floors from the top read as one. The first floor is the 554 m2 thousand-mat room. Exact floor heights are schematic.',
  'main keep roofs': 'The layered roof tiers of the keep, with karahafu and chidori hafu gables. White roof plaster seals the tiles against moisture and fire. Exact profiles are schematic.',
  'main keep shachihoko': 'Golden shachihoko ornaments on the great roof ridge, believed to protect the castle from fire. Exact sculpture is schematic.',
  'main keep great pillars': 'The two great pillars: the east pillar, 97 cm across at the base and originally a single fir tree, and the west pillar of Japanese cypress, replaced in the Showa restoration with a 26.4 m Kiso cypress. Exact positions are schematic.',
  'main keep defenses': 'Steep misaligned staircases, bugukake weapon racks, corner strong points and stone-drop windows of the keep. Exact forms are schematic.',
  'east small keep': 'The Higashi (east) small keep, one of three subsidiary keeps forming the cluster with the main keep. Exact height is schematic.',
  'west small keep': 'The Nishi (west) small keep. Exact height is schematic.',
  'northwest small keep': 'The Inui (northwest) small keep. Exact height is schematic.',
  'connecting corridors': 'The roofed I, Ro, Ha and Ni watariyagura passages linking the keeps, National Treasures. Exact routes are schematic.',
  'castle kitchen': 'The castle kitchen (daidokoro) beside the corridors. Exact placement is schematic.',
  'sakura gate bridge': 'The Sakuramon-bashi wooden bridge to the Otemon, reconstructed in 2007 to the original Edo-period design. Exact span is schematic.',
  'otemon main gate': 'The Otemon, great main gate of the castle. Exact form is schematic.',
  'hishi gate': 'The Hishi (Diamond) Gate, main entrance to the castle proper, keeping its Azuchi-Momoyama appearance. Exact form is schematic.',
  'inner maze gates': 'The I, Ro, Ha, Ni, Ho, He, Chi, Ri, Ru, Nu and Bizen gates along the winding approach. Exact placement is schematic.',
  'mizuno gates': 'The three Mizuno gates on the western approach. Exact placement is schematic.',
  'citadel stone walls': 'Battered stone walls of the inner citadel, toward the 26 m maximum of the castle’s stonework. Exact runs are schematic.',
  'keep enclosure walls and platform': 'The raised platform and enclosure walls ringing the keep cluster. Exact extent is schematic.',
  'outer earthen walls': 'Plastered earthen walls lining the outer baileys; 32 survive. Exact runs are schematic.',
  'aburakabe oil wall': 'The Aburakabe oil wall, reported as clay, gravel and fermented rice water, extremely hard and fireproof. Single-source account; placement is schematic.',
  'turret towers': 'Defensive turret towers on the citadel walls; 16 turrets are Important Cultural Properties. Exact placement is schematic.',
  'ubagaishi millstone': 'The Ubagaishi: legend says an old woman donated her millstone for the walls, and it was set into the stonework. The tale is local legend.',
  'wall loopholes and maze walls': 'Sama loopholes for matchlocks and bows, and low walls shaping the maze-like approach. Exact forms are schematic.',
  'hyakken roka corridor': 'The Hyakken Roka, the hundred-meter roofed corridor of the west bailey, vital to the defense and once serving Princess Sen’s quarters. Exact length is schematic.',
  'kesho yagura': 'The Kesho Yagura of the Nishi-no-maru, part of Princess Sen’s residence. Exact form is schematic.',
  'nishi-no-maru grounds': 'The courtyard, wall and gate of the west bailey. Exact extent is schematic.',
  'inner moat': 'The inner moat, the Sangoku-bori, ringing the citadel. Exact width and course are schematic.',
  'middle and outer moats': 'The middle and outer moats; the area within the middle moat is a Special Historic Site. Exact courses are schematic.',
  'okiku well': 'Okiku-ido, the old stone-lined well of the Banshu Sarayashiki ghost story. Exact form is schematic.',
  'bizenmaru bailey': 'The Bizenmaru bailey courtyard east of the keep cluster. Exact extent is schematic.',
  'ni-no-maru bailey': 'The second bailey courtyard, with the east gate that alone survives from Hideyoshi’s 1581 castle. Exact extent is schematic.',
  'san-no-maru bailey': 'The third bailey courtyard. Exact extent is schematic.',
  'harakiri-maru courtyard': 'The small Harakiri-maru courtyard, intended for ritual suicide but never used. Exact extent is schematic.',
  'otemae entrance square': 'The entrance square before the Otemon. Exact extent is schematic.',
};

// ---------------------------------------------------------------- serialize
// Atlas v1 contract (same as the other generators): per part, 4-byte
// aligned Float32 positions, Int16 normals and Uint32 indices in one
// binary chunk; atlas.json carries byte offsets, bounds, explanations,
// concepts and triangles. Parts carry an optional color that overrides the
// system color in the viewer.
let offset = 0;
const records = [];
let triangles = 0;
for (const p of parts) {
  const merged = mergeGeometries(
    p.geoms.map((g) => {
      g.deleteAttribute('uv');
      return g;
    }),
    false,
  );
  if (!merged) throw new Error(`Could not merge ${p.id}`);
  merged.computeVertexNormals();
  merged.scale(S, S, S);
  merged.computeBoundingBox();
  const pos = merged.attributes.position.array;
  const nor = merged.attributes.normal.array;
  const idx = merged.index ? merged.index.array : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
  const n16 = new Int16Array(nor.length);
  for (let i = 0; i < nor.length; i++) {
    n16[i] = Math.round(Math.max(-1, Math.min(1, nor[i])) * 32767);
  }
  const u32 = idx instanceof Uint32Array ? idx : Uint32Array.from(idx);
  const align4 = (n) => (n + 3) & ~3; // keep every section 4-byte aligned for typed-array views
  const posOff = offset;
  offset = align4(offset + pos.byteLength);
  const norOff = offset;
  offset = align4(offset + n16.byteLength);
  const idxOff = offset;
  offset = align4(offset + u32.byteLength);
  const bb = merged.boundingBox;
  records.push({
    part: p,
    pos: Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength),
    nor: Buffer.from(n16.buffer, n16.byteOffset, n16.byteLength),
    idx: Buffer.from(u32.buffer, u32.byteOffset, u32.byteLength),
    posOff,
    norOff,
    idxOff,
    vertexCount: pos.length / 3,
    indexCount: u32.length,
    bounds: [
      [bb.min.x, bb.min.y, bb.min.z],
      [bb.max.x, bb.max.y, bb.max.z],
    ],
  });
  triangles += u32.length / 3;
  merged.dispose();
}

const buffer = Buffer.alloc(offset);
for (const r of records) {
  r.pos.copy(buffer, r.posOff);
  r.nor.copy(buffer, r.norOff);
  r.idx.copy(buffer, r.idxOff);
}
const binName = 'himeji-castle-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the himeji-castle-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Himeji Castle inner citadel, Himeji (simplified schematic)',
  title: 'Himeji Castle',
  location: 'Himeji, Japan',
  blurb: 'Japan’s White Heron Castle in Himeji, in simplified schematic form: the 46.4 m main keep and its cluster of smaller keeps, the maze of gates, stone walls and three moats — a fraction of the full 233-hectare complex.',
  sourceUrls: [
    { label: 'Wikipedia: Himeji Castle', url: 'https://en.wikipedia.org/wiki/Himeji_Castle' },
    { label: 'UNESCO: Himejijo nomination document', url: 'https://whc.Unesco.org/document/153975' },
    { label: 'Highlighting Japan: A Castle Reborn (2015)', url: 'http://www.gov-online.go.jp/eng/publicity/book/hlj/html/201509/201509_05_en.html' },
    { label: 'japan-guide.com: Himeji Castle', url: 'https://www.japan-guide.com/e/e3501.html' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id,
    name: r.part.name,
    conceptId: r.part.id,
    system: r.part.system,
    chunk: 0,
    color: colorFor(r.part.id),
    positions: r.posOff,
    normals: r.norOff,
    indices: r.idxOff,
    vertexCount: r.vertexCount,
    indexCount: r.indexCount,
    bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/himeji-castle-simple/himeji-castle-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.5,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
