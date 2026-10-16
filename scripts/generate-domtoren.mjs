// Procedural Domtoren (Dom Tower of Utrecht) for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Domtoren in code and writes
// it in the atlas binary format:
//   public/models/domtoren/atlas.json
//   public/models/domtoren/domtoren-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10,
// primarily Wikipedia "Dom Tower of Utrecht"):
//   tallest church tower in the Netherlands; 112.32 m high (112.5 m in
//   common parlance; 109 m at completion in 1382, raised to 112.5 m in
//   the 1910 restoration); built 1321 to 1382 to a design by John of
//   Hainaut; part of St. Martin's Cathedral (Dom Church); cathedral never
//   fully completed for lack of money; unfinished nave collapsed in the
//   storm of 1674, tower freestanding since; stands where the city of
//   Utrecht originated ~2,000 years ago; consists of two square blocks
//   topped by a much lighter lantern; striking absence of visible
//   buttresses; influenced many Dutch towers (e.g. Martinitoren
//   Groningen); preacher Geert Groote protested the vanity of the
//   project (too tall, too expensive); multifunctional: belfry, bishop's
//   private chapel on the first floor, watchtower with the tower guard
//   housed on the second floor of the lower block; carillon of 50 bells;
//   465 steps to the top; Dutch rijksmonument #36075.
// Schematic (not sourced, never stated as fact in the UI): exact
// footprint width (modeled 19 m square); heights of the two blocks and
// the lantern; all window/door positions and sizes; entrance portal
// design; bell sizes, positions and count modeled (24 representative
// bells for the 50-bell carillon); clock face design; lantern pier and
// pinnacle arrangement; spirelet, orb and weathercock forms.
//
// Coordinate frame: x = lateral, z = depth (south/front is +z), y = up.
// All dimensions in meters.
//
// Granularity: ~112 named parts across 6 systems.
//
// Usage: node scripts/generate-domtoren.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'domtoren');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (112.3 m) maps to 2.4 units.
const S = 2.4 / 112.3;

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
// Bell: tapered body, flared lip, crown knob.
function bell(r, x, y, z) {
  const gs = [];
  const body = new THREE.CylinderGeometry(r * 0.35, r * 0.85, r * 1.4, 12);
  body.translate(x, y, z);
  gs.push(body);
  const lip = new THREE.TorusGeometry(r * 0.85, r * 0.18, 8, 16);
  lip.rotateX(Math.PI / 2);
  lip.translate(x, y - r * 0.7, z);
  gs.push(lip);
  const knob = new THREE.SphereGeometry(r * 0.3, 8, 6);
  knob.translate(x, y + r * 0.85, z);
  gs.push(knob);
  return gs;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const HW = 9.5;   // half-width of lower block (19 m square, schematic)
const BHW = 8.5;  // half-width of belfry block (17 m square, schematic)

// --- Base: plinth, entrance steps, portal (south face, +z).
addPart('entrance-steps', 'Entrance steps', 'base', [
  box(-4, 4, 0, 0.5, 9.5, 12.5),
  box(-3.5, 3.5, 0.5, 1.0, 9.5, 12.0),
  box(-3, 3, 1.0, 1.5, 9.5, 11.5),
]);
addPart('plinth', 'Plinth', 'base', [
  box(-10, 10, 0, 4, -10, 10),
]);
// Entrance portal: tall arch in the south face.
{
  const jambL = box(-3.2, -2.2, 1.5, 9, 9.5, 10.5);
  const jambR = box(2.2, 3.2, 1.5, 9, 9.5, 10.5);
  const arch = new THREE.CylinderGeometry(2.7, 2.7, 1.0, 16, 1, false, 0, Math.PI);
  arch.rotateX(Math.PI / 2);
  arch.rotateY(Math.PI / 2);
  arch.translate(0, 9, 10.0);
  addPart('entrance-portal-arch', 'Entrance portal arch', 'base', [jambL, jambR, arch]);
}
addPart('portal-left-door', 'Portal left door', 'base', [
  box(-2.2, -0.1, 1.5, 8.5, 9.6, 10.0),
]);
addPart('portal-right-door', 'Portal right door', 'base', [
  box(0.1, 2.2, 1.5, 8.5, 9.6, 10.0),
]);
addPart('portal-column-left', 'Portal column left', 'base', [
  cyl(0.35, 0.4, 7, -3.8, 5, 10.2, 10),
  box(-4.3, -3.3, 8.3, 8.8, 9.7, 10.7),
]);
addPart('portal-column-right', 'Portal column right', 'base', [
  cyl(0.35, 0.4, 7, 3.8, 5, 10.2, 10),
  box(3.3, 4.3, 8.3, 8.8, 9.7, 10.7),
]);

// --- Lower shaft: two-square-block tower, first (lower) block 4-62 m.
// Four wall faces.
addPart('south-wall', 'South wall', 'lower-shaft', [
  box(-HW, HW, 4, 62, HW - 1, HW),
]);
addPart('north-wall', 'North wall', 'lower-shaft', [
  box(-HW, HW, 4, 62, -HW, -HW + 1),
]);
addPart('east-wall', 'East wall', 'lower-shaft', [
  box(HW - 1, HW, 4, 62, -HW + 1, HW - 1),
]);
addPart('west-wall', 'West wall', 'lower-shaft', [
  box(-HW, -HW + 1, 4, 62, -HW + 1, HW - 1),
]);
// Corner lesenes (flat vertical strips, no buttresses).
for (const [i, sx, sz] of [[1, -1, -1], [2, 1, -1], [3, 1, 1], [4, -1, 1]]) {
  addPart(`corner-lesene-${i}`, `Corner lesene ${i}`, 'lower-shaft', [
    box(sx * HW - 0.9, sx * HW + 0.9, 4, 62, sz * HW - 0.15, sz * HW + 0.15),
    box(sx * HW - 0.15, sx * HW + 0.15, 4, 62, sz * HW - 0.9, sz * HW + 0.9),
  ]);
}
// Bishop's chapel windows (first floor, south face).
addPart('chapel-window-left', 'Chapel window left', 'lower-shaft', [
  box(-4.5, -3.0, 10, 16, HW - 0.2, HW + 0.15),
]);
addPart('chapel-window-right', 'Chapel window right', 'lower-shaft', [
  box(3.0, 4.5, 10, 16, HW - 0.2, HW + 0.15),
]);
// Tower guard windows (second floor).
for (const [i, x] of [[1, -6], [2, -2], [3, 2], [4, 6]]) {
  addPart(`guard-window-${i}`, `Guard window ${i}`, 'lower-shaft', [
    box(x - 0.6, x + 0.6, 22, 26, HW - 0.2, HW + 0.15),
  ]);
}
// Slit windows up the shaft.
const SLITS = [
  ['south', 0, 34], ['south', 0, 44], ['south', 0, 54],
  ['north', 0, 38], ['north', 0, 50],
  ['east', 0, 42], ['west', 0, 46], ['east', 0, 56],
];
SLITS.forEach(([face, , y], i) => {
  let g;
  if (face === 'south') g = box(-0.4, 0.4, y, y + 3, HW - 0.2, HW + 0.15);
  else if (face === 'north') g = box(-0.4, 0.4, y, y + 3, -HW - 0.15, -HW + 0.2);
  else if (face === 'east') g = box(HW - 0.2, HW + 0.15, y, y + 3, -0.4, 0.4);
  else g = box(-HW - 0.15, -HW + 0.2, y, y + 3, -0.4, 0.4);
  addPart(`slit-window-${i + 1}`, `Slit window ${i + 1}`, 'lower-shaft', [g]);
});
// String courses.
addPart('string-course-lower', 'Lower string course', 'lower-shaft', [
  box(-HW - 0.3, HW + 0.3, 30, 31, -HW - 0.3, HW + 0.3),
]);
addPart('string-course-upper', 'Upper string course', 'lower-shaft', [
  box(-HW - 0.3, HW + 0.3, 55, 56, -HW - 0.3, HW + 0.3),
]);

// --- Cornice: transition from lower block to belfry.
addPart('main-cornice', 'Main cornice', 'cornice', [
  box(-HW - 1, HW + 1, 62, 65, -HW - 1, HW + 1),
]);
addPart('cornice-moulding', 'Cornice moulding', 'cornice', [
  box(-HW - 0.5, HW + 0.5, 65, 66, -HW - 0.5, HW + 0.5),
]);

// --- Belfry: upper square block 66-96 m with bell openings.
addPart('belfry-south-wall', 'Belfry south wall', 'belfry', [
  box(-BHW, BHW, 66, 96, BHW - 1, BHW),
]);
addPart('belfry-north-wall', 'Belfry north wall', 'belfry', [
  box(-BHW, BHW, 66, 96, -BHW, -BHW + 1),
]);
addPart('belfry-east-wall', 'Belfry east wall', 'belfry', [
  box(BHW - 1, BHW, 66, 96, -BHW + 1, BHW - 1),
]);
addPart('belfry-west-wall', 'Belfry west wall', 'belfry', [
  box(-BHW, -BHW + 1, 66, 96, -BHW + 1, BHW - 1),
]);
// Eight tall arched bell openings, two per face.
const FACES = [
  { name: 'south', z: BHW, rot: 0 },
  { name: 'north', z: -BHW, rot: Math.PI },
  { name: 'east', z: BHW, rot: Math.PI / 2 },
  { name: 'west', z: -BHW, rot: -Math.PI / 2 },
];
let oi = 0;
for (const f of FACES) {
  for (const off of [-4.2, 4.2]) {
    oi++;
    const geoms = [];
    // Arch frame: two jambs + semicircular arch.
    const jambH = 14;
    if (f.name === 'south' || f.name === 'north') {
      const zc = f.z;
      const zo = f.name === 'south' ? 1 : -1;
      geoms.push(box(off - 2.6, off - 1.8, 70, 70 + jambH, zc - 0.5, zc + 0.5));
      geoms.push(box(off + 1.8, off + 2.6, 70, 70 + jambH, zc - 0.5, zc + 0.5));
      const arch = new THREE.CylinderGeometry(2.2, 2.2, 1.0, 12, 1, false, 0, Math.PI);
      arch.rotateX(Math.PI / 2);
      if (f.name === 'north') arch.rotateY(Math.PI);
      arch.translate(off, 70 + jambH, zc + zo * 0.0);
      geoms.push(arch);
      // Dark recess behind.
      geoms.push(box(off - 1.8, off + 1.8, 70, 70 + jambH + 1.5, zc - zo * 0.9, zc - zo * 0.1));
    } else {
      const xc = f.name === 'east' ? BHW : -BHW;
      geoms.push(box(xc - 0.5, xc + 0.5, 70, 70 + jambH, off - 2.6, off - 1.8));
      geoms.push(box(xc - 0.5, xc + 0.5, 70, 70 + jambH, off + 1.8, off + 2.6));
      const arch = new THREE.CylinderGeometry(2.2, 2.2, 1.0, 12, 1, false, 0, Math.PI);
      arch.rotateZ(Math.PI / 2);
      arch.rotateY(f.name === 'east' ? 0 : Math.PI);
      arch.translate(xc, 70 + jambH, off);
      geoms.push(arch);
      const xo = f.name === 'east' ? 1 : -1;
      geoms.push(box(xc - xo * 0.9, xc - xo * 0.1, 70, 70 + jambH + 1.5, off - 1.8, off + 1.8));
    }
    addPart(`bell-opening-${oi}`, `Bell opening ${oi} (${f.name})`, 'belfry', geoms);
    // Tracery: central mullion + transom.
    const tg = [];
    if (f.name === 'south' || f.name === 'north') {
      const zc = f.z;
      tg.push(box(off - 0.25, off + 0.25, 70, 84, zc - 0.3, zc + 0.3));
      tg.push(box(off - 1.8, off + 1.8, 76, 76.6, zc - 0.3, zc + 0.3));
    } else {
      const xc = f.name === 'east' ? BHW : -BHW;
      tg.push(box(xc - 0.3, xc + 0.3, 70, 84, off - 0.25, off + 0.25));
      tg.push(box(xc - 0.3, xc + 0.3, 76, 76.6, off - 1.8, off + 1.8));
    }
    addPart(`bell-tracery-${oi}`, `Bell tracery ${oi}`, 'belfry', tg);
  }
}
// Clock faces on four sides.
for (const [i, f] of FACES.entries()) {
  const gs = [];
  const dial = new THREE.CylinderGeometry(2.2, 2.2, 0.3, 24);
  if (f.name === 'south' || f.name === 'north') {
    dial.rotateX(Math.PI / 2);
    const zc = f.z + (f.name === 'south' ? 0.6 : -0.6);
    dial.translate(0, 90, zc);
    gs.push(dial);
    const hH = box(-0.15, 0.15, 90, 91.2, zc - 0.2, zc + 0.2);
    const hM = box(-0.1, 0.1, 90, 91.8, zc - 0.2, zc + 0.2);
    hM.rotateZ(0.0);
    gs.push(hH);
  } else {
    dial.rotateZ(Math.PI / 2);
    const xc = (f.name === 'east' ? BHW : -BHW) + (f.name === 'east' ? 0.6 : -0.6);
    dial.translate(xc, 90, 0);
    gs.push(dial);
  }
  addPart(`clock-face-${f.name}`, `Clock face (${f.name})`, 'belfry', gs);
}
// Bell frame and 24 representative carillon bells.
addPart('bell-frame', 'Bell frame', 'belfry', [
  box(-6, 6, 86, 87, -0.4, 0.4),
  box(-0.4, 0.4, 86, 87, -6, 6),
  box(-6, 6, 86, 87, -6, -5.2),
  box(-6, 6, 86, 87, 5.2, 6),
]);
const BELL_POS = [
  [0, 82, 0, 1.6], [-3, 82, -3, 1.3], [3, 82, -3, 1.3], [-3, 82, 3, 1.3], [3, 82, 3, 1.3],
  [0, 80, -4.5, 1.1], [0, 80, 4.5, 1.1], [-4.5, 80, 0, 1.1], [4.5, 80, 0, 1.1],
  [-2, 78, -2, 0.9], [2, 78, -2, 0.9], [-2, 78, 2, 0.9], [2, 78, 2, 0.9],
  [-4, 78, -4, 0.8], [4, 78, -4, 0.8], [-4, 78, 4, 0.8], [4, 78, 4, 0.8],
  [0, 76, 0, 0.7], [-2.5, 76, 0, 0.6], [2.5, 76, 0, 0.6],
  [0, 76, -2.5, 0.6], [0, 76, 2.5, 0.6], [-1.2, 74.5, -1.2, 0.5], [1.2, 74.5, 1.2, 0.5],
];
BELL_POS.forEach(([x, y, z, r], i) => {
  addPart(`carillon-bell-${i + 1}`, `Carillon bell ${i + 1}`, 'belfry', bell(r, x, y, z));
});
addPart('belfry-floor', 'Belfry floor', 'belfry', [
  box(-BHW, BHW, 68, 69, -BHW, BHW),
]);

// --- Lantern: lighter open crown 96-109 m.
addPart('lantern-base', 'Lantern base', 'lantern', [
  box(-7, 7, 96, 99, -7, 7),
]);
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
  const px = Math.cos(a) * 5.5, pz = Math.sin(a) * 5.5;
  addPart(`lantern-pier-${i + 1}`, `Lantern pier ${i + 1}`, 'lantern', [
    box(px - 0.8, px + 0.8, 99, 106, pz - 0.8, pz + 0.8),
  ]);
  const a2 = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
  const qx = Math.cos(a2) * 5.5, qz = Math.sin(a2) * 5.5;
  addPart(`lantern-arch-${i + 1}`, `Lantern arch ${i + 1}`, 'lantern', [
    strut([px, 106, pz], [(px + qx) / 2, 108, (pz + qz) / 2], 0.9),
    strut([(px + qx) / 2, 108, (pz + qz) / 2], [qx, 106, qz], 0.9),
  ]);
}
for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2;
  const px = Math.cos(a) * 7.2, pz = Math.sin(a) * 7.2;
  addPart(`lantern-pinnacle-${i + 1}`, `Lantern pinnacle ${i + 1}`, 'lantern', [
    cyl(0.05, 0.7, 4, px, 101, pz, 8),
  ]);
}
addPart('lantern-floor', 'Lantern floor', 'lantern', [
  cyl(6.5, 6.5, 1, 0, 98.5, 0, 8),
]);

