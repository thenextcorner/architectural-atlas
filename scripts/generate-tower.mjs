// Procedural DETAILED Eiffel Tower for the Architectural Atlas.
//
// Builds a detailed schematic Eiffel Tower in code and writes it in the
// atlas binary format: public/models/tower/atlas.json +
// public/models/tower/tower-0.bin (+ a byte-identical copy at
// public/models/tower-0.bin, which the atlas validator resolves chunk files
// against by basename).
//
// Dimensions used (all sourced; see
// ~/workspace/architectural-atlas/research/tower-attribution.md):
//   tip 330 m (broadcasting aerial added 1957), architectural top 300 m,
//   summit deck 276 m, second floor 115 m, first floor 57 m, 125 m square base,
//   foundation figures (2 m slabs under east/south legs; 6 m slabs over
//   15 m long, 6 m diameter compressed-air caissons driven to 22 m under the
//   north/west legs; anchor bolts 10 cm in diameter and 7.5 m long),
//   18,038 iron pieces joined with 2.5 million rivets, metal structure
//   7,300 tonnes out of 10,100 tonnes total, 1,665 steps to the summit,
//   8 elevators, 72 engraved names under the first balcony (letters about
//   60 cm tall, originally gold), 20,000 sparkling flash bulbs (2000, five
//   minutes every hour), 336 floodlight projectors lighting the tower at night.
// Intermediate widths and all other geometry are schematic approximations and
// are not stated as facts anywhere in the UI.
//
// Granularity: 145 named parts across 11 systems. Dark realistic iron style:
// every system color is a dark tone so the viewer keeps the light studio
// backdrop; foundations alone use concrete gray.
//
// Usage: node scripts/generate-tower.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'tower');
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
// Point slightly outside the face plane (for ornament sitting on the face).
function faceOut(face, u, y, out) {
  const w = halfWidth(y) + out;
  return face.fixed === 'z' ? [u * w, y, face.sign * w] : [face.sign * w, y, u * w];
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

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

// --- Legs: each of the four lattice girders split into 5 vertical segments,
//     each with four chords, horizontal ties, and alternating diagonals,
//     plus a leg shoe at the base. 24 parts.
function legSegment(c, y0, y1) {
  const geoms = [];
  const N = 8;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const y = y0 + ((y1 - y0) * i) / N;
    const w = halfWidth(y);
    pts.push(new THREE.Vector3(c.sx * w, y, c.sz * w));
  }
  const tAt = (p) => legThick(p.y) / 2;
  // Four chords following the curve.
  for (const [ox, oz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    for (let i = 0; i < N; i++) {
      const t0 = tAt(pts[i]);
      const t1 = tAt(pts[i + 1]);
      geoms.push(
        strut(
          [pts[i].x + ox * t0, pts[i].y, pts[i].z + oz * t0],
          [pts[i + 1].x + ox * t1, pts[i + 1].y, pts[i + 1].z + oz * t1],
          0.85,
        ),
      );
    }
  }
  const ringAt = (p) => {
    const t = tAt(p);
    return [[-t, -t], [t, -t], [t, t], [-t, t]].map(([ox, oz]) => [p.x + ox, p.y, p.z + oz]);
  };
  // Horizontal ties plus alternating diagonals on all four faces.
  for (let i = 0; i <= N; i++) {
    const ring = ringAt(pts[i]);
    for (let k = 0; k < 4; k++) geoms.push(strut(ring[k], ring[(k + 1) % 4], 0.45));
    if (i < N) {
      const up = ringAt(pts[i + 1]);
      for (let k = 0; k < 4; k++) {
        const a = ring[k];
        const b = ring[(k + 1) % 4];
        const c2 = up[k];
        const d = up[(k + 1) % 4];
        if ((i + k) % 2 === 0) geoms.push(strut(a, d, 0.35));
        else geoms.push(strut(b, c2, 0.35));
      }
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
    addPart(`leg-${slug}-${idPart}`, `${c.name} leg ${label} segment`, 'legs', legSegment(c, y0, y1));
  }
  const shoe = new THREE.BoxGeometry(10, 9, 10);
  shoe.translate(c.sx * halfWidth(1), 4.5, c.sz * halfWidth(1));
  addPart(`leg-${slug}-shoe`, `${c.name} leg shoe`, 'legs', [shoe]);
}

// --- Lattice panels: 9 height bands x 4 faces, each with horizontal rails,
//     edge posts, and X bracing per cell, plus truss rings tying the four
//     legs at each platform level. 39 parts.
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
function latticePanel(face, y0, y1, levels = 6) {
  const geoms = [];
  for (let i = 0; i <= levels; i++) {
    const y = y0 + ((y1 - y0) * i) / levels;
    geoms.push(strut(facePoint(face, -0.92, y), facePoint(face, 0.92, y), 0.65));
  }
  for (const u of [-0.92, 0.92]) {
    geoms.push(strut(facePoint(face, u, y0), facePoint(face, u, y1), 0.55));
  }
  for (let i = 0; i < levels; i++) {
    const ya = y0 + ((y1 - y0) * i) / levels;
    const yb = y0 + ((y1 - y0) * (i + 1)) / levels;
    geoms.push(strut(facePoint(face, -0.92, ya), facePoint(face, 0.92, yb), 0.45));
    geoms.push(strut(facePoint(face, 0.92, ya), facePoint(face, -0.92, yb), 0.45));
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

// --- Platforms: decks, support girders (split per run), railings, and the
//     first floor glass floor. 12 parts.
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
// Glass floor: frame plus pane grid, sitting on the first floor deck.
{
  const geoms = [];
  const frame = new THREE.BoxGeometry(22, 0.6, 22);
  frame.translate(0, 57.3, 0);
  geoms.push(frame);
  for (let i = -4; i <= 4; i++) {
    geoms.push(strut([i * 2.4, 57.15, -11], [i * 2.4, 57.15, 11], 0.18));
    geoms.push(strut([-11, 57.15, i * 2.4], [11, 57.15, i * 2.4], 0.18));
  }
  addPart('glass-floor', 'First floor glass floor', 'platforms', geoms);
}

// --- Decorative arches (Sauvestre): each arch split into two halves plus a
//     keystone at the crown and a spandrel ornament filling the gap to the
//     first floor deck. 16 parts.
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
function spandrel(face) {
  const geoms = [];
  const R = 50;
  const cy = 10;
  const onFace = (u, y) => face.fixed === 'z'
    ? [u, y, face.sign * (halfWidth(10) + 0.3)]
    : [face.sign * (halfWidth(10) + 0.3), y, u];
  // Vertical bars from the arch curve up to the first floor deck.
  for (let u = 20; u <= 45; u += 5) {
    for (const s of [1, -1]) {
      const uu = s * u;
      const ya = cy + Math.sqrt(R * R - uu * uu);
      if (ya < 56) geoms.push(strut(onFace(uu, ya), onFace(uu, 56.5), 0.35));
    }
  }
  // Horizontal rails where the arch curve leaves room.
  for (const yr of [34, 44, 53]) {
    const umax = Math.sqrt(Math.max(0, R * R - (yr - cy) * (yr - cy)));
    if (umax > 22) geoms.push(strut(onFace(-umax, yr), onFace(umax, yr), 0.35));
  }
  // Medallion ring above the keystone.
  let med = new THREE.TorusGeometry(2.5, 0.4, 6, 16);
  if (face.fixed === 'x') med.rotateY(Math.PI / 2);
  const mx = face.fixed === 'x' ? face.sign * (halfWidth(10) + 0.3) : 0;
  const mz = face.fixed === 'z' ? face.sign * (halfWidth(10) + 0.3) : 0;
  med.translate(mx, 50, mz);
  geoms.push(med);
  return geoms;
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
  addPart(`arch-${fl}-spandrel`, `${face.name} arch spandrel ornament`, 'arches', spandrel(face));
}

// --- Elevators: shaft frame, cab, and counterweight per leg, plus the
//     hydraulic pump house at the base and the winding motor room under the
//     second floor. 14 parts.
function elevatorShaft(c) {
  const geoms = [];
  const a = new THREE.Vector3(c.sx * (halfWidth(2) - 4), 2, c.sz * (halfWidth(2) - 4));
  const b = new THREE.Vector3(c.sx * (halfWidth(115) - 2.5), 115, c.sz * (halfWidth(115) - 2.5));
  for (const [ox, oz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
    geoms.push(strut([a.x + ox, a.y, a.z + oz], [b.x + ox, b.y, b.z + oz], 0.35));
  }
  for (let y = 2; y <= 115; y += 11.3) {
    const t = (y - 2) / (115 - 2);
    const p = a.clone().lerp(b, t);
    const pts = [[-1.3, -1.3], [1.3, -1.3], [1.3, 1.3], [-1.3, 1.3]].map(([ox, oz]) => [p.x + ox, y, p.z + oz]);
    for (let k = 0; k < 4; k++) geoms.push(strut(pts[k], pts[(k + 1) % 4], 0.3));
  }
  return geoms;
}
CORNERS.forEach((c, ci) => {
  const slug = c.name.toLowerCase();
  addPart(`elevator-${slug}-shaft`, `${c.name} elevator shaft`, 'elevators', elevatorShaft(c));
  // Cab parked at a different height in each leg.
  const a = new THREE.Vector3(c.sx * (halfWidth(2) - 4), 2, c.sz * (halfWidth(2) - 4));
  const b = new THREE.Vector3(c.sx * (halfWidth(115) - 2.5), 115, c.sz * (halfWidth(115) - 2.5));
  const p = a.clone().lerp(b, 0.35 + ci * 0.08);
  const cab = new THREE.BoxGeometry(4.2, 4.2, 4.2);
  cab.translate(p.x, p.y, p.z);
  addPart(`elevator-${slug}-cab`, `${c.name} elevator cab`, 'elevators', [cab]);
  // Counterweight on its cable, hanging from the top of the shaft.
  const geoms = [];
  const cx = b.x + 2;
  geoms.push(strut([cx, 113, b.z], [cx, 82, b.z], 0.15));
  const wt = new THREE.BoxGeometry(1.6, 5, 1.6);
  wt.translate(cx, 79.5, b.z);
  geoms.push(wt);
  addPart(`elevator-${slug}-counterweight`, `${c.name} elevator counterweight`, 'elevators', geoms);
});
{
  // Hydraulic pump house at the base, with accumulator cylinders.
  const geoms = [];
  const house = new THREE.BoxGeometry(16, 7, 12);
  house.translate(0, 3.5, 42);
  geoms.push(house);
  for (const ox of [-5, 5]) {
    const acc = new THREE.CylinderGeometry(1.5, 1.5, 8, 10);
    acc.translate(ox, 4, 42);
    geoms.push(acc);
  }
  addPart('hydraulic-pump-house', 'Hydraulic pump house', 'elevators', geoms);
}
{
  // Winding motor room under the second floor.
  const geoms = [];
  const room = new THREE.BoxGeometry(12, 5, 10);
  room.translate(0, 110, 0);
  geoms.push(room);
  for (const ox of [-3, 3]) {
    const drum = new THREE.CylinderGeometry(1.2, 1.2, 3, 10);
    drum.rotateZ(Math.PI / 2);
    drum.translate(ox, 111.5, 0);
    geoms.push(drum);
  }
  addPart('winding-motor-room', 'Winding motor room', 'elevators', geoms);
}

// --- Stairs: three flights with stringers, treads, and handrails, plus
//     landings at each level. 6 parts.
function staircase(a, b, width) {
  const geoms = [];
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const dir = vb.clone().sub(va).normalize();
  const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(width / 2);
  for (const s of [-1, 1]) {
    const p1 = va.clone().addScaledVector(side, s);
    const p2 = vb.clone().addScaledVector(side, s);
    geoms.push(strut(p1.toArray(), p2.toArray(), 0.5));
    const r1 = p1.clone();
    r1.y += 1.1;
    const r2 = p2.clone();
    r2.y += 1.1;
    geoms.push(strut(r1.toArray(), r2.toArray(), 0.12));
  }
  const steps = Math.max(4, Math.floor(len / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = va.clone().lerp(vb, t);
    const tread = new THREE.BoxGeometry(width, 0.25, 1.1);
    tread.translate(p.x, p.y, p.z);
    geoms.push(tread);
  }
  return geoms;
}
addPart('stairs-lower', 'Lower staircase flight', 'stairs', staircase([12, 1, 38], [12, 57, 26], 3.2));
addPart('stairs-upper', 'Upper staircase flight', 'stairs', staircase([10, 58, 22], [10, 115, 13], 3.2));
addPart('stairs-summit', 'Summit staircase flight', 'stairs', staircase([10, 116, 12], [6, 276, 5.5], 2.4));
for (const [id, label, x, y, z] of [
  ['landing-lower', 'Lower', 12, 57.3, 26],
  ['landing-upper', 'Upper', 10, 115.3, 13],
  ['landing-summit', 'Summit', 6, 276.3, 5.5],
]) {
  const g = new THREE.BoxGeometry(6, 0.6, 6);
  g.translate(x, y, z);
  addPart(id, `${label} landing`, 'stairs', [g]);
}

// --- Crown: summit pavilion, Eiffel's apartment with its terrace, the
//     two-part antenna mast, the tip beacon, and the broadcasting aerial
//     array. 7 parts.
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
  const geoms = [];
  const slab = new THREE.BoxGeometry(9, 0.3, 7);
  slab.translate(4, 276.15, 0);
  geoms.push(slab);
  geoms.push(...railing(9, 276.3).map((g) => {
    g.translate(4, 0, 0);
    return g;
  }));
  addPart('apartment-terrace', 'Eiffel apartment terrace', 'crown', geoms);
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
{
  // Panel antennas plus horizontal dipoles along the mast.
  const geoms = [];
  for (const ox of [-2.2, 2.2]) {
    const panel = new THREE.BoxGeometry(0.8, 5, 1.5);
    panel.translate(ox, 316, 0);
    geoms.push(panel);
  }
  for (const y of [305, 310, 315, 320]) {
    const dip = new THREE.CylinderGeometry(0.08, 0.08, 4, 6);
    dip.rotateZ(Math.PI / 2);
    dip.translate(0, y, 0);
    geoms.push(dip);
  }
  addPart('aerial-array', 'Broadcasting aerial array', 'crown', geoms);
}

// --- Hospitality: restaurants and visitor facilities on each level plus
//     ticket pavilions at the ground. 6 parts.
{
  const geoms = [];
  const hall = new THREE.BoxGeometry(24, 5, 16);
  hall.translate(8, 59.5, -8);
  geoms.push(hall);
  const roof = new THREE.BoxGeometry(26, 0.4, 18);
  roof.translate(8, 62.2, -8);
  geoms.push(roof);
  addPart('restaurant-58', '58 Tour Eiffel restaurant', 'hospitality', geoms);
}
{
  const geoms = [];
  const canopy = new THREE.BoxGeometry(20, 0.3, 12);
  canopy.translate(-14, 62, 10);
  geoms.push(canopy);
  for (const [ox, oz] of [[-9, -5], [9, -5], [-9, 5], [9, 5]]) {
    geoms.push(strut([-14 + ox, 57, 10 + oz], [-14 + ox, 62, 10 + oz], 0.3));
  }
  addPart('terrace-canopy-58', '58 Tour Eiffel terrace canopy', 'hospitality', geoms);
}
{
  const geoms = [];
  const hall = new THREE.BoxGeometry(18, 4.5, 14);
  hall.translate(4, 117.25, -4);
  geoms.push(hall);
  const roof = new THREE.BoxGeometry(20, 0.4, 16);
  roof.translate(4, 119.7, -4);
  geoms.push(roof);
  addPart('restaurant-jules-verne', 'Le Jules Verne restaurant', 'hospitality', geoms);
}
{
  const bar = new THREE.BoxGeometry(6, 3, 4);
  bar.translate(-3, 277.5, 2);
  addPart('champagne-bar', 'Summit champagne bar', 'hospitality', [bar]);
}
for (const [id, label, sx] of [
  ['ticket-pavilion-east', 'East', 1],
  ['ticket-pavilion-west', 'West', -1],
]) {
  const pav = new THREE.BoxGeometry(10, 4, 8);
  pav.translate(sx * 75, 2, 0);
  addPart(id, `${label} ticket pavilion`, 'hospitality', [pav]);
}

// --- Illumination: schematic sparkling light strings, the ring of
//     floodlight projectors, and aviation warning strobes on the mast.
//     3 parts.
{
  const geoms = [];
  for (const face of FACES) {
    for (let i = 0; i < 10; i++) {
      const y0 = 5 + i * 26.5;
      const y1 = 5 + (i + 1) * 26.5;
      geoms.push(strut(faceOut(face, 0, y0, 0.4), faceOut(face, 0, y1, 0.4), 0.14));
    }
  }
  for (const y of [57, 115, 276]) {
    const w = halfWidth(y) + 0.4;
    const corners = [[w, w], [w, -w], [-w, -w], [-w, w]];
    for (let k = 0; k < 4; k++) {
      const [x1, z1] = corners[k];
      const [x2, z2] = corners[(k + 1) % 4];
      geoms.push(strut([x1, y, z1], [x2, y, z2], 0.14));
    }
  }
  addPart('sparkling-strings', 'Sparkling light strings', 'illumination', geoms);
}
{
  const geoms = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const g = new THREE.BoxGeometry(1.2, 1, 1.8);
    g.rotateY(-a);
    g.translate(Math.cos(a) * 95, 0.8, Math.sin(a) * 95);
    geoms.push(g);
  }
  addPart('projector-ring', 'Floodlight projector ring', 'illumination', geoms);
}
{
  const geoms = [];
  for (const y of [310, 325]) {
    const s = new THREE.SphereGeometry(0.5, 10, 8);
    s.translate(0, y, 0);
    geoms.push(s);
  }
  addPart('strobes', 'Aviation warning strobes', 'illumination', geoms);
}

// --- Inscriptions: the 72 engraved names on the frieze under the first
//     balcony, 18 name plates per face. 4 parts.
for (const face of FACES) {
  const fl = face.name.toLowerCase();
  const geoms = [];
  const plateW = 52.5;
  const plate = new THREE.BoxGeometry(plateW, 2.6, 0.7);
  if (face.fixed === 'x') plate.rotateY(Math.PI / 2);
  const px = face.fixed === 'x' ? face.sign * (halfWidth(52) + 0.35) : 0;
  const pz = face.fixed === 'z' ? face.sign * (halfWidth(52) + 0.35) : 0;
  plate.translate(px, 52, pz);
  geoms.push(plate);
  for (let i = 0; i < 18; i++) {
    const u = -plateW / 2 + ((i + 0.5) * plateW) / 18;
    const tag = new THREE.BoxGeometry(2.2, 1.5, 0.18);
    const tx = face.fixed === 'z' ? u : face.sign * (halfWidth(52) + 0.8);
    const tz = face.fixed === 'z' ? face.sign * (halfWidth(52) + 0.8) : u;
    tag.translate(tx, 52, tz);
    geoms.push(tag);
  }
  addPart(`frieze-${fl}`, `${face.name} frieze, 72 names`, 'inscriptions', geoms);
}

// ---------------------------------------------------------------- metadata
// Dark realistic iron tones for the tower; foundations alone use concrete
// gray (they sit below ground, so the area-weighted luminance of the upper
// mass stays dark and the viewer keeps the light studio backdrop).
const SYSTEMS = [
  { id: 'foundations', name: 'Foundations', color: '#6b6f75', description: 'Concrete footings, foundation slabs, compressed-air caissons, and anchor bolts. The east and south legs rest on 2 m slabs; the north and west legs, closer to the Seine, sit on 6 m slabs over caissons driven 22 m deep.' },
  { id: 'legs', name: 'Legs', color: '#26262b', description: 'Four lattice girders that stand apart at the base and converge toward the top, carrying the tower. The metal structure weighs 7,300 tonnes out of 10,100 tonnes total.' },
  { id: 'lattice', name: 'Lattice ironwork', color: '#1f1f24', description: 'Cross-braced iron panels joining the legs on all four faces, tied by truss rings at each platform level. The finished tower joins 18,038 iron pieces with 2.5 million rivets.' },
  { id: 'platforms', name: 'Platforms', color: '#30343b', description: 'The three visitor levels at 57, 115, and 276 m, carried on iron support girders with railings. The first floor holds a glass floor section.' },
  { id: 'arches', name: 'Arches', color: '#2b2b31', description: 'Four decorative arches spanning between the legs at the base, added by architect Stephen Sauvestre, each with a keystone and spandrel ornament.' },
  { id: 'elevators', name: 'Elevators', color: '#363c45', description: 'Lift shafts inside the legs with cars and counterweights, plus schematic hydraulic machinery. Eight elevators serve the tower.' },
  { id: 'stairs', name: 'Stairs', color: '#33373d', description: 'Staircase flights and landings connecting the ground to the upper levels. The full climb to the summit is 1,665 steps.' },
  { id: 'crown', name: 'Crown', color: '#1c1c20', description: 'The summit at 276 m: the pavilion, Gustave Eiffel\'s private apartment, and the broadcasting aerial that brings the tip to 330 m.' },
  { id: 'hospitality', name: 'Hospitality', color: '#24262c', description: 'Restaurants and visitor facilities: 58 Tour Eiffel on the first floor, Le Jules Verne on the second, a champagne bar at the summit, and ticket pavilions at the ground.' },
  { id: 'illumination', name: 'Illumination', color: '#232326', description: 'Night lighting: sparkling light strings, the ring of floodlight projectors, and aviation warning strobes on the mast.' },
  { id: 'inscriptions', name: 'Inscriptions', color: '#2e2e33', description: 'The 72 names of French scientists, engineers, and mathematicians engraved on the frieze under the first balcony.' },
];

// Small per-part accents; everything else falls back to the system color.
function colorFor(id, system) {
  if (id.startsWith('frieze-')) return '#9a8256'; // brass name plates, below the upper mass
  if (id === 'glass-floor') return '#31444b';
  if (id === 'tip-beacon') return '#b8892f';
  if (id === 'strobes') return '#8a6a2f';
  if (id === 'champagne-bar') return '#2e3a40';
  const sys = SYSTEMS.find((s) => s.id === system);
  return sys ? sys.color : '#26262b';
}

// Keyed by lowercase part name. Every fact comes from the sourced research
// (see tower-attribution.md); geometry not documented there is marked
// schematic.
const EXPLANATIONS = {
  'summit pavilion': 'Pavilion structures on the summit deck, 276 m above the ground.',
  'eiffel apartment': 'A private apartment Gustave Eiffel built for himself on the third level, decorated with furniture by Jean Lachaise. It now holds wax figures of Eiffel, his daughter Claire, and Thomas Edison, with the phonograph Edison gave Eiffel as a gift.',
  'eiffel apartment terrace': 'Schematic terrace attached to Eiffel\'s apartment on the summit deck. Terrace geometry is schematic.',
  'tip beacon': 'Light assembly at the tip of the antenna. The tower was the tallest structure in the world from 1889 until the Chrysler Building was finished in 1930.',
  'antenna mast lower section': 'Lower section of the broadcasting aerial. The tower\'s 330 m tip height includes the aerial added in 1957.',
  'antenna mast upper section': 'Upper section of the broadcasting aerial. The tower\'s 330 m tip height includes the aerial added in 1957.',
  'broadcasting aerial array': 'Schematic antenna array on the mast. The tower carries about 120 antennas broadcasting television and radio.',
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
  'first floor glass floor': 'Glass floor section on the first floor, 57 m above the ground, letting visitors look straight down through the structure. Frame geometry is schematic.',
  'first floor truss ring': 'Horizontal truss tying the four legs together at the first floor level, 57 m above the ground.',
  'second floor truss ring': 'Horizontal truss tying the four legs together at the second floor level, 115 m above the ground.',
  'summit truss ring': 'Horizontal truss tying the four legs together at the summit level, 276 m above the ground.',
  'lower staircase flight': 'The climb from the ground to the first level is over 300 steps.',
  'upper staircase flight': 'The climb from the first level to the second is over 300 steps, making the full ascent a 600-step climb.',
  'summit staircase flight': 'Stair run from the second level toward the summit. The full climb to the summit is 1,665 steps. Staircase geometry is schematic.',
  'lower landing': 'Landing at the top of the lower staircase flight. Staircase geometry is schematic.',
  'upper landing': 'Landing at the top of the upper staircase flight. Staircase geometry is schematic.',
  'summit landing': 'Landing at the top of the summit staircase flight. Staircase geometry is schematic.',
  'hydraulic pump house': 'Schematic pump house for the hydraulic lift machinery at the base of the tower, with accumulator cylinders. The original hydraulic system lifted the first cabs; machinery geometry is schematic.',
  'winding motor room': 'Schematic motor room under the second floor holding the winding drums for the elevator cables. Machinery geometry is schematic.',
  '58 tour eiffel restaurant': 'The 58 Tour Eiffel restaurant on the first floor, 57 m above the ground, with views over the Champ de Mars. Hall and roof geometry is schematic.',
  '58 tour eiffel terrace canopy': 'Schematic terrace canopy for the 58 Tour Eiffel restaurant. Canopy geometry is schematic.',
  'le jules verne restaurant': 'Le Jules Verne restaurant on the second floor, 115 m above the ground, with panoramic views of Paris. Hall and roof geometry is schematic.',
  'summit champagne bar': 'Champagne bar at the summit, 276 m above the ground. Bar geometry is schematic.',
  'east ticket pavilion': 'Schematic ticket pavilion at the base of the tower. Pavilion geometry is schematic.',
  'west ticket pavilion': 'Schematic ticket pavilion at the base of the tower. Pavilion geometry is schematic.',
  'sparkling light strings': 'Schematic sparkling light strings following the four faces. Since 2000, 20,000 flash bulbs sparkle for five minutes every hour.',
  'floodlight projector ring': 'Schematic ring of floodlight projectors around the base. 336 projectors light the tower at night.',
  'aviation warning strobes': 'Schematic aviation warning strobes on the antenna mast. Strobe geometry is schematic.',
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
  EXPLANATIONS[`${cl} elevator shaft`] = 'Schematic lift shaft inside the leg, framed with corner posts and hoops. Eight elevators serve the tower; the lifts in the east and west legs were replaced by lifts running to the second level for the 1900 Exposition Universelle.';
  EXPLANATIONS[`${cl} elevator cab`] = 'Schematic elevator cab inside the leg shaft. Eight elevators serve the tower.';
  EXPLANATIONS[`${cl} elevator counterweight`] = 'Schematic counterweight balancing the elevator car on its cable inside the leg shaft. Counterweight geometry is schematic.';
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
  EXPLANATIONS[`${fl} arch spandrel ornament`] = `Schematic spandrel ornament filling the space between the ${fl} arch curve and the first floor deck, with a medallion above the keystone. Ornament geometry is schematic.`;
  EXPLANATIONS[`${fl} frieze, 72 names`] = `Frieze panel under the first balcony on the ${fl} side, bearing 18 of the 72 names of French scientists, engineers, and mathematicians, engraved in letters about 60 cm tall. The letters were originally painted gold, were painted over in the early 20th century, and were restored in 1986 to 1987.`;
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
const binName = 'tower-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the tower directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !EXPLANATIONS[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Eiffel Tower, Paris (detailed schematic)',
  title: 'Eiffel Tower',
  location: 'Paris, France',
  blurb: 'The Eiffel Tower is a 330 m wrought iron lattice tower on the Champ de Mars in Paris, built for the 1889 Exposition Universelle. This detailed model breaks the tower into 145 named components across 11 systems, from the compressed-air caissons under the Seine-side legs and the four decorative arches, through the lattice panels, elevators, and staircases, to the summit with Gustave Eiffel\'s apartment, the restaurants on the first two floors, the 72 engraved names, and the broadcasting aerial that lifts the tip to 330 m.',
  sourceUrls: [
    { label: 'Eiffel Tower, Wikipedia', url: 'https://en.wikipedia.org/wiki/Eiffel_Tower' },
    { label: 'List of names on the Eiffel Tower, Wikipedia', url: 'https://en.wikipedia.org/wiki/List_of_names_on_the_Eiffel_Tower' },
  ],
  systems: SYSTEMS,
  explanations: EXPLANATIONS,
  parts: records.map((r) => ({
    id: r.part.id,
    name: r.part.name,
    conceptId: r.part.id,
    system: r.part.system,
    chunk: 0,
    color: colorFor(r.part.id, r.part.system),
    positions: r.posOff,
    normals: r.norOff,
    indices: r.idxOff,
    vertexCount: r.vertexCount,
    indexCount: r.indexCount,
    bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/tower/tower-0.bin', bytes: offset }],
  triangles,
  // The exploded cloud lifts +1 above the assembled centre while the camera
  // targets the model centre, so compact packings clip at the top of the
  // frame. 1.4 restores full framing (same value as Sagrada Familia detailed).
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
