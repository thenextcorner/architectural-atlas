// Simplified schematic Great Mosque of Djenne for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-great-mosque-of-djenne.mjs, whose
// header lists every sourced dimension reused here), but coarser: 30
// named parts across 6 systems instead of 101 across 7. Minarets,
// buttresses, toron rows and interior pillars are merged into groups.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-great-mosque-of-djenne.mjs for the full attribution):
//   largest adobe building in the world, Sudano-Sahelian, current
//   structure 1907 under Ismaila Traore; 16 m max height; 75 x 75 m
//   platform raised 3 m; prayer hall 26 x 50 m with 90 pillars in 9
//   walls; three qibla minarets with cone spires and ostrich eggs;
//   toron palm beams as scaffolding; annual replastering festival.
// Schematic (not sourced, never stated as fact in the UI): wall
// thicknesses, buttress counts, toron counts, stair widths, interior
// layout, vent and door positions.
//
// Writes:
//   public/models/great-mosque-of-djenne-simple/atlas.json
//   public/models/great-mosque-of-djenne-simple/great-mosque-of-djenne-simple-0.bin
//
// Usage: node scripts/generate-great-mosque-of-djenne-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'great-mosque-of-djenne-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (75 m platform) maps to 2.4 units (same
// as detailed).
const S = 2.4 / 80;

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
function cone(r, h, x, y, z, seg = 6) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  return g;
}
function toronRow(from, to, y, fixed, dir, n) {
  const gs = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const along = from + (to - from) * t;
    const g = new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6);
    if (dir === 'E' || dir === 'W') {
      g.rotateZ(Math.PI / 2);
      g.translate((dir === 'E' ? fixed + 0.5 : fixed - 0.5), y, along);
    } else {
      g.rotateX(Math.PI / 2);
      g.translate(along, y, (dir === 'S' ? fixed + 0.5 : fixed - 0.5));
    }
    gs.push(g);
  }
  return gs;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const PY = 3;

// Platform and stairs (merged).
addPart('platform', 'Platform', 'platform', [
  box(-37.5, 37.5, 0, PY, -37.5, 37.5),
]);
addPart('platform-edge', 'Platform edge', 'platform', [
  box(-38.2, 38.2, 2.4, PY, -38.2, 38.2),
]);
{
  const steps = [];
  for (const [off, side] of [[-20, 'N'], [20, 'N'], [-20, 'S'], [20, 'S'], [-15, 'W'], [15, 'W']]) {
    for (let s = 0; s < 5; s++) {
      const t = s / 4;
      if (side === 'N') steps.push(box(off - 3, off + 3, t * PY * 0.8, PY, -41.5 + s * 0.8, -40.7 + s * 0.8));
      else if (side === 'S') steps.push(box(off - 3, off + 3, t * PY * 0.8, PY, 40.7 - s * 0.8, 41.5 - s * 0.8));
      else steps.push(box(-41.5 + s * 0.8, -40.7 + s * 0.8, t * PY * 0.8, PY, off - 3, off + 3));
    }
  }
  addPart('staircases', 'Staircases', 'platform', steps);
}

// Qibla wall with three minarets (merged groups).
addPart('qibla-wall', 'Qibla wall', 'qibla-wall', [box(24, 27, PY, 12, -33, 33)]);
{
  const shafts = [], spires = [], eggs = [];
  for (const [mz, mh] of [[-21, 13.5], [0, 16], [21, 13.5]]) {
    const mx = 25.5;
    shafts.push(box(mx - 3.2, mx + 3.2, PY, PY + mh - 4, mz - 3.2, mz + 3.2));
    spires.push(cone(2.4, 4, mx, PY + mh - 2, mz, 8));
    const egg = new THREE.SphereGeometry(0.45, 8, 6);
    egg.scale(1, 1.3, 1);
    egg.translate(mx, PY + mh + 0.4, mz);
    eggs.push(egg);
  }
  addPart('minaret-shafts', 'Minaret shafts', 'minarets', shafts);
  addPart('minaret-spires', 'Minaret spires', 'minarets', spires);
  addPart('ostrich-eggs', 'Ostrich egg finials', 'minarets', eggs);
}
addPart('qibla-pilasters', 'Qibla pilasters', 'qibla-wall', [
  ...[-28, -12, 12, 28].map((bz) => box(23.4, 27.6, PY, 12.6, bz - 1.1, bz + 1.1)),
]);
addPart('qibla-toron', 'Qibla toron beams', 'toron', [
  ...toronRow(-33, 33, 10, 27, 'E', 20),
  ...toronRow(-33, 33, 6.5, 27, 'E', 20),
]);

