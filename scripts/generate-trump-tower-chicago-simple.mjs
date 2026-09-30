// Procedural Trump International Hotel and Tower, Chicago (simple variant) for
// the Architectural Atlas.
//
// Builds a coarse schematic massing of the 1,389 ft SOM tower in code and
// writes it in the atlas binary format:
//   public/models/trump-tower-chicago-simple/atlas.json
//   public/models/trump-tower-chicago-simple/trump-tower-chicago-simple-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/trump-tower-chicago-attribution.md,
// opened 2026-09-30):
//   1,389 ft (423 m) including the spire; roof 1,171 ft (357 m); 98 floors;
//   2.6 million sq ft (240,000 m2) of floor space; designed by Adrian Smith of
//   Skidmore, Owings and Merrill; structural engineer William F. Baker; built
//   by Bovis Lend Lease; construction 2005 to 2009, completed 2009; 486
//   residential condominiums and 339 hotel rooms; three setbacks stepping the
//   tower back to echo nearby buildings (first on the east at the Wrigley
//   Building height, 130 m; second on the west at the Marina City height,
//   179 m; third on the east at the IBM Building / 330 North Wabash height,
//   212 m); spire 69 m (226 ft) above the roofline; facade of clear glass,
//   polished stainless steel mullions, brushed stainless steel spandrels and
//   clear anodized aluminum; reinforced concrete core, the tallest all-concrete
//   building in the world; retail and parking base along the Chicago River;
//   1.2-acre riverfront park and riverwalk on a 500 ft frontage.
// Schematic (not sourced, never stated as fact in the UI): all footprint
// dimensions and plan offsets; podium height and interior arrangement; slab
// counts and spacing; core and caisson sizes; spire profile; riverwalk and
// park layout; tree and promenade placement.
//
// Granularity: 31 named parts across 7 systems. Every explanation is either a
// sourced fact (see the research notes above) or explicitly marked schematic.
//
// Usage: node scripts/generate-trump-tower-chicago-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'trump-tower-chicago-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (1,389 ft = 423 m tip) maps to 2.4 units.
const S = 2.4 / 423;

