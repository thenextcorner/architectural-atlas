// Procedural El Castillo (Temple of Kukulcan, Chichen Itza) for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned step pyramid in code and writes it
// in the atlas binary format:
//   public/models/el-castillo/atlas.json + public/models/el-castillo/el-castillo-0.bin
//
// Dimensions used (sourced from the El Castillo and Chichen Itza Wikipedia
// articles, National Geographic, and the INAH/UNESCO World Heritage listing;
// see ~/workspace/architectural-atlas/research/el-castillo-attribution.md):
//   total height 30 m (24 m pyramid body + 6 m summit temple),
//   square base 55.3 m, 9 terraces of approx. 2.57 m,
//   4 stairways of 91 steps at 45 degrees, pyramid face slope 53 degrees,
//   terrace talud walls 72-74 degrees, north face azimuth 111.72 degrees,
//   inner substructure approx. 33 m wide, 9 steps, 17 m high,
//   cenote approx. 25 by 35 m and up to 20 m deep,
//   4.9 m limestone layer under the temple.
// Schematic (derived, never stated as fact in UI copy): terrace setback widths
// derived from the 53 degree face slope, basal platform and bedrock
// subdivisions, stair and balustrade widths, step tread/riser (24 m / 91 steps
// at 45 degrees, about 26 cm), serpent carving geometry, summit temple
// footprint, wall positions, and roofcomb form, inner substructure exact
// profile, summit slab thickness, tunnel route, plaza floor, cenote water
// level and rim.
//
// Granularity: 121 named parts across 7 systems. Every explanation is either
// a sourced fact (see el-castillo-attribution.md) or explicitly marked
// schematic.
//
// Usage: node scripts/generate-el-castillo.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'el-castillo');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: the viewer is tuned for an object about 2 units tall,
// so 30 m (total height) maps to 2.4 units. Y-up, pyramid base at y = 0
// (bedrock and cenote extend below).
const S = 2.4 / 30;

// ---------------------------------------------------------------- dimensions
const TAN53 = Math.tan((53 * Math.PI) / 180); // pyramid face slope (sourced)
const TAN73 = Math.tan((73 * Math.PI) / 180); // terrace talud wall slope (sourced)
const BASE_HW = 55.3 / 2; // 27.65 m, sourced base half-width
const TERR_H = 2.57; // terrace height, sourced (approx.)
const BASAL_H = 24 - 9 * TERR_H; // 0.87 m basal platform, derived to close the 24 m body
const SUMMIT_HW = BASE_HW - (9 * TERR_H) / TAN53; // derived from the 53 degree face slope
const STEPS = 91; // steps per stairway, sourced
const RISE = 24 / STEPS; // 0.2637 m riser/tread at 45 degrees, derived
const STAIR_W = 9.0; // schematic stair width (not published)
const BAL_THICK = 1.2; // schematic balustrade thickness
const BAL_LIFT = 1.2; // schematic balustrade height above treads

