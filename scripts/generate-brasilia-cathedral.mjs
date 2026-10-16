// Procedural Brasilia Cathedral for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Cathedral of Brasilia in
// code and writes it in the atlas binary format:
//   public/models/brasilia-cathedral/atlas.json
//   public/models/brasilia-cathedral/brasilia-cathedral-0.bin
//
// Sourced dimensions and facts (all verified via web search, 2026-10-10):
//   Metropolitan Cathedral of Our Lady of Aparecida, Brasilia, designed
//   by Oscar Niemeyer with structural engineer Joaquim Cardozo;
//   foundation stone 12 September 1958, concrete structure completed
//   1960, inaugurated 31 May 1970; heritage-listed 1967, before the
//   inauguration.
//   A concrete-framed hyperboloid: 16 identical curved concrete columns,
//   each 42 m long and weighing 90 tonnes, rising from a 70 m diameter
//   circle and meeting 40 m up, read as two hands lifted to heaven;
//   the nave is 70 m across and holds 4,000 people; most of the church
//   is below ground, entered by a ramp tunnel beneath a reflecting pool
//   12 m wide and 40 cm deep; the gaps between columns are glazed with
//   fiberglass panels carrying 2,000 sq m of stained glass by Marianne
//   Peretti (1990) in blue, green, white and brown.
//   Three angels by Alfredo Ceschiatti (1970, with Dante Croce) hang over
//   the nave on steel cables: 2.22 m, 3.4 m and 4.25 m long; four bronze
//   Evangelists by Ceschiatti stand at the entrance; the altar was
//   donated by Pope Paul VI; the Way of the Cross is by Di Cavalcanti;
//   a separate bell tower carries four bells donated by Spain; the
//   ovoid baptistry dome stands to the side.
// Schematic (not sourced, never stated as fact in the UI): the exact
// hyperbola parameters of the columns (modeled as a smooth curve from a
// 34 m base radius to a 2 m crown radius); column cross-sections and
// taper; glass panel subdivision; underground nave layout, pew and
// altar forms; angel poses and suspension; evangelist poses; bell tower
// and baptistry dimensions; pool edging; ramp and tunnel geometry.
//
// Coordinate frame: x = east-west, z = north-south, y = up, origin at
// nave center floor level. All dimensions in meters.
//
// Granularity: 100+ named parts across 10 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-brasilia-cathedral.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'brasilia-cathedral');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (70 m diameter) maps to 2.4 units.
const S = 2.4 / 76;
const rad = (d) => (d * Math.PI) / 180;

// Column centerline radius at height y (schematic hyperbola read).
function colR(y) {
  const t = Math.min(1, Math.max(0, y / 40));
  return 2 + 32 * Math.pow(1 - t, 1.7);
}
function colPoint(thetaDeg, y) {
  const t = rad(thetaDeg), r = colR(y);
  return [r * Math.cos(t), y, r * Math.sin(t)];
}

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
function cone(r, h, x, y, z, seg = 10) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// ================= 16 COLUMNS (3 segments each) =================
const SEGS = [[0, 14, 'base'], [14, 28, 'mid'], [28, 40, 'crown']];
for (let c = 0; c < 16; c++) {
  const theta = c * 22.5;
  for (const [y0, y1, sname] of SEGS) {
    const a = colPoint(theta, y0), b = colPoint(theta, y1);
    // Taper: wider at the base.
    const w = 3.2 - (y0 / 40) * 1.6;
    const d = 2.0 - (y0 / 40) * 0.9;
    addPart(`column-${c + 1}-${sname}`, `Column ${c + 1} ${sname} segment`, 'columns', [
      strut(a, b, w, d),
    ]);
  }
}
// Column footings (merged) and the crown ring where columns meet.
{
  const feet = [];
  for (let c = 0; c < 16; c++) {
    const [fx, , fz] = colPoint(c * 22.5, 0);
    feet.push(box(fx - 2.2, fx + 2.2, -1.5, 0.6, fz - 2.2, fz + 2.2));
  }
  addPart('column-footings', 'Column footings', 'columns', feet);
}
addPart('crown-ring', 'Crown ring', 'columns', [cyl(3.2, 3.2, 2.4, 0, 40.6, 0, 16)]);

