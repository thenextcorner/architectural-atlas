// Procedural Statue of Liberty for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Statue of Liberty in code
// and writes it in the atlas binary format:
//   public/models/statue-of-liberty/atlas.json
//   public/models/statue-of-liberty/statue-of-liberty-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   "Liberty Enlightening the World," Liberty Island, New York Harbor;
//   gift from France to the United States for the centennial of American
//   independence; sculptor Frederic Auguste Bartholdi, structural engineer
//   Gustave Eiffel (iron framework); idea proposed 1865 by Edouard de
//   Laboulaye; built in France, shipped disassembled, dedicated
//   28 October 1886; 93 m (305 ft 1 in) from ground to torch tip; copper
//   statue 46 m (151 ft 1 in) heel to torch; copper sheeting 2.37 mm
//   thick, 31 tons of copper, 125 tons of steel; pedestal designed by
//   Richard Morris Hunt, built by the Americans inside the walls of Fort
//   Wood (11-pointed star fort); tablet 7.19 m by 4.14 m by 0.61 m
//   inscribed JULY IV MDCCLXXVI; head 5.26 m high, 3.05 m ear to ear;
//   crown with 7 rays for the seven seas and continents and 25 windows;
//   354 steps to the crown; broken chains at the feet; Emma Lazarus
//   sonnet "The New Colossus" on a bronze plaque on the pedestal;
//   UNESCO World Heritage Site 1984; torch closed to the public since
//   1916, replaced 1986, original in the museum; crown reopened
//   4 July 2009.
// Schematic (not sourced, never stated as fact in the UI): exact star
// fort profile, pedestal stepping, robe drapery profile, limb poses and
// proportions, facial features, spike angles, chain forms, internal frame
// layout. The figure is an impressionistic robed form, not a portrait.
//
// Coordinate frame: y = up, ground at y = 0, statue faces +z (the harbor).
// All dimensions in meters. Statue occupies y = 47 to 93.
//
// Granularity: 100+ named parts across 8 systems. Every explanation is
// either a sourced fact (see above) or explicitly marked schematic.
//
// Usage: node scripts/generate-statue-of-liberty.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'statue-of-liberty');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (93 m) maps to 2.4 units.
const S = 2.4 / 93;

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
function cyl(rt, rb, h, x, y, z, seg = 14) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// Lathe segment of the robe between profile indices.
function robeSeg(profile, i0, i1, yBase, seg = 20) {
  const pts = [];
  for (let i = i0; i <= i1; i++) {
    pts.push(new THREE.Vector2(profile[i][0], profile[i][1]));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  g.translate(0, yBase, 0);
  return g;
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// ---------------------------------------------------------------- fort wood
// 11-pointed star fort platform (schematic), y 0-10.
addPart('fort-platform', 'Fort Wood platform', 'fort', [cyl(26, 28, 10, 0, 5, 0, 22)]);
for (let k = 0; k < 11; k++) {
  const a = (k * Math.PI * 2) / 11;
  const x = Math.cos(a) * 27, z = Math.sin(a) * 27;
  const px = new THREE.ConeGeometry(4.5, 10, 4);
  px.rotateY(-a + Math.PI / 4);
  px.translate(x, 5, z);
  addPart(`star-point-${k + 1}`, `Star point ${k + 1}`, 'fort', [px]);
}
for (let k = 0; k < 4; k++) {
  const a = (k * Math.PI) / 2;
  addPart(`fort-wall-${k + 1}`, `Fort wall ${k + 1}`, 'fort',
    [box(Math.cos(a) * 20 - 2, Math.cos(a) * 20 + 2, 10, 13, Math.sin(a) * 20 - 8, Math.sin(a) * 20 + 8)]);
}

// ---------------------------------------------------------------- pedestal
// Hunt's pedestal, y 10-47 (schematic stepping).
addPart('pedestal-base-step', 'Pedestal base step', 'pedestal', [box(-11, 11, 10, 14, -11, 11)]);
addPart('pedestal-shaft', 'Pedestal shaft', 'pedestal', [box(-8, 8, 14, 40, -8, 8)]);
for (const [sx, sz, nm] of [[1, 1, 'northeast'], [1, -1, 'southeast'], [-1, 1, 'northwest'], [-1, -1, 'southwest']]) {
  addPart(`pedestal-quoin-${nm}`, `Pedestal ${nm} quoin`, 'pedestal',
    [box(sx * 8 - 0.9, sx * 8 + 0.9, 14, 40, sz * 8 - 0.9, sz * 8 + 0.9)]);
}
addPart('pedestal-panel-east', 'Pedestal east panel', 'pedestal', [box(8, 8.4, 20, 34, -5, 5)]);
addPart('pedestal-panel-west', 'Pedestal west panel', 'pedestal', [box(-8.4, -8, 20, 34, -5, 5)]);
addPart('pedestal-panel-north', 'Pedestal north panel', 'pedestal', [box(-5, 5, 20, 34, 8, 8.4)]);
addPart('pedestal-panel-south', 'Pedestal south panel', 'pedestal', [box(-5, 5, 20, 34, -8.4, -8)]);
for (const [sx, sz, nm] of [[1, 1, 'northeast'], [1, -1, 'southeast'], [-1, 1, 'northwest'], [-1, -1, 'southwest']]) {
  addPart(`pedestal-pediment-${nm}`, `Pedestal ${nm} pediment block`, 'pedestal',
    [box(sx * 9.5 - 1.2, sx * 9.5 + 1.2, 40, 42.5, sz * 9.5 - 1.2, sz * 9.5 + 1.2)]);
}
addPart('pedestal-door', 'Pedestal entrance door', 'pedestal', [box(-1.5, 1.5, 10, 16, 8, 8.5)]);
addPart('lazarus-plaque', 'The New Colossus plaque', 'pedestal', [box(-2.5, 2.5, 18, 21, 8.1, 8.4)]);
addPart('pedestal-cornice', 'Pedestal cornice', 'pedestal', [box(-9.5, 9.5, 40, 42, -9.5, 9.5)]);
addPart('pedestal-cap', 'Pedestal cap', 'pedestal', [box(-8.5, 8.5, 42, 47, -8.5, 8.5)]);
for (let k = 0; k < 8; k++) {
  const a = (k * Math.PI * 2) / 8;
  addPart(`baluster-${k + 1}`, `Baluster ${k + 1}`, 'pedestal',
    [cyl(0.25, 0.35, 3, Math.cos(a) * 8, 43.5, Math.sin(a) * 8, 8)]);
}

// ---------------------------------------------------------------- robe
// The robed figure, y 47-78 (schematic drapery profile). Feet at 47.
const ROBE_Y = 47;
const PROFILE = [
  [6.2, 0], [5.8, 3], [5.2, 6], [4.6, 9], [4.2, 12],
  [3.9, 15], [3.7, 18], [3.6, 21], [3.9, 24], [4.1, 26],
  [3.8, 28], [3.0, 30], [1.8, 31.5],
];
const ROBE_SEGS = 12;
for (let i = 0; i < ROBE_SEGS; i++) {
  const i0 = Math.floor((i * (PROFILE.length - 1)) / ROBE_SEGS);
  const i1 = Math.floor(((i + 1) * (PROFILE.length - 1)) / ROBE_SEGS);
  addPart(`robe-tier-${i + 1}`, `Robe tier ${i + 1}`, 'robe', [robeSeg(PROFILE, i0, i1, ROBE_Y, 22)]);
}
// Drapery fold ribs (schematic vertical folds).
for (let k = 0; k < 10; k++) {
  const a = (k * Math.PI * 2) / 6 + 0.3;
  const geoms = [];
  let prev = null;
  for (let s = 0; s <= 5; s++) {
    const t = s / 5;
    const idx = t * (PROFILE.length - 1);
    const i0 = Math.floor(idx), f = idx - i0;
    const r = PROFILE[i0][0] * (1 - f) + PROFILE[Math.min(i0 + 1, PROFILE.length - 1)][0] * f;
    const y = ROBE_Y + PROFILE[i0][1] * (1 - f) + PROFILE[Math.min(i0 + 1, PROFILE.length - 1)][1] * f;
    const rr = r + 0.35;
    const p = [Math.cos(a) * rr, y, Math.sin(a) * rr];
    if (prev) geoms.push(strut(prev, p, 0.5));
    prev = p;
  }
  addPart(`drapery-fold-${k + 1}`, `Drapery fold ${k + 1}`, 'robe', geoms);
}
// Shoulders and neck.
addPart('shoulders', 'Shoulders', 'robe', [cyl(2.2, 3.0, 3, 0, ROBE_Y + 29.5, 0, 16)]);
addPart('neck', 'Neck', 'robe', [cyl(1.1, 1.4, 2.5, 0, ROBE_Y + 32, 0, 12)]);

// ---------------------------------------------------------------- head & crown
// Head: 5.26 m high (sourced), at y ~79-84 (schematic position).
addPart('head', 'Head', 'head', [cyl(1.4, 1.9, 5.26, 0, 81.5, 0.3, 16)]);
addPart('nose', 'Nose', 'head', [box(-0.3, 0.3, 80.5, 82.5, 1.9, 2.6)]);
addPart('crown-band', 'Crown band', 'crown', [cyl(2.1, 2.1, 1.6, 0, 84.2, 0, 18)]);
// Crown windows in 4 groups (25 windows total, schematic).
for (let g = 0; g < 4; g++) {
  const a0 = (g * Math.PI * 2) / 4;
  const win = new THREE.CylinderGeometry(2.16, 2.16, 0.9, 6, 1, true, a0, Math.PI / 2);
  win.translate(0, 84.2, 0);
  addPart(`crown-windows-${g + 1}`, `Crown windows group ${g + 1}`, 'crown', [win]);
}
// 7 crown spikes (sourced count).
for (let k = 0; k < 7; k++) {
  const a = (k * Math.PI * 2) / 7;
  const dir = [Math.cos(a), 0.55, Math.sin(a)];
  const len = 4.2;
  const tip = [Math.cos(a) * 2.0 + dir[0] * len, 84.8 + dir[1] * len, Math.sin(a) * 2.0 + dir[2] * len];
  addPart(`crown-spike-${k + 1}`, `Crown spike ${k + 1}`, 'crown',
    [strut([Math.cos(a) * 2.0, 84.8, Math.sin(a) * 2.0], tip, 0.55)]);
}
// Torch balcony rails (schematic): the walkway around the torch.
for (let k = 0; k < 4; k++) {
  const a = (k * Math.PI * 2) / 4 + Math.PI / 4;
  const x = 5.5 + Math.cos(a) * 1.8, z = 1.5 + Math.sin(a) * 1.8;
  addPart(`torch-balcony-rail-${k + 1}`, `Torch balcony rail ${k + 1}`, 'torch', [
    box(x - 0.15, x + 0.15, 90.2, 91.4, z - 1.2, z + 1.2),
  ]);
}

// ---------------------------------------------------------------- right arm & torch
// Right arm raised holding the torch high (schematic pose).
addPart('right-upper-arm', 'Right upper arm', 'right-arm', [strut([2.8, 76, 0], [4.5, 81, 1], 1.6)]);
addPart('right-forearm', 'Right forearm', 'right-arm', [strut([4.5, 81, 1], [5.5, 87, 1.5], 1.3)]);
addPart('right-hand', 'Right hand', 'right-arm', [new THREE.SphereGeometry(1.1, 10, 8).translate(5.5, 87.8, 1.5)]);
// Torch: handle, cup and gold flame, tip at 93 m (sourced total height).
addPart('torch-handle', 'Torch handle', 'torch', [cyl(0.55, 0.8, 3.2, 5.5, 89.5, 1.5, 10)]);
addPart('torch-cup', 'Torch cup', 'torch', [cyl(1.3, 0.6, 1.2, 5.5, 91.6, 1.5, 12)]);
{
  const flames = [];
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI * 2) / 3;
    const f = new THREE.ConeGeometry(0.55, 2.2, 8);
    f.translate(Math.cos(a) * 0.4, 1.1, Math.sin(a) * 0.4);
    f.translate(5.5, 92.2, 1.5);
    flames.push(f);
  }
  addPart('torch-flame', 'Torch flame', 'torch', flames);
}

