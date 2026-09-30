// Simplified schematic Burj Al Arab for the Architectural Atlas.
//
// The "simple" variant of Burj Al Arab: same footprint, massing and
// proportions as the detailed model (see scripts/generate-burj-al-arab.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// 30 named parts across 8 systems instead of 109 across 10. The island,
// breakwater, piles and bridge merge into an island slab, rock ring, sea
// surface and causeway; the twelve sail panels merge into one curtain; the
// two mast legs merge into a single tapered needle; suite bands, balconies
// and spine bands merge into two tower blocks plus crown, spine, penthouse
// and window bands; the atrium keeps a void and pillars; restaurants merge
// into a sky pod, a tank restaurant and a deck terrace; the helipad keeps
// disc and arm; services merge into shafts, plant boxes, bridge lights and
// a pool rectangle.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-burj-al-arab.mjs for the full attribution):
//   321 m tall, 56 floors, 202 duplex suites, smallest 170 sq m, Royal
//   Suite 780 sq m; Tom Wright of Atkins, opened 1 December 1999, about
//   US$1 billion; artificial island 280 m offshore, about 150 m per side,
//   about 7.5 m above the waves, 230 piles about 40 m long; V of two wings
//   forming the mast; double-skinned Teflon-coated glass-fibre sail in
//   twelve panels; 180 m atrium with marble columns; helipad at 210 m;
//   Al Muntaha 200 m up cantilevered 27 m; Al Mahara aquarium about
//   990,000 litres behind 18 cm acrylic; 28 double-height floors at 7 m;
//   North Deck extension 2016.
// Schematic (not sourced, never stated as fact in the UI): exact island
// outline; causeway length and curve; tower angles and heights; sail billow
// and panel count; mast taper; pillar and rib placement; restaurant and
// pool shapes; helipad arm geometry; shaft and plant placement.
//
// Writes:
//   public/models/burj-al-arab-simple/atlas.json
//   public/models/burj-al-arab-simple/burj-al-arab-simple-0.bin
//
// Usage: node scripts/generate-burj-al-arab-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'burj-al-arab-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (321 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 321;

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
function taper(a, b, r0, r1, seg = 10) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg);
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
function cyl(rt, rb, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// Wing bar: box of width w from (x0,z0) to (x1,z1), y0 to y1.
// Rotation is applied before translation.
function wingBar(x0, z0, x1, z1, w, y0, y1) {
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const g = new THREE.BoxGeometry(len, y1 - y0, w);
  g.rotateY(Math.atan2(-dz, dx));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

// ---------------------------------------------------------------- layout (meters; simplified, see header)
const TOP = 7.5;
const CRX = 28, CRZ = 10; // tower roots
const CTX = -42, CTZ = 46; // tower tips
const CW = 18; // tower width

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Island.
addPart('island-slab', 'Island slab', 'island', [
  box(-72, 72, -7, TOP, -72, 72),
  box(-72, 72, TOP, TOP + 0.7, -72, 72),
]);
{
  const g = [
    box(-80, 80, -4, 3, -80, -72),
    box(-80, 80, -4, 3, 72, 80),
    box(-80, -72, -4, 3, -72, 72),
    box(72, 80, -4, 3, -72, 72),
  ];
  for (const [bx, bz] of [[-76, -76], [76, -76], [-76, 76], [76, 76]]) {
    const rock = new THREE.SphereGeometry(4.4, 7, 5);
    rock.translate(bx, 0, bz);
    g.push(rock);
  }
  addPart('rock-armor-ring', 'Rock armor ring', 'island', g);
}
addPart('sea-surface', 'Sea surface', 'island', [
  box(-420, 420, -0.4, 0.4, -420, 420),
]);
{
  const g = [];
  let px = 72, pz = 0, ang = 0;
  for (let i = 0; i < 5; i++) {
    const segLen = 18;
    const nx = px + Math.cos(ang) * segLen;
    const nz = pz + Math.sin(ang) * segLen;
    const seg = new THREE.BoxGeometry(segLen + 1, 1.5, 9);
    seg.rotateY(-ang);
    seg.translate((px + nx) / 2, 6.2, (pz + nz) / 2);
    g.push(seg);
    g.push(cyl(1.4, 1.8, 11, (px + nx) / 2, 0.5, (pz + nz) / 2, 7));
    px = nx; pz = nz; ang -= 0.11;
  }
  addPart('causeway-to-shore', 'Causeway to shore', 'island', g);
}

// --- Podium.
addPart('lobby-block', 'Lobby block', 'podium', [
  box(20, 40, TOP, 22, -15, 15),
  box(20, 40, 22, 23, -15, 15),
]);
{
  const g = [box(32, 46, 11.5, 12.5, -9, 9)];
  for (const [cx, cz] of [[34, -7], [44, -7], [34, 7], [44, 7]]) {
    g.push(cyl(0.45, 0.45, 11.5 - TOP, cx, (TOP + 11.5) / 2, cz, 7));
  }
  addPart('entry-canopy', 'Entry canopy', 'podium', g);
}

// --- Suites.
for (const s of [-1, 1]) {
  const side = s < 0 ? 'north' : 'south';
  const Side = s < 0 ? 'North' : 'South';
  addPart(`${side}-suite-tower`, `${Side} suite tower`, 'suites', [
    wingBar(CRX, s * CRZ, CTX, s * CTZ, CW, TOP, 188),
  ]);
}
{
  const g = [];
  for (const s of [-1, 1]) {
    const ang = Math.atan2(-(s * CTZ - s * CRZ), CTX - CRX);
    for (const by of [50, 100, 150]) {
      const t = (by - TOP) / (188 - TOP);
      const wx = CRX + (CTX - CRX) * t, wz = s * (CRZ + (CTZ - CRZ) * t);
      const band = new THREE.BoxGeometry(4, 3, CW + 1.2);
      band.rotateY(ang);
      band.translate(wx, by, wz);
      g.push(band);
    }
  }
  addPart('suite-window-bands', 'Suite window bands', 'suites', g);
}
addPart('backbone-spine', 'Backbone spine', 'suites', [
  box(24, 36, 22, 198, -12, 12),
]);
addPart('royal-penthouse', 'Royal penthouse', 'suites', [
  box(24, 36, 168, 188, -12, 12),
  box(26, 34, 188, 190, -8, 8),
]);
{
  const g = [];
  for (const s of [-1, 1]) {
    const t = 0.9;
    const wx = CRX + (CTX - CRX) * t, wz = s * (CRZ + (CTZ - CRZ) * t);
    g.push(box(wx - 7, wx + 7, 188, 191, wz - 7, wz + 7));
  }
  addPart('tower-crown-block', 'Tower crown block', 'suites', g);
}

// --- Sail.
{
  const g = [];
  const N = 5;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const zc = -CTZ + 2 * CTZ * t;
    const wdt = (2 * CTZ / N) - 0.6;
    const top = 170 + 25 * Math.sin(Math.PI * t);
    const p = new THREE.BoxGeometry(0.7, top - TOP, wdt);
    const dxdt = -14 * Math.PI * Math.cos(Math.PI * t);
    p.rotateY(Math.atan2(dxdt, 2 * CTZ));
    p.translate(CTX - 2 - 14 * Math.sin(Math.PI * t), (TOP + top) / 2, zc);
    g.push(p);
  }
  addPart('sail-curtain', 'Sail curtain', 'sail', g);
}
{
  const g = [];
  for (const by of [65, 120, 168]) {
    let prev = null;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const p = [CTX - 2 - 14 * Math.sin(Math.PI * t), by, -CTZ + 2 * CTZ * t];
      if (prev) g.push(strut(prev, p, 1.2));
      prev = p;
    }
  }
  addPart('sail-ribs', 'Sail ribs', 'sail', g);
}
addPart('mast-needle', 'Mast needle', 'sail', [
  taper([-36, 185, 0], [-10, 321, 0], 3.2, 0.8, 10),
]);
{
  const g = [];
  for (const by of [225, 265, 305]) {
    const t = (by - 185) / (321 - 185);
    const mx = -36 + 26 * t;
    const hw = 3.2 * (1 - t) + 0.8 * t + 1.5;
    g.push(strut([mx, by, -hw], [mx, by, hw], 1.2));
  }
  g.push(strut([-36, 185, -3], [-10, 321, 0], 0.9));
  g.push(strut([-36, 185, 3], [-10, 321, 0], 0.9));
  addPart('mast-braces', 'Mast braces', 'sail', g);
}
{
  const b = new THREE.SphereGeometry(1.2, 8, 6);
  b.translate(-10, 322.4, 0);
  addPart('beacon', 'Beacon', 'sail', [b]);
}

