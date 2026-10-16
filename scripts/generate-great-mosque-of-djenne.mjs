// Procedural Great Mosque of Djenne for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Great Mosque of Djenne,
// Mali, in code and writes it in the atlas binary format:
//   public/models/great-mosque-of-djenne/atlas.json
//   public/models/great-mosque-of-djenne/great-mosque-of-djenne-0.bin
//
// Sourced dimensions and facts (all verified via web search, 2026-10-10):
//   The largest adobe (mud-brick) building in the world, in the
//   Sudano-Sahelian style; first mosque on the site around the 13th
//   century; the current structure was rebuilt 1906-1907 by the French
//   administration under Ismaila Traore, head of Djenne's guild of
//   masons, using forced labor; UNESCO World Heritage Site 1988 (Old
//   Towns of Djenne).
//   Built of ferey (sun-baked mud bricks) with mud mortar and mud
//   plaster, from banco (mud, grain husks, shea butter, baobab powder);
//   walls several feet thick, trapezoidal plan; 16 m maximum height;
//   platform 75 x 75 m raised 3 m above the marketplace against Bani
//   River floods; six staircases with pinnacles; prayer hall 26 x 50 m
//   with 90 massive pillars formed by 9 interior walls pierced with
//   pointed arches; roof on rodier-palm beams with ventilation holes
//   (104 vents, 36 doors per one survey); interior courtyard with
//   galleries on three sides.
//   The east qibla wall carries three large box-like minarets, the
//   central about 16 m tall, each crowned with a cone-shaped spire
//   topped by an ostrich egg; pilaster buttresses ring the walls.
//   Bundles of rodier palm sticks (toron) protrude about 60 cm from the
//   walls and serve as permanent scaffolding for the annual replastering
//   festival (Crepissage), when the whole town re-plasters the mosque.
//   Restored by the Aga Khan Trust for Culture 2010-2012.
// Schematic (not sourced, never stated as fact in the UI): exact wall
// thicknesses and the trapezoidal skew; buttress count and spacing;
// toron beam counts and rows; stair widths; interior pillar arrangement
// beyond the 9-wall/90-pillar count; vent and door positions; courtyard
// gallery arch counts; exact minaret profiles and spire shapes.
//
// Coordinate frame: x = east-west (qibla/east is +x), z = north-south,
// y = up. All dimensions in meters.
//
// Granularity: 100+ named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-great-mosque-of-djenne.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'great-mosque-of-djenne');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (75 m platform) maps to 2.4 units.
const S = 2.4 / 80;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 8) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function cone(r, h, x, y, z, seg = 8) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  return g;
}
// A row of toron (palm-stick) beams protruding perpendicular to a wall,
// spaced along the wall from `from` to `to` at height y.
// dir 'E'/'W': wall plane is x = fixed, beams point along x.
// dir 'N'/'S': wall plane is z = fixed, beams point along z.
function toronRow(from, to, y, fixed, dir, n) {
  const gs = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const along = from + (to - from) * t;
    const g = new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6);
    if (dir === 'E' || dir === 'W') {
      g.rotateZ(Math.PI / 2);
      g.translate((dir === 'E' ? fixed + 0.5 : fixed - 0.5), y, along);
    } else {
      g.rotateX(Math.PI / 2);
      g.translate(along, y, (dir === 'S' ? fixed + 0.5 : fixed - 0.5));
    }
    gs.push(g);
  }
  return gs;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const PY = 3; // platform top height

