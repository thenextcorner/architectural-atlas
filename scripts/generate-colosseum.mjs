// Procedural Colosseum (Flavian Amphitheatre, Rome) for the Architectural Atlas.
//
// Builds the COMPLETE ORIGINAL form as dedicated in AD 80 (not the ruin),
// including Domitian's hypogeum and the wooden top gallery, and writes it in
// the atlas binary format: public/models/colosseum/atlas.json +
// public/models/colosseum/colosseum-0.bin
//
// Dimensions used (all from the research file
// ~/workspace/architectural-atlas/research/colosseum-research.md, sourced from
// Wikipedia, Ancient Rome Live / Platner's Topographical Dictionary, and
// Structurae; the 2026-09-30 deepening pass re-read those three in full and
// added thecolosseum.org and ancient-history-sites.com):
//   outer ellipse 189 x 156 m, outer wall 48 m, perimeter 545 m,
//   ground arch 7.05 m high / 4.20 m wide, piers 2.40 m, entablature 2.35 m (Doric),
//   second arch 6.45 m, entablature 2.10 m, attic 1.95 m (Ionic),
//   third arch 6.40 m, attic 2.10 m with windows over every second arch (Corinthian),
//   80 ground arches (76 numbered + 4 axial), 240 velarium mast corbels,
//   3 consoles between each pair of pilasters, 40 bronze clipea shields,
//   velarium covered two thirds of the arena, worked by Misenum sailors,
//   about 160 statues in the second and third arcades,
//   80 hypogeum shafts, arena floor 83 x 48 m, arena wall 5 m, podium about 4 m,
//   seating about 20 rows (primum) + about 16 rows (secundum),
//   hypogeum walls 5.50-6.08 m, inner walls 5.80 m / 4.50 m apart,
//   pavement 17.50 m wide, cippi posts 18 m out (5 survive, east side).
// Plan geometry (true ellipse), seat widths, velarium fabric shape, exact
// cunei counts, grand staircase routing, and the detailed hypogeum room layout
// are schematic stand-ins and are not stated as facts anywhere in the UI.
//
// Granularity: 128 named parts across 9 systems. Every explanation is either
// a sourced fact (see ~/workspace/architectural-atlas/research/
// colosseum-attribution.md) or explicitly marked schematic.
//
// Usage: node scripts/generate-colosseum.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'colosseum');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: 189 m (major axis) maps to 2.4 units.
const S = 2.4 / 189;

// Outer ellipse semi-axes, metres. x = east, z = south.
const A = 94.5;
const B = 78;
const K = B / A; // outer ellipse aspect, reused for facade rings

// ---------------------------------------------------------------- helpers
function ellBand(aOut, aIn, y0, y1, aspect = K, thick = 0, seg = 72) {
  // Elliptical ring band. Pass thick = 0 and aIn as inner radius, or pass
  // aOut as centre radius with thick for a wall of given thickness.
  const ro = thick ? aOut + thick / 2 : aOut;
  const ri = thick ? aOut - thick / 2 : aIn;
  const s = new THREE.Shape();
  s.absellipse(0, 0, ro, ro * aspect, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(0, 0, ri, ri * aspect, 0, Math.PI * 2, false, 0);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: seg });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}
function ellDisc(a, y0, y1, aspect = K, seg = 72) {
  const s = new THREE.Shape();
  s.absellipse(0, 0, a, a * aspect, 0, Math.PI * 2, false, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: seg });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}
