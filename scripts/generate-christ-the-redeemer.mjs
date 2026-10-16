// Procedural Christ the Redeemer for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Christ the Redeemer in code
// and writes it in the atlas binary format:
//   public/models/christ-the-redeemer/atlas.json
//   public/models/christ-the-redeemer/christ-the-redeemer-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   Art Deco statue of Jesus Christ on Corcovado mountain, Rio de Janeiro,
//   Brazil; designed by French sculptor Paul Landowski, built by Brazilian
//   engineer Heitor da Silva Costa with French engineer Albert Caquot;
//   Romanian sculptor Gheorghe Leonida fashioned the face; constructed
//   1922 to 1931, dedicated 12 October 1931 (feast of Our Lady Aparecida);
//   statue 30 m tall on an 8 m pedestal, 38 m total; arms span 28 m wide;
//   weighs 635 metric tons; reinforced concrete core faced with soapstone
//   tiles; New Seven Wonders of the World, 2007; chapel of Nossa Senhora
//   Aparecida in the pedestal base, consecrated 2006; stands at 700 m
//   altitude in Tijuca National Park; lightning protection upgraded after
//   strikes.
// Schematic (not sourced, never stated as fact in the UI): exact body
// proportions beyond height and arm span; robe fold arrangement; finger,
// toe and facial feature shapes; pedestal stone coursing; chapel interior;
// viewing platform and railing layout; mountain peak form.
//
// Coordinate frame: x = lateral (arms span x), z = depth, y = up, meters.
// The figure faces +z (toward the city).
//
// Granularity: 100+ named parts across 8 systems.
//
// Usage: node scripts/generate-christ-the-redeemer.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'christ-the-redeemer');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (38 m total) maps to 2.4 units.
const S = 2.4 / 38;

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
function sph(r, x, y, z, w = 12, h = 10) {
  const g = new THREE.SphereGeometry(r, w, h);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// Dimensions (meters). Pedestal 0..8, statue 8..38, arms span -14..14.
const PED_H = 8;
const FOOT_Y = PED_H;

// --- Pedestal: octagonal stone base, 8 faces x 2 courses + slabs (20 parts)
{
  const R = 4.2;
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const a1 = ((k + 1) / 8) * Math.PI * 2 + Math.PI / 8;
    const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R;
    const x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ang = -Math.atan2(z1 - z0, x1 - x0);
    for (const [c, cname, y0, y1] of [[0, 'lower', 0.6, 3.9], [1, 'upper', 3.9, PED_H - 0.6]]) {
      const g = new THREE.BoxGeometry(len, y1 - y0, 0.5);
      g.rotateY(ang);
      g.translate(mx, (y0 + y1) / 2, mz);
      addPart(`pedestal-face-${k + 1}-${cname}`, `Pedestal face ${k + 1} ${cname} course`, 'pedestal', [g]);
    }
  }
  addPart('pedestal-base-slab', 'Pedestal base slab', 'pedestal', [box(-5, 5, 0, 0.6, -5, 5)]);
  addPart('pedestal-cornice', 'Pedestal cornice', 'pedestal', [cyl(4.6, 4.9, 0.7, 0, PED_H - 0.35, 0, 8)]);
  addPart('pedestal-plinth', 'Statue plinth', 'pedestal', [box(-2.6, 2.6, PED_H - 0.4, PED_H, -2.6, 2.6)]);
  addPart('chapel-door', 'Chapel door', 'pedestal', [box(-0.9, 0.9, 0.6, 3.4, 3.85, 4.15)]);
}

// --- Viewing platform around the pedestal (5 parts)
{
  addPart('platform-deck', 'Viewing deck', 'platform', [cyl(9, 9, 0.4, 0, 0.2, 0, 24)]);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const g = new THREE.BoxGeometry(11, 1.1, 0.12);
    g.rotateY(-a);
    g.translate(Math.cos(a) * 8.2, 1.0, Math.sin(a) * 8.2);
    addPart(`platform-railing-${k + 1}`, `Viewing deck railing ${k + 1}`, 'platform', [g]);
  }
}

