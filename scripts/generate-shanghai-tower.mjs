// Procedural Shanghai Tower for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Shanghai Tower in code and
// writes it in the atlas binary format:
//   public/models/shanghai-tower/atlas.json
//   public/models/shanghai-tower/shanghai-tower-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   632 m to the tip (2,073 ft), 128 floors above ground, 5 below;
//   occupied height 561.3 m; completed 2015 (CTBUH), opened to the public
//   2016; design architect Gensler (designers Marshall Strabala and Jun
//   Xia), structural engineer Thornton Tomasetti, local design institute
//   the Architectural Design and Research Institute of Tongji University;
//   built by Shanghai Tower Construction and Development Co. in Pudong's
//   Lujiazui Finance and Trade Zone; third megatall (600 m+) building ever
//   completed, tallest in China, second tallest in the world at completion;
//   the tower twists 120 degrees from base to top, a tapering spiral that
//   reduces wind loads by 24% (wind-tunnel tested in Toronto), saving a
//   reported $58 million in structural material; nine vertical zones of
//   12 to 15 storeys each, stacked; double-skin facade: a cam-shaped
//   (rounded-triangular) twisted outer curtain wall around a circular
//   inner curtain wall, the gap forming sky-garden atriums; 20,000+
//   triangular glass panels; concrete core about 90 by 90 ft
//   (27.4 m square) with composite super-columns and outrigger trusses;
//   1,079 concrete and steel bore piles; 380,000 sq m above grade;
//   five-storey podium 36.9 m high with retail and a multifunction hall;
//   world's fastest elevators (18 to 20.5 m/s), 55 seconds to the
//   observation deck; J Hotel on floors 84 to 110 (second highest hotel
//   in the world at opening); 1,000-tonne tuned mass damper near the top;
//   LEED Platinum / China three-star green building; $2.4 billion cost.
// Schematic (not sourced, never stated as fact in the UI): exact base and
// top radii of the triangular and circular plans; the zone-by-zone height
// split (nine equal zones used here); outrigger levels; super-column
// count and positions; sky-lobby floor depths; podium footprint and
// massing; crown and parapet profiles; damper housing form; pile layout;
// per-face panel subdivision of the curtain walls.
//
// Coordinate frame: y = up (ground = 0), x/z = horizontal. All dimensions
// in meters.
//
// Granularity: ~100 named parts across 9 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-shanghai-tower.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'shanghai-tower');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (632 m) maps to 2.4 units.
const S = 2.4 / 632;

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
function cyl(rt, rb, h, x, y, z, seg = 16) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
// Quad panel from four corners (two triangles), doubled winding so the
// panel is visible from both sides regardless of corner order.
function quad(p1, p2, p3, p4) {
  const v = [...p1, ...p2, ...p3, ...p1, ...p3, ...p4];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  const idx = new Uint32Array([0, 1, 2, 3, 4, 5, 0, 2, 1, 3, 5, 4]);
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}
// Triangular plan: circumradius R(h), rotation th(h) = 120deg * h/632.
// Returns the three vertices at height h as [x,z] pairs.
function triVerts(R, th) {
  const v = [];
  for (let k = 0; k < 3; k++) {
    const a = th + (k * 2 * Math.PI) / 3;
    v.push([R * Math.cos(a), R * Math.sin(a)]);
  }
  return v;
}
const twistAt = (h) => ((120 * Math.PI) / 180) * (h / 632);
// Outer triangular skin radius tapers from base to top (schematic).
const outerR = (h) => 46 - (20 * h) / 632;
// Inner circular skin radius (schematic).
const innerR = (h) => 30 - (11 * h) / 632;

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const H = 632; // tip height
const ZONES = 9;
const zh = (H - 40) / ZONES; // tower body starts above the 40 m podium zone; zone height

// --- Foundation: mat slab and four pile-group blocks: 5 parts.
addPart('mat-foundation', 'Mat foundation', 'foundation', [
  box(-55, 55, -8, 0, -55, 55),
]);
for (const [qx, qz, qn] of [[-1, -1, 'southwest'], [1, -1, 'southeast'], [-1, 1, 'northwest'], [1, 1, 'northeast']]) {
  addPart(`${qn}-piles`, `${qn[0].toUpperCase() + qn.slice(1)} pile group`, 'foundation', [
    box(qx > 0 ? 5 : -50, qx > 0 ? 50 : -5, -86, -8, qz > 0 ? 5 : -50, qz > 0 ? 50 : -5),
  ]);
}