// Elliptical ring band over a world-angle range (x = a cos t, z = b sin t).
// The shape plane maps (sx, sy) to world (sx, depth, -sy), so shape y is
// negated world z.
function arcBand(aOut, aIn, y0, y1, th0, th1, aspect = K, seg = 32) {
  const s = new THREE.Shape();
  for (let i = 0; i <= seg; i++) {
    const t = th0 + ((th1 - th0) * i) / seg;
    const x = aOut * Math.cos(t);
    const z = aOut * aspect * Math.sin(t);
    if (i === 0) s.moveTo(x, -z);
    else s.lineTo(x, -z);
  }
  for (let i = seg; i >= 0; i--) {
    const t = th0 + ((th1 - th0) * i) / seg;
    s.lineTo(aIn * Math.cos(t), -aIn * aspect * Math.sin(t));
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}
// Elliptical pie-slice disc over a world-angle range.
function arcDisc(a, y0, y1, th0, th1, aspect, seg = 32) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  for (let i = 0; i <= seg; i++) {
    const t = th0 + ((th1 - th0) * i) / seg;
    s.lineTo(a * Math.cos(t), -a * aspect * Math.sin(t));
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 4 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}
function boxAt(w, h, d, x, y, z, yaw = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (yaw) g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}
function beam(ax, ay, az, bx, by, bz, w, d = w) {
  const dir = new THREE.Vector3(bx - ax, by - ay, bz - az);
  const len = dir.length();
  const g = new THREE.BoxGeometry(w, len, d);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
  );
  g.translate(ax, ay, az);
  return g;
}
function cylAt(r, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(r, r, h, seg);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- quadrants
// World angles: x = a cos t, z = b sin t, z+ = south.
const QUAD_ARCS = [
  { name: 'NE', th0: (3 * Math.PI) / 2, th1: 2 * Math.PI },
  { name: 'NW', th0: Math.PI, th1: (3 * Math.PI) / 2 },
  { name: 'SE', th0: 0, th1: Math.PI / 2 },
  { name: 'SW', th0: Math.PI / 2, th1: Math.PI },
];
const quadOfBay = (i) => (i < 20 ? 'SE' : i < 40 ? 'SW' : i < 60 ? 'NW' : 'NE');
const quadOfMast = (j) => (j < 60 ? 'SE' : j < 120 ? 'SW' : j < 180 ? 'NW' : 'NE');

// ---------------------------------------------------------------- facade bays
const BAYS = 80;
const BAY_W = 6.6; // 4.20 m arch + 2.40 m pier
const ARCH_W = 4.2;
const WALL_T = 2.7; // pier depth
const bayTheta = (i) => (i / BAYS) * Math.PI * 2;

function bayGeom(tierH, archH) {
  const s = new THREE.Shape();
  s.moveTo(-BAY_W / 2, 0);
  s.lineTo(BAY_W / 2, 0);
  s.lineTo(BAY_W / 2, tierH);
  s.lineTo(-BAY_W / 2, tierH);
  s.closePath();
  const r = ARCH_W / 2;
  const spring = archH - r;
  const hole = new THREE.Path();
  hole.moveTo(-r, 0);
  hole.lineTo(-r, spring);
  hole.absarc(0, spring, r, Math.PI, 0, true);
  hole.lineTo(r, 0);
  hole.closePath();
  s.holes.push(hole);
  return new THREE.ExtrudeGeometry(s, { depth: WALL_T, bevelEnabled: false, curveSegments: 6 });
}
// Frame mapping bay-local (lx along tangent, lz outward) to world xz.
function bayFrame(theta) {
  const yaw = Math.atan2(B * Math.cos(theta), A * Math.sin(theta));
  const px = A * Math.cos(theta);
  const pz = B * Math.sin(theta);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  return (lx, lz) => [px + lx * cy + lz * sy, pz - lx * sy + lz * cy, yaw];
}
function placeBay(g, theta, y0) {
  g.translate(0, y0, -WALL_T / 2);
  const yaw = Math.atan2(B * Math.cos(theta), A * Math.sin(theta));
  g.rotateY(yaw);
  g.translate(A * Math.cos(theta), 0, B * Math.sin(theta));
  return g;
}
function halfColumn(theta, y0, archH, lx) {
  const f = bayFrame(theta);
  const [wx, wz] = f(lx, WALL_T / 2 - 0.15);
  const g = new THREE.CylinderGeometry(0.5, 0.55, archH, 6);
  g.translate(wx, y0 + archH / 2, wz);
  return g;
}

// Tier stack (metres). Ground tier sits on the 1 m stylobate.
const T1 = { y0: 1.0, arch: 7.05, tierH: 7.05 + 2.35 }; // Doric
const T2 = { y0: 10.4, arch: 6.45, tierH: 6.45 + 2.1 + 1.95 }; // Ionic
const T3 = { y0: 20.9, arch: 6.4, tierH: 6.4 + 2.1 }; // Corinthian
const ATTIC_Y0 = 29.4;
const ATTIC_H = 16.0;
const CORNICE_Y0 = ATTIC_Y0 + ATTIC_H; // 45.4
const CORNICE_H = 2.0;

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- System: facade. 3 tiers x 8 bay groups of 10.
const TIERS = [
  { key: 'ground', label: 'Ground arcade', order: 'Doric', t: T1 },
  { key: 'second', label: 'Second arcade', order: 'Ionic', t: T2 },
  { key: 'third', label: 'Third arcade', order: 'Corinthian', t: T3 },
];
for (const tier of TIERS) {
  for (let g = 0; g < 8; g++) {
    const geoms = [];
    for (let i = g * 10; i < (g + 1) * 10; i++) {
      const th = bayTheta(i);
      geoms.push(placeBay(bayGeom(tier.t.tierH, tier.t.arch), th, tier.t.y0));
      geoms.push(halfColumn(th, tier.t.y0, tier.t.arch, -3.3));
      geoms.push(halfColumn(th, tier.t.y0, tier.t.arch, 3.3));
    }
    const a = g * 10 + 1;
    const b = (g + 1) * 10;
    addPart(
      `facade-${tier.key}-bays-${a}-${b}`,
      `${tier.label} bays ${a}-${b} (${tier.order})`,
      'facade',
      geoms,
    );
  }
}

// --- System: attic, crown, velarium.
for (const q of QUAD_ARCS) {
  const ql = q.name.toLowerCase();
  // Solid attic wall quarter + 20 flat Corinthian pilasters.
  const pilGeoms = [arcBand(A + WALL_T / 2, A - WALL_T / 2, ATTIC_Y0, ATTIC_Y0 + ATTIC_H, q.th0, q.th1, K, 32)];
  // Window panels: lower windows over every second arch + upper windows
  // between every second pair of pilasters.
  const winGeoms = [];
  for (let i = 0; i < BAYS; i++) {
    if (quadOfBay(i) !== q.name) continue;
    const th = bayTheta(i);
    const f = bayFrame(th);
    const [px, pz] = f(0, WALL_T / 2 + 0.35);
    pilGeoms.push(boxAt(1.3, ATTIC_H, 0.9, px, ATTIC_Y0 + ATTIC_H / 2, pz, Math.atan2(px, pz)));
    if (i % 2 === 0) {
      const [wx, wz] = f(0, WALL_T / 2 + 0.15);
      const yaw = Math.atan2(wx, wz);
      winGeoms.push(boxAt(1.8, 1.4, 0.5, wx, ATTIC_Y0 + 1.05, wz, yaw)); // lower attic band
      winGeoms.push(boxAt(1.8, 2.4, 0.5, wx, ATTIC_Y0 + 10.5, wz, yaw)); // between pilasters
    }
  }
  addPart(`attic-pilasters-${ql}`, `${q.name} attic pilaster bays`, 'attic', pilGeoms);
  addPart(`attic-windows-${ql}`, `${q.name} attic window panels`, 'attic', winGeoms);
}
{
  // Bronze shields (clipea) fixed between the pilasters, beneath the cornice.
  const geoms = [];
  for (let i = 0; i < BAYS; i += 2) {
    const th = bayTheta(i);
    const f = bayFrame(th);
    const [px, pz] = f(0, WALL_T / 2 + 0.45);
    const g = new THREE.CylinderGeometry(0.85, 0.85, 0.3, 12);
    g.rotateX(Math.PI / 2);
    g.rotateY(Math.atan2(px, pz));
    g.translate(px, CORNICE_Y0 - 1.2, pz);
    geoms.push(g);
  }
  addPart('attic-clipea', 'Bronze shields (clipea)', 'attic', geoms);
}
{
  // Entablatures, attic bands, crowning cornice with mast sockets.
  const geoms = [
    ellBand(A, 0, 8.05, 10.4, K, 3.0), // T1 entablature 2.35 m
    ellBand(A, 0, 16.85, 18.95, K, 3.0), // T2 entablature 2.10 m
    ellBand(A, 0, 18.95, 20.9, K, 3.0), // T2 attic 1.95 m
    ellBand(A, 0, 27.3, 29.4, K, 3.0), // T3 attic 2.10 m
    ellBand(A, 0, CORNICE_Y0, CORNICE_Y0 + CORNICE_H, K, 4.0), // main cornice
  ];
  for (let j = 0; j < 240; j++) {
    const ph = (j / 240) * Math.PI * 2;
    geoms.push(
      boxAt(0.5, 0.4, 0.5, 96.2 * Math.cos(ph), CORNICE_Y0 + CORNICE_H + 0.2, 79.5 * Math.sin(ph)),
    );
  }
  addPart('entablature-cornice', 'Entablature and cornice', 'attic', geoms);
}
for (const q of QUAD_ARCS) {
  const ql = q.name.toLowerCase();
  // 60 velarium mast corbels per quadrant.
  const corbels = [];
  // 60 velarium masts per quadrant.
  const masts = [];
  for (let j = 0; j < 240; j++) {
    if (quadOfMast(j) !== q.name) continue;
    const ph = (j / 240) * Math.PI * 2;
    corbels.push(
      boxAt(0.9, 1.2, 0.9, 96.2 * Math.cos(ph), CORNICE_Y0 + CORNICE_H + 0.6, 79.5 * Math.sin(ph)),
    );
    masts.push(
      beam(
        96.2 * Math.cos(ph), CORNICE_Y0 + CORNICE_H, 79.5 * Math.sin(ph),
        88 * Math.cos(ph), CORNICE_Y0 + CORNICE_H + 12.6, 72.6 * Math.sin(ph),
        0.24,
      ),
    );
  }
  addPart(`attic-corbels-${ql}`, `${q.name} velarium mast corbels (60)`, 'attic', corbels);
  addPart(`velarium-masts-${ql}`, `${q.name} velarium masts (60)`, 'attic', masts);
}
{
  // Velarium canopy (schematic fabric).
  const fabric = new THREE.CylinderGeometry(28, 95, 9.4, 48, 1, true);
  fabric.scale(1, 1, 78.5 / 95);
  fabric.translate(0, CORNICE_Y0 + CORNICE_H - 4.7, 0);
  addPart('velarium-canopy', 'Velarium canopy', 'attic', [fabric]);
}
{
  // Stylobate: raised two-step ring under the outer wall.
  addPart('stylobate', 'Stylobate base ring', 'attic', [
    ellBand(A, 0, 0, 0.5, K, 5.0),
    ellBand(A, 0, 0.5, 1.0, K, 3.0),
  ]);
}
{
  // Travertine pavement 17.50 m wide + 5 surviving cippi posts on the east side.
  const geoms = [ellBand(112, A, 0, 0.25, K, 0, 96)];
  for (const z of [-12, -6, 0, 6, 12]) geoms.push(cylAt(0.35, 2.2, 112.5, 1.1, z, 8));
  addPart('pavement', 'Travertine pavement and cippi', 'attic', geoms);
}

// --- System: entrances.
// Axial bays: 0 = east, 20 = south, 40 = west, 60 = north.
function axialPortal(bay, portalId, portalName, archId, archName) {
  const th = bayTheta(bay);
  const f = bayFrame(th);
  const jambs = [];
  for (const lx of [-3.9, 3.9]) {
    const [jx, jz] = f(lx, WALL_T / 2 + 0.9);
    jambs.push(boxAt(1.6, 10.5, 1.6, jx, T1.y0 + 5.25, jz));
  }
  const [lnx, lnz] = f(0, WALL_T / 2 + 0.9);
  const yaw = Math.atan2(lnx, lnz);
  const arch = [
    boxAt(10.0, 1.8, 1.8, lnx, T1.y0 + 11.4, lnz, yaw),
    boxAt(7.0, 1.4, 1.4, lnx, T1.y0 + 13.0, lnz, yaw),
  ];
  addPart(portalId, portalName, 'entrances', jambs);
  addPart(archId, archName, 'entrances', arch);
}
axialPortal(60, 'entrance-north-portal', 'North axial entrance portal', 'entrance-north-arch', 'North entrance arch');
axialPortal(20, 'entrance-south-portal', 'South axial entrance portal', 'entrance-south-arch', 'South entrance arch');
for (const [bay, id, name] of [
  [0, 'entrance-east', 'East axial entrance'],
  [40, 'entrance-west', 'West axial entrance'],
]) {
  const th = bayTheta(bay);
  const f = bayFrame(th);
  const geoms = [];
  for (const lx of [-3.9, 3.9]) {
    const [jx, jz] = f(lx, WALL_T / 2 + 0.9);
    geoms.push(boxAt(1.6, 10.5, 1.6, jx, T1.y0 + 5.25, jz));
  }
  const [lnx, lnz] = f(0, WALL_T / 2 + 0.9);
  const yaw = Math.atan2(lnx, lnz);
  geoms.push(boxAt(10.0, 1.8, 1.8, lnx, T1.y0 + 11.4, lnz, yaw));
  geoms.push(boxAt(7.0, 1.4, 1.4, lnx, T1.y0 + 13.0, lnz, yaw));
  addPart(id, name, 'entrances', geoms);
}
{
  // 76 numbered spectator entrances: recessed door panels in the ground arches.
  const axialBays = new Set([0, 20, 40, 60]);
  const geoms = [];
  for (let i = 0; i < BAYS; i++) {
    if (axialBays.has(i)) continue;
    const th = bayTheta(i);
    const f = bayFrame(th);
    const [wx, wz] = f(0, WALL_T / 2 - 0.9);
    geoms.push(boxAt(3.6, 6.4, 0.15, wx, T1.y0 + 3.2, wz, Math.atan2(wx, wz)));
  }
  addPart('entrances-numbered', 'Numbered spectator entrances (76)', 'entrances', geoms);
}
function arenaGate(xSign, id, name) {
  const geoms = [];
  const x = 44.5 * xSign;
  for (const dz of [-2.8, 2.8]) geoms.push(boxAt(1.6, 5.5, 1.6, x, 2.75, dz));
  geoms.push(boxAt(1.6, 1.6, 7.2, x, 6.3, 0));
  geoms.push(boxAt(2.2, 0.8, 8.0, x, 7.5, 0));
  addPart(id, name, 'entrances', geoms);
}
arenaGate(1, 'porta-triumphalis', 'Porta Triumphalis (east arena gate)');
arenaGate(-1, 'porta-libitinensis', 'Porta Libitinensis (west arena gate)');

// --- System: seating cavea. Aspect 0.72 for the cavea ellipse.
const KA = 0.72;
function seatRowsArc(aStart, yStart, n, depth, rise, th0, th1) {
  const geoms = [];
  let a = aStart;
  let y = yStart;
  for (let j = 0; j < n; j++) {
    geoms.push(arcBand(a + depth, a, y, y + rise, th0, th1, KA, 20));
    a += depth;
    y += rise;
  }
  return geoms;
}
// Tier geometry: primum 51.5/4.2 + 20 x (1.1, 0.85); secinf 73.5/21.2 + 8 x
// (1.0, 0.8); secsup 81.5/27.6 + 8 x (1.0, 0.8); wooden 89.5/34.0 + 5 x
// (0.9, 0.7). Ends: primum 73.5/21.2, secinf 81.5/27.6, secsup 89.5/34.0,
// wooden 94.0/37.5.
const SEAT_TIERS = [
  { key: 'primum', label: 'maenianum primum', a0: 51.5, y0: 4.2, n: 20, depth: 1.1, rise: 0.85 },
  { key: 'secinf', label: 'maenianum secundum inferius', a0: 73.5, y0: 21.2, n: 8, depth: 1.0, rise: 0.8 },
  { key: 'secsup', label: 'maenianum secundum superius', a0: 81.5, y0: 27.6, n: 8, depth: 1.0, rise: 0.8 },
  { key: 'wooden', label: 'wooden gallery', a0: 89.5, y0: 34.0, n: 5, depth: 0.9, rise: 0.7 },
];
{
  // Podium ring for senators, about 4 m above the arena.
  addPart('podium', 'Podium ring', 'seating', [ellBand(51.5, 45.2, 0, 4.2, KA, 0, 72)]);
}
for (const tier of SEAT_TIERS) {
  for (const q of QUAD_ARCS) {
    addPart(
      `seating-${tier.key}-${q.name.toLowerCase()}`,
      `${q.name} ${tier.label} wedges`,
      'seating',
      seatRowsArc(tier.a0, tier.y0, tier.n, tier.depth, tier.rise, q.th0, q.th1),
    );
  }
}
{
  // Imperial box (pulvinar) on the podium, north end of the minor axis,
  // split into the box itself and its canopy.
  addPart('imperial-box', 'Imperial box (pulvinar)', 'seating', [
    boxAt(9, 1.0, 6, 0, 4.7, -32.5),
    boxAt(9, 3.2, 0.6, 0, 6.8, -35.2),
  ]);
  addPart('pulvinar-canopy', 'Imperial box canopy', 'seating', [
    boxAt(9, 0.8, 6.5, 0, 9.0, -32.5),
    cylAt(0.35, 3.4, -3.6, 6.9, -30.2, 8),
    cylAt(0.35, 3.4, 3.6, 6.9, -30.2, 8),
    cylAt(0.35, 3.4, -3.6, 6.9, -34.8, 8),
    cylAt(0.35, 3.4, 3.6, 6.9, -34.8, 8),
  ]);
}
{
  // Box of the praefectus urbi, opposite side of the podium.
  const geoms = [boxAt(7, 1.0, 5, 0, 4.7, 32.5), boxAt(7, 2.6, 0.6, 0, 6.5, 35.2)];
  for (const x of [-2.8, 2.8]) geoms.push(cylAt(0.3, 2.8, x, 6.4, 30.6, 8));
  geoms.push(boxAt(7, 0.7, 5.5, 0, 8.2, 32.5));
  addPart('praefectus-box', 'Box of the praefectus urbi', 'seating', geoms);
}
{
  // Roof standing room: 5 m top wall with colonnade + flat deck behind.
  const geoms = [
    ellBand(95.0, 93.5, 37.5, 42.5, KA, 0, 72),
    ellBand(95.2, 89.5, 42.5, 43.1, KA, 0, 72),
  ];
  for (let k = 0; k < 36; k++) {
    const ph = (k / 36) * Math.PI * 2;
    geoms.push(cylAt(0.45, 4.6, 94.2 * Math.cos(ph), 39.8, 94.2 * KA * Math.sin(ph), 8));
  }
  addPart('roof-standing', 'Roof standing room', 'seating', geoms);
}
{
  // Praecinctiones and baltei: dividing walls at the tier junctions.
  addPart('praecinctiones', 'Praecinctiones and baltei', 'seating', [
    ellBand(73.5 + 0.25, 0, 21.2, 21.2 + 1.4, KA, 0.5, 72),
    ellBand(81.5 + 0.25, 0, 27.6, 27.6 + 1.4, KA, 0.5, 72),
  ]);
}

// --- System: circulation.
addPart('ambulatory-outer', 'Ground floor outer ambulatory', 'circulation', [
  ellBand(93.15, 88.7, 0, 0.6, K, 0, 96),
]);
addPart('ambulatory-inner', 'Ground floor inner ambulatory', 'circulation', [
  ellBand(86.7, 84.2, 0, 0.6, K, 0, 96),
]);
addPart('corridors-second-outer', 'Second floor outer corridor', 'circulation', [
  ellBand(93.15, 88.7, 10.4, 11.0, K, 0, 96),
]);
addPart('corridors-second-inner', 'Second floor inner corridor', 'circulation', [
  ellBand(86.7, 84.2, 10.4, 11.0, K, 0, 96),
]);
addPart('corridors-third-outer', 'Third floor outer corridor', 'circulation', [
  ellBand(93.15, 88.7, 20.9, 21.5, K, 0, 96),
]);
addPart('corridors-third-inner', 'Third floor inner corridor', 'circulation', [
  ellBand(86.7, 84.2, 20.9, 21.5, K, 0, 96),
]);
function grandStaircase(zSign) {
  // Monumental stair from the ground ambulatory (y=0) to the second floor
  // (y=10.4), running radially near the minor axis. Schematic.
  const geoms = [];
  const steps = 12;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const zA = zSign * (88 - 8 * t0);
    const zB = zSign * (88 - 8 * t1);
    const yT = 10.4 * t1;
    geoms.push(boxAt(7, 1.0, Math.abs(zB - zA) + 0.4, 0, yT - 0.5, (zA + zB) / 2));
  }
  return geoms;
}
addPart('grand-staircase-north', 'Grand staircase, north', 'circulation', grandStaircase(-1));
addPart('grand-staircase-south', 'Grand staircase, south', 'circulation', grandStaircase(1));
{
  // Vomitoria: passage mouths in fours at the two main tier junctions.
  const geoms = [];
  const slope = (r) => 4.2 + (r - 51.5) * ((37.5 - 4.2) / (94.0 - 51.5));
  for (const r of [73.5, 81.5]) {
    for (let k = 0; k < 16; k++) {
      const ph = (k / 16) * Math.PI * 2;
      geoms.push(
        boxAt(2.4, 3.0, 0.6, r * Math.cos(ph), slope(r) + 0.6, r * KA * Math.sin(ph), Math.atan2(Math.cos(ph), KA * Math.sin(ph))),
      );
    }
  }
  addPart('vomitoria', 'Vomitoria passages', 'circulation', geoms);
}
{
  // Radial stair flights climbing the cavea slope.
  const geoms = [];
  const slope = (r) => 4.2 + (r - 51.5) * ((37.5 - 4.2) / (94.0 - 51.5));
  for (let k = 0; k < 16; k++) {
    const ph = ((k + 0.5) / 16) * Math.PI * 2;
    const r1 = 54;
    const r2 = 91;
    geoms.push(
      beam(
        r1 * Math.cos(ph), slope(r1) + 0.25, r1 * KA * Math.sin(ph),
        r2 * Math.cos(ph), slope(r2) + 0.25, r2 * KA * Math.sin(ph),
        1.5, 0.25,
      ),
    );
  }
  addPart('radial-stairs', 'Radial stair flights', 'circulation', geoms);
}

