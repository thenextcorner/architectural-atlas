// Simplified schematic Qutb Minar for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-qutb-minar.mjs, whose header lists
// every sourced dimension reused here), but coarser: 25 named parts across
// 7 systems instead of 101 across 8. The five storeys merge their shaft,
// fluting, facing and inscription bands; balconies merge per storey; the
// complex merges to group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-qutb-minar.mjs for the full attribution):
//   72.5 m high, 14.32 m base diameter tapering to 2.75 m; five storeys
//   with projecting balconies; Arabic and Nagari inscription bands;
//   alternating/rounded/angular fluting on the first three storeys;
//   red/buff sandstone below, marble/sandstone above; Iron Pillar 7.02 m;
//   Quwwat-ul-Islam screen, Alai Darwaza, Iltutmish tomb.
// Schematic (not sourced, never stated as fact in the UI): all merged
// group geometry and simplified forms.
//
// Writes:
//   public/models/qutb-minar-simple/atlas.json
//   public/models/qutb-minar-simple/qutb-minar-simple-0.bin
//
// Usage: node scripts/generate-qutb-minar-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'qutb-minar-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (72.5 m) maps to 2.4 units (same as
// detailed).
const S = 2.4 / 72.5;
const H = 72.5;
const R_BASE = 14.32 / 2, R_TOP = 2.75 / 2;
const radiusAt = (y) => R_BASE - ((R_BASE - R_TOP) * y) / H;

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

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const STOREYS = [
  ['First', 2.5, 22],
  ['Second', 22, 38],
  ['Third', 38, 52],
  ['Fourth', 52, 63],
  ['Fifth', 63, 70.5],
];

STOREYS.forEach(([sN, y0, y1], si) => {
  // Merged storey mass: shaft + facing + fluting hint.
  addPart(`storey-${si + 1}-mass`, `${sN} storey mass`, 'storeys', [
    cyl(radiusAt(y1), radiusAt(y0), y1 - y0, 0, (y0 + y1) / 2, 0, 20),
  ]);
  // Merged inscription bands.
  const rMid = radiusAt((y0 + y1) / 2);
  addPart(`storey-${si + 1}-inscriptions`, `${sN} storey inscriptions`, 'inscriptions', [
    cyl(rMid + 0.22, rMid + 0.22, 2.4, 0, y0 + (y1 - y0) * 0.55, 0, 20),
  ]);
  // Merged balcony: deck + brackets + railing.
  const br = radiusAt(y1);
  const brackets = [];
  for (let bi = 0; bi < 12; bi++) {
    const ang = (bi / 12) * Math.PI * 2;
    brackets.push(box(
      Math.cos(ang) * (br + 0.4) - 0.4, Math.cos(ang) * (br + 0.4) + 0.4,
      y1 - 1.6, y1 + 0.2,
      Math.sin(ang) * (br + 0.4) - 0.4, Math.sin(ang) * (br + 0.4) + 0.4,
    ));
  }
  addPart(`storey-${si + 1}-balcony`, `${sN} storey balcony`, 'balconies', [
    cyl(br + 1.9, br + 1.9, 1.1, 0, y1 + 0.55, 0, 20),
    cyl(br + 1.9, br + 1.9, 0.9, 0, y1 + 1.55, 0, 20),
    ...brackets,
  ]);
});

// --- Base merged: 2 parts.
addPart('base-plinth', 'Base plinth', 'base', [
  cyl(R_BASE + 1.2, R_BASE + 2, 2.5, 0, 1.25, 0, 20),
  cyl(R_BASE + 0.5, R_BASE + 0.9, 1.8, 0, 3.4, 0, 20),
]);
addPart('entrance', 'Entrance', 'base', [
  box(-1.4, 1.4, 2.5, 7.5, R_BASE - 1.6, R_BASE + 0.4),
  box(-2.5, 2.5, 0, 2.5, R_BASE + 0.4, R_BASE + 4),
]);

// --- Crown merged: 2 parts.
addPart('crown', 'Crown', 'crown', [
  cyl(R_TOP + 1.4, R_TOP + 1.4, 2.6, 0, 71.8, 0, 16),
  cyl(R_TOP * 0.7, R_TOP + 0.6, 1.2, 0, 71.9, 0, 12),
]);
addPart('cupola-on-lawns', 'Removed cupola on the lawns', 'crown', [
  cyl(1.8, 2.4, 2.2, 28, 1.1, -24, 10),
  new THREE.SphereGeometry(1.9, 10, 8).translate(28, 2.6, -24),
]);