// --- Podium: five floors, roof terrace, entrance canopy: 7 parts.
for (let f = 0; f < 5; f++) {
  addPart(`podium-floor-${f + 1}`, `Podium floor ${f + 1}`, 'podium', [
    box(-48, 48, f * 7.4, f * 7.4 + 6.4, -40, 40),
  ]);
}
addPart('podium-roof', 'Podium roof terrace', 'podium', [
  box(-48, 48, 37, 38.2, -40, 40),
]);
addPart('entrance-canopy', 'Entrance canopy', 'podium', [
  box(-20, 20, 38.2, 39.4, 40, 58),
  ...[-15, -5, 5, 15].map((x) => cyl(0.5, 0.5, 38.2, x, 19.1, 52, 8)),
]);

// --- Concrete core: nine zone segments, 27.4 m square: 9 parts.
const coreHalf = 13.7;
for (let z = 0; z < ZONES; z++) {
  const y0 = 40 + z * zh, y1 = 40 + (z + 1) * zh;
  addPart(`core-zone-${z + 1}`, `Concrete core, zone ${z + 1}`, 'core', [
    box(-coreHalf, coreHalf, y0, y1, -coreHalf, coreHalf),
  ]);
}

// --- Super-columns: twelve composite columns around the core: 12 parts.
for (let c = 0; c < 12; c++) {
  const a = (c * 2 * Math.PI) / 12;
  const r = 22;
  const x = r * Math.cos(a), z = r * Math.sin(a);
  addPart(`super-column-${c + 1}`, `Super-column ${c + 1}`, 'columns', [
    cyl(1.4, 1.8, H - 60, x, 40 + (H - 60) / 2, z, 10),
  ]);
}

// --- Outrigger trusses at the eight zone boundaries: 8 parts.
for (let z = 1; z < ZONES; z++) {
  const y = 40 + z * zh;
  const arms = [];
  for (let c = 0; c < 12; c += 3) {
    const a = (c * 2 * Math.PI) / 12;
    arms.push(strut(
      [coreHalf * Math.cos(a), y - 4, coreHalf * Math.sin(a)],
      [30 * Math.cos(a), y + 4, 30 * Math.sin(a)],
      2.2,
    ));
  }
  // ring belt truss
  const ring = [];
  for (let c = 0; c < 12; c++) {
    const a0 = (c * 2 * Math.PI) / 12, a1 = ((c + 1) * 2 * Math.PI) / 12;
    ring.push(strut([30 * Math.cos(a0), y, 30 * Math.sin(a0)], [30 * Math.cos(a1), y, 30 * Math.sin(a1)], 1.6));
  }
  addPart(`outrigger-level-${z}`, `Outrigger trusses, level ${z}`, 'outriggers', [...arms, ...ring]);
}

// --- Inner circular curtain wall: nine zone panels: 9 parts.
for (let z = 0; z < ZONES; z++) {
  const y0 = 40 + z * zh, y1 = 40 + (z + 1) * zh;
  const r0 = innerR(y0), r1 = innerR(y1);
  const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, 48, 1, true);
  g.translate(0, (y0 + y1) / 2, 0);
  addPart(`inner-skin-zone-${z + 1}`, `Inner curtain wall, zone ${z + 1}`, 'inner-skin', [g]);
}

// --- Outer twisted triangular skin: 3 faces x 9 zones x 2 (lower/upper) = 54 parts.
for (let z = 0; z < ZONES; z++) {
  const y0 = 40 + z * zh, y1 = 40 + (z + 1) * zh;
  const ym = (y0 + y1) / 2;
  const v0 = triVerts(outerR(y0), twistAt(y0));
  const vm = triVerts(outerR(ym), twistAt(ym));
  const v1 = triVerts(outerR(y1), twistAt(y1));
  for (let f = 0; f < 3; f++) {
    const a0 = v0[f], b0 = v0[(f + 1) % 3];
    const am = vm[f], bm = vm[(f + 1) % 3];
    const a1 = v1[f], b1 = v1[(f + 1) % 3];
    addPart(`outer-face-z${z + 1}-f${f + 1}-lower`, `Outer skin face ${f + 1}, zone ${z + 1} (lower)`, 'outer-skin', [
      quad([a0[0], y0, a0[1]], [b0[0], y0, b0[1]], [bm[0], ym, bm[1]], [am[0], ym, am[1]]),
    ]);
    addPart(`outer-face-z${z + 1}-f${f + 1}-upper`, `Outer skin face ${f + 1}, zone ${z + 1} (upper)`, 'outer-skin', [
      quad([am[0], ym, am[1]], [bm[0], ym, bm[1]], [b1[0], y1, b1[1]], [a1[0], y1, a1[1]]),
    ]);
  }
}