// --- Legs and feet (8 parts)
for (const side of [-1, 1]) {
  const nm = side < 0 ? 'Left' : 'Right';
  const sl = nm.toLowerCase();
  const x = side * 1.15;
  addPart(`${sl}-thigh`, `${nm} thigh`, 'legs', [box(x - 0.75, x + 0.75, FOOT_Y + 6, FOOT_Y + 13, -0.9, 0.9)]);
  addPart(`${sl}-shin`, `${nm} shin`, 'legs', [cyl(0.62, 0.75, 6, x, FOOT_Y + 3, 0, 10)]);
  addPart(`${sl}-foot`, `${nm} foot`, 'legs', [box(x - 0.6, x + 0.6, FOOT_Y, FOOT_Y + 1.1, -0.5, 1.6)]);
  for (let t = 0; t < 5; t++) {
    const tx = x - 0.48 + t * 0.24;
    addPart(`${sl}-toe-${t + 1}`, `${nm} toe ${t + 1}`, 'legs', [box(tx - 0.11, tx + 0.11, FOOT_Y + 0.15, FOOT_Y + 0.7, 1.6, 2.5)]);
  }
}

// --- Robe: torso and drapery (22 parts)
{
  addPart('torso-front', 'Torso front', 'robe', [box(-2.1, 2.1, FOOT_Y + 12, FOOT_Y + 22, 0.4, 1.5)]);
  addPart('torso-back', 'Torso back', 'robe', [box(-2.1, 2.1, FOOT_Y + 12, FOOT_Y + 22, -1.5, -0.4)]);
  addPart('torso-left', 'Torso left side', 'robe', [box(-2.5, -2.1, FOOT_Y + 12, FOOT_Y + 22, -1.5, 1.5)]);
  addPart('torso-right', 'Torso right side', 'robe', [box(2.1, 2.5, FOOT_Y + 12, FOOT_Y + 22, -1.5, 1.5)]);
  addPart('waist-sash', 'Waist sash', 'robe', [cyl(2.35, 2.5, 1.1, 0, FOOT_Y + 12.4, 0, 12)]);
  addPart('robe-skirt', 'Robe skirt', 'robe', [cyl(1.9, 2.6, 6.5, 0, FOOT_Y + 9, 0, 12)]);
  addPart('robe-hem', 'Robe hem', 'robe', [cyl(2.65, 2.8, 0.9, 0, FOOT_Y + 6.2, 0, 12)]);
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const x0 = Math.cos(a) * 2.35, z0 = Math.sin(a) * 2.35;
    const x1 = Math.cos(a) * 2.7, z1 = Math.sin(a) * 2.7;
    addPart(`drapery-fold-${k + 1}`, `Drapery fold ${k + 1}`, 'robe', [
      strut([x0, FOOT_Y + 6.5, z0], [x1, FOOT_Y + 11.5, z1], 0.55, 0.35),
    ]);
  }
  addPart('chest', 'Chest', 'robe', [box(-2.3, 2.3, FOOT_Y + 21, FOOT_Y + 24.5, -1.2, 1.4)]);
  addPart('left-shoulder', 'Left shoulder', 'robe', [sph(1.35, -2.9, FOOT_Y + 23.6, 0, 10, 8)]);
  addPart('right-shoulder', 'Right shoulder', 'robe', [sph(1.35, 2.9, FOOT_Y + 23.6, 0, 10, 8)]);
}

// --- Arms: outstretched 28 m span (16 parts)
for (const side of [-1, 1]) {
  const nm = side < 0 ? 'Left' : 'Right';
  const sl = nm.toLowerCase();
  addPart(`${sl}-upper-arm`, `${nm} upper arm`, 'arms', [strut([side * 2.9, FOOT_Y + 23.4, 0], [side * 8, FOOT_Y + 23.8, 0.3], 1.5, 1.3)]);
  addPart(`${sl}-forearm`, `${nm} forearm`, 'arms', [strut([side * 8, FOOT_Y + 23.8, 0.3], [side * 12.5, FOOT_Y + 24.1, 0.4], 1.15, 1.0)]);
  addPart(`${sl}-hand`, `${nm} hand`, 'arms', [box(
    side < 0 ? -14 : 12.4, side < 0 ? -12.4 : 14,
    FOOT_Y + 23.5, FOOT_Y + 24.7, -0.15, 0.95,
  )]);
  for (let f = 0; f < 4; f++) {
    const fx = side * 13.95;
    addPart(`${sl}-finger-${f + 1}`, `${nm} finger ${f + 1}`, 'arms', [
      box(side < 0 ? fx - 0.28 : fx - 0.02, side < 0 ? fx + 0.02 : fx + 0.28,
        FOOT_Y + 23.55, FOOT_Y + 24.05, 0.95, 1.75),
    ]);
  }
  addPart(`${sl}-thumb`, `${nm} thumb`, 'arms', [strut(
    [side * 12.7, FOOT_Y + 23.7, 0.8], [side * 13.4, FOOT_Y + 24.3, 1.3], 0.42,
  )]);
  addPart(`${sl}-sleeve`, `${nm} sleeve`, 'arms', [strut([side * 3.2, FOOT_Y + 22.6, 0], [side * 7.6, FOOT_Y + 23.0, 0.3], 1.9, 1.7)]);
}

