// Procedural CN Tower for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned CN Tower in code and writes
// it in the atlas binary format:
//   public/models/cn-tower/atlas.json
//   public/models/cn-tower/cn-tower-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   concrete communications and observation tower in downtown Toronto at
//   290 Bremner Boulevard (301 Front Street West); built by Canadian
//   National to carry broadcast antennas above the growing skyline;
//   construction started 6 February 1973, topped out 2 April 1975,
//   opened to the public 26 June 1976, official opening 1 October 1976;
//   cost CA$63 million; architects John Andrews, Webb Zerafa, Menkes
//   Housden (WZMH); 553.3 m (1,815 ft) tall: roof 457.2 m, antenna spire
//   96.1 m; tallest freestanding structure in the world 1976 to 2007;
//   named one of the Seven Wonders of the Modern World by the American
//   Society of Civil Engineers in 1995; over 40,000 cubic meters of
//   concrete; main pod with seven storeys: Glass Floor at 342 m (opened
//   1994), LookOut level at 346 m, 360 revolving restaurant at 351 m;
//   SkyPod at 447 m, one of the world's highest observation decks;
//   EdgeWalk opened 2011 on the pod roof at 356 m, a hands-free walk on
//   an outdoor ledge; 1,776 steps to the main level; elevators run at
//   6 m/s; about 1.5 million visitors a year.
// Schematic (not sourced, never stated as fact in the UI): hexagonal
// shaft cross-section and taper; rib and strut layout; pod floor heights
// beyond the named levels; skin panel divisions; glass floor panel
// layout; antenna segment divisions; elevator car positions; stairwell
// form.
//
// Coordinate frame: y = up, ground at y = 0. All dimensions in meters.
//
// Granularity: 100+ named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-cn-tower.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'cn-tower');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (553.3 m) maps to 2.4 units.
const S = 2.4 / 553.3;

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
// Vertical curved wall panel: open cylinder sector.
function arcPanel(r, y0, y1, a0, a1, seg = 10) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, true, a0, a1 - a0);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
// Flat ring sector in the XZ plane at height y.
function ringSector(rIn, rOut, y, a0, a1, seg = 10) {
  const g = new THREE.RingGeometry(rIn, rOut, seg, 1, a0, a1 - a0);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}
