// Procedural Hagia Sophia for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Hagia Sophia in code and
// writes it in the atlas binary format:
//   public/models/hagia-sophia/atlas.json
//   public/models/hagia-sophia/hagia-sophia-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   Church of Holy Wisdom, Istanbul; built 532-537 under Emperor Justinian I
//   after the Nika riots destroyed the earlier basilica; architects Anthemius
//   of Tralles and Isidore of Miletus; 82 m long, 73 m wide; central dome
//   31 m in diameter, crown 55.6 m above the floor, pierced by 40 windows at
//   its base; dome carried on four great piers via pendentives; two great
//   semi-domes east and west; 107 columns (40 ground floor, 67 galleries);
//   nave 250 ft long per some sources; converted to mosque 1453, four
//   minarets added in Ottoman period; mosaics including Deesis, Empress Zoe;
//   mihrab, minbar, Sultan's loge from Ottoman era.
// Schematic (not sourced, never stated as fact in the UI): exact pier
// positions and sizes; pendentive curvature; semi-dome profiles; column
// positions beyond counts; minaret heights and balcony counts; gallery,
// narthex and apse detailing; mosaic and mihrab placement.
//
// Coordinate frame: x = lateral (73 m width), z = longitudinal (82 m,
// apse east at +z), y = up, meters.
//
// Granularity: 100+ named parts across 9 systems.
//
// Usage: node scripts/generate-hagia-sophia.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'hagia-sophia');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (82 m) maps to 2.4 units.
const S = 2.4 / 82;

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
function sph(r, x, y, z, w = 14, h = 10, phiStart = 0, phiLen = Math.PI * 2, thetaStart = 0, thetaLen = Math.PI) {
  const g = new THREE.SphereGeometry(r, w, h, phiStart, phiLen, thetaStart, thetaLen);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// Central square bay: 31 m (dome diameter). Great piers at corners.
const BAY = 31, HB = BAY / 2;
const DOME_R = 15.5;
const SPRING_Y = 40;      // dome springing height (schematic)
const CROWN_Y = 55.6;     // dome crown (sourced)
const L = 82, W = 73;     // overall length, width

// --- Great piers (4 parts)
for (const [sx, sz, nm] of [[-1, -1, 'Northwest'], [1, -1, 'Northeast'], [-1, 1, 'Southwest'], [1, 1, 'Southeast']]) {
  addPart(`${nm.toLowerCase()}-great-pier`, `${nm} great pier`, 'nave', [
    box(sx * HB - 3.5, sx * HB + 3.5, 0, SPRING_Y, sz * HB - 3.5, sz * HB + 3.5),
  ]);
}

// --- Pendentives (4 parts): spherical triangles at bay corners
for (const [sx, sz, nm] of [[-1, -1, 'Northwest'], [1, -1, 'Northeast'], [-1, 1, 'Southwest'], [1, 1, 'Southeast']]) {
  // schematic: quarter-sphere shells at the bay corners transitioning square to circle
  const g = sph(DOME_R * 1.02, sx * HB * 0.72, SPRING_Y - 2, sz * HB * 0.72, 8, 6, 0, Math.PI / 2, 0, Math.PI / 2.6);
  addPart(`${nm.toLowerCase()}-pendentive`, `${nm} pendentive`, 'dome-support', [g]);
}

// --- Main dome (10 parts): 8 shell segments + window ring + finial
{
  const domeH = CROWN_Y - SPRING_Y;
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2;
    // dome as scaled hemisphere segment
    const g = new THREE.SphereGeometry(DOME_R, 6, 8, a0, a1 - a0, 0, Math.PI / 2);
    g.scale(1, domeH / DOME_R, 1);
    g.translate(0, SPRING_Y, 0);
    addPart(`dome-segment-${k + 1}`, `Dome segment ${k + 1}`, 'dome', [g]);
  }
  // ring of 40 windows at dome base (merged)
  const wins = [];
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    wins.push(box(Math.cos(a) * DOME_R - 0.35, Math.cos(a) * DOME_R + 0.35,
      SPRING_Y + 0.3, SPRING_Y + 2.6, Math.sin(a) * DOME_R - 0.35, Math.sin(a) * DOME_R + 0.35));
  }
  addPart('dome-window-ring', 'Dome window ring', 'dome', wins);
  addPart('dome-finial', 'Dome finial', 'dome', [cyl(0.3, 0.5, 3, 0, CROWN_Y + 1, 0, 8)]);
}

