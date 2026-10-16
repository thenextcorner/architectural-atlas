// Procedural Louvre Pyramid for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Louvre Pyramid in code and
// writes it in the atlas binary format:
//   public/models/louvre-pyramid/atlas.json
//   public/models/louvre-pyramid/louvre-pyramid-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10,
// principally Wikipedia "Louvre Pyramid"):
//   completed 1989 as part of the Grand Louvre project, inaugurated
//   4 March 1989, opened to the public 29 March 1989; commissioned 1981
//   by President Francois Mitterrand, architect I. M. Pei (design
//   presented 1984); main entrance to the Louvre Museum in the Cour
//   Napoleon, Paris; 21.6 m high, square base 34 m per side, base area
//   1,000 sq m; 603 rhombus-shaped and 70 triangular glass segments
//   (673 total); face angle 51.52 degrees, as in ancient Egyptian
//   pyramids; 95 tonnes of steel and 105 tonnes of aluminium support,
//   1,800 sq m of glass; 21.52 mm extra-clear laminated "Diamond Glass"
//   by Saint-Gobain; engineered by Nicolet Chartrand Knoll (Montreal) and
//   Rice Francis Ritchie (Paris); three smaller pyramids serve the three
//   museum wings (Richelieu, Sully, Denon); visitors descend through the
//   pyramid into the underground lobby; the persistent "666 panes" story
//   was popularized by Dan Brown's The Da Vinci Code (2003) and is wrong:
//   the true count is 673.
// Schematic (not sourced, never stated as fact in the UI): exact band
// subdivision of the glass, mullion and ring placement, small pyramid
// sizes and positions, pool shapes and positions, paving layout, lobby
// form.
//
// Coordinate frame: y = up, base at y = 0. All dimensions in meters.
// Faces point along +-x and +-z.
//
// Granularity: 100+ named parts across 7 systems. Every explanation is
// either a sourced fact (see above) or explicitly marked schematic.
//
// Usage: node scripts/generate-louvre-pyramid.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'louvre-pyramid');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (34 m base) maps to 2.4 units.
const S = 2.4 / 34;

