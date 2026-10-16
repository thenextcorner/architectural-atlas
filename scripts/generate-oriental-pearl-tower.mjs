// Detailed Oriental Pearl Tower, Shanghai, for the Architectural Atlas.
//
// Sourced dimensions and facts (never re-state schematics as fact in the UI):
//   radio and TV tower in Lujiazui, Pudong, Shanghai, 468 m tall including
//   its antenna; built 1991-1994, opened to the public 1995; designed by
//   Jiang Huancheng of the Shanghai Modern Architectural Design Co.;
//   tallest structure in China and Asia 1994-2007 (surpassed by the Shanghai
//   World Financial Center); 11 spheres big and small; the two largest
//   spheres are 50 m (lower) and 45 m (upper) in diameter, linked by three
//   9 m diameter columns; the highest sphere is 14 m in diameter; fifteen
//   observatory levels; highest (Space Module) at 350 m; sightseeing floor
//   at 263 m; revolving restaurant at 267 m; 20-room Space Hotel between the
//   two large spheres; glass observation floor; AAAAA scenic area; hosted
//   the Chinese Live Earth concert on 7 July 2007; antenna fire on
//   13 April 2010 after thunderstorms. The Bai Juyi "Pipa Song" poem
//   association ("pearls big and small falling on a jade plate") was made by
//   the jury chief, not the designer: Jiang Huancheng says he did not have
//   the poem in mind.
//   Sources: Wikipedia "Oriental Pearl Tower"; alchetron.com;
//   e-architect.com; otis.com; frommers.com.
// Schematic (not sourced, never stated as fact in the UI): exact sphere
// center heights (beyond the named levels), small-sphere positions and
// sizes, column segment breaks, podium layout, antenna segment breaks,
// interior deck arrangements, LED band positions, hotel room layout,
// entrance plaza forms.
//
// Coordinate frame: y = up, ground y = 0. All dimensions in meters.
//
// Granularity: 100+ named parts across 7 systems. Every explanation is
// either a sourced fact or explicitly marked schematic.
//
// Usage: node scripts/generate-oriental-pearl-tower.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'oriental-pearl-tower');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (468 m) maps to 2.4 units.
const S = 2.4 / 468;

