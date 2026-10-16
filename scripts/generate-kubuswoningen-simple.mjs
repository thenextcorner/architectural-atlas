// Simplified schematic Kubuswoningen for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-kubuswoningen.mjs, whose header
// lists every sourced dimension reused here), but coarser: 24 named parts
// across 7 systems instead of 162 across 7. Cubes are merged into row
// segments.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-kubuswoningen.mjs for the full attribution):
//   Piet Blom, 1982-1984, 38 cubes + 2 super-cubes, Overblaak Rotterdam,
//   tilted cubes on hexagonal pylons, walls at 54.7 degrees, ~100 sqm
//   over 3 floors, "living as an urban roof", Blaakse Bos forest concept.
// Schematic (not sourced, never stated as fact in the UI): cube edge
// (7.5 m), pylon dimensions, two-row staggered layout, spacing, windows,
// pyramid roofs, super-cube and bridge forms.
//
// Writes:
//   public/models/kubuswoningen-simple/atlas.json
//   public/models/kubuswoningen-simple/kubuswoningen-simple-0.bin
//
// Usage: node scripts/generate-kubuswoningen-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'kubuswoningen-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~210 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 210;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 8) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
const TILT_Q = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(1, 1, 1).normalize(),
  new THREE.Vector3(0, -1, 0),
);
function tiltedCube(edge, cx, cy, cz) {
  const g = new THREE.BoxGeometry(edge, edge, edge);
  g.applyQuaternion(TILT_Q);
  g.translate(cx, cy, cz);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const EDGE = 7.5, PYLON_H = 4;
const DIAG = EDGE * Math.sqrt(3) / 2;
const CY = PYLON_H + DIAG;

// Cube positions (same as detailed).
const ROWS = [];
for (let i = 0; i < 19; i++) {
  ROWS.push({ x: -90 + i * 10, z: -8 });
  ROWS.push({ x: -85 + i * 10, z: 8 });
}

// Six segments: three per row.
for (let s = 0; s < 6; s++) {
  const seg = ROWS.filter((_, i) => Math.floor(i / 7) === s || (s === 5 && i >= 35));
  const pg = [], cg = [], rg = [];
  for (const c of seg) {
    pg.push(cyl(1.8, 2.2, PYLON_H, c.x, PYLON_H / 2, c.z, 6));
    cg.push(tiltedCube(EDGE, c.x, CY, c.z));
    const pyr = new THREE.ConeGeometry(EDGE * 0.55, 2.5, 4);
    pyr.rotateY(Math.PI / 4);
    pyr.translate(c.x, CY + DIAG + 1.0, c.z);
    rg.push(pyr);
  }
  if (!seg.length) continue;
  addPart(`segment-pylons-${s + 1}`, `Segment ${s + 1} pylons`, 'pylons', pg);
  addPart(`segment-cubes-${s + 1}`, `Segment ${s + 1} cubes`, 'cubes', cg);
  addPart(`segment-roofs-${s + 1}`, `Segment ${s + 1} roofs`, 'roofs', rg);
}

// Windows merged.
{
  const wg = [];
  for (const c of ROWS) {
    for (let w = 0; w < 2; w++) {
      const a = (w / 2) * Math.PI * 2;
      const win = new THREE.BoxGeometry(1.6, 1.2, 0.15);
      win.applyQuaternion(TILT_Q);
      win.translate(c.x + Math.cos(a) * EDGE * 0.42, CY + 1.2, c.z + Math.sin(a) * EDGE * 0.42);
      wg.push(win);
    }
  }
  addPart('all-windows', 'All windows', 'windows', wg);
}

// Super-cubes.
for (const [i, sx] of [[1, -108], [2, 108]]) {
  const se = EDGE * 1.6, sdiag = se * Math.sqrt(3) / 2, scy = PYLON_H + 1 + sdiag;
  addPart(`super-cube-${i}`, `Super-cube ${i}`, 'super-cubes', [
    cyl(2.8, 3.4, PYLON_H + 1, sx, (PYLON_H + 1) / 2, 0, 6),
    tiltedCube(se, sx, scy, 0),
  ]);
}

// Bridge + ground.
addPart('bridge-deck', 'Bridge deck', 'bridge', [box(-100, 100, 3.2, 5.0, -6, 6)]);
addPart('ground-shops', 'Ground shops', 'ground', [
  box(-100, -60, 0, 3, -12, 12),
  box(60, 100, 0, 3, -12, 12),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('pylons')) return '#8a8a86';
  if (id.includes('cubes') || id.includes('super-cube')) return '#d8a020';
  if (id.includes('roofs')) return '#6a6a66';
  if (id === 'all-windows') return '#3a6a8a';
  if (id === 'bridge-deck') return '#9a9a96';
  return '#7a7a76';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'pylons', name: 'Hexagonal pylons', color: '#8a8a86', description: 'Concrete trunks the cubes balance on, merged per row segment.' },
  { id: 'cubes', name: 'Tilted cubes', color: '#d8a020', description: 'The 38 houses merged per row segment.' },
  { id: 'roofs', name: 'Pyramid roofs', color: '#6a6a66', description: 'Pyramid top rooms, merged per row segment.' },
  { id: 'windows', name: 'Windows', color: '#3a6a8a', description: 'Glazing in the sloped walls.' },
  { id: 'super-cubes', name: 'Super-cubes', color: '#d8a020', description: 'The two larger hostel cubes.' },
  { id: 'bridge', name: 'Pedestrian bridge', color: '#9a9a96', description: 'The bridge deck the complex forms.' },
  { id: 'ground', name: 'Ground level', color: '#7a7a76', description: 'Shops at street level.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (let s = 1; s <= 6; s++) {
  explanations[`segment ${s} pylons`] = `Hexagonal concrete pylons of row segment ${s}. Exact layout is schematic.`;
  explanations[`segment ${s} cubes`] = `Tilted cubes of row segment ${s}, each a tree in Blom\u2019s forest. Exact layout is schematic.`;
  explanations[`segment ${s} roofs`] = `Pyramid top rooms of row segment ${s}. Exact forms are schematic.`;
}
Object.assign(explanations, {
  'all windows': 'Windows set into the 54.7-degree sloped walls. Exact positions are schematic.',
  'super-cube 1': 'The west super-cube, converted to the Stayokay hostel in 2009. Exact form is schematic.',
  'super-cube 2': 'The east super-cube, converted to the Stayokay hostel in 2009. Exact form is schematic.',
  'bridge deck': 'The pedestrian bridge deck. Exact form is schematic.',
  'ground shops': 'Shops at street level beneath the complex. Exact layout is schematic.',
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
const binName = 'kubuswoningen-simple-0.bin';
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
  scope: 'Kubuswoningen, Rotterdam (simplified schematic)',
  title: 'Kubuswoningen',
  location: 'Rotterdam, Netherlands',
  blurb: 'Piet Blom\u2019s cube houses in simplified schematic form: tilted cubes on pylons in row segments.',
  sourceUrls: [
    { label: 'Wikipedia: Cube house', url: 'https://en.wikipedia.org/wiki/Cube_house' },
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
  chunks: [{ url: '/models/kubuswoningen-simple/kubuswoningen-simple-0.bin', bytes: offset }],
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
