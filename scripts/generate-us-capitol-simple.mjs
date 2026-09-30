// Simplified schematic United States Capitol for the Architectural Atlas.
//
// The "simple" variant of the Capitol: same footprint, massing and
// proportions as the detailed model (see scripts/generate-us-capitol.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// 30 named parts across 7 systems instead of 104 across 11. The drum and
// dome shell merge into one dome mass; the 36-rib cage becomes an 18-rib
// cage; lantern drum, colonnade and cap merge; rotunda wall and interior
// merge; chambers lose their desks detail; wing porticos merge into one
// part; terraces and lawns merge into single masses. Every part is modeled
// fresh for this variant: no part name and no bounding box is shared with
// the detailed model.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-us-capitol.mjs for the full attribution):
//   751 ft 4 in long north to south; 350 ft greatest width; 287 ft 5 1/2 in
//   to the top of the Statue of Freedom; dome 288 ft tall, 96 ft in
//   diameter, cast iron, 1855-1866, by Thomas U. Walter; Statue of Freedom
//   19.5 ft bronze by Thomas Crawford, raised December 2, 1863; rotunda
//   96 ft in diameter, 180 ft high, built 1818-1824; Senate chamber floor
//   80 by 113 ft in the north wing, in use since January 4, 1859; House
//   chamber in the south wing since 1857; crypt with 40 Doric sandstone
//   columns; Olmsted marble terraces completed 1892; summerhouse 1879-1881.
// Schematic (not sourced, never stated as fact in the UI): all merged group
// geometry, simplified rib curves, column counts and positions.
//
// Writes:
//   public/models/us-capitol-simple/atlas.json
//   public/models/us-capitol-simple/us-capitol-simple-0.bin
//
// Usage: node scripts/generate-us-capitol-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'us-capitol-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (751 ft 4 in = 229.01 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 229.01;

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
function cyl(rt, rb, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function cone(r, h, x, y, z, seg = 10) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  return g;
}
function colRing(n, r, y0, y1, cr, cx = 0, cz = 0, seg = 8) {
  const g = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.push(cyl(cr, cr, y1 - y0, cx + r * Math.cos(a), (y0 + y1) / 2, cz + r * Math.sin(a), seg));
  }
  return g;
}
function stairs(x0, x1, y0, y1, z0, z1, n) {
  const g = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    g.push(box(x0 + (x1 - x0) * t0, x0 + (x1 - x0) * t1, y0, y0 + (y1 - y0) * t1, z0, z1));
  }
  return g;
}

// ---------------------------------------------------------------- layout constants (meters)
// Frame: x east, z south, y up.
const CBR = 14.6304; // 96 ft dome/rotunda radius
const CB = 53.59;    // central block half-length
const WINGX = 45, WINGZ = 114.5;

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Dome (5 parts).
{
  const g = [];
  const drum = new THREE.CylinderGeometry(CBR, CBR, 14, 18, 1, true);
  drum.translate(0, 25, 0);
  g.push(drum);
  const shell = new THREE.SphereGeometry(CBR, 18, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  shell.scale(1, 36 / CBR, 1);
  shell.translate(0, 32, 0);
  g.push(shell);
  addPart('dome-mass', 'Dome mass', 'dome', g);
}
addPart('dome-colonnade', 'Dome colonnade', 'dome', colRing(18, CBR, 18, 30, 0.7));
{
  const ribs = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    let prev = null;
    for (let j = 0; j <= 5; j++) {
      const t = j / 5;
      const r = CBR * Math.cos((t * Math.PI) / 2);
      const y = 32 + 36 * Math.sin((t * Math.PI) / 2);
      const p = [r * Math.cos(a), y, r * Math.sin(a)];
      if (prev) ribs.push(strut(prev, p, 0.8));
      prev = p;
    }
  }
  addPart('dome-ribbing', 'Dome ribbing', 'dome', ribs);
}
{
  const g = [];
  const drum = new THREE.CylinderGeometry(3.5, 3.5, 8, 12, 1, true);
  drum.translate(0, 72, 0);
  g.push(drum);
  g.push(cone(3.9, 6, 0, 77, 0, 12));
  addPart('dome-lantern', 'Dome lantern', 'dome', g);
}
{
  // Stylized figure, coarser than the detailed statue.
  const g = [];
  g.push(cyl(1.5, 1.7, 1.68, 0, 80.84, 0, 10));
  g.push(cone(1.0, 3.2, 0, 83.3, 0, 8));
  g.push(cyl(0.5, 0.65, 1.0, 0, 85.4, 0, 8));
  const head = new THREE.SphereGeometry(0.42, 8, 6);
  head.translate(0, 86.3, 0);
  g.push(head);
  g.push(cone(0.5, 0.9, 0, 87.0, 0, 6));
  addPart('freedom-statue', 'Freedom statue', 'dome', g);
}

