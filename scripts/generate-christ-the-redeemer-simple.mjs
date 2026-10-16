// Simplified schematic Christ the Redeemer for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-christ-the-redeemer.mjs, whose
// header lists every sourced dimension reused here), but coarser: 30 named
// parts across 6 systems instead of 104 across 8. Pedestal faces, drapery
// folds, fingers and toes are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-christ-the-redeemer.mjs for the full attribution):
//   30 m statue on 8 m pedestal, 38 m total, arms 28 m wide, 635 tons,
//   reinforced concrete with soapstone tiles, 1922-1931, Paul Landowski,
//   Heitor da Silva Costa, Albert Caquot, Gheorghe Leonida (face).
// Schematic (not sourced, never stated as fact in the UI): merged group
// geometry; simplified figure, pedestal, chapel and mountain forms.
//
// Writes:
//   public/models/christ-the-redeemer-simple/atlas.json
//   public/models/christ-the-redeemer-simple/christ-the-redeemer-simple-0.bin
//
// Usage: node scripts/generate-christ-the-redeemer-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'christ-the-redeemer-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (38 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 38;

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
function cyl(rt, rb, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function sph(r, x, y, z, w = 10, h = 8) {
  const g = new THREE.SphereGeometry(r, w, h);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const PED_H = 8, FOOT_Y = 8;

// Pedestal (4 parts)
addPart('pedestal-body', 'Octagonal pedestal', 'pedestal', [cyl(4.2, 4.5, 7.4, 0, 4.3, 0, 8)]);
addPart('pedestal-base-slab', 'Pedestal base slab', 'pedestal', [box(-5, 5, 0, 0.6, -5, 5)]);
addPart('pedestal-cornice', 'Pedestal cornice', 'pedestal', [cyl(4.6, 4.9, 0.7, 0, PED_H - 0.35, 0, 8)]);
addPart('chapel-door', 'Chapel door', 'pedestal', [box(-0.9, 0.9, 0.6, 3.4, 3.85, 4.15)]);

// Platform (2 parts)
addPart('platform-deck', 'Viewing deck', 'platform', [cyl(9, 9, 0.4, 0, 0.2, 0, 20)]);
{
  const rails = [];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const g = new THREE.BoxGeometry(11, 1.1, 0.12);
    g.rotateY(-a);
    g.translate(Math.cos(a) * 8.2, 1.0, Math.sin(a) * 8.2);
    rails.push(g);
  }
  addPart('platform-railings', 'Viewing deck railings', 'platform', rails);
}

// Legs and feet (4 parts)
for (const side of [-1, 1]) {
  const nm = side < 0 ? 'Left' : 'Right';
  const sl = nm.toLowerCase();
  const x = side * 1.15;
  addPart(`${sl}-leg`, `${nm} leg`, 'legs', [
    box(x - 0.75, x + 0.75, FOOT_Y + 6, FOOT_Y + 13, -0.9, 0.9),
    cyl(0.62, 0.75, 6, x, FOOT_Y + 3, 0, 8),
  ]);
  addPart(`${sl}-foot`, `${nm} foot`, 'legs', [
    box(x - 0.6, x + 0.6, FOOT_Y, FOOT_Y + 1.1, -0.5, 2.5),
  ]);
}

// Robe (5 parts)
addPart('torso', 'Robed torso', 'robe', [box(-2.5, 2.5, FOOT_Y + 12, FOOT_Y + 24.5, -1.5, 1.5)]);
addPart('robe-skirt', 'Robe skirt', 'robe', [cyl(1.9, 2.7, 7.5, 0, FOOT_Y + 9.5, 0, 10)]);
{
  const folds = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    folds.push(strut([Math.cos(a) * 2.35, FOOT_Y + 6.5, Math.sin(a) * 2.35],
      [Math.cos(a) * 2.7, FOOT_Y + 11.5, Math.sin(a) * 2.7], 0.6, 0.4));
  }
  addPart('drapery-folds', 'Drapery folds', 'robe', folds);
}
addPart('chest', 'Chest', 'robe', [box(-2.3, 2.3, FOOT_Y + 21, FOOT_Y + 24.5, -1.2, 1.4)]);
addPart('shoulders', 'Shoulders', 'robe', [sph(1.35, -2.9, FOOT_Y + 23.6, 0), sph(1.35, 2.9, FOOT_Y + 23.6, 0)]);

// Arms (6 parts)
for (const side of [-1, 1]) {
  const nm = side < 0 ? 'Left' : 'Right';
  const sl = nm.toLowerCase();
  addPart(`${sl}-arm`, `${nm} arm`, 'arms', [
    strut([side * 2.9, FOOT_Y + 23.4, 0], [side * 8, FOOT_Y + 23.8, 0.3], 1.5, 1.3),
    strut([side * 8, FOOT_Y + 23.8, 0.3], [side * 12.5, FOOT_Y + 24.1, 0.4], 1.15, 1.0),
    strut([side * 3.2, FOOT_Y + 22.6, 0], [side * 7.6, FOOT_Y + 23.0, 0.3], 1.9, 1.7),
  ]);
  addPart(`${sl}-hand`, `${nm} hand`, 'arms', [
    box(side < 0 ? -14 : 12.4, side < 0 ? -12.4 : 14, FOOT_Y + 23.5, FOOT_Y + 24.7, -0.15, 1.75),
  ]);
}

