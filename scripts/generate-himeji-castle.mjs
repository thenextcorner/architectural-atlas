// Procedural Himeji Castle for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Himeji Castle inner citadel in
// code and writes it in the atlas binary format:
//   public/models/himeji-castle/atlas.json
//   public/models/himeji-castle/himeji-castle-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/himeji-castle-attribution.md,
// opened 2026-09-30):
//   Himeji Castle (Himeji-jo), Himeji City, Hyogo Prefecture; "White Heron
//   Castle" (Shirasagi-jo) for the white plastered walls resembling a white
//   heron spreading its wings; fort on Himeyama hill by Akamatsu Norimura
//   1333, larger castle by Toyotomi Hideyoshi 1581, present castle built
//   1601-1609 by Ikeda Terumasa after Sekigahara; Nishinomaru added after
//   1617 under Honda Tadamasa, residence of Princess Sen; only the east gate
//   of one section of the second bailey survives from Hideyoshi's castle;
//   never faced battle; undamaged in World War II; restoration 2009-2015,
//   reopened 27 March 2015; UNESCO World Heritage inscribed 11 December
//   1993, one of the first in Japan; eight National Treasure structures
//   (main keep, three small keeps, I/Ro/Ha/Ni corridors plus kitchen);
//   74 Important Cultural Properties: 11 corridors, 16 turrets, 15 gates,
//   32 earthen walls; area within the middle moat a Special Historic Site;
//   one of Japan's three premier castles (with Matsumoto and Kumamoto).
//   Keep cluster: main keep (Daitenshu) plus three subsidiary keeps
//   (Higashi, Nishi, Inui Shōtenshu) form a renritsu-shiki cluster-style
//   keep linked by roofed watariyagura passages; main keep 46.4 m high,
//   standing 92 m above sea level; five stories externally, six interior
//   floors plus a basement (second and third floors from the top read as
//   one from outside); first floor 554 m2, the "thousand-mat room" with over
//   330 tatami mats and bugukake weapon racks, at one point 280 guns and
//   90 spears; second floor about 550 m2; basement 385 m2 with lavatories,
//   a drain board and a kitchen corridor; east pillar base 97 cm diameter,
//   originally a single fir tree; west pillar base 85 by 95 cm, Japanese
//   cypress; Showa restoration: 26.4 m cypress from the Kiso Mountains
//   replaced the west pillar, broke in handling, joined with a Mount
//   Kasagata tree on the third floor; pillars reported 24.6 m long, keep
//   estimated 5,700 tonnes (single source); top floor holds a small shrine
//   with panoramic views. Defenses: maze-like winding approach; 997 firing
//   holes reported (844 gun, 153 bow, single source); ishi-otoshi
//   stone-drop windows; sama loopholes for guns and arrows; embrasures
//   against wall climbers; musha-damari corner strong points in the four
//   corners of each main floor firing inward; steep narrow misaligned
//   staircases; stone walls up to 26 m high with musha-gaeshi overhang;
//   white plaster walls of sand and clay bound with rice glue, impenetrable
//   to matchlock balls; plaster gives fire resistance and humidity control;
//   roof gables: curved karahafu and triangular chidori hafu (plover)
//   gables, oni-gawara demon tiles at ridge ends, layered partly to confuse
//   attackers about the number of levels; shachihoko fish-tiger roof
//   ornaments believed to protect against fire; roof plaster seals flat and
//   cylindrical tiles into an impermeable skin; clan crests of the castle's
//   lords stamped into end tiles on eaves and ridges; Aburakabe oil wall of
//   clay, gravel and fermented rice water, extremely hard and fireproof
//   (single source). Complex: 83 buildings; extent 950-1,600 m east-west,
//   900-1,700 m north-south, circumference 4,200 m, area 233 hectares;
//   three concentric moats (inner/Sangoku, middle, outer). Gates and route:
//   Otemon main gate over the Sakuramon-bashi bridge (rebuilt 2007 to the
//   Edo design); Hishi (Diamond) Gate, main entrance to the castle proper,
//   keeping its Azuchi-Momoyama appearance; I, Ro, Ha, Ni, Ho, He, Chi, Ri,
//   Ru and Nu gates, Mizuno gates, To-no gates, Bizen Gate with Orimawari
//   Yagura, Taiko, Ido, Ka, Wa and Nu yagura, Ka watariyagura. Baileys:
//   Bizenmaru; Nishi-no-maru with the Hyakken Roka hundred-meter corridor
//   and the Kesho Yagura; Harakiri-maru courtyard never used; Okiku-ido
//   well and the Banshu Sarayashiki legend; Ubagaishi millstone legend.
// Schematic (not sourced, never stated as fact in the UI): exact footprint
// placement and orientation of every keep, corridor, gate, yagura, wall,
// moat and bailey; relative distances along the approach; heights of the
// subsidiary keeps, gates, yagura and stone bases; per-story floor heights
// inside the keep; roof profiles, gable counts and tile courses; moat
// widths and depths; the Hyakken Roka's length; interior stair and room
// layouts; pillar positions within the model; any per-building dimension
// not listed above. The model covers the inner citadel at roughly 300 m
// across, a fraction of the full 233-hectare complex, and says so in the
// blurb.
//
// Granularity: 100+ named parts across 10 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-himeji-castle.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'himeji-castle');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest modeled dimension (~300 m across the inner citadel
// and moats) maps to 2.4 units.
const S = 2.4 / 300;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// Battered (sloping) rectangular wall: full footprint at y0 shrinking toward
// topScale at y1. Rotate geometry BEFORE translating.
function frustumBox(x0, x1, y0, y1, z0, z1, topScale = 0.85) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0, 1, 3, 1);
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
  const r = 1;
  const pyr = new THREE.ConeGeometry(r, h, 4, 1);
  pyr.rotateY(Math.PI / 4);
  pyr.scale(w / (r * Math.SQRT2), 1, d / (r * Math.SQRT2));
  pyr.translate(x, y + h / 2, z);
  const eave = box(x - w / 2 - 0.6, x + w / 2 + 0.6, y - 0.35, y + 0.15, z - d / 2 - 0.6, z + d / 2 + 0.6);
  return [pyr, eave];
}
// Corridor segment from (x0,z0) to (x1,z1): stone sub-wall, plaster walls,
// and a stretched hip roof. Rotate BEFORE translating.
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
// Small gatehouse with a single opening: two side piers, an upper wall, and
// a hip roof. Rotate BEFORE translating.
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