// --- Atrium.
{
  const g = [];
  const pts = [[CRX + 2, -CRZ - 2], [CTX - 2, -CTZ + 3], [CTX - 2, CTZ - 3], [CRX + 2, CRZ + 2]];
  const P = (i, y) => [pts[i][0], y, pts[i][1]];
  const tri = (a, b, c) => {
    for (const [p, q, r] of [[a, b, c], [a, c, b]]) {
      const t = new THREE.BufferGeometry();
      t.setAttribute('position', new THREE.Float32BufferAttribute([...p, ...q, ...r], 3));
      t.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
      t.setIndex([0, 1, 2]);
      t.computeVertexNormals();
      g.push(t);
    }
  };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  for (let i = 1; i < pts.length - 1; i++) tri(P(0, 178), P(i, 178), P(i + 1, 178));
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    quad(P(i, TOP), P(j, TOP), P(j, 178), P(i, 178));
  }
  addPart('atrium-void', 'Atrium void', 'atrium', g);
}
{
  const g = [];
  const cols = [
    [[10, -14], [20, 140, -5]],
    [[10, 14], [20, 140, 5]],
    [[-16, -24], [-4, 140, -9]],
    [[-16, 24], [-4, 140, 9]],
  ];
  for (const [base, top] of cols) {
    g.push(strut([base[0], TOP, base[1]], top, 2.4));
  }
  addPart('marble-pillars', 'Marble pillars', 'atrium', g);
}

