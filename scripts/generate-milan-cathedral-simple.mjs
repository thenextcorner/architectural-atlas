// Simplified schematic Milan Cathedral for the Architectural Atlas.
//
// The "simple" variant of the Duomo di Milano: same footprint, massing
// and proportions as the detailed model (see
// scripts/generate-milan-cathedral.mjs, whose header lists every sourced
// dimension reused here), but coarser: about 30 named parts across 7
// systems instead of 138 across 8. Portals, windows, buttresses, spires
// and columns are merged into group parts; the tiburio and main spire
// keep their landmark silhouette.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-milan-cathedral.mjs for the full attribution):
//   158.6 m long, 92 m wide, 108.5 m spire, 1386-1965, 135 spires,
//   3,400+ statues, 96 gargoyles, Madonnina 1774, Candoglia marble,
//   five naves, five bronze doors, Italian Gothic.
// Schematic (not sourced, never stated as fact in the UI): merged group
// geometry; exact subdivisions and positions.
//
// Writes:
//   public/models/milan-cathedral-simple/atlas.json
//   public/models/milan-cathedral-simple/milan-cathedral-simple-0.bin
//
// Usage: node scripts/generate-milan-cathedral-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'milan-cathedral-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (158.6 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 158.6;

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
function cyl(rt, rb, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function prism(x0, x1, y0, yApex, z0, z1) {
  const xm = (x0 + x1) / 2;
  const v = new Float32Array([
    x0, y0, z0, x1, y0, z0, xm, yApex, z0,
    x0, y0, z1, x1, y0, z1, xm, yApex, z1,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setIndex([0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5]);
  g.computeVertexNormals();
  return g;
}
function gableZ(x0, x1, z0, z1, y0, yApex) {
  const g = prism(z0, z1, y0, yApex, x0, x1);
  g.rotateY(Math.PI / 2);
  return g;
}
function slab(w, t, l, ang, x, y, z) {
  const g = new THREE.BoxGeometry(w, t, l);
  g.rotateZ(ang);
  g.translate(x, y, z);
  return g;
}
function spire(x, z, yBase, h, r) {
  const g = new THREE.CylinderGeometry(0.06, r, h, 6);
  g.translate(x, yBase + h / 2, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

addPart('floor-slab', 'Floor slab', 'interior', [box(-79.3, 79.3, 0, 1, -46, 46)]);

// --- Facade: merged masses: 6 parts.
addPart('facade-mass', 'Facade mass', 'facade', [
  box(-81, -79.3, 1, 45, -46, 46),
  gableZ(-81, -79.3, -46, 46, 45, 57),
]);
{
  const portals = [];
  for (const z of [-32, -16, 0, 16, 32]) {
    portals.push(box(-82.5, -79.3, 1, 13, z - 4, z + 4));
    portals.push(box(-82.7, -82.4, 1, 10.5, z - 3, z + 3));
  }
  addPart('portals-and-doors', 'Portals and bronze doors', 'facade', portals);
}
{
  const wins = [];
  for (const z of [-24, 0, 24]) wins.push(box(-81.2, -80.9, 20, 38, z - 5, z + 5));
  addPart('facade-windows', 'Facade windows', 'facade', wins);
}
{
  const spires = [];
  for (let k = 0; k < 8; k++) spires.push(spire(-80, -42 + k * 12, 45, 12, 1.6));
  addPart('facade-spires', 'Facade spires', 'spires', spires);
}

// --- Nave: 5 parts.
addPart('nave-walls', 'Nave walls', 'nave', [
  box(-79.3, 60, 1, 35, 40, 46),
  box(-79.3, 60, 1, 35, -46, -40),
]);
{
  const wins = [];
  for (let k = 0; k < 6; k++) {
    const x = -60 + k * 20;
    wins.push(box(x - 4, x + 4, 12, 28, 45.7, 46.1));
    wins.push(box(x - 4, x + 4, 12, 28, -46.1, -45.7));
  }
  addPart('nave-windows', 'Nave windows', 'nave', wins);
}
addPart('nave-roof', 'Nave roof', 'nave', [
  slab(50, 0.8, 145, 0.35, 0, 42, 23),
  slab(50, 0.8, 145, -0.35, 0, 42, -23),
]);
{
  const bs = [];
  for (const S of [1, -1]) {
    for (let k = 0; k < 10; k++) {
      const x = -70 + k * 13.5;
      bs.push(box(x - 1.2, x + 1.2, 1, 30, S * 52 - 1.2, S * 52 + 1.2));
      bs.push(strut([x, 30, S * 43], [x, 26, S * 51], 1.4));
    }
  }
  addPart('flying-buttresses', 'Flying buttresses', 'buttresses', bs);
}

// --- Transept and apse: 4 parts.
addPart('transept-arms', 'Transept arms', 'transept-apse', [
  box(-10, 10, 1, 35, 46, 70),
  box(-10, 10, 1, 35, -70, -46),
  gableZ(-10, 10, 46, 70, 35, 44),
  gableZ(-10, 10, -70, -46, 35, 44),
]);
addPart('transept-windows', 'Transept windows', 'transept-apse', [
  box(-5, 5, 14, 30, 69.7, 70.1),
  box(-5, 5, 14, 30, -70.1, -69.7),
]);
{
  const chapels = [];
  for (const z of [-30, 0, 30]) {
    chapels.push(cyl(9, 9, 34, 70, 18, z, 5));
    chapels.push(box(77.5, 78.2, 12, 26, z - 3, z + 3));
  }
  addPart('apse-chapels', 'Apse chapels', 'transept-apse', chapels);
}

// --- Crossing tower and main spire: 4 parts.
{
  const faces = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4 + Math.PI / 8;
    faces.push(box(13 * Math.cos(a) - 5, 13 * Math.cos(a) + 5, 35, 58, 13 * Math.sin(a) - 1, 13 * Math.sin(a) + 1));
    faces.push(box(13 * Math.cos(a) - 2, 13 * Math.cos(a) + 2, 42, 52, 13 * Math.sin(a) - 1.3, 13 * Math.sin(a) + 1.3));
  }
  addPart('tiburio', 'Tiburio', 'crossing-tower', faces);
}
addPart('main-spire', 'Main spire', 'spires', [
  (() => { const g = new THREE.CylinderGeometry(0.8, 6, 42, 8, 1, true); g.translate(0, 79, 0); return g; })(),
  cyl(0.1, 0.8, 4, 0, 102, 0, 6),
]);
addPart('madonnina', 'Madonnina', 'statuary', [
  cyl(0.5, 0.9, 3.2, 0, 105.6, 0, 8),
  (() => { const g = new THREE.SphereGeometry(0.35, 8, 6); g.translate(0, 107.6, 0); return g; })(),
  (() => { const g = new THREE.TorusGeometry(0.7, 0.08, 6, 16); g.translate(0, 107.6, 0); return g; })(),
]);

// --- Roof spires and gargoyles: 2 parts.
{
  const spires = [];
  for (const z of [-36, -24, -12, 12, 24, 36]) {
    for (let xi = 0; xi < 20; xi++) {
      const x = -70 + xi * 6.5;
      if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;
      spires.push(spire(x, z, 38, 9, 1.2));
    }
  }
  addPart('roof-spires', 'Roof spires', 'spires', spires);
  const gs = [];
  for (let j = 0; j < 48; j++) {
    const side = j % 2 === 0 ? 1 : -1;
    const x = -65 + Math.floor(j / 2) * 5.2;
    gs.push(box(x - 0.3, x + 0.3, 33, 34.5, side * 46, side * 48.5));
  }
  addPart('gargoyles', 'Gargoyles', 'statuary', gs);
}

// --- Interior: 3 parts.
{
  const cols = [];
  for (const z of [-15, 15]) {
    for (let c = 0; c < 6; c++) cols.push(cyl(1.1, 1.3, 30, -60 + c * 22, 16, z, 8));
  }
  addPart('nave-colonnades', 'Nave colonnades', 'interior', cols);
}
addPart('high-altar', 'High altar', 'interior', [box(55, 62, 1, 4, -6, 6)]);
addPart('statue-niches', 'Facade statue niches', 'statuary', [
  box(-81.3, -80.8, 14, 32, -40, -36),
  box(-81.3, -80.8, 14, 32, 36, 40),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'floor-slab') return '#a89f92';
  if (id === 'madonnina') return '#d4af37';
  if (id.includes('window')) return '#9fd4e8';
  if (id === 'portals-and-doors') return '#8a6f45';
  if (id === 'gargoyles') return '#c9bda8';
  if (id === 'nave-colonnades' || id === 'high-altar') return '#e5d9c6';
  return '#f0e8dc';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'facade', name: 'West facade', color: '#f0e8dc', description: 'The west front with portals, bronze doors and windows.' },
  { id: 'nave', name: 'Nave', color: '#f0e8dc', description: 'The five-aisled nave with walls, windows and roof.' },
  { id: 'buttresses', name: 'Flying buttresses', color: '#e8d8cc', description: 'The flying buttresses.' },
  { id: 'transept-apse', name: 'Transept and apse', color: '#f0e8dc', description: 'The transept arms and apse chapels.' },
  { id: 'crossing-tower', name: 'Crossing tower', color: '#ece0d0', description: 'The octagonal tiburio.' },
  { id: 'spires', name: 'Spires', color: '#f0e8dc', description: 'The 135 spires led by the 108.5 m main spire.' },
  { id: 'statuary', name: 'Statuary', color: '#d4af37', description: 'Niches, gargoyles and the Madonnina.' },
  { id: 'interior', name: 'Interior', color: '#e5d9c6', description: 'Floor, colonnades and altar.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'floor slab': 'The cathedral floor. Schematic.',
  'facade mass': 'The west front facing the Piazza del Duomo. Schematic.',
  'portals and bronze doors': 'The five portals with bronze doors of the west front. Schematic.',
  'facade windows': 'The great west windows. Schematic.',
  'facade spires': 'Spires along the facade crown. Schematic.',
  'nave walls': 'The outer walls of the five-aisled nave. Schematic.',
  'nave windows': 'The aisle windows. Schematic.',
  'nave roof': 'The nave roof carrying rows of spires. Schematic.',
  'flying buttresses': 'The flying buttresses carrying the vault thrust outward. Schematic.',
  'transept arms': 'The transept arms with their gables. Schematic.',
  'transept windows': 'The great transept windows. Schematic.',
  'apse chapels': 'The polygonal apse chapels at the east end. Schematic.',
  'tiburio': 'The octagonal crossing tower. Schematic.',
  'main spire': 'The main spire rising to 108.5 m. Schematic.',
  'madonnina': 'The Madonnina, the gilded copper Virgin placed in 1774, for almost two centuries the highest point in Milan. Schematic.',
  'roof spires': 'The 135 spires crowning the roofs. Exact positions are schematic.',
  'gargoyles': 'The 96 gargoyles channeling rainwater off the roofs. Schematic.',
  'nave colonnades': 'The nave colonnades; 52 columns rise down the five aisles. Schematic.',
  'high altar': 'The high altar. Schematic.',
  'facade statue niches': 'Statue niches of the west front, part of the more than 3,400 statues. Schematic.',
};

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
const binName = 'milan-cathedral-simple-0.bin';
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
  scope: 'Milan Cathedral, Milan (simplified schematic)',
  title: 'Milan Cathedral',
  location: 'Milan, Lombardy, Italy',
  blurb: 'The Duomo di Milano in simplified schematic form: 158.6 m of Gothic marble with 135 spires and the gilded Madonnina.',
  sourceUrls: [
    { label: 'Wikipedia: Milan Cathedral', url: 'https://en.wikipedia.org/wiki/Milan_Cathedral' },
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
  chunks: [{ url: '/models/milan-cathedral-simple/milan-cathedral-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
