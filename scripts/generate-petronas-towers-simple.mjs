// Simplified schematic Petronas Towers for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-petronas-towers.mjs, whose header
// lists every sourced dimension reused here), but coarser: 27 named parts
// across 7 systems instead of 102 across 9. Shaft sections, terraces,
// mullions and pinnacles are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-petronas-towers.mjs for the full attribution):
//   Kuala Lumpur, Cesar Pelli, postmodern Islamic; 1992-1996, opened 31
//   August 1999, US$1.6 billion; 88 floors (5 underground); 451.9 m
//   architectural, roof about 405 m, observatory 370 m (level 86);
//   tallest 1998-2004, still tallest twins; eight-pointed star plan (two
//   interlocking squares: unity, harmony, stability, rationality);
//   stainless steel and glass with Islamic patterns; tube-in-tube;
//   4.5 m raft on 104 barrette piles 60-115 m deep; skybridge at levels
//   41-42, 58.4 m, 170 m up, 750 tons, moves independently, fire escape;
//   29 double-deck lifts per tower; former horse race track; Entrapment
//   (1999) heist; Independence Day: Resurgence (2016) trailer collapse.
// Schematic (not sourced, never stated as fact in the UI): tower spacing
// and footprint; setback counts and heights; spire profiles; podium and
// park layouts; merged group geometry.
//
// Writes:
//   public/models/petronas-towers-simple/atlas.json
//   public/models/petronas-towers-simple/petronas-towers-simple-0.bin
//
// Usage: node scripts/generate-petronas-towers-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'petronas-towers-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (451.9 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 460;

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
function starCyl(rOutB, rInB, rOutT, rInT, h, x, y, z) {
  const g = new THREE.CylinderGeometry(rOutT, rOutB, h, 16, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i), vz = pos.getZ(i);
    const rad = Math.hypot(vx, vz);
    if (rad < 1e-6) continue;
    const ang = Math.atan2(vz, vx);
    const k = Math.round(ang / (Math.PI / 8));
    if ((((k % 2) + 2) % 2) === 1) {
      const t = (pos.getY(i) + h / 2) / h;
      const rO = rOutB + (rOutT - rOutB) * t;
      const rI = rInB + (rInT - rInB) * t;
      const s = rI / rO;
      pos.setX(i, vx * s);
      pos.setZ(i, vz * s);
    }
  }
  g.computeVertexNormals();
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const T1X = -45, T2X = 45;

// --- Foundations: 2 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`foundation-raft-tower-${tn}`, `Foundation raft tower ${tn}`, 'foundations', [
    box(tx - 30, tx + 30, -8, -3.5, -30, 30),
  ]);
}

// --- Podium: 5 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`podium-tower-${tn}`, `Podium tower ${tn}`, 'podium', [box(tx - 32, tx + 32, 0, 20, -32, 32)]);
  addPart(`lobby-tower-${tn}`, `Lobby tower ${tn}`, 'podium', [
    box(tx - 14, tx + 14, 0, 12, tx < 0 ? -44 : 32, tx < 0 ? -32 : 44),
  ]);
}
addPart('retail-concourse', 'Retail concourse', 'podium', [box(-77, 77, -3.5, 6, -50, 50)]);

// --- Shafts: 4 parts (one merged shaft + terraces per tower).
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`tower-shaft-${tn}`, `Tower shaft ${tn}`, 'tower-shafts', [
    starCyl(24, 19.7, 14, 11.5, 355, tx, 197.5, 0),
  ]);
  const terr = [];
  for (const [ty, tr] of [[120, 23], [220, 20.5], [315, 17.5], [375, 14]]) {
    terr.push(starCyl(tr + 1.2, tr * 0.82 + 1.2, tr + 1.2, tr * 0.82 + 1.2, 1.4, tx, ty - 0.7, 0));
  }
  addPart(`setback-terraces-${tn}`, `Setback terraces ${tn}`, 'tower-shafts', terr);
}

// --- Crowns: 5 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`spire-base-${tn}`, `Spire base ${tn}`, 'crowns', [
    starCyl(14, 11.5, 8, 6.6, 30, tx, 390, 0),
  ]);
  addPart(`spire-${tn}`, `Spire ${tn}`, 'crowns', [cyl(0.4, 3.2, 46.9, tx, 428.45, 0, 8)]);
}
{
  const pins = [];
  for (const tx of [T1X, T2X]) {
    for (const [px, pz] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) {
      pins.push(cyl(0.15, 1.1, 20, tx + px, 385, pz, 8));
    }
  }
  addPart('corner-pinnacles', 'Corner pinnacles', 'crowns', pins);
}

// --- Skybridge: 4 parts.
addPart('skybridge-deck', 'Skybridge deck', 'skybridge', [box(-29.2, 29.2, 170, 182, -4, 4)]);
{
  const struts = [];
  for (const sz of [3.5, -3.5]) {
    struts.push(strut([-27, 148, sz], [-12, 170, sz], 1.6));
    struts.push(strut([27, 148, sz], [12, 170, sz], 1.6));
  }
  addPart('skybridge-struts', 'Skybridge struts', 'skybridge', struts);
}
addPart('skybridge-end-frame-1', 'Skybridge end frame 1', 'skybridge', [box(-30, -26, 168, 184, -5, 5)]);
addPart('skybridge-end-frame-2', 'Skybridge end frame 2', 'skybridge', [box(26, 30, 168, 184, -5, 5)]);

