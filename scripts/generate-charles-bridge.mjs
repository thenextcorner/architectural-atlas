// Detailed Charles Bridge (Karluv most), Prague, for the Architectural Atlas.
//
// Sourced dimensions and facts (never re-state schematics as fact in the UI):
//   medieval stone arch bridge over the Vltava in Prague, construction begun
//   1357 under King Charles IV (foundation stone laid 9 July 1357, at 5:31 am
//   by royal astrologers' reckoning), completed in the early 15th century
//   (1402 per Prague guides); replaced the Judith Bridge (1158-1172),
//   destroyed by a flood in 1342; originally called Stone Bridge / Prague
//   Bridge, renamed Charles Bridge in 1870; 516 m long, nearly 10 m wide
//   (Wikipedia; some guides give 621 m including the approaches); 16 arches
//   shielded by ice guards, built as a bow bridge following the Regensburg
//   Stone Bridge; three bridge towers: the Old Town Bridge Tower (one of the
//   most beautiful Gothic gateways in Europe, a symbolic victory arch on the
//   coronation route of the Bohemian kings) and two Lesser Town (Mala Strana)
//   towers; 30 statues and statuaries, mostly Baroque, erected 1683-1714 and
//   now all replaced by replicas (originals in the Lapidarium); the only
//   Vltava crossing until 1841; sandstone construction.
//   Sources: Wikipedia "Charles Bridge"; praguefreetours.com;
//   thetravel.com; evendo.com; theabroadguide.com.
// Schematic (not sourced, never stated as fact in the UI): pier and arch
// heights, arch profiles, deck camber, parapet heights, statue forms and
// exact positions (beyond 15 per side), tower heights and roof profiles,
// ice-guard shapes, abutment forms, cobblestone paving, which side the ice
// guards face.
//
// Coordinate frame: x = along the bridge (east/Old Town is +x), z = across
// (10 m wide), y = up. Water level y = 0. All dimensions in meters.
//
// Granularity: 100+ named parts across 7 systems. Every explanation is
// either a sourced fact or explicitly marked schematic.
//
// Usage: node scripts/generate-charles-bridge.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'charles-bridge');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (516 m) maps to 2.4 units.
const S = 2.4 / 516;

const LEN = 516, WID = 10, BAYS = 16, BAY = LEN / BAYS;
const DECK_Y = 13; // schematic deck level

// ---------------------------------------------------------------- helpers
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
// Half-torus arch ring spanning along X, curving in the XY plane.
function halfArch(cx, ySpring, radius, tube) {
  const g = new THREE.TorusGeometry(radius, tube, 8, 24, Math.PI);
  g.translate(cx, ySpring, 0);
  return g;
}
// Triangular ice-guard prism on a pier face.
function iceGuard(x, zc, w) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(0, 4); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false });
  g.translate(x, 0, zc - 1.5);
  return g;
}

const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });
const explanations = {};
const explain = (name, text) => { explanations[name.toLowerCase()] = text; };

// ---------------------------------------------------------------- deck (7 cambered segments)
const SEG = 7;
for (let sgi = 0; sgi < SEG; sgi++) {
  const x0 = -LEN / 2 + (sgi * LEN) / SEG, x1 = -LEN / 2 + ((sgi + 1) * LEN) / SEG;
  const camber = 1.6 * (1 - Math.pow((x0 + x1) / LEN, 2)); // gentle bow, schematic
  const y0 = DECK_Y + camber;
  addPart(`deck-segment-${sgi + 1}`, `Deck segment ${sgi + 1}`, 'deck',
    [box(x0, x1, y0, y0 + 1.6, -WID / 2, WID / 2)]);
  explain(`Deck segment ${sgi + 1}`,
    `One of seven deck segments of the 516 m long, 10 m wide sandstone roadway. The slight camber follows the bridge's bow profile; exact deck buildup is schematic.`);
}
// Cobblestone wearing surface, two halves.
addPart('deck-paving-north', 'North deck paving', 'deck',
  [box(-LEN / 2, LEN / 2, DECK_Y + 1.6, DECK_Y + 1.85, -WID / 2, 0)]);
