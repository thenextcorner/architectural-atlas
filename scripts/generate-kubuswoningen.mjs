// Procedural Kubuswoningen (Cube Houses, Rotterdam) for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned cluster of Piet Blom's cube
// houses in code and writes it in the atlas binary format:
//   public/models/kubuswoningen/atlas.json
//   public/models/kubuswoningen/kubuswoningen-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10,
// primarily Wikipedia "Cube house"):
//   designed by Piet Blom, late 1970s; built 1982-1984 (completed 1984);
//   38 small cubes plus 2 so-called super-cubes, all attached; located on
//   Overblaak, above Blaak metro station, Rotterdam; 1977 plan showed 55,
//   not all built; each cube tilted (popularly "45 degrees") on a
//   hexagon-shaped pylon; walls and windows angled at 54.7 degrees;
//   apartment ~100 sqm over 3 floors: living area first floor, bedrooms
//   second, pyramid top room; each cube a tree, the complex a forest
//   ("Blaakse Bos"); concept "living as an urban roof"; inspired by the
//   Ponte Vecchio; Blom built 21 experimental cube houses in Helmond
//   first; complex forms a pedestrian bridge over a busy road; Kijk-Kubus
//   show house museum; 2009 super-cubes converted to Stayokay hostel;
//   2019 Art cube opened; reinforced concrete hexagonal trunk, wooden
//   cube skeleton clad in fiber-cement panels.
// Schematic (not sourced, never stated as fact in the UI): exact cube
// edge (modeled 7.5 m), pylon dimensions, the two-row staggered layout
// (real arrangement is more complex), cube spacing, window positions,
// pyramid roof form, super-cube sizes, bridge and shop forms.
//
// Coordinate frame: x = along the rows, z = across, y = up. All
// dimensions in meters.
//
// Granularity: ~161 named parts across 7 systems.
//
// Usage: node scripts/generate-kubuswoningen.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'kubuswoningen');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (~200 m row) maps to 2.4 units.
const S = 2.4 / 210;

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

// Tilt quaternion: maps the cube's (1,1,1) vertex direction to straight
// down, so the cube balances on one vertex with faces at 54.7 degrees.
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

const EDGE = 7.5;           // cube edge (schematic)
const PYLON_H = 4;          // hexagonal pylon height
const DIAG = EDGE * Math.sqrt(3) / 2; // half space-diagonal
const CY = PYLON_H + DIAG;  // cube centre height

// Two staggered rows of 19 cubes each.
const ROWS = [];
for (let i = 0; i < 19; i++) {
  ROWS.push({ x: -90 + i * 10, z: -8, n: i + 1, row: 'north' });
  ROWS.push({ x: -85 + i * 10, z: 8, n: i + 20, row: 'south' });
}

for (const c of ROWS) {
  const { x, z, n } = c;
  // Hexagonal concrete pylon.
  addPart(`pylon-${n}`, `Pylon ${n}`, 'pylons', [
    cyl(1.8, 2.2, PYLON_H, x, PYLON_H / 2, z, 6),
    box(x - 2.5, x + 2.5, 0, 0.6, z - 2.5, z + 2.5),
  ]);
  // Tilted cube body.
  addPart(`cube-${n}`, `Cube ${n}`, 'cubes', [
    tiltedCube(EDGE, x, CY, z),
  ]);
  // Pyramid roof on the top vertex.
  const topY = CY + DIAG;
  const pyr = new THREE.ConeGeometry(EDGE * 0.55, 2.5, 4);
  pyr.rotateY(Math.PI / 4);
  pyr.translate(x, topY + 1.0, z);
  addPart(`pyramid-roof-${n}`, `Pyramid roof ${n}`, 'roofs', [pyr]);
  // Windows: panels on the sloped faces (merged per cube).
  const wg = [];
  for (let w = 0; w < 4; w++) {
    const a = (w / 4) * Math.PI * 2;
    const wx = x + Math.cos(a) * EDGE * 0.42;
    const wz = z + Math.sin(a) * EDGE * 0.42;
    const win = new THREE.BoxGeometry(1.6, 1.2, 0.15);
    win.applyQuaternion(TILT_Q);
    // Orient roughly outward.
    win.translate(wx, CY + 1.2, wz);
    wg.push(win);
  }
  addPart(`cube-windows-${n}`, `Cube ${n} windows`, 'windows', wg);
}

// Two super-cubes (larger, at the row ends).
for (const [i, sx] of [[1, -108], [2, 108]]) {
  const se = EDGE * 1.6;
  const sdiag = se * Math.sqrt(3) / 2;
  const scy = PYLON_H + 1 + sdiag;
  addPart(`super-pylon-${i}`, `Super-cube pylon ${i}`, 'pylons', [
    cyl(2.8, 3.4, PYLON_H + 1, sx, (PYLON_H + 1) / 2, 0, 6),
  ]);
  addPart(`super-cube-${i}`, `Super-cube ${i}`, 'super-cubes', [
    tiltedCube(se, sx, scy, 0),
  ]);
  const pyr = new THREE.ConeGeometry(se * 0.55, 3.5, 4);
  pyr.rotateY(Math.PI / 4);
  pyr.translate(sx, scy + sdiag + 1.5, 0);
  addPart(`super-roof-${i}`, `Super-cube roof ${i}`, 'roofs', [pyr]);
}

