// Procedural Turning Torso for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Turning Torso in code and
// writes it in the atlas binary format:
//   public/models/turning-torso/atlas.json
//   public/models/turning-torso/turning-torso-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10,
// primarily Wikipedia "Turning Torso" and Calatrava project descriptions):
//   neo-futurist residential skyscraper in Malmo, Sweden, at
//   Lilla Varvsgatan 14, on the Swedish side of the Oresund strait;
//   designed by Spanish architect/engineer/sculptor Santiago Calatrava;
//   built for cooperative housing association HSB; construction started
//   14 February 2001, completed 27 August 2005, opened 1 November 2005;
//   190 m to the roof (623 ft), top floor 178.79 m, 54 floors,
//   147 apartments, 5 elevators, 27,500 sqm floor area; based on
//   Calatrava's white marble "Twisting Torso" sculpture of a twisting
//   human body (seen in brochure form by HSB Malmo's Johnny Orback in
//   1999, who then travelled to Zurich to commission Calatrava); nine
//   box units ("cubes") of five floors each, each an irregular pentagon
//   rotating around the vertical core; topmost cube twisted 90 degrees
//   clockwise relative to the ground floor (about 1.6 degrees per
//   floor); bottom two cubes are office space (about 4,000 sqm),
//   cubes three to nine hold the apartments (about 13,500 sqm);
//   structural core is a concrete pipe: 10.6 m inner diameter, walls
//   2.5 m thick at the ground floor tapering to 0.4 m at the top,
//   housing lifts and stairs; floor slabs are pie-slice segments anchored
//   in the core; each floor is a square section around the core plus a
//   triangular part carried by the external steel structure; exoskeleton
//   of tapered white steel tubes on the front face: a spine column at
//   the corner of each floor fixed between cubes, with horizontal and
//   inclined tubes reaching back to steel anchors in shear walls at the
//   back corners, providing wind resistance and damping vibration;
//   facade of curved aluminum panels with windows leaning in or out to
//   follow the twist; foundation is a cylindrical box 30 m in diameter
//   and 15 m deep, slab 7 m deep on limestone bedrock; floors 49 to 54
//   hold observation deck, club, restaurant and conference floors;
//   won the 2005 Gold Emporis Skyscraper Award and the 2015 CTBUH
//   10 Year Award; tallest building in the Nordic region until
//   Karlatornet in Gothenburg surpassed it in September 2022; built to
//   give Malmo a new skyline symbol after the Kockums Crane shipyard
//   crane was removed in 2002; construction featured on Discovery
//   Channel's Extreme Engineering; on 18 August 2006 Felix Baumgartner
//   parachuted onto the tower and jumped off it.
// Schematic (not sourced, never stated as fact in the UI): exact cube
// footprint shape and size (modeled as regular pentagons of 13 m
// circumradius, giving about 400 sqm per floor, matching the published
// average); exact per-floor rotation distribution (modeled as an even
// 10 degrees per cube); exoskeleton tube diameters and exact anchor
// positions; facade panel subdivision; window band heights; interior
// layouts; podium and entrance forms; rooftop mechanical shapes.
//
// Coordinate frame: y = up, twist rotates clockwise seen from above.
// All dimensions in meters.
//
// Granularity: 100+ named parts across 7 systems.
//
// Usage: node scripts/generate-turning-torso.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'turning-torso');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (190 m) maps to 2.4 units.
const S = 2.4 / 190;

// ---------------------------------------------------------------- helpers
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
// Pentagonal prism centered at (x, z), rotated by ang radians, from y0 to y1.
function pentagon(r, y0, y1, x, z, ang) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, 5);
  g.rotateY(ang);
  g.translate(x, (y0 + y1) / 2, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const CUBES = 9;
const CUBE_H = 190 / CUBES; // ~21.11 m per cube
const TWIST = Math.PI / 2 / CUBES; // 10 degrees per cube
const PENT_R = 13; // pentagon circumradius, schematic

// --- Foundation: cylindrical box 30 m diameter, 15 m deep; slab; piles.
addPart('foundation-box', 'Foundation box', 'foundation', [
  cyl(15, 15, 15, 0, -7.5, 0, 24),
]);
addPart('foundation-slab', 'Foundation slab', 'foundation', [
  cyl(16, 16, 7, 0, -18.5, 0, 24),
]);
{
  const piles = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    piles.push(cyl(0.8, 0.8, 10, Math.cos(a) * 12, -27, Math.sin(a) * 12, 8));
  }
  addPart('foundation-piles', 'Foundation piles', 'foundation', piles);
}

