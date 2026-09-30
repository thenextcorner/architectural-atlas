// Procedural Taj Mahal complex for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned model of the full preserved
// complex (riverfront terrace, mausoleum, four minarets, great gate, mosque,
// jawab, charbagh garden and waterworks, jilaukhana forecourt, subsidiary
// tombs) and writes it in the atlas binary format:
// public/models/taj-mahal-simple/atlas.json + public/models/taj-mahal-simple/taj-mahal-simple-0.bin
//
// Dimensions used (Koch/Barraud 2006 survey via wonders-of-the-world.net,
// Taj Mahal Wikipedia article, Structurae, Archnet, Citizendium):
//   terrace 300 x 111.89 m, 8.7 m high; tahkhana river rooms (schematic);
//   plinth 95.5 m square, 6 m high; main block 56.9 x 56.9 m;
//   pishtaq arches 33 m per facade; two partly covered stair flights (south);
//   drum 12 m high, 18.4 m inner diameter, rope moulding at the dome junction;
//   outer dome 23 m high, 17.7 m diameter; finial 9.6 m with crescent moon;
//   minarets 43.02 m high, 5.65 m diameter, three tapered tiers, two balconies
//   each, slight outward lean (angle schematic);
//   great gate 41.2 x 34 m, 23.07 m high; central pishtaq 33 m high, 19 m wide;
//   no external dome on the gate (internal dome only); 11 chhatris per facade;
//   ornamental minarets about 30 m; mosque 56.6 x 23.38 m, 20.3 m high, three
//   domes over three bays (bay divisions schematic);
//   charbagh 296.31 m square; channels 120 m long, 6 m wide; central tank
//   platform 40 m wide with a 10 m square water space and five fountains;
//   fountain head from 9.47 m high walls; octagonal chamber with 7.3 m sides;
//   Mumtaz cenotaph on a 1.5 x 2.5 m marble base;
//   jilaukhana forecourt 153 gaz (about 124 m) deep; Saheli Burj tombs, bazaar
//   streets, and Khawasspura courtyards are schematic in plan.
// The component heights sum to 68 m without the finial, matching Koch's
// 67.97 m mausoleum height, and to 77.6 m with it; the 73 m total-height
// figure in other sources differs by a few meters, which is normal for
// pre-modern monuments. No total height is stated anywhere in the UI.
// Undocumented details (arch profiles, chhatri diameters, minaret tier
// spacing, exact lean angle, parterre planting, forecourt layout) are
// schematic.
//
// Layout: x = east, z = south, y = up, garden ground at y = 0.
// The terrace sits at the north (z -111.89..0), the garden south of it
// (z 0..296.31), the great gate on the garden's south edge, and the
// jilaukhana forecourt south of the gate.
//
// Usage: node scripts/generate-taj-mahal-simple.mjs
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'taj-mahal-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: the complex is about 300 m wide, mapped to 2.4 units.
const S = 2.4 / 300;

// ---------------------------------------------------------------- layout
const zc = -55.945; // mausoleum center z (terrace center)
const TERR_H = 8.7;
const PLINTH = 95.5, PLINTH_H = 6;
const PLINTH_TOP = TERR_H + PLINTH_H; // 14.7
const BLOCK = 56.9, BLOCK_H = 27;
const BLOCK_TOP = PLINTH_TOP + BLOCK_H; // 41.7
const DRUM_H = 12, DRUM_TOP = BLOCK_TOP + DRUM_H; // 53.7
const DOME_H = 23, DOME_D = 17.7, DOME_TOP = DRUM_TOP + DOME_H; // 76.7
const FIN_H = 9.6, FIN_TOP = DOME_TOP + FIN_H; // 86.3
const GC = 148.155; // garden center z
const GZ = 296.31; // garden south edge, gate center z
// Jilaukhana forecourt: 153 gaz deep (Archnet), gaz ~0.8128 m -> ~124 m.
const JZ0 = GZ + 17; // south face of the great gate
const JL = 124;
const JZC = JZ0 + JL / 2; // forecourt center z

// ---------------------------------------------------------------- helpers
function prep(g) {
  g.deleteAttribute('uv');
  return g.index ? g : mergeVertices(g);
}
function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function strut(a, b, w, d = w) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const len = dir.length();
  const g = new THREE.BoxGeometry(w, len, d);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
  );
  g.translate(va.x, va.y, va.z);
  return g;
}
// Merge a part's geometries, then apply one rigid transform to the result.
function finalize(geoms, quat, tx, ty, tz) {
  const merged = mergeGeometries(geoms.map(prep), false);
  if (!merged) throw new Error('Could not merge part geometries');
  if (quat) merged.applyQuaternion(quat);
  merged.translate(tx, ty, tz);
  return [merged];
}
// Onion dome profile: bulges past its base radius, then pinches to a tip.
function onionDome(r, h, seg = 24) {
  const prof = [
    [0, 0], [0.98, 0.02], [1.12, 0.12], [1.14, 0.25], [1.05, 0.42],
    [0.88, 0.58], [0.66, 0.72], [0.42, 0.83], [0.22, 0.91], [0.08, 0.96], [0, 1],
  ];
  const pts = prof.map(([pr, py]) => new THREE.Vector2(Math.max(pr * r, 0), py * h));
  return new THREE.LatheGeometry(pts, seg);
}
// Pishtaq: full-height jambs, a half-torus arch near the top, recessed tympanum.
function pishtaqPanel(w, h, t) {
  const geoms = [];
  const jw = Math.max(1.2, w * 0.12);
  geoms.push(box(jw, h, t, -(w / 2 - jw / 2), h / 2, 0));
  geoms.push(box(jw, h, t, w / 2 - jw / 2, h / 2, 0));
  const r = w / 2 - jw;
  const arch = new THREE.TorusGeometry(r, jw * 0.75, 8, 28, Math.PI);
  arch.translate(0, h - r, 0);
  geoms.push(arch);
  geoms.push(box(w - 2 * jw, h - r, t * 0.5, 0, (h - r) / 2, -t * 0.25));
  geoms.push(box(w, jw * 0.8, t * 1.1, 0, h - jw * 0.4, 0));
  return geoms;
}
// Chhatri: columned kiosk with an onion dome. Base width ~4.4 m at s = 1.
function chhatri(x, y, z, s = 1) {
  const geoms = [];
  const b = 4.4 * s, hh = 3.2 * s;
  geoms.push(box(b, 0.5 * s, b, x, y + 0.25 * s, z));
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
    geoms.push(cyl(0.18 * s, 0.22 * s, hh, x + ox * b * 0.38, y + 0.5 * s + hh / 2, z + oz * b * 0.38, 8));
  }
  geoms.push(cyl(b * 0.62, b * 0.62, 0.4 * s, x, y + 0.5 * s + hh + 0.2 * s, z, 8));
  const dome = onionDome(b * 0.34, 2.2 * s, 16);
  dome.translate(x, y + 0.5 * s + hh + 0.4 * s, z);
  geoms.push(dome);
  const ball = new THREE.SphereGeometry(0.22 * s, 8, 6);
  ball.translate(x, y + 0.5 * s + hh + 0.4 * s + 2.2 * s + 0.2 * s, z);
  geoms.push(ball);
  return geoms;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Riverfront terrace (5).