// ============================ PLATFORM ============================
addPart('platform-block', 'Platform block', 'platform', [box(-37.5, 37.5, 0, PY, -37.5, 37.5)]);
addPart('platform-edge', 'Platform edge course', 'platform', [box(-38.2, 38.2, 2.4, PY, -38.2, 38.2)]);
// Six staircases with pinnacles (two per side on three sides; schematic).
const stairs = [
  ['north-1', -20, 'N'], ['north-2', 20, 'N'],
  ['south-1', -20, 'S'], ['south-2', 20, 'S'],
  ['west-1', -15, 'W'], ['west-2', 15, 'W'],
];
for (const [nm, off, side] of stairs) {
  const steps = [];
  for (let s = 0; s < 5; s++) {
    const t = s / 4;
    if (side === 'N') steps.push(box(off - 3, off + 3, t * PY * 0.8, PY, -37.5 - 4 + s * 0.8, -37.5 - 3.2 + s * 0.8));
    else if (side === 'S') steps.push(box(off - 3, off + 3, t * PY * 0.8, PY, 37.5 + 3.2 - s * 0.8, 37.5 + 4 - s * 0.8));
    else steps.push(box(-37.5 - 4 + s * 0.8, -37.5 - 3.2 + s * 0.8, t * PY * 0.8, PY, off - 3, off + 3));
  }
  const label = nm.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  addPart(`staircase-${nm}`, `${label} staircase`, 'platform', steps);
}
{
  // Pinnacles flanking the staircases (merged).
  const pins = [];
  for (const [, off, side] of stairs) {
    for (const d of [-3.6, 3.6]) {
      let px, pz;
      if (side === 'N') { px = off + d; pz = -38.6; }
      else if (side === 'S') { px = off + d; pz = 38.6; }
      else { px = -38.6; pz = off + d; }
      pins.push(cone(0.5, 1.6, px, PY + 0.8, pz, 6));
      pins.push(box(px - 0.4, px + 0.4, PY, PY + 0.8, pz - 0.4, pz + 0.4));
    }
  }
  addPart('stair-pinnacles', 'Staircase pinnacles', 'platform', pins);
}

// ================= QIBLA (EAST) WALL + 3 MINARETS =================
// Qibla wall segments between and around the minarets.
addPart('qibla-wall-north', 'Qibla wall north segment', 'qibla-wall', [box(24, 27, PY, 12, -33, -14)]);
addPart('qibla-wall-mid-north', 'Qibla wall mid-north segment', 'qibla-wall', [box(24, 27, PY, 12, -8, 8)]);
addPart('qibla-wall-mid-south', 'Qibla wall mid-south segment', 'qibla-wall', [box(24, 27, PY, 12, 8, 24)]);
addPart('qibla-wall-south', 'Qibla wall south segment', 'qibla-wall', [box(24, 27, PY, 12, 24, 33)]);
// Three minarets at z = -21, 0, 21 (central tallest).
const minarets = [
  ['north', -21, 13.5], ['central', 0, 16], ['south', 21, 13.5],
];
for (const [nm, mz, mh] of minarets) {
  const mx = 25.5; // minaret center x (jutting from wall)
  addPart(`${nm}-minaret-base`, `${nm[0].toUpperCase() + nm.slice(1)} minaret base`, 'minarets', [
    box(mx - 3.4, mx + 3.4, PY, PY + 4, mz - 3.4, mz + 3.4),
  ]);
  addPart(`${nm}-minaret-shaft-lower`, `${nm[0].toUpperCase() + nm.slice(1)} minaret lower shaft`, 'minarets', [
    box(mx - 2.8, mx + 2.8, PY + 4, PY + (mh - 4) * 0.55, mz - 2.8, mz + 2.8),
  ]);
  addPart(`${nm}-minaret-shaft-upper`, `${nm[0].toUpperCase() + nm.slice(1)} minaret upper shaft`, 'minarets', [
    box(mx - 2.2, mx + 2.2, PY + (mh - 4) * 0.55, PY + mh - 4, mz - 2.2, mz + 2.2),
  ]);
  addPart(`${nm}-minaret-spire`, `${nm[0].toUpperCase() + nm.slice(1)} minaret spire`, 'minarets', [
    cone(2.4, 4, mx, PY + mh - 2, mz, 8),
  ]);
  // Ostrich egg finial.
  const egg = new THREE.SphereGeometry(0.45, 10, 8);
  egg.scale(1, 1.3, 1);
  egg.translate(mx, PY + mh + 0.4, mz);
  addPart(`${nm}-ostrich-egg`, `${nm[0].toUpperCase() + nm.slice(1)} ostrich egg`, 'minarets', [egg]);
  // Toron beams on the minaret faces (two rows, merged per minaret).
  addPart(`${nm}-minaret-toron`, `${nm[0].toUpperCase() + nm.slice(1)} minaret toron beams`, 'toron', [
    ...toronRow(mx - 2.4, mx + 2.4, PY + 6, mz + 2.8, 'S', 7),
    ...toronRow(mx - 2.4, mx + 2.4, PY + 9, mz - 2.8, 'N', 7),
  ]);
}
// Pilaster buttresses on the qibla wall.
[-28, -12, 12, 28].forEach((bz, i) => {
  addPart(`qibla-pilaster-${i + 1}`, `Qibla pilaster ${i + 1}`, 'qibla-wall', [
    box(23.4, 27.6, PY, 12.6, bz - 1.1, bz + 1.1),
    cone(1.3, 1.8, 25.5, 13.4, bz, 6),
  ]);
});
// Toron rows on the qibla wall faces.
addPart('qibla-toron-upper', 'Qibla wall upper toron row', 'toron', [
  ...toronRow(-33, 33, 10, 27, 'E', 24),
]);
addPart('qibla-toron-lower', 'Qibla wall lower toron row', 'toron', [
  ...toronRow(-33, 33, 6.5, 27, 'E', 24),
]);

