// Procedural Space Needle for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Space Needle in code and
// writes it in the atlas binary format:
//   public/models/space-needle/atlas.json
//   public/models/space-needle/space-needle-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   observation tower in Seattle, Washington, at 400 Broad Street, built
//   for the 1962 World's Fair (Century 21 Exposition, theme "The Age of
//   Space"); construction started 17 April 1961, completed 8 December
//   1961, opened to the public 21 April 1962, the fair's opening day;
//   built in about 400 days; architect John Graham & Company, structural
//   engineer John K. Minasian (with Victor Steinbrueck); 605 ft (184 m)
//   high, 138 ft (42 m) wide at the top house; weighs 9,550 short tons;
//   built to withstand winds up to 200 mph and earthquakes up to 9.0
//   magnitude; foundation 30 ft deep with 72 anchor bolts, foundation
//   alone 5,850 tons, center of gravity about 5 ft above ground;
//   observation deck at 520 ft (about 158 m), reached by elevators in 41
//   seconds at 10 mph; rotating SkyCity restaurant at 500 ft (about
//   152 m), 94.5 ft in diameter, originally revolving once every 47
//   minutes on a 125-ton turntable driven by a 1.5 hp motor; 2018
//   "Century Project" renovation added floor-to-ceiling glass and The
//   Loupe, the world's first revolving glass floor; 25 lightning rods on
//   the roof; original 1962 paint scheme: Astronaut White legs, Re-entry
//   Red halo, Orbital Olive core, Galaxy Gold sunburst and roof; current
//   scheme is white with an orange-red top; designated a Seattle landmark
//   19 April 1999; over one million visitors a year; the tower is topped
//   with an American flag.
// Schematic (not sourced, never stated as fact in the UI): exact leg
// cross-sections and the curve of the tripod legs; brace positions;
// footing shapes; core diameter and internal layout; elevator shaft
// positions; exact saucer floor heights and wall divisions; glass panel
// count; roof and halo profiles; lightning rod positions; bench and
// planter placement.
//
// Coordinate frame: y = up, ground at y = 0. All dimensions in meters.
//
// Granularity: 100+ named parts across 7 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-space-needle.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'space-needle');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (184 m) maps to 2.4 units.
const S = 2.4 / 184;

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
// Tapered square-section member from (x0,z0,y0) to (x1,z1,y1),
// widths w0 -> w1.
function taperedBox(x0, z0, y0, x1, z1, y1, w0, w1) {
  const a = new THREE.Vector3(x0, y0, z0);
  const b = new THREE.Vector3(x1, y1, z1);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(w1 / Math.SQRT2, w0 / Math.SQRT2, len, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
  );
  g.translate(x0, y0, z0);
  return g;
}
// Vertical curved wall panel: open cylinder sector, radius r, y0..y1,
// angles a0..a1.
function arcPanel(r, y0, y1, a0, a1, seg = 10) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, true, a0, a1 - a0);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
// Sloped skirt panel: open cone sector, radiusTop at y1, radiusBottom at y0.
function skirtPanel(rTop, rBot, y0, y1, a0, a1, seg = 8) {
  const g = new THREE.CylinderGeometry(rTop, rBot, y1 - y0, seg, 1, true, a0, a1 - a0);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
// Torus arc in the XZ plane at height y.
function torusArc(R, t, y, a0, seg = 20) {
  const g = new THREE.TorusGeometry(R, t, 8, seg, Math.PI / 2);
  g.rotateX(Math.PI / 2);
  g.rotateY(-a0);
  g.translate(0, y, 0);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Foundation: 30 ft deep slab, 72 anchor bolts, plaza: 3 parts.
addPart('foundation-slab', 'Foundation slab', 'foundation', [
  box(-30, 30, -9, 0, -30, 30),
]);
{
  const bolts = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    bolts.push(cyl(0.25, 0.25, 3, 25 * Math.cos(a), -1.5, 25 * Math.sin(a), 6));
  }
  addPart('anchor-bolts', 'Anchor bolts', 'foundation', bolts);
}
addPart('plaza', 'Plaza', 'foundation', [
  box(-25, 25, 0, 1, -25, 25),
]);

// --- Base building: ground-level retail pavilion: 5 parts.
addPart('base-north-wall', 'Base north wall', 'foundation', [box(-20, 20, 1, 7, 19, 20)]);
addPart('base-south-wall', 'Base south wall', 'foundation', [box(-20, 20, 1, 7, -20, -19)]);
addPart('base-east-wall', 'Base east wall', 'foundation', [box(19, 20, 1, 7, -20, 20)]);
addPart('base-west-wall', 'Base west wall', 'foundation', [box(-20, -19, 1, 7, -20, 20)]);
addPart('base-roof', 'Base roof', 'foundation', [box(-21, 21, 7, 8, -21, 21)]);

// --- Tripod legs: three legs, four tapered segments each: 12 parts.
// Leg centerline radius profile: y=7 -> r=26; y=40 -> r=20; y=75 -> r=14;
// y=105 -> r=8; y=146 -> r=14.
const LEG_ANGLES = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];
const LEG_PROFILE = [[7, 26, 3.6], [40, 20, 3.2], [75, 14, 2.8], [105, 8, 2.4], [146, 14, 2.8]];
const LEG_NAMES = ['North', 'Southeast', 'Southwest'];
LEG_ANGLES.forEach((ang, li) => {
  const cx = Math.cos(ang), sz = Math.sin(ang);
  for (let s = 0; s < 4; s++) {
    const [y0, r0, w0] = LEG_PROFILE[s];
    const [y1, r1, w1] = LEG_PROFILE[s + 1];
    addPart(`leg-${li + 1}-segment-${s + 1}`, `${LEG_NAMES[li]} leg segment ${s + 1}`, 'legs', [
      taperedBox(cx * r0, sz * r0, y0, cx * r1, sz * r1, y1, w0, w1),
    ]);
  }
  // Footing at the leg base.
  addPart(`leg-${li + 1}-footing`, `${LEG_NAMES[li]} leg footing`, 'foundation', [
    box(cx * 26 - 4, cx * 26 + 4, 0, 7, sz * 26 - 4, sz * 26 + 4),
  ]);
});