// Outer walls (merged).
addPart('north-wall', 'North wall', 'outer-walls', [box(-33, 24, PY, 11, -33, -30)]);
addPart('south-wall', 'South wall', 'outer-walls', [box(-33, 24, PY, 11, 30, 33)]);
addPart('west-wall', 'West wall', 'outer-walls', [box(-27, -24, PY, 11, -33, 33)]);
addPart('buttresses-north', 'North buttresses', 'outer-walls', [
  ...[-28, -16, -4, 8, 20].map((bx) => box(bx - 1.2, bx + 1.2, PY, 11.6, -33.6, -29.4)),
]);
addPart('buttresses-south', 'South buttresses', 'outer-walls', [
  ...[-28, -16, -4, 8, 20].map((bx) => box(bx - 1.2, bx + 1.2, PY, 11.6, 29.4, 33.6)),
]);
addPart('buttresses-west', 'West buttresses', 'outer-walls', [
  ...[-24, -10, 4, 18].map((bz) => box(-27.6, -23.4, PY, 11.6, bz - 1.2, bz + 1.2)),
]);
addPart('toron-north', 'North toron beams', 'toron', [...toronRow(-32, 32, 9, -33, 'N', 18)]);
addPart('toron-south', 'South toron beams', 'toron', [...toronRow(-32, 32, 9, 33, 'S', 18)]);
addPart('toron-west', 'West toron beams', 'toron', [...toronRow(-32, 32, 9, -27, 'W', 16)]);
addPart('merlons', 'Wall merlons', 'outer-walls', [
  ...[-30, -18, -6, 6, 18].map((bx) => cone(0.55, 1.1, bx, 11.9, -31.5, 5)),
  ...[-30, -18, -6, 6, 18].map((bx) => cone(0.55, 1.1, bx, 11.9, 31.5, 5)),
]);
addPart('doors', 'Doors', 'outer-walls', [
  ...[-20, -8, 4, 16].map((dx) => box(dx - 1, dx + 1, PY, PY + 3.4, -31.6, -30)),
  ...[-20, -8, 4, 16].map((dx) => box(dx - 1, dx + 1, PY, PY + 3.4, 30, 31.6)),
  ...[-18, -6, 6, 18].map((dz) => box(-27, -25.4, PY, PY + 3.4, dz - 1, dz + 1)),
]);

// Prayer hall interior (merged).
{
  const pillars = [];
  for (let w = 0; w < 9; w++) {
    const wx = -18 + w * 4.5;
    for (let s = 0; s < 10; s++) {
      const pz = -22.5 + s * 5;
      pillars.push(box(wx - 0.9, wx + 0.9, PY, 10.5, pz - 0.9, pz + 0.9));
    }
  }
  addPart('prayer-hall-pillars', 'Prayer hall pillars', 'prayer-hall', pillars);
}
addPart('prayer-hall-roof', 'Prayer hall roof', 'prayer-hall', [box(-22, 22, 12, 12.8, -27, 27)]);
addPart('roof-vents', 'Roof vents', 'prayer-hall', [
  ...[-14, 0, 14].map((vx) => cyl(0.5, 0.7, 1.2, vx, 13.2, -10, 6)),
  ...[-14, 0, 14].map((vx) => cyl(0.5, 0.7, 1.2, vx, 13.2, 10, 6)),
]);
addPart('west-entrance', 'West entrance', 'outer-walls', [
  box(-27.6, -23.4, PY, 10, -4, 4),
  cone(2.2, 2.4, -25.5, 11, 0, 6),
]);
addPart('mihrabs', 'Mihrab niches', 'prayer-hall', [
  ...[-21, 0, 21].map((mz) => box(22.5, 24, PY, PY + 4, mz - 1.6, mz + 1.6)),
]);