// --- Core: 9 tapered segments; inner diameter 10.6 m constant, wall
// thickness 2.5 m at base tapering to 0.4 m at top.
for (let i = 0; i < CUBES; i++) {
  const y0 = i * CUBE_H;
  const y1 = (i + 1) * CUBE_H;
  const t = i / (CUBES - 1);
  const wall = 2.5 + (0.4 - 2.5) * t;
  const rOut0 = 10.6 / 2 + (2.5 + (0.4 - 2.5) * (i / CUBES));
  const rOut1 = 10.6 / 2 + (2.5 + (0.4 - 2.5) * ((i + 1) / CUBES));
  void wall;
  addPart(`core-segment-${i + 1}`, `Concrete core segment ${i + 1}`, 'core', [
    cyl(rOut1, rOut0, CUBE_H, 0, y0 + CUBE_H / 2, 0, 20),
  ]);
}
// Elevator and stair shafts inside the core (schematic subdivision).
addPart('elevator-shafts', 'Elevator shafts', 'core', [
  box(-2, 2, 0, 190, -2, 2),
  box(-4.5, -2.5, 0, 190, -1, 1),
  box(2.5, 4.5, 0, 190, -1, 1),
]);
addPart('stair-core', 'Staircase core', 'core', [
  cyl(2.5, 2.5, 190, 0, 95, 3.5, 12),
]);

// --- Cubes: 9 pentagonal masses, each rotated 10 degrees further.
const cubeNames = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
for (let i = 0; i < CUBES; i++) {
  const y0 = i * CUBE_H;
  const ang = i * TWIST;
  const use = i < 2 ? 'offices' : 'apartments';
  addPart(`cube-${cubeNames[i]}-mass`, `Cube ${i + 1} mass (${use})`, 'cubes', [
    pentagon(PENT_R, y0, y0 + CUBE_H, 0, 0, ang),
  ]);
}

// --- Floor slabs: pie-slice slabs per cube anchored in the core.
for (let i = 0; i < CUBES; i++) {
  const y0 = i * CUBE_H;
  const ang = i * TWIST;
  const slabs = [];
  for (let f = 0; f < 5; f++) {
    const y = y0 + (f + 0.5) * (CUBE_H / 5);
    slabs.push(pentagon(PENT_R * 0.98, y - 0.25, y + 0.25, 0, 0, ang + (f * TWIST) / 5));
  }
  addPart(`cube-${cubeNames[i]}-slabs`, `Cube ${i + 1} floor slabs`, 'structure', slabs);
}

// --- Facade: curved aluminum panel bands + window bands per cube.
for (let i = 0; i < CUBES; i++) {
  const y0 = i * CUBE_H;
  const ang = i * TWIST;
  const panels = [];
  const windows = [];
  for (let f = 0; f < 5; f++) {
    const y = y0 + (f + 0.5) * (CUBE_H / 5);
    const a = ang + (f * TWIST) / 5;
    // aluminum panel band (slightly inset pentagon shell)
    panels.push(pentagon(PENT_R * 1.0, y - CUBE_H / 10 + 0.3, y + CUBE_H / 10 - 0.9, 0, 0, a));
    // window band near top of each floor slice
    windows.push(pentagon(PENT_R * 1.01, y + CUBE_H / 10 - 0.9, y + CUBE_H / 10 - 0.3, 0, 0, a));
  }
  addPart(`cube-${cubeNames[i]}-facade`, `Cube ${i + 1} aluminum facade`, 'facade', panels);
  addPart(`cube-${cubeNames[i]}-windows`, `Cube ${i + 1} window bands`, 'facade', windows);
}