// --- System: support structure.
for (const q of QUAD_ARCS) {
  // 20 radial support walls per quadrant, matching the arcade piers.
  const geoms = [];
  for (let i = 0; i < BAYS; i++) {
    if (quadOfBay(i) !== q.name) continue;
    const th = bayTheta(i);
    const dx = Math.cos(th);
    const dz = KA * Math.sin(th);
    const n = Math.hypot(dx, dz);
    const yaw = Math.atan2(-dz / n, dx / n);
    const g = new THREE.BoxGeometry(30, 16, 1.4);
    g.rotateY(yaw);
    g.translate((68 * dx) / n, 8, (68 * dz) / n);
    geoms.push(g);
  }
  addPart(`radial-walls-${q.name.toLowerCase()}`, `${q.name} radial support walls (20)`, 'support', geoms);
}
{
  // Concentric annular support walls beneath the seating, split inner/outer.
  addPart('annular-wall-inner', 'Inner annular support wall', 'support', [
    ellBand(59, 0, 0, 12, KA, 1.5, 72),
  ]);
  addPart('annular-wall-outer', 'Outer annular support wall', 'support', [
    ellBand(75, 0, 0, 20, KA, 1.5, 72),
  ]);
}
{
  // Second inner wall, 5.80 m inside the outer wall.
  addPart('inner-wall-second', 'Second inner wall', 'support', [
    ellBand(A - 5.8, 0, 1, 24, K, 2.0, 96),
  ]);
}
{
  // Third inner wall, 4.50 m inside the second.
  addPart('inner-wall-third', 'Third inner wall', 'support', [
    ellBand(A - 5.8 - 4.5, 0, 1, 13, K, 2.0, 96),
  ]);
}
{
  // Vespasian's inner travertine pressure skeleton, to the second story,
  // split into east and west halves.
  const skelE = [];
  const skelW = [];
  for (let k = 0; k < 40; k++) {
    const ph = (k / 40) * Math.PI * 2;
    const x = 80 * Math.cos(ph);
    (x >= 0 ? skelE : skelW).push(boxAt(2.2, 19, 2.2, x, 10.5, 80 * K * Math.sin(ph)));
  }
  addPart('pressure-skeleton-east', 'East travertine pressure skeleton', 'support', skelE);
  addPart('pressure-skeleton-west', 'West travertine pressure skeleton', 'support', skelW);
}