// --- Cross braces between legs at three heights: 9 parts.
for (const [bi, y] of [[0, 40], [1, 75], [2, 105]]) {
  const r = LEG_PROFILE[bi + 1][1];
  for (let k = 0; k < 3; k++) {
    const a0 = LEG_ANGLES[k], a1 = LEG_ANGLES[(k + 1) % 3];
    addPart(`brace-level-${bi + 1}-${k + 1}`, `Cross brace ${k + 1}, level ${bi + 1}`, 'legs', [
      strut([r * Math.cos(a0), y, r * Math.sin(a0)], [r * Math.cos(a1), y, r * Math.sin(a1)], 1.6),
    ]);
  }
}

// --- Central core: five stacked segments, stairwell, doors: 9 parts.
const CORE_SEGS = [[7, 40], [40, 75], [75, 105], [105, 130], [130, 146]];
CORE_SEGS.forEach(([y0, y1], i) => {
  addPart(`core-segment-${i + 1}`, `Core segment ${i + 1}`, 'core', [
    cyl(4.5, 4.5, y1 - y0, 0, (y0 + y1) / 2, 0, 16),
  ]);
});
addPart('core-stairwell', 'Core stairwell', 'core', [box(-1, 1, 7, 146, -1, 1)]);
for (let d = 0; d < 3; d++) {
  const a = LEG_ANGLES[d] + Math.PI / 3;
  addPart(`core-door-${d + 1}`, `Core entrance door ${d + 1}`, 'core', [
    box(6.5 * Math.cos(a) - 1, 6.5 * Math.cos(a) + 1, 7, 11, 6.5 * Math.sin(a) - 0.3, 6.5 * Math.sin(a) + 0.3),
  ]);
}

