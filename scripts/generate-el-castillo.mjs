// Procedural El Castillo (Temple of Kukulcan, Chichen Itza), DETAILED model
// for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned step pyramid in code and writes
// it in the atlas binary format:
//   public/models/el-castillo/atlas.json + public/models/el-castillo/el-castillo-0.bin
//
// Sourced dimensions and facts (El Castillo and Chichen Itza Wikipedia
// articles, National Geographic, and the INAH/UNESCO World Heritage listing;
// see ~/workspace/architectural-atlas/research/el-castillo-attribution.md):
//   total height 30 m (24 m pyramid body + 6 m summit temple),
//   square base 55.3 m, 9 terraces of approx. 2.57 m,
//   4 stairways of 91 steps at 45 degrees, 365 total steps (the summit
//   platform counts as the final step, matching the Haab year),
//   pyramid face slope 53 degrees, terrace talud walls 72 to 74 degrees,
//   north face azimuth 111.72 degrees (sunsets on May 20 and July 24),
//   inner substructure approx. 33 m wide, 9 steps, 17 m high,
//   carved serpent heads at the base of the northeastern staircase,
//   plumed serpent sculptures down the sides of the northern balustrade,
//   equinox serpent shadow (design intent disputed by scholars),
//   tunnel cut through the northeastern balustrade in the 1930s, reaching
//   the hidden temple by August 1936, Chac Mool found April 1935 in the
//   Hall of Offerings (mother of pearl inlay on nails, teeth, and eyes),
//   Red Jaguar Throne painted with cinnabar (identified by XRF, traded from
//   far away), fangs of Lobatus costatus shell, green stones of jadeite,
//   two parallel rows of human bone in the Chamber of Sacrifices,
//   cenote approx. 25 by 35 m and up to 20 m deep, water thought to run
//   from north to south, 4.9 m limestone layer under the temple,
//   inner substructure built 600 to 800 CE, outer phase 900 to 1000 CE.
// Schematic (derived, never stated as fact in UI copy): terrace panel and
// deck widths derived from the 53 degree face slope, basal plinth and
// bedrock block subdivisions, plaza layout and causeway, stair and
// balustrade widths, individual tread and riser plates (24 m / 91 steps at
// 45 degrees, about 26 cm), balustrade capstones, serpent carving geometry,
// equinox marker positions, summit temple footprint, wall positions, doorway
// frieze and roofcomb form, inner substructure step profiles, tunnel route,
// cenote water level and rim, and all astronomy sightline markers.
//
// Granularity: 165 named parts across 10 systems. Every explanation is
// either a sourced fact (see el-castillo-attribution.md) or explicitly
// marked schematic. All geometry is modeled fresh for this detailed pass:
// terraces are battered talud panels with basal lips, decks, and core
// masses (not quarter wedges); stairs are tread and riser plates grouped
// per flight plus aprons and spine cores; balustrades are sloped parapets
// with capstone rows; serpent heads are split into cranium and jaw parts.
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
const STEPS = 91; // steps per stairway, sourced
const RISE = 24 / STEPS; // 0.2637 m riser/tread at 45 degrees, derived
const STAIR_W = 9.0; // schematic stair width (not published)
const BAL_X = STAIR_W / 2 + 0.5; // balustrade centerline offset, schematic
const O_BASE = (BASE_HW - (9 * TERR_H) / TAN53) + STEPS * RISE; // stair foot outward distance
const bwAt = (i) => BASE_HW - ((i - 1) * TERR_H) / TAN53; // terrace i outer half-width, derived
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

