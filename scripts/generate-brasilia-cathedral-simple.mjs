// Simplified schematic Brasilia Cathedral for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-brasilia-cathedral.mjs, whose
// header lists every sourced dimension reused here), but coarser: 30
// named parts across 8 systems instead of 101 across 10. The 16 columns
// are merged into 4 groups, the glass into 4 bays, and interior fittings
// into groups.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-brasilia-cathedral.mjs for the full attribution):
//   Oscar Niemeyer, Joaquim Cardozo engineer; 16 hyperboloid concrete
//   columns, 42 m long, 90 tonnes each, 40 m high on a 70 m diameter;
//   inaugurated 31 May 1970; fiberglass glazing with 1990 stained glass;
//   three Ceschiatti angels; four bronze Evangelists; bell tower with
//   four Spanish bells; ovoid baptistry; reflecting pool 12 m wide.
// Schematic (not sourced, never stated as fact in the UI): column curve
// parameters, glass subdivision, interior layout, statue poses.
//
// Writes:
//   public/models/brasilia-cathedral-simple/atlas.json
//   public/models/brasilia-cathedral-simple/brasilia-cathedral-simple-0.bin
//
// Usage: node scripts/generate-brasilia-cathedral-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'brasilia-cathedral-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (70 m diameter) maps to 2.4 units (same
// as detailed).
const S = 2.4 / 76;
const rad = (d) => (d * Math.PI) / 180;

function colR(y) {
  const t = Math.min(1, Math.max(0, y / 40));
  return 2 + 32 * Math.pow(1 - t, 1.7);
}
function colPoint(thetaDeg, y) {
  const t = rad(thetaDeg), r = colR(y);
  return [r * Math.cos(t), y, r * Math.sin(t)];
}

// ---------------------------------------------------------------- helpers
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

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// 16 columns merged into 8 groups of 2 (one segment each, full height).
for (let g = 0; g < 8; g++) {
  const segs = [];
  for (let k = 0; k < 2; k++) {
    const c = g * 2 + k;
    const theta = c * 22.5;
    segs.push(strut(colPoint(theta, 0), colPoint(theta, 40), 2.8, 1.8));
  }
  addPart(`column-group-${g + 1}`, `Column group ${g + 1}`, 'columns', segs);
}
addPart('crown-ring', 'Crown ring', 'columns', [cyl(3.2, 3.2, 2.4, 0, 40.6, 0, 12)]);

// Glass merged into 8 bays.
{
  const profile = [];
  for (let i = 0; i <= 8; i++) {
    const y = (i / 8) * 40;
    profile.push(new THREE.Vector2(colR(y) + 0.4, y));
  }
  for (let g = 0; g < 8; g++) {
    const geo = new THREE.LatheGeometry(profile, 8, g * Math.PI / 4, Math.PI / 4);
    addPart(`glass-bay-${g + 1}`, `Glass bay ${g + 1}`, 'glass', [geo]);
  }
}

// Base, pool, entrance.
addPart('base-platform', 'Base platform', 'base', [cyl(38, 40, 1.6, 0, -0.8, 0, 24)]);
{
  const band = new THREE.CylinderGeometry(52, 52, 0.4, 32, 1, true);
  band.translate(0, -1.4, 0);
  const water = new THREE.CylinderGeometry(51.4, 51.4, 0.15, 32);
  water.translate(0, -1.35, 0);
  addPart('reflecting-pool', 'Reflecting pool', 'pool', [band, water]);
}
addPart('entrance-ramp-tunnel', 'Entrance ramp and tunnel', 'entrance', [
  box(-4, 4, -3.4, -2.6, 40, 58),
  box(-4, 4, -6, -3.4, 20, 40),
]);

