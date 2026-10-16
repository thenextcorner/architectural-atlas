// Simplified schematic Sheikh Zayed Grand Mosque for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-sheikh-zayed-grand-mosque.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// ~30 named parts across 7 systems instead of 110 across 8. Domes are
// merged into group parts; minarets are single parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-sheikh-zayed-grand-mosque.mjs for the full attribution):
//   Abu Dhabi, 1996-2007, Yusef Abdelki; 420 by 290 m; 82 domes of seven
//   sizes; main dome 85 m outer, 32.2 m diameter; four minarets about
//   104-107 m; 17,000 sq m marble courtyard; reflective pools; white
//   Macedonian marble.
// Schematic (not sourced, never stated as fact in the UI): dome
// arrangement; merged group geometry; minaret and entrance profiles.
//
// Writes:
//   public/models/sheikh-zayed-grand-mosque-simple/atlas.json
//   public/models/sheikh-zayed-grand-mosque-simple/sheikh-zayed-grand-mosque-simple-0.bin
//
// Usage: node scripts/generate-sheikh-zayed-grand-mosque-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'sheikh-zayed-grand-mosque-simple');
fs.mkdirSync(outDir, { recursive: true });

const S = 2.4 / 420;

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
function dome(r, yBase, x, z, squash = 1.15, seg = 14) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2 | 0), 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, squash, 1);
  g.translate(x, yBase, z);
  return g;
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const ROOF = 24;

// --- Prayer hall block and wings: 3 parts.
addPart('prayer-hall', 'Prayer hall', 'prayer-hall', [box(-70, 70, 0, ROOF, -38, 38)]);
addPart('east-wing', 'East wing', 'prayer-hall', [box(70, 200, 0, 8, -130, 130)]);
addPart('west-wing', 'West wing', 'prayer-hall', [box(-200, -70, 0, 8, -130, 130)]);

// --- Main dome group: 2 parts.
addPart('main-dome', 'Main dome', 'main-dome', [
  cyl(17, 17.5, 32, 0, ROOF + 16, 0, 18),
  dome(16.1, ROOF + 32, 0, 0, 1.15, 20),
  cyl(1.5, 1.5, 14, 0, ROOF + 32 + 16.1 * 1.15 + 4, 0, 8),
]);
addPart('secondary-domes', 'Secondary domes', 'domes', [[-48, 0], [48, 0], [0, -26], [0, 26]].flatMap(([x, z]) => [
  cyl(10.6, 11, 10, x, ROOF + 5, z, 12),
  dome(10, ROOF + 10, x, z, 1.15, 12),
]));

// --- Roof domes in four quadrant groups: 4 parts.
const quads = [[1, 1, 'northeast'], [1, -1, 'southeast'], [-1, 1, 'northwest'], [-1, -1, 'southwest']];
for (const [sx, sz, n] of quads) {
  const geoms = [];
  for (let gx = 1; gx <= 6; gx++) {
    for (let gz = 1; gz <= 4; gz++) {
      const x = sx * gx * 28, z = sz * gz * 30;
      if (Math.abs(x) < 80 || Math.abs(x) > 195 || Math.abs(z) > 130) continue;
      geoms.push(cyl(5, 5.4, 5, x, 10.5, z, 10));
      geoms.push(dome(4.8, 13, x, z, 1.15, 10));
    }
  }
  addPart(`${n}-roof-domes`, `${n[0].toUpperCase() + n.slice(1)} roof domes`, 'domes', geoms);
}

// --- Minarets, one part each: 4 parts.
for (const [x, z, n] of [[-190, -125, 'southwest'], [190, -125, 'southeast'], [-190, 125, 'northwest'], [190, 125, 'northeast']]) {
  const N = n[0].toUpperCase() + n.slice(1);
  addPart(`${n}-minaret`, `${N} minaret`, 'minarets', [
    box(x - 8, x + 8, 0, 22, z - 8, z + 8),
    cyl(4.5, 6, 62, x, 53, z, 8),
    cyl(5.5, 5.5, 3, x, 86, z, 8),
    cyl(3.5, 4.5, 16, x, 95, z, 8),
    cyl(0.5, 0.5, 6, x, 106, z, 6),
  ]);
}

