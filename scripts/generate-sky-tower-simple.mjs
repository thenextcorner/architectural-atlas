// Simplified schematic Sky Tower (Auckland) for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-sky-tower.mjs, whose header lists
// every sourced dimension reused here), but coarser: 30 named parts
// across 6 systems instead of 103 across 7. Shaft segments, pod glass,
// mast segments and antenna equipment are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-sky-tower.mjs for the full attribution):
//   328 m to the top of the mast; opened 1997; SKYCITY Auckland complex;
//   main observation deck 186 m with 38 mm glass floor sections; Orbit 360
//   revolving restaurant 190 m; SkyDeck observatory 220 m with 82 km
//   views; 4 lifts; SkyJump and SkyWalk from the pod.
// Schematic (not sourced, never stated as fact in the UI): exact shaft
// taper, pod radius and profiles, segment counts, antenna placement.
//
// Writes:
//   public/models/sky-tower-simple/atlas.json
//   public/models/sky-tower-simple/sky-tower-simple-0.bin
//
// Usage: node scripts/generate-sky-tower-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'sky-tower-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (328 m) maps to 2.4 units (same as detailed).
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
function cyl(rt, rb, h, x, y, z, seg = 14) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function frustum(rTop, rBot, y0, y1, seg = 20) {
  return cyl(rTop, rBot, y1 - y0, 0, (y0 + y1) / 2, 0, seg);
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Base: podium block, roof and entrance merged: 3 parts.
addPart('podium-block', 'Podium block', 'base', [box(-20, 20, 0, 14, -20, 20)]);
addPart('podium-roof', 'Podium roof', 'base', [box(-20, 20, 14, 15.5, -20, 20)]);
addPart('entrance-canopy', 'Entrance canopy', 'base', [box(-8, 8, 4, 5, 20, 27)]);

// --- Shaft: base flare, three merged shaft sections, crown ring: 5 parts.
addPart('shaft-base-flare', 'Shaft base flare', 'shaft', [frustum(7.5, 11, 0, 15, 20)]);
addPart('shaft-lower', 'Lower shaft', 'shaft', [frustum(6.7, 7.5, 15, 67, 18)]);
addPart('shaft-middle', 'Middle shaft', 'shaft', [frustum(5.8, 6.7, 67, 119, 18)]);
addPart('shaft-upper', 'Upper shaft', 'shaft', [frustum(5.0, 5.8, 119, 170, 18)]);
addPart('shaft-crown-ring', 'Shaft crown ring', 'shaft', [cyl(5.6, 5.0, 2, 0, 171, 0, 20)]);

// --- Main pod: flare, four level floors merged, glass band, roof, taper: 8 parts.
addPart('pod-lower-flare', 'Pod lower flare', 'main-pod', [frustum(20, 5.2, 170, 186, 28)]);
addPart('pod-level-floors', 'Pod level floors', 'main-pod', [
  cyl(19.5, 19.5, 2, 0, 182, 0, 28),
  cyl(19.5, 19.5, 2, 0, 186, 0, 28),
  cyl(19.5, 19.5, 2, 0, 190, 0, 28),
  cyl(19.5, 19.5, 2, 0, 194, 0, 28),
]);
{
  const g = new THREE.CylinderGeometry(20.1, 20.1, 16, 28, 1, true);
  g.translate(0, 191, 0);
  addPart('pod-glass-band', 'Pod glass band', 'main-pod', [g]);
}
addPart('glass-floor-panels', 'Glass floor panels', 'main-pod', [
  box(-4, 4, 186.9, 187.1, -9, -5),
  box(-4, 4, 186.9, 187.1, 5, 9),
]);
addPart('pod-roof', 'Pod roof', 'main-pod', [cyl(19.5, 19.5, 1.5, 0, 199.75, 0, 28)]);
addPart('pod-upper-taper', 'Pod upper taper', 'main-pod', [frustum(7, 19.5, 200.5, 212, 28)]);
{
  const struts = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI * 2) / 8;
    struts.push(strut([Math.cos(a) * 5.5, 171, Math.sin(a) * 5.5], [Math.cos(a) * 18, 185, Math.sin(a) * 18], 1.4));
  }
  addPart('pod-support-struts', 'Pod support struts', 'main-pod', struts);
}
addPart('orbit-restaurant-ring', 'Orbit restaurant revolving ring', 'main-pod', [cyl(14, 14, 1.2, 0, 190.5, 0, 24)]);