// Nave interior (merged).
addPart('nave-floor-altar', 'Nave floor and altar', 'nave', [
  cyl(33, 33, 0.5, 0, -6.2, 0, 24),
  cyl(8, 9, 1.2, 0, -5.4, 0, 16),
  box(-2.4, 2.4, -4.8, -3.6, -1.2, 1.2),
]);
{
  const pews = [];
  for (let r = 12; r <= 28; r += 8) {
    for (let a = 0; a < 8; a++) {
      const th = rad(200 + a * 17.5);
      const g = box(-1.6, 1.6, 0, 1, -0.3, 0.3);
      g.rotateY(-th + Math.PI / 2);
      g.translate(r * Math.cos(th), -6, r * Math.sin(th));
      pews.push(g);
    }
  }
  addPart('pews', 'Pews', 'nave', pews);
}
// Angels merged into one part.
{
  const angels = [];
  [[2.22, -8, 6], [3.4, 4, -2], [4.25, 10, 8]].forEach(([len, ax, az]) => {
    const body = new THREE.CapsuleGeometry(0.35, len * 0.55, 4, 8);
    body.rotateZ(Math.PI / 2.4);
    body.translate(ax, 18, az);
    angels.push(body);
    angels.push(cyl(0.05, 0.05, 22, ax, 29, az, 6));
  });
  addPart('suspended-angels', 'Suspended angels', 'angels', angels);
}
// Evangelists merged into one part.
{
  const evs = [];
  ['matthew', 'mark', 'luke', 'john'].forEach((nm, i) => {
    const ex = -14 + i * 9;
    evs.push(cyl(0.7, 1.0, 3.2, ex, 1.6, 46, 8));
    const head = new THREE.SphereGeometry(0.42, 8, 6);
    head.translate(ex, 3.6, 46);
    evs.push(head);
    evs.push(box(ex - 1.1, ex + 1.1, -1.6, 0, 45, 47));
  });
  addPart('evangelists', 'Four Evangelists', 'evangelists', evs);
}
// Bell tower and baptistry (merged).
addPart('bell-tower', 'Bell tower', 'bell-tower', [
  box(39.4, 42.6, 2, 22, 19.4, 22.6),
  box(39, 43, 18, 23, 19, 23),
  cyl(0.5, 0.9, 1.6, 40.5, 20.5, 21, 8),
  cyl(0.5, 0.9, 1.6, 41.5, 20.5, 21, 8),
]);
{
  const dome = new THREE.SphereGeometry(7, 12, 8);
  dome.scale(1, 0.75, 1);
  dome.translate(-48, 1, -18);
  addPart('baptistry', 'Baptistry', 'baptistry', [cyl(7, 8, 2.5, -48, -0.4, -18, 12), dome]);
}
addPart('plaza-cross', 'Plaza cross', 'base', [
  box(-0.3, 0.3, -1.6, 6, -0.3, 0.3),
  box(-1.8, 1.8, 2.4, 3, -0.3, 0.3),
]);
addPart('sacristy-block', 'Sacristy block', 'nave', [box(24, 32, -6, -2, -8, 8)]);
addPart('pool-coping', 'Pool coping', 'pool', [cyl(52.6, 52.6, 0.5, 0, -1.2, 0, 32)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('glass-bay')) {
    const n = parseInt(id.split('-')[2], 10);
    return n % 2 ? '#5b8fa8' : '#6fa08a';
  }
  if (id.includes('angel')) return '#d8d2c4';
  if (id.includes('evangelist')) return '#5a4a33';
  if (id.includes('pool')) return '#4a7a96';
  if (id.includes('altar') || id.includes('nave-floor')) return '#e8e2d4';
  if (id.includes('pew')) return '#6b4f2e';
  return '#e3ddd0';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'columns', name: 'Hyperboloid columns', color: '#e3ddd0', description: 'The 16 curved concrete columns in four groups.' },
  { id: 'glass', name: 'Glass bays', color: '#5b8fa8', description: 'The glazing between the columns in four bays.' },
  { id: 'base', name: 'Base', color: '#b5aa92', description: 'The base platform and plaza cross.' },
  { id: 'pool', name: 'Reflecting pool', color: '#4a7a96', description: 'The reflecting pool ringing the cathedral.' },
  { id: 'entrance', name: 'Entrance', color: '#8f8578', description: 'The ramp and tunnel into the church.' },
  { id: 'nave', name: 'Nave', color: '#e8e2d4', description: 'The underground nave with floor, altar and pews.' },
  { id: 'angels', name: 'Angels', color: '#d8d2c4', description: 'The three suspended angels.' },
  { id: 'evangelists', name: 'Evangelists', color: '#5a4a33', description: 'The four bronze Evangelists.' },
  { id: 'bell-tower', name: 'Bell tower', color: '#e3ddd0', description: 'The bell tower with its bells.' },
  { id: 'baptistry', name: 'Baptistry', color: '#e3ddd0', description: 'The baptistry with its ovoid dome.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'crown ring': 'The ring where the 16 columns meet 40 m up. Exact form is schematic.',
  'base platform': 'The circular base platform. Exact dimensions are schematic.',
  'reflecting pool': 'The 12 m wide, 40 cm deep reflecting pool ringing the cathedral. Exact construction is schematic.',
  'pool coping': 'The coping stones edging the reflecting pool. Exact profile is schematic.',
  'entrance ramp and tunnel': 'The ramp and tunnel passing beneath the pool into the nave. Exact geometry is schematic.',
  'nave floor and altar': 'The underground nave floor with the altar donated by Pope Paul VI. Exact forms are schematic.',
  'sacristy block': 'The sacristy block beside the nave. Exact layout is schematic.',
  'pews': 'Pews for 4,000 worshippers arranged around the altar. Exact layout is schematic.',
  'suspended angels': 'The three angels by Alfredo Ceschiatti (1970) hanging on steel cables. Exact poses are schematic.',
  'four evangelists': 'The four bronze Evangelists by Ceschiatti at the entrance. Exact poses are schematic.',
  'bell tower': 'The separate bell tower with four bells donated by Spain. Exact form is schematic.',
  'baptistry': 'The baptistry with its ovoid dome. Exact form is schematic.',
  'plaza cross': 'The cross in the plaza. Exact form is schematic.',
};
for (let g = 1; g <= 8; g++) {
  explanations[`column group ${g}`] = `Two of the 16 curved concrete columns, each 42 m long and 90 tonnes. Exact curve and section are schematic.`;
  explanations[`glass bay ${g}`] = `One eighth of the fiberglass glazing between the columns, with Marianne Peretti's stained glass. Exact subdivision is schematic.`;
}

// ---------------------------------------------------------------- serialize
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
const binName = 'brasilia-cathedral-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Brasilia Cathedral, Brazil (simplified schematic)',
  title: 'Brasilia Cathedral',
  location: 'Brasilia, Brazil',
  blurb: 'Niemeyer\'s hyperboloid cathedral in simplified schematic form: 16 curved columns in four groups, four glass bays, and the angels, evangelists, bell tower and baptistry.',
  sourceUrls: [
    { label: 'Wikipedia: Cathedral of Brasilia', url: 'https://en.wikipedia.org/wiki/Cathedral_of_Bras%C3%ADlia' },
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
  chunks: [{ url: '/models/brasilia-cathedral-simple/brasilia-cathedral-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