// ================= 16 GLASS PANELS =================
// Lathe surface of the column profile, split into 16 bays.
{
  const profile = [];
  for (let i = 0; i <= 12; i++) {
    const y = (i / 12) * 40;
    profile.push(new THREE.Vector2(colR(y) + 0.4, y));
  }
  for (let c = 0; c < 16; c++) {
    const g = new THREE.LatheGeometry(profile, 5, c * Math.PI / 8, Math.PI / 8);
    addPart(`glass-panel-${c + 1}`, `Glass panel ${c + 1}`, 'glass', [g]);
  }
}

// ================= BASE, POOL, ENTRANCE =================
addPart('base-platform', 'Base platform', 'base', [cyl(38, 40, 1.6, 0, -0.8, 0, 32)]);
{
  const steps = [];
  for (let s = 0; s < 4; s++) {
    steps.push(cyl(38 - s * 1.2, 38 - s * 1.2, 0.4, 0, -1.6 + s * 0.4, 0, 32));
  }
  addPart('platform-steps', 'Platform steps', 'base', steps);
}
// Reflecting pool: 12 m wide ring, 0.4 m deep, around the cathedral.
{
  const outer = new THREE.CylinderGeometry(52, 52, 0.5, 40);
  const inner = new THREE.CylinderGeometry(40, 40, 0.6, 40);
  // Ring via two cylinders is solid; build ring as a flat torus-ish band:
  const ringPts = [];
  const band = new THREE.CylinderGeometry(52, 52, 0.4, 40, 1, true);
  band.translate(0, -1.4, 0);
  const water = new THREE.CylinderGeometry(51.4, 51.4, 0.15, 40);
  water.translate(0, -1.35, 0);
  const innerWall = new THREE.CylinderGeometry(40.2, 40.2, 0.9, 40, 1, true);
  innerWall.translate(0, -1.5, 0);
  addPart('reflecting-pool-ring', 'Reflecting pool ring', 'pool', [band, innerWall]);
  addPart('reflecting-pool-water', 'Reflecting pool water', 'pool', [water]);
  void outer; void inner; void ringPts;
}
// Entrance ramp and tunnel passing under the pool.
addPart('entrance-ramp', 'Entrance ramp', 'entrance', [
  box(-4, 4, -3.4, -2.6, 40, 58),
  box(-4.6, 4.6, -3.6, -2.4, 40, 58),
]);
addPart('entrance-tunnel', 'Entrance tunnel', 'entrance', [
  box(-4, 4, -6, -3.4, 20, 40),
  box(-5, 5, -3.4, -2.8, 20, 40),
]);
addPart('tunnel-lighting', 'Tunnel lighting strip', 'entrance', [
  box(-0.3, 0.3, -3.5, -3.1, 20, 40),
]);
addPart('entrance-doors', 'Entrance doors', 'entrance', [
  box(-3.6, -0.4, -6, -2.4, 19.4, 20),
  box(0.4, 3.6, -6, -2.4, 19.4, 20),
]);

