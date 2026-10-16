// Simplified schematic St Paul's Cathedral for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-st-pauls-cathedral.mjs, whose
// header lists every sourced dimension reused here), but coarser:
// 30 named parts across 7 systems instead of 105 across 8. Individual
// piers, pilasters, peristyle columns and tower stages are merged into
// group parts; the triple dome is reduced to its three main masses.
//
// Sourced dimensions reused from the detailed model (never re-stated
// here, see generate-st-pauls-cathedral.mjs for the full attribution):
//   Sir Christopher Wren, English Baroque, 1675 to 1710, replacing the
//   Gothic cathedral lost in the Great Fire of 1666; 158 m long, nave
//   37 m wide, 75 m across the transepts, 111 m to the top of the cross,
//   tallest building in London 1710 to 1967; triple dome (inner 68 m
//   high and 31 m across, structural brick cone, timber-framed outer
//   85 m high and 34 m across, lead clad) on eight great piers;
//   Whispering Gallery about 30 m above the floor; west front 55 m
//   wide, two storeys, Corinthian below, Composite above, with pediment;
//   west towers 67 m with clock stages, belfries, cupolas and gilded
//   pinecone finials; Great Paul bell 16.5 tons, cast 1881, south-west
//   tower; Portland stone; central aisle 27 m high.
// Schematic (not sourced, never stated as fact in the UI): bay rhythm,
// vault and dome profiles, merged group geometry, simplified tower and
// lantern forms, statue identities.
//
// Writes:
//   public/models/st-pauls-cathedral-simple/atlas.json
//   public/models/st-pauls-cathedral-simple/st-pauls-cathedral-simple-0.bin
//
// Usage: node scripts/generate-st-pauls-cathedral-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'st-pauls-cathedral-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (158 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 160;

// ---------------------------------------------------------------- helpers
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
function pediment(x0, x1, y0, yApex, z0, z1) {
  const xm = (x0 + x1) / 2;
  const v = new Float32Array([
    x0, y0, z0, x1, y0, z0, xm, yApex, z0,
    x0, y0, z1, x1, y0, z1, xm, yApex, z1,
  ]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(v, 3));
  g.setIndex([0, 2, 1, 3, 4, 5, 0, 1, 4, 0, 4, 3, 1, 2, 5, 1, 5, 4, 2, 0, 3, 2, 3, 5]);
  g.computeVertexNormals();
  return g;
}
function dome(r, x, yBase, z, yScale = 1, seg = 18) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg / 2 | 0), 0, Math.PI * 2, 0, Math.PI / 2);
  g.scale(1, yScale, 1);
  g.translate(x, yBase, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Base: 2 parts.
addPart('podium', 'Podium', 'base', [box(-40, 40, 0, 3, -82, 72)]);
{
  const steps = [];
  for (let s = 0; s < 4; s++) steps.push(box(-30, 30, s * 0.75, (s + 1) * 0.75, -86 + s * 1.2, -82));
  addPart('west-steps', 'West steps', 'base', steps);
}

// --- West front: block, pediment, portico, towers merged: 6 parts.
addPart('west-front-block', 'West front block', 'west-front', [
  box(-27.5, 27.5, 3, 26, -79, -67),
  pediment(-27.5, 27.5, 26, 33, -79, -67),
  box(-10, 10, 3, 16, -84, -79),
]);
{
  const pilasters = [];
  for (let i = 0; i < 6; i++) {
    const x = -22.9 + i * 9.16;
    pilasters.push(box(x - 0.9, x + 0.9, 3, 26, -79.4, -78.6));
  }
  addPart('west-pilasters', 'West front pilasters', 'west-front', pilasters);
}
for (const [side, sName] of [[-1, 'North-west'], [1, 'South-west']]) {
  const x = 22 * side;
  addPart(`${side < 0 ? 'nw' : 'sw'}-tower`, `${sName} tower`, 'west-front', [
    box(x - 5.5, x + 5.5, 3, 55, -78.5, -67.5),
    dome(4.5, x, 55, -73, 1.15, 12),
    cyl(0.12, 0.12, 3.2, x, 64.6, -73, 6),
  ]);
}
addPart('tower-clock-faces', 'Tower clock faces', 'west-front', [
  cyl(2.6, 2.6, 0.3, -22, 37, -78.65, 12),
  cyl(2.6, 2.6, 0.3, 22, 37, -78.65, 12),
]);
addPart('great-west-door', 'Great west door', 'west-front', [box(-3, 3, 3, 11, -84.2, -83.8)]);
addPart('west-portico', 'West portico', 'west-front', [
  box(-10, 10, 3, 16, -84, -79),
  pediment(-10, 10, 16, 20, -84, -79),
]);

// --- Nave: floor, arcade walls, vault: 4 parts.
addPart('nave-floor', 'Nave floor', 'nave', [box(-18.5, 18.5, 2.6, 3.4, -67, -7)]);
{
  const arcades = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const z = -64 + i * 9.3;
      arcades.push(box(side * 12 - 1.4, side * 12 + 1.4, 3, 14, z - 1.4, z + 1.4));
    }
    arcades.push(box(side < 0 ? -19.7 : 17.3, side < 0 ? -17.3 : 19.7, 3, 14, -67, -7));
    arcades.push(box(side < 0 ? -12.8 : 11.2, side < 0 ? -11.2 : 12.8, 14, 24, -67, -7));
  }
  addPart('nave-arcades', 'Nave arcades and walls', 'nave', arcades);
}
addPart('nave-vault', 'Nave vault', 'nave', [box(-12, 12, 15, 27, -67, -7)]);
addPart('nave-roof', 'Nave roof', 'nave', [
  box(-13.5, 13.5, 24, 28.5, -67, -7),
  box(-19.5, -11, 14, 15.6, -67, -7),
  box(11, 19.5, 14, 15.6, -67, -7),
]);

