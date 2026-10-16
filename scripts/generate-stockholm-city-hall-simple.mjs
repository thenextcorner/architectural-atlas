// Simplified schematic Stockholm City Hall for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-stockholm-city-hall.mjs, whose
// header lists every sourced dimension reused here), but coarser: 30
// named parts across 7 systems instead of 101 across 8. Wing window
// bands are merged per wing; the Blue and Golden Halls are single
// volumes; tower detail is reduced to shaft, belfry, spire and crowns.
//
// Sourced dimensions reused from the detailed model (never re-stated
// here, see generate-stockholm-city-hall.mjs for the full attribution):
//   Ragnar Ostberg, National Romantic, built 1911-1923; 106 m tower;
//   Three Crowns 2.2 m wide, 1.1 m high; Blue Hall (Nobel Banquet);
//   Golden Hall (18 million gold mosaics); Borgargarden courtyard.
// Schematic (not sourced, never stated as fact in the UI): footprint,
// merged geometry, simplified tower and hall forms.
//
// Writes:
//   public/models/stockholm-city-hall-simple/atlas.json
//   public/models/stockholm-city-hall-simple/stockholm-city-hall-simple-0.bin
//
// Usage: node scripts/generate-stockholm-city-hall-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'stockholm-city-hall-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (106 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 106;

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

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const BX = 55, BZ = 37.5;
const TX = 42, TZ = 28;

// --- Tower merged: shaft, belfry, spire, crowns, bells.
addPart('tower-shaft', 'Tower shaft', 'tower', [
  box(TX - 7, TX + 7, 0, 15, TZ - 7, TZ + 7),
  box(TX - 5.5, TX + 5.5, 15, 62, TZ - 5.5, TZ + 5.5),
  box(TX - 4.5, TX + 4.5, 62, 78, TZ - 4.5, TZ + 4.5),
]);
addPart('tower-belfry', 'Belfry', 'tower', [
  box(TX - 4.5, TX + 4.5, 78, 90, TZ - 4.5, TZ - 3.5),
  box(TX - 4.5, TX + 4.5, 78, 90, TZ + 3.5, TZ + 4.5),
  box(TX - 4.5, TX - 3.5, 78, 90, TZ - 4.5, TZ + 4.5),
  box(TX + 3.5, TX + 4.5, 78, 90, TZ - 4.5, TZ + 4.5),
  box(TX - 5.5, TX + 5.5, 90, 92, TZ - 5.5, TZ + 5.5),
]);
addPart('tower-spire', 'Tower spire', 'tower', [
  cyl(0.8, 4.5, 12, TX, 98, TZ, 4),
]);
{
  const crowns = [];
  for (let c = 0; c < 3; c++) {
    const a = (c / 3) * Math.PI * 2;
    const cx = TX + Math.cos(a) * 1.8;
    const cz = TZ + Math.sin(a) * 1.8;
    crowns.push(cyl(1.1, 1.1, 1.1, cx, 104.5, cz, 10));
  }
  addPart('three-crowns', 'Three Crowns', 'tower', crowns);
}
addPart('tower-bells', 'Tower bells and carillon', 'tower', [
  box(TX - 3, TX + 3, 80, 84, TZ + 4.5, TZ + 5.5),
  cyl(0.3, 0.7, 1.2, TX - 1, 85, TZ, 8),
  cyl(0.3, 0.7, 1.2, TX + 1, 85, TZ, 8),
]);
addPart('tower-clocks', 'Tower clock faces', 'tower', [
  box(TX - 2, TX + 2, 66, 70, TZ - 5.1, TZ - 4.9),
  box(TX - 2, TX + 2, 66, 70, TZ + 4.9, TZ + 5.1),
  box(TX + 4.9, TX + 5.1, 66, 70, TZ - 2, TZ + 2),
  box(TX - 5.1, TX - 4.9, 66, 70, TZ - 2, TZ + 2),
]);
addPart('tower-balcony', 'Tower balcony', 'tower', [
  box(TX - 6.5, TX + 6.5, 71, 72, TZ - 6.5, TZ + 6.5),
]);