// --- System: arena. Aspect 87:55 for the arena ellipse.
const KARENA = 55 / 87;
for (const q of QUAD_ARCS) {
  addPart(`arena-floor-${q.name.toLowerCase()}`, `${q.name} arena floor planks`, 'arena', [
    arcDisc(41.5, 0, 0.4, q.th0, q.th1, KARENA, 24),
  ]);
}
addPart('arena-sand', 'Arena sand surface', 'arena', [ellDisc(41.5, 0.4, 0.55, KARENA, 72)]);
addPart('arena-wall', 'Arena wall', 'arena', [ellBand(45.2, 43.5, 0, 5, KARENA, 0, 72)]);
addPart('arena-fence', 'Arena fence', 'arena', [
  ellBand(44.3, 43.5, 5, 6.0, KARENA, 0, 72),
]);
addPart('marble-passage', 'Marble passage behind the fence', 'arena', [
  ellBand(48.0, 44.3, 4.2, 4.7, KARENA, 0, 72),
]);

// --- System: hypogeum (below y = 0, under the arena).
{
  // Central gallery along the major axis, flanked by substructure walls.
  addPart('hypogeum-central-corridor', 'Hypogeum central corridor', 'hypogeum', [
    boxAt(78, 6, 1, 0, -3, -4),
    boxAt(78, 6, 1, 0, -3, 4),
  ]);
}
{
  // Side chambers north and south of the central corridor.
  const north = [boxAt(78, 6, 1, 0, -3, -20), boxAt(78, 6, 1, 0, -3, -12)];
  const south = [boxAt(78, 6, 1, 0, -3, 12), boxAt(78, 6, 1, 0, -3, 20)];
  for (let k = 0; k < 8; k++) {
    const x = -35 + k * 10;
    north.push(boxAt(1, 6, 16, x, -3, -12));
    south.push(boxAt(1, 6, 16, x, -3, 12));
  }
  addPart('hypogeum-chambers-north', 'North hypogeum chambers', 'hypogeum', north);
  addPart('hypogeum-chambers-south', 'South hypogeum chambers', 'hypogeum', south);
}
function animalDens(zc, zSign) {
  // Rows of caged dens for wild beasts. Schematic.
  const geoms = [];
  for (let k = 0; k < 8; k++) {
    const x = -28 + k * 8;
    geoms.push(boxAt(4, 3, 3, x, -4.5, zc));
    for (const bx of [-1.2, 0, 1.2]) {
      geoms.push(boxAt(0.18, 2.6, 0.18, x + bx, -4.6, zc + zSign * 1.6));
    }
  }
  return geoms;
}
addPart('hypogeum-dens-north', 'North animal dens', 'hypogeum', animalDens(-16, -1));
addPart('hypogeum-dens-south', 'South animal dens', 'hypogeum', animalDens(16, 1));
{
  // Gladiator passages running out toward the arena gates, east and west.
  addPart('hypogeum-gladiator-east', 'East gladiator passage', 'hypogeum', [
    boxAt(24, 3, 4, 40, -4.5, 0),
  ]);
  addPart('hypogeum-gladiator-west', 'West gladiator passage', 'hypogeum', [
    boxAt(24, 3, 4, -40, -4.5, 0),
  ]);
}
{
  // Lower level corridors of the two-level tunnel network.
  const geoms = [];
  for (const z of [-10, 0, 10]) geoms.push(boxAt(70, 2.5, 3, 0, -7.75, z));
  for (const x of [-24, -8, 8, 24]) geoms.push(boxAt(3, 2.5, 40, x, -7.75, 0));
  addPart('hypogeum-corridors-lower', 'Lower tunnel corridors', 'hypogeum', geoms);
}
{
  // Ramps connecting the two tunnel levels.
  const geoms = [];
  for (const sx of [-1, 1]) for (const z of [-10, 10]) {
    geoms.push(beam(sx * 28, -6.5, z, sx * 20, -1, z, 3, 2.5));
  }
  addPart('hypogeum-ramps', 'Tunnel connecting ramps', 'hypogeum', geoms);
}
for (const q of QUAD_ARCS) {
  // 20 vertical shafts per quadrant.
  const geoms = [];
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 8; j++) {
      const x = -36 + i * 8;
      const z = -21 + j * 6;
      const qq = x >= 0 ? (z < 0 ? 'NE' : 'SE') : (z < 0 ? 'NW' : 'SW');
      if (qq !== q.name) continue;
      geoms.push(boxAt(1.2, 6, 1.2, x, -3, z));
    }
  }
  addPart(`hypogeum-shafts-${q.name.toLowerCase()}`, `${q.name} vertical shafts (20)`, 'hypogeum', geoms);
}
{
  // Elevator and pulley machinery: winch drums and rigging posts.
  const drums = [];
  const posts = [];
  for (let k = 0; k < 8; k++) {
    const x = -28 + k * 8;
    const drum = new THREE.CylinderGeometry(0.8, 0.8, 3, 10);
    drum.rotateX(Math.PI / 2);
    drum.translate(x, -4.5, 0);
    drums.push(drum);
    posts.push(boxAt(0.4, 3, 0.4, x, -4.5, -1.8));
    posts.push(boxAt(0.4, 3, 0.4, x, -4.5, 1.8));
  }
  addPart('hypogeum-winch-drums', 'Elevator winch drums', 'hypogeum', drums);
  addPart('hypogeum-pulley-rigging', 'Pulley rigging posts', 'hypogeum', posts);
}
{
  // Hegmata: hinged platforms under trapdoors in the arena floor, east/west.
  const hegE = [];
  const hegW = [];
  for (let i = 0; i < 6; i++) {
    for (const z of [-10, 10]) {
      const g = new THREE.BoxGeometry(3, 0.15, 2);
      g.rotateX(0.15);
      g.translate(-30 + i * 12, 0.55, z);
      (i < 3 ? hegW : hegE).push(g);
    }
  }
  addPart('hegmata-east', 'East hegmata platforms', 'hypogeum', hegE);
  addPart('hegmata-west', 'West hegmata platforms', 'hypogeum', hegW);
}
{
  // Axial subterranean passages, split by axis.
  addPart('hypogeum-axial-major', 'Major axis subterranean passage', 'hypogeum', [
    boxAt(110, 3, 4, 0, -4.5, 0),
  ]);
  addPart('hypogeum-axial-minor', 'Minor axis subterranean passage', 'hypogeum', [
    boxAt(4, 3, 70, 0, -4.5, 0),
  ]);
}
{
  // Cryptoporticus of Commodus: vaulted underground passage, east side.
  addPart('cryptoporticus', 'Cryptoporticus of Commodus', 'hypogeum', [
    boxAt(3.5, 3, 60, 35, -4.5, 0),
  ]);
}