// ---------------------------------------------------------------- helpers
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
function sphere(r, x, y, z, wSeg = 20, hSeg = 14, thetaStart = 0, thetaLength = Math.PI) {
  const g = new THREE.SphereGeometry(r, wSeg, hSeg, 0, Math.PI * 2, thetaStart, thetaLength);
  g.translate(x, y, z);
  return g;
}
function ringBand(r, tube, x, y, z) {
  const g = new THREE.TorusGeometry(r, tube, 8, 32);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const explanations = {};
const explain = (name, text) => { explanations[name.toLowerCase()] = text; };

// Column positions: three columns in a triangle, 9 m diameter (r=4.5).
const COL_R = 4.5;
const COLS = [];
for (let k = 0; k < 3; k++) {
  const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
  COLS.push([Math.cos(a) * 22, Math.sin(a) * 22]);
}

// ---------------------------------------------------------------- base podium (6 parts)
addPart('podium-platform', 'Podium platform', 'base', [box(-45, 45, 0, 4, -45, 45)]);
explain('Podium platform', 'The base platform anchoring the tower in Lujiazui. Layout is schematic.');
addPart('history-museum-hall', 'Shanghai history museum hall', 'base',
  [box(-38, 38, 4, 12, -38, 38)]);
explain('Shanghai history museum hall', 'The exhibition hall at the tower base housing the Shanghai History Museum collection, charting the city from its 1843 opening as a treaty port. Interior layout is schematic.');
addPart('podium-entrance', 'Podium entrance', 'base', [box(-10, 10, 4, 10, 38, 48)]);
explain('Podium entrance', 'The main visitor entrance. Form is schematic.');
addPart('podium-retail', 'Podium retail level', 'base', [box(-38, 38, 12, 17, -38, 38)]);
explain('Podium retail level', 'Shops and cafes in the podium. Layout is schematic.');
addPart('podium-roof-terrace', 'Podium roof terrace', 'base', [box(-45, 45, 17, 19, -45, 45)]);
explain('Podium roof terrace', 'The roof terrace above the podium. Form is schematic.');
{
  const cols = [];
  for (const [cx, cz] of [[-30, -30], [30, -30], [-30, 30], [30, 30]])
    cols.push(box(cx - 2, cx + 2, 19, 26, cz - 2, cz + 2));
  addPart('podium-pergola-columns', 'Podium pergola columns', 'base', cols);
  explain('Podium pergola columns', 'Columns of the entrance pergola. Positions are schematic.');
}

// ---------------------------------------------------------------- three columns (15 segments + 3 foundations)
const SEG_BREAKS = [0, 70, 140, 210, 280, 350];
for (let c = 0; c < 3; c++) {
  const [cx, cz] = COLS[c];
  addPart(`column-${c + 1}-foundation`, `Column ${c + 1} foundation`, 'columns',
    [cyl(8, 10, 8, cx, 4, cz, 16)]);
  explain(`Column ${c + 1} foundation`, `The deep foundation of column ${c + 1}, planted in Pudong's soft soil with concrete pillars, steel pipes and plates. Form is schematic.`);
  for (let sgi = 0; sgi < SEG_BREAKS.length - 1; sgi++) {
    const y0 = SEG_BREAKS[sgi], y1 = SEG_BREAKS[sgi + 1];
    addPart(`column-${c + 1}-segment-${sgi + 1}`, `Column ${c + 1} segment ${sgi + 1}`, 'columns',
      [cyl(COL_R, COL_R, y1 - y0, cx, (y0 + y1) / 2, cz, 16)]);
    explain(`Column ${c + 1} segment ${sgi + 1}`,
      `One of five segments of the 9 m diameter support column ${c + 1}. Segment breaks are schematic.`);
  }
}

// ---------------------------------------------------------------- spheres (11, each split crown/band/lower = 33 parts)
// [name, radius, cx, cy, cz]
const SPHERES = [
  ['Lower great sphere', 25, 0, 112, 0],
  ['Upper great sphere', 22.5, 0, 272, 0],
  ['Top sphere', 7, 0, 350, 0],
  ['Small sphere 1', 5, 20, 60, 8],
  ['Small sphere 2', 5, -18, 90, -10],
  ['Small sphere 3', 4, 16, 170, -12],
  ['Small sphere 4', 4, -14, 200, 14],
  ['Small sphere 5', 3.5, 12, 235, 6],
  ['Small sphere 6', 3.5, -10, 315, -8],
  ['Small sphere 7', 3, 8, 335, 4],
  ['Small sphere 8', 3, -6, 45, 16],
];
const SUBS = [
  ['crown', 0, 0.9, 'crown'],
  ['equatorial band', 0.9, 1.3, 'band'],
  ['lower shell', 2.2, Math.PI - 2.2, 'lower'],
];
for (const [nm, r, cx, cy, cz] of SPHERES) {
  const slug = nm.toLowerCase().replace(/ /g, '-');
  for (const [sub, ts, tl, subSlug] of SUBS) {
    addPart(`${slug}-${subSlug}`, `${nm} ${sub}`, 'spheres',
      [sphere(r, cx, cy, cz, 24, 16, ts, tl)]);
    const fact = nm === 'Lower great sphere'
      ? 'The lower of the two great spheres, 50 m in diameter. '
      : nm === 'Upper great sphere'
      ? 'The upper of the two great spheres, 45 m in diameter, holding the sightseeing floor and revolving restaurant. '
      : nm === 'Top sphere'
      ? 'The highest sphere, 14 m in diameter, carrying the Space Module observatory at 350 m. '
      : 'One of the eight smaller decorative spheres strung along the tower. ';
    explain(`${nm} ${sub}`, fact + 'Subdivision into crown, band and shell is schematic, for the exploded view.');
  }
}

// ---------------------------------------------------------------- observation (9 parts)
addPart('sightseeing-floor', 'Sightseeing floor', 'observation',
  [cyl(20, 20, 2, 0, 263, 0, 24)]);
explain('Sightseeing floor', 'The sightseeing floor at 263 m in the upper great sphere. Layout is schematic.');
addPart('glass-floor', 'Glass observation floor', 'observation',
  [cyl(8, 8, 0.6, 0, 259, 0, 24)]);
explain('Glass observation floor', 'The transparent glass-bottomed walkway with a 1.5 inch glass floor. Position is schematic.');
addPart('revolving-restaurant-floor', 'Revolving restaurant floor', 'observation',
  [cyl(19, 19, 1.5, 0, 267, 0, 24)]);
explain('Revolving restaurant floor', 'The 267 m revolving restaurant with 360-degree panoramic dining. Layout is schematic.');
addPart('revolving-restaurant-ring', 'Revolving restaurant outer ring', 'observation',
  [ringBand(19, 1.2, 0, 267, 0)]);
explain('Revolving restaurant outer ring', 'The rotating outer ring of the restaurant. Form is schematic.');
addPart('space-module-deck', 'Space Module deck', 'observation',
  [cyl(6.5, 6.5, 2, 0, 350, 0, 20)]);
explain('Space Module deck', 'The Space Module observatory deck at 350 m, the highest of the fifteen observatory levels. Layout is schematic.');
addPart('space-module-dome', 'Space Module dome', 'observation',
  [sphere(6.5, 0, 352, 0, 20, 10, 0, 1.2)]);
explain('Space Module dome', 'The dome over the Space Module. Form is schematic.');
for (let c = 0; c < 3; c++) {
  const [cx, cz] = COLS[c];
  addPart(`elevator-shaft-${c + 1}`, `Elevator shaft ${c + 1}`, 'observation',
    [box(cx - 2, cx + 2, 20, 345, cz - 2, cz + 2)]);
  explain(`Elevator shaft ${c + 1}`, `One of the high-speed elevator shafts (the tower runs Otis lifts, later doubled in a modernization). Position is schematic.`);
}

// ---------------------------------------------------------------- Space Hotel (4 parts)
for (let q = 0; q < 4; q++) {
  const a = (q / 4) * Math.PI * 2;
  const hx = Math.cos(a) * 14, hz = Math.sin(a) * 14;
  addPart(`space-hotel-wing-${q + 1}`, `Space Hotel wing ${q + 1}`, 'hotel',
    [box(hx - 6, hx + 6, 150, 190, hz - 6, hz + 6)]);
  explain(`Space Hotel wing ${q + 1}`, `One wing of the 20-room Space Hotel set between the two great spheres. Layout is schematic.`);
}

// ---------------------------------------------------------------- antenna (9 parts)
const ANT_SEGS = [[357, 380], [380, 400], [400, 420], [420, 440], [440, 455], [455, 468]];
ANT_SEGS.forEach(([y0, y1], i) => {
  addPart(`antenna-segment-${i + 1}`, `Antenna segment ${i + 1}`, 'antenna',
    [cyl(1.6 - i * 0.18, 1.9 - i * 0.18, y1 - y0, 0, (y0 + y1) / 2, 0, 12)]);
  explain(`Antenna segment ${i + 1}`, 'One segment of the broadcast antenna rising to the 468 m tip, transmitting TV and radio for some 30 stations. On 13 April 2010 the antenna caught fire after thunderstorms. Segment breaks are schematic.');
});
addPart('antenna-platform-1', 'Antenna platform 1', 'antenna', [cyl(4, 4, 1.5, 0, 380, 0, 12)]);
explain('Antenna platform 1', 'A maintenance platform on the antenna. Position is schematic.');
addPart('antenna-platform-2', 'Antenna platform 2', 'antenna', [cyl(3, 3, 1.5, 0, 420, 0, 12)]);
explain('Antenna platform 2', 'A maintenance platform on the antenna. Position is schematic.');
addPart('antenna-beacon', 'Antenna beacon', 'antenna', [sphere(1.2, 0, 469, 0, 12, 8)]);
explain('Antenna beacon', 'The aircraft-warning beacon at the 468 m tip. Form is schematic.');

// ---------------------------------------------------------------- LED lighting bands (6 parts)
const LED_Y = [112, 180, 272, 320, 350, 60];
LED_Y.forEach((y, i) => {
  addPart(`led-band-${i + 1}`, `LED band ${i + 1}`, 'lighting', [ringBand(26 - i, 0.5, 0, y, 0)]);
  explain(`LED band ${i + 1}`, 'One of the LED lighting bands; the tower is brightly lit in different LED sequences at night. Position is schematic.');
});

// ---------------------------------------------------------------- entrance plaza (3 parts)
addPart('entrance-plaza', 'Entrance plaza', 'base', [box(-60, 60, 0, 1, 48, 90)]);
explain('Entrance plaza', 'The visitor plaza before the podium. Layout is schematic.');
addPart('plaza-flagpoles', 'Plaza flagpoles', 'base',
  [cyl(0.15, 0.15, 12, -20, 6, 70, 6), cyl(0.15, 0.15, 12, 0, 6, 70, 6), cyl(0.15, 0.15, 12, 20, 6, 70, 6)]);
explain('Plaza flagpoles', 'Flagpoles on the entrance plaza. Positions are schematic.');
addPart('plaza-planting', 'Plaza planting beds', 'base',
  [box(-55, -35, 1, 2, 55, 85), box(35, 55, 1, 2, 55, 85)]);
explain('Plaza planting beds', 'Landscaped beds flanking the plaza. Layout is schematic.');
addPart('ticket-hall', 'Ticket hall', 'base', [box(-25, 25, 4, 9, 40, 60)]);
explain('Ticket hall', 'The ticketing hall serving the tower\'s 5 million-plus annual visitors. Layout is schematic.');
addPart('security-checkpoint', 'Security checkpoint', 'base', [box(-15, 15, 4, 8, 60, 70)]);
explain('Security checkpoint', 'Visitor security screening before the elevators. Layout is schematic.');
addPart('escalator-bank', 'Escalator bank', 'base',
  [box(-8, -4, 4, 12, 20, 40), box(4, 8, 4, 12, 20, 40)]);
explain('Escalator bank', 'Escalators linking the podium levels. Positions are schematic.');

// ---------------------------------------------------------------- observation railings (3 parts)
addPart('sightseeing-railing', 'Sightseeing floor railing', 'observation', [ringBand(20, 0.4, 0, 264.5, 0)]);
explain('Sightseeing floor railing', 'Safety railing of the sightseeing floor. Form is schematic.');
addPart('glass-floor-railing', 'Glass floor railing', 'observation', [ringBand(8, 0.3, 0, 260, 0)]);
explain('Glass floor railing', 'Railing around the glass-bottomed walkway. Form is schematic.');
addPart('space-module-railing', 'Space Module railing', 'observation', [ringBand(6.5, 0.3, 0, 351.5, 0)]);
explain('Space Module railing', 'Railing of the Space Module deck. Form is schematic.');

// ---------------------------------------------------------------- sphere vestibules (3 parts)
addPart('lower-sphere-vestibule', 'Lower great sphere vestibule', 'spheres', [box(-6, 6, 100, 108, -6, 6)]);
explain('Lower great sphere vestibule', 'Entrance vestibule into the lower great sphere. Form is schematic.');
addPart('upper-sphere-vestibule', 'Upper great sphere vestibule', 'spheres', [box(-6, 6, 260, 268, -6, 6)]);
explain('Upper great sphere vestibule', 'Entrance vestibule into the upper great sphere. Form is schematic.');
addPart('top-sphere-vestibule', 'Top sphere vestibule', 'spheres', [cyl(3, 3, 6, 0, 344, 0, 12)]);
explain('Top sphere vestibule', 'Access vestibule into the top sphere. Form is schematic.');

// ---------------------------------------------------------------- extra LED bands (4 parts)
[140, 210, 250, 300].forEach((y, i) => {
  addPart(`led-band-extra-${i + 1}`, `LED band extra ${i + 1}`, 'lighting', [ringBand(24 - i * 2, 0.5, 0, y, 0)]);
  explain(`LED band extra ${i + 1}`, 'An additional LED lighting band for the night illumination sequences. Position is schematic.');
});

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('sphere')) return '#c98f8f'; // pearl pink
  if (id.includes('column')) return '#b9b3a8'; // concrete
  if (id.includes('antenna')) return '#8a8f96';
  if (id.includes('led')) return '#e8b4b8';
  if (id.includes('hotel')) return '#d4a5a5';
  if (id.includes('restaurant') || id.includes('sightseeing') || id.includes('glass') || id.includes('space-module')) return '#a8c4d4';
  if (id.includes('elevator')) return '#9aa2ab';
  if (id.includes('museum') || id.includes('retail') || id.includes('podium') || id.includes('plaza')) return '#c9c2b4';
  return '#c9c2b4';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Base podium and plaza', color: '#c9c2b4', description: 'The podium with the Shanghai history museum, retail and the entrance plaza.' },
  { id: 'columns', name: 'Support columns', color: '#b9b3a8', description: 'Three 9 m diameter concrete columns rising from deep foundations to 350 m.' },
  { id: 'spheres', name: 'Pearl spheres', color: '#c98f8f', description: 'Eleven spheres, big and small: the 50 m and 45 m great spheres, the 14 m top sphere and eight smaller pearls.' },
  { id: 'observation', name: 'Observation levels', color: '#a8c4d4', description: 'Fifteen observatory levels including the sightseeing floor, glass floor, revolving restaurant and Space Module.' },
  { id: 'hotel', name: 'Space Hotel', color: '#d4a5a5', description: 'The 20-room Space Hotel set between the two great spheres.' },
  { id: 'antenna', name: 'Antenna', color: '#8a8f96', description: 'The broadcast antenna rising to the 468 m tip.' },
  { id: 'lighting', name: 'LED lighting', color: '#e8b4b8', description: 'LED bands for the tower\u2019s night illumination sequences.' },
];