// ---------------------------------------------------------------- helpers
function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
// Full square frustum (4-sided), faces aligned to the axes.
function frustum4(hwB, hwT, y0, y1) {
  const g = new THREE.CylinderGeometry(hwT * Math.SQRT2, hwB * Math.SQRT2, y1 - y0, 4, 2);
  g.rotateY(Math.PI / 4);
  g.translate(0, (y0 + y1) / 2, 0);
  g.deleteAttribute('uv');
  return g;
}
// Battered wall panel: a box whose top edge is pulled inward (-z) by
// h / batterTan, for 73 degree talud walls. Local frame: outward = +Z.
function batteredPanel(w, h, t, batterTan) {
  const g = new THREE.BoxGeometry(w, h, t);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > 0) pos.setZ(i, pos.getZ(i) - h / batterTan);
  }
  g.computeVertexNormals();
  g.deleteAttribute('uv');
  return g;
}
// Rectangular beam between two points (for the tunnel shaft).
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
// One terrace side talud panel with a basal molding lip, in a local frame
// (outward = +Z). Returns merged geometry positioned for terrace i.
function taludPanel(i) {
  const y0 = BASAL_H + (i - 1) * TERR_H;
  const bw = bwAt(i);
  const panel = batteredPanel(2 * bw + 1.0, TERR_H, 1.0, TAN73);
  panel.translate(0, y0 + TERR_H / 2, bw - 0.5);
  const lip = box(2 * bw + 1.24, 0.4, 0.5, 0, y0 + 0.2, bw + 0.13);
  lip.deleteAttribute('uv');
  return mergeGeometries([panel, lip], false);
}
// Stair flight as individual tread and riser plates, local frame
// (outward = +Z). Steps i0..i1-1; step i has its tread top at
// yBase + (i+1) * rise and its riser face at oBase - i * rise.
function treadFlight(i0, i1, width, oBase, rise, yBase = 0) {
  const geoms = [];
  for (let i = i0; i < i1; i++) {
    const top = yBase + (i + 1) * rise;
    const oF = oBase - i * rise;
    geoms.push(box(width, 0.14, rise + 0.14, 0, top - 0.07, oF - rise / 2)); // tread plate
    geoms.push(box(width, rise, 0.14, 0, yBase + i * rise + rise / 2, oF - 0.07)); // riser plate
  }
  return geoms;
}
// Sloped parapet ramp with a row of capstones, local frame (outward = +Z).
// Covers steps i0..i1-1 on one side of a stair.
function parapetRamp(side, i0, i1, width, oBase, rise) {
  const n = i1 - i0;
  const len = n * rise * Math.SQRT2;
  const yMid = (i0 + n / 2) * rise;
  const oMid = oBase - (i0 + n / 2) * rise;
  const ramp = new THREE.BoxGeometry(1.0, len, 1.9);
  ramp.rotateX(-Math.PI / 4);
  ramp.translate(side * BAL_X, yMid + 0.75, oMid);
  const geoms = [ramp];
  const caps = 8;
  for (let k = 0; k < caps; k++) {
    const i = i0 + ((k + 0.5) / caps) * n;
    geoms.push(box(1.24, 0.32, 1.0, side * BAL_X, i * rise + 1.62, oBase - i * rise));
  }
  return geoms;
}
// Stylized serpent head in a local frame: facing +Z, base at y = 0.
// Split into upper (cranium) and lower (jaw) geometry sets.
function serpentCranium() {
  const g = [];
  g.push(box(1.7, 1.25, 1.9, 0, 1.05, 0)); // cranium block
  g.push(box(1.1, 0.75, 1.3, 0, 0.9, 1.35)); // snout
  g.push(box(1.3, 0.32, 1.6, 0, 1.62, 0.9)); // brow ridge
  for (const sx of [-0.5, 0.5]) {
    const eye = new THREE.SphereGeometry(0.24, 10, 8);
    eye.translate(sx, 1.58, 0.72);
    g.push(eye);
  }
  return g;
}
function serpentJaw() {
  const g = [];
  const jaw = box(1.05, 0.32, 1.5, 0, 0, 0);
  jaw.rotateX(-0.3);
  jaw.translate(0, 0.42, 1.15); // open lower jaw
  g.push(jaw);
  for (const sx of [-0.32, 0.32]) {
    const fang = new THREE.ConeGeometry(0.11, 0.45, 6);
    fang.rotateX(Math.PI);
    fang.translate(sx, 0.62, 1.62);
    g.push(fang);
  }
  g.push(box(0.3, 0.08, 0.9, 0, 0.35, 1.95)); // forked tongue base
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const EXPLANATIONS = {};
const addPart = (id, name, system, geoms, expl) => {
  parts.push({ id, name, system, geoms });
  EXPLANATIONS[name.toLowerCase()] = expl;
};

// World: x = east, z = south. Local stair frame: outward = +Z.
const DIRS = [
  { id: 'north', name: 'North', rot: Math.PI },
  { id: 'east', name: 'East', rot: Math.PI / 2 },
  { id: 'south', name: 'South', rot: 0 },
  { id: 'west', name: 'West', rot: -Math.PI / 2 },
];
const SIDE_NAMES = {
  north: { 1: 'West', '-1': 'East' },
  east: { 1: 'North', '-1': 'South' },
  south: { 1: 'East', '-1': 'West' },
  west: { 1: 'South', '-1': 'North' },
};

// --- Base and Platforms: basal plinth in quadrants, summit floor plate,
// the 365th step capstone, plaza paving, and a north approach causeway.
for (const [qx, qz, qname] of [
  [1, -1, 'northeast'],
  [-1, -1, 'northwest'],
  [1, 1, 'southeast'],
  [-1, 1, 'southwest'],
]) {
  addPart(
    `basal-plinth-${qname}`,
    `Basal plinth, ${qname} quarter`,
    'base-platforms',
    [box(27.65, BASAL_H, 27.65, qx * 13.825, BASAL_H / 2, qz * 13.825)],
    `The whole square structure measures 55.3 m (181 ft) across at its base. The plinth quadrant split is schematic.`,
  );
}
addPart(
  'summit-floor-plate',
  'Summit floor plate',
  'base-platforms',
  [box(2 * (BASE_HW - (9 * TERR_H) / TAN53), 0.8, 2 * (BASE_HW - (9 * TERR_H) / TAN53), 0, 24.4, 0)],
  'The summit platform counts as the final step, bringing the total to 365, the number of days in the Haab year. Plate thickness is schematic.',
);
addPart(
  'final-step-capstone',
  'Final step capstone (the 365th step)',
  'base-platforms',
  [box(3.2, 0.35, 1.4, 0, 24.975, -(BASE_HW - (9 * TERR_H) / TAN53) + 1.6)],
  'A marker for the 365th step: the four stairways have 91 steps each, and the summit platform completes the Haab year count. The capstone itself is schematic.',
);
for (const [qx, qz, qname] of [
  [1, -1, 'northeast'],
  [-1, -1, 'northwest'],
  [1, 1, 'southeast'],
  [-1, 1, 'southwest'],
]) {
  addPart(
    `plaza-paving-${qname}`,
    `Plaza paving, ${qname} quarter`,
    'base-platforms',
    [box(64, 0.6, 64, qx * 59.65, -0.3, qz * 59.65)],
    'The pyramid stands in the main plaza of Chichen Itza, ringed by monumental complexes including the Great Ball Court to the northwest. Paving layout is schematic.',
  );
}
addPart(
  'north-approach-causeway',
  'North approach causeway',
  'base-platforms',
  [box(14, 0.7, 40, 0, -0.3, -(27.65 + 20))],
  'A slightly raised walkway leading to the north stair, the ceremonial front of the pyramid. The causeway is schematic.',
);

// --- Terrace shells: nine levels x four battered talud panels with basal
// molding lips; setbacks follow the 53 degree face line.
for (let i = 1; i <= 9; i++) {
  const r = ROMAN[i - 1];
  for (const d of DIRS) {
    const geoms = [taludPanel(i)];
    geoms.forEach((g) => g.rotateY(d.rot));
    let expl;
    if (i === 9) {
      expl = `Terrace ${r} is the highest of the nine terraces, carrying the summit platform and the temple.`;
    } else if (i % 2 === 1) {
      expl = `Terrace ${r} of nine square terraces, each approximately 2.57 m (8.4 ft) high.`;
    } else {
      expl = `Terrace ${r}: terrace walls slope at 72 to 74 degrees while the pyramid face rises at 53 degrees.`;
    }
    if (d.id === 'north') expl += ' The north side is the main face, set at an azimuth of 111.72 degrees.';
    if (d.id === 'south') expl += ' The south side steps are badly eroded.';
    expl += ' Panel widths and the basal molding are schematic.';
    addPart(`talud-${r.toLowerCase()}-${d.id}`, `Talud wall, terrace ${r}, ${d.id} face`, 'terrace-shells', geoms, expl);
  }
}

// --- Terrace decks and cores: walking deck slab plus the core mass behind
// each terrace face.
for (let i = 1; i <= 9; i++) {
  const r = ROMAN[i - 1];
  const y1 = BASAL_H + i * TERR_H;
  const bw = bwAt(i);
  const bwNext = bwAt(i + 1);
  addPart(
    `terrace-deck-${r.toLowerCase()}`,
    `Terrace walking deck ${r}`,
    'terrace-decks',
    [box(2 * bw + 0.4, 0.4, 2 * bw + 0.4, 0, y1 - 0.2, 0)],
    `The flat walking surface atop terrace ${r}, overhanging the talud panels slightly like a cornice. Deck construction is schematic.`,
  );
  addPart(
    `terrace-core-${r.toLowerCase()}`,
    `Terrace core mass ${r}`,
    'terrace-decks',
    [frustum4(bw - 1.2, bwNext - 1.2, BASAL_H + (i - 1) * TERR_H, y1 - 0.4)],
    `Rubble and masonry core filling terrace ${r} behind its talud walls. Core makeup is schematic.`,
  );
}

// --- Grand stairways: each stair split into three tread flights, a landing
// apron at its foot, and a sloped spine core under the treads.
const FLIGHTS = [
  ['lower', 'Lower', 0, 30],
  ['middle', 'Middle', 30, 60],
  ['upper', 'Upper', 60, 91],
];
for (const d of DIRS) {
  const dn = d.name.toLowerCase();
  for (const [slug, label, i0, i1] of FLIGHTS) {
    const geoms = treadFlight(i0, i1, STAIR_W, O_BASE, RISE, 0);
    geoms.forEach((g) => g.rotateY(d.rot));
    addPart(
      `stair-${d.id}-${slug}`,
      `${label} flight, ${dn} stair`,
      'grand-stairways',
      geoms,
      `The ${label.toLowerCase()} flight of the ${dn} stair: steps ${i0 + 1} to ${i1} of 91, each step built as a separate tread and riser plate. At 45 degrees over a 24 m rise, each step rises about 26 cm; plate sizes are schematic.`,
    );
  }
  {
    const geoms = [box(STAIR_W + 2, 0.5, 6, 0, 0.25, O_BASE + 3)];
    geoms.forEach((g) => g.rotateY(d.rot));
    addPart(
      `stair-${d.id}-apron`,
      `Landing apron, ${dn} stair`,
      'grand-stairways',
      geoms,
      `The paved landing at the foot of the ${dn} stair where climbers gather before the ascent. The apron is schematic.`,
    );
  }
  {
    const len = STEPS * RISE * Math.SQRT2;
    const spine = new THREE.BoxGeometry(STAIR_W - 0.4, len, 1.4);
    spine.rotateX(-Math.PI / 4);
    spine.translate(0, 12 - 1.0, (O_BASE + (O_BASE - STEPS * RISE)) / 2);
    const geoms = [spine];
    geoms.forEach((g) => g.rotateY(d.rot));
    addPart(
      `stair-${d.id}-spine`,
      `Stair spine core, ${dn} stair`,
      'grand-stairways',
      geoms,
      `The sloped masonry spine carrying the ${dn} stair treads up the 45 degree incline. Spine construction is schematic.`,
    );
  }
}

// --- Balustrade ramps: sloped parapets with capstone rows, split per side
// into lower and upper ramps.
for (const d of DIRS) {
  const dn = d.name.toLowerCase();
  for (const side of [1, -1]) {
    const sideName = SIDE_NAMES[d.id][side];
    for (const [slug, label, i0, i1] of [
      ['lower', 'lower', 0, 45],
      ['upper', 'upper', 45, 91],
    ]) {
      const geoms = parapetRamp(side, i0, i1, STAIR_W, O_BASE, RISE);
      geoms.forEach((g) => g.rotateY(d.rot));
      addPart(
        `balustrade-${d.id}-${sideName.toLowerCase()}-${slug}`,
        `${sideName} balustrade, ${dn} stair, ${label} ramp`,
        'balustrades',
        geoms,
        `The ${label} ramp of the ${sideName.toLowerCase()} balustrade on the ${dn} stair: a sloped parapet capped with individual capstones. Parapet profile is schematic.`,
      );
    }
  }
}

// --- Serpent sculpture: cranium and jaw parts for the two north stair
// heads, undulating plumed bodies, and the equinox shadow marker.
for (const [lx, id, label] of [
  [-BAL_X, 'northeast', 'northeast'],
  [BAL_X, 'northwest', 'northwest'],
]) {
  const upper = serpentCranium();
  upper.forEach((g) => {
    g.translate(lx, 0, O_BASE + 1.4);
    g.rotateY(Math.PI);
  });
  addPart(
    `serpent-head-${id}-cranium`,
    `Serpent head, ${label} base: cranium`,
    'serpent-sculpture',
    upper,
    `Carved serpent heads stand at the base of the balustrades of the northeastern staircase. Carving details are schematic.`,
  );
  const lower = serpentJaw();
  lower.forEach((g) => {
    g.translate(lx, 0, O_BASE + 1.4);
    g.rotateY(Math.PI);
  });
  addPart(
    `serpent-head-${id}-jaw`,
    `Serpent head, ${label} base: jaw`,
    'serpent-sculpture',
    lower,
    `The open jaw of the ${label} serpent head, with fangs and tongue. Carving details are schematic.`,
  );
}
for (const [side, label] of [
  [-1, 'east'],
  [1, 'west'],
]) {
  const pts = [];
  for (let k = 0; k <= 20; k++) {
    const t = k / 20;
    const y = 1.4 + t * 20.5;
    const o = O_BASE - y + 1.1;
    const x = side * BAL_X + 0.55 * Math.sin(t * Math.PI * 5 + side);
    pts.push(new THREE.Vector3(x, y, o));
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.38, 8, false);
  const geoms = [tube];
  for (let j = 0; j < 7; j++) {
    const t = (j + 0.5) / 7;
    const p = new THREE.CatmullRomCurve3(pts).getPoint(t);
    const tuft = new THREE.ConeGeometry(0.16, 0.65, 6);
    tuft.translate(p.x, p.y + 0.55, p.z);
    geoms.push(tuft);
  }
  geoms.forEach((g) => g.rotateY(Math.PI));
  addPart(
    `serpent-body-${label}`,
    `Plumed serpent body, ${label} balustrade`,
    'serpent-sculpture',
    geoms,
    `Sculptures of plumed serpents run down the sides of the northern balustrade. The undulating body and plume tufts are schematic.`,
  );
}
{
  // Seven schematic light triangles marking where the equinox shadow falls
  // on the northwest balustrade of the north stair (local +x = world west).
  const geoms = [];
  for (let k = 0; k < 7; k++) {
    const y = 19.5 - k * 2.7;
    const o = O_BASE - y + 0.4;
    geoms.push(box(0.18, 1.05 - k * 0.09, 1.7, BAL_X + 0.5, y, o));
  }
  geoms.forEach((g) => g.rotateY(Math.PI));
  addPart(
    'equinox-shadow-band',
    'Equinox shadow band',
    'serpent-sculpture',
    geoms,
    'Around the spring and autumn equinoxes the late afternoon sun casts triangular shadows down the northwest balustrade, an illusion of the feathered serpent crawling down the temple. Scholars disagree whether the effect was designed; the marker positions are schematic.',
  );
}

// --- Summit temple: walls per side with the north wall split around the
// documented doorway, jambs, lintel, threshold, frieze band, chamber with
// benches, roof plate, and a perforated roofcomb in two ranks plus capstones.
const TF = 24.8; // temple floor level (top of the summit floor plate)
const TW = 3.2; // wall height
const TY = TF + TW / 2; // wall center height
addPart('temple-wall-south', 'South wall, summit temple', 'summit-temple',
  [box(11, TW, 1.1, 0, TY, 3.75)],
  'The summit temple adds 6 m (20 ft) to the 24 m pyramid body, for a total height of 30 m (98 ft). Wall positions are schematic.');
addPart('temple-wall-east', 'East wall, summit temple', 'summit-temple',
  [box(1.1, TW, 6.4, 4.95, TY, 0)],
  'The summit temple adds 6 m (20 ft) to the 24 m pyramid body, for a total height of 30 m (98 ft). Wall positions are schematic.');
addPart('temple-wall-west', 'West wall, summit temple', 'summit-temple',
  [box(1.1, TW, 6.4, -4.95, TY, 0)],
  'The summit temple adds 6 m (20 ft) to the 24 m pyramid body, for a total height of 30 m (98 ft). Wall positions are schematic.');
addPart('temple-wall-north-w', 'North wall, west of doorway', 'summit-temple',
  [box(3.9, TW, 1.1, -3.05, TY, -3.75)],
  'The north wall is split around the documented north doorway of the summit temple. Wall positions are schematic.');
addPart('temple-wall-north-e', 'North wall, east of doorway', 'summit-temple',
  [box(3.9, TW, 1.1, 3.05, TY, -3.75)],
  'The north wall is split around the documented north doorway of the summit temple. Wall positions are schematic.');
addPart('temple-jamb-w', 'West doorway jamb', 'summit-temple',
  [box(0.55, 2.7, 1.3, -1.375, TF + 1.35, -3.75)],
  'The summit temple is entered through its documented north doorway; jamb sizes are schematic.');
addPart('temple-jamb-e', 'East doorway jamb', 'summit-temple',
  [box(0.55, 2.7, 1.3, 1.375, TF + 1.35, -3.75)],
  'The summit temple is entered through its documented north doorway; jamb sizes are schematic.');
addPart('temple-lintel', 'Temple doorway lintel', 'summit-temple',
  [box(3.3, 0.55, 1.3, 0, TF + 2.975, -3.75)],
  'A stone lintel spans the north doorway of the summit temple; its size is schematic.');
addPart('temple-threshold', 'Doorway threshold', 'summit-temple',
  [box(3.0, 0.3, 1.8, 0, TF + 0.15, -3.75)],
  'The worn threshold stone of the north doorway; its size is schematic.');
{
  const geoms = [box(11, 0.6, 0.25, 0, TF + 2.8, -4.42)];
  for (let k = 0; k < 9; k++) geoms.push(box(0.7, 0.45, 0.2, -4.8 + k * 1.2, TF + 2.8, -4.55));
  addPart('temple-frieze', 'Doorway frieze band', 'summit-temple', geoms,
    'A carved geometric band above the north doorway, typical of Puuc influenced detailing. The pattern is schematic.');
}
addPart('temple-chamber', 'Temple inner room', 'summit-temple',
  [box(8.6, 3.0, 5.7, 0, TF + 1.5, 0)],
  'The summit temple interior is modeled as a plain masonry room; its exact layout is not published.');
addPart('temple-bench-w', 'Chamber bench, west', 'summit-temple',
  [box(1.1, 0.8, 4.6, -3.55, TF + 0.4, 0)],
  'Low masonry benches line the temple chamber walls; their layout is schematic.');
addPart('temple-bench-e', 'Chamber bench, east', 'summit-temple',
  [box(1.1, 0.8, 4.6, 3.55, TF + 0.4, 0)],
  'Low masonry benches line the temple chamber walls; their layout is schematic.');
addPart('temple-roof', 'Summit temple roof plate', 'summit-temple',
  [box(11.8, 0.7, 9.4, 0, TF + TW + 0.35, 0)],
  'The roof plate caps the 6 m summit temple; plate size is schematic.');
addPart('roofcomb-rail', 'Roofcomb footing rail', 'summit-temple',
  [box(8.5, 0.4, 1.0, 0, TF + TW + 0.9, 0)],
  'A perforated roofcomb crowns the summit temple; its exact form is schematic.');
{
  const geoms = [];
  for (let k = 0; k < 6; k++) geoms.push(box(0.85, 0.7, 0.45, -3.4 + k * 1.36, TF + TW + 1.45, -0.25));
  addPart('roofcomb-screen-front', 'Roofcomb screen, front rank', 'summit-temple', geoms,
    'The front rank of the perforated roofcomb screen; its exact form is schematic.');
}
{
  const geoms = [];
  for (let k = 0; k < 6; k++) geoms.push(box(0.85, 0.7, 0.45, -3.4 + k * 1.36, TF + TW + 1.45, 0.25));
  addPart('roofcomb-screen-rear', 'Roofcomb screen, rear rank', 'summit-temple', geoms,
    'The rear rank of the perforated roofcomb screen; its exact form is schematic.');
}
addPart('roofcomb-cap', 'Roofcomb capstones', 'summit-temple',
  [box(8.5, 0.25, 1.3, 0, TF + TW + 1.925, 0)],
  'Capstones crowning the roofcomb; their size is schematic.');

// --- Inner substructure: the buried earlier pyramid (approx. 33 m wide,
// 9 steps, 17 m high) as nine step rings with deck plates, its own stair,
// inner temple, offering chambers, and the 1930s tunnel.
const IN_H = 17 / 9; // inner step height
const inBw = (i) => 16.5 - ((i - 1) * IN_H) / TAN53; // inner step outer half-width
for (let i = 1; i <= 9; i++) {
  const r = ROMAN[i - 1];
  const y0 = (i - 1) * IN_H;
  const y1 = i * IN_H;
  const bw = inBw(i);
  const tw = bw - IN_H / TAN73;
  // Inset ring with an overhanging deck plate: extents differ from the
  // simple model's plain frustum per step.
  const geoms = [
    frustum4(bw - 0.6, tw - 0.6, y0, y1),
    box(2 * (tw - 0.6) + 1.5, 0.35, 2 * (tw - 0.6) + 1.5, 0, y1 - 0.175, 0),
  ];
  addPart(
    `inner-ring-${r.toLowerCase()}`,
    `Inner step ring ${r}`,
    'inner-substructure',
    geoms,
    `Ring ${r} of the nine steps of the buried earlier pyramid, approximately 33 m wide and 17 m high, built between 600 and 800 CE. Step profiles are schematic.`,
  );
}
{
  const rise2 = 17 / 64;
  const oBase2 = 3.689 + 17;
  for (const [slug, label, i0, i1] of [
    ['lower', 'Lower', 0, 32],
    ['upper', 'Upper', 32, 64],
  ]) {
    const geoms = treadFlight(i0, i1, 5, oBase2, rise2, 0);
    geoms.forEach((g) => g.rotateY(Math.PI));
    addPart(
      `inner-stair-${slug}`,
      `Inner stair, ${label.toLowerCase()} flight`,
      'inner-substructure',
      geoms,
      `The ${label.toLowerCase()} flight of the buried inner pyramid stairway, built between 600 and 800 CE. Step layout is schematic.`,
    );
  }
}
addPart('inner-temple-floor', 'Inner temple floor slab', 'inner-substructure',
  [box(7.5, 0.6, 6.5, 0, 17.3, 0)],
  'The floor of the hidden temple crowning the inner pyramid, reached by archaeologists in August 1936.');
{
  const geoms = [
    box(7.5, 3.0, 0.9, 0, 19.1, -2.8),
    box(7.5, 3.0, 0.9, 0, 19.1, 2.8),
    box(0.9, 3.0, 4.7, -3.3, 19.1, 0),
    box(0.9, 3.0, 4.7, 3.3, 19.1, 0),
  ];
  addPart('inner-temple-walls', 'Inner temple wall ring', 'inner-substructure', geoms,
    'The walls of the hidden inner temple; their exact layout is not published.');
}
addPart('inner-temple-roof', 'Inner temple roof slab', 'inner-substructure',
  [box(8.2, 0.7, 7.2, 0, 20.95, 0)],
  'The roof of the hidden inner temple; its size is schematic.');
addPart('north-chamber', 'North chamber, inner temple (Hall of Offerings)', 'inner-substructure',
  [box(5.2, 2.6, 2.4, 0, 18.9, -1.6)],
  'The North Chamber of the inner temple, called the Hall of Offerings, where the Chac Mool was found in April 1935.');
addPart('south-chamber', 'South chamber, inner temple (Chamber of Sacrifices)', 'inner-substructure',
  [box(4.2, 2.6, 2.2, 0, 18.9, 1.7)],
  'The inner chamber that held the Red Jaguar Throne, reached by archaeologists in August 1936.');
{
  const geoms = [
    box(3.6, 0.14, 0.14, 0, 19.7, -2.5),
    box(3.6, 0.14, 0.14, 0, 20.0, -2.5),
  ];
  addPart('bone-rows', 'Bone rows, south chamber back wall', 'inner-substructure', geoms,
    'Two parallel rows of human bone were set into the back wall of the Chamber of Sacrifices. Their placement here is schematic.');
}
{
  // Stylized reclining Chacmool figure: torso and head in one part.
  const geoms = [box(1.9, 0.28, 1.1, 0.3, 17.74, -1.6)]; // base slab
  const torso = box(0.7, 1.05, 0.9, 0, 0, 0);
  torso.rotateX(-0.65);
  torso.translate(0.3, 18.35, -1.45);
  geoms.push(torso);
  geoms.push(box(0.5, 0.5, 0.6, 0.3, 18.95, -1.0)); // head
  geoms.push(box(0.6, 0.4, 1.2, 0.3, 18.0, -0.75)); // folded legs
  addPart('chacmool-torso', 'Chacmool figure, torso and head', 'inner-substructure', geoms,
    'Found in April 1935 in the Hall of Offerings, inlaid with mother of pearl on nails, teeth, and eyes. The figure is stylized.');
}
addPart('chacmool-bowl', 'Chacmool offering bowl', 'inner-substructure',
  [box(0.95, 0.14, 0.75, 0.3, 18.7, -1.6)],
  'The bowl held on the Chacmool figure for offerings; its form is schematic.');
{
  const geoms = [box(1.5, 0.72, 0.7, -0.2, 18.06, 1.7)]; // body
  addPart('jaguar-body', 'Red jaguar throne, body', 'inner-substructure', geoms,
    'The throne body is painted red with cinnabar (mercury sulfide), identified by X-ray fluorescence; cinnabar was not available near Chichen Itza, so it was traded in from far away.');
}
{
  const geoms = [
    box(0.55, 0.62, 0.6, 0.7, 18.25, 1.7), // head
    box(0.4, 0.35, 0.3, 0.7, 18.1, 2.05), // snout
    box(0.2, 0.2, 0.14, 0.55, 18.6, 1.7), // ears
    box(0.2, 0.2, 0.14, 0.85, 18.6, 1.7),
  ];
  addPart('jaguar-head', 'Red jaguar throne, head', 'inner-substructure', geoms,
    'The jaguar head: its four fangs were identified as gastropod mollusk shells (Lobatus costatus) and the green stones as jadeite.');
}
{
  const geoms = [];
  for (const lx of [-0.75, 0.35])
    for (const lz of [1.45, 1.95]) geoms.push(box(0.17, 0.55, 0.17, lx, 17.7, lz)); // legs
  const tail = box(0.15, 0.15, 1.0, 0, 0, 0);
  tail.rotateX(0.35);
  tail.translate(-1.05, 18.3, 1.7);
  geoms.push(tail);
  addPart('jaguar-legs', 'Red jaguar throne, legs and tail', 'inner-substructure', geoms,
    'The legs and curled tail of the Red Jaguar Throne; their form is schematic.');
}
{
  const geoms = [
    box(0.45, 2.3, 0.55, 7.6, 1.15, -29.5),
    box(0.45, 2.3, 0.55, 8.4, 1.15, -29.5),
    box(1.7, 0.5, 0.6, 8.0, 2.45, -29.5),
  ];
  addPart('tunnel-portal', 'Tunnel portal frame', 'inner-substructure', geoms,
    'The modern entrance cut through the northeastern balustrade in the 1930s to reach the hidden temple. Portal framing is schematic.');
}
addPart('tunnel-shaft', 'Tunnel shaft', 'inner-substructure',
  [beam([8.0, 1.1, -29.2], [0, 15.5, -3.2], 1.4, 1.8)],
  'Cut through the northeastern balustrade in the 1930s, it reached the hidden temple by August 1936. The tunnel route is schematic.');

// --- Foundation and hydrology: bedrock blocks, limestone cap sheet, and the
// cenote split into shaft halves, water plane, water body, and rim ring.
for (const [qx, qz, qname] of [
  [1, -1, 'northeast'],
  [-1, -1, 'northwest'],
  [1, 1, 'southeast'],
  [-1, 1, 'southwest'],
]) {
  addPart(
    `bedrock-${qname}`,
    `Bedrock block, ${qname} quadrant`,
    'foundation-hydrology',
    [box(30, 4.9, 30, qx * 15, -2.45, qz * 15)],
    'A 4.9 m limestone layer lies under the temple, above the cenote. Block divisions are schematic.',
  );
}
addPart('limestone-cap', 'Limestone cap sheet', 'foundation-hydrology',
  [box(56, 0.5, 56, 0, -0.25, 0)],
  'The top sheet of the 4.9 m limestone layer carrying the pyramid. Sheet extent is schematic.');
for (const [thetaStart, id, label] of [
  [0, 'north', 'north'],
  [Math.PI, 'south', 'south'],
]) {
  const shaft = new THREE.CylinderGeometry(1, 1, 15.1, 24, 1, true, thetaStart, Math.PI);
  shaft.deleteAttribute('uv');
  shaft.scale(13, 1, 18); // approx. 26 by 36 m water body
  shaft.translate(0, -12.45, 0); // top just below the limestone layer
  addPart(
    `cenote-shaft-${id}`,
    `Cenote shaft, ${label} half`,
    'foundation-hydrology',
    [shaft],
    'A water filled sinkhole approximately 25 by 35 m and up to 20 m deep sits directly under the temple. Shaft geometry is schematic.',
  );
}
{
  const water = new THREE.CircleGeometry(1, 28);
  water.deleteAttribute('uv');
  water.rotateX(-Math.PI / 2);
  water.scale(12.8, 1, 18);
  water.translate(0, -8.2, 0); // schematic water level
  addPart('cenote-water-plane', 'Cenote water plane', 'foundation-hydrology', [water],
    'The water level shown is schematic; sources give the cavity size but not the water level.');
}
{
  const body = new THREE.CylinderGeometry(1, 0.92, 9, 24);
  body.deleteAttribute('uv');
  body.scale(12.8, 1, 18);
  body.translate(0, -12.7, 0); // schematic water column below the surface
  addPart('cenote-water-body', 'Cenote water body', 'foundation-hydrology', [body],
    'The body of water filling the sinkhole; its depth profile is schematic.');
}
{
  const rim = new THREE.TorusGeometry(1, 0.09, 8, 40);
  rim.rotateX(Math.PI / 2);
  rim.scale(13, 18.5, 1);
  rim.translate(0, -5.0, 0);
  addPart('cenote-rim', 'Cenote rim ring', 'foundation-hydrology', [rim],
    'The rim of the sinkhole where it meets the limestone layer; rim geometry is schematic.');
}

// --- Astronomy and orientation: schematic markers for the documented
// solar alignments.
{
  const az = (111.72 * Math.PI) / 180;
  const line = box(0.25, 0.25, 90, 0, 0.15, 0);
  line.rotateY(Math.PI - az); // documented north face azimuth
  addPart('azimuth-sightline', 'Azimuth sightline', 'astronomy-and-orientation', [line],
    'A sightline marking the documented north face azimuth of 111.72 degrees. The marker is schematic.');
}
{
  const arc = new THREE.TorusGeometry(42, 0.18, 6, 40, Math.PI * 0.65);
  arc.rotateZ(Math.PI * 0.175);
  arc.translate(0, 6, 0);
  addPart('sun-path-arc', 'Equinox sun path arc', 'astronomy-and-orientation', [arc],
    'The arc of the sun across the sky at the equinoxes, when the serpent shadow appears. The arc is schematic.');
}
addPart('cenote-flow-line', 'Cenote flow line', 'astronomy-and-orientation',
  [box(0.22, 0.22, 34, 0, -13, 0)],
  'The cenote water is thought to run from north to south beneath the temple. The flow line is schematic.');
addPart('sunset-marker-may', 'May sunset marker', 'astronomy-and-orientation',
  [box(0.8, 2.5, 0.8, -70, 1.25, -18)],
  'The north face azimuth of 111.72 degrees aligns with sunsets on May 20 and July 24. Marker placement is schematic.');
addPart('sunset-marker-july', 'July sunset marker', 'astronomy-and-orientation',
  [box(0.8, 2.5, 0.8, -70, 1.25, 18)],
  'The north face azimuth of 111.72 degrees aligns with sunsets on May 20 and July 24. Marker placement is schematic.');

// ---------------------------------------------------------------- metadata
// Schematic limestone palette for El Castillo; only the Eiffel Tower model
// uses dark realistic coloring.
const SYSTEMS = [
  {
    id: 'base-platforms',
    name: 'Base and Platforms',
    color: '#CDBB92',
    description: 'Basal plinth, summit floor plate, and plaza paving framing the pyramid.',
  },
  {
    id: 'terrace-shells',
    name: 'Terrace Shells',
    color: '#D3C8A4',
    description: 'Battered talud wall panels forming the nine stepped faces.',
  },
  {
    id: 'terrace-decks',
    name: 'Terrace Decks and Cores',
    color: '#D8CBA6',
    description: 'Walking decks and rubble core masses behind each terrace face.',
  },
  {
    id: 'grand-stairways',
    name: 'Grand Stairways',
    color: '#BFAE85',
    description: 'Four radial stairs of 91 treads each, built tread by tread.',
  },
  {
    id: 'balustrades',
    name: 'Balustrade Ramps',
    color: '#B7A67E',
    description: 'Sloped parapet ramps with capstone rows flanking every stair.',
  },
  {
    id: 'serpent-sculpture',
    name: 'Serpent Sculpture',
    color: '#6FA287',
    description: 'Plumed serpent carvings and the equinox shadow marker.',
  },
  {
    id: 'summit-temple',
    name: 'Summit Temple',
    color: '#C9B489',
    description: 'The Temple of Kukulcan crowning the pyramid, with its roofcomb.',
  },
  {
    id: 'inner-substructure',
    name: 'Inner Substructure',
    color: '#B2693C',
    description: 'The buried earlier pyramid and its offering chambers, revealed in exploded view.',
  },
  {
    id: 'foundation-hydrology',
    name: 'Foundation and Hydrology',
    color: '#6E8CA3',
    description: 'Limestone bedrock and the water filled cenote below.',
  },
  {
    id: 'astronomy-and-orientation',
    name: 'Astronomy and Orientation',
    color: '#9AA5B1',
    description: 'Sightlines and markers for the documented solar alignments.',
  },
];
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
  // Non-indexed merges get a sequential index.
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

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'El Castillo, Chichen Itza',
  title: 'El Castillo',
  location: 'Chichen Itza, Mexico',
  blurb:
    'The Temple of Kukulcan at Chichen Itza: a 30 meter Maya step pyramid with nine terraces and four stairways of 91 steps each. This detailed model builds every tread and balustrade capstone, the summit temple with its perforated roofcomb, the buried inner pyramid with the Chacmool and Red Jaguar Throne chambers, and the water filled cenote beneath the bedrock.',
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
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
