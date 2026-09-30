// Procedural Eiffel Tower for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Eiffel Tower in code and writes it
// in the atlas binary format: public/models/tower-simple/atlas.json +
// public/models/tower-simple/tower-simple-0.bin
//
// Dimensions used (all verified from the Eiffel Tower Wikipedia article):
//   tip 330 m (broadcasting aerial), architectural top 300 m, summit deck 276 m,
//   second floor 115 m, first floor 57 m, square base 125 m per side.
// Intermediate widths between those heights are schematic approximations and are
// not stated as facts anywhere in the UI. All geometry other than the documented
// heights, the 125 m square base, and the sourced foundation figures is schematic.
//
// Granularity: 119 named parts across 8 systems. Every explanation is either a
// sourced fact (see ~/workspace/architectural-atlas/research/tower-attribution.md)
// or explicitly marked schematic.
//
// Usage: node scripts/generate-tower-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'tower-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: the viewer is tuned for an object about 2 units tall,
// so 330 m (tip) maps to 2.0 units.
const S = 2 / 330;

// ---------------------------------------------------------------- profile
// Half-width (m) of the tower at key heights (m). Endpoints are documented
// figures (125 m square base, floor heights); values between them are
// schematic, chosen for a smooth taper.
const PROFILE = [
  [0, 55],
  [57, 30],
  [115, 16],
  [180, 11],
  [276, 6.5],
  [300, 5],
];
function halfWidth(y) {
  if (y <= PROFILE[0][0]) return PROFILE[0][1];
  for (let i = 1; i < PROFILE.length; i++) {
    const [y1, w1] = PROFILE[i - 1];
    const [y2, w2] = PROFILE[i];
    if (y <= y2) {
      const t = (y - y1) / (y2 - y1);
      const s = (1 - Math.cos(Math.PI * t)) / 2;
      return w1 + (w2 - w1) * s;
    }
  }
  return PROFILE[PROFILE.length - 1][1];
}
const legThick = (y) => 7 - (7 - 1.8) * (y / 300);

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

// Corners: x = east, z = south.
const CORNERS = [
  { sx: 1, sz: -1, name: 'Northeast' },
  { sx: -1, sz: -1, name: 'Northwest' },
  { sx: 1, sz: 1, name: 'Southeast' },
  { sx: -1, sz: 1, name: 'Southwest' },
];
const FACES = [
  { name: 'South', fixed: 'z', sign: 1 },
  { name: 'North', fixed: 'z', sign: -1 },
  { name: 'East', fixed: 'x', sign: 1 },
  { name: 'West', fixed: 'x', sign: -1 },
];
function facePoint(face, u, y) {
  const w = halfWidth(y);
  return face.fixed === 'z' ? [u * w, y, face.sign * w] : [face.sign * w, y, u * w];
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Legs: each of the four lattice girders split into 5 vertical segments
//     plus a leg shoe at the base. 24 parts.
function legSegment(c, y0, y1) {
  const geoms = [];
  const N = 10;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const y = y0 + ((y1 - y0) * i) / N;
    const w = halfWidth(y);
    pts.push(new THREE.Vector3(c.sx * w, y, c.sz * w));
  }
  // Four chords per leg, following the curve.
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    for (let i = 0; i < N; i++) {
      const t0 = legThick(pts[i].y) / 2;
      const t1 = legThick(pts[i + 1].y) / 2;
      geoms.push(
        strut(
          [pts[i].x + ox * t0, pts[i].y, pts[i].z + oz * t0],
          [pts[i + 1].x + ox * t1, pts[i + 1].y, pts[i + 1].z + oz * t1],
          0.9,
        ),
      );
    }
  }
  // Horizontal ties plus diagonals every other sample.
  for (let i = 0; i <= N; i += 2) {
    const t = legThick(pts[i].y) / 2;
    const p = pts[i];
    const ring = [
      [-t, -t], [t, -t], [t, t], [-t, t],
    ].map(([ox, oz]) => [p.x + ox, p.y, p.z + oz]);
    for (let k = 0; k < 4; k++) geoms.push(strut(ring[k], ring[(k + 1) % 4], 0.5));
    if (i < N) {
      const q = pts[i + 2];
      const t2 = legThick(q.y) / 2;
      const up = [
        [-t2, -t2], [t2, -t2], [t2, t2], [-t2, t2],
      ].map(([ox, oz]) => [q.x + ox, q.y, q.z + oz]);
      geoms.push(strut(ring[0], up[2], 0.4));
      geoms.push(strut(ring[1], up[3], 0.4));
    }
  }
  return geoms;
}
const LEG_SEGMENTS = [
  ['base', 'base', 0, 57],
  ['lower', 'lower', 57, 115],
  ['middle', 'middle', 115, 180],
  ['upper', 'upper', 180, 276],
  ['crown', 'crown', 276, 300],
];
for (const c of CORNERS) {
  const slug = c.name.toLowerCase();
  for (const [idPart, label, y0, y1] of LEG_SEGMENTS) {
    addPart(
      `leg-${slug}-${idPart}`,
      `${c.name} leg ${label} segment`,
      'legs',
      legSegment(c, y0, y1),
    );
  }
  const shoe = new THREE.BoxGeometry(10, 9, 10);
  shoe.translate(c.sx * halfWidth(1), 4.5, c.sz * halfWidth(1));
  addPart(`leg-${slug}-shoe`, `${c.name} leg shoe`, 'legs', [shoe]);
}