// === MAIN KEEP (Daitenshu): 46.4 m tall, five stories outside, six floors
// plus a basement inside. Stone base 0..15 m (schematic), six wooden floors
// 15..43.8 m (4.8 m each, schematic), main roof above.
{
  // Tenshudai stone base with musha-gaeshi style batter (sourced: walls to
  // 26 m, curving overhang; exact base height schematic).
  const base = frustumBox(-23, 23, 0, 15, -21, 21, 0.76);
  const lip = box(-18.5, 18.5, 14.2, 15.4, -16.5, 16.5);
  addPart('tenshudai', 'Main keep stone base (tenshudai)', 'main-keep', [base, lip]);
}
{
  // Basement inside the stone base: 385 m2 with lavatories, drain board and
  // kitchen corridor (sourced; exact layout schematic).
  addPart('keep-basement', 'Main keep basement', 'main-keep', [
    box(-11, 11, 9, 13.5, -10, 10),
  ]);
}
// Six interior floors, footprints tapering with height (sourced floor areas
// for F1/F2; per-floor heights and taper schematic).
const FLOORS = [
  { n: 1, w: 27, d: 25, note: 'thousand-mat room' },
  { n: 2, w: 25, d: 23, note: '' },
  { n: 3, w: 23, d: 21, note: '' },
  { n: 4, w: 21, d: 19, note: '' },
  { n: 5, w: 19, d: 17, note: '' },
  { n: 6, w: 17, d: 15, note: 'top floor' },
];
const FH = 4.8, BASE_Y = 15;
FLOORS.forEach((f) => {
  const y0 = BASE_Y + (f.n - 1) * FH;
  addPart(`keep-floor-${f.n}`, `Main keep floor ${f.n} walls`, 'main-keep', [
    box(-f.w / 2, f.w / 2, y0, y0 + FH, -f.d / 2, f.d / 2),
  ]);
});
// One roof per story (sourced: multiple layered roof tiers), plus the great
// top roof.
FLOORS.slice(0, 5).forEach((f, i) => {
  const y0 = BASE_Y + (i + 1) * FH;
  addPart(`keep-roof-${i + 1}`, `Main keep story roof ${i + 1}`, 'main-keep',
    hipRoof(f.w + 5, f.d + 5, 3.4, 0, y0, 0));
}
);
{
  const y0 = BASE_Y + 6 * FH;
  addPart('keep-main-roof', 'Main keep great roof', 'main-keep',
    hipRoof(17 + 8, 15 + 8, 5.5, 0, y0, 0));
}
{
  // Chidori hafu (plover) gable dormers on every roof and a karahafu barrel
  // gable on the great roof (sourced gable types; counts schematic).
  const geoms = [];
  FLOORS.slice(0, 5).forEach((f, i) => {
    const y0 = BASE_Y + (i + 1) * FH;
    const w = f.w + 5, d = f.d + 5;
    for (const sx of [-1, 1]) {
      const tri = new THREE.CylinderGeometry(1.6, 1.6, 2.2, 3, 1);
      tri.rotateX(Math.PI / 2);
      tri.rotateY(Math.PI / 2);
      tri.translate(sx * (w / 2 - 1.2), y0 + 1.6, 0);
      geoms.push(tri);
      const tri2 = new THREE.CylinderGeometry(1.6, 1.6, 2.2, 3, 1);
      tri2.rotateX(Math.PI / 2);
      tri2.translate(0, y0 + 1.6, sx * (d / 2 - 1.2));
      geoms.push(tri2);
    }
  });
  const y0 = BASE_Y + 6 * FH;
  const kara = new THREE.CylinderGeometry(2.2, 2.2, 4, 12, 1, false, 0, Math.PI);
  kara.rotateZ(Math.PI / 2);
  kara.rotateY(Math.PI / 2);
  kara.translate(0, y0 + 2.2, (15 + 8) / 2 - 0.8);
  geoms.push(kara);
  addPart('keep-gables', 'Main keep gables (karahafu and chidori hafu)', 'main-keep', geoms);
}
{
  // Shachihoko: golden fish-tiger ornaments on the great roof ridge,
  // believed to protect against fire (sourced).
  const geoms = [];
  for (const sx of [-1, 1]) {
    const body = new THREE.ConeGeometry(0.9, 2.6, 8);
    body.translate(sx * 10.5, BASE_Y + 6 * FH + 6.2, 0);
    const tail = new THREE.ConeGeometry(0.55, 1.4, 8);
    tail.rotateZ(sx * 0.5);
    tail.translate(sx * 11.6, BASE_Y + 6 * FH + 7.2, 0);
    geoms.push(body, tail);
  }
  addPart('keep-shachihoko', 'Main keep shachihoko ornaments', 'main-keep', geoms);
}
{
  // Oni-gawara demon tiles at ridge ends; clan crests stamped into the end
  // tiles on eaves and ridges (sourced; exact placement schematic).
  const geoms = [];
  FLOORS.slice(0, 5).forEach((f, i) => {
    const y0 = BASE_Y + (i + 1) * FH + 3.4;
    const w = f.w + 5;
    for (const sx of [-1, 1]) {
      const t = box(sx * w / 2 - 0.7, sx * w / 2 + 0.7, y0 - 0.9, y0 + 0.4, -0.7, 0.7);
      geoms.push(t);
    }
  });
  const y0 = BASE_Y + 6 * FH + 5.5;
  for (const sx of [-1, 1]) {
    geoms.push(box(sx * 12.5 - 0.8, sx * 12.5 + 0.8, y0 - 1, y0 + 0.5, -0.8, 0.8));
  }
  addPart('keep-onigawara', 'Main keep ridge-end tiles (onigawara)', 'main-keep', geoms);
}
{
  // The two great pillars: east pillar base 97 cm (fir), west pillar base
  // 85 by 95 cm (cypress), reported 24.6 m long (sourced; positions
  // schematic so they read in the exploded view).
  addPart('keep-east-pillar', 'Main keep east pillar', 'main-keep', [
    cyl(0.55, 0.62, 24.6, 5.5, 8 + 12.3, 2),
  ]);
  addPart('keep-west-pillar', 'Main keep west pillar', 'main-keep', [
    cyl(0.55, 0.6, 24.6, -5.5, 8 + 12.3, -2),
  ]);
}
{
  // Small shrine on the top floor (sourced).
  const y0 = BASE_Y + 5 * FH;
  const hall = box(-1.8, 1.8, y0, y0 + 2.2, -1.4, 1.4);
  const [pyr, eave] = hipRoof(5.2, 4.4, 1.6, 0, y0 + 2.2, 0);
  addPart('keep-top-shrine', 'Main keep top-floor shrine', 'main-keep', [hall, pyr, eave]);
}