addPart('terrace-platform', 'Terrace platform', 'terrace', [
  box(300, TERR_H, 111.89, 0, TERR_H / 2, -55.945),
]);
{
  // Low parapet along the open riverfront edge, in segments.
  const geoms = [];
  for (const x of [-125, -62.5, 0, 62.5, 125]) {
    geoms.push(box(50, 1.2, 0.8, x, TERR_H + 0.6, -111.89 + 0.4));
  }
  addPart('yamuna-open-front', 'Yamuna-side open front', 'terrace', geoms);
}
addPart('terrace-west-wall', 'West boundary wall', 'terrace', [
  box(1.2, 4, 111.89, -149.4, TERR_H + 2, -55.945),
]);
addPart('terrace-east-wall', 'East boundary wall', 'terrace', [
  box(1.2, 4, 111.89, 149.4, TERR_H + 2, -55.945),
]);
{
  // Galleried suite of rooms under the terrace, opening toward the river.
  const geoms = [box(64, 4.5, 10, 0, 2.25, -106.4)];
  for (let i = -3; i <= 3; i++) {
    geoms.push(box(0.8, 4.5, 0.8, i * 9, 2.25, -111.4));
  }
  geoms.push(box(64, 0.8, 1, 0, 4.9, -111.4));
  addPart('tahkhana-rooms', 'Tahkhana river rooms', 'terrace', geoms);
}

// --- Mausoleum base (24).
addPart('marble-plinth', 'Marble plinth', 'mausoleum', [
  box(PLINTH, PLINTH_H, PLINTH, 0, TERR_H + PLINTH_H / 2, zc),
]);
{
  // Square block with chamfered corners: octagon extruded vertically.
  const a = BLOCK / 2, c = 6;
  const shape = new THREE.Shape();
  const v = [
    [a, a - c], [a - c, a], [-(a - c), a], [-a, a - c],
    [-a, -(a - c)], [-(a - c), -a], [a - c, -a], [a, -(a - c)],
  ];
  shape.moveTo(v[0][0], v[0][1]);
  for (let i = 1; i < v.length; i++) shape.lineTo(v[i][0], v[i][1]);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: BLOCK_H, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, PLINTH_TOP, zc);
  addPart('main-octagonal-block', 'Main octagonal block', 'mausoleum', [g]);
}
const FACES = [
  { id: 'north', name: 'North', ry: Math.PI, x: 0, z: zc - (BLOCK / 2 + 0.8) },
  { id: 'south', name: 'South', ry: 0, x: 0, z: zc + (BLOCK / 2 + 0.8) },
  { id: 'east', name: 'East', ry: Math.PI / 2, x: BLOCK / 2 + 0.8, z: zc },
  { id: 'west', name: 'West', ry: -Math.PI / 2, x: -(BLOCK / 2 + 0.8), z: zc },
];
function placeOnFace(geoms, f) {
  const merged = mergeGeometries(geoms.map(prep), false);
  if (!merged) throw new Error('Could not merge face geometries');
  merged.rotateY(f.ry);
  merged.translate(f.x, TERR_H, f.z);
  return [merged];
}
for (const f of FACES) {
  // Central 33 m iwan arch with spandrel shoulders.
  const arch = [];
  for (const pg of pishtaqPanel(14, 33, 1.6)) arch.push(pg);
  for (const sx of [-16, 16]) arch.push(box(4, 33, 1.4, sx, 33 / 2, 0));
  addPart(`iwan-arch-${f.id}`, `${f.name} iwan arch`, 'mausoleum', placeOnFace(arch, f));
  // Calligraphy band bordering the arch.
  const band = [
    box(13, 1.8, 0.3, 0, 30, 0.95),
    box(1.4, 28, 0.3, -6.6, 15, 0.95),
    box(1.4, 28, 0.3, 6.6, 15, 0.95),
  ];
  addPart(`calligraphy-band-${f.id}`, `${f.name} pishtaq calligraphy band`, 'mausoleum', placeOnFace(band, f));
  // Two tiers of smaller arched bays flanking the central iwan.
  const bays = [];
  for (const sx of [-10.5, 10.5]) {
    for (const [py, ph] of [[0, 12], [13.5, 12]]) {
      for (const pg of pishtaqPanel(6, ph, 1.2)) {
        pg.translate(sx, py, 0);
        bays.push(pg);
      }
    }
  }
  addPart(`side-bays-${f.id}`, `${f.name} side arched bays`, 'mausoleum', placeOnFace(bays, f));
  // Bas-relief dado panels at the base of the facade.
  addPart(`dado-panels-${f.id}`, `${f.name} dado panels`, 'mausoleum',
    placeOnFace([box(18, 4, 0.4, 0, 2, 0.9)], f));
}
for (const [id, name, sx, sz] of [
  ['ne', 'Northeast', 1, -1], ['nw', 'Northwest', -1, -1],
  ['se', 'Southeast', 1, 1], ['sw', 'Southwest', -1, 1],
]) {
  // Arched recesses on the chamfered corners, facing the minarets.
  const geoms = [];
  for (const pg of pishtaqPanel(8, 20, 1.2)) {
    pg.rotateY(Math.atan2(sx, sz));
    pg.translate(sx * 26.1, TERR_H, zc + sz * 26.1);
    geoms.push(pg);
  }
  addPart(`corner-bay-${id}`, `${name} corner bay`, 'mausoleum', geoms);
}
function stairFlight(x0, id, name) {
  // One of two partly covered flights rising from the terrace to the plinth.
  const geoms = [];
  for (let i = 0; i < 24; i++) {
    geoms.push(box(6.5, 0.25, 0.36, x0, TERR_H + 0.125 + i * 0.25, zc + PLINTH / 2 + 8 - (i * 1) / 3 - 0.18));
  }
  geoms.push(box(0.8, 3, 8.6, x0 - 3.65, TERR_H + 1.5, zc + PLINTH / 2 + 4.1));
  geoms.push(box(0.8, 3, 8.6, x0 + 3.65, TERR_H + 1.5, zc + PLINTH / 2 + 4.1));
  // Partial canopy over the upper half of the flight.
  geoms.push(box(7.3, 0.3, 4, x0, TERR_H + 4.6, zc + PLINTH / 2 + 5.5));
  geoms.push(box(0.4, 4.6, 0.4, x0 - 3.3, TERR_H + 2.3, zc + PLINTH / 2 + 3.8));
  geoms.push(box(0.4, 4.6, 0.4, x0 + 3.3, TERR_H + 2.3, zc + PLINTH / 2 + 3.8));
  addPart(id, name, 'mausoleum', geoms);
}
stairFlight(-8, 'south-stairs-west', 'South access stairs, west flight');
stairFlight(8, 'south-stairs-east', 'South access stairs, east flight');

