// Simplified schematic Sagrada Familia for the Architectural Atlas.
//
// The "simple" variant of the Sagrada Familia: same footprint, massing and
// proportions as the detailed model (see scripts/generate-sagrada-familia.mjs,
// whose header lists every sourced dimension reused here), but coarser:
// 33 named parts across 6 systems instead of 134 across 12. Individual spires,
// portals, columns and chapels are merged into group parts; ornament
// (mosaic pinnacles, symbols, rose window, magic square) is omitted.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-sagrada-familia.mjs for the full attribution):
//   90 m long, 60 m wide, 7.5 m planning module; vault heights: nave 45 m,
//   aisles 30 m, transept 60 m, apse vault 75 m; 18 spires planned:
//   12 apostles at 100 m, 4 evangelists at 135 m, Virgin Mary at 138 m,
//   Jesus Christ at 172.5 m (tallest church tower in the world); Glory
//   apostle spires rise from about 30 m on the street side; Nativity Facade
//   (northeast, sunrise), Passion Facade (southwest, sunset, six
//   inward-slanting columns), Glory Facade (south, main entrance, seven
//   bronze doors, eight beatitude columns); branching tree-like columns,
//   no flying buttresses; four monumental porphyry crossing columns;
//   crossing great hyperboloid ringed by two rings of twelve hyperboloids;
//   apse with seven chapels and ambulatory; cloister surrounding the church;
//   Chapel of the Assumption; crypt foundations.
// Schematic (not sourced, never stated as fact in the UI): exact footprint
// placement and facade orientations; merged group geometry; simplified
// spire, column and vault profiles.
//
// Writes:
//   public/models/sagrada-familia-simple/atlas.json
//   public/models/sagrada-familia-simple/sagrada-familia-simple-0.bin
//
// Usage: node scripts/generate-sagrada-familia-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'sagrada-familia-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (172.5 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 172.5;

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
// Paraboloid spire shaft via lathe: base radius rb at y0 tapering to rt at y1.
function spireShaft(x, z, y0, y1, rb, rt, seg = 8) {
  const pts = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector2(rt + (rb - rt) * Math.pow(1 - t, 1.6), y0 + (y1 - y0) * t));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  g.translate(x, 0, z);
  return g;
}
// Barrel vault with axis along Z, opening downward, apex at springY + r.
function vaultZ(r, len, cx, springY, cz) {
  const g = new THREE.CylinderGeometry(r, r, len, 12, 1, true, 0, Math.PI);
  g.rotateX(Math.PI / 2);
  g.rotateZ(Math.PI / 2);
  g.translate(cx, springY, cz);
  return g;
}
// Barrel vault with axis along X, opening downward, apex at springY + r.
function vaultX(r, len, cx, springY, cz) {
  const g = new THREE.CylinderGeometry(r, r, len, 12, 1, true, 0, Math.PI);
  g.rotateZ(Math.PI / 2);
  g.translate(cx, springY, cz);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Apostle spires: 12 spires at 100 m, grouped per facade (sourced
// heights and facade arrangement): 3 parts.
const APOSTLE_GROUPS = [
  { id: 'nativity', name: 'Nativity', x: 28, y0: 12, zs: [13, 19, 25, 31] },
  { id: 'passion', name: 'Passion', x: -28, y0: 12, zs: [13, 19, 25, 31] },
  { id: 'glory', name: 'Glory', x: null, y0: 30, xs: [-22.5, -7.5, 7.5, 22.5], z: -48 },
];
for (const g of APOSTLE_GROUPS) {
  const geoms = [];
  const positions = g.xs ? g.xs.map((x) => [x, g.z]) : g.zs.map((z) => [g.x, z]);
  for (const [x, z] of positions) {
    geoms.push(spireShaft(x, z, g.y0, 100, 4.5, 1.1));
    const cone = new THREE.ConeGeometry(2.0, 7, 8);
    cone.translate(x, 103.5, z);
    geoms.push(cone);
  }
  addPart(`${g.id}-apostle-spires`, `${g.name} apostle spires`, 'spires', geoms);
}

// --- Evangelist spires: 4 spires at 135 m, shaft plus a simple crown marker
// (sourced heights; Matthew angel, Mark lion, Luke ox, John eagle): 4 parts.
const EVANGELISTS = [
  { name: 'Matthew', symbol: 'angel', x: 13, z: 35.5 },
  { name: 'Mark', symbol: 'lion', x: -13, z: 35.5 },
  { name: 'Luke', symbol: 'ox', x: 13, z: 9.5 },
  { name: 'John', symbol: 'eagle', x: -13, z: 9.5 },
];
for (const e of EVANGELISTS) {
  const shaft = spireShaft(e.x, e.z, 55, 135, 5, 1.5);
  const marker = new THREE.ConeGeometry(2.2, 4.5, 8);
  marker.translate(e.x, 137.5, e.z);
  addPart(`evangelist-${e.name.toLowerCase()}-spire`, `${e.name} spire (${e.symbol})`, 'spires', [shaft, marker]);
}

// --- Central spires: Jesus (172.5 m) and Mary (138 m): 3 parts.
{
  const shaft = spireShaft(0, 22.5, 60, 142.5, 9, 3, 10);
  const drum = cyl(3.4, 3.4, 13.5, 0, 149.25, 22.5, 12);
  addPart('jesus-spire', 'Jesus Christ spire', 'spires', [shaft, drum]);
}
{
  const beam = box(-0.8, 0.8, 155.5, 172.5, 21.7, 23.3);
  const arm1 = box(-4, 4, 163, 164.2, 21.9, 23.1);
  const arm2 = box(-3, 3, 168.5, 169.5, 22, 23);
  addPart('jesus-cross', 'Jesus spire cross', 'spires', [beam, arm1, arm2]);
}
{
  const shaft = spireShaft(0, 38, 60, 138, 7, 2.5, 10);
  const crown = new THREE.CylinderGeometry(4.2, 4.2, 3, 10);
  crown.translate(0, 139.5, 38);
  const starUp = new THREE.ConeGeometry(2, 3, 8);
  starUp.translate(0, 145, 38);
  const starDown = new THREE.ConeGeometry(2, 3, 8);
  starDown.rotateX(Math.PI);
  starDown.translate(0, 143, 38);
  addPart('mary-spire', 'Virgin Mary spire', 'spires', [shaft, crown, starUp, starDown]);
}

// --- Facades: three great facades, walls and portals merged: 6 parts.
{
  const wall = box(28, 31, 0, 35, 8, 37);
  const t1 = cyl(2.5, 3, 40, 29, 20, 10, 8);
  const t2 = cyl(2.5, 3, 40, 29, 20, 35, 8);
  addPart('nativity-facade', 'Nativity Facade', 'facades', [wall, t1, t2]);
}
{
  const geoms = [];
  for (const z of [22.5, 28.5, 16.5]) {
    geoms.push(box(29.2, 31.6, 0, 14, z - 3.2, z + 3.2));
    geoms.push(box(30.6, 31.2, 0, 11, z - 2.4, z + 2.4));
  }
  addPart('nativity-portals', 'Nativity portals', 'facades', geoms);
}
{
  const geoms = [box(-32, -28, 30, 42, 10, 35)];
  for (const z of [13, 17.4, 21.8, 26.2, 30.6, 35]) {
    geoms.push(strut([-34, 0, z], [-29.5, 30, z], 2.2));
  }
  addPart('passion-facade', 'Passion Facade', 'facades', geoms);
}
{
  const geoms = [];
  for (const z of [16, 22.5, 29]) {
    geoms.push(box(-31.5, -29.5, 0, 12, z - 2.5, z + 2.5));
  }
  addPart('passion-portals', 'Passion portals', 'facades', geoms);
}
{
  const geoms = [box(-30, 30, 0, 30, -52.5, -50)];
  for (const x of [-24.5, -17.5, -10.5, -3.5, 3.5, 10.5, 17.5, 24.5]) {
    geoms.push(cyl(1.5, 1.8, 30, x, 15, -56, 8));
  }
  addPart('glory-facade', 'Glory Facade', 'facades', geoms);
}
{
  const geoms = [];
  for (let i = 0; i < 7; i++) {
    const x = -21 + i * 7;
    geoms.push(box(x - 2, x + 2, 0, 10, -53, -52.4));
  }
  addPart('glory-doors', 'Glory doors', 'facades', geoms);
}

// --- Nave: branching tree columns on the 7.5 m grid, four monumental
// porphyry crossing columns (sourced), outer walls: 5 parts.
{
  const mainZ = [-33.75, -18.75, -3.75, 11.25];
  for (const sx of [-7.5, 7.5]) {
    const geoms = [];
    const row = sx < 0 ? 'West' : 'East';
    for (const z of mainZ) {
      geoms.push(cyl(1.2, 1.7, 32, sx, 16, z, 8));
      for (let b = 0; b < 4; b++) {
        const a = (b / 4) * Math.PI * 2 + 0.4;
        geoms.push(strut(
          [sx, 30, z],
          [sx + Math.cos(a) * 5.5, 44, z + Math.sin(a) * 5.5],
          0.8,
        ));
      }
    }
    addPart(`nave-columns-${row.toLowerCase()}`, `${row} nave columns`, 'nave', geoms);
  }
  const geoms = [];
  for (const [x, z] of [[7.5, 15], [7.5, 30], [-7.5, 15], [-7.5, 30]]) {
    geoms.push(cyl(2, 2.4, 60, x, 30, z, 10));
  }
  addPart('crossing-columns', 'Crossing columns', 'nave', geoms);
  addPart('nave-wall-west', 'West nave wall', 'nave', [box(-22.9, -22.3, 0, 32, -45, 15)]);
  addPart('nave-wall-east', 'East nave wall', 'nave', [box(22.3, 22.9, 0, 32, -45, 15)]);
}

// --- Vaults and roofs (sourced heights): 5 parts.
addPart('nave-vault', 'Central nave vault', 'vaults', [vaultZ(7.5, 60, 0, 37.5, -15)]);
addPart('aisle-vault-west', 'West aisle vault', 'vaults', [vaultZ(7.5, 60, -15, 22.5, -15)]);
addPart('aisle-vault-east', 'East aisle vault', 'vaults', [vaultZ(7.5, 60, 15, 22.5, -15)]);
addPart('transept-vault', 'Transept vault', 'vaults', [vaultX(11.25, 60, 0, 48.75, 22.5)]);
{
  const geoms = [new THREE.CylinderGeometry(12, 8, 15, 12, 1, true)];
  geoms[0].translate(0, 67.5, 22.5);
  for (const [radius, y] of [[10, 75], [13, 69]]) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const c = new THREE.ConeGeometry(1.5, 6, 6);
      c.translate(Math.cos(a) * radius, y, 22.5 + Math.sin(a) * radius);
      geoms.push(c);
    }
  }
  addPart('crossing-hyperboloid', 'Crossing hyperboloid', 'vaults', geoms);
}

