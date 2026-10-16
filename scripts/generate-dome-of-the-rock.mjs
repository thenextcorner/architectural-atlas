// Procedural Dome of the Rock for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Dome of the Rock in code and
// writes it in the atlas binary format:
//   public/models/dome-of-the-rock/atlas.json
//   public/models/dome-of-the-rock/dome-of-the-rock-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   Umayyad shrine on the Temple Mount, Jerusalem, completed 691-692 CE
//   under Caliph Abd al-Malik; among the oldest extant Islamic monuments;
//   octagonal plan; central dome about 20 m in diameter on an elevated
//   circular drum carried by 16 supports (4 piers and 12 columns);
//   surrounding octagonal arcade of 24 piers and columns; outer walls
//   octagonal, each side about 18-20 m; four entrances on the cardinal
//   axes; outer wall pierced by windows; total height about 35 m; double
//   shell dome (wooden inner dome, outer dome now gilded aluminum);
//   encloses the Foundation Stone (about 13 by 7.6 m); 16th-century
//   Ottoman tile facing.
// Schematic (not sourced, never stated as fact in the UI): exact wall
// heights and thicknesses; drum height and window arrangement; column
// and pier positions; entrance porch forms; platform and steps; interior
// rock form.
//
// Coordinate frame: x = lateral, z = depth, y = up, meters. Entrances face
// the cardinal directions.
//
// Granularity: 100+ named parts across 9 systems.
//
// Usage: node scripts/generate-dome-of-the-rock.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'dome-of-the-rock');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~43 m flat-to-flat) maps to 2.4 units.
const S = 2.4 / 43;

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
// point on a regular octagon: k = side index 0..7, t in [0,1] along the side
function octPt(R, k, t) {
  const a0 = (k / 8) * Math.PI * 2 + Math.PI / 8;
  const a1 = ((k + 1) / 8) * Math.PI * 2 + Math.PI / 8;
  const a = a0 + (a1 - a0) * t;
  return [Math.cos(a) * R, Math.sin(a) * R];
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const DOME_R = 10;          // dome radius (20 m diameter, sourced)
const WALL_H = 11;          // outer wall height (schematic)
const DRUM_H = 9;           // drum height (schematic)
const DRUM_Y = WALL_H;      // drum base
const DOME_Y = DRUM_Y + DRUM_H; // dome springing (~20 m)
const APEX_Y = 33;          // dome apex below finial (schematic, total ~35 m)
const OR = 23.5;            // outer octagon vertex radius (side ~18 m, sourced)
const IR = 13;              // inner arcade octagon vertex radius (schematic)

// --- Outer walls: 8 sides x 2 courses (16 parts)
for (let k = 0; k < 8; k++) {
  const [x0, z0] = octPt(OR, k, 0), [x1, z1] = octPt(OR, k, 1);
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = -Math.atan2(z1 - z0, x1 - x0);
  for (const [c, cname, y0, y1] of [[0, 'lower', 0, WALL_H * 0.55], [1, 'upper', WALL_H * 0.55, WALL_H]]) {
    const g = new THREE.BoxGeometry(len, y1 - y0, 1.2);
    g.rotateY(ang);
    g.translate(mx, (y0 + y1) / 2, mz);
    addPart(`outer-wall-${k + 1}-${cname}`, `Outer wall ${k + 1} ${cname}`, 'outer-walls', [g]);
  }
}

// --- Outer wall windows: one band per side (8 parts)
for (let k = 0; k < 8; k++) {
  const [x0, z0] = octPt(OR - 0.7, k, 0.15), [x1, z1] = octPt(OR - 0.7, k, 0.85);
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ang = -Math.atan2(z1 - z0, x1 - x0);
  const g = new THREE.BoxGeometry(len, 2.2, 0.3);
  g.rotateY(ang);
  g.translate(mx, WALL_H * 0.72, mz);
  addPart(`outer-windows-${k + 1}`, `Outer wall windows ${k + 1}`, 'outer-walls', [g]);
}

// --- Cornice (2 parts)
{
  const g1 = new THREE.CylinderGeometry(OR * 0.98, OR * 1.02, 0.8, 8, 1);
  g1.rotateY(Math.PI / 8);
  g1.translate(0, WALL_H + 0.4, 0);
  addPart('wall-cornice', 'Wall cornice', 'outer-walls', [g1]);
  const g2 = new THREE.CylinderGeometry(OR * 1.04, OR * 1.04, 0.5, 8, 1);
  g2.rotateY(Math.PI / 8);
  g2.translate(0, 0.25, 0);
  addPart('wall-plinth', 'Wall plinth', 'outer-walls', [g2]);
}

// --- Octagonal arcade: 24 piers and columns (24 parts)
for (let k = 0; k < 24; k++) {
  const a = (k / 24) * Math.PI * 2 + Math.PI / 24;
  const x = Math.cos(a) * IR, z = Math.sin(a) * IR;
  if (k % 3 === 0) {
    addPart(`arcade-pier-${k / 3 + 1}`, `Arcade pier ${k / 3 + 1}`, 'arcade', [
      box(x - 0.9, x + 0.9, 0, WALL_H - 1, z - 0.9, z + 0.9),
    ]);
  } else {
    addPart(`arcade-column-${k}`, `Arcade column ${k}`, 'arcade', [
      cyl(0.45, 0.5, WALL_H - 2, x, (WALL_H - 2) / 2, z, 8),
      box(x - 0.7, x + 0.7, WALL_H - 2, WALL_H - 1.4, z - 0.7, z + 0.7),
    ]);
  }
}

// --- Inner drum supports: 4 piers + 12 columns (16 parts)
for (let k = 0; k < 4; k++) {
  const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
  const x = Math.cos(a) * (DOME_R + 1.2), z = Math.sin(a) * (DOME_R + 1.2);
  addPart(`drum-pier-${k + 1}`, `Drum pier ${k + 1}`, 'drum-supports', [
    box(x - 1.1, x + 1.1, 0, DRUM_Y, z - 1.1, z + 1.1),
  ]);
}
for (let k = 0; k < 12; k++) {
  const a = (k / 12) * Math.PI * 2;
  const x = Math.cos(a) * (DOME_R + 1.2), z = Math.sin(a) * (DOME_R + 1.2);
  // skip positions coinciding with piers
  if (k % 3 === 0) continue;
  addPart(`drum-column-${k + 1}`, `Drum column ${k + 1}`, 'drum-supports', [
    cyl(0.4, 0.45, DRUM_Y - 1, x, (DRUM_Y - 1) / 2, z, 8),
  ]);
}
// (4 piers + 8 columns = 12; add 4 more columns between piers for 16 total)
for (let k = 0; k < 4; k++) {
  const a = (k / 4) * Math.PI * 2;
  const x = Math.cos(a) * (DOME_R + 1.2), z = Math.sin(a) * (DOME_R + 1.2);
  addPart(`drum-column-b-${k + 1}`, `Drum column ${k + 13}`, 'drum-supports', [
    cyl(0.4, 0.45, DRUM_Y - 1, x, (DRUM_Y - 1) / 2, z, 8),
  ]);
}

// --- Drum: cylindrical with 16 windows (18 parts)
{
  const dg = new THREE.CylinderGeometry(DOME_R + 0.6, DOME_R + 0.6, DRUM_H, 24, 1, true);
  dg.translate(0, DRUM_Y + DRUM_H / 2, 0);
  addPart('drum-shell', 'Drum shell', 'drum', [dg]);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const g = new THREE.BoxGeometry(1.1, 3.2, 0.25);
    g.rotateY(-a + Math.PI / 2);
    g.translate(Math.cos(a) * (DOME_R + 0.55), DRUM_Y + DRUM_H / 2, Math.sin(a) * (DOME_R + 0.55));
    addPart(`drum-window-${k + 1}`, `Drum window ${k + 1}`, 'drum', [g]);
  }
  addPart('drum-cornice', 'Drum cornice', 'drum', [cyl(DOME_R + 1.0, DOME_R + 0.7, 0.7, 0, DOME_Y + 0.35, 0, 24)]);
}