// --- Rotunda (3 parts).
addPart('rotunda-mass', 'Rotunda mass', 'rotunda', [
  (() => { const g = new THREE.CylinderGeometry(CBR, CBR, 21.93, 18, 1, true); g.translate(0, 21.93 / 2, 0); return g; })(),
  cyl(13.0, 13.0, 0.4, 0, 7.1, 0, 18),
]);
addPart('rotunda-canopy', 'Rotunda canopy', 'rotunda', [
  (() => { const g = new THREE.CylinderGeometry(3.2, 13.0, 61.8 - 21.93, 18, 1, true); g.translate(0, (21.93 + 61.8) / 2, 0); return g; })(),
  cyl(3.2, 3.2, 0.4, 0, 61.6, 0, 18),
]);
addPart('rotunda-doorways', 'Rotunda doorways', 'rotunda', [
  box(-2.2, 2.2, 7.3, 12.5, CBR - 0.4, CBR + 0.5),
  box(-2.2, 2.2, 7.3, 12.5, -CBR - 0.5, -CBR + 0.4),
  box(CBR - 0.4, CBR + 0.5, 7.3, 12.5, -2.2, 2.2),
  box(-CBR - 0.5, -CBR + 0.4, 7.3, 12.5, -2.2, 2.2),
]);

// --- Central block and crypt (5 parts).
addPart('central-block-mass', 'Central block mass', 'center-crypt', [
  box(-20, 20, 0, 18.8, -CB, CB),
]);
{
  const hall = new THREE.CylinderGeometry(10, 10, 14 - 7.3, 12, 1, false, 0, Math.PI);
  hall.rotateY(-Math.PI / 2);
  hall.translate(0, (7.3 + 14) / 2, 28);
  addPart('statuary-hall', 'Statuary Hall', 'center-crypt', [hall]);
}
addPart('old-chambers', 'Old chambers', 'center-crypt', [
  box(-16, 16, 0, 14.5, -40, -22),
]);
{
  const g = [];
  for (let ix = 0; ix < 4; ix++) {
    for (let iz = 0; iz < 6; iz++) {
      const x = (ix - 1.5) * 5.2, z = (iz - 2.5) * 4.1;
      if (Math.hypot(x, z) > 12) continue;
      g.push(cyl(0.7, 0.7, 7.3, x, 3.65, z, 8));
    }
  }
  addPart('crypt-colonnade', 'Crypt colonnade', 'center-crypt', g);
}
addPart('crypt-vault', 'Crypt vault', 'center-crypt', [
  box(-13, 13, 6.8, 7.3, -13, 13),
]);

// --- Senate wing (3 parts).
addPart('senate-wing-mass', 'Senate wing mass', 'senate-wing', [
  box(-WINGX, WINGX, 0, 20.8, -WINGZ, -CB),
]);
addPart('senate-meeting-chamber', 'Senate meeting chamber', 'senate-wing', [
  box(-13, 13, 7, 17, -103, -67),
]);
{
  const g = [];
  for (let row = 0; row < 3; row++) {
    const r = 5 + row * 3;
    for (let k = 0; k < 20; k++) {
      const a = -1.2 + (2.4 * k) / 19;
      const x = 11 - r * Math.cos(a), z = -85 + r * Math.sin(a);
      g.push(box(x - 0.5, x + 0.5, 7 + row * 0.6, 7.8 + row * 0.6, z - 0.4, z + 0.4));
    }
  }
  addPart('senate-seating', 'Senate seating', 'senate-wing', g);
}

