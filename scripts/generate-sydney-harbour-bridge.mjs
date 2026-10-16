// Procedural Sydney Harbour Bridge for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Sydney Harbour Bridge in
// code and writes it in the atlas binary format:
//   public/models/sydney-harbour-bridge/atlas.json
//   public/models/sydney-harbour-bridge/sydney-harbour-bridge-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   Steel through arch bridge across Sydney Harbour, carrying road,
//   rail, cycle and pedestrian traffic between the Sydney CBD and the
//   North Shore; designed under chief engineer John Bradfield, built by
//   Dorman Long; construction completed 19 January 1932, opened
//   19 March 1932; nicknamed "the Coathanger"; arch span 503 m, top of
//   arch 134 m above mean sea level, aircraft beacon 141 m; total length
//   1149 m including approach spans; deck 49 m wide (48.8 m), the
//   widest long-span bridge in the world until 2006; 49 m clearance for
//   shipping; four decorative pylons 89 m above mean sea level, concrete
//   faced with granite, standing on abutment towers 68 m across and
//   48-49 m long; 28 arch panels of 18.28 m; hangers from 7.3 m (shortest)
//   to 58.8 m (longest); about 6,000,000 rivets; 52,800 tonnes of
//   steelwork including 39,000 tonnes in the arch; four main bearings
//   carrying about 20,000 tonnes each on 4.2 m pins; arch may rise or
//   fall 18 cm with temperature; deck expansion allowance 420 mm;
//   foundations in sandstone 12 m deep with 36 m anchoring tunnels;
//   opened by NSW Premier Jack Lang after Captain Francis de Groot of
//   the New Guard slashed the ribbon with his sword.
//   (Sources: "The Story of the Sydney Harbour Bridge, 50th Anniversary
//   1932-1982" technical details via archive.org; Wikipedia "List of
//   Mission: Impossible film locations", "Category:Films shot in
//   Sydney", "List of films set in Sydney"; answers.com dimension
//   compilations.)
// Schematic (not sourced, never stated as fact in the UI): the parabolic
// arch profile and 20 m rib depth; exact panel chord sections and
// diagonal arrangement; hanger lengths and attachment heights (real
// hangers 7.3 to 58.8 m); deck truss depth and segmentation; pylon
// cross-sections and setbacks; approach span arrangement and trestle
// positions; skewback shapes; bearing details; parapet form; beacon
// design; paint shade.
//
// Coordinate frame: x = along the bridge (south approach at -x, north
// at +x), y = up (0 = mean sea level), z = across the deck. All
// dimensions in meters.
//
// Granularity: ~145 named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-sydney-harbour-bridge.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'sydney-harbour-bridge');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (1149 m) maps to 2.4 units.
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
const SPAN = 503;            // arch span, sourced
const HALF = SPAN / 2;       // 251.5
const CROWN = 134;           // top of arch above sea level, sourced
const SPRING = 20;           // arch spring height (schematic)
const RIB_D = 20;            // arch rib truss depth (schematic)
const RIB_Z = 20;            // ribs at z = +/-20 (deck 49 m wide, sourced)
const DECK_Y = 56;           // deck road level (clearance 49 m + structure, schematic)
const PANELS = 28;           // sourced panel count
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

// --- Arch ribs: 28 panels x 2 ribs = 56 parts. Each panel is a truss
// segment: top and bottom chords with verticals and diagonals.
for (const side of [-1, 1]) {
  const z = RIB_Z * side;
  const ribName = side < 0 ? 'west' : 'east';
  for (let i = 0; i < PANELS; i++) {
    const x0 = -HALF + i * PANEL_W;
    const x1 = -HALF + (i + 1) * PANEL_W;
    const t0 = archTop(x0), t1 = archTop(x1);
    const b0 = archBot(x0), b1 = archBot(x1);
    const geoms = [
      strut([x0, t0, z], [x1, t1, z], 3.2, 3.2),
      strut([x0, b0, z], [x1, b1, z], 3.2, 3.2),
      strut([x0, b0, z], [x0, t0, z], 2.2, 2.2),
      strut([x1, b1, z], [x1, t1, z], 2.2, 2.2),
      strut([x0, b0, z], [x1, t1, z], 1.8, 1.8),
      strut([x0, t0, z], [(x0 + x1) / 2, (b0 + b1) / 2, z], 1.8, 1.8),
    ];
    addPart(`arch-${ribName}-panel-${i + 1}`, `Arch ${ribName} rib panel ${i + 1}`, 'arch-ribs', geoms);
  }
}