// --- Lattice panels: 9 height bands x 4 faces, each one merged part, plus
//     truss rings tying the four legs at each platform level. 39 parts.
const BANDS = [
  ['base-lower', 'Base lower', 0, 28],
  ['base-upper', 'Base upper', 28, 57],
  ['lower-mid', 'Lower mid', 57, 86],
  ['lower-upper', 'Lower upper', 86, 115],
  ['mid-lower', 'Middle lower', 115, 152],
  ['mid-mid', 'Middle mid', 152, 189],
  ['mid-upper', 'Middle upper', 189, 228],
  ['upper-lower', 'Upper lower', 228, 276],
  ['spire', 'Spire', 276, 300],
];
function latticePanel(face, y0, y1, levels = 4) {
  const geoms = [];
  for (let i = 0; i <= levels; i++) {
    const y = y0 + ((y1 - y0) * i) / levels;
    geoms.push(strut(facePoint(face, -0.92, y), facePoint(face, 0.92, y), 0.7));
    if (i < levels) {
      const yn = y0 + ((y1 - y0) * (i + 1)) / levels;
      geoms.push(strut(facePoint(face, -0.92, y), facePoint(face, 0.92, yn), 0.5));
      geoms.push(strut(facePoint(face, 0.92, y), facePoint(face, -0.92, yn), 0.5));
    }
  }
  return geoms;
}
for (const [slug, label, y0, y1] of BANDS) {
  for (const face of FACES) {
    addPart(
      `lattice-${slug}-${face.name.toLowerCase()}`,
      `${label} ${face.name.toLowerCase()} lattice panel`,
      'lattice',
      latticePanel(face, y0, y1),
    );
  }
}
// Truss rings tying the four legs at each platform level.
for (const [y, label] of [[57, 'First floor'], [115, 'Second floor'], [276, 'Summit']]) {
  const geoms = [];
  const w = halfWidth(y);
  const corners = [[w, w], [w, -w], [-w, -w], [-w, w]];
  for (let k = 0; k < 4; k++) {
    const [x1, z1] = corners[k];
    const [x2, z2] = corners[(k + 1) % 4];
    geoms.push(strut([x1, y, z1], [x2, y, z2], 1.2));
  }
  addPart(`lattice-ring-${label.toLowerCase().replace(/ /g, '-')}`, `${label} truss ring`, 'lattice', geoms);
}

