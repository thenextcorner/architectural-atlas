// Simplified schematic Domtoren for the Architectural Atlas.
//
// The "simple" variant of the Dom Tower of Utrecht: same footprint,
// massing and proportions as the detailed model (see
// scripts/generate-domtoren.mjs, whose header lists every sourced
// dimension reused here), but coarser: 33 named parts across 6 systems
// instead of 112 across 6. Individual bells, windows, piers and openings
// are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-domtoren.mjs for the full attribution):
//   112.32 m high, built 1321 to 1382 to John of Hainaut's design, tallest
//   church tower in the Netherlands, two square blocks topped by a lighter
//   lantern, no visible buttresses, nave collapsed 1674, bishop's chapel on
//   the first floor, tower guard on the second floor of the lower block,
//   50-bell carillon, 465 steps.
// Schematic (not sourced, never stated as fact in the UI): exact footprint
// (19 m square), block and lantern heights, all window/door positions,
// bell sizes and positions (24 representative bells for the 50-bell
// carillon), clock design, lantern and crown forms.
//
// Writes:
//   public/models/domtoren-simple/atlas.json
//   public/models/domtoren-simple/domtoren-simple-0.bin
//
// Usage: node scripts/generate-domtoren-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'domtoren-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (112.3 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 112.3;

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
function bell(r, x, y, z) {
  const gs = [];
  const body = new THREE.CylinderGeometry(r * 0.35, r * 0.85, r * 1.4, 10);
  body.translate(x, y, z);
  gs.push(body);
  const lip = new THREE.TorusGeometry(r * 0.85, r * 0.18, 6, 12);
  lip.rotateX(Math.PI / 2);
  lip.translate(x, y - r * 0.7, z);
  gs.push(lip);
  return gs;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const HW = 9.5, BHW = 8.5;

// --- Base: 3 parts.
addPart('entrance-block', 'Entrance block', 'base', [
  box(-4, 4, 0, 1.5, 9.5, 12.5),
  box(-3.2, 3.2, 1.5, 9, 9.5, 10.5),
  box(-2.2, 2.2, 1.5, 8.5, 9.6, 10.0),
]);
addPart('plinth', 'Plinth', 'base', [box(-10, 10, 0, 4, -10, 10)]);
addPart('portal-columns', 'Portal columns', 'base', [
  cyl(0.35, 0.4, 7, -3.8, 5, 10.2, 8),
  cyl(0.35, 0.4, 7, 3.8, 5, 10.2, 8),
]);

// --- Lower shaft: 10 parts.
for (const [wn, wgeoms] of [
  ['south', [box(-HW, HW, 4, 62, HW - 1, HW)]],
  ['north', [box(-HW, HW, 4, 62, -HW, -HW + 1)]],
  ['east', [box(HW - 1, HW, 4, 62, -HW + 1, HW - 1)]],
  ['west', [box(-HW, -HW + 1, 4, 62, -HW + 1, HW - 1)]],
]) {
  addPart(`${wn}-wall`, `${wn[0].toUpperCase()}${wn.slice(1)} wall`, 'lower-shaft', wgeoms);
}
{
  const les = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    les.push(box(sx * HW - 0.9, sx * HW + 0.9, 4, 62, sz * HW - 0.15, sz * HW + 0.15));
    les.push(box(sx * HW - 0.15, sx * HW + 0.15, 4, 62, sz * HW - 0.9, sz * HW + 0.9));
  }
  addPart('corner-lesenes', 'Corner lesenes', 'lower-shaft', les);
}
addPart('chapel-windows', 'Chapel windows', 'lower-shaft', [
  box(-4.5, -3.0, 10, 16, HW - 0.2, HW + 0.15),
  box(3.0, 4.5, 10, 16, HW - 0.2, HW + 0.15),
]);
addPart('guard-windows', 'Guard windows', 'lower-shaft', [
  box(-6.6, -5.4, 22, 26, HW - 0.2, HW + 0.15),
  box(-2.6, -1.4, 22, 26, HW - 0.2, HW + 0.15),
  box(1.4, 2.6, 22, 26, HW - 0.2, HW + 0.15),
  box(5.4, 6.6, 22, 26, HW - 0.2, HW + 0.15),
]);
{
  const slits = [];
  for (const [x, y] of [[0, 34], [0, 44], [0, 54], [-0, 38]]) slits.push(box(x - 0.4, x + 0.4, y, y + 3, HW - 0.2, HW + 0.15));
  for (const [z, y] of [[0, 42], [0, 50]]) {
    slits.push(box(HW - 0.2, HW + 0.15, y, y + 3, z - 0.4, z + 0.4));
    slits.push(box(-HW - 0.15, -HW + 0.2, y, y + 3, z - 0.4, z + 0.4));
  }
  addPart('slit-windows', 'Slit windows', 'lower-shaft', slits);
}
addPart('string-course-lower', 'Lower string course', 'lower-shaft', [
  box(-HW - 0.3, HW + 0.3, 30, 31, -HW - 0.3, HW + 0.3),
]);
addPart('string-course-upper', 'Upper string course', 'lower-shaft', [
  box(-HW - 0.3, HW + 0.3, 55, 56, -HW - 0.3, HW + 0.3),
]);

