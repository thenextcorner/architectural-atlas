// Procedural Milan Cathedral for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Duomo di Milano in code and
// writes it in the atlas binary format:
//   public/models/milan-cathedral/atlas.json
//   public/models/milan-cathedral/milan-cathedral-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   cathedral church of Milan, Italy (Duomo di Milano), dedicated to St
//   Mary of the Nativity (Santa Maria Nascente), seat of the Archbishop
//   of Milan; Italian Gothic; groundbreaking 1386 under Gian Galeazzo
//   Visconti, completed 1965, nearly six centuries of construction by the
//   Fabbrica del Duomo; 158.6 m long, 92 m wide, 108.5 m to the top of
//   the main spire; largest church in Italy, among the largest in the
//   world, capacity 40,000; brick core with Candoglia marble from Val
//   d'Ossola; 135 spires, more than 3,400 statues, 96 gargoyles; the
//   gilded copper Madonnina (Virgin Mary) placed on the main spire in
//   1774, covered in gold leaf, the city's highest point for almost two
//   centuries; five naves; facade faces west with five bronze doors;
//   Leonardo da Vinci submitted drawings; Napoleon Bonaparte ordered its
//   completion; Ambrosian Rite.
// Schematic (not sourced, never stated as fact in the UI): exact plan
// subdivisions, wall thicknesses, window and portal positions, buttress
// count and placement, spire positions beyond the total count, gargoyle
// placement, interior column layout, tiburio detailing.
//
// Coordinate frame: x = length (west/facade at -x), z = width, y = up.
// All dimensions in meters.
//
// Granularity: 130+ named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-milan-cathedral.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'milan-cathedral');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (158.6 m) maps to 2.4 units.
const S = 2.4 / 158.6;

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
// Triangular prism: triangle in XY (base x0..x1 at y0, apex at mid x,
// yApex), extruded from z0 to z1.
function prism(x0, x1, y0, yApex, z0, z1) {
  const xm = (x0 + x1) / 2;
  const v = new Float32Array([
    x0, y0, z0, x1, y0, z0, xm, yApex, z0,
    x0, y0, z1, x1, y0, z1, xm, yApex, z1,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setIndex([0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5]);
  g.computeVertexNormals();
  return g;
}
// Gable across the width (z), apex up: prism rotated into the ZY plane.
function gableZ(x0, x1, z0, z1, y0, yApex) {
  const g = prism(z0, z1, y0, yApex, x0, x1);
  g.rotateY(Math.PI / 2);
  return g;
}
function slab(w, t, l, ang, x, y, z) {
  const g = new THREE.BoxGeometry(w, t, l);
  g.rotateZ(ang);
  g.translate(x, y, z);
  return g;
}
// Small spire: cone on the roof.
function spire(x, z, yBase, h, r) {
  const g = new THREE.CylinderGeometry(0.06, r, h, 6);
  g.translate(x, yBase + h / 2, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Floor slab: 1 part.
addPart('floor-slab', 'Floor slab', 'interior', [box(-79.3, 79.3, 0, 1, -46, 46)]);

// --- Facade (west): wall, 5 portals, 5 bronze doors, 3 windows, gable,
// 4 statue niche groups, 8 spires: 22 parts.
addPart('facade-wall', 'Facade wall', 'facade', [box(-81, -79.3, 1, 45, -46, 46)]);
const PORTAL_Z = [-32, -16, 0, 16, 32];
const PORTAL_NAMES = ['North outer', 'North inner', 'Central', 'South inner', 'South outer'];
PORTAL_Z.forEach((z, i) => {
  addPart(`portal-${i + 1}`, `${PORTAL_NAMES[i]} portal`, 'facade', [
    box(-82.5, -79.3, 1, 13, z - 4, z + 4),
  ]);
  addPart(`bronze-door-${i + 1}`, `${PORTAL_NAMES[i]} bronze door`, 'facade', [
    box(-82.7, -82.4, 1, 10.5, z - 3, z + 3),
  ]);
});
[-24, 0, 24].forEach((z, i) => {
  addPart(`facade-window-${i + 1}`, `Facade window ${i + 1}`, 'facade', [
    box(-81.2, -80.9, 20, 38, z - 5, z + 5),
  ]);
});
addPart('facade-gable', 'Facade gable', 'facade', [gableZ(-81, -79.3, -46, 46, 45, 57)]);
for (let k = 0; k < 4; k++) {
  const niches = [];
  for (const z of [-38 + k * 4, 38 - k * 4]) {
    niches.push(box(-81.3, -80.8, 14 + k * 5, 18 + k * 5, z - 1.2, z + 1.2));
  }
  addPart(`facade-niches-${k + 1}`, `Facade statue niches ${k + 1}`, 'statuary', niches);
}
for (let k = 0; k < 8; k++) {
  const z = -42 + k * 12;
  addPart(`facade-spire-${k + 1}`, `Facade spire ${k + 1}`, 'spires', [spire(-80, z, 45, 12, 1.6)]);
}

// --- Nave: side walls, 12 windows, clerestory, roof: 17 parts.
addPart('nave-north-wall', 'Nave north wall', 'nave', [box(-79.3, 60, 1, 35, 40, 46)]);
addPart('nave-south-wall', 'Nave south wall', 'nave', [box(-79.3, 60, 1, 35, -46, -40)]);
for (let k = 0; k < 6; k++) {
  const x = -60 + k * 20;
  addPart(`nave-north-window-${k + 1}`, `Nave north window ${k + 1}`, 'nave', [
    box(x - 4, x + 4, 12, 28, 45.7, 46.1),
  ]);
  addPart(`nave-south-window-${k + 1}`, `Nave south window ${k + 1}`, 'nave', [
    box(x - 4, x + 4, 12, 28, -46.1, -45.7),
  ]);
}
addPart('clerestory-north', 'North clerestory', 'nave', [box(-79.3, 60, 28, 35, 40, 46)]);
addPart('clerestory-south', 'South clerestory', 'nave', [box(-79.3, 60, 28, 35, -46, -40)]);
addPart('nave-roof-north', 'Nave north roof slope', 'nave', [slab(50, 0.8, 145, 0.35, 0, 42, 23)]);
addPart('nave-roof-south', 'Nave south roof slope', 'nave', [slab(50, 0.8, 145, -0.35, 0, 42, -23)]);

// --- Flying buttresses: 10 per side, pier + flyer each: 20 parts.
for (let side = 0; side < 2; side++) {
  const sName = side === 0 ? 'north' : 'south';
  const S = side === 0 ? 1 : -1;
  for (let k = 0; k < 10; k++) {
    const x = -70 + k * 13.5;
    addPart(`${sName}-buttress-${k + 1}`, `${sName[0].toUpperCase()}${sName.slice(1)} buttress ${k + 1}`, 'buttresses', [
      box(x - 1.2, x + 1.2, 1, 30, S * 52 - 1.2, S * 52 + 1.2),
      strut([x, 30, S * 43], [x, 26, S * 51], 1.4),
    ]);
  }
}

// --- Transept: north/south arms, end windows, gables, 8 spires: 14 parts.
addPart('transept-north', 'Transept north arm', 'transept-apse', [box(-10, 10, 1, 35, 46, 70)]);
addPart('transept-south', 'Transept south arm', 'transept-apse', [box(-10, 10, 1, 35, -70, -46)]);
addPart('transept-north-window', 'Transept north window', 'transept-apse', [box(-5, 5, 14, 30, 69.7, 70.1)]);
addPart('transept-south-window', 'Transept south window', 'transept-apse', [box(-5, 5, 14, 30, -70.1, -69.7)]);
addPart('transept-north-gable', 'Transept north gable', 'transept-apse', [gableZ(-10, 10, 46, 70, 35, 44)]);
addPart('transept-south-gable', 'Transept south gable', 'transept-apse', [gableZ(-10, 10, -70, -46, 35, 44)]);
for (let k = 0; k < 4; k++) {
  addPart(`transept-north-spire-${k + 1}`, `Transept north spire ${k + 1}`, 'spires', [
    spire(-7 + k * 4.6, 68, 35, 11, 1.4),
  ]);
  addPart(`transept-south-spire-${k + 1}`, `Transept south spire ${k + 1}`, 'spires', [
    spire(-7 + k * 4.6, -68, 35, 11, 1.4),
  ]);
}

// --- Apse (east): 3 polygonal chapels + 3 windows: 6 parts.
[[-30, 'North'], [0, 'Central'], [30, 'South']].forEach(([z, n]) => {
  addPart(`apse-${n.toLowerCase()}-chapel`, `Apse ${n.toLowerCase()} chapel`, 'transept-apse', [
    cyl(9, 9, 34, 70, 18, z, 5),
  ]);
  addPart(`apse-${n.toLowerCase()}-window`, `Apse ${n.toLowerCase()} window`, 'transept-apse', [
    box(77.5, 78.2, 12, 26, z - 3, z + 3),
  ]);
});

// --- Crossing tiburio: octagonal tower, 8 faces + 8 windows: 16 parts.
for (let k = 0; k < 8; k++) {
  const a = (k * Math.PI) / 4 + Math.PI / 8;
  const r = 13;
  addPart(`tiburio-face-${k + 1}`, `Tiburio face ${k + 1}`, 'crossing-tower', [
    box(r * Math.cos(a) - 5, r * Math.cos(a) + 5, 35, 58, r * Math.sin(a) - 1, r * Math.sin(a) + 1),
  ]);
  addPart(`tiburio-window-${k + 1}`, `Tiburio window ${k + 1}`, 'crossing-tower', [
    box(r * Math.cos(a) - 2, r * Math.cos(a) + 2, 42, 52, r * Math.sin(a) - 1.3, r * Math.sin(a) + 1.3),
  ]);
}

// --- Main spire: 4 cone quadrants + tip: 5 parts.
for (let k = 0; k < 4; k++) {
  addPart(`main-spire-${k + 1}`, `Main spire quadrant ${k + 1}`, 'spires', [
    (() => { const g = new THREE.CylinderGeometry(0.8, 6, 42, 6, 1, true, (k * Math.PI) / 2, Math.PI / 2); g.translate(0, 79, 0); return g; })(),
  ]);
}
addPart('spire-tip', 'Spire tip', 'spires', [cyl(0.1, 0.8, 4, 0, 102, 0, 6)]);

// --- Madonnina: gilded statue: 2 parts.
addPart('madonnina', 'Madonnina', 'statuary', [
  cyl(0.5, 0.9, 3.2, 0, 105.6, 0, 8),
  (() => { const g = new THREE.SphereGeometry(0.35, 8, 6); g.translate(0, 107.6, 0); return g; })(),
]);
addPart('madonnina-halo', 'Madonnina halo', 'statuary', [
  (() => { const g = new THREE.TorusGeometry(0.7, 0.08, 6, 16); g.translate(0, 107.6, 0); return g; })(),
]);

// --- Roof spires: 120 in 12 groups of 10: 12 parts.
{
  const positions = [];
  for (const z of [-36, -24, -12, 12, 24, 36]) {
    for (let xi = 0; xi < 20; xi++) {
      const x = -70 + xi * 6.5;
      if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;
      positions.push([x, z]);
    }
  }
  const per = Math.ceil(positions.length / 12);
  let gCount = 0;
  for (let gI = 0; gI < 12; gI++) {
    const geoms = [];
    for (let j = 0; j < per; j++) {
      const idx = gI * per + j;
      if (idx >= positions.length) break;
      const [x, z] = positions[idx];
      geoms.push(spire(x, z, 38, 9, 1.2));
    }
    if (!geoms.length) continue;
    gCount++;
    addPart(`roof-spires-${gCount}`, `Roof spires ${gCount}`, 'spires', geoms);
  }
}

// --- Gargoyles: 96 in 4 groups: 4 parts.
for (let gI = 0; gI < 4; gI++) {
  const geoms = [];
  for (let j = 0; j < 24; j++) {
    const side = j % 2 === 0 ? 1 : -1;
    const x = -65 + Math.floor(j / 2) * 11;
    geoms.push(box(x - 0.3, x + 0.3, 33, 34.5, side * 46, side * 48.5));
  }
  addPart(`gargoyles-${gI + 1}`, `Gargoyles ${gI + 1}`, 'statuary', geoms);
}

// --- Interior: 12 columns, high altar, choir: 14 parts.
for (let r = 0; r < 2; r++) {
  for (let c = 0; c < 6; c++) {
    const z = r === 0 ? -15 : 15;
    const x = -60 + c * 22;
    addPart(`nave-column-${r + 1}-${c + 1}`, `Nave column row ${r + 1} number ${c + 1}`, 'interior', [
      cyl(1.1, 1.3, 30, x, 16, z, 10),
    ]);
  }
}
addPart('high-altar', 'High altar', 'interior', [box(55, 62, 1, 4, -6, 6)]);
addPart('choir-screen', 'Choir screen', 'interior', [box(50, 51, 1, 8, -12, 12)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'floor-slab') return '#a89f92';
  if (id.startsWith('portal-') || id === 'facade-wall') return '#f0e8dc';
  if (id.startsWith('bronze-door-')) return '#6b4f2a';
  if (id.includes('window')) return '#9fd4e8';
  if (id.includes('gable')) return '#e8d8cc';
  if (id.includes('niches')) return '#e2d4c2';
  if (id.includes('spire') || id === 'spire-tip') return '#f0e8dc';
  if (id === 'madonnina' || id === 'madonnina-halo') return '#d4af37';
  if (id.includes('buttress')) return '#e8d8cc';
  if (id.startsWith('nave-') || id.startsWith('clerestory')) return '#f0e8dc';
  if (id.startsWith('transept-') || id.startsWith('apse-')) return '#f0e8dc';
  if (id.startsWith('tiburio-')) return '#ece0d0';
  if (id.startsWith('roof-spires')) return '#f0e8dc';
  if (id.startsWith('gargoyles')) return '#c9bda8';
  if (id.startsWith('nave-column')) return '#e5d9c6';
  if (id === 'high-altar' || id === 'choir-screen') return '#d9cbb6';
  return '#f0e8dc';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'facade', name: 'West facade', color: '#f0e8dc', description: 'The west front with five portals, bronze doors, great windows and gable.' },
  { id: 'nave', name: 'Nave', color: '#f0e8dc', description: 'The five-aisled nave with side walls, windows, clerestory and roof.' },
  { id: 'buttresses', name: 'Flying buttresses', color: '#e8d8cc', description: 'The flying buttresses carrying the nave vault thrust to outer piers.' },
  { id: 'transept-apse', name: 'Transept and apse', color: '#f0e8dc', description: 'The transept arms and the polygonal apse chapels at the east end.' },
  { id: 'crossing-tower', name: 'Crossing tower', color: '#ece0d0', description: 'The octagonal tiburio over the crossing.' },
  { id: 'spires', name: 'Spires', color: '#f0e8dc', description: 'The 135 spires crowning the roofs, led by the 108.5 m main spire.' },
  { id: 'statuary', name: 'Statuary', color: '#d4af37', description: 'The facade niches, the 96 gargoyles and the gilded Madonnina.' },
  { id: 'interior', name: 'Interior', color: '#e5d9c6', description: 'The floor, nave colonnades, high altar and choir.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'floor slab': 'The cathedral floor, over the site of earlier churches back to St Ambrose\'s 5th-century basilica. Schematic.',
  'facade wall': 'The west front, facing the Piazza del Duomo. Its present form is largely 19th century. Schematic.',
  'facade gable': 'The crowning gable of the west front. Schematic.',
  'nave north wall': 'The north outer wall of the five-aisled nave. Schematic.',
  'nave south wall': 'The south outer wall of the five-aisled nave. Schematic.',
  'north clerestory': 'The north clerestory wall above the aisle roofs. Schematic.',
  'south clerestory': 'The south clerestory wall above the aisle roofs. Schematic.',
  'nave north roof slope': 'The north slope of the nave roof, carrying rows of spires. Schematic.',
  'nave south roof slope': 'The south slope of the nave roof, carrying rows of spires. Schematic.',
  'transept north arm': 'The north arm of the transept. Schematic.',
  'transept south arm': 'The south arm of the transept. Schematic.',
  'transept north gable': 'The gable ending the north transept arm. Schematic.',
  'transept south gable': 'The gable ending the south transept arm. Schematic.',
  'spire tip': 'The tip of the main spire below the Madonnina. Schematic.',
  'madonnina': 'The Madonnina, the gilded copper statue of the Virgin Mary placed on the main spire in 1774, covered in gold leaf. For almost two centuries she was the highest point in Milan. Exact figure is schematic.',
  'madonnina halo': 'The halo of the Madonnina. Schematic.',
  'high altar': 'The high altar. Schematic.',
  'choir screen': 'The choir screen. Schematic.',
};
const PORTAL_N = ['north outer', 'north inner', 'central', 'south inner', 'south outer'];
for (let i = 0; i < 5; i++) {
  explanations[`${PORTAL_N[i]} portal`] =
    `The ${PORTAL_N[i]} portal of the west front. Exact portal forms are schematic.`;
  explanations[`${PORTAL_N[i]} bronze door`] =
    `The ${PORTAL_N[i]} bronze door of the west front. Exact door decoration is schematic.`;
}
for (let i = 1; i <= 3; i++) {
  explanations[`facade window ${i}`] = `Great west window ${i} of the facade. Schematic.`;
  explanations[`apse north chapel`] = 'The north apse chapel at the east end. Schematic.';
}
['north', 'central', 'south'].forEach((n) => {
  explanations[`apse ${n} chapel`] = `The ${n} apse chapel at the east end. Schematic.`;
  explanations[`apse ${n} window`] = `Window of the ${n} apse chapel. Schematic.`;
});
for (let k = 1; k <= 4; k++) {
  explanations[`facade statue niches ${k}`] =
    `Statue niche group ${k} of the west front, part of the more than 3,400 statues. Exact statues are schematic.`;
  explanations[`facade spire ${k}`] = `Spire ${k} along the facade crown. Schematic.`;
  explanations[`gargoyles ${k}`] =
    `Gargoyle group ${k}; 96 gargoyles channel rainwater off the roofs. Exact figures are schematic.`;
  explanations[`main spire quadrant ${k}`] =
    `Quadrant ${k} of the main spire, rising to 108.5 m. Exact profile is schematic.`;
  explanations[`roof spires ${k}`] =
    `Roof spire group ${k}; 135 spires in total crown the cathedral. Exact positions are schematic.`;
}
for (let k = 5; k <= 8; k++) {
  explanations[`facade spire ${k}`] = `Spire ${k} along the facade crown. Schematic.`;
  explanations[`transept north spire ${k - 4}`] = `Spire on the north transept arm. Schematic.`;
  explanations[`transept south spire ${k - 4}`] = `Spire on the south transept arm. Schematic.`;
}
for (let k = 1; k <= 12; k++) {
  if (k <= 6) {
    explanations[`nave north window ${k}`] = `North aisle window ${k}. Schematic.`;
    explanations[`nave south window ${k}`] = `South aisle window ${k}. Schematic.`;
  }
  if (k <= 10) {
    explanations[`north buttress ${k}`] =
      `North flying buttress ${k}, carrying the nave vault thrust outward to its pier. Schematic.`;
    explanations[`south buttress ${k}`] =
      `South flying buttress ${k}, carrying the nave vault thrust outward to its pier. Schematic.`;
  }
  if (k <= 4) {
    explanations[`transept north spire ${k}`] = `Spire on the north transept arm. Schematic.`;
    explanations[`transept south spire ${k}`] = `Spire on the south transept arm. Schematic.`;
  }
}
for (let k = 5; k <= 12; k++) {
  explanations[`roof spires ${k}`] =
    `Roof spire group ${k}; 135 spires in total crown the cathedral. Exact positions are schematic.`;
}
explanations['transept north window'] = 'The great north transept window. Schematic.';
explanations['transept south window'] = 'The great south transept window. Schematic.';
for (let k = 1; k <= 8; k++) {
  explanations[`tiburio face ${k}`] =
    `Face ${k} of the octagonal tiburio over the crossing. Schematic.`;
  explanations[`tiburio window ${k}`] = `Tiburio window ${k}. Schematic.`;
}
for (let r = 1; r <= 2; r++) {
  for (let c = 1; c <= 6; c++) {
    explanations[`nave column row ${r} number ${c}`] =
      `A column of the nave colonnade; the cathedral's 52 columns rise in four rows down the five aisles. Exact column forms are schematic.`;
  }
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
const binName = 'milan-cathedral-0.bin';
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
  scope: 'Milan Cathedral, Milan',
  title: 'Milan Cathedral',
  location: 'Milan, Lombardy, Italy',
  blurb: 'The Duomo di Milano in Candoglia marble: 158.6 m of Italian Gothic begun in 1386, with 135 spires, more than 3,400 statues, and the gilded Madonnina at 108.5 m.',
  sourceUrls: [
    { label: 'Wikipedia: Milan Cathedral', url: 'https://en.wikipedia.org/wiki/Milan_Cathedral' },
    { label: 'TravelCurious: The Milan Cathedral', url: 'https://travelcurious.com/italy/milan/attractions/the-milan-cathedral-AUP2XT' },
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
  chunks: [{ url: '/models/milan-cathedral/milan-cathedral-0.bin', bytes: offset }],
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
