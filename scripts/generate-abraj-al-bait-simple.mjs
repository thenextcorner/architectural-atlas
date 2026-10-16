// Simplified schematic Abraj Al Bait Clock Tower for the Architectural Atlas.
//
// The "simple" variant: same footprint, massing and proportions as the
// detailed model (see scripts/generate-abraj-al-bait.mjs, whose header
// lists every sourced dimension reused here), but coarser: 31 named parts
// across 5 systems instead of 101 across 5. Shaft tiers, clock details
// and flanking towers are merged into group parts.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-abraj-al-bait.mjs for the full attribution):
//   601 m tall central Makkah Royal Clock Tower, completed 2012, seven
//   towers total; four clock faces 43 m in diameter, 98 million glass
//   mosaic pieces, about 2 million LEDs, 21,000 LEDs at the call to
//   prayer; 23 m golden crescent; 93 m spire needle; 76 stories;
//   prayer hall for about 4,000; six flanking hotel/residential towers.
// Schematic (not sourced, never stated as fact in the UI): podium size,
// tier breaks, facade detail, clock housing depth, spire taper, side
// tower heights and crowns, helipad positions.
//
// Writes:
//   public/models/abraj-al-bait-simple/atlas.json
//   public/models/abraj-al-bait-simple/abraj-al-bait-simple-0.bin
//
// Usage: node scripts/generate-abraj-al-bait-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'abraj-al-bait-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (601 m + margin) maps to 2.4 units (same
// as detailed).
const S = 2.4 / 615;

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
function cone(r, h, x, y, z, seg = 8) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// Podium and prayer hall (merged).
addPart('podium', 'Podium', 'podium', [
  box(-75, 75, 0, 45, -55, 55),
  box(-75.6, 75.6, 8, 40, -55.6, 55.6),
]);
addPart('prayer-hall', 'Prayer hall', 'podium', [
  box(-40, 40, 47, 58, -25, 25),
  new THREE.SphereGeometry(14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 58, 0),
]);
addPart('entrances', 'Entrance portals', 'podium', [
  box(-54, -36, 0, 12, -62, -55), box(-24, -6, 0, 12, -62, -55),
  box(6, 24, 0, 12, -62, -55), box(36, 54, 0, 12, -62, -55),
]);

// Central shaft in three merged tiers.
addPart('shaft-lower', 'Lower shaft', 'shaft', [box(-30, 30, 45, 195, -30, 30)]);
addPart('shaft-mid', 'Middle shaft', 'shaft', [box(-24, 24, 195, 345, -24, 24)]);
addPart('shaft-upper', 'Upper shaft', 'shaft', [box(-18, 18, 345, 400, -18, 18)]);
addPart('shaft-glass', 'Shaft glass curtain', 'shaft', [
  box(-30.8, 30.8, 47, 193, -30.8, 30.8),
  box(-24.8, 24.8, 197, 343, -24.8, 24.8),
  box(-18.8, 18.8, 347, 398, -18.8, 18.8),
]);
addPart('shaft-bands', 'Shaft floor bands', 'shaft', [
  box(-31.1, 31.1, 100, 101.6, -31.1, 31.1), box(-31.1, 31.1, 160, 161.6, -31.1, 31.1),
  box(-25.1, 25.1, 250, 251.6, -25.1, 25.1), box(-25.1, 25.1, 310, 311.6, -25.1, 25.1),
  box(-19.1, 19.1, 370, 371.6, -19.1, 19.1),
]);