// --- Cornice: 2 parts.
addPart('main-cornice', 'Main cornice', 'cornice', [
  box(-HW - 1, HW + 1, 62, 65, -HW - 1, HW + 1),
]);
addPart('cornice-moulding', 'Cornice moulding', 'cornice', [
  box(-HW - 0.5, HW + 0.5, 65, 66, -HW - 0.5, HW + 0.5),
]);

// --- Belfry: 13 parts.
for (const [wn, wgeoms] of [
  ['south', [box(-BHW, BHW, 66, 96, BHW - 1, BHW)]],
  ['north', [box(-BHW, BHW, 66, 96, -BHW, -BHW + 1)]],
  ['east', [box(BHW - 1, BHW, 66, 96, -BHW + 1, BHW - 1)]],
  ['west', [box(-BHW, -BHW + 1, 66, 96, -BHW + 1, BHW - 1)]],
]) {
  addPart(`belfry-${wn}-wall`, `Belfry ${wn} wall`, 'belfry', wgeoms);
}
for (const [fn, fo] of [['south', 1], ['north', -1]]) {
  const gs = [];
  const zc = fo * BHW;
  for (const off of [-4.2, 4.2]) {
    gs.push(box(off - 2.6, off - 1.8, 70, 84, zc - 0.5, zc + 0.5));
    gs.push(box(off + 1.8, off + 2.6, 70, 84, zc - 0.5, zc + 0.5));
    gs.push(box(off - 1.8, off + 1.8, 70, 85.5, zc - fo * 0.9, zc - fo * 0.1));
  }
  addPart(`bell-openings-${fn}`, `Bell openings (${fn})`, 'belfry', gs);
}
for (const [fn, horiz] of [['east', true], ['west', true]]) {
  const gs = [];
  const xc = fn === 'east' ? BHW : -BHW;
  const xo = fn === 'east' ? 1 : -1;
  for (const off of [-4.2, 4.2]) {
    gs.push(box(xc - 0.5, xc + 0.5, 70, 84, off - 2.6, off - 1.8));
    gs.push(box(xc - 0.5, xc + 0.5, 70, 84, off + 1.8, off + 2.6));
    gs.push(box(xc - xo * 0.9, xc - xo * 0.1, 70, 85.5, off - 1.8, off + 1.8));
  }
  addPart(`bell-openings-${fn}`, `Bell openings (${fn})`, 'belfry', gs);
}
addPart('bell-tracery', 'Bell tracery', 'belfry', [
  box(-0.25, 0.25, 70, 84, BHW - 0.3, BHW + 0.3),
  box(-0.25, 0.25, 70, 84, -BHW - 0.3, -BHW + 0.3),
]);
{
  const big = [];
  for (const [x, y, z, r] of [[0, 82, 0, 1.6], [-3, 82, -3, 1.3], [3, 82, -3, 1.3], [-3, 82, 3, 1.3], [3, 82, 3, 1.3]]) {
    big.push(...bell(r, x, y, z));
  }
  addPart('carillon-bells-large', 'Large carillon bells', 'belfry', big);
  const small = [];
  for (const [x, y, z, r] of [[0, 80, -4.5, 1.1], [0, 80, 4.5, 1.1], [-4.5, 80, 0, 1.1], [4.5, 80, 0, 1.1], [-2, 78, -2, 0.9], [2, 78, -2, 0.9], [-2, 78, 2, 0.9], [2, 78, 2, 0.9], [0, 76, 0, 0.7]]) {
    small.push(...bell(r, x, y, z));
  }
  addPart('carillon-bells-small', 'Small carillon bells', 'belfry', small);
}
{
  const clocks = [];
  for (const [x, z, ry] of [[0, BHW + 0.6, 0], [0, -BHW - 0.6, 0]]) {
    const d = new THREE.CylinderGeometry(2.2, 2.2, 0.3, 16);
    d.rotateX(Math.PI / 2);
    d.translate(x, 90, z);
    clocks.push(d);
  }
  for (const [x, z] of [[BHW + 0.6, 0], [-BHW - 0.6, 0]]) {
    const d = new THREE.CylinderGeometry(2.2, 2.2, 0.3, 16);
    d.rotateZ(Math.PI / 2);
    d.translate(x, 90, z);
    clocks.push(d);
  }
  addPart('clock-faces', 'Clock faces', 'belfry', clocks);
}
addPart('bell-frame', 'Bell frame', 'belfry', [
  box(-6, 6, 86, 87, -0.4, 0.4),
  box(-0.4, 0.4, 86, 87, -6, 6),
]);