// --- Crown: spirelet, orb, weathercock.
addPart('spirelet', 'Spirelet', 'crown', [
  cyl(0.1, 1.2, 3.5, 0, 109.5, 0, 8),
]);
addPart('orb', 'Orb', 'crown', [
  new THREE.SphereGeometry(0.5, 10, 8).translate(0, 111.6, 0),
]);
addPart('weathercock', 'Weathercock', 'crown', [
  cyl(0.06, 0.06, 1.2, 0, 112.0, 0, 6),
  box(-0.5, 0.5, 112.3, 112.5, -0.06, 0.06),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('carillon-bell-')) return '#8a6d3b';
  if (id === 'bell-frame') return '#5a4a33';
  if (id.startsWith('clock-face-')) return '#2b3a4a';
  if (id.includes('portal') || id.includes('door')) return '#4a3826';
  if (id.includes('chapel-window') || id.includes('guard-window') || id.includes('slit-window')) return '#2b3a4a';
  if (id.includes('tracery')) return '#8f8578';
  if (id.includes('opening')) return '#3a3f45';
  if (id === 'weathercock' || id === 'orb') return '#b8860b';
  if (id === 'spirelet') return '#6b7a6b';
  if (id.includes('pinnacle')) return '#7a7568';
  if (id.includes('cornice') || id.includes('string-course')) return '#a89a76';
  if (id.includes('lesene')) return '#b8ad92';
  return '#c9bfa5';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Base and entrance', color: '#b8ad92', description: 'Plinth, entrance steps and the tall entrance portal in the south face.' },
  { id: 'lower-shaft', name: 'Lower shaft', color: '#c9bfa5', description: 'The tall lower square block with corner lesenes, chapel and guard windows, and string courses. No visible buttresses.' },
  { id: 'cornice', name: 'Main cornice', color: '#a89a76', description: 'The deep cornice marking the transition from the lower block to the belfry.' },
  { id: 'belfry', name: 'Belfry', color: '#c9bfa5', description: 'The upper square block with tall arched bell openings, clock faces and the 50-bell carillon.' },
  { id: 'lantern', name: 'Lantern', color: '#b8ad92', description: 'The much lighter open lantern crowning the tower, with piers, arches and pinnacles.' },
  { id: 'crown', name: 'Crown', color: '#8a6d3b', description: 'Spirelet, orb and weathercock at 112.3 m.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'entrance steps': 'Steps rising to the tall entrance portal in the south face of the tower. Exact step count is schematic.',
  'plinth': 'The plinth the tower stands on. Exact profile is schematic.',
  'entrance portal arch': 'The tall arched entrance portal, the tower\u2019s great gate. Exact arch form is schematic.',
  'portal left door': 'One leaf of the portal doors. Exact door design is schematic.',
  'portal right door': 'One leaf of the portal doors. Exact door design is schematic.',
  'portal column left': 'Engaged column flanking the entrance portal. Exact order is schematic.',
  'portal column right': 'Engaged column flanking the entrance portal. Exact order is schematic.',
  'south wall': 'The south face of the lower square block, rising 58 m with almost no decoration. Exact wall thickness is schematic.',
  'north wall': 'The north face of the lower square block. Exact wall thickness is schematic.',
  'east wall': 'The east face of the lower square block. Exact wall thickness is schematic.',
  'west wall': 'The west face of the lower square block. Exact wall thickness is schematic.',
  'chapel window left': 'A window of the bishop\u2019s private chapel on the first floor of the tower. Exact window form is schematic.',
  'chapel window right': 'A window of the bishop\u2019s private chapel on the first floor of the tower. Exact window form is schematic.',
  'main cornice': 'The deep cornice at 62 m marking the transition from the lower block to the belfry. Exact profile is schematic.',
  'cornice moulding': 'Moulding above the main cornice. Exact profile is schematic.',
  'lower string course': 'A horizontal string course around the lower shaft. Exact position is schematic.',
  'upper string course': 'A horizontal string course around the lower shaft. Exact position is schematic.',
  'lantern base': 'The base of the open lantern at 96 m. Exact form is schematic.',
  'lantern floor': 'The floor of the lantern. Exact form is schematic.',
  'spirelet': 'The small spire crowning the lantern. Exact form is schematic.',
  'orb': 'The gilded orb below the weathercock. Exact form is schematic.',
  'weathercock': 'The weathercock at the very top, 112.3 m above the Domplein. Exact form is schematic.',
  'belfry floor': 'The floor of the bell chamber. Exact form is schematic.',
  'bell frame': 'The timber and steel frame the carillon bells hang from. Exact structure is schematic.',
};
for (let i = 1; i <= 4; i++) {
  explanations[`corner lesene ${i}`] = `A flat vertical lesene strip on corner ${i} of the lower block. The Domtoren famously has no visible buttresses; the lesenes are the only vertical articulation. Exact form is schematic.`;
  explanations[`guard window ${i}`] = `A window of the tower guard\u2019s quarters on the second floor of the lower block. Exact window form is schematic.`;
}
for (let i = 1; i <= 8; i++) {
  explanations[`slit window ${i}`] = `A narrow slit window lighting the stair within the lower shaft. Exact position is schematic.`;
}
for (let i = 1; i <= 8; i++) {
  const faces = ['south', 'south', 'north', 'north', 'east', 'east', 'west', 'west'];
  explanations[`bell opening ${i} (${faces[i - 1]})`] = `A tall arched opening in the belfry letting the bells\u2019 sound out over the city. Exact form is schematic.`;
  explanations[`bell tracery ${i}`] = `Stone tracery within bell opening ${i}. Exact pattern is schematic.`;
}
for (const f of ['south', 'north', 'east', 'west']) {
  explanations[`clock face (${f})`] = `A clock dial on the ${f} face of the belfry. Exact dial design is schematic.`;
  explanations[`belfry ${f} wall`] = `The ${f} wall of the upper square block. Exact thickness is schematic.`;
}
for (let i = 1; i <= 24; i++) {
  explanations[`carillon bell ${i}`] = `One of 24 representative bells standing in for the tower\u2019s 50-bell carillon. Bell sizes and positions are schematic.`;
}
for (let i = 1; i <= 8; i++) {
  explanations[`lantern pier ${i}`] = `A pier of the open lantern. Exact form is schematic.`;
  explanations[`lantern arch ${i}`] = `An arch spanning between lantern piers. Exact form is schematic.`;
  explanations[`lantern pinnacle ${i}`] = `A pinnacle on the lantern. Exact form is schematic.`;
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
const binName = 'domtoren-0.bin';
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
  scope: 'Domtoren, Utrecht',
  title: 'Domtoren',
  location: 'Utrecht, Netherlands',
  blurb: 'The Dom Tower of Utrecht, built 1321 to 1382: at 112.3 m the tallest church tower in the Netherlands, freestanding since the cathedral nave collapsed in 1674.',
  sourceUrls: [
    { label: 'Wikipedia: Dom Tower of Utrecht', url: 'https://en.wikipedia.org/wiki/Dom_Tower_of_Utrecht' },
    { label: 'Archimon: Utrecht Dom', url: 'https://www.archimon.nl/utrecht/utrechtdom.html' },
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
  chunks: [{ url: '/models/domtoren/domtoren-0.bin', bytes: offset }],
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
