// Detailed Potala Palace, Lhasa, for the Architectural Atlas.
//
// Sourced dimensions and facts (never re-state schematics as fact in the UI):
//   former winter palace of the Dalai Lamas in Lhasa, Tibet, on Marpo Ri
//   (Red Hill) at about 3,700 m altitude; construction of the present
//   structure begun in 1645 by the 5th Dalai Lama (Lozang Gyatso); the White
//   Palace (Potrang Karpo) completed 1648-1649; the Red Palace (Potrang
//   Marpo) added 1690-1694; built on the site of Songtsen Gampo's 7th
//   century palace (traditionally 637); 400 m east-west by 350 m north-south;
//   sloping stone walls averaging 3 m thick (5 m at the base) with copper
//   poured into the foundations for earthquake protection; 13 stories,
//   over 1,000 rooms (some counts say 2,000), 10,000 shrines, some 200,000
//   statues; rises about 117-119 m above the hill; the White Palace served
//   secular use (living quarters, offices, seminary, printing house); the
//   Red Palace is religious (eight golden stupas that are the tombs of eight
//   Dalai Lamas, assembly hall, chapels, libraries); five gilded bronze
//   roofs; murals totalling some 2,500 square meters; the 14th Dalai Lama
//   fled in 1959, after which the palace became a museum; named after Mount
//   Potalaka, abode of Avalokitesvara.
//   Sources: Wikipedia "Potala Palace"; chinatourguide.com;
//   english.igsnrr.cas.cn; youlinmagazine.com.
// Schematic (not sourced, never stated as fact in the UI): exact building
// heights and footprints, the subdivision of blocks into parts, stair and
// courtyard layouts, chapel positions, window arrangements, roof profiles,
// hill form.
//
// Coordinate frame: x = east-west (east +x), z = north-south, y = up from
// the hilltop. All dimensions in meters.
//
// Granularity: 100+ named parts across 8 systems. Every explanation is
// either a sourced fact or explicitly marked schematic.
//
// Usage: node scripts/generate-potala-palace.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'potala-palace');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (400 m) maps to 2.4 units.
const S = 2.4 / 400;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
// Battered-wall block: square frustum, wider at the base, mimicking the
// palace's sloping stone walls.
function frustum(cx, cz, wBase, wTop, y0, y1) {
  const g = new THREE.CylinderGeometry(wTop / Math.SQRT2, wBase / Math.SQRT2, y1 - y0, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(cx, (y0 + y1) / 2, cz);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// Chinese pavilion roof: stacked slabs narrowing upward.
function pavilionRoof(cx, cz, w, y) {
  const g1 = box(cx - w / 2, cx + w / 2, y, y + 1.5, cz - w / 2, cz + w / 2);
  const g2 = box(cx - w / 2 + 3, cx + w / 2 - 3, y + 1.5, y + 4, cz - w / 2 + 3, cz + w / 2 - 3);
  const g3 = box(cx - w / 2 + 6, cx + w / 2 - 6, y + 4, y + 5, cz - w / 2 + 6, cz + w / 2 - 6);
  return [g1, g2, g3];
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const explanations = {};
const explain = (name, text) => { explanations[name.toLowerCase()] = text; };

// ---------------------------------------------------------------- hill base (3 parts)
addPart('marpo-ri-hill', 'Marpo Ri hill', 'hill', [frustum(0, 0, 460, 380, -60, 0)]);
explain('Marpo Ri hill', 'Red Hill, rising about 3,700 m above sea level in the Lhasa valley; the palace stands on its summit. Hill form is schematic.');
addPart('hill-retaining-west', 'West retaining walls', 'hill',
  [box(-230, -190, -40, 5, -120, 120)]);
explain('West retaining walls', 'Retaining walls terracing the hill on the west. Layout is schematic.');
addPart('hill-retaining-east', 'East retaining walls', 'hill',
  [box(190, 230, -40, 5, -120, 120)]);
explain('East retaining walls', 'Retaining walls terracing the hill on the east. Layout is schematic.');

// ---------------------------------------------------------------- White Palace (Potrang Karpo): east and west wings
// East wing: x 60..200, West wing: x -200..-60. 7 stories, battered walls.
for (const [wing, x0, x1] of [['east', 60, 200], ['west', -200, -60]]) {
  const cx = (x0 + x1) / 2, w = x1 - x0;
  // Three horizontal bands.
  const bands = [[0, 13, 'lower'], [13, 27, 'middle'], [27, 40, 'upper']];
  for (const [y0, y1, bn] of bands) {
    const taper = 1 - (y1 / 40) * 0.12;
    addPart(`white-palace-${wing}-${bn}`, `White Palace ${wing} ${bn} band`, 'white-palace',
      [frustum(cx, 0, w, w * (1 - (y1 / 40) * 0.12), y0, y1)]);
    explain(`White Palace ${wing} ${bn} band`,
      `The ${bn} band of the ${wing} wing of the White Palace (Potrang Karpo), the secular residence completed 1648-1649 with living quarters, offices, the seminary and the printing house. Subdivision is schematic.`);
  }
  // Window bands: rows of dark window insets.
  for (let r = 0; r < 4; r++) {
    const y = 6 + r * 8;
    const wins = [];
    for (let wx = x0 + 12; wx < x1 - 8; wx += 16)
      wins.push(box(wx, wx + 6, y, y + 4, -52, -50), box(wx, wx + 6, y, y + 4, 50, 52));
    addPart(`white-palace-${wing}-windows-${r + 1}`, `White Palace ${wing} windows row ${r + 1}`, 'white-palace', wins);
    explain(`White Palace ${wing} windows row ${r + 1}`, 'A row of the small deep-set windows lighting the White Palace halls; the halls are spacious while the windows are extremely narrow. Arrangement is schematic.');
  }
  // Red-brown frieze band under the roofline (characteristic pembe band).
  addPart(`white-palace-${wing}-frieze`, `White Palace ${wing} frieze band`, 'white-palace',
    [box(x0 + 2, x1 - 2, 40, 43, -52, 52)]);
  explain(`White Palace ${wing} frieze band`, 'The dark red-brown frieze band crowning the white walls below the roofline. Form is schematic.');
}
// Chamber of Sunshine (top floor).
addPart('chamber-of-sunshine-east', 'Eastern Chamber of Sunshine', 'white-palace',
  [box(120, 170, 40, 47, -30, 30)]);
explain('Eastern Chamber of Sunshine', 'The Eastern Chamber of Sunshine on the top floor, where the Dalai Lama stayed in winter; only monks above the fourth rank could enter the western chamber. Form is schematic.');
addPart('chamber-of-sunshine-west', 'Western Chamber of Sunshine', 'white-palace',
  [box(-170, -120, 40, 47, -30, 30)]);
explain('Western Chamber of Sunshine', 'The Western Chamber of Sunshine on the top floor. Form is schematic.');
// White Palace chapels.
for (let i = 0; i < 4; i++) {
  const x = i < 2 ? 80 + i * 50 : -130 + (i - 2) * 50;
  addPart(`white-palace-chapel-${i + 1}`, `White Palace chapel ${i + 1}`, 'white-palace',
    [box(x - 12, x + 12, 8, 20, -40, 40)]);
  explain(`White Palace chapel ${i + 1}`, 'One of the White Palace chapels and assembly rooms. Position is schematic.');
}

// ---------------------------------------------------------------- Red Palace (Potrang Marpo): central x -60..60
{
  const bands = [[0, 18, 'lower'], [18, 36, 'middle'], [36, 55, 'upper']];
  for (const [y0, y1, bn] of bands) {
    addPart(`red-palace-${bn}`, `Red Palace ${bn} band`, 'red-palace',
      [frustum(0, 0, 124, 124 * (1 - (y1 / 55) * 0.12), y0, y1)]);
    explain(`Red Palace ${bn} band`,
      `The ${bn} band of the Red Palace (Potrang Marpo), added 1690-1694 for religious use with chapels, shrines and libraries. Subdivision is schematic.`);
  }
  // Window rows.
  for (let r = 0; r < 6; r++) {
    const y = 8 + r * 8;
    const wins = [];
    for (let wx = -50; wx < 50; wx += 18)
      wins.push(box(wx, wx + 7, y, y + 4.5, -63, -61), box(wx, wx + 7, y, y + 4.5, 61, 63));
    addPart(`red-palace-windows-${r + 1}`, `Red Palace windows row ${r + 1}`, 'red-palace', wins);
    explain(`Red Palace windows row ${r + 1}`, 'A row of windows in the crimson walls of the Red Palace. Arrangement is schematic.');
  }
  // Eight golden stupas (tombs of eight Dalai Lamas).
  for (let i = 0; i < 8; i++) {
    const sx = -42 + (i % 4) * 28, sz = (i < 4 ? -30 : 30);
    addPart(`golden-stupa-${i + 1}`, `Golden stupa ${i + 1}`, 'red-palace', [
      box(sx - 6, sx + 6, 55, 58, sz - 6, sz + 6),
      cyl(2.5, 4, 8, sx, 62, sz, 10),
      sphereTop(sx, 68, sz),
    ]);
    explain(`Golden stupa ${i + 1}`, `One of the eight golden stupas in the Red Palace, the tombs of eight Dalai Lamas, sheathed in gold. Position is schematic.`);
  }
  // Great assembly hall.
  addPart('great-assembly-hall', 'Great assembly hall', 'red-palace',
    [box(-40, 40, 10, 24, -45, 45)]);
  explain('Great assembly hall', "The monks' great assembly hall in the Red Palace. Position is schematic.");
  addPart('assembly-hall-columns', 'Assembly hall columns', 'red-palace',
    [cyl(1, 1, 14, -20, 17, -20, 8), cyl(1, 1, 14, 20, 17, -20, 8), cyl(1, 1, 14, -20, 17, 20, 8), cyl(1, 1, 14, 20, 17, 20, 8)]);
  explain('Assembly hall columns', 'Painted columns of the assembly hall; the palace columns and beams are carved and painted. Arrangement is schematic.');
}
function sphereTop(x, y, z) {
  const g = new THREE.SphereGeometry(2.5, 10, 8);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- gilded roofs (7 parts)
const ROOFS = [
  ['Red Palace central roof', 0, 0, 60],
  ['Red Palace east roof', 45, 0, 40],
  ['Red Palace west roof', -45, 0, 40],
  ['White Palace east roof', 130, 0, 55],
  ['White Palace west roof', -130, 0, 55],
  ['Chapel roof north', 0, -80, 35],
  ['Chapel roof south', 0, 80, 35],
];
for (const [nm, cx, cz, w] of ROOFS) {
  addPart(nm.toLowerCase().replace(/ /g, '-'), nm, 'roofs', pavilionRoof(cx, cz, w, 55));
  explain(nm, 'One of the gilded bronze roofs in Chinese pavilion style crowning the palace. Five of the roofs are gilt; positions are schematic.');
}

// ---------------------------------------------------------------- perimeter walls and chapels row (10 parts)
for (let i = 0; i < 8; i++) {
  const x0 = -200 + i * 50;
  addPart(`perimeter-wall-${i + 1}`, `Perimeter wall ${i + 1}`, 'walls',
    [box(x0, x0 + 50, -30, 8, -175, -165), box(x0, x0 + 50, -30, 8, 165, 175)]);
  explain(`Perimeter wall ${i + 1}`, 'A section of the outer perimeter walls ringing the complex. Layout is schematic.');
}
addPart('perimeter-wall-east', 'East perimeter wall', 'walls', [box(195, 205, -30, 8, -165, 165)]);
explain('East perimeter wall', 'The eastern outer wall. Layout is schematic.');
addPart('perimeter-wall-west', 'West perimeter wall', 'walls', [box(-205, -195, -30, 8, -165, 165)]);
explain('West perimeter wall', 'The western outer wall. Layout is schematic.');

// ---------------------------------------------------------------- gates (3 parts)
addPart('main-gate', 'Main gate', 'gates', [box(-12, 12, 0, 14, 165, 175)]);
explain('Main gate', 'The main pilgrim gate on the south front. Form is schematic.');
addPart('east-gate', 'East gate', 'gates', [box(195, 205, 0, 10, -8, 8)]);
explain('East gate', 'The eastern gate. Form is schematic.');
addPart('west-gate', 'West gate', 'gates', [box(-205, -195, 0, 10, -8, 8)]);
explain('West gate', 'The western gate. Form is schematic.');

// ---------------------------------------------------------------- grand stairs (6 parts)
for (let i = 0; i < 3; i++) {
  addPart(`south-stair-${i + 1}`, `South grand stair flight ${i + 1}`, 'stairs',
    [box(-14 + i * 2, 14 - i * 2, -50 + i * 18, -44 + i * 18, 120 - i * 40, 175 - i * 40)]);
  explain(`South grand stair flight ${i + 1}`, 'One flight of the grand southern stair climbing Marpo Ri to the palace. Layout is schematic.');
}
for (let i = 0; i < 3; i++) {
  addPart(`east-stair-${i + 1}`, `East stair flight ${i + 1}`, 'stairs',
    [box(175 - i * 30, 230 - i * 30, -50 + i * 18, -44 + i * 18, -12 + i * 2, 12 - i * 2)]);
  explain(`East stair flight ${i + 1}`, 'One flight of the eastern stair. Layout is schematic.');
}

// ---------------------------------------------------------------- courtyards (3 parts)
addPart('east-courtyard', 'East courtyard', 'courtyards', [box(70, 190, 0, 2, -60, 60)]);
explain('East courtyard', 'The eastern courtyard before the White Palace. Layout is schematic.');
addPart('west-courtyard', 'West courtyard', 'courtyards', [box(-190, -70, 0, 2, -60, 60)]);
explain('West courtyard', 'The western courtyard before the White Palace. Layout is schematic.');
addPart('south-courtyard', 'South courtyard', 'courtyards', [box(-60, 60, 0, 2, 100, 160)]);
explain('South courtyard', 'The southern courtyard before the Red Palace. Layout is schematic.');

// ---------------------------------------------------------------- corner bastions (8 parts)
for (const [nm, cx, cz] of [
  ['White Palace east bastion', 200, -60], ['White Palace east bastion south', 200, 60],
  ['White Palace west bastion', -200, -60], ['White Palace west bastion south', -200, 60],
]) {
  addPart(nm.toLowerCase().replace(/ /g, '-'), nm, 'white-palace', [frustum(cx, cz, 30, 24, 0, 45)]);
  explain(nm, 'A fortified corner bastion of the White Palace. Form is schematic.');
}
for (const [nm, cx, cz] of [
  ['Red Palace northeast bastion', 62, -62], ['Red Palace southeast bastion', 62, 62],
  ['Red Palace northwest bastion', -62, -62], ['Red Palace southwest bastion', -62, 62],
]) {
  addPart(nm.toLowerCase().replace(/ /g, '-'), nm, 'red-palace', [frustum(cx, cz, 26, 21, 0, 58)]);
  explain(nm, 'A fortified corner bastion of the Red Palace. Form is schematic.');
}

// ---------------------------------------------------------------- mural bands (6 parts)
for (const [wing, x0, x1] of [['east', 60, 200], ['west', -200, -60]]) {
  addPart(`white-palace-${wing}-murals`, `White Palace ${wing} mural band`, 'white-palace',
    [box(x0 + 4, x1 - 4, 28, 32, -54, 54)]);
  explain(`White Palace ${wing} mural band`, 'A band of the celebrated wall murals; the palace murals total some 2,500 square meters. Arrangement is schematic.');
}
for (let i = 0; i < 4; i++) {
  addPart(`red-palace-mural-band-${i + 1}`, `Red Palace mural band ${i + 1}`, 'red-palace',
    [box(-58, 58, 12 + i * 10, 15 + i * 10, -64, 64)]);
  explain(`Red Palace mural band ${i + 1}`, 'A band of religious murals in the Red Palace. Arrangement is schematic.');
}

// ---------------------------------------------------------------- chapel altars (6 parts)
for (let i = 0; i < 6; i++) {
  const x = -45 + (i % 3) * 45, z = i < 3 ? -30 : 30;
  addPart(`chapel-altar-${i + 1}`, `Chapel altar ${i + 1}`, 'red-palace',
    [box(x - 5, x + 5, 55, 60, z - 5, z + 5), cyl(2, 2.5, 3, x, 61, z, 8)]);
  explain(`Chapel altar ${i + 1}`, 'A chapel altar with its shrine figures; the complex holds some 200,000 statues. Form is schematic.');
}

// ---------------------------------------------------------------- wall chapels row (8 parts)
for (let i = 0; i < 8; i++) {
  const x = -175 + i * 50;
  addPart(`wall-chapel-${i + 1}`, `Wall chapel ${i + 1}`, 'walls',
    [box(x - 10, x + 10, -30, 0, -175, -155)]);
  explain(`Wall chapel ${i + 1}`, 'A small chapel set into the northern perimeter wall. Position is schematic.');
}

// ---------------------------------------------------------------- monk dormitories (4 parts)
for (const [nm, x0, x1] of [['East dormitory', 100, 180], ['West dormitory', -180, -100]]) {
  addPart(`${nm.toLowerCase().replace(/ /g, '-')}-north`, `${nm} north range`, 'walls',
    [box(x0, x1, -30, -8, -150, -120)]);
  explain(`${nm} north range`, "A monks' dormitory range. Layout is schematic.");
  addPart(`${nm.toLowerCase().replace(/ /g, '-')}-south`, `${nm} south range`, 'walls',
    [box(x0, x1, -30, -8, 120, 150)]);
  explain(`${nm} south range`, "A monks' dormitory range. Layout is schematic.");
}

// ---------------------------------------------------------------- prayer flag poles (4 parts)
const FLAG_POS = [[-90, 130], [90, 130], [-90, -130], [90, -130]];
FLAG_POS.forEach(([fx, fz], i) => {
  addPart(`prayer-flag-pole-${i + 1}`, `Prayer flag pole ${i + 1}`, 'courtyards',
    [cyl(0.3, 0.3, 25, fx, 12, fz, 6)]);
  explain(`Prayer flag pole ${i + 1}`, 'A prayer flag pole in the courtyards. Position is schematic.');
});

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('stupa') || id.includes('roof')) return '#c9a227'; // gilt
  if (id.startsWith('red-palace')) return '#a03a2e'; // crimson
  if (id.startsWith('white-palace') || id.includes('sunshine')) return '#e8e2d4'; // whitewash
  if (id.includes('frieze')) return '#5a3226';
  if (id.includes('stair') || id.includes('courtyard') || id.includes('plaza')) return '#b5aa92';
  if (id.includes('hill') || id.includes('retaining')) return '#9a917f';
  if (id.includes('wall') || id.includes('gate')) return '#c9bfa5';
  return '#c9bfa5';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'hill', name: 'Marpo Ri hill', color: '#9a917f', description: 'Red Hill and its retaining terraces, some 3,700 m above sea level.' },
  { id: 'white-palace', name: 'White Palace', color: '#e8e2d4', description: 'The Potrang Karpo, the secular White Palace completed 1648-1649: living quarters, offices, seminary and printing house.' },
  { id: 'red-palace', name: 'Red Palace', color: '#a03a2e', description: 'The Potrang Marpo, the religious Red Palace of 1690-1694: chapels, the assembly hall and the eight golden stupas.' },
  { id: 'roofs', name: 'Gilded roofs', color: '#c9a227', description: 'The gilded bronze pavilion roofs crowning the palace.' },
  { id: 'walls', name: 'Perimeter walls', color: '#c9bfa5', description: 'The outer walls ringing the 400 by 350 m complex.' },
  { id: 'gates', name: 'Gates', color: '#c9bfa5', description: 'The pilgrim gates into the complex.' },
  { id: 'stairs', name: 'Grand stairs', color: '#b5aa92', description: 'The long stair flights climbing the hill to the palace.' },
  { id: 'courtyards', name: 'Courtyards', color: '#b5aa92', description: 'The courtyards before the palace fronts.' },
];

// ---------------------------------------------------------------- serialize (Atlas v1 contract)
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
  const posOff = offset; offset = align4(offset + pos.byteLength);
  const norOff = offset; offset = align4(offset + n16.byteLength);
  const idxOff = offset; offset = align4(offset + u32.byteLength);
  const bb = merged.boundingBox;
  records.push({
    part: p,
    pos: Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength),
    nor: Buffer.from(n16.buffer, n16.byteOffset, n16.byteLength),
    idx: Buffer.from(u32.buffer, u32.byteOffset, u32.byteLength),
    posOff, norOff, idxOff,
    vertexCount: pos.length / 3, indexCount: u32.length,
    bounds: [[bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.max.y, bb.max.z]],
  });
  triangles += u32.length / 3;
  merged.dispose();
}

const buffer = Buffer.alloc(offset);
for (const r of records) { r.pos.copy(buffer, r.posOff); r.nor.copy(buffer, r.norOff); r.idx.copy(buffer, r.idxOff); }
const binName = 'potala-palace-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Potala Palace, Lhasa',
  title: 'Potala Palace',
  location: 'Lhasa, Tibet, China',
  blurb: 'The Dalai Lamas\u2019 winter palace on Marpo Ri in Lhasa, begun 1645: the secular White Palace and the religious Red Palace with its eight golden stupas, 13 stories and over 1,000 rooms ringed by battered stone walls.',
  sourceUrls: [
    { label: 'Wikipedia: Potala Palace', url: 'https://en.wikipedia.org/wiki/Potala_Palace' },
    { label: 'chinatourguide.com: Potala Palace', url: 'http://www.chinatourguide.com/tibet/potala_palace.html' },
    { label: 'CAS: Potala Palace', url: 'http://english.igsnrr.cas.cn/ecg/cnwh/202011/t20201119_251657.html' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system,
    chunk: 0, color: colorFor(r.part.id),
    positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/potala-palace/potala-palace-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
