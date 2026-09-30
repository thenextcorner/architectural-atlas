// Simplified schematic Pyramid of the Sun for the Architectural Atlas.
//
// The "simple" variant of the Pyramid of the Sun: same footprint, massing
// and proportions as the detailed model (see
// scripts/generate-pyramid-of-the-sun.mjs, whose header lists every
// sourced dimension reused here), but coarser: 32 named parts across 7
// systems instead of 118 across 11. Tier faces, tablero panels, cornices,
// stair flights, alfardas, adosada levels, avenue edges and plaza shrines
// are merged into group parts; the summit temple walls, treads and
// offering caches are omitted.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-pyramid-of-the-sun.mjs for the full attribution):
//   largest building in Teotihuacan, ~40 km northeast of Mexico City, one
//   of the largest structures in the pre-Columbian New World, third
//   largest ancient pyramid in the New World, UNESCO protected; Aztec
//   name, Teotihuacan name unknown; built about 200 AD in two phases to
//   225 m across and 75 m high with a vanished summit altar; current
//   height about 65 m; volume 1,184,828.3 m3; slope 32.494 degrees; five
//   stepped tiers in talud-tablero style as reconstructed; tepetate and
//   adobe interior, tezontle slabs, mortar, stucco, lime plaster with
//   painted murals (jaguars, stars, snake rattles); broad central
//   staircase on the west face toward the Avenue of the Dead; summit
//   temple destroyed, no deity assignable; four-level adosada platform
//   over the original west facade with feline heads and chalchihuites
//   moldings; cave six metres down under the centre, man-made tunnel
//   found 1971 by Ernesto Taboada in a seven-metre pit at the foot of the
//   main staircase, ending in a looted cloverleaf chamber, once thought
//   the Chicomoztoc lava tube; Rene Millon 1959; offerings including a
//   green serpentine mask; child dedicatory burials; built by hand with
//   baskets of crushed bedrock and soil; aligned to Cerro Gordo and to
//   sunsets on August 12 and April 29; city grid offset 15.5 degrees east
//   of true north; Avenue of the Dead north-south, more than 2 miles
//   (3.2 km), 45 m wide, pyramid on its east side between the Pyramid of
//   the Moon and the Ciudadela; abandoned about 750 AD.
// Schematic (not sourced, never stated as fact in the UI): merged group
// geometry; tier, staircase, adosada, summit, avenue, plaza and cave
// proportions; tunnel route and chamber shape.
//
// Writes:
//   public/models/pyramid-of-the-sun-simple/atlas.json
//   public/models/pyramid-of-the-sun-simple/pyramid-of-the-sun-simple-0.bin
//
// Model frame: x east, z south, y up, metres; west face (staircase)
// faces the Avenue of the Dead. Atlas units: 500 m site frame maps to
// 7.2 units (3x the usual fit).
//
// Usage: node scripts/generate-pyramid-of-the-sun-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'pyramid-of-the-sun-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: 500 m site frame maps to 7.2 units.
const S = 7.2 / 500;