// === SUBSIDIARY KEEPS: Higashi (east), Nishi (west) and Inui (northwest)
// small keeps (sourced names and cluster arrangement; heights schematic).
const SMALL_KEEPS = [
  { id: 'higashi', name: 'East small keep', x: 52, z: 4 },
  { id: 'nishi', name: 'West small keep', x: -52, z: -4 },
  { id: 'inui', name: 'Northwest small keep', x: -40, z: -46 },
];
for (const k of SMALL_KEEPS) {
  // Stone base (schematic height).
  addPart(`${k.id}-base`, `${k.name} stone base`, 'subsidiary-keeps', [
    frustumBox(k.x - 12, k.x + 12, 0, 8, k.z - 11, k.z + 11, 0.8),
  ]);
  // Three wooden stories (schematic heights).
  const walls = [];
  const fw = [15, 13.5, 12], fd = [13, 11.5, 10];
  for (let i = 0; i < 3; i++) {
    walls.push(box(k.x - fw[i] / 2, k.x + fw[i] / 2, 8 + i * 4.2, 8 + (i + 1) * 4.2, k.z - fd[i] / 2, k.z + fd[i] / 2));
  }
  addPart(`${k.id}-walls`, `${k.name} walls`, 'subsidiary-keeps', walls);
  const roofs = [];
  for (let i = 0; i < 2; i++) {
    roofs.push(...hipRoof(fw[i] + 4, fd[i] + 4, 2.8, k.x, 8 + (i + 1) * 4.2, k.z));
  }
  roofs.push(...hipRoof(fw[2] + 5.5, fd[2] + 5.5, 3.6, k.x, 8 + 3 * 4.2, k.z));
  const sh = new THREE.ConeGeometry(0.7, 2, 8);
  sh.translate(k.x + (fw[2] + 5.5) / 2 - 1, 8 + 3 * 4.2 + 4.1, k.z);
  const sh2 = new THREE.ConeGeometry(0.7, 2, 8);
  sh2.translate(k.x - (fw[2] + 5.5) / 2 + 1, 8 + 3 * 4.2 + 4.1, k.z);
  roofs.push(sh, sh2);
  addPart(`${k.id}-roofs`, `${k.name} roofs and shachihoko`, 'subsidiary-keeps', roofs);
}

// === CONNECTING CORRIDORS (watariyagura): the I, Ro, Ha and Ni roofed
// passages plus the kitchen — together a National Treasure (sourced names;
// exact routes schematic).
{
  const iCorr = corridor(13.5, 2, 40, 3.5, 8, 12.5);
  addPart('corridor-i', 'I corridor (I no watariyagura)', 'corridors', iCorr);
  const roCorr = corridor(-13.5, -2, -40, -3.5, 8, 12.5);
  addPart('corridor-ro', 'Ro corridor (Ro no watariyagura)', 'corridors', roCorr);
  const haCorr = corridor(-44, -12, -40, -38, 8, 12.5);
  addPart('corridor-ha', 'Ha corridor (Ha no watariyagura)', 'corridors', haCorr);
  const niCorr = corridor(-32, -46, -12, -12, 8, 12.5);
  addPart('corridor-ni', 'Ni corridor (Ni no watariyagura)', 'corridors', niCorr);
  const kw = box(-34, -25, 8, 12, -58, -51);
  const [pyr, eave] = hipRoof(11.5, 9.5, 2.6, -29.5, 12, -54.5);
  addPart('kitchen', 'Castle kitchen (daidokoro)', 'corridors', [kw, pyr, eave]);
}

// === GATES: the maze-like approach from the south (sourced gate names from
// the visitor route; exact positions schematic).
{
  // Sakuramon bridge over the outer moat, rebuilt 2007 to the Edo design
  // (sourced).
  const deck = box(-2.5, 2.5, 1.2, 2, 138, 166);
  const r1 = box(-2.9, -2.5, 2, 3.1, 138, 166);
  const r2 = box(2.5, 2.9, 2, 3.1, 138, 166);
  const p1 = box(-2.2, 2.2, -1.5, 1.2, 142, 144);
  const p2 = box(-2.2, 2.2, -1.5, 1.2, 158, 160);
  addPart('sakuramon-bridge', 'Sakura Gate bridge', 'gates', [deck, r1, r2, p1, p2]);
}
{
  // Otemon: the great main gate, two stories (sourced as main entrance;
  // stories schematic).
  const w = 24, d = 10, x = 0, z = 128;
  const pierW = w * 0.24;
  const p1 = box(x - w / 2, x - w / 2 + pierW, 0, 7.5, z - d / 2, z + d / 2);
  const p2 = box(x + w / 2 - pierW, x + w / 2, 0, 7.5, z - d / 2, z + d / 2);
  const upper = box(x - w / 2, x + w / 2, 4.2, 7.5, z - d / 2, z + d / 2);
  const tier2 = box(x - w / 2 + 1.5, x + w / 2 - 1.5, 7.5, 11, z - d / 2 + 1, z + d / 2 - 1);
  addPart('otemon-gatehouse', 'Otemon gatehouse', 'gates', [p1, p2, upper, tier2]);
  addPart('otemon-roof', 'Otemon roof', 'gates', hipRoof(w + 3, d + 3, 3.4, x, 11, z));
}
{
  // Hishi (Diamond) Gate: main entrance to the castle proper, keeping its
  // Azuchi-Momoyama appearance (sourced).
  const w = 18, d = 8, x = 0, z = 62;
  const pierW = w * 0.26;
  const p1 = box(x - w / 2, x - w / 2 + pierW, 0, 6.5, z - d / 2, z + d / 2);
  const p2 = box(x + w / 2 - pierW, x + w / 2, 0, 6.5, z - d / 2, z + d / 2);
  const upper = box(x - w / 2, x + w / 2, 3.8, 6.5, z - d / 2, z + d / 2);
  addPart('hishinomon-gatehouse', 'Hishi Gate gatehouse', 'gates', [p1, p2, upper]);
  addPart('hishinomon-roof', 'Hishi Gate roof', 'gates', hipRoof(w + 3, d + 3, 3, x, 6.5, z));
}
// Inner maze gates along the winding approach (sourced names).
const INNER_GATES = [
  { id: 'i', name: 'I Gate', x: 28, z: 48, rot: 0.3 },
  { id: 'ro', name: 'Ro Gate', x: -20, z: 36, rot: -0.3 },
  { id: 'ha', name: 'Ha Gate', x: 18, z: 18, rot: 0.25 },
  { id: 'ni', name: 'Ni Gate', x: -12, z: 8, rot: -0.2 },
  { id: 'ho', name: 'Ho Gate', x: -30, z: -18, rot: 0.35 },
  { id: 'he', name: 'He Gate', x: 30, z: -28, rot: -0.3 },
  { id: 'chi', name: 'Chi Gate', x: 44, z: 8, rot: 0.2 },
  { id: 'ri', name: 'Ri Gate', x: 52, z: -14, rot: -0.25 },
  { id: 'ru', name: 'Ru Gate', x: -48, z: 20, rot: 0.3 },
  { id: 'nu', name: 'Nu Gate', x: -58, z: -38, rot: -0.35 },
  { id: 'bizen', name: 'Bizen Gate', x: 58, z: -30, rot: 0.25 },
];
for (const gt of INNER_GATES) {
  addPart(`gate-${gt.id}`, gt.name, 'gates', gatehouse(gt.x, gt.z, 10, 5.5, 4.5, gt.rot));
}
{
  // The three Mizuno gates on the western approach (sourced names).
  const geoms = [
    ...gatehouse(-40, -64, 9, 5, 4.2, 0.15),
    ...gatehouse(-28, -70, 9, 5, 4.2, -0.1),
    ...gatehouse(-16, -64, 9, 5, 4.2, 0.2),
  ];
  addPart('mizuno-gates', 'Mizuno Gates', 'gates', geoms);
}
{
  // Bridge over the inner moat before the Hishi Gate (schematic).
  const deck = box(-2.2, 2.2, 1, 1.8, 92, 112);
  const r1 = box(-2.6, -2.2, 1.8, 2.8, 92, 112);
  const r2 = box(2.2, 2.6, 1.8, 2.8, 92, 112);
  addPart('hishi-bridge', 'Hishi Gate bridge', 'gates', [deck, r1, r2]);
}