// --- Main block: four wings merged (walls + windows each).
const wings = [
  ['north', 'North', -BX, BX, -BZ, -BZ + 14],
  ['south', 'South', -BX, BX, BZ - 14, BZ],
  ['west', 'West', -BX, -BX + 14, -BZ + 14, BZ - 14],
  ['east', 'East', BX - 14, BX, -BZ + 14, BZ - 14],
];
for (const [wid, wname, x0, x1, z0, z1] of wings) {
  const geoms = [box(x0, x1, 0, 15, z0, z1)];
  const n = Math.max(3, Math.floor((x1 - x0) / 8));
  for (let wxi = 0; wxi < n; wxi++) {
    const wx = x0 + 5 + (wxi * (x1 - x0 - 10)) / Math.max(1, n - 1);
    geoms.push(box(wx - 0.9, wx + 0.9, 4, 12, z0 - 0.3, z0 + 0.1));
    geoms.push(box(wx - 0.9, wx + 0.9, 4, 12, z1 - 0.1, z1 + 0.3));
  }
  geoms.push(box(x0 - 0.5, x1 + 0.5, 15, 16.5, z0 - 0.5, z1 + 0.5));
  addPart(`${wid}-wing`, `${wname} wing`, 'main-block', geoms);
}

// --- Blue Hall + Golden Hall merged volumes.
addPart('blue-hall', 'Blue Hall', 'blue-hall', [
  box(-40, 10, 0, 14, BZ - 30, BZ - 14),
  box(-40, 10, 14, 15.5, BZ - 30, BZ - 14),
]);
addPart('golden-hall', 'Golden Hall', 'golden-hall', [
  box(-40, 10, 14, 22, BZ - 30, BZ - 20),
  box(-40, 10, 22, 23.5, BZ - 30, BZ - 20),
]);

// --- Council chamber merged.
addPart('council-chamber', 'Council Chamber', 'council', [
  box(-50, -20, 0, 10, -BZ + 14, -BZ + 34),
]);

// --- Courtyard merged.
addPart('courtyard-colonnades', 'Borgargarden colonnades', 'courtyard', [
  box(-30, 30, 0, 5.8, -15, -13),
  box(-32, -30, 0, 5.8, -15, 15),
  box(30, 32, 0, 5.8, -15, 15),
]);
addPart('courtyard-fountain', 'Borgargarden fountain', 'courtyard', [
  cyl(3, 3.5, 1, 0, 0.5, 0, 10),
]);

// --- Roofs merged per wing pair.
addPart('roofs-north-south', 'North and south roofs', 'roofs', [
  box(-BX, BX, 16.5, 19, -BZ, -BZ + 14),
  box(-BX, BX, 16.5, 19, BZ - 14, BZ),
]);
addPart('roofs-east-west', 'East and west roofs', 'roofs', [
  box(-BX, -BX + 14, 16.5, 19, -BZ + 14, BZ - 14),
  box(BX - 14, BX, 16.5, 19, -BZ + 14, BZ - 14),
]);

// --- Waterfront merged.
addPart('waterfront', 'Waterfront terrace and steps', 'waterfront', [
  box(-BX, BX, -0.5, 0.5, BZ, BZ + 18),
  box(-BX, BX, -2.5, -0.5, BZ + 18, BZ + 24),
]);

