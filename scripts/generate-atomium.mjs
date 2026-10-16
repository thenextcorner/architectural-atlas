// Procedural Atomium for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Atomium in code and writes it
// in the atlas binary format:
//   public/models/atomium/atlas.json
//   public/models/atomium/atomium-0.bin
//
// Sourced dimensions and facts (all verified: task research notes plus the
// Wikipedia "Atomium" article, opened 2026-10-10, and skydb.net):
//   landmark modernist building in Brussels, Belgium, centerpiece of the
//   1958 Brussels World's Fair (Expo 58) on the Heysel/Heizel Plateau in
//   Laeken; designed by engineer Andre Waterkeyn with architects Andre
//   and Jean Polak as a tribute to scientific progress and a symbol of
//   Belgian engineering skill; 102 m tall (102.705 m in one heritage
//   survey); nine 18 m diameter spheres, stainless-steel clad (originally
//   aluminium clad, replaced with stainless steel in the 2004 to 2006
//   renovation); the spheres form an iron (ferrite) crystal unit cell
//   magnified 165 billion times; 20 tubes of 3 m diameter: 12 along the
//   cube edges and 8 from the vertices to the central sphere, enclosing
//   stairs, escalators and a lift; six spheres open to the public (the
//   three on the central axis and the three on the lower outer edges)
//   with exhibit halls and public spaces; the top sphere holds a
//   panoramic restaurant (about 140 guests); the three upper outer
//   spheres lack vertical support and are not open to the public, for
//   safety; the lift climbs at 5 m/s, carries 22 people and reaches the
//   top in 23 seconds (fastest lift in Europe in 1958); the longest
//   escalator in the oblique tubes measures 35 m; construction took 18
//   months and the building was completed less than a month before Expo
//   58 opened on 17 April 1958; originally intended as a temporary
//   structure, kept because of its popularity; the original design had no
//   supports under the lower spheres, but wind-tunnel tests showed an
//   80 km/h wind would topple it, so support columns were added;
//   completely renovated 2004 to 2006 by Jacques Delens and BESIX,
//   closed October 2004, officially reopened by then Prince Philippe on
//   14 February 2006 and opened to the public on 18 February 2006;
//   the renovation added LED meridian lighting on the spheres, interior
//   lighting by German designer Ingo Maurer, a new reception pavilion
//   with a boomerang-shaped roof, and a redeveloped concrete esplanade
//   with continuous benches; Belgium issued a 2 euro commemorative coin
//   for the renovation in 2006 (5 million coins, issued 10 April 2006);
//   2,400 tonnes of steel; the name joins "atom" and "aluminium"; the
//   city's most popular tourist attraction, a museum, art center and
//   cultural destination; coordinates about 50.8947 N, 4.3411 E
//   (Wikipedia infobox); Wikidata Q180901 (verified via the Wikipedia
//   page info; the Q178 figure in the task brief was wrong).
// Schematic (not sourced, never stated as fact in the UI): cube edge of
// 47 m (chosen so the vertical body diagonal of about 81.4 m plus two
// 9 m radii lands the total height at 102 m); the elevation of the base
// sphere; tripod leg counts, angles, head plates and base pads;
// foundation pier and raft; cladding panel subdivision (four per sphere),
// window band heights, LED meridian layout; which tubes hold which
// escalator or stair; elevator shaft and car form; restaurant interior
// layout; reception pavilion form, ticket desks, canopy and entrance
// stairs; esplanade extent.
//
// Coordinate frame: y = up; the cube's body diagonal is vertical, so the
// top and bottom spheres sit on the y axis. All dimensions in meters.
//
// Granularity: 143 named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-atomium.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'atomium');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (102 m) maps to 2.4 units.
const S = 2.4 / 102;

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
// Cylinder between two points (used for the 3 m tubes).
function tube(a, b, r, seg = 16) {
  const va = a.clone();
  const vb = b.clone();
  const dir = new THREE.Vector3().subVectors(vb, va);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
  );
  const mid = new THREE.Vector3().addVectors(va, vb).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}