// --- Platforms: decks, support girders (split per run), railings. 11 parts.
function deck(side, topY, thick) {
  const g = new THREE.BoxGeometry(side, thick, side);
  g.translate(0, topY - thick / 2, 0);
  return [g];
}
function girderRunNS(y, span) {
  const geoms = [];
  for (const o of [-span / 4, span / 4]) geoms.push(strut([-span / 2, y, o], [span / 2, y, o], 1.6, 2.2));
  return geoms;
}
function girderRunEW(y, span) {
  const geoms = [];
  for (const o of [-span / 4, span / 4]) geoms.push(strut([o, y, -span / 2], [o, y, span / 2], 1.6, 2.2));
  return geoms;
}
function railing(side, topY) {
  const geoms = [];
  const h = topY + 1.1;
  const s = side / 2;
  geoms.push(strut([-s, h, -s], [s, h, -s], 0.15));
  geoms.push(strut([s, h, -s], [s, h, s], 0.15));
  geoms.push(strut([s, h, s], [-s, h, s], 0.15));
  geoms.push(strut([-s, h, s], [-s, h, -s], 0.15));
  const n = Math.max(3, Math.round(side / 8));
  for (let e = 0; e < 4; e++) {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let x;
      let z;
      if (e === 0) { x = -s + side * t; z = -s; }
      else if (e === 1) { x = s; z = -s + side * t; }
      else if (e === 2) { x = s - side * t; z = s; }
      else { x = -s; z = s - side * t; }
      geoms.push(strut([x, topY, z], [x, h, z], 0.12));
    }
  }
  return geoms;
}
addPart('deck-first', 'First floor deck', 'platforms', deck(66, 57, 2.5));
addPart('deck-second', 'Second floor deck', 'platforms', deck(38, 115, 2));
addPart('deck-summit', 'Summit deck', 'platforms', deck(15, 276, 1.5));
addPart('girders-first-ns', 'First floor girders, north-south run', 'platforms', girderRunNS(55.4, 60));
addPart('girders-first-ew', 'First floor girders, east-west run', 'platforms', girderRunEW(55.4, 60));
addPart('girders-second-ns', 'Second floor girders, north-south run', 'platforms', girderRunNS(113.8, 34));
addPart('girders-second-ew', 'Second floor girders, east-west run', 'platforms', girderRunEW(113.8, 34));
addPart('girders-summit', 'Summit deck support girders', 'platforms', [...girderRunNS(274.5, 14), ...girderRunEW(274.5, 14)]);
addPart('railing-first', 'First floor railing', 'platforms', railing(66, 57));
addPart('railing-second', 'Second floor railing', 'platforms', railing(38, 115));
addPart('railing-summit', 'Summit railing', 'platforms', railing(15, 276));

// --- Foundations: footing, slab, and anchor bolts per leg, plus caisson
//     sets under the north and west legs. 14 parts.
for (const c of CORNERS) {
  const slug = c.name.toLowerCase();
  const footing = new THREE.BoxGeometry(24, 7, 24);
  footing.translate(c.sx * halfWidth(0), -3.5, c.sz * halfWidth(0));
  addPart(`footing-${slug}`, `${c.name} footing`, 'foundations', [footing]);
  // East and south legs rest on 2 m slabs; north and west on 6 m slabs.
  const slabThick = (c.sx === 1 && c.sz === 1) || (c.sx === 1 && c.sz === -1) ? 2 : 6;
  const slab = new THREE.BoxGeometry(26, slabThick, 26);
  slab.translate(c.sx * halfWidth(0), -slabThick / 2, c.sz * halfWidth(0));
  addPart(`slab-${slug}`, `${c.name} foundation slab`, 'foundations', [slab]);
  // Anchor bolts fixing each leg shoe to the stonework.
  const bolts = [];
  for (const [ox, oz] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
    const g = new THREE.CylinderGeometry(0.15, 0.15, 7.5, 8);
    g.translate(c.sx * halfWidth(0) + ox, 3.75, c.sz * halfWidth(0) + oz);
    bolts.push(g);
  }
  addPart(`anchors-${slug}`, `${c.name} anchor bolts`, 'foundations', bolts);
}
// Compressed-air caissons under the north and west legs, one set per leg.
for (const c of CORNERS.filter((k) => (k.sx === -1 && k.sz === -1) || (k.sx === -1 && k.sz === 1))) {
  const geoms = [];
  for (const [ox, oz] of [[-5, 0], [5, 0]]) {
    const g = new THREE.CylinderGeometry(3, 3, 15, 12);
    g.translate(c.sx * halfWidth(0) + ox, -14.5, c.sz * halfWidth(0) + oz);
    geoms.push(g);
  }
  addPart(`caissons-${c.name.toLowerCase()}`, `${c.name} foundation caissons`, 'foundations', geoms);
}