const H = 21.6;      // pyramid height
const HALF = 17;     // base half-width
const CORNER = HALF * Math.SQRT2; // base corner distance from axis

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
// One face (k = 0..3, facing +x, +z, -x, -z) of a square frustum band.
function faceBand(k, y0, y1, inset = 0) {
  const rB = (CORNER - inset) * (1 - y0 / H);
  const rT = (CORNER - inset) * (1 - y1 / H);
  const g = new THREE.CylinderGeometry(rT, rB, y1 - y0, 4, 1, true, Math.PI / 4 + (k * Math.PI) / 2, Math.PI / 2);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
function halfWidth(y) {
  return HALF * (1 - y / H);
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const FACES = ['east', 'north', 'west', 'south'];

// ---------------------------------------------------------------- glass
// Main pyramid glass: 4 faces x 10 horizontal bands.
const BANDS = 10;
for (let k = 0; k < 4; k++) {
  for (let b = 0; b < BANDS; b++) {
    const y0 = (b * H) / BANDS, y1 = ((b + 1) * H) / BANDS;
    addPart(`glass-${FACES[k]}-band-${b + 1}`, `${FACES[k]} glass band ${b + 1}`, 'glass', [faceBand(k, y0, y1)]);
  }
}

// ---------------------------------------------------------------- frame
// Four corner edge beams (base corners to apex).
const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
const cornerNames = ['northeast', 'southeast', 'southwest', 'northwest'];
corners.forEach(([sx, sz], i) => {
  addPart(`edge-beam-${cornerNames[i]}`, `${cornerNames[i]} edge beam`, 'frame',
    [strut([sx * HALF, 0, sz * HALF], [0, H, 0], 0.45)]);
});
// Horizontal ring beams at each band boundary (11 rings).
for (let b = 0; b <= BANDS; b++) {
  const y = (b * H) / BANDS;
  const hw = halfWidth(y) + 0.1;
  if (hw < 0.6) continue;
  addPart(`ring-beam-${b}`, `Ring beam ${b}`, 'frame', [
    box(-hw, hw, y - 0.18, y + 0.18, -hw, -hw + 0.36),
    box(-hw, hw, y - 0.18, y + 0.18, hw - 0.36, hw),
    box(-hw, -hw + 0.36, y - 0.18, y + 0.18, -hw, hw),
    box(hw - 0.36, hw, y - 0.18, y + 0.18, -hw, hw),
  ]);
}
// Vertical mullions: 2 per face, running full height (schematic).
for (let k = 0; k < 4; k++) {
  for (let m = 0; m < 2; m++) {
    const off = (m === 0 ? -1 : 1) * HALF / 3;
    const geoms = [];
    // Sample the sloped face at 6 heights and connect with struts.
    let prev = null;
    for (let s = 0; s <= 6; s++) {
      const y = (s * (H - 1.2)) / 6;
      const hw = halfWidth(y);
      let px, pz;
      if (k === 0) { px = hw; pz = off * (hw / HALF); }
      else if (k === 1) { pz = hw; px = off * (hw / HALF); }
      else if (k === 2) { px = -hw; pz = -off * (hw / HALF); }
      else { pz = -hw; px = -off * (hw / HALF); }
      if (prev) geoms.push(strut(prev, [px, y, pz], 0.22));
      prev = [px, y, pz];
    }
    addPart(`mullion-${FACES[k]}-${m + 1}`, `${FACES[k]} mullion ${m + 1}`, 'frame', geoms);
  }
}
// Apex cap.
addPart('apex-cap', 'Apex cap', 'frame', [box(-0.8, 0.8, H - 0.5, H + 0.3, -0.8, 0.8)]);

// ---------------------------------------------------------------- base
// Base curb: 4 sides.
addPart('base-curb-east', 'East base curb', 'base', [box(HALF - 0.4, HALF + 0.8, -0.6, 0.4, -HALF - 0.8, HALF + 0.8)]);
addPart('base-curb-west', 'West base curb', 'base', [box(-HALF - 0.8, -HALF + 0.4, -0.6, 0.4, -HALF - 0.8, HALF + 0.8)]);
addPart('base-curb-north', 'North base curb', 'base', [box(-HALF - 0.8, HALF + 0.8, -0.6, 0.4, HALF - 0.4, HALF + 0.8)]);
addPart('base-curb-south', 'South base curb', 'base', [box(-HALF - 0.8, HALF + 0.8, -0.6, 0.4, -HALF - 0.8, -HALF + 0.4)]);

// ---------------------------------------------------------------- small pyramids
// Three smaller pyramids serving the Richelieu, Sully and Denon wings
// (schematic sizes and positions).
const SMALL = [
  { id: 'richelieu', name: 'Richelieu', x: -30, z: -26, h: 7, half: 5.5 },
  { id: 'sully', name: 'Sully', x: 30, z: -26, h: 7, half: 5.5 },
  { id: 'denon', name: 'Denon', x: 0, z: 34, h: 7, half: 5.5 },
];
for (const sp of SMALL) {
  const c = sp.half * Math.SQRT2;
  for (let k = 0; k < 4; k++) {
    const g = new THREE.CylinderGeometry(0.01, c, sp.h, 4, 1, true, Math.PI / 4 + (k * Math.PI) / 2, Math.PI / 2);
    g.translate(sp.x, sp.h / 2, sp.z);
    addPart(`${sp.id}-glass-${FACES[k]}`, `${sp.name} pyramid ${FACES[k]} glass`, 'small-pyramids', [g]);
  }
  const frameGeoms = [];
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    frameGeoms.push(strut([sp.x + sx * sp.half, 0, sp.z + sz * sp.half], [sp.x, sp.h, sp.z], 0.25));
  }
  frameGeoms.push(box(sp.x - sp.half - 0.3, sp.x + sp.half + 0.3, -0.4, 0.2, sp.z - sp.half - 0.3, sp.z + sp.half + 0.3));
  addPart(`${sp.id}-frame`, `${sp.name} pyramid frame`, 'small-pyramids', frameGeoms);
}

// ---------------------------------------------------------------- pools
// Reflecting pools flanking the main pyramid (schematic).
const POOLS = [
  { id: 'pool-east', name: 'East', x0: 22, x1: 34, z0: -14, z1: 14 },
  { id: 'pool-west', name: 'West', x0: -34, x1: -22, z0: -14, z1: 14 },
  { id: 'pool-south', name: 'South', x0: -14, x1: 14, z0: 22, z1: 34 },
];
for (const pl of POOLS) {
  addPart(`${pl.id}-basin`, `${pl.name} pool basin`, 'pools', [box(pl.x0, pl.x1, -1.2, -0.2, pl.z0, pl.z1)]);
  addPart(`${pl.id}-water`, `${pl.name} pool water`, 'pools', [box(pl.x0 + 0.3, pl.x1 - 0.3, -0.25, 0, pl.z0 + 0.3, pl.z1 - 0.3)]);
  addPart(`${pl.id}-coping`, `${pl.name} pool coping`, 'pools', [
    box(pl.x0 - 0.6, pl.x1 + 0.6, -0.2, 0.25, pl.z0 - 0.6, pl.z0 + 0.3),
    box(pl.x0 - 0.6, pl.x1 + 0.6, -0.2, 0.25, pl.z1 - 0.3, pl.z1 + 0.6),
  ]);
}

// ---------------------------------------------------------------- paving
// Cour Napoléon paving: 8 sections (schematic).
const PAVE = [
  ['paving-northeast', 'Northeast paving', 18, 60, -60, -18],
  ['paving-northwest', 'Northwest paving', -60, -18, -60, -18],
  ['paving-southeast', 'Southeast paving', 18, 60, 18, 60],
  ['paving-southwest', 'Southwest paving', -60, -18, 18, 60],
  ['paving-north', 'North paving', -18, 18, -60, -18],
  ['paving-south', 'South paving', -18, 18, 40, 60],
  ['paving-east', 'East paving', 40, 60, -18, 18],
  ['paving-west', 'West paving', -60, -40, -18, 18],
];
for (const [id, name, x0, x1, z0, z1] of PAVE) {
  addPart(id, name, 'courtyard', [box(x0, x1, -0.5, 0, z0, z1)]);
}

// ---------------------------------------------------------------- lobby
// Underground lobby access: stair and escalator housings (schematic).
addPart('lobby-stair', 'Lobby stair housing', 'lobby', [box(-3, 3, -6, 0.5, -24, -18)]);
addPart('lobby-escalators', 'Lobby escalator housing', 'lobby', [box(-3, 3, -6, 0.5, 18, 24)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('glass')) return '#a8cddb';
  if (id.includes('water')) return '#7fb3c9';
  if (id.includes('edge-beam') || id.includes('ring-beam') || id.includes('mullion') || id.includes('apex')) return '#8f979e';
  if (id.includes('frame')) return '#8f979e';
  if (id.includes('curb') || id.includes('basin') || id.includes('coping')) return '#b9b3a6';
  if (id.includes('paving')) return '#c9c2b2';
  if (id.includes('lobby')) return '#9a958c';
  return '#b9b3a6';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'glass', name: 'Glass skin', color: '#a8cddb', description: 'The 673 glass segments of extra-clear laminated Diamond Glass: 603 rhombus and 70 triangular panes.' },
  { id: 'frame', name: 'Steel frame', color: '#8f979e', description: 'The 95 tonnes of steel and 105 tonnes of aluminium carrying the glass: edge beams, ring beams and mullions.' },
  { id: 'base', name: 'Base curb', color: '#b9b3a6', description: 'The curb the pyramid sits on in the Cour Napoleon.' },
  { id: 'small-pyramids', name: 'Small pyramids', color: '#a8cddb', description: 'The three smaller pyramids serving the Richelieu, Sully and Denon wings.' },
  { id: 'pools', name: 'Reflecting pools', color: '#7fb3c9', description: 'The reflecting pools flanking the pyramid (schematic).' },
  { id: 'courtyard', name: 'Courtyard paving', color: '#c9c2b2', description: 'The paving of the Cour Napoleon (schematic).' },
  { id: 'lobby', name: 'Underground lobby', color: '#9a958c', description: 'Access housings for the underground lobby visitors descend into (schematic).' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (let k = 0; k < 4; k++) {
  for (let b = 1; b <= BANDS; b++) {
    explanations[`${FACES[k]} glass band ${b}`] = `${FACES[k]} glass, horizontal band ${b} of ${BANDS}. The pyramid uses 603 rhombus-shaped and 70 triangular panes of Saint-Gobain Diamond Glass. Exact panel subdivision is schematic.`;
  }
}
for (const n of cornerNames) {
  explanations[`${n} edge beam`] = `The ${n} corner edge beam running from the base to the apex. The face angle of 51.52 degrees matches ancient Egyptian pyramids. Exact member sizing is schematic.`;
}
for (let b = 0; b <= BANDS; b++) {
  const y = (b * H) / BANDS;
  if (halfWidth(y) + 0.1 < 0.6) continue;
  explanations[`ring beam ${b}`] = `Horizontal ring beam ${b} tying the four faces together. Exact placement is schematic.`;
}
for (let k = 0; k < 4; k++) {
  for (let m = 1; m <= 2; m++) {
    explanations[`${FACES[k]} mullion ${m}`] = `${FACES[k]} face vertical mullion ${m}. Exact mullion layout is schematic.`;
  }
}
explanations['apex cap'] = 'The cap closing the pyramid at its 21.6 m apex. Exact form is schematic.';
for (const d of ['east', 'west', 'north', 'south']) {
  explanations[`${d} base curb`] = `The ${d} curb of the pyramid base in the Cour Napoleon. Exact form is schematic.`;
}
for (const sp of SMALL) {
  for (let k = 0; k < 4; k++) {
    explanations[`${sp.name.toLowerCase()} pyramid ${FACES[k]} glass`] = `The ${FACES[k]} glass face of the smaller ${sp.name} wing pyramid. Exact size and position are schematic.`;
  }
  explanations[`${sp.name.toLowerCase()} pyramid frame`] = `The frame and base of the smaller ${sp.name} wing pyramid. Exact size and position are schematic.`;
}
for (const pl of POOLS) {
  explanations[`${pl.name.toLowerCase()} pool basin`] = `The ${pl.name.toLowerCase()} reflecting pool basin. Exact shape and position are schematic.`;
  explanations[`${pl.name.toLowerCase()} pool water`] = `Water in the ${pl.name.toLowerCase()} reflecting pool.`;
  explanations[`${pl.name.toLowerCase()} pool coping`] = `Coping stones edging the ${pl.name.toLowerCase()} pool. Exact form is schematic.`;
}
explanations['northeast paving'] = 'Cour Napoleon paving, northeast section. Exact layout is schematic.';
explanations['northwest paving'] = 'Cour Napoleon paving, northwest section. Exact layout is schematic.';
explanations['southeast paving'] = 'Cour Napoleon paving, southeast section. Exact layout is schematic.';
explanations['southwest paving'] = 'Cour Napoleon paving, southwest section. Exact layout is schematic.';
explanations['north paving'] = 'Cour Napoleon paving, north section. Exact layout is schematic.';
explanations['south paving'] = 'Cour Napoleon paving, south section. Exact layout is schematic.';
explanations['east paving'] = 'Cour Napoleon paving, east section. Exact layout is schematic.';
explanations['west paving'] = 'Cour Napoleon paving, west section. Exact layout is schematic.';
explanations['lobby stair housing'] = 'Stair housing descending to the underground lobby visitors enter through the pyramid. Exact form is schematic.';
explanations['lobby escalator housing'] = 'Escalator housing descending to the underground lobby. Exact form is schematic.';

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
const binName = 'louvre-pyramid-0.bin';
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
  scope: 'Louvre Pyramid, Paris',
  title: 'Louvre Pyramid',
  location: 'Paris, France',
  blurb: 'I. M. Pei\u2019s 1989 glass pyramid in the Cour Napoleon: 21.6 m high on a 34 m square base, 673 panes of extra-clear Diamond Glass on a steel frame, with three smaller pyramids and reflecting pools.',
  sourceUrls: [
    { label: 'Wikipedia: Louvre Pyramid', url: 'https://en.wikipedia.org/wiki/Louvre_Pyramid' },
    { label: 'The Better Vacation: Louvre Pyramid guide', url: 'https://thebettervacation.com/paris/louvre-pyramid/' },
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
  chunks: [{ url: '/models/louvre-pyramid/louvre-pyramid-0.bin', bytes: offset }],
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
