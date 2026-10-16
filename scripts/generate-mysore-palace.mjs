// Procedural Mysore Palace (Amba Vilas Palace) for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Mysore Palace in code and
// writes it in the atlas binary format:
//   public/models/mysore-palace/atlas.json
//   public/models/mysore-palace/mysore-palace-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   Amba Vilas Palace, Mysore, Karnataka; official residence of the Wadiyar
//   dynasty; earlier wooden palace burnt down in 1897 during the wedding of
//   Princess Jayalakshmmanni; rebuilt 1897 to 1912 to the design of English
//   architect Henry Irwin, commissioned by Maharaja Krishnaraja Wadiyar IV
//   and Maharani Kempananjammanni Devi; cost Rs. 41.47 lakhs; Indo-Saracenic
//   style blending Hindu, Islamic, Rajput, Hoysala and Gothic elements;
//   three stories, about 75 m (245 ft) long and 48 m (156 ft) wide, in grey
//   granite with red granite accents; five-story central tower topped with a
//   gold-plated onion dome 44 m (145 ft) above the ground, the dome carrying
//   a smaller chhatri instead of a finial; square five-story towers at each
//   of the cardinal points topped with pink domes; main facade with a large
//   central archway flanked by smaller arches on granite pillars, and a
//   sculpture of Gajalakshmi (Lakshmi with elephants) above the central
//   arch; four entrances: Jaya Maarthaanda (east, main), Jayarama (north),
//   Balarama (south), Varaha (west); bronze tigers by Robert William Colton
//   flank the main approach; the Elephant Gate (Ane Bagilu) is the inner
//   main entrance; Public Durbar Hall wing added in the 1930s under
//   Jayachamarajendra Wadiyar; second only to the Taj Mahal among India's
//   most visited attractions. (Sources: en.wikipedia.org/wiki/Mysore_Palace,
//   fabhotels.com, middleheight.com.)
// Schematic (not sourced, never stated as fact in the UI): exact wall
// thicknesses, floor heights, tower level divisions, arch profiles and
// counts, dome and chhatri profiles, gate positions and forms, courtyard
// and garden layout, sculpture details.
//
// Coordinate frame: x = lateral (75 m length, east is +x), z = depth
// (48 m width), y = up. All dimensions in meters.
//
// Granularity: 114 named parts across 8 systems.
//
// Usage: node scripts/generate-mysore-palace.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'mysore-palace');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (75 m length) maps to 2.4 units.
const S = 2.4 / 75;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 14) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// Onion dome via lathe profile.
function onionDome(r, h, x, y, z, seg = 18) {
  const pts = [];
  const prof = [[0.02, 1.0], [0.30, 0.88], [0.62, 0.72], [0.88, 0.52], [1.0, 0.32], [0.92, 0.15], [0.68, 0.03], [0.45, 0.0]];
  for (const [pr, py] of prof) pts.push(new THREE.Vector2(Math.max(0.02, pr * r), py * h));
  const g = new THREE.LatheGeometry(pts, seg);
  g.translate(x, y, z);
  return g;
}
// Single arch unit: two jambs + half-torus arch, in XY plane at depth z.
function archUnit(cx, cy, z, span, jambH, tubeR, depth) {
  const jambL = box(cx - span / 2 - 0.8, cx - span / 2 + 0.2, cy, cy + jambH, z - depth / 2, z + depth / 2);
  const jambR = box(cx + span / 2 - 0.2, cx + span / 2 + 0.8, cy, cy + jambH, z - depth / 2, z + depth / 2);
  const arch = new THREE.TorusGeometry(span / 2, tubeR, 8, 12, Math.PI);
  arch.translate(cx, cy + jambH, z);
  return [jambL, jambR, arch];
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const explanations = {};
const exp = (name, text) => { explanations[name.toLowerCase()] = text; };

const L = 75, W = 48; // footprint
const HX = L / 2, HZ = W / 2;

// --- Main block: plinth, walls per floor, slabs, cornices: 18 parts.
addPart('plinth', 'Granite plinth', 'main-block', [box(-HX - 1, HX + 1, 0, 2, -HZ - 1, HZ + 1)]);
exp('Granite plinth', 'The granite plinth the palace stands on. Exact form is schematic.');
const FLOORS = [['ground', 2, 8], ['first', 8, 14], ['second', 14, 20]];
for (const [fname, y0, y1] of FLOORS) {
  addPart(`${fname}-floor-north-wall`, `${fname} floor north wall`, 'main-block', [box(-HX, HX, y0, y1, HZ - 1.2, HZ)]);
  exp(`${fname} floor north wall`, `The north wall of the ${fname} floor. The palace is three stories in grey granite. Exact wall buildup is schematic.`);
  addPart(`${fname}-floor-south-wall`, `${fname} floor south wall`, 'main-block', [box(-HX, HX, y0, y1, -HZ, -HZ + 1.2)]);
  exp(`${fname} floor south wall`, `The south wall of the ${fname} floor. Exact wall buildup is schematic.`);
  addPart(`${fname}-floor-east-wall`, `${fname} floor east wall`, 'main-block', [box(HX - 1.2, HX, y0, y1, -HZ, HZ)]);
  exp(`${fname} floor east wall`, `The east wall of the ${fname} floor. Exact wall buildup is schematic.`);
  addPart(`${fname}-floor-west-wall`, `${fname} floor west wall`, 'main-block', [box(-HX, -HX + 1.2, y0, y1, -HZ, HZ)]);
  exp(`${fname} floor west wall`, `The west wall of the ${fname} floor. Exact wall buildup is schematic.`);
}
addPart('first-floor-slab', 'First floor slab', 'main-block', [box(-HX, HX, 7.7, 8, -HZ, HZ)]);
exp('First floor slab', 'The slab over the ground floor. Exact construction is schematic.');
addPart('second-floor-slab', 'Second floor slab', 'main-block', [box(-HX, HX, 13.7, 14, -HZ, HZ)]);
exp('Second floor slab', 'The slab over the first floor. Exact construction is schematic.');
for (const [i, y] of [[1, 8], [2, 14], [3, 20]]) {
  addPart(`cornice-level-${i}`, `Level ${i} cornice`, 'main-block', [box(-HX - 0.6, HX + 0.6, y - 0.5, y, -HZ - 0.6, HZ + 0.6)]);
  exp(`Level ${i} cornice`, `The cornice marking floor level ${i}. Exact profile is schematic.`);
}

// --- Central tower: 5 levels, cornices, gold dome in 8 segments, chhatri: 19 parts.
for (let lvl = 1; lvl <= 5; lvl++) {
  const y0 = 20 + (lvl - 1) * 2.4;
  const y1 = y0 + 2.4;
  const r = 7 - lvl * 0.5;
  addPart(`central-tower-level-${lvl}`, `Central tower level ${lvl}`, 'central-tower',
    [cyl(r, r + 0.4, 2.4, 0, y0 + 1.2, 0, 8)]);
  exp(`Central tower level ${lvl}`, `Level ${lvl} of the five-story central tower. The tower rises to the 44 m gold dome. Exact level division is schematic.`);
  if (lvl < 5) {
    addPart(`central-tower-cornice-${lvl}`, `Central tower cornice ${lvl}`, 'central-tower', [cyl(r + 0.9, r + 0.9, 0.4, 0, y1, 0, 8)]);
    exp(`Central tower cornice ${lvl}`, `Cornice over central tower level ${lvl}. Exact profile is schematic.`);
  }
}
{
  const domeBaseY = 32;
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2;
    // build one octant of the onion dome via lathe segment: use full lathe then slice? simpler: 8 rotated copies of a 45-degree lathe
    const pts = [];
    const prof = [[0.02, 1.0], [0.30, 0.88], [0.62, 0.72], [0.88, 0.52], [1.0, 0.32], [0.92, 0.15], [0.68, 0.03], [0.45, 0.0]];
    for (const [pr, py] of prof) pts.push(new THREE.Vector2(Math.max(0.02, pr * 5), py * 11));
    const g = new THREE.LatheGeometry(pts, 6, a0, Math.PI * 2 / 8);
    g.translate(0, domeBaseY, 0);
    addPart(`gold-dome-segment-${i + 1}`, `Gold dome segment ${i + 1}`, 'central-tower', [g]);
    exp(`Gold dome segment ${i + 1}`, `Segment ${i + 1} of 8 of the gold-plated onion dome crowning the central tower, 44 m above the ground. Exact segmentation is schematic.`);
  }
  addPart('dome-chhatri', 'Dome chhatri', 'central-tower', [
    cyl(0.8, 0.8, 2.2, 0, 44.5, 0, 8),
    cyl(1.6, 1.2, 0.5, 0, 45.8, 0, 8),
    new THREE.SphereGeometry(1.0, 10, 8).translate(0, 46.2, 0),
  ]);
  exp('Dome chhatri', 'The small chhatri (domed kiosk) carried on the gold dome instead of a finial, in the Rajasthani manner. Exact form is schematic.');
}