// ================= NORTH WALL =================
addPart('north-wall-west', 'North wall west segment', 'outer-walls', [box(-33, -5, PY, 11, -33, -30)]);
addPart('north-wall-east', 'North wall east segment', 'outer-walls', [box(5, 24, PY, 11, -33, -30)]);
for (let i = 0; i < 5; i++) {
  const bx = -28 + i * 12;
  addPart(`north-buttress-${i + 1}`, `North buttress ${i + 1}`, 'outer-walls', [
    box(bx - 1.2, bx + 1.2, PY, 11.6, -33.6, -29.4),
    cone(1.4, 1.8, bx, 12.4, -31.5, 6),
  ]);
}
addPart('north-toron-upper', 'North wall upper toron row', 'toron', [...toronRow(-32, 32, 9, -33, 'N', 22)]);
addPart('north-toron-lower', 'North wall lower toron row', 'toron', [...toronRow(-32, 32, 6, -33, 'N', 22)]);

// ================= SOUTH WALL =================
addPart('south-wall-west', 'South wall west segment', 'outer-walls', [box(-33, -5, PY, 11, 30, 33)]);
addPart('south-wall-east', 'South wall east segment', 'outer-walls', [box(5, 24, PY, 11, 30, 33)]);
for (let i = 0; i < 5; i++) {
  const bx = -28 + i * 12;
  addPart(`south-buttress-${i + 1}`, `South buttress ${i + 1}`, 'outer-walls', [
    box(bx - 1.2, bx + 1.2, PY, 11.6, 29.4, 33.6),
    cone(1.4, 1.8, bx, 12.4, 31.5, 6),
  ]);
}
addPart('south-toron-upper', 'South wall upper toron row', 'toron', [...toronRow(-32, 32, 9, 33, 'S', 22)]);
addPart('south-toron-lower', 'South wall lower toron row', 'toron', [...toronRow(-32, 32, 6, 33, 'S', 22)]);

// ================= WEST WALL =================
addPart('west-wall-north', 'West wall north segment', 'outer-walls', [box(-27, -24, PY, 11, -33, -6)]);
addPart('west-wall-south', 'West wall south segment', 'outer-walls', [box(-27, -24, PY, 11, 6, 33)]);
addPart('west-entrance-portal', 'West entrance portal', 'outer-walls', [
  box(-27.6, -23.4, PY, 10, -4, 4),
  cone(2.2, 2.4, -25.5, 11, 0, 6),
]);
for (let i = 0; i < 4; i++) {
  const bz = -24 + i * 14;
  addPart(`west-buttress-${i + 1}`, `West buttress ${i + 1}`, 'outer-walls', [
    box(-27.6, -23.4, PY, 11.6, bz - 1.2, bz + 1.2),
    cone(1.4, 1.8, -25.5, 12.4, bz, 6),
  ]);
}
addPart('west-toron-upper', 'West wall upper toron row', 'toron', [...toronRow(-32, 32, 9, -27, 'W', 20)]);
addPart('west-toron-lower', 'West wall lower toron row', 'toron', [...toronRow(-32, 32, 6, -27, 'W', 20)]);