// --- Head (11 parts)
{
  const HY = FOOT_Y + 26.2;
  addPart('head-core', 'Head core', 'head', [sph(1.55, 0, HY, 0.2, 14, 12)]);
  addPart('face', 'Face', 'head', [sph(1.32, 0, HY - 0.1, 0.75, 12, 10)]);
  addPart('jaw', 'Jaw', 'head', [box(-0.95, 0.95, HY - 1.7, HY - 0.7, 0.6, 1.6)]);
  addPart('nose', 'Nose', 'head', [box(-0.22, 0.22, HY - 0.5, HY + 0.35, 1.55, 2.05)]);
  addPart('brow', 'Brow ridge', 'head', [box(-1.0, 1.0, HY + 0.35, HY + 0.75, 1.15, 1.7)]);
  addPart('hair-crown', 'Hair crown', 'head', [sph(1.62, 0, HY + 0.55, -0.25, 12, 8)]);
  addPart('hair-left', 'Left hair mass', 'head', [sph(0.85, -1.35, HY - 0.3, -0.15, 10, 8)]);
  addPart('hair-right', 'Right hair mass', 'head', [sph(0.85, 1.35, HY - 0.3, -0.15, 10, 8)]);
  addPart('beard', 'Beard', 'head', [box(-0.8, 0.8, HY - 2.0, HY - 0.9, 0.9, 1.7)]);
  addPart('left-ear', 'Left ear', 'head', [sph(0.32, -1.5, HY - 0.2, 0.1, 8, 6)]);
  addPart('right-ear', 'Right ear', 'head', [sph(0.32, 1.5, HY - 0.2, 0.1, 8, 6)]);
}

// --- Chapel interior in the pedestal (4 parts, schematic)
{
  addPart('chapel-nave', 'Chapel nave', 'chapel', [box(-2.2, 2.2, 0.6, 4.2, -2.2, 2.2)]);
  addPart('chapel-altar', 'Chapel altar', 'chapel', [box(-1.0, 1.0, 0.6, 1.7, -2.1, -1.4)]);
  addPart('chapel-apse', 'Chapel apse', 'chapel', [cyl(1.6, 1.6, 3.2, 0, 2.2, -2.4, 12)]);
  addPart('chapel-windows', 'Chapel windows', 'chapel', [
    box(-3.95, -3.75, 2.0, 3.2, -0.6, 0.6),
    box(3.75, 3.95, 2.0, 3.2, -0.6, 0.6),
  ]);
}

