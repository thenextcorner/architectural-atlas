// Procedural Sydney Opera House for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Sydney Opera House in code and
// writes it in the atlas binary format:
//   public/models/sydney-opera-house/atlas.json
//   public/models/sydney-opera-house/sydney-opera-house-0.bin
//
// Sourced dimensions and facts (all verified from the Sydney Opera House
// Wikipedia article, the Structurae entry, the Sydney Opera House Trust
// operational documents, and the official Sydney Opera House stories site,
// opened 2026-09-30):
//   183 m long, 120 m wide, 1.8 ha site; highest roof point 67 m above sea
//   level (the height of a 22 story building); all 14 shells are sections of
//   a single sphere of 75.2 m radius and would combine to form a perfect
//   sphere; roof of 2,194 precast concrete sections weighing up to 15 tonnes
//   each; 2,400 precast ribs and 4,000 roof panels cast by Hornibrook in an
//   on site factory, supported during construction by an adjustable
//   steel-trussed erection arch developed by Hornibrook engineer Joe Bertony;
//   1,056,006 tiles in glossy white and matte cream forming a chevron
//   pattern, made by Hoganas AB of Sweden (the 120 mm square Sydney Tile
//   took three years of development); 588 concrete piers sunk up to 25 m
//   below sea level; podium clad in pink granite aggregate panels quarried at
//   Tarana; glass curtain walls enclose the foyer spaces (Utzon planned
//   prefabricated plywood mullions, but a different system was built);
//   Concert Hall (western shell group) seats 2,679 and holds the Grand Organ,
//   the largest mechanical tracker action organ in the world with over 10,000
//   pipes; Joan Sutherland Theatre (eastern shell group) seats 1,507, called
//   the Opera Theatre until 17 October 2012; its orchestra pit is cramped and
//   considered dangerous to musicians hearing; Drama Theatre 544 seats,
//   Playhouse 398, Studio up to 400, Utzon Room 210; smaller venues sit
//   within the podium beneath the Concert Hall; northern and western foyers
//   are also used for performances; main Box Office Foyer sits beneath the
//   Monumental Steps; Lower Concourse named in the operational plans;
//   Central Passage and Western Broadwalk named on the Opera House visitor
//   map; Forecourt is an open air venue south of the shells for up to 6,000
//   people; Bennelong Restaurant in the smaller shell group on the western
//   side of the Monumental Steps; Monumental Steps plus stone paved forecourt
//   form an outdoor venue with the steps as audience seating; shell scale
//   steps up from low entrance spaces to the high stage towers; perspex
//   acoustic clouds over the Concert Hall stage; the major hall was meant to
//   be multipurpose and its fitted stage machinery was pulled out; podium
//   columns first built too weak and rebuilt; Yallamundi Rooms host up to 400
//   people and were the first new venue inside since the Utzon Room
//   refurbishment of 2004; the building houses a recording studio; architect
//   Jorn Utzon, opened 20 October 1973, interiors completed by Peter Hall.
// Schematic (not sourced, never stated as fact in the UI): podium top height,
// per shell height stepping and placement, tile lid offsets, pedestal and rib
// layout and splits, glass bay divisions, interior volumes and stages,
// foyer and concourse layouts, step group divisions, terrace extents,
// column grid, forecourt and broadwalk section splits.
//
// Granularity: 125 named parts across 8 systems. Every explanation is either
// a sourced fact (see
// ~/workspace/architectural-atlas/research/sydney-opera-house-attribution.md)
// or explicitly marked schematic.
//
// Usage: node scripts/generate-sydney-opera-house.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'sydney-opera-house');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (183 m) maps to 2.4 units.
const R = 75.2; // sphere radius, m (sourced)
const POD_TOP = 14; // schematic podium top height, m
const SHELL_BASE = 16; // schematic shell springing height, m
const S = 2.4 / 183;

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