// --- Iron Pillar merged: 1 part.
addPart('iron-pillar', 'Iron Pillar', 'iron-pillar', [
  cyl(0.21, 0.24, 6.09, -18, 3.5, 20, 10),
  cyl(0.35, 0.22, 0.8, -18, 6.8, 20, 10),
  box(-20.5, -15.5, 0, 0.5, 17.5, 22.5),
]);

// --- Complex merged: 2 parts.
{
  const arches = [];
  for (let ai = 0; ai < 5; ai++) {
    const ax = -24 + ai * 12;
    arches.push(box(ax - 4.5, ax + 4.5, 0, 14, 30, 32));
  }
  arches.push(box(-30, 30, 14, 15.2, 30, 32));
  addPart('prayer-hall-screen', 'Prayer-hall screen', 'complex', arches);
}
addPart('complex-buildings', 'Alai Darwaza and tomb', 'complex', [
  new THREE.SphereGeometry(5.5, 12, 8).translate(44, 12, 20),
  box(38, 50, 0, 11.5, 14, 26),
  box(-52, -38, 0, 7, -34, -20),
  box(-47, -43, 1, 2.2, -29, -25),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('inscription')) return '#5a3a26';
  if (id.includes('balcony')) return '#8a4526';
  if (id.includes('base') || id.includes('entrance')) return '#93492a';
  if (id.includes('crown') || id.includes('cupola')) return '#c9bfa8';
  if (id.includes('iron')) return '#4a4a4e';
  if (id.includes('screen') || id.includes('complex')) return '#b08a5e';
  if (id.startsWith('storey-4') || id.startsWith('storey-5')) return '#ddd8c8';
  return '#a5502e';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'storeys', name: 'Tower storeys', color: '#a5502e', description: 'The five tapering storey masses, merged.' },
  { id: 'inscriptions', name: 'Inscription bands', color: '#5a3a26', description: 'Merged Arabic and Nagari inscription bands per storey.' },
  { id: 'balconies', name: 'Balconies', color: '#8a4526', description: 'Merged balconies with brackets and railings.' },
  { id: 'base', name: 'Base and entrance', color: '#93492a', description: 'Merged plinth and entrance.' },
  { id: 'crown', name: 'Crown', color: '#c9bfa8', description: 'Merged crown and the removed cupola on the lawns.' },
  { id: 'iron-pillar', name: 'Iron Pillar', color: '#4a4a4e', description: 'The merged 7.02 m Iron Pillar.' },
  { id: 'complex', name: 'Qutb complex', color: '#b08a5e', description: 'Merged prayer-hall screen, Alai Darwaza and tomb.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
const E = (name, text) => { explanations[name.toLowerCase()] = text; };
const ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
for (let si = 0; si < 5; si++) {
  E(`${ORD[si]} storey mass`, `The merged ${ORD[si].toLowerCase()} storey mass. Storey heights are schematic.`);
  E(`${ORD[si]} storey inscriptions`, `Merged Arabic and Nagari inscription bands of the ${ORD[si].toLowerCase()} storey.`);
  E(`${ORD[si]} storey balcony`, `The merged projecting balcony of the ${ORD[si].toLowerCase()} storey.`);
}
E('Base plinth', 'The merged base plinth.');
E('Entrance', 'The merged entrance door and steps.');
E('Crown', 'The merged crown at the 72.5 m summit.');
E('Removed cupola on the lawns', 'The merged early-19th-century cupola, removed in 1848, now on the lawns.');
E('Iron Pillar', 'The merged 7.02 m wrought-iron pillar, famed for resisting corrosion.');
E('Prayer-hall screen', 'The merged five-arch prayer-hall screen of the Quwwat-ul-Islam mosque.');
E('Alai Darwaza and tomb', 'Merged Alai Darwaza gateway and Iltutmish tomb masses.');

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
const binName = 'qutb-minar-simple-0.bin';
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
  scope: 'Qutb Minar, Delhi (simplified schematic)',
  title: 'Qutb Minar',
  location: 'Delhi, India',
  blurb: 'The 72.5 m Delhi Sultanate victory tower in simplified form: five tapering storey masses with inscription bands and balconies.',
  sourceUrls: [
    { label: 'Wikipedia: Qutb Minar', url: 'https://en.wikipedia.org/wiki/Qutb_Minar' },
    { label: 'Britannica: Qutb Minar', url: 'https://www.britannica.com/topic/qutb-minar' },
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
  chunks: [{ url: '/models/qutb-minar-simple/qutb-minar-simple-0.bin', bytes: offset }],
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