// Clock section (merged).
addPart('clock-housing', 'Clock housing', 'clock', [box(-24, 24, 398, 452, -24, 24)]);
{
  const faces = [];
  for (const [rx, rz] of [[0, 24], [0, -24], [24, 0], [-24, 0]]) {
    const g = new THREE.CylinderGeometry(21.5, 21.5, 2.2, 24);
    if (rz !== 0) g.rotateX(Math.PI / 2);
    else g.rotateZ(Math.PI / 2);
    g.translate(rx, 425, rz);
    faces.push(g);
  }
  addPart('clock-faces', 'Clock faces', 'clock', faces);
}
addPart('clock-surrounds', 'Clock surrounds', 'clock', [
  box(-26, 26, 446, 449, -26, 26),
  box(-26, 26, 398, 404, -26, 26),
]);
addPart('clock-hands', 'Clock hands', 'clock', [
  box(-0.8, 0.8, 415, 437, 24.5, 25.3), box(-1.1, 1.1, 418, 435, 24.5, 25.3),
  box(-0.8, 0.8, 415, 437, -25.3, -24.5), box(-1.1, 1.1, 418, 435, -25.3, -24.5),
  box(24.5, 25.3, 415, 437, -0.8, 0.8), box(24.5, 25.3, 418, 435, -1.1, 1.1),
  box(-25.3, -24.5, 415, 437, -0.8, 0.8), box(-25.3, -24.5, 418, 435, -1.1, 1.1),
]);
addPart('golden-pillars', 'Golden corner pillars', 'clock', [
  box(-26, -22, 398, 448, -26, -22), box(22, 26, 398, 448, -26, -22),
  box(-26, -22, 398, 448, 22, 26), box(22, 26, 398, 448, 22, 26),
]);

// Upper shaft and spire (merged).
addPart('upper-shaft-top', 'Upper shaft above clock', 'shaft', [box(-14, 14, 452, 508, -14, 14)]);
addPart('spire-needle', 'Spire needle', 'spire', [
  cyl(10, 13, 30, 0, 523, 0, 10),
  cyl(4.5, 9, 35, 0, 555, 0, 8),
  cyl(1.8, 4.5, 30, 0, 587, 0, 8),
]);
addPart('observation-deck', 'Observation deck', 'spire', [cyl(7, 7, 6, 0, 596, 0, 10)]);
{
  const crescent = new THREE.TorusGeometry(11.5, 2.2, 10, 32, Math.PI * 1.45);
  crescent.rotateZ(Math.PI * 0.78);
  crescent.translate(0, 614, 0);
  addPart('golden-crescent', 'Golden crescent', 'spire', [crescent]);
  addPart('crescent-mast', 'Crescent support mast', 'spire', [cyl(1.2, 1.8, 14, 0, 605, 0, 8)]);
}