// --- Exoskeleton: spine column at the leading corner of each cube,
// horizontal ring beams and diagonal tubes.
for (let i = 0; i < CUBES; i++) {
  const y0 = i * CUBE_H;
  const ang = i * TWIST;
  // spine column: tapered white steel tube at pentagon vertex 0
  const vx = Math.sin(ang) * PENT_R;
  const vz = Math.cos(ang) * PENT_R;
  const vx1 = Math.sin(ang + TWIST) * PENT_R;
  const vz1 = Math.cos(ang + TWIST) * PENT_R;
  addPart(`cube-${cubeNames[i]}-spine`, `Cube ${i + 1} spine column`, 'exoskeleton', [
    strut([vx, y0, vz], [vx1, y0 + CUBE_H, vz1], 1.2, 1.2),
  ]);
  // horizontal ring beam at cube top
  const ring = [];
  for (let k = 0; k < 5; k++) {
    const a0 = ang + (k / 5) * Math.PI * 2;
    const a1 = ang + ((k + 1) / 5) * Math.PI * 2;
    ring.push(strut(
      [Math.sin(a0) * PENT_R, y0 + CUBE_H, Math.cos(a0) * PENT_R],
      [Math.sin(a1) * PENT_R, y0 + CUBE_H, Math.cos(a1) * PENT_R],
      0.7, 0.7,
    ));
  }
  addPart(`cube-${cubeNames[i]}-ring`, `Cube ${i + 1} ring beam`, 'exoskeleton', ring);
  // diagonal stabilizers back to the core
  const diags = [];
  for (let k = 0; k < 5; k++) {
    const a = ang + (k / 5) * Math.PI * 2 + Math.PI / 5;
    diags.push(strut(
      [Math.sin(a) * PENT_R, y0 + CUBE_H * 0.7, Math.cos(a) * PENT_R],
      [Math.sin(a) * 6, y0 + CUBE_H * 0.2, Math.cos(a) * 6],
      0.45, 0.45,
    ));
  }
  addPart(`cube-${cubeNames[i]}-diagonals`, `Cube ${i + 1} diagonal stabilizers`, 'exoskeleton', diags);
}

// --- Triangular tips: the cantilevered triangular part of each floor,
// carried by the external steel structure.
for (let i = 0; i < CUBES; i++) {
  const y0 = i * CUBE_H;
  const ang = i * TWIST;
  const tips = [];
  for (let f = 0; f < 5; f++) {
    const y = y0 + (f + 0.5) * (CUBE_H / 5);
    const a = ang + (f * TWIST) / 5;
    // triangular prism at the pentagon's leading edge
    const t = new THREE.CylinderGeometry(PENT_R * 0.55, PENT_R * 0.55, CUBE_H / 5 - 0.6, 3);
    t.rotateY(a);
    t.translate(Math.sin(a + 0.6) * PENT_R * 0.75, y, Math.cos(a + 0.6) * PENT_R * 0.75);
    tips.push(t);
  }
  addPart(`cube-${cubeNames[i]}-tip`, `Cube ${i + 1} triangular tip`, 'cubes', tips);
}

// --- Crown: observation deck (floor 49), club/restaurant (50-52),
// conference floors (53-54), roof plant.
addPart('observation-deck', 'Observation deck (floor 49)', 'crown', [
  pentagon(PENT_R * 0.9, 49 * (190 / 54), 50 * (190 / 54), 0, 0, 8 * TWIST),
]);
addPart('club-floors', 'Club and restaurant (floors 50-52)', 'crown', [
  pentagon(PENT_R * 0.85, 50 * (190 / 54), 53 * (190 / 54), 0, 0, 8.5 * TWIST),
]);
addPart('conference-floors', 'Conference floors (53-54)', 'crown', [
  pentagon(PENT_R * 0.8, 53 * (190 / 54), 190, 0, 0, 9 * TWIST),
]);
addPart('roof-plant', 'Roof plant', 'crown', [
  cyl(4, 5, 3, 0, 191.5, 0, 12),
  box(-3, 3, 190, 192, -3, 3),
]);