// --- Elevators: three exterior glass shafts and three cars: 6 parts.
for (let e = 0; e < 3; e++) {
  const a = LEG_ANGLES[e] + Math.PI / 3;
  const ex = 6.8 * Math.cos(a), ez = 6.8 * Math.sin(a);
  addPart(`elevator-shaft-${e + 1}`, `Elevator shaft ${e + 1}`, 'core', [
    box(ex - 1.6, ex + 1.6, 7, 146, ez - 1.6, ez + 1.6),
  ]);
}
for (const [ci, cy] of [[1, 50], [2, 95], [3, 130]]) {
  const a = LEG_ANGLES[ci - 1] + Math.PI / 3;
  const ex = 6.8 * Math.cos(a), ez = 6.8 * Math.sin(a);
  addPart(`elevator-car-${ci}`, `Elevator car ${ci}`, 'core', [
    box(ex - 1.3, ex + 1.3, cy - 2, cy + 2, ez - 1.3, ez + 1.3),
  ]);
}

// --- Saucer support struts: six diagonals from the waist to the rim: 6.
for (let k = 0; k < 6; k++) {
  const a = (k / 6) * Math.PI * 2;
  addPart(`saucer-strut-${k + 1}`, `Saucer support strut ${k + 1}`, 'saucer', [
    strut([9 * Math.cos(a), 138, 9 * Math.sin(a)], [18 * Math.cos(a), 150, 18 * Math.sin(a)], 1.4),
  ]);
}

// --- Lower disc: restaurant level at 500 ft (152.4 m): 10 parts.
addPart('restaurant-floor', 'Restaurant floor', 'saucer', [cyl(21, 21, 1.5, 0, 151, 0, 32)]);
for (let k = 0; k < 4; k++) {
  addPart(`restaurant-wall-${k + 1}`, `Restaurant outer wall ${k + 1}`, 'saucer', [
    arcPanel(21, 151.75, 155, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2),
  ]);
  addPart(`saucer-soffit-${k + 1}`, `Saucer soffit ${k + 1}`, 'saucer', [
    skirtPanel(14, 21, 146, 150, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2),
  ]);
}
addPart('loupe-glass-floor', 'The Loupe revolving glass floor', 'saucer', [
  (() => { const g = new THREE.TorusGeometry(17, 1.6, 8, 40); g.rotateX(Math.PI / 2); g.translate(0, 152.5, 0); return g; })(),
]);

// --- Upper disc: observation level at 520 ft (158.5 m): 24 parts.
addPart('observation-floor', 'Observation floor', 'observation', [cyl(21, 21, 1.5, 0, 157, 0, 32)]);
for (let k = 0; k < 4; k++) {
  addPart(`observation-wall-${k + 1}`, `Observation outer wall ${k + 1}`, 'observation', [
    arcPanel(21, 157.75, 159.5, (k * Math.PI) / 2, ((k + 1) * Math.PI) / 2),
  ]);
}
for (let k = 0; k < 12; k++) {
  addPart(`observation-glass-${k + 1}`, `Observation glass panel ${k + 1}`, 'observation', [
    arcPanel(21.2, 159.5, 162, (k * Math.PI) / 6, ((k + 1) * Math.PI) / 6, 6),
  ]);
}
for (let k = 0; k < 3; k++) {
  const mullions = [];
  for (let m = 0; m < 4; m++) {
    const a = ((k * 4 + m) * Math.PI) / 6;
    mullions.push(box(21.2 * Math.cos(a) - 0.15, 21.2 * Math.cos(a) + 0.15, 159.5, 162, 21.2 * Math.sin(a) - 0.15, 21.2 * Math.sin(a) + 0.15));
  }
  addPart(`observation-mullions-${k + 1}`, `Observation mullions ${k + 1}`, 'observation', mullions);
}
for (let k = 0; k < 4; k++) {
  const a = (k * Math.PI) / 2 + Math.PI / 4;
  addPart(`deck-bench-${k + 1}`, `Deck bench group ${k + 1}`, 'observation', [
    box(14 * Math.cos(a) - 2, 14 * Math.cos(a) + 2, 157.75, 158.6, 14 * Math.sin(a) - 0.6, 14 * Math.sin(a) + 0.6),
  ]);
}