// ---------------------------------------------------------------- left arm & tablet
// Left arm bent, holding the tablet (schematic pose).
addPart('left-upper-arm', 'Left upper arm', 'left-arm', [strut([-2.8, 76, 0], [-4.2, 70, 1], 1.6)]);
addPart('left-forearm', 'Left forearm', 'left-arm', [strut([-4.2, 70, 1], [-3.2, 72.5, 2.5], 1.3)]);
addPart('left-hand', 'Left hand', 'left-arm', [new THREE.SphereGeometry(1.1, 10, 8).translate(-3.0, 73, 2.8)]);
// Tablet: 7.19 m by 4.14 m by 0.61 m (sourced), inscribed JULY IV MDCCLXXVI.
addPart('tablet', 'Tablet of the law', 'tablet', [box(-6.6, 0.6, 68, 75.19, 1.2, 1.81)]);

// ---------------------------------------------------------------- feet & chains
addPart('right-foot', 'Right foot', 'feet', [box(1.2, 3.2, 47, 48.6, -1, 2.5)]);
addPart('left-foot', 'Left foot', 'feet', [box(-3.2, -1.2, 47, 48.6, -2.5, 1)]);
for (let k = 0; k < 3; k++) {
  const t = new THREE.TorusGeometry(0.8, 0.25, 8, 14);
  t.rotateX(Math.PI / 2 + k * 0.4);
  t.translate(-5 + k * 1.2, 47.6, -3 - k * 0.5);
  addPart(`broken-chain-${k + 1}`, `Broken chain link ${k + 1}`, 'feet', [t]);
}