// --- Transepts: 3 parts.
for (const [side, sName] of [[-1, 'North'], [1, 'South']]) {
  const x0 = side < 0 ? -37.5 : 12, x1 = side < 0 ? -12 : 37.5;
  const px0 = side < 0 ? -37.5 : 27.5, px1 = side < 0 ? -27.5 : 37.5;
  addPart(`transept-${side < 0 ? 'north' : 'south'}`, `${sName} transept`, 'transepts', [
    box(x0, x1, 3, 24, -7, 17),
    pediment(px0, px1, 24, 30, -7, 17),
    box(x0, x1, 24, 27.5, -7, 17),
  ]);
}
addPart('crossing-floor', 'Crossing floor', 'transepts', [box(-18.5, 18.5, 2.6, 3.4, -7, 17)]);

// --- Choir and apse: 3 parts.
addPart('choir-block', 'Choir block', 'choir', [
  box(-12, 12, 3, 24, 17, 57),
  box(-18.5, -12, 3, 14, 17, 57),
  box(12, 18.5, 3, 14, 17, 57),
  box(-12, 12, 15, 27, 17, 57),
]);
addPart('apse', 'Apse', 'choir', [
  cyl(12, 12, 21, 0, 13.5, 57, 12),
  dome(12, 0, 24, 57, 0.8, 12),
]);
addPart('choir-roof', 'Choir roof', 'choir', [box(-13, 13, 24, 28, 17, 57)]);