// --- Apse (seven chapels, ambulatory, 75 m hyperboloid vault): 4 parts.
{
  const wall = new THREE.CylinderGeometry(15, 15, 40, 16, 1, true, -Math.PI / 2, Math.PI);
  wall.translate(0, 20, 30);
  addPart('apse-wall', 'Apse wall', 'apse', [wall]);
}
{
  const geoms = [];
  for (let i = 0; i < 7; i++) {
    const a = (-60 + i * 20) * Math.PI / 180;
    const g = box(-2.5, 2.5, 0, 12, -2, 2);
    g.rotateY(-a);
    g.translate(Math.sin(a) * 17, 0, 30 + Math.cos(a) * 17);
    geoms.push(g);
  }
  addPart('apse-chapels', 'Apse chapels', 'apse', geoms);
}
{
  const amb = new THREE.CylinderGeometry(10, 10, 8, 16, 1, true, -Math.PI / 2, Math.PI);
  amb.translate(0, 4, 30);
  addPart('apse-ambulatory', 'Apse ambulatory', 'apse', [amb]);
}
{
  const vault = new THREE.CylinderGeometry(2, 12, 35, 16, 1, true);
  vault.translate(0, 57.5, 30);
  addPart('apse-vault', 'Apse vault', 'apse', [vault]);
}