// --- Lateral bracing between the ribs: 28 parts.
for (let i = 0; i < PANELS; i++) {
  const x = -HALF + (i + 0.5) * PANEL_W;
  const y = archTop(x) - RIB_D / 2;
  addPart(`lateral-brace-${i + 1}`, `Lateral brace ${i + 1}`, 'lateral-bracing', [
    strut([x, y, -RIB_Z], [x, y, RIB_Z], 1.6, 1.6),
    strut([x, y - 4, -RIB_Z], [x, y + 4, RIB_Z], 1.2, 1.2),
  ]);
}

// --- Hangers: pairs from the bottom chord down to the deck, where the
// arch clears the deck: 19 parts.
{
  let n = 0;
  for (let i = 0; i <= PANELS; i++) {
    const x = -HALF + i * PANEL_W;
    const yB = archBot(x);
    if (yB <= DECK_Y + 2) continue;
    n++;
    const geoms = [];
    for (const side of [-1, 1]) {
      const z = RIB_Z * side;
      geoms.push(strut([x, yB, z], [x, DECK_Y, z], 1.1, 1.1));
    }
    addPart(`hanger-pair-${n}`, `Hanger pair ${n}`, 'hangers', geoms);
  }
}

// --- Deck: main span in 10 segments + 6 approach segments = 16 parts.
for (let i = 0; i < 10; i++) {
  const x0 = -HALF + (i * SPAN) / 10;
  const x1 = -HALF + ((i + 1) * SPAN) / 10;
  addPart(`deck-segment-${i + 1}`, `Deck segment ${i + 1}`, 'deck', [
    box(x0, x1, DECK_Y - 7, DECK_Y, -24.5, 24.5),
    box(x0, x1, DECK_Y - 7, DECK_Y - 5.6, -24.5, -22),
    box(x0, x1, DECK_Y - 7, DECK_Y - 5.6, 22, 24.5),
  ]);
}
for (const [side, sName] of [[-1, 'south'], [1, 'north']]) {
  for (let i = 0; i < 3; i++) {
    const x0 = side * (HALF + i * 107.7);
    const x1 = side * (HALF + (i + 1) * 107.7);
    addPart(`${sName}-approach-deck-${i + 1}`, `${sName[0].toUpperCase()}${sName.slice(1)} approach deck ${i + 1}`, 'deck', [
      box(Math.min(x0, x1), Math.max(x0, x1), DECK_Y - 7, DECK_Y, -24.5, 24.5),
    ]);
  }
}

// --- Pylons: 4 pylons x (shaft + cap) = 8 parts.
for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
  const x = sx * (HALF + 8.5);
  const z = sz * 30;
  const q = `${sx < 0 ? 'south' : 'north'}-${sz < 0 ? 'west' : 'east'}`;
  const Q = `${sx < 0 ? 'South' : 'North'}-${sz < 0 ? 'west' : 'east'}`;
  addPart(`${q}-pylon-shaft`, `${Q} pylon shaft`, 'pylons', [box(x - 6, x + 6, 0, 80, z - 6, z + 6)]);
  addPart(`${q}-pylon-cap`, `${Q} pylon cap`, 'pylons', [
    box(x - 7.5, x + 7.5, 80, 89, z - 7.5, z + 7.5),
    box(x - 5, x + 5, 89, 92, z - 5, z + 5),
  ]);
}

