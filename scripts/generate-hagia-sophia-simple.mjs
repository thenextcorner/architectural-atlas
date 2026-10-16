// Simplified schematic Hagia Sophia for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-hagia-sophia.mjs, whose header lists
// every sourced dimension reused here), but coarser: 30 named parts across
// 7 systems instead of 102 across 11. Dome segments, columns, minaret
// details and buttresses are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-hagia-sophia.mjs for the full attribution):
//   82 m long, 73 m wide, dome 31 m diameter rising 55.6 m, 40 windows,
//   pendentives, semi-domes, 107 columns, four Ottoman minarets.
// Schematic (not sourced, never stated as fact in the UI): merged group
// geometry; simplified dome, piers, arcades and minarets.
//
// Writes:
//   public/models/hagia-sophia-simple/atlas.json
//   public/models/hagia-sophia-simple/hagia-sophia-simple-0.bin
//
// Usage: node scripts/generate-hagia-sophia-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'hagia-sophia-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (82 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 82;

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
const BAY = 31, HB = BAY / 2, DOME_R = 15.5, SPRING_Y = 40, CROWN_Y = 55.6, L = 82, W = 73;

// Dome (3 parts)
{
  const g = new THREE.SphereGeometry(DOME_R, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, (CROWN_Y - SPRING_Y) / DOME_R, 1);
  g.translate(0, SPRING_Y, 0);
  addPart('dome-shell', 'Dome shell', 'dome', [g]);
  const wins = [];
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    wins.push(box(Math.cos(a) * DOME_R - 0.5, Math.cos(a) * DOME_R + 0.5,
      SPRING_Y + 0.3, SPRING_Y + 2.6, Math.sin(a) * DOME_R - 0.5, Math.sin(a) * DOME_R + 0.5));
  }
  addPart('dome-window-ring', 'Dome window ring', 'dome', wins);
  addPart('pendentives', 'Pendentives', 'dome', [
    box(-HB - 2, -HB + 4, SPRING_Y - 8, SPRING_Y, -HB - 2, -HB + 4),
    box(HB - 4, HB + 2, SPRING_Y - 8, SPRING_Y, -HB - 2, -HB + 4),
    box(-HB - 2, -HB + 4, SPRING_Y - 8, SPRING_Y, HB - 4, HB + 2),
    box(HB - 4, HB + 2, SPRING_Y - 8, SPRING_Y, HB - 4, HB + 2),
  ]);
}

// Semi-domes (2 parts)
for (const [sz, nm] of [[1, 'East'], [-1, 'West']]) {
  const zc = sz * (HB + 11);
  const g = new THREE.SphereGeometry(14.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, 0.75, 1);
  g.translate(0, SPRING_Y - 4, zc);
  addPart(`${nm.toLowerCase()}-semidome`, `${nm} semi-dome`, 'semi-domes', [g]);
}

// Nave (4 parts)
{
  const piers = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    piers.push(box(sx * HB - 3.5, sx * HB + 3.5, 0, SPRING_Y, sz * HB - 3.5, sz * HB + 3.5));
  addPart('great-piers', 'Great piers', 'nave', piers);
  const cols = [];
  for (const sz of [-1, 1]) for (let k = 0; k < 6; k++) {
    const x = -HB + 6 + k * ((2 * HB - 12) / 5);
    cols.push(cyl(0.9, 1.0, 12, x, 6, sz * (HB - 4), 8));
  }
  addPart('nave-colonnades', 'Nave colonnades', 'nave', cols);
  addPart('nave-walls', 'Nave walls', 'nave', [box(-HB, HB, 12, SPRING_Y - 2, -HB, HB)]);
  addPart('great-arches', 'Great arches', 'nave', [
    box(-HB, HB, SPRING_Y - 8, SPRING_Y - 1, -HB - 1.2, -HB + 1.2),
    box(-HB, HB, SPRING_Y - 8, SPRING_Y - 1, HB - 1.2, HB + 1.2),
  ]);
}

// Aisles (3 parts)
for (const [sz, nm] of [[1, 'South'], [-1, 'North']]) {
  const sl = nm.toLowerCase();
  const zc = sz * (W / 2 - 4);
  addPart(`${sl}-aisle`, `${nm} aisle`, 'aisles', [
    box(-L / 2, L / 2, 0, 22, zc - 5, zc + 5),
    box(-L / 2, L / 2, 22, 23.5, zc - 8, zc),
  ]);
}
addPart('aisle-columns', 'Aisle columns', 'aisles', (() => {
  const cols = [];
  for (const sz of [-1, 1]) for (let k = 0; k < 3; k++)
    cols.push(cyl(0.7, 0.8, 10, -L / 4 + k * (L / 4), 5, sz * (W / 2 - 10), 8));
  return cols;
})());

// Narthex + galleries + apse (6 parts)
addPart('narthex', 'Narthex', 'narthex', [box(-W / 2, W / 2, 0, 15, -L / 2, -L / 2 + 12)]);
addPart('narthex-doors', 'Narthex doors', 'narthex', [
  box(-13.5, -10.5, 0, 6, -L / 2 + 11.8, -L / 2 + 12.2),
  box(-1.5, 1.5, 0, 6, -L / 2 + 11.8, -L / 2 + 12.2),
  box(10.5, 13.5, 0, 6, -L / 2 + 11.8, -L / 2 + 12.2),
]);
{
  const gf = [];
  for (const sz of [-1, 1]) gf.push(box(-L / 2 + 6, L / 2 - 6, 18, 19, sz * (W / 2 - 15), sz * (W / 2 - 5)));
  addPart('galleries', 'Galleries', 'narthex', gf);
}
addPart('apse', 'Apse', 'narthex', [
  new THREE.SphereGeometry(10, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 26, L / 2 - 2),
  cyl(10, 10, 26, 0, 13, L / 2 - 2, 12),
]);
addPart('mihrab-minbar', 'Mihrab and minbar', 'narthex', [
  box(-1.5, 1.5, 2, 6, L / 2 + 6.5, L / 2 + 7.5),
  box(3, 5, 0, 8, L / 2 + 2, L / 2 + 4),
]);

