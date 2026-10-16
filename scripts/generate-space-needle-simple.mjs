// Simplified schematic Space Needle for the Architectural Atlas.
//
// The "simple" variant of the Space Needle: same footprint, massing and
// proportions as the detailed model (see scripts/generate-space-needle.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// about 30 named parts across 6 systems instead of 100+ across 7. Leg
// segments are merged per leg, glass panels and mullions become single
// rings, and the halo, roof and mast are simplified.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-space-needle.mjs for the full attribution):
//   605 ft (184 m) high, top house 138 ft (42 m) wide, observation deck at
//   520 ft, restaurant at 500 ft, 9,550 tons, 1962 World's Fair, three
//   legs, 25 lightning rods, Astronaut White / Re-entry Red / Orbital
//   Olive / Galaxy Gold original paint scheme.
// Schematic (not sourced, never stated as fact in the UI): merged group
// geometry; exact leg curve, panel divisions and rod positions.
//
// Writes:
//   public/models/space-needle-simple/atlas.json
//   public/models/space-needle-simple/space-needle-simple-0.bin
//
// Usage: node scripts/generate-space-needle-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'space-needle-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (184 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 184;

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
function taperedBox(x0, z0, y0, x1, z1, y1, w0, w1) {
  const a = new THREE.Vector3(x0, y0, z0);
  const b = new THREE.Vector3(x1, y1, z1);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(w1 / Math.SQRT2, w0 / Math.SQRT2, len, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
  );
  g.translate(x0, y0, z0);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Foundation and base: 4 parts.
addPart('foundation', 'Foundation', 'foundation', [box(-30, 30, -9, 0, -30, 30)]);
addPart('plaza', 'Plaza', 'foundation', [box(-25, 25, 0, 1, -25, 25)]);
addPart('base-building', 'Base building', 'foundation', [box(-20, 20, 1, 8, -20, 20)]);
{
  const footings = [];
  for (const ang of [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3]) {
    footings.push(box(26 * Math.cos(ang) - 4, 26 * Math.cos(ang) + 4, 0, 7, 26 * Math.sin(ang) - 4, 26 * Math.sin(ang) + 4));
  }
  addPart('leg-footings', 'Leg footings', 'foundation', footings);
}

// --- Legs: three merged legs plus merged braces: 4 parts.
{
  const LEG_ANGLES = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];
  const PROFILE = [[7, 26, 3.6], [40, 20, 3.2], [75, 14, 2.8], [105, 8, 2.4], [146, 14, 2.8]];
  const NAMES = ['North', 'Southeast', 'Southwest'];
  LEG_ANGLES.forEach((ang, li) => {
    const segs = [];
    for (let s = 0; s < 4; s++) {
      const [y0, r0, w0] = PROFILE[s];
      const [y1, r1, w1] = PROFILE[s + 1];
      segs.push(taperedBox(Math.cos(ang) * r0, Math.sin(ang) * r0, y0, Math.cos(ang) * r1, Math.sin(ang) * r1, y1, w0, w1));
    }
    addPart(`leg-${li + 1}`, `${NAMES[li]} leg`, 'legs', segs);
  });
  const braces = [];
  [[40, 20], [75, 14], [105, 8]].forEach(([y, r]) => {
    for (let k = 0; k < 3; k++) {
      const a0 = LEG_ANGLES[k], a1 = LEG_ANGLES[(k + 1) % 3];
      braces.push(strut([r * Math.cos(a0), y, r * Math.sin(a0)], [r * Math.cos(a1), y, r * Math.sin(a1)], 1.6));
    }
  });
  addPart('cross-braces', 'Cross braces', 'legs', braces);
}

