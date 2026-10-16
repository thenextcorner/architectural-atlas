// Simplified schematic Winter Palace for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-winter-palace.mjs, whose header
// lists every sourced dimension reused here), but coarser: 30 named
// parts across 6 systems instead of 100 across 6. Facade bays are
// merged per side; parapet sculpture is merged per side; interiors are
// a single volume.
//
// Sourced dimensions reused from the detailed model (never re-stated
// here, see generate-winter-palace.mjs for the full attribution):
//   Rastrelli, Elizabethan Baroque, 1754-1762; 215 m facade, 30 m high;
//   green-and-white; Hermitage Museum; three arches to the courtyard.
// Schematic (not sourced, never stated as fact in the UI): merged
// geometry, simplified masses.
//
// Writes:
//   public/models/winter-palace-simple/atlas.json
//   public/models/winter-palace-simple/winter-palace-simple-0.bin
//
// Usage: node scripts/generate-winter-palace-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'winter-palace-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (215 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 215;

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

const L = 215, H = 30, D = 80;
const X0 = -L / 2, X1 = L / 2;
const ZN0 = -D / 2, ZS1 = D / 2;

// --- Facades: 3 bays per long side, pilasters + windows merged per bay.
const bayW = L / 3;
for (const [sid, sname, zFace, dir] of [['neva', 'Neva', ZN0, -1], ['square', 'Palace Square', ZS1, 1]]) {
  for (let b = 0; b < 3; b++) {
    const x0 = X0 + b * bayW, x1 = X0 + (b + 1) * bayW;
    const t = 1.5;
    const z0 = dir > 0 ? zFace - t : zFace;
    const z1 = dir > 0 ? zFace : zFace + t;
    const geoms = [box(x0, x1, 0, H, z0, z1)];
    for (let i = 0; i <= 4; i++) {
      const px = x0 + (i * (x1 - x0)) / 4;
      geoms.push(box(px - 0.8, px + 0.8, 9, 26, dir > 0 ? zFace - 0.6 : zFace - 0.1, dir > 0 ? zFace + 0.1 : zFace + 0.6));
    }
    for (let wi = 0; wi < 8; wi++) {
      const wx = x0 + 6 + (wi * (x1 - x0 - 12)) / 7;
      geoms.push(box(wx - 1.2, wx + 1.2, 11, 19, dir > 0 ? zFace - 0.5 : zFace - 0.2, dir > 0 ? zFace + 0.2 : zFace + 0.5));
    }
    geoms.push(box(x0 - 0.6, x1 + 0.6, 26, 27.5, dir > 0 ? zFace - 1 : zFace - 0.3, dir > 0 ? zFace + 0.3 : zFace + 1));
    addPart(`${sid}-bay-${b + 1}`, `${sname} bay ${b + 1}`, 'facades', geoms);
  }
}
{
  const geoms = [];
  for (const [xFace, dir] of [[X1, 1], [X0, -1]]) {
    const t = 1.5;
    const xa = dir > 0 ? xFace - t : xFace;
    const xb = dir > 0 ? xFace : xFace + t;
    geoms.push(box(xa, xb, 0, H, -D / 2, D / 2));
    for (let i = 0; i <= 6; i++) {
      const pz = -D / 2 + (i * D) / 6;
      geoms.push(box(dir > 0 ? xFace - 0.6 : xFace - 0.1, dir > 0 ? xFace + 0.1 : xFace + 0.6, 9, 26, pz - 0.8, pz + 0.8));
    }
  }
  addPart('side-facades', 'East and west facades', 'facades', geoms);
}

// --- Parapet: statues and vases split per side.
for (const [pid, pname, zFace] of [['neva', 'Neva', ZN0], ['square', 'Palace Square', ZS1]]) {
  const statues = [];
  const vases = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const s = X0 + 8 + (i * (L - 16)) / (n - 1);
    if (i % 2 === 0) statues.push(cyl(0.5, 0.7, 3.5, s, H + 1.75, zFace, 8));
    else vases.push(cyl(0.9, 0.5, 1.8, s, H + 0.9, zFace, 8));
  }
  addPart(`${pid}-statues`, `${pname} parapet statues`, 'parapet', statues);
  addPart(`${pid}-vases`, `${pname} parapet vases`, 'parapet', vases);
}

// --- Roofs split north/south.
addPart('roof-north', 'North roof', 'roof', [box(X0, X1, H, H + 5, ZN0, ZN0 + 12)]);
addPart('roof-south', 'South roof', 'roof', [box(X0, X1, H, H + 5, ZS1 - 12, ZS1)]);
addPart('roof-sides', 'Side roofs', 'roof', [
  box(X1 - 12, X1, H, H + 5, ZN0 + 12, ZS1 - 12),
  box(X0, X0 + 12, H, H + 5, ZN0 + 12, ZS1 - 12),
]);