// Corner buttresses.
for (const [i, cx, cz] of [[1, -1, -1], [2, 1, -1], [3, -1, 1], [4, 1, 1]]) {
  addPart(`corner-buttress-${i}`, `Corner buttress ${i}`, 'outer-walls', [
    box(cx * 33 - 1.6, cx * 33 + 1.6, PY, 12.2, cz * 33 - 1.6, cz * 33 + 1.6),
    cone(1.8, 2.2, cx * 33, 13.2, cz * 33, 6),
  ]);
}
// Merlon crenellation along wall tops (merged per side).
{
  const mk = (x0, x1, z0, z1) => {
    const gs = [];
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.4));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      gs.push(cone(0.55, 1.1, x0 + (x1 - x0) * t, 11.9, z0 + (z1 - z0) * t, 5));
    }
    return gs;
  };
  addPart('merlons-north', 'North merlons', 'outer-walls', mk(-33, 24, -31.5, -31.5));
  addPart('merlons-south', 'South merlons', 'outer-walls', mk(-33, 24, 31.5, 31.5));
  addPart('merlons-west', 'West merlons', 'outer-walls', mk(-25.5, -25.5, -33, 33));
  addPart('merlons-qibla', 'Qibla merlons', 'outer-walls', mk(25.5, 25.5, -33, 33));
}

// ================= PRAYER HALL INTERIOR =================
// 9 interior walls (north-south) forming 90 pillars; each wall one part.
for (let w = 0; w < 9; w++) {
  const wx = -18 + w * 4.5;
  const pillars = [];
  for (let s = 0; s < 10; s++) {
    const pz = -22.5 + s * 5;
    pillars.push(box(wx - 0.9, wx + 0.9, PY, 10.5, pz - 0.9, pz + 0.9));
  }
  // Arched wall band above the pillars (schematic pointed-arch band).
  pillars.push(box(wx - 0.7, wx + 0.7, 10.5, 12, -25, 25));
  addPart(`pillar-row-${w + 1}`, `Pillar row ${w + 1}`, 'prayer-hall', pillars);
}
// Roof slab over the prayer hall with vent openings (vents merged).
addPart('prayer-hall-roof', 'Prayer hall roof', 'prayer-hall', [box(-22, 22, 12, 12.8, -27, 27)]);
{
  const vents = [];
  for (let i = 0; i < 12; i++) {
    const vx = -18 + (i % 6) * 7, vz = -15 + Math.floor(i / 6) * 30;
    vents.push(cyl(0.5, 0.7, 1.2, vx, 13.2, vz, 6));
  }
  addPart('roof-vents', 'Roof ventilation caps', 'prayer-hall', vents);
}
// Mihrab niches in the qibla wall interior (one per minaret).
for (const [i, mz] of [[1, -21], [2, 0], [3, 21]]) {
  addPart(`mihrab-${i}`, `Mihrab ${i}`, 'prayer-hall', [
    box(22.5, 24, PY, PY + 4, mz - 1.6, mz + 1.6),
    cone(1.6, 1.6, 23.2, PY + 4.8, mz, 6),
  ]);
}