// --- Lantern: 4 parts.
addPart('lantern-base', 'Lantern base', 'lantern', [box(-7, 7, 96, 99, -7, 7)]);
{
  const piers = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(a) * 5.5, pz = Math.sin(a) * 5.5;
    piers.push(box(px - 0.8, px + 0.8, 99, 106, pz - 0.8, pz + 0.8));
  }
  addPart('lantern-piers', 'Lantern piers', 'lantern', piers);
  const pins = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pins.push(cyl(0.05, 0.7, 4, Math.cos(a) * 7.2, 101, Math.sin(a) * 7.2, 8));
  }
  addPart('lantern-pinnacles', 'Lantern pinnacles', 'lantern', pins);
  const arches = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const a2 = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(a) * 5.5, pz = Math.sin(a) * 5.5;
    const qx = Math.cos(a2) * 5.5, qz = Math.sin(a2) * 5.5;
    const va = new THREE.Vector3(px, 106, pz), vb = new THREE.Vector3((px + qx) / 2, 108, (pz + qz) / 2), vc = new THREE.Vector3(qx, 106, qz);
    for (const [p0, p1] of [[va, vb], [vb, vc]]) {
      const dir = new THREE.Vector3().subVectors(p1, p0);
      const len = dir.length();
      const g = new THREE.BoxGeometry(0.9, len, 0.9);
      g.translate(0, len / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
      g.translate(p0.x, p0.y, p0.z);
      arches.push(g);
    }
  }
  addPart('lantern-arches', 'Lantern arches', 'lantern', arches);
}