// ---------------------------------------------------------------- helpers
function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
// Square frustum with faces aligned to the axes, for terraces.
function frustum(hwB, hwT, y0, y1) {
  const g = new THREE.CylinderGeometry(hwT * Math.SQRT2, hwB * Math.SQRT2, y1 - y0, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
// Closed quarter wedge of a square frustum: one side of one terrace level.
// thetaStart (before the PI/4 alignment rotation): 0 = east, PI/2 = north,
// PI = west, 3PI/2 = south. The two radial cut planes are closed with
// explicit quads so the wedge is solid in exploded view.
function terraceSideQuad(hwB, hwT, y0, y1, thetaStart) {
  const g = new THREE.CylinderGeometry(
    hwT * Math.SQRT2,
    hwB * Math.SQRT2,
    y1 - y0,
    1,
    1,
    false,
    thetaStart,
    Math.PI / 2,
  );
  g.deleteAttribute('uv');
  g.translate(0, (y0 + y1) / 2, 0);
  const solid = g.toNonIndexed();
  const geoms = [solid];
  for (const [t, flip] of [
    [thetaStart, false],
    [thetaStart + Math.PI / 2, true],
  ]) {
    const rb = hwB * Math.SQRT2;
    const rt = hwT * Math.SQRT2;
    const bx = rb * Math.sin(t);
    const bz = rb * Math.cos(t);
    const tx = rt * Math.sin(t);
    const tz = rt * Math.cos(t);
    const tris = flip
      ? [0, y0, 0, tx, y1, tz, bx, y0, bz, 0, y0, 0, 0, y1, 0, tx, y1, tz]
      : [0, y0, 0, bx, y0, bz, tx, y1, tz, 0, y0, 0, tx, y1, tz, 0, y1, 0];
    const q = new THREE.BufferGeometry();
    q.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tris), 3));
    q.computeVertexNormals();
    geoms.push(q);
  }
  const merged = mergeGeometries(geoms, false);
  merged.rotateY(Math.PI / 4);
  return [merged];
}
// Rectangular beam between two points (for the access tunnel).
function beam(a, b, w, h) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const len = dir.length();
  const g = new THREE.BoxGeometry(w, len, h);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
  );
  g.translate(va.x, va.y, va.z);
  return g;
}
// Stepped stair mass in a local frame: outward = +Z, up = +Y.
// Steps i0..i1-1 of a STEPS-step stair; each step is a solid box from yBase
// up to its tread, buried back into the pyramid mass so the stair always
// meets the sloped face.
function stairRange(rise, i0, i1, width, summitHW, yBase) {
  const geoms = [];
  for (let i = i0; i < i1; i++) {
    const top = yBase + (i + 1) * rise;
    const oFront = summitHW + STEPS * rise - i * rise;
    const oBack = 2; // buried inside the pyramid mass
    geoms.push(
      box(width, top - yBase, oFront - oBack, 0, yBase + (top - yBase) / 2, (oFront + oBack) / 2),
    );
  }
  return geoms;
}
function balustradeGeoms(side, rise, steps, width, summitHW, yBase) {
  const geoms = [];
  for (let i = 0; i < steps; i++) {
    const top = yBase + (i + 1) * rise + BAL_LIFT;
    const oFront = summitHW + steps * rise - i * rise;
    const oBack = 2;
    geoms.push(
      box(
        BAL_THICK,
        top - yBase,
        oFront - oBack,
        side * (width / 2 + BAL_THICK / 2),
        yBase + (top - yBase) / 2,
        (oFront + oBack) / 2,
      ),
    );
  }
  return geoms;
}
// Stylized serpent head in a local frame: facing +Z, base at y = 0.
function serpentHead() {
  const g = [];
  g.push(box(2.0, 1.4, 2.2, 0, 1.0, 0)); // cranium
  g.push(box(1.3, 0.9, 1.5, 0, 0.95, 1.5)); // snout
  g.push(box(1.4, 0.35, 1.9, 0, 1.55, 1.2)); // brow ridge
  const jaw = box(1.2, 0.35, 1.7, 0, 0, 0);
  jaw.rotateX(-0.35);
  jaw.translate(0, 0.5, 1.3);
  g.push(jaw); // open lower jaw
  for (const sx of [-0.55, 0.55]) {
    const eye = new THREE.SphereGeometry(0.28, 10, 8);
    eye.translate(sx, 1.5, 0.9);
    g.push(eye);
  }
  for (const sx of [-0.35, 0.35]) {
    const fang = new THREE.ConeGeometry(0.12, 0.5, 6);
    fang.rotateX(Math.PI);
    fang.translate(sx, 0.75, 1.9);
    g.push(fang);
  }
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// World: x = east, z = south. Terrace side order for the theta mapping.
const SIDES = [
  { id: 'north', theta: Math.PI / 2 },
  { id: 'east', theta: 0 },
  { id: 'south', theta: (3 * Math.PI) / 2 },
  { id: 'west', theta: Math.PI },
];

// --- Base and Platforms: basal platform split per side, summit slab, plaza.
for (const side of SIDES) {
  const s = side.id;
  const t = BASAL_H;
  let geom;
  if (s === 'north') geom = box(55.3, t, 55.3 / 2, 0, t / 2, -55.3 / 4);
  else if (s === 'south') geom = box(55.3, t, 55.3 / 2, 0, t / 2, 55.3 / 4);
  else if (s === 'east') geom = box(55.3 / 2, t, 55.3, 55.3 / 4, t / 2, 0);
  else geom = box(55.3 / 2, t, 55.3, -55.3 / 4, t / 2, 0);
  addPart(`basal-platform-${s}`, `Basal platform, ${s} edge`, 'base-platforms', [geom]);
}
addPart('summit-platform-slab', 'Summit platform slab', 'base-platforms', [
  box(SUMMIT_HW * 2, 1.0, SUMMIT_HW * 2, 0, 24.5, 0),
]);
addPart('plaza-floor', 'Plaza floor', 'base-platforms', [box(120, 0.5, 120, 0, -0.25, 0)]);

// --- Terraces: 9 levels x 4 sides, each a closed quarter wedge with
// 73 degree talud walls; setbacks follow the 53 degree face line.
for (let i = 1; i <= 9; i++) {
  const y0 = BASAL_H + (i - 1) * TERR_H;
  const y1 = y0 + TERR_H;
  const bw = BASE_HW - ((i - 1) * TERR_H) / TAN53;
  const tw = bw - TERR_H / TAN73;
  for (const side of SIDES) {
    addPart(
      `terrace-${i}-${side.id}`,
      `Terrace ${i}, ${side.id} face`,
      'terraces',
      terraceSideQuad(bw, tw, y0, y1, side.theta),
    );
  }
}

// --- Grand stairways: each split into 3 flights plus 5 named step groups.
// Local frame: outward = +Z. North stair (outward -Z) rotates PI.
const DIRS = [
  { id: 'north', name: 'North', rot: Math.PI },
  { id: 'east', name: 'East', rot: Math.PI / 2 },
  { id: 'south', name: 'South', rot: 0 },
  { id: 'west', name: 'West', rot: -Math.PI / 2 },
];
const SIDE_NAMES = {
  north: { 1: 'west', '-1': 'east' },
  east: { 1: 'north', '-1': 'south' },
  south: { 1: 'east', '-1': 'west' },
  west: { 1: 'south', '-1': 'north' },
};
const FLIGHTS = [
  ['lower', 'Lower', 0, 30],
  ['middle', 'Middle', 30, 60],
  ['upper', 'Upper', 60, 91],
];
const STEP_GROUPS = [
  [1, 18],
  [19, 36],
  [37, 54],
  [55, 72],
  [73, 91],
];
for (const d of DIRS) {
  for (const [slug, label, i0, i1] of FLIGHTS) {
    const geoms = stairRange(RISE, i0, i1, STAIR_W, SUMMIT_HW, 0);
    geoms.forEach((g) => g.rotateY(d.rot));
    addPart(`${d.id}-stairway-flight-${slug}`, `${d.name} stairway ${label.toLowerCase()} flight`, 'stairways', geoms);
  }
  for (const [a, b] of STEP_GROUPS) {
    const geoms = stairRange(RISE, a - 1, b, STAIR_W, SUMMIT_HW, 0);
    geoms.forEach((g) => g.rotateY(d.rot));
    addPart(
      `${d.id}-stairway-steps-${a}-${b}`,
      `${d.name} stairway, steps ${a} to ${b}`,
      'stairways',
      geoms,
    );
  }
  for (const side of [1, -1]) {
    const sideName = SIDE_NAMES[d.id][side];
    const bGeoms = balustradeGeoms(side, RISE, STEPS, STAIR_W, SUMMIT_HW, 0);
    bGeoms.forEach((g) => g.rotateY(d.rot));
    addPart(
      `balustrade-${d.id}-${sideName}`,
      `${d.name} stairway ${sideName} balustrade`,
      'balustrades',
      bGeoms,
    );
  }
}

// --- Serpent sculpture at the north stair (stylized).
// East head: world +x; in the north stair local frame (rot PI) that is -x.
for (const [lx, id, name] of [
  [-STAIR_W / 2 - BAL_THICK / 2, 'serpent-head-north-east', 'Northeast serpent head'],
  [STAIR_W / 2 + BAL_THICK / 2, 'serpent-head-north-west', 'Northwest serpent head'],
]) {
  const geoms = serpentHead();
  geoms.forEach((g) => {
    g.translate(lx, 0, SUMMIT_HW + STEPS * RISE + 0.8);
    g.rotateY(Math.PI);
  });
  addPart(id, name, 'balustrades', geoms);
}
{
  // Plumed serpent body undulating down the east balustrade of the north stair.
  const pts = [];
  for (let k = 0; k <= 24; k++) {
    const t = k / 24;
    const y = 1.5 + t * 22;
    const o = SUMMIT_HW + STEPS * RISE - y + 0.6;
    const lx = -(STAIR_W / 2 + BAL_THICK / 2) + 0.45 * Math.sin(t * Math.PI * 6);
    pts.push(new THREE.Vector3(-lx, y, -o)); // north local frame rotated PI to world
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.32, 8, false);
  addPart('serpent-body-north', 'Plumed serpent body', 'balustrades', [tube]);
}

// --- Summit temple: 6 m on the summit slab (y 25 to 30), single north
// doorway. Walls split per side, doorway split into jambs and lintel.
addPart('temple-wall-south', 'South temple wall', 'summit-temple', [
  box(12, 3.4, 1, 0, 26.7, 4),
]);
addPart('temple-wall-east', 'East temple wall', 'summit-temple', [
  box(1, 3.4, 9, 5.5, 26.7, 0),
]);
addPart('temple-wall-west', 'West temple wall', 'summit-temple', [
  box(1, 3.4, 9, -5.5, 26.7, 0),
]);
addPart('temple-wall-north-west', 'North temple wall, west of doorway', 'summit-temple', [
  box(5, 3.4, 1, -3.5, 26.7, -4),
]);
addPart('temple-wall-north-east', 'North temple wall, east of doorway', 'summit-temple', [
  box(5, 3.4, 1, 3.5, 26.7, -4),
]);
addPart('doorway-jamb-west', 'Doorway west jamb', 'summit-temple', [
  box(0.5, 3, 1.2, -1.25, 26.5, -4),
]);
addPart('doorway-jamb-east', 'Doorway east jamb', 'summit-temple', [
  box(0.5, 3, 1.2, 1.25, 26.5, -4),
]);
addPart('doorway-lintel', 'Doorway lintel', 'summit-temple', [
  box(3, 0.5, 1.2, 0, 28.15, -4),
]);
addPart('inner-chamber', 'Inner chamber', 'summit-temple', [
  box(9, 3.2, 6, 0, 26.6, 0), // room volume, revealed in exploded view
]);
addPart('temple-roof-slab', 'Temple roof slab', 'summit-temple', [
  box(13, 0.6, 10, 0, 28.7, 0),
]);
addPart('roofcomb-rail', 'Roofcomb base rail', 'summit-temple', [
  box(9, 0.4, 0.8, 0, 29.2, 0),
]);
{
  const geoms = [];
  for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) geoms.push(box(1.1, 0.6, 0.8, x, 29.7, 0));
  addPart('roofcomb-fins', 'Roofcomb fins', 'summit-temple', geoms);
}