// --- SkyDeck: flare, floor, glass, roof, taper merged: 5 parts.
addPart('skydeck-flare', 'SkyDeck flare', 'skydeck', [frustum(12, 7, 212, 218, 22)]);
addPart('skydeck-floor', 'SkyDeck observatory floor', 'skydeck', [cyl(12, 12, 2, 0, 220, 0, 22)]);
{
  const g = new THREE.CylinderGeometry(12.1, 12.1, 5, 22, 1, true);
  g.translate(0, 222.5, 0);
  addPart('skydeck-glass', 'SkyDeck glass', 'skydeck', [g]);
}
addPart('skydeck-roof', 'SkyDeck roof', 'skydeck', [cyl(12, 12, 1.5, 0, 224.75, 0, 22)]);
addPart('skydeck-taper', 'SkyDeck upper taper', 'skydeck', [frustum(4.5, 12, 225.5, 232, 22)]);

// --- Mast: three merged sections, spire tip, antenna cluster: 5 parts.
addPart('mast-lower', 'Lower mast', 'mast', [frustum(3.3, 4.5, 232, 264, 14)]);
addPart('mast-middle', 'Middle mast', 'mast', [frustum(2.2, 3.3, 264, 296, 14)]);
addPart('mast-upper', 'Upper mast', 'mast', [frustum(1.0, 2.2, 296, 322, 14)]);
addPart('spire-tip', 'Spire tip', 'mast', [cyl(0.15, 1.0, 6, 0, 325, 0, 8)]);
{
  const ant = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    ant.push(cyl(0.08, 0.08, 9, Math.cos(a) * 2.2, 312, Math.sin(a) * 2.2, 6));
  }
  for (let k = 0; k < 3; k++) {
    ant.push(new THREE.SphereGeometry(0.5, 8, 6).translate(0, [236, 282, 326][k], 0));
  }
  addPart('antenna-cluster', 'Antenna cluster', 'mast', ant);
}