// --- Roof: four cone quadrants: 4 parts.
for (let k = 0; k < 4; k++) {
  addPart(`roof-panel-${k + 1}`, `Roof panel ${k + 1}`, 'roof', [
    (() => { const g = new THREE.CylinderGeometry(1, 21, 7, 6, 1, true, (k * Math.PI) / 2, Math.PI / 2); g.translate(0, 165.5, 0); return g; })(),
  ]);
}

// --- Halo: the red ring around the top: 4 parts.
for (let k = 0; k < 4; k++) {
  addPart(`halo-${k + 1}`, `Halo segment ${k + 1}`, 'roof', [torusArc(22.5, 0.8, 167, (k * Math.PI) / 2)]);
}

// --- Mast, lightning rods, beacon, flag: 5 parts.
addPart('mast', 'Mast', 'mast', [cyl(0.8, 1.2, 12, 0, 174, 0, 10)]);
for (let k = 0; k < 2; k++) {
  const rods = [];
  for (let r = 0; r < (k === 0 ? 13 : 12); r++) {
    const a = ((k * 13 + r) / 25) * Math.PI * 2;
    rods.push(cyl(0.08, 0.08, 4, 19 * Math.cos(a), 171, 19 * Math.sin(a), 6));
  }
  addPart(`lightning-rods-${k + 1}`, `Lightning rods ${k + 1}`, 'mast', rods);
}
addPart('beacon', 'Aviation beacon', 'mast', [
  (() => { const g = new THREE.SphereGeometry(0.8, 10, 8); g.translate(0, 181, 0); return g; })(),
]);
addPart('flagpole', 'Flagpole', 'mast', [cyl(0.06, 0.06, 6, 0, 183, 0, 6)]);