// --- Inner substructure: buried earlier pyramid (approx. 33 m wide,
// 9 steps, 17 m high), split per step, nested inside the outer shell for
// the exploded view.
{
  const inStepH = 17 / 9;
  for (let i = 1; i <= 9; i++) {
    const y0 = (i - 1) * inStepH;
    const y1 = i * inStepH;
    const bw = 16.5 - ((i - 1) * inStepH) / TAN53;
    const tw = bw - inStepH / TAN73;
    addPart(`inner-pyramid-step-${i}`, `Inner pyramid step ${i}`, 'inner-substructure', [
      frustum(bw, tw, y0, y1),
    ]);
  }
}
{
  const geoms = stairRange(17 / 64, 0, 64, 5, 3.689, 0);
  geoms.forEach((g) => g.rotateY(Math.PI));
  addPart('inner-stairway', 'Inner stairway', 'inner-substructure', geoms);
}
addPart('inner-temple', 'Inner temple', 'inner-substructure', [box(7, 4, 6, 0, 19, 0)]);
addPart('hall-of-offerings', 'Hall of Offerings', 'inner-substructure', [
  box(5, 2.8, 2.2, 0, 18.4, -1.7),
]);
{
  // Stylized reclining Chac Mool figure.
  const geoms = [box(1.8, 0.25, 1.0, 0.3, 17.12, -1.7)]; // base slab
  const torso = box(0.65, 1.1, 0.85, 0, 0, 0);
  torso.rotateX(-0.7);
  torso.translate(0.3, 17.8, -1.55);
  geoms.push(torso);
  geoms.push(box(0.45, 0.45, 0.55, 0.3, 18.35, -1.15)); // head
  geoms.push(box(0.55, 0.35, 1.1, 0.3, 17.5, -0.9)); // legs
  geoms.push(box(0.9, 0.12, 0.7, 0.3, 18.15, -1.7)); // offering tray
  addPart('chac-mool-statue', 'Chac Mool statue', 'inner-substructure', geoms);
}
addPart('chamber-of-sacrifices', 'Chamber of Sacrifices', 'inner-substructure', [
  box(4, 2.8, 2.0, 0, 18.4, 1.5),
]);
{
  // Stylized Red Jaguar Throne, split into body and head.
  const bodyGeoms = [
    box(1.4, 0.7, 0.65, -0.2, 17.55, 1.5), // body
  ];
  for (const lx of [-0.7, 0.3])
    for (const lz of [1.3, 1.7]) bodyGeoms.push(box(0.16, 0.5, 0.16, lx, 17.25, lz)); // legs
  const tail = box(0.14, 0.14, 0.9, 0, 0, 0);
  tail.rotateX(0.3);
  tail.translate(-1.0, 17.75, 1.5);
  bodyGeoms.push(tail);
  addPart('red-jaguar-throne-body', 'Red jaguar throne body', 'inner-substructure', bodyGeoms);
  const headGeoms = [
    box(0.5, 0.6, 0.55, 0.65, 17.7, 1.5), // head
    box(0.22, 0.22, 0.14, 0.5, 18.05, 1.5), // ears
    box(0.22, 0.22, 0.14, 0.8, 18.05, 1.5),
  ];
  addPart('red-jaguar-throne-head', 'Red jaguar throne head', 'inner-substructure', headGeoms);
}
addPart('archaeologists-tunnel', 'Archaeologists tunnel', 'inner-substructure', [
  beam([5.5, 1.2, -34.5], [0, 15.5, -3.2], 1.6, 2.0),
]);