// --- Corcovado peak (4 parts, schematic)
{
  addPart('peak-platform', 'Summit platform', 'mountain', [cyl(11, 13, 1.6, 0, -0.8, 0, 20)]);
  addPart('peak-rock-north', 'North peak rock', 'mountain', [cyl(13, 18, 6, 0, -4.5, -9, 9)]);
  addPart('peak-rock-south', 'South peak rock', 'mountain', [cyl(12, 17, 5, 2, -4, 9, 9)]);
  addPart('peak-spur', 'East spur rock', 'mountain', [box(8, 20, -7, -1, -4, 4)]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('pedestal-face') || id === 'pedestal-base-slab') return '#9a938a';
  if (id === 'pedestal-cornice' || id === 'pedestal-plinth') return '#a8a198';
  if (id === 'chapel-door') return '#5a4a3a';
  if (id.startsWith('platform-')) return '#8a8478';
  if (id.includes('thigh') || id.includes('shin')) return '#b8ab98';
  if (id.includes('foot') || id.includes('toes')) return '#a89a82';
  if (id.startsWith('drapery-fold')) return '#c4b89e';
  if (id === 'robe-skirt' || id === 'robe-hem' || id === 'waist-sash') return '#c9bc9f';
  if (id.startsWith('torso') || id === 'chest') return '#cfc2a4';
  if (id.includes('shoulder')) return '#c4b89e';
  if (id.includes('upper-arm') || id.includes('forearm')) return '#c9bc9f';
  if (id.includes('hand') || id.includes('finger') || id.includes('thumb')) return '#bfae8e';
  if (id.includes('sleeve')) return '#bfae8e';
  if (id === 'head-core' || id === 'face' || id === 'jaw') return '#d3c5a5';
  if (id === 'nose' || id === 'brow') return '#c9b992';
  if (id.startsWith('hair')) return '#6a5a42';
  if (id === 'beard') return '#6a5a42';
  if (id.includes('ear')) return '#c9b992';
  if (id.startsWith('chapel-')) return '#8a7a62';
  if (id.startsWith('peak-')) return '#7a7568';
  return '#c9bc9f';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'pedestal', name: 'Pedestal', color: '#9a938a', description: 'The 8 m octagonal stone pedestal carrying the statue, with the chapel door.' },
  { id: 'platform', name: 'Viewing platform', color: '#8a8478', description: 'The viewing deck and railings around the pedestal base.' },
  { id: 'legs', name: 'Legs and feet', color: '#b8ab98', description: 'The robed legs, feet and toes of the figure.' },
  { id: 'robe', name: 'Robe', color: '#c9bc9f', description: 'The Art Deco drapery: torso, waist sash, skirt and sixteen sculpted folds.' },
  { id: 'arms', name: 'Outstretched arms', color: '#c9bc9f', description: 'The 28 m span of open arms: upper arms, forearms, sleeves, hands, fingers and thumbs.' },
  { id: 'head', name: 'Head', color: '#d3c5a5', description: 'The head fashioned by Gheorghe Leonida: face, hair, beard and features.' },
  { id: 'chapel', name: 'Chapel', color: '#8a7a62', description: 'The Chapel of Nossa Senhora Aparecida inside the pedestal, consecrated 2006.' },
  { id: 'mountain', name: 'Corcovado peak', color: '#7a7568', description: 'The summit platform and rock of Corcovado mountain, 700 m above Rio.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
function ex(name, text) { explanations[name.toLowerCase()] = text; }
for (let k = 1; k <= 8; k++) {
  ex(`Pedestal face ${k} lower course`, `Lower stone course of pedestal face ${k}, part of the 8 m octagonal pedestal. Exact coursing is schematic.`);
  ex(`Pedestal face ${k} upper course`, `Upper stone course of pedestal face ${k}, part of the 8 m octagonal pedestal. Exact coursing is schematic.`);
}
ex('Pedestal base slab', 'The base slab spreading the load of statue and pedestal onto the summit. Exact foundation is schematic.');
ex('Pedestal cornice', 'The cornice crowning the octagonal pedestal below the statue plinth. Exact profile is schematic.');
ex('Statue plinth', 'The plinth the figure stands on at the top of the 8 m pedestal. Exact form is schematic.');
ex('Chapel door', 'The door to the Chapel of Nossa Senhora Aparecida inside the pedestal base, consecrated in 2006. Exact position is schematic.');
ex('Viewing deck', 'The viewing deck around the pedestal, where visitors take in Rio, Copacabana, Ipanema and Sugarloaf Mountain. Exact layout is schematic.');
for (let k = 1; k <= 4; k++) ex(`Viewing deck railing ${k}`, `Railing section ${k} of the viewing deck. Exact railing design is schematic.`);
for (const s of ['Left', 'Right']) {
  const sl = s.toLowerCase();
  ex(`${s} thigh`, `The ${sl} thigh beneath the robe. Exact form is schematic.`);
  ex(`${s} shin`, `The ${sl} shin beneath the robe. Exact form is schematic.`);
  ex(`${s} foot`, `The ${sl} foot planted on the plinth. Exact form is schematic.`);
  for (let t = 1; t <= 5; t++) ex(`${s} toe ${t}`, `${s} toe ${t}. Exact form is schematic.`);
}
ex('Torso front', 'The front of the robed torso. The statue is reinforced concrete faced with soapstone tiles. Exact drapery is schematic.');
ex('Torso back', 'The back of the robed torso. Exact drapery is schematic.');
ex('Torso left side', 'The left side of the robed torso. Exact drapery is schematic.');
ex('Torso right side', 'The right side of the robed torso. Exact drapery is schematic.');
ex('Waist sash', 'The sash at the waist of the robe. Exact form is schematic.');
ex('Robe skirt', 'The skirt of the robe falling to the feet. Exact folds are schematic.');
ex('Robe hem', 'The hem of the robe at the feet. Exact form is schematic.');
for (let k = 1; k <= 16; k++) ex(`Drapery fold ${k}`, `Sculpted drapery fold ${k} of the robe skirt, in the Art Deco manner of Paul Landowski. Exact arrangement is schematic.`);
ex('Chest', 'The chest of the figure below the shoulders. Exact form is schematic.');
ex('Left shoulder', 'The left shoulder joining the outstretched arm. Exact form is schematic.');
ex('Right shoulder', 'The right shoulder joining the outstretched arm. Exact form is schematic.');
for (const s of ['Left', 'Right']) {
  const sl = s.toLowerCase();
  ex(`${s} upper arm`, `The ${sl} upper arm, part of the 28 m span of open arms symbolizing peace. Exact form is schematic.`);
  ex(`${s} forearm`, `The ${sl} forearm. Exact form is schematic.`);
  ex(`${s} hand`, `The open ${sl} hand. Exact form is schematic.`);
  for (let f = 1; f <= 4; f++) ex(`${s} finger ${f}`, `${s} finger ${f}. Exact form is schematic.`);
  ex(`${s} thumb`, `The ${sl} thumb. Exact form is schematic.`);
  ex(`${s} sleeve`, `The ${sl} sleeve of the robe over the upper arm. Exact drapery is schematic.`);
}
ex('Head core', 'The core of the head, fashioned by Romanian sculptor Gheorghe Leonida. Exact features are schematic.');
ex('Face', 'The serene face of the figure, gazing over Rio. Exact features are schematic.');
ex('Jaw', 'The jaw line of the face. Exact form is schematic.');
ex('Nose', 'The nose. Exact form is schematic.');
ex('Brow ridge', 'The brow ridge above the eyes. Exact form is schematic.');
ex('Hair crown', 'The crown of the hair. Exact styling is schematic.');
ex('Left hair mass', 'The mass of hair on the left side of the head. Exact styling is schematic.');
ex('Right hair mass', 'The mass of hair on the right side of the head. Exact styling is schematic.');
ex('Beard', 'The beard. Exact form is schematic.');
ex('Left ear', 'The left ear. Exact form is schematic.');
ex('Right ear', 'The right ear. Exact form is schematic.');
ex('Chapel nave', 'The nave of the chapel inside the pedestal. Exact interior is schematic.');
ex('Chapel altar', 'The altar of the chapel. Exact form is schematic.');
ex('Chapel apse', 'The apse of the chapel. Exact form is schematic.');
ex('Chapel windows', 'Windows lighting the chapel interior. Exact form is schematic.');
ex('Summit platform', 'The platform on the summit of Corcovado, 700 m above sea level in Tijuca National Park. Exact form is schematic.');
ex('North peak rock', 'Rock of the Corcovado peak on the north side. Exact form is schematic.');
ex('South peak rock', 'Rock of the Corcovado peak on the south side. Exact form is schematic.');
ex('East spur rock', 'Rock spur on the east side of the peak. Exact form is schematic.');

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
const binName = 'christ-the-redeemer-0.bin';
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
  scope: 'Christ the Redeemer, Rio de Janeiro',
  title: 'Christ the Redeemer',
  location: 'Rio de Janeiro, Brazil',
  blurb: 'The 30 m Art Deco statue of Christ on Corcovado mountain, arms spanning 28 m, on an 8 m pedestal. Designed by Paul Landowski and built 1922 to 1931 from reinforced concrete faced with soapstone.',
  sourceUrls: [
    { label: 'Wikipedia: Christ the Redeemer', url: 'https://en.wikipedia.org/wiki/Christ_the_Redeemer' },
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
  chunks: [{ url: '/models/christ-the-redeemer/christ-the-redeemer-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