// Head (5 parts)
{
  const HY = FOOT_Y + 26.2;
  addPart('head', 'Head', 'head', [sph(1.55, 0, HY, 0.2, 12, 10)]);
  addPart('face', 'Face', 'head', [sph(1.32, 0, HY - 0.1, 0.75, 10, 8), box(-0.22, 0.22, HY - 0.5, HY + 0.35, 1.55, 2.05)]);
  addPart('hair', 'Hair', 'head', [sph(1.62, 0, HY + 0.55, -0.25, 10, 8), sph(0.85, -1.35, HY - 0.3, -0.15), sph(0.85, 1.35, HY - 0.3, -0.15)]);
  addPart('beard', 'Beard', 'head', [box(-0.8, 0.8, HY - 2.0, HY - 0.9, 0.9, 1.7)]);
  addPart('ears', 'Ears', 'head', [sph(0.32, -1.5, HY - 0.2, 0.1, 8, 6), sph(0.32, 1.5, HY - 0.2, 0.1, 8, 6)]);
}

// Mountain (2 parts)
addPart('peak-platform', 'Summit platform', 'mountain', [cyl(11, 13, 1.6, 0, -0.8, 0, 16)]);
addPart('peak-rock', 'Peak rock', 'mountain', [cyl(13, 18, 6, 0, -4.5, 0, 9), box(8, 20, -7, -1, -4, 4)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('pedestal')) return '#9a938a';
  if (id === 'chapel-door') return '#5a4a3a';
  if (id.startsWith('platform')) return '#8a8478';
  if (id.includes('leg') || id.includes('foot')) return '#b8ab98';
  if (id === 'torso' || id === 'chest' || id === 'shoulders') return '#cfc2a4';
  if (id === 'robe-skirt' || id === 'drapery-folds') return '#c4b89e';
  if (id.includes('arm')) return '#c9bc9f';
  if (id.includes('hand')) return '#bfae8e';
  if (id === 'head' || id === 'face') return '#d3c5a5';
  if (id === 'hair' || id === 'beard') return '#6a5a42';
  if (id === 'ears') return '#c9b992';
  if (id.startsWith('peak')) return '#7a7568';
  return '#c9bc9f';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'pedestal', name: 'Pedestal', color: '#9a938a', description: 'The 8 m octagonal stone pedestal.' },
  { id: 'platform', name: 'Viewing platform', color: '#8a8478', description: 'The viewing deck and railings.' },
  { id: 'legs', name: 'Legs and feet', color: '#b8ab98', description: 'The robed legs and feet.' },
  { id: 'robe', name: 'Robe', color: '#c9bc9f', description: 'Torso, skirt and drapery folds.' },
  { id: 'arms', name: 'Outstretched arms', color: '#c9bc9f', description: 'The 28 m span of open arms and hands.' },
  { id: 'head', name: 'Head', color: '#d3c5a5', description: 'Head, face, hair, beard and ears.' },
  { id: 'mountain', name: 'Corcovado peak', color: '#7a7568', description: 'Summit platform and rock.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'octagonal pedestal': 'The 8 m octagonal stone pedestal carrying the 30 m statue. Exact coursing is schematic.',
  'pedestal base slab': 'The base slab spreading the 635-ton load onto the summit. Exact foundation is schematic.',
  'pedestal cornice': 'The cornice crowning the pedestal. Exact profile is schematic.',
  'chapel door': 'The door to the Chapel of Nossa Senhora Aparecida inside the pedestal, consecrated 2006. Exact position is schematic.',
  'viewing deck': 'The viewing deck around the pedestal. Exact layout is schematic.',
  'viewing deck railings': 'The railings of the viewing deck. Exact design is schematic.',
  'left leg': 'The left leg beneath the robe. Exact form is schematic.',
  'right leg': 'The right leg beneath the robe. Exact form is schematic.',
  'left foot': 'The left foot on the plinth. Exact form is schematic.',
  'right foot': 'The right foot on the plinth. Exact form is schematic.',
  'robed torso': 'The robed torso; the statue is reinforced concrete faced with soapstone tiles. Exact drapery is schematic.',
  'robe skirt': 'The skirt of the robe. Exact folds are schematic.',
  'drapery folds': 'Sculpted drapery folds in the Art Deco manner. Exact arrangement is schematic.',
  'chest': 'The chest below the shoulders. Exact form is schematic.',
  'shoulders': 'The shoulders joining the outstretched arms. Exact form is schematic.',
  'left arm': 'The left arm, part of the 28 m span symbolizing peace. Exact form is schematic.',
  'right arm': 'The right arm, part of the 28 m span symbolizing peace. Exact form is schematic.',
  'left hand': 'The open left hand. Exact form is schematic.',
  'right hand': 'The open right hand. Exact form is schematic.',
  'head': 'The head fashioned by Gheorghe Leonida. Exact features are schematic.',
  'face': 'The serene face with nose, gazing over Rio. Exact features are schematic.',
  'hair': 'The hair. Exact styling is schematic.',
  'beard': 'The beard. Exact form is schematic.',
  'ears': 'The ears. Exact form is schematic.',
  'summit platform': 'The summit platform on Corcovado, 700 m up in Tijuca National Park. Exact form is schematic.',
  'peak rock': 'Rock of the Corcovado peak. Exact form is schematic.',
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
const binName = 'christ-the-redeemer-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Christ the Redeemer, Rio de Janeiro (simplified schematic)',
  title: 'Christ the Redeemer',
  location: 'Rio de Janeiro, Brazil',
  blurb: 'The 30 m Art Deco statue on Corcovado with 28 m of open arms, on an 8 m pedestal, in simplified schematic form.',
  sourceUrls: [{ label: 'Wikipedia: Christ the Redeemer', url: 'https://en.wikipedia.org/wiki/Christ_the_Redeemer' }],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/christ-the-redeemer-simple/christ-the-redeemer-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