// --- System: materials. Representative samples on the ground, south side.
const MAT_Z = 100;
addPart('mat-travertine', 'Travertine block sample', 'materials', [
  boxAt(4, 1.2, 2, -30, 0.6, MAT_Z),
  boxAt(4, 1.2, 2, -30, 1.8, MAT_Z),
  boxAt(2.6, 1.2, 2, -30, 3.0, MAT_Z),
  boxAt(0.15, 0.15, 2.2, -31.2, 1.2, MAT_Z),
  boxAt(0.15, 0.15, 2.2, -28.8, 1.2, MAT_Z),
  boxAt(0.15, 0.15, 2.2, -31.2, 2.4, MAT_Z),
  boxAt(0.15, 0.15, 2.2, -28.8, 2.4, MAT_Z),
]);
addPart('mat-brick', 'Brick faced concrete sample', 'materials', [
  boxAt(4, 3, 1.2, -10, 1.5, MAT_Z),
  boxAt(4.2, 3.2, 0.2, -10, 1.6, MAT_Z + 0.7),
]);
addPart('mat-tuff', 'Tuff and sperone sample', 'materials', [
  boxAt(2.4, 1.6, 1.8, 10, 0.8, MAT_Z),
  boxAt(2.0, 1.4, 1.6, 12.2, 0.7, MAT_Z + 0.4),
  boxAt(1.8, 1.2, 1.5, 10.8, 2.2, MAT_Z - 0.2),
]);
addPart('mat-marble', 'Marble seat sample', 'materials', [
  boxAt(4, 0.6, 2.5, 30, 0.3, MAT_Z),
  boxAt(4, 0.6, 1.6, 30, 0.9, MAT_Z - 0.4),
  boxAt(4, 0.6, 0.9, 30, 1.5, MAT_Z - 0.75),
]);