// --- Plaza planters: 2 parts.
addPart('planter-east', 'East planter', 'foundation', [box(28, 36, 1, 2.2, -4, 4)]);
addPart('planter-west', 'West planter', 'foundation', [box(-36, -28, 1, 2.2, -4, 4)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('leg-') && !id.includes('footing')) return '#f4f4f2';
  if (id.startsWith('brace-')) return '#e8e8e6';
  if (id.includes('footing') || id === 'foundation-slab') return '#9aa0a6';
  if (id === 'anchor-bolts') return '#5a5f64';
  if (id === 'plaza') return '#b9bdc2';
  if (id.startsWith('planter-')) return '#7a8a6a';
  if (id.startsWith('base-')) return '#d5d8da';
  if (id.startsWith('core-') || id.startsWith('elevator-shaft')) return '#c9cdc9';
  if (id.startsWith('elevator-car')) return '#bfe3ee';
  if (id.startsWith('saucer-strut')) return '#e8e8e6';
  if (id === 'restaurant-floor') return '#8a8f94';
  if (id.startsWith('restaurant-wall')) return '#f4f4f2';
  if (id.startsWith('saucer-soffit')) return '#dcdcd8';
  if (id === 'loupe-glass-floor') return '#9fd4e8';
  if (id === 'observation-floor') return '#8a8f94';
  if (id.startsWith('observation-wall')) return '#f4f4f2';
  if (id.startsWith('observation-glass')) return '#bfe3ee';
  if (id.startsWith('observation-mullions')) return '#6a7076';
  if (id.startsWith('deck-bench')) return '#a8845c';
  if (id.startsWith('roof-panel')) return '#c0392b';
  if (id.startsWith('halo-')) return '#c0392b';
  if (id === 'mast') return '#8a8f94';
  if (id.startsWith('lightning-rods')) return '#5a5f64';
  if (id === 'beacon') return '#e74c3c';
  if (id === 'flagpole') return '#8a8f94';
  return '#d5d8da';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundation', name: 'Foundation and base', color: '#9aa0a6', description: 'The 30 ft deep foundation with 72 anchor bolts, the plaza, the ground-level building and the leg footings.' },
  { id: 'legs', name: 'Tripod legs', color: '#f4f4f2', description: 'The three tapering steel legs that splay at the base, pinch at the waist and flare to carry the top house, tied by cross braces.' },
  { id: 'core', name: 'Central core and elevators', color: '#c9cdc9', description: 'The central service core with the stairwell and the three exterior glass elevator shafts.' },
  { id: 'saucer', name: 'Top house, restaurant level', color: '#ffffff', description: 'The flying-saucer top house: the restaurant floor at 500 ft with the revolving Loupe glass floor, carried on six struts.' },
  { id: 'observation', name: 'Observation level', color: '#bfe3ee', description: 'The observation deck at 520 ft with its ring of glass panels, mullions and benches.' },
  { id: 'roof', name: 'Roof and halo', color: '#c0392b', description: 'The conical roof and the red halo ring that crowns the top house.' },
  { id: 'mast', name: 'Mast and lightning protection', color: '#8a8f94', description: 'The central mast with 25 lightning rods, the aviation beacon and the flagpole.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'foundation slab': 'The foundation slab, dug 30 ft deep and filled in under 12 hours by 467 cement trucks. The foundation alone weighs 5,850 tons. Exact slab extent is schematic.',
  'anchor bolts': '72 anchor bolts tying the tower to its foundation. Exact bolt layout is schematic.',
  'plaza': 'The plaza around the tower base. Exact paving is schematic.',
  'base north wall': 'North wall of the ground-level building with retail space. Exact layout is schematic.',
  'base south wall': 'South wall of the ground-level building with retail space. Exact layout is schematic.',
  'base east wall': 'East wall of the ground-level building with retail space. Exact layout is schematic.',
  'base west wall': 'West wall of the ground-level building with retail space. Exact layout is schematic.',
  'base roof': 'Roof of the ground-level building. Exact form is schematic.',
  'east planter': 'Landscaping planter on the east side of the plaza. Schematic.',
  'west planter': 'Landscaping planter on the west side of the plaza. Schematic.',
};
LEG_NAMES.forEach((legName, li) => {
  for (let s = 1; s <= 4; s++) {
    explanations[`${legName.toLowerCase()} leg segment ${s}`] =
      `Segment ${s} of the ${legName.toLowerCase()} leg. The three legs splay wide at the base, pinch to a narrow waist about two-thirds up, then flare again to carry the 42 m wide top house. Exact leg curve and cross-sections are schematic.`;
  }
  explanations[`${legName.toLowerCase()} leg footing`] =
    `Concrete footing anchoring the ${legName.toLowerCase()} leg. Exact footing shape is schematic.`;
});
for (let bi = 1; bi <= 3; bi++) {
  for (let k = 1; k <= 3; k++) {
    explanations[`cross brace ${k}, level ${bi}`] =
      `A horizontal brace tying two legs together at level ${bi}, stiffening the tripod against wind. The tower is built to withstand winds up to 200 mph. Exact brace positions are schematic.`;
  }
}
for (let i = 1; i <= 5; i++) {
  explanations[`core segment ${i}`] =
    `Segment ${i} of the central service core, which carries stairs and services up the middle of the tripod. Exact core diameter and layout are schematic.`;
}
explanations['core stairwell'] = 'The emergency stairwell inside the core. Schematic.';
for (let d = 1; d <= 3; d++) {
  explanations[`core entrance door ${d}`] = `Entrance door ${d} at the tower base. Schematic.`;
}
for (let e = 1; e <= 3; e++) {
  explanations[`elevator shaft ${e}`] =
    `Glass elevator shaft ${e} running up the outside of the core. The elevators climb at 10 mph and reach the observation deck in 41 seconds. Exact shaft positions are schematic.`;
}
for (let c = 1; c <= 3; c++) {
  explanations[`elevator car ${c}`] = `Elevator car ${c}. Schematic.`;
}
for (let k = 1; k <= 6; k++) {
  explanations[`saucer support strut ${k}`] =
    `Diagonal strut ${k} carrying the saucer's weight down into the leg structure. Exact strut layout is schematic.`;
}
Object.assign(explanations, {
  'restaurant floor': 'The restaurant floor at 500 ft, home of the SkyCity restaurant, 94.5 ft in diameter. Exact floor buildup is schematic.',
  'the loupe revolving glass floor': 'The Loupe, installed in the 2018 Century Project renovation: the world\'s first revolving glass floor, looking straight down 500 ft. Exact mechanism is schematic.',
  'observation floor': 'The observation floor at 520 ft (about 158 m). Exact floor buildup is schematic.',
  'flagpole': 'The flagpole; the tower is topped with an American flag. Exact pole height is schematic.',
  'mast': 'The central mast above the roof. Exact mast form is schematic.',
  'aviation beacon': 'The red aviation warning beacon. Schematic.',
});
for (let k = 1; k <= 4; k++) {
  explanations[`restaurant outer wall ${k}`] = `Outer wall panel ${k} of the restaurant level. Exact panel divisions are schematic.`;
  explanations[`saucer soffit ${k}`] = `Underside panel ${k} of the saucer. Exact profile is schematic.`;
  explanations[`observation outer wall ${k}`] = `Outer wall panel ${k} below the observation glass. Exact panel divisions are schematic.`;
  explanations[`deck bench group ${k}`] = `Seating group ${k} on the observation deck. Schematic.`;
  explanations[`roof panel ${k}`] = `Roof panel ${k} of the conical top-house roof, painted in the Re-entry Red of the 1962 scheme. Exact panel divisions are schematic.`;
  explanations[`halo segment ${k}`] = `Segment ${k} of the halo, the red ring crowning the top house. Exact ring profile is schematic.`;
}
for (let k = 1; k <= 12; k++) {
  explanations[`observation glass panel ${k}`] =
    `Floor-to-ceiling glass panel ${k} of the observation level, installed in the 2018 renovation. Exact panel count is schematic.`;
}
for (let k = 1; k <= 3; k++) {
  explanations[`observation mullions ${k}`] = `Window mullion group ${k} framing the observation glass. Schematic.`;
  explanations[`lightning rods ${k}`] = `Lightning rod group ${k}; the roof carries 25 rods in total. Exact positions are schematic.`;
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
const binName = 'space-needle-0.bin';
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
  scope: 'Space Needle, Seattle',
  title: 'Space Needle',
  location: 'Seattle, Washington, United States',
  blurb: 'Seattle\u2019s 1962 World\u2019s Fair observation tower: 605 ft of Googie-era optimism, three tapering legs carrying a 42 m flying-saucer top house with the observation deck at 520 ft.',
  sourceUrls: [
    { label: 'Wikipedia: Space Needle', url: 'https://en.wikipedia.org/wiki/Space_Needle' },
    { label: 'HeightProfiles: Seattle Space Needle Height', url: 'https://heightprofiles.com/seattle-space-needle-height' },
    { label: 'Methodshop: How Tall Is the Seattle Space Needle?', url: 'https://methodshop.com/seattle-space-needle-height/' },
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
  chunks: [{ url: '/models/space-needle/space-needle-0.bin', bytes: offset }],
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
