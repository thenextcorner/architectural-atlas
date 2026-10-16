// Simplified schematic Sydney Harbour Bridge for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-sydney-harbour-bridge.mjs, whose
// header lists every sourced dimension reused here), but coarser:
// 30 named parts across 7 systems instead of 146 across 8. Arch panels,
// hangers, deck segments and trestles are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated
// here, see generate-sydney-harbour-bridge.mjs for the full attribution):
//   steel through arch bridge, John Bradfield, Dorman Long, completed
//   19 January 1932, opened 19 March 1932, "the Coathanger"; arch span
//   503 m, top of arch 134 m above sea level, beacon 141 m; total length
//   1149 m; deck 49 m wide, widest long-span bridge until 2006; 49 m
//   shipping clearance; four pylons 89 m, concrete with granite facing,
//   on abutment towers 68 m by 48-49 m; 28 arch panels of 18.28 m;
//   hangers 7.3 to 58.8 m; about 6,000,000 rivets; 52,800 tonnes of
//   steelwork; four main bearings at 20,000 tonnes each on 4.2 m pins;
//   arch moves 18 cm with temperature; Jack Lang opened it after
//   Francis de Groot slashed the ribbon with his sword.
// Schematic (not sourced, never stated as fact in the UI): parabolic
// arch profile and rib depth; merged group geometry; hanger and deck
// dimensions; pylon, trestle and skewback forms; paint shade.
//
// Writes:
//   public/models/sydney-harbour-bridge-simple/atlas.json
//   public/models/sydney-harbour-bridge-simple/sydney-harbour-bridge-simple-0.bin
//
// Usage: node scripts/generate-sydney-harbour-bridge-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'sydney-harbour-bridge-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (1149 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 1150;

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

// ---------------------------------------------------------------- arch geometry
const SPAN = 503;
const HALF = SPAN / 2;
const CROWN = 134;
const SPRING = 20;
const RIB_D = 20;
const RIB_Z = 20;
const DECK_Y = 56;
const PANELS = 28;
const PANEL_W = SPAN / PANELS;

function archTop(x) {
  const r = x / HALF;
  return CROWN - (CROWN - SPRING) * r * r;
}
function archBot(x) {
  return archTop(x) - RIB_D;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Arch ribs merged per rib: 2 parts.
for (const side of [-1, 1]) {
  const z = RIB_Z * side;
  const geoms = [];
  for (let i = 0; i < PANELS; i++) {
    const x0 = -HALF + i * PANEL_W;
    const x1 = -HALF + (i + 1) * PANEL_W;
    geoms.push(strut([x0, archTop(x0), z], [x1, archTop(x1), z], 3.2, 3.2));
    geoms.push(strut([x0, archBot(x0), z], [x1, archBot(x1), z], 3.2, 3.2));
    geoms.push(strut([x0, archBot(x0), z], [x0, archTop(x0), z], 2.2, 2.2));
    geoms.push(strut([x0, archBot(x0), z], [x1, archTop(x1), z], 1.8, 1.8));
  }
  addPart(`arch-${side < 0 ? 'west' : 'east'}-rib`, `Arch ${side < 0 ? 'west' : 'east'} rib`, 'arch', geoms);
}

// --- Lateral bracing merged: 1 part.
{
  const geoms = [];
  for (let i = 0; i < PANELS; i++) {
    const x = -HALF + (i + 0.5) * PANEL_W;
    const y = archTop(x) - RIB_D / 2;
    geoms.push(strut([x, y, -RIB_Z], [x, y, RIB_Z], 1.6, 1.6));
  }
  addPart('lateral-bracing', 'Lateral bracing', 'arch', geoms);
}

// --- Hangers merged per side: 2 parts.
for (const side of [-1, 1]) {
  const z = RIB_Z * side;
  const geoms = [];
  for (let i = 0; i <= PANELS; i++) {
    const x = -HALF + i * PANEL_W;
    const yB = archBot(x);
    if (yB <= DECK_Y + 2) continue;
    geoms.push(strut([x, yB, z], [x, DECK_Y, z], 1.1, 1.1));
  }
  addPart(`${side < 0 ? 'west' : 'east'}-hangers`, `${side < 0 ? 'West' : 'East'} hangers`, 'arch', geoms);
}

// --- Deck: main span in 3 segments, 2 approach decks, tracks, paths, parapets: 11 parts.
for (let i = 0; i < 3; i++) {
  const x0 = -HALF + (i * SPAN) / 3;
  const x1 = -HALF + ((i + 1) * SPAN) / 3;
  addPart(`deck-segment-${i + 1}`, `Deck segment ${i + 1}`, 'deck', [
    box(x0, x1, DECK_Y - 7, DECK_Y, -24.5, 24.5),
  ]);
}
for (const [side, sName] of [[-1, 'South'], [1, 'North']]) {
  const x0 = Math.min(side * HALF, side * (HALF + 323));
  const x1 = Math.max(side * HALF, side * (HALF + 323));
  addPart(`${sName.toLowerCase()}-approach-deck`, `${sName} approach deck`, 'deck', [
    box(x0, x1, DECK_Y - 7, DECK_Y, -24.5, 24.5),
  ]);
}
addPart('rail-tracks', 'Rail tracks', 'deck', [
  box(-HALF - 323, HALF + 323, DECK_Y, DECK_Y + 0.5, -14, -11),
  box(-HALF - 323, HALF + 323, DECK_Y, DECK_Y + 0.5, 11, 14),
]);
addPart('cycleway', 'Cycleway', 'deck', [
  box(-HALF - 323, HALF + 323, DECK_Y, DECK_Y + 0.4, -21, -18),
]);
addPart('footway', 'Footway', 'deck', [
  box(-HALF - 323, HALF + 323, DECK_Y, DECK_Y + 0.4, 18, 21),
]);
for (const side of [-1, 1]) {
  const z = side * 24.5;
  addPart(`${side < 0 ? 'west' : 'east'}-parapet`, `${side < 0 ? 'West' : 'East'} parapet`, 'deck', [
    box(-HALF - 323, HALF + 323, DECK_Y, DECK_Y + 1.6, z - 0.6, z + 0.6),
  ]);
}

// --- Pylons: 4 shafts + 4 caps = 8 parts.
for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
  const x = sx * (HALF + 8.5);
  const z = sz * 30;
  const q = `${sx < 0 ? 'south' : 'north'}-${sz < 0 ? 'west' : 'east'}`;
  const Q = `${sx < 0 ? 'South' : 'North'}-${sz < 0 ? 'west' : 'east'}`;
  addPart(`${q}-pylon-shaft`, `${Q} pylon shaft`, 'pylons', [
    box(x - 6, x + 6, 0, 80, z - 6, z + 6),
  ]);
  addPart(`${q}-pylon-cap`, `${Q} pylon cap`, 'pylons', [
    box(x - 7.5, x + 7.5, 80, 89, z - 7.5, z + 7.5),
  ]);
}

