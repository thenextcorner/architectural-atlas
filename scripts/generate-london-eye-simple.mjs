// Simplified schematic London Eye for the Architectural Atlas.
//
// The "simple" variant of the London Eye: same proportions and hub geometry
// as the detailed model (see scripts/generate-london-eye.mjs, whose header
// lists every sourced dimension reused here), but coarser: 33 named parts
// across 6 systems instead of 112 across 9. Rim arcs, cables, capsules,
// A-frame legs and drive towers are merged into group parts; capsule glass,
// individual nodes, cross braces and LED arcs are omitted or merged.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-london-eye.mjs for the full attribution):
//   London Eye (Millennium Wheel), South Bank of the Thames, London; 135 m
//   tall; steel rim 120 m in diameter; world's tallest cantilevered
//   observation wheel; 64 tensioned steel cables each prestressed to 75 t;
//   16 rotation cables at an opposing angle on the hub; fixed spindle 22 m;
//   A-frame two legs over 58 m, 20 m apart at the base, leaning 65 degrees
//   toward the river, two 11 m plinths, backstays to a 33 m deep tension
//   foundation; 32 ovoidal capsules, 10 tonnes each, up to 25 people,
//   numbered 1 to 33 skipping 13, each a London borough; 26 cm/s rotation,
//   30 minutes per revolution; opened to the public 9 March 2000; LED
//   lighting from Color Kinetics, December 2006.
// Derived: hub axis 67 m (135 m overall minus 60 m rim radius minus about
// 8 m of schematic capsule protrusion at the apex).
// Schematic (not sourced, never stated as fact in the UI): capsule size and
// shape; rim tube cross-section; cable and backstay layout; hub and bearing
// profiles; A-frame leg taper and crown geometry; restraint tower and drive
// unit design; boarding deck, ticket hall and canopy massing; LED fixture
// positions; foundation layout.
//
// Writes:
//   public/models/london-eye-simple/atlas.json
//   public/models/london-eye-simple/london-eye-simple-0.bin
//
// Usage: node scripts/generate-london-eye-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'london-eye-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (135 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 135;

const HUB = 67; // hub axis height, derived (see header)
const RIM_R = 60; // sourced rim radius (120 m diameter)

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
function cable(a, b, r, seg = 6) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg);
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
function rimArc(startAngle, arcLen) {
  const g = new THREE.TorusGeometry(RIM_R, 1.2, 6, 10, arcLen);
  g.rotateZ(startAngle);
  g.translate(0, HUB, 0);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Wheel rim: 4 quadrant arcs plus merged cable nodes: 5 parts.
const QUADS = ['northeast', 'northwest', 'southwest', 'southeast'];
QUADS.forEach((q, qi) => {
  addPart(`rim-quadrant-${q}`, `Rim quadrant, ${q}`, 'rim', [rimArc((qi * Math.PI) / 2, Math.PI / 2)]);
});
{
  const geoms = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const g = new THREE.SphereGeometry(1.5, 6, 5);
    g.translate(RIM_R * Math.cos(a), HUB + RIM_R * Math.sin(a), 0);
    geoms.push(g);
  }
  addPart('rim-cable-nodes', 'Rim cable nodes', 'rim', geoms);
}

// --- Tension cables: 4 groups of 16 (sourced 64 cables at 75 t each) plus
// the 16 rotation cables merged: 5 parts.
for (let g = 0; g < 4; g++) {
  const side = g < 2 ? 1 : -1;
  const geoms = [];
  for (let j = 0; j < 16; j++) {
    const idx = (g % 2) * 16 + j;
    const na = (idx / 64) * Math.PI * 2;
    const fa = na + side * 0.0982;
    geoms.push(cable(
      [8 * Math.cos(fa), HUB + 8 * Math.sin(fa), 4.2 * side],
      [RIM_R * Math.cos(na), HUB + RIM_R * Math.sin(na), 0.6 * side],
      0.15,
    ));
  }
  addPart(`tension-cables-group-${g + 1}`, `Tension cables group ${g + 1}`, 'cables', geoms);
}
{
  const geoms = [];
  for (let j = 0; j < 16; j++) {
    const ra = (j / 16) * Math.PI * 2;
    const side = j % 2 === 0 ? 1 : -1;
    geoms.push(cable(
      [5 * Math.cos(ra), HUB + 5 * Math.sin(ra), 1.5 * side],
      [RIM_R * Math.cos(ra - 0.21), HUB + RIM_R * Math.sin(ra - 0.21), -0.6 * side],
      0.12,
    ));
  }
  addPart('rotation-cables', 'Rotation cables', 'cables', geoms);
}