// --- Approaches: trestle piers, 4 per side = 8 parts.
for (const side of [-1, 1]) {
  const sName = side < 0 ? 'south' : 'north';
  for (let i = 0; i < 4; i++) {
    const x = side * (HALF + 60 + i * 107.7);
    addPart(`${sName}-trestle-${i + 1}`, `${sName[0].toUpperCase()}${sName.slice(1)} approach trestle ${i + 1}`, 'approaches', [
      box(x - 3, x + 3, 0, DECK_Y - 7, -22, 22),
      box(x - 5, x + 5, DECK_Y - 9, DECK_Y - 7, -24, 24),
    ]);
  }
}

// --- Foundations: 4 skewbacks + 4 bearings = 8 parts.
for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
  const x = sx * HALF;
  const z = sz * RIB_Z;
  const q = `${sx < 0 ? 'south' : 'north'}-${sz < 0 ? 'west' : 'east'}`;
  const Q = `${sx < 0 ? 'South' : 'North'}-${sz < 0 ? 'west' : 'east'}`;
  addPart(`${q}-skewback`, `${Q} skewback`, 'foundations', [
    box(x - 14, x + 14, -6, SPRING - 2, z - 8, z + 8),
  ]);
  addPart(`${q}-bearing`, `${Q} main bearing`, 'foundations', [
    box(x - 3, x + 3, SPRING - 4, SPRING + 1, z - 3, z + 3),
  ]);
}

// --- Details: parapets + beacon = 3 parts.
for (const side of [-1, 1]) {
  const z = side * 24.5;
  addPart(`${side < 0 ? 'west' : 'east'}-parapet`, `${side < 0 ? 'West' : 'East'} parapet`, 'details', [
    box(-HALF - 323, HALF + 323, DECK_Y, DECK_Y + 1.6, z - 0.6, z + 0.6),
  ]);
}
addPart('aircraft-beacon', 'Aircraft beacon', 'details', [
  box(-1, 1, CROWN, CROWN + 5, -1, 1),
  box(-0.4, 0.4, CROWN + 5, 141 - CROWN + CROWN, -0.4, 0.4),
]);