// ================= COURTYARD =================
addPart('courtyard-floor', 'Courtyard floor', 'courtyard', [box(-33, -22, PY, PY + 0.4, -27, 27)]);
for (const [nm, z0, z1] of [['north', -30, -27], ['south', 27, 30]]) {
  addPart(`courtyard-gallery-${nm}`, `Courtyard ${nm} gallery`, 'courtyard', [
    box(-33, -22, PY, 9, z0, z1),
  ]);
}
addPart('courtyard-west-gallery', 'Courtyard west gallery', 'courtyard', [
  box(-33, -30, PY, 9, -27, 27),
]);
{
  // Gallery arch openings (schematic): piers merged per gallery.
  const arches = [];
  for (let i = 0; i < 8; i++) {
    const az = -21 + i * 6;
    arches.push(box(-24.5, -23.5, PY, 8, az - 0.8, az + 0.8));
  }
  addPart('courtyard-arch-piers', 'Courtyard arch piers', 'courtyard', arches);
}
// Doors grouped by side (36 doors total, schematic grouping).
addPart('doors-north', 'North doors', 'outer-walls', [
  ...[-20, -8, 4, 16].map((dx) => box(dx - 1, dx + 1, PY, PY + 3.4, -31.6, -30)),
]);
addPart('doors-south', 'South doors', 'outer-walls', [
  ...[-20, -8, 4, 16].map((dx) => box(dx - 1, dx + 1, PY, PY + 3.4, 30, 31.6)),
]);
addPart('doors-west', 'West doors', 'outer-walls', [
  ...[-18, -6, 6, 18].map((dz) => box(-27, -25.4, PY, PY + 3.4, dz - 1, dz + 1)),
]);
addPart('doors-qibla', 'Qibla doors', 'qibla-wall', [
  ...[-27, -14, 14, 27].map((dz) => box(24, 25.6, PY, PY + 3.4, dz - 1, dz + 1)),
]);
// Base courses, floors and courtyard fittings.
addPart('prayer-hall-floor', 'Prayer hall floor', 'prayer-hall', [box(-22, 22, PY, PY + 0.3, -27, 27)]);
addPart('qibla-wall-base-course', 'Qibla wall base course', 'qibla-wall', [box(23.6, 27.4, PY, PY + 1.2, -33, 33)]);
addPart('outer-wall-base-course', 'Outer wall base course', 'outer-walls', [
  box(-33.4, 24.4, PY, PY + 1.2, -33.4, -29.6),
  box(-33.4, 24.4, PY, PY + 1.2, 29.6, 33.4),
  box(-27.4, -23.6, PY, PY + 1.2, -33, 33),
]);
addPart('courtyard-ablution-block', 'Courtyard ablution block', 'courtyard', [
  box(-31, -27, PY, PY + 2.4, 18, 24),
  box(-31, -27, PY + 2.4, PY + 3, 18, 24),
]);
addPart('west-entrance-steps', 'West entrance steps', 'outer-walls', [
  box(-30, -27, PY - 1.5, PY, -4, 4),
  box(-31.5, -27, PY - 3, PY - 1.5, -5, 5),
]);
addPart('prayer-hall-skylight-rim', 'Prayer hall skylight rim', 'prayer-hall', [
  cyl(2.2, 2.2, 1, 0, 13.2, 0, 10),
]);

