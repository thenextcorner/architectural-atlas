// Simplified schematic Palace of Westminster for the Architectural Atlas.
//
// The "simple" variant of the Palace of Westminster: same footprint,
// massing and proportions as the detailed model (see
// scripts/generate-palace-of-westminster.mjs, whose header lists every
// sourced dimension reused here), but coarser: 34 named parts across 6
// systems instead of 106 across 13. Dials, bells, benches, lobbies and
// courtyards are merged into group parts; ornament (shields, statues,
// mosaics, pinnacles) is omitted.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-palace-of-westminster.mjs for the full attribution):
//   nearly 300 m long, river front 265.8 m, roofline 21.3 m, terrace
//   206.7 m by 10 m, north front 70.7 m, south front 98.2 m; Victoria Tower
//   98.5 m (tallest part of the palace), Elizabeth Tower 96.3 m (square
//   base 12.2 m, four dials 6.9 m, hour hand 2.7 m, minute hand 4.3 m,
//   five bells, Great Bell 13.8 tonnes, 334 steps, Ayrton Light),
//   Central Tower 91 m octagonal (over the Central Lobby, ventilation
//   chimney concept); Central Lobby 18 m across, 23 m to the vault;
//   Commons Chamber 14 by 20.7 m (green benches); Lords Chamber 13.7 by
//   24.4 m (red benches, throne, Woolsack); Members' Lobby 13.7 m cube;
//   Peers' Lobby 12 m square; Royal Gallery 33.5 by 13.7 m; Robing Room,
//   Prince's Chamber, Norman Porch with 26 steps; Westminster Hall
//   20.7 by 73.2 m with hammerbeam roof (completed 1099); courtyards and
//   gardens: New Palace Yard, Old Palace Yard, Cromwell Green, Speaker's
//   Court, State Officers Court, Royal Court, Black Rod's Garden, Victoria
//   Tower Gardens, Speaker's Green, College Green.
// Schematic (not sourced, never stated as fact in the UI): exact footprint
// placement; merged group geometry; simplified tower, roof and lobby
// profiles.
//
// Writes:
//   public/models/palace-of-westminster-simple/atlas.json
//   public/models/palace-of-westminster-simple/palace-of-westminster-simple-0.bin
//
// Usage: node scripts/generate-palace-of-westminster-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'palace-of-westminster-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (98.5 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 98.5;

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
// Octagonal prism: rotate before translating.
function oct(radius, h, x, y, z) {
  const g = new THREE.CylinderGeometry(radius, radius, h, 8);
  g.rotateY(Math.PI / 8);
  g.translate(x, y, z);
  return g;
}
// Gothic spire: 8-sided cone, rotate before translating.
function spire(r, y0, y1, x, z, seg = 8) {
  const g = new THREE.ConeGeometry(r, y1 - y0, seg);
  g.rotateY(Math.PI / seg);
  g.translate(x, (y0 + y1) / 2, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Towers: the three principal towers plus the three minor towers: 6 parts.
{
  const cx = -45, cz = 115;
  const body = box(cx - 11, cx + 11, 0, 74, cz - 11, cz + 11);
  const roof = new THREE.ConeGeometry(15.5, 8, 4);
  roof.rotateY(Math.PI / 4);
  roof.translate(cx, 78, cz);
  const mast = cyl(0.35, 0.5, 22, cx, 87.5, cz, 6);
  const arch = box(cx - 12.5, cx - 11, 0, 15, cz - 6, cz + 6);
  addPart('victoria-tower', 'Victoria Tower', 'towers', [body, roof, mast, arch]);
}
{
  const cx = -45, cz = -115;
  const shaft = box(cx - 6.1, cx + 6.1, 0, 40, cz - 6.1, cz + 6.1);
  const stage = box(cx - 6.5, cx + 6.5, 40, 61, cz - 6.5, cz + 6.5);
  const dialN = box(cx - 3.45, cx + 3.45, 51.45, 58.35, cz - 7.1, cz - 6.5);
  const dialS = box(cx - 3.45, cx + 3.45, 51.45, 58.35, cz + 6.5, cz + 7.1);
  const dialE = box(cx + 6.5, cx + 7.1, 51.45, 58.35, cz - 3.45, cz + 3.45);
  const dialW = box(cx - 7.1, cx - 6.5, 51.45, 58.35, cz - 3.45, cz + 3.45);
  const belfry = box(cx - 5.7, cx + 5.7, 61, 71, cz - 5.7, cz + 5.7);
  const bell = new THREE.CylinderGeometry(1.1, 2.2, 3.4, 10);
  bell.translate(cx, 66, cz);
  addPart('elizabeth-tower', 'Elizabeth Tower', 'towers', [shaft, stage, dialN, dialS, dialE, dialW, belfry, bell, spire(5.7, 71, 96.3, cx, cz)]);
}
{
  const cx = -30, cz = 0;
  addPart('central-tower', 'Central Tower', 'towers', [
    oct(8, 60, cx, 30, cz),
    spire(8, 60, 91, cx, cz, 8),
  ]);
}
addPart('speakers-tower', 'Speakers Tower', 'towers', [
  box(0, 10, 0, 40, -105, -95),
  spire(7, 40, 48, 5, -100, 6),
]);
addPart('chancellors-tower', 'Chancellors Tower', 'towers', [
  box(0, 10, 0, 40, 95, 105),
  spire(7, 40, 48, 5, 100, 6),
]);
addPart('st-stephens-tower', 'St Stephens Tower', 'towers', [
  box(-66, -54, 0, 38, 24, 36),
  spire(8.5, 38, 48, -60, 30, 6),
]);

// --- Chambers: both debating chambers, benches, throne, lobbies: 7 parts.
{
  const x0 = -37, x1 = -23, z0 = -74.4, z1 = -53.7;
  const geoms = [box(x0, x1, 0, 12, z0, z1)];
  geoms.push(box(-32.5, -27.5, 0, 5, z0, z0 + 3)); // Speaker's Chair
  for (let i = 0; i < 6; i++) {
    geoms.push(box(-36, -32, 0, 1.6, z0 + 4 + i * 2.6, z0 + 5.6 + i * 2.6));
    geoms.push(box(-28, -24, 0, 1.6, z0 + 4 + i * 2.6, z0 + 5.6 + i * 2.6));
  }
  geoms.push(box(x0 - 6, x0, 0, 8, z0, z1)); // Aye division lobby
  geoms.push(box(x1, x1 + 6, 0, 8, z0, z1)); // No division lobby
  addPart('commons-chamber', 'House of Commons Chamber', 'chambers', geoms);
}
{
  const x0 = -36.7, x1 = -23, z0 = 52, z1 = 76.4;
  const geoms = [box(x0, x1, 0, 12, z0, z1)];
  geoms.push(box(-32.5, -27.5, 0, 6, z1 - 3, z1)); // throne
  geoms.push(box(-33.5, -26.5, 6, 8, z1 - 4, z1 + 1)); // canopy
  for (let i = 0; i < 5; i++) {
    geoms.push(box(-36, -33.5, 0, 1.6, z0 + 4 + i * 3, z0 + 6 + i * 3));
    geoms.push(box(-26.5, -24, 0, 1.6, z0 + 4 + i * 3, z0 + 6 + i * 3));
  }
  for (let i = 0; i < 4; i++) {
    geoms.push(box(-33 + i * 2.4, -31.4 + i * 2.4, 0, 1.6, z0 + 1, z0 + 3));
  }
  addPart('lords-chamber', 'House of Lords Chamber', 'chambers', geoms);
}
addPart('members-lobby', 'Members Lobby', 'chambers', [
  box(-36.85, -23.15, 0, 13.7, -53.7, -40),
]);
addPart('peers-lobby', 'Peers Lobby', 'chambers', [
  box(-36, -24, 0, 10, 40, 52),
]);
{
  const geoms = [
    box(-36.7, -23, 0, 10, 119.5, 132.9), // Robing Room
    box(-32, -28, 0, 4.5, 126, 128), // Chair of State
    box(-36.7, -23, 0, 13.7, 86, 119.5), // Royal Gallery
    box(-36.7, -23, 0, 10, 76.4, 86), // Prince's Chamber
    box(-50, -40, 0, 8, 104, 110), // Norman Porch beneath Victoria Tower
  ];
  addPart('royal-apartments', 'Royal Apartments', 'chambers', geoms);
}

// --- Centre: Central Lobby and the medieval hall: 4 parts.
{
  const cx = -30, cz = 0;
  const vault = new THREE.SphereGeometry(9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  vault.translate(cx, 23, cz);
  addPart('central-lobby', 'Central Lobby', 'centre', [
    oct(9, 23, cx, 11.5, cz),
    vault,
  ]);
}
addPart('commons-corridor', 'Commons Corridor', 'centre', [box(-33, -27, 0, 8, -40, -9)]);
addPart('peers-corridor', 'Peers Corridor', 'centre', [box(-33, -27, 0, 8, 9, 40)]);
addPart('st-stephens-hall', 'St Stephens Hall', 'centre', [box(-58, -40, 0, 10, 18, 34)]);

// --- Frontage: river front, terrace, roofs, west facade: 5 parts.
{
  const geoms = [
    box(-60, 5, 0, 21.3, -132.9, 132.9), // river front wall
    box(-60.5, -60, 0, 21.3, -132.9, 132.9), // west front facade
    box(-60, 5, 0, 21.3, -134.9, -132.9), // north front
    box(-60, 5, 0, 21.3, 132.9, 134.9), // south front
  ];
  addPart('palace-frontage', 'Palace frontage', 'frontage', geoms);
}
addPart('river-terrace', 'River Terrace', 'frontage', [
  box(5, 15, 0, 0.6, -103.35, 103.35),
  box(14.6, 15, 0.6, 2.2, -103.35, 103.35),
]);
{
  const roof = new THREE.CylinderGeometry(9.2, 9.2, 265.8, 3, 1);
  roof.rotateZ(Math.PI / 2);
  roof.rotateY(Math.PI / 2);
  roof.translate(-27.5, 21.3 + 4.6, 0);
  addPart('main-roof', 'Main roof', 'frontage', [roof]);
}
{
  const chimneys = [];
  for (let z = -120; z <= 120; z += 20) {
    for (const x of [-45, -15]) {
      chimneys.push(box(x - 1, x + 1, 27, 34, z - 1, z + 1));
    }
  }
  addPart('roof-chimneys', 'Roof chimneys', 'frontage', chimneys);
}
{
  const pins = [];
  for (let z = -125; z <= 125; z += 12.5) {
    pins.push(spire(1.2, 21.3, 28, 5, z, 6));
    pins.push(spire(1.2, 21.3, 28, -60, z, 6));
  }
  addPart('frontage-pinnacles', 'Frontage pinnacles', 'frontage', pins);
}

// --- Hall: Westminster Hall and its roof: 4 parts.
{
  const x0 = -85, x1 = -64.3, z0 = 20, z1 = 93.2;
  const roof = new THREE.CylinderGeometry(7.3, 7.3, 73.2, 3, 1);
  roof.rotateZ(Math.PI / 2);
  roof.rotateY(Math.PI / 2);
  roof.translate((x0 + x1) / 2, 16 + 3.6, (z0 + z1) / 2);
  addPart('westminster-hall', 'Westminster Hall', 'hall', [box(x0, x1, 0, 16, z0, z1)]);
  addPart('westminster-hall-roof', 'Westminster Hall roof', 'hall', [roof]);
  addPart('westminster-hall-porches', 'Westminster Hall porches', 'hall', [
    box(x0 - 4, x1 + 4, 0, 10, z0 - 6, z0),
    box(x0 - 4, x1 + 4, 0, 10, z1, z1 + 6),
  ]);
  const s = new THREE.ConeGeometry(1, 3.5, 8);
  s.translate(-100, 1.75, 107);
  addPart('cromwell-statue', 'Cromwell statue', 'hall', [s, box(-101.5, -98.5, 0, 1.2, 105.5, 108.5)]);
}

// --- Grounds: yards, courts and gardens: 8 parts.
{
  const slab = (x0, x1, z0, z1) => box(x0, x1, -0.4, 0, z0, z1);
  addPart('new-palace-yard', 'New Palace Yard', 'grounds', [slab(-60, 15, -160, -135)]);
  addPart('old-palace-yard', 'Old Palace Yard', 'grounds', [slab(-130, -85, 10, 100)]);
  addPart('cromwell-green', 'Cromwell Green', 'grounds', [slab(-115, -88, 95, 120)]);
  addPart('palace-courtyards', 'Palace courtyards', 'grounds', [
    slab(-52, -20, -112, -96), // Speaker's Court
    slab(-52, -40, 8, 24), // State Officer's Court
    slab(-20, -8, 60, 76), // Royal Court
  ]);
  addPart('black-rods-garden', 'Black Rods Garden', 'grounds', [slab(-60, -35, 135, 155)]);
  addPart('victoria-tower-gardens', 'Victoria Tower Gardens', 'grounds', [slab(-35, 20, 135, 185)]);
  addPart('speakers-green', 'Speakers Green', 'grounds', [slab(-50, -5, -185, -135)]);
  addPart('college-green', 'College Green', 'grounds', [slab(-110, -85, -20, 10)]);
}

// ---------------------------------------------------------------- colors
// Schematic light stone palette (same family as the detailed model;
// the Eiffel Tower is the only dark realistic model in the atlas).
function colorFor(id) {
  if (id === 'elizabeth-tower') return '#d9cfbb';
  if (id === 'victoria-tower') return '#d9cfbb';
  if (id === 'central-tower') return '#d9cfbb';
  if (id === 'commons-chamber') return '#1e5c3a';
  if (id === 'lords-chamber') return '#8f1f1f';
  if (id === 'royal-apartments') return '#9a7a6a';
  if (id === 'members-lobby' || id === 'peers-lobby') return '#a89a80';
  if (id === 'central-lobby') return '#d9cfbb';
  if (id === 'commons-corridor' || id === 'peers-corridor' || id === 'st-stephens-hall') return '#a89a80';
  if (id === 'river-terrace') return '#b9b2a0';
  if (id === 'main-roof' || id === 'roof-chimneys' || id === 'westminster-hall-roof') return '#8a8478';
  if (id === 'westminster-hall-porches') return '#d9cfbb';
  if (id === 'cromwell-statue') return '#3f4448';
  if (id === 'palace-courtyards') return '#b9b2a0';
  if (['victoria-tower-gardens', 'black-rods-garden', 'speakers-green', 'college-green', 'cromwell-green'].includes(id)) return '#3f7a3f';
  if (['new-palace-yard', 'old-palace-yard'].includes(id)) return '#b9b2a0';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'towers', name: 'Towers', color: '#d9cfbb', description: 'The three principal towers: Victoria Tower at 98.5 m, Elizabeth Tower at 96.3 m and the octagonal Central Tower at 91 m, plus the three minor towers.' },
  { id: 'chambers', name: 'Chambers and lobbies', color: '#a89a80', description: 'The two debating chambers with their benches, the division lobbies, the Members and Peers lobbies, and the Royal Apartments.' },
  { id: 'centre', name: 'Centre', color: '#d9cfbb', description: 'The octagonal Central Lobby below the Central Tower, with the corridors to each House and St Stephens Hall.' },
  { id: 'frontage', name: 'Frontage and roofs', color: '#d9cfbb', description: 'The 265.8 m river frontage on the Thames, the Terrace, and the main roof with its chimney stacks.' },
  { id: 'hall', name: 'Westminster Hall', color: '#d9cfbb', description: 'The oldest structure on the estate, completed in 1099, with the largest medieval timber roof in Northern Europe.' },
  { id: 'grounds', name: 'Courtyards and grounds', color: '#b9b2a0', description: 'The yards, courts and gardens inside and around the palace.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'victoria tower': 'The Victoria Tower at the south-western corner of the palace, 98.5 m tall, the tallest part of the palace and the tallest secular building in the world when it was completed in 1858. Its base holds the Sovereigns Entrance with its 15 m archway, and its interior houses the Parliamentary Archives. Exact window divisions are schematic.',
  'elizabeth tower': 'The Elizabeth Tower at the north end of the palace, 96.3 m tall, designed by Augustus Pugin and completed in 1859. Its four dials are 6.9 m across and the Great Bell, Big Ben, weighs 13.8 tonnes. Exact dial and spire detail is schematic.',
  'central tower': 'The octagonal Central Tower over the middle of the palace, 91 m tall, the shortest of the three principal towers. It was added as a ventilation chimney and is the only palace tower with a stone spire. Exact profile is schematic.',
  'speakers tower': 'Speakers Tower, the pavilion at the northern end of the river front, containing Speakers House. Exact massing is schematic.',
  'chancellors tower': 'Chancellors Tower, the pavilion at the southern end of the river front. Exact massing is schematic.',
  'st stephens tower': 'St Stephens Tower in the middle of the west front, housing the public entrance to the palace. Exact massing is schematic.',
  'house of commons chamber': 'The Chamber of the House of Commons at the northern end of the palace, 14 by 20.7 m, opened in 1950 after the Victorian chamber was destroyed by German bombs in 1941. Its benches are green; the chamber seats only 427 of the 650 members.',
  'house of lords chamber': 'The Chamber of the House of Lords in the southern part of the palace, 13.7 by 24.4 m, with red benches on three sides, the Sovereigns Throne under its gilded canopy, and the Woolsack.',
  'members lobby': 'The Members Lobby, a cube of 13.7 m, where members of Parliament hold discussions and are interviewed by accredited journalists, collectively known as The Lobby.',
  'peers lobby': 'The Peers Lobby north of the Lords Chamber, 12 m square and 10 m high, with a floor centrepiece of a radiant Tudor rose made of Derbyshire marbles.',
  'royal apartments': 'The monarchs processional rooms at the southern end of the palace: the Norman Porch, the Robing Room with the Chair of State, the 33.5 m Royal Gallery and the Princes Chamber. Exact room layouts are schematic.',
  'central lobby': 'The Central Lobby, originally named Octagon Hall, 18 m across and 23 m from the floor to the centre of the vaulted ceiling, directly below the Central Tower. It is the political heart of the palace and the origin of the term lobbying.',
  'commons corridor': 'The Commons Corridor leading north from the Central Lobby toward the Members Lobby. Exact decoration is schematic.',
  'peers corridor': 'The Peers Corridor leading south from the Central Lobby toward the Peers Lobby. Exact decoration is schematic.',
  'st stephens hall': 'St Stephens Hall, the public route from St Stephens Entrance to the Central Lobby, with marble statues of prominent parliamentarians. Exact interior is schematic.',
  'palace frontage': 'The palace frontage: 265.8 m of river front facing the Thames, 21.3 m to the roofline, with the north front 70.7 m and the south front 98.2 m, built of sand-coloured Anston limestone. Exact bay divisions are schematic.',
  'river terrace': 'The River Terrace on the Thames side, 206.7 m by 10 m, with its balustrade. Exact terrace detail is schematic.',
  'main roof': 'The main pitched roof of the palace behind the river front. Exact roof profile is schematic.',
  'roof chimneys': 'Chimney stacks along the main roof. About four hundred fires burned around the palace. Exact stack positions are schematic.',
  'frontage pinnacles': 'Pinnacles rising between the window bays along the frontage, enlivening the skyline. Exact pinnacle shapes are schematic.',
  'westminster hall': 'Westminster Hall, the oldest structure on the estate, completed in 1099, 20.7 m by 73.2 m, saved from the 1834 fire by firefighting efforts and a change in the wind.',
  'westminster hall roof': 'The hammerbeam roof of Westminster Hall, the largest medieval timber roof in Northern Europe. Exact timber work is schematic.',
  'westminster hall porches': 'The north and south porches of Westminster Hall. Exact porch detail is schematic.',
  'cromwell statue': 'The bronze statue of Oliver Cromwell on Cromwell Green, erected amid controversy in 1899. Exact statue is schematic.',
  'new palace yard': 'New Palace Yard on the north side of the palace, private and closed to the public. Exact layout is schematic.',
  'old palace yard': 'Old Palace Yard in front of the palace, paved over and covered in concrete security blocks. Exact layout is schematic.',
  'cromwell green': 'Cromwell Green outside Westminster Hall. Exact layout is schematic.',
  'palace courtyards': 'The internal courtyards of the palace: Speakers Court, State Officers Court and Royal Court. Exact layouts are schematic.',
  'black rods garden': 'Black Rods Garden, named after the Gentleman Usher of the Black Rod, closed to the public and used as a private entrance. Exact layout is schematic.',
  'victoria tower gardens': 'Victoria Tower Gardens, a public park along the river south of the palace. Exact layout is schematic.',
  'speakers green': 'Speakers Green, directly north of the palace, private and closed to the public. Exact layout is schematic.',
  'college green': 'College Green opposite the House of Lords, commonly used for television interviews with politicians. Exact layout is schematic.',
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
const binName = 'palace-of-westminster-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the palace-of-westminster-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Palace of Westminster, London (simplified schematic)',
  title: 'Palace of Westminster',
  location: 'London, England',
  blurb: 'The Palace of Westminster in London, meeting place of the UK Parliament, in simplified schematic form: nearly 300 m of Perpendicular Gothic Revival river frontage on the Thames, with the 98.5 m Victoria Tower, the 96.3 m Elizabeth Tower housing the Great Bell Big Ben, and the 91 m octagonal Central Tower.',
  sourceUrls: [
    { label: 'Wikipedia: Palace of Westminster', url: 'https://en.wikipedia.org/wiki/Palace_of_Westminster' },
    { label: 'Wikipedia: Big Ben (Elizabeth Tower)', url: 'https://en.wikipedia.org/wiki/Clock_Tower,_Palace_of_Westminster' },
    { label: 'Wikipedia: Victoria Tower', url: 'https://en.wikipedia.org/wiki/Victoria_Tower' },
    { label: 'parliament.uk: Palace of Westminster factsheet', url: 'http://www.parliament.uk/documents/lords-information-office/2013/palace-of-westminster-factsheet.pdf' },
    { label: 'parliament.uk: House of Commons factsheet G11', url: 'https://b5d7ac.staticwbm.com/20131203040742/http://www.parliament.uk/documents/commons-information-office/g11.pdf' },
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
  chunks: [{ url: '/models/palace-of-westminster-simple/palace-of-westminster-simple-0.bin', bytes: offset }],
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