// --- Corner towers: 4 towers x (base, shaft, cornice, pink dome, finial): 20 parts.
const CORNERS = [[-HX + 5, -HZ + 5, 'Northwest'], [HX - 5, -HZ + 5, 'Northeast'], [-HX + 5, HZ - 5, 'Southwest'], [HX - 5, HZ - 5, 'Southeast']];
CORNERS.forEach(([cx, cz, nm], ci) => {
  const key = nm.toLowerCase();
  addPart(`${key}-tower-base`, `${nm} tower base`, 'corner-towers', [box(cx - 4, cx + 4, 0, 8, cz - 4, cz + 4)]);
  exp(`${nm} tower base`, `The base of the ${nm.toLowerCase()} five-story square tower. Exact form is schematic.`);
  addPart(`${key}-tower-shaft`, `${nm} tower shaft`, 'corner-towers', [box(cx - 3.2, cx + 3.2, 8, 30, cz - 3.2, cz + 3.2)]);
  exp(`${nm} tower shaft`, `The shaft of the ${nm.toLowerCase()} tower rising through five stories. Exact level division is schematic.`);
  addPart(`${key}-tower-cornice`, `${nm} tower cornice`, 'corner-towers', [box(cx - 3.8, cx + 3.8, 30, 30.8, cz - 3.8, cz + 3.8)]);
  exp(`${nm} tower cornice`, `The cornice of the ${nm.toLowerCase()} tower. Exact profile is schematic.`);
  addPart(`${key}-pink-dome`, `${nm} pink dome`, 'corner-towers', [onionDome(3.4, 5, cx, 30.8, cz)]);
  exp(`${nm} pink dome`, `The pink dome capping the ${nm.toLowerCase()} tower. Exact profile is schematic.`);
  addPart(`${key}-tower-finial`, `${nm} tower finial`, 'corner-towers', [cyl(0.15, 0.3, 1.8, cx, 36.7, cz, 8)]);
  exp(`${nm} tower finial`, `The finial of the ${nm.toLowerCase()} tower. Exact form is schematic.`);
});