// ---------------------------------------------------------------- metadata
// Schematic travertine-and-marble palette; only the Eiffel Tower is dark.
const SYSTEMS = [
  { id: 'facade', name: 'Outer Facade', color: '#E3CF9F', description: 'Travertine arcade tiers: Doric, Ionic, and Corinthian bays around the full ellipse.' },
  { id: 'attic', name: 'Attic and Velarium', color: '#C69A5B', description: 'Upper attic story, crowning cornice, and the retractable velarium awning.' },
  { id: 'entrances', name: 'Main Entrances', color: '#9C6B4F', description: 'Four unnumbered axial entrances and 76 numbered spectator entrances.' },
  { id: 'seating', name: 'Seating Cavea', color: '#EDEDED', description: 'Tiered marble seating for about 50,000 spectators, strictly ordered by class.' },
  { id: 'circulation', name: 'Circulation', color: '#8E9AA8', description: 'Annular corridors, vomitoria, and stairs that moved the crowd.' },
  { id: 'support', name: 'Support Structure', color: '#A9503C', description: 'Radial and annular walls carrying the cavea.' },
  { id: 'arena', name: 'Arena', color: '#D9A441', description: 'Wooden sand covered floor and its surrounding wall.' },
  { id: 'hypogeum', name: 'Hypogeum', color: '#6F6459', description: "Domitian's subterranean tunnels, cages, and lifting machinery." },
  { id: 'materials', name: 'Materials', color: '#5D7A8C', description: "Representative samples of the building's key materials." },
];
const EXPLANATIONS = {
  'bronze shields (clipea)': 'Bronze shields (clipea) fixed in the spaces between the attic pilasters, directly beneath the uppermost cornice. Their exact positions are schematic.',
  'velarium canopy': 'The velarium was a canvas covered, net like structure made of ropes with a hole in the center. It covered two thirds of the arena and sloped down toward the center to catch the wind and give the audience a breeze. The fabric shape is schematic.',
  'stylobate base ring': 'The outer wall stands on a raised two step travertine stylobate.',
  'travertine pavement and cippi': 'A 17.50 m wide travertine pavement surrounds the building; five stone cippi posts still stand on the east side, 18 m out from the perimeter.',
  'entablature and cornice': 'Entablatures of 2.35 m and 2.10 m and attic bands of 1.95 m and 2.10 m separate the tiers; the crowning cornice carried the mast sockets of the velarium.',
  'north axial entrance portal': 'The northern axial entrance was reserved for the Roman Emperor and his aides. Its arches were wider and more highly ornamented than the rest, and a wide passage led from it directly to the imperial box (pulvinar) on the podium.',
  'north entrance arch': 'The decorated arch framing the northern imperial entrance. All four axial entrances were richly decorated with painted stucco reliefs, of which fragments survive.',
  'south axial entrance portal': 'The southern axial entrance, at the south end of the minor axis, served the imperial family. Like the northern entrance, its arches were wider and more highly ornamented than the rest.',
  'south entrance arch': 'The decorated arch framing the southern imperial entrance, richly decorated with painted stucco reliefs like the other three axial entrances.',
  'east axial entrance': 'The major axis entrances led directly into the arena, admitting processions and equipment.',
  'west axial entrance': 'The western major axis entrance led directly into the arena.',
  'numbered spectator entrances (76)': '76 of the 80 ground arches were numbered entrances for ordinary spectators; entrances XXIII to LIIII still survive on the north side.',
  'porta triumphalis (east arena gate)': 'The Porta Triumphalis, the eastern gate of the arena at the end of the major axis, through which gladiators and wild animals entered and by which victorious combatants departed.',
  'porta libitinensis (west arena gate)': 'The Porta Libitinensis, the western gate of the arena, through which the mortally wounded and the dead were carried out.',
  'podium ring': "Senators sat on a marble podium raised about 4 m above the arena, fronted by a bronze balustrade.",
  'imperial box (pulvinar)': 'The pulvinar, the imperial box, on the podium at the north end of the minor axis, reached by a wide passage from the northern entrance.',
  'imperial box canopy': 'The canopy sheltering the imperial box (pulvinar). Its form is schematic.',
  'box of the praefectus urbi': "The prefect of the city had his own box on the podium, opposite the imperial box.",
  'roof standing room': 'About 5,000 of the poorest spectators, the pullati, stood on the flat roof behind a 5 m colonnaded wall.',
  'praecinctiones and baltei': 'Horizontal walkways (praecinctiones) and low parapet walls (baltei) divided the seating tiers by social class.',
  'ground floor outer ambulatory': 'The outer of two lofty arched corridors encircling the building at ground level between the outer wall and the third wall.',
  'ground floor inner ambulatory': 'The inner of the two ground floor annular corridors serving the seating.',
  'second floor outer corridor': 'The outer annular corridor of the second story, distributing spectators to the middle seating tiers.',
  'second floor inner corridor': 'The inner corridor of the second story, divided into an upper and a lower section, with ingeniously arranged flights of steps leading to the topmost story.',
  'third floor outer corridor': 'The outer annular corridor of the third story, serving the upper seats and the wooden gallery.',
  'third floor inner corridor': 'The inner corridor of the third story, with ingeniously arranged flights of steps leading to the topmost story and the upper part of the second tier of seats.',
  'grand staircase, north': 'A monumental stair near the northern axial entrance, connecting the ground floor ambulatory with the upper corridors. Its exact form and routing are schematic.',
  'grand staircase, south': 'A monumental stair near the southern axial entrance, connecting the ground floor ambulatory with the upper corridors. Its exact form and routing are schematic.',
  'vomitoria passages': 'Stair passages were arranged in fours and could disgorge the crowd in only a few minutes; the name vomitoria comes from this spewing forth.',
  'radial stair flights': 'Radial stair flights climbed the cavea slope between the wedge shaped seating sections.',
  'inner annular support wall': 'The inner of the concentric annular walls tying the radial walls together beneath the seating slope. Its exact radius is schematic.',
  'outer annular support wall': 'The outer of the concentric annular walls tying the radial walls together beneath the seating slope. Its exact radius is schematic.',
  'second inner wall': 'The second inner wall stands 5.80 m inside the outer wall.',
  'third inner wall': 'The third inner wall stands 4.50 m inside the second.',
  'arena sand surface': 'The sand (harena, the origin of the word arena) strewn over the wooden arena floor. The surface is schematic.',
  'arena wall': 'A 5 m high wall ringed the arena, above which the seating rose.',
  'arena fence': 'A fence built to protect the spectators from the attacks of the wild beasts, running all round the arena.',
  'marble passage behind the fence': "A narrow marble paved passage behind the arena fence, below the senators' podium.",
  'hypogeum central corridor': 'The central gallery of the hypogeum, running along the major axis between substructure walls 5.50 to 6.08 m high standing on a brick pavement.',
  'north hypogeum chambers': 'North side chambers of the hypogeum, where gladiators and animals were held before contests. The internal room layout is a simplified schematic grid.',
  'south hypogeum chambers': 'South side chambers of the hypogeum, where gladiators and animals were held before contests. The internal room layout is a simplified schematic grid.',
  'north animal dens': 'North dens for wild beasts in the hypogeum substructures. Their exact positions are schematic.',
  'south animal dens': 'South dens for wild beasts in the hypogeum substructures. Their exact positions are schematic.',
  'east gladiator passage': "East gladiator passage: the hypogeum held gladiators before contests, and tunnels linked it to the outside, including the gladiators' barracks at the Ludus Magnus to the east. Passage routing is schematic.",
  'west gladiator passage': 'West gladiator passage: the hypogeum held gladiators before contests, and tunnels linked it to points outside the building. Passage routing is schematic.',
  'lower tunnel corridors': "The lower level corridors of Domitian's two level subterranean tunnel network.",
  'tunnel connecting ramps': 'Ramps connecting the two levels of the hypogeum tunnel network. Their exact routing is schematic.',
  'elevator winch drums': 'Slave powered winch drums that worked the elevators and trapdoors of the hypogeum.',
  'pulley rigging posts': 'Elevators and pulleys that raised and lowered scenery, props, and caged animals to the surface for release.',
  'major axis subterranean passage': 'A subterranean passage on the line of the major axis, by which the hypogeum substructures were entered.',
  'minor axis subterranean passage': 'A subterranean passage on the line of the minor axis, by which the hypogeum substructures were entered.',
  'cryptoporticus of commodus': 'The cryptoporticus of Commodus was a vaulted underground passage linking the imperial areas to the arena.',
  'travertine block sample': 'The outer wall used over 100,000 cubic meters of travertine set without mortar, held by 300 tons of iron clamps. Representative sample shown.',
  'brick faced concrete sample': 'Inner walls are concrete with and without brick facing. Representative sample shown.',
  'tuff and sperone sample': 'Tuff and sperone, volcanic stones, were used in the lower parts of the inner walls. Representative sample shown.',
  'marble seat sample': "Marble faced the seats of the cavea and the podium. Representative sample shown.",
};
// Facade bay groups: 8 groups of 10 per tier, with axial-bay notes on the
// ground tier.
const AXIAL_NOTE = {
  '1-10': ' It includes the unnumbered eastern axial bay, which led directly into the arena.',
  '21-30': ' It includes the unnumbered southern axial bay, reserved for the imperial family with wider and more ornamented arches.',
  '41-50': ' It includes the unnumbered western axial bay, which led directly into the arena.',
  '61-70': ' It includes the unnumbered northern axial bay, reserved for the Emperor and his aides.',
};
for (let g = 0; g < 8; g++) {
  const a = g * 10 + 1;
  const b = (g + 1) * 10;
  EXPLANATIONS[`ground arcade bays ${a}-${b} (doric)`] =
    `Ground arcade bays ${a}-${b} (Doric): arches 7.05 m high and 4.20 m wide on 2.40 m piers, framed by engaged Doric columns. Ten of the eighty ground floor bays.${AXIAL_NOTE[`${a}-${b}`] || ''}`;
  EXPLANATIONS[`second arcade bays ${a}-${b} (ionic)`] =
    `Second arcade bays ${a}-${b} (Ionic): arches 6.45 m high under a 2.10 m entablature, framed by Ionic half columns. Ten of the eighty bays; the second and third arcades together once framed about 160 statues of divinities and mythological figures.`;
  EXPLANATIONS[`third arcade bays ${a}-${b} (corinthian)`] =
    `Third arcade bays ${a}-${b} (Corinthian): arches 6.40 m high in the Corinthian order. Ten of the eighty bays.`;
}
// Attic quadrants.
for (const q of ['NE', 'NW', 'SE', 'SW']) {
  const ql = q.toLowerCase();
  EXPLANATIONS[`${ql} attic pilaster bays`] =
    `${q} attic pilaster bays: flat Corinthian pilasters adorning the solid upper wall of the attic, standing in place of the half columns of the lower arcades. Pilaster spacing is schematic.`;
  EXPLANATIONS[`${ql} attic window panels`] =
    `${q} attic window panels: small rectangular windows pierce the 2.10 m attic band over every second arch, with a second row cut between every second pair of pilasters above. Window positions are schematic.`;
  EXPLANATIONS[`${ql} velarium mast corbels (60)`] =
    `${q} velarium mast corbels: sixty of the 240 stone corbels ringed around the top of the attic, three socketed consoles between each pair of pilasters, carrying the masts of the retractable velarium.`;
  EXPLANATIONS[`${ql} velarium masts (60)`] =
    `${q} velarium masts: sixty of the 240 masts that carried the retractable canvas awning, worked by sailors specially enlisted from the naval headquarters at Misenum. Mast angles and rigging are schematic.`;
}
// Seating wedge quadrants.
const SEAT_EXPL = {
  primum: (q) => `${q} wedges of the maenianum primum: about 20 rows of marble covered seats reserved for the knightly class (equites). The seating was divided into wedge shaped sections (cunei) by steps and aisles, and each seat could be designated by its row, wedge, and number. The four way split is schematic.`,
  secinf: (q) => `${q} wedges of the maenianum secundum inferius: the lower half of the middle tier, about 8 of its 16 rows, for wealthy citizens. The four way split is schematic.`,
  secsup: (q) => `${q} wedges of the maenianum secundum superius: the upper half of the middle tier, for poor citizens. The four way split is schematic.`,
  wooden: (q) => `${q} wedges of the wooden top gallery (maenianum summum in ligneis), added by Domitian for the common poor, slaves, and women. The four way split is schematic.`,
};
for (const tier of SEAT_TIERS) {
  for (const q of QUAD_ARCS) {
    EXPLANATIONS[`${q.name.toLowerCase()} ${tier.label} wedges`] = SEAT_EXPL[tier.key](q.name);
  }
}
// Support, arena, and hypogeum quadrant groups.
for (const q of ['NE', 'NW', 'SE', 'SW']) {
  const ql = q.toLowerCase();
  EXPLANATIONS[`${ql} radial support walls (20)`] =
    `${q} radial support walls: twenty of the eighty radiating walls that matched the lower arcade piers in number and carried the sloping cavea floor with its marble seats.`;
  EXPLANATIONS[`${ql} arena floor planks`] =
    `${q} planks of the wooden arena floor, 83 by 48 m, resting on the hypogeum substructures and strewn with sand. The quadrant split is schematic.`;
  EXPLANATIONS[`${ql} vertical shafts (20)`] =
    `${q} vertical shafts: twenty of the eighty shafts that gave caged animals and scenery instant access to the arena floor.`;
}
EXPLANATIONS['east travertine pressure skeleton'] =
  "East half of Vespasian's inner travertine skeleton, which carried the greatest structural loads and rose no higher than the second story. Column positions are schematic.";