// --- Dome cluster (15).
addPart('dome-drum', 'Dome drum', 'dome', [
  cyl(10, 10, DRUM_H, 0, BLOCK_TOP + DRUM_H / 2, zc, 24),
]);
{
  // Ornamental moulding with a twisted rope design at the dome junction.
  const ring = cyl(10.8, 10.8, 0.8, 0, BLOCK_TOP + DRUM_H - 0.4, zc, 24);
  const rope = new THREE.TorusGeometry(10.8, 0.35, 8, 32);
  rope.rotateX(Math.PI / 2);
  rope.translate(0, BLOCK_TOP + DRUM_H - 0.9, zc);
  addPart('drum-rope-moulding', 'Drum rope moulding', 'dome', [ring, rope]);
}
{
  const dome = onionDome(DOME_D / 2, DOME_H, 28);
  dome.translate(0, DRUM_TOP, zc);
  addPart('outer-onion-dome', 'Outer onion dome', 'dome', [
    dome,
    cyl(9.4, 9.4, 1, 0, DRUM_TOP + 0.5, zc, 24),
  ]);
}
{
  // Lotus flower ornament ringing the base of the outer dome.
  const geoms = [cyl(10.2, 9.3, 1.6, 0, DRUM_TOP + 0.8, zc, 24)];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI * 2) / 16;
    const petal = new THREE.SphereGeometry(0.55, 6, 5);
    petal.scale(1, 1.6, 0.6);
    petal.translate(9.8 * Math.cos(a), DRUM_TOP + 1.2, zc + 9.8 * Math.sin(a));
    geoms.push(petal);
  }
  addPart('dome-lotus-base', 'Dome lotus base', 'dome', geoms);
}
{
  // Smaller separate interior dome over the burial chamber.
  const dome = new THREE.SphereGeometry(9, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 1.1, 1);
  dome.translate(0, PLINTH_TOP + 25, zc);
  addPart('inner-false-dome', 'Inner false dome', 'dome', [dome]);
}
{
  // 9.6 m gilded finial: shaft and stacked orbs (the crescent is separate).
  const geoms = [cyl(0.25, 0.5, 6, 0, DOME_TOP + 3, zc, 10)];
  const o1 = new THREE.SphereGeometry(0.9, 12, 10);
  o1.translate(0, DOME_TOP + 6.6, zc);
  const o2 = new THREE.SphereGeometry(0.7, 12, 10);
  o2.translate(0, DOME_TOP + 7.9, zc);
  geoms.push(o1, o2);
  addPart('gilded-finial', 'Gilded finial', 'dome', geoms);
}
{
  const moon = new THREE.TorusGeometry(1.1, 0.28, 8, 20, 4.4);
  moon.rotateY(Math.PI / 2);
  moon.translate(0, DOME_TOP + 8.2, zc);
  addPart('crescent-moon', 'Crescent moon', 'dome', [moon]);
}
for (const [id, name, sx, sz] of [
  ['ne', 'Northeast', 1, -1], ['nw', 'Northwest', -1, -1],
  ['se', 'Southeast', 1, 1], ['sw', 'Southwest', -1, 1],
]) {
  addPart(`chhatri-${id}`, `${name} corner chhatri`, 'dome',
    chhatri(sx * 22, BLOCK_TOP, zc + sz * 22, 1.0));
}
for (const [id, ex, ez] of [
  ['north', 0, -1], ['south', 0, 1], ['west', -1, 0], ['east', 1, 0],
]) {
  // Tall decorative spires edging one side of the roofline.
  const geoms = [];
  for (const o of [-14, 0, 14]) {
    const x = ex !== 0 ? ex * 26 : o;
    const z = zc + (ez !== 0 ? ez * 26 : o);
    geoms.push(cyl(0.5, 0.9, 4.5, x, BLOCK_TOP + 2.25, z, 8));
    const ball = new THREE.SphereGeometry(0.5, 8, 6);
    ball.translate(x, BLOCK_TOP + 4.7, z);
    geoms.push(ball);
  }
  addPart(`guldasta-${id}`, `Guldasta spires, ${id} edge`, 'dome', geoms);
}

// --- Minarets (20): base, three-tier shaft, two balconies, chhatri cap each.
const LEAN = (1.75 * Math.PI) / 180;
const TIER_H = 12.5, BASE_R = 2.825;
for (const [id, name, sx, sz] of [
  ['ne', 'Northeast', 1, -1], ['nw', 'Northwest', -1, -1],
  ['se', 'Southeast', 1, 1], ['sw', 'Southwest', -1, 1],
]) {
  const ox = sx * Math.SQRT1_2, oz = sz * Math.SQRT1_2;
  const quat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(oz, 0, -ox).normalize(), LEAN);
  const cx = sx * PLINTH / 2, cz = zc + sz * PLINTH / 2;
  addPart(`minaret-${id}-base`, `${name} minaret base`, 'minarets',
    finalize([box(8, 2, 8, 0, 1, 0)], quat, cx, TERR_H, cz));
  const shaft = [];
  for (let t = 0; t < 3; t++) {
    const r0 = BASE_R * (1 - 0.12 * t), r1 = BASE_R * (1 - 0.12 * (t + 1));
    shaft.push(cyl(r1, r0, TIER_H, 0, 2 + t * TIER_H + TIER_H / 2, 0, 16));
  }
  addPart(`minaret-${id}-shaft`, `${name} minaret shaft`, 'minarets',
    finalize(shaft, quat, cx, TERR_H, cz));
  for (const [bid, label, t] of [['lower', 'lower', 0], ['upper', 'upper', 1]]) {
    const r1 = BASE_R * (1 - 0.12 * (t + 1));
    const by = 2 + (t + 1) * TIER_H;
    const ring = cyl(r1 + 1.0, r1 + 1.0, 0.8, 0, by, 0, 16);
    const rail = new THREE.TorusGeometry(r1 + 1.0, 0.12, 6, 24);
    rail.rotateX(Math.PI / 2);
    rail.translate(0, by + 0.7, 0);
    addPart(`minaret-${id}-${bid}-balcony`, `${name} minaret ${label} balcony`, 'minarets',
      finalize([ring, rail], quat, cx, TERR_H, cz));
  }
  // Cap: top balcony ring, crowning chhatri, and finial.
  const r3 = BASE_R * (1 - 0.12 * 3);
  const by3 = 2 + 3 * TIER_H;
  const cap = [cyl(r3 + 1.0, r3 + 1.0, 0.8, 0, by3, 0, 16)];
  const rail3 = new THREE.TorusGeometry(r3 + 1.0, 0.12, 6, 24);
  rail3.rotateX(Math.PI / 2);
  rail3.translate(0, by3 + 0.7, 0);
  cap.push(rail3);
  cap.push(...chhatri(0, by3, 0, 0.82));
  cap.push(cyl(0.12, 0.12, 1.2, 0, by3 + 5.6, 0, 8));
  const tip = new THREE.SphereGeometry(0.3, 8, 6);
  tip.translate(0, by3 + 6.3, 0);
  cap.push(tip);
  addPart(`minaret-${id}-cap`, `${name} minaret chhatri cap`, 'minarets',
    finalize(cap, quat, cx, TERR_H, cz));
}