// --- Core and elevators: 4 parts.
addPart('core', 'Central core', 'core', [cyl(4.5, 4.5, 139, 0, 76.5, 0, 12)]);
{
  const shafts = [];
  for (let e = 0; e < 3; e++) {
    const a = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3][e] + Math.PI / 3;
    shafts.push(box(6.8 * Math.cos(a) - 1.6, 6.8 * Math.cos(a) + 1.6, 7, 146, 6.8 * Math.sin(a) - 1.6, 6.8 * Math.sin(a) + 1.6));
  }
  addPart('elevator-shafts', 'Elevator shafts', 'core', shafts);
  const cars = [];
  for (const [ci, cy] of [[0, 60], [1, 105], [2, 135]]) {
    const a = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3][ci] + Math.PI / 3;
    cars.push(box(6.8 * Math.cos(a) - 1.3, 6.8 * Math.cos(a) + 1.3, cy - 2, cy + 2, 6.8 * Math.sin(a) - 1.3, 6.8 * Math.sin(a) + 1.3));
  }
  addPart('elevator-cars', 'Elevator cars', 'core', cars);
}
addPart('saucer-supports', 'Saucer support struts', 'saucer', (() => {
  const ss = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    ss.push(strut([9 * Math.cos(a), 138, 9 * Math.sin(a)], [18 * Math.cos(a), 150, 18 * Math.sin(a)], 1.4));
  }
  return ss;
})());

// --- Saucer: restaurant and observation as merged discs: 8 parts.
addPart('restaurant-disc', 'Restaurant disc', 'saucer', [
  cyl(21, 14, 8, 0, 150, 0, 24),
  cyl(21, 21, 3.5, 0, 153.5, 0, 24),
]);
addPart('loupe', 'The Loupe glass floor', 'saucer', [
  (() => { const g = new THREE.TorusGeometry(17, 1.6, 8, 32); g.rotateX(Math.PI / 2); g.translate(0, 152.5, 0); return g; })(),
]);
addPart('observation-disc', 'Observation disc', 'observation', [cyl(21, 21, 1.5, 0, 157, 0, 24)]);
addPart('observation-glass', 'Observation glass ring', 'observation', [
  (() => { const g = new THREE.CylinderGeometry(21.2, 21.2, 2.5, 24, 1, true); g.translate(0, 160.75, 0); return g; })(),
]);
addPart('observation-wall', 'Observation outer wall', 'observation', [
  (() => { const g = new THREE.CylinderGeometry(21, 21, 1.75, 24, 1, true); g.translate(0, 158.6, 0); return g; })(),
]);