// --- Foundation and hydrology: bedrock split per quadrant, cenote split
// into shaft, water surface, and rim.
for (const [qx, qz, qname] of [
  [16, -16, 'northeast'],
  [-16, -16, 'northwest'],
  [16, 16, 'southeast'],
  [-16, 16, 'southwest'],
]) {
  addPart(`bedrock-${qname}`, `Limestone bedrock, ${qname} quadrant`, 'foundation-hydrology', [
    box(32, 4.9, 32, qx, -2.45, qz),
  ]);
}
{
  const shaft = new THREE.CylinderGeometry(1, 1, 15.1, 24, 1, true); // open tube
  shaft.scale(12.5, 1, 17.5); // 25 by 35 m water body
  shaft.translate(0, -12.45, 0); // top just below the limestone layer
  addPart('cenote-shaft', 'Cenote shaft', 'foundation-hydrology', [shaft]);
}
{
  const water = new THREE.CircleGeometry(1, 24);
  water.rotateX(-Math.PI / 2);
  water.scale(12.5, 1, 17.5);
  water.translate(0, -8, 0); // schematic water level
  addPart('cenote-water-surface', 'Cenote water surface', 'foundation-hydrology', [water]);
}
{
  const rim = new THREE.TorusGeometry(1, 0.06, 8, 32);
  rim.rotateX(Math.PI / 2);
  rim.scale(12.5, 17.5, 1);
  rim.translate(0, -4.9, 0);
  addPart('cenote-rim', 'Cenote rim', 'foundation-hydrology', [rim]);
}