const W0 = 112.5;
const H = 65;
const TIERS = 5;
const TH = H / TIERS;
const INSET = 17;
const TALUD_RUN = 10;
const wb = (k) => W0 - INSET * k;
const wt = (k) => wb(k) - TALUD_RUN;
const y0 = (k) => TH * k;
const y1 = (k) => TH * (k + 1);
const ORD = ['one', 'two', 'three', 'four', 'five'];
const STAIR_HALF = 10;

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
function box(x0, x1, y0v, y1v, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1v - y0v, z1 - z0);
  g.translate((x0 + x1) / 2, (y0v + y1v) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function quadSlab(p0, p1, p2, p3, n, t) {
  const nn = new THREE.Vector3(...n).normalize();
  const off = nn.clone().multiplyScalar(t / 2);
  const P = [p0, p1, p2, p3].map((p) => new THREE.Vector3(...p));
  const f = P.map((p) => p.clone().add(off));
  const b = P.map((p) => p.clone().sub(off));
  const pos = new Float32Array([...f, ...b].flatMap((v) => [v.x, v.y, v.z]));
  let idx = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2,
    2, 6, 7, 2, 7, 3,
    3, 7, 4, 3, 4, 0,
  ];
  const e1 = new THREE.Vector3().subVectors(f[1], f[0]);
  const e2 = new THREE.Vector3().subVectors(f[2], f[0]);
  if (new THREE.Vector3().crossVectors(e1, e2).dot(nn) < 0) {
    const flipped = [];
    for (let i = 0; i < idx.length; i += 3) flipped.push(idx[i], idx[i + 2], idx[i + 1]);
    idx = flipped;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
function taludFace(face, k, la, lb, t = 2.5) {
  const w0 = wb(k), w1 = wt(k), a0 = y0(k), a1 = y1(k);
  let p0, p1, p2, p3, n;
  if (face === 'W') {
    p0 = [-w0, a0, la]; p1 = [-w0, a0, lb]; p2 = [-w1, a1, lb]; p3 = [-w1, a1, la];
    n = [-0.79, 0.61, 0];
  } else if (face === 'E') {
    p0 = [w0, a0, lb]; p1 = [w0, a0, la]; p2 = [w1, a1, la]; p3 = [w1, a1, lb];
    n = [0.79, 0.61, 0];
  } else if (face === 'N') {
    p0 = [lb, a0, -w0]; p1 = [la, a0, -w0]; p2 = [la, a1, -w1]; p3 = [lb, a1, -w1];
    n = [0, 0.61, -0.79];
  } else {
    p0 = [la, a0, w0]; p1 = [lb, a0, w0]; p2 = [lb, a1, w1]; p3 = [la, a1, w1];
    n = [0, 0.61, 0.79];
  }
  return quadSlab(p0, p1, p2, p3, n, t);
}
function tableroPanel(face, k, center, span) {
  const wm = wb(k) - TALUD_RUN / 2;
  const surf = wm + 1.25;
  const t = 1.2, a0 = y0(k) + 3, a1 = y1(k) - 2;
  const c0 = center - span / 2, c1 = center + span / 2;
  if (face === 'W') return box(-(surf + t), -surf + 0.3, a0, a1, c0, c1);
  if (face === 'E') return box(surf - 0.3, surf + t, a0, a1, c0, c1);
  if (face === 'N') return box(c0, c1, a0, a1, -(surf + t), -surf + 0.3);
  return box(c0, c1, a0, a1, surf - 0.3, surf + t);
}
// Solid stepped tier body (square frustum); rotated BEFORE translating.
function tierBody(k) {
  const g = new THREE.CylinderGeometry(wt(k) * Math.SQRT2, wb(k) * Math.SQRT2, TH, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(0, y0(k) + TH / 2, 0);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Tiers: solid body, merged talud band and merged tablero band per
// tier: 15 parts.
for (let k = 0; k < TIERS; k++) {
  const o = ORD[k], w = wb(k);
  addPart(`tier-${o}-body`, `Tier ${o} body`, 'tiers', [tierBody(k)]);
  addPart(`tier-${o}-talud`, `Tier ${o} talud faces`, 'tiers', [
    taludFace('N', k, -w, w), taludFace('S', k, -w, w),
    taludFace('E', k, -w, w), taludFace('W', k, -w, w),
  ]);
  const wm = wb(k) - TALUD_RUN / 2;
  const span = 0.55 * 2 * wm;
  addPart(`tier-${o}-tablero`, `Tier ${o} tablero panels`, 'tiers', [
    tableroPanel('N', k, 0, span), tableroPanel('S', k, 0, span),
    tableroPanel('E', k, 0, span), tableroPanel('W', k, 0, span),
  ]);
}

// --- Grand staircase: all flights merged, all alfardas merged: 2 parts.
{
  const flightGeoms = [];
  const alfardaGeoms = [];
  for (let k = 0; k < TIERS; k++) {
    const xTop = -wb(k + 1), xBot = -(wb(k) + 2);
    const a0 = y0(k), a1 = y1(k);
    const steps = 12, rise = (a1 - a0) / steps, run = (xTop - xBot) / steps;
    for (let i = 0; i < steps; i++) {
      flightGeoms.push(box(xBot + i * run, xTop + 0.5, a0, a0 + (i + 1) * rise, -STAIR_HALF, STAIR_HALF));
    }
    for (const z of [STAIR_HALF + 1.2, -(STAIR_HALF + 1.2)]) {
      alfardaGeoms.push(strut([xBot + 1, a0 + 0.8, z], [xTop - 0.5, a1 + 0.8, z], 2.2, 2.2));
    }
  }
  addPart('grand-staircase', 'Grand staircase', 'staircase', flightGeoms);
  addPart('stair-alfardas', 'Stair alfardas', 'staircase', alfardaGeoms);
}

// --- Summit: platform, temple platform and altar: 3 parts.
{
  const plat = 29.5;
  addPart('summit-platform', 'Summit platform', 'summit',
    [box(-plat, plat, H, H + 0.8, -plat, plat)]);
  addPart('temple-platform', 'Summit temple platform', 'summit',
    [box(-12, 12, H + 0.8, H + 3.8, -12, 12)]);
  addPart('summit-altar', 'Summit altar', 'summit',
    [box(-2, 2, H + 0.8, H + 2.8, -2, 2)]);
}

// --- Adosada platform: levels merged, feline heads merged: 2 parts.
{
  const levelGeoms = [];
  for (let j = 0; j < 4; j++) {
    const x0 = -160 + j * 6, hz = 62 - 6 * j;
    levelGeoms.push(box(x0, -118, 0, 4 * (j + 1), -hz, hz));
  }
  addPart('adosada-levels', 'Adosada platform levels', 'adosada', levelGeoms);
  const headGeoms = [];
  for (const z of [20, -20]) {
    headGeoms.push(box(-161.5, -159, 4, 7, z - 1.25, z + 1.25));
    headGeoms.push(box(-159, -157.5, 4.5, 6, z - 0.7, z + 0.7));
  }
  addPart('adosada-feline-heads', 'Adosada feline heads', 'adosada', headGeoms);
}

// --- Avenue of the Dead frontage: 3 parts.
addPart('avenue-road', 'Avenue of the Dead roadway', 'avenue',
  [box(-260, -215, 0, 0.5, -250, 250)]);
addPart('avenue-edges', 'Avenue of the Dead edges', 'avenue', [
  box(-262, -260, 0, 1.2, -250, 250),
  box(-215, -213, 0, 1.2, -250, 250),
]);
addPart('forecourt-plaza', 'Forecourt plaza', 'avenue',
  [box(-215, -162, 0, 0.4, -90, 90)]);

// --- Surrounding plaza: three platforms plus merged corner shrines: 4 parts.
addPart('plaza-platform-north', 'Plaza platform north', 'plaza',
  [box(-130, 130, 0, 3, -172, -144)]);
addPart('plaza-platform-south', 'Plaza platform south', 'plaza',
  [box(-130, 130, 0, 3, 144, 172)]);
addPart('plaza-platform-east', 'Plaza platform east', 'plaza',
  [box(144, 172, 0, 3, -130, 130)]);
addPart('plaza-shrines', 'Plaza corner shrines', 'plaza', [
  box(-152, -132, 0, 2, -172, -152), box(-148, -136, 2, 4, -168, -156),
  box(-152, -132, 0, 2, 152, 172), box(-148, -136, 2, 4, 156, 168),
]);

// --- Sacred cave and tunnel: pit plus tunnel merged, cloverleaf chamber: 2 parts.
addPart('cave-pit-and-tunnel', 'Cave pit and tunnel', 'cave', [
  box(-156, -150, -7, 0.5, -3, 3),
  box(-150, -4, -7.5, -4.5, -2, 2),
]);
addPart('cave-cloverleaf-chamber', 'Cave cloverleaf chamber', 'cave', [
  cyl(5, 5, 4, 0, -6, 0, 16),
  cyl(3.5, 3.5, 3.5, 7, -6.25, 0, 12),
  cyl(3.5, 3.5, 3.5, -7, -6.25, 0, 12),
  cyl(3.5, 3.5, 3.5, 0, -6.25, 7, 12),
  cyl(3.5, 3.5, 3.5, 0, -6.25, -7, 12),
]);

// --- Site: ground plane: 1 part.
addPart('site-ground', 'Site ground', 'site',
  [box(-250, 250, -0.6, 0, -250, 250)]);

// ---------------------------------------------------------------- colors
// Schematic light stone-and-plaster palette (the Eiffel Tower is the only
// dark realistic model in the atlas).
function colorFor(id) {
  if (id.endsWith('-body')) return '#bfa87f';
  if (id.endsWith('-talud')) return '#c4a982';
  if (id.endsWith('-tablero')) return '#d9c8a8';
  if (id === 'grand-staircase') return '#b3a08c';
  if (id === 'stair-alfardas') return '#a8906f';
  if (id === 'summit-altar') return '#8a6f52';
  if (id.startsWith('summit-') || id.startsWith('temple-')) return '#d3c4a4';
  if (id === 'adosada-feline-heads') return '#7a5f43';
  if (id.startsWith('adosada-')) return '#bb9c76';
  if (id === 'avenue-road') return '#ddd3bf';
  if (id === 'avenue-edges') return '#c0b39a';
  if (id === 'forecourt-plaza') return '#d5cab2';
  if (id.startsWith('plaza-platform-')) return '#c8b28e';
  if (id === 'plaza-shrines') return '#bfa87f';
  if (id.startsWith('cave-')) return '#8a7a66';
  return '#e8dfcb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'tiers', name: 'Stepped tiers', color: '#c4a982', description: 'The five stepped tiers in the talud-tablero style, as reconstructed in the early 20th century.' },
  { id: 'staircase', name: 'Grand staircase', color: '#b3a08c', description: 'The broad central staircase climbing the west face toward the Avenue of the Dead, with flanking alfarda balustrades.' },
  { id: 'summit', name: 'Summit and temple remnants', color: '#d3c4a4', description: 'The summit platform and the schematic remnants of the temple destroyed before archaeological study.' },
  { id: 'adosada', name: 'Adosada platform', color: '#bb9c76', description: 'The four-level platform built over the original west facade centuries after completion, with sculpted feline heads.' },
  { id: 'avenue', name: 'Avenue of the Dead frontage', color: '#d5cab2', description: 'The 45 m wide north-south avenue running along the west side of the pyramid, shown as a frontage segment with the forecourt plaza.' },
  { id: 'plaza', name: 'Surrounding plaza', color: '#c8b28e', description: 'Low platforms ringing the pyramid, shown in outline.' },
  { id: 'cave', name: 'Sacred cave and tunnel', color: '#8a7a66', description: 'The man-made tunnel and cloverleaf chamber six metres beneath the pyramid, whose entrance was found in 1971.' },
  { id: 'site', name: 'Site', color: '#e8dfcb', description: 'The ground plane of the 500 m site frame.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
for (let k = 0; k < TIERS; k++) {
  const o = ORD[k];
  explanations[`tier ${o} body`] =
    `The solid stepped body of tier ${o}, one of five tiers as reconstructed in the early 20th century. Built of cut tepetate blocks and adobe. Tier heights are schematic.`;
  explanations[`tier ${o} talud faces`] =
    `The sloping talud faces of tier ${o} on all four sides. Tier slope profiles are schematic.`;
  explanations[`tier ${o} tablero panels`] =
    `The vertical tablero panels of tier ${o}, set against the taluds in the classic talud-tablero style of Teotihuacan. Panel sizes are schematic.`;
}
Object.assign(explanations, {
  'grand staircase': 'The broad central staircase climbing the west face toward the Avenue of the Dead. Staircase width, step count and slope are schematic.',
  'stair alfardas': 'The alfarda (balustrade) walls flanking the grand staircase. Exact form is schematic.',
  'summit platform': 'The summit platform at 65 m, the pyramid\u2019s present top. Exact platform extent is schematic.',
  'summit temple platform': 'The base of the summit temple, destroyed by deliberate and natural forces before archaeological study, so the pyramid cannot be tied to any particular deity. Shown as a schematic remnant.',
  'summit altar': 'A schematic altar on the summit platform, evoking the second-phase altar added when the pyramid reached its completed size, which has not survived.',
  'adosada platform levels': 'The four stepped levels of the adosada platform, built over the original west facade a few centuries after the pyramid\u2019s completion. Exact footprint and level heights are schematic.',
  'adosada feline heads': 'Sculpted feline heads set into the adosada platform, stuccoed and painted in multiple colors in antiquity. Exact sculpture is schematic.',
  'avenue of the dead roadway': 'The Avenue of the Dead, the 45 m wide north-south avenue of Teotihuacan, shown as a frontage segment west of the pyramid. The pyramid stands on the avenue\u2019s east side. Segment extent is schematic.',
  'avenue of the dead edges': 'The edge lines of the Avenue of the Dead frontage. Schematic.',
  'forecourt plaza': 'The forecourt plaza between the Avenue of the Dead and the adosada platform. Extent is schematic.',
  'plaza platform north': 'A low platform ringing the pyramid on the north side, shown in outline. Exact position is schematic.',
  'plaza platform south': 'A low platform ringing the pyramid on the south side, shown in outline. Exact position is schematic.',
  'plaza platform east': 'A low platform ringing the pyramid on the east side, shown in outline. Exact position is schematic.',
  'plaza corner shrines': 'Small stepped shrines at the corners of the surrounding plaza. Schematic.',
  'cave pit and tunnel': 'The seven-metre-deep entrance pit at the foot of the main staircase, where Ernesto Taboada found the tunnel entrance in 1971, and the man-made tunnel running to beneath the centre of the pyramid. The tunnel route is schematic.',
  'cave cloverleaf chamber': 'The cloverleaf (quatrefoil) chamber at the end of the tunnel, looted in antiquity and now considered man-made, possibly a royal tomb. Chamber shape is schematic.',
  'site ground': 'The ground plane of the 500 m site frame: the pyramid, its forecourt, the Avenue of the Dead frontage and the surrounding plaza in outline.',
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
const binName = 'pyramid-of-the-sun-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the pyramid-of-the-sun-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Pyramid of the Sun, Teotihuacan, Mexico (simplified schematic)',
  title: 'Pyramid of the Sun',
  location: 'Teotihuacan, Mexico',
  blurb: 'The Pyramid of the Sun at Teotihuacan, Mexico, the largest building of the ancient city, built about 200 AD, in simplified schematic form. Explore {parts} named components across {systems} systems, from the five stepped talud-tablero tiers and the grand west staircase to the summit temple remnants, the later Adosada platform, the Avenue of the Dead frontage, and the sacred cave tunnel beneath the pyramid.',
  sourceUrls: [
    { label: 'Pyramid of the Sun, Wikipedia', url: 'https://en.wikipedia.org/wiki/Pyramid_of_the_Sun' },
    { label: 'Teotihuacan, Wikipedia', url: 'https://en.wikipedia.org/wiki/Teotihuac%C3%A1n' },
    { label: 'Live Science: Teotihuacan, Ancient City of Pyramids', url: 'https://www.livescience.com/22545-teotihuacan.html&lang=en' },
    { label: 'Smarthistory: Pyramid of the Moon and Pyramid of the Sun', url: 'https://smarthistory.org/moon-and-sun-pyramid-teotihuacan' },
    { label: 'e-a-a.com: Pyramid of the Sun architecture', url: 'https://www.e-a-a.com/pyramid-of-the-sun-teotihuacan-mexico/' },
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
  chunks: [{ url: '/models/pyramid-of-the-sun-simple/pyramid-of-the-sun-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.5,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