// === STONE WALLS (ishigaki): up to 26 m high with the curving musha-gaeshi
// overhang (sourced heights; exact wall runs schematic).
{
  // Raised stone platform carrying the whole keep cluster (schematic).
  addPart('tenshu-platform', 'Keep cluster stone platform', 'stone-walls', [
    frustumBox(-65, 65, 0, 7, -60, 50, 0.88),
  ]);
}
// Inner citadel wall ring (sourced max height 26 m; runs schematic).
addPart('citadel-wall-north', 'Citadel north stone wall', 'stone-walls', [
  frustumBox(-95, 95, 0, 14, -84, -78, 0.8),
]);
addPart('citadel-wall-east', 'Citadel east stone wall', 'stone-walls', [
  frustumBox(91, 97, 0, 14, -80, 90, 0.8),
]);
addPart('citadel-wall-south', 'Citadel south stone wall', 'stone-walls', [
  frustumBox(-95, 95, 0, 14, 86, 92, 0.8),
]);
addPart('citadel-wall-west', 'Citadel west stone wall', 'stone-walls', [
  frustumBox(-97, -91, 0, 14, -80, 90, 0.8),
]);
// Inner enclosure walls ringing the keep cluster on its platform.
addPart('enclosure-wall-north', 'Keep enclosure north wall', 'stone-walls', [
  box(-45, 45, 7, 12, -50, -47),
]);
addPart('enclosure-wall-east', 'Keep enclosure east wall', 'stone-walls', [
  box(42, 45, 7, 12, -47, 40),
]);
addPart('enclosure-wall-south', 'Keep enclosure south wall', 'stone-walls', [
  box(-45, 45, 7, 12, 37, 40),
]);
addPart('enclosure-wall-west', 'Keep enclosure west wall', 'stone-walls', [
  box(-45, -42, 7, 12, -47, 40),
]);
{
  // Ubagaishi: the old woman's millstone set into the wall by donation,
  // local legend (sourced as legend; placement schematic). Rotate BEFORE
  // translating.
  const stone = new THREE.CylinderGeometry(1.6, 1.6, 0.5, 16);
  stone.rotateX(Math.PI / 2);
  stone.translate(30, 7, 89.2);
  addPart('ubagaishi', 'Ubagaishi millstone', 'stone-walls', [stone]);
}
{
  // Aburakabe (oil wall): clay, gravel and fermented rice-water mix,
  // extremely hard and fireproof (single source; placement schematic).
  addPart('aburakabe', 'Aburakabe oil wall', 'stone-walls', [
    box(-45, -5, 0, 5, -26, -23.5),
  ]);
}
{
  // The 32 earthen walls (tsuijibe) lining the outer baileys (sourced
  // count; runs schematic).
  addPart('earthen-walls', 'Outer earthen walls', 'stone-walls', [
    box(-125, 125, 0, 4.5, -118, -115.5),
    box(122.5, 125, 0, 4.5, -115.5, 118),
    box(-125, 125, 0, 4.5, 115.5, 118),
    box(-125, -122.5, 0, 4.5, -115.5, 118),
  ]);
}
{
  // Bailey divider walls between Bizenmaru and the southern baileys.
  addPart('bailey-dividers', 'Bailey divider walls', 'stone-walls', [
    box(20, 80, 0, 6, -2, 1),
    box(-80, -20, 0, 6, 44, 47),
  ]);
}

// === TURRET TOWERS (yagura): 16 turrets among the Important Cultural
// Properties (sourced count; positions schematic).
function turret(x, z, w, d, h, baseY) {
  const walls = box(x - w / 2, x + w / 2, baseY, baseY + h, z - d / 2, z + d / 2);
  const [pyr, eave] = hipRoof(w + 2.5, d + 2.5, 2.6, x, baseY + h, z);
  return [walls, pyr, eave];
}
const TURRETS = [
  { id: 'taiko', name: 'Taiko Yagura', x: 88, z: -72 },
  { id: 'orimawari', name: 'Orimawari Yagura', x: 88, z: 82 },
  { id: 'ido', name: 'Ido Yagura', x: -88, z: 60 },
  { id: 'ka', name: 'Ka Yagura', x: -60, z: 88 },
  { id: 'wa', name: 'Wa Yagura', x: 20, z: 88 },
  { id: 'nu', name: 'Nu Yagura', x: -88, z: -60 },
];
for (const t of TURRETS) {
  const [walls, pyr, eave] = turret(t.x, t.z, 8, 8, 7, 14);
  addPart(`${t.id}-yagura`, t.name, 'turrets', [walls]);
  addPart(`${t.id}-yagura-roof`, `${t.name} roof`, 'turrets', [pyr, eave]);
}
{
  // Ka watariyagura: corridor turret by the inner moat (sourced name).
  addPart('ka-watariyagura', 'Ka corridor turret', 'turrets',
    turret(-72, 88, 7, 7, 6, 14));
}

// === NISHI-NO-MARU (west bailey): Princess Sen's quarters, the Hyakken
// Roka hundred-meter corridor and the Kesho Yagura (sourced; dimensions
// schematic).
{
  const walls = box(-185, -85, 0, 4.5, -23.5, -16.5);
  const [pyr, eave] = hipRoof(102.5, 9.5, 2.6, -135, 4.5, -20);
  addPart('hyakken-roka', 'Hyakken Roka corridor', 'nishinomaru', [walls, pyr, eave]);
}
{
  const walls = box(-140, -130, 0, 8, 30, 39);
  const [pyr, eave] = hipRoof(12.5, 11.5, 3, -135, 8, 34.5);
  addPart('kesho-yagura', 'Kesho Yagura', 'nishinomaru', [walls, pyr, eave]);
}
addPart('nishinomaru-court', 'Nishi-no-maru courtyard', 'nishinomaru', [
  box(-165, -105, 0, 0.4, -10, 50),
]);
addPart('nishinomaru-wall', 'Nishi-no-maru west wall', 'nishinomaru', [
  frustumBox(-172, -166, 0, 9, -40, 60, 0.85),
]);
{
  addPart('nishinomaru-gate', 'Nishi-no-maru gate', 'nishinomaru',
    gatehouse(-135, 56, 9, 5, 4.2, 0));
}