// --- Entrance + statues.
addPart('entrance', 'Main entrance', 'main-block', [
  box(-4, 4, 0, 8, -BZ - 1, -BZ + 1),
]);
addPart('tower-sculptures', 'Tower sculptures', 'tower', [
  cyl(0.4, 0.6, 2.5, TX + 4, 74, TZ + 4, 8),
  cyl(0.4, 0.6, 2.5, TX - 4, 74, TZ - 4, 8),
]);
addPart('blue-hall-columns', 'Blue Hall columns', 'blue-hall', [
  cyl(0.5, 0.6, 12, -30, 6, BZ - 22, 8),
  cyl(0.5, 0.6, 12, -15, 6, BZ - 22, 8),
  cyl(0.5, 0.6, 12, 0, 6, BZ - 22, 8),
]);
addPart('courtyard-gates', 'Courtyard gates', 'courtyard', [
  box(30, 32, 0, 6, -2, 2),
  box(-32, -30, 0, 6, -2, 2),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('crown')) return '#c9a227';
  if (id.includes('tower')) return '#9c4a38';
  if (id.includes('golden')) return '#d4af37';
  if (id.includes('blue')) return '#7a3b2e';
  if (id.includes('council')) return '#8a5a44';
  if (id.includes('courtyard') || id.includes('fountain')) return '#b08a6a';
  if (id.includes('roof')) return '#5a6b5a';
  if (id.includes('waterfront')) return '#9a938a';
  if (id.includes('entrance')) return '#6b4a3a';
  return '#9c4a38';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'tower', name: 'City Hall Tower', color: '#9c4a38', description: 'The 106 m tower with belfry, spire and Three Crowns.' },
  { id: 'main-block', name: 'Main block', color: '#9c4a38', description: 'Red-brick wings.' },
  { id: 'blue-hall', name: 'Blue Hall', color: '#7a3b2e', description: 'The Nobel Banquet hall.' },
  { id: 'golden-hall', name: 'Golden Hall', color: '#d4af37', description: 'The gold mosaic hall.' },
  { id: 'council', name: 'Council Chamber', color: '#8a5a44', description: 'The council chamber.' },
  { id: 'courtyard', name: 'Borgargarden', color: '#b08a6a', description: "The citizens' courtyard." },
  { id: 'roofs', name: 'Roofs', color: '#5a6b5a', description: 'Roofs.' },
  { id: 'waterfront', name: 'Waterfront', color: '#9a938a', description: 'Terrace and steps.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'tower shaft': 'The 106 m brick tower shaft. Exact taper is schematic.',
  'belfry': 'The open belfry housing the nine bells. Exact arches are schematic.',
  'tower spire': 'The spire carrying the Three Crowns. Exact profile is schematic.',
  'three crowns': "The Three Crowns (Tre Kronor), Sweden's national emblem: gilded copper, each 2.2 m wide and 1.1 m high. Exact mounting is schematic.",
  'tower bells and carillon': 'Nine bells with the St. George and the Dragon carillon. Exact hanging is schematic.',
  'tower clock faces': 'Clock faces on the tower. Exact dials are schematic.',
  'tower balcony': 'The railed balcony at the viewpoint. Exact railing is schematic.',
  'tower sculptures': 'Sculptures at the tower viewpoint, including St. Eric. Exact figures are schematic.',
  'blue hall columns': 'Columns of the Blue Hall. Exact order is schematic.',
  'courtyard gates': "Gates of the citizens' courtyard. Exact design is schematic.",
  'north wing': 'North red-brick wing. Exact windows are schematic.',
  'south wing': 'South red-brick wing. Exact windows are schematic.',
  'west wing': 'West red-brick wing. Exact windows are schematic.',
  'east wing': 'East red-brick wing. Exact windows are schematic.',
  'blue hall': 'The Blue Hall, venue of the Nobel Banquet each 10 December. Exact volume is schematic.',
  'golden hall': 'The Golden Hall with about 18 million gold mosaic pieces. Exact volume is schematic.',
  'council chamber': 'The Council Chamber. Exact interior is schematic.',
  'borgargarden colonnades': "Colonnades of the citizens' courtyard. Exact columns are schematic.",
  'borgargarden fountain': "Fountain in the citizens' courtyard. Exact design is schematic.",
  'north and south roofs': 'Roofs over the north and south wings. Exact pitch is schematic.',
  'east and west roofs': 'Roofs over the east and west wings. Exact pitch is schematic.',
  'waterfront terrace and steps': 'Terrace and steps to Riddarfjarden. Exact extent is schematic.',
  'main entrance': 'The main entrance. Exact design is schematic.',
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
const binName = 'stockholm-city-hall-simple-0.bin';
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
  scope: 'Stockholm City Hall (simplified schematic)',
  title: 'Stockholm City Hall',
  location: 'Stockholm, Sweden',
  blurb: 'Ragnar Ostberg\u2019s city hall in simplified form: red-brick wings, Blue and Golden Halls, and the 106 m tower with the Three Crowns.',
  sourceUrls: [
    { label: 'Wikipedia: Stockholm City Hall', url: 'https://en.wikipedia.org/wiki/Stockholm_City_Hall' },
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
  chunks: [{ url: '/models/stockholm-city-hall-simple/stockholm-city-hall-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