// Torus arc in the XZ plane at height y.
function torusArc(R, t, y, a0, arc = Math.PI / 2, seg = 20) {
  const g = new THREE.TorusGeometry(R, t, 8, seg, arc);
  g.rotateX(Math.PI / 2);
  g.rotateY(-a0);
  g.translate(0, y, 0);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Foundation and entrance: 4 parts.
addPart('foundation-slab', 'Foundation slab', 'foundation', [box(-35, 35, -22, 0, -35, 35)]);
addPart('foundation-walls', 'Foundation walls', 'foundation', [
  box(-35, -33, -22, 0, -35, 35), box(33, 35, -22, 0, -35, 35),
  box(-35, 35, -22, 0, -35, -33), box(-35, 35, -22, 0, 33, 35),
]);
addPart('entrance-pavilion', 'Entrance pavilion', 'foundation', [box(-18, 18, 0, 10, -12, 12)]);
addPart('pavilion-roof', 'Pavilion roof', 'foundation', [box(-19, 19, 10, 11.5, -13, 13)]);

// --- Shaft base flare: hexagonal, y 0..45: 1 part.
addPart('shaft-flare', 'Shaft base flare', 'shaft', [cyl(10, 22, 45, 0, 22.5, 0, 6)]);

// --- Main shaft: 8 hexagonal segments, y 45..335, tapering 10 -> 7: 8 parts.
for (let s = 0; s < 8; s++) {
  const y0 = 45 + s * (290 / 8), y1 = 45 + (s + 1) * (290 / 8);
  const rB = 10 - (s * 3) / 8, rT = 10 - ((s + 1) * 3) / 8;
  addPart(`shaft-segment-${s + 1}`, `Shaft segment ${s + 1}`, 'shaft', [
    cyl(rT, rB, y1 - y0, 0, (y0 + y1) / 2, 0, 6),
  ]);
}

// --- Shaft ribs: 6 vertical ribs at the hexagon vertices: 6 parts.
for (let k = 0; k < 6; k++) {
  const a = (k * Math.PI) / 3 + Math.PI / 6;
  addPart(`shaft-rib-${k + 1}`, `Shaft rib ${k + 1}`, 'shaft', [
    box(8.5 * Math.cos(a) - 0.5, 8.5 * Math.cos(a) + 0.5, 45, 335, 8.5 * Math.sin(a) - 0.5, 8.5 * Math.sin(a) + 0.5),
  ]);
}

// --- Pod support struts: 6 diagonals: 6 parts.
for (let k = 0; k < 6; k++) {
  const a = (k * Math.PI) / 3;
  addPart(`pod-strut-${k + 1}`, `Pod support strut ${k + 1}`, 'main-pod', [
    strut([8 * Math.cos(a), 318, 8 * Math.sin(a)], [19 * Math.cos(a), 340, 19 * Math.sin(a)], 1.8),
  ]);
}

// --- Main pod: seven storeys, y 338..366: 7 floor parts.
const FLOOR_Y = [340.5, 344, 347.5, 351, 354.5, 358, 361.5];
const FLOOR_NAMES = ['Level 1', 'Level 2', 'Level 3', '360 Restaurant level', 'Level 5', 'Level 6', 'Level 7'];
FLOOR_Y.forEach((yc, i) => {
  addPart(`pod-floor-${i + 1}`, `Main pod ${FLOOR_NAMES[i].toLowerCase()}`, 'main-pod', [
    cyl(19, 19, 3, 0, yc, 0, 24),
  ]);
});

// --- Pod outer skin: 12 arc panels: 12 parts.
for (let k = 0; k < 12; k++) {
  addPart(`pod-skin-${k + 1}`, `Pod outer skin panel ${k + 1}`, 'main-pod', [
    arcPanel(20, 338, 366, (k * Math.PI) / 6, ((k + 1) * Math.PI) / 6, 6),
  ]);
}

// --- Pod window bands: 7 full rings: 7 parts.
FLOOR_Y.forEach((yc, i) => {
  addPart(`pod-windows-${i + 1}`, `Pod window band ${i + 1}`, 'main-pod', [
    arcPanel(20.1, yc - 0.8, yc + 0.8, 0, Math.PI * 2, 24),
  ]);
});

// --- Glass Floor at 342 m: 4 quadrant panels: 4 parts.
for (let k = 0; k < 4; k++) {
  addPart(`glass-floor-${k + 1}`, `Glass floor panel ${k + 1}`, 'glass-floor', [
    ringSector(8, 16, 342, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2, 8),
  ]);
}

// --- 360 Restaurant ring at 351 m: 1 part.
addPart('restaurant-ring', '360 Restaurant ring', 'main-pod', [torusArc(15, 2, 351, 0, Math.PI * 2, 40)]);

// --- EdgeWalk at 356 m on the pod roof: 4 ledge + 4 railing parts.
for (let k = 0; k < 4; k++) {
  addPart(`edgewalk-ledge-${k + 1}`, `EdgeWalk ledge ${k + 1}`, 'main-pod', [
    ringSector(19, 21.5, 366, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2, 8),
  ]);
  addPart(`edgewalk-rail-${k + 1}`, `EdgeWalk railing ${k + 1}`, 'main-pod', [
    arcPanel(21.5, 366, 367.5, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2, 8),
  ]);
}

// --- Pod roof: 2 parts.
addPart('pod-roof-inner', 'Pod roof inner', 'main-pod', [cyl(19, 19, 1, 0, 366.5, 0, 24)]);
addPart('pod-floor-base', 'Pod base floor', 'main-pod', [cyl(19, 19, 1, 0, 337.5, 0, 24)]);

// --- Upper shaft: 6 segments, y 366..438, radius 7 -> 4: 6 parts.
for (let s = 0; s < 6; s++) {
  const y0 = 366 + s * 12, y1 = 366 + (s + 1) * 12;
  const rB = 7 - s * 0.5, rT = 7 - (s + 1) * 0.5;
  addPart(`upper-shaft-${s + 1}`, `Upper shaft segment ${s + 1}`, 'shaft', [
    cyl(rT, rB, 12, 0, (y0 + y1) / 2, 0, 6),
  ]);
}

// --- SkyPod at 447 m: 3 floors, 6 skin panels, 3 window bands: 12 parts.
[440, 444.5, 449].forEach((yc, i) => {
  addPart(`skypod-floor-${i + 1}`, `SkyPod floor ${i + 1}`, 'skypod', [cyl(10, 10, 3, 0, yc, 0, 18)]);
});
for (let k = 0; k < 6; k++) {
  addPart(`skypod-skin-${k + 1}`, `SkyPod skin panel ${k + 1}`, 'skypod', [
    arcPanel(11, 438, 457, (k * Math.PI) / 3, ((k + 1) * Math.PI) / 3, 6),
  ]);
}
[440, 444.5, 449].forEach((yc, i) => {
  addPart(`skypod-windows-${i + 1}`, `SkyPod window band ${i + 1}`, 'skypod', [
    arcPanel(11.1, yc - 0.8, yc + 0.8, 0, Math.PI * 2, 18),
  ]);
});

// --- Antenna: 6 tapered segments y 457..553.3: 6 parts.
for (let s = 0; s < 6; s++) {
  const y0 = 457 + s * (96.3 / 6), y1 = 457 + (s + 1) * (96.3 / 6);
  const rB = 3 - s * 0.42, rT = 3 - (s + 1) * 0.42;
  addPart(`antenna-${s + 1}`, `Antenna segment ${s + 1}`, 'antenna', [
    cyl(Math.max(rT, 0.3), rB, y1 - y0, 0, (y0 + y1) / 2, 0, 8),
  ]);
}

// --- Transmitter collars: 3 parts + beacon: 1.
[480, 505, 530].forEach((yc, i) => {
  addPart(`transmitter-${i + 1}`, `Transmitter collar ${i + 1}`, 'antenna', [
    torusArc(2.5 - i * 0.4, 0.5, yc, 0, Math.PI * 2, 24),
  ]);
});
addPart('antenna-beacon', 'Antenna beacon', 'antenna', [
  (() => { const g = new THREE.SphereGeometry(0.8, 8, 6); g.translate(0, 554, 0); return g; })(),
]);

// --- Elevators: 6 cars on the shaft exterior: 6 parts.
[90, 150, 210, 270, 320, 345].forEach((yc, i) => {
  const a = (i * Math.PI) / 3;
  addPart(`elevator-${i + 1}`, `Elevator car ${i + 1}`, 'elevators', [
    box(10.5 * Math.cos(a) - 1.2, 10.5 * Math.cos(a) + 1.2, yc - 2.5, yc + 2.5, 10.5 * Math.sin(a) - 1.2, 10.5 * Math.sin(a) + 1.2),
  ]);
});

// --- Stairwell: 1 part (1,776 steps, schematic).
addPart('stairwell', 'Stairwell', 'services', [box(-1.5, 1.5, 0, 346, -1.5, 1.5)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('foundation-') || id === 'shaft-flare') return '#8f8b82';
  if (id.startsWith('entrance-') || id.startsWith('pavilion-')) return '#b0aca2';
  if (id.startsWith('shaft-') || id.startsWith('upper-shaft')) return '#b8b4ac';
  if (id.startsWith('pod-strut')) return '#9a968e';
  if (id.startsWith('pod-floor-') || id === 'pod-floor-base' || id === 'pod-roof-inner') return '#8a867e';
  if (id.startsWith('pod-skin-')) return '#d8d5ce';
  if (id.startsWith('pod-windows-')) return '#9fd4e8';
  if (id.startsWith('glass-floor-')) return '#7fc4e0';
  if (id === 'restaurant-ring') return '#c9a86a';
  if (id.startsWith('edgewalk-ledge')) return '#6a675f';
  if (id.startsWith('edgewalk-rail')) return '#4a4842';
  if (id.startsWith('skypod-floor')) return '#8a867e';
  if (id.startsWith('skypod-skin')) return '#cfccc4';
  if (id.startsWith('skypod-windows')) return '#9fd4e8';
  if (id.startsWith('antenna-') && !id.startsWith('antenna-beacon')) return '#b03a2e';
  if (id.startsWith('transmitter-')) return '#7a766e';
  if (id === 'antenna-beacon') return '#e74c3c';
  if (id.startsWith('elevator-')) return '#9fd4e8';
  if (id === 'stairwell') return '#8a867e';
  return '#b8b4ac';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundation', name: 'Foundation and entrance', color: '#8f8b82', description: 'The deep foundation slab and the entrance pavilion at the tower base.' },
  { id: 'shaft', name: 'Concrete shaft', color: '#b8b4ac', description: 'The hexagonal concrete shaft rising 335 m, with its base flare, ribs and upper section.' },
  { id: 'main-pod', name: 'Main pod', color: '#d8d5ce', description: 'The seven-storey main pod with the 360 Restaurant and the EdgeWalk ledge on its roof.' },
  { id: 'glass-floor', name: 'Glass floor', color: '#7fc4e0', description: 'The Glass Floor at 342 m, opened in 1994.' },
  { id: 'skypod', name: 'SkyPod', color: '#cfccc4', description: 'The smaller SkyPod at 447 m, one of the world\'s highest observation decks.' },
  { id: 'antenna', name: 'Antenna', color: '#b03a2e', description: 'The 96 m antenna spire with transmitter collars and beacon, reaching 553.3 m.' },
  { id: 'elevators', name: 'Elevators', color: '#9fd4e8', description: 'High-speed elevator cars running up the shaft exterior at 6 m/s.' },
  { id: 'services', name: 'Services', color: '#8a867e', description: 'The stairwell with 1,776 steps to the main level.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'foundation slab': 'The foundation slab, sunk deep into the bedrock to carry 130,000 tons. Exact extent is schematic.',
  'foundation walls': 'Foundation retaining walls. Schematic.',
  'entrance pavilion': 'The entrance pavilion where about 1.5 million visitors a year begin the ascent. Exact layout is schematic.',
  'pavilion roof': 'Roof of the entrance pavilion. Schematic.',
  'shaft base flare': 'The flared base of the hexagonal concrete shaft. Exact flare profile is schematic.',
  '360 restaurant ring': 'The 360 Restaurant at 351 m, revolving once every 72 minutes with seating for 400. Exact ring form is schematic.',
  'pod roof inner': 'The inner roof of the main pod. Schematic.',
  'pod base floor': 'The base floor of the main pod. Schematic.',
  'antenna beacon': 'The red aviation beacon at 553.3 m. Schematic.',
  'stairwell': 'The stairwell with 1,776 steps to the main level, opened for charity climbs. Exact stair form is schematic.',
};
for (let s = 1; s <= 8; s++) {
  explanations[`shaft segment ${s}`] =
    `Segment ${s} of the hexagonal concrete shaft, slip-formed in one continuous 40-month pour of over 40,000 cubic meters of concrete. Exact segment divisions are schematic.`;
}
for (let k = 1; k <= 6; k++) {
  explanations[`shaft rib ${k}`] =
    `Vertical rib ${k} stiffening the hexagonal shaft. Exact rib layout is schematic.`;
  explanations[`pod support strut ${k}`] =
    `Diagonal strut ${k} carrying the main pod. Exact strut layout is schematic.`;
  explanations[`skypod skin panel ${k}`] =
    `Outer skin panel ${k} of the SkyPod. Exact panel divisions are schematic.`;
  explanations[`antenna segment ${s0(k)}`] =
    `Segment of the antenna spire, hoisted into place by helicopter. The spire carries radio, television and cellular signals. Exact segment divisions are schematic.`;
  explanations[`elevator car ${k}`] =
    `High-speed elevator car ${k}, climbing at 6 m/s. Exact car positions are schematic.`;
}
function s0(k) { return k; }
for (let i = 1; i <= 7; i++) {
  explanations[`main pod ${FLOOR_NAMES[i - 1].toLowerCase()}`] =
    `Storey ${i} of the seven-storey main pod. Exact floor heights beyond the named levels are schematic.`;
  explanations[`pod outer skin panel ${i}`] =
    `Outer skin panel ${i} of the main pod. Exact panel divisions are schematic.`;
  explanations[`pod window band ${i}`] =
    `Window band ${i} of the main pod. Schematic.`;
}
for (let k = 8; k <= 12; k++) {
  explanations[`pod outer skin panel ${k}`] =
    `Outer skin panel ${k} of the main pod. Exact panel divisions are schematic.`;
}
for (let k = 1; k <= 4; k++) {
  explanations[`glass floor panel ${k}`] =
    `Glass floor panel ${k} at 342 m, opened in 1994: five layers of glass and air, load-tested every year. Exact panel layout is schematic.`;
  explanations[`edgewalk ledge ${k}`] =
    `EdgeWalk ledge segment ${k} at 356 m: a 1.5 m wide outdoor ledge where visitors walk hands-free, harnessed to an overhead rail. Exact ledge form is schematic.`;
  explanations[`edgewalk railing ${k}`] =
    `EdgeWalk safety railing ${k}. Schematic.`;
}
for (let s = 1; s <= 6; s++) {
  explanations[`upper shaft segment ${s}`] =
    `Segment ${s} of the upper shaft between the main pod and the SkyPod. Exact divisions are schematic.`;
}
for (let i = 1; i <= 3; i++) {
  explanations[`skypod floor ${i}`] = `SkyPod floor ${i} at 447 m. Exact layout is schematic.`;
  explanations[`skypod window band ${i}`] = `SkyPod window band ${i}. Schematic.`;
  explanations[`transmitter collar ${i}`] = `Transmitter collar ${i} on the antenna spire. Schematic.`;
}

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
const binName = 'cn-tower-0.bin';
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
  scope: 'CN Tower, Toronto',
  title: 'CN Tower',
  location: 'Toronto, Ontario, Canada',
  blurb: 'Toronto\u2019s 553.3 m concrete communications tower, the world\u2019s tallest freestanding structure from 1976 to 2007: hexagonal shaft, seven-storey main pod with the Glass Floor, and the SkyPod at 447 m.',
  sourceUrls: [
    { label: 'Wikipedia: CN Tower', url: 'https://en.wikipedia.org/wiki/CN_Tower' },
    { label: 'GantNews: CN Tower Fast Facts', url: 'https://gantnews.com/2015/07/03/cn-tower-fast-facts/amp/' },
    { label: 'LiwinCo: CN Tower Toronto City Guide', url: 'https://liwinco.com/en/things-to-do/cn-tower-401' },
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
  chunks: [{ url: '/models/cn-tower/cn-tower-0.bin', bytes: offset }],
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