// ---------------------------------------------------------------- serialize (Atlas v1 contract)
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
  const posOff = offset; offset = align4(offset + pos.byteLength);
  const norOff = offset; offset = align4(offset + n16.byteLength);
  const idxOff = offset; offset = align4(offset + u32.byteLength);
  const bb = merged.boundingBox;
  records.push({
    part: p,
    pos: Buffer.from(pos.buffer, pos.byteOffset, pos.byteLength),
    nor: Buffer.from(n16.buffer, n16.byteOffset, n16.byteLength),
    idx: Buffer.from(u32.buffer, u32.byteOffset, u32.byteLength),
    posOff, norOff, idxOff,
    vertexCount: pos.length / 3, indexCount: u32.length,
    bounds: [[bb.min.x, bb.min.y, bb.min.z], [bb.max.x, bb.max.y, bb.max.z]],
  });
  triangles += u32.length / 3;
  merged.dispose();
}

const buffer = Buffer.alloc(offset);
for (const r of records) { r.pos.copy(buffer, r.posOff); r.nor.copy(buffer, r.norOff); r.idx.copy(buffer, r.idxOff); }
const binName = 'oriental-pearl-tower-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Oriental Pearl Tower, Shanghai',
  title: 'Oriental Pearl Tower',
  location: 'Shanghai, China',
  blurb: 'Shanghai\u2019s 468 m TV tower in Pudong, completed 1994. Eleven pearl spheres ride on three 9 m columns: the 50 m and 45 m great spheres, the Space Hotel, the revolving restaurant and the Space Module observatory at 350 m.',
  sourceUrls: [
    { label: 'Wikipedia: Oriental Pearl Tower', url: 'https://en.wikipedia.org/wiki/Oriental_Pearl_Tower' },
    { label: 'e-architect: Oriental Pearl Tower', url: 'https://www.e-architect.com/shanghai/oriental-pearl-tower' },
    { label: 'Otis: Oriental Pearl Tower project', url: 'https://www.otis.com/en/hk/our-company/global-projects/project-showcase/oriental-pearl-tower' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system,
    chunk: 0, color: colorFor(r.part.id),
    positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/oriental-pearl-tower/oriental-pearl-tower-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