// --- House wing (3 parts).
addPart('house-wing-mass', 'House wing mass', 'house-wing', [
  box(-WINGX, WINGX, 0, 20.8, CB, WINGZ),
]);
addPart('house-meeting-chamber', 'House meeting chamber', 'house-wing', [
  box(-17, 17, 7, 17.5, 65, 109),
]);
{
  const g = [];
  for (let row = 0; row < 4; row++) {
    const r = 6 + row * 3;
    for (let k = 0; k < 40; k++) {
      const a = -1.25 + (2.5 * k) / 39;
      const x = 14 - r * Math.cos(a), z = 87 + r * Math.sin(a);
      g.push(box(x - 0.5, x + 0.5, 7 + row * 0.6, 7.8 + row * 0.6, z - 0.4, z + 0.4));
    }
  }
  addPart('house-seating', 'House seating', 'house-wing', g);
}

// --- Porticos and terraces (6 parts).
{
  const g = [];
  for (let i = 0; i < 8; i++) {
    const z = -16 + (32 * i) / 7;
    g.push(cyl(0.75, 0.85, 16 - 7.3, 24, (7.3 + 16) / 2, z, 8));
  }
  g.push(box(22.5, 25.5, 16, 17.2, -18, 18));
  addPart('east-front-portico', 'East front portico', 'porticos', g);
}
{
  const g = [];
  for (let i = 0; i < 8; i++) {
    const z = -16 + (32 * i) / 7;
    g.push(cyl(0.75, 0.85, 16 - 7.3, -24, (7.3 + 16) / 2, z, 8));
  }
  g.push(box(-25.5, -22.5, 16, 17.2, -18, 18));
  addPart('west-front-portico', 'West front portico', 'porticos', g);
}
{
  const g = [];
  for (const [cx, z0, z1] of [[-49, -100, -70], [49, -100, -70], [-49, 70, 100], [49, 70, 100]]) {
    for (let i = 0; i < 4; i++) {
      const z = z0 + ((z1 - z0) * i) / 3;
      g.push(cyl(0.75, 0.85, 12.7, cx, 13.65, z, 8));
    }
  }
  for (const [cx, z0, z1] of [[0, -WINGZ - 4, 0], [0, WINGZ + 4, 0]]) {
    for (let i = 0; i < 6; i++) {
      const x = -15 + (30 * i) / 5;
      g.push(cyl(0.75, 0.85, 12.7, x, 13.65, z0 < 0 ? -WINGZ - 4 : WINGZ + 4, 8));
    }
  }
  addPart('wing-porticos', 'Wing porticos', 'porticos', g);
}
addPart('front-steps', 'Front steps', 'porticos', stairs(26, 35, 0, 7.3, -13, 13, 8));
addPart('west-terrace', 'West terrace', 'porticos', [
  box(-54, -32, 0, 6.6, -80, 80),
]);
addPart('terrace-stairs', 'Terrace stairs', 'porticos', stairs(-66, -54, 0, 6.6, -8, 8, 10));

// --- Grounds (4 parts).
addPart('grounds-lawns', 'Grounds lawns', 'grounds', [box(-115, 115, -0.4, 0, -115, 115)]);
{
  const g = [];
  for (const [x, z] of [[-90, -50], [-95, 20], [-85, 60], [80, -55], [90, 30], [75, 65], [-60, -95], [70, 95]]) {
    g.push(cyl(0.3, 0.4, 2.4, x, 1.2, z, 6));
    g.push(cone(2.4, 3.6, x, 4.2, z, 6));
  }
  addPart('grounds-planting', 'Grounds planting', 'grounds', g);
}
{
  const g = [];
  const walls = new THREE.CylinderGeometry(4.2, 4.2, 3.6, 6, 1, true);
  walls.translate(-80, 1.8, -50);
  g.push(walls);
  const roof = new THREE.ConeGeometry(4.8, 1.8, 6);
  roof.translate(-80, 4.5, -50);
  g.push(roof);
  addPart('garden-summerhouse', 'Garden summerhouse', 'grounds', g);
}
addPart('reflecting-pool', 'Reflecting pool', 'grounds', [
  box(-110, -74, -0.3, 0.15, -6.5, 6.5),
]);