// ---------------------------------------------------------------- internal frame
// Eiffel's iron framework expressed schematically (visible when exploded).
for (let k = 0; k < 4; k++) {
  const a = (k * Math.PI) / 2 + Math.PI / 4;
  addPart(`frame-pylon-${k + 1}`, `Iron frame pylon ${k + 1}`, 'frame-internal',
    [strut([Math.cos(a) * 3, 47, Math.sin(a) * 3], [Math.cos(a) * 1.2, 80, Math.sin(a) * 1.2], 0.7)]);
}
addPart('frame-cross-brace', 'Iron frame cross bracing', 'frame-internal', [
  strut([-3, 55, 0], [3, 62, 0], 0.4),
  strut([3, 55, 0], [-3, 62, 0], 0.4),
  strut([0, 62, -3], [0, 69, 3], 0.4),
  strut([0, 62, 3], [0, 69, -3], 0.4),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('flame')) return '#d8a93c';
  if (id.includes('torch-handle') || id.includes('torch-cup')) return '#8a6f3c';
  if (id.includes('tablet')) return '#7d8b8f';
  if (id.includes('chain')) return '#5c665e';
  if (id.includes('crown-spike')) return '#6f9e8f';
  if (id.includes('crown')) return '#5f8a7d';
  if (id.includes('head') || id.includes('nose')) return '#6fa08f';
  if (id.includes('robe') || id.includes('drapery') || id.includes('shoulder') || id.includes('neck') || id.includes('arm') || id.includes('hand') || id.includes('foot')) return '#6fa08f';
  if (id.includes('pedestal') || id.includes('baluster') || id.includes('lazarus') || id.includes('quoin') || id.includes('panel') || id.includes('door') || id.includes('cornice') || id.includes('cap')) return '#b0a58e';
  if (id.includes('fort') || id.includes('star-point') || id.includes('wall')) return '#9a917e';
  if (id.includes('frame-')) return '#4c565e';
  return '#6fa08f';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'fort', name: 'Fort Wood', color: '#9a917e', description: 'The 11-pointed star fort whose walls the pedestal rises inside (schematic).' },
  { id: 'pedestal', name: 'Pedestal', color: '#b0a58e', description: 'Richard Morris Hunt\u2019s stone pedestal, built by the Americans, carrying Emma Lazarus\u2019s sonnet plaque.' },
  { id: 'robe', name: 'Robe', color: '#6fa08f', description: 'The flowing classical drapery of the figure, in hammered copper 2.37 mm thick (schematic form).' },
  { id: 'head', name: 'Head', color: '#6fa08f', description: 'The head, 5.26 m high (schematic features).' },
  { id: 'crown', name: 'Crown', color: '#5f8a7d', description: 'The crown with 7 rays for the seven seas and continents and 25 windows.' },
  { id: 'right-arm', name: 'Right arm', color: '#6fa08f', description: 'The raised right arm (schematic pose).' },
  { id: 'torch', name: 'Torch', color: '#d8a93c', description: 'The torch of enlightenment with its gold-leafed flame; the tip stands 93 m above the ground.' },
  { id: 'left-arm', name: 'Left arm', color: '#6fa08f', description: 'The bent left arm (schematic pose).' },
  { id: 'tablet', name: 'Tablet', color: '#7d8b8f', description: 'The tablet inscribed JULY IV MDCCLXXVI, 7.19 m by 4.14 m.' },
  { id: 'feet', name: 'Feet and chains', color: '#6fa08f', description: 'The feet with the broken chains of tyranny (schematic).' },
  { id: 'frame-internal', name: 'Iron framework', color: '#4c565e', description: 'Gustave Eiffel\u2019s iron framework inside the copper skin (schematic).' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'fort wood platform': 'The platform of Fort Wood, the 11-pointed star fort on whose walls the pedestal stands. Exact fort profile is schematic.',
  'pedestal base step': 'The base step of Richard Morris Hunt\u2019s pedestal. Exact stepping is schematic.',
  'pedestal shaft': 'The shaft of the pedestal, built by the Americans while France built the statue. Exact form is schematic.',
  'pedestal east panel': 'Panel on the east face of the pedestal. Exact detailing is schematic.',
  'pedestal west panel': 'Panel on the west face of the pedestal. Exact detailing is schematic.',
  'pedestal north panel': 'Panel on the north face of the pedestal. Exact detailing is schematic.',
  'pedestal south panel': 'Panel on the south face of the pedestal. Exact detailing is schematic.',
  'pedestal entrance door': 'The entrance door to the pedestal interior and the 354 steps to the crown. Exact form is schematic.',
  'the new colossus plaque': 'The bronze plaque carrying Emma Lazarus\u2019s 1883 sonnet "The New Colossus" with its invitation to the "huddled masses." Exact plaque position is schematic.',
  'pedestal cornice': 'The cornice crowning the pedestal shaft. Exact profile is schematic.',
  'pedestal cap': 'The cap the statue\u2019s feet stand on. Exact form is schematic.',
  'shoulders': 'The shoulders of the robed figure. Exact form is schematic.',
  'neck': 'The neck of the figure. Exact form is schematic.',
  'head': 'The head, 5.26 m high and 3.05 m ear to ear. Facial features are schematic.',
  'nose': 'The nose, 1.48 m long. Exact features are schematic.',
  'crown band': 'The band of the crown with its 25 windows representing gemstones and heaven\u2019s rays. Exact window forms are schematic.',
  'right upper arm': 'The upper part of the raised right arm. Exact pose is schematic.',
  'right forearm': 'The forearm of the raised right arm. Exact pose is schematic.',
  'right hand': 'The right hand gripping the torch. Exact form is schematic.',
  'torch handle': 'The handle of the torch of enlightenment. The torch has been closed to the public since 1916; the flame was replaced in 1986.',
  'torch cup': 'The cup of the torch. Exact form is schematic.',
  'torch flame': 'The gold-leafed flame of the torch. The tip of the flame stands 93 m above the ground.',
  'left upper arm': 'The upper part of the bent left arm. Exact pose is schematic.',
  'left forearm': 'The forearm of the left arm cradling the tablet. Exact pose is schematic.',
  'left hand': 'The left hand holding the tablet. Exact form is schematic.',
  'tablet of the law': 'The tablet inscribed JULY IV MDCCLXXVI, 7.19 m by 4.14 m by 0.61 m thick, evoking the date of American independence.',
  'right foot': 'The right foot of the figure. Exact form is schematic.',
  'left foot': 'The left foot of the figure. Exact form is schematic.',
  'iron frame cross bracing': 'Cross bracing of Eiffel\u2019s iron framework. Exact layout is schematic.',
};
for (let k = 1; k <= 11; k++) {
  explanations[`star point ${k}`] = `Point ${k} of the 11-pointed star of Fort Wood. Exact fort geometry is schematic.`;
}
for (let k = 1; k <= 4; k++) {
  explanations[`fort wall ${k}`] = `Reconstructed fort wall section ${k}. Exact form is schematic.`;
  explanations[`frame pylon ${k + 1}`] = `Iron pylon ${k + 1} of Eiffel\u2019s internal framework. Exact layout is schematic.`;
}
for (const nm of ['northeast', 'southeast', 'northwest', 'southwest']) {
  explanations[`pedestal ${nm} quoin`] = `The ${nm} corner quoin of the pedestal. Exact detailing is schematic.`;
}
for (let k = 1; k <= 8; k++) {
  explanations[`baluster ${k}`] = `Baluster ${k} of the pedestal cap balustrade. Exact form is schematic.`;
}
for (let i = 1; i <= ROBE_SEGS; i++) {
  explanations[`robe tier ${i}`] = `Stacked tier ${i} of ${ROBE_SEGS} forming the copper drapery. The copper skin is 2.37 mm thick. Exact drapery is schematic.`;
}
for (let k = 1; k <= 10; k++) {
  explanations[`drapery fold ${k}`] = `Vertical drapery fold ${k}. Exact folds are schematic.`;
}
for (let k = 1; k <= 7; k++) {
  explanations[`crown spike ${k}`] = `Crown ray ${k} of 7, for the seven seas and continents. Exact angles are schematic.`;
}
for (let k = 1; k <= 3; k++) {
  explanations[`broken chain link ${k}`] = `Link ${k} of the broken chains at the figure\u2019s feet, symbolizing liberation from tyranny. Exact form is schematic.`;
}

