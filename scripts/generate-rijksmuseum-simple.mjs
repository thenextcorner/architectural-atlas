// Simplified schematic Rijksmuseum for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-rijksmuseum.mjs, whose header lists
// every sourced dimension reused here), but coarser: 30 named parts across
// 7 systems instead of 102 across 9. Facade bays, towers, gables and
// decoration are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-rijksmuseum.mjs for the full attribution):
//   Pierre Cuypers, commission 1876, opened 1885, Gothic-Renaissance mix,
//   two squares with central atriums, central passage tunnel, Gallery of
//   Honour, library, Philips wing, Asian pavilion (2013), red brick,
//   80 galleries after the 2003-2013 Cruz y Ortiz renovation.
// Schematic (not sourced, never stated as fact in the UI): exact footprint
// (150 m), tower heights, bay/window/gable counts and forms, passage and
// atrium layouts.
//
// Writes:
//   public/models/rijksmuseum-simple/atlas.json
//   public/models/rijksmuseum-simple/rijksmuseum-simple-0.bin
//
// Usage: node scripts/generate-rijksmuseum-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'rijksmuseum-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~150 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 150;

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
function gable(x0, x1, y0, yApex, z0, z1) {
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

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const L = 75, D = 12, EAVE = 22;

// --- Facades: 6 parts.
{
  const sg = [];
  for (let b = 0; b < 9; b++) {
    const x0 = -L + b * (2 * L / 9), x1 = -L + (b + 1) * (2 * L / 9);
    sg.push(box(x0, x1, 0, EAVE, D - 1.2, D));
  }
  addPart('south-facade', 'South facade', 'facades', sg);
  const ng = [];
  for (let b = 0; b < 9; b++) {
    const x0 = -L + b * (2 * L / 9), x1 = -L + (b + 1) * (2 * L / 9);
    ng.push(box(x0, x1, 0, EAVE, -D, -D + 1.2));
  }
  addPart('north-facade', 'North facade', 'facades', ng);
  addPart('east-end', 'East end', 'facades', [box(L - 1.2, L, 0, EAVE, -D, D)]);
  addPart('west-end', 'West end', 'facades', [box(-L, -L + 1.2, 0, EAVE, -D, D)]);
  addPart('facade-windows', 'Facade windows', 'facades', (() => {
    const w = [];
    for (let b = 0; b < 9; b++) {
      const x0 = -L + b * (2 * L / 9);
      for (let k = 0; k < 3; k++) {
        const wx = x0 + (k + 0.5) * (2 * L / 9) / 3;
        w.push(box(wx - 0.9, wx + 0.9, 7, 10.2, D - 0.3, D + 0.15));
        w.push(box(wx - 0.9, wx + 0.9, 14, 17.2, D - 0.3, D + 0.15));
      }
    }
    return w;
  })());
  addPart('stone-bands', 'Stone bands', 'facades', [
    box(-L - 0.2, L + 0.2, 5.5, 6.2, -D - 0.2, D + 0.2),
    box(-L - 0.2, L + 0.2, 18.5, 19.2, -D - 0.2, D + 0.2),
  ]);
}

// --- Passage: 2 parts.
addPart('passage', 'Passage', 'passage', [
  box(-6, 6, 0, 9, -D, D),
  box(-7.5, -6, 0, 10, D - 0.5, D + 0.8),
  box(6, 7.5, 0, 10, D - 0.5, D + 0.8),
  box(-7.5, -6, 0, 10, -D - 0.8, -D + 0.5),
  box(6, 7.5, 0, 10, -D - 0.8, -D + 0.5),
]);
addPart('passage-floor', 'Passage floor', 'passage', [box(-6, 6, 0, 0.4, -D, D)]);

// --- Towers: 5 parts.
addPart('central-tower', 'Central tower', 'towers', [
  box(-6, 6, EAVE, 38, -6, 6),
  box(-5, 5, 38, 44, -5, 5),
  cyl(0.2, 5.5, 10, 0, 49, 0, 8),
]);
{
  const ct = [];
  for (const [cx, cz] of [[-L + 6, D - 6], [L - 6, D - 6], [-L + 6, -D + 6], [L - 6, -D + 6]]) {
    ct.push(box(cx - 4, cx + 4, 0, 30, cz - 4, cz + 4));
    ct.push(box(cx - 3.5, cx + 3.5, 30, 35, cz - 3.5, cz + 3.5));
    ct.push(cyl(0.15, 4, 7, cx, 38.5, cz, 8));
  }
  addPart('corner-towers', 'Corner towers', 'towers', ct);
}
addPart('tower-clocks', 'Tower clocks', 'towers', [
  (() => { const d = new THREE.CylinderGeometry(1.8, 1.8, 0.4, 12); d.rotateX(Math.PI / 2); d.translate(0, 41, 5.2); return d; })(),
]);

// --- Roofs: 5 parts.
addPart('roof', 'Roof', 'roofs', [
  box(-L, L, EAVE, EAVE + 0.8, -D, D),
  box(-L, L, EAVE + 0.8, EAVE + 5, -D * 0.7, D * 0.7),
]);
{
  const gs = [];
  for (const gx of [-60, -36, -12, 12, 36, 60]) gs.push(gable(gx - 5, gx + 5, EAVE, EAVE + 7, D - 1.5, D + 0.5));
  addPart('gables', 'Decorative gables', 'roofs', gs);
}
{
  const dm = [];
  for (let i = 0; i < 6; i++) {
    const dx = -50 + i * 20;
    dm.push(box(dx - 2, dx + 2, EAVE + 1, EAVE + 4, -1.5, 1.5));
  }
  addPart('dormers', 'Dormers', 'roofs', dm);
}
{
  const ch = [];
  for (let i = 0; i < 4; i++) ch.push(box(-55 + i * 35 - 0.8, -55 + i * 35 + 0.8, EAVE + 2, EAVE + 7, -3, -1.4));
  addPart('chimneys', 'Chimneys', 'roofs', ch);
}

// --- Atriums + interiors: 4 parts.
addPart('atrium-courts', 'Atrium courts', 'atriums', [
  box(-52.5, -22.5, 0, 0.5, -8, 8),
  box(22.5, 52.5, 0, 0.5, -8, 8),
]);
addPart('atrium-colonnades', 'Atrium colonnades', 'atriums', (() => {
  const c = [];
  for (const ax of [-37.5, 37.5]) for (let k = 0; k < 6; k++) {
    c.push(cyl(0.4, 0.45, 12, ax - 12 + k * 4.8, 6, -7, 8));
    c.push(cyl(0.4, 0.45, 12, ax - 12 + k * 4.8, 6, 7, 8));
  }
  return c;
})());
addPart('gallery-of-honour', 'Gallery of Honour', 'interiors', [box(-L + 5, L - 5, 10, 11, -2, 2)]);
addPart('library', 'Library', 'interiors', [
  box(-L - 2, -L + 18, 0, 16, -D - 14, -D - 1),
  box(-L + 6, -L + 12, 16, 28, -D - 10, -D - 4),
]);

// --- Decoration + wings: 4 parts.
addPart('facade-decoration', 'Facade decoration', 'decoration', (() => {
  const d = [];
  for (let i = 0; i < 4; i++) {
    const sx = -45 + i * 30;
    d.push(cyl(0.5, 0.7, 2.5, sx, 20, D + 0.6, 8));
    d.push(box(sx - 4, sx + 4, 8, 13, D - 0.15, D + 0.2));
  }
  return d;
})());
addPart('stained-glass', 'Stained glass', 'decoration', (() => {
  const w = [];
  for (let i = 0; i < 6; i++) w.push(box(-50 + i * 20 - 1.2, -50 + i * 20 + 1.2, 12, 18, -D - 0.15, -D + 0.2));
  return w;
})());
addPart('philips-wing', 'Philips wing', 'wings', [box(20, 60, 0, 10, -D - 16, -D - 2)]);
addPart('asian-pavilion-and-garden', 'Asian pavilion and garden', 'wings', [
  box(30, 50, 0, 6, D + 8, D + 20),
  box(-L, L, 0, 0.3, D + 2, D + 30),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'stained-glass') return '#3a6a8a';
  if (id.includes('tower')) return '#a8442a';
  if (id === 'roof' || id === 'chimneys') return '#5a4a3a';
  if (id === 'gables' || id === 'dormers') return '#8a3a24';
  if (id === 'passage' || id === 'passage-floor') return '#6a5a4a';
  if (id.includes('atrium')) return '#b8a888';
  if (id.includes('gallery') || id === 'library') return '#9a8a72';
  if (id === 'asian-pavilion-and-garden') return '#6a7a5a';
  if (id === 'stone-bands') return '#c9bfa5';
  return '#a8442a';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'facades', name: 'Facades', color: '#a8442a', description: 'Red brick facades with stone bands and windows.' },
  { id: 'passage', name: 'Central passage', color: '#6a5a4a', description: 'The public tunnel through the building.' },
  { id: 'towers', name: 'Towers', color: '#a8442a', description: 'Central tower, corner towers and clocks.' },
  { id: 'roofs', name: 'Roofs', color: '#5a4a3a', description: 'Roof, gables, dormers and chimneys.' },
  { id: 'atriums', name: 'Atriums', color: '#b8a888', description: 'The two interior courtyards.' },
  { id: 'interiors', name: 'Interiors', color: '#9a8a72', description: 'Gallery of Honour and library.' },
  { id: 'decoration', name: 'Decoration', color: '#8f8578', description: 'Sculptures, tile pictures and stained glass.' },
  { id: 'wings', name: 'Wings', color: '#7a8a7a', description: 'Philips wing, Asian pavilion and garden.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'south facade': 'The south (Museumplein) facade in red brick. Bay divisions are schematic.',
  'north facade': 'The north facade. Bay divisions are schematic.',
  'east end': 'The east end of the building. Exact form is schematic.',
  'west end': 'The west end of the building. Exact form is schematic.',
  'facade windows': 'Rows of windows in the facades. Exact window counts are schematic.',
  'stone bands': 'Stone bands around the building. Exact positions are schematic.',
  'passage': 'The vaulted public passage through the central axis. Exact dimensions are schematic.',
  'passage floor': 'The passage floor, used by cyclists and pedestrians. Exact finish is schematic.',
  'central tower': 'The ornate central tower with belfry and spire. Exact height is schematic.',
  'corner towers': 'The four corner towers. Exact heights are schematic.',
  'tower clocks': 'Clock dials on the towers. Exact design is schematic.',
  'roof': 'The main roof. Exact form is schematic.',
  'decorative gables': 'Decorative gables on the south front. Exact forms are schematic.',
  'dormers': 'Dormers in the roof. Exact forms are schematic.',
  'chimneys': 'Chimneys. Exact forms are schematic.',
  'atrium courts': 'The two interior courtyards. Exact layouts are schematic.',
  'atrium colonnades': 'Colonnades around the atriums. Exact forms are schematic.',
  'gallery of honour': 'The Gallery of Honour on the first floor, the museum\u2019s ceremonial spine. Exact layout is schematic.',
  'library': 'The library wing with its tower. Exact form is schematic.',
  'facade decoration': 'Sculptures and tile pictures in Cuypers\u2019 decorative programme. Exact figures are schematic.',
  'stained glass': 'Stained glass windows. Exact designs are schematic.',
  'philips wing': 'The Philips wing, the fragment building. Exact form is schematic.',
  'asian pavilion and garden': 'The Asian pavilion (2013) and museum garden. Exact forms are schematic.',
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
const binName = 'rijksmuseum-simple-0.bin';
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
  scope: 'Rijksmuseum, Amsterdam (simplified schematic)',
  title: 'Rijksmuseum',
  location: 'Amsterdam, Netherlands',
  blurb: 'Pierre Cuypers\u2019s 1885 national museum in simplified schematic form: red brick facades, central passage, towers and the Gallery of Honour.',
  sourceUrls: [
    { label: 'Wikipedia: Rijksmuseum', url: 'https://en.wikipedia.org/wiki/Rijksmuseum' },
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
  chunks: [{ url: '/models/rijksmuseum-simple/rijksmuseum-simple-0.bin', bytes: offset }],
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
