// Procedural Burj Khalifa (simplified) for the Architectural Atlas.
//
// Simplified schematic: the tower as a handful of stepped Y-shaped masses
// with the core, crown, spire, podium, lake and program zones. Modeled
// fresh for the simple variant: no part names and no part bounds are shared
// with the detailed generator.
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/burj-khalifa-attribution.md,
// opened 2026-09-30):
//   828 m (2,717 ft) architectural, 829.8 m to tip, roof 739.4 m, top floor
//   585.4 m, observatory level 148 at 555.7 m, spire 242.5 m; 163 floors
//   (154 + 9 maintenance); opened 4 January 2010; architect Adrian Smith,
//   SOM; Y-shaped tripartite plan with buttressed core; 27 setbacks in a
//   spiral pattern; concrete to level 156, steel above; 57 elevators and
//   8 escalators; 142,000 m2 cladding; 304-room Armani Hotel; 900 apartments
//   on floors 20-108; sky lobbies on 43 and 76; At.mosphere on 122 at 442 m;
//   observation decks on 124 (452 m), 125 and 148 (555 m); 12 ha lake with
//   the 275 m Dubai Fountain; 3.7 m raft on 192 bored piles.
// Schematic (not sourced, never stated as fact in the UI): massing segment
// heights and widths, podium and lake outlines, interior zoning.
//
// Granularity: 30 named parts across 7 systems. Every explanation is either
// a sourced fact or explicitly marked schematic.
//
// Usage: node scripts/generate-burj-khalifa-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'burj-khalifa-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (828 m architectural height) maps to 2.4 units.
const S = 2.4 / 828;
const rad = (d) => (d * Math.PI) / 180;

// ---------------------------------------------------------------- helpers
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
function cone(r, h, x, y, z, seg = 8) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  return g;
}
function hexPrism(r, y0, y1) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, 6);
  g.rotateY(Math.PI / 6);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