// --- Telecom/lighting merged: 4 parts.
{
  const dishes = [];
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 8;
    const d = new THREE.SphereGeometry(1.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 3);
    d.rotateX(Math.PI / 2.4);
    d.rotateY(-a);
    d.translate(Math.cos(a) * 5.5, 245, Math.sin(a) * 5.5);
    dishes.push(d);
  }
  addPart('telecom-dishes', 'Telecom dishes', 'telecom', dishes);
}
{
  const lights = [];
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI * 2) / 6;
    const x = Math.cos(a) * 21, z = Math.sin(a) * 21;
    lights.push(box(x - 0.6, x + 0.6, 178, 179.5, z - 0.6, z + 0.6));
  }
  addPart('floodlights', 'Floodlights', 'telecom', lights);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('glass')) return '#9fc6d8';
  if (id.includes('pod-') || id.includes('skydeck') || id.includes('orbit') || id === 'pod-level-floors') return '#c8cdd2';
  if (id.includes('shaft')) return '#a9a49a';
  if (id.includes('mast') || id.includes('spire') || id.includes('antenna')) return '#8b9096';
  if (id.includes('telecom')) return '#d8d5cf';
  if (id.includes('floodlight')) return '#e8b13c';
  if (id.includes('podium') || id.includes('entrance')) return '#9a958c';
  return '#b9b4aa';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Base and podium', color: '#9a958c', description: 'The SKYCITY complex podium the tower rises from (schematic).' },
  { id: 'shaft', name: 'Concrete shaft', color: '#a9a49a', description: 'The tapered reinforced-concrete shaft carrying the pod.' },
  { id: 'main-pod', name: 'Main pod', color: '#c8cdd2', description: 'The main pod with observation decks and the revolving restaurant.' },
  { id: 'skydeck', name: 'SkyDeck pod', color: '#c8cdd2', description: 'The smaller SkyDeck observatory pod at 220 m.' },
  { id: 'mast', name: 'Mast and spire', color: '#8b9096', description: 'The tapered telecommunications mast rising to 328 m.' },
  { id: 'telecom', name: 'Telecom and lighting', color: '#d8d5cf', description: 'Antenna dishes and floodlighting (schematic placement).' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'podium block': 'The SKYCITY podium block the tower rises from. Exact podium architecture is schematic.',
  'podium roof': 'The roof of the podium complex. Exact form is schematic.',
  'entrance canopy': 'The visitor entrance canopy. Exact form is schematic.',
  'shaft base flare': 'The flared transition from the podium to the concrete shaft. Exact profile is schematic.',
  'lower shaft': 'The lower third of the tapered reinforced-concrete shaft. Exact taper is schematic.',
  'middle shaft': 'The middle third of the tapered shaft. Exact taper is schematic.',
  'upper shaft': 'The upper third of the tapered shaft. Exact taper is schematic.',
  'shaft crown ring': 'The ring molding where the shaft meets the pod flare. Exact profile is schematic.',
  'pod lower flare': 'The inverted flare spreading from the shaft to the full width of the main pod. Exact profile is schematic.',
  'pod level floors': 'The floors of Levels 50 to 53: Sky Bar, main observation deck, Orbit 360 Dining and lookout.',
  'pod glass band': 'The glass curtain wrapping the main pod. Exact mullion layout is schematic.',
  'glass floor panels': 'Sections of the main observation deck floor at 186 m made of 38 mm thick glass.',
  'pod roof': 'The roof of the main pod. Exact form is schematic.',
  'pod upper taper': 'The taper narrowing from the main pod toward the SkyDeck. Exact profile is schematic.',
  'pod support struts': 'Radial struts bracing the pod flare against the shaft. Exact structure is schematic.',
  'orbit restaurant revolving ring': 'The revolving ring of Orbit 360 Dining, turning 360 degrees every hour at 190 m.',
  'skydeck flare': 'The flare spreading to the SkyDeck observatory pod. Exact profile is schematic.',
  'skydeck observatory floor': 'The SkyDeck observatory floor at 220 m, with views up to 82 km.',
  'skydeck glass': 'The glass wrapping the SkyDeck observatory. Exact mullion layout is schematic.',
  'skydeck roof': 'The roof of the SkyDeck pod. Exact form is schematic.',
  'skydeck upper taper': 'The taper from the SkyDeck to the mast. Exact profile is schematic.',
  'lower mast': 'The lower section of the telecommunications mast. Exact taper is schematic.',
  'middle mast': 'The middle section of the mast. Exact taper is schematic.',
  'upper mast': 'The upper section of the mast. Exact taper is schematic.',
  'spire tip': 'The tip of the antenna mast at 328 m.',
  'antenna cluster': 'Antenna whips and aviation warning lights near the top of the mast. Exact placement is schematic.',
  'telecom dishes': 'Telecommunications dishes on the mast. Exact placement is schematic.',
  'floodlights': 'Floodlight fixtures aimed at the pod for commemorative lightings. Exact placement is schematic.',
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
const binName = 'sky-tower-simple-0.bin';
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
  scope: 'Sky Tower, Auckland (simplified schematic)',
  title: 'Sky Tower',
  location: 'Auckland, New Zealand',
  blurb: 'Auckland\u2019s 328 m tower in simplified form: tapered shaft, main pod with observation decks, SkyDeck pod and antenna mast.',
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
  chunks: [{ url: '/models/sky-tower-simple/sky-tower-simple-0.bin', bytes: offset }],
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