// === MOATS: three concentric moats — inner (Sangoku), middle and outer
// (sourced; widths and exact courses schematic).
function waterRing(x0, x1, z0, z1, wdt) {
  return [
    box(x0, x1, -1.2, 0.4, z0, z0 + wdt),
    box(x0, x1, -1.2, 0.4, z1 - wdt, z1),
    box(x0, x0 + wdt, -1.2, 0.4, z0 + wdt, z1 - wdt),
    box(x1 - wdt, x1, -1.2, 0.4, z0 + wdt, z1 - wdt),
  ];
}
addPart('inner-moat', 'Inner moat (Sangoku-bori)', 'moats',
  waterRing(-125, 125, -115, 125, 18));
{
  // Middle moat: northern and eastern arms (the area within it is the
  // Special Historic Site).
  addPart('middle-moat', 'Middle moat', 'moats', [
    box(-150, 150, -1.2, 0.4, -148, -132),
    box(134, 150, -1.2, 0.4, -132, 150),
  ]);
}
{
  // Outer moat: southern arm crossed by the Sakura Gate bridge.
  addPart('outer-moat', 'Outer moat', 'moats', [
    box(-80, 80, -1.2, 0.4, 168, 184),
  ]);
}
{
  // Stone edging along the inner moat.
  addPart('moat-edging', 'Inner moat stone edging', 'moats', [
    box(-107, 107, 0, 1.2, -97.5, -96),
    box(-107, 107, 0, 1.2, 96, 97.5),
    box(-107, -105.5, 0, 1.2, -96, 96),
    box(105.5, 107, 0, 1.2, -96, 96),
  ]);
}
{
  // Okiku-ido: the old stone-lined well of the Banshu Sarayashiki legend
  // (sourced).
  const rim = new THREE.CylinderGeometry(1.6, 1.8, 1.2, 12, 1, true);
  rim.translate(62, 0.6, -28);
  const dark = new THREE.CircleGeometry(1.5, 12);
  dark.rotateX(-Math.PI / 2);
  dark.translate(62, 0.15, -28);
  const post1 = box(60.2, 60.6, 0, 2.6, -28.4, -28);
  const post2 = box(63.4, 63.8, 0, 2.6, -28.4, -28);
  const [pyr, eave] = hipRoof(5.4, 4.6, 1.4, 62, 2.6, -28);
  addPart('okiku-well', 'Okiku well', 'moats', [rim, dark, post1, post2, pyr, eave]);
}

// === BAILEYS AND COURTYARDS (kuruwa).
addPart('bizenmaru', 'Bizenmaru bailey', 'baileys', [
  box(37, 87, 0, 0.4, -45, -5),
]);
{
  addPart('ninomaru', 'Ni-no-maru bailey', 'baileys', [
    box(10, 70, 0, 0.4, 50, 100),
  ]);
  // The east gate of one section of the second bailey is the sole survivor
  // of Hideyoshi's 1581 castle (sourced).
  addPart('hideyoshi-gate', 'Ni-no-maru east gate (1581)', 'baileys',
    gatehouse(70, 75, 8, 4.5, 3.8, Math.PI / 2));
}
addPart('sannomaru', 'San-no-maru bailey', 'baileys', [
  box(-90, -30, 0, 0.4, 50, 100),
]);
{
  // Harakiri-maru: courtyard intended for ritual suicide, never used
  // (sourced).
  addPart('harakiri-maru', 'Harakiri-maru courtyard', 'baileys', [
    box(22, 38, 0, 0.4, 38, 54),
  ]);
}
addPart('otemae-square', 'Otemae entrance square', 'baileys', [
  box(-20, 20, 0, 0.4, 168, 193),
]);

// === DEFENSIVE FEATURES.
{
  // Steep, narrow, deliberately misaligned staircases between keep floors
  // (sourced).
  const geoms = [];
  for (let f = 0; f < 5; f++) {
    const y0 = BASE_Y + f * FH;
    const xoff = f % 2 === 0 ? -4 : 4;
    for (let s = 0; s < 8; s++) {
      geoms.push(box(xoff - 1.5, xoff + 1.5, y0 + s * 0.6, y0 + s * 0.6 + 0.35,
        -2 + s * 0.55, -1.4 + s * 0.55));
    }
  }
  addPart('keep-staircases', 'Main keep staircases', 'defenses', geoms);
}
{
  // Bugukake weapon racks of the thousand-mat room: at one point 280 guns
  // and 90 spears (sourced).
  const geoms = [];
  for (let i = 0; i < 10; i++) {
    geoms.push(box(-12.5 + i * 2.6, -12 + i * 2.6, BASE_Y, BASE_Y + 2.2, 11.4, 11.9));
  }
  addPart('weapon-racks', 'Thousand-mat room weapon racks', 'defenses', geoms);
}
{
  // Musha-damari: miniature strong points in the four corners of each main
  // floor, firing inward through loopholes (sourced).
  const geoms = [];
  for (let f = 0; f < 4; f++) {
    const y0 = BASE_Y + f * FH;
    const w = [27, 25, 23, 21][f] / 2 - 2;
    const d = [25, 23, 21, 19][f] / 2 - 2;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      geoms.push(box(sx * w - 1.4, sx * w + 1.4, y0, y0 + 2.6, sz * d - 1.4, sz * d + 1.4));
    }
  }
  addPart('corner-strong-points', 'Corner strong points (musha-damari)', 'defenses', geoms);
}
{
  // Ishi-otoshi stone-drop windows under the keep eaves (sourced).
  const geoms = [];
  for (let i = 0; i < 4; i++) {
    const y0 = BASE_Y + (i + 1) * FH + 1.2;
    const w = [27, 25, 23, 21][i];
    for (const sx of [-1, 1]) {
      const g = box(sx * w / 2 - 0.9, sx * w / 2 + 0.9, y0 - 1.1, y0 + 0.2, -0.9, 0.9);
      g.rotateZ(sx * 0.35);
      geoms.push(g);
    }
  }
  addPart('stone-drop-windows', 'Stone-drop windows (ishi-otoshi)', 'defenses', geoms);
}
{
  // Sama loopholes for guns and arrows along the citadel walls (sourced).
  const geoms = [];
  for (let i = 0; i < 24; i++) {
    const x = -88 + i * 7.6;
    geoms.push(box(x - 0.5, x + 0.5, 9, 10.2, -81.4, -80.6));
  }
  for (let i = 0; i < 20; i++) {
    const z = -70 + i * 7.6;
    geoms.push(box(93.6, 94.4, 9, 10.2, z - 0.5, z + 0.5));
  }
  addPart('wall-loopholes', 'Wall loopholes (sama)', 'defenses', geoms);
}
{
  // Zigzag approach walls forcing the maze-like route (sourced concept;
  // exact runs schematic).
  const segs = [
    [-14, 14, 100, 103], [14, 40, 78, 81], [-40, -14, 78, 81],
    [-14, 14, 52, 55], [20, 44, 28, 31], [-44, -20, 28, 31],
  ];
  addPart('maze-walls', 'Maze approach walls', 'defenses',
    segs.map(([x0, x1, z0, z1]) => box(x0, x1, 0, 3.2, z0, z1)));
}