// --- Arcades: arch bays on all four facades, central entrance arch,
// Gajalakshmi sculpture: 32 parts.
// archUnit builds in XY plane (facing +z); rotate for east/west facades.
{
  const placeEast = (geoms, z) => { for (const g of geoms) { g.rotateY(Math.PI / 2); g.translate(HX, 2, z); } return geoms; };
  const placeWest = (geoms, z) => { for (const g of geoms) { g.rotateY(Math.PI / 2); g.translate(-HX, 2, z); } return geoms; };
  const placeNorth = (geoms, x) => { for (const g of geoms) { g.translate(x, 2, HZ); } return geoms; };
  const placeSouth = (geoms, x) => { for (const g of geoms) { g.translate(x, 2, -HZ); } return geoms; };
  for (let i = 0; i < 9; i++) {
    const z = -20 + i * 5;
    addPart(`front-arch-${i + 1}`, `Front arch ${i + 1}`, 'arcades', placeEast(archUnit(0, 0, 0, 3.4, 4.5, 0.55, 2), z));
    exp(`Front arch ${i + 1}`, `Arched bay ${i + 1} of 9 on the east facade. Exact arch count and profile are schematic.`);
    addPart(`rear-arch-${i + 1}`, `Rear arch ${i + 1}`, 'arcades', placeWest(archUnit(0, 0, 0, 3.4, 4.5, 0.55, 2), z));
    exp(`Rear arch ${i + 1}`, `Arched bay ${i + 1} of 9 on the west facade. Exact arch count and profile are schematic.`);
  }
  for (let i = 0; i < 6; i++) {
    const x = -25 + i * 10;
    addPart(`north-arch-${i + 1}`, `North arch ${i + 1}`, 'arcades', placeNorth(archUnit(0, 0, 0, 3.4, 4.5, 0.55, 2), x));
    exp(`North arch ${i + 1}`, `Arched bay ${i + 1} of 6 on the north facade. Exact arch count and profile are schematic.`);
    addPart(`south-arch-${i + 1}`, `South arch ${i + 1}`, 'arcades', placeSouth(archUnit(0, 0, 0, 3.4, 4.5, 0.55, 2), x));
    exp(`South arch ${i + 1}`, `Arched bay ${i + 1} of 6 on the south facade. Exact arch count and profile are schematic.`);
  }
  // Central entrance arch (larger, on the east facade).
  const central = archUnit(0, 0, 0, 7, 7, 0.9, 3);
  for (const g of central) { g.rotateY(Math.PI / 2); g.translate(HX, 2, 0); }
  addPart('central-entrance-arch', 'Central entrance arch', 'arcades', central);
  exp('Central entrance arch', 'The large central archway of the main facade, the palace\u2019s ceremonial entrance. Exact profile is schematic.');
  // Gajalakshmi above the central arch.
  const lakshmi = [cyl(0.9, 1.2, 2.4, 0, 1.2, 0, 8)];
  for (const g of lakshmi) { g.rotateY(Math.PI / 2); g.translate(HX + 0.5, 12, 0); }
  addPart('gajalakshmi', 'Gajalakshmi sculpture', 'arcades', lakshmi);
  exp('Gajalakshmi sculpture', 'Gajalakshmi, Lakshmi flanked by elephants, goddess of wealth, fixed above the central arch. Exact sculpture is schematic.');
}