// --- Hub and spindle (sourced 22 m fixed spindle): 3 parts.
{
  const barrel = cyl(4.5, 4.5, 12, 0, HUB, 0, 12);
  barrel.rotateX(Math.PI / 2);
  const spindle = cyl(1.4, 1.4, 22, 0, HUB, -4, 10);
  spindle.rotateX(Math.PI / 2);
  addPart('hub-and-spindle', 'Hub and fixed spindle', 'hub', [barrel, spindle]);
}
{
  const geoms = [];
  for (const z of [4.2, -4.2]) {
    const f = cyl(8, 8, 1.2, 0, HUB, z, 14);
    f.rotateX(Math.PI / 2);
    geoms.push(f);
  }
  addPart('hub-flanges', 'Hub flanges', 'hub', geoms);
}
{
  const geoms = [];
  for (const z of [3.5, -3.5]) {
    const b = cyl(2.6, 2.6, 2.5, 0, HUB, z, 10);
    b.rotateX(Math.PI / 2);
    geoms.push(b);
  }
  addPart('hub-bearings', 'Hub bearings', 'hub', geoms);
}

// --- Passenger capsules: 8 groups of 4 (sourced numbering 1 to 33,
// skipping 13): 8 parts.
const capsuleAngle = (i) => -Math.PI / 2 + ((i - 1) / 32) * Math.PI * 2;
const GROUP_RANGES = [[1, 4], [5, 8], [9, 12], [14, 17], [18, 21], [22, 25], [26, 29], [30, 33]];
GROUP_RANGES.forEach(([from, to], gi) => {
  const geoms = [];
  for (let n = from; n <= to; n++) {
    const i = n <= 12 ? n : n - 1; // map number back to index (13 skipped)
    const phi = capsuleAngle(i);
    const cx = 64 * Math.cos(phi);
    const cy = HUB + 64 * Math.sin(phi);
    const body = new THREE.SphereGeometry(2.2, 10, 8);
    body.scale(1, 1.6, 0.85);
    body.rotateZ(phi);
    body.translate(cx, cy, 0);
    geoms.push(body);
    geoms.push(strut(
      [RIM_R * Math.cos(phi), HUB + RIM_R * Math.sin(phi), 0],
      [cx, cy, 0],
      0.7,
    ));
  }
  addPart(`capsules-${from}-to-${to}`, `Capsules ${from} to ${to}`, 'capsules', geoms);
});

// --- Support structure: A-frame (sourced 58 m legs at 65 degrees, 11 m
// plinths, backstays), restraint towers and drive units, tension anchors:
// 8 parts.
{
  const legs = [
    strut([10, 11, -32.5], [3, 63.6, -8], 3.2),
    strut([-10, 11, -32.5], [-3, 63.6, -8], 3.2),
  ];
  addPart('a-frame-legs', 'A-frame legs', 'structure', legs);
}
addPart('a-frame-plinths', 'A-frame plinths', 'structure', [
  box(7, 13, 0, 11, -35.5, -29.5),
  box(-13, -7, 0, 11, -35.5, -29.5),
]);
addPart('a-frame-backstays', 'A-frame backstay cables', 'structure', [
  cable([3, 64, -8], [10, 1.5, -46], 0.28),
  cable([3, 64, -8], [4, 1.5, -46], 0.28),
  cable([-3, 64, -8], [-10, 1.5, -46], 0.28),
  cable([-3, 64, -8], [-4, 1.5, -46], 0.28),
]);
{
  const saddle = box(-4.5, 4.5, 62.5, 68, -11.5, -4.5);
  const housing = cyl(2.4, 2.4, 7, 0, HUB, -8, 10);
  housing.rotateX(Math.PI / 2);
  addPart('a-frame-crown', 'A-frame crown', 'structure', [saddle, housing]);
}
{
  const braces = [];
  for (const t of [0.4, 0.72]) {
    const x = 10 + t * (3 - 10);
    const y = 11 + t * (63.6 - 11);
    const z = -32.5 + t * (-8 + 32.5);
    braces.push(strut([x, y, z], [-x, y, z], 1.2));
  }
  addPart('a-frame-cross-braces', 'A-frame cross braces', 'structure', braces);
}
addPart('restraint-towers', 'River restraint towers', 'structure', [
  box(11, 17, -4, 8, 6, 10),
  box(-17, -11, -4, 8, 6, 10),
  box(9, 19, -6, -4, 4, 12),
  box(-19, -9, -6, -4, 4, 12),
]);
addPart('rim-drive-units', 'Rim drive units', 'structure', [
  box(12, 16, 8.5, 11.5, 2, 6),
  box(-16, -12, 8.5, 11.5, 2, 6),
]);
addPart('tension-anchors', 'Tension anchor blocks', 'structure', [
  box(6, 12, -2, 3, -49, -43),
  box(-12, -6, -2, 3, -49, -43),
]);