// Joint collar ring at the midpoint of a tube.
function collar(a, b) {
  const dir = new THREE.Vector3().subVectors(b, a).normalize();
  const g = new THREE.TorusGeometry(1.62, 0.22, 8, 24);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir),
  );
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}
// Slanted box rotated about Y (for the boomerang roof).
function slabY(w, t, l, angY, x, y, z) {
  const g = new THREE.BoxGeometry(w, t, l);
  g.rotateY(angY);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- crystal frame
const E = 47; // cube edge, schematic
const R = 9; // sphere radius, verified
const Y0 = 52.3; // elevation chosen so the total height is 102 m, schematic
const q = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(1, 1, 1).normalize(),
  new THREE.Vector3(0, 1, 0),
);
const H = E / 2;
const C = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(q).add(new THREE.Vector3(0, Y0, 0));
const V = {
  T: C(H, H, H),
  U1: C(H, H, -H),
  U2: C(H, -H, H),
  U3: C(-H, H, H),
  C0: C(0, 0, 0),
  L1: C(-H, -H, H),
  L2: C(-H, H, -H),
  L3: C(H, -H, -H),
  B: C(-H, -H, -H),
};

const SPHERES = [
  { id: 'top-sphere', key: 'T', name: 'Top sphere' },
  { id: 'upper-sphere-1', key: 'U1', name: 'Upper sphere 1' },
  { id: 'upper-sphere-2', key: 'U2', name: 'Upper sphere 2' },
  { id: 'upper-sphere-3', key: 'U3', name: 'Upper sphere 3' },
  { id: 'center-sphere', key: 'C0', name: 'Center sphere' },
  { id: 'lower-sphere-1', key: 'L1', name: 'Lower sphere 1' },
  { id: 'lower-sphere-2', key: 'L2', name: 'Lower sphere 2' },
  { id: 'lower-sphere-3', key: 'L3', name: 'Lower sphere 3' },
  { id: 'bottom-sphere', key: 'B', name: 'Bottom sphere' },
];
const centerOf = (key) => V[key];

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// Escalator and stair tube assignments, filled in during part building and
// used by the explanations below.
const explanations_escalator_where = [];
const explanations_stair_where = [];

// --- Spheres: nine 18 m shells on the cube vertices and body center.
for (const s of SPHERES) {
  const c = centerOf(s.key);
  const shell = new THREE.SphereGeometry(R, 24, 18);
  shell.translate(c.x, c.y, c.z);
  addPart(s.id, s.name, 'spheres', [shell]);
}

// --- Cladding: four stainless-steel panels per sphere (36), window
// bands on the eight non-top spheres (8), LED meridian rings (9).
for (const s of SPHERES) {
  const c = centerOf(s.key);
  for (let k = 0; k < 4; k++) {
    const panel = new THREE.SphereGeometry(R + 0.06, 8, 4, (k * Math.PI) / 2, Math.PI / 2, 0.12, Math.PI - 0.24);
    panel.translate(c.x, c.y, c.z);
    addPart(`${s.id}-panel-${k + 1}`, `${s.name} cladding panel ${k + 1}`, 'cladding', [panel]);
  }
  if (s.key !== 'T') {
    const band = new THREE.CylinderGeometry(R + 0.08, R + 0.08, 2.6, 24, 1, true);
    band.translate(c.x, c.y, c.z);
    addPart(`${s.id}-window-band`, `${s.name} window band`, 'cladding', [band]);
  }
  const meridians = [];
  for (const rot of [0, Math.PI / 2]) {
    const ring = new THREE.TorusGeometry(R + 0.04, 0.09, 6, 48);
    ring.rotateY(rot);
    ring.translate(c.x, c.y, c.z);
    meridians.push(ring);
  }
  addPart(`${s.id}-led-meridians`, `${s.name} LED meridians`, 'cladding', meridians);
}