// --- Dining.
addPart('sky-pod-restaurant', 'Sky pod restaurant', 'dining', [
  box(-64, -44, 194, 202, -8, 8),
  box(-64, -44, 202, 203, -8, 8),
]);
{
  const g = [];
  for (const s of [-1, 1]) {
    g.push(strut([-42, 188, s * 8], [-64, 198, s * 8], 1.6));
    g.push(strut([-42, 188, s * 8], [-53, 194, s * 8], 1));
  }
  addPart('sky-pod-arm', 'Sky pod arm', 'dining', g);
}
addPart('tank-restaurant', 'Tank restaurant', 'dining', [
  box(-20, 4, TOP, TOP + 8, -13, 13),
]);
addPart('fish-tank', 'Fish tank', 'dining', [
  cyl(6, 6, 7, -8, TOP + 4, 0, 14),
  box(-14.5, -14, TOP + 1, TOP + 7, -7, 7),
]);
addPart('deck-terrace', 'Deck terrace', 'dining', [
  box(-108, -76, TOP, TOP + 1.2, 10, 58),
  box(-100, -86, TOP + 1.2, TOP + 4.5, 38, 52),
]);

// --- Helipad.
addPart('helipad-disc', 'Helipad disc', 'helipad', [
  cyl(10, 10, 1.5, -58, 208, 0, 8),
]);
{
  const g = [];
  for (const s of [-1, 1]) {
    g.push(strut([-42, 192, s * 16], [-58, 207.2, s * 6], 1.3));
    g.push(strut([-42, 192, s * 4], [-58, 207.2, s * 2], 1));
  }
  addPart('helipad-arm', 'Helipad arm', 'helipad', g);
}

// --- Services.
{
  const g = [];
  for (const s of [-1, 1]) {
    const lx = CRX + (CTX - CRX) * 0.06, lz = s * (CRZ + (CTZ - CRZ) * 0.06);
    g.push(box(lx - 2.2, lx + 2.2, TOP, 188, lz - 2.2, lz + 2.2));
  }
  addPart('lift-shafts', 'Lift shafts', 'services', g);
}
addPart('plant-boxes', 'Plant boxes', 'services', [
  box(44, 54, TOP, TOP + 4.5, -38, -28),
  box(44, 54, TOP, TOP + 4, 28, 38),
  cyl(2.8, 2.8, 6.5, 49, TOP + 3.2, 33, 10),
]);
{
  const g = [];
  let px = 72, pz = 0, ang = 0;
  for (let i = 0; i < 5; i++) {
    const segLen = 18;
    const nx = px + Math.cos(ang) * segLen;
    const nz = pz + Math.sin(ang) * segLen;
    const mx = (px + nx) / 2, mz = (pz + nz) / 2;
    g.push(cyl(0.16, 0.22, 6.5, mx, 10, mz + 4.2, 6));
    g.push(box(mx - 0.6, mx + 0.6, 13.1, 13.5, mz + 4.2 - 0.2, mz + 4.2 + 0.2));
    px = nx; pz = nz; ang -= 0.11;
  }
  addPart('bridge-lights', 'Bridge lights', 'services', g);
}
addPart('pool-rectangle', 'Pool rectangle', 'services', [
  box(-102, -82, TOP + 1.2, TOP + 2.4, 14, 30),
]);