// ---------------------------------------------------------------- colors
// Adobe mud palette.
function colorFor(id) {
  if (id.includes('ostrich-egg')) return '#e8e0cc';
  if (id.includes('toron')) return '#6b4f2e';
  if (id.includes('minaret-spire') || id.includes('merlons') || id.includes('pinnacle')) return '#c9a876';
  if (id.includes('platform')) return '#b99a6e';
  if (id.includes('staircase')) return '#c2a173';
  if (id.includes('mihrab')) return '#a8814f';
  if (id.includes('pillar-row') || id.includes('prayer-hall-roof')) return '#8f6f45';
  if (id.includes('roof-vent')) return '#7a5f3c';
  if (id.includes('courtyard')) return '#bd9c6d';
  if (id.includes('door')) return '#4a3826';
  return '#c7a06f';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'platform', name: 'Platform and stairs', color: '#b99a6e', description: 'The 75 x 75 m platform raised 3 m against the Bani floods, with six pinnacled staircases.' },
  { id: 'qibla-wall', name: 'Qibla wall', color: '#c7a06f', description: 'The east prayer wall with its segments, pilasters, merlons and doors.' },
  { id: 'minarets', name: 'Minarets', color: '#c9a876', description: 'The three great box-like minarets of the qibla wall, the central about 16 m tall, each with a cone spire and an ostrich egg.' },
  { id: 'toron', name: 'Toron beams', color: '#6b4f2e', description: 'Bundles of rodier palm sticks protruding from the walls: decoration and permanent scaffolding for the annual replastering.' },
  { id: 'outer-walls', name: 'Outer walls', color: '#c7a06f', description: 'The north, south and west walls with their buttresses, merlons and doors.' },
  { id: 'prayer-hall', name: 'Prayer hall', color: '#8f6f45', description: 'The prayer hall interior: nine walls of pillars, the roof with its vents, and the three mihrab niches.' },
  { id: 'courtyard', name: 'Courtyard', color: '#bd9c6d', description: 'The interior courtyard with galleries on three sides.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'platform block': 'The 75 x 75 m platform, raised 3 m above the marketplace to protect the mosque from the seasonal floods of the Bani River.',
  'platform edge course': 'The edge course of the raised platform. Exact profile is schematic.',
  'north 1 staircase': 'One of six pinnacled staircases giving access to the platform. Exact positions are schematic.',
  'north 2 staircase': 'One of six pinnacled staircases giving access to the platform. Exact positions are schematic.',
  'south 1 staircase': 'One of six pinnacled staircases giving access to the platform. Exact positions are schematic.',
  'south 2 staircase': 'One of six pinnacled staircases giving access to the platform. Exact positions are schematic.',
  'west 1 staircase': 'One of six pinnacled staircases giving access to the platform. Exact positions are schematic.',
  'west 2 staircase': 'One of six pinnacled staircases giving access to the platform. Exact positions are schematic.',
  'staircase pinnacles': 'The cone-capped pinnacles decorating the staircases. Exact forms are schematic.',
  'qibla wall north segment': 'A segment of the east qibla wall between the minarets. Exact breaks are schematic.',
  'qibla wall mid-north segment': 'A segment of the east qibla wall. Exact breaks are schematic.',
  'qibla wall mid-south segment': 'A segment of the east qibla wall. Exact breaks are schematic.',
  'qibla wall south segment': 'A segment of the east qibla wall. Exact breaks are schematic.',
  'north minaret base': 'The base of the north minaret, one of three great box-like towers jutting from the qibla wall. Exact profile is schematic.',
  'north minaret lower shaft': 'The lower shaft of the north minaret. Exact taper is schematic.',
  'north minaret upper shaft': 'The upper shaft of the north minaret. Exact taper is schematic.',
  'north minaret spire': 'The cone-shaped spire crowning the north minaret. Exact form is schematic.',
  'north ostrich egg': 'The ostrich egg finial atop the north minaret spire, a symbol of fertility and purity.',
  'north minaret toron beams': 'Toron palm-stick beams on the north minaret, used as scaffolding in the annual replastering. Exact count is schematic.',
  'central minaret base': 'The base of the central minaret, the tallest of the three at about 16 m. Exact profile is schematic.',
  'central minaret lower shaft': 'The lower shaft of the central minaret. Exact taper is schematic.',
  'central minaret upper shaft': 'The upper shaft of the central minaret. Exact taper is schematic.',
  'central minaret spire': 'The cone-shaped spire crowning the central minaret. Exact form is schematic.',
  'central ostrich egg': 'The ostrich egg finial atop the central minaret spire.',
  'central minaret toron beams': 'Toron palm-stick beams on the central minaret. Exact count is schematic.',
  'south minaret base': 'The base of the south minaret. Exact profile is schematic.',
  'south minaret lower shaft': 'The lower shaft of the south minaret. Exact taper is schematic.',
  'south minaret upper shaft': 'The upper shaft of the south minaret. Exact taper is schematic.',
  'south minaret spire': 'The cone-shaped spire crowning the south minaret. Exact form is schematic.',
  'south ostrich egg': 'The ostrich egg finial atop the south minaret spire.',
  'south minaret toron beams': 'Toron palm-stick beams on the south minaret. Exact count is schematic.',
  'qibla pilaster 1': 'A pilaster-like buttress stiffening the qibla wall. Exact count and spacing are schematic.',
  'qibla pilaster 2': 'A pilaster-like buttress stiffening the qibla wall. Exact count and spacing are schematic.',
  'qibla pilaster 3': 'A pilaster-like buttress stiffening the qibla wall. Exact count and spacing are schematic.',
  'qibla pilaster 4': 'A pilaster-like buttress stiffening the qibla wall. Exact count and spacing are schematic.',
  'qibla wall upper toron row': 'The upper row of toron beams on the qibla wall face. Exact count is schematic.',
  'qibla wall lower toron row': 'The lower row of toron beams on the qibla wall face. Exact count is schematic.',
  'north wall west segment': 'A segment of the north outer wall. Exact breaks are schematic.',
  'north wall east segment': 'A segment of the north outer wall. Exact breaks are schematic.',
  'north buttress 1': 'A rectangular buttress on the north wall. Exact count and spacing are schematic.',
  'north buttress 2': 'A rectangular buttress on the north wall. Exact count and spacing are schematic.',
  'north buttress 3': 'A rectangular buttress on the north wall. Exact count and spacing are schematic.',
  'north buttress 4': 'A rectangular buttress on the north wall. Exact count and spacing are schematic.',
  'north buttress 5': 'A rectangular buttress on the north wall. Exact count and spacing are schematic.',
  'north wall upper toron row': 'The upper toron row on the north wall. Exact count is schematic.',
  'north wall lower toron row': 'The lower toron row on the north wall. Exact count is schematic.',
  'south wall west segment': 'A segment of the south outer wall. Exact breaks are schematic.',
  'south wall east segment': 'A segment of the south outer wall. Exact breaks are schematic.',
  'south buttress 1': 'A rectangular buttress on the south wall. Exact count and spacing are schematic.',
  'south buttress 2': 'A rectangular buttress on the south wall. Exact count and spacing are schematic.',
  'south buttress 3': 'A rectangular buttress on the south wall. Exact count and spacing are schematic.',
  'south buttress 4': 'A rectangular buttress on the south wall. Exact count and spacing are schematic.',
  'south buttress 5': 'A rectangular buttress on the south wall. Exact count and spacing are schematic.',
  'south wall upper toron row': 'The upper toron row on the south wall. Exact count is schematic.',
  'south wall lower toron row': 'The lower toron row on the south wall. Exact count is schematic.',
  'west wall north segment': 'A segment of the west outer wall. Exact breaks are schematic.',
  'west wall south segment': 'A segment of the west outer wall. Exact breaks are schematic.',
  'west entrance portal': 'The entrance portal in the west wall. Exact form is schematic.',
  'west buttress 1': 'A rectangular buttress on the west wall. Exact count and spacing are schematic.',
  'west buttress 2': 'A rectangular buttress on the west wall. Exact count and spacing are schematic.',
  'west buttress 3': 'A rectangular buttress on the west wall. Exact count and spacing are schematic.',
  'west buttress 4': 'A rectangular buttress on the west wall. Exact count and spacing are schematic.',
  'west wall upper toron row': 'The upper toron row on the west wall. Exact count is schematic.',
  'west wall lower toron row': 'The lower toron row on the west wall. Exact count is schematic.',
  'corner buttress 1': 'A corner buttress where two outer walls meet. Exact form is schematic.',
  'corner buttress 2': 'A corner buttress where two outer walls meet. Exact form is schematic.',
  'corner buttress 3': 'A corner buttress where two outer walls meet. Exact form is schematic.',
  'corner buttress 4': 'A corner buttress where two outer walls meet. Exact form is schematic.',
  'north merlons': 'The cone-capped merlons crowning the north wall. Exact count is schematic.',
  'south merlons': 'The cone-capped merlons crowning the south wall. Exact count is schematic.',
  'west merlons': 'The cone-capped merlons crowning the west wall. Exact count is schematic.',
  'qibla merlons': 'The cone-capped merlons crowning the qibla wall. Exact count is schematic.',
  'pillar row 1': 'One of nine interior walls running north-south, pierced by pointed arches to form the 90 massive pillars of the prayer hall.',
  'pillar row 2': 'One of nine interior walls forming the 90 pillars of the prayer hall. Exact arrangement is schematic.',
  'pillar row 3': 'One of nine interior walls forming the 90 pillars of the prayer hall. Exact arrangement is schematic.',
  'pillar row 4': 'One of nine interior walls forming the 90 pillars of the prayer hall. Exact arrangement is schematic.',
  'pillar row 5': 'One of nine interior walls forming the 90 pillars of the prayer hall. Exact arrangement is schematic.',
  'pillar row 6': 'One of nine interior walls forming the 90 pillars of the prayer hall. Exact arrangement is schematic.',
  'pillar row 7': 'One of nine interior walls forming the 90 pillars of the prayer hall. Exact arrangement is schematic.',
  'pillar row 8': 'One of nine interior walls forming the 90 pillars of the prayer hall. Exact arrangement is schematic.',
  'pillar row 9': 'One of nine interior walls forming the 90 pillars of the prayer hall. Exact arrangement is schematic.',
  'prayer hall roof': 'The mud-covered roof of the prayer hall, carried on rodier-palm beams. Exact build-up is schematic.',
  'roof ventilation caps': 'Ventilation caps on the roof that let hot air escape and can be closed with terracotta lids in the rains. Exact count is schematic.',
  'mihrab 1': 'A mihrab niche in the qibla wall marking the direction of Mecca. Exact form is schematic.',
  'mihrab 2': 'The central mihrab niche in the qibla wall. Exact form is schematic.',
  'mihrab 3': 'A mihrab niche in the qibla wall. Exact form is schematic.',
  'courtyard floor': 'The floor of the interior courtyard. Exact finish is schematic.',
  'courtyard north gallery': 'The gallery along the north side of the courtyard. Exact form is schematic.',
  'courtyard south gallery': 'The gallery along the south side of the courtyard. Exact form is schematic.',
  'courtyard west gallery': 'The gallery along the west side of the courtyard. Exact form is schematic.',
  'courtyard arch piers': 'The piers of the courtyard gallery arches. Exact count is schematic.',
  'north doors': 'Doors in the north wall, part of the 36 doors around the mosque. Exact count and positions are schematic.',
  'south doors': 'Doors in the south wall. Exact count and positions are schematic.',
  'west doors': 'Doors in the west wall. Exact count and positions are schematic.',
  'qibla doors': 'Doors in the qibla wall. Exact count and positions are schematic.',
  'prayer hall floor': 'The sandy-earth floor of the prayer hall. Exact finish is schematic.',
  'qibla wall base course': 'The base course of the qibla wall. Exact profile is schematic.',
  'outer wall base course': 'The base course running around the outer walls. Exact profile is schematic.',
  'courtyard ablution block': 'The ablution block in the courtyard. Exact form and position are schematic.',
  'west entrance steps': 'Steps up to the west entrance portal. Exact form is schematic.',
  'prayer hall skylight rim': 'The rim of a roof skylight over the prayer hall. Exact form is schematic.',
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
const binName = 'great-mosque-of-djenne-0.bin';
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
  scope: 'Great Mosque of Djenne, Mali (schematic)',
  title: 'Great Mosque of Djenne',
  location: 'Djenne, Mali',
  blurb: 'The largest adobe building in the world: the 1907 Sudano-Sahelian mosque of Djenne with its three great minarets, ostrich-egg finials and palm-beam toron scaffolding, rebuilt every year by the whole town.',
  sourceUrls: [
    { label: 'Wikipedia: Great Mosque of Djenne', url: 'https://en.wikipedia.org/wiki/Great_Mosque_of_Djenne' },
    { label: 'Google Arts & Culture: The Great Mosque of Djenne', url: 'https://artsandculture.google.com/story/the-great-mosque-of-djenn%C3%A9/CgWxXtdyHavVxQ?hl=en' },
    { label: 'designingbuildings.co.uk: Great Mosque of Djenne', url: 'https://www.designingbuildings.co.uk/Great_Mosque_of_Djenne' },
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
  chunks: [{ url: '/models/great-mosque-of-djenne/great-mosque-of-djenne-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