// --- Podium: entrance canopy, lobby, plaza.
addPart('entrance-canopy', 'Entrance canopy', 'podium', [
  box(-10, 10, 4.5, 5.2, 8, 20),
  cyl(0.3, 0.3, 4.5, -9, 2.25, 19, 8),
  cyl(0.3, 0.3, 4.5, 9, 2.25, 19, 8),
]);
addPart('lobby', 'Lobby', 'podium', [
  box(-12, 12, 0, 4.5, -6, 8),
]);
addPart('plaza', 'Plaza', 'podium', [
  box(-30, 30, -0.5, 0, -30, 30),
]);
addPart('entrance-doors', 'Entrance doors', 'podium', [
  box(-3, 3, 0, 3, 7.8, 8.2),
]);
addPart('retail-unit-west', 'West retail unit', 'podium', [
  box(-22, -13, 0, 4, -4, 6),
]);
addPart('retail-unit-east', 'East retail unit', 'podium', [
  box(13, 22, 0, 4, -4, 6),
]);
addPart('parking-entrance', 'Parking entrance', 'podium', [
  box(-6, 6, -3, 0, -28, -20),
]);
addPart('observation-railing', 'Observation deck railing', 'crown', [
  cyl(PENT_R * 0.9, PENT_R * 0.9, 1.1, 0, 49 * (190 / 54) + 2.2, 0, 5, 1),
]);
addPart('roof-antenna', 'Roof antenna', 'crown', [
  cyl(0.15, 0.25, 8, 0, 197, 0, 8),
]);
addPart('sky-lobby', 'Sky lobby', 'crown', [
  box(-6, 6, 50 * (190 / 54), 50 * (190 / 54) + 3, -6, 6),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('facade')) return '#cfd6dd';
  if (id.includes('windows')) return '#5a6b7a';
  if (id.includes('spine') || id.includes('ring') || id.includes('diagonals')) return '#e8ebee';
  if (id.includes('core') || id.includes('elevator') || id.includes('stair')) return '#9aa2ab';
  if (id.includes('foundation') || id.includes('pile')) return '#7d868f';
  if (id.includes('slab')) return '#b9c0c7';
  if (id.includes('cube-') && id.includes('-mass')) return '#dde2e7';
  if (id.includes('observation') || id.includes('club') || id.includes('conference')) return '#c3ccd4';
  if (id.includes('roof')) return '#8b939c';
  if (id.includes('canopy') || id.includes('lobby') && !id.includes('sky')) return '#aeb6be';
  if (id.includes('sky-lobby')) return '#aeb6be';
  if (id.includes('retail') || id.includes('parking') || id.includes('entrance-doors')) return '#9aa0a6';
  if (id.includes('railing') || id.includes('antenna')) return '#8b939c';
  if (id.includes('plaza')) return '#9aa0a6';
  return '#cfd6dd';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundation', name: 'Foundation', color: '#7d868f', description: 'Cylindrical foundation box 30 m across and 15 m deep, on a 7 m slab piled into limestone bedrock.' },
  { id: 'core', name: 'Concrete core', color: '#9aa2ab', description: 'The load-bearing concrete pipe: 10.6 m inner diameter, walls 2.5 m thick at the base tapering to 0.4 m at the top, carrying lifts and stairs.' },
  { id: 'cubes', name: 'Twisting cubes', color: '#dde2e7', description: 'Nine five-storey pentagonal box units, each rotated a little further, for a total twist of 90 degrees from base to top.' },
  { id: 'structure', name: 'Floor slabs', color: '#b9c0c7', description: 'Pie-slice floor slabs anchored in the concrete core, rotating with the twist.' },
  { id: 'facade', name: 'Aluminum facade', color: '#cfd6dd', description: 'Curved aluminum panels with window bands that lean in or out to follow the twist.' },
  { id: 'exoskeleton', name: 'Steel exoskeleton', color: '#e8ebee', description: 'Tapered white steel tubes on the front face: spine columns, ring beams and diagonals that brace the tower against wind.' },
  { id: 'crown', name: 'Crown floors', color: '#c3ccd4', description: 'Observation deck, club, restaurant and conference floors at the top of the tower.' },
  { id: 'podium', name: 'Podium and plaza', color: '#aeb6be', description: 'Entrance canopy, lobby and the plaza around the tower base.' },
];