// ---------------------------------------------------------------- colors
// Schematic light palette, same family as the detailed model.
function colorFor(id) {
  if (id === 'sea-surface') return '#7fb3d5';
  if (id === 'pool-rectangle') return '#4aa3d8';
  if (id === 'island-slab') return '#d9cfbb';
  if (id === 'rock-armor-ring') return '#8f8a7e';
  if (id === 'causeway-to-shore') return '#cfc9ba';
  if (id === 'lobby-block') return '#cfe0e8';
  if (id === 'entry-canopy') return '#f0ece0';
  if (id === 'north-suite-tower' || id === 'south-suite-tower') return '#e9e4d6';
  if (id === 'suite-window-bands') return '#8a94a0';
  if (id === 'backbone-spine') return '#b5ada0';
  if (id === 'royal-penthouse') return '#d9b96a';
  if (id === 'tower-crown-block') return '#d5cdb8';
  if (id === 'sail-curtain') return '#f4f6f8';
  if (id === 'sail-ribs') return '#aeb6bf';
  if (id === 'mast-needle') return '#cdd3d9';
  if (id === 'mast-braces') return '#9aa3ad';
  if (id === 'beacon') return '#e05252';
  if (id === 'atrium-void') return '#e8e2d2';
  if (id === 'marble-pillars') return '#f0ece0';
  if (id === 'sky-pod-restaurant') return '#e8ddc0';
  if (id === 'sky-pod-arm') return '#8a94a0';
  if (id === 'tank-restaurant') return '#ddd5bd';
  if (id === 'fish-tank') return '#3f7fae';
  if (id === 'deck-terrace') return '#d9cfbb';
  if (id === 'helipad-disc') return '#5b6670';
  if (id === 'helipad-arm') return '#7a8590';
  if (id === 'lift-shafts') return '#c9c2ae';
  if (id === 'plant-boxes') return '#8a94a0';
  if (id === 'bridge-lights') return '#4a5560';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'island', name: 'Island and foundations', color: '#cfc4a8', description: 'The artificial island 280 m offshore: a simplified slab with its rock armor ring, the surrounding sea surface, and the causeway to the shore.' },
  { id: 'podium', name: 'Podium and entrance', color: '#e0d8c0', description: 'The lobby block and entry canopy at island level.' },
  { id: 'suites', name: 'Suites', color: '#e9e4d6', description: 'The 202 duplex suites as two simplified tower blocks with window bands, a backbone spine, the Royal penthouse and crown blocks.' },
  { id: 'sail', name: 'Sail and mast', color: '#f4f6f8', description: 'The Teflon-coated fabric sail as a single billowing curtain with ribs, and the steel V simplified to one tapered mast needle with braces and beacon.' },
  { id: 'atrium', name: 'Atrium', color: '#e8e2d2', description: 'The 180 m atrium as a single void volume with simplified marble pillars.' },
  { id: 'dining', name: 'Restaurants and bars', color: '#e3dcc9', description: 'The sky pod restaurant on its cantilever arm, the aquarium tank restaurant, and the deck terrace standing in for the North Deck.' },
  { id: 'helipad', name: 'Helipad', color: '#5b6670', description: 'The cantilevered helipad at 210 m: a disc on a simplified support arm.' },
  { id: 'services', name: 'Services', color: '#8a94a0', description: 'Lift shafts, merged plant boxes, bridge lights along the causeway, and the terrace pool.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'island slab': 'The artificial island the hotel stands on, about 150 m per side and rising about 7.5 m above the waves, shown here as a simplified slab. Exact outline is schematic.',
  'rock armor ring': 'The ring of rock bunds and protective armor around the island against wave erosion. Exact profile is schematic.',
  'sea surface': 'The Arabian Gulf around the island, about 280 m from Jumeirah Beach. Water level and extent are schematic.',
  'causeway to shore': 'The private curving bridge to the mainland, the hotel\u2019s only land link, with its piers merged into one part. Length and curve are schematic.',
  'lobby block': 'The lobby block at the base of the atrium. Exact glazing is schematic.',
  'entry canopy': 'The canopy over the main entrance. Exact shape is schematic.',
  'north suite tower': 'The north wing of duplex suites as one simplified tower block. The hotel holds 202 duplex suites in two wings. Exact floor layout is schematic.',
  'south suite tower': 'The south wing of duplex suites as one simplified tower block. Exact floor layout is schematic.',
  'suite window bands': 'Bands of suite windows wrapping both tower blocks. Exact window rhythm is schematic.',
  'backbone spine': 'The reinforced-concrete spine forming the back of the V behind the suite towers. Exact section is schematic.',
  'royal penthouse': 'The Royal Suite, the hotel\u2019s largest at 780 sq m, shown as a penthouse block on the spine. Exact position is schematic.',
  'tower crown block': 'The crown blocks capping the suite towers at the top of the accommodation. Exact shape is schematic.',
  'sail curtain': 'The double-skinned Teflon-coated woven glass-fibre sail as one billowing curtain, translucent by day and lit as a projection screen at night. Panel count and billow are schematic.',
  'sail ribs': 'The horizontal beams the fabric sail is tensioned between, simplified to three ribs. Exact positions are schematic.',
  'mast needle': 'The V-shaped steel mast simplified to a single tapered needle rising to the full 321 m height. Exact taper is schematic.',
  'mast braces': 'Bracing tying the mast needle against wind loads. Exact pattern is schematic.',
  'beacon': 'The aviation warning light on the mast tip. Exact fitting is schematic.',
  'atrium void': 'The 180 m tall atrium between the wings as a single void volume. Exact shape is schematic.',
  'marble pillars': 'The inclined white-marble-clad columns inside the atrium, simplified to four pillars. Exact positions are schematic.',
  'sky pod restaurant': 'Al Muntaha, the restaurant cantilevered 200 m above the sea, merged with the Skyview Bar into one sky pod. Room shape is schematic.',
  'sky pod arm': 'The truss cantilevering the sky pod 27 m out from the structure. Exact geometry is schematic.',
  'tank restaurant': 'Al Mahara, the seafood restaurant around its aquarium, reached through a simulated submarine voyage. Room shape is schematic.',
  'fish tank': 'The Al Mahara aquarium holding about 990,000 litres of seawater behind acrylic glass. Exact tank shape is schematic.',
  'deck terrace': 'The North Deck terrace and its pavilion, from the 2016 island extension into the Gulf. Exact outline is schematic.',
  'helipad disc': 'The helipad deck at 210 m above ground as a simplified octagonal disc. Exact deck detail is schematic.',
  'helipad arm': 'The cantilever truss carrying the helipad out from the structure, simplified to a few struts. Exact geometry is schematic.',
  'lift shafts': 'The lift shafts serving the 56 floors, merged into one part. Exact layout is schematic.',
  'plant boxes': 'The island plant: chillers, generators and water storage merged into one part. Exact layout is schematic.',
  'bridge lights': 'Lamp columns along the causeway to the shore. Exact positions are schematic.',
  'pool rectangle': 'The terrace pool on the deck, standing in for the North Deck pools. Exact shape is schematic.',
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
const binName = 'burj-al-arab-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the burj-al-arab-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Burj Al Arab, Dubai (simplified schematic)',
  title: 'Burj Al Arab',
  location: 'Dubai, United Arab Emirates',
  blurb: 'Dubai\u2019s sail-shaped luxury hotel in simplified schematic form: a 321 m sail on an artificial island, 202 duplex suites around a 180 m atrium, and a cantilevered helipad.',
  sourceUrls: [
    { label: 'Wikipedia: Burj Al Arab', url: 'https://en.wikipedia.org/wiki/Burj_Al_Arab' },
    { label: 'MEED: Burj al-Arab', url: 'https://www.meed.com/burj-al-arab/' },
    { label: 'Building: Fantasy island', url: 'https://www.building.co.uk/fantasy-island/1374.article' },
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
  chunks: [{ url: '/models/burj-al-arab-simple/burj-al-arab-simple-0.bin', bytes: offset }],
  triangles,
  // Coarser packing than the detailed model; 1.5 keeps the exploded cloud
  // inside the frame.
  spread: 1.5,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