// --- Cloister and crypt: 3 parts.
{
  const geoms = [
    box(-38, 38, 0, 8, 46, 52),
    box(-38, 38, 0, 8, -62, -56),
    box(32, 38, 0, 8, -56, 46),
    box(-38, -32, 0, 8, -56, 46),
  ];
  addPart('cloister', 'Cloister', 'base', geoms);
}
addPart('assumption-chapel', 'Chapel of the Assumption', 'base', [box(-8, 8, 0, 14, 46, 54)]);
{
  const slab = box(-30, 30, -6, -5, -45, 45);
  const v = new THREE.CylinderGeometry(7, 7, 40, 12, 1, true, 0, Math.PI);
  v.rotateX(Math.PI / 2);
  v.rotateZ(Math.PI / 2);
  v.translate(0, -12, 0);
  const w1 = box(-30, 30, -6, 0, -46, -45);
  const w2 = box(-30, 30, -6, 0, 45, 46);
  const w3 = box(-31, -30, -6, 0, -45, 45);
  const w4 = box(30, 31, -6, 0, -45, 45);
  addPart('crypt', 'Crypt', 'base', [slab, v, w1, w2, w3, w4]);
}

// ---------------------------------------------------------------- colors
// Schematic light stone palette (same family as the detailed model;
// the Eiffel Tower is the only dark realistic model in the atlas).
function colorFor(id) {
  if (id === 'jesus-spire' || id === 'mary-spire') return '#e6ddc9';
  if (id === 'jesus-cross') return '#f5f2e8';
  if (id.endsWith('-apostle-spires') || id.startsWith('evangelist-')) return '#d9cfbb';
  if (id === 'nativity-facade') return '#e0d3b8';
  if (id === 'passion-facade' || id === 'glory-facade') return '#cfc8b4';
  if (id.endsWith('-portals') || id === 'glory-doors') return '#4a3728';
  if (id === 'crossing-columns') return '#6b3a34';
  if (id.startsWith('nave-columns-') || id.startsWith('nave-wall-')) return '#a89a80';
  if (id === 'nave-vault' || id === 'transept-vault' || id === 'crossing-hyperboloid') return '#e8e2d4';
  if (id.startsWith('aisle-vault-')) return '#ded8c8';
  if (id === 'apse-ambulatory') return '#8a8478';
  if (id === 'apse-chapels' || id === 'assumption-chapel') return '#cfc4a8';
  if (id.startsWith('apse-')) return '#d9cfbb';
  if (id === 'cloister') return '#d9cfbb';
  if (id === 'crypt') return '#6e6a60';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'spires', name: 'Spires', color: '#e6ddc9', description: 'The planned 18 spires: twelve apostles at 100 m, four evangelists at 135 m, the Virgin Mary at 138 m and Jesus Christ at 172.5 m.' },
  { id: 'facades', name: 'Facades', color: '#d8cdb2', description: 'The three great facades: Nativity in the northeast facing the sunrise, Passion in the southwest facing the sunset, and Glory in the south as the main entrance.' },
  { id: 'nave', name: 'Nave and columns', color: '#a89a80', description: 'The forest of branching tree-like columns on a 7.5 m grid that carries the vaults without flying buttresses.' },
  { id: 'vaults', name: 'Vaults', color: '#e8e2d4', description: 'Hyperboloid and barrel vaults from 30 m in the aisles to 75 m in the apse.' },
  { id: 'apse', name: 'Apse', color: '#d9cfbb', description: 'Seven chapels ringing the apse behind the ambulatory.' },
  { id: 'base', name: 'Cloister and crypt', color: '#b9b2a0', description: 'The cloister surrounding the church and the crypt foundations below.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'nativity apostle spires': 'Four of the twelve apostle spires, each rising to 100 m on the Nativity Facade in the northeast, facing the sunrise. Exact shaft profiles are schematic.',
  'passion apostle spires': 'Four of the twelve apostle spires, each rising to 100 m on the Passion Facade in the southwest, facing the sunset. Exact shaft profiles are schematic.',
  'glory apostle spires': 'Four of the twelve apostles spires on the Glory Facade; on the street side these rise from about 30 m up on the beatitude columns. The Glory spires are not yet built. Exact profiles are schematic.',
  'matthew spire (angel)': 'One of four evangelist spires at 135 m, crowned by the angel of Matthew. Exact sculpture is schematic.',
  'mark spire (lion)': 'One of four evangelist spires at 135 m, crowned by the lion of Mark. Exact sculpture is schematic.',
  'luke spire (ox)': 'One of four evangelist spires at 135 m, crowned by the ox of Luke. Exact sculpture is schematic.',
  'john spire (eagle)': 'One of four evangelist spires at 135 m, crowned by the eagle of John. Exact sculpture is schematic.',
  'jesus christ spire': 'The Tower of Jesus Christ rises to 172.5 m, the tallest church tower in the world since its exterior was completed on 20 February 2026. It rests on four monumental porphyry columns at the crossing. Exact profile is schematic.',
  'jesus spire cross': 'The four-armed cross crowning the basilica, 17 m tall and 13.5 m wide, built in Germany in 2025.',
  'virgin mary spire': 'The Tower of the Virgin Mary rises to 138 m, inaugurated in December 2021, crowned by a twelve-pointed crown and the morning star. Exact profile is schematic.',
  'nativity facade': 'The Nativity Facade wall on the northeast side, facing the sunrise, built under Gaudi direct supervision. Exact massing is schematic.',
  'nativity portals': 'The three portals of the Nativity Facade, representing the theological virtues of Charity, Hope and Faith. Exact portal layout is schematic.',
  'passion facade': 'The Passion Facade on the southwest side, facing the sunset, with six inward-slanting bone-like columns carrying an austere sculptural program of the final days of Christ. Exact angles are schematic.',
  'passion portals': 'The three bronze portals of the Passion Facade. Exact panel divisions are schematic.',
  'glory facade': 'The Glory Facade on the south side, the main entrance facing the sea, with its great narthex carried on columns for the eight beatitudes. Under construction and shown as designed.',
  'glory doors': 'The seven bronze doors of the Glory Facade, representing the seven corporal works of mercy. Under construction and shown as designed.',
  'west nave columns': 'Branching tree-like columns of the nave, part of the forest of columns that carries the vaults without flying buttresses. Columns stand on a 7.5 m grid. Exact branch geometry is schematic.',
  'east nave columns': 'Branching tree-like columns of the nave, part of the forest of columns that carries the vaults without flying buttresses. Columns stand on a 7.5 m grid. Exact branch geometry is schematic.',
  'crossing columns': 'Four monumental porphyry columns at the crossing, carrying the Tower of Jesus Christ. Exact positions are schematic.',
  'west nave wall': 'The west outer wall of the nave above the side aisles. Exact wall articulation is schematic.',
  'east nave wall': 'The east outer wall of the nave above the side aisles. Exact wall articulation is schematic.',
  'central nave vault': 'The central nave vault, rising to 45 m over the five-aisled nave. Exact profile is schematic.',
  'west aisle vault': 'The west side aisle vault at 30 m. Exact profile is schematic.',
  'east aisle vault': 'The east side aisle vault at 30 m. Exact profile is schematic.',
  'transept vault': 'The transept vault at 60 m over the crossing arms. Exact profile is schematic.',
  'crossing hyperboloid': 'The great hyperboloid at the crossing, surrounded by two rings of twelve hyperboloids. Exact geometry is schematic.',
  'apse wall': 'The apse outer wall. Exact massing is schematic.',
  'apse chapels': 'The seven chapels of the apse, opening onto the ambulatory. Exact chapel widths are schematic.',
  'apse ambulatory': 'The ambulatory ringing the apse behind the chapels. Exact layout is schematic.',
  'apse vault': 'The apse hyperboloid vault rising to 75 m, the tallest interior vault of the church. Exact profile is schematic.',
  'cloister': 'The cloister surrounding the church, a layout completely original in Christian architecture, isolating the church from the outside. Exact segment lengths are schematic.',
  'chapel of the assumption': 'The Chapel of the Assumption in the apse section of the cloister. Exact placement is schematic.',
  'crypt': 'The crypt and its foundations below the apse; gaps in the apse floor open down to it. Exact layout is schematic.',
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
const binName = 'sagrada-familia-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the sagrada-familia-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Sagrada Familia, Barcelona (simplified schematic)',
  title: 'Sagrada Familia',
  location: 'Barcelona, Spain',
  blurb: 'Antoni Gaudi\u2019s unfinished basilica in Barcelona, in simplified schematic form: the Latin-cross plan, its forest of branching columns, and the planned 18 spires rising to 172.5 m, the tallest church tower in the world since February 2026.',
  sourceUrls: [
    { label: 'Sagrada Familia official booklet 10: Towers', url: 'https://sagradafamilia.org/documents/20142/1205286/SF_Booklet_10_20240415_digital_AF.pdf/504e0081-e3b7-43ff-be2c-0efb05e2ebaf' },
    { label: 'Sagrada Familia official booklet 7: Passion Facade', url: 'https://sagradafamilia.org/documents/20142/1000561/Booklet_07.pdf/1d9c8f31-1c73-d9bd-4eee-024a935ecac4' },
    { label: 'Sagrada Familia official booklet 8: Glory Facade', url: 'https://sagradafamilia.org/documents/20142/1000561/Booklet_08.pdf' },
    { label: 'Wikipedia: Sagrada Familia', url: 'http://en.wikipedia.org/wiki/Sagrada_Fam%C3%ADlia' },
    { label: 'Popular Science: Tower of Jesus completed February 2026', url: 'https://www.popsci.com/technology/sagrada-familia-church-construction/' },
    { label: 'AZoBuild: Building La Sagrada Familia', url: 'https://www.azobuild.com/article.aspx?ArticleID=8127' },
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
  chunks: [{ url: '/models/sagrada-familia-simple/sagrada-familia-simple-0.bin', bytes: offset }],
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