// --- Crown: 1 part.
addPart('crown', 'Crown', 'crown', [
  cyl(0.1, 1.2, 3.5, 0, 109.5, 0, 8),
  new THREE.SphereGeometry(0.5, 8, 6).translate(0, 111.6, 0),
  cyl(0.06, 0.06, 1.2, 0, 112.0, 0, 6),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('bell')) return '#8a6d3b';
  if (id === 'bell-frame') return '#5a4a33';
  if (id === 'clock-faces') return '#2b3a4a';
  if (id.includes('window')) return '#2b3a4a';
  if (id.includes('opening')) return '#3a3f45';
  if (id === 'crown') return '#b8860b';
  if (id.includes('cornice') || id.includes('string-course')) return '#a89a76';
  return '#c9bfa5';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Base and entrance', color: '#b8ad92', description: 'Plinth, entrance block and portal columns.' },
  { id: 'lower-shaft', name: 'Lower shaft', color: '#c9bfa5', description: 'The tall lower square block: four walls, corner lesenes, chapel, guard and slit windows.' },
  { id: 'cornice', name: 'Main cornice', color: '#a89a76', description: 'The deep cornice between the lower block and the belfry.' },
  { id: 'belfry', name: 'Belfry', color: '#c9bfa5', description: 'The upper block with bell openings, tracery, carillon bells and clock faces.' },
  { id: 'lantern', name: 'Lantern', color: '#b8ad92', description: 'The lighter open lantern: base, piers, arches and pinnacles.' },
  { id: 'crown', name: 'Crown', color: '#b8860b', description: 'Spirelet, orb and weathercock.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'entrance block': 'The entrance block with the tall portal in the south face. Exact portal form is schematic.',
  'plinth': 'The plinth the tower stands on. Exact profile is schematic.',
  'portal columns': 'Engaged columns flanking the entrance portal. Exact order is schematic.',
  'south wall': 'The south face of the lower square block. Exact thickness is schematic.',
  'north wall': 'The north face of the lower square block. Exact thickness is schematic.',
  'east wall': 'The east face of the lower square block. Exact thickness is schematic.',
  'west wall': 'The west face of the lower square block. Exact thickness is schematic.',
  'corner lesenes': 'Flat vertical lesene strips on the four corners. The Domtoren famously has no visible buttresses. Exact form is schematic.',
  'chapel windows': 'Windows of the bishop\u2019s private chapel on the first floor. Exact form is schematic.',
  'guard windows': 'Windows of the tower guard\u2019s quarters on the second floor of the lower block. Exact form is schematic.',
  'slit windows': 'Narrow slit windows lighting the stair within the shaft. Exact positions are schematic.',
  'lower string course': 'A horizontal string course around the lower shaft. Exact position is schematic.',
  'upper string course': 'A horizontal string course around the lower shaft. Exact position is schematic.',
  'main cornice': 'The deep cornice marking the transition to the belfry. Exact profile is schematic.',
  'cornice moulding': 'Moulding above the main cornice. Exact profile is schematic.',
  'belfry south wall': 'The south wall of the upper square block. Exact thickness is schematic.',
  'belfry north wall': 'The north wall of the upper square block. Exact thickness is schematic.',
  'belfry east wall': 'The east wall of the upper square block. Exact thickness is schematic.',
  'belfry west wall': 'The west wall of the upper square block. Exact thickness is schematic.',
  'bell openings (south)': 'Tall arched openings in the south face letting the bells\u2019 sound out. Exact form is schematic.',
  'bell openings (north)': 'Tall arched openings in the north face letting the bells\u2019 sound out. Exact form is schematic.',
  'bell openings (east)': 'Tall arched openings in the east face letting the bells\u2019 sound out. Exact form is schematic.',
  'bell openings (west)': 'Tall arched openings in the west face letting the bells\u2019 sound out. Exact form is schematic.',
  'bell tracery': 'Stone tracery within the bell openings. Exact pattern is schematic.',
  'large carillon bells': 'The largest bells of the 50-bell carillon. Sizes and positions are schematic.',
  'small carillon bells': 'Smaller bells of the 50-bell carillon. Sizes and positions are schematic.',
  'clock faces': 'Clock dials on the four faces of the belfry. Exact design is schematic.',
  'bell frame': 'The frame the bells hang from. Exact structure is schematic.',
  'lantern base': 'The base of the open lantern. Exact form is schematic.',
  'lantern piers': 'The eight piers of the open lantern. Exact form is schematic.',
  'lantern pinnacles': 'Pinnacles on the lantern. Exact form is schematic.',
  'lantern arches': 'Arches spanning between the lantern piers. Exact form is schematic.',
  'crown': 'Spirelet, orb and weathercock at 112.3 m. Exact forms are schematic.',
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
const binName = 'domtoren-simple-0.bin';
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
  scope: 'Domtoren, Utrecht (simplified schematic)',
  title: 'Domtoren',
  location: 'Utrecht, Netherlands',
  blurb: 'The Dom Tower of Utrecht in simplified schematic form: two square blocks and a lighter open lantern rising 112.3 m, the tallest church tower in the Netherlands.',
  sourceUrls: [
    { label: 'Wikipedia: Dom Tower of Utrecht', url: 'https://en.wikipedia.org/wiki/Dom_Tower_of_Utrecht' },
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
  chunks: [{ url: '/models/domtoren-simple/domtoren-simple-0.bin', bytes: offset }],
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