// --- Decorative arches (Sauvestre): each arch split into two halves plus a
//     keystone at the crown. 12 parts.
function archHalf(face, which) {
  // which: +1 = east half on z-faces, north half on x-faces; -1 = the other.
  let g = new THREE.TorusGeometry(50, 1.4, 8, 20, Math.PI / 2);
  if (which < 0) g.rotateZ(Math.PI / 2);
  if (face.fixed === 'x') g.rotateY(Math.PI / 2);
  else if (face.sign < 0) g.rotateY(Math.PI);
  const tx = face.fixed === 'x' ? face.sign * halfWidth(10) : 0;
  const tz = face.fixed === 'z' ? face.sign * halfWidth(10) : 0;
  g.translate(tx, 10, tz);
  return g;
}
for (const face of FACES) {
  const fl = face.name.toLowerCase();
  let halfPos;
  let halfNeg;
  if (face.fixed === 'z') {
    // After the face transform, +1 is east for south, west for north.
    halfPos = face.sign === 1 ? 'east' : 'west';
    halfNeg = face.sign === 1 ? 'west' : 'east';
  } else {
    halfPos = 'north';
    halfNeg = 'south';
  }
  addPart(`arch-${fl}-${halfPos}-half`, `${face.name} arch ${halfPos} half`, 'arches', [archHalf(face, 1)]);
  addPart(`arch-${fl}-${halfNeg}-half`, `${face.name} arch ${halfNeg} half`, 'arches', [archHalf(face, -1)]);
  const key = new THREE.BoxGeometry(3.2, 3.2, 3.2);
  key.translate(
    face.fixed === 'x' ? face.sign * halfWidth(10) : 0,
    60,
    face.fixed === 'z' ? face.sign * halfWidth(10) : 0,
  );
  addPart(`arch-${fl}-keystone`, `${face.name} arch keystone`, 'arches', [key]);
}