explain('North deck paving', 'Cobblestone paving of the north half of the deck. Paving detail is schematic.');
addPart('deck-paving-south', 'South deck paving', 'deck',
  [box(-LEN / 2, LEN / 2, DECK_Y + 1.6, DECK_Y + 1.85, 0, WID / 2)]);
explain('South deck paving', 'Cobblestone paving of the south half of the deck. Paving detail is schematic.');

// ---------------------------------------------------------------- arches, piers, ice guards
const R_ARCH = BAY / 2 - 1.2; // arch radius, schematic
for (let i = 0; i < BAYS; i++) {
  const cx = -LEN / 2 + (i + 0.5) * BAY;
  const ySpring = 6; // springing height, schematic
  // Arch ring: half torus spanning the bay, plus spandrel fill above it.
  const ring = halfArch(cx, ySpring, R_ARCH, 1.6);
  const spandrel = box(cx - BAY / 2 + 1, cx + BAY / 2 - 1, ySpring, DECK_Y + 0.5, -4.4, 4.4);
  addPart(`arch-${i + 1}`, `Arch ${i + 1}`, 'arches', [ring, spandrel]);
  explain(`Arch ${i + 1}`,
    `One of the bridge's 16 sandstone arches. Arch profiles and heights are schematic; the arches are shielded by ice guards.`);
}
for (let i = 0; i <= BAYS; i++) {
  const x = -LEN / 2 + i * BAY;
  const isAbut = (i === 0 || i === BAYS);
  addPart(isAbut ? `abutment-${i === 0 ? 'west' : 'east'}` : `pier-${i}`,
    isAbut ? `${i === 0 ? 'West' : 'East'} abutment` : `Pier ${i}`,
    'arches', [box(x - 2.2, x + 2.2, 0, 7.5, -5.2, 5.2)]);
  explain(isAbut ? `${i === 0 ? 'West' : 'East'} abutment` : `Pier ${i}`,
    isAbut ? 'One of the two end abutments anchoring the bridge to the river banks. Form is schematic.'
            : `One of the bridge's massive sandstone piers rising from the Vltava. Pier dimensions are schematic.`);
  if (!isAbut) {
    addPart(`ice-guard-${i}`, `Ice guard ${i}`, 'arches', [iceGuard(x, -5.2, 7)]);
    explain(`Ice guard ${i}`,
      `A cutwater ice guard shielding pier ${i} from ice floes and flood debris, in the medieval manner. Shape and orientation are schematic.`);
  }
}

// ---------------------------------------------------------------- parapets
for (const [side, nm] of [['north', 'North'], ['south', 'South']]) {
  const z = side === 'north' ? 1 : -1;
  addPart(`${side}-parapet`, `${nm} parapet`, 'parapets',
    [box(-LEN / 2, LEN / 2, DECK_Y + 1.85, DECK_Y + 3.1, z * 4.2, z * 5.0)]);
  explain(`${nm} parapet`,
    `The ${nm.toLowerCase()} sandstone parapet running the full 516 m, carrying the alley of statues. Height is schematic.`);
}

// ---------------------------------------------------------------- statues (30)
const SAINTS = {
  8: 'St. John of Nepomuk',
};
for (let i = 0; i < 15; i++) {
  for (const [side, nm] of [['north', 'North'], ['south', 'South']]) {
    const x = -LEN / 2 + 24 + i * ((LEN - 48) / 14);
    const z = (side === 'north' ? 4.6 : -4.6);
    const n = i * 2 + (side === 'north' ? 1 : 2);
    const saint = (side === 'south' && SAINTS[i]) ? ` (${SAINTS[i]})` : '';
    const geoms = [
      box(x - 0.9, x + 0.9, DECK_Y + 3.1, DECK_Y + 4.6, z - 0.9, z + 0.9), // pedestal
      cyl(0.55, 0.8, 2.6, x, DECK_Y + 5.9, z, 8), // robed figure
    ];
    const head = new THREE.SphereGeometry(0.35, 8, 6); head.translate(x, DECK_Y + 7.5, z);
    geoms.push(head);
    addPart(`statue-${n}`, `Statue ${n}${saint}`, 'statues', geoms);
    explain(`Statue ${n}${saint}`,
      saint ? `The statue of St. John of Nepomuk, the Czech martyr saint; touching its plaque is said to bring good luck. The originals (erected 1683-1714) were replaced by replicas from 1965. Figure form is schematic.`
            : `One of the 30 Baroque statues lining the bridge, 15 per side, originally erected 1683-1714 and now all replicas (originals in the Lapidarium). Figure form and subject are schematic.`);
  }
}