// --- Semi-domes east and west (8 parts)
for (const [sz, nm] of [[1, 'East'], [-1, 'West']]) {
  const zc = sz * (HB + 11);
  for (let k = 0; k < 3; k++) {
    const g = new THREE.SphereGeometry(14.5, 8, 6, (k / 3) * Math.PI, Math.PI / 3, 0, Math.PI / 2);
    g.scale(1, 0.75, 1);
    if (sz < 0) g.rotateY(Math.PI);
    g.translate(0, SPRING_Y - 4, zc);
    addPart(`${nm.toLowerCase()}-semidome-${k + 1}`, `${nm} semi-dome ${k + 1}`, 'semi-domes', [g]);
  }
  addPart(`${nm.toLowerCase()}-semidome-arch`, `${nm} semi-dome arch`, 'semi-domes', [
    box(-16, 16, SPRING_Y - 6, SPRING_Y - 3.5, zc - 1.2, zc + 1.2),
  ]);
}

// --- Nave colonnades (12 parts): ground-floor columns north/south
for (const [sz, nm] of [[1, 'South'], [-1, 'North']]) {
  const zc = sz * (HB - 4);
  for (let k = 0; k < 6; k++) {
    const x = -HB + 6 + k * ((2 * HB - 12) / 5);
    addPart(`${nm.toLowerCase()}-nave-column-${k + 1}`, `${nm} nave column ${k + 1}`, 'nave', [
      cyl(0.9, 1.0, 12, x, 6, zc, 10),
      box(x - 1.2, x + 1.2, 12, 12.8, zc - 1.2, zc + 1.2),
    ]);
  }
}

// --- Aisles (10 parts): outer walls, vaults and columns
for (const [sz, nm] of [[1, 'South'], [-1, 'North']]) {
  const zc = sz * (W / 2 - 4);
  addPart(`${nm.toLowerCase()}-aisle-wall`, `${nm} aisle outer wall`, 'aisles', [
    box(-L / 2, L / 2, 0, 22, zc - 1.5, zc + 1.5),
  ]);
  addPart(`${nm.toLowerCase()}-aisle-vault`, `${nm} aisle vault`, 'aisles', (() => {
    const g = new THREE.CylinderGeometry(8, 8, L - 8, 12, 1, true, 0, Math.PI);
    g.rotateZ(Math.PI / 2); // axis along x
    g.rotateY(Math.PI / 2); // half-shell opening downward
    g.translate(0, 22, zc);
    return [g];
  })());
  for (let k = 0; k < 3; k++) {
    const x = -L / 4 + k * (L / 4);
    addPart(`${nm.toLowerCase()}-aisle-column-${k + 1}`, `${nm} aisle column ${k + 1}`, 'aisles', [
      cyl(0.7, 0.8, 10, x, 5, zc - sz * 6, 8),
    ]);
  }
}

// --- Narthex at west end (6 parts)
{
  const zc = -L / 2 + 4;
  addPart('outer-narthex', 'Outer narthex', 'narthex', [box(-W / 2, W / 2, 0, 14, zc - 3, zc + 3)]);
  addPart('inner-narthex', 'Inner narthex', 'narthex', [box(-W / 2 + 4, W / 2 - 4, 0, 16, zc + 3, zc + 8)]);
  for (let k = 0; k < 3; k++) {
    const x = -12 + k * 12;
    addPart(`imperial-door-${k + 1}`, `Narthex door ${k + 1}`, 'narthex', [box(x - 1.5, x + 1.5, 0, 6, zc + 7.8, zc + 8.2)]);
  }
  addPart('narthex-vault', 'Narthex vault', 'narthex', (() => {
    const g = new THREE.CylinderGeometry(6, 6, W - 8, 10, 1, true, 0, Math.PI);
    g.rotateZ(Math.PI / 2);
    g.rotateY(Math.PI / 2);
    g.translate(0, 14, zc + 5);
    return [g];
  })());
}

// --- Galleries (8 parts): upper level north/south
for (const [sz, nm] of [[1, 'South'], [-1, 'North']]) {
  const zc = sz * (W / 2 - 10);
  addPart(`${nm.toLowerCase()}-gallery-floor`, `${nm} gallery floor`, 'galleries', [
    box(-L / 2 + 6, L / 2 - 6, 18, 19, zc - 5, zc + 5),
  ]);
  for (let k = 0; k < 3; k++) {
    const x = -L / 4 + k * (L / 4);
    addPart(`${nm.toLowerCase()}-gallery-column-${k + 1}`, `${nm} gallery column ${k + 1}`, 'galleries', [
      cyl(0.55, 0.65, 8, x, 23, zc, 8),
    ]);
  }
}

