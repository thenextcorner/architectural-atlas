// Simplified schematic CN Tower for the Architectural Atlas.
//
// The "simple" variant of the CN Tower: same footprint, massing and
// proportions as the detailed model (see scripts/generate-cn-tower.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// about 30 named parts across 7 systems instead of 101 across 8. Shaft
// segments are merged, the pod becomes a single drum with a glass ring,
// and the antenna is a single tapered mast.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-cn-tower.mjs for the full attribution):
//   553.3 m tall, opened 1976, CA$63 million, WZMH architects, Glass
//   Floor at 342 m, LookOut at 346 m, 360 Restaurant at 351 m, SkyPod at
//   447 m, EdgeWalk at 356 m, 1,776 steps, world's tallest freestanding
//   structure 1976-2007.
// Schematic (not sourced, never stated as fact in the UI): merged group
// geometry; exact shaft profile and pod divisions.
//
// Writes:
//   public/models/cn-tower-simple/atlas.json
//   public/models/cn-tower-simple/cn-tower-simple-0.bin
//
// Usage: node scripts/generate-cn-tower-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'cn-tower-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (553.3 m) maps to 2.4 units (same as detailed).
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

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

addPart('foundation', 'Foundation', 'foundation', [box(-35, 35, -22, 0, -35, 35)]);
addPart('entrance-pavilion', 'Entrance pavilion', 'foundation', [box(-18, 18, 0, 11.5, -12, 12)]);
addPart('shaft-flare', 'Shaft base flare', 'shaft', [cyl(10, 22, 45, 0, 22.5, 0, 6)]);
addPart('shaft-lower', 'Lower shaft', 'shaft', [cyl(8.5, 10, 145, 0, 117.5, 0, 6)]);
addPart('shaft-upper', 'Upper shaft', 'shaft', [cyl(7, 8.5, 145, 0, 262.5, 0, 6)]);
{
  const ribs = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 6;
    ribs.push(box(8.5 * Math.cos(a) - 0.5, 8.5 * Math.cos(a) + 0.5, 45, 335, 8.5 * Math.sin(a) - 0.5, 8.5 * Math.sin(a) + 0.5));
  }
  addPart('shaft-ribs', 'Shaft ribs', 'shaft', ribs);
  const struts = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    struts.push(strut([8 * Math.cos(a), 318, 8 * Math.sin(a)], [19 * Math.cos(a), 340, 19 * Math.sin(a)], 1.8));
  }
  addPart('pod-struts', 'Pod support struts', 'main-pod', struts);
}
addPart('main-pod', 'Main pod', 'main-pod', [cyl(20, 20, 28, 0, 352, 0, 18)]);
addPart('pod-windows', 'Pod window band', 'main-pod', [
  (() => { const g = new THREE.CylinderGeometry(20.1, 20.1, 12, 18, 1, true); g.translate(0, 352, 0); return g; })(),
]);
addPart('glass-floor', 'Glass floor', 'glass-floor', [
  (() => { const g = new THREE.RingGeometry(8, 16, 24); g.rotateX(-Math.PI / 2); g.translate(0, 342, 0); return g; })(),
]);
addPart('restaurant-ring', '360 Restaurant ring', 'main-pod', [
  (() => { const g = new THREE.TorusGeometry(15, 2, 8, 32); g.rotateX(Math.PI / 2); g.translate(0, 351, 0); return g; })(),
]);
addPart('edgewalk', 'EdgeWalk ledge and railing', 'main-pod', [
  (() => { const g = new THREE.RingGeometry(19, 21.5, 24); g.rotateX(-Math.PI / 2); g.translate(0, 366, 0); return g; })(),
  (() => { const g = new THREE.CylinderGeometry(21.5, 21.5, 1.5, 24, 1, true); g.translate(0, 366.75, 0); return g; })(),
]);
addPart('upper-shaft', 'Shaft above the pod', 'shaft', [cyl(4, 7, 72, 0, 402, 0, 6)]);
addPart('skypod', 'SkyPod', 'skypod', [cyl(11, 11, 19, 0, 447.5, 0, 12)]);
addPart('skypod-windows', 'SkyPod window band', 'skypod', [
  (() => { const g = new THREE.CylinderGeometry(11.1, 11.1, 8, 12, 1, true); g.translate(0, 447.5, 0); return g; })(),
]);
addPart('antenna-lower', 'Lower antenna', 'antenna', [cyl(1.7, 3, 48, 0, 481, 0, 8)]);
addPart('antenna-upper', 'Upper antenna', 'antenna', [cyl(0.4, 1.7, 48.3, 0, 529, 0, 8)]);
addPart('antenna-beacon', 'Antenna beacon', 'antenna', [
  (() => { const g = new THREE.SphereGeometry(0.8, 8, 6); g.translate(0, 554, 0); return g; })(),
]);
{
  const cars = [];
  [120, 220, 320].forEach((yc, i) => {
    const a = (i * 2 * Math.PI) / 3;
    cars.push(box(10.5 * Math.cos(a) - 1.2, 10.5 * Math.cos(a) + 1.2, yc - 2.5, yc + 2.5, 10.5 * Math.sin(a) - 1.2, 10.5 * Math.sin(a) + 1.2));
  });
  addPart('elevators', 'Elevator cars', 'elevators', cars);
}
addPart('stairwell', 'Stairwell', 'services', [box(-1.5, 1.5, 0, 346, -1.5, 1.5)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'foundation' || id === 'shaft-flare') return '#8f8b82';
  if (id === 'entrance-pavilion') return '#b0aca2';
  if (id.startsWith('shaft-') || id === 'upper-shaft') return '#b8b4ac';
  if (id === 'pod-struts') return '#9a968e';
  if (id === 'main-pod') return '#d8d5ce';
  if (id === 'pod-windows') return '#9fd4e8';
  if (id === 'glass-floor') return '#7fc4e0';
  if (id === 'restaurant-ring') return '#c9a86a';
  if (id === 'edgewalk') return '#6a675f';
  if (id === 'skypod') return '#cfccc4';
  if (id === 'skypod-windows') return '#9fd4e8';
  if (id.startsWith('antenna-') && id !== 'antenna-beacon') return '#b03a2e';
  if (id === 'antenna-beacon') return '#e74c3c';
  if (id === 'elevators') return '#9fd4e8';
  if (id === 'stairwell') return '#8a867e';
  return '#b8b4ac';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundation', name: 'Foundation and entrance', color: '#8f8b82', description: 'The deep foundation slab and the entrance pavilion.' },
  { id: 'shaft', name: 'Concrete shaft', color: '#b8b4ac', description: 'The hexagonal concrete shaft with its flared base and ribs.' },
  { id: 'main-pod', name: 'Main pod', color: '#d8d5ce', description: 'The seven-storey main pod with the 360 Restaurant and EdgeWalk.' },
  { id: 'glass-floor', name: 'Glass floor', color: '#7fc4e0', description: 'The Glass Floor at 342 m.' },
  { id: 'skypod', name: 'SkyPod', color: '#cfccc4', description: 'The SkyPod at 447 m.' },
  { id: 'antenna', name: 'Antenna', color: '#b03a2e', description: 'The antenna spire reaching 553.3 m.' },
  { id: 'elevators', name: 'Elevators', color: '#9fd4e8', description: 'High-speed elevator cars.' },
  { id: 'services', name: 'Services', color: '#8a867e', description: 'The stairwell.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'foundation': 'The foundation slab, sunk deep into the bedrock. Schematic.',
  'entrance pavilion': 'The entrance pavilion. Schematic.',
  'shaft base flare': 'The flared base of the hexagonal concrete shaft. Schematic.',
  'lower shaft': 'The lower half of the concrete shaft, slip-formed in a continuous pour. Schematic.',
  'upper shaft': 'The upper half of the concrete shaft. Schematic.',
  'shaft ribs': 'Vertical ribs stiffening the shaft. Schematic.',
  'pod support struts': 'Diagonal struts carrying the main pod. Schematic.',
  'main pod': 'The seven-storey main pod with the Glass Floor, LookOut level and 360 Restaurant. Schematic.',
  'pod window band': 'The window band of the main pod. Schematic.',
  'glass floor': 'The Glass Floor at 342 m, opened in 1994. Schematic.',
  '360 restaurant ring': 'The 360 Restaurant at 351 m, revolving once every 72 minutes. Schematic.',
  'edgewalk ledge and railing': 'The EdgeWalk at 356 m, a hands-free walk on the pod roof. Schematic.',
  'shaft above the pod': 'The shaft section between the main pod and the SkyPod. Schematic.',
  'skypod': 'The SkyPod at 447 m, one of the world\'s highest observation decks. Schematic.',
  'skypod window band': 'The SkyPod window band. Schematic.',
  'lower antenna': 'The lower half of the 96 m antenna spire. Schematic.',
  'upper antenna': 'The upper half of the antenna spire, reaching 553.3 m. Schematic.',
  'antenna beacon': 'The aviation beacon. Schematic.',
  'elevator cars': 'High-speed elevator cars climbing at 6 m/s. Schematic.',
  'stairwell': 'The stairwell with 1,776 steps. Schematic.',
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
const binName = 'cn-tower-simple-0.bin';
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
  scope: 'CN Tower, Toronto (simplified schematic)',
  title: 'CN Tower',
  location: 'Toronto, Ontario, Canada',
  blurb: 'Toronto\u2019s 553.3 m concrete tower in simplified schematic form: hexagonal shaft, main pod with the Glass Floor, and the SkyPod at 447 m.',
  sourceUrls: [
    { label: 'Wikipedia: CN Tower', url: 'https://en.wikipedia.org/wiki/CN_Tower' },
    { label: 'GantNews: CN Tower Fast Facts', url: 'https://gantnews.com/2015/07/03/cn-tower-fast-facts/amp/' },
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
  chunks: [{ url: '/models/cn-tower-simple/cn-tower-simple-0.bin', bytes: offset }],
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