// Wing bar rooted at the tower centre (x east, z south), rotated around the
// world origin BEFORE any translation, per the atlas rule.
function arm(deg, len, hw, y0, y1) {
  const g = new THREE.BoxGeometry(len, y1 - y0, hw * 2);
  g.translate(len / 2, 0, 0);
  g.rotateY(-rad(deg));
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
function armSlab(deg, x0, x1, hw, y, thick = 0.8) {
  const g = new THREE.BoxGeometry(x1 - x0, thick, hw * 2);
  g.translate((x0 + x1) / 2, 0, 0);
  g.rotateY(-rad(deg));
  g.translate(0, y + thick / 2, 0);
  return g;
}

// ---------------------------------------------------------------- layout (meters; massing schematic, heights sourced)
const SEG = [
  [150, 60, 15],
  [370, 38, 12],
  [585, 20, 9],
];
const WING_DEG = [0, 120, 240];
const WING_NAME = ['East wing', 'Southwest wing', 'Northwest wing'];

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Substructure.
{
  const g = [hexPrism(21, -4.7, -1)];
  for (const deg of WING_DEG) g.push(arm(deg, 55, 13, -4.7, -1));
  addPart('tower-raft', 'Tower raft', 'substructure', g);
}
{
  const g = [];
  for (const deg of WING_DEG) {
    const dx = Math.cos(rad(deg)), dz = Math.sin(rad(deg));
    const px = -dz, pz = dx;
    for (let i = 0; i < 8; i++) {
      const t = 8 + i * 6;
      for (let j = 0; j < 4; j++) {
        const o = -9 + j * 6;
        g.push(cyl(0.8, 0.8, 45, dx * t + px * o, -23.5, dz * t + pz * o, 6));
      }
    }
  }
  addPart('pile-field', 'Pile field', 'substructure', g);
}

// --- Podium.
addPart('podium-block', 'Podium block', 'podium', [box(-70, 70, 0, 24, -55, 55)]);
addPart('hotel-lobby', 'Hotel lobby', 'podium', [box(25, 60, 0, 10, -18, 18)]);
addPart('parking-garage', 'Parking garage', 'podium', [
  box(-62, 68, -7.5, -4.5, -48, 48),
  box(-62, 68, -11.5, -8.5, -48, 48),
]);
{
  const g = [];
  for (const deg of WING_DEG) {
    const dx = Math.cos(rad(deg)), dz = Math.sin(rad(deg));
    const canopy = new THREE.BoxGeometry(16, 1.2, 12);
    canopy.rotateY(-rad(deg));
    canopy.translate(dx * 85, 9, dz * 85);
    g.push(canopy);
  }
  addPart('entrances', 'Entrances', 'podium', g);
}
addPart('plaza', 'Plaza', 'podium', [box(70, 160, -0.5, 0, -40, 40)]);

// --- Massing: three stepped wings, core, terraces, crown, spire.
WING_DEG.forEach((deg, wi) => {
  const g = [];
  let y0 = 0;
  for (const [y1, len, hw] of SEG) {
    g.push(arm(deg, len, hw, y0, y1));
    y0 = y1;
  }
  addPart(`wing-${wi}`, WING_NAME[wi], 'massing', g);
});
addPart('central-core', 'Central core', 'massing', [hexPrism(18, 0, 585)]);
{
  const g = [];
  for (const deg of WING_DEG) {
    g.push(armSlab(deg, 36, 62, 15, 150));
    g.push(armSlab(deg, 18, 40, 12, 370));
  }
  addPart('setback-terraces', 'Setback terraces', 'massing', g);
}
{
  const g = new THREE.CylinderGeometry(8, 15, 739.4 - 585, 8);
  g.translate(0, (585 + 739.4) / 2, 0);
  addPart('crown', 'Crown', 'massing', [g]);
}
{
  const g = new THREE.CylinderGeometry(1.5, 10, 828 - 585, 8);
  g.translate(0, (585 + 828) / 2, 0);
  addPart('spire', 'Spire', 'massing', [g]);
}
{
  const g = [new THREE.SphereGeometry(1.5, 8, 6)];
  g[0].translate(0, 829.5, 0);
  addPart('beacon', 'Beacon', 'massing', g);
}

// --- Cladding.
{
  const g = [hexPrism(18.5, 0, 585)];
  for (const deg of WING_DEG) {
    let y0 = 0;
    for (const [y1, len, hw] of SEG) {
      g.push(arm(deg, len + 0.4, hw + 0.3, y0 + 0.2, y1));
      y0 = y1;
    }
  }
  addPart('glass-skin', 'Glass skin', 'cladding', g);
}
{
  const g = [];
  for (const deg of WING_DEG) {
    let y0 = 0;
    for (const [y1, len, hw] of SEG) {
      const n = Math.max(3, Math.floor(len / 8));
      for (let i = 0; i < n; i++) {
        const t = 5 + (i * (len - 10)) / Math.max(1, n - 1);
        for (const s of [-1, 1]) {
          const f = new THREE.BoxGeometry(0.7, y1 - y0, 1.5);
          f.translate(t, 0, s * (hw + 0.4));
          f.rotateY(-rad(deg));
          f.translate(0, (y0 + y1) / 2, 0);
          g.push(f);
        }
      }
      y0 = y1;
    }
  }
  addPart('fin-field', 'Fin field', 'cladding', g);
}

// --- Program zones (heights sourced, zoning schematic).
{
  const g = [hexPrism(15, 2, 118)];
  for (const deg of WING_DEG) g.push(arm(deg, 55, 12, 2, 118));
  addPart('hotel-block', 'Hotel block', 'program', g);
}
{
  const g = [hexPrism(14, 120, 388)];
  for (const deg of WING_DEG) g.push(arm(deg, 33, 9.5, 120, 368));
  addPart('apartment-block', 'Apartment block', 'program', g);
}
addPart('office-block', 'Office block', 'program', [hexPrism(12.5, 392, 518)]);
addPart('sky-lobbies', 'Sky lobbies', 'program', [hexPrism(15, 153, 157), hexPrism(13, 273, 277)]);
addPart('restaurant-level', 'Restaurant level', 'program', [hexPrism(12, 440, 444)]);
addPart('observation-decks', 'Observation decks', 'program', [
  hexPrism(11, 450, 454),
  hexPrism(8.5, 553.7, 557.7),
]);
addPart('top-lounge', 'Top lounge', 'program', [hexPrism(11, 583, 587)]);
addPart('lobby-level', 'Lobby level', 'program', [box(25, 60, 0, 6, -18, 18)]);

// --- Vertical circulation.
{
  const g = [];
  for (const a of [45, 135, 225, 315]) {
    g.push(box(Math.cos(rad(a)) * 9 - 1.4, Math.cos(rad(a)) * 9 + 1.4, 0, 585, Math.sin(rad(a)) * 9 - 1.4, Math.sin(rad(a)) * 9 + 1.4));
  }
  addPart('elevator-core', 'Elevator core', 'vertical', g);
}
{
  const g = [];
  for (const deg of WING_DEG) g.push(arm(deg, 52, 1.6, 2, 368));
  addPart('stairwells', 'Stairwells', 'vertical', g);
}

// --- Lake and surroundings.
addPart('lake', 'Lake', 'lake', [box(-320, -60, -1.5, 0, -40, 140)]);
{
  const g = [];
  for (let i = 0; i < 18; i++) {
    const x = -300 + i * 13;
    const h = 10 + 10 * Math.abs(Math.sin(i * 2.1));
    g.push(cone(1.3, h, x, h / 2, 50, 6));
  }
  addPart('fountain', 'Fountain', 'lake', g);
}
addPart('park', 'Park', 'lake', [box(-80, 80, -0.5, 0, 130, 230)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'tower-raft') return '#b0a898';
  if (id === 'pile-field') return '#8a8478';
  if (id === 'podium-block') return '#d5d0c4';
  if (id === 'hotel-lobby' || id === 'lobby-level') return '#e3d3b3';
  if (id === 'parking-garage') return '#9a958a';
  if (id === 'entrances') return '#e8e2d2';
  if (id === 'plaza') return '#cfc9ba';
  if (id.startsWith('wing-')) return '#dde2e6';
  if (id === 'central-core') return '#c9ced4';
  if (id === 'setback-terraces') return '#b9c4a8';
  if (id === 'crown') return '#9fc3d4';
  if (id === 'spire') return '#9aa5ad';
  if (id === 'beacon') return '#d33f2e';
  if (id === 'glass-skin') return '#a9cfe0';
  if (id === 'fin-field') return '#8fb6c9';
  if (id === 'hotel-block') return '#e3d3b3';
  if (id === 'apartment-block') return '#d9cfc0';
  if (id === 'office-block') return '#c9d2d8';
  if (id === 'sky-lobbies') return '#cfe0d8';
  if (id === 'restaurant-level') return '#d8b46a';
  if (id === 'observation-decks') return '#e8e8e8';
  if (id === 'top-lounge') return '#e0cfa0';
  if (id === 'elevator-core' || id === 'stairwells') return '#8a97a3';
  if (id === 'lake') return '#7fb3d5';
  if (id === 'fountain') return '#cfe8f5';
  if (id === 'park') return '#9fbf8a';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'substructure', name: 'Substructure', color: '#b0a898', description: 'The piled raft foundation carrying the tower.' },
  { id: 'podium', name: 'Podium', color: '#d5d0c4', description: 'The podium block with lobby, entrances, parking and plaza.' },
  { id: 'massing', name: 'Tower massing', color: '#dde2e6', description: 'The stepped Y-shaped massing: three wings and the central core rising through setback terraces to the crown and spire.' },
  { id: 'cladding', name: 'Cladding', color: '#a9cfe0', description: 'The glass skin and vertical fins of the 142,000 m2 curtain wall.' },
  { id: 'program', name: 'Program', color: '#e3d3b3', description: 'The vertical city inside: hotel, apartments, offices, sky lobbies, restaurant, decks and lounge.' },
  { id: 'vertical', name: 'Vertical circulation', color: '#8a97a3', description: 'The elevator core and wing stairwells serving the 57 elevators.' },
  { id: 'lake', name: 'Lake and park', color: '#7fb3d5', description: 'The 12-hectare lake with the Dubai Fountain and the surrounding park.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'tower raft': 'The reinforced-concrete raft under the tower, 3.7 m thick, on 192 bored piles 1.5 m in diameter. Outline is schematic.',
  'pile field': 'The bored piles carrying the raft in the desert ground. Count and layout are schematic.',
  'podium block': 'The podium at the tower\u2019s base with lobbies and services. Massing is schematic.',
  'hotel lobby': 'The hotel lobby at concourse level, serving the 304-room Armani Hotel on the lower floors. Layout is schematic.',
  'parking garage': 'The two subterranean parking levels. Layout is schematic.',
  'entrances': 'The tower\u2019s entrances at podium level. Positions are schematic.',
  'plaza': 'The arrival plaza in front of the podium. Extent is schematic.',
  'east wing': 'The east wing of the Y-shaped plan, stepping back in tiers as it rises. The three wings on a central core form the sourced Y-shaped tripartite footprint; tier heights are schematic.',
  'southwest wing': 'The southwest wing of the Y-shaped plan, stepping back in tiers as it rises. Tier heights are schematic.',
  'northwest wing': 'The northwest wing of the Y-shaped plan, stepping back in tiers as it rises. Tier heights are schematic.',
  'central core': 'The hexagonal buttressed core carrying the tower to the 585.4 m top floor, housing all vertical transportation. Radius is schematic.',
  'setback terraces': 'The outdoor terraces left behind at the setbacks, part of the 27 setbacks in a spiral pattern. Positions are schematic.',
  'crown': 'The steel crown above the concrete, rising to the 739.4 m roof. Shape is schematic.',
  'spire': 'The 242.5 m steel spire with its pinnacle, rising to the 828 m tip and housing communications equipment. Taper is schematic.',
  'beacon': 'The aviation warning beacon at the tower\u2019s tip. Position is schematic.',
  'glass skin': 'The reflective glass curtain wall: 142,000 m2 of panels in the full tower. Subdivision is schematic.',
  'fin field': 'The vertical tubular fins of the cladding system. Spacing is schematic.',
  'hotel block': 'The Armani Hotel zone on the lower floors: 304 rooms on 15 of the lower 39 floors. Zoning is schematic.',
  'apartment block': 'The residential zone: 900 apartments on floors 20 through 108. Zoning is schematic.',
  'office block': 'The office zone on the upper floors. Zoning is schematic.',
  'sky lobbies': 'The sky lobbies on the 43rd and 76th floors, housing swimming pools. Heights are approximate; interiors are schematic.',
  'restaurant level': 'At.mosphere on the 122nd floor at 442 m, the world\u2019s highest restaurant. Interior is schematic.',
  'observation decks': 'The observation decks: At the Top on the 124th floor at 452 m and At the Top SKY on the 148th floor at 555 m. Interiors are schematic.',
  'top lounge': 'The Lounge observatory at 585 m, the world\u2019s highest lounge. Interior is schematic.',
  'lobby level': 'The ground-level lobby zone serving hotel, residences and offices. Layout is schematic.',
  'elevator core': 'The elevator shafts in the central core, part of the tower\u2019s 57 elevators and 8 escalators. Count and routing are schematic.',
  'stairwells': 'The egress stairs inside the wings. The core houses all vertical transportation except these wing stairs. Routing is schematic.',
  'lake': 'The 12-hectare artificial Burj Khalifa Lake. Outline is schematic.',
  'fountain': 'The Dubai Fountain on the lake: 275 m long, designed by WET Design, shooting water to 152.4 m. Jet layout is schematic.',
  'park': 'Parkland around the tower. Shape is schematic.',
};

// ---------------------------------------------------------------- serialize
// Atlas v1 contract (same as the other generators): per part, 4-byte
// aligned Float32 positions, Int16 normals and Uint32 indices in one
// binary chunk; atlas.json carries byte offsets, bounds, explanations,
// concepts and triangles. Parts carry an optional color that overrides the
// system color in the viewer.
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
  const align4 = (n) => (n + 3) & ~3; // keep every section 4-byte aligned for typed-array views
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
const binName = 'burj-khalifa-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the burj-khalifa-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Burj Khalifa, Dubai (simplified schematic)',
  title: 'Burj Khalifa',
  location: 'Dubai, United Arab Emirates',
  blurb: 'The world\u2019s tallest building in simplified schematic form: an 828 m Y-shaped tower in Dubai by Adrian Smith of SOM, its three wings stepping back around a central core to a steel spire.',
  sourceUrls: [
    { label: 'Wikipedia: Burj Khalifa', url: 'https://en.wikipedia.org/wiki/Burj_Khalifa' },
    { label: 'Wikipedia: Dubai Fountain', url: 'https://en.wikipedia.org/wiki/Dubai_Fountain' },
    { label: 'SOM: Design and Construction of the Burj Khalifa (PDF)', url: 'https://9c37fc0c-69fe-4903-930f-0c39119df934.filesusr.com/ugd/718de4_c97a2cb7083948868e5f8f720d6f1878.pdf' },
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
  chunks: [{ url: '/models/burj-khalifa-simple/burj-khalifa-simple-0.bin', bytes: offset }],
  triangles,
  // Very tall and thin like the detailed variant; 1.5 keeps the exploded
  // cloud in frame for the simpler, chunkier massing.
  spread: 1.5,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