// ---------------------------------------------------------------- metadata
// Schematic limestone palette for El Castillo; only the Eiffel Tower model
// uses dark realistic coloring.
const SYSTEMS = [
  {
    id: 'base-platforms',
    name: 'Base and Platforms',
    color: '#CDBB92',
    description: 'Basal platform and summit slab framing the pyramid body.',
  },
  {
    id: 'terraces',
    name: 'Terraces',
    color: '#D3C8A4',
    description: 'Nine square terraces forming the stepped pyramid mass.',
  },
  {
    id: 'stairways',
    name: 'Grand Stairways',
    color: '#BFAE85',
    description: 'Four radial stairways, each with 91 steps.',
  },
  {
    id: 'balustrades',
    name: 'Balustrades and Serpents',
    color: '#6FA287',
    description: 'Stair balustrades with plumed serpent sculpture.',
  },
  {
    id: 'summit-temple',
    name: 'Summit Temple',
    color: '#C9B489',
    description: 'The Temple of Kukulcan crowning the summit.',
  },
  {
    id: 'inner-substructure',
    name: 'Inner Substructure',
    color: '#B2693C',
    description: 'Buried earlier pyramid with offering chambers, revealed in exploded view.',
  },
  {
    id: 'foundation-hydrology',
    name: 'Foundation and Hydrology',
    color: '#6E8CA3',
    description: 'Limestone bedrock and the water filled cenote below.',
  },
];