// --- Edge tubes: twelve 3 m tubes along the cube edges.
const EDGE_TUBES = [
  ['T', 'U1', 'top to upper sphere 1'],
  ['T', 'U2', 'top to upper sphere 2'],
  ['T', 'U3', 'top to upper sphere 3'],
  ['U1', 'L2', 'upper sphere 1 to lower sphere 2'],
  ['U1', 'L3', 'upper sphere 1 to lower sphere 3'],
  ['U2', 'L1', 'upper sphere 2 to lower sphere 1'],
  ['U2', 'L3', 'upper sphere 2 to lower sphere 3'],
  ['U3', 'L1', 'upper sphere 3 to lower sphere 1'],
  ['U3', 'L2', 'upper sphere 3 to lower sphere 2'],
  ['B', 'L1', 'bottom to lower sphere 1'],
  ['B', 'L2', 'bottom to lower sphere 2'],
  ['B', 'L3', 'bottom to lower sphere 3'],
];
EDGE_TUBES.forEach(([a, b, label], i) => {
  const n = i + 1;
  addPart(`edge-tube-${n}`, `Edge tube ${n} (${label})`, 'tubes-edge', [tube(centerOf(a), centerOf(b), 1.5)]);
  addPart(`edge-tube-${n}-collar`, `Edge tube ${n} collar`, 'tubes-edge', [collar(centerOf(a), centerOf(b))]);
});

// --- Diagonal tubes: eight tubes from the vertices to the center.
const DIAG_TUBES = [
  ['T', 'C0', 'top to center'],
  ['B', 'C0', 'bottom to center'],
  ['U1', 'C0', 'upper sphere 1 to center'],
  ['U2', 'C0', 'upper sphere 2 to center'],
  ['U3', 'C0', 'upper sphere 3 to center'],
  ['L1', 'C0', 'lower sphere 1 to center'],
  ['L2', 'C0', 'lower sphere 2 to center'],
  ['L3', 'C0', 'lower sphere 3 to center'],
];
DIAG_TUBES.forEach(([a, b, label], i) => {
  const n = i + 1;
  addPart(`diagonal-tube-${n}`, `Diagonal tube ${n} (${label})`, 'tubes-diagonal', [tube(centerOf(a), centerOf(b), 1.5)]);
  addPart(`diagonal-tube-${n}-collar`, `Diagonal tube ${n} collar`, 'tubes-diagonal', [collar(centerOf(a), centerOf(b))]);
});

// --- Supports: three tripods under the lower spheres (added after
// wind-tunnel tests), plus the foundation pier and raft.
const TRIPOD_SPHERES = [
  { n: 1, key: 'L1', name: 'lower sphere 1' },
  { n: 2, key: 'L2', name: 'lower sphere 2' },
  { n: 3, key: 'L3', name: 'lower sphere 3' },
];
for (const { n, key } of TRIPOD_SPHERES) {
  const c = centerOf(key);
  const headY = c.y - R;
  const pads = [];
  ['A', 'B', 'C'].forEach((leg, li) => {
    const ang = (Math.PI / 2) + (li * 2 * Math.PI) / 3;
    const px = c.x + 9.5 * Math.cos(ang);
    const pz = c.z + 9.5 * Math.sin(ang);
    pads.push(box(px - 1.5, px + 1.5, 0, 0.8, pz - 1.5, pz + 1.5));
    addPart(`tripod-${n}-leg-${leg.toLowerCase()}`, `Tripod ${n} leg ${leg}`, 'supports', [
      strut([px, 0.8, pz], [c.x, headY, c.z], 1.1),
    ]);
  });
  addPart(`tripod-${n}-head-plate`, `Tripod ${n} head plate`, 'supports', [
    box(c.x - 4, c.x + 4, headY - 0.6, headY, c.z - 4, c.z + 4),
  ]);
  addPart(`tripod-${n}-base-pads`, `Tripod ${n} base pads`, 'supports', pads);
}
{
  const b = centerOf('B');
  addPart('bottom-sphere-foundation-pier', 'Bottom sphere foundation pier', 'supports', [
    cyl(2.5, 3.0, 2.6, b.x, 1.3, b.z, 16),
  ]);
  addPart('foundation-raft', 'Foundation raft', 'supports', [
    box(-45, 45, -1.2, 0, -45, 45),
  ]);
}