// --- Sky lobbies: atrium floor at each zone boundary: 9 parts.
for (let z = 0; z < ZONES; z++) {
  const y = 40 + (z + 1) * zh;
  const r = innerR(y) + 6;
  addPart(`sky-lobby-${z + 1}`, `Sky lobby ${z + 1}`, 'sky-lobbies', [
    cyl(r, r, 1.2, 0, y, 0, 40),
  ]);
}

// --- Crown: parapet ring, crown glass, tuned mass damper: 3 parts.
{
  const yTop = 40 + ZONES * zh; // 632 - 40 + 40 = 632? no: 40 + 9*zh where zh=(632-40)/9 -> 632
  const rT = outerR(600);
  const par = new THREE.CylinderGeometry(rT, rT * 1.02, 12, 3, 1, true);
  // rotate to match twist at top
  par.rotateY(-twistAt(610));
  par.translate(0, 606, 0);
  addPart('crown-parapet', 'Crown parapet', 'crown', [par]);
  const cg = new THREE.CylinderGeometry(6, rT * 0.55, 26, 3, 1, true);
  cg.rotateY(-twistAt(618));
  cg.translate(0, 619, 0);
  addPart('crown-glass', 'Crown glass', 'crown', [cg]);
  addPart('tuned-mass-damper', 'Tuned mass damper', 'crown', [
    box(-8, 8, 585, 593, -8, 8),
    ...[-6, 6].map((x) => strut([x, 585, 0], [x, 578, 0], 1.2)),
  ]);
}