// ---------------------------------------------------------------- Old Town Bridge Tower (east end)
{
  const x = LEN / 2 + 7;
  // Two jambs with pointed-arch opening between them (passageway left open).
  addPart('old-town-tower-jambs', 'Old Town Bridge Tower jambs', 'old-town-tower', [
    box(x - 5, x - 1.6, DECK_Y, DECK_Y + 12, -5, 5),
    box(x + 1.6, x + 5, DECK_Y, DECK_Y + 12, -5, 5),
  ]);
  explain('Old Town Bridge Tower jambs', 'The jambs of the Old Town Bridge Tower framing the pointed Gothic archway; Bohemian kings passed through on their coronation route. Exact form is schematic.');
  const archTop = halfArch(0, DECK_Y + 12, 3.4, 1.4);
  archTop.rotateY(Math.PI / 2); // span across Z: the passageway runs along X
  archTop.translate(x, 0, 0);
  addPart('old-town-tower-arch', 'Old Town Bridge Tower arch', 'old-town-tower', [archTop]);
  explain('Old Town Bridge Tower arch', 'The pointed arch crown of the tower gateway. Profile is schematic.');
  addPart('old-town-tower-body', 'Old Town Bridge Tower body', 'old-town-tower', [
    box(x - 5, x + 5, DECK_Y + 12, DECK_Y + 26, -5, 5),
  ]);
  explain('Old Town Bridge Tower body', 'The upper mass of the Old Town Bridge Tower, regarded as one of the most beautiful Gothic gateways in Europe and conceived as a symbolic victory arch. Height is schematic.');
  // Tracery bands.
  const tracery = [];
  for (let k = 0; k < 5; k++) {
    tracery.push(box(x - 5.2, x + 5.2, DECK_Y + 15 + k * 2.2, DECK_Y + 15.8 + k * 2.2, -5.2, -4.8));
    tracery.push(box(x - 5.2, x + 5.2, DECK_Y + 15 + k * 2.2, DECK_Y + 15.8 + k * 2.2, 4.8, 5.2));
  }
  addPart('old-town-tower-tracery', 'Old Town Bridge Tower tracery', 'old-town-tower', tracery);
  explain('Old Town Bridge Tower tracery', 'Gothic sculptural tracery bands on the tower faces. Detail is schematic.');
  // Steep roof.
  const roof = new THREE.ConeGeometry(7.2, 9, 4);
  roof.rotateY(Math.PI / 4); roof.translate(x, DECK_Y + 30.5, 0);
  addPart('old-town-tower-roof', 'Old Town Bridge Tower roof', 'old-town-tower', [roof]);
  explain('Old Town Bridge Tower roof', 'The steep tower roof. Profile is schematic.');
}