// --- Dome: 8 segments + inner dome + finial (11 parts)
{
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2;
    const g = new THREE.SphereGeometry(DOME_R + 0.3, 8, 8, a0, a1 - a0, 0, Math.PI / 2);
    g.scale(1, (APEX_Y - DOME_Y) / (DOME_R + 0.3), 1);
    g.translate(0, DOME_Y, 0);
    addPart(`dome-segment-${k + 1}`, `Dome segment ${k + 1}`, 'dome', [g]);
  }
  const inner = new THREE.SphereGeometry(DOME_R - 1.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  inner.translate(0, DOME_Y - 1.5, 0);
  addPart('inner-dome', 'Inner wooden dome', 'dome', [inner]);
  addPart('dome-finial', 'Dome finial and crescent', 'dome', [
    cyl(0.18, 0.18, 3.2, 0, APEX_Y + 1.2, 0, 8),
    new THREE.TorusGeometry(0.7, 0.14, 8, 16, Math.PI * 1.5).translate(0, APEX_Y + 2.9, 0),
  ]);
}

// --- Entrances: 4 cardinal porches (12 parts)
for (const [k, nm, dx, dz] of [[0, 'North', 0, -1], [1, 'East', 1, 0], [2, 'South', 0, 1], [3, 'West', -1, 0]]) {
  const [px, pz] = octPt(OR, k * 2, 0.5);
  const sl = nm.toLowerCase();
  // door slab oriented tangent to the octagon side
  const dg = new THREE.BoxGeometry(dx !== 0 ? 0.8 : 2.8, 5, dx !== 0 ? 2.8 : 0.8);
  dg.translate(px, 3, pz);
  addPart(`${sl}-door`, `${nm} entrance door`, 'entrances', [dg]);
  addPart(`${sl}-porch`, `${nm} entrance porch`, 'entrances', [
    box(px + dx * 2 - 2, px + dx * 2 + 2, 0, 7, pz + dz * 2 - 2, pz + dz * 2 + 2),
  ]);
  addPart(`${sl}-steps`, `${nm} entrance steps`, 'entrances', [
    box(px + dx * 4 - 2.5, px + dx * 4 + 2.5, 0, 0.5, pz + dz * 4 - 2.5, pz + dz * 4 + 2.5),
  ]);
}

