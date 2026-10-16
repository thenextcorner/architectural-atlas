// Simplified schematic Louvre Pyramid for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-louvre-pyramid.mjs, whose header
// lists every sourced dimension reused here), but coarser: 29 named parts
// across 6 systems instead of 101 across 7. Glass bands, ring beams and
// mullions are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-louvre-pyramid.mjs for the full attribution):
//   completed 1989, I. M. Pei, Grand Louvre; 21.6 m high, 34 m square
//   base; 603 rhombus + 70 triangular panes (673); 51.52 degree faces;
//   three smaller pyramids; Cour Napoleon.
// Schematic (not sourced, never stated as fact in the UI): exact band
// subdivision, small pyramid sizes and positions, pool and paving layout.
//
// Writes:
//   public/models/louvre-pyramid-simple/atlas.json
//   public/models/louvre-pyramid-simple/louvre-pyramid-simple-0.bin
//
// Usage: node scripts/generate-louvre-pyramid-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'louvre-pyramid-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (34 m base) maps to 2.4 units (same as detailed).
const S = 2.4 / 34;

const H = 21.6;
const HALF = 17;
const CORNER = HALF * Math.SQRT2;

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
function faceBand(k, y0, y1) {
  const rB = CORNER * (1 - y0 / H);
  const rT = CORNER * (1 - y1 / H);
  const g = new THREE.CylinderGeometry(rT, rB, y1 - y0, 4, 1, true, Math.PI / 4 + (k * Math.PI) / 2, Math.PI / 2);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const FACES = ['east', 'north', 'west', 'south'];

// --- Glass: 4 faces x 3 bands merged per face: 4 parts.
for (let k = 0; k < 4; k++) {
  const bands = [];
  for (let b = 0; b < 3; b++) {
    bands.push(faceBand(k, (b * H) / 3, ((b + 1) * H) / 3));
  }
  addPart(`glass-${FACES[k]}`, `${FACES[k]} glass`, 'glass', bands);
}
// --- Frame: 4 edge beams, ring beams merged, mullions merged, apex: 7 parts.
const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
const cornerNames = ['northeast', 'southeast', 'southwest', 'northwest'];
corners.forEach(([sx, sz], i) => {
  addPart(`edge-beam-${cornerNames[i]}`, `${cornerNames[i]} edge beam`, 'frame',
    [strut([sx * HALF, 0, sz * HALF], [0, H, 0], 0.5)]);
});
{
  const rings = [];
  for (const y of [H / 3, (2 * H) / 3]) {
    const hw = HALF * (1 - y / H) + 0.1;
    rings.push(box(-hw, hw, y - 0.2, y + 0.2, -hw, -hw + 0.4));
    rings.push(box(-hw, hw, y - 0.2, y + 0.2, hw - 0.4, hw));
    rings.push(box(-hw, -hw + 0.4, y - 0.2, y + 0.2, -hw, hw));
    rings.push(box(hw - 0.4, hw, y - 0.2, y + 0.2, -hw, hw));
  }
  addPart('ring-beams', 'Ring beams', 'frame', rings);
}
{
  const mull = [];
  for (let k = 0; k < 4; k++) {
    let prev = null;
    for (let s = 0; s <= 4; s++) {
      const y = (s * (H - 1.5)) / 4;
      const hw = HALF * (1 - y / H);
      let px, pz;
      if (k === 0) { px = hw; pz = 0; }
      else if (k === 1) { pz = hw; px = 0; }
      else if (k === 2) { px = -hw; pz = 0; }
      else { pz = -hw; px = 0; }
      if (prev) mull.push(strut(prev, [px, y, pz], 0.25));
      prev = [px, y, pz];
    }
  }
  addPart('mullions', 'Face mullions', 'frame', mull);
}
addPart('apex-cap', 'Apex cap', 'frame', [box(-0.9, 0.9, H - 0.5, H + 0.3, -0.9, 0.9)]);
// --- Base curb merged: 1 part.
addPart('base-curb', 'Base curb', 'base', [box(-HALF - 0.8, HALF + 0.8, -0.6, 0.4, -HALF - 0.8, HALF + 0.8)]);
// --- Small pyramids: 3 glass + 3 frames: 6 parts.
const SMALL = [
  { id: 'richelieu', name: 'Richelieu', x: -30, z: -26 },
  { id: 'sully', name: 'Sully', x: 30, z: -26 },
  { id: 'denon', name: 'Denon', x: 0, z: 34 },
];
for (const sp of SMALL) {
  const h = 7, half = 5.5, c = half * Math.SQRT2;
  const glass = [];
  for (let k = 0; k < 4; k++) {
    const g = new THREE.CylinderGeometry(0.01, c, h, 4, 1, true, Math.PI / 4 + (k * Math.PI) / 2, Math.PI / 2);
    g.translate(sp.x, h / 2, sp.z);
    glass.push(g);
  }
  addPart(`${sp.id}-glass`, `${sp.name} pyramid glass`, 'small-pyramids', glass);
  const frame = [];
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    frame.push(strut([sp.x + sx * half, 0, sp.z + sz * half], [sp.x, h, sp.z], 0.3));
  }
  addPart(`${sp.id}-frame`, `${sp.name} pyramid frame`, 'small-pyramids', frame);
}
// --- Pools merged: 2 parts.
{
  const basins = [], waters = [];
  for (const [x0, x1, z0, z1] of [[22, 34, -14, 14], [-34, -22, -14, 14], [-14, 14, 22, 34]]) {
    basins.push(box(x0, x1, -1.2, -0.2, z0, z1));
    waters.push(box(x0 + 0.3, x1 - 0.3, -0.25, 0, z0 + 0.3, z1 - 0.3));
  }
  addPart('pool-basins', 'Reflecting pool basins', 'pools', basins);
  addPart('pool-water', 'Reflecting pool water', 'pools', waters);
}
// --- Paving merged: 1 part. Lobby merged: 1 part.
addPart('courtyard-paving', 'Courtyard paving', 'courtyard', [box(-60, 60, -0.5, 0, -60, 60)]);
addPart('lobby-access', 'Underground lobby access', 'lobby', [box(-3, 3, -6, 0.5, -24, -18), box(-3, 3, -6, 0.5, 18, 24)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('glass')) return '#a8cddb';
  if (id.includes('water')) return '#7fb3c9';
  if (id.includes('edge-beam') || id.includes('ring') || id.includes('mullion') || id.includes('apex') || id.includes('frame')) return '#8f979e';
  if (id.includes('curb') || id.includes('basin')) return '#b9b3a6';
  if (id.includes('paving')) return '#c9c2b2';
  if (id.includes('lobby')) return '#9a958c';
  return '#b9b3a6';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'glass', name: 'Glass skin', color: '#a8cddb', description: 'The 673 panes of extra-clear Diamond Glass.' },
  { id: 'frame', name: 'Steel frame', color: '#8f979e', description: 'Edge beams, ring beams and mullions.' },
  { id: 'base', name: 'Base curb', color: '#b9b3a6', description: 'The curb the pyramid sits on.' },
  { id: 'small-pyramids', name: 'Small pyramids', color: '#a8cddb', description: 'The three smaller pyramids of the museum wings.' },
  { id: 'pools', name: 'Reflecting pools', color: '#7fb3c9', description: 'The reflecting pools (schematic).' },
  { id: 'courtyard', name: 'Courtyard paving', color: '#c9c2b2', description: 'The Cour Napoleon paving (schematic).' },
  { id: 'lobby', name: 'Underground lobby', color: '#9a958c', description: 'Lobby access (schematic).' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'east glass': 'The east glass face of the pyramid: 603 rhombus-shaped and 70 triangular panes of Saint-Gobain Diamond Glass across all four faces. Exact panel subdivision is schematic.',
  'north glass': 'The north glass face of the pyramid. Exact panel subdivision is schematic.',
  'west glass': 'The west glass face of the pyramid. Exact panel subdivision is schematic.',
  'south glass': 'The south glass face of the pyramid. Exact panel subdivision is schematic.',
  'ring beams': 'Horizontal ring beams tying the four faces together. Exact placement is schematic.',
  'face mullions': 'Vertical mullions stiffening each glass face. Exact layout is schematic.',
  'apex cap': 'The cap closing the pyramid at its 21.6 m apex. Exact form is schematic.',
  'base curb': 'The curb the pyramid sits on in the Cour Napoleon. Exact form is schematic.',
  'reflecting pool basins': 'The reflecting pool basins flanking the pyramid. Exact shapes are schematic.',
  'reflecting pool water': 'Water in the reflecting pools.',
  'courtyard paving': 'The paving of the Cour Napoleon. Exact layout is schematic.',
  'underground lobby access': 'Stair and escalator housings descending to the underground lobby. Exact form is schematic.',
};
for (const n of cornerNames) {
  explanations[`${n} edge beam`] = `The ${n} corner edge beam. The 51.52 degree face angle matches ancient Egyptian pyramids. Exact sizing is schematic.`;
}
for (const sp of SMALL) {
  explanations[`${sp.name.toLowerCase()} pyramid glass`] = `Glass of the smaller ${sp.name} wing pyramid. Exact size and position are schematic.`;
  explanations[`${sp.name.toLowerCase()} pyramid frame`] = `Frame of the smaller ${sp.name} wing pyramid. Exact size and position are schematic.`;
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
const binName = 'louvre-pyramid-simple-0.bin';
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
  scope: 'Louvre Pyramid, Paris (simplified schematic)',
  title: 'Louvre Pyramid',
  location: 'Paris, France',
  blurb: 'I. M. Pei\u2019s glass pyramid in simplified form: 21.6 m high on a 34 m base, with the three smaller pyramids and reflecting pools.',
  sourceUrls: [
    { label: 'Wikipedia: Louvre Pyramid', url: 'https://en.wikipedia.org/wiki/Louvre_Pyramid' },
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
  chunks: [{ url: '/models/louvre-pyramid-simple/louvre-pyramid-simple-0.bin', bytes: offset }],
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