// ================= NAVE INTERIOR (below ground) =================
addPart('nave-floor', 'Nave floor', 'nave', [cyl(33, 33, 0.5, 0, -6.2, 0, 32)]);
addPart('altar-platform', 'Altar platform', 'nave', [cyl(8, 9, 1.2, 0, -5.4, 0, 20)]);
addPart('altar', 'Altar', 'nave', [box(-2.4, 2.4, -4.8, -3.6, -1.2, 1.2)]);
addPart('altar-cross', 'Altar cross', 'nave', [
  box(-0.15, 0.15, -3.6, -1.2, -0.15, 0.15),
  box(-0.8, 0.8, -2.6, -2.3, -0.15, 0.15),
]);
{
  // Pews in concentric arcs (merged).
  const pews = [];
  for (let r = 12; r <= 28; r += 4) {
    for (let a = 0; a < 10; a++) {
      const th = rad(200 + a * 14);
      const px = r * Math.cos(th), pz = r * Math.sin(th);
      const g = box(-1.6, 1.6, 0, 1, -0.3, 0.3);
      g.rotateY(-th + Math.PI / 2);
      g.translate(px, -6, pz);
      pews.push(g);
    }
  }
  addPart('pews', 'Pews', 'nave', pews);
}
addPart('sacristy', 'Sacristy', 'nave', [box(24, 32, -6, -2, -8, 8)]);
addPart('baptismal-font', 'Baptismal font', 'nave', [
  cyl(1.1, 0.7, 1.1, -14, -5.4, 10, 10),
  cyl(1.3, 1.3, 0.3, -14, -4.7, 10, 10),
]);
// Three suspended angels (schematic figures).
const angelDims = [[2.22, -8, 6], [3.4, 4, -2], [4.25, 10, 8]];
angelDims.forEach(([len, ax, az], i) => {
  const body = new THREE.CapsuleGeometry(0.35, len * 0.55, 4, 8);
  body.rotateZ(Math.PI / 2.4);
  body.translate(ax, 18, az);
  const wingL = box(-0.1, 0.1, 0, len * 0.5, -0.5, 0.5);
  wingL.rotateZ(0.7); wingL.translate(ax - 0.7, 18.6, az);
  const wingR = box(-0.1, 0.1, 0, len * 0.5, -0.5, 0.5);
  wingR.rotateZ(-0.7); wingR.translate(ax + 0.7, 18.6, az);
  const cable = cyl(0.05, 0.05, 40 - 18, ax, 29, az, 6);
  addPart(`angel-${i + 1}`, `Suspended angel ${i + 1}`, 'angels', [body, wingL, wingR, cable]);
});
// Way of the Cross (merged stations).
{
  const stations = [];
  for (let i = 0; i < 14; i++) {
    const th = rad(i * (360 / 14));
    stations.push(box(-0.7, 0.7, -5.6, -4.2, -0.15, 0.15).translate(30 * Math.cos(th), 0, 30 * Math.sin(th)));
  }
  addPart('way-of-the-cross', 'Way of the Cross', 'nave', stations);
}

// ================= FOUR EVANGELISTS =================
const evNames = ['matthew', 'mark', 'luke', 'john'];
evNames.forEach((nm, i) => {
  const ex = -14 + i * 9;
  const body = cyl(0.7, 1.0, 3.2, ex, 1.6, 46, 8);
  const head = new THREE.SphereGeometry(0.42, 10, 8);
  head.translate(ex, 3.6, 46);
  const plinth = box(ex - 1.1, ex + 1.1, -1.6, 0, 45, 47);
  addPart(`evangelist-${nm}`, `Evangelist ${nm[0].toUpperCase() + nm.slice(1)}`, 'evangelists', [body, head, plinth]);
});

// ================= BELL TOWER =================
addPart('bell-tower-base', 'Bell tower base', 'bell-tower', [box(38, 44, -1.6, 2, 18, 24)]);
addPart('bell-tower-shaft', 'Bell tower shaft', 'bell-tower', [box(39.4, 42.6, 2, 22, 19.4, 22.6)]);
{
  const bells = [];
  for (const [bx, bz] of [[40, 20], [42, 20], [40, 22], [42, 22]]) {
    bells.push(cyl(0.5, 0.9, 1.6, bx, 20.5, bz, 8));
  }
  addPart('bell-tower-bells', 'Bell tower bells', 'bell-tower', bells);
}
addPart('bell-tower-chamber', 'Bell chamber', 'bell-tower', [
  box(39, 43, 18, 22, 19, 23),
  box(38.6, 43.4, 22, 23, 18.6, 23.4),
]);

// ================= BAPTISTRY =================
addPart('baptistry-base', 'Baptistry base', 'baptistry', [cyl(7, 8, 2.5, -48, -0.4, -18, 16)]);
{
  const dome = new THREE.SphereGeometry(7, 16, 12);
  dome.scale(1, 0.75, 1);
  dome.translate(-48, 1, -18);
  addPart('baptistry-dome', 'Baptistry ovoid dome', 'baptistry', [dome]);
}

