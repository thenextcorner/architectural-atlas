// Simplified schematic Statue of Liberty for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-statue-of-liberty.mjs, whose header
// lists every sourced dimension reused here), but coarser: 30 named parts
// across 8 systems instead of 104 across 11. Fort points, robe tiers,
// crown spikes and pedestal detail are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-statue-of-liberty.mjs for the full attribution):
//   93 m ground to torch; 46 m copper statue; Bartholdi/Eiffel; dedicated
//   28 October 1886; tablet 7.19 by 4.14 m JULY IV MDCCLXXVI; 7 crown rays;
//   25 crown windows; 354 steps; Fort Wood star fort; Hunt pedestal.
// Schematic (not sourced, never stated as fact in the UI): exact fort
// profile, pedestal stepping, drapery, poses, spike angles.
//
// Writes:
//   public/models/statue-of-liberty-simple/atlas.json
//   public/models/statue-of-liberty-simple/statue-of-liberty-simple-0.bin
//
// Usage: node scripts/generate-statue-of-liberty-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'statue-of-liberty-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (93 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 93;

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
function cyl(rt, rb, h, x, y, z, seg = 14) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Fort Wood: platform and star points merged: 2 parts.
addPart('fort-platform', 'Fort Wood platform', 'fort', [cyl(26, 28, 10, 0, 5, 0, 18)]);
{
  const pts = [];
  for (let k = 0; k < 11; k++) {
    const a = (k * Math.PI * 2) / 11;
    const c = new THREE.ConeGeometry(4.5, 10, 4);
    c.rotateY(-a + Math.PI / 4);
    c.translate(Math.cos(a) * 27, 5, Math.sin(a) * 27);
    pts.push(c);
  }
  addPart('star-points', 'Star fort points', 'fort', pts);
}
// --- Pedestal: base, shaft, cap merged: 3 parts.
addPart('pedestal-base', 'Pedestal base', 'pedestal', [box(-11, 11, 10, 14, -11, 11)]);
addPart('pedestal-shaft', 'Pedestal shaft', 'pedestal', [box(-8, 8, 14, 40, -8, 8)]);
addPart('pedestal-cap', 'Pedestal cap', 'pedestal', [box(-9.5, 9.5, 40, 47, -9.5, 9.5)]);
addPart('lazarus-plaque', 'The New Colossus plaque', 'pedestal', [box(-2.5, 2.5, 18, 21, 8.1, 8.4)]);
// --- Robe: three lathe tiers merged + shoulders: 4 parts.
{
  const prof = [[6.2, 0], [5.4, 5], [4.6, 11], [4.0, 17], [3.7, 22], [4.0, 27], [2.4, 31]];
  const tiers = [];
  const names = ['lower robe', 'middle robe', 'upper robe'];
  for (let t = 0; t < 3; t++) {
    const pts = [];
    for (let i = t * 2; i <= t * 2 + 2; i++) {
      pts.push(new THREE.Vector2(prof[i][0], prof[i][1]));
    }
    const g = new THREE.LatheGeometry(pts, 18);
    g.translate(0, 47, 0);
    tiers.push(g);
  }
  tiers.forEach((g, i) => addPart(`robe-${['lower', 'middle', 'upper'][i]}`, `${names[i]}`, 'robe', [g]));
}
addPart('shoulders', 'Shoulders', 'robe', [cyl(2.2, 3.0, 3, 0, 76.5, 0, 14)]);
// --- Head and crown: head, band, spikes merged, windows merged: 4 parts.
addPart('head', 'Head', 'head', [cyl(1.4, 1.9, 5.26, 0, 81.5, 0.3, 14)]);
addPart('crown-band', 'Crown band', 'crown', [cyl(2.1, 2.1, 1.6, 0, 84.2, 0, 16)]);
{
  const spikes = [];
  for (let k = 0; k < 7; k++) {
    const a = (k * Math.PI * 2) / 7;
    const dir = [Math.cos(a), 0.55, Math.sin(a)];
    spikes.push(strut([Math.cos(a) * 2.0, 84.8, Math.sin(a) * 2.0],
      [Math.cos(a) * 2.0 + dir[0] * 4.2, 84.8 + dir[1] * 4.2, Math.sin(a) * 2.0 + dir[2] * 4.2], 0.6));
  }
  addPart('crown-spikes', 'Crown spikes', 'crown', spikes);
}
addPart('crown-windows', 'Crown windows', 'crown', [cyl(2.16, 2.16, 0.9, 0, 84.2, 0, 16)]);
// --- Arms and torch: right arm merged, torch, left arm merged, tablet: 4 parts.
addPart('right-arm', 'Raised right arm', 'arms', [
  strut([2.8, 76, 0], [4.5, 81, 1], 1.7),
  strut([4.5, 81, 1], [5.5, 87, 1.5], 1.4),
  new THREE.SphereGeometry(1.1, 10, 8).translate(5.5, 87.8, 1.5),
]);
{
  const flames = [];
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    const f = new THREE.ConeGeometry(0.55, 2.2, 8);
    f.translate(5.5 + Math.cos(a) * 0.4, 93.3, 1.5 + Math.sin(a) * 0.4);
    flames.push(f);
  }
  addPart('torch', 'Torch', 'arms', [
    cyl(0.55, 0.8, 3.2, 5.5, 89.5, 1.5, 10),
    cyl(1.3, 0.6, 1.2, 5.5, 91.6, 1.5, 12),
    ...flames,
  ]);
}
addPart('left-arm', 'Left arm with tablet', 'arms', [
  strut([-2.8, 76, 0], [-4.2, 70, 1], 1.7),
  strut([-4.2, 70, 1], [-3.2, 72.5, 2.5], 1.4),
  new THREE.SphereGeometry(1.1, 10, 8).translate(-3.0, 73, 2.8),
]);
addPart('tablet', 'Tablet of the law', 'arms', [box(-6.6, 0.6, 68, 75.19, 1.2, 1.81)]);
// --- Feet and chains merged: 2 parts.
addPart('feet', 'Feet', 'feet', [box(1.2, 3.2, 47, 48.6, -1, 2.5), box(-3.2, -1.2, 47, 48.6, -2.5, 1)]);
{
  const chains = [];
  for (let k = 0; k < 3; k++) {
    const t = new THREE.TorusGeometry(0.8, 0.25, 8, 12);
    t.rotateX(Math.PI / 2 + k * 0.4);
    t.translate(-5 + k * 1.2, 47.6, -3 - k * 0.5);
    chains.push(t);
  }
  addPart('broken-chains', 'Broken chains', 'feet', chains);
}
// --- Internal frame merged: 1 part.
{
  const fr = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    fr.push(strut([Math.cos(a) * 3, 47, Math.sin(a) * 3], [Math.cos(a) * 1.2, 80, Math.sin(a) * 1.2], 0.8));
  }
  addPart('iron-framework', 'Iron framework', 'frame-internal', fr);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'torch') return '#d8a93c';
  if (id === 'tablet') return '#7d8b8f';
  if (id === 'broken-chains') return '#5c665e';
  if (id.includes('crown')) return '#5f8a7d';
  if (id === 'head') return '#6fa08f';
  if (id.includes('robe') || id.includes('shoulder') || id.includes('arm') || id === 'feet') return '#6fa08f';
  if (id.includes('pedestal') || id.includes('lazarus')) return '#b0a58e';
  if (id.includes('fort') || id.includes('star')) return '#9a917e';
  if (id.includes('iron')) return '#4c565e';
  return '#6fa08f';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'fort', name: 'Fort Wood', color: '#9a917e', description: 'The star fort base (schematic).' },
  { id: 'pedestal', name: 'Pedestal', color: '#b0a58e', description: 'Hunt\u2019s pedestal with the sonnet plaque.' },
  { id: 'robe', name: 'Robe', color: '#6fa08f', description: 'The copper drapery (schematic form).' },
  { id: 'head', name: 'Head', color: '#6fa08f', description: 'The head (schematic features).' },
  { id: 'crown', name: 'Crown', color: '#5f8a7d', description: 'The 7-rayed crown with 25 windows.' },
  { id: 'arms', name: 'Arms and torch', color: '#6fa08f', description: 'The raised torch arm and the tablet arm (schematic poses).' },
  { id: 'feet', name: 'Feet and chains', color: '#6fa08f', description: 'Feet with broken chains (schematic).' },
  { id: 'frame-internal', name: 'Iron framework', color: '#4c565e', description: 'Eiffel\u2019s iron frame (schematic).' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'fort wood platform': 'The platform of Fort Wood, the 11-pointed star fort. Exact profile is schematic.',
  'star fort points': 'The 11 points of the star fort. Exact geometry is schematic.',
  'pedestal base': 'The base of Richard Morris Hunt\u2019s pedestal. Exact stepping is schematic.',
  'pedestal shaft': 'The shaft of the pedestal, built by the Americans. Exact form is schematic.',
  'pedestal cap': 'The cap the statue stands on. Exact form is schematic.',
  'the new colossus plaque': 'The bronze plaque with Emma Lazarus\u2019s sonnet "The New Colossus." Exact position is schematic.',
  'lower robe': 'The lower drapery of the copper robe. The skin is 2.37 mm thick copper. Exact drapery is schematic.',
  'middle robe': 'The middle drapery of the robe. Exact drapery is schematic.',
  'upper robe': 'The upper drapery of the robe. Exact drapery is schematic.',
  'shoulders': 'The shoulders of the figure. Exact form is schematic.',
  'head': 'The head, 5.26 m high. Exact features are schematic.',
  'crown band': 'The crown band with 25 windows. Exact forms are schematic.',
  'crown spikes': 'The 7 crown rays for the seven seas and continents. Exact angles are schematic.',
  'crown windows': 'The 25 crown windows. Exact forms are schematic.',
  'raised right arm': 'The raised right arm holding the torch. Exact pose is schematic.',
  'torch': 'The torch of enlightenment with gold-leafed flame, tip 93 m above the ground. Closed to the public since 1916.',
  'left arm with tablet': 'The bent left arm cradling the tablet. Exact pose is schematic.',
  'tablet of the law': 'The tablet inscribed JULY IV MDCCLXXVI, 7.19 m by 4.14 m.',
  'feet': 'The feet of the figure. Exact form is schematic.',
  'broken chains': 'The broken chains of tyranny at the feet. Exact form is schematic.',
  'iron framework': 'Gustave Eiffel\u2019s iron framework inside the copper skin. Exact layout is schematic.',
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
const binName = 'statue-of-liberty-simple-0.bin';
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
  scope: 'Statue of Liberty, New York (simplified schematic)',
  title: 'Statue of Liberty',
  location: 'New York, United States',
  blurb: 'The 1886 copper colossus in simplified form: 93 m to the torch tip, 7-rayed crown and tablet on the pedestal.',
  sourceUrls: [
    { label: 'Wikipedia: Statue of Liberty', url: 'https://en.wikipedia.org/wiki/Statue_of_Liberty' },
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
  chunks: [{ url: '/models/statue-of-liberty-simple/statue-of-liberty-simple-0.bin', bytes: offset }],
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
