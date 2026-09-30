// Procedural One World Trade Center, simplified variant, for the
// Architectural Atlas.
//
// Builds a schematic, simplified One World Trade Center in code and writes
// it in the atlas binary format:
//   public/models/one-world-trade-center-simple/atlas.json
//   public/models/one-world-trade-center-simple/one-world-trade-center-simple-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/one-world-trade-center-attribution.md,
// opened 2026-09-30): 1,776 ft (541.3 m) including the 408 ft spire, a
// deliberate reference to 1776; tallest in the Western Hemisphere since the
// 2013 CTBUH ruling; 285 Fulton Street, Lower Manhattan, on the northwest
// corner of the 16-acre World Trade Center site; architect David Childs of
// SOM; opened 3 November 2014; eight isosceles triangles (an elongated square
// antiprism) rising from a 200 ft square, 185 ft tall windowless concrete
// base, chamfering from the 20th floor up through a midheight octagon to a
// 150 ft square crown rotated 45 degrees; slotted stainless steel chamfered
// corners; prismatic glass curtain wall; 110 ft square concrete core;
// observatory on floors 100-102; 408 ft spire on a circular support ring
// with a beacon at 1,776 ft; 9/11 Memorial just south of the tower.
// Schematic (not sourced, never stated as fact in the UI): all dimensions
// below are rounded for the simplified model; exact chamfer profiles, fin
// spacing, slot patterns, interior fit-out, spire taper, plaza extent and
// memorial placement.
//
// This variant is modeled fresh for the simplified view: single-tier facade
// panels, aggregated parts, rounded dimensions. It shares no part names and
// no identical bounds with the detailed model.
//
// Granularity: 31 named parts across 8 systems. Every explanation is either
// a sourced fact (see the research notes above) or explicitly marked
// schematic.
//
// Usage: node scripts/generate-one-world-trade-center-simple.mjs
// (Run this before generate-one-world-trade-center.mjs: the detailed
// generator's freshness gate reads this variant's atlas.json.)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'one-world-trade-center-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (spire top, 541 m) maps to 2.4 units.
const SPIRE_TOP = 541;
const S = 2.4 / SPIRE_TOP;

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
// Square frustum centered on the y axis, faces toward the cardinals.
function taperedSquare(y0, y1, s0, s1) {
  const g = new THREE.CylinderGeometry(s1 * Math.SQRT2, s0 * Math.SQRT2, y1 - y0, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}

// ---------------------------------------------------------------- massing (rounded, schematic)
// Plan: x east, z south, y up, metres. Octagon cross-section alternating
// cardinal and diagonal vertices, interpolated from the square base to the
// 45-degree-rotated crown square.
const BASE_H = 56;
const TOP_Y = 417;
function ringAt(t) {
  const rc = 30 * (1 - t) + 32.3 * t;
  const rd = 42.4 * (1 - t) + 23 * t;
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const r = k % 2 === 0 ? rc : rd;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return pts;
}
const yAt = (t) => BASE_H + t * (TOP_Y - BASE_H);
const tOf = (y) => (y - BASE_H) / (TOP_Y - BASE_H);
// Single quad strip over the octagon rings, outward winding.
function triPanel(t0, t1, cols, shrink = 1) {
  const pos = [];
  const idx = [];
  const rA = ringAt(t0);
  const rB = ringAt(t1);
  const yA = yAt(t0);
  const yB = yAt(t1);
  for (let j = 0; j < cols.length - 1; j++) {
    const P = (r, c, y) => [r[c][0] * shrink, y, r[c][1] * shrink];
    const a0 = P(rA, cols[j], yA);
    const a1 = P(rA, cols[j + 1], yA);
    const b1 = P(rB, cols[j + 1], yB);
    const b0 = P(rB, cols[j], yB);
    const v = pos.length / 3;
    pos.push(...a0, ...a1, ...b1, ...b0);
    idx.push(v, v + 2, v + 1, v, v + 3, v + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
// Thin octagonal band with a top cap.
function octBand(t, dy, half, out) {
  const geoms = [];
  const r = ringAt(t);
  const y = yAt(t) + dy;
  const ro = r.map(([x, z]) => {
    const l = Math.hypot(x, z) || 1;
    return [(x / l) * (l + out), (z / l) * (l + out)];
  });
  const side = [];
  const sidx = [];
  for (let k = 0; k < 8; k++) {
    const k2 = (k + 1) % 8;
    const v = side.length / 3;
    side.push(ro[k][0], y - half, ro[k][1], ro[k2][0], y - half, ro[k2][1], ro[k2][0], y + half, ro[k2][1], ro[k][0], y + half, ro[k][1]);
    sidx.push(v, v + 2, v + 1, v, v + 3, v + 2);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(side, 3));
  sg.setIndex(sidx);
  geoms.push(sg);
  const top = [];
  const tidx = [];
  for (let k = 0; k < 8; k++) {
    const k2 = (k + 1) % 8;
    const v = top.length / 3;
    top.push(r[k][0], y + half, r[k][1], r[k2][0], y + half, r[k2][1], ro[k2][0], y + half, ro[k2][1], ro[k][0], y + half, ro[k][1]);
    tidx.push(v, v + 1, v + 2, v, v + 2, v + 3);
  }
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(top, 3));
  tg.setIndex(tidx);
  geoms.push(tg);
  return geoms;
}
// Solid octagonal slab.
function octSlab(t, dy, half, shrink = 1) {
  const r = ringAt(t).map(([x, z]) => [x * shrink, z * shrink]);
  const y = yAt(t) + dy;
  const geoms = [];
  const side = [];
  const sidx = [];
  for (let k = 0; k < 8; k++) {
    const k2 = (k + 1) % 8;
    const v = side.length / 3;
    side.push(r[k][0], y - half, r[k][1], r[k2][0], y - half, r[k2][1], r[k2][0], y + half, r[k2][1], r[k][0], y + half, r[k][1]);
    sidx.push(v, v + 2, v + 1, v, v + 3, v + 2);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(side, 3));
  sg.setIndex(sidx);
  geoms.push(sg);
  const cap = [];
  const cidx = [];
  for (let k = 0; k < 8; k++) {
    const k2 = (k + 1) % 8;
    const v = cap.length / 3;
    cap.push(0, y + half, 0, r[k][0], y + half, r[k][1], r[k2][0], y + half, r[k2][1]);
    cidx.push(v, v + 2, v + 1);
  }
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3));
  cg.setIndex(cidx);
  geoms.push(cg);
  return geoms;
}

const FACES = [
  ['south', [1, 2, 3]],
  ['west', [3, 4, 5]],
  ['north', [5, 6, 7]],
  ['east', [7, 0, 1]],
];
const CHAMFERS = [
  ['southeast', [0, 1, 2], 1],
  ['southwest', [2, 3, 4], 3],
  ['northwest', [4, 5, 6], 5],
  ['northeast', [6, 7, 0], 7],
];

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Base and podium.
addPart('podium', 'Podium block', 'base', [box(-30, 30, 0, BASE_H, -30, 30)]);
{
  const g = [];
  for (let i = -11; i <= 11; i++) {
    const c = i * 2.6;
    g.push(box(c - 0.1, c + 0.1, 2, BASE_H, -31.2, -30.6));
    g.push(box(c - 0.1, c + 0.1, 2, BASE_H, 30.6, 31.2));
    g.push(box(-31.2, -30.6, 2, BASE_H, c - 0.1, c + 0.1));
    g.push(box(30.6, 31.2, 2, BASE_H, c - 0.1, c + 0.1));
  }
  for (const y of [14, 34]) {
    g.push(box(-30.5, 30.5, y - 0.5, y + 0.5, -30.6, -30.1));
    g.push(box(-30.5, 30.5, y - 0.5, y + 0.5, 30.1, 30.6));
  }
  addPart('fin-screen', 'Glass fin screen', 'base', g);
}
addPart('main-entrance', 'Main lobby entrance', 'base', [
  box(-6, 6, 0, 11, 29.5, 30.8),
  box(-7.5, 7.5, 10.5, 11.3, 27, 33.5),
  box(-7, -6, 0, 12, 29.5, 31.2),
  box(6, 7, 0, 12, 29.5, 31.2),
]);
addPart('lobby-hall', 'Lobby hall', 'base', [box(-27, 27, 0, 17, -27, 27)]);

// --- Tower facets: four glass triangles, full height.
for (const [fname, cols] of FACES) {
  addPart(`facet-${fname}`, `${fname[0].toUpperCase() + fname.slice(1)} glass triangle`, 'facade', [
    triPanel(0, 0.5, cols),
    triPanel(0.5, 1, cols),
  ]);
}

// --- Chamfered corners: four chamfer triangles plus slot screens.
for (const [cname, cols] of CHAMFERS) {
  addPart(`chamfer-${cname}`, `${cname[0].toUpperCase() + cname.slice(1)} chamfer triangle`, 'corners', [
    triPanel(0, 0.5, cols),
    triPanel(0.5, 1, cols),
  ]);
}
{
  const g = [];
  for (const [, , diag] of CHAMFERS) {
    const rA = ringAt(0)[diag];
    const rB = ringAt(1)[diag];
    g.push(strut([rA[0] * 1.02, BASE_H, rA[1] * 1.02], [rB[0] * 1.02, TOP_Y, rB[1] * 1.02], 1.6, 0.8));
  }
  addPart('chamfer-screens', 'Chamfer slot screens', 'corners', g);
}

// --- Crown and observatory.
addPart('observatory-band', 'Observatory band', 'crown', [
  triPanel(tOf(378), tOf(393), [0, 1, 2, 3, 4, 5, 6, 7], 0.97),
]);
addPart('upper-deck', 'Upper deck band', 'crown', octBand(tOf(393), 0, 4, 1.0));
addPart('crown-parapet', 'Glass crown parapet', 'crown', [
  triPanel(tOf(405), 1, [0, 1, 2, 3, 4, 5, 6, 7]),
]);
addPart('roof-slab', 'Roof slab', 'crown', octSlab(tOf(403), 0, 1, 0.98));

// --- Concrete core.
addPart('core-tube', 'Core tube', 'core', [taperedSquare(0, TOP_Y, 17, 11)]);
{
  const g = [
    box(-20, 20, 0, BASE_H, -20, -19),
    box(-20, 20, 0, BASE_H, 19, 20),
    box(-20, -19, 0, BASE_H, -20, 20),
    box(19, 20, 0, BASE_H, -20, 20),
  ];
  addPart('core-walls', 'Core base walls', 'core', g);
}

// --- Spire and ring.
{
  const ring = new THREE.TorusGeometry(7, 1.3, 10, 28);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 419, 0);
  addPart('broadcast-ring', 'Broadcast ring', 'spire', [ring]);
}
addPart('spire-mast', 'Spire mast', 'spire', [cyl(0.2, 2.4, SPIRE_TOP - TOP_Y, 0, (TOP_Y + SPIRE_TOP) / 2, 0, 10)]);
{
  const g = [cyl(0.3, 0.45, 1.6, 0, SPIRE_TOP + 0.8, 0, 8)];
  const tip = new THREE.SphereGeometry(0.8, 10, 8);
  tip.translate(0, SPIRE_TOP + 2, 0);
  g.push(tip);
  addPart('beacon-tip', 'Beacon tip', 'spire', g);
}
{
  const g = [];
  const crown = ringAt(1);
  for (let k = 0; k < 8; k++) g.push(strut([0, 515, 0], [crown[k][0], TOP_Y, crown[k][1]], 0.3));
  addPart('cable-stays', 'Cable stays', 'spire', g);
}