// --- Platform (4 parts)
{
  const pg = new THREE.CylinderGeometry(OR * 1.35, OR * 1.4, 1.2, 8, 1);
  pg.rotateY(Math.PI / 8);
  pg.translate(0, -0.6, 0);
  addPart('platform', 'Temple Mount platform', 'platform', [pg]);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    addPart(`platform-step-${k + 1}`, `Platform step ${k + 1}`, 'platform', [
      box(Math.cos(a) * OR * 1.5 - 3, Math.cos(a) * OR * 1.5 + 3, -1.2, -0.6,
        Math.sin(a) * OR * 1.5 - 1.5, Math.sin(a) * OR * 1.5 + 1.5),
    ]);
  }
}

// --- Foundation Stone (2 parts, interior, schematic)
{
  addPart('foundation-stone', 'Foundation Stone', 'rock', [
    new THREE.SphereGeometry(4.5, 12, 8).scale(1.45, 0.5, 0.85).translate(0, 1.2, 0),
  ]);
  addPart('rock-chamber', 'Rock chamber', 'rock', [box(-6, 6, -3, 0.8, -4, 4)]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('outer-wall')) return '#b8a888';
  if (id.startsWith('outer-windows')) return '#3a4a5a';
  if (id === 'wall-cornice' || id === 'wall-plinth') return '#a89878';
  if (id.startsWith('arcade-pier')) return '#a89878';
  if (id.startsWith('arcade-column')) return '#c4b49a';
  if (id.startsWith('drum-pier')) return '#a89878';
  if (id.startsWith('drum-column')) return '#c4b49a';
  if (id === 'drum-shell') return '#b8a888';
  if (id.startsWith('drum-window')) return '#3a4a5a';
  if (id === 'drum-cornice') return '#a89878';
  if (id.startsWith('dome-segment')) return '#c9a83a';
  if (id === 'inner-dome') return '#8a7a5a';
  if (id === 'dome-finial') return '#d4af37';
  if (id.includes('-door') || id.includes('-porch')) return '#7a6a52';
  if (id.includes('-steps')) return '#9a938a';
  if (id.startsWith('platform')) return '#8a8478';
  if (id === 'foundation-stone') return '#7a7568';
  if (id === 'rock-chamber') return '#6a655a';
  return '#b8a888';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'dome', name: 'Dome', color: '#c9a83a', description: 'The gilded 20 m dome with its inner wooden shell and crescent finial.' },
  { id: 'drum', name: 'Drum', color: '#b8a888', description: 'The cylindrical drum with its ring of windows.' },
  { id: 'drum-supports', name: 'Drum supports', color: '#a89878', description: 'The 4 piers and 12 columns carrying the drum.' },
  { id: 'arcade', name: 'Octagonal arcade', color: '#a89878', description: 'The inner octagonal arcade of 24 piers and columns.' },
  { id: 'outer-walls', name: 'Outer walls', color: '#b8a888', description: 'The octagonal outer walls with window bands, cornice and plinth.' },
  { id: 'entrances', name: 'Entrances', color: '#7a6a52', description: 'The four entrances on the cardinal axes with porches and steps.' },
  { id: 'platform', name: 'Platform', color: '#8a8478', description: 'The raised Temple Mount platform.' },
  { id: 'rock', name: 'Foundation Stone', color: '#7a7568', description: 'The sacred rock enclosed by the shrine.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
function ex(name, text) { explanations[name.toLowerCase()] = text; }
for (let k = 1; k <= 8; k++) {
  ex(`Outer wall ${k} lower`, `Lower course of outer wall ${k} of the octagon, each side about 18 m. The 16th-century Ottoman tiles face these walls. Exact coursing is schematic.`);
  ex(`Outer wall ${k} upper`, `Upper course of outer wall ${k} of the octagon. Exact coursing is schematic.`);
  ex(`Outer wall windows ${k}`, `Window band ${k} piercing the outer wall. Exact window arrangement is schematic.`);
}
ex('Wall cornice', 'The cornice crowning the outer walls. Exact profile is schematic.');
ex('Wall plinth', 'The plinth at the base of the outer walls. Exact form is schematic.');
for (let k = 1; k <= 8; k++) ex(`Arcade pier ${k}`, `Arcade pier ${k} of the inner octagonal arcade. Exact position is schematic.`);
for (let k = 1; k <= 24; k++) {
  if (k % 3 !== 0) ex(`Arcade column ${k}`, `Arcade column ${k} of the inner octagonal arcade of 24 piers and columns. Exact position is schematic.`);
}
for (let k = 1; k <= 4; k++) ex(`Drum pier ${k}`, `Drum pier ${k}, one of four carrying the dome drum. Exact position is schematic.`);
for (let k = 1; k <= 16; k++) {
  if (!explanations[`drum column ${k}`]) ex(`Drum column ${k}`, `Drum column ${k}, one of twelve carrying the dome drum. Exact position is schematic.`);
}
ex('Drum shell', 'The cylindrical drum carrying the 20 m dome, pierced by windows. Exact height is schematic.');
for (let k = 1; k <= 16; k++) ex(`Drum window ${k}`, `Drum window ${k} lighting the interior. Exact arrangement is schematic.`);
ex('Drum cornice', 'The cornice at the top of the drum. Exact profile is schematic.');
for (let k = 1; k <= 8; k++) ex(`Dome segment ${k}`, `Gilded dome segment ${k} of the 20 m outer dome. Exact segmentation is schematic.`);
ex('Inner wooden dome', 'The inner wooden dome visible from the interior, part of the double-shell construction. Exact form is schematic.');
ex('Dome finial and crescent', 'The finial and crescent crowning the dome. Exact form is schematic.');
for (const nm of ['North', 'East', 'South', 'West']) {
  const sl = nm.toLowerCase();
  ex(`${nm} entrance door`, `The ${sl} entrance door, one of four on the cardinal axes. Exact form is schematic.`);
  ex(`${nm} entrance porch`, `The ${sl} entrance porch. Exact form is schematic.`);
  ex(`${nm} entrance steps`, `Steps to the ${sl} entrance. Exact form is schematic.`);
}
ex('Temple Mount platform', 'The raised platform of the Temple Mount on which the shrine stands. Exact form is schematic.');
for (let k = 1; k <= 3; k++) ex(`Platform step ${k}`, `Platform step ${k}. Exact form is schematic.`);
ex('Foundation Stone', 'The Foundation Stone, about 13 by 7.6 m, the sacred rock at the heart of the shrine. Exact form is schematic.');
ex('Rock chamber', 'The chamber beneath the rock. Exact form is schematic.');

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
const binName = 'dome-of-the-rock-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Dome of the Rock, Jerusalem',
  title: 'Dome of the Rock',
  location: 'Jerusalem',
  blurb: 'The 691-692 CE Umayyad shrine: an octagonal arcade around a 20 m gilded dome on a windowed drum, enclosing the Foundation Stone.',
  sourceUrls: [{ label: 'Wikipedia: Dome of the Rock', url: 'https://en.wikipedia.org/wiki/Dome_of_the_Rock' }],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/dome-of-the-rock/dome-of-the-rock-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