// Keyed by lowercase part name. Every fact comes from the sources listed in
// el-castillo-attribution.md (El Castillo and Chichen Itza Wikipedia articles,
// National Geographic, INAH/UNESCO listing). Geometry not documented there is
// marked schematic.
const EXPLANATIONS = {
  'plaza floor':
    'The pyramid stands in the main plaza of Chichen Itza, ringed by monumental complexes including the Great Ball Court to the northwest. The plaza floor is schematic.',
  'summit platform slab':
    'The summit platform counts as the final step, bringing the total to 365, the number of days in the Haab year.',
};
for (const side of SIDES) {
  EXPLANATIONS[`basal platform, ${side.id} edge`] =
    'The whole square structure measures 55.3 m (181 ft) across at its base. The platform subdivision is schematic.';
}
for (let i = 1; i <= 9; i++) {
  for (const side of SIDES) {
    let text;
    if (i === 9) {
      text = 'Terrace 9 is the highest of the nine terraces, carrying the summit platform and the temple.';
    } else if (i % 2 === 1) {
      text = `Terrace ${i} of nine square terraces, each approximately 2.57 m (8.4 ft) high.`;
    } else {
      text = `Terrace ${i}: terrace walls slope at 72 to 74 degrees while the pyramid face rises at 53 degrees.`;
    }
    if (side.id === 'north') {
      text += ' The north side is the main face, set at an azimuth of 111.72 degrees.';
    } else if (side.id === 'south') {
      text += ' The steps of the south side stairway are badly eroded.';
    }
    EXPLANATIONS[`terrace ${i}, ${side.id} face`] = text;
  }
}
for (const d of DIRS) {
  const dn = d.name.toLowerCase();
  for (const [, label, a, b] of FLIGHTS) {
    const fl = label.toLowerCase();
    EXPLANATIONS[`${dn} stairway ${fl} flight`] =
      `One of four stairways, each with 91 steps rising at 45 degrees. This ${fl} flight covers steps ${a + 1} to ${b} of the ${dn} stairway; step dimensions are schematic.`;
  }
  for (const [a, b] of STEP_GROUPS) {
    let text =
      `Steps ${a} to ${b} of 91 on the ${dn} stairway. At 45 degrees over a 24 m rise, each step rises about 26 cm; step dimensions are schematic.`;
    if (dn === 'south') text += ' The south side steps are badly eroded.';
    EXPLANATIONS[`${dn} stairway, steps ${a} to ${b}`] = text;
  }
  for (const side of [1, -1]) {
    const sideName = SIDE_NAMES[d.id][side];
    EXPLANATIONS[`${dn} stairway ${sideName} balustrade`] =
      'One of eight balustrade ramps flanking the four stairways.';
  }
}
EXPLANATIONS['plumed serpent body'] =
  'Sculptures of plumed serpents run down the sides of the northern balustrade. Around the spring and autumn equinoxes the late afternoon sun casts triangular shadows down the northwest balustrade, an illusion of the feathered serpent crawling down the temple; scholars disagree whether the effect was designed.';