// --- Roof, halo, mast: 5 parts.
addPart('roof', 'Roof', 'roof', [
  (() => { const g = new THREE.CylinderGeometry(1, 21, 7, 16, 1, true); g.translate(0, 165.5, 0); return g; })(),
]);
addPart('halo', 'Halo', 'roof', [
  (() => { const g = new THREE.TorusGeometry(22.5, 0.8, 8, 40); g.rotateX(Math.PI / 2); g.translate(0, 167, 0); return g; })(),
]);
addPart('mast', 'Mast', 'mast', [cyl(0.8, 1.2, 12, 0, 174, 0, 8)]);
{
  const rods = [];
  for (let r = 0; r < 25; r++) {
    const a = (r / 25) * Math.PI * 2;
    rods.push(cyl(0.08, 0.08, 4, 19 * Math.cos(a), 171, 19 * Math.sin(a), 5));
  }
  addPart('lightning-rods', 'Lightning rods', 'mast', rods);
}
addPart('beacon-and-flagpole', 'Beacon and flagpole', 'mast', [
  (() => { const g = new THREE.SphereGeometry(0.8, 8, 6); g.translate(0, 181, 0); return g; })(),
  cyl(0.06, 0.06, 6, 0, 183, 0, 5),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('leg-') || id === 'cross-braces') return '#f4f4f2';
  if (id === 'foundation' || id === 'leg-footings') return '#9aa0a6';
  if (id === 'plaza') return '#b9bdc2';
  if (id === 'base-building') return '#d5d8da';
  if (id === 'core' || id === 'elevator-shafts') return '#c9cdc9';
  if (id === 'elevator-cars') return '#bfe3ee';
  if (id === 'saucer-supports') return '#e8e8e6';
  if (id === 'restaurant-disc') return '#f4f4f2';
  if (id === 'loupe') return '#9fd4e8';
  if (id === 'observation-disc') return '#8a8f94';
  if (id === 'observation-glass') return '#bfe3ee';
  if (id === 'observation-wall') return '#f4f4f2';
  if (id === 'roof' || id === 'halo') return '#c0392b';
  if (id === 'mast') return '#8a8f94';
  if (id === 'lightning-rods') return '#5a5f64';
  if (id === 'beacon-and-flagpole') return '#c0392b';
  return '#d5d8da';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundation', name: 'Foundation and base', color: '#9aa0a6', description: 'The deep foundation, plaza, ground-level building and leg footings.' },
  { id: 'legs', name: 'Tripod legs', color: '#f4f4f2', description: 'The three tapering legs with their cross braces.' },
  { id: 'core', name: 'Central core and elevators', color: '#c9cdc9', description: 'The central core with the exterior elevator shafts and cars.' },
  { id: 'saucer', name: 'Top house, restaurant level', color: '#ffffff', description: 'The flying-saucer top house with the restaurant disc and The Loupe.' },
  { id: 'observation', name: 'Observation level', color: '#bfe3ee', description: 'The observation disc with its glass ring.' },
  { id: 'roof', name: 'Roof and halo', color: '#c0392b', description: 'The conical roof and the red halo ring.' },
  { id: 'mast', name: 'Mast and lightning protection', color: '#8a8f94', description: 'The mast with 25 lightning rods, beacon and flagpole.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'foundation': 'The foundation, dug 30 ft deep and anchored with 72 bolts. Exact extent is schematic.',
  'plaza': 'The plaza around the tower base. Schematic.',
  'base building': 'The ground-level building with retail space, as at the 1962 fair. Exact layout is schematic.',
  'leg footings': 'Concrete footings anchoring the three legs. Schematic.',
  'north leg': 'One of the three tapering steel legs, splaying at the base and pinching at the waist. Exact curve is schematic.',
  'southeast leg': 'One of the three tapering steel legs, splaying at the base and pinching at the waist. Exact curve is schematic.',
  'southwest leg': 'One of the three tapering steel legs, splaying at the base and pinching at the waist. Exact curve is schematic.',
  'cross braces': 'Horizontal braces tying the legs together against wind. The tower withstands 200 mph winds. Schematic.',
  'central core': 'The central service core. Schematic.',
  'elevator shafts': 'The three exterior glass elevator shafts; the ride to the top takes 41 seconds. Schematic.',
  'elevator cars': 'The elevator cars. Schematic.',
  'saucer support struts': 'Diagonal struts carrying the saucer. Schematic.',
  'restaurant disc': 'The restaurant level at 500 ft, home of the revolving SkyCity restaurant. Schematic.',
  'the loupe glass floor': 'The Loupe, the world\'s first revolving glass floor, added in 2018. Schematic.',
  'observation disc': 'The observation level at 520 ft (about 158 m). Schematic.',
  'observation glass ring': 'The floor-to-ceiling glass ring of the observation deck, from the 2018 renovation. Schematic.',
  'observation outer wall': 'The outer wall below the observation glass. Schematic.',
  'roof': 'The conical roof in Re-entry Red. Schematic.',
  'halo': 'The red halo ring crowning the top house. Schematic.',
  'mast': 'The central mast. Schematic.',
  'lightning rods': 'The 25 lightning rods on the roof. Exact positions are schematic.',
  'beacon and flagpole': 'The aviation beacon and the flagpole flying the American flag. Schematic.',
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
const binName = 'space-needle-simple-0.bin';
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
  scope: 'Space Needle, Seattle (simplified schematic)',
  title: 'Space Needle',
  location: 'Seattle, Washington, United States',
  blurb: 'Seattle\u2019s 1962 World\u2019s Fair observation tower in simplified schematic form: three tapering legs carry the 42 m saucer with its observation deck at 520 ft.',
  sourceUrls: [
    { label: 'Wikipedia: Space Needle', url: 'https://en.wikipedia.org/wiki/Space_Needle' },
    { label: 'HeightProfiles: Seattle Space Needle Height', url: 'https://heightprofiles.com/seattle-space-needle-height' },
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
  chunks: [{ url: '/models/space-needle-simple/space-needle-simple-0.bin', bytes: offset }],
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