// --- Entrances: four gates, bronze tigers, Elephant Gate: 7 parts.
{
  const gates = [
    ['jaya-maarthaanda', 'Jaya Maarthaanda gate', HX + 8, 0, 'the east (main) entrance'],
    ['jayarama', 'Jayarama gate', 0, HZ + 8, 'the north entrance'],
    ['balarama', 'Balarama gate', 0, -HZ - 8, 'the south entrance'],
    ['varaha', 'Varaha gate', -HX - 8, 0, 'the west entrance'],
  ];
  for (const [key, name, gx, gz, desc] of gates) {
    addPart(key, name, 'entrances', [
      box(gx - 3, gx + 3, 0, 9, gz - 1.5, gz + 1.5),
      onionDome(2.2, 3, gx, 9, gz, 12),
    ]);
    exp(name, `The ${name.toLowerCase()}, ${desc} of the palace. Exact gate form is schematic.`);
  }
  for (const [side, nm] of [[-1, 'North'], [1, 'South']]) {
    addPart(`${nm.toLowerCase()}-bronze-tiger`, `${nm} bronze tiger`, 'entrances', [
      box(HX + 12 - 1.5, HX + 12 + 1.5, 0, 1, side * 6 - 0.6, side * 6 + 0.6),
      cyl(0.5, 0.7, 1.6, HX + 12, 1.8, side * 6, 8),
    ]);
    exp(`${nm} bronze tiger`, `The ${nm.toLowerCase()} bronze tiger by Robert William Colton flanking the main approach. Exact sculpture is schematic.`);
  }
  addPart('elephant-gate', 'Elephant Gate (Ane Bagilu)', 'entrances', [
    box(HX - 2, HX + 2, 2, 10, -3, 3),
    box(HX - 3.5, HX + 3.5, 10, 11.5, -4, 4),
  ]);
  exp('Elephant Gate (Ane Bagilu)', 'The Elephant Gate, the brass inner main entrance symbolizing power and strength. Exact form is schematic.');
}

// --- Roofs: main roof, parapets, chhatris: 13 parts.
addPart('main-roof', 'Main roof slab', 'roofs', [box(-HX, HX, 20, 21, -HZ, HZ)]);
exp('Main roof slab', 'The roof over the three-story main block. Exact construction is schematic.');
for (const [key, nm, x0, x1, z0, z1] of [
  ['north', 'North', -HX, HX, HZ - 0.8, HZ],
  ['south', 'South', -HX, HX, -HZ, -HZ + 0.8],
  ['east', 'East', HX - 0.8, HX, -HZ, HZ],
  ['west', 'West', -HX, -HX + 0.8, -HZ, HZ],
]) {
  addPart(`${key}-parapet`, `${nm} parapet`, 'roofs', [box(x0, x1, 21, 22.5, z0, z1)]);
  exp(`${nm} parapet`, `The ${nm.toLowerCase()} roof parapet. Exact form is schematic.`);
}
for (let i = 0; i < 8; i++) {
  const cx = -28 + (i % 4) * 18.5;
  const cz = i < 4 ? HZ - 4 : -HZ + 4;
  addPart(`chhatri-${i + 1}`, `Roof chhatri ${i + 1}`, 'roofs', [
    cyl(1.2, 1.2, 2, cx, 22, cz, 8),
    onionDome(1.6, 2.2, cx, 23, cz, 10),
  ]);
  exp(`Roof chhatri ${i + 1}`, `A domed chhatri kiosk on the roofline, chhatri ${i + 1} of 8. Exact form is schematic.`);
}