// ---------------------------------------------------------------- helpers
// Fresh helper set for the simple variant: center-based boxes, stacked slabs,
// tapered prisms. Rotate before translate, always.
function cbox(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
function slabs(w, d, x, z, ys, t = 0.5) {
  const g = [];
  for (const y of ys) g.push(cbox(w, t, d, x, y, z));
  return g;
}
function pillar(r, h, x, y, z, seg = 8) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.translate(x, y, z);
  return g;
}
function spike(r0, r1, h, x, y, z, seg = 8) {
  const g = new THREE.CylinderGeometry(r1, r0, h, seg);
  g.translate(x, y, z);
  return g;
}
function orb(r, x, y, z) {
  const g = new THREE.SphereGeometry(r, 8, 6);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- layout (metres, schematic plan, sourced heights)
// x east, z south, y up. Tier tops at the sourced setback heights.
const T1 = 130, T2 = 179, T3 = 212, ROOF = 357, TIP = 423;

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Base: retail and parking podium along the river (schematic plan).
addPart('base-foundation-block', 'Foundation block', 'base', [
  cbox(72, 5, 56, 0, -6.5, 0),
]);
addPart('base-podium-block', 'Podium block', 'base', [
  cbox(68, 40, 52, 0, 20, 0),
]);
addPart('base-retail-band', 'Retail band', 'base', [
  cbox(69, 10, 53, 0, 7, 0),
]);
addPart('base-garage-block', 'Garage block', 'base', [
  cbox(62, 3, 46, 0, 17, 0),
  cbox(62, 3, 46, 0, 25, 0),
  cbox(62, 3, 46, 0, 33, 0),
]);
addPart('base-entrance-block', 'Entrance block', 'base', [
  cbox(10, 8, 18, 39, 4, 0),
]);
addPart('base-lobby-block', 'Lobby block', 'base', [
  cbox(40, 14, 24, 0, 7, 0),
]);
addPart('base-podium-roof', 'Podium roof slab', 'base', [
  cbox(70, 1, 54, 0, 40.5, 0),
]);

// --- First step: ground to the 130 m Wrigley-height setback.
addPart('step1-block', 'First step block', 'step-1', [
  cbox(56, T1 - 40, 44, 0, 40 + (T1 - 40) / 2, 0),
]);
addPart('step1-slabs', 'First step floor slabs', 'step-1',
  slabs(54, 42, 0, 0, [48, 58, 68, 78, 88, 98, 108, 118, 126]));
addPart('step1-core', 'First step core', 'step-1', [
  cbox(18, T1 - 40, 14, 0, 40 + (T1 - 40) / 2, 0),
]);
addPart('step1-terrace', 'First step terrace', 'step-1', [
  cbox(12, 1, 44, 22, T1 + 0.5, 0),
]);
addPart('step1-columns', 'First step columns', 'step-1', [
  pillar(0.7, T1 - 40, -26, 40 + (T1 - 40) / 2, -20),
  pillar(0.7, T1 - 40, 26, 40 + (T1 - 40) / 2, -20),
  pillar(0.7, T1 - 40, -26, 40 + (T1 - 40) / 2, 20),
  pillar(0.7, T1 - 40, 26, 40 + (T1 - 40) / 2, 20),
]);

// --- Second step: 130 m to the 179 m Marina City-height setback (west cut).
addPart('step2-block', 'Second step block', 'step-2', [
  cbox(44, T2 - T1, 44, -6, T1 + (T2 - T1) / 2, 0),
]);
addPart('step2-slabs', 'Second step floor slabs', 'step-2',
  slabs(42, 42, -6, 0, [136, 144, 152, 160, 168, 176]));
addPart('step2-core', 'Second step core', 'step-2', [
  cbox(16, T2 - T1, 13, -6, T1 + (T2 - T1) / 2, 0),
]);
addPart('step2-terrace', 'Second step terrace', 'step-2', [
  cbox(12, 1, 44, -22, T2 + 0.5, 0),
]);

// --- Third step: 179 m to the 212 m IBM-height setback (east cut).
addPart('step3-block', 'Third step block', 'step-3', [
  cbox(32, T3 - T2, 44, 0, T2 + (T3 - T2) / 2, 0),
]);
addPart('step3-slabs', 'Third step floor slabs', 'step-3',
  slabs(30, 42, 0, 0, [185, 193, 201, 209]));
addPart('step3-core', 'Third step core', 'step-3', [
  cbox(15, T3 - T2, 12, 0, T2 + (T3 - T2) / 2, 0),
]);
addPart('step3-terrace', 'Third step terrace', 'step-3', [
  cbox(10, 1, 44, 11, T3 + 0.5, 0),
]);

// --- Crown: 212 m to the roof, penthouse and spire.
addPart('crown-block', 'Crown block', 'crown', [
  cbox(22, ROOF - T3, 44, -5, T3 + (ROOF - T3) / 2, 0),
]);
addPart('crown-roof', 'Crown roof slab', 'crown', [
  cbox(24, 2, 46, -5, ROOF + 1, 0),
]);
addPart('crown-penthouse', 'Crown penthouse', 'crown', [
  cbox(16, 8, 30, -5, ROOF + 6, 0),
]);
addPart('crown-spire', 'Crown spire', 'crown', [
  spike(2.2, 0.5, TIP - ROOF - 8, -5, ROOF + 8 + (TIP - ROOF - 8) / 2, 0, 10),
]);
addPart('crown-beacon', 'Crown beacon', 'crown', [
  orb(0.8, -5, TIP + 0.5, 0),
]);

// --- Core: full-height concrete spine and caissons (schematic sizes).
addPart('core-spine', 'Concrete spine', 'core', [
  cbox(16, ROOF, 12, 0, ROOF / 2, 0),
]);
{
  const g = [];
  for (const gx of [-24, -12, 0, 12, 24])
    for (const gz of [-16, 0, 16]) g.push(pillar(1.4, 22, gx, -17, gz, 10));
  addPart('core-caissons', 'Caisson cluster', 'core', g);
}

// --- Riverfront: Chicago River, promenade, park (schematic layout).
addPart('riverfront-river', 'River plane', 'riverfront', [
  cbox(50, 1, 190, -95, -13.5, 0),
]);
addPart('riverfront-walk', 'Promenade strip', 'riverfront', [
  cbox(9, 1, 150, -64.5, 0.5, 0),
]);
addPart('riverfront-park', 'Park strip', 'riverfront', [
  cbox(18, 1, 150, -51, 0.5, 0),
]);
{
  const g = [];
  for (let z = -66; z <= 66; z += 12) {
    g.push(pillar(0.35, 3.4, -51, 2.2, z, 6));
    g.push(orb(2.1, -51, 5.2, z));
  }
  addPart('riverfront-trees', 'Tree row', 'riverfront', g);
}

// ---------------------------------------------------------------- colors
// Light schematic palette: pale glass blue, warm concrete grey, stainless
// silver, park green. Only the Eiffel Tower is dark realistic.
function colorFor(id) {
  if (id === 'base-foundation-block') return '#8a8478';
  if (id === 'base-podium-block') return '#cfc8b8';
  if (id === 'base-retail-band') return '#a8c8d8';
  if (id === 'base-garage-block') return '#9a948a';
  if (id === 'base-entrance-block') return '#b8b0a0';
  if (id === 'base-lobby-block') return '#d8cfb8';
  if (id === 'base-podium-roof') return '#b0a890';
  if (id === 'step1-block') return '#c8d4dc';
  if (id === 'step1-slabs') return '#a8b4bc';
  if (id === 'step1-core') return '#b0a890';
  if (id === 'step1-terrace') return '#9fb3bd';
  if (id === 'step1-columns') return '#d8d4c8';
  if (id === 'step2-block') return '#ccd8e0';
  if (id === 'step2-slabs') return '#acb8c0';
  if (id === 'step2-core') return '#b4ac94';
  if (id === 'step2-terrace') return '#a3b7c1';
  if (id === 'step3-block') return '#d0dce4';
  if (id === 'step3-slabs') return '#b0bcc4';
  if (id === 'step3-core') return '#b8b098';
  if (id === 'step3-terrace') return '#a7bbc5';
  if (id === 'crown-block') return '#d4e0e8';
  if (id === 'crown-roof') return '#9aa4ac';
  if (id === 'crown-penthouse') return '#b8c0c8';
  if (id === 'crown-spire') return '#d8dce0';
  if (id === 'crown-beacon') return '#e05a4a';
  if (id === 'core-spine') return '#a89e8c';
  if (id === 'core-caissons') return '#7a7468';
  if (id === 'riverfront-river') return '#7fb3d5';
  if (id === 'riverfront-walk') return '#c4b898';
  if (id === 'riverfront-park') return '#8fbf7f';
  if (id === 'riverfront-trees') return '#5a8f4f';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Base and podium', color: '#c4b898', description: 'The retail, lobby and parking podium at the foot of the tower, beside the Chicago River. Plan and heights are schematic.' },
  { id: 'step-1', name: 'First step', color: '#c8d4dc', description: 'The lowest tier, rising to the first setback at 130 m, the height of the neighbouring Wrigley Building.' },
  { id: 'step-2', name: 'Second step', color: '#ccd8e0', description: 'The middle tier, stepping back on the west side at 179 m, the height of the Marina City towers.' },
  { id: 'step-3', name: 'Third step', color: '#d0dce4', description: 'The upper tier, stepping back on the east side at 212 m, the height of 330 North Wabash (IBM Plaza).' },
  { id: 'crown', name: 'Crown and spire', color: '#d4e0e8', description: 'The top tier from 212 m to the 1,171 ft roof, with the mechanical penthouse and the 226 ft spire.' },
  { id: 'core', name: 'Concrete core', color: '#a89e8c', description: 'The reinforced concrete core and caisson foundations that make this the tallest all-concrete building in the world. Sizes are schematic.' },
  { id: 'riverfront', name: 'Riverfront', color: '#8fbf7f', description: 'The Chicago River, the 500 ft riverwalk promenade and the 1.2-acre riverfront park. Layout is schematic.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'foundation block': 'Schematic foundation mass under the podium. The real tower stands on a concrete mat carried by rock-socketed caissons. Depth and extent are schematic.',
  'podium block': 'Schematic mass of the retail, lobby and parking podium at the foot of the tower. Sources place lobbies, retail and the garage on floors 3 to 12; the exact podium height and outline are schematic.',
  'retail band': 'Schematic glass band for the podium retail levels along the river and Wabash Avenue. The tower holds about 100,000 sq ft of retail space. Position and extent are schematic.',
  'garage block': 'Schematic parking decks inside the podium. The tower holds about 1,000 parking spaces on the lower floors. Deck count and layout are schematic.',
  'entrance block': 'Schematic main entrance volume on the Wabash Avenue side. Sources note the tower body is raised 30 ft above the Wabash entrance; the entrance form is schematic.',
  'lobby block': 'Schematic double-height lobby volume. The real lobby holds a 35 ft structural glass wave wall hung from the second floor. Interior layout is schematic.',
  'podium roof slab': 'Schematic roof of the podium where the tower tiers rise. Roof treatment is schematic.',
  'first step block': 'The lowest tower tier, a schematic mass rising from the podium to the first setback at 130 m (427 ft), the height of the neighbouring Wrigley Building. Footprint is schematic.',
  'first step floor slabs': 'Schematic floor plates inside the first tier, carrying the hotel floors (17 to 27) and the lower residential floors. Slab count and spacing are schematic.',
  'first step core': 'Schematic segment of the reinforced concrete core inside the first tier. Core size is schematic.',
  'first step terrace': 'Schematic terrace on the east side where the tower steps back at 130 m. Terrace treatment is schematic.',
  'first step columns': 'Schematic perimeter columns of the first tier. Column grid is schematic.',
  'second step block': 'The middle tower tier, a schematic mass from 130 m to the second setback at 179 m (587 ft), the height of the Marina City towers, stepping back on the west side. Footprint is schematic.',
  'second step floor slabs': 'Schematic floor plates inside the second tier, carrying residential condominiums. Slab count and spacing are schematic.',
  'second step core': 'Schematic segment of the reinforced concrete core inside the second tier. Core size is schematic.',
  'second step terrace': 'Schematic terrace on the west side where the tower steps back at 179 m. Terrace treatment is schematic.',
  'third step block': 'The upper tower tier, a schematic mass from 179 m to the third setback at 212 m (696 ft), the height of 330 North Wabash (IBM Plaza), stepping back on the east side. Footprint is schematic.',
  'third step floor slabs': 'Schematic floor plates inside the third tier, carrying residential condominiums. Slab count and spacing are schematic.',
  'third step core': 'Schematic segment of the reinforced concrete core inside the third tier. Core size is schematic.',
  'third step terrace': 'Schematic terrace on the east side where the tower steps back at 212 m. Terrace treatment is schematic.',
  'crown block': 'The top tower tier, a schematic mass from 212 m to the 1,171 ft (357 m) roof, carrying the upper residences and penthouses. Footprint is schematic.',
  'crown roof slab': 'Schematic roof plate at 1,171 ft. Roof detailing is schematic.',
  'crown penthouse': 'Schematic mechanical penthouse on the roof. Size and cladding are schematic.',
  'crown spire': 'Schematic spire rising toward the 1,389 ft tip. Sources give the real spire as 69 m (226 ft) of structural steel clad in fiberglass above the roofline. Profile is schematic.',
  'crown beacon': 'Schematic aviation beacon at the tip. Position is schematic.',
  'concrete spine': 'Schematic full-height reinforced concrete core. The tower is the tallest all-concrete building in the world, using up to 16,000 psi concrete in transition floors and shear walls. Core size is schematic.',
  'caisson cluster': 'Schematic rock-socketed caissons under the tower. Sources describe 8 ft and 10 ft diameter caissons drilled to rock. Count and layout are schematic.',
  'river plane': 'The main branch of the Chicago River beside the tower. Water level and extent are schematic.',
  'promenade strip': 'Schematic riverwalk promenade along the 500 ft river frontage. Sources describe a 1.2-acre riverfront park and riverwalk linking the building with river commuters. Layout is schematic.',
  'park strip': 'Schematic riverfront park lawn. Planting layout is schematic.',
  'tree row': 'Schematic park trees along the promenade. Species and positions are schematic.',
};

// ---------------------------------------------------------------- serialize
// Atlas v1 contract: per part, 4-byte aligned Float32 positions, Int16
// normals and Uint32 indices in one binary chunk; atlas.json carries byte
// offsets, bounds, explanations, concepts and triangles.
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
const binName = 'trump-tower-chicago-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the trump-tower-chicago-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Trump International Hotel and Tower, Chicago (simple schematic)',
  title: 'Trump International Hotel and Tower',
  location: 'Chicago, United States',
  blurb: 'Chicago\u2019s 1,389 ft condo-hotel tower by Adrian Smith of SOM, completed in 2009. Three setbacks step the concrete frame back at the heights of the Wrigley Building, Marina City and the IBM Building, rising to a 226 ft spire above a glass, stainless steel and aluminum facade.',
  sourceUrls: [
    { label: 'Wikipedia: Trump International Hotel and Tower (Chicago)', url: 'http://en.wikipedia.org/wiki/Trump_International_Hotel_and_Tower_(Chicago)' },
    { label: 'New Civil Engineer: Windy City Wonder', url: 'https://www.newcivilengineer.com/archive/windy-city-wonder-25-10-2007/' },
    { label: 'NPR Illinois: Trump Stands Firm On Giant Chicago Sign', url: 'https://www.nprillinois.org/2014-06-21/trump-stands-firm-on-giant-chicago-sign' },
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
  chunks: [{ url: '/models/trump-tower-chicago-simple/trump-tower-chicago-simple-0.bin', bytes: offset }],
  triangles,
  // Tall model: 1.5 keeps the exploded cloud inside the frame.
  spread: 1.5,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