// ---------------------------------------------------------------- Lesser Town towers (west end)
{
  const x = -LEN / 2 - 6;
  // Taller Gothic tower.
  addPart('lesser-town-tower-gothic', 'Lesser Town Gothic tower', 'lesser-town-towers', [
    box(x - 4, x + 4, DECK_Y, DECK_Y + 20, -4, 4),
  ]);
  explain('Lesser Town Gothic tower', 'The taller of the two Lesser Town bridge towers, in Gothic style. Height is schematic.');
  const r1 = new THREE.ConeGeometry(5.8, 8, 4); r1.rotateY(Math.PI / 4); r1.translate(x, DECK_Y + 24, 0);
  addPart('lesser-town-tower-gothic-roof', 'Lesser Town Gothic tower roof', 'lesser-town-towers', [r1]);
  explain('Lesser Town Gothic tower roof', 'The steep roof of the Gothic Lesser Town tower. Profile is schematic.');
  // Smaller Romanesque tower.
  const x2 = -LEN / 2 - 16;
  addPart('lesser-town-tower-romanesque', 'Lesser Town Romanesque tower', 'lesser-town-towers', [
    box(x2 - 3.4, x2 + 3.4, DECK_Y, DECK_Y + 13, -3.4, 3.4),
  ]);
  explain('Lesser Town Romanesque tower', 'The smaller, older Romanesque tower of the Lesser Town pair. Height is schematic.');
  const r2 = new THREE.ConeGeometry(4.8, 6, 4); r2.rotateY(Math.PI / 4); r2.translate(x2, DECK_Y + 16, 0);
  addPart('lesser-town-tower-romanesque-roof', 'Lesser Town Romanesque tower roof', 'lesser-town-towers', [r2]);
  explain('Lesser Town Romanesque tower roof', 'The roof of the Romanesque Lesser Town tower. Profile is schematic.');
}

// ---------------------------------------------------------------- approach ramps
addPart('east-approach', 'East approach', 'deck',
  [box(LEN / 2, LEN / 2 + 30, DECK_Y - 2, DECK_Y + 1.6, -WID / 2, WID / 2)]);
explain('East approach', 'The approach ramp on the Old Town side. Form is schematic.');
addPart('west-approach', 'West approach', 'deck',
  [box(-LEN / 2 - 30, -LEN / 2, DECK_Y - 2, DECK_Y + 1.6, -WID / 2, WID / 2)]);
explain('West approach', 'The approach ramp on the Lesser Town side. Form is schematic.');

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('statue-')) return '#8f8578';
  if (id.includes('tower')) return '#a89a76';
  if (id.startsWith('arch-') || id.startsWith('pier-') || id.includes('abutment')) return '#b5aa92';
  if (id.startsWith('ice-guard')) return '#9a917f';
  if (id.includes('parapet')) return '#c4b898';
  if (id.includes('paving')) return '#8a8478';
  return '#c9bfa5'; // deck sandstone
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'deck', name: 'Deck', color: '#c9bfa5', description: 'The 516 m sandstone roadway deck, 10 m wide, with its cobblestone paving.' },
  { id: 'arches', name: 'Arches, piers and ice guards', color: '#b5aa92', description: 'Sixteen sandstone arches on massive piers, each pier shielded by an ice guard against floes and floods.' },
  { id: 'parapets', name: 'Parapets', color: '#c4b898', description: 'The north and south parapets carrying the continuous alley of statues.' },
  { id: 'statues', name: 'Statues', color: '#8f8578', description: 'Thirty Baroque statues, fifteen per side, erected 1683-1714 and now all replicas.' },
  { id: 'old-town-tower', name: 'Old Town Bridge Tower', color: '#a89a76', description: 'The Gothic gateway tower on the Old Town side, a symbolic victory arch on the coronation route.' },
  { id: 'lesser-town-towers', name: 'Lesser Town towers', color: '#a89a76', description: 'The pair of bridge towers on the Lesser Town side, one Gothic and one Romanesque.' },
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
const binName = 'charles-bridge-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) { console.error('MISSING EXPLANATIONS:', missing); process.exit(1); }

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Charles Bridge, Prague',
  title: 'Charles Bridge',
  location: 'Prague, Czech Republic',
  blurb: 'Prague\u2019s medieval stone arch bridge over the Vltava, begun in 1357 under Charles IV. Sixteen sandstone arches carry a 516 m deck lined with 30 Baroque statues between three Gothic bridge towers.',
  sourceUrls: [
    { label: 'Wikipedia: Charles Bridge', url: 'https://en.wikipedia.org/wiki/Charles_Bridge' },
    { label: 'praguefreetours.com: Charles Bridge', url: 'https://praguefreetours.com/charles-bridge-prague/' },
    { label: 'thetravel.com: Charles Bridge', url: 'https://www.thetravel.com/what-to-know-about-charles-bridge-in-prague/' },
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
  chunks: [{ url: '/models/charles-bridge/charles-bridge-0.bin', bytes: offset }],
  triangles,
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