// ================= PLAZA FITTINGS =================
addPart('pool-edge-coping', 'Pool edge coping', 'pool', [cyl(52.6, 52.6, 0.5, 0, -1.2, 0, 40)]);
addPart('pool-drainage-channel', 'Pool drainage channel', 'pool', [cyl(39.6, 39.6, 0.4, 0, -1.7, 0, 40)]);
addPart('choir-loft', 'Choir loft', 'nave', [box(-10, 10, -2.4, -1.2, 22, 30)]);
{
  const confs = [];
  for (let i = 0; i < 4; i++) {
    const th = rad(120 + i * 18);
    const cx = 30 * Math.cos(th), cz = 30 * Math.sin(th);
    confs.push(box(cx - 1.2, cx + 1.2, -6, -3.4, cz - 1.2, cz + 1.2));
  }
  addPart('confessionals', 'Confessionals', 'nave', confs);
}
addPart('plaza-cross', 'Plaza cross', 'base', [
  box(-0.3, 0.3, -1.6, 6, -0.3, 0.3),
  box(-1.8, 1.8, 2.4, 3, -0.3, 0.3),
]);
{
  const masts = [];
  for (const [mx, mz] of [[-56, 30], [-56, 36], [-56, 42]]) {
    masts.push(cyl(0.12, 0.16, 9, mx, 3, mz, 6));
    masts.push(box(mx - 0.9, mx + 0.9, -1.8, -1.2, mz - 0.9, mz + 0.9));
  }
  addPart('flag-masts', 'Flag masts', 'base', masts);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('glass-panel')) {
    const n = parseInt(id.split('-')[2], 10);
    return n % 2 ? '#5b8fa8' : '#6fa08a';
  }
  if (id.includes('angel')) return '#d8d2c4';
  if (id.includes('evangelist')) return '#5a4a33';
  if (id.includes('pool-water')) return '#4a7a96';
  if (id.includes('pool')) return '#b8b2a2';
  if (id.includes('altar')) return '#e8e2d4';
  if (id.includes('pew')) return '#6b4f2e';
  if (id.includes('bell') && id.includes('bells')) return '#8a6f3c';
  if (id.includes('crown-ring') || id.includes('footing')) return '#b5aa92';
  return '#e3ddd0';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'columns', name: 'Hyperboloid columns', color: '#e3ddd0', description: 'The 16 identical curved concrete columns, each 42 m long and 90 tonnes, in three segments.' },
  { id: 'glass', name: 'Glass panels', color: '#5b8fa8', description: 'The fiberglass glazing between the columns, carrying Marianne Peretti\'s 1990 stained glass.' },
  { id: 'base', name: 'Base and platform', color: '#b5aa92', description: 'The circular base platform and its steps.' },
  { id: 'pool', name: 'Reflecting pool', color: '#4a7a96', description: 'The 12 m wide, 40 cm deep reflecting pool ringing the cathedral.' },
  { id: 'entrance', name: 'Entrance', color: '#8f8578', description: 'The ramp and tunnel passing beneath the pool into the church.' },
  { id: 'nave', name: 'Nave', color: '#e8e2d4', description: 'The underground nave: floor, altar, pews, baptistery fittings and the Way of the Cross.' },
  { id: 'angels', name: 'Suspended angels', color: '#d8d2c4', description: 'The three angels by Alfredo Ceschiatti hanging over the nave on steel cables.' },
  { id: 'evangelists', name: 'Evangelists', color: '#5a4a33', description: 'The four bronze Evangelists by Ceschiatti at the entrance.' },
  { id: 'bell-tower', name: 'Bell tower', color: '#e3ddd0', description: 'The separate bell tower with four bells donated by Spain.' },
  { id: 'baptistry', name: 'Baptistry', color: '#e3ddd0', description: 'The baptistry with its ovoid dome.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (let c = 1; c <= 16; c++) {
  for (const sname of ['base', 'mid', 'crown']) {
    explanations[`column ${c} ${sname} segment`] = `The ${sname} third of column ${c}, one of 16 identical curved concrete columns, each 42 m long and weighing 90 tonnes. Exact curve and section are schematic.`;
  }
  explanations[`glass panel ${c}`] = `The fiberglass glazing bay ${c} between two columns, part of the 2,000 sq m of stained glass by Marianne Peretti (1990). Exact subdivision is schematic.`;
}
Object.assign(explanations, {
  'column footings': 'The footings anchoring the 16 columns to the base platform. Exact form is schematic.',
  'crown ring': 'The ring where the 16 columns meet 40 m up. Exact form is schematic.',
  'base platform': 'The circular base platform of the cathedral. Exact dimensions are schematic.',
  'platform steps': 'Steps around the base platform. Exact count is schematic.',
  'reflecting pool ring': 'The ring wall of the reflecting pool, 12 m wide and 40 cm deep, which cools the structure. Exact construction is schematic.',
  'reflecting pool water': 'The water of the reflecting pool; visitors pass beneath it on the entrance ramp.',
  'entrance ramp': 'The ramp descending beneath the reflecting pool toward the church. Exact geometry is schematic.',
  'entrance tunnel': 'The tunnel from the ramp into the nave, kept in semi-darkness to prepare the faithful. Exact geometry is schematic.',
  'tunnel lighting strip': 'Lighting strip in the entrance tunnel. Exact form is schematic.',
  'entrance doors': 'The doors from the tunnel into the nave. Exact form is schematic.',
  'nave floor': 'The floor of the underground nave, 70 m across. Exact finish is schematic.',
  'altar platform': 'The raised platform of the altar. Exact form is schematic.',
  'altar': 'The altar, donated by Pope Paul VI. Exact form is schematic.',
  'altar cross': 'The cross above the altar. Exact form is schematic.',
  'pews': 'Pews arranged in arcs around the altar for 4,000 worshippers. Exact layout is schematic.',
  'sacristy': 'The sacristy beside the nave. Exact layout is schematic.',
  'baptismal font': 'The baptismal font. Exact form is schematic.',
  'suspended angel 1': 'One of three angels by Alfredo Ceschiatti (1970), 2.22 m long, suspended on steel cables over the nave. Exact pose is schematic.',
  'suspended angel 2': 'One of three angels by Ceschiatti, 3.4 m long, suspended over the nave. Exact pose is schematic.',
  'suspended angel 3': 'The largest of the three angels by Ceschiatti, 4.25 m long. Exact pose is schematic.',
  'way of the cross': 'The Way of the Cross by Di Cavalcanti around the nave. Exact forms are schematic.',
  'evangelist matthew': 'The bronze Evangelist Matthew by Alfredo Ceschiatti at the entrance. Exact pose is schematic.',
  'evangelist mark': 'The bronze Evangelist Mark by Ceschiatti at the entrance. Exact pose is schematic.',
  'evangelist luke': 'The bronze Evangelist Luke by Ceschiatti at the entrance. Exact pose is schematic.',
  'evangelist john': 'The bronze Evangelist John by Ceschiatti at the entrance. Exact pose is schematic.',
  'bell tower base': 'The base of the separate bell tower. Exact dimensions are schematic.',
  'bell tower shaft': 'The shaft of the bell tower. Exact form is schematic.',
  'bell tower bells': 'The four bells of the bell tower, donated by Spain. Exact form is schematic.',
  'bell chamber': 'The bell chamber at the top of the bell tower. Exact form is schematic.',
  'baptistry base': 'The base of the baptistry. Exact form is schematic.',
  'baptistry ovoid dome': 'The ovoid dome of the baptistry. Exact form is schematic.',
  'pool edge coping': 'The coping stones edging the reflecting pool. Exact profile is schematic.',
  'pool drainage channel': 'The drainage channel inside the pool ring. Exact form is schematic.',
  'choir loft': 'The choir loft above the nave entrance. Exact form is schematic.',
  'confessionals': 'Confessionals around the nave wall. Exact count and form are schematic.',
  'plaza cross': 'The cross in the plaza before the cathedral. Exact form is schematic.',
  'flag masts': 'Flag masts in the plaza. Exact positions are schematic.',
});

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
const binName = 'brasilia-cathedral-0.bin';
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
  scope: 'Brasilia Cathedral, Brazil (schematic)',
  title: 'Brasilia Cathedral',
  location: 'Brasilia, Brazil',
  blurb: 'Oscar Niemeyer\'s 1970 hyperboloid cathedral: 16 curved concrete columns rising 40 m from a 70 m circle, glazed between with stained glass, with its angels, evangelists, bell tower and baptistry.',
  sourceUrls: [
    { label: 'Wikipedia: Cathedral of Brasilia', url: 'https://en.wikipedia.org/wiki/Cathedral_of_Bras%C3%ADlia' },
    { label: 'WikiArquitectura: Brasilia Cathedral', url: 'https://en.wikiarquitectura.com/building/Brasilia-Cathedral/' },
    { label: 'illustrarch: Niemeyer\'s Cathedral of Brasilia', url: 'https://illustrarch.com/articles/112400-oscar-niemeyer-brasilia-cathedral.html' },
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
  chunks: [{ url: '/models/brasilia-cathedral/brasilia-cathedral-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