// --- Apse at east end (4 parts)
{
  const zc = L / 2 - 2;
  addPart('apse-shell', 'Apse semi-dome', 'apse', [sph(10, 0, 26, zc, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)]);
  addPart('apse-wall', 'Apse wall', 'apse', [cyl(10, 10, 26, 0, 13, zc, 12, 1, 0, Math.PI)]);
  addPart('mihrab', 'Mihrab', 'apse', [box(-1.5, 1.5, 2, 6, zc + 8.5, zc + 9.5)]);
  addPart('minbar', 'Minbar', 'apse', [box(3, 5, 0, 8, zc + 4, zc + 6)]);
}

// --- Minarets: 4 Ottoman minarets (20 parts)
for (const [sx, sz, nm] of [[-1, -1, 'Northwest'], [1, -1, 'Northeast'], [-1, 1, 'Southwest'], [1, 1, 'Southeast']]) {
  const x = sx * (W / 2 + 6), z = sz * (L / 2 - 2);
  const sl = nm.toLowerCase();
  addPart(`${sl}-minaret-base`, `${nm} minaret base`, 'minarets', [box(x - 2.5, x + 2.5, 0, 10, z - 2.5, z + 2.5)]);
  addPart(`${sl}-minaret-shaft`, `${nm} minaret shaft`, 'minarets', [cyl(1.4, 1.8, 45, x, 32, z, 10)]);
  addPart(`${sl}-minaret-balcony-1`, `${nm} minaret lower balcony`, 'minarets', [cyl(2.4, 2.4, 1.2, x, 42, z, 10)]);
  addPart(`${sl}-minaret-balcony-2`, `${nm} minaret upper balcony`, 'minarets', [cyl(2.2, 2.2, 1.2, x, 52, z, 10)]);
  addPart(`${sl}-minaret-cap`, `${nm} minaret cap`, 'minarets', [cyl(0.1, 1.6, 8, x, 60, z, 10)]);
}

// --- Buttresses (8 parts)
for (const [sz, nm] of [[1, 'South'], [-1, 'North']]) {
  for (let k = 0; k < 4; k++) {
    const x = -L / 2 + 10 + k * ((L - 20) / 3);
    addPart(`${nm.toLowerCase()}-buttress-${k + 1}`, `${nm} buttress ${k + 1}`, 'buttresses', [
      box(x - 2, x + 2, 0, 30, sz * (W / 2 - 1), sz * (W / 2 + 2)),
    ]);
  }
}

// --- Great arches (4 parts): arches between piers carrying the dome
for (const [nm, x0, x1, z0, z1] of [
  ['North', -HB, HB, -HB - 1.2, -HB + 1.2],
  ['South', -HB, HB, HB - 1.2, HB + 1.2],
  ['East', HB - 1.2, HB + 1.2, -HB, HB],
  ['West', -HB - 1.2, -HB + 1.2, -HB, HB],
]) {
  addPart(`${nm.toLowerCase()}-great-arch`, `${nm} great arch`, 'dome-support', [
    box(x0, x1, SPRING_Y - 8, SPRING_Y - 1, z0, z1),
  ]);
}