// --- Interior chamber (13).
{
  // Octagonal chamber: 7.3 m sides, 25 m walls, arched openings per face.
  const R = 7.3 / (2 * Math.sin(Math.PI / 8));
  const geoms = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const wall = [
      box(1.65, 25, 1.2, -2.825, 12.5, 0),
      box(1.65, 25, 1.2, 2.825, 12.5, 0),
      box(7.3, 11, 1.2, 0, 14 + 5.5, 0),
    ];
    const merged = mergeGeometries(wall.map(prep), false);
    merged.rotateY(Math.PI / 2 - a);
    merged.translate(R * Math.cos(a), PLINTH_TOP, zc + R * Math.sin(a));
    geoms.push(merged);
  }
  addPart('octagonal-chamber', 'Octagonal burial chamber', 'interior', geoms);
}
{
  // Two tiers of eight pishtaq arches lining the chamber walls.
  const R = 7.3 / (2 * Math.sin(Math.PI / 8));
  const geoms = [];
  for (const ty of [8, 18]) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const arch = [
        box(1.4, 6, 0.6, -2.9, 3, 0),
        box(1.4, 6, 0.6, 2.9, 3, 0),
        box(7.2, 1.4, 0.6, 0, 6.7, 0),
      ];
      const merged = mergeGeometries(arch.map(prep), false);
      merged.rotateY(Math.PI / 2 - a);
      merged.translate(R * Math.cos(a), PLINTH_TOP + ty, zc + R * Math.sin(a));
      geoms.push(merged);
    }
  }
  addPart('interior-pishtaq-tiers', 'Interior pishtaq tiers', 'interior', geoms);
}
addPart('mumtaz-cenotaph', 'Mumtaz cenotaph', 'interior', [
  box(1.5, 1.0, 2.5, 0, PLINTH_TOP + 0.5, zc - 1),
  box(1.1, 1.2, 2.1, 0, PLINTH_TOP + 1.0 + 0.6, zc - 1),
  box(1.1, 0.3, 2.1, 0, PLINTH_TOP + 2.35, zc - 1),
]);
addPart('shah-jahan-cenotaph', 'Shah Jahan cenotaph', 'interior', [
  box(1.7, 1.1, 2.7, 3.2, PLINTH_TOP + 0.55, zc + 0.5),
  box(1.3, 1.3, 2.3, 3.2, PLINTH_TOP + 1.1 + 0.65, zc + 0.5),
  box(1.3, 0.3, 2.3, 3.2, PLINTH_TOP + 2.55, zc + 0.5),
]);
{
  // Eight pierced marble panels enclosing the cenotaphs, one part per face.
  // x = east, z = south, so angle i*pi/4 maps to E, SE, S, SW, W, NW, N, NE.
  const FACE_IDS = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const panel = [
      box(3.2, 0.12, 0.1, 0, 1.04, 0), box(3.2, 0.12, 0.1, 0, -1.04, 0),
      box(0.12, 2.2, 0.1, -1.54, 0, 0), box(0.12, 2.2, 0.1, 1.54, 0, 0),
    ];
    for (const lx of [-0.75, 0, 0.75]) panel.push(box(0.05, 2.0, 0.06, lx, 0, 0));
    for (const ly of [-0.5, 0, 0.5]) panel.push(box(3.0, 0.05, 0.06, 0, ly, 0));
    const merged = mergeGeometries(panel.map(prep), false);
    merged.rotateY(Math.PI / 2 - a);
    merged.translate(4.5 * Math.cos(a), PLINTH_TOP + 1.3, zc + 4.5 * Math.sin(a));
    const fid = FACE_IDS[i];
    const flabel = fid.charAt(0).toUpperCase() + fid.slice(1);
    addPart(`jali-panel-${fid}`, `${flabel} jali screen panel`, 'interior', [merged]);
  }
}
{
  // Plain rectangular basement chamber with the actual graves.
  const geoms = [
    box(12, 0.5, 8, 0, TERR_H + 0.25, zc),
    box(12, 3.5, 0.6, 0, TERR_H + 0.5 + 1.75, zc - 3.7),
    box(12, 3.5, 0.6, 0, TERR_H + 0.5 + 1.75, zc + 3.7),
    box(0.6, 3.5, 8, -5.7, TERR_H + 0.5 + 1.75, zc),
    box(0.6, 3.5, 8, 5.7, TERR_H + 0.5 + 1.75, zc),
    box(12, 0.5, 8, 0, TERR_H + 4.25, zc),
    box(2.2, 0.9, 1.2, -1.5, TERR_H + 0.5 + 0.45, zc),
    box(2.2, 0.9, 1.2, 1.5, TERR_H + 0.5 + 0.45, zc),
  ];
  addPart('lower-tomb-chamber', 'Lower tomb chamber', 'interior', geoms);
}