// --- Interior: the lift in the central vertical tube, four escalators in
// oblique tubes, two stairs in edge tubes.
{
  const b = centerOf('B');
  const t = centerOf('T');
  addPart('elevator-shaft', 'Elevator shaft', 'interior', [
    tube(new THREE.Vector3(b.x, b.y, b.z), new THREE.Vector3(t.x, t.y, t.z), 1.0, 12),
  ]);
  addPart('elevator-car', 'Elevator car', 'interior', [
    box(-1.1, 1.1, 58.8, 61.2, -1.1, 1.1),
  ]);
  const ESCALATORS = [
    ['L1', 'C0', 'diagonal tube 6 (lower sphere 1 to center)'],
    ['L2', 'C0', 'diagonal tube 7 (lower sphere 2 to center)'],
    ['U1', 'C0', 'diagonal tube 3 (upper sphere 1 to center)'],
    ['U2', 'C0', 'diagonal tube 4 (upper sphere 2 to center)'],
  ];
  ESCALATORS.forEach(([a, bKey, where], i) => {
    const ca = centerOf(a);
    const cb = centerOf(bKey);
    addPart(`escalator-${i + 1}`, `Escalator ${i + 1}`, 'interior', [
      strut([ca.x, ca.y - 0.9, ca.z], [cb.x, cb.y - 0.9, cb.z], 1.5, 0.5),
    ]);
    explanations_escalator_where[i] = where;
  });
  const STAIRS = [
    ['B', 'L1', 'edge tube 10 (bottom to lower sphere 1)'],
    ['B', 'L2', 'edge tube 11 (bottom to lower sphere 2)'],
  ];
  STAIRS.forEach(([a, bKey, where], i) => {
    const ca = centerOf(a);
    const cb = centerOf(bKey);
    addPart(`stair-${i + 1}`, `Stair ${i + 1}`, 'interior', [
      strut([ca.x, ca.y - 0.9, ca.z], [cb.x, cb.y - 0.9, cb.z], 1.2, 0.5),
    ]);
    explanations_stair_where[i] = where;
  });
}

// --- Restaurant: the panoramic restaurant inside the top sphere.
{
  const t = centerOf('T');
  const floor = cyl(8.5, 8.5, 0.3, t.x, t.y - 1.2, t.z, 24);
  addPart('restaurant-floor', 'Restaurant floor', 'restaurant', [floor]);
  const band = new THREE.CylinderGeometry(R + 0.08, R + 0.08, 3.6, 24, 1, true);
  band.translate(t.x, t.y, t.z);
  addPart('panoramic-window-band', 'Panoramic window band', 'restaurant', [band]);
  addPart('kitchen-service-core', 'Kitchen and service core', 'restaurant', [
    box(t.x - 3, t.x + 3, t.y - 1.05, t.y + 1.5, t.z - 3, t.z + 3),
  ]);
  addPart('bar-counter', 'Bar counter', 'restaurant', [
    box(t.x + 4, t.x + 7, t.y - 1.05, t.y + 0.1, t.z - 1, t.z + 1),
  ]);
  addPart('central-support-column', 'Central support column', 'restaurant', [
    cyl(0.5, 0.5, 6, t.x, t.y, t.z, 12),
  ]);
  const railing = new THREE.TorusGeometry(7.8, 0.06, 6, 40);
  railing.rotateX(Math.PI / 2);
  railing.translate(t.x, t.y, t.z);
  addPart('floor-railing', 'Floor railing', 'restaurant', [railing]);
  const lightRing = new THREE.TorusGeometry(3.5, 0.12, 6, 32);
  lightRing.rotateX(Math.PI / 2);
  lightRing.translate(t.x, t.y + 3, t.z);
  addPart('ceiling-light-ring', 'Ceiling light ring', 'restaurant', [lightRing]);
  addPart('panorama-deck', 'Panorama deck', 'restaurant', [
    cyl(6, 6, 0.25, t.x, t.y + 2.5, t.z, 24),
  ]);
}