// --- Corridors (1 part).
addPart('connector-corridors', 'Connector corridors', 'corridors', [
  box(-4, 4, 0, 7.3, -62, -45),
  box(-4, 4, 0, 7.3, 45, 62),
  box(20, 36, 0, 7.3, -4, 4),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'dome-mass' || id === 'dome-ribbing' || id === 'dome-lantern') return '#ddd9cd';
  if (id === 'dome-colonnade') return '#e2ded2';
  if (id === 'freedom-statue') return '#7d8a68';
  if (id === 'rotunda-mass') return '#e6dcc3';
  if (id === 'rotunda-canopy') return '#efe6d0';
  if (id === 'rotunda-doorways') return '#6b5a44';
  if (id === 'central-block-mass') return '#e6dcc3';
  if (id === 'statuary-hall' || id === 'old-chambers') return '#efe6d0';
  if (id === 'crypt-colonnade') return '#c9bfa4';
  if (id === 'crypt-vault') return '#b5ab93';
  if (id === 'senate-wing-mass' || id === 'house-wing-mass') return '#efece2';
  if (id === 'senate-meeting-chamber' || id === 'house-meeting-chamber') return '#d9cba8';
  if (id === 'senate-seating' || id === 'house-seating') return '#8a6f4d';
  if (id === 'east-front-portico' || id === 'west-front-portico' || id === 'wing-porticos') return '#e8e4d6';
  if (id === 'front-steps' || id === 'terrace-stairs') return '#cfc4a8';
  if (id === 'west-terrace') return '#e8e4d6';
  if (id === 'grounds-lawns') return '#7fae6a';
  if (id === 'grounds-planting') return '#5d8a52';
  if (id === 'garden-summerhouse') return '#b08a5e';
  if (id === 'reflecting-pool') return '#7fb3d5';
  if (id === 'connector-corridors') return '#d9cba8';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'dome', name: 'Dome', color: '#ddd9cd', description: 'Walter\u2019s cast-iron dome, 288 ft tall: shell mass, colonnade, ribbing, lantern and the Statue of Freedom.' },
  { id: 'rotunda', name: 'Rotunda', color: '#e6dcc3', description: 'The 96 ft circular hall beneath the dome, built 1818 to 1824.' },
  { id: 'center-crypt', name: 'Center and Crypt', color: '#e6dcc3', description: 'The original central block, Statuary Hall, the old chambers and the crypt colonnade.' },
  { id: 'senate-wing', name: 'Senate Wing', color: '#efece2', description: 'The north wing: the Senate chamber, floor 80 by 113 ft, in use since January 4, 1859.' },
  { id: 'house-wing', name: 'House Wing', color: '#efece2', description: 'The south wing: the House chamber in use since 1857.' },
  { id: 'porticos', name: 'Porticos and Terraces', color: '#e8e4d6', description: 'Front and wing porticos, steps and Olmsted\u2019s west marble terrace (detail schematic).' },
  { id: 'grounds', name: 'Grounds', color: '#7fae6a', description: 'Lawns, planting, the 1879 to 1881 summerhouse and the Reflecting Pool (layout schematic).' },
  { id: 'corridors', name: 'Corridors', color: '#d9cba8', description: 'The corridors linking the rotunda to the wings and the East Front.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'dome mass': 'Walter\u2019s cast-iron dome in one mass: the drum and the ribbed shell, 288 ft tall and 96 ft in diameter, built 1855 to 1866. Exact profile is schematic.',
  'dome colonnade': 'A simplified ring of the dome\u2019s peristyle: the real colonnade is 36 hollow cast-iron Corinthian columns by Poole and Hunt. Count and positions are schematic.',
  'dome ribbing': 'A simplified cage of the dome\u2019s cast-iron ribs, built by Janes, Fowler, Kirtland and Co. Exact curvature is schematic.',
  'dome lantern': 'The tholos lantern above the dome, merged with its cap, carrying the Statue of Freedom. Dimensions are schematic.',
  'freedom statue': 'The 19.5 ft bronze Statue of Freedom by Thomas Crawford, raised December 2, 1863. This figure is a stylized schematic.',
  'rotunda mass': 'The circular rotunda wall, 96 ft across, built 1818 to 1824 under Charles Bulfinch. Exact treatment is schematic.',
  'rotunda canopy': 'The inner dome rising 180 ft above the rotunda floor to Brumidi\u2019s Apotheosis of Washington. Exact profile is schematic.',
  'rotunda doorways': 'The rotunda\u2019s four doorways: north to the Senate, south to the House, east to the front, west to the terraces. Exact design is schematic.',
  'central block mass': 'The original central building from Thornton\u2019s 1793 design, 351 ft 7 1/2 in long before the extensions. Exact massing is schematic.',
  'statuary hall': 'The semi-circular National Statuary Hall south of the rotunda, the House chamber until 1857. Exact shape is schematic.',
  'old chambers': 'The old Senate and Supreme Court chambers northeast of the rotunda, used until 1859 and 1935. Interiors are schematic.',
  'crypt colonnade': 'A simplified stand of the crypt\u2019s 40 Doric columns of Aquia Creek sandstone beneath the rotunda. Count and positions are schematic.',
  'crypt vault': 'The vaulted ceiling of the crypt carrying the rotunda floor. Exact vaulting is schematic.',
  'senate wing mass': 'The north wing of Walter\u2019s 1850s extension in Lee marble. Exact massing is schematic.',
  'senate meeting chamber': 'The Senate chamber: a two-story room with an 80 by 113 ft floor, in use since January 4, 1859. Interior is schematic.',
  'senate seating': 'A simplified arc of the 100 senators\u2019 desks facing the rostrum. Arrangement is schematic.',
  'house wing mass': 'The south wing of Walter\u2019s 1850s extension in Lee marble. Exact massing is schematic.',
  'house meeting chamber': 'The House chamber, in use since 1857. Dimensions and interior are schematic.',
  'house seating': 'A simplified arc of the 435 representatives\u2019 desks. Arrangement is schematic.',
  'east front portico': 'The columned East Portico, the ceremonial front. Column count and positions are schematic.',
  'west front portico': 'The columned West Portico facing the National Mall. Column count and positions are schematic.',
  'wing porticos': 'The simplified colonnades of the Senate and House wings. Counts and positions are schematic.',
  'front steps': 'The grand steps of the East Front. Exact step count is schematic.',
  'west terrace': 'Olmsted\u2019s multitiered marble terrace along the west front, completed 1892. Tier heights are schematic.',
  'terrace stairs': 'The grand stairs of the west terrace. Exact stair is schematic.',
  'grounds lawns': 'The lawns of the Capitol grounds in one mass. Extent is schematic.',
  'grounds planting': 'A simplified stand of Olmsted\u2019s planting, over 100 varieties of trees and bushes. Positions are schematic.',
  'garden summerhouse': 'The brick summerhouse northwest of the building, built 1879 to 1881, with a central drinking fountain. Exact form is schematic.',
  'reflecting pool': 'The Capitol Reflecting Pool west of the terraces. Exact extent is schematic.',
  'connector corridors': 'The corridors linking the rotunda to the Senate wing, the House wing and the East Front. Exact routes are schematic.',
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
const binName = 'us-capitol-simple-0.bin';
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
  scope: 'United States Capitol, Washington DC (simple schematic)',
  title: 'United States Capitol',
  location: 'Washington, D.C., United States',
  blurb: 'The United States Congress on Capitol Hill in simplified massing: the cast-iron dome with the Statue of Freedom, the Rotunda, and the north Senate and south House wings.',
  sourceUrls: [
    { label: 'Wikipedia: United States Capitol', url: 'http://en.wikipedia.org/wiki/United_States_Capitol' },
    { label: 'Wikipedia: United States Capitol dome', url: 'https://en.wikipedia.org/wiki/United_States_Capitol_dome' },
    { label: 'Architect of the Capitol: Frederick Law Olmsted', url: 'https://www.aoc.gov/explore-capitol-campus/frederick-law-olmsted' },
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
  chunks: [{ url: '/models/us-capitol-simple/us-capitol-simple-0.bin', bytes: offset }],
  triangles,
  // Coarser variant: 1.2 keeps the exploded cloud comfortably in frame.
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