EXPLANATIONS['west travertine pressure skeleton'] =
  "West half of Vespasian's inner travertine skeleton, which carried the greatest structural loads and rose no higher than the second story. Column positions are schematic.";
EXPLANATIONS['east hegmata platforms'] =
  'East hinged hegmata platforms, which tilted up through trapdoors to deliver animals, scenery, and even elephants to the arena.';
EXPLANATIONS['west hegmata platforms'] =
  'West hinged hegmata platforms, which tilted up through trapdoors to deliver animals, scenery, and even elephants to the arena.';

// ---------------------------------------------------------------- serialize
for (const p of parts) {
  if (!EXPLANATIONS[p.name.toLowerCase()]) throw new Error(`Missing explanation for ${p.id} (${p.name})`);
}

let offset = 0;
const records = [];
let triangles = 0;
for (const p of parts) {
  const merged = mergeGeometries(
    p.geoms.map((g) => {
      const gg = g.index ? g.toNonIndexed() : g;
      gg.deleteAttribute('uv');
      return gg;
    }),
    false,
  );
  if (!merged) throw new Error(`Could not merge ${p.id}`);
  merged.computeVertexNormals();
  merged.scale(S, S, S);
  merged.computeBoundingBox();
  const pos = merged.attributes.position.array;
  const nor = merged.attributes.normal.array;
  // Non-indexed merge: synthesize a sequential index so the atlas format stays uniform.
  let idx = merged.index ? merged.index.array : null;
  if (!idx) {
    idx = new Uint32Array(pos.length / 3);
    for (let i = 0; i < idx.length; i++) idx[i] = i;
  }
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
fs.writeFileSync(path.join(outDir, 'colosseum-0.bin'), buffer);
// The repo's validate-atlas.mjs resolves chunk files against public/models/
// (basename only), so keep a copy there too; the app uses the chunk url below.
fs.copyFileSync(path.join(outDir, 'colosseum-0.bin'), path.join(outDir, '..', 'colosseum-0.bin'));

const explanations = {};
for (const r of records) explanations[r.part.name.toLowerCase()] = EXPLANATIONS[r.part.name.toLowerCase()];

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Colosseum, Rome',
  title: 'Colosseum',
  location: 'Rome, Italy',
  blurb:
    "The Flavian Amphitheatre in Rome, modeled in its complete original form as dedicated in AD 80, including Domitian's hypogeum and the wooden top gallery. Explore 128 components across 9 systems, from the 80 travertine arches to the 240 velarium mast corbels.",
  sourceUrls: [
    { label: 'Colosseum, Wikipedia', url: 'https://en.wikipedia.org/wiki/Colosseum' },
    {
      label: 'Colosseum (Flavian Amphitheatre), Ancient Rome Live',
      url: 'https://ancientromelive.org/colosseum-flavian-amphitheatre/',
    },
    { label: 'Colosseum (Rome, 80), Structurae', url: 'https://structurae.net/en/structures/colosseum' },
    { label: 'Inside the Colosseum, thecolosseum.org', url: 'https://www.thecolosseum.org/inside/' },
    { label: 'Colosseum, ancient-history-sites.com', url: 'https://www.ancient-history-sites.com/sites/colosseum/' },
  ],
  systems: SYSTEMS,
  explanations,
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
  chunks: [{ url: '/models/colosseum/colosseum-0.bin', bytes: offset }],
  triangles,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