// --- Boarding and lighting: 4 parts.
addPart('boarding-deck', 'Boarding deck', 'boarding', [box(-16, 16, 0, 1, -4, 8)]);
addPart('ticket-hall', 'Ticket hall', 'boarding', [box(-28, -18, 0, 6, -10, 0)]);
{
  const canopy = [box(-16, 16, 5, 5.6, -4, 8)];
  for (const [x, z] of [[-14, -2], [14, -2], [-14, 6], [14, 6]]) {
    canopy.push(cyl(0.22, 0.22, 5, x, 2.5, z, 8));
  }
  addPart('boarding-canopy', 'Boarding canopy', 'boarding', canopy);
}
{
  const geoms = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const g = new THREE.SphereGeometry(0.55, 6, 5);
    g.translate(60.5 * Math.cos(a), HUB + 60.5 * Math.sin(a), 1.6);
    geoms.push(g);
  }
  addPart('led-lighting-ring', 'LED lighting ring', 'boarding', geoms);
}

// ---------------------------------------------------------------- colors
// Schematic light palette (the Eiffel Tower is the only dark realistic
// model in the atlas).
function colorFor(id) {
  if (id.startsWith('rim-quadrant-') || id === 'hub-and-spindle') return '#e9e7e1';
  if (id === 'rim-cable-nodes') return '#b9bcc2';
  if (id.startsWith('tension-cables-group-')) return '#8f959c';
  if (id === 'rotation-cables') return '#7d838b';
  if (id === 'hub-flanges') return '#c9c6bd';
  if (id === 'hub-bearings') return '#6e6e6e';
  if (id.startsWith('capsules-')) return '#f4f2ec';
  if (id.startsWith('a-frame-legs') || id === 'a-frame-crown') return '#dedbd2';
  if (id === 'a-frame-plinths') return '#b3aea2';
  if (id === 'a-frame-backstays') return '#8f959c';
  if (id === 'a-frame-cross-braces') return '#cfccc2';
  if (id === 'restraint-towers') return '#b8b4a9';
  if (id === 'rim-drive-units') return '#55585e';
  if (id === 'tension-anchors') return '#a39e92';
  if (id === 'boarding-deck') return '#c8b28a';
  if (id === 'ticket-hall') return '#d9d4c7';
  if (id === 'boarding-canopy') return '#e5e2d8';
  if (id === 'led-lighting-ring') return '#a8d8e6';
  return '#d9d5cc';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'rim', name: 'Wheel rim', color: '#e9e7e1', description: 'The 120 m steel rim in four quadrant arcs, built in sections that were floated up the Thames on barges and assembled lying flat before the wheel was raised.' },
  { id: 'cables', name: 'Tension cables', color: '#9aa0a6', description: 'Sixty-four tensioned steel cables carry the rim like the spokes of a huge bicycle wheel, each prestressed to 75 tonnes; rotation cables keep rim and hub turning together.' },
  { id: 'hub', name: 'Hub and spindle', color: '#cfcabf', description: 'The wheel and hub turn on bearings around a fixed 22 m spindle, which cantilevers out over the Thames from the A-frame.' },
  { id: 'capsules', name: 'Passenger capsules', color: '#f4f2ec', description: 'The 32 sealed, air-conditioned ovoidal capsules in eight groups of four, each weighing 10 tonnes and holding up to 25 people.' },
  { id: 'structure', name: 'Support structure', color: '#d8d5cc', description: 'The leaning A-frame on its plinths and backstays, the river restraint towers with their drive units, and the tension anchors.' },
  { id: 'boarding', name: 'Boarding and lighting', color: '#c9b795', description: 'The deck, ticket hall and canopy where passengers board the moving capsules, plus the LED lighting ring on the rim.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (const q of QUADS) {
  explanations[`rim quadrant, ${q}`] =
    `One quadrant of the 120 m steel rim. The rim was built in sections, floated up the Thames on barges, and assembled lying flat on piled platforms in the river before the wheel was raised. Exact segment joints are schematic.`;
}
explanations['rim cable nodes'] =
  'The 64 rim nodes where the tensioned steel cables meet the rim; wind loads reach the hub through the cables attached to these nodes. Exact node design is schematic.';
for (let g = 1; g <= 4; g++) {
  explanations[`tension cables group ${g}`] =
    `Sixteen of the 64 tensioned steel cables that support the rim like the spokes of a huge bicycle wheel, each prestressed to 75 tonnes. The full dead load of the wheel hangs on the cables. Exact cable layout is schematic.`;
}
explanations['rotation cables'] =
  'The 16 rotation cables, attached to the hub at an opposing angle so the turning of the rim and the turning of the hub stay together with no lag. Exact layout is schematic.';
explanations['hub and fixed spindle'] =
  'The hub barrel around the fixed spindle, which is 22 m long, about the height of a seven-storey building stood on end. The spindle is cantilevered out over the Thames, supported on one side only by the A-frame. Exact profiles are schematic.';