// --- Courtyard: walls, arches, column, paving.
addPart('courtyard-walls', 'Courtyard walls', 'courtyard', [
  box(-50, 50, 0, 22, -21, -20),
  box(-50, 50, 0, 22, 20, 21),
  box(50, 51, 0, 22, -20, 20),
  box(-51, -50, 0, 22, -20, 20),
]);
addPart('courtyard-paving', 'Courtyard paving', 'courtyard', [
  box(-50, 50, -0.4, 0, -20, 20),
]);
{
  const arches = [];
  for (let a = 0; a < 3; a++) {
    const ax = -20 + a * 20;
    arches.push(box(ax - 4, ax + 4, 0, 9, ZS1 - 12, ZS1));
  }
  addPart('south-arches', 'Palace Square arches', 'courtyard', arches);
}
addPart('alexander-column', 'Alexander Column', 'courtyard', [
  cyl(1.8, 2.2, 25, 0, 12.5, ZS1 + 45, 10),
  box(-4, 4, 0, 3, ZS1 + 41, ZS1 + 49),
]);

// --- Interiors: Jordan + state rooms.
addPart('jordan-staircase', 'Jordan Staircase', 'interiors', [
  box(20, 50, 0, 18, -10, 10),
]);
addPart('state-rooms', 'State rooms', 'interiors', [
  box(-60, 10, 9, 20, ZN0 + 12, ZS1 - 12),
  box(55, 100, 9, 20, ZN0 + 12, ZS1 - 12),
]);

// --- Portals split.
addPart('neva-portal', 'Neva entrance portal', 'facades', [box(-8, 8, 0, 12, ZN0 - 2, ZN0 + 1)]);
addPart('square-portal', 'Palace Square entrance portal', 'facades', [box(-8, 8, 0, 12, ZS1 - 1, ZS1 + 2)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('parapet')) return '#8f8f8f';
  if (id.includes('facade') || id.includes('portal')) return '#a8c0a0';
  if (id.includes('roof')) return '#5a6b5a';
  if (id.includes('courtyard') || id.includes('arch') || id.includes('alexander')) return '#b8b09a';
  if (id.includes('interior')) return '#e8dcc0';
  return '#a8c0a0';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'facades', name: 'Facades', color: '#a8c0a0', description: 'The green-and-white facades.' },
  { id: 'parapet', name: 'Parapet sculpture', color: '#8f8f8f', description: 'Statues and vases on the parapets.' },
  { id: 'roof', name: 'Roofs', color: '#5a6b5a', description: 'Roofs.' },
  { id: 'courtyard', name: 'Courtyard', color: '#b8b09a', description: 'The inner courtyard and Palace Square.' },
  { id: 'interiors', name: 'State interiors', color: '#e8dcc0', description: 'State rooms.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (const [sid, sname] of [['neva', 'Neva'], ['square', 'Palace Square']]) {
  for (let b = 1; b <= 3; b++) explanations[`${sname.toLowerCase()} bay ${b}`] = `${sname} facade bay ${b}. Exact detail is schematic.`;
  explanations[`${sname.toLowerCase()} parapet statues`] = `Statues on the ${sname.toLowerCase()} parapet. Exact subjects are schematic.`;
  explanations[`${sname.toLowerCase()} parapet vases`] = `Vases on the ${sname.toLowerCase()} parapet. Exact forms are schematic.`;
  void sid;
}
Object.assign(explanations, {
  'east and west facades': 'The side facades. Exact detail is schematic.',
  'north roof': 'Roof over the north wing. Exact profile is schematic.',
  'south roof': 'Roof over the south wing. Exact profile is schematic.',
  'side roofs': 'Roofs over the side wings. Exact profiles are schematic.',
  'courtyard walls': 'Walls of the inner courtyard. Exact detail is schematic.',
  'courtyard paving': 'Paving of the courtyard. Exact pattern is schematic.',
  'palace square arches': 'The three arches into the courtyard. Exact form is schematic.',
  'alexander column': 'The Alexander Column on Palace Square. Exact form is schematic.',
  'jordan staircase': 'The great state staircase. Exact form is schematic.',
  'state rooms': 'The state rooms. Exact interiors are schematic.',
  'neva entrance portal': 'The Neva entrance portal. Exact design is schematic.',
  'palace square entrance portal': 'The Palace Square entrance portal. Exact design is schematic.',
});

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
const binName = 'winter-palace-simple-0.bin';
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
  scope: 'Winter Palace, St. Petersburg (simplified schematic)',
  title: 'Winter Palace',
  location: 'St. Petersburg, Russia',
  blurb: 'Rastrelli\u2019s palace in simplified form: the 215 m green-and-white facade, parapet sculpture, courtyard and state interiors.',
  sourceUrls: [
    { label: 'Wikipedia: Winter Palace', url: 'https://en.wikipedia.org/wiki/Winter_Palace' },
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
  chunks: [{ url: '/models/winter-palace-simple/winter-palace-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