// --- Courtyard: floor and garden walls: 5 parts.
addPart('courtyard-floor', 'Inner courtyard floor', 'courtyard', [box(-20, 20, 0.2, 0.5, -14, 14)]);
exp('Inner courtyard floor', 'The open courtyard at the heart of the palace. Exact layout is schematic.');
for (const [key, nm, x0, x1, z0, z1] of [
  ['north', 'North', -30, 30, 20, 21],
  ['south', 'South', -30, 30, -21, -20],
  ['east', 'East', 29, 30, -20, 20],
  ['west', 'West', -30, -29, -20, 20],
]) {
  addPart(`garden-wall-${key}`, `${nm} garden wall`, 'courtyard', [box(x0, x1, 0, 3, z0, z1)]);
  exp(`${nm} garden wall`, `The ${nm.toLowerCase()} garden wall of the palace grounds. Exact extent is schematic.`);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('gold-dome')) return '#c9a227';
  if (id === 'dome-chhatri') return '#b8941f';
  if (id.includes('pink-dome')) return '#d4a0a0';
  if (id.includes('tower-finial')) return '#8a6f3e';
  if (id === 'gajalakshmi') return '#b8935a';
  if (id.includes('tiger')) return '#6b5b3e';
  if (id === 'elephant-gate') return '#8a6f3e';
  if (id.includes('plinth') || id.includes('courtyard-floor')) return '#9a938a';
  if (id.includes('garden-wall')) return '#b0a894';
  if (id.includes('cornice')) return '#c9bfa5';
  return '#b8b0a0'; // grey granite
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'main-block', name: 'Main block', color: '#b8b0a0', description: 'The three-story granite main block, 75 m by 48 m, with plinth, walls, slabs and cornices.' },
  { id: 'central-tower', name: 'Central tower and gold dome', color: '#c9a227', description: 'The five-story central tower crowned by the 44 m gold-plated onion dome with its chhatri.' },
  { id: 'corner-towers', name: 'Corner towers', color: '#b8b0a0', description: 'The four five-story square towers at the cardinal points, each with a pink dome.' },
  { id: 'arcades', name: 'Arcades', color: '#b8b0a0', description: 'Arched bays on all four facades, the central entrance arch and the Gajalakshmi sculpture.' },
  { id: 'entrances', name: 'Entrances', color: '#b8b0a0', description: 'The four named gates, the bronze tigers and the Elephant Gate.' },
  { id: 'roofs', name: 'Roofs', color: '#b8b0a0', description: 'Roof slab, parapets and rooftop chhatris.' },
  { id: 'courtyard', name: 'Courtyard and gardens', color: '#b0a894', description: 'The inner courtyard and garden walls.' },
];

// ---------------------------------------------------------------- serialize
let offset = 0;
const records = [];
let triangles = 0;
for (const p of parts) {
  const merged = mergeGeometries(p.geoms.map((g) => { g.deleteAttribute('uv'); return g; }), false);
  if (!merged) throw new Error(`Could not merge ${p.id}`);
  merged.computeVertexNormals();
  merged.scale(S, S, S);
  merged.computeBoundingBox();
  const pos = merged.attributes.position.array;
  const nor = merged.attributes.normal.array;
  const idx = merged.index ? merged.index.array : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
  const n16 = new Int16Array(nor.length);
  for (let i = 0; i < nor.length; i++) n16[i] = Math.round(Math.max(-1, Math.min(1, nor[i])) * 32767);
  const u32 = idx instanceof Uint32Array ? idx : Uint32Array.from(idx);
  const align4 = (n) => (n + 3) & ~3;
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
    posOff, norOff, idxOff,
    vertexCount: pos.length / 3,
    indexCount: u32.length,
    bounds: [[bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.max.y, bb.max.z]],
  });
  triangles += u32.length / 3;
  merged.dispose();
}
const buffer = Buffer.alloc(offset);
for (const r of records) { r.pos.copy(buffer, r.posOff); r.nor.copy(buffer, r.norOff); r.idx.copy(buffer, r.idxOff); }
const binName = 'mysore-palace-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Mysore Palace (Amba Vilas Palace), Mysore',
  title: 'Mysore Palace',
  location: 'Mysore, India',
  blurb: 'Henry Irwin\u2019s 1912 Indo-Saracenic palace for the Wadiyars: a three-story granite block 75 m long, its five-story central tower crowned by a 44 m gold dome, with pink-domed corner towers.',
  sourceUrls: [
    { label: 'Wikipedia: Mysore Palace', url: 'https://en.wikipedia.org/wiki/Mysore_Palace' },
    { label: 'FabHotels: Mysore Palace guide', url: 'https://www.fabhotels.com/blog/mysore-palace-mysore/' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/mysore-palace/mysore-palace-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
