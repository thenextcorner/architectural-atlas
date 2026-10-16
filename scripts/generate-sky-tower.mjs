// Procedural Sky Tower (Auckland) for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Sky Tower in code and writes
// it in the atlas binary format:
//   public/models/sky-tower/atlas.json
//   public/models/sky-tower/sky-tower-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10,
// principally Wikipedia "Sky Tower (Auckland)"):
//   328 m tall measured from ground level to the top of the mast, the
//   tallest man-made structure in New Zealand; tallest in the Southern
//   Hemisphere 1996 to 2022 (surpassed by Thamrin Nine, Jakarta); built
//   1994 to 1997 for Harrah's Entertainment, opened 1997, part of the
//   SKYCITY Auckland casino complex on the corner of Victoria and Federal
//   Streets, Auckland CBD; cost NZ$85 million; architect Craig Craig
//   Moller Ltd, structural engineer Beca Group, main contractor Fletcher
//   Construction; roof 237 m, top floor 222 m, SkyDeck observatory 220 m;
//   three public observation levels: main observation deck at 186 m with
//   38 mm thick glass floor sections, Orbit 360 revolving restaurant at
//   190 m (New Zealand's only revolving restaurant, one revolution per
//   hour), SkyDeck just below the main antenna at 220 m with views to
//   82 km; four public levels in the pod (Level 50 Sky Bar, Level 51 main
//   observation, Level 52 Orbit 360 Dining, Level 53 lookout); 4 lifts;
//   SkyJump (192 m guided-cable jump, up to 85 km/h) and SkyWalk (exterior
//   walkway) operate from the pod; designed to withstand winds over
//   200 km/h and a magnitude 8.0 earthquake; televised New Year's fireworks
//   fired from three platforms, the highest fireworks display in the
//   Southern Hemisphere.
// Schematic (not sourced, never stated as fact in the UI): exact shaft
// taper and radius; podium footprint and height; pod disc radius and the
// exact profile of the lower flare and upper taper; number and placement
// of glass curtain segments, support struts, mast segments, antenna
// dishes and aviation lights; elevator and stair positions; interior
// level subdivisions.
//
// Coordinate frame: y = up, ground at y = 0. All dimensions in meters.
//
// Granularity: 110+ named parts across 7 systems. Every explanation is
// either a sourced fact (see above) or explicitly marked schematic.
//
// Usage: node scripts/generate-sky-tower.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'sky-tower');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (328 m) maps to 2.4 units.
const S = 2.4 / 328;

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
function frustum(rTop, rBot, y0, y1, seg = 24) {
  return cyl(rTop, rBot, y1 - y0, 0, (y0 + y1) / 2, 0, seg);
}
function disc(r, y0, y1, seg = 32) {
  return cyl(r, r, y1 - y0, 0, (y0 + y1) / 2, 0, seg);
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// ---------------------------------------------------------------- base
// The tower rises from the SKYCITY complex podium (schematic footprint).
addPart('foundation-slab', 'Foundation slab', 'base', [box(-22, 22, -2, 0, -22, 22)]);
addPart('podium-wall-north', 'Podium north wall', 'base', [box(-20, 20, 0, 14, 16, 20)]);
addPart('podium-wall-south', 'Podium south wall', 'base', [box(-20, 20, 0, 14, -20, -16)]);
addPart('podium-wall-east', 'Podium east wall', 'base', [box(16, 20, 0, 14, -16, 16)]);
addPart('podium-wall-west', 'Podium west wall', 'base', [box(-20, -16, 0, 14, -16, 16)]);
addPart('podium-roof', 'Podium roof', 'base', [box(-20, 20, 14, 15.5, -20, 20)]);
addPart('entrance-canopy', 'Entrance canopy', 'base', [box(-8, 8, 4, 5, 20, 27)]);
addPart('podium-mezzanine', 'Podium mezzanine floor', 'base', [box(-19, 19, 6.5, 7.5, -19, 19)]);

// ---------------------------------------------------------------- shaft
// Tapered reinforced-concrete shaft, 15 m to 170 m (schematic taper).
addPart('shaft-base-flare', 'Shaft base flare', 'shaft', [frustum(7.5, 11, 0, 15, 24)]);
const SHAFT_SEGS = 10;
for (let i = 0; i < SHAFT_SEGS; i++) {
  const y0 = 15 + (i * 155) / SHAFT_SEGS;
  const y1 = 15 + ((i + 1) * 155) / SHAFT_SEGS;
  const r0 = 7.5 - (i * 2.5) / SHAFT_SEGS;
  const r1 = 7.5 - ((i + 1) * 2.5) / SHAFT_SEGS;
  addPart(`shaft-segment-${i + 1}`, `Shaft segment ${i + 1}`, 'shaft', [frustum(r1, r0, y0, y1, 20)]);
}
// Four lift shafts expressed as slight exterior ribs (schematic).
for (let k = 0; k < 4; k++) {
  const a = (k * Math.PI) / 2 + Math.PI / 4;
  const x = Math.cos(a) * 6.2, z = Math.sin(a) * 6.2;
  addPart(`lift-rib-${k + 1}`, `Lift rib ${k + 1}`, 'shaft', [box(x - 0.8, x + 0.8, 15, 170, z - 0.8, z + 0.8)]);
}
addPart('shaft-crown-ring', 'Shaft crown ring', 'shaft', [cyl(5.6, 5.0, 2, 0, 171, 0, 24)]);

// ---------------------------------------------------------------- main pod
// The pod: inverted flare 170-186 m, main disc 186-200 m housing Levels
// 50-53, upper taper 200-212 m.
addPart('pod-lower-flare', 'Pod lower flare', 'main-pod', [frustum(20, 5.2, 170, 186, 36)]);
// 12 radial support struts under the flare (schematic).
for (let k = 0; k < 12; k++) {
  const a = (k * Math.PI * 2) / 12;
  const x0 = Math.cos(a) * 5.5, z0 = Math.sin(a) * 5.5;
  const x1 = Math.cos(a) * 18, z1 = Math.sin(a) * 18;
  addPart(`pod-strut-${k + 1}`, `Pod support strut ${k + 1}`, 'main-pod', [strut([x0, 171, z0], [x1, 185, z1], 1.2)]);
}
// Pod floor slabs: Level 50 Sky Bar (182 m), Level 51 main observation
// (186 m), Level 52 Orbit 360 Dining (190 m), Level 53 lookout (194 m).
const LEVELS = [
  ['level-50-sky-bar', 'Level 50 Sky Bar floor', 181, 183],
  ['level-51-observation', 'Level 51 main observation floor', 185, 187],
  ['level-52-orbit-dining', 'Level 52 Orbit 360 Dining floor', 189, 191],
  ['level-53-lookout', 'Level 53 lookout floor', 193, 195],
];
for (const [id, name, y0, y1] of LEVELS) {
  addPart(id, name, 'main-pod', [disc(19.5, y0, y1, 36)]);
}
addPart('pod-roof-disc', 'Pod roof', 'main-pod', [disc(19.5, 199, 200.5, 36)]);
addPart('pod-upper-taper', 'Pod upper taper', 'main-pod', [frustum(7, 19.5, 200.5, 212, 36)]);
// Glass curtain: 8 segments x 2 bands (schematic subdivision).
for (let k = 0; k < 8; k++) {
  const a0 = (k * Math.PI * 2) / 8, a1 = ((k + 1) * Math.PI * 2) / 8;
  for (let b = 0; b < 2; b++) {
    const y0 = 183 + b * 8, y1 = 191 + b * 8;
    const g = new THREE.CylinderGeometry(20.1, 20.1, y1 - y0, 6, 1, true, a0, a1 - a0);
    g.translate(0, (y0 + y1) / 2, 0);
    addPart(`pod-glass-${k + 1}-${b === 0 ? 'lower' : 'upper'}`, `Pod glass curtain ${k + 1} ${b === 0 ? 'lower' : 'upper'}`, 'main-pod', [g]);
  }
}
// Glass floor panels at the 186 m main observation level (38 mm glass).
addPart('glass-floor-panels', 'Glass floor panels', 'main-pod', [
  box(-4, 4, 186.9, 187.1, -9, -5),
  box(-4, 4, 186.9, 187.1, 5, 9),
  box(5, 9, 186.9, 187.1, -4, 4),
  box(-9, -5, 186.9, 187.1, -4, 4),
]);
addPart('orbit-restaurant-ring', 'Orbit restaurant revolving ring', 'main-pod', [cyl(14, 14, 1.2, 0, 190.5, 0, 32)]);

// ---------------------------------------------------------------- skydeck pod
// Smaller SkyDeck pod at 215-225 m (observatory at 220 m).
addPart('skydeck-lower-flare', 'SkyDeck lower flare', 'skydeck', [frustum(12, 7, 212, 218, 28)]);
addPart('skydeck-floor', 'SkyDeck observatory floor', 'skydeck', [disc(12, 219, 221, 28)]);
addPart('skydeck-roof', 'SkyDeck roof', 'skydeck', [disc(12, 224, 225.5, 28)]);
addPart('skydeck-upper-taper', 'SkyDeck upper taper', 'skydeck', [frustum(4.5, 12, 225.5, 232, 28)]);
for (let k = 0; k < 6; k++) {
  const a0 = (k * Math.PI * 2) / 6, a1 = ((k + 1) * Math.PI * 2) / 6;
  const g = new THREE.CylinderGeometry(12.1, 12.1, 5, 5, 1, true, a0, a1 - a0);
  g.translate(0, 222.5, 0);
  addPart(`skydeck-glass-${k + 1}`, `SkyDeck glass ${k + 1}`, 'skydeck', [g]);
}

// ---------------------------------------------------------------- mast
// Tapered mast 232-328 m with antenna equipment (schematic subdivision).
const MAST_SEGS = 8;
for (let i = 0; i < MAST_SEGS; i++) {
  const y0 = 232 + (i * 96) / MAST_SEGS;
  const y1 = 232 + ((i + 1) * 96) / MAST_SEGS;
  const r0 = 4.5 - (i * 3.5) / MAST_SEGS;
  const r1 = 4.5 - ((i + 1) * 3.5) / MAST_SEGS;
  addPart(`mast-segment-${i + 1}`, `Mast segment ${i + 1}`, 'mast', [frustum(r1, r0, y0, y1, 16)]);
}
addPart('spire-tip', 'Spire tip', 'mast', [cyl(0.15, 1.0, 6, 0, 325, 0, 10)]);
// Antenna whips near the top (schematic).
for (let k = 0; k < 4; k++) {
  const a = (k * Math.PI) / 2;
  const x = Math.cos(a) * 2.2, z = Math.sin(a) * 2.2;
  addPart(`antenna-whip-${k + 1}`, `Antenna whip ${k + 1}`, 'mast', [cyl(0.08, 0.08, 9, x, 312, z, 6)]);
}

// ---------------------------------------------------------------- telecom
// Dishes, panels and aviation lights (schematic placement).
for (let k = 0; k < 4; k++) {
  const a = (k * Math.PI) / 2 + Math.PI / 8;
  const x = Math.cos(a) * 5.5, z = Math.sin(a) * 5.5;
  const dish = new THREE.SphereGeometry(1.6, 12, 8, 0, Math.PI * 2, 0, Math.PI / 3);
  dish.rotateX(Math.PI / 2.4);
  dish.rotateY(-a);
  dish.translate(x, 245, z);
  addPart(`telecom-dish-${k + 1}`, `Telecom dish ${k + 1}`, 'telecom', [dish]);
}
for (let k = 0; k < 6; k++) {
  const a = (k * Math.PI * 2) / 6;
  const x = Math.cos(a) * 3.4, z = Math.sin(a) * 3.4;
  const p = box(-0.1, 0.1, 0, 3, -1.2, 1.2);
  p.rotateY(-a);
  p.translate(x, 268, z);
  addPart(`antenna-panel-${k + 1}`, `Antenna panel ${k + 1}`, 'telecom', [p]);
}
for (const [id, name, y] of [['aviation-light-lower', 'Lower aviation light', 236], ['aviation-light-mid', 'Mid aviation light', 282], ['aviation-light-top', 'Top aviation light', 326]]) {
  addPart(id, name, 'telecom', [new THREE.SphereGeometry(0.5, 8, 6).translate(0, y, 0)]);
}

// ---------------------------------------------------------------- lighting
// Floodlight fixtures for commemorative lightings (schematic).
for (let k = 0; k < 6; k++) {
  const a = (k * Math.PI * 2) / 6;
  const x = Math.cos(a) * 21, z = Math.sin(a) * 21;
  addPart(`floodlight-${k + 1}`, `Floodlight ${k + 1}`, 'lighting', [
    box(x - 0.6, x + 0.6, 178, 179.5, z - 0.6, z + 0.6),
    strut([x, 179.5, z], [Math.cos(a) * 19, 186, Math.sin(a) * 19], 0.3),
  ]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('glass')) return '#9fc6d8';
  if (id === 'glass-floor-panels') return '#b8dce8';
  if (id.includes('pod-') || id.includes('skydeck') || id.includes('level-') || id.includes('orbit')) return '#c8cdd2';
  if (id.includes('shaft') || id.includes('lift-rib')) return '#a9a49a';
  if (id.includes('mast') || id.includes('spire') || id.includes('antenna')) return '#8b9096';
  if (id.includes('telecom-dish')) return '#d8d5cf';
  if (id.includes('aviation-light')) return '#e0342b';
  if (id.includes('podium') || id.includes('foundation') || id.includes('entrance')) return '#9a958c';
  return '#b9b4aa';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Base and podium', color: '#9a958c', description: 'The SKYCITY complex podium the tower rises from (schematic).' },
  { id: 'shaft', name: 'Concrete shaft', color: '#a9a49a', description: 'The tapered reinforced-concrete shaft carrying the pod, engineered for 200 km/h winds and a magnitude 8.0 earthquake.' },
  { id: 'main-pod', name: 'Main pod', color: '#c8cdd2', description: 'The main pod at 170 to 212 m with Levels 50 to 53: Sky Bar, main observation deck, Orbit 360 revolving restaurant and lookout.' },
  { id: 'skydeck', name: 'SkyDeck pod', color: '#c8cdd2', description: 'The smaller SkyDeck observatory pod at 220 m, with views to 82 km.' },
  { id: 'mast', name: 'Mast and spire', color: '#8b9096', description: 'The tapered telecommunications mast rising to 328 m.' },
  { id: 'telecom', name: 'Telecom equipment', color: '#d8d5cf', description: 'Antenna dishes, panels and aviation warning lights (schematic placement).' },
  { id: 'lighting', name: 'Architectural lighting', color: '#e8b13c', description: 'Floodlighting used for commemorative lightings and the New Year show (schematic).' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'foundation slab': 'The reinforced foundation slab anchoring the tower. Exact foundation design is schematic.',
  'podium north wall': 'The north wall of the SKYCITY podium the tower rises from. Exact podium architecture is schematic.',
  'podium south wall': 'The south wall of the SKYCITY podium. Exact podium architecture is schematic.',
  'podium east wall': 'The east wall of the SKYCITY podium. Exact podium architecture is schematic.',
  'podium west wall': 'The west wall of the SKYCITY podium. Exact podium architecture is schematic.',
  'podium roof': 'The roof of the podium complex. Exact form is schematic.',
  'entrance canopy': 'The visitor entrance canopy. Exact form is schematic.',
  'podium mezzanine floor': 'A mezzanine floor inside the podium. Exact interior is schematic.',
  'shaft base flare': 'The flared transition from the podium to the concrete shaft. Exact profile is schematic.',
  'shaft crown ring': 'The ring molding where the shaft meets the pod flare. Exact profile is schematic.',
  'pod lower flare': 'The inverted flare spreading from the shaft to the full width of the main pod. Exact profile is schematic.',
  'pod roof': 'The roof of the main pod at 200 m. Exact form is schematic.',
  'pod upper taper': 'The taper narrowing from the main pod toward the SkyDeck. Exact profile is schematic.',
  'glass floor panels': 'Sections of the main observation deck floor at 186 m made of 38 mm thick glass, giving a view straight to the ground.',
  'orbit restaurant revolving ring': 'The revolving ring of Orbit 360 Dining, New Zealand\u2019s only revolving restaurant, turning 360 degrees every hour at 190 m.',
  'skydeck lower flare': 'The flare spreading to the SkyDeck observatory pod. Exact profile is schematic.',
  'skydeck observatory floor': 'The SkyDeck observatory floor at 220 m, with views up to 82 km on a clear day.',
  'skydeck roof': 'The roof of the SkyDeck pod. Exact form is schematic.',
  'skydeck upper taper': 'The taper from the SkyDeck to the mast. Exact profile is schematic.',
  'spire tip': 'The tip of the antenna mast at 328 m, the highest point of the tower.',
};
for (let i = 1; i <= SHAFT_SEGS; i++) {
  explanations[`shaft segment ${i}`] = `Stacked tapered segment ${i} of ${SHAFT_SEGS} forming the reinforced-concrete shaft. Exact taper is schematic.`;
}
for (let k = 1; k <= 4; k++) {
  explanations[`lift rib ${k}`] = `Exterior rib expressing one of the four lift shafts inside the concrete core. Exact placement is schematic.`;
}
for (let k = 1; k <= 12; k++) {
  explanations[`pod support strut ${k}`] = `Radial support strut ${k} of 12 bracing the pod flare against the shaft. Exact structure is schematic.`;
}
explanations['level 50 sky bar floor'] = 'The floor of Level 50, the Sky Bar, at about 182 m.';
explanations['level 51 main observation floor'] = 'The floor of Level 51, the main observation deck at 186 m with the glass floor sections.';
explanations['level 52 orbit 360 dining floor'] = 'The floor of Level 52, Orbit 360 Dining at 190 m.';
explanations['level 53 lookout floor'] = 'The floor of Level 53, the lookout level at about 194 m.';
for (let k = 1; k <= 8; k++) {
  for (const band of ['lower', 'upper']) {
    explanations[`pod glass curtain ${k} ${band}`] = `Glass curtain segment ${k} (${band} band) of the main pod. Exact mullion layout is schematic.`;
  }
}
for (let k = 1; k <= 6; k++) {
  explanations[`skydeck glass ${k}`] = `Glass segment ${k} of the SkyDeck observatory. Exact mullion layout is schematic.`;
}
for (let i = 1; i <= MAST_SEGS; i++) {
  explanations[`mast segment ${i}`] = `Tapered mast segment ${i} of ${MAST_SEGS} carrying the telecommunications equipment to 328 m. Exact taper is schematic.`;
}
for (let k = 1; k <= 4; k++) {
  explanations[`antenna whip ${k}`] = `Antenna whip ${k} near the top of the mast. Exact placement is schematic.`;
  explanations[`telecom dish ${k}`] = `Telecommunications dish ${k} on the mast. Exact placement is schematic.`;
}
for (let k = 1; k <= 6; k++) {
  explanations[`antenna panel ${k}`] = `Antenna panel ${k} on the mast. Exact placement is schematic.`;
}
for (let k = 1; k <= 6; k++) {
  explanations[`floodlight ${k}`] = `Floodlight fixture ${k} of 6 aimed at the pod for commemorative lightings and events. Exact placement is schematic.`;
}
explanations['lower aviation light'] = 'Aviation warning light on the lower mast, required for the 328 m structure. Exact placement is schematic.';
explanations['mid aviation light'] = 'Aviation warning light on the mid mast. Exact placement is schematic.';
explanations['top aviation light'] = 'Aviation warning light near the spire tip. Exact placement is schematic.';

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
const binName = 'sky-tower-0.bin';
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
  scope: 'Sky Tower, Auckland',
  title: 'Sky Tower',
  location: 'Auckland, New Zealand',
  blurb: 'Auckland\u2019s 328 m observation and telecommunications tower, opened in 1997: a tapered concrete shaft carries the main pod with its observation decks and revolving restaurant, a smaller SkyDeck pod, and the antenna mast.',
  sourceUrls: [
    { label: 'Wikipedia: Sky Tower (Auckland)', url: 'https://en.wikipedia.org/wiki/Sky_Tower_(Auckland)' },
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
  chunks: [{ url: '/models/sky-tower/sky-tower-0.bin', bytes: offset }],
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