// === EXTRA PARTS (to reach full granularity).
{
  // Gate in the south wall of the keep enclosure (schematic).
  addPart('enclosure-gate', 'Keep enclosure gate', 'gates',
    gatehouse(0, 38.5, 9, 5, 4, 0));
}
{
  // Tiled caps on the earthen walls (schematic).
  addPart('earthen-caps', 'Earthen wall roof caps', 'stone-walls', [
    ...hipRoof(252, 5, 1.6, 0, 4.5, -116.75).slice(0, 1),
    ...hipRoof(252, 5, 1.6, 0, 4.5, 116.75).slice(0, 1),
  ]);
}

// ---------------------------------------------------------------- colors
// Schematic light palette: white plaster, dark grey tile roofs, grey stone,
// blue water. (The Eiffel Tower is the only dark realistic model.)
function colorFor(id) {
  if (id === 'tenshudai' || id === 'tenshu-platform') return '#9a958a';
  if (id === 'ka-watariyagura') return '#ece4d0';
  if (id.startsWith('citadel-wall-') || id.startsWith('enclosure-wall-')) return '#9a958a';
  if (id === 'tenshu-platform') return '#a09a8e';
  if (id === 'ubagaishi') return '#6e6960';
  if (id === 'aburakabe') return '#b98d55';
  if (id === 'earthen-walls') return '#ddd2b8';
  if (id === 'earthen-caps') return '#4b4c50';
  if (id === 'bailey-dividers') return '#9a958a';
  if (id === 'keep-basement') return '#cfc8b4';
  if (id.startsWith('keep-floor-')) return '#f4efe3';
  if (id.startsWith('keep-roof-') || id === 'keep-main-roof') return '#4b4c50';
  if (id === 'keep-gables') return '#434449';
  if (id === 'keep-shachihoko') return '#c9a227';
  if (id === 'keep-onigawara') return '#3f4044';
  if (id === 'keep-east-pillar' || id === 'keep-west-pillar') return '#7a5c3e';
  if (id === 'keep-top-shrine') return '#8a3b2e';
  if (id.endsWith('-base') && (id.startsWith('higashi') || id.startsWith('nishi') || id.startsWith('inui'))) return '#9a958a';
  if (id.endsWith('-walls') && (id.startsWith('higashi') || id.startsWith('nishi') || id.startsWith('inui'))) return '#f4efe3';
  if (id.endsWith('-roofs') && (id.startsWith('higashi') || id.startsWith('nishi') || id.startsWith('inui'))) return '#4b4c50';
  if (id.startsWith('corridor-') || id === 'kitchen') return '#ded4ba';
  if (id === 'sakuramon-bridge' || id === 'hishi-bridge') return '#6b4f35';
  if (id === 'otemon-gatehouse' || id === 'hishinomon-gatehouse') return '#e9e1cd';
  if (id === 'otemon-roof' || id === 'hishinomon-roof') return '#4b4c50';
  if (id.startsWith('gate-') || id === 'mizuno-gates' || id === 'enclosure-gate') return '#e9e1cd';
  if (id.endsWith('-yagura')) return '#ece4d0';
  if (id.endsWith('-yagura-roof')) return '#4b4c50';
  if (id === 'hyakken-roka' || id === 'kesho-yagura' || id === 'nishinomaru-gate') return '#e9e1cd';
  if (id === 'nishinomaru-court') return '#b3a88f';
  if (id === 'nishinomaru-wall') return '#9a958a';
  if (id === 'inner-moat' || id === 'middle-moat' || id === 'outer-moat') return '#86aec9';
  if (id === 'moat-edging') return '#8a857a';
  if (id === 'okiku-well') return '#8a857a';
  if (id === 'bizenmaru' || id === 'ninomaru' || id === 'sannomaru' || id === 'harakiri-maru' || id === 'otemae-square') return '#b3a88f';
  if (id === 'hideyoshi-gate') return '#e9e1cd';
  if (id === 'keep-staircases' || id === 'weapon-racks') return '#7a5c3e';
  if (id === 'corner-strong-points') return '#e9e1cd';
  if (id === 'stone-drop-windows' || id === 'wall-loopholes') return '#3f4044';
  if (id === 'maze-walls') return '#c9bfa8';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'main-keep', name: 'Main keep (Daitenshu)', color: '#f4efe3', description: 'The 46.4 m main keep: five stories outside, six floors plus a basement inside, on its great stone base.' },
  { id: 'subsidiary-keeps', name: 'Subsidiary keeps (Shōtenshu)', color: '#f4efe3', description: 'The east, west and northwest small keeps that cluster with the main keep.' },
  { id: 'corridors', name: 'Connecting corridors (Watariyagura)', color: '#ded4ba', description: 'The roofed I, Ro, Ha and Ni passages linking the keeps, with the castle kitchen.' },
  { id: 'gates', name: 'Gates (Mon)', color: '#e9e1cd', description: 'The maze of gates along the winding approach, from Otemon to the inner maze gates.' },
  { id: 'stone-walls', name: 'Stone walls (Ishigaki)', color: '#9a958a', description: 'Battered stone walls up to 26 m high, with the keep platform, earthen walls and the oil wall.' },
  { id: 'turrets', name: 'Turret towers (Yagura)', color: '#ece4d0', description: 'Defensive turret towers on the citadel walls.' },
  { id: 'nishinomaru', name: 'West bailey (Nishi-no-maru)', color: '#e9e1cd', description: 'Princess Sen’s west bailey with its hundred-meter corridor and the Kesho Yagura.' },
  { id: 'moats', name: 'Moats and water', color: '#86aec9', description: 'The three concentric moats and the legendary Okiku well.' },
  { id: 'baileys', name: 'Baileys and courtyards (Kuruwa)', color: '#b3a88f', description: 'The walled baileys and courtyards between the gates.' },
  { id: 'defenses', name: 'Defensive features', color: '#8a857a', description: 'Stairs, weapon racks, strong points, stone-drop windows and loopholes.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'main keep stone base (tenshudai)': 'The great stone base carrying the main keep, with battered walls in the musha-gaeshi manner that curve outward to repel climbers. Castle stone walls rise to 26 m at their highest. Exact base height is schematic.',
  'main keep basement': 'The keep basement, 385 m2, holding lavatories, a drain board and a kitchen corridor, facilities not seen in other keeps. Exact layout is schematic.',
  'main keep floor 1 walls': 'The first floor, 554 m2, called the thousand-mat room for its 330 plus tatami mats, with bugukake racks for matchlocks and spears; the castle once held 280 guns and 90 spears. Exact room divisions are schematic.',
  'main keep floor 2 walls': 'The second floor of about 550 m2. From outside, the second and third floors from the top read as a single story, so the keep shows five stories while holding six floors. Exact layout is schematic.',
  'main keep floor 3 walls': 'The third floor. The west pillar’s two timbers were joined on this floor during the Showa restoration. Exact layout is schematic.',
  'main keep floor 4 walls': 'The fourth floor, shrinking with the keep’s taper. Exact layout is schematic.',
  'main keep floor 5 walls': 'The fifth floor. The two great pillars rise from the basement to the fifth-floor beams. Exact layout is schematic.',
  'main keep floor 6 walls': 'The sixth and top floor, with panoramic views over Himeji and the Harima Plain. Exact layout is schematic.',
  'main keep story roof 1': 'Roof tier over the first story. Himeji’s roofs layer karahafu and chidori hafu gables partly to confuse attackers about the number of levels. Exact profile is schematic.',
  'main keep story roof 2': 'Roof tier over the second story. Exact profile is schematic.',
  'main keep story roof 3': 'Roof tier over the third story. Exact profile is schematic.',
  'main keep story roof 4': 'Roof tier over the fourth story. Exact profile is schematic.',
  'main keep story roof 5': 'Roof tier over the fifth story. Exact profile is schematic.',
  'main keep great roof': 'The great top roof of the keep. White roof plaster seals the flat and cylindrical tiles into an impermeable skin that protects the wooden frame from moisture and fire. Exact profile is schematic.',
  'main keep gables (karahafu and chidori hafu)': 'Curved karahafu gables and triangular chidori hafu plover gables decorating the roof tiers. Exact gable counts are schematic.',
  'main keep shachihoko ornaments': 'Golden shachihoko, mythical fish-tigers crowning the great roof ridge, believed to protect the castle from fire. Exact sculpture is schematic.',
  'main keep ridge-end tiles (onigawara)': 'Oni-gawara demon tiles capping the roof ridge ends; the clan crests of the castle’s lords are stamped into the end tiles of the eaves and ridges. Exact placement is schematic.',
  'main keep east pillar': 'The east great pillar, 97 cm across at the base and originally a single fir tree, now mostly replaced. Shown full length so it reads in the exploded view; exact position is schematic.',
  'main keep west pillar': 'The west great pillar, 85 by 95 cm at the base, of Japanese cypress. In the Showa restoration a 26.4 m cypress from the Kiso Mountains replaced it; the tree broke in handling, so a second tree from Mount Kasagata was joined to it on the third floor. Shown full length; exact position is schematic.',
  'main keep top-floor shrine': 'The small shrine on the top floor of the keep. Exact form is schematic.',
  'east small keep stone base': 'Stone base of the Higashi (east) small keep. Exact height is schematic.',
  'east small keep walls': 'Wooden walls of the east small keep, one of three subsidiary keeps forming the renritsu-shiki cluster with the main keep. Exact heights are schematic.',
  'east small keep roofs and shachihoko': 'Layered roofs of the east small keep with its own shachihoko ornaments. Exact profiles are schematic.',
  'west small keep stone base': 'Stone base of the Nishi (west) small keep. Exact height is schematic.',
  'west small keep walls': 'Wooden walls of the west small keep. Exact heights are schematic.',
  'west small keep roofs and shachihoko': 'Layered roofs of the west small keep with its own shachihoko ornaments. Exact profiles are schematic.',
  'northwest small keep stone base': 'Stone base of the Inui (northwest) small keep. Exact height is schematic.',
  'northwest small keep walls': 'Wooden walls of the northwest small keep. Exact heights are schematic.',
  'northwest small keep roofs and shachihoko': 'Layered roofs of the northwest small keep with its own shachihoko ornaments. Exact profiles are schematic.',
  'i corridor (i no watariyagura)': 'The I roofed corridor linking the main keep toward the east small keep. The I, Ro, Ha and Ni corridors with the kitchen are National Treasures. Exact route is schematic.',
  'ro corridor (ro no watariyagura)': 'The Ro roofed corridor linking the main keep toward the west small keep. Exact route is schematic.',
  'ha corridor (ha no watariyagura)': 'The Ha roofed corridor linking toward the northwest small keep. Exact route is schematic.',
  'ni corridor (ni no watariyagura)': 'The Ni roofed corridor of the keep cluster. Exact route is schematic.',
  'castle kitchen (daidokoro)': 'The castle kitchen (daidokoro) beside the corridors, part of the National Treasure listing. Exact placement is schematic.',
  'sakura gate bridge': 'The Sakuramon-bashi wooden bridge to the Otemon, reconstructed in 2007 to the original Edo-period design. Exact span is schematic.',
  'otemon gatehouse': 'The Otemon, great main gate of the castle, built here as a two-story gatehouse. Exact form is schematic.',
  'otemon roof': 'The great roof of the Otemon gatehouse. Exact profile is schematic.',
  'hishi gate gatehouse': 'The Hishi (Diamond) Gate, main entrance to the castle proper, keeping its Azuchi-Momoyama-period appearance. Exact form is schematic.',
  'hishi gate roof': 'Roof of the Hishi Gate. Exact profile is schematic.',
  'hishi gate bridge': 'Bridge over the inner moat before the Hishi Gate. Exact placement is schematic.',
  'keep enclosure gate': 'Gate in the south wall of the keep enclosure. Exact placement is schematic.',
  'i gate': 'The I Gate on the winding inner approach. Exact placement is schematic.',
  'ro gate': 'The Ro Gate on the winding inner approach. Exact placement is schematic.',
  'ha gate': 'The Ha Gate on the winding inner approach. Exact placement is schematic.',
  'ni gate': 'The Ni Gate on the winding inner approach. Exact placement is schematic.',
  'ho gate': 'The Ho Gate on the winding inner approach, near the Aburakabe oil wall. Exact placement is schematic.',
  'he gate': 'The He Gate on the inner approach. Exact placement is schematic.',
  'chi gate': 'The Chi Gate on the inner approach. Exact placement is schematic.',
  'ri gate': 'The Ri Gate near the Bizenmaru bailey. Exact placement is schematic.',
  'ru gate': 'The Ru Gate on the western approach. Exact placement is schematic.',
  'nu gate': 'The Nu Gate on the western approach. Exact placement is schematic.',
  'bizen gate': 'The Bizen Gate by the Bizenmaru bailey, with the Orimawari Yagura nearby. Exact placement is schematic.',
  'mizuno gates': 'The three Mizuno gates on the western approach. Exact placement is schematic.',
  'keep cluster stone platform': 'The raised stone platform carrying the whole keep cluster. Exact extent is schematic.',
  'citadel north stone wall': 'Battered stone wall of the inner citadel, rising toward the 26 m maximum of the castle’s stonework. Exact run is schematic.',
  'citadel east stone wall': 'Battered stone wall of the inner citadel. Exact run is schematic.',
  'citadel south stone wall': 'Battered stone wall of the inner citadel, holding the legendary Ubagaishi stone. Exact run is schematic.',
  'citadel west stone wall': 'Battered stone wall of the inner citadel. Exact run is schematic.',
  'keep enclosure north wall': 'Inner enclosure wall ringing the keep cluster on its platform. Exact run is schematic.',
  'keep enclosure east wall': 'Inner enclosure wall ringing the keep cluster. Exact run is schematic.',
  'keep enclosure south wall': 'Inner enclosure wall ringing the keep cluster. Exact run is schematic.',
  'keep enclosure west wall': 'Inner enclosure wall ringing the keep cluster. Exact run is schematic.',
  'ubagaishi millstone': 'The Ubagaishi: legend says an old woman donated her millstone for the castle walls, and it was set into the stonework here. Shown as a distinct stone; the tale is local legend.',
  'aburakabe oil wall': 'The Aburakabe (oil wall), reported as a unique mix of clay, gravel and fermented rice water, extremely hard and practically fireproof. Single-source account; placement is schematic.',
  'outer earthen walls': 'Plastered earthen walls (tsuijibe) lining the outer baileys; 32 survive as Important Cultural Properties. Exact runs are schematic.',
  'earthen wall roof caps': 'Tiled caps shedding water from the earthen walls. Exact form is schematic.',
  'bailey divider walls': 'Stone walls dividing the baileys so each courtyard could be defended alone. Exact runs are schematic.',
  'taiko yagura': 'The Taiko Yagura turret tower on the citadel wall. Exact placement is schematic.',
  'taiko yagura roof': 'Roof of the Taiko Yagura. Exact profile is schematic.',
  'orimawari yagura': 'The Orimawari Yagura by the Bizen Gate. Exact placement is schematic.',
  'orimawari yagura roof': 'Roof of the Orimawari Yagura. Exact profile is schematic.',
  'ido yagura': 'The Ido Yagura turret tower. Exact placement is schematic.',
  'ido yagura roof': 'Roof of the Ido Yagura. Exact profile is schematic.',
  'ka yagura': 'The Ka Yagura turret tower. Exact placement is schematic.',
  'ka yagura roof': 'Roof of the Ka Yagura. Exact profile is schematic.',
  'wa yagura': 'The Wa Yagura turret tower. Exact placement is schematic.',
  'wa yagura roof': 'Roof of the Wa Yagura. Exact profile is schematic.',
  'nu yagura': 'The Nu Yagura turret tower. Exact placement is schematic.',
  'nu yagura roof': 'Roof of the Nu Yagura. Exact profile is schematic.',
  'ka corridor turret': 'The Ka watariyagura, a corridor turret by the inner moat. Exact placement is schematic.',
  'hyakken roka corridor': 'The Hyakken Roka, the hundred-meter roofed corridor of the west bailey, vital to the castle’s defense and once serving Princess Sen’s quarters. Exact length is schematic.',
  'kesho yagura': 'The Kesho (makeup) Yagura of the Nishi-no-maru, part of Princess Sen’s residence. Exact form is schematic.',
  'nishi-no-maru courtyard': 'The courtyard of the west bailey. Exact extent is schematic.',
  'nishi-no-maru west wall': 'Stone wall closing the west bailey. Exact run is schematic.',
  'nishi-no-maru gate': 'Gate into the west bailey. Exact placement is schematic.',
  'inner moat (sangoku-bori)': 'The inner moat, the Sangoku-bori, ringing the citadel. Exact width and course are schematic.',
  'middle moat': 'The middle moat; the area within it is a designated Special Historic Site. Exact course is schematic.',
  'outer moat': 'The outer moat, crossed by the Sakura Gate bridge. Exact course is schematic.',
  'inner moat stone edging': 'Stone edging lining the inner moat. Exact course is schematic.',
  'okiku well': 'Okiku-ido, the old stone-lined well of the Banshu Sarayashiki ghost story, where the maid Okiku is said to count her plates each night. Exact form is schematic.',
  'bizenmaru bailey': 'The Bizenmaru bailey courtyard east of the keep cluster. Exact extent is schematic.',
  'ni-no-maru bailey': 'The second bailey courtyard. Exact extent is schematic.',
  'ni-no-maru east gate (1581)': 'The east gate of one section of the second bailey, the sole surviving structure of Hideyoshi’s 1581 castle. Exact form is schematic.',
  'san-no-maru bailey': 'The third bailey courtyard. Exact extent is schematic.',
  'harakiri-maru courtyard': 'The small Harakiri-maru courtyard, intended for ritual suicide but never used in the castle’s history. Exact extent is schematic.',
  'otemae entrance square': 'The entrance square before the Otemon. Exact extent is schematic.',
  'main keep staircases': 'Steep, narrow staircases between the keep floors, deliberately misaligned to slow attackers. Exact runs are schematic.',
  'thousand-mat room weapon racks': 'Bugukake weapon racks of the thousand-mat room, which once held 280 matchlocks and 90 spears. Exact arrangement is schematic.',
  'corner strong points (musha-damari)': 'Musha-damari: miniature strong points in the four corners of each main floor, where a few warriors could lock themselves and fire loopholes into the keep interior. Exact form is schematic.',
  'stone-drop windows (ishi-otoshi)': 'Ishi-otoshi stone-drop windows under the keep eaves, for dropping rocks and boiling water or oil on attackers. Exact placement is schematic.',
  'wall loopholes (sama)': 'Sama loopholes in the citadel walls for matchlocks and bows; 997 firing holes are reported across the castle. Exact spacing is schematic.',
  'maze approach walls': 'Low walls shaping the maze-like approach, forcing attackers along exposed zigzag routes. Exact runs are schematic.',
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
const binName = 'himeji-castle-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the himeji-castle directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Himeji Castle inner citadel, Himeji (schematic)',
  title: 'Himeji Castle',
  location: 'Himeji, Japan',
  blurb: 'Japan’s White Heron Castle in Himeji, its 46.4 m main keep rising over a cluster of three smaller keeps linked by roofed corridors. This schematic model covers the inner citadel, its maze of gates, stone walls and three moats — a fraction of the full 233-hectare complex.',
  sourceUrls: [
    { label: 'Wikipedia: Himeji Castle', url: 'https://en.wikipedia.org/wiki/Himeji_Castle' },
    { label: 'UNESCO: Himejijo nomination document', url: 'https://whc.Unesco.org/document/153975' },
    { label: 'Highlighting Japan: A Castle Reborn (2015)', url: 'http://www.gov-online.go.jp/eng/publicity/book/hlj/html/201509/201509_05_en.html' },
    { label: 'MLIT: Castle Craftsmanship', url: 'https://www.mlit.go.jp/tagengo-db/common/001561165.pdf' },
    { label: 'Jcastle.info: Himeji main compounds', url: 'https://www.jcastle.info/view/Himeji_Castle_-_Main_Compounds' },
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
  chunks: [{ url: '/models/himeji-castle/himeji-castle-0.bin', bytes: offset }],
  triangles,
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