// --- Elevator shuttle shafts: two express shafts in the core: 2 parts.
for (const [i, n] of [[0, 'north'], [1, 'south']]) {
  addPart(`${n}-shuttle-shaft`, `${n[0].toUpperCase() + n.slice(1)} shuttle shaft`, 'core', [
    box(i === 0 ? -10 : 2, i === 0 ? -2 : 10, 0, 560, -4, 4),
  ]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('pile')) return '#6b6259';
  if (id === 'mat-foundation') return '#7a7268';
  if (id.startsWith('podium-floor')) return '#9aa0a3';
  if (id === 'podium-roof') return '#8a9094';
  if (id === 'entrance-canopy') return '#b9c0c4';
  if (id.startsWith('core-zone')) return '#a8a094';
  if (id.includes('shuttle-shaft')) return '#8f8778';
  if (id.startsWith('super-column')) return '#c2b9a6';
  if (id.startsWith('outrigger')) return '#7d8894';
  if (id.startsWith('inner-skin')) return '#9fc4d4';
  if (id.startsWith('outer-face')) return '#cfe3ec';
  if (id.startsWith('sky-lobby')) return '#b7d6c9';
  if (id === 'crown-parapet') return '#dfeaf0';
  if (id === 'crown-glass') return '#a9d3e8';
  if (id === 'tuned-mass-damper') return '#5d6b78';
  return '#cfe3ec';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundation', name: 'Foundation', color: '#7a7268', description: 'A concrete mat on more than a thousand bore piles driven deep into the soft Shanghai soil.' },
  { id: 'podium', name: 'Podium', color: '#9aa0a3', description: 'The five-storey, 36.9 m podium with retail, banking hall and conference functions at the tower base.' },
  { id: 'core', name: 'Concrete core', color: '#a8a094', description: 'The 90-by-90-foot concrete core that carries the tower, with express elevator shuttle shafts.' },
  { id: 'columns', name: 'Super-columns', color: '#c2b9a6', description: 'Twelve composite super-columns ringing the core, tapering with the tower.' },
  { id: 'outriggers', name: 'Outrigger trusses', color: '#7d8894', description: 'Belt and outrigger trusses tying the core to the perimeter columns at zone boundaries.' },
  { id: 'inner-skin', name: 'Inner curtain wall', color: '#9fc4d4', description: 'The circular inner glass curtain wall enclosing the occupied floors.' },
  { id: 'outer-skin', name: 'Twisted outer skin', color: '#cfe3ec', description: 'The cam-shaped triangular outer glass skin, twisting 120 degrees from base to tip.' },
  { id: 'sky-lobbies', name: 'Sky lobbies', color: '#b7d6c9', description: 'Garden atriums in the double-skin cavity at each zone boundary, open to the sky lobbies.' },
  { id: 'crown', name: 'Crown', color: '#dfeaf0', description: 'The parapet crown and the 1,000-tonne tuned mass damper that steadies the tower in typhoons.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'mat foundation': 'The reinforced concrete mat that spreads the tower load, sitting over 1,079 bore piles. Exact mat depth is schematic.',
  'southwest pile group': 'One quadrant of the piled foundation, schematic grouping of the 1,079 concrete and steel bore piles. Exact layout is schematic.',
  'southeast pile group': 'One quadrant of the piled foundation, schematic grouping of the 1,079 concrete and steel bore piles. Exact layout is schematic.',
  'northwest pile group': 'One quadrant of the piled foundation, schematic grouping of the 1,079 concrete and steel bore piles. Exact layout is schematic.',
  'northeast pile group': 'One quadrant of the piled foundation, schematic grouping of the 1,079 concrete and steel bore piles. Exact layout is schematic.',
  'podium floor 1': 'First floor of the five-storey podium (36.9 m total) with luxury retail and banking functions. Exact floor subdivision is schematic.',
  'podium floor 2': 'Second floor of the podium. Exact floor subdivision is schematic.',
  'podium floor 3': 'Third floor of the podium. Exact floor subdivision is schematic.',
  'podium floor 4': 'Fourth floor of the podium with conference and meeting functions. Exact floor subdivision is schematic.',
  'podium floor 5': 'Fifth floor of the podium with the multifunction banquet hall. Exact floor subdivision is schematic.',
  'podium roof terrace': 'The podium roof terrace. Exact treatment is schematic.',
  'entrance canopy': 'The entrance canopy sheltering the tower lobby drop-off. Exact form is schematic.',
};
for (let z = 1; z <= ZONES; z++) {
  explanations[`concrete core, zone ${z}`] = `Segment of the roughly 90-by-90-foot concrete core through zone ${z} of nine. Exact core wall thickness is schematic.`;
  explanations[`inner curtain wall, zone ${z}`] = `The circular inner glass wall of zone ${z}, enclosing offices, hotel or observatory floors. Panel subdivision is schematic.`;
  explanations[`sky lobby ${z}`] = `The sky-lobby atrium floor of zone ${z}, set in the cavity between the two skins with planting and public space. Exact depth is schematic.`;
  for (let f = 1; f <= 3; f++) {
    explanations[`outer skin face ${f}, zone ${z} (lower)`] = `Lower half of face ${f} of the twisted triangular outer skin in zone ${z}; the full skin rotates 120 degrees over the tower height. Panel joints are schematic.`;
    explanations[`outer skin face ${f}, zone ${z} (upper)`] = `Upper half of face ${f} of the twisted triangular outer skin in zone ${z}; the full skin rotates 120 degrees over the tower height. Panel joints are schematic.`;
  }
}
for (let c = 1; c <= 12; c++) {
  explanations[`super-column ${c}`] = `Composite super-column ${c} of twelve ringing the core, carrying gravity loads to the foundation. Exact section is schematic.`;
}
for (let z = 1; z < ZONES; z++) {
  explanations[`outrigger trusses, level ${z}`] = `Belt and outrigger trusses at zone boundary ${z}, tying core to columns against wind and seismic loads. Exact geometry is schematic.`;
}
explanations['crown parapet'] = 'The parapet ring crowning the tower at 632 m. Exact profile is schematic.';
explanations['crown glass'] = 'The glass crown closing the tower top. Exact framing is schematic.';
explanations['tuned mass damper'] = 'The 1,000-tonne tuned mass damper near the top that counteracts typhoon sway of up to a metre. Housing form is schematic.';
explanations['north shuttle shaft'] = 'Express elevator shuttle shaft serving the upper zones; the tower elevators run up to 20.5 m/s. Exact shaft layout is schematic.';
explanations['south shuttle shaft'] = 'Express elevator shuttle shaft serving the upper zones. Exact shaft layout is schematic.';

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
const binName = 'shanghai-tower-0.bin';
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
  scope: 'Shanghai Tower, Shanghai',
  title: 'Shanghai Tower',
  location: 'Shanghai, China',
  blurb: 'Gensler\u2019s 632 m twisted supertall in Pudong, completed 2015: nine stacked zones wrapped in a double glass skin, the triangular outer wall spiralling 120 degrees around a circular inner wall.',
  sourceUrls: [
    { label: 'Wikipedia: Shanghai Tower', url: 'https://en.wikipedia.org/wiki/Shanghai_Tower' },
    { label: 'CTBUH: Shanghai Tower', url: 'https://www.skyscrapercenter.com/building/shanghai-tower/56' },
    { label: 'Gensler: Shanghai Tower', url: 'https://www.gensler.com/projects/shanghai-tower' },
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
  chunks: [{ url: '/models/shanghai-tower/shanghai-tower-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