// --- Circulation: elevator shaft and cab per leg, three staircase flights
//     with landings. 14 parts.
for (const c of CORNERS) {
  const slug = c.name.toLowerCase();
  const a = [c.sx * (halfWidth(2) - 4), 2, c.sz * (halfWidth(2) - 4)];
  const b = [c.sx * (halfWidth(115) - 2.5), 115, c.sz * (halfWidth(115) - 2.5)];
  addPart(`elevator-${slug}-shaft`, `${c.name} elevator shaft`, 'elevators', [strut(a, b, 2.6)]);
  const t = (58 - 2) / (115 - 2);
  const cab = new THREE.BoxGeometry(4, 4, 4);
  cab.translate(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  addPart(`elevator-${slug}-cab`, `${c.name} elevator cab`, 'elevators', [cab]);
}
addPart('stairs-lower', 'Lower staircase flight', 'stairs', [strut([12, 1, 38], [12, 57, 26], 3.2)]);
addPart('stairs-upper', 'Upper staircase flight', 'stairs', [strut([10, 58, 22], [10, 115, 13], 3.2)]);
addPart('stairs-summit', 'Summit staircase flight', 'stairs', [strut([10, 116, 12], [6, 276, 5.5], 2.4)]);
for (const [id, label, x, y, z] of [
  ['landing-lower', 'Lower', 12, 57.3, 26],
  ['landing-upper', 'Upper', 10, 115.3, 13],
  ['landing-summit', 'Summit', 6, 276.3, 5.5],
]) {
  const g = new THREE.BoxGeometry(6, 0.6, 6);
  g.translate(x, y, z);
  addPart(id, `${label} landing`, 'stairs', [g]);
}

// --- Crown. 5 parts.
{
  const pav = new THREE.CylinderGeometry(5, 5.5, 6, 16);
  pav.translate(0, 279, 0);
  addPart('summit-pavilion', 'Summit pavilion', 'crown', [pav]);
}
{
  const apt = new THREE.BoxGeometry(4.5, 3, 4);
  apt.translate(4, 277.5, 0);
  addPart('eiffel-apartment', 'Eiffel apartment', 'crown', [apt]);
}
{
  const mast = new THREE.CylinderGeometry(0.9, 1.1, 15, 10);
  mast.translate(0, 307.5, 0);
  addPart('mast-lower', 'Antenna mast lower section', 'crown', [mast]);
}
{
  const mast = new THREE.CylinderGeometry(0.6, 0.9, 15, 10);
  mast.translate(0, 322.5, 0);
  addPart('mast-upper', 'Antenna mast upper section', 'crown', [mast]);
}
{
  const beacon = new THREE.SphereGeometry(1.1, 12, 10);
  beacon.translate(0, 330.6, 0);
  addPart('tip-beacon', 'Tip beacon', 'crown', [beacon]);
}

// ---------------------------------------------------------------- metadata
// Dark realistic iron tones for the tower; other buildings keep their
// schematic colorful palettes.
const SYSTEMS = [
  { id: 'foundations', name: 'Foundations', color: '#6b6f75', description: 'Concrete footings, slabs, compressed-air caissons, and anchor bolts carry the tower to the ground. The north and west legs, closer to the Seine, needed the deepest foundations.' },
  { id: 'legs', name: 'Legs', color: '#26262b', description: 'Four lattice girders stand apart at the base and come together at the top. They are the primary structure of the tower.' },
  { id: 'platforms', name: 'Platforms', color: '#3a3f45', description: 'Three visitor levels at 57, 115, and 276 m, carried on iron support girders with railings.' },
  { id: 'lattice', name: 'Lattice ironwork', color: '#1f1f24', description: 'Cross-braced iron panels join the legs on all four faces, tied by truss rings at each platform level. The finished tower joins 18,038 iron pieces with 2.5 million rivets.' },
  { id: 'arches', name: 'Arches', color: '#2b2b31', description: 'Decorative arches spanning between the legs at the base, added by architect Stephen Sauvestre.' },
  { id: 'elevators', name: 'Elevators', color: '#4a5560', description: 'Eight elevators serve the tower, running inside the legs to the visitor levels.' },
  { id: 'stairs', name: 'Stairs', color: '#33373d', description: 'Staircases connect the ground to the first and second levels, with over 300 steps per flight.' },
  { id: 'crown', name: 'Crown', color: '#1c1c20', description: 'The summit at 276 m, Gustave Eiffel\'s apartment, and the broadcasting aerial that brings the tip to 330 m.' },
];

// Keyed by lowercase part name. Reuses and extends the previous texts; every
// fact comes from the Eiffel Tower Wikipedia article (see tower-attribution.md).
// Geometry not documented there is marked schematic.
const EXPLANATIONS = {
  'summit pavilion': 'Pavilion structures on the summit deck, 276 m above the ground.',
  'eiffel apartment': 'A private apartment Gustave Eiffel built for himself on the third level, decorated with furniture by Jean Lachaise.',
  'tip beacon': 'Light assembly at the tip of the antenna. The tower was the tallest structure in the world from 1889 until the Chrysler Building was finished in 1930.',
  'antenna mast lower section': 'Lower section of the broadcasting aerial. The tower\'s 330 m tip height includes the aerial added in 1957.',
  'antenna mast upper section': 'Upper section of the broadcasting aerial. The tower\'s 330 m tip height includes the aerial added in 1957.',
  'first floor deck': 'The first visitor level, 57 m above the ground. It holds a glass floor section, exhibitions on the construction of the tower, and the 58 Tour Eiffel restaurant.',
  'second floor deck': 'The second visitor level, 115 m above the ground. It holds the Le Jules Verne restaurant and panoramic views of Paris.',
  'summit deck': 'The top visitor platform, 276 m above the ground, the highest public observation deck in the European Union.',
  'first floor girders, north-south run': 'Iron girders carrying the first floor deck, running north to south. Support geometry is schematic.',
  'first floor girders, east-west run': 'Iron girders carrying the first floor deck, running east to west. Support geometry is schematic.',
  'second floor girders, north-south run': 'Iron girders carrying the second floor deck, running north to south. Support geometry is schematic.',
  'second floor girders, east-west run': 'Iron girders carrying the second floor deck, running east to west. Support geometry is schematic.',
  'summit deck support girders': 'Iron girders carrying the summit deck, 276 m above the ground. Support geometry is schematic.',
  'first floor railing': 'Safety railing around the first floor deck. Railing geometry is schematic.',
  'second floor railing': 'Safety railing around the second floor deck. Railing geometry is schematic.',
  'summit railing': 'Safety railing around the summit deck. Railing geometry is schematic.',
  'first floor truss ring': 'Horizontal truss tying the four legs together at the first floor level, 57 m above the ground.',
  'second floor truss ring': 'Horizontal truss tying the four legs together at the second floor level, 115 m above the ground.',
  'summit truss ring': 'Horizontal truss tying the four legs together at the summit level, 276 m above the ground.',
  'lower staircase flight': 'The climb from the ground to the first level is over 300 steps.',
  'upper staircase flight': 'The climb from the first level to the second is over 300 steps, making the full ascent a 600-step climb.',
  'summit staircase flight': 'Schematic stair run from the second level toward the summit. Staircase geometry is schematic.',
  'lower landing': 'Landing at the top of the lower staircase flight. Staircase geometry is schematic.',
  'upper landing': 'Landing at the top of the upper staircase flight. Staircase geometry is schematic.',
  'summit landing': 'Landing at the top of the summit staircase flight. Staircase geometry is schematic.',
};
for (const c of CORNERS) {
  const cl = c.name.toLowerCase();
  const eastSouth = c.sx === 1; // east and south legs sit on 2 m slabs
  EXPLANATIONS[`${cl} footing`] = eastSouth
    ? 'One of four concrete footings. The east and south legs each rest on concrete slabs 2 m thick; the model shows one schematic block per leg.'
    : 'One of four concrete footings. The north and west legs, closer to the river Seine, needed deeper foundations; the model shows one schematic block per leg.';
  EXPLANATIONS[`${cl} foundation slab`] = eastSouth
    ? 'Concrete slab under the footing. The east and south legs each rest on slabs 2 m thick; slab size is schematic.'
    : 'Concrete slab under the footing. The north and west legs, closer to the Seine, sit on slabs 6 m thick over compressed-air caissons; slab size is schematic.';
  EXPLANATIONS[`${cl} anchor bolts`] = 'Bolts fixing the leg shoe to the stonework. Each leg shoe was anchored by a pair of bolts 10 cm in diameter and 7.5 m long.';
  for (const [, label] of LEG_SEGMENTS) {
    EXPLANATIONS[`${cl} leg ${label} segment`] = `Schematic segment of the ${cl} leg, one of four lattice girders that stand apart at the base and come together at the top, joined by metal trusses at regular intervals, as Maurice Koechlin described in his first sketch.`;
  }
  EXPLANATIONS[`${cl} leg shoe`] = 'Schematic shoe at the base of the leg, fixed to the stonework by anchor bolts. Hydraulic jacks attached to the shoes helped align the legs precisely during construction.';
  EXPLANATIONS[`${cl} elevator shaft`] = 'Schematic lift shaft inside the leg. Eight elevators serve the tower; the lifts in the east and west legs were replaced by lifts running to the second level for the 1900 Exposition Universelle.';
  EXPLANATIONS[`${cl} elevator cab`] = 'Schematic elevator cab inside the leg shaft. Eight elevators serve the tower.';
}
for (const c of ['northwest', 'southwest']) {
  EXPLANATIONS[`${c} foundation caissons`] = `Compressed-air caissons under the ${c} leg. The north and west legs are supported by compressed-air caissons 15 m long and 6 m in diameter, driven to a depth of 22 m beneath 6 m thick concrete slabs.`;
}
for (const [slug, label, y0, y1] of BANDS) {
  for (const face of FACES) {
    const fl = face.name.toLowerCase();
    EXPLANATIONS[`${label.toLowerCase()} ${fl} lattice panel`] = `Cross-braced iron lattice on the ${fl} face, ${y0} to ${y1} m above the ground. The finished tower joins 18,038 iron pieces with 2.5 million rivets.`;
  }
}
for (const face of FACES) {
  const fl = face.name.toLowerCase();
  for (const half of ['east', 'west', 'north', 'south']) {
    EXPLANATIONS[`${fl} arch ${half} half`] = `Half of one of the four decorative arches between the legs at the base, added by architect Stephen Sauvestre.`;
  }
  EXPLANATIONS[`${fl} arch keystone`] = `Keystone at the crown of the ${fl} arch, the central wedge that locks the two halves together. One of four decorative arches added by architect Stephen Sauvestre.`;
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
  const idx = merged.index.array;
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
fs.writeFileSync(path.join(outDir, 'tower-simple-0.bin'), buffer);

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Eiffel Tower, Paris',
  title: 'Eiffel Tower',
  location: 'Paris, France',
  blurb: 'The Eiffel Tower is a 330 m wrought iron lattice tower on the Champ de Mars in Paris, built as the centerpiece of the 1889 Exposition Universelle. It is the most visited monument with an entrance fee in the world.',
  sourceUrls: [
    { label: 'Eiffel Tower, Wikipedia', url: 'https://en.wikipedia.org/wiki/Eiffel_Tower' },
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
  chunks: [{ url: '/models/tower-simple/tower-simple-0.bin', bytes: offset }],
  triangles,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