// --- Great gate (9), centered on the garden's south edge.
addPart('gate-body', 'Great gate body', 'gate', [
  box(41.2, 23.07, 34, 0, 23.07 / 2, GZ),
]);
{
  // Recessed two-story central arch on both facades.
  const geoms = [];
  for (const sz of [-1, 1]) {
    for (const pg of pishtaqPanel(12, 20, 2)) {
      if (sz < 0) pg.rotateY(Math.PI);
      pg.translate(0, 0, GZ + sz * (17 + 0.2));
      geoms.push(pg);
    }
  }
  addPart('gate-central-arch', 'Gate central arch', 'gate', geoms);
}
{
  // Two pairs of smaller decorative iwans flanking the arch per facade.
  const geoms = [];
  for (const sz of [-1, 1]) {
    for (const sx of [-15.5, -9, 9, 15.5]) {
      for (const pg of pishtaqPanel(5, 11, 1.4)) {
        if (sz < 0) pg.rotateY(Math.PI);
        pg.translate(sx, 0, GZ + sz * (17 + 0.3));
        geoms.push(pg);
      }
    }
  }
  addPart('gate-flanking-arches', 'Gate flanking arches', 'gate', geoms);
}
{
  // Rows of 11 white chhatris along each facade roofline.
  const geoms = [];
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 11; i++) {
      const x = -18 + i * 3.6;
      geoms.push(box(1.4, 0.5, 1.4, x, 23.07 + 0.25, GZ + sz * 16.3));
      const dome = new THREE.SphereGeometry(0.85, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      dome.translate(x, 23.07 + 0.5, GZ + sz * 16.3);
      geoms.push(dome);
    }
  }
  addPart('gate-chhatri-rows', 'Gate chhatri rows', 'gate', geoms);
}
{
  // Four octagonal corner towers with larger chhatris.
  const geoms = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * 18.5, z = GZ + sz * 15;
      geoms.push(cyl(3.2, 3.6, 27, x, 13.5, z, 8));
      geoms.push(...chhatri(x, 27, z, 0.9));
    }
  }
  addPart('gate-corner-towers', 'Gate corner towers', 'gate', geoms);
}
{
  // Thin ornamental minarets, about 30 m, flanking each facade.
  const geoms = [];
  for (const sz of [-1, 1]) {
    for (const sx of [-7, 7]) {
      const x = sx, z = GZ + sz * 17.8;
      geoms.push(cyl(0.5, 0.8, 30, x, 15, z, 10));
      const ball = new THREE.SphereGeometry(0.7, 10, 8);
      ball.translate(x, 30.4, z);
      geoms.push(ball);
      geoms.push(cyl(0.08, 0.08, 1.6, x, 31.4, z, 6));
    }
  }
  addPart('gate-mini-minarets', 'Gate ornamental minarets', 'gate', geoms);
}
{
  // Black calligraphy inlay panels on the facades.
  const geoms = [];
  for (const sz of [-1, 1]) {
    for (const sx of [-12, 12]) {
      geoms.push(box(6, 1.2, 0.15, sx, 16, GZ + sz * (17 + 0.1)));
    }
  }
  addPart('gate-calligraphy', 'Gate calligraphy panels', 'gate', geoms);
}
{
  // Side chambers of the gate's nine-part plan; internal layout schematic.
  const geoms = [];
  for (const sx of [-1, 1]) geoms.push(box(9, 12, 22, sx * 13.5, 6, GZ));
  addPart('gate-side-chambers', 'Gate side chambers', 'gate', geoms);
}
{
  // Internal dome over the central space, with no outward expression.
  const dome = new THREE.SphereGeometry(8, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.translate(0, 14, GZ);
  addPart('gate-internal-dome', 'Gate internal dome', 'gate', [dome]);
}

// --- Mosque (west) and jawab (east), mirrored across the mausoleum (17).
function prayerHouse(cx, mirror) {
  const s = mirror ? 'jawab' : 'mosque';
  const S = mirror ? 'Jawab' : 'Mosque';
  const bayWord = mirror ? 'hall bay' : 'prayer bay';
  const parts = [];
  // Three bays under the three domes; divisions are schematic.
  const bays = [
    ['central', 20, zc], ['west', 18.3, zc - 19.15], ['east', 18.3, zc + 19.15],
  ];
  for (const [bid, bd, bz] of bays) {
    parts.push([`${s}-${bid}-bay`, `${S} ${bid} ${bayWord}`, [
      box(23.38, 20.3, bd, cx, TERR_H + 10.15, bz),
    ]]);
  }
  // Three domes: the central dome is the largest.
  const dc = onionDome(4.5, 7, 20);
  dc.translate(cx, TERR_H + 20.3, zc);
  parts.push([`${s}-central-dome`, `${S} central dome`, [dc]]);
  for (const [did, dz] of [['north-side-dome', -18], ['south-side-dome', 18]]) {
    const d = onionDome(3.2, 5, 16);
    d.translate(cx, TERR_H + 20.3, zc + dz);
    parts.push([`${s}-${did}`, `${S} ${did.replace(/-/g, ' ')}`, [d]]);
  }
  {
    // Great arched front facing the mausoleum.
    const geoms = [];
    for (const pg of pishtaqPanel(12, 18, 1.5)) {
      pg.rotateY(mirror ? -Math.PI / 2 : Math.PI / 2);
      pg.translate(cx + (mirror ? -1 : 1) * (23.38 / 2 + 0.75), TERR_H, zc);
      geoms.push(pg);
    }
    parts.push([`${s}-pishtaq`, `${S} pishtaq`, geoms]);
  }
  {
    // Slender minarets flanking the front corners.
    const geoms = [];
    const fx = cx + (mirror ? -1 : 1) * 10.5;
    for (const dz of [-26, 26]) {
      geoms.push(cyl(0.7, 1.0, 24, fx, TERR_H + 12, zc + dz, 10));
      const d = onionDome(1.1, 2.2, 12);
      d.translate(fx, TERR_H + 24, zc + dz);
      geoms.push(d);
    }
    parts.push([`${s}-minarets`, `${S} minarets`, geoms]);
  }
  if (!mirror) {
    // Prayer niche in the west wall, marking the direction of Mecca.
    parts.push(['mosque-mihrab', 'Mosque mihrab', [
      box(1.2, 8, 3, cx - 23.38 / 2 - 0.6, TERR_H + 4, zc),
    ]]);
  }
  return parts;
}
for (const [id, name, geoms] of prayerHouse(-89.44, false)) addPart(id, name, 'mosque', geoms);
for (const [id, name, geoms] of prayerHouse(89.44, true)) addPart(id, name, 'mosque', geoms);

// --- Charbagh garden (11).
addPart('garden-platform', 'Charbagh garden platform', 'charbagh', [
  box(296.31, 0.6, 296.31, 0, 0.3, GC),
]);
{
  // Crenellated red sandstone enclosure walls; the south wall leaves a gap
  // for the great gate.
  const gw = 148.155;
  addPart('charbagh-wall-south', 'Charbagh south enclosure wall', 'charbagh', [
    box(gw - 21, 4, 1.5, -(21 + (gw - 21) / 2), 2, GZ - 0.75),
    box(gw - 21, 4, 1.5, 21 + (gw - 21) / 2, 2, GZ - 0.75),
  ]);
  addPart('charbagh-wall-west', 'Charbagh west enclosure wall', 'charbagh', [
    box(1.5, 4, 296.31, -(gw - 0.75), 2, GC),
  ]);
  addPart('charbagh-wall-east', 'Charbagh east enclosure wall', 'charbagh', [
    box(1.5, 4, 296.31, gw - 0.75, 2, GC),
  ]);
}
for (const [id, name, qx, qz] of [
  ['nw', 'Northwest', -1, -1], ['ne', 'Northeast', 1, -1],
  ['sw', 'Southwest', -1, 1], ['se', 'Southeast', 1, 1],
]) {
  // 16 sunken parterres per quadrant in a 4x4 grid.
  const geoms = [];
  for (const ox of [-45, -15, 15, 45]) {
    for (const oz of [-45, -15, 15, 45]) {
      const px = qx * 74.08 + ox, pz = GC + qz * 74.08 + oz;
      geoms.push(box(30, 0.3, 30, px, 0.75, pz));
      geoms.push(box(28.4, 0.15, 28.4, px, 0.375, pz));
    }
  }
  addPart(`parterres-${id}`, `${name} quadrant parterres`, 'charbagh', geoms);
}
{
  // Avenues of trees along the water channels; positions are schematic.
  const geoms = [];
  const tree = (x, z) => {
    geoms.push(cyl(0.22, 0.3, 1.6, x, 0.8, z, 6));
    geoms.push(cyl(0.05, 1.3, 3.4, x, 3.3, z, 7));
  };
  for (let z = 20; z <= 270; z += 12.5) {
    if (Math.abs(z - GC) > 25) { tree(-9, z); tree(9, z); }
  }
  for (let x = -140; x <= 140; x += 12.5) {
    if (Math.abs(x) > 25) { tree(x, GC - 9); tree(x, GC + 9); }
  }
  addPart('garden-tree-rows', 'Garden tree rows', 'charbagh', geoms);
}
{
  // Raised walkways edging the water channels.
  const geoms = [
    box(3, 0.35, 120, -4.5, 0.775, GC), box(3, 0.35, 120, 4.5, 0.775, GC),
    box(120, 0.35, 3, 0, 0.775, GC - 4.5), box(120, 0.35, 3, 0, 0.775, GC + 4.5),
  ];
  addPart('khiyaban-walkways', 'Khiyaban walkways', 'charbagh', geoms);
}
{
  // Low walled enclosure marking Mumtaz Mahal's temporary burial site in the
  // western garden near the riverfront terrace.
  const geoms = [
    box(12, 1, 0.6, -100, 1.1, 36), box(12, 1, 0.6, -100, 1.1, 44),
    box(0.6, 1, 8, -106, 1.1, 40), box(0.6, 1, 8, -94, 1.1, 40),
  ];
  addPart('temporary-burial-enclosure', 'Temporary burial enclosure', 'charbagh', geoms);
}

// --- Waterworks (7).
{
  // Four straight channels, 120 m long and 6 m wide, split into reaches.
  addPart('channel-ns-north', 'North-south channel, north reach', 'waterworks', [
    box(6, 0.5, 120, 0, 0.5, 80),
  ]);
  addPart('channel-ns-south', 'North-south channel, south reach', 'waterworks', [
    box(6, 0.5, 120, 0, 0.5, 216.31),
  ]);
  addPart('channel-ew-west', 'East-west channel, west reach', 'waterworks', [
    box(120, 0.5, 6, -80, 0.5, GC),
  ]);
  addPart('channel-ew-east', 'East-west channel, east reach', 'waterworks', [
    box(120, 0.5, 6, 80, 0.5, GC),
  ]);
}
{
  // Raised marble tank al Hawd al-Kawthar: 40 m platform, 10 m water square.
  const geoms = [
    box(40, 1.2, 40, 0, 1.2, GC),
    box(10.8, 0.6, 0.4, 0, 2.0, GC - 5.2), box(10.8, 0.6, 0.4, 0, 2.0, GC + 5.2),
    box(0.4, 0.6, 10.8, -5.2, 2.0, GC), box(0.4, 0.6, 10.8, 5.2, 2.0, GC),
    box(9.6, 0.4, 9.6, 0, 1.9, GC),
  ];
  for (const [fx, fz] of [[0, 0], [-3, -3], [3, -3], [-3, 3], [3, 3]]) {
    geoms.push(cyl(0.12, 0.12, 2.2, fx, 3.1, GC + fz, 8));
  }
  addPart('central-tank', 'Central water tank', 'waterworks', geoms);
}
{
  // Widened reflecting basin on the north-south axis, north of the tank.
  const geoms = [box(10, 0.5, 60, 0, 0.52, 50)];
  addPart('reflecting-pool', 'Reflecting pool', 'waterworks', geoms);
}
{
  // Gravity-fed system: raised tanks with elevated conduits to the center.
  const geoms = [];
  for (const tz of [100, 150, 200]) {
    geoms.push(cyl(3, 3, 9.47, 138, 9.47 / 2, tz, 14));
    geoms.push(strut([138, 1.25, tz], [20, 1.25, tz], 0.6));
  }
  addPart('garden-waterworks', 'Garden waterworks', 'waterworks', geoms);
}

// --- Jilaukhana forecourt (7), south of the great gate.
addPart('jilaukhana-court', 'Jilaukhana forecourt', 'forecourt', [
  box(296, 0.4, JL, 0, 0.2, JZC),
]);
function bazaarStreet(sx, id, name) {
  // Colonnaded street with cusped-arch shop fronts; layout is schematic.
  const geoms = [];
  for (const row of [-6, 6]) {
    for (let i = 0; i < 8; i++) {
      const x = sx * (92 + i * 7.5);
      geoms.push(cyl(0.35, 0.4, 4, x, 2, JZC + row, 8));
    }
    geoms.push(box(60, 0.8, 1.2, sx * 118.25, 4.4, JZC + row));
    geoms.push(box(60, 3.2, 0.6, sx * 118.25, 2, JZC + row + (row < 0 ? -1.2 : 1.2)));
  }
  geoms.push(box(62, 0.5, 15, sx * 118.25, 4.85, JZC));
  addPart(id, name, 'forecourt', geoms);
}
bazaarStreet(1, 'bazaar-street-east', 'East bazaar street');
bazaarStreet(-1, 'bazaar-street-west', 'West bazaar street');
{
  // Enclosure walls with gate gaps at the bazaar streets and the south gate.
  const wh = 4, wt = 1.5;
  for (const [id, label, sx] of [['east', 'east', 1], ['west', 'west', -1]]) {
    addPart(`forecourt-wall-${id}`, `Forecourt ${label} wall`, 'forecourt', [
      box(wt, wh, (JZC - 6) - JZ0, sx * 148.5, wh / 2, (JZ0 + JZC - 6) / 2),
      box(wt, wh, (JZ0 + JL) - (JZC + 6), sx * 148.5, wh / 2, ((JZC + 6) + JZ0 + JL) / 2),
    ]);
  }
  addPart('forecourt-wall-south', 'Forecourt south wall', 'forecourt', [
    box(142, wh, wt, -(8 + 71), wh / 2, JZ0 + JL),
    box(142, wh, wt, 8 + 71, wh / 2, JZ0 + JL),
  ]);
}
{
  // Twin attendant courtyards in the northern corners of the forecourt.
  const geoms = [];
  for (const sx of [-1, 1]) {
    const cxk = sx * 118, czk = JZ0 + 26;
    geoms.push(box(32, 0.3, 32, cxk, 0.55, czk));
    geoms.push(box(32, 2.6, 0.8, cxk, 1.6, czk - 15.6));
    geoms.push(box(32, 2.6, 0.8, cxk, 1.6, czk + 15.6));
    geoms.push(box(0.8, 2.6, 32, cxk - 15.6, 1.6, czk));
    geoms.push(box(0.8, 2.6, 32, cxk + 15.6, 1.6, czk));
    geoms.push(box(10, 3, 8, cxk - 8, 1.8, czk));
    geoms.push(box(10, 3, 8, cxk + 8, 1.8, czk));
  }
  addPart('khawasspura-courtyards', 'Khawasspura attendant courtyards', 'forecourt', geoms);
}

// --- Subsidiary tombs (2): the Saheli Burj at the forecourt's south corners.
function saheliBurj(sx, id, name) {
  // Miniature replica of the main complex: raised platform, octagonal tomb,
  // flanking buildings, and a small charbagh in front. Plan is schematic.
  const geoms = [];
  const cxb = sx * 118, czb = JZ0 + JL - 30;
  geoms.push(box(24, 2, 24, cxb, 1, czb));
  for (let i = 0; i < 5; i++) {
    geoms.push(box(6, 0.4, 1, cxb, 0.2 + i * 0.4, czb - 14 + i));
  }
  geoms.push(cyl(5, 5.5, 6, cxb, 2 + 3, czb, 8));
  geoms.push(box(10, 0.3, 2.5, cxb, 2.15, czb - 6));
  const dome = onionDome(3.4, 4.5, 16);
  dome.translate(cxb, 2 + 6, czb);
  geoms.push(dome);
  geoms.push(box(6, 4, 8, cxb - 10, 4, czb));
  geoms.push(box(6, 4, 8, cxb + 10, 4, czb));
  for (const px of [-4.5, 4.5]) {
    for (const pz of [-4.5, 4.5]) {
      geoms.push(box(8, 0.25, 8, cxb + px, 0.725, czb - 26 + pz));
    }
  }
  addPart(id, name, 'tombs', geoms);
}
saheliBurj(1, 'saheli-burj-east', 'East Saheli Burj tomb');
saheliBurj(-1, 'saheli-burj-west', 'West Saheli Burj tomb');

// ---------------------------------------------------------------- serialize
let offset = 0;
const records = [];
let triangles = 0;
for (const p of parts) {
  const merged = mergeGeometries(
    p.geoms.map((g) => prep(g)),
    false,
  );
  if (!merged) throw new Error(`Could not merge ${p.id}`);
  merged.computeVertexNormals();
  merged.scale(S, S, S);
  merged.computeBoundingBox();
  const pos = merged.attributes.position.array;
  const nor = merged.attributes.normal.array;
  const idx = merged.index.array;
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
fs.writeFileSync(path.join(outDir, 'taj-mahal-simple-0.bin'), buffer);

const systems = [
  { id: 'terrace', name: 'Riverfront Terrace', color: '#b0532f', description: 'The 300 m riverfront platform on the Yamuna and its boundary walls, the foundation of the whole composition.' },
  { id: 'mausoleum', name: 'Mausoleum Base', color: '#f2ede2', description: 'The 6 m marble plinth and the main tomb block with its four 33 m pishtaq arches.' },
  { id: 'dome', name: 'Dome Cluster', color: '#e3d7b8', description: 'The 12 m drum, the 23 m onion dome, the 9.6 m gilded finial, and the roof chhatris.' },
  { id: 'minarets', name: 'Minarets', color: '#faf7ef', description: 'Four 43.02 m marble minarets at the plinth corners, leaning slightly outward by design.' },
  { id: 'interior', name: 'Interior Chamber', color: '#7f96ad', description: 'The octagonal burial chamber with its cenotaphs, marble screen, and lower tomb.' },
  { id: 'gate', name: 'Great Gate', color: '#96452c', description: 'The 23.07 m red sandstone gateway, Darwaza-i rauza, closing the garden on the south.' },
  { id: 'mosque', name: 'Mosque and Jawab', color: '#bd5a33', description: 'The red sandstone mosque and its mirror, the jawab, flanking the tomb on the terrace.' },
  { id: 'charbagh', name: 'Charbagh Garden', color: '#4a7c44', description: 'The 296.31 m square four-part garden with sunken parterres and walkways.' },
  { id: 'waterworks', name: 'Waterworks', color: '#3f7fae', description: 'The 120 m water channels, central tank, reflecting pool, and gravity-fed fountain system.' },
  { id: 'forecourt', name: 'Jilaukhana Forecourt', color: '#a8622d', description: 'The entrance forecourt south of the great gate: bazaar streets, enclosure walls, and the attendants quarters, the worldly side of the complex.' },
  { id: 'tombs', name: 'Subsidiary Tombs', color: '#c8b28a', description: 'The Saheli Burj: two mirror-image tombs at the southern corners of the forecourt, conceived as miniature replicas of the main complex.' },
];

const explanations = {
  'terrace platform': 'A 300 m long, 111.89 m deep platform, 8.7 m high, on the banks of the Yamuna, carrying the mausoleum, minarets, mosque, and jawab. Its faces mix dark and light sandstone patterns.',
  'yamuna-side open front': 'The complex is enclosed by crenellated red sandstone walls on three sides, with the river side left open to the Yamuna.',
  'west boundary wall': 'Crenellated red sandstone wall closing the west side of the riverfront terrace.',
  'east boundary wall': 'Crenellated red sandstone wall closing the east side of the riverfront terrace.',
  'tahkhana river rooms': 'A galleried suite of rooms under the terrace opening toward the river, used by the imperial retinue during celebrations; the room layout is schematic.',
  'marble plinth': 'A 6 m high square plinth with 95.5 m sides, faced in white marble from Makrana, raising the tomb above the terrace. Its top carries an interlocking pattern of octagonal marble pieces set into four-pointed red sandstone stars.',
  'main octagonal block': 'A multi-chambered cube with chamfered corners forming an eight-sided structure, 56.9 m square with long sides near 57.3 m.',
  'south access stairs, west flight': 'One of two partly covered flights of stairs on the south side of the platform, facing the garden; they provide the only access from ground level up to the mausoleum. Stair placement is schematic.',
  'south access stairs, east flight': 'One of two partly covered flights of stairs on the south side of the platform, facing the garden; they provide the only access from ground level up to the mausoleum. Stair placement is schematic.',
  'dome drum': 'A 12 m high cylindrical drum with an 18.4 m inner diameter, carrying the outer dome.',
  'drum rope moulding': 'An ornamental moulding with a twisted rope design in the intermediate zone between the drum and the dome.',
  'outer onion dome': 'A 23 m high marble onion dome, 17.7 m in diameter, built as a larger outer shell over the inner dome.',
  'dome lotus base': 'A lotus flower design ringing the base of the dome, matching the lotus ornament on the domes; the petal forms are schematic.',
  'inner false dome': 'A smaller separate interior dome over the burial chamber, decorated with a sun motif; it rises about 35 m from the ground.',
  'gilded finial': 'A 9.6 m high finial of stacked orbs on a shaft, originally gold and replaced by a gilded bronze copy in the early 19th century. A 4.6 m gold shield that once covered it was carried off in the 18th century Jat despoliation.',
  'crescent moon': 'The finial is topped by a moon, a typical Islamic motif whose horns point heavenward, and it forms the tamga, the seal of the Mughal Empire.',
  'octagonal burial chamber': 'The main inner chamber is an octagon with 7.3 m sides, entered from each face, with walls about 25 m high.',
  'interior pishtaq tiers': 'Two tiers of eight pishtaq arches line the chamber walls, the four central upper arches forming viewing balconies; the arch forms are schematic.',
  'mumtaz cenotaph': 'The cenotaph of Mumtaz Mahal on a 1.5 by 2.5 m marble base at the center of the chamber, aligned north-south with the head to the north and the face turned west toward Mecca.',
  'shah jahan cenotaph': 'The cenotaph of Shah Jahan on a larger base to the west, the only asymmetric element in the chamber; the pen box on top denotes a male tomb.',
  'lower tomb chamber': 'The plain rectangular basement chamber holding the actual graves, below the cenotaphs, with an undecorated coved ceiling.',
  'great gate body': 'The great gate, Darwaza-i rauza, measures 41.2 by 34 m and stands 23.07 m high, built of red sandstone with white marble accents.',
  'gate central arch': 'A recessed two-story central arch, 33 m high and 19 m wide, framed in white marble with a triple rope moulding; the frame carries the Daybreak sura in thuluth script and the entry iwan holds muqarnas in red sandstone.',
  'gate flanking arches': 'Two pairs of smaller decorative iwans flanking the central arch on each facade; the gate has five iwans per facade and the smaller ones are purely decorative.',
  'gate chhatri rows': 'Matching rows of 11 white chhatris run along each facade of the gate in a contiguous gallery, an arrangement found nowhere else in the complex.',
  'gate corner towers': 'Four octagonal corner towers capped with larger chhatris, giving the gate a defensive appearance.',
  'gate ornamental minarets': 'Thin ornamental minarets rising to about 30 m flank the gate facades, rising like arrows toward the sky.',
  'gate calligraphy panels': 'Black calligraphy inlay panels set into the red sandstone facades; the southern gate inscription invites the soul at rest to return to the Lord at peace.',
  'gate side chambers': 'Side chambers of the gate\'s nine-part plan; the internal layout is schematic.',
  'gate internal dome': 'The large central space of the gate is crowned by an internal dome that receives no outward expression: external domes were reserved for tombs and mosques. The dome form is schematic.',
  'mosque pishtaq': 'The great arched prayer front of the mosque, facing the mausoleum.',
  'mosque minarets': 'Slender minarets flanking the mosque facade; their positions are schematic.',
  'mosque mihrab': 'The prayer niche in the mosque\'s west wall marking the direction of Mecca; the jawab has inlaid floors but no mihrab. The niche form is schematic.',
  'jawab pishtaq': 'The great arched front of the jawab, mirroring the mosque for architectural symmetry.',
  'jawab minarets': 'Slender minarets flanking the jawab facade; their positions are schematic.',
  'charbagh garden platform': 'The charbagh is a 296.31 m square garden divided into four quadrants, each quarter further split into 16 sunken parterres.',
  'charbagh south enclosure wall': 'Crenellated red sandstone enclosure wall on the garden\'s south side, pierced by the great gate.',
  'charbagh west enclosure wall': 'Crenellated red sandstone enclosure wall on the garden\'s west side; the inner sides of the complex walls carry columned arcades with chhatris and the Music House, modeled schematically.',
  'charbagh east enclosure wall': 'Crenellated red sandstone enclosure wall on the garden\'s east side; the inner sides of the complex walls carry columned arcades with chhatris and the Music House, modeled schematically.',
  'garden tree rows': 'Avenues of trees line the garden; early accounts describe roses, daffodils, and fruit trees in abundance, and the British later replanted cypresses. Tree positions are schematic.',
  'khiyaban walkways': 'Raised walkways edging the water channels, the main promenades of the garden.',
  'temporary burial enclosure': 'A low walled enclosure in the western garden near the riverfront terrace marks where Mumtaz Mahal\'s body rested temporarily after its arrival from Burhanpur. The enclosure form is schematic.',
  'north-south channel, north reach': 'The four straight channels of the garden are each 120 m long and 6 m wide, a little shorter than half the garden to leave room for the central fountain.',
  'north-south channel, south reach': 'The four straight channels of the garden are each 120 m long and 6 m wide, a little shorter than half the garden to leave room for the central fountain.',
  'east-west channel, west reach': 'The four straight channels of the garden are each 120 m long and 6 m wide, a little shorter than half the garden to leave room for the central fountain.',
  'east-west channel, east reach': 'The four straight channels of the garden are each 120 m long and 6 m wide, a little shorter than half the garden to leave room for the central fountain.',
  'central water tank': 'The raised marble tank al Hawd al-Kawthar with five fountains at the center of the garden.',
  'reflecting pool': 'The long reflecting pool on the north-south axis mirrors the mausoleum.',
  'garden waterworks': 'Water came from the Yamuna through a channel to an underground reservoir, was lifted by animal-powered pulleys to an aqueduct, and ran through copper vessels and earthenware pipes; the drop from 9.47 m high walls drove the fountains.',
  'jilaukhana forecourt': 'The entrance forecourt south of the great gate, about 124 m deep (153 gaz), where visitors dismounted from horses and elephants and assembled in style before entering the tomb complex.',
  'east bazaar street': 'Bazaar street leading from the east gate to the center of the forecourt, lined by colonnades with cusped arches; shops traded here from the construction until 1996, and their tax revenue maintained the complex. The street layout is schematic.',
  'west bazaar street': 'Bazaar street leading from the west gate to the center of the forecourt, lined by colonnades with cusped arches; shops traded here from the construction until 1996, and their tax revenue maintained the complex. The street layout is schematic.',
  'forecourt east wall': 'Red sandstone enclosure wall of the forecourt with an entrance gate opening onto the east bazaar street.',
  'forecourt west wall': 'Red sandstone enclosure wall of the forecourt with an entrance gate opening onto the west bazaar street.',
  'forecourt south wall': 'Red sandstone enclosure wall of the forecourt; its southern gate leads to the Taj Ganji quarter.',
  'khawasspura attendant courtyards': 'Twin courtyards in the northern corners of the forecourt housing the tomb attendants and the Hafiz, the Quran reciters; restored under Lord Curzon between 1900 and 1908. The courtyard layout is schematic.',
  'east saheli burj tomb': 'The eastern Saheli Burj, "tower of the female friend": a miniature replica of the main complex on a raised platform with steps, an octagonal tomb flanked by smaller buildings with a charbagh garden in front. The 1789 Daniell plan marks it as the tomb of Akbarabadi Mahal; the plan is schematic.',
  'west saheli burj tomb': 'The western Saheli Burj, "tower of the female friend": a miniature replica of the main complex on a raised platform with steps, an octagonal tomb flanked by smaller buildings with a charbagh garden in front. The 1789 Daniell plan marks it as the tomb of Fatehpuri Mahal; the plan is schematic.',
};
for (const f of FACES) {
  const fl = f.id;
  const fn = f.name;
  explanations[`${fn.toLowerCase()} iwan arch`] = `A 33 m high vaulted pishtaq arch framing the iwan on the ${fl} facade, with two stacked arched bays on either side; the arch profile is schematic.`;
  explanations[`${fn.toLowerCase()} pishtaq calligraphy band`] = `Quranic calligraphy inlaid around the pishtaq arch on the ${fl} facade, a hallmark of the complex; the panel sizes and positions are schematic.`;
  explanations[`${fn.toLowerCase()} side arched bays`] = `Two tiers of smaller arched bays flanking the central iwan on the ${fl} facade; the bay profiles are schematic.`;
  explanations[`${fn.toLowerCase()} dado panels`] = `White marble dado panels with ornamental bas relief of plants and flowers at the base of the ${fl} facade; the layout is schematic.`;
}
for (const [id, name] of [
  ['ne', 'Northeast'], ['nw', 'Northwest'], ['se', 'Southeast'], ['sw', 'Southwest'],
]) {
  const nl = name.toLowerCase();
  explanations[`${nl} corner bay`] = 'Arched recesses on the chamfered corners of the main block, facing the minarets; the facade arch motif repeated at a smaller scale.';
  explanations[`${nl} corner chhatri`] = 'One of four smaller onion domes on columns at the corners of the mausoleum roof; they repeat the main dome\'s shape and bring light to the interior.';
  explanations[`${nl} minaret base`] = 'Plinth of the 43.02 m high marble minaret, 5.65 m in diameter, standing at a plinth corner facing the chamfered corners of the tomb.';
  explanations[`${nl} minaret shaft`] = 'Three almost equal tapered tiers of the minaret. The tower leans slightly outward by design so that in a collapse it would fall away from the tomb; the lean angle is schematic.';
  explanations[`${nl} minaret lower balcony`] = 'Balcony ring at a junction of the shaft tiers, in the manner of a mosque minaret from which the muezzin calls the faithful to prayer; the ring size is schematic.';
  explanations[`${nl} minaret upper balcony`] = 'Balcony ring at a junction of the shaft tiers, in the manner of a mosque minaret from which the muezzin calls the faithful to prayer; the ring size is schematic.';
  explanations[`${nl} minaret chhatri cap`] = 'The crowning chhatri and finial of the minaret, with rectangular openings below the dome giving light and air at the top of the internal stair.';
}
for (const id of ['north', 'south', 'east', 'west']) {
  explanations[`guldasta spires, ${id} edge`] = 'Tall decorative spires edging the mausoleum roofline; their heights and count are schematic.';
}
for (const [id, label] of [
  ['east', 'East'], ['southeast', 'Southeast'], ['south', 'South'], ['southwest', 'Southwest'],
  ['west', 'West'], ['northwest', 'Northwest'], ['north', 'North'], ['northeast', 'Northeast'],
]) {
  explanations[`${id} jali screen panel`] = 'One of eight pierced marble panels (mahjar-i mushabbak) enclosing the cenotaphs, inlaid with semi-precious stones; the marble screen replaced a gold one in 1643.';
}
for (const [id, label] of [
  ['nw', 'Northwest'], ['ne', 'Northeast'], ['sw', 'Southwest'], ['se', 'Southeast'],
]) {
  explanations[`${label.toLowerCase()} quadrant parterres`] = `Sixteen sunken planting beds in the ${id === 'nw' ? 'northwest' : id === 'ne' ? 'northeast' : id === 'sw' ? 'southwest' : 'southeast'} quadrant of the charbagh; the planting is schematic.`;
}
for (const s of ['mosque', 'jawab']) {
  const S = s === 'mosque' ? 'Mosque' : 'Jawab';
  const bayWord = s === 'mosque' ? 'prayer bay' : 'hall bay';
  explanations[`${s} central ${bayWord}`] = `The central bay of the ${s} hall; the 56.6 by 23.38 m red sandstone building stands 20.3 m high. The bay divisions are schematic.`;
  explanations[`${s} west ${bayWord}`] = `A side bay of the ${s} hall; the bay divisions are schematic.`;
  explanations[`${s} east ${bayWord}`] = `A side bay of the ${s} hall; the bay divisions are schematic.`;
  explanations[`${s} central dome`] = `The largest of the three domes crowning the ${s}; the dome sizes are schematic.`;
  explanations[`${s} north side dome`] = `One of the two smaller domes flanking the central dome of the ${s}; the dome sizes are schematic.`;
  explanations[`${s} south side dome`] = `One of the two smaller domes flanking the central dome of the ${s}; the dome sizes are schematic.`;
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Taj Mahal, Agra',
  title: 'Taj Mahal',
  location: 'Agra, India',
  blurb: 'The Taj Mahal is a 17th-century Mughal mausoleum complex in Agra, India, commissioned by Shah Jahan for Mumtaz Mahal. This schematic model shows the full walled complex: riverfront terrace, marble mausoleum, four minarets, great gate, mosque, jawab, charbagh garden with its waterworks, forecourt, and subsidiary tombs.',
  sourceUrls: [
    { label: 'Taj Mahal, Wikipedia', url: 'https://en.wikipedia.org/wiki/Taj_Mahal' },
    { label: 'Taj Mahal, Structurae', url: 'https://structurae.net/en/structures/taj-mahal' },
    { label: 'Dimensions of the Taj Mahal, wonders-of-the-world.net', url: 'https://www.wonders-of-the-world.net/Taj-Mahal/Dimensions-of-the-Taj-Mahal.php' },
    { label: 'Taj Mahal, vocal.media (Britannica text)', url: 'https://vocal.media/earth/taj-mahal-cm1oi0ai9' },
    { label: 'Origins and architecture of the Taj Mahal, Citizendium', url: 'https://en.citizendium.org/wiki/index.php?title=Origins_and_architecture_of_the_Taj_Mahal&printable=yes' },
    { label: 'Taj Mahal Complex, Archnet', url: 'https://www.archnet.org/sites/1559' },
    { label: 'Great gate of the Taj Mahal, wonders-of-the-world.net', url: 'https://www.wonders-of-the-world.net/Taj-Mahal/Great-gate-of-the-Taj-Mahal.php' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id,
    name: r.part.name,
    conceptId: r.part.id,
    system: r.part.system,
    chunk: 0,
    positions: r.posOff,
    normals: r.norOff,
    indices: r.idxOff,
    vertexCount: r.vertexCount,
    indexCount: r.indexCount,
    bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/taj-mahal-simple/taj-mahal-simple-0.bin', bytes: offset }],
  triangles,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]);
if (missing.length) console.log('Missing explanations:', missing.map((r) => r.part.id).join(', '));