explanations['hub flanges'] =
  'The hub flanges where the 64 tensioned cables anchor to the hub. Exact profile is schematic.';
explanations['hub bearings'] =
  'The hub bearings, on which the wheel and hub turn around the fixed spindle. The bearings came from Germany. Exact profile is schematic.';
for (const [from, to] of GROUP_RANGES) {
  explanations[`capsules ${from} to ${to}`] =
    `Four of the 32 sealed, air-conditioned ovoidal passenger capsules, each weighing 10 tonnes and holding up to 25 people. The capsules are numbered 1 to 33, skipping 13 for superstitious reasons, and each represents one of the London boroughs. They hang on the external circumference and are rotated by electric motors so the floor stays level. Exact size and shape are schematic.`;
}
Object.assign(explanations, {
  'a-frame legs': 'The two large tapered legs of the A-frame, each over 58 m long, set 20 m apart at the base and leaning toward the river at 65 degrees. The frame works like one fork of a bicycle, holding the fixed spindle that cantilevers the wheel out over the Thames. Exact taper is schematic.',
  'a-frame plinths': 'The two 11 m concrete plinths carrying the A-frame legs. Exact plinth profile is schematic.',
  'a-frame backstay cables': 'Cable backstays from the top of the A-frame, anchored to a concrete foundation 33 m deep on land, holding the frame permanently at 65 degrees. Exact cable count is schematic.',
  'a-frame crown': 'The crown where the two A-frame legs meet and cradle the fixed spindle. Exact geometry is schematic.',
  'a-frame cross braces': 'Cross braces tying the two A-frame legs together. Exact brace positions are schematic.',
  'river restraint towers': 'Short towers founded in the river bed, carrying the rim-bearing drive units and giving restraint against overturning. Exact positions are schematic.',
  'rim drive units': 'Friction drive units: computer-controlled hydraulic motors driven by electric pumps turn tires that run against the rim to rotate the wheel. Exact design is schematic.',
  'tension anchor blocks': 'Tension anchor blocks on land, where the A-frame backstays are buried in concrete. Exact layout is schematic.',
  'boarding deck': 'The boarding deck at ground level, where passengers walk on and off the moving capsules; the wheel does not usually stop for boarding. Exact layout is schematic.',
  'ticket hall': 'The ticket hall beside the boarding deck, in the Riverside Building at County Hall. Exact massing is schematic.',
  'boarding canopy': 'A canopy sheltering the boarding deck. Exact design is schematic.',
  'led lighting ring': 'The LED lighting ring on the rim. The lighting was redone with LED lighting from Color Kinetics in December 2006 for digital control of the colors. Exact fixture positions are schematic.',
});

// ---------------------------------------------------------------- serialize
// Atlas v1 contract (same as the other generators): per part, 4-byte
// aligned Float32 positions, Int16 normals and Uint32 indices in one
// binary chunk; atlas.json carries byte offsets, bounds, explanations,
// concepts and triangles. Parts carry an optional color that overrides the
// system color in the viewer.
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
  const align4 = (n) => (n + 3) & ~3; // keep every section 4-byte aligned for typed-array views
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
const binName = 'london-eye-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the london-eye-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'London Eye, London (simplified schematic)',
  title: 'London Eye',
  location: 'London, United Kingdom',
  blurb: 'The London Eye, originally the Millennium Wheel, is a cantilevered observation wheel on the South Bank of the River Thames in London, in simplified schematic form: the 120 m steel rim, its tensioned cable spokes, the 32 passenger capsules, and the A-frame that cantilevers the wheel out over the river.',
  sourceUrls: [
    { label: 'Wikipedia: London Eye', url: 'http://en.wikipedia.org/wiki/London_Eye' },
    { label: 'New Civil Engineer: Eye’s wide open in time for Millennium', url: 'https://www.newcivilengineer.com/archive/eyes-wide-open-in-time-for-millennium-14-10-1999/' },
    { label: 'New Civil Engineer: A view to a thrill', url: 'https://www.newcivilengineer.com/archive/a-view-to-a-thrill-31-05-1999/' },
    { label: 'New Civil Engineer: Turning to analysis', url: 'https://www.newcivilengineer.com/archive/turning-to-analysis-a-structure-without-parallel-will-soon-stand-high-above-the-thames-lisa-russell-reports-on-the-design-of-the-british-airways-london-eye-10-12-1998/' },
    { label: 'Mechanical Engineering: Building the world’s biggest wheel', url: 'https://www.thefreelibrary.com/Building+the+world%27s+biggest+wheel%3A+engineers+use+tricks+of+the+trade...-a0175549203' },
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
  chunks: [{ url: '/models/london-eye-simple/london-eye-simple-0.bin', bytes: offset }],
  triangles,
  spread: 2.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