// --- Approaches: trestles merged per side: 2 parts.
for (const side of [-1, 1]) {
  const geoms = [];
  for (let i = 0; i < 4; i++) {
    const x = side * (HALF + 60 + i * 107.7);
    geoms.push(box(x - 3, x + 3, 0, DECK_Y - 7, -22, 22));
  }
  addPart(`${side < 0 ? 'south' : 'north'}-trestles`, `${side < 0 ? 'South' : 'North'} approach trestles`, 'approaches', geoms);
}

// --- Foundations: skewbacks and bearings merged: 2 parts.
{
  const skews = [];
  const bearings = [];
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const x = sx * HALF;
    const z = sz * RIB_Z;
    skews.push(box(x - 14, x + 14, -6, SPRING - 2, z - 8, z + 8));
    bearings.push(box(x - 3, x + 3, SPRING - 4, SPRING + 1, z - 3, z + 3));
  }
  addPart('skewbacks', 'Skewbacks', 'foundations', skews);
  addPart('main-bearings', 'Main bearings', 'foundations', bearings);
}

// --- Beacon: 1 part.
addPart('aircraft-beacon', 'Aircraft beacon', 'details', [
  box(-1, 1, CROWN, CROWN + 7, -1, 1),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('pylon')) return '#cfc7b4';
  if (id === 'rail-tracks') return '#3f4449';
  if (id === 'cycleway') return '#4a6b8a';
  if (id === 'footway') return '#8a8f96';
  if (id === 'skewbacks') return '#9a958a';
  if (id === 'main-bearings') return '#4a4d52';
  if (id.includes('trestles')) return '#7d8894';
  if (id.includes('deck')) return '#5d6a75';
  if (id.includes('parapet')) return '#6e7a86';
  if (id === 'aircraft-beacon') return '#c23b2e';
  if (id.includes('hanger')) return '#75828d';
  if (id === 'lateral-bracing') return '#6b7683';
  return '#7d8894';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'arch', name: 'Arch', color: '#7d8894', description: 'The 503 m steel arch: two ribs in 28 panels, lateral bracing and hangers, rising 134 m above the harbour.' },
  { id: 'deck', name: 'Deck', color: '#5d6a75', description: 'The 49 m wide deck with parapets across the 1149 m bridge.' },
  { id: 'pylons', name: 'Pylons', color: '#cfc7b4', description: 'The four decorative 89 m pylons, concrete faced with granite.' },
  { id: 'approaches', name: 'Approach trestles', color: '#7d8894', description: 'The steel trestles carrying the approach spans on each shore.' },
  { id: 'foundations', name: 'Foundations and bearings', color: '#9a958a', description: 'The concrete skewbacks and the four main bearings.' },
  { id: 'details', name: 'Beacon', color: '#c23b2e', description: 'The aircraft beacon at 141 m.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'arch west rib': 'The west arch rib: one of two 503 m steel ribs, each built in 28 panels of 18.28 m and rising 134 m above the harbour. Exact truss member sizes are schematic.',
  'arch east rib': 'The east arch rib: one of two 503 m steel ribs, each built in 28 panels of 18.28 m. Exact truss member sizes are schematic.',
  'lateral bracing': 'The cross-bracing tying the two arch ribs together against wind loads. Exact bracing pattern is schematic.',
  'west hangers': 'The west row of vertical hangers carrying the deck from the arch. The real hangers run from 7.3 m to 58.8 m; modeled lengths are schematic.',
  'east hangers': 'The east row of vertical hangers carrying the deck from the arch. Modeled lengths are schematic.',
  'deck segment 1': 'Western third of the main-span deck, 49 m wide. Exact lane arrangement is schematic.',
  'deck segment 2': 'Central third of the main-span deck. Exact lane arrangement is schematic.',
  'deck segment 3': 'Eastern third of the main-span deck. Exact lane arrangement is schematic.',
  'rail tracks': 'The two rail tracks carried on the deck. Exact track positions are schematic.',
  'cycleway': 'The cycleway on the deck. Exact position is schematic.',
  'footway': 'The pedestrian footway on the deck. Exact position is schematic.',
  'south approach deck': 'The south approach deck, part of the 1149 m total length. Exact span arrangement is schematic.',
  'north approach deck': 'The north approach deck, part of the 1149 m total length. Exact span arrangement is schematic.',
  'west parapet': 'The west parapet along the deck. Exact parapet form is schematic.',
  'east parapet': 'The east parapet along the deck. Exact parapet form is schematic.',
  'south-west pylon shaft': 'The shaft of the south-west pylon: the four decorative pylons stand 89 m above mean sea level, concrete faced with granite. Exact cross-section is schematic.',
  'south-west pylon cap': 'The cap of the south-west pylon. The pylons are decorative; the arch thrust goes into the skewbacks. Exact cap form is schematic.',
  'south-east pylon shaft': 'The shaft of the south-east pylon, concrete faced with granite. Exact cross-section is schematic.',
  'south-east pylon cap': 'The cap of the south-east pylon. Exact cap form is schematic.',
  'north-west pylon shaft': 'The shaft of the north-west pylon, concrete faced with granite. Exact cross-section is schematic.',
  'north-west pylon cap': 'The cap of the north-west pylon. Exact cap form is schematic.',
  'north-east pylon shaft': 'The shaft of the north-east pylon, concrete faced with granite. Exact cross-section is schematic.',
  'north-east pylon cap': 'The cap of the north-east pylon. Exact cap form is schematic.',
  'south approach trestles': 'The steel trestles carrying the south approach spans. Exact trestle form is schematic.',
  'north approach trestles': 'The steel trestles carrying the north approach spans. Exact trestle form is schematic.',
  'skewbacks': 'The concrete skewback foundations, founded in sandstone 12 m deep, taking the arch thrust. Exact block shapes are schematic.',
  'main bearings': 'The four main bearings, carrying about 20,000 tonnes each on 4.2 m pins and letting the arch move 18 cm with temperature. Exact bearing design is schematic.',
  'aircraft beacon': 'The aircraft warning beacon at 141 m above sea level. Exact beacon design is schematic.',
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
const binName = 'sydney-harbour-bridge-simple-0.bin';
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
  scope: 'Sydney Harbour Bridge, Sydney (simplified schematic)',
  title: 'Sydney Harbour Bridge',
  location: 'Sydney, Australia',
  blurb: 'The steel through arch bridge across Sydney Harbour, opened 19 March 1932, in simplified schematic form: the 503 m arch, hangers, 49 m deck, granite-faced pylons and skewback foundations.',
  sourceUrls: [
    { label: 'Wikipedia: Sydney Harbour Bridge', url: 'https://en.wikipedia.org/wiki/Sydney_Harbour_Bridge' },
    { label: 'Archive.org: The Story of the Sydney Harbour Bridge, 50th Anniversary', url: 'https://archive.org/stream/the-story-of-the-sydney-harbour-bridge-50-th.-anniversary-1932-1982/The%20Story%20of%20the%20Sydney%20Harbour%20Bridge%2C%2050%20th.%20Anniversary%2C%201932%20-%201982_djvu.txt' },
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
  chunks: [{ url: '/models/sydney-harbour-bridge-simple/sydney-harbour-bridge-simple-0.bin', bytes: offset }],
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