// ---------------------------------------------------------------- colors
// Harbour Bridge grey: the steelwork's longstanding grey-green paint,
// granite pylons in pale stone, concrete in mid grey.
function colorFor(id) {
  if (id.includes('pylon')) return '#cfc7b4';
  if (id.includes('skewback')) return '#9a958a';
  if (id.includes('bearing')) return '#4a4d52';
  if (id.includes('trestle')) return '#7d8894';
  if (id.includes('deck')) return '#5d6a75';
  if (id.includes('parapet')) return '#6e7a86';
  if (id === 'aircraft-beacon') return '#c23b2e';
  if (id.includes('hanger')) return '#75828d';
  if (id.includes('lateral-brace')) return '#6b7683';
  return '#7d8894';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'arch-ribs', name: 'Arch ribs', color: '#7d8894', description: 'The two 503 m steel arch ribs, each built in 28 panels of 18.28 m, rising 134 m above the harbour.' },
  { id: 'lateral-bracing', name: 'Lateral bracing', color: '#6b7683', description: 'The cross-bracing tying the two arch ribs together against wind loads.' },
  { id: 'hangers', name: 'Hangers', color: '#75828d', description: 'The vertical hangers carrying the deck from the arch, from 7.3 m at the ends to 58.8 m at the crown.' },
  { id: 'deck', name: 'Deck', color: '#5d6a75', description: 'The 49 m wide deck: road lanes, two rail tracks, a cycleway and a footway across the 1149 m bridge.' },
  { id: 'pylons', name: 'Pylons', color: '#cfc7b4', description: 'The four decorative 89 m pylons, concrete faced with granite, standing on the abutment towers.' },
  { id: 'approaches', name: 'Approach trestles', color: '#7d8894', description: 'The steel trestles carrying the approach spans on each shore.' },
  { id: 'foundations', name: 'Foundations and bearings', color: '#9a958a', description: 'The concrete skewbacks founded in sandstone and the four main bearings taking 20,000 tonnes each.' },
  { id: 'details', name: 'Parapets and beacon', color: '#6e7a86', description: 'Deck parapets and the aircraft beacon at 141 m.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (const rib of ['west', 'east']) {
  for (let i = 1; i <= PANELS; i++) {
    explanations[`arch ${rib} rib panel ${i}`] =
      `Panel ${i} of the ${rib} arch rib: one of 28 panels, each 18.28 m, making up the 503 m steel arch. The arch holds about 39,000 tonnes of the bridge\u2019s 52,800 tonnes of steelwork. Exact truss member sizes are schematic.`;
  }
}
for (let i = 1; i <= PANELS; i++) {
  explanations[`lateral brace ${i}`] =
    `Lateral brace ${i} tying the two arch ribs together. Exact bracing pattern is schematic.`;
}
{
  // Count the hanger pairs the same way the generator does, so names match.
  let n = 0;
  for (let i = 0; i <= PANELS; i++) {
    const x = -HALF + i * PANEL_W;
    if (archBot(x) <= DECK_Y + 2) continue;
    n++;
    explanations[`hanger pair ${n}`] =
      `A pair of vertical hangers carrying the deck from the arch ribs. The real hangers run from 7.3 m at the ends to 58.8 m at the crown; modeled lengths are schematic.`;
  }
}
for (let i = 1; i <= 10; i++) {
  explanations[`deck segment ${i}`] =
    `Segment ${i} of the main-span deck, 49 m wide: eight road lanes with two rail tracks, a cycleway and a footway when opened. Exact lane arrangement is schematic.`;
}
for (const s of ['south', 'north']) {
  const S2 = s[0].toUpperCase() + s.slice(1);
  for (let i = 1; i <= 3; i++) {
    explanations[`${s} approach deck ${i}`] =
      `Approach deck ${i} on the ${s} side, part of the 1149 m total length including approach spans. Exact span arrangement is schematic.`;
  }
  for (let i = 1; i <= 4; i++) {
    explanations[`${s} approach trestle ${i}`] =
      `Steel trestle ${i} carrying the ${s} approach spans. Exact trestle form is schematic.`;
  }
}
for (const [q, Q] of [['south-west', 'South-west'], ['south-east', 'South-east'], ['north-west', 'North-west'], ['north-east', 'North-east']]) {
  explanations[`${q} pylon shaft`] = `The shaft of the ${Q.toLowerCase()} pylon: the four decorative pylons are 89 m above mean sea level, concrete faced with granite. Exact cross-section is schematic.`;
  explanations[`${q} pylon cap`] = `The cap of the ${Q.toLowerCase()} pylon. The pylons are decorative; the arch thrust goes into the skewbacks, not the pylons. Exact cap form is schematic.`;
  explanations[`${q} skewback`] = `The ${Q.toLowerCase()} skewback: the concrete foundation block, founded in sandstone 12 m deep, that takes the arch thrust. Exact block shape is schematic.`;
  explanations[`${q} main bearing`] = `The ${Q.toLowerCase()} main bearing: one of four bearings carrying about 20,000 tonnes each on 4.2 m pins, allowing the arch to rise or fall 18 cm with temperature. Exact bearing design is schematic.`;
}
explanations['west parapet'] = 'The west parapet along the deck. Exact parapet form is schematic.';
explanations['east parapet'] = 'The east parapet along the deck. Exact parapet form is schematic.';
explanations['aircraft beacon'] = 'The aircraft warning beacon at 141 m above sea level, 7 m above the arch crown. Exact beacon design is schematic.';

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
const binName = 'sydney-harbour-bridge-0.bin';
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
  scope: 'Sydney Harbour Bridge, Sydney',
  title: 'Sydney Harbour Bridge',
  location: 'Sydney, Australia',
  blurb: 'The steel through arch bridge across Sydney Harbour, opened 19 March 1932. Explore the 503 m arch ribs in 28 panels, the hangers, the 49 m deck, the four granite-faced pylons and the skewback foundations.',
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
  chunks: [{ url: '/models/sydney-harbour-bridge/sydney-harbour-bridge-0.bin', bytes: offset }],
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