// --- Mechanical levels.
addPart('plant-lower', 'Lower plant floors', 'mechanical', [box(-25, 25, 17, BASE_H, -25, 25)]);
addPart('plant-upper', 'Upper plant band', 'mechanical', octBand(tOf(399), 0, 6, 1.2));
addPart('roof-plant', 'Rooftop plant', 'mechanical', [
  box(-16, -6, 404, 409, -6, 6),
  box(6, 16, 404, 408, -6, 6),
]);
addPart('sky-lobby-vol', 'Sky lobby volume', 'mechanical', [box(-23, 23, 358, 367, -23, 23)]);

// --- Site context (south is +z).
addPart('plaza-ground', 'Plaza ground', 'site', [box(-92, 92, -0.6, 0, -92, 92)]);
addPart('memorial-pools', 'Memorial pools', 'site', [
  box(-36, -16, -0.4, 0.1, 42, 64),
  box(16, 36, -0.4, 0.1, 42, 64),
]);
{
  const g = [
    box(-106, -93, -0.4, 0.05, -92, 92),
    box(-92, 92, -0.4, 0.05, -106, -93),
    box(-92, 92, -0.4, 0.05, 93, 106),
  ];
  addPart('street-grid', 'Street grid', 'site', g);
}
{
  const g = [];
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    g.push(cyl(0.18, 0.18, 1.2, 50 * Math.cos(a), 0.6, 50 * Math.sin(a), 6));
  }
  addPart('bollard-line', 'Bollard line', 'site', g);
}