EXPLANATIONS['northeast serpent head'] =
  'Carved serpent heads stand at the base of the balustrades of the northeastern staircase.';
EXPLANATIONS['northwest serpent head'] =
  'One of two carved serpent heads flanking the base of the northern stairway.';
for (const [key, name] of [
  ['south temple wall', 'south'],
  ['east temple wall', 'east'],
  ['west temple wall', 'west'],
  ['north temple wall, west of doorway', 'north'],
  ['north temple wall, east of doorway', 'north'],
]) {
  EXPLANATIONS[key] =
    'The summit temple adds 6 m (20 ft) to the 24 m pyramid body, for a total height of 30 m (98 ft). Wall positions are schematic.';
}
for (const key of ['doorway west jamb', 'doorway east jamb', 'doorway lintel']) {
  EXPLANATIONS[key] =
    'The summit temple is entered through its documented north doorway; jamb and lintel sizes are schematic.';
}
EXPLANATIONS['inner chamber'] =
  'The summit temple interior is modeled as a plain masonry chamber; its exact layout is not published.';
EXPLANATIONS['temple roof slab'] = 'The roof slab caps the 6 m summit temple; slab size is schematic.';
EXPLANATIONS['roofcomb base rail'] =
  'A perforated roofcomb crowns the summit temple; its exact form is schematic.';
EXPLANATIONS['roofcomb fins'] =
  'A perforated roofcomb crowns the summit temple; its exact form is schematic.';
for (let i = 1; i <= 9; i++) {
  EXPLANATIONS[`inner pyramid step ${i}`] =
    `Step ${i} of the nine steps of the buried earlier pyramid, approximately 33 m wide and 17 m high. Step profiles are schematic.`;
}
EXPLANATIONS['inner stairway'] = 'Stairway of the buried inner pyramid, built between 600 and 800 CE.';
EXPLANATIONS['inner temple'] =
  'The hidden temple crowning the inner pyramid, reached by archaeologists in August 1936.';
EXPLANATIONS['hall of offerings'] =
  'The North Chamber of the inner temple, called the Hall of Offerings, where the Chac Mool was found in April 1935.';
