// Procedural Arc de Triomphe for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Arc de Triomphe in code and
// writes it in the atlas binary format:
//   public/models/arc-de-triomphe/atlas.json
//   public/models/arc-de-triomphe/arc-de-triomphe-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10):
//   Paris, Place Charles de Gaulle (Place de l'Etoile); 50 m high,
//   45 m wide, 22 m deep; large vault 29.19 m high and 14.62 m wide;
//   small transverse vaults 18.68 m high and 8.44 m wide; commissioned by
//   Napoleon after Austerlitz (1805), decreed 1806; designed by Jean
//   Chalgrin (Jean-Francois-Therese Chalgrin), continued after his death
//   by Goust, Huyot and Blouet; completed 1836, inaugurated by
//   Louis-Philippe and dedicated to the Armies of the Revolution and the
//   Empire; inspired by the Roman Arch of Titus; facades carry the names
//   of French victories and generals (660 names, 558 generals); four
//   colossal sculpture groups including La Marseillaise (The Departure of
//   the Volunteers) by Francois Rude; Tomb of the Unknown Soldier beneath
//   the vault (interred 1921), eternal flame rekindled daily at 6:30 pm;
//   284 steps to the terrace; linchpin of the Axe historique; Charles
//   Godefroy flew a Nieuport biplane through the arch in 1919.
// Schematic (not sourced, never stated as fact in the UI): exact stone
// coursing; voussoir count and sizes; sculpture relief depths; frieze
// panel subdivision; interior vault profile; terrace railing form; tomb
// surround details.
//
// Coordinate frame: x = width (45 m, Champs-Elysees axis is z), y = up,
// z = depth (22 m). All dimensions in meters.
//
// Granularity: ~100 named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-arc-de-triomphe.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'arc-de-triomphe');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (50 m) maps to 2.4 units.
const S = 2.4 / 50;

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
// Voussoir: a wedge block for the arch ring, positioned at angle a
// (radians from vertical) around centre (cx, cy), in the XY plane at depth z.
function voussoir(cx, cy, rIn, rOut, a, w, z0, z1) {
  const rMid = (rIn + rOut) / 2;
  const px = cx + rMid * Math.sin(a), py = cy + rMid * Math.cos(a);
  const g = new THREE.BoxGeometry(rOut - rIn + 0.6, (rOut - rIn) * 0.9 + 2.2, z1 - z0);
  g.rotateZ(-a);
  g.translate(px, py, (z0 + z1) / 2);
  return g;
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// Dimensions
const W = 45, D = 22, HT = 50;
const archW = 14.62, archH = 29.19;
const archR = archW / 2; // 7.31
const springY = archH - archR; // 21.88
const pierW = (W - archW) / 2; // 15.19, each pier width
const pierX0 = archR; // pier inner edge

// --- Base platform and steps: 3 parts.
addPart('platform', 'Base platform', 'base', [box(-24, 24, -1.5, 0, -12.5, 12.5)]);
addPart('east-steps', 'East steps', 'base', [box(22.5, 26, -1.5, 0, -6, 6)]);
addPart('west-steps', 'West steps', 'base', [box(-26, -22.5, -1.5, 0, -6, 6)]);

// --- Four piers in six stone courses each: 24 parts.
const pierDefs = [
  ['northwest', -1, -1], ['northeast', 1, -1],
  ['southwest', -1, 1], ['southeast', 1, 1],
];
// pier x-range: inner edge at +/-7.31, outer at +/-22.5; z: -11 to 11.
const courses = [[0, 4], [4, 8], [8, 12], [12, 16], [16, 19.5], [19.5, 21.88]];
for (const [n, sx, sz] of pierDefs) {
  const N = n[0].toUpperCase() + n.slice(1);
  const x0 = sx > 0 ? pierX0 : -22.5, x1 = sx > 0 ? 22.5 : -pierX0;
  courses.forEach(([y0, y1], ci) => {
    addPart(`${n}-pier-course-${ci + 1}`, `${N} pier, course ${ci + 1}`, 'piers', [
      box(x0, x1, y0, y1, -11, 11),
    ]);
  });
}

// --- Impost blocks above piers: 4 parts.
for (const [n, sx] of [['west', -1], ['east', 1]]) {
  const N = n[0].toUpperCase() + n.slice(1);
  addPart(`${n}-impost`, `${N} impost block`, 'piers', [
    box(sx > 0 ? pierX0 - 0.5 : -22.5, sx > 0 ? 22.5 : -pierX0 + 0.5, 21.88, 23.5, -11, 11),
  ]);
}
// (north/south imposts are the same masses seen transversely; the two above cover the full width)

// --- Main arch voussoirs: 9 per ring, front and back: 18 parts.
for (const [face, zc, fn] of [[10.2, 11, 'front'], [-11, -10.2, 'back']]) {
  for (let i = 0; i < 9; i++) {
    const a = Math.PI - ((i + 0.5) * Math.PI) / 9; // from PI to 0
    addPart(`${fn}-voussoir-${i + 1}`, `${fn[0].toUpperCase() + fn.slice(1)} arch voussoir ${i + 1}`, 'main-arch', [
      voussoir(0, springY, archR - 0.3, archR + 2.2, Math.PI - a, 2, zc, zc + 0.8),
    ]);
  }
}
addPart('keystone', 'Keystone', 'main-arch', [
  voussoir(0, springY, archR - 0.3, archR + 2.6, 0, 2, -11, 11),
]);

// --- Spandrel walls above the arch (front/back): 2 parts.
for (const [zc0, zc1, fn] of [[8, 11, 'front'], [-11, -8, 'back']]) {
  const N = fn[0].toUpperCase() + fn.slice(1);
  addPart(`${fn}-spandrel`, `${N} spandrel wall`, 'spandrels', [
    box(-22.5, -archR - 2, 23.5, 35, zc0, zc1),
    box(archR + 2, 22.5, 23.5, 35, zc0, zc1),
    box(-archR - 2, archR + 2, 29.5, 35, zc0, zc1),
  ]);
}

// --- Side walls with small transverse vaults: piers and arches: 8 parts.
// Side vaults run along x through the 45 m width; opening 8.44 wide, 18.68 high.
const sArchW = 8.44, sArchH = 18.68, sR = sArchW / 2, sSpring = sArchH - sR;
for (const [side, zc, sn] of [[-1, -5.5, 'north'], [1, 5.5, 'south']]) {
  const N = sn[0].toUpperCase() + sn.slice(1);
  // wall masses flanking the side opening (opening centred at x=0, z=zc)
  addPart(`${sn}-side-wall-west`, `${N} side wall (west)`, 'side-vaults', [
    box(-22.5, -sR, 0, sSpring + 2, zc - 5.5, zc + 5.5),
  ]);
  addPart(`${sn}-side-wall-east`, `${N} side wall (east)`, 'side-vaults', [
    box(sR, 22.5, 0, sSpring + 2, zc - 5.5, zc + 5.5),
  ]);
  const ring = [];
  for (let i = 0; i < 7; i++) {
    const a = (i + 0.5) * Math.PI / 7;
    ring.push(voussoir(0, sSpring, sR - 0.2, sR + 1.6, Math.PI - a, 2, zc - 5.5, zc + 5.5));
  }
  addPart(`${sn}-side-arch`, `${N} side arch ring`, 'side-vaults', ring);
  addPart(`${sn}-side-spandrel`, `${N} side spandrel`, 'side-vaults', [
    box(-22.5, 22.5, sArchH + 1, 35, zc - 5.5, zc + 5.5),
  ]);
}

// --- Attic: four walls: 4 parts.
addPart('attic-front', 'Attic front wall', 'attic', [box(-22.5, 22.5, 35, 46, 8, 11)]);
addPart('attic-back', 'Attic back wall', 'attic', [box(-22.5, 22.5, 35, 46, -11, -8)]);
addPart('attic-east', 'Attic east wall', 'attic', [box(19.5, 22.5, 35, 46, -8, 8)]);
addPart('attic-west', 'Attic west wall', 'attic', [box(-22.5, -19.5, 35, 46, -8, 8)]);
addPart('attic-floor', 'Attic floor', 'attic', [box(-22.5, 22.5, 34.4, 35, -11, 11)]);

// --- Frieze panels with battle names: 8 parts (2 per face).
const friezeFaces = [['front', 9.6, 0], ['back', -9.6, 1], ['east', 0, 2], ['west', 0, 3]];
// (simplified: front/back get two panels each on z faces; east/west on x faces)
addPart('frieze-front-left', 'Frieze panel, front left', 'frieze', [box(-21, -1, 36, 40, 10.6, 11.2)]);
addPart('frieze-front-right', 'Frieze panel, front right', 'frieze', [box(1, 21, 36, 40, 10.6, 11.2)]);
addPart('frieze-back-left', 'Frieze panel, back left', 'frieze', [box(-21, -1, 36, 40, -11.2, -10.6)]);
addPart('frieze-back-right', 'Frieze panel, back right', 'frieze', [box(1, 21, 36, 40, -11.2, -10.6)]);
addPart('frieze-east-upper', 'Frieze panel, east upper', 'frieze', [box(22.1, 22.7, 36, 40, -8, 8)]);
addPart('frieze-east-lower', 'Frieze panel, east lower', 'frieze', [box(22.1, 22.7, 40, 44, -8, 8)]);
addPart('frieze-west-upper', 'Frieze panel, west upper', 'frieze', [box(-22.7, -22.1, 36, 40, -8, 8)]);
addPart('frieze-west-lower', 'Frieze panel, west lower', 'frieze', [box(-22.7, -22.1, 40, 44, -8, 8)]);

// --- Cornice: four segments: 4 parts.
addPart('cornice-front', 'Cornice, front', 'cornice', [box(-23.2, 23.2, 46, 47.2, 8, 11.7)]);
addPart('cornice-back', 'Cornice, back', 'cornice', [box(-23.2, 23.2, 46, 47.2, -11.7, -8)]);
addPart('cornice-east', 'Cornice, east', 'cornice', [box(19.5, 23.2, 46, 47.2, -11.7, 11.7)]);
addPart('cornice-west', 'Cornice, west', 'cornice', [box(-23.2, -19.5, 46, 47.2, -11.7, 11.7)]);

// --- Terrace: floor and parapet: 2 parts.
addPart('terrace-floor', 'Terrace floor', 'attic', [box(-22.5, 22.5, 47.2, 47.8, -11, 11)]);
addPart('terrace-parapet', 'Terrace parapet', 'attic', [
  box(-22.5, 22.5, 47.8, 49, 10.2, 11), box(-22.5, 22.5, 47.8, 49, -11, -10.2),
  box(21.7, 22.5, 47.8, 49, -11, 11), box(-22.5, -21.7, 47.8, 49, -11, 11),
]);

// --- Sculpture groups (relief panels on the piers): 4 parts.
addPart('la-marseillaise', 'La Marseillaise relief', 'sculptures', [box(-21.5, -8.5, 8, 20, 11, 12)]);
addPart('departure-relief', 'Departure of the Volunteers relief', 'sculptures', [box(8.5, 21.5, 8, 20, 11, 12)]);
addPart('triumph-relief', 'Triumph of Napoleon relief', 'sculptures', [box(-21.5, -8.5, 8, 20, -12, -11)]);
addPart('resistance-relief', 'Resistance relief', 'sculptures', [box(8.5, 21.5, 8, 20, -12, -11)]);

// --- Shield panels on the attic (30 shields, grouped as 8): 8 parts.
for (let i = 0; i < 4; i++) {
  addPart(`shields-front-${i + 1}`, `Shield row ${i + 1}, front`, 'sculptures', [
    ...[-16, -5, 6, 17].map((x) => cyl(1.1, 1.1, 0.5, x, 42.5, 11.1, 10)),
  ]);
  addPart(`shields-back-${i + 1}`, `Shield row ${i + 1}, back`, 'sculptures', [
    ...[-16, -5, 6, 17].map((x) => cyl(1.1, 1.1, 0.5, x, 42.5, -11.1, 10)),
  ]);
}

// --- Interior: main vault ceiling and side walls: 3 parts.
{
  const vault = new THREE.CylinderGeometry(archR, archR, 20, 20, 1, true, 0, Math.PI);
  vault.rotateZ(Math.PI / 2); // axis along z? no: rotate so axis is along z
  vault.rotateY(Math.PI / 2);
  vault.translate(0, springY, 0);
  addPart('vault-ceiling', 'Main vault ceiling', 'interior', [vault]);
}
addPart('vault-west-wall', 'Vault west inner wall', 'interior', [box(-archR - 0.5, -archR, 0, springY, -10, 10)]);
addPart('vault-east-wall', 'Vault east inner wall', 'interior', [box(archR, archR + 0.5, 0, springY, -10, 10)]);

// --- Tomb of the Unknown Soldier: 3 parts.
addPart('tomb-slab', 'Tomb slab', 'tomb', [box(-3, 3, 0, 1.2, -2, 2)]);
addPart('tomb-surround', 'Tomb surround', 'tomb', [
  box(-4.5, 4.5, 0, 0.4, -3.2, 3.2),
]);
addPart('eternal-flame', 'Eternal flame', 'tomb', [
  cyl(0.3, 0.5, 1.6, 0, 2, 0, 8),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('voussoir') || id === 'keystone') return '#d8cfb8';
  if (id.includes('pier-course')) return '#e2d9c2';
  if (id.includes('impost')) return '#d5c9ad';
  if (id.includes('spandrel')) return '#ddd3ba';
  if (id.includes('attic')) return '#e6dcc4';
  if (id.includes('frieze')) return '#cfc39f';
  if (id.includes('cornice')) return '#d9cdae';
  if (id.includes('terrace')) return '#c9bfa4';
  if (id.includes('relief') || id.includes('la-marseillaise') || id.includes('shields')) return '#b8a87f';
  if (id.includes('vault')) return '#c4b795';
  if (id.includes('tomb')) return '#8f8574';
  if (id === 'eternal-flame') return '#e8a33d';
  if (id.includes('platform') || id.includes('steps')) return '#b5a98c';
  return '#e2d9c2';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'base', name: 'Base', color: '#b5a98c', description: 'The platform and steps the arch stands on.' },
  { id: 'piers', name: 'Piers', color: '#e2d9c2', description: 'The four great piers in coursed stone, carrying the vaults.' },
  { id: 'main-arch', name: 'Main arch', color: '#d8cfb8', description: 'The 29.19 m main vault: voussoir rings front and back with a keystone.' },
  { id: 'spandrels', name: 'Spandrels', color: '#ddd3ba', description: 'The spandrel walls filling above the main arch.' },
  { id: 'side-vaults', name: 'Side vaults', color: '#e2d9c2', description: 'The smaller 18.68 m transverse vaults through the piers.' },
  { id: 'attic', name: 'Attic and terrace', color: '#e6dcc4', description: 'The attic storey with its terrace, reached by 284 steps.' },
  { id: 'frieze', name: 'Frieze', color: '#cfc39f', description: 'Frieze panels carrying the names of victories and generals.' },
  { id: 'cornice', name: 'Cornice', color: '#d9cdae', description: 'The crowning cornice.' },
  { id: 'sculptures', name: 'Sculptures', color: '#b8a87f', description: 'The colossal relief groups including Rude\u2019s La Marseillaise, and the attic shields.' },
  { id: 'interior', name: 'Vault interior', color: '#c4b795', description: 'The barrel-vaulted interior of the main arch.' },
  { id: 'tomb', name: 'Tomb of the Unknown Soldier', color: '#8f8574', description: 'The tomb beneath the vault with its eternal flame, rekindled daily.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'base platform': 'The platform the arch stands on. Exact dimensions are schematic.',
  'east steps': 'Steps on the east side. Exact count is schematic.',
  'west steps': 'Steps on the west side. Exact count is schematic.',
  'west impost block': 'The impost block spreading the arch load onto the west piers. Exact profile is schematic.',
  'east impost block': 'The impost block spreading the arch load onto the east piers. Exact profile is schematic.',
  'keystone': 'The keystone locking the main arch ring. Exact size is schematic.',
  'front spandrel wall': 'The front spandrel wall above the main arch. Exact masonry is schematic.',
  'back spandrel wall': 'The back spandrel wall above the main arch. Exact masonry is schematic.',
  'attic front wall': 'Front wall of the attic storey. Exact masonry is schematic.',
  'attic back wall': 'Back wall of the attic storey. Exact masonry is schematic.',
  'attic east wall': 'East wall of the attic storey. Exact masonry is schematic.',
  'attic west wall': 'West wall of the attic storey. Exact masonry is schematic.',
  'attic floor': 'The attic floor. Exact construction is schematic.',
  'terrace floor': 'The observation terrace floor with its panoramic view down the Axe historique. Exact paving is schematic.',
  'terrace parapet': 'The terrace parapet. Exact form is schematic.',
  'la marseillaise relief': 'Rude\u2019s La Marseillaise (The Departure of the Volunteers of 1792), the principal sculpture group, on the east pier facing the Champs-Elysees. Relief depth is schematic.',
  'departure of the volunteers relief': 'A colossal relief group on the front face. Exact composition is schematic.',
  'triumph of napoleon relief': 'A colossal relief group on the back face. Exact composition is schematic.',
  'resistance relief': 'A colossal relief group on the back face. Exact composition is schematic.',
  'main vault ceiling': 'The barrel-vaulted ceiling of the main arch, 29.19 m high. Exact profile is schematic.',
  'vault west inner wall': 'Inner face of the west pier inside the vault. Exact finish is schematic.',
  'vault east inner wall': 'Inner face of the east pier inside the vault. Exact finish is schematic.',
  'tomb slab': 'The granite slab of the Tomb of the Unknown Soldier, interred 1921. Exact stone is schematic.',
  'tomb surround': 'The surround of the tomb. Exact form is schematic.',
  'eternal flame': 'The eternal flame, rekindled every evening at 6:30 pm. Exact burner is schematic.',
};
const pierNames = { northwest: 'Northwest', northeast: 'Northeast', southwest: 'Southwest', southeast: 'Southeast' };
for (const [n, N] of Object.entries(pierNames)) {
  for (let c = 1; c <= 6; c++) {
    explanations[`${n} pier, course ${c}`] = `Stone course ${c} of the ${N} pier; the four piers carry the 50 m mass. Coursing is schematic.`;
  }
}
for (const fn of ['front', 'back']) {
  const N = fn[0].toUpperCase() + fn.slice(1);
  for (let i = 1; i <= 9; i++) {
    explanations[`${fn} arch voussoir ${i}`] = `Voussoir ${i} of nine in the ${N} arch ring; the arch spans 14.62 m. Exact block sizes are schematic.`;
  }
}
for (const sn of ['north', 'south']) {
  const N = sn[0].toUpperCase() + sn.slice(1);
  explanations[`${sn} side wall (west)`] = `${N} side vault, west wall mass. Exact masonry is schematic.`;
  explanations[`${sn} side wall (east)`] = `${N} side vault, east wall mass. Exact masonry is schematic.`;
  explanations[`${sn} side arch ring`] = `${N} transverse vault arch, 18.68 m high and 8.44 m wide. Exact voussoirs are schematic.`;
  explanations[`${sn} side spandrel`] = `${N} side spandrel above the transverse vault. Exact masonry is schematic.`;
}
for (const fp of ['front left', 'front right', 'back left', 'back right', 'east upper', 'east lower', 'west upper', 'west lower']) {
  explanations[`frieze panel, ${fp}`] = `Frieze panel carrying inscribed names of French victories and generals (660 names in total). Panel subdivision is schematic.`;
}
for (const c of ['front', 'back', 'east', 'west']) {
  explanations[`cornice, ${c}`] = `The ${c} section of the crowning cornice. Exact profile is schematic.`;
}
for (let i = 1; i <= 4; i++) {
  explanations[`shield row ${i}, front`] = `Row ${i} of attic shields on the front, part of the thirty shields. Arrangement is schematic.`;
  explanations[`shield row ${i}, back`] = `Row ${i} of attic shields on the back. Arrangement is schematic.`;
}

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
const binName = 'arc-de-triomphe-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);
const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }
const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Arc de Triomphe, Paris',
  title: 'Arc de Triomphe',
  location: 'Paris, France',
  blurb: 'Napoleon\u2019s 50 m triumphal arch on the Place Charles de Gaulle, completed 1836: four piers, a 29 m vault, Rude\u2019s La Marseillaise, and the Tomb of the Unknown Soldier beneath.',
  sourceUrls: [
    { label: 'Wikipedia: Arc de Triomphe', url: 'https://en.wikipedia.org/wiki/Arc_de_Triomphe' },
    { label: 'Centre des monuments nationaux: Arc de Triomphe', url: 'https://www.paris-arc-de-triomphe.fr/en/' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id, name: r.part.name, conceptId: r.part.id, system: r.part.system, chunk: 0,
    color: colorFor(r.part.id), positions: r.posOff, normals: r.norOff, indices: r.idxOff,
    vertexCount: r.vertexCount, indexCount: r.indexCount, bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/arc-de-triomphe/arc-de-triomphe-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));
const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
