// Simplified schematic Notre-Dame de Paris for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-notre-dame-de-paris.mjs, whose header
// lists every sourced dimension reused here), but coarser: 35 named parts
// across 7 systems instead of 107 across 12. Towers, portals, flyers,
// chapels, bells and furnishings are merged into group parts; tracery,
// tympanum sculpture and individual statues are omitted.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-notre-dame-de-paris.mjs for the full attribution):
//   128 m long; transept 48 m wide, 14 m deep; total width 40 m; west facade
//   43 m wide; towers 69 m with 380 steps; nave 12 m wide; vault 33 m; roof
//   43 m; side aisles 10 m; choir 36 m long; west rose 9.6 m (about 1225),
//   north rose 13.1 m (about 1250), south rose 12.9 m (about 1260);
//   three west portals (St Anne first, Virgin next, Last Judgment last and
//   tallest); Gallery of Kings with 28 statues; chimeras are 19th century
//   additions; crossing spire 96 m (Viollet-le-Duc 1859, destroyed 2019,
//   rebuilt identically by 2024, golden rooster 16 Dec 2023); the Forest of
//   1,300 oaks; great organ of nearly 8,000 pipes, five keyboards, 109
//   stops; 10 bells with the 13 ton Emmanuel bourdon; flying buttresses of
//   the late 13th century; Point Zero marker, archaeological crypt and
//   Charlemagne statue on the parvis.
// Schematic (not sourced, never stated as fact in the UI): exact footprint
// placement; merged group geometry; simplified tower, portal, flyer, vault
// and spire profiles.
//
// Writes:
//   public/models/notre-dame-de-paris-simple/atlas.json
//   public/models/notre-dame-de-paris-simple/notre-dame-de-paris-simple-0.bin
//
// Usage: node scripts/generate-notre-dame-de-paris-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'notre-dame-de-paris-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (128 m) maps to 2.4 units (same as detailed).
const S = 2.4 / 128;

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
function slope(x0, y0, x1, y1, z0, z1, t = 0.6) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const g = new THREE.BoxGeometry(len, t, z1 - z0);
  g.rotateZ(Math.atan2(dy, dx)); // rotate BEFORE translate
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function vaultZ(r, len, cx, springY, cz) {
  const g = new THREE.CylinderGeometry(r, r, len, 12, 1, true, 0, Math.PI);
  g.rotateX(Math.PI / 2);
  g.rotateZ(Math.PI / 2);
  g.translate(cx, springY, cz);
  return g;
}
function roseDisc(cx, cy, cz, r, facing) {
  const ring = new THREE.TorusGeometry(r, 0.25, 8, 24);
  const glass = new THREE.CircleGeometry(r - 0.2, 24);
  if (facing !== 'west') {
    ring.rotateY(Math.PI / 2); // rotate BEFORE translate
    glass.rotateY(Math.PI / 2);
  }
  ring.translate(cx, cy, cz);
  glass.translate(cx, cy, cz);
  return [ring, glass];
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- West front (sourced: towers 69 m, facade 43 m wide) ---
addPart('northwest-tower', 'Northwest tower', 'west-front', [
  box(-21.5, -10.5, 0, 43, -64, -54),
  box(-21, -11, 43, 69, -63.5, -54.5),
]);
addPart('southwest-tower', 'Southwest tower', 'west-front', [
  box(10.5, 21.5, 0, 43, -64, -54),
  box(11, 21, 43, 69, -63.5, -54.5),
]);
{
  const geoms = [];
  for (const ox of [-16, 16]) {
    for (const dx of [-2.6, 2.6]) {
      geoms.push(box(ox + dx - 1.7, ox + dx + 1.7, 48, 62, -64.1, -63.5));
    }
  }
  addPart('tower-belfries', 'Tower belfries', 'west-front', geoms);
}
{
  const crown = new THREE.SphereGeometry(1.6, 10, 10);
  crown.translate(16, 58, -59);
  const mouth = new THREE.CylinderGeometry(2.2, 2.5, 2.5, 10);
  mouth.translate(16, 55, -59);
  addPart('emmanuel-bell', 'Emmanuel bell', 'west-front', [crown, mouth]);
}
{
  // Three west portals merged (sourced order: St Anne, Virgin, Last Judgment).
  const geoms = [
    box(-13.5, -8.5, 0, 9, -64.4, -63.8),
    box(-13, -9, 9, 12.5, -64.3, -63.8),
    box(-3.5, 3.5, 0, 11, -64.4, -63.8),
    box(-3, 3, 11, 15, -64.3, -63.8),
    box(8.5, 13.5, 0, 9, -64.4, -63.8),
    box(9, 13, 9, 12.5, -64.3, -63.8),
    box(-10.5, 10.5, 0, 52, -64, -62.5),
  ];
  addPart('west-portals', 'West portals', 'west-front', geoms);
}
{
  const geoms = [box(-21.5, 21.5, 17, 20.5, -64.3, -63.7)];
  for (let i = 0; i < 28; i++) {
    const x = -20.7 + i * (41.4 / 27);
    geoms.push(box(x - 0.5, x + 0.5, 17.5, 20.2, -64.4, -63.9));
  }
  addPart('gallery-of-kings', 'Gallery of Kings', 'west-front', geoms);
}
addPart('west-rose-window', 'West rose window', 'west-front', roseDisc(0, 40, -64.2, 4.8, 'west'));
{
  const geoms = [box(-10.5, 10.5, 44, 50, -64, -62.8)];
  for (let i = 0; i < 9; i++) {
    const x = -8.5 + i * 2.1;
    geoms.push(box(x - 0.35, x + 0.35, 50, 51.8, -64, -63.2));
  }
  addPart('grand-gallery-chimeras', 'Grand Gallery chimeras', 'west-front', geoms);
}

// --- Body: nave, transept, choir (sourced: nave 12 m, vault 33 m, aisles 10 m) ---
addPart('nave-vessel', 'Nave vessel', 'body', [
  box(-6.6, -5.4, 0, 31, -54, 6),
  box(5.4, 6.6, 0, 31, -54, 6),
  box(-6, 6, 31, 33, -54, 6),
]);
addPart('north-aisle', 'North aisle', 'body', [
  box(-20.5, -19.5, 0, 14, -54, 12),
  box(-20, -6.6, 13.4, 14, -54, 12),
]);
addPart('south-aisle', 'South aisle', 'body', [
  box(19.5, 20.5, 0, 14, -54, 12),
  box(6.6, 20, 13.4, 14, -54, 12),
]);
addPart('nave-vaults', 'Nave vaults', 'body', [vaultZ(6, 58, 0, 27, -24)]);
{
  const geoms = [
    box(-24, -20, 0, 30, -2, 12),
    box(20, 24, 0, 30, -2, 12),
    slope(-24, 30, -22, 36, -2, 12),
    slope(-20, 30, -22, 36, -2, 12),
    slope(20, 30, 22, 36, -2, 12),
    slope(24, 30, 22, 36, -2, 12),
  ];
  addPart('transept-arms', 'Transept arms', 'body', geoms);
}
addPart('north-rose', 'North rose window', 'body', roseDisc(-24.2, 32, 5, 6.55, 'north'));
addPart('south-rose', 'South rose window', 'body', roseDisc(24.2, 32, 5, 6.45, 'south'));
addPart('choir', 'Choir', 'body', [
  box(-6.6, -5.4, 0, 31, 12, 44),
  box(5.4, 6.6, 0, 31, 12, 44),
  box(-6, 6, 0, 1, 24, 44),
  box(-2.5, 2.5, 1, 2.4, 30, 34),
]);
addPart('choir-vaults', 'Choir vaults', 'body', [vaultZ(6, 30, 0, 27, 29)]);
addPart('nave-roof', 'Nave and choir roof', 'body', [
  slope(-7.5, 33, 0, 43, -54, 44),
  slope(7.5, 33, 0, 43, -54, 44),
]);

// --- Chevet and apse (schematic chapel placement) ---
{
  const wall = new THREE.CylinderGeometry(20, 20, 28, 16, 1, true, -Math.PI / 2, Math.PI);
  wall.translate(0, 14, 44);
  addPart('chevet', 'Chevet', 'apse', [wall]);
}
{
  const amb = new THREE.CylinderGeometry(16.5, 16.5, 5, 16, 1, true, -Math.PI / 2, Math.PI);
  amb.translate(0, 8.5, 44);
  addPart('ambulatory', 'Ambulatory', 'apse', [amb]);
}
{
  const geoms = [];
  for (const deg of [-65, -32.5, 0, 32.5, 65]) {
    const a = (deg * Math.PI) / 180;
    const g = box(-2.5, 2.5, 0, 9, -3, 3);
    g.rotateY(-a); // rotate BEFORE translate
    g.translate(21 * Math.sin(a), 0, 44 + 21 * Math.cos(a));
    geoms.push(g);
  }
  addPart('radiating-chapels', 'Radiating chapels', 'apse', geoms);
}
{
  const dome = new THREE.ConeGeometry(6.2, 6, 12, 1, true, -Math.PI / 2, Math.PI);
  dome.translate(0, 30, 44);
  const roof = new THREE.CylinderGeometry(6.8, 6.8, 4, 12, 1, true, -Math.PI / 2, Math.PI);
  roof.translate(0, 33, 44);
  addPart('apse-roof', 'Apse roof', 'apse', [dome, roof]);
}

// --- Flying buttresses (sourced: late 13th century, among the earliest) ---
function flyers(side, zs) {
  const sx = side < 0 ? -1 : 1;
  const geoms = [];
  for (const z of zs) {
    geoms.push(box(sx * 19.7 - 1.1, sx * 19.7 + 1.1, 0, 17, z - 1.1, z + 1.1));
    geoms.push(strut([sx * 19.7, 16, z], [sx * 7, 26.5, z], 1.2));
    const pin = new THREE.ConeGeometry(1.1, 3.5, 4);
    pin.translate(sx * 19.7, 18.7, z);
    geoms.push(pin);
  }
  return geoms;
}
{
  const naveBays = [-47.5, -41, -34.5, -28, -21.5, -15, -8.5];
  addPart('north-nave-flyers', 'North nave flyers', 'buttresses', flyers(-1, naveBays));
  addPart('south-nave-flyers', 'South nave flyers', 'buttresses', flyers(1, naveBays));
  addPart('choir-flyers', 'Choir flyers', 'buttresses', [
    ...flyers(-1, [17, 23.5, 30, 36.5]),
    ...flyers(1, [17, 23.5, 30, 36.5]),
  ]);
  const geoms = [];
  for (const z of [-47.5, -41, -34.5, -28, -21.5, -15, -8.5, 17, 23.5, 30, 36.5]) {
    geoms.push(box(-21.9, -19.5, 0, 17, z - 1.1, z + 1.1));
    geoms.push(box(19.5, 21.9, 0, 17, z - 1.1, z + 1.1));
  }
  addPart('buttress-piers', 'Buttress piers', 'buttresses', geoms);
}

// --- Crossing spire (sourced: 96 m, rebuilt identically by 2024) ---
{
  const lower = new THREE.CylinderGeometry(2.2, 3.6, 24, 8);
  lower.translate(0, 61, 5);
  const upper = new THREE.CylinderGeometry(0.7, 2.2, 17, 8);
  upper.translate(0, 81.5, 5);
  addPart('spire', 'Crossing spire', 'fleche', [
    box(-4, 4, 43, 49, 1, 9),
    lower,
    upper,
  ]);
}
addPart('spire-cross', 'Spire cross', 'fleche', [
  box(-0.35, 0.35, 88, 95, 4.65, 5.35),
  box(-2.2, 2.2, 91.5, 92.5, 4.7, 5.3),
]);
{
  const body = new THREE.SphereGeometry(0.55, 8, 8);
  body.scale(1.4, 1, 0.8);
  body.translate(0, 95.8, 5);
  addPart('golden-rooster', 'Golden rooster', 'fleche', [body]);
}

// --- Interior ---
addPart('great-organ', 'Great organ', 'interior', [
  box(-6, 6, 12, 14, -54, -49),
  box(-5, 5, 14, 24, -54, -52),
  cyl(0.8, 0.8, 9, -2, 18.5, -53, 8),
  cyl(0.8, 0.8, 9, 2, 18.5, -53, 8),
]);
addPart('high-altar', 'High altar', 'interior', [box(-2.5, 2.5, 1, 2.4, 30, 34)]);
{
  const geoms = [];
  for (let z = -48; z <= -10; z += 2.6) {
    geoms.push(box(-5, -1, 0, 1.1, z, z + 1.8));
    geoms.push(box(1, 5, 0, 1.1, z, z + 1.8));
  }
  addPart('nave-pews', 'Nave pews', 'interior', geoms);
}
addPart('treasury', 'Treasury', 'interior', [
  box(13.5, 16.5, 0, 2.2, 23, 27),
  box(14, 16, 2.2, 3.4, 23.5, 26.5),
]);

// --- Parvis ---
addPart('parvis', 'Parvis', 'parvis', [box(-45, 45, -0.4, 0, -115, -64)]);
{
  const med = new THREE.CylinderGeometry(0.9, 0.9, 0.12, 12);
  med.translate(0, 0.02, -84);
  addPart('point-zero-marker', 'Point Zero marker', 'parvis', [med]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'emmanuel-bell') return '#8a6f3c';
  if (id === 'tower-belfries' || id === 'west-portals') return '#4a4238';
  if (id === 'west-rose-window' || id === 'north-rose' || id === 'south-rose') return '#2f4d6e';
  if (id === 'spire') return '#9aa39b';
  if (id === 'spire-cross') return '#6e7a6e';
  if (id === 'golden-rooster') return '#c9a227';
  if (id === 'nave-roof' || id === 'apse-roof') return '#8f9a94';
  if (id === 'great-organ') return '#8a6b45';
  if (id === 'high-altar') return '#e8e2d4';
  if (id === 'treasury') return '#7a5c2e';
  if (id === 'nave-pews') return '#8a6b45';
  if (id === 'point-zero-marker') return '#8a8478';
  if (id === 'parvis') return '#b9b2a0';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'west-front', name: 'West front', color: '#e3d9c2', description: 'The west front: two 69 m towers, three sculpted portals, the Gallery of Kings with 28 statues, the 9.6 m rose window, and the Grand Gallery of chimeras.' },
  { id: 'body', name: 'Nave, transept and choir', color: '#d9cfbb', description: 'The 12 m wide nave with double aisles, the 48 m transept with its two great roses, and the choir, all vaulted at 33 m under lead roofs.' },
  { id: 'apse', name: 'Chevet and apse', color: '#d5ccb6', description: 'The eastern chevet: outer wall, ambulatory, and radiating chapels.' },
  { id: 'buttresses', name: 'Flying buttresses', color: '#c4bba4', description: 'The flying buttresses added in the late 13th century to stop the walls bowing outward, among the earliest of their kind.' },
  { id: 'fleche', name: 'Crossing spire', color: '#9aa39b', description: 'The 96 m crossing spire, destroyed in the 2019 fire and rebuilt identically by 2024.' },
  { id: 'interior', name: 'Interior', color: '#e8e0cd', description: 'The great organ of nearly 8,000 pipes, the high altar, pews, and treasury.' },
  { id: 'parvis', name: 'Parvis', color: '#b9b2a0', description: 'The square in front of the cathedral with France\u2019s Point Zero marker.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'northwest tower': 'The northwest tower of the west front, rising to the sourced 69 m. Exact stage divisions are schematic.',
  'southwest tower': 'The southwest tower of the west front, rising to the sourced 69 m. Exact stage divisions are schematic.',
  'tower belfries': 'The belfry stages of the two towers with their tall paired openings. Exact opening shapes are schematic.',
  'emmanuel bell': 'Emmanuel, the 13 ton bourdon in the south tower, recast in 1681, rung for great national occasions. Bell profile is schematic.',
  'west portals': 'The three sculpted west portals: Saint Anne (south, first), the Virgin (north), and the Last Judgment (center, last and tallest). Exact recess depths are schematic.',
  'gallery of kings': 'The Gallery of Kings: 28 statues of the kings of Judah and Israel, beheaded in the Revolution; 21 heads were found in 1977 and are now at the Mus\u00e9e de Cluny. Individual figures are schematic.',
  'west rose window': 'The west rose window, 9.6 m across, the oldest of the three, from about 1225. Tracery pattern is schematic.',
  'grand gallery chimeras': 'The Grand Gallery connecting the towers, carrying the chimeras: 19th century Viollet-le-Duc additions, not medieval. Individual figures are schematic.',
  'nave vessel': 'The 12 m wide central vessel of the nave rising toward the 33 m vaults. Exact bay divisions are schematic.',
  'north aisle': 'The north double aisle beside the nave, 10 m high. Exact pier positions are schematic.',
  'south aisle': 'The south double aisle beside the nave, 10 m high. Exact pier positions are schematic.',
  'nave vaults': 'The rib-vaulted ceiling of the nave, 33 m above the floor. Exact rib profiles are schematic.',
  'transept arms': 'The arms of the shallow transept, 48 m across and 14 m deep in total. Exact massing is schematic.',
  'north rose window': 'The north rose window, 13.1 m across, the largest of the three, created around 1250. Tracery pattern is schematic.',
  'south rose window': 'The south rose window, 12.9 m across, completed around 1260. Tracery pattern is schematic.',
  'choir': 'The 36 m long choir with the high altar and raised sanctuary. Exact forms are schematic.',
  'choir vaults': 'The rib vaults over the choir at 33 m. Exact profiles are schematic.',
  'nave and choir roof': 'The lead-covered roofs over nave and choir, 43 m at the ridge. Exact seam lines are schematic.',
  'chevet': 'The curved outer wall of the eastern chevet. Exact radius is schematic.',
  'ambulatory': 'The ambulatory ringing the choir behind the apse. Exact layout is schematic.',
  'radiating chapels': 'Chapels radiating from the chevet around the ambulatory. Count and placement are schematic.',
  'apse roof': 'The half dome and roof over the apse. Exact profile is schematic.',
  'north nave flyers': 'The flying buttresses along the north side of the nave, added in the late 13th century when the walls bowed outward. Exact profiles are schematic.',
  'south nave flyers': 'The flying buttresses along the south side of the nave, added in the late 13th century when the walls bowed outward. Exact profiles are schematic.',
  'choir flyers': 'The flying buttresses along the choir. Exact profiles are schematic.',
  'buttress piers': 'The outer piers that receive the thrust of the flyers, crowned with pinnacles. Exact forms are schematic.',
  'crossing spire': 'The 96 m crossing spire: Viollet-le-Duc\u2019s 1859 oak and lead fl\u00e8che, destroyed in the 2019 fire and rebuilt identically by 2024. Stage divisions are schematic.',
  'spire cross': 'The cross crowning the 96 m spire. Exact form is schematic.',
  'golden rooster': 'The golden rooster weathervane by Philippe Villeneuve, placed on the rebuilt spire on 16 December 2023. Exact form is schematic.',
  'great organ': 'The great organ: nearly 8,000 pipes, five keyboards, and 109 stops, 12 m tall and 16 m above the nave floor, a Cavaill\u00e9-Coll instrument of 1868. Exact case is schematic.',
  'high altar': 'The high altar of the choir. Exact form is schematic.',
  'nave pews': 'The rows of pews filling the nave. Exact arrangement is schematic.',
  'treasury': 'The treasury holding the Crown of Thorns and relics of the True Cross. Exact case is schematic.',
  'parvis': 'The parvis, the great square in front of the west front. Exact extent is schematic.',
  'point zero marker': 'The Point Z\u00e9ro des routes de France, the small marker from which all road distances in France are measured. Exact marker design is schematic.',
};

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
const binName = 'notre-dame-de-paris-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the notre-dame-de-paris-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Notre-Dame de Paris (simplified schematic)',
  title: 'Notre-Dame de Paris',
  location: 'Paris, France',
  blurb: 'The great French Gothic cathedral on the \u00cele de la Cit\u00e9 in Paris, begun in 1163, in simplified schematic form: twin 69 m west towers, three sculpted portals, flying buttresses, three rose windows, and the 96 m crossing spire rebuilt after the fire of 15 April 2019.',
  sourceUrls: [
    { label: 'Wikipedia: Notre-Dame de Paris', url: 'https://en.wikipedia.org/wiki/Notre-Dame_de_Paris' },
    { label: 'Wikipedia: Spire of Notre-Dame de Paris', url: 'https://en.wikipedia.org/wiki/Spire_of_Notre-Dame_de_Paris' },
    { label: 'National Geographic: 800-year history', url: 'https://www.nationalgeographic.com/history/history-magazine/article/notre-dame-de-paris?loggedin=true' },
    { label: 'French Moments: dimensions', url: 'https://frenchmoments.eu/notre-dame-de-paris/' },
    { label: 'Dezeen: the rebuilt spire revealed', url: 'https://www.dezeen.com/2024/03/07/notre-dame-cathedral-new-spire/' },
    { label: 'Notre-Dame de Paris: the grand organ', url: 'https://www.notredamedeparis.fr/en/appointment-of-four-organists-at-notre-dame-paris/' },
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
  chunks: [{ url: '/models/notre-dame-de-paris-simple/notre-dame-de-paris-simple-0.bin', bytes: offset }],
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