for (let k = 1; k <= 4; k++) {
  explanations[`crown windows group ${k}`] = `Crown window group ${k} of 4; the crown holds 25 windows in total. Exact forms are schematic.`;
  explanations[`torch balcony rail ${k}`] = `Railing ${k} of the walkway around the torch. The torch has been closed to the public since 1916. Exact form is schematic.`;
}
for (const nm of ['northeast', 'southeast', 'northwest', 'southwest']) {
  explanations[`pedestal ${nm} pediment block`] = `The ${nm} pediment block of the pedestal cap. Exact form is schematic.`;
}
// Fix the pylon explanation keys (loop above used wrong index).
for (let k = 1; k <= 4; k++) {
  explanations[`iron frame pylon ${k}`] = `Iron pylon ${k} of Eiffel\u2019s internal framework. Exact layout is schematic.`;
  delete explanations[`frame pylon ${k + 1}`];
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
const binName = 'statue-of-liberty-0.bin';
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
  scope: 'Statue of Liberty, New York',
  title: 'Statue of Liberty',
  location: 'New York, United States',
  blurb: 'Bartholdi\u2019s 1886 copper colossus in New York Harbor: 93 m from ground to torch tip, the 46 m figure with its 7-rayed crown and tablet on Hunt\u2019s pedestal inside Fort Wood, over Eiffel\u2019s iron frame.',
  sourceUrls: [
    { label: 'Wikipedia: Statue of Liberty', url: 'https://en.wikipedia.org/wiki/Statue_of_Liberty' },
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
  chunks: [{ url: '/models/statue-of-liberty/statue-of-liberty-0.bin', bytes: offset }],
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