// --- Facade: 3 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`facade-cladding-${tn}`, `Facade cladding ${tn}`, 'facade', [
    starCyl(24.6, 20.2, 14.6, 12.0, 355, tx, 197.5, 0),
  ]);
}
addPart('glass-curtain-band', 'Glass curtain band', 'facade', [
  starCyl(23.4, 19.2, 23.4, 19.2, 60, T1X, 50, 0),
  starCyl(23.4, 19.2, 23.4, 19.2, 60, T2X, 50, 0),
]);

// --- Transport and crown: 2 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`lift-core-${tn}`, `Lift core ${tn}`, 'vertical-transport', [
    box(tx - 6, tx + 6, 0, 375, -6, 6),
  ]);
}
addPart('observation-deck', 'Observation deck', 'vertical-transport', [
  box(T1X - 14, T1X + 14, 368, 376, -14, 14),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('spire')) return '#ccd2d8';
  if (id.includes('pinnacle')) return '#c2c9d1';
  if (id.includes('cladding') || id.includes('shaft') || id.includes('terrace')) return '#aeb6be';
  if (id.includes('glass')) return '#7a9ab0';
  if (id.includes('skybridge')) return '#9aa4ae';
  if (id.includes('raft')) return '#8a8f96';
  if (id.includes('podium') || id.includes('concourse') || id.includes('lobby')) return '#8a8f96';
  if (id.includes('core') || id.includes('observation')) return '#7a828c';
  return '#aeb6be';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundations', name: 'Foundations', color: '#8a8f96', description: 'The 4.5 m concrete rafts on deep barrette piles. Piles not shown individually in the simple variant.' },
  { id: 'podium', name: 'Podium', color: '#8a8f96', description: 'Podium blocks, lobbies and the retail concourse. Layout is schematic.' },
  { id: 'tower-shafts', name: 'Tower shafts', color: '#aeb6be', description: 'The twin shafts on eight-pointed star plans with schematic setback terraces.' },
  { id: 'crowns', name: 'Crowns and spires', color: '#ccd2d8', description: 'Spire bases, the 451.9 m spires and corner pinnacles. Profiles are schematic.' },
  { id: 'skybridge', name: 'Skybridge', color: '#9aa4ae', description: 'The double-decker skybridge at levels 41 and 42, 58.4 m long and 170 m up.' },
  { id: 'facade', name: 'Facade', color: '#b8c0c8', description: 'Stainless steel cladding and the glass curtain band. Divisions are schematic.' },
  { id: 'vertical-transport', name: 'Cores and observation', color: '#7a828c', description: 'The central lift cores and the level 86 observation deck at 370 m.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'skybridge deck': 'The double-decker skybridge at levels 41 and 42: 58.4 m long, 170 m up, weighing 750 tons, moving independently of the towers in wind and doubling as a fire escape.',
  'skybridge struts': 'Schematic inclined struts carrying the skybridge. Exact arrangement is schematic.',
  'skybridge end frame 1': 'The frame where the skybridge meets Tower 1. Detail is schematic.',
  'skybridge end frame 2': 'The frame where the skybridge meets Tower 2. Detail is schematic.',
  'facade cladding 1': 'Stainless steel cladding of Tower 1; the towers wear 65,000 sq m of it. Divisions are schematic.',
  'facade cladding 2': 'Stainless steel cladding of Tower 2. Divisions are schematic.',
  'glass curtain band': 'The glass curtain wall band; 77,000 sq m of vision glass in total. Divisions are schematic.',
  'observation deck': 'The observation deck on level 86 at 370 m.',
  'retail concourse': 'The retail concourse linking the towers. Layout is schematic.',
  'corner pinnacles': 'Schematic corner pinnacles on the two crowns.',
};
for (const tn of [1, 2]) {
  explanations[`foundation raft tower ${tn}`] = `The 4.5 m concrete raft under Tower ${tn}, on 104 barrette piles 60 to 115 m deep. Extent is schematic.`;
  explanations[`podium tower ${tn}`] = `The podium block at the foot of Tower ${tn}. Massing is schematic.`;
  explanations[`lobby tower ${tn}`] = `The entrance lobby of Tower ${tn}. Form is schematic.`;
  explanations[`tower shaft ${tn}`] = `The shaft of Tower ${tn} on its eight-pointed star plan, two interlocking squares standing for unity, harmony, stability and rationality, tapering toward the 451.9 m pinnacle. Setbacks are schematic.`;
  explanations[`setback terraces ${tn}`] = `Schematic setback terraces of Tower ${tn}. Positions are schematic.`;
  explanations[`spire base ${tn}`] = `The tapering crown of Tower ${tn} below its spire. Profile is schematic.`;
  explanations[`spire ${tn}`] = `The stainless steel spire of Tower ${tn}, completing the 451.9 m architectural height. Profile is schematic.`;
  explanations[`lift core ${tn}`] = `The stiff central concrete core of Tower ${tn} in the tube-in-tube structure. Size is schematic.`;
}

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
const binName = 'petronas-towers-simple-0.bin';
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
  scope: 'Petronas Towers, Kuala Lumpur, Malaysia (simple)',
  title: 'Petronas Towers',
  location: 'Kuala Lumpur, Malaysia',
  blurb: 'Cesar Pelli\u2019s twin supertalls in simplified schematic form: 88 floors and 451.9 m on eight-pointed star plans, joined by the skybridge at levels 41 and 42.',
  sourceUrls: [
    { label: 'Wikipedia: Petronas Towers', url: 'https://en.wikipedia.org/wiki/Petronas_Towers' },
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
  chunks: [{ url: '/models/petronas-towers-simple/petronas-towers-simple-0.bin', bytes: offset }],
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