// --- Entrance pavilion: the reception pavilion with the boomerang-shaped
// roof added in the 2004 to 2006 renovation, and the esplanade.
{
  const px = 58;
  const pz = 12;
  addPart('reception-pavilion-main-hall', 'Reception pavilion main hall', 'entrance-pavilion', [
    box(px - 7, px + 7, 0.3, 5.3, pz - 5, pz + 5),
  ]);
  addPart('boomerang-roof', 'Boomerang roof', 'entrance-pavilion', [
    slabY(17, 0.4, 6.5, 0.45, px - 4, 6.4, pz),
    slabY(17, 0.4, 6.5, -0.45, px + 4, 6.4, pz),
  ]);
  addPart('entrance-canopy', 'Entrance canopy', 'entrance-pavilion', [
    box(px - 5, px + 5, 3.2, 3.5, pz + 5, pz + 9),
  ]);
  addPart('ticket-desk-1', 'Ticket desk 1', 'entrance-pavilion', [
    box(px - 5, px - 3, 0.3, 1.4, pz - 2, pz - 1),
  ]);
  addPart('ticket-desk-2', 'Ticket desk 2', 'entrance-pavilion', [
    box(px + 3, px + 5, 0.3, 1.4, pz - 2, pz - 1),
  ]);
  addPart('pavilion-glass-facade', 'Pavilion glass facade', 'entrance-pavilion', [
    box(px - 7, px + 7, 1.0, 5.0, pz + 4.9, pz + 5.1),
  ]);
  const steps = [];
  const dir = new THREE.Vector2(-px, -pz).normalize();
  for (let sN = 0; sN < 9; sN++) {
    const d0 = 26 - sN * 0.7;
    const cxp = dir.x * d0;
    const czp = dir.y * d0;
    steps.push(box(cxp - 2, cxp + 2, 0.3 + sN * 0.26, 0.56 + sN * 0.26, czp - 0.35, czp + 0.35));
  }
  addPart('entrance-stairs', 'Entrance stairs to bottom sphere', 'entrance-pavilion', steps);
  addPart('esplanade', 'Esplanade', 'entrance-pavilion', [
    box(px - 14, px + 14, 0.01, 0.31, pz - 14, pz + 14),
  ]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.endsWith('-panel-1') || id.endsWith('-panel-2') || id.endsWith('-panel-3') || id.endsWith('-panel-4')) return '#d4dbe2';
  if (id.endsWith('-window-band')) return '#2c4456';
  if (id.endsWith('-led-meridians')) return '#ffe9a3';
  if (id === 'top-sphere' || id === 'center-sphere' || id === 'bottom-sphere') return '#c7ced6';
  if (id.startsWith('upper-sphere-') || id.startsWith('lower-sphere-')) return '#c2cad2';
  if (id.startsWith('edge-tube-') && !id.endsWith('-collar')) return '#b7bfc8';
  if (id.startsWith('diagonal-tube-') && !id.endsWith('-collar')) return '#aeb7c1';
  if (id.endsWith('-collar')) return '#8b95a0';
  if (id.startsWith('tripod-') || id === 'bottom-sphere-foundation-pier' || id === 'foundation-raft') return '#6e7680';
  if (id === 'elevator-shaft') return '#7d8894';
  if (id === 'elevator-car') return '#c9a227';
  if (id.startsWith('escalator-')) return '#8b95a0';
  if (id.startsWith('stair-')) return '#7d8894';
  if (id === 'restaurant-floor' || id === 'panorama-deck') return '#a98f6a';
  if (id === 'panoramic-window-band') return '#9fc3d8';
  if (id === 'kitchen-service-core') return '#9aa3ad';
  if (id === 'bar-counter') return '#8a6f4d';
  if (id === 'central-support-column') return '#b7bfc8';
  if (id === 'floor-railing') return '#5b6570';
  if (id === 'ceiling-light-ring') return '#ffe9a3';
  if (id === 'reception-pavilion-main-hall') return '#b9bcc0';
  if (id === 'boomerang-roof') return '#d4dbe2';
  if (id === 'entrance-canopy') return '#9aa3ad';
  if (id === 'ticket-desk-1' || id === 'ticket-desk-2') return '#8a6f4d';
  if (id === 'pavilion-glass-facade') return '#9fc3d8';
  if (id === 'entrance-stairs') return '#a8a9ad';
  if (id === 'esplanade') return '#b0b1b5';
  return '#c7ced6';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'spheres', name: 'Nine spheres', color: '#c7ced6', description: 'Nine 18 m stainless-steel-clad spheres arranged as an iron crystal unit cell magnified 165 billion times: eight cube vertices plus the body center.' },
  { id: 'cladding', name: 'Cladding, windows and lighting', color: '#d4dbe2', description: 'The stainless-steel cladding panels, window bands and LED meridian lighting of the nine spheres.' },
  { id: 'tubes-edge', name: 'Edge tubes', color: '#b7bfc8', description: 'The twelve 3 m tubes along the cube edges, enclosing stairs and escalators between the spheres.' },
  { id: 'tubes-diagonal', name: 'Diagonal tubes', color: '#aeb7c1', description: 'The eight tubes from the cube vertices to the central sphere; the two vertical ones carry the lift.' },
  { id: 'supports', name: 'Supports and foundations', color: '#6e7680', description: 'The three support tripods under the lower spheres, added after wind-tunnel tests showed the original design would topple, with the foundation pier and raft.' },
  { id: 'interior', name: 'Interior circulation', color: '#7d8894', description: 'The lift in the central vertical tube, the escalators in the oblique tubes and the stairs in the edge tubes.' },
  { id: 'restaurant', name: 'Top sphere restaurant', color: '#a98f6a', description: 'The panoramic restaurant inside the top sphere, with room for about 140 guests.' },
  { id: 'entrance-pavilion', name: 'Entrance pavilion', color: '#b9bcc0', description: 'The reception pavilion with its boomerang-shaped roof, built during the 2004 to 2006 renovation, and the redeveloped esplanade.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
Object.assign(explanations, {
  'top sphere': 'The top sphere, 18 m in diameter, sits 102 m above the ground. It holds the panoramic restaurant, with room for about 140 guests, and the observation deck with views over Brussels. Sphere positions on the cube frame are schematic.',
  'center sphere': 'The central sphere of the nine, 18 m in diameter. With its neighbor it holds flexible space that can be rented for events such as film screenings, concerts, parties and conferences. Sphere positions on the cube frame are schematic.',
  'bottom sphere': 'The bottom sphere, 18 m in diameter, is reserved for the permanent exhibition on the 1950s, Expo 58 and the construction of the Atomium. Sphere positions on the cube frame are schematic.',
});
for (let i = 1; i <= 3; i++) {
  explanations[`upper sphere ${i}`] =
    `One of the three upper outer spheres, 18 m in diameter. The upper outer spheres lack vertical support and are not open to the public, for safety reasons. Sphere positions on the cube frame are schematic.`;
  explanations[`lower sphere ${i}`] =
    `One of the three lower outer spheres, 18 m in diameter, each carried on a support tripod added after wind-tunnel tests. The lower outer spheres are among the six spheres open to the public, with exhibit halls and public spaces. Sphere positions on the cube frame are schematic.`;
}
for (const s of SPHERES) {
  for (let k = 1; k <= 4; k++) {
    explanations[`${s.name.toLowerCase()} cladding panel ${k}`] =
      `One of four schematic stainless-steel cladding panels on the ${s.name.toLowerCase()}. The spheres were originally clad in aluminium; the faded aluminium sheets were replaced with stainless steel during the 2004 to 2006 renovation.`;
  }
  if (s.key !== 'T') {
    explanations[`${s.name.toLowerCase()} window band`] =
      `The ring of windows around the equator of the ${s.name.toLowerCase()}. Exact window arrangement is schematic.`;
  }
  explanations[`${s.name.toLowerCase()} led meridians`] =
    `The LED lighting integrated into the meridians of the ${s.name.toLowerCase()}, installed during the 2004 to 2006 renovation. The lights can flash along each meridian, symbolising the range of an electron around its core. Exact layout is schematic.`;
}
EDGE_TUBES.forEach(([, , label], i) => {
  const n = i + 1;
  explanations[`edge tube ${n} (${label})`] =
    `One of the twelve tubes along the cube edges, 3 m in diameter, enclosing stairs and escalators between the spheres. Exact interior arrangement is schematic.`;
  explanations[`edge tube ${n} collar`] =
    `A schematic joint collar where the tube sections of edge tube ${n} meet at mid-span.`;
});
DIAG_TUBES.forEach(([, , label], i) => {
  const n = i + 1;
  explanations[`diagonal tube ${n} (${label})`] =
    n <= 2
      ? `One of the two vertical diagonal tubes, forming the central spine of the building and carrying the lift between the ${label} spheres. The lift reaches the top in 23 seconds. Exact interior arrangement is schematic.`
      : `One of the eight tubes running from a cube vertex to the central sphere, 3 m in diameter, enclosing escalators between the spheres. Exact interior arrangement is schematic.`;
  explanations[`diagonal tube ${n} collar`] =
    `A schematic joint collar where the tube sections of diagonal tube ${n} meet at mid-span.`;
});
for (const { n, name } of TRIPOD_SPHERES) {
  for (const leg of ['a', 'b', 'c']) {
    explanations[`tripod ${n} leg ${leg}`] =
      `One leg of the support tripod under the ${name}. The original design had no supports under the lower spheres, but wind-tunnel tests showed an 80 km/h wind would have toppled the structure, so support columns were added. Exact tripod geometry is schematic.`;
  }
  explanations[`tripod ${n} head plate`] =
    `The head plate spreading the tripod load under the ${name}. Exact geometry is schematic.`;
  explanations[`tripod ${n} base pads`] =
    `The foundation pads spreading tripod ${n} into the ground. Exact geometry is schematic.`;
}
for (let i = 1; i <= 4; i++) {
  explanations[`escalator ${i}`] =
    `One of the escalators in the oblique tubes, running inside ${explanations_escalator_where[i - 1]}. The longest escalator measures 35 m, among the longest in Europe. Exact placement is schematic.`;
}
for (let i = 1; i <= 2; i++) {
  explanations[`stair ${i}`] =
    `A schematic stair run inside ${explanations_stair_where[i - 1]}.`;
}
Object.assign(explanations, {
  'bottom sphere foundation pier': 'The short pier carrying the bottom sphere, which the original design rested on directly. Exact geometry is schematic.',
  'foundation raft': 'The schematic foundation raft under the whole structure.',
  'elevator shaft': 'The lift shaft in the central vertical tube, running from the bottom sphere to the top sphere. Exact shaft form is schematic.',
  'elevator car': 'The lift car for 22 people. It climbs at 5 m/s and reaches the top sphere in 23 seconds; in 1958 it was the fastest lift in Europe. Exact car design is schematic.',
  'restaurant floor': 'The restaurant floor inside the top sphere. Exact layout is schematic.',
  'panoramic window band': 'The band of panoramic windows around the top sphere, with views over Brussels. Exact glazing is schematic.',
  'kitchen and service core': 'The schematic kitchen and service core of the top-sphere restaurant.',
  'bar counter': 'The schematic bar counter of the top-sphere restaurant.',
  'central support column': 'A schematic interior column of the top sphere.',
  'floor railing': 'The schematic railing around the restaurant floor.',
  'ceiling light ring': 'Part of the interior lighting installation; the German designer Ingo Maurer created lighting objects and installations for the building interior during the 2004 to 2006 renovation. Exact form is schematic.',
  'panorama deck': 'The schematic observation deck above the restaurant, with the panoramic view of Brussels.',
  'reception pavilion main hall': 'The main hall of the new reception pavilion, built during the 2004 to 2006 renovation. Exact form is schematic.',
  'boomerang roof': 'The boomerang-shaped roof of the reception pavilion, added in the 2004 to 2006 renovation. Exact shape is schematic.',
  'entrance canopy': 'The schematic entrance canopy of the reception pavilion.',
  'ticket desk 1': 'A schematic ticket desk in the reception pavilion.',
  'ticket desk 2': 'A schematic ticket desk in the reception pavilion.',
  'pavilion glass facade': 'The schematic glass facade of the reception pavilion.',
  'entrance stairs to bottom sphere': 'The schematic stairs from the pavilion level up to the bottom sphere.',
  'esplanade': 'The concrete esplanade at the foot of the building, redeveloped during the 2004 to 2006 renovation with continuous benches. Exact layout is schematic.',
});

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
const binName = 'atomium-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the atomium directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Atomium, Brussels',
  title: 'Atomium',
  location: 'Brussels, Belgium',
  blurb: 'The Atomium in Brussels, built for the 1958 World\u0027s Fair: nine 18 m stainless-steel spheres arranged as an iron crystal unit cell magnified 165 billion times, joined by twenty tubes and rising 102 m over the Heysel Plateau.',
  sourceUrls: [
    { label: 'Wikipedia: Atomium', url: 'http://en.wikipedia.org/wiki/Atomium' },
    { label: 'SKYDB: Atomium in Brussels', url: 'https://www.skydb.net/building/327025962/atomium-brussels/' },
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
  chunks: [{ url: '/models/atomium/atomium-0.bin', bytes: offset }],
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
