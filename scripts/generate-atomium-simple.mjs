// Simplified schematic Atomium for the Architectural Atlas.
//
// The "simple" variant of the Atomium: same footprint, massing and
// proportions as the detailed model (see scripts/generate-atomium.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// 28 named parts across 7 systems instead of 143 across 8. The nine
// spheres, cladding panels, window bands, tube groups and tripods are
// merged into group parts; the restaurant and pavilion keep their main
// masses.
//
// Sourced dimensions reused from the detailed model (never re-stated
// here, see generate-atomium.mjs for the full attribution):
//   102 m tall; nine 18 m stainless-steel-clad spheres (originally
//   aluminium, replaced 2004 to 2006) arranged as an iron crystal unit
//   cell magnified 165 billion times; 20 tubes of 3 m diameter, 12 along
//   the cube edges and 8 from the vertices to the central sphere;
//   six visitable spheres, top sphere panoramic restaurant (about 140
//   guests); lift at 5 m/s, 22 people, 23 seconds to the top, fastest in
//   Europe in 1958; longest escalator 35 m; support tripods under the
//   lower spheres added after wind-tunnel tests; 2004 to 2006 renovation
//   with LED meridian lighting, Ingo Maurer interior lighting,
//   boomerang-roof reception pavilion and redeveloped esplanade.
// Schematic (not sourced, never stated as fact in the UI): 47 m cube
// edge, base elevation, tripod geometry, cladding subdivision, interior
// and restaurant layouts, pavilion form and esplanade extent.
//
// Writes:
//   public/models/atomium-simple/atlas.json
//   public/models/atomium-simple/atomium-simple-0.bin
//
// Usage: node scripts/generate-atomium-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'atomium-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (102 m) maps to 2.4 units (same as
// detailed).
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
function cyl(rt, rb, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function tube(a, b, r, seg = 10) {
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
function collar(a, b) {
  const dir = new THREE.Vector3().subVectors(b, a).normalize();
  const g = new THREE.TorusGeometry(1.62, 0.22, 6, 16);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir),
  );
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}
function slabY(w, t, l, angY, x, y, z) {
  const g = new THREE.BoxGeometry(w, t, l);
  g.rotateY(angY);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- crystal frame (same as detailed)
const E = 47;
const R = 9;
const Y0 = 52.3;
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
const KEYS = ['T', 'U1', 'U2', 'U3', 'C0', 'L1', 'L2', 'L3', 'B'];

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Spheres: the nine shells merged: 1 part.
{
  const shells = KEYS.map((k) => {
    const c = V[k];
    const g = new THREE.SphereGeometry(R, 16, 12);
    g.translate(c.x, c.y, c.z);
    return g;
  });
  addPart('nine-spheres', 'Nine spheres', 'spheres', shells);
}

// --- Cladding: panels, window bands, top panoramic band and LED
// meridians merged: 4 parts.
{
  const panels = [];
  const bands = [];
  const leds = [];
  for (const k of KEYS) {
    const c = V[k];
    for (let pi = 0; pi < 4; pi++) {
      const panel = new THREE.SphereGeometry(R + 0.06, 6, 3, (pi * Math.PI) / 2, Math.PI / 2, 0.12, Math.PI - 0.24);
      panel.translate(c.x, c.y, c.z);
      panels.push(panel);
    }
    if (k === 'T') {
      const pano = new THREE.CylinderGeometry(R + 0.08, R + 0.08, 3.6, 18, 1, true);
      pano.translate(c.x, c.y, c.z);
      addPart('top-sphere-panoramic-band', 'Top sphere panoramic band', 'cladding', [pano]);
    } else {
      const band = new THREE.CylinderGeometry(R + 0.08, R + 0.08, 2.6, 18, 1, true);
      band.translate(c.x, c.y, c.z);
      bands.push(band);
    }
    for (const rot of [0, Math.PI / 2]) {
      const ring = new THREE.TorusGeometry(R + 0.04, 0.09, 5, 32);
      ring.rotateY(rot);
      ring.translate(c.x, c.y, c.z);
      leds.push(ring);
    }
  }
  addPart('cladding-panels', 'Cladding panels', 'cladding', panels);
  addPart('window-bands', 'Window bands', 'cladding', bands);
  addPart('led-meridian-lights', 'LED meridian lights', 'cladding', leds);
}

// --- Tubes: upper, ring and lower edge groups, the oblique diagonals,
// the central elevator tube, and all collars: 6 parts.
{
  const upper = [['T', 'U1'], ['T', 'U2'], ['T', 'U3']];
  const ring = [['U1', 'L2'], ['U1', 'L3'], ['U2', 'L1'], ['U2', 'L3'], ['U3', 'L1'], ['U3', 'L2']];
  const lower = [['B', 'L1'], ['B', 'L2'], ['B', 'L3']];
  const oblique = [['U1', 'C0'], ['U2', 'C0'], ['U3', 'C0'], ['L1', 'C0'], ['L2', 'C0'], ['L3', 'C0']];
  addPart('upper-edge-tubes', 'Upper edge tubes', 'tubes', upper.map(([a, b]) => tube(V[a], V[b], 1.5)));
  addPart('ring-edge-tubes', 'Ring edge tubes', 'tubes', ring.map(([a, b]) => tube(V[a], V[b], 1.5)));
  addPart('lower-edge-tubes', 'Lower edge tubes', 'tubes', lower.map(([a, b]) => tube(V[a], V[b], 1.5)));
  addPart('diagonal-tubes', 'Diagonal tubes', 'tubes', oblique.map(([a, b]) => tube(V[a], V[b], 1.5)));
  addPart('central-elevator-tube', 'Central elevator tube', 'tubes', [
    tube(V.B, V.C0, 1.5),
    tube(V.C0, V.T, 1.5),
  ]);
  const allTubes = [...upper, ...ring, ...lower, ...oblique, ['B', 'C0'], ['C0', 'T']];
  addPart('tube-collars', 'Tube collars', 'tubes', allTubes.map(([a, b]) => collar(V[a], V[b])));
}

// --- Supports: three tripods merged per tripod, all base pads, and the
// foundation raft: 5 parts.
{
  const allPads = [];
  [['L1', 1], ['L2', 2], ['L3', 3]].forEach(([key, n]) => {
    const c = V[key];
    const headY = c.y - R;
    const legs = [];
    for (let li = 0; li < 3; li++) {
      const ang = (Math.PI / 2) + (li * 2 * Math.PI) / 3;
      const px = c.x + 9.5 * Math.cos(ang);
      const pz = c.z + 9.5 * Math.sin(ang);
      legs.push(strut([px, 0.8, pz], [c.x, headY, c.z], 1.1));
      allPads.push(box(px - 1.5, px + 1.5, 0, 0.8, pz - 1.5, pz + 1.5));
    }
    legs.push(box(c.x - 4, c.x + 4, headY - 0.6, headY, c.z - 4, c.z + 4));
    addPart(`support-tripod-${n}`, `Support tripod ${n}`, 'supports', legs);
  });
  addPart('tripod-base-pads', 'Tripod base pads', 'supports', allPads);
  addPart('foundation-raft', 'Foundation raft', 'supports', [
    box(-45, 45, -1.2, 0, -45, 45),
  ]);
}

// --- Interior: shaft, car, escalators, stairs and the bottom sphere
// exhibition floor: 5 parts.
{
  addPart('elevator-shaft', 'Elevator shaft', 'interior', [
    tube(V.B, V.T, 1.0, 10),
  ]);
  addPart('elevator-car', 'Elevator car', 'interior', [
    box(-1.1, 1.1, 58.8, 61.2, -1.1, 1.1),
  ]);
  const esc = [];
  for (const [a, b] of [['L1', 'C0'], ['L2', 'C0'], ['U1', 'C0'], ['U2', 'C0']]) {
    const ca = V[a];
    const cb = V[b];
    esc.push(strut([ca.x, ca.y - 0.9, ca.z], [cb.x, cb.y - 0.9, cb.z], 1.5, 0.5));
  }
  addPart('escalators', 'Escalators', 'interior', esc);
  const st = [];
  for (const [a, b] of [['B', 'L1'], ['B', 'L2']]) {
    const ca = V[a];
    const cb = V[b];
    st.push(strut([ca.x, ca.y - 0.9, ca.z], [cb.x, cb.y - 0.9, cb.z], 1.2, 0.5));
  }
  addPart('stairs', 'Stairs', 'interior', st);
  addPart('bottom-sphere-exhibition-floor', 'Bottom sphere exhibition floor', 'interior', [
    cyl(8.5, 8.5, 0.3, V.B.x, V.B.y - 1.2, V.B.z, 18),
  ]);
}

// --- Restaurant: floor, kitchen and bar core, panorama deck: 3 parts.
{
  const t = V.T;
  addPart('restaurant-floor', 'Restaurant floor', 'restaurant', [
    cyl(8.5, 8.5, 0.3, t.x, t.y - 1.2, t.z, 18),
  ]);
  addPart('kitchen-bar-core', 'Kitchen and bar core', 'restaurant', [
    box(t.x - 3, t.x + 3, t.y - 1.05, t.y + 1.5, t.z - 3, t.z + 3),
    box(t.x + 4, t.x + 7, t.y - 1.05, t.y + 0.1, t.z - 1, t.z + 1),
  ]);
  addPart('panorama-deck', 'Panorama deck', 'restaurant', [
    cyl(6, 6, 0.25, t.x, t.y + 2.5, t.z, 18),
  ]);
}

// --- Entrance pavilion: hall, boomerang roof, stairs, esplanade: 4 parts.
{
  const px = 58;
  const pz = 12;
  addPart('reception-pavilion', 'Reception pavilion', 'entrance-pavilion', [
    box(px - 7, px + 7, 0.3, 5.3, pz - 5, pz + 5),
    box(px - 7, px + 7, 1.0, 5.0, pz + 4.9, pz + 5.1),
    box(px - 5, px + 5, 3.2, 3.5, pz + 5, pz + 9),
    box(px - 5, px - 3, 0.3, 1.4, pz - 2, pz - 1),
    box(px + 3, px + 5, 0.3, 1.4, pz - 2, pz - 1),
  ]);
  addPart('boomerang-roof', 'Boomerang roof', 'entrance-pavilion', [
    slabY(17, 0.4, 6.5, 0.45, px - 4, 6.4, pz),
    slabY(17, 0.4, 6.5, -0.45, px + 4, 6.4, pz),
  ]);
  const steps = [];
  const dir = new THREE.Vector2(-px, -pz).normalize();
  for (let sN = 0; sN < 9; sN++) {
    const d0 = 26 - sN * 0.7;
    const cxp = dir.x * d0;
    const czp = dir.y * d0;
    steps.push(box(cxp - 2, cxp + 2, 0.3 + sN * 0.26, 0.56 + sN * 0.26, czp - 0.35, czp + 0.35));
  }
  addPart('entrance-stairs', 'Entrance stairs', 'entrance-pavilion', steps);
  addPart('esplanade', 'Esplanade', 'entrance-pavilion', [
    box(px - 14, px + 14, 0.01, 0.31, pz - 14, pz + 14),
  ]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'nine-spheres') return '#c7ced6';
  if (id === 'cladding-panels') return '#d4dbe2';
  if (id === 'window-bands') return '#2c4456';
  if (id === 'top-sphere-panoramic-band') return '#9fc3d8';
  if (id === 'led-meridian-lights') return '#ffe9a3';
  if (id === 'upper-edge-tubes' || id === 'ring-edge-tubes' || id === 'lower-edge-tubes') return '#b7bfc8';
  if (id === 'diagonal-tubes' || id === 'central-elevator-tube') return '#aeb7c1';
  if (id === 'tube-collars') return '#8b95a0';
  if (id.startsWith('support-tripod-') || id === 'tripod-base-pads' || id === 'foundation-raft') return '#6e7680';
  if (id === 'elevator-shaft') return '#7d8894';
  if (id === 'elevator-car') return '#c9a227';
  if (id === 'escalators') return '#8b95a0';
  if (id === 'stairs' || id === 'bottom-sphere-exhibition-floor') return '#7d8894';
  if (id === 'restaurant-floor' || id === 'panorama-deck') return '#a98f6a';
  if (id === 'kitchen-bar-core') return '#9aa3ad';
  if (id === 'reception-pavilion') return '#b9bcc0';
  if (id === 'boomerang-roof') return '#d4dbe2';
  if (id === 'entrance-stairs') return '#a8a9ad';
  if (id === 'esplanade') return '#b0b1b5';
  return '#c7ced6';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'spheres', name: 'Nine spheres', color: '#c7ced6', description: 'Nine 18 m stainless-steel-clad spheres arranged as an iron crystal unit cell magnified 165 billion times.' },
  { id: 'cladding', name: 'Cladding, windows and lighting', color: '#d4dbe2', description: 'The stainless-steel cladding panels, window bands, panoramic band and LED meridian lighting of the spheres.' },
  { id: 'tubes', name: 'Tubes', color: '#b7bfc8', description: 'The twenty 3 m tubes joining the spheres: twelve along the cube edges and eight from the vertices to the center.' },
  { id: 'supports', name: 'Supports and foundations', color: '#6e7680', description: 'The three support tripods under the lower spheres, added after wind-tunnel tests, with base pads and the foundation raft.' },
  { id: 'interior', name: 'Interior circulation', color: '#7d8894', description: 'The lift, escalators, stairs and the bottom sphere exhibition floor.' },
  { id: 'restaurant', name: 'Top sphere restaurant', color: '#a98f6a', description: 'The panoramic restaurant inside the top sphere, with room for about 140 guests.' },
  { id: 'entrance-pavilion', name: 'Entrance pavilion', color: '#b9bcc0', description: 'The reception pavilion with its boomerang-shaped roof, entrance stairs and esplanade.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'nine spheres': 'The nine stainless-steel-clad spheres, each 18 m in diameter, arranged as an iron crystal unit cell magnified 165 billion times: eight cube vertices plus the body center. Sphere positions on the cube frame are schematic.',
  'cladding panels': 'The schematic stainless-steel cladding panels of the nine spheres. The spheres were originally clad in aluminium; the faded aluminium sheets were replaced with stainless steel during the 2004 to 2006 renovation.',
  'window bands': 'The rings of windows around the equators of the eight non-top spheres. Exact window arrangement is schematic.',
  'top sphere panoramic band': 'The band of panoramic windows around the top sphere, with views over Brussels. Exact glazing is schematic.',
  'led meridian lights': 'The LED lighting integrated into the meridians of the spheres, installed during the 2004 to 2006 renovation. The lights can flash along each meridian, symbolising the range of an electron around its core. Exact layout is schematic.',
  'upper edge tubes': 'The three tubes along the upper cube edges, 3 m in diameter, joining the top sphere to the three upper outer spheres. Exact interior arrangement is schematic.',
  'ring edge tubes': 'The six tubes along the middle cube edges, 3 m in diameter, joining the upper and lower outer spheres. Exact interior arrangement is schematic.',
  'lower edge tubes': 'The three tubes along the lower cube edges, 3 m in diameter, joining the bottom sphere to the three lower outer spheres and enclosing stairs. Exact interior arrangement is schematic.',
  'diagonal tubes': 'The six oblique tubes from the outer vertices to the central sphere, 3 m in diameter, enclosing escalators. Exact interior arrangement is schematic.',
  'central elevator tube': 'The two vertical diagonal tubes forming the central spine of the building, from the bottom sphere through the center to the top sphere, carrying the lift. Exact interior arrangement is schematic.',
  'tube collars': 'Schematic joint collars where the tube sections meet at mid-span.',
  'support tripod 1': 'One of three support tripods under the lower outer spheres. The original design had no supports under the lower spheres, but wind-tunnel tests showed an 80 km/h wind would have toppled the structure, so support columns were added. Exact tripod geometry is schematic.',
  'support tripod 2': 'One of three support tripods under the lower outer spheres. The original design had no supports under the lower spheres, but wind-tunnel tests showed an 80 km/h wind would have toppled the structure, so support columns were added. Exact tripod geometry is schematic.',
  'support tripod 3': 'One of three support tripods under the lower outer spheres. The original design had no supports under the lower spheres, but wind-tunnel tests showed an 80 km/h wind would have toppled the structure, so support columns were added. Exact tripod geometry is schematic.',
  'tripod base pads': 'The schematic foundation pads spreading the three tripods into the ground.',
  'foundation raft': 'The schematic foundation raft under the whole structure.',
  'elevator shaft': 'The lift shaft in the central vertical tube, running from the bottom sphere to the top sphere. Exact shaft form is schematic.',
  'elevator car': 'The lift car for 22 people. It climbs at 5 m/s and reaches the top sphere in 23 seconds; in 1958 it was the fastest lift in Europe. Exact car design is schematic.',
  'escalators': 'The escalators in the oblique tubes; the longest measures 35 m, among the longest escalators in Europe. Exact placement is schematic.',
  'stairs': 'Schematic stair runs inside the lower edge tubes.',
  'bottom sphere exhibition floor': 'The floor of the bottom sphere, reserved for the permanent exhibition on the 1950s, Expo 58 and the construction of the Atomium. Exact layout is schematic.',
  'restaurant floor': 'The restaurant floor inside the top sphere. Exact layout is schematic.',
  'kitchen and bar core': 'The schematic kitchen and bar core of the top-sphere restaurant.',
  'panorama deck': 'The schematic observation deck above the restaurant, with the panoramic view of Brussels.',
  'reception pavilion': 'The new reception pavilion with its entrance canopy and ticket desks, built during the 2004 to 2006 renovation. Exact form is schematic.',
  'boomerang roof': 'The boomerang-shaped roof of the reception pavilion, added in the 2004 to 2006 renovation. Exact shape is schematic.',
  'entrance stairs': 'The schematic stairs from the pavilion level up to the bottom sphere.',
  'esplanade': 'The concrete esplanade at the foot of the building, redeveloped during the 2004 to 2006 renovation with continuous benches. Exact layout is schematic.',
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
const binName = 'atomium-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the atomium-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Atomium, Brussels (simplified schematic)',
  title: 'Atomium',
  location: 'Brussels, Belgium',
  blurb: 'The Atomium in Brussels, built for the 1958 World\u0027s Fair, in simplified schematic form: nine 18 m stainless-steel spheres arranged as an iron crystal unit cell magnified 165 billion times, joined by twenty tubes and rising 102 m over the Heysel Plateau.',
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
  chunks: [{ url: '/models/atomium-simple/atomium-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