// Six flanking towers (merged pairs).
const flank = [
  ['hajar-zamzam', [[-110, -80, 260], [110, -80, 240]]],
  ['maqam-qibla', [[-110, 80, 250], [110, 80, 230]]],
  ['safa-marwa', [[0, -110, 210], [0, 110, 200]]],
];
for (const [gid, towers] of flank) {
  const shafts = [], crowns = [];
  for (const [fx, fz, fh] of towers) {
    shafts.push(box(fx - 16, fx + 16, 0, fh - 12, fz - 16, fz + 16));
    crowns.push(box(fx - 13, fx + 13, fh - 12, fh, fz - 13, fz + 13));
    crowns.push(cone(3, 8, fx, fh + 4, fz, 8));
  }
  const label = gid.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' and ');
  addPart(`${gid}-shafts`, `${label} shafts`, 'flanking-towers', shafts);
  addPart(`${gid}-crowns`, `${label} crowns`, 'flanking-towers', crowns);
}
addPart('helipads', 'Helipads', 'flanking-towers', [
  cyl(9, 9, 1.2, -110, 262, -80, 12), cyl(9, 9, 1.2, -110, 252, 80, 12),
]);
addPart('plaza', 'Plaza', 'podium', [box(-90, 90, 0, 1, -110, -70)]);
addPart('podium-canopies', 'Entrance canopies', 'podium', [
  box(-20, 20, 0, 6, 55, 70), box(-20, 20, 0, 6, -70, -55),
]);
addPart('clock-led-band', 'Clock LED band', 'clock', [box(-24.6, 24.6, 446, 449, -24.6, 24.6)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('glass')) return '#7fa3b8';
  if (id.includes('clock-faces')) return '#f2f5f7';
  if (id.includes('surrounds') || id.includes('golden') || id === 'golden-crescent') return '#c9a227';
  if (id.includes('hands')) return '#20242b';
  if (id.includes('prayer')) return '#e8e2d4';
  if (id.includes('spire') || id.includes('observation')) return '#a8a29a';
  if (id.includes('helipad')) return '#4a5560';
  if (id.includes('bands')) return '#9aa2ab';
  return '#cfc9b8';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'podium', name: 'Podium and prayer hall', color: '#d8d2c2', description: 'The podium with the mall, entrances and the prayer hall.' },
  { id: 'shaft', name: 'Tower shaft', color: '#cfc9b8', description: 'The central tower shaft in three tiers with its glass curtain.' },
  { id: 'clock', name: 'Clock section', color: '#c9a227', description: 'The clock housing with four 43 m faces, surrounds, hands and golden pillars.' },
  { id: 'spire', name: 'Spire and crescent', color: '#a8a29a', description: 'The spire needle, observation deck and 23 m golden crescent.' },
  { id: 'flanking-towers', name: 'Flanking towers', color: '#cfc9b8', description: 'The six hotel and residential towers, merged in pairs.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'podium': 'The seven-storey podium at the foot of the tower, holding the shopping mall. Exact footprint is schematic.',
  'prayer hall': 'The prayer hall on the podium roof, with space for about 4,000 worshippers. Exact layout is schematic.',
  'entrance portals': 'The four entrance portals on the Haram-facing side. Exact positions are schematic.',
  'lower shaft': 'The lower section of the central tower shaft. Exact tier breaks are schematic.',
  'middle shaft': 'The middle section of the central tower shaft. Exact tier breaks are schematic.',
  'upper shaft': 'The upper section of the central tower shaft, below the clock. Exact tier breaks are schematic.',
  'shaft glass curtain': 'The glass curtain walls of the shaft tiers. Exact mullion layout is schematic.',
  'shaft floor bands': 'Horizontal bands marking the storeys. Exact spacing is schematic.',
  'clock housing': 'The clock housing block carrying the four faces. Exact dimensions are schematic.',
  'clock faces': 'The four clock faces, 43 m in diameter, the largest in the world, faced with 98 million pieces of glass mosaic.',
  'clock surrounds': 'The LED band below and the Quranic calligraphy band above the clock faces. Exact lettering is schematic.',
  'clock hands': 'The carbon-fiber clock hands: minute hands 22 m, hour hands 17 m. Exact angles are schematic.',
  'golden corner pillars': 'The four golden corner pillars flanking the clock section. Exact form is schematic.',
  'upper shaft above clock': 'The shaft section above the clock. Exact form is schematic.',
  'spire needle': 'The 93 m spire needle above the clock. Exact taper is schematic.',
  'observation deck': 'The lunar observation deck below the crescent. Exact layout is schematic.',
  'golden crescent': 'The golden crescent crowning the tower, 23 m in diameter, the largest crescent in the world.',
  'hajar and zamzam shafts': 'Shafts of the Hajar and Zamzam flanking towers. Exact heights are schematic.',
  'hajar and zamzam crowns': 'Crowns of the Hajar and Zamzam towers. Exact forms are schematic.',
  'maqam and qibla shafts': 'Shafts of the Maqam and Qibla flanking towers. Exact heights are schematic.',
  'maqam and qibla crowns': 'Crowns of the Maqam and Qibla towers. Exact forms are schematic.',
  'safa and marwa shafts': 'Shafts of the Safa and Marwa flanking towers. Exact heights are schematic.',
  'safa and marwa crowns': 'Crowns of the Safa and Marwa towers. Exact forms are schematic.',
  'helipads': 'Two of the seven helipads across the complex. Exact positions are schematic.',
  'plaza': 'The plaza on the Haram-facing side. Exact layout is schematic.',
  'entrance canopies': 'Canopies over the podium entrances. Exact form is schematic.',
  'clock led band': 'The LED band around the clock: 21,000 green and white LEDs light the clock at the call to prayer.',
  'crescent support mast': 'The mast carrying the golden crescent. Exact form is schematic.',
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
const binName = 'abraj-al-bait-simple-0.bin';
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
  scope: 'Abraj Al Bait Clock Tower, Mecca (simplified schematic)',
  title: 'Abraj Al Bait',
  location: 'Mecca, Saudi Arabia',
  blurb: 'The 601 m Makkah Royal Clock Tower in simplified schematic form: podium, setback shaft, four 43 m clock faces and the 23 m golden crescent.',
  sourceUrls: [
    { label: 'Wikipedia: Abraj Al Bait', url: 'https://en.wikipedia.org/wiki/Abraj_Al_Bait' },
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
  chunks: [{ url: '/models/abraj-al-bait-simple/abraj-al-bait-simple-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