// ---------------------------------------------------------------- colors
// Schematic light palette: pale blue glass, warm concrete, pale steel.
function colorFor(id) {
  if (id === 'podium') return '#cfc9bd';
  if (id === 'fin-screen') return '#d9e8f2';
  if (id === 'main-entrance') return '#3d4a55';
  if (id === 'lobby-hall') return '#e8e2d4';
  if (id.startsWith('facet-')) return '#bcd7e8';
  if (id.startsWith('chamfer-') && id !== 'chamfer-screens') return '#a9c9de';
  if (id === 'chamfer-screens') return '#c8ccd2';
  if (id === 'observatory-band') return '#cfe8f5';
  if (id === 'upper-deck') return '#9aa5ad';
  if (id === 'crown-parapet') return '#c8e0ef';
  if (id === 'roof-slab') return '#d5dbe0';
  if (id === 'core-tube' || id === 'core-walls') return '#b3aa97';
  if (id === 'broadcast-ring') return '#c2c8cf';
  if (id === 'spire-mast') return '#d5d9de';
  if (id === 'beacon-tip') return '#ffd76a';
  if (id === 'cable-stays') return '#9aa2ab';
  if (id === 'plant-lower' || id === 'plant-upper' || id === 'roof-plant') return '#9aa5ad';
  if (id === 'sky-lobby-vol') return '#ded5c2';
  if (id === 'plaza-ground') return '#d8d2c4';
  if (id === 'memorial-pools') return '#2e4a5a';
  if (id === 'street-grid') return '#8a8d90';
  if (id === 'bollard-line') return '#6b7076';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Base and podium', color: '#c9c2b2', description: 'The 185 ft fortified concrete podium with its glass fin cladding, main entrance and lobby.' },
  { id: 'facade', name: 'Tower facets', color: '#bcd7e8', description: 'The four tapering glass faces of the tower, each a single tall triangle in this simplified model.' },
  { id: 'corners', name: 'Chamfered corners', color: '#9fb8cc', description: 'The four chamfered corners with slotted steel screens, growing from the square base to the rotated crown.' },
  { id: 'crown', name: 'Crown and observatory', color: '#cfe8f5', description: 'The observatory levels and the glass crown parapet at 1,368 ft.' },
  { id: 'core', name: 'Concrete core', color: '#b3aa97', description: 'The reinforced concrete core running the height of the tower.' },
  { id: 'spire', name: 'Spire and ring', color: '#d5d9de', description: 'The 408 ft spire on its broadcast ring, with the beacon at the symbolic 1,776 ft.' },
  { id: 'mechanical', name: 'Mechanical levels', color: '#9aa5ad', description: 'Plant floors, the sky lobby, and rooftop equipment.' },
  { id: 'site', name: 'Site context', color: '#d8d2c4', description: 'Plaza, memorial pools, surrounding streets and the security line.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'podium block': 'Simplified massing of the 200 ft square, 185 ft tall windowless concrete podium, the tower\u2019s fortified base. Dimensions are rounded for this simplified model.',
  'glass fin screen': 'Simplified glass fin cladding over the podium, lit at night in the real building. Fin spacing is schematic.',
  'main lobby entrance': 'Simplified monumental entrance on the Fulton Street side. Exact portal design is schematic.',
  'lobby hall': 'Simplified volume of the 55 ft high main lobby. Interior fit out is schematic.',
  'south glass triangle': 'Simplified south face of the tower: one tall glass triangle tapering from the square base toward the rotated crown. Real panels are 13.33 ft tall floor to floor units.',
  'west glass triangle': 'Simplified west face of the tower: one tall glass triangle tapering from the square base toward the rotated crown. Real panels are 13.33 ft tall floor to floor units.',
  'north glass triangle': 'Simplified north face of the tower: one tall glass triangle tapering from the square base toward the rotated crown. Real panels are 13.33 ft tall floor to floor units.',
  'east glass triangle': 'Simplified east face of the tower: one tall glass triangle tapering from the square base toward the rotated crown. Real panels are 13.33 ft tall floor to floor units.',
  'southeast chamfer triangle': 'Simplified southeast chamfer: one tall triangle growing from the square base to the rotated crown square. Exact chamfer profile is schematic.',
  'southwest chamfer triangle': 'Simplified southwest chamfer: one tall triangle growing from the square base to the rotated crown square. Exact chamfer profile is schematic.',
  'northwest chamfer triangle': 'Simplified northwest chamfer: one tall triangle growing from the square base to the rotated crown square. Exact chamfer profile is schematic.',
  'northeast chamfer triangle': 'Simplified northeast chamfer: one tall triangle growing from the square base to the rotated crown square. Exact chamfer profile is schematic.',
  'chamfer slot screens': 'Simplified slotted stainless steel screens on the four chamfers, the signature treatment of the tower\u2019s corners. Exact slot pattern is schematic.',
  'observatory band': 'Simplified observatory levels, floors 100 to 102 at about 1,268 ft, with full height viewing glass. Interior fit out is schematic.',
  'upper deck band': 'Simplified upper mechanical band below the crown. Exact louver pattern is schematic.',
  'glass crown parapet': 'Simplified glass parapet at 1,368 ft, the same height as the original North Tower roof, its plan a square rotated 45 degrees from the base.',
  'roof slab': 'Simplified roof slab behind the parapet. Exact layout is schematic.',
  'core tube': 'Simplified 110 ft square reinforced concrete core running the height of the tower. Taper is schematic.',
  'core base walls': 'Simplified thickened concrete walls at the core\u2019s base. Exact thickness is schematic.',
  'broadcast ring': 'Simplified circular support ring at the spire\u2019s base, carrying broadcasting equipment.',
  'spire mast': 'Simplified 408 ft sculpted spire, an 800 ton steel mast in the real building. Exact taper is schematic.',
  'beacon tip': 'Simplified beacon light at 1,776 ft, echoing the torch of the Statue of Liberty.',
  'cable stays': 'Simplified cable stays securing the mast to the crown. Exact cable layout is schematic.',
  'lower plant floors': 'Simplified plant floors stacked inside the podium. Exact equipment is schematic.',
  'upper plant band': 'Simplified upper mechanical levels below the observatory. Exact layout is schematic.',
  'rooftop plant': 'Simplified rooftop equipment behind the parapet. Exact equipment is schematic.',
  'sky lobby volume': 'Simplified double height sky lobby serving the upper floors. Interior layout is schematic.',
  'plaza ground': 'Simplified plaza slab of the World Trade Center site. Extent is schematic.',
  'memorial pools': 'Simplified pair of 9/11 Memorial reflecting pools just south of the tower.',
  'street grid': 'Simplified surrounding streets: West Street, Vesey Street and Fulton Street. Widths are schematic.',
  'bollard line': 'Simplified security line around the site. Exact positions are schematic.',
};

// ---------------------------------------------------------------- serialize
// Atlas v1 contract (same as the other generators): per part, 4-byte
// aligned Float32 positions, Int16 normals and Uint32 indices in one
// binary chunk; atlas.json carries byte offsets, bounds, explanations,
// concepts and triangles. Parts carry an optional color that overrides the
// system color in the viewer.
let offset = 0;
const records = [];
let triangles = 0;
for (const p of parts) {
  const merged = mergeGeometries(
    p.geoms.map((g) => {
      g.deleteAttribute('uv');
      g.deleteAttribute('normal'); // custom panel/band geoms carry no normals; recomputed below
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
const binName = 'one-world-trade-center-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the one-world-trade-center-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'One World Trade Center, New York (simple schematic)',
  title: 'One World Trade Center',
  location: 'New York City, United States',
  blurb: 'Simplified massing of the 1,776 ft tower by David Childs of SOM: four glass triangles and four chamfered corners rising from the fortified podium to the crown square rotated 45 degrees, with the 408 ft spire and its beacon.',
  sourceUrls: [
    { label: 'Wikipedia: One World Trade Center', url: 'https://en.wikipedia.org/wiki/One_World_Trade_Center' },
    { label: 'Wikipedia: One World Observatory', url: 'https://en.wikipedia.org/wiki/One_World_Observatory' },
    { label: 'Architectural Record: One World Trade Center (2015)', url: 'https://www.architecturalrecord.com/articles/7991-one-world-trade-center' },
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
  chunks: [{ url: '/models/one-world-trade-center-simple/one-world-trade-center-simple-0.bin', bytes: offset }],
  triangles,
  // Tall thin model: the exploded cloud lifts +1 above the assembled centre
  // while the camera targets the model centre. 1.5 keeps the simplified
  // spire in frame.
  spread: 1.5,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