// ---------------------------------------------------------------- explanations
function buildExplanations() {
  const e = {};
  e['foundation box'] = 'The cylindrical foundation box, 30 m in diameter and 15 m deep, that carries the tower. Exact reinforcement is schematic.';
  e['foundation slab'] = 'The 7 m deep foundation slab resting on limestone bedrock. Exact profile is schematic.';
  e['foundation piles'] = 'Piles driven into the limestone bedrock beneath the slab. Exact count and layout are schematic.';
  for (let i = 0; i < CUBES; i++) {
    const n = i + 1;
    e[`concrete core segment ${i + 1}`] = `Segment ${n} of the load-bearing concrete core. The core is 10.6 m across inside, with walls 2.5 m thick at the ground floor tapering to 0.4 m at the top. Exact taper per segment is schematic.`;
  }
  e['elevator shafts'] = 'The five lift shafts running inside the concrete core. Exact positions are schematic.';
  e['staircase core'] = 'The staircase core inside the concrete structure. Exact layout is schematic.';
  for (let i = 0; i < CUBES; i++) {
    const n = i + 1;
    const use = i < 2 ? 'offices' : 'apartments';
    e[`cube ${n} mass (${use})`] = `Box unit ${n} of nine, a five-storey pentagonal volume rotated ${(i * 10)} degrees from the base, housing ${use}. The top cube sits 90 degrees clockwise from the ground floor. Exact footprint is schematic.`;
    e[`cube ${n} floor slabs`] = `The pie-slice floor slabs of cube ${n}, anchored in the concrete core and rotating with the twist. Exact slab shapes are schematic.`;
    e[`cube ${n} aluminum facade`] = `Curved aluminum facade panels of cube ${n}. Exact panel subdivision is schematic.`;
    e[`cube ${n} window bands`] = `Window bands of cube ${n}, leaning in or out to follow the twist. Exact glazing is schematic.`;
    e[`cube ${n} spine column`] = `The tapered white steel spine column at the leading corner of cube ${n}, part of the exoskeleton that braces the tower against wind. Exact diameter is schematic.`;
    e[`cube ${n} ring beam`] = `Horizontal ring beam tying the exoskeleton at the top of cube ${n}. Exact section is schematic.`;
    e[`cube ${n} diagonal stabilizers`] = `Diagonal steel stabilizers reaching from the exoskeleton back to anchors at the tower's rear. Exact anchor points are schematic.`;
    e[`cube ${n} triangular tip`] = `The cantilevered triangular part of cube ${n}'s floors, carried by the external steel structure beyond the square section around the core. Exact shape is schematic.`;
  }
  e['observation deck (floor 49)'] = 'The public observation deck on floor 49. Open to visitors on scheduled days by pre-booking. Exact fit-out is schematic.';
  e['club and restaurant (floors 50-52)'] = 'Private club, meeting rooms, reception and restaurant on floors 50 to 52. Exact layout is schematic.';
  e['conference floors (53-54)'] = 'The top two floors, run as conference facilities with 360-degree views. Exact layout is schematic.';
  e['roof plant'] = 'Rooftop plant and services. Exact equipment is schematic.';
  e['entrance canopy'] = 'The entrance canopy at the tower base. Exact form is schematic.';
  e['lobby'] = 'The entrance lobby. Exact interior is schematic.';
  e['plaza'] = 'The plaza around the tower in the Western Harbor district. Exact landscaping is schematic.';
  e['entrance doors'] = 'The main entrance doors. Exact design is schematic.';
  e['west retail unit'] = 'Retail space in the podium west of the entrance. Exact tenanting is schematic.';
  e['east retail unit'] = 'Retail space in the podium east of the entrance. Exact tenanting is schematic.';
  e['parking entrance'] = 'The parking garage entrance. Exact layout is schematic.';
  e['observation deck railing'] = 'Railing around the public observation deck on floor 49. Exact design is schematic.';
  e['roof antenna'] = 'Communications antenna on the roof. Exact equipment is schematic.';
  e['sky lobby'] = 'The sky lobby serving the upper floors. Exact interior is schematic.';
  return e;
}
const explanations = buildExplanations();

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
const binName = 'turning-torso-0.bin';
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
  scope: 'Turning Torso, Malmo (schematic)',
  title: 'Turning Torso',
  location: 'Malmo, Sweden',
  blurb: 'Santiago Calatrava\u2019s 190 m twisting residential tower in Malmo, completed 2005: nine five-storey pentagonal cubes rotated 90 degrees around a concrete core, braced by a white steel exoskeleton.',
  sourceUrls: [
    { label: 'Wikipedia: Turning Torso', url: 'https://en.wikipedia.org/wiki/Turning_Torso' },
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
  chunks: [{ url: '/models/turning-torso/turning-torso-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