// --- Dome: piers, drum, inner dome, cone, outer dome, lantern, cross: 8 parts.
{
  const piers = [];
  for (const [x, z] of [[-15, -4], [15, -4], [-15, 14], [15, 14], [-15, 5], [15, 5], [-6, -4], [6, 14]]) {
    piers.push(box(x - 2, x + 2, 3, 27, z - 2, z + 2));
  }
  addPart('crossing-piers', 'Crossing piers', 'dome', piers);
}
addPart('drum-and-peristyle', 'Drum and peristyle', 'dome', [
  cyl(17, 17.6, 13, 0, 33.5, 5, 18),
  cyl(19.2, 19.2, 9.6, 0, 44, 5, 18),
]);
addPart('inner-dome', 'Inner dome', 'dome', [dome(15.5, 0, 52, 5, 1.0, 18)]);
addPart('brick-cone', 'Structural brick cone', 'dome', [cyl(3.2, 12, 45, 0, 62.5, 5, 12)]);
addPart('outer-dome', 'Outer dome', 'dome', [dome(17, 0, 42, 5, 2.53, 24)]);
addPart('lantern', 'Lantern', 'dome', [
  cyl(5.2, 6, 3, 0, 86.5, 5, 12),
  cyl(4.6, 4.6, 8, 0, 92, 5, 12),
  dome(4.6, 0, 96, 5, 1.1, 12),
]);
{
  const ball = new THREE.SphereGeometry(1.1, 10, 8);
  ball.translate(0, 102.2, 5);
  addPart('ball-and-cross', 'Golden ball and cross', 'dome', [
    ball,
    box(-0.28, 0.28, 103, 111, 4.7, 5.3),
    box(-1.6, 1.6, 106.4, 107.2, 4.7, 5.3),
  ]);
}
addPart('whispering-gallery', 'Whispering Gallery', 'dome', [cyl(16.2, 16.2, 1.2, 0, 30.6, 5, 18)]);
addPart('crossing-arches', 'Crossing arches', 'dome', [
  box(-12, 12, 20, 27, -8.5, -5.5),
  box(-12, 12, 20, 27, 15.5, 18.5),
  box(-16.5, -13.5, 20, 27, -7, 17),
  box(13.5, 16.5, 20, 27, -7, 17),
]);
addPart('choir-fittings', 'Choir fittings', 'choir', [
  box(-9, -4, 3.4, 6.5, 24, 44),
  box(4, 9, 3.4, 6.5, 24, 44),
  box(-18, -13, 6, 18, 24, 34),
]);
addPart('pulpit', 'Pulpit', 'nave', [cyl(1.6, 1.1, 3.4, 8, 5.1, -30, 10)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'outer-dome' || id === 'lantern') return '#8a939b';
  if (id === 'inner-dome') return '#b9c0c7';
  if (id === 'brick-cone') return '#9a6b52';
  if (id === 'drum-and-peristyle') return '#d8d2c4';
  if (id === 'whispering-gallery') return '#a89f8d';
  if (id === 'ball-and-cross') return '#c9a227';
  if (id.includes('-tower')) return '#d3ccbc';
  if (id === 'tower-clock-faces') return '#2b3440';
  if (id === 'great-west-door') return '#4a3b2c';
  if (id === 'choir-fittings') return '#5a4632';
  if (id === 'pulpit') return '#6b543a';
  if (id === 'crossing-arches') return '#c4bba8';
  if (id.includes('roof')) return '#6e7a86';
  if (id.includes('floor')) return '#9a917f';
  if (id === 'podium') return '#a39a86';
  if (id === 'west-steps') return '#b0a78f';
  return '#d3ccbc';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Base and podium', color: '#a39a86', description: 'The podium and west steps the cathedral stands on.' },
  { id: 'west-front', name: 'West front and towers', color: '#d3ccbc', description: 'The 55 m wide west front with its pilasters, pediment, portico and twin 67 m towers.' },
  { id: 'nave', name: 'Nave', color: '#d3ccbc', description: 'The 37 m wide nave with arcades, aisles, vault and roof.' },
  { id: 'transepts', name: 'Transepts', color: '#d3ccbc', description: 'The north and south transept arms, 75 m across from end to end.' },
  { id: 'choir', name: 'Choir and apse', color: '#d3ccbc', description: 'The choir east of the crossing with its semicircular apse.' },
  { id: 'dome', name: 'Dome', color: '#8a939b', description: 'Wren\u2019s triple dome rising to 111 m on eight great piers.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'podium': 'The podium platform raising the cathedral above the churchyard. Exact height is schematic.',
  'west steps': 'The steps rising to the west front from Ludgate Hill. Exact step count is schematic.',
  'west front block': 'The 55 m wide west front: two storeys, Corinthian below and Composite above, with a pediment and projecting portico. Exact storey heights are schematic.',
  'west front pilasters': 'The giant pilasters articulating the west front. Exact count and spacing are schematic.',
  'north-west tower': 'The north-west tower, one of the twin 67 m west towers with clock stage, belfry, bell-shaped cupola and gilded pinecone finial. Exact stage divisions are schematic.',
  'south-west tower': 'The south-west tower, one of the twin 67 m west towers; it holds Great Paul, the 16.5 ton bell cast in 1881. Exact stage divisions are schematic.',
  'tower clock faces': 'The clock faces of the west towers. Exact dial designs are schematic.',
  'great west door': 'The Great West Door, the ceremonial entrance beneath the portico. Exact door design is schematic.',
  'west portico': 'The projecting west portico framing the Great West Door. Exact projection is schematic.',
  'nave floor': 'The floor of the nave, the great auditory where Wren wanted every member of the congregation to see and hear. Exact paving is schematic.',
  'nave arcades and walls': 'The nave arcades, aisle walls and clerestory lighting the 27 m high central aisle. Exact bay rhythm is schematic.',
  'nave vault': 'The vault over the central aisle, rising to 27 m. Exact vault profile is schematic.',
  'nave roof': 'The lead roofs over nave and aisles. Exact pitches are schematic.',
  'pulpit': 'The pulpit in the nave. Exact form is schematic.',
  'north transept': 'The north transept arm with its pedimented front; the transepts stretch 75 m from end to end. Exact arm depth is schematic.',
  'south transept': 'The south transept arm with its pedimented front. Exact arm depth is schematic.',
  'crossing floor': 'The floor beneath the crossing, at the heart of the 158 m plan. Exact paving is schematic.',
  'choir block': 'The choir block east of the crossing with its aisles and vault. Exact bay rhythm is schematic.',
  'apse': 'The semicircular apse closing the choir at the east end, with its half-dome. Exact radius is schematic.',
  'choir roof': 'The lead roof over the choir. Exact pitch is schematic.',
  'choir fittings': 'The choir stalls and organ case of the choir. Exact forms are schematic.',
  'crossing piers': 'The eight great piers carrying the dome. Exact pier positions are schematic.',
  'drum and peristyle': 'The 34 m drum with its peristyle colonnade ringing the dome\u2019s base. Exact column count is schematic.',
  'inner dome': 'The inner dome, 31 m across and rising to 68 m. Exact curvature is schematic.',
  'structural brick cone': 'The hidden structural brick cone between the inner and outer domes, the masonry core that carries the lantern\u2019s weight. Exact cone angle is schematic.',
  'outer dome': 'The timber-framed outer dome, 34 m across and rising to 85 m, clad in lead. Exact profile is schematic.',
  'lantern': 'The lantern crowning the outer dome with its colonnade and small dome. Exact form is schematic.',
  'golden ball and cross': 'The gilded ball and cross at 111 m, the top of the tallest building in London from 1710 to 1967. Exact forms are schematic.',
  'whispering gallery': 'The Whispering Gallery, about 30 m above the floor, where a whisper against the wall carries to the far side. Exact gallery form is schematic.',
  'crossing arches': 'The four great arches of the crossing carrying the dome. Exact arch profiles are schematic.',
};

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
const binName = 'st-pauls-cathedral-simple-0.bin';
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
  scope: "St Paul's Cathedral, London (simplified schematic)",
  title: "St Paul's Cathedral",
  location: 'London, United Kingdom',
  blurb: 'Sir Christopher Wren\u2019s English Baroque cathedral on Ludgate Hill, built 1675 to 1710, in simplified schematic form: the 158 m plan, twin 67 m west towers, and the triple dome rising to 111 m.',
  sourceUrls: [
    { label: 'Wikipedia: St Paul\u2019s Cathedral', url: 'https://en.wikipedia.org/wiki/St_Paul%27s_Cathedral' },
    { label: 'Project Gutenberg: Views of St. Paul\u2019s Cathedral', url: 'https://www.gutenberg.org/files/48491/48491-h/48491-h.htm' },
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
  chunks: [{ url: '/models/st-pauls-cathedral-simple/st-pauls-cathedral-simple-0.bin', bytes: offset }],
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