// A shell blade: a patch of the single 75.2 m sphere. theta in [t0, t1] sets
// the height (radius(cos t0 - cos t1) = h); phi in [-p, p] sets the width.
// The patch is rotated so the blade is wide east-west, deep north-south,
// then recentered with its lowest point at y = 0. The tile lid uses a
// slightly larger radius so it sits just outside the shell surface.
function shellBlade(h, w, radius = R) {
  const t1 = THREE.MathUtils.degToRad(78);
  const t0 = Math.acos(Math.min(1, Math.cos(t1) + h / radius));
  const tm = (t0 + t1) / 2;
  const p = Math.asin(Math.min(0.95, w / (2 * radius * Math.sin(tm))));
  const g = new THREE.SphereGeometry(radius, 40, 26, -p, 2 * p, t0, t1 - t0);
  g.rotateY(Math.PI / 2);
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const tx = -(bb.min.x + bb.max.x) / 2;
  const tz = -(bb.min.z + bb.max.z) / 2;
  const ty = -bb.min.y;
  g.translate(tx, ty, tz);
  return { geo: g, t0, t1, p, tx, ty, tz };
}
function sphPoint(r, theta, phi) {
  return new THREE.Vector3(
    -r * Math.cos(phi) * Math.sin(theta),
    r * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
  );
}
// Schematic precast ribs fanning under a shell blade, in the blade's frame.
// sStart/sEnd select a subrange of the 8 curve segments so the rib run can
// be split into lower (pedestal to midspan) and upper (midspan to apex) parts.
function shellRibs(blade, n = 5, sStart = 0, sEnd = 8) {
  const geoms = [];
  const segs = 8;
  const yAxis = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < n; k++) {
    const phi = n === 1 ? 0 : -blade.p * 0.8 + (blade.p * 1.6 * k) / (n - 1);
    let prev = null;
    for (let s = sStart; s <= sEnd; s++) {
      const th = blade.t0 + ((blade.t1 - blade.t0) * s) / segs;
      const pt = sphPoint(R - 1.2, th, phi);
      pt.applyAxisAngle(yAxis, Math.PI / 2);
      pt.x += blade.tx;
      pt.y += blade.ty;
      pt.z += blade.tz;
      if (prev) geoms.push(strut([prev.x, prev.y, prev.z], [pt.x, pt.y, pt.z], 0.7));
      prev = pt;
    }
  }
  return geoms;
}
function pedestal(bx, bz) {
  const g = new THREE.CylinderGeometry(3.2, 5, SHELL_BASE - POD_TOP, 4, 1);
  g.rotateY(Math.PI / 4);
  g.translate(bx, (POD_TOP + SHELL_BASE) / 2, bz);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Podium: 183 m by 120 m granite base (sourced footprint). 14 parts.
addPart('podium-platform', 'Podium platform', 'podium', [box(-60, 60, 0, POD_TOP, -91.5, 91.5)]);
addPart('podium-paving', 'Podium granite paving', 'podium', [box(-58, 58, POD_TOP, POD_TOP + 0.7, -89.5, 89.5)]);
addPart('podium-seawall', 'Seawall base', 'podium', [box(-63, 63, -3, 1, -94, 94)]);
addPart('podium-terrace-north', 'North podium terrace', 'podium', [box(-45, 45, POD_TOP + 0.7, POD_TOP + 1.4, -88, -72)]);
addPart('podium-terrace-south', 'South podium terrace', 'podium', [box(-45, 45, POD_TOP + 0.7, POD_TOP + 1.4, 72, 88)]);
// Interior levels and spaces of the podium (schematic layout).
addPart('podium-box-office', 'Podium box office level', 'podium', [box(-70, -30, 1, POD_TOP, 20, 80)]);
addPart('podium-concourse', 'Podium concourse level', 'podium', [box(-30, 60, 1, POD_TOP, -58, 58)]);
addPart('podium-foyer-west', 'Western foyer', 'podium', [box(-56, -44, POD_TOP, POD_TOP + 6, -48, 48)]);
addPart('podium-foyer-north', 'Northern foyer', 'podium', [box(-40, 40, POD_TOP, POD_TOP + 6, -74, -58)]);
addPart('podium-passage-central', 'Central Passage', 'podium', [box(-4, 4, POD_TOP, POD_TOP + 5, -72, 72)]);
// Pink granite aggregate facing per face (sourced material, schematic split).
addPart('podium-granite-north', 'Podium granite facing, north face', 'podium', [box(-60, 60, 0, POD_TOP, -92.3, -91.5)]);
addPart('podium-granite-south', 'Podium granite facing, south face', 'podium', [box(-60, 60, 0, POD_TOP, 91.5, 92.3)]);
addPart('podium-granite-east', 'Podium granite facing, east face', 'podium', [box(60, 60.8, 0, POD_TOP, -91.5, 91.5)]);
addPart('podium-granite-west', 'Podium granite facing, west face', 'podium', [box(-60.8, -60, 0, POD_TOP, -91.5, 91.5)]);

// --- Shell groups. Each group steps up from low entrance shells in the south
// to the high stage tower in the north (sourced massing idea). Every shell
// becomes five parts: the shell surface, its tile lid, its pedestal, and
// the lower and upper halves of its precast rib run.
function shellGroup(specs, system) {
  for (const s of specs) {
    const blade = shellBlade(s.h, s.w);
    blade.geo.translate(s.x, SHELL_BASE, s.z);
    addPart(s.id, s.name, system, [blade.geo]);
    const lid = shellBlade(s.h, s.w, R + 0.6);
    lid.geo.translate(s.x, SHELL_BASE, s.z);
    addPart(`${s.id}-tiles`, `${s.name} tile lid`, system, [lid.geo]);
    addPart(`structure-${s.id}-pedestal`, `${s.name} pedestal`, 'structure', [pedestal(s.x, s.z)]);
    const lower = shellRibs(blade, 5, 0, 4).map((g) => g.translate(s.x, SHELL_BASE, s.z));
    addPart(`structure-${s.id}-ribs-lower`, `${s.name} lower ribs`, 'structure', lower);
    const upper = shellRibs(blade, 5, 4, 8).map((g) => g.translate(s.x, SHELL_BASE, s.z));
    addPart(`structure-${s.id}-ribs-upper`, `${s.name} upper ribs`, 'structure', upper);
  }
}
const rowZ = [39, 13, -13, -39, -65];
const concertNotes = [
  'The low entrance shell of the western group, over the Concert Hall.',
  'One of the shells of the western group over the Concert Hall, rising from the low entrance toward the high stage tower.',
  'One of the shells of the western group over the Concert Hall, rising from the low entrance toward the high stage tower.',
  'One of the shells of the western group over the Concert Hall, rising from the low entrance toward the high stage tower.',
  'The high stage tower shell of the western group, over the Concert Hall. The highest roof point is 67 m above sea level, the height of a 22 story building.',
];
const operaNotes = [
  'The low entrance shell of the eastern group, over the Joan Sutherland Theatre, which seats 1,507 and was called the Opera Theatre until 17 October 2012.',
  'One of the shells of the eastern group over the Joan Sutherland Theatre, rising from the low entrance toward the high stage tower.',
  'One of the shells of the eastern group over the Joan Sutherland Theatre, rising from the low entrance toward the high stage tower.',
  'One of the shells of the eastern group over the Joan Sutherland Theatre, rising from the low entrance toward the high stage tower.',
  'The high stage tower shell of the eastern group, over the Joan Sutherland Theatre, the Sydney home of Opera Australia and The Australian Ballet.',
];
const restaurantNote = 'One of the smaller group of shells on the western side of the Monumental Steps, housing the Bennelong Restaurant.';
const concertSpecs = rowZ.map((z, i) => ({
  x: -28, z,
  h: [23, 30, 37, 44, 51][i],
  w: [24, 28, 32, 36, 40][i],
  id: ['shell-concert-entrance', 'shell-concert-2', 'shell-concert-3', 'shell-concert-4', 'shell-concert-stage-tower'][i],
  name: ['Concert Hall entrance shell', 'Concert Hall shell 2', 'Concert Hall shell 3', 'Concert Hall shell 4', 'Concert Hall stage tower shell'][i],
  note: concertNotes[i],
}));
const operaSpecs = rowZ.map((z, i) => ({
  x: 28, z,
  h: [18, 24, 31, 38, 45][i],
  w: [21, 25, 29, 33, 37][i],
  id: ['shell-opera-entrance', 'shell-opera-2', 'shell-opera-3', 'shell-opera-4', 'shell-opera-stage-tower'][i],
  name: ['Opera Theatre entrance shell', 'Opera Theatre shell 2', 'Opera Theatre shell 3', 'Opera Theatre shell 4', 'Opera Theatre stage tower shell'][i],
  note: operaNotes[i],
}));
const restaurantSpecs = [-48, -36, -24, -12].map((x, i) => ({
  x, z: 70,
  h: [17, 14, 11, 8][i],
  w: [22, 19, 16, 13][i],
  id: `shell-restaurant-${i + 1}`,
  name: `Bennelong Restaurant shell ${i + 1}`,
  note: restaurantNote,
}));
shellGroup(concertSpecs, 'shells-concert');
shellGroup(operaSpecs, 'shells-opera');
shellGroup(restaurantSpecs, 'shells-restaurant');
const allShellSpecs = [...concertSpecs, ...operaSpecs, ...restaurantSpecs];

// --- Glass curtain walls of the foyer spaces (sourced element), split into
// schematic bays. 18 parts.
function glassBays(x0, x1, y0, y1, z0, z1, n, idPrefix, namePrefix) {
  for (let i = 0; i < n; i++) {
    const bx0 = x0 + ((x1 - x0) * i) / n;
    const bx1 = x0 + ((x1 - x0) * (i + 1)) / n;
    addPart(`${idPrefix}-bay-${i + 1}`, `${namePrefix}, bay ${i + 1}`, 'glass', [box(bx0, bx1, y0, y1, z0, z1)]);
  }
}
glassBays(-50, -6, SHELL_BASE, 30, 58, 60, 4, 'glass-concert-south', 'Concert Hall south foyer glass');
glassBays(-50, -6, SHELL_BASE, 36, -84, -82, 4, 'glass-concert-north', 'Concert Hall north foyer glass');
glassBays(6, 50, SHELL_BASE, 28, 58, 60, 4, 'glass-opera-south', 'Opera Theatre south foyer glass');
glassBays(6, 50, SHELL_BASE, 33, -84, -82, 4, 'glass-opera-north', 'Opera Theatre north foyer glass');
addPart('glass-restaurant-bay-1', 'Bennelong Restaurant glass walls, bay 1', 'glass', [box(-60, -4, SHELL_BASE, 24, 76, 78)]);
addPart('glass-restaurant-bay-2', 'Bennelong Restaurant glass walls, bay 2', 'glass', [box(-60, -58, SHELL_BASE, 24, 62, 78)]);

// --- Interiors, revealed in exploded view (capacities sourced). 14 parts.
addPart('interior-concert-auditorium', 'Concert Hall auditorium', 'interiors', [box(-48, -8, POD_TOP, 30, -62, 32)]);
addPart('interior-concert-stage', 'Concert Hall stage', 'interiors', [box(-46, -10, 28, 32, -58, -40)]);
addPart('interior-concert-stalls', 'Concert Hall stalls seating', 'interiors', [box(-46, -10, POD_TOP, 24, -36, 30)]);
{
  // Grand Organ pipe cluster (schematic).
  const geoms = [];
  for (let i = 0; i < 10; i++) {
    const h = 6 + (i % 4) * 2;
    const g = new THREE.CylinderGeometry(0.5, 0.5, h, 8);
    g.translate(-34 + (i % 5) * 3, 30 + h / 2, -54 + Math.floor(i / 5) * 3);
    geoms.push(g);
  }
  addPart('interior-grand-organ', 'Grand Organ', 'interiors', geoms);
}
{
  // Perspex acoustic clouds over the stage (sourced element, schematic form).
  const geoms = [];
  for (const [z, y] of [[-44, 34], [-36, 35.5], [-28, 34.5]]) {
    const g = new THREE.TorusGeometry(5, 0.35, 8, 32);
    g.rotateX(Math.PI / 2);
    g.translate(-28, y, z);
    geoms.push(g);
  }
  addPart('interior-acoustic-clouds', 'Concert Hall acoustic clouds', 'interiors', geoms);
}
addPart('interior-joan-sutherland', 'Joan Sutherland Theatre auditorium', 'interiors', [box(8, 48, POD_TOP, 28, -62, 32)]);
addPart('interior-jst-stage', 'Joan Sutherland Theatre stage', 'interiors', [box(12, 44, 26, 30, -58, -40)]);
addPart('interior-jst-pit', 'Joan Sutherland Theatre orchestra pit', 'interiors', [box(12, 44, POD_TOP, POD_TOP + 3, -38, -30)]);
addPart('interior-drama', 'Drama Theatre', 'interiors', [box(-45, -15, 2, 11.9, -25, -5)]);
addPart('interior-playhouse', 'Playhouse', 'interiors', [box(-45, -15, 2, 11.9, 0, 20)]);
addPart('interior-studio', 'Studio', 'interiors', [box(-10, 15, 2, 11.9, -25, 0)]);
addPart('interior-utzon', 'Utzon Room', 'interiors', [box(8, 30, POD_TOP, 20, 45, 60)]);
addPart('interior-yallamundi', 'Yallamundi Rooms', 'interiors', [box(-58, -32, POD_TOP, POD_TOP + 6, 38, 62)]);
addPart('interior-recording', 'Recording studio', 'interiors', [box(36, 52, 2, 11.9, -18, 2)]);

// --- Steps and terraces. 6 parts.
{
  // Monumental Steps: solid stepped flight on the western side (schematic),
  // split into three named flights.
  const stepGeoms = [];
  const n = 13;
  for (let i = 0; i < n; i++) {
    stepGeoms.push(box(-72 + i, -71 + i, 0, (POD_TOP * (i + 1)) / n, 30, 70));
  }
  addPart('steps-monumental-lower', 'Monumental Steps, lower flight', 'steps', stepGeoms.slice(0, 4));
  addPart('steps-monumental-middle', 'Monumental Steps, middle flight', 'steps', stepGeoms.slice(4, 9));
  addPart('steps-monumental-upper', 'Monumental Steps, upper flight', 'steps', stepGeoms.slice(9, 13));
}
addPart('steps-forecourt', 'Forecourt plaza', 'steps', [box(-104, -71.9, 0, 0.8, 18, 82)]);
addPart('steps-broadwalk-north', 'Western broadwalk, north section', 'steps', [box(-72, -59.8, 0, 0.8, -91.5, -36.75)]);
addPart('steps-broadwalk-south', 'Western broadwalk, south section', 'steps', [box(-72, -59.8, 0, 0.8, -36.75, 18)]);

// --- Structure. 45 parts.
{
  // 588 concrete piers (sourced count), schematic grid.
  const geoms = [];
  for (let ix = 0; ix < 21; ix++) {
    for (let iz = 0; iz < 28; iz++) {
      const g = new THREE.CylinderGeometry(1, 1, 25, 6);
      g.translate(-57 + ix * 5.7, -12.5, -88.4 + iz * 6.51);
      geoms.push(g);
    }
  }
  addPart('structure-piers', 'Foundation piers', 'structure', geoms);
}
{
  // Podium columns (schematic grid; the first columns were rebuilt), split
  // into western and eastern colonnades.
  const west = [];
  const east = [];
  for (let ix = 0; ix < 8; ix++) {
    for (let iz = 0; iz < 12; iz++) {
      const g = new THREE.CylinderGeometry(0.8, 0.8, POD_TOP, 8);
      g.translate(-52.5 + ix * 15, POD_TOP / 2, -82.5 + iz * 15);
      (ix < 4 ? west : east).push(g);
    }
  }
  addPart('structure-columns-west', 'Podium columns, west colonnade', 'structure', west);
  addPart('structure-columns-east', 'Podium columns, east colonnade', 'structure', east);
}
// Note: per shell pedestals and rib halves are added in shellGroup above.

// ---------------------------------------------------------------- metadata
const systems = [
  { id: 'podium', name: 'Podium', color: '#9a968e', description: 'The monumental base, 183 m long and 120 m wide, clad in pink granite aggregate panels quarried at Tarana.' },
  { id: 'shells-concert', name: 'Concert Hall shells', color: '#f6f2e7', description: 'The western group of precast concrete shells over the Concert Hall. Each shell is a section of a single 75.2 m sphere, stepping up from low entrance shells to the high stage tower.' },
  { id: 'shells-opera', name: 'Opera Theatre shells', color: '#f2eee1', description: 'The eastern group of shells over the Joan Sutherland Theatre, called the Opera Theatre until 2012. Each shell is a section of a single 75.2 m sphere.' },
  { id: 'shells-restaurant', name: 'Restaurant shells', color: '#ede9da', description: 'The smaller group of shells on the western side of the Monumental Steps, housing the Bennelong Restaurant.' },
  { id: 'glass', name: 'Glass walls', color: '#7fa3b8', description: 'Glass curtain walls enclosing the foyer spaces between the podium and the shells.' },
  { id: 'interiors', name: 'Interiors', color: '#c98f4e', description: 'Performance venues inside the podium and beneath the shells, from the 2,679 seat Concert Hall to the 210 seat Utzon Room.' },
  { id: 'steps', name: 'Steps and terraces', color: '#b3aea1', description: 'The stone paved forecourt, the Monumental Steps, and the western broadwalk, used as an outdoor performance space.' },
  { id: 'structure', name: 'Structure', color: '#8b8e91', description: 'The 588 concrete piers under the building, the podium columns, and the pedestals and ribs carrying the shells.' },
];
const explanations = {
  'podium platform': 'The monumental podium measures 183 m long and 120 m wide and covers 1.8 hectares. Its exterior is clad in aggregate panels of pink granite quarried at Tarana.',
  'podium granite paving': 'Granite paving tops the podium. Utzon first intended to leave the podium open down to the water; the built version was clad and paved instead.',
  'seawall base': 'Schematic base at the waterline. The building stands on 588 concrete piers sunk as much as 25 m below sea level.',
  'north podium terrace': 'Schematic terrace at the north end of the podium. Substantial open public spaces ring the whole podium.',
  'south podium terrace': 'Schematic terrace at the south end of the podium, beside the Bennelong Restaurant shells.',
  'podium box office level': 'The main Box Office Foyer sits beneath the Monumental Steps; the Opera House\'s own renewal notes describe a new lift and a visitor lounge added there. Interior layout is schematic.',
  'podium concourse level': 'The concourse level inside the podium. The Opera House\'s own operational plans name the Lower Concourse, and visitor guidance describes crossing from the Forecourt to the concourse entrance. Layout is schematic.',
  'western foyer': 'The western foyer of the podium. The northern and western foyers are also used for performances on an occasional basis. Foyer layout is schematic.',
  'northern foyer': 'The northern foyer of the podium. The northern and western foyers are also used for performances on an occasional basis. Foyer layout is schematic.',
  'central passage': 'The Central Passage runs through the podium on the Opera House\'s own visitor map. Layout is schematic.',
  'concert hall auditorium': 'The Concert Hall seats 2,679 and is home to the Sydney Symphony Orchestra. It began as a multipurpose opera and concert hall, and the fitted stage machinery was later pulled out.',
  'concert hall stage': 'The stage of the Concert Hall. The major hall was originally intended as a multipurpose opera and concert hall; the stage machinery already designed and fitted was pulled out and largely thrown away. Stage geometry is schematic.',
  'concert hall stalls seating': 'Seating terraces of the Concert Hall, which seats 2,679 and is home to the Sydney Symphony Orchestra. Layout is schematic.',
  'grand organ': 'The Sydney Opera House Grand Organ is the largest mechanical tracker action organ in the world, with over 10,000 pipes.',
  'concert hall acoustic clouds': 'Perspex rings hung over the Concert Hall stage shortly before opening, an attempt to give the musicians better early reflections.',
  'joan sutherland theatre auditorium': 'The Joan Sutherland Theatre seats 1,507 and is the Sydney home of Opera Australia and The Australian Ballet. It was called the Opera Theatre until 17 October 2012.',
  'joan sutherland theatre stage': 'The stage of the Joan Sutherland Theatre, a proscenium theatre with 1,507 seats, the Sydney home of Opera Australia and The Australian Ballet. Stage geometry is schematic.',
  'joan sutherland theatre orchestra pit': 'The orchestra pit of the Joan Sutherland Theatre. The pit is cramped and considered dangerous to musicians\' hearing. Pit geometry is schematic.',
  'drama theatre': 'The Drama Theatre seats 544. The smaller venues sit within the podium, beneath the Concert Hall.',
  'playhouse': 'The Playhouse seats 398 and sits within the podium, beneath the Concert Hall.',
  'studio': 'The Studio holds up to 400 people depending on configuration and sits within the podium, beneath the Concert Hall.',
  'utzon room': 'The Utzon Room seats 210. Rebuilt to Utzon\u2019s own design and opened in 2004, it holds his tapestry Homage to Carl Philipp Emanuel Bach.',
  'yallamundi rooms': 'The Yallamundi Rooms, a function space hosting up to 400 people, the first new venue created inside the Opera House since the Utzon Room refurbishment of 2004. Room geometry is schematic.',
  'recording studio': 'The building houses a recording studio among its other facilities. Layout is schematic.',
  'monumental steps, lower flight': 'The lower flight of the Monumental Steps on the western side of the podium. Together with the forecourt they form an outdoor venue, with the steps doubling as audience seating. Step divisions are schematic.',
  'monumental steps, middle flight': 'The middle flight of the Monumental Steps on the western side of the podium. Together with the forecourt they form an outdoor venue, with the steps doubling as audience seating. Step divisions are schematic.',
  'monumental steps, upper flight': 'The upper flight of the Monumental Steps on the western side of the podium. Together with the forecourt they form an outdoor venue, with the steps doubling as audience seating. Step divisions are schematic.',
  'forecourt plaza': 'The large stone paved forecourt beside the Monumental Steps. The Opera House Trust describes the Forecourt as an open air venue south of the shells that accommodates up to 6,000 people.',
  'western broadwalk, north section': 'The northern section of the Western Broadwalk along the western edge of the building. The Opera House\'s own site plans name the Forecourt, Monumental Steps and Western Broadwalk as the outdoor event spaces. Section divisions are schematic.',
  'western broadwalk, south section': 'The southern section of the Western Broadwalk along the western edge of the building. The Opera House\'s own site plans name the Forecourt, Monumental Steps and Western Broadwalk as the outdoor event spaces. Section divisions are schematic.',
  'foundation piers': 'The building stands on 588 concrete piers sunk as much as 25 m below sea level.',
  'podium columns, west colonnade': 'Schematic columns inside the podium, western half. The first podium columns were not strong enough to support the roof and had to be rebuilt.',
  'podium columns, east colonnade': 'Schematic columns inside the podium, eastern half. The first podium columns were not strong enough to support the roof and had to be rebuilt.',
};
for (const face of ['north', 'south', 'east', 'west']) {
  explanations[`podium granite facing, ${face} face`] = `Pink granite aggregate panels quarried at Tarana clad the ${face} face of the podium. The per face division is schematic.`;
}
const glassBayNote = 'Glass curtain walls enclose the foyer spaces between the podium and the shells. Utzon planned a system of prefabricated plywood mullions for the glass, but a different system was built. Bay divisions are schematic.';
for (const wall of ['concert hall south foyer glass', 'concert hall north foyer glass', 'opera theatre south foyer glass', 'opera theatre north foyer glass']) {
  for (let i = 1; i <= 4; i++) explanations[`${wall}, bay ${i}`] = glassBayNote;
}
explanations['bennelong restaurant glass walls, bay 1'] = 'Glass walls enclose the Bennelong Restaurant beneath its smaller group of shells. Bay divisions are schematic.';
explanations['bennelong restaurant glass walls, bay 2'] = 'Glass walls enclose the Bennelong Restaurant beneath its smaller group of shells. Bay divisions are schematic.';
// Per shell explanations: shell surface, tile lid, pedestal, lower and
// upper rib halves. Every fact below is sourced; unsourced geometry is
// marked schematic.
const shellCore = 'Each shell is a section of a single sphere 75.2 m in radius; the 14 shells of the building would combine to form a perfect sphere. The shells are precast concrete panels supported by precast concrete ribs.';
const tileCore = 'The tile lid carries the shells\' chevron pattern of 1,056,006 tiles in two colours, glossy white and matte cream, made by the Swedish company H\u00f6gan\u00e4s AB; the 120 mm square Sydney Tile took three years of development. Tile layout is schematic.';
for (const s of allShellSpecs) {
  const ln = s.name.toLowerCase();
  explanations[ln] = `${s.note} ${shellCore} Shell placement and dimensions are schematic.`;
  explanations[`${ln} tile lid`] = `Tile lid of the ${ln}. ${tileCore}`;
  explanations[`${ln} pedestal`] = `Schematic concrete pedestal under the ${ln}. The shells are precast concrete panels supported by precast concrete ribs; Hornibrook cast 2,400 precast ribs and 4,000 roof panels in an on site factory.`;
  explanations[`${ln} lower ribs`] = `Schematic lower half of the precast concrete ribs fanning from the pedestal toward the apex of the ${ln}. Hornibrook manufactured the 2,400 precast ribs in an on site factory, supporting them during construction with an adjustable steel-trussed erection arch developed by Hornibrook engineer Joe Bertony.`;
  explanations[`${ln} upper ribs`] = `Schematic upper half of the precast concrete ribs running to the apex of the ${ln}. The 1961 spherical solution let arches of varying length be cast in a common mould and placed adjacent to one another to form the spherical section.`;
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
  const idx = merged.index.array;
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
const binName = 'sydney-opera-house-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the sydney-opera-house directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Sydney Opera House, Sydney',
  title: 'Sydney Opera House',
  location: 'Sydney, Australia',
  blurb: 'J\u00f8rn Utzon\u2019s 1973 performing arts centre on Sydney Harbour. Its precast concrete shells are all sections of a single 75.2 m sphere, set on a granite podium.',
  sourceUrls: [
    { label: 'Wikipedia: Sydney Opera House', url: 'https://en.wikipedia.org/wiki/Sydney_Opera_House' },
    { label: 'Structurae: Sydney Opera House', url: 'https://structurae.net/en/structures/sydney-opera-house' },
    { label: 'Sydney Opera House: Renewing an icon (official stories)', url: 'https://stories.sydneyoperahouse.com/renewing-an-icon/' },
    { label: 'Sydney Opera House Trust: Regulatory Impact Statement (Forecourt capacity)', url: 'https://sydneyoperahouse.api.collaboro.com/media/regulatory-impact-statement' },
    { label: 'Sydney Opera House: visitor map (Broadwalk, Central Passage, Box Office)', url: 'https://sydneyoperahouse.api.collaboro.com/media/open-house-weekend-digital-map' },
  ],
  systems,
  explanations,
  parts: records.map((r) => ({
    id: r.part.id,
    name: r.part.name,
    conceptId: r.part.id,
    system: r.part.system,
    chunk: 0,
    positions: r.posOff,
    normals: r.norOff,
    indices: r.idxOff,
    vertexCount: r.vertexCount,
    indexCount: r.indexCount,
    bounds: r.bounds,
  })),
  concepts: records.map((r) => ({ id: r.part.id, name: r.part.name, elements: [r.part.id] })),
  chunks: [{ url: '/models/sydney-opera-house/sydney-opera-house-0.bin', bytes: offset }],
  triangles,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