// Pedestrian bridge deck between the rows.
addPart('bridge-deck', 'Pedestrian bridge deck', 'bridge', [
  box(-100, 100, 3.2, 4.0, -6, 6),
]);
addPart('bridge-railings', 'Bridge railings', 'bridge', [
  box(-100, 100, 4.0, 5.0, -6, -5.6),
  box(-100, 100, 4.0, 5.0, 5.6, 6),
]);

// Ground level: shops and entrances.
addPart('ground-shops-west', 'Ground shops (west)', 'ground', [
  box(-100, -60, 0, 3, -12, 12),
]);
addPart('ground-shops-east', 'Ground shops (east)', 'ground', [
  box(60, 100, 0, 3, -12, 12),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('pylon-') || id.startsWith('super-pylon-')) return '#8a8a86';
  if (id.startsWith('cube-') || id.startsWith('super-cube-')) return '#d8a020';
  if (id.includes('pyramid') || id.includes('super-roof')) return '#6a6a66';
  if (id.includes('windows')) return '#3a6a8a';
  if (id.includes('bridge')) return '#9a9a96';
  if (id.includes('ground')) return '#7a7a76';
  return '#d8a020';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'pylons', name: 'Hexagonal pylons', color: '#8a8a86', description: 'Reinforced concrete hexagonal trunks the cubes balance on.' },
  { id: 'cubes', name: 'Tilted cubes', color: '#d8a020', description: 'The 38 houses: cubes tilted so one vertex points down, each a tree in Blom\u2019s forest.' },
  { id: 'roofs', name: 'Pyramid roofs', color: '#6a6a66', description: 'Pyramid top rooms crowning each cube.' },
  { id: 'windows', name: 'Windows', color: '#3a6a8a', description: 'Glazing set into the 54.7-degree sloped walls.' },
  { id: 'super-cubes', name: 'Super-cubes', color: '#d8a020', description: 'The two larger cubes, converted to a hostel in 2009.' },
  { id: 'bridge', name: 'Pedestrian bridge', color: '#9a9a96', description: 'The deck and railings of the bridge the complex forms over the road.' },
  { id: 'ground', name: 'Ground level', color: '#7a7a76', description: 'Shops at street level beneath the forest of houses.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (let n = 1; n <= 38; n++) {
  explanations[`pylon ${n}`] = `The hexagonal concrete pylon cube ${n} balances on. Exact dimensions are schematic.`;
  explanations[`cube ${n}`] = `House ${n}: a cube tilted so one vertex points down into its pylon, walls at 54.7 degrees. Each cube holds about 100 sqm over three floors. Exact position is schematic.`;
  explanations[`pyramid roof ${n}`] = `The pyramid top room of cube ${n}. Exact form is schematic.`;
  explanations[`cube ${n} windows`] = `Windows set into the sloped walls of cube ${n}. Exact positions are schematic.`;
}
Object.assign(explanations, {
  'super-cube pylon 1': 'The pylon of the west super-cube. Exact dimensions are schematic.',
  'super-cube pylon 2': 'The pylon of the east super-cube. Exact dimensions are schematic.',
  'super-cube 1': 'The west super-cube, larger than the houses, converted to the Stayokay hostel in 2009. Exact form is schematic.',
  'super-cube 2': 'The east super-cube, larger than the houses, converted to the Stayokay hostel in 2009. Exact form is schematic.',
  'super-cube roof 1': 'The roof of the west super-cube. Exact form is schematic.',
  'super-cube roof 2': 'The roof of the east super-cube. Exact form is schematic.',
  'pedestrian bridge deck': 'The deck of the pedestrian bridge the complex forms across the road. Exact form is schematic.',
  'bridge railings': 'Railings along the bridge deck. Exact form is schematic.',
  'ground shops (west)': 'Shops at street level beneath the west end of the complex. Exact layout is schematic.',
  'ground shops (east)': 'Shops at street level beneath the east end of the complex. Exact layout is schematic.',
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
const binName = 'kubuswoningen-0.bin';
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
  scope: 'Kubuswoningen, Rotterdam',
  title: 'Kubuswoningen',
  location: 'Rotterdam, Netherlands',
  blurb: 'Piet Blom\u2019s 1984 cube houses: 38 tilted cubes on hexagonal pylons, each a tree in an urban forest above the Blaak.',
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
  chunks: [{ url: '/models/kubuswoningen/kubuswoningen-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
