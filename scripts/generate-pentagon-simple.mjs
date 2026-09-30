// Procedural Pentagon (simple) for the Architectural Atlas.
//
// Simplified schematic Pentagon in the atlas binary format:
//   public/models/pentagon-simple/atlas.json
//   public/models/pentagon-simple/pentagon-simple-0.bin
//
// Same sourced dimensions as the detailed model (see
// ~/workspace/architectural-atlas/research/pentagon-attribution.md):
// five-sided, 921 ft outer walls, about 77 ft tall, five stories over two
// below-ground levels, five concentric rings A to E, ten radial corridors,
// 17.5 miles of corridors, about 6.5 million sq ft, Indiana limestone
// facade, five-acre courtyard, five entrances (Mall Terrace, River
// Terrace, Concourse, South Parking, Heliport), pentagon-shaped helipad on
// the northern side. Everything below is simplified massing; the copy
// says so honestly.
//
// This variant is modeled fresh: every ring is an exact trapezoidal prism
// (no overlaps), corridors are single spokes, and all part names and
// bounds differ from the detailed model.
//
// Model frame: x east, z south, y up, metres. Atlas scale S = 2.4 /
// longestDimension, computed from the finished geometry. Spread 1.3.
//
// Usage: node scripts/generate-pentagon-simple.mjs (run before the
// detailed generator; the detailed model freshness-gates against this one)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const { ExtrudeGeometry } = THREE;
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'pentagon-simple');
fs.mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------- helpers
const TAN36 = Math.tan(Math.PI / 5);
// Exact trapezoidal prism for one edge of a pentagonal band: outer apothem
// edge at aOut, inner at aIn, from y0 to y1. Sides lie on the angle
// bisectors, so five of these tile the band with no overlap.
function trapBand(aOut, aIn, y0, y1, edge) {
  const ho = aOut * TAN36, hi = aIn * TAN36;
  const shape = new THREE.Shape();
  shape.moveTo(-ho, aOut);
  shape.lineTo(ho, aOut);
  shape.lineTo(hi, aIn);
  shape.lineTo(-hi, aIn);
  shape.closePath();
  const g = new ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); // shape (x, y) -> world (x, extrude, -y)
  g.rotateY((-edge * 2 * Math.PI) / 5);
  g.translate(0, y0, 0);
  return g;
}
// Sloped trapezoidal roof prism over one edge: outer edge at yOut, inner at yIn.
function trapSlope(aOut, aIn, yOut, yIn, edge) {
  const ho = aOut * TAN36 + 1, hi = aIn * TAN36 + 1;
  const shape = new THREE.Shape();
  shape.moveTo(-ho, aOut);
  shape.lineTo(ho, aOut);
  shape.lineTo(hi, aIn);
  shape.lineTo(-hi, aIn);
  shape.closePath();
  const g = new ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.rotateX(Math.asin((yOut - yIn) / (aOut - aIn)));
  g.rotateY((-edge * 2 * Math.PI) / 5);
  g.translate(0, (yOut + yIn) / 2 - 0.3, 0);
  return g;
}
// Solid pentagonal disc with edges facing N, NE, SE, SW, NW.
function pentDisc(apothem, y0, y1) {
  const R = apothem / Math.cos(Math.PI / 5);
  const g = new THREE.CylinderGeometry(R, R, y1 - y0, 5, 1, false, (Math.PI * 4) / 5);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
function block(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function pillar(r, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.translate(x, y, z);
  return g;
}
// Radial spoke; deg is clockwise from north.
function spoke(a0, a1, w, y0, y1, deg) {
  const beta = (deg * Math.PI) / 180;
  const g = new THREE.BoxGeometry(w, y1 - y0, a1 - a0);
  g.rotateY(Math.PI - beta);
  const amid = (a0 + a1) / 2;
  g.translate(Math.sin(beta) * amid, (y0 + y1) / 2, -Math.cos(beta) * amid);
  return g;
}
// Mass aligned to a facade; edge 0 faces north.
function faceMass(edge, dist, w, d, y0, y1) {
  const alpha = (edge * 2 * Math.PI) / 5;
  const g = new THREE.BoxGeometry(w, y1 - y0, d);
  g.rotateY(-alpha);
  g.translate(Math.sin(alpha) * dist, (y0 + y1) / 2, -Math.cos(alpha) * dist);
  return g;
}

// ---------------------------------------------------------------- layout constants (metres)
const A_OUT = 193.2; // 921 ft outer wall
const H = 23.47; // about 77 ft
const COURT_A = 74.64; // five-acre courtyard apothem
const RISE = 3.2; // schematic roof rise
// Solid ring blocks, each swallowing its inner light well (coarse massing).
const BLOCKS = [
  ['E', 167.81, 193.2],
  ['D', 142.42, 167.81],
  ['C', 117.03, 142.42],
  ['B', 91.64, 117.03],
  ['A', 74.64, 91.64],
];
const ENTRANCE_NAMES = ['Mall side', 'River side', 'Concourse side', 'South parking side', 'Heliport side'];

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Solid ring blocks.
for (const [L, aIn, aOut] of BLOCKS) {
  const g = [];
  for (let e = 0; e < 5; e++) g.push(trapBand(aOut, aIn, 0, H, e));
  addPart(`ring-${L.toLowerCase()}-block`, `Ring ${L} solid block`, 's-rings', g);
}

// --- Ten corridor spokes as one merged part.
{
  const g = [];
  for (let j = 1; j <= 10; j++) g.push(spoke(74, 194.5, 5, 0, 24, 162 + (j - 1) * 36));
  addPart('corridor-spokes', 'Ten corridor spokes', 's-corridors', g);
}

// --- Courtyard.
addPart('courtyard-disc', 'Courtyard green disc', 's-courtyard', [pentDisc(COURT_A, 0, 0.6)]);
addPart('courtyard-cross', 'Courtyard path cross', 's-courtyard', [
  block(-70, 70, 0.6, 0.85, -3.5, 3.5),
  block(-3.5, 3.5, 0.6, 0.85, -70, 70),
]);

// --- Entrance masses.
ENTRANCE_NAMES.forEach((ename, i) => {
  addPart(`${['mall', 'river', 'concourse', 'south', 'heliport'][i]}-mass`, `${ename} entrance mass`, 's-entrances', [
    faceMass(i, 196, 34, 10, 0, 14),
  ]);
});
addPart('metro-block', 'Metro entrance block', 's-entrances', [faceMass(2, 215, 44, 22, 0, 7)]);

// --- Limestone shell, window ribbon, ceremonial terrace.
{
  const g = [];
  for (let e = 0; e < 5; e++) g.push(trapBand(A_OUT + 0.9, A_OUT - 0.3, 0, H, e));
  addPart('limestone-shell', 'Outer limestone shell', 's-facades', g);
}
{
  const g = [];
  for (let e = 0; e < 5; e++) {
    for (const [ry0, ry1] of [[6, 8], [11, 13], [16, 18]]) {
      const alpha = (e * 2 * Math.PI) / 5;
      const b = new THREE.BoxGeometry(2 * A_OUT * TAN36 - 8, ry1 - ry0, 0.4);
      b.rotateY(-alpha);
      b.translate(Math.sin(alpha) * (A_OUT + 0.95), (ry0 + ry1) / 2, -Math.cos(alpha) * (A_OUT + 0.95));
      g.push(b);
    }
  }
  addPart('window-ribbon', 'Window ribbon', 's-facades', g);
}
addPart('ceremonial-terrace', 'Ceremonial terrace', 's-facades', [block(-90, 90, 0, 1.2, -215, -193)]);

// --- Roof forms.
{
  const g = [];
  for (let e = 0; e < 5; e++) g.push(trapSlope(193.2, 176.2, H, H + RISE, e));
  addPart('outer-roof', 'Outer ring sloped roof', 's-roofs', g);
}
{
  const g = [];
  for (let e = 0; e < 5; e++) g.push(trapSlope(91.64, 74.64, H + RISE, H, e));
  addPart('inner-roof', 'Inner ring sloped roof', 's-roofs', g);
}
{
  const g = [];
  for (const [aIn, aOut] of [[100.03, 117.03], [125.42, 142.42], [150.81, 167.81]]) {
    for (let e = 0; e < 5; e++) g.push(trapBand(aOut, aIn, H, H + 0.6, e));
  }
  addPart('middle-roofs', 'Middle ring flat roofs', 's-roofs', g);
}

// --- Below ground.
addPart('basement-block', 'Basement block', 's-below', [pentDisc(A_OUT, -7, 0)]);
{
  const g = [];
  for (let gx = -6; gx <= 6; gx++) {
    for (let gz = -6; gz <= 6; gz++) {
      const x = gx * 30, z = gz * 30;
      let ap = 0;
      for (let e = 0; e < 5; e++) {
        const alpha = (e * 2 * Math.PI) / 5;
        ap = Math.max(ap, x * Math.sin(alpha) - z * Math.cos(alpha));
      }
      if (ap < 182) g.push(pillar(0.5, 7.5, x, -3.75, z, 8));
    }
  }
  addPart('pile-sample', 'Pile field sample', 's-below', g);
}

// --- Grounds.
addPart('south-apron', 'South parking apron', 's-grounds', [faceMass(3, 300, 230, 140, 0, 0.35)]);
addPart('north-apron', 'North parking apron', 's-grounds', [faceMass(1, 290, 190, 120, 0, 0.35)]);
{
  const pad = new THREE.CylinderGeometry(16, 16, 0.7, 5, 1, false, (Math.PI * 4) / 5);
  pad.translate(0, 0.35, -248);
  addPart('helipad', 'Helipad pentagon', 's-grounds', [pad]);
}
{
  const g = [];
  for (let e = 0; e < 5; e++) g.push(trapBand(262, 253, 0, 0.3, e));
  addPart('road-loop', 'Roadway loop', 's-grounds', g);
}
addPart('lagoon-water', 'River lagoon water', 's-grounds', [faceMass(1, 380, 100, 50, -0.5, 0.1)]);
addPart('memorial-ground', 'Memorial ground', 's-grounds', [faceMass(4, 280, 66, 42, 0, 0.45)]);
{
  const g = [];
  for (let r = 0; r < 3; r++) {
    for (let k = 0; k < 4; k++) {
      const alpha = (4 * 2 * Math.PI) / 5;
      const b = new THREE.BoxGeometry(3.2, 0.9, 1.1);
      b.rotateY(-alpha);
      b.translate(
        Math.sin(alpha) * 280 + Math.cos(alpha) * (-16 + k * 10),
        0.9,
        -Math.cos(alpha) * 280 + Math.sin(alpha) * (-16 + k * 10),
      );
      g.push(b);
    }
  }
  addPart('bench-rows', 'Bench rows', 's-grounds', g);
}
addPart('utility-block', 'Utility plant block', 's-grounds', [block(-30, 50, 0, 11, 289, 315)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.endsWith('-block')) return '#ddd5bd';
  if (id === 'corridor-spokes') return '#d5cdb4';
  if (id === 'courtyard-disc') return '#8fbf6f';
  if (id === 'courtyard-cross') return '#d9cfbb';
  if (id.endsWith('-mass') || id === 'metro-block') return '#d9cfbb';
  if (id === 'limestone-shell') return '#e8e0cc';
  if (id === 'window-ribbon') return '#4a5560';
  if (id === 'ceremonial-terrace') return '#d9cfbb';
  if (id === 'outer-roof' || id === 'inner-roof') return '#6b7a8a';
  if (id === 'middle-roofs') return '#b9b3a8';
  if (id === 'basement-block') return '#a8a096';
  if (id === 'pile-sample') return '#8a8478';
  if (id === 'south-apron' || id === 'north-apron') return '#9a9a98';
  if (id === 'helipad') return '#8a8f96';
  if (id === 'road-loop') return '#7a7a78';
  if (id === 'lagoon-water') return '#7fb3d5';
  if (id === 'memorial-ground') return '#cfc8b8';
  if (id === 'bench-rows') return '#e5ddc4';
  if (id === 'utility-block') return '#a89a80';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 's-rings', name: 'Concentric ring blocks', color: '#ded3b8', description: 'The five concentric rings as solid masses, A innermost to E outermost, shown without interior subdivision.' },
  { id: 's-corridors', name: 'Radial corridor spokes', color: '#c8bfa8', description: 'The ten radial corridors as simple spokes joining the rings.' },
  { id: 's-courtyard', name: 'Central courtyard', color: '#8fbf6f', description: 'The five-acre courtyard as a green disc with crossing paths.' },
  { id: 's-entrances', name: 'Entrance masses', color: '#d9cfbb', description: 'The five entrances and the Metro block as simple masses.' },
  { id: 's-facades', name: 'Limestone shell', color: '#e8e0cc', description: 'The Indiana limestone outer skin, window ribbon and ceremonial terrace.' },
  { id: 's-roofs', name: 'Roof forms', color: '#6b7a8a', description: 'Sloped slate roofs on the inner and outer rings, flat roofs between.' },
  { id: 's-below', name: 'Below ground', color: '#a8a096', description: 'Basement block and a sample pile field.' },
  { id: 's-grounds', name: 'Grounds', color: '#9aa08f', description: 'Parking aprons, roads, lagoon, helipad, memorial ground and utility block. All schematic.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'ring e solid block': 'Ring E as a solid mass: the outermost of the five concentric pentagonal rings. Interior walls, floors and windows are omitted in this simplified view.',
  'ring d solid block': 'Ring D as a solid mass, the second ring from the outside.',
  'ring c solid block': 'Ring C as a solid mass, the middle ring of the five.',
  'ring b solid block': 'Ring B as a solid mass, the second ring from the center.',
  'ring a solid block': 'Ring A as a solid mass: the innermost ring, facing the five-acre courtyard.',
  'ten corridor spokes': 'The ten radial corridors, numbered 1 to 10 in the real building, as simple spokes joining the rings. Together they total 17.5 miles.',
  'courtyard green disc': 'The five-acre central courtyard, nicknamed "ground zero", as a simple green disc.',
  'courtyard path cross': 'Crossing paths over the courtyard lawn. Layout is schematic.',
  'mall side entrance mass': 'Mall Terrace entrance on the north side, with its 600 ft ceremonial terrace, as a simple mass.',
  'river side entrance mass': 'River Terrace entrance on the northeast side, overlooking the lagoon, as a simple mass.',
  'concourse side entrance mass': 'Concourse entrance on the southeast side by the Metro station, the main visitor entrance, as a simple mass.',
  'south parking side entrance mass': 'South Parking entrance on the southwest facade, as a simple mass.',
  'heliport side entrance mass': 'Heliport entrance on the west side of the building, as a simple mass.',
  'metro entrance block': 'Block serving the Pentagon Metro station on the southeast side. Shape is schematic.',
  'outer limestone shell': 'The Indiana limestone skin of the outer walls; marble was barred from the building by President Roosevelt.',
  'window ribbon': 'A simplified ribbon standing in for the building\u2019s 7,754 windows.',
  'ceremonial terrace': 'The 600 ft ceremonial terrace outside the Mall entrance. Length is sourced; detailing is schematic.',
  'outer ring sloped roof': 'The crosshipped slate roof over the outer (E) ring, shown as five slopes. Pitch is schematic.',
  'inner ring sloped roof': 'The crosshipped slate roof over the inner (A) ring, shown as five slopes. Pitch is schematic.',
  'middle ring flat roofs': 'Flat built-up roof decks over the three middle rings (B, C, D).',
  'basement block': 'The two below-ground levels, B (basement) and M (mezzanine), as one block. Depth is schematic.',
  'pile field sample': 'A sample of the 41,492 concrete piles under the building. Only a fraction are shown.',
  'south parking apron': 'South parking apron, part of the 67 acres of parking for 8,770 vehicles. Outline is schematic.',
  'north parking apron': 'North parking apron by the River Terrace side. Outline is schematic.',
  'helipad pentagon': 'Pentagon Army Heliport: a pentagon-shaped 100 by 100 ft concrete helipad on the northern side of the building. Exact position is schematic.',
  'roadway loop': 'Access roadways around the reservation. Layout is schematic.',
  'river lagoon water': 'The lagoon below the River entrance, facing Washington. Shape is schematic.',
  'memorial ground': 'Ground of the September 11 memorial on the west side of the building. Layout is schematic.',
  'bench rows': 'A sample of the memorial benches honoring those killed on September 11, 2001. Arrangement is schematic.',
  'utility plant block': 'Utility plant block standing in for the heating and refrigeration plants. Shape and position are schematic.',
};

// ---------------------------------------------------------------- serialize
const gmin = [Infinity, Infinity, Infinity];
const gmax = [-Infinity, -Infinity, -Infinity];
for (const p of parts) {
  for (const g of p.geoms) {
    g.computeBoundingBox();
    const bb = g.boundingBox;
    for (let a = 0; a < 3; a++) {
      gmin[a] = Math.min(gmin[a], bb.min.getComponent(a));
      gmax[a] = Math.max(gmax[a], bb.max.getComponent(a));
    }
  }
}
const longestDimension = Math.max(gmax[0] - gmin[0], gmax[1] - gmin[1], gmax[2] - gmin[2]);
const S = 2.4 / longestDimension;
console.log(`Longest dimension ${longestDimension.toFixed(1)} m -> S = ${S.toExponential(3)}`);

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
const binName = 'pentagon-simple-0.bin';
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
  scope: 'The Pentagon, Arlington VA (simple schematic)',
  title: 'The Pentagon',
  location: 'Arlington, Virginia, United States',
  blurb: 'Headquarters of the US Department of Defense in simplified form: five solid pentagonal rings around a five-acre courtyard, ten corridor spokes, a limestone shell and slate roof slopes. Built 1941 to 1943 in about 16 months; about 6.5 million sq ft, among the largest office buildings in the world.',
  sourceUrls: [
    { label: 'Wikipedia: Pentagon (United States)', url: 'https://en.wikipedia.org/wiki/Pentagon_(United_States)' },
    { label: 'DoD: Renovation of the Pentagon (1999)', url: 'https://www.esd.whs.mil/Portals/54/Documents/FOID/Reading%20Room/Acquisition_Budget_and_Financial_Matters/Renovation_1March1999.pdf?ver=2017-05-15-134520-047' },
    { label: 'GlobalSecurity.org: The Pentagon', url: 'http://www.globalsecurity.org/military/facility/pentagon.htm' },
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
  chunks: [{ url: '/models/pentagon-simple/pentagon-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.3,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