EXPLANATIONS['chac mool statue'] =
  'Found in April 1935 in the Hall of Offerings, inlaid with mother of pearl on nails, teeth, and eyes.';
EXPLANATIONS['chamber of sacrifices'] =
  'Inner chamber that held the Red Jaguar Throne. Two parallel rows of human bone were set into its back wall.';
EXPLANATIONS['red jaguar throne body'] =
  'The throne body is painted red with cinnabar (mercury sulfide), identified by X-ray fluorescence; cinnabar was not available near Chichen Itza, so it was traded in from far away.';
EXPLANATIONS['red jaguar throne head'] =
  'The jaguar head: its four fangs were identified as gastropod mollusk shells (Lobatus costatus) and the green stones as jadeite.';
EXPLANATIONS['archaeologists tunnel'] =
  'Cut through the northeastern balustrade in the 1930s, it reached the hidden temple by August 1936.';
for (const qname of ['northeast', 'northwest', 'southeast', 'southwest']) {
  EXPLANATIONS[`limestone bedrock, ${qname} quadrant`] =
    'A 4.9 m limestone layer lies under the temple, above the cenote. Quadrant divisions are schematic.';
}
EXPLANATIONS['cenote shaft'] =
  'A water filled sinkhole approximately 25 by 35 m and up to 20 m deep sits directly under the temple; the water is thought to run from north to south.';
EXPLANATIONS['cenote water surface'] =
  'The water level shown is schematic; sources give the cavity size but not the water level.';
EXPLANATIONS['cenote rim'] =
  'The rim of the sinkhole where it meets the 4.9 m limestone layer; rim geometry is schematic.';

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
  // Non-indexed merges (e.g. the closed terrace wedges) get a sequential index.
  let idxArray = merged.index ? merged.index.array : null;
  if (!idxArray) {
    idxArray = new Uint32Array(merged.attributes.position.count);
    for (let i = 0; i < idxArray.length; i++) idxArray[i] = i;
  }
  const idx = idxArray;
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
fs.writeFileSync(path.join(outDir, 'el-castillo-0.bin'), buffer);
// Validator-compatibility copy: validate-atlas.mjs resolves chunk files by
// basename against public/models/, so a byte-identical copy lives there too.
// The viewer loads the chunk from the URL below.
fs.writeFileSync(path.join(outDir, '..', 'el-castillo-0.bin'), buffer);

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'El Castillo, Chichen Itza',
  title: 'El Castillo',
  location: 'Chichen Itza, Mexico',
  blurb:
    'The 30 meter step pyramid of Kukulcan at Chichen Itza, with nine terraces and four stairways of 91 steps. The model includes its buried inner pyramid, offering chambers, and the water filled cenote beneath the bedrock.',
  sourceUrls: [
    {
      label: 'El Castillo, Chichen Itza on Wikipedia',
      url: 'https://en.wikipedia.org/wiki/El_Castillo,_Chichen_Itza',
    },
    { label: 'Chichen Itza on Wikipedia', url: 'https://en.wikipedia.org/wiki/Chichen_Itza' },
    {
      label: 'Chichen Itza by National Geographic',
      url: 'https://www.nationalgeographic.com/travel/world-heritage/article/chichen-itza',
    },
    {
      label: 'Chichen-Itza, INAH (UNESCO World Heritage listing)',
      url: 'https://lugares.inah.gob.mx/en/node/6131',
    },
  ],
  systems: SYSTEMS,
  explanations: EXPLANATIONS,
  parts: records.map((r) => ({
    id: r.part.id,
    name: r.part.name,
    conceptId: r.part.id,
    system: r.part.system,
    chunk: 0,
    positions: r.posOff,
    normals: r.norOff,
    indices: r.idxOff,
    vertexCount: r.vertexCount,
    indexCount: r.indexCount,
    bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/el-castillo/el-castillo-0.bin', bytes: offset }],
  triangles,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