// Courtyard (merged).
addPart('courtyard', 'Courtyard and galleries', 'courtyard', [
  box(-33, -22, PY, PY + 0.4, -27, 27),
  box(-33, -22, PY, 9, -30, -27),
  box(-33, -22, PY, 9, 27, 30),
  box(-33, -30, PY, 9, -27, 27),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('ostrich') || id.includes('egg')) return '#e8e0cc';
  if (id.includes('toron')) return '#6b4f2e';
  if (id.includes('spire') || id.includes('merlon')) return '#c9a876';
  if (id === 'platform') return '#b99a6e';
  if (id.includes('stair')) return '#c2a173';
  if (id.includes('mihrab')) return '#a8814f';
  if (id.includes('pillar') || id.includes('prayer-hall-roof')) return '#8f6f45';
  if (id.includes('courtyard')) return '#bd9c6d';
  if (id.includes('door')) return '#4a3826';
  return '#c7a06f';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'platform', name: 'Platform and stairs', color: '#b99a6e', description: 'The raised platform with its staircases.' },
  { id: 'qibla-wall', name: 'Qibla wall', color: '#c7a06f', description: 'The east prayer wall with its pilasters.' },
  { id: 'minarets', name: 'Minarets', color: '#c9a876', description: 'The three great minarets with spires and ostrich eggs.' },
  { id: 'toron', name: 'Toron beams', color: '#6b4f2e', description: 'Palm-stick scaffolding beams on the walls.' },
  { id: 'outer-walls', name: 'Outer walls', color: '#c7a06f', description: 'The north, south and west walls with buttresses, merlons and doors.' },
  { id: 'prayer-hall', name: 'Prayer hall', color: '#8f6f45', description: 'The prayer hall interior with its pillars, roof and mihrabs.' },
  { id: 'courtyard', name: 'Courtyard', color: '#bd9c6d', description: 'The interior courtyard with galleries.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'platform': 'The 75 x 75 m platform, raised 3 m against the Bani floods.',
  'platform edge': 'The edge course of the raised platform. Exact profile is schematic.',
  'staircases': 'The six pinnacled staircases up to the platform. Exact positions are schematic.',
  'qibla wall': 'The east qibla wall, the prayer wall facing Mecca. Exact breaks are schematic.',
  'minaret shafts': 'The three great box-like minaret shafts jutting from the qibla wall, the central about 16 m tall. Exact profiles are schematic.',
  'minaret spires': 'The cone-shaped spires crowning the minarets. Exact forms are schematic.',
  'ostrich egg finials': 'The ostrich egg finials atop the minaret spires, symbols of fertility and purity.',
  'qibla pilasters': 'Pilaster buttresses stiffening the qibla wall. Exact count is schematic.',
  'qibla toron beams': 'Toron palm-stick beams on the qibla wall, scaffolding for the annual replastering. Exact count is schematic.',
  'north wall': 'The north outer wall. Exact breaks are schematic.',
  'south wall': 'The south outer wall. Exact breaks are schematic.',
  'west wall': 'The west outer wall. Exact breaks are schematic.',
  'wall buttresses': 'Rectangular buttresses on the outer walls. Exact count and spacing are schematic.',
  'north buttresses': 'Rectangular buttresses on the north wall. Exact count is schematic.',
  'south buttresses': 'Rectangular buttresses on the south wall. Exact count is schematic.',
  'west buttresses': 'Rectangular buttresses on the west wall. Exact count is schematic.',
  'wall toron beams': 'Toron beams on the outer walls. Exact count is schematic.',
  'north toron beams': 'Toron beams on the north wall. Exact count is schematic.',
  'south toron beams': 'Toron beams on the south wall. Exact count is schematic.',
  'west toron beams': 'Toron beams on the west wall. Exact count is schematic.',
  'wall merlons': 'Cone-capped merlons crowning the walls. Exact count is schematic.',
  'doors': 'Doors around the mosque, part of the 36 doors. Exact count and positions are schematic.',
  'prayer hall pillars': 'The 90 massive pillars of the prayer hall, formed by nine interior walls with pointed arches.',
  'prayer hall roof': 'The mud-covered prayer hall roof on rodier-palm beams. Exact build-up is schematic.',
  'roof vents': 'Ventilation caps on the roof that let hot air escape. Exact count is schematic.',
  'west entrance': 'The entrance portal in the west wall. Exact form is schematic.',
  'mihrab niches': 'Mihrab niches in the qibla wall marking the direction of Mecca. Exact forms are schematic.',
  'courtyard and galleries': 'The interior courtyard with galleries on three sides. Exact forms are schematic.',
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
const binName = 'great-mosque-of-djenne-simple-0.bin';
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
  scope: 'Great Mosque of Djenne, Mali (simplified schematic)',
  title: 'Great Mosque of Djenne',
  location: 'Djenne, Mali',
  blurb: 'The largest adobe building in the world in simplified schematic form: platform, qibla wall with three minarets and ostrich eggs, toron beams and the pillared prayer hall.',
  sourceUrls: [
    { label: 'Wikipedia: Great Mosque of Djenne', url: 'https://en.wikipedia.org/wiki/Great_Mosque_of_Djenne' },
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
  chunks: [{ url: '/models/great-mosque-of-djenne-simple/great-mosque-of-djenne-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