// --- Courtyard, colonnade, pools, entrances: 6 parts.
addPart('courtyard', 'Courtyard', 'courtyard', [box(-200, 200, -0.5, 0, -140, 140)]);
{
  const cols = [];
  for (let x = -195; x <= 195; x += 30) { cols.push(cyl(0.9, 1.1, 12, x, 6, -138, 8), cyl(0.9, 1.1, 12, x, 6, 138, 8)); }
  addPart('colonnade', 'Courtyard colonnade', 'colonnades', cols);
}
addPart('north-pool', 'North reflective pool', 'pools', [box(-120, 120, -1.2, -0.4, 100, 128)]);
addPart('south-pool', 'South reflective pool', 'pools', [box(-120, 120, -1.2, -0.4, -128, -100)]);
addPart('main-portal', 'Main entrance portal', 'entrances', [box(-14, 14, 0, 30, 38, 46)]);
addPart('side-gates', 'Side gates', 'entrances', [
  box(-108, -92, 0, 16, -144, -136), box(92, 108, 0, 16, -144, -136),
]);

function colorFor(id) {
  if (id.includes('dome') || id.includes('minaret')) return '#f4f1ea';
  if (id.includes('wall') || id.includes('wing') || id.includes('portal') || id.includes('gate') || id === 'prayer-hall') return '#efe9dc';
  if (id === 'colonnade') return '#f8f5ee';
  if (id === 'courtyard') return '#e8e2d2';
  if (id.includes('pool')) return '#3d6b7a';
  return '#f4f1ea';
}

const systems = [
  { id: 'main-dome', name: 'Main dome', color: '#f4f1ea', description: 'The 85 m main dome.' },
  { id: 'domes', name: 'Domes', color: '#f4f1ea', description: 'The remaining domes, grouped by quadrant.' },
  { id: 'minarets', name: 'Minarets', color: '#f4f1ea', description: 'The four minarets.' },
  { id: 'prayer-hall', name: 'Prayer hall and wings', color: '#efe9dc', description: 'The prayer hall block and side wings.' },
  { id: 'courtyard', name: 'Courtyard', color: '#e8e2d2', description: 'The marble courtyard.' },
  { id: 'colonnades', name: 'Colonnades', color: '#f8f5ee', description: 'The courtyard colonnade.' },
  { id: 'pools', name: 'Reflective pools', color: '#3d6b7a', description: 'The reflective pools.' },
  { id: 'entrances', name: 'Entrances', color: '#efe9dc', description: 'Portal and gates.' },
];

const explanations = {
  'prayer hall': 'The main prayer hall block. Exact subdivision is schematic.',
  'east wing': 'The east wing. Exact extent is schematic.',
  'west wing': 'The west wing. Exact extent is schematic.',
  'main dome': 'The 85 m main dome in white marble with gilded finial. Exact profile is schematic.',
  'secondary domes': 'The four large secondary domes, merged into one part. Exact sizes are schematic.',
  'northeast roof domes': 'The smaller roof domes of the northeast quadrant, merged; 82 domes in total. Arrangement is schematic.',
  'southeast roof domes': 'The smaller roof domes of the southeast quadrant, merged; 82 domes in total. Arrangement is schematic.',
  'northwest roof domes': 'The smaller roof domes of the northwest quadrant, merged; 82 domes in total. Arrangement is schematic.',
  'southwest roof domes': 'The smaller roof domes of the southwest quadrant, merged; 82 domes in total. Arrangement is schematic.',
  'southwest minaret': 'The southwest minaret, about 104 to 107 m. Exact profile is schematic.',
  'southeast minaret': 'The southeast minaret, about 104 to 107 m. Exact profile is schematic.',
  'northwest minaret': 'The northwest minaret, about 104 to 107 m. Exact profile is schematic.',
  'northeast minaret': 'The northeast minaret, about 104 to 107 m. Exact profile is schematic.',
  'courtyard': 'The marble courtyard. Pattern is schematic.',
  'courtyard colonnade': 'The courtyard colonnade, merged. Spacing is schematic.',
  'north reflective pool': 'The north reflective pool. Shape is schematic.',
  'south reflective pool': 'The south reflective pool. Shape is schematic.',
  'main entrance portal': 'The main entrance portal. Form is schematic.',
  'side gates': 'The side gates, merged. Form is schematic.',
};

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
const binName = 'sheikh-zayed-grand-mosque-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Sheikh Zayed Grand Mosque, Abu Dhabi (simplified schematic)',
  title: 'Sheikh Zayed Grand Mosque',
  location: 'Abu Dhabi, UAE',
  blurb: 'The UAE\u2019s grand mosque in simplified form: the 85 m main dome, quadrant dome groups, four minarets and the marble courtyard.',
  sourceUrls: [
    { label: 'Wikipedia: Sheikh Zayed Grand Mosque', url: 'https://en.wikipedia.org/wiki/Sheikh_Zayed_Grand_Mosque' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/sheikh-zayed-grand-mosque-simple/sheikh-zayed-grand-mosque-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