// --- Roof (4 parts): aisle roofs
for (const [sz, nm] of [[1, 'South'], [-1, 'North']]) {
  addPart(`${nm.toLowerCase()}-aisle-roof`, `${nm} aisle roof`, 'roof', [
    box(-L / 2, L / 2, 22, 23.5, sz * (W / 2 - 8), sz * (W / 2)),
  ]);
}
addPart('narthex-roof', 'Narthex roof', 'roof', [box(-W / 2, W / 2, 14, 15.5, -L / 2, -L / 2 + 12)]);
addPart('apse-roof', 'Apse roof', 'roof', [cyl(10.5, 10.5, 1.5, 0, 36.5, L / 2 - 2, 12, 1, 0, Math.PI)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('pier')) return '#b0a48e';
  if (id.includes('pendentive') || id.includes('great-arch')) return '#c4b89e';
  if (id.startsWith('dome-segment')) return '#a89a80';
  if (id === 'dome-window-ring') return '#d8cfae';
  if (id === 'dome-finial') return '#8a7a5a';
  if (id.includes('semidome')) return '#b5a888';
  if (id.includes('nave-column')) return '#9a8f7a';
  if (id.includes('aisle-wall')) return '#a89a80';
  if (id.includes('aisle-vault')) return '#b5a888';
  if (id.includes('aisle-column')) return '#9a8f7a';
  if (id.includes('narthex') || id.includes('imperial-door')) return '#a89a80';
  if (id.includes('gallery')) return '#b0a48e';
  if (id === 'apse-shell') return '#b5a888';
  if (id === 'apse-wall') return '#a89a80';
  if (id === 'mihrab' || id === 'minbar') return '#8a7a62';
  if (id.includes('minaret-base')) return '#9a938a';
  if (id.includes('minaret-shaft')) return '#b0a89a';
  if (id.includes('balcony')) return '#8a8478';
  if (id.includes('minaret-cap')) return '#6a7a8a';
  if (id.includes('buttress')) return '#9a938a';
  if (id.includes('roof')) return '#8a7a68';
  return '#b0a48e';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'dome', name: 'Central dome', color: '#a89a80', description: 'The 31 m dome, its crown 55.6 m above the floor, with the ring of 40 windows.' },
  { id: 'dome-support', name: 'Pendentives and arches', color: '#c4b89e', description: 'The four pendentives and great arches carrying the dome on the piers.' },
  { id: 'semi-domes', name: 'Semi-domes', color: '#b5a888', description: 'The great eastern and western semi-domes bracing the central dome.' },
  { id: 'nave', name: 'Nave', color: '#b0a48e', description: 'The four great piers and the nave colonnades.' },
  { id: 'aisles', name: 'Aisles', color: '#a89a80', description: 'Side aisles with outer walls, vaults and columns.' },
  { id: 'narthex', name: 'Narthex', color: '#a89a80', description: 'Outer and inner narthex with the entrance doors.' },
  { id: 'galleries', name: 'Galleries', color: '#b0a48e', description: 'The upper galleries with their columns.' },
  { id: 'apse', name: 'Apse', color: '#b5a888', description: 'The eastern apse with mihrab and minbar from the Ottoman era.' },
  { id: 'minarets', name: 'Minarets', color: '#b0a89a', description: 'The four Ottoman minarets framing the building.' },
  { id: 'buttresses', name: 'Buttresses', color: '#9a938a', description: 'Exterior buttresses bracing the walls.' },
  { id: 'roof', name: 'Roofs', color: '#8a7a68', description: 'Aisle, narthex and apse roofs.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
function ex(name, text) { explanations[name.toLowerCase()] = text; }
for (const nm of ['Northwest', 'Northeast', 'Southwest', 'Southeast']) {
  const sl = nm.toLowerCase();
  ex(`${nm} great pier`, `The ${sl} great pier, one of four carrying the dome through the pendentives. Exact size is schematic.`);
  ex(`${nm} pendentive`, `The ${sl} pendentive, the spherical triangle transitioning from the square bay to the circular dome. Exact curvature is schematic.`);
  ex(`${nm} minaret base`, `Base of the ${sl} Ottoman minaret. Exact form is schematic.`);
  ex(`${nm} minaret shaft`, `Shaft of the ${sl} minaret. Exact height is schematic.`);
  ex(`${nm} minaret lower balcony`, `Lower balcony of the ${sl} minaret. Exact form is schematic.`);
  ex(`${nm} minaret upper balcony`, `Upper balcony of the ${sl} minaret. Exact form is schematic.`);
  ex(`${nm} minaret cap`, `The lead-clad cap of the ${sl} minaret. Exact form is schematic.`);
}
for (let k = 1; k <= 8; k++) ex(`Dome segment ${k}`, `Dome shell segment ${k} of the 31 m dome. The crown rises 55.6 m above the floor. Exact segmentation is schematic.`);
ex('Dome window ring', 'The ring of 40 windows at the dome base, whose light makes the dome appear to float. Exact window forms are schematic.');
ex('Dome finial', 'The finial crowning the dome. Exact form is schematic.');
for (const nm of ['East', 'West']) {
  const sl = nm.toLowerCase();
  for (let k = 1; k <= 3; k++) ex(`${nm} semi-dome ${k}`, `${nm} semi-dome segment ${k}, bracing the central dome. Exact profile is schematic.`);
  ex(`${nm} semi-dome arch`, `The great arch carrying the ${sl} semi-dome. Exact form is schematic.`);
}
for (const nm of ['North', 'South']) {
  const sl = nm.toLowerCase();
  for (let k = 1; k <= 6; k++) ex(`${nm} nave column ${k}`, `${nm} nave colonnade column ${k}, one of the 107 columns. Exact position is schematic.`);
  ex(`${nm} aisle outer wall`, `The ${sl} outer wall of the side aisle. Exact form is schematic.`);
  ex(`${nm} aisle vault`, `The ${sl} aisle vault. Exact profile is schematic.`);
  for (let k = 1; k <= 3; k++) ex(`${nm} aisle column ${k}`, `${nm} aisle column ${k}. Exact position is schematic.`);
  ex(`${nm} gallery floor`, `The ${sl} upper gallery floor. Exact form is schematic.`);
  for (let k = 1; k <= 3; k++) ex(`${nm} gallery column ${k}`, `${nm} gallery column ${k}. Exact position is schematic.`);
  ex(`${nm} aisle roof`, `The ${sl} aisle roof. Exact form is schematic.`);
  for (let k = 1; k <= 4; k++) ex(`${nm} buttress ${k}`, `${nm} exterior buttress ${k}. Exact form is schematic.`);
}
for (const nm of ['North', 'South', 'East', 'West']) ex(`${nm} great arch`, `The ${nm.toLowerCase()} great arch spanning between the piers at the dome base. Exact form is schematic.`);
ex('Outer narthex', 'The outer narthex at the west end. Exact form is schematic.');
ex('Inner narthex', 'The inner narthex with its barrel vaults and 6th-century mosaics. Exact form is schematic.');
for (let k = 1; k <= 3; k++) ex(`Narthex door ${k}`, `Entrance door ${k} of the nine main entrances. Exact form is schematic.`);
ex('Narthex vault', 'The narthex barrel vault. Exact profile is schematic.');
ex('Narthex roof', 'The narthex roof. Exact form is schematic.');
ex('Apse semi-dome', 'The semi-dome of the eastern apse. Exact profile is schematic.');
ex('Apse wall', 'The curved wall of the apse. Exact form is schematic.');
ex('Mihrab', 'The mihrab indicating the direction of Mecca, from the Ottoman era. Exact form is schematic.');
ex('Minbar', 'The minbar, the pulpit for the Friday sermon, from the Ottoman era. Exact form is schematic.');
ex('Apse roof', 'The apse roof. Exact form is schematic.');

// ---------------------------------------------------------------- serialize
let offset = 0;
const records = [];
let triangles = 0;
for (const p of parts) {
  const merged = mergeGeometries(p.geoms.map((g) => { g.deleteAttribute('uv'); return g; }), false);
  if (!merged) throw new Error(`Could not merge ${p.id}`);
  merged.computeVertexNormals();
  merged.scale(S, S, S);
  merged.computeBoundingBox();
  const pos = merged.attributes.position.array;
  const nor = merged.attributes.normal.array;
  const idx = merged.index ? merged.index.array : Uint32Array.from({ length: pos.length / 3 }, (_, i) => i);
  const n16 = new Int16Array(nor.length);
  for (let i = 0; i < nor.length; i++) n16[i] = Math.round(Math.max(-1, Math.min(1, nor[i])) * 32767);
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
    posOff, norOff, idxOff,
    vertexCount: pos.length / 3,
    indexCount: u32.length,
    bounds: [[bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.max.y, bb.max.z]],
  });
  triangles += u32.length / 3;
  merged.dispose();
}
const buffer = Buffer.alloc(offset);
for (const r of records) { r.pos.copy(buffer, r.posOff); r.nor.copy(buffer, r.norOff); r.idx.copy(buffer, r.idxOff); }
const binName = 'hagia-sophia-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Hagia Sophia, Istanbul',
  title: 'Hagia Sophia',
  location: 'Istanbul, Turkey',
  blurb: 'The 6th-century Church of Holy Wisdom: 82 m long, its 31 m dome rising 55.6 m on pendentives, with semi-domes, 107 columns and four Ottoman minarets.',
  sourceUrls: [{ label: 'Wikipedia: Hagia Sophia', url: 'https://en.wikipedia.org/wiki/Hagia_Sophia' }],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/hagia-sophia/hagia-sophia-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