// Minarets (4 parts)
{
  const mins = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx * (W / 2 + 6), z = sz * (L / 2 - 2);
    mins.push(box(x - 2.5, x + 2.5, 0, 10, z - 2.5, z + 2.5));
    mins.push(cyl(1.4, 1.8, 45, x, 32, z, 8));
    mins.push(cyl(2.4, 2.4, 1.2, x, 47, z, 8));
    mins.push(cyl(0.1, 1.6, 8, x, 60, z, 8));
  }
  addPart('minarets', 'Four minarets', 'minarets', mins);
}

// Buttresses + roofs (4 parts)
{
  const b = [];
  for (const sz of [-1, 1]) for (let k = 0; k < 4; k++) {
    const x = -L / 2 + 10 + k * ((L - 20) / 3);
    b.push(box(x - 2, x + 2, 0, 30, sz * (W / 2 - 1), sz * (W / 2 + 2)));
  }
  addPart('buttresses', 'Buttresses', 'structure', b);
}
addPart('aisle-roofs', 'Aisle roofs', 'structure', [
  box(-L / 2, L / 2, 22, 23.5, W / 2 - 8, W / 2),
  box(-L / 2, L / 2, 22, 23.5, -W / 2, -W / 2 + 8),
]);
addPart('outer-walls', 'Outer walls', 'structure', [
  box(-L / 2, L / 2, 0, 22, W / 2 - 1.5, W / 2 + 1.5),
  box(-L / 2, L / 2, 0, 22, -W / 2 - 1.5, -W / 2 + 1.5),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('dome') || id === 'pendentives') return '#a89a80';
  if (id.includes('semidome')) return '#b5a888';
  if (id.includes('pier') || id.includes('nave')) return '#b0a48e';
  if (id.includes('aisle')) return '#a89a80';
  if (id.includes('narthex') || id === 'galleries' || id === 'apse' || id === 'mihrab') return '#a89a80';
  if (id === 'minarets') return '#b0a89a';
  if (id === 'buttresses' || id === 'outer-walls') return '#9a938a';
  if (id.includes('roof')) return '#8a7a68';
  return '#b0a48e';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'dome', name: 'Central dome', color: '#a89a80', description: 'The 31 m dome with its window ring and pendentives.' },
  { id: 'semi-domes', name: 'Semi-domes', color: '#b5a888', description: 'Eastern and western semi-domes.' },
  { id: 'nave', name: 'Nave', color: '#b0a48e', description: 'Great piers, colonnades and arches.' },
  { id: 'aisles', name: 'Aisles', color: '#a89a80', description: 'Side aisles with columns and roofs.' },
  { id: 'narthex', name: 'Narthex and apse', color: '#a89a80', description: 'Entrance narthex, galleries and eastern apse.' },
  { id: 'minarets', name: 'Minarets', color: '#b0a89a', description: 'The four Ottoman minarets.' },
  { id: 'structure', name: 'Walls and buttresses', color: '#9a938a', description: 'Outer walls and buttresses.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'dome shell': 'The 31 m central dome, its crown 55.6 m above the floor. Exact profile is schematic.',
  'dome window ring': 'The ring of 40 windows at the dome base. Exact forms are schematic.',
  'pendentives': 'The pendentives transitioning from the square bay to the circular dome. Exact curvature is schematic.',
  'east semi-dome': 'The great eastern semi-dome bracing the dome. Exact profile is schematic.',
  'west semi-dome': 'The great western semi-dome bracing the dome. Exact profile is schematic.',
  'great piers': 'The four great piers carrying the dome. Exact size is schematic.',
  'nave colonnades': 'The nave colonnades, part of the 107 columns. Exact positions are schematic.',
  'nave walls': 'Walls of the central nave. Exact form is schematic.',
  'great arches': 'The great arches spanning between the piers. Exact form is schematic.',
  'south aisle': 'The south side aisle with its vault and roof. Exact form is schematic.',
  'north aisle': 'The north side aisle with its vault and roof. Exact form is schematic.',
  'aisle columns': 'Columns of the side aisles. Exact positions are schematic.',
  'narthex': 'The entrance narthex at the west end. Exact form is schematic.',
  'narthex doors': 'Three of the nine main entrance doors. Exact form is schematic.',
  'galleries': 'The upper galleries. Exact form is schematic.',
  'apse': 'The eastern apse with its semi-dome. Exact form is schematic.',
  'mihrab and minbar': 'The mihrab and minbar from the Ottoman era. Exact forms are schematic.',
  'four minarets': 'The four slender Ottoman minarets framing the building. Exact heights are schematic.',
  'buttresses': 'Exterior buttresses bracing the walls. Exact form is schematic.',
  'aisle roofs': 'Roofs over the side aisles. Exact form is schematic.',
  'outer walls': 'The outer walls of the aisles. Exact form is schematic.',
};

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
const binName = 'hagia-sophia-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Hagia Sophia, Istanbul (simplified schematic)',
  title: 'Hagia Sophia',
  location: 'Istanbul, Turkey',
  blurb: 'The 6th-century Church of Holy Wisdom in simplified form: 31 m dome on pendentives, semi-domes, and four Ottoman minarets.',
  sourceUrls: [{ label: 'Wikipedia: Hagia Sophia', url: 'https://en.wikipedia.org/wiki/Hagia_Sophia' }],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/hagia-sophia-simple/hagia-sophia-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
