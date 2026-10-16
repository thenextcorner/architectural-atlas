// Procedural Winter Palace for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Winter Palace in code and
// writes it in the atlas binary format:
//   public/models/winter-palace/atlas.json
//   public/models/winter-palace/winter-palace-0.bin
//
// Sourced dimensions and facts (verified via web search, 2026-10-10,
// primarily Wikipedia "Winter Palace"):
//   official residence of the Russian emperors (House of Romanov) from
//   1732 to 1917, in St. Petersburg between Palace Embankment (Neva)
//   and Palace Square; now houses the Hermitage Museum; the present
//   palace built 1754 to 1762 to the design of Italian architect
//   Bartolomeo Rastrelli in the Elizabethan Baroque style, for Empress
//   Elizabeth (who died before completion; Catherine the Great and her
//   successors occupied it); green-and-white, elongated rectangle;
//   principal facade 215 m (705 ft) long and 30 m (98 ft) high;
//   1,886 doors, 1,945 windows, 1,500 rooms, 117 staircases; floor area
//   233,345 sqm; total area 14.2 hectares; severely damaged by fire in
//   1837 and immediately rebuilt with the exterior unchanged but much
//   of the interior redesigned; the parapet lined with statues and
//   vases; the south facade has three arches leading into the main
//   ceremonial courtyard; the storming of the palace in 1917, recreated
//   in Sergei Eisenstein's 1928 film October, became the symbol of the
//   October Revolution (the real storming was far quieter than the
//   film's version).
// Schematic (not sourced, never stated as fact in the UI): exact
// building depth and courtyard dimensions (modeled as 215 by 80 m with
// a 100 by 40 m courtyard); bay subdivisions; pilaster rhythms; window
// counts and positions; parapet statue and vase placement; roof
// profiles; interior room volumes and positions (Jordan Staircase,
// state rooms); rustication detail.
//
// Coordinate frame: x = long axis (facade), z = depth (Neva is -z
// north, Palace Square is +z south), y = up. All dimensions in meters.
//
// Granularity: 100+ named parts across 7 systems.
//
// Usage: node scripts/generate-winter-palace.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'winter-palace');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (215 m) maps to 2.4 units.
const S = 2.4 / 215;

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

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const L = 215, H = 30, D = 80;
const X0 = -L / 2, X1 = L / 2;
const ZN0 = -D / 2, ZN1 = -D / 2 + 12; // north wing depth
const ZS0 = D / 2 - 12, ZS1 = D / 2;   // south wing depth
// courtyard: 100 by 40
const CX0 = -50, CX1 = 50, CZ0 = -20, CZ1 = 20;

// --- Facades: north (Neva), south (Palace Square), east, west.
// Each bay: rusticated ground floor, piano nobile, attic.
function facadeBay(fid, fname, x0, x1, zFace, dir) {
  const t = 1.2; // wall thickness
  const z0 = dir > 0 ? zFace - t : zFace;
  const z1 = dir > 0 ? zFace : zFace + t;
  addPart(`${fid}-ground`, `${fname} rusticated ground floor`, 'facades', [
    box(x0, x1, 0, 9, z0, z1),
  ]);
  addPart(`${fid}-piano-nobile`, `${fname} piano nobile`, 'facades', [
    box(x0, x1, 9, 22, z0, z1),
  ]);
  addPart(`${fid}-attic`, `${fname} attic storey`, 'facades', [
    box(x0, x1, 22, H, z0, z1),
  ]);
  // pilasters
  const pil = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const px = x0 + (i * (x1 - x0)) / n;
    pil.push(box(px - 0.8, px + 0.8, 9, 26, dir > 0 ? zFace - 0.5 : zFace, dir > 0 ? zFace : zFace + 0.5));
  }
  addPart(`${fid}-pilasters`, `${fname} pilasters`, 'colonnade', pil);
  // window bands per floor
  for (const [fl, fy0, fy1] of [['ground', 2, 7], ['piano', 11, 19]]) {
    const wins = [];
    const nw = Math.max(4, Math.floor((x1 - x0) / 8));
    for (let wi = 0; wi < nw; wi++) {
      const wx = x0 + 5 + (wi * (x1 - x0 - 10)) / Math.max(1, nw - 1);
      wins.push(box(wx - 1.2, wx + 1.2, fy0, fy1, dir > 0 ? zFace - 0.4 : zFace - 0.1, dir > 0 ? zFace + 0.1 : zFace + 0.4));
    }
    addPart(`${fid}-${fl}-windows`, `${fname} ${fl} floor windows`, 'facades', wins);
  }
}

// North facade (Neva): 3 bays
const bayW = L / 3;
for (let b = 0; b < 3; b++) {
  const x0 = X0 + b * bayW, x1 = X0 + (b + 1) * bayW;
  facadeBay(`neva-bay-${b + 1}`, `Neva facade bay ${b + 1}`, x0, x1, ZN0, -1);
}
// South facade (Palace Square): 3 bays
for (let b = 0; b < 3; b++) {
  const x0 = X0 + b * bayW, x1 = X0 + (b + 1) * bayW;
  facadeBay(`square-bay-${b + 1}`, `Palace Square facade bay ${b + 1}`, x0, x1, ZS1, 1);
}
// Three arches on the south facade into the courtyard
for (let a = 0; a < 3; a++) {
  const ax = -20 + a * 20;
  addPart(`south-arch-${a + 1}`, `Palace Square arch ${a + 1}`, 'courtyard', [
    box(ax - 4, ax + 4, 0, 9, ZS0, ZS1),
    box(ax - 4, ax - 2.5, 9, 12, ZS0, ZS1),
    box(ax + 2.5, ax + 4, 9, 12, ZS0, ZS1),
    cyl(2.5, 2.5, ZS1 - ZS0, ax, 10, (ZS0 + ZS1) / 2, 12, 1),
  ]);
}
// East and west facades: 2 bays each (rotated)
for (const [eid, ename, zc] of [['east', 'East', 0], ['west', 'West', 0]]) {
  void zc;
  const xFace = eid === 'east' ? X1 : X0;
  const dir = eid === 'east' ? 1 : -1;
  for (let b = 0; b < 2; b++) {
    const z0 = -D / 2 + b * (D / 2), z1 = -D / 2 + (b + 1) * (D / 2);
    const fid = `${eid}-bay-${b + 1}`;
    const fname = `${ename} facade bay ${b + 1}`;
    const t = 1.2;
    const xa = dir > 0 ? xFace - t : xFace;
    const xb = dir > 0 ? xFace : xFace + t;
    addPart(`${fid}-ground`, `${fname} rusticated ground floor`, 'facades', [box(xa, xb, 0, 9, z0, z1)]);
    addPart(`${fid}-piano-nobile`, `${fname} piano nobile`, 'facades', [box(xa, xb, 9, 22, z0, z1)]);
    addPart(`${fid}-attic`, `${fname} attic storey`, 'facades', [box(xa, xb, 22, H, z0, z1)]);
    const pil = [];
    for (let i = 0; i <= 4; i++) {
      const pz = z0 + (i * (z1 - z0)) / 4;
      pil.push(box(dir > 0 ? xFace - 0.5 : xFace, dir > 0 ? xFace : xFace + 0.5, 9, 26, pz - 0.8, pz + 0.8));
    }
    addPart(`${fid}-pilasters`, `${fname} pilasters`, 'colonnade', pil);
  }
}

// --- Bay cornices: one per facade bay.
for (const [cid, cname, x0, x1, zFace, dir] of [
  ['neva-1', 'Neva bay 1', X0, X0 + bayW, ZN0, -1],
  ['neva-2', 'Neva bay 2', X0 + bayW, X0 + 2 * bayW, ZN0, -1],
  ['neva-3', 'Neva bay 3', X0 + 2 * bayW, X1, ZN0, -1],
  ['square-1', 'Palace Square bay 1', X0, X0 + bayW, ZS1, 1],
  ['square-2', 'Palace Square bay 2', X0 + bayW, X0 + 2 * bayW, ZS1, 1],
  ['square-3', 'Palace Square bay 3', X0 + 2 * bayW, X1, ZS1, 1],
]) {
  addPart(`${cid}-cornice`, `${cname} cornice`, 'facades', [
    box(x0 - 0.6, x1 + 0.6, 26, 27.5, dir > 0 ? zFace - 0.8 : zFace - 0.2, dir > 0 ? zFace + 0.2 : zFace + 0.8),
  ]);
}
for (const [cid, cname, xFace, dir] of [['east', 'East', X1, 1], ['west', 'West', X0, -1]]) {
  for (let b = 0; b < 2; b++) {
    const z0 = -D / 2 + b * (D / 2), z1 = -D / 2 + (b + 1) * (D / 2);
    addPart(`${cid}-bay-${b + 1}-cornice`, `${cname} bay ${b + 1} cornice`, 'facades', [
      box(dir > 0 ? xFace - 0.8 : xFace - 0.2, dir > 0 ? xFace + 0.2 : xFace + 0.8, 26, 27.5, z0 - 0.6, z1 + 0.6),
    ]);
  }
}

// --- Entrance portals: one per facade.
addPart('neva-portal', 'Neva entrance portal', 'facades', [
  box(-8, 8, 0, 12, ZN0 - 2, ZN0 + 1),
  cyl(3, 3, 2, 0, 13, ZN0 - 0.5, 12, 1),
]);
addPart('square-portal', 'Palace Square entrance portal', 'facades', [
  box(-8, 8, 0, 12, ZS1 - 1, ZS1 + 2),
  cyl(3, 3, 2, 0, 13, ZS1 + 0.5, 12, 1),
]);
addPart('east-portal', 'East entrance portal', 'facades', [
  box(X1 - 1, X1 + 2, 0, 12, -8, 8),
]);
addPart('west-portal', 'West entrance portal', 'facades', [
  box(X0 - 2, X0 + 1, 0, 12, -8, 8),
]);

// --- Alexander Column on Palace Square, in front of the palace.
addPart('alexander-column', 'Alexander Column', 'courtyard', [
  cyl(1.8, 2.2, 25, 0, 12.5, ZS1 + 45, 12),
  box(-4, 4, 0, 3, ZS1 + 41, ZS1 + 49),
  box(-3, 3, 25, 28, ZS1 + 42, ZS1 + 48),
  cyl(0.8, 1.0, 4, 0, 30, ZS1 + 45, 8),
]);

// --- Parapet balustrades between statue groups.
for (const [pid, pname, zFace] of [['neva', 'Neva', ZN0], ['square', 'Palace Square', ZS1]]) {
  const bal = [];
  for (let i = 0; i < 11; i++) {
    const sx0 = X0 + 8 + (i * (L - 16)) / 11;
    const sx1 = X0 + 8 + ((i + 1) * (L - 16)) / 11;
    bal.push(box(sx0, sx1, H, H + 1, zFace - 0.3, zFace + 0.3));
  }
  addPart(`${pid}-balustrade`, `${pname} parapet balustrade`, 'parapet', bal);
}

// --- Courtyard fountain.
addPart('courtyard-fountain', 'Courtyard fountain', 'courtyard', [
  cyl(4, 4.5, 1.2, 0, 0.6, 0, 12),
  cyl(0.4, 0.4, 3, 0, 2, 0, 8),
]);
addPart('courtyard-east-gate', 'Courtyard east gate', 'courtyard', [
  box(CX1 - 1, CX1 + 2, 0, 8, -3, 3),
]);
addPart('courtyard-west-gate', 'Courtyard west gate', 'courtyard', [
  box(CX0 - 2, CX0 + 1, 0, 8, -3, 3),
]);
addPart('square-staircase', 'Palace Square staircase', 'courtyard', [
  box(-15, 15, -1.5, 0, ZS1, ZS1 + 8),
  box(-15, 15, -3, -1.5, ZS1 + 8, ZS1 + 14),
]);
addPart('neva-embankment', 'Neva embankment wall', 'courtyard', [
  box(X0 - 5, X1 + 5, -4, 0, ZN0 - 8, ZN0 - 4),
]);
for (const [pid, pname, zFace] of [['neva', 'Neva', ZN0], ['square', 'Palace Square', ZS1]]) {
  const statues = [];
  const vases = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const sx = X0 + 8 + (i * (L - 16)) / (n - 1);
    if (i % 2 === 0) {
      statues.push(cyl(0.5, 0.7, 3.5, sx, H + 1.75, zFace, 8));
      statues.push(new THREE.SphereGeometry(0.4, 8, 6).translate(sx, H + 3.8, zFace));
    } else {
      vases.push(cyl(0.9, 0.5, 1.8, sx, H + 0.9, zFace, 8));
    }
  }
  addPart(`${pid}-parapet-statues`, `${pname} parapet statues`, 'parapet', statues);
  addPart(`${pid}-parapet-vases`, `${pname} parapet vases`, 'parapet', vases);
}
for (const [pid, pname, xFace] of [['east', 'East', X1], ['west', 'West', X0]]) {
  const statues = [];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const sz = -D / 2 + 8 + (i * (D - 16)) / (n - 1);
    statues.push(cyl(0.5, 0.7, 3.5, xFace, H + 1.75, sz, 8));
  }
  addPart(`${pid}-parapet-statues`, `${pname} parapet statues`, 'parapet', statues);
}

// --- Roof volumes.
addPart('roof-north', 'North roof', 'roof', [box(X0, X1, H, H + 5, ZN0, ZN1)]);
addPart('roof-south', 'South roof', 'roof', [box(X0, X1, H, H + 5, ZS0, ZS1)]);
addPart('roof-east', 'East roof', 'roof', [box(X1 - 12, X1, H, H + 5, ZN1, ZS0)]);
addPart('roof-west', 'West roof', 'roof', [box(X0, X0 + 12, H, H + 5, ZN1, ZS0)]);

// --- Inner courtyard walls.
addPart('courtyard-north-wall', 'Courtyard north wall', 'courtyard', [box(CX0, CX1, 0, 22, CZ0 - 1, CZ0)]);
addPart('courtyard-south-wall', 'Courtyard south wall', 'courtyard', [box(CX0, CX1, 0, 22, CZ1, CZ1 + 1)]);
addPart('courtyard-east-wall', 'Courtyard east wall', 'courtyard', [box(CX1, CX1 + 1, 0, 22, CZ0, CZ1)]);
addPart('courtyard-west-wall', 'Courtyard west wall', 'courtyard', [box(CX0 - 1, CX0, 0, 22, CZ0, CZ1)]);
addPart('courtyard-paving', 'Courtyard paving', 'courtyard', [box(CX0, CX1, -0.4, 0, CZ0, CZ1)]);

// --- Interiors: Jordan Staircase and state rooms.
addPart('jordan-staircase', 'Jordan Staircase', 'interiors', [
  box(20, 50, 0, 18, -10, 10),
  box(20, 35, 0, 9, -10, 10),
  box(35, 50, 9, 18, -10, 10),
]);
addPart('jordan-columns', 'Jordan Staircase columns', 'interiors', [
  cyl(0.6, 0.7, 14, 25, 7, -8, 10),
  cyl(0.6, 0.7, 14, 25, 7, 8, 10),
  cyl(0.6, 0.7, 14, 45, 7, -8, 10),
  cyl(0.6, 0.7, 14, 45, 7, 8, 10),
]);
const stateRooms = [
  ['malachite', 'Malachite Room', -60, -40],
  ['white', 'White Hall', -35, -15],
  ['gold', 'Gold Drawing Room', -10, 10],
  ['concert', 'Concert Hall', 55, 75],
  ['throne', 'St. George Hall', 80, 100],
];
for (const [rid, rname, rx0, rx1] of stateRooms) {
  addPart(`room-${rid}`, rname, 'interiors', [box(rx0, rx1, 9, 20, ZN1, ZS0)]);
}
addPart('state-corridor', 'State corridor', 'interiors', [
  box(X0 + 10, X1 - 10, 9, 14, -5, 5),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('statue')) return '#8f8f8f';
  if (id.includes('vase')) return '#7a7a7a';
  if (id.includes('pilaster')) return '#f0ead8';
  if (id.includes('ground')) return '#c9bfa5';
  if (id.includes('piano') || id.includes('attic')) return '#a8c0a0';
  if (id.includes('window')) return '#3a4a3a';
  if (id.includes('roof')) return '#5a6b5a';
  if (id.includes('arch')) return '#d8d0b8';
  if (id.includes('jordan') || id.includes('room-') || id.includes('corridor')) return '#e8dcc0';
  if (id.includes('courtyard')) return '#b8b09a';
  return '#a8c0a0';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'facades', name: 'Facades', color: '#a8c0a0', description: 'The green-and-white Baroque facades: rusticated ground floor, piano nobile, attic.' },
  { id: 'colonnade', name: 'Pilasters', color: '#f0ead8', description: 'White pilasters articulating the facades.' },
  { id: 'parapet', name: 'Parapet sculpture', color: '#8f8f8f', description: 'Statues and vases lining the parapets.' },
  { id: 'roof', name: 'Roofs', color: '#5a6b5a', description: 'Roof volumes behind the parapets.' },
  { id: 'courtyard', name: 'Courtyard', color: '#b8b09a', description: 'The inner ceremonial courtyard with its three arches.' },
  { id: 'interiors', name: 'State interiors', color: '#e8dcc0', description: 'The Jordan Staircase and state rooms.' },
  { id: 'base', name: 'Base', color: '#c9bfa5', description: 'Rusticated base.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
function buildExplanations() {
  const e = {};
  for (const [bid, bname] of [['neva', 'Neva'], ['square', 'Palace Square']]) {
    for (let b = 1; b <= 3; b++) {
      const fn = bname === 'Neva' ? `Neva facade bay ${b}` : `Palace Square facade bay ${b}`;
      const fid = bname === 'Neva' ? `neva-bay-${b}` : `square-bay-${b}`;
      e[`${fn.toLowerCase()} rusticated ground floor`] = `Rusticated ground floor of ${fn.toLowerCase()}. The principal facade is 215 m long. Exact rustication is schematic.`;
      e[`${fn.toLowerCase()} piano nobile`] = `The piano nobile of ${fn.toLowerCase()}, with the great state windows. Exact detail is schematic.`;
      e[`${fn.toLowerCase()} attic storey`] = `The attic storey of ${fn.toLowerCase()}. Exact detail is schematic.`;
      e[`${fn.toLowerCase()} pilasters`] = `White pilasters of ${fn.toLowerCase()}. Exact rhythm is schematic.`;
      e[`${fn.toLowerCase()} ground floor windows`] = `Ground floor windows of ${fn.toLowerCase()}. Exact count is schematic.`;
      e[`${fn.toLowerCase()} piano floor windows`] = `Piano nobile windows of ${fn.toLowerCase()}. The palace has 1,945 windows. Exact count is schematic.`;
      void fid; void bid;
    }
  }
  for (const ename of ['East', 'West']) {
    for (let b = 1; b <= 2; b++) {
      const fn = `${ename} facade bay ${b}`;
      e[`${fn.toLowerCase()} rusticated ground floor`] = `Rusticated ground floor of ${fn.toLowerCase()}. Exact detail is schematic.`;
      e[`${fn.toLowerCase()} piano nobile`] = `The piano nobile of ${fn.toLowerCase()}. Exact detail is schematic.`;
      e[`${fn.toLowerCase()} attic storey`] = `The attic storey of ${fn.toLowerCase()}. Exact detail is schematic.`;
      e[`${fn.toLowerCase()} pilasters`] = `Pilasters of ${fn.toLowerCase()}. Exact rhythm is schematic.`;
    }
  }
  for (let a = 1; a <= 3; a++) e[`palace square arch ${a}`] = `One of three arches in the south facade leading to the ceremonial courtyard. Exact form is schematic.`;
  for (const [pid, pname] of [['neva', 'Neva'], ['square', 'Palace Square'], ['east', 'East'], ['west', 'West']]) {
    e[`${pname.toLowerCase()} parapet statues`] = `Statues lining the ${pname.toLowerCase()} parapet. Exact subjects are schematic.`;
    void pid;
  }
  e['neva parapet vases'] = 'Vases on the Neva parapet. Exact forms are schematic.';
  e['palace square parapet vases'] = 'Vases on the Palace Square parapet. Exact forms are schematic.';
  e['north roof'] = 'Roof over the north wing. Exact profile is schematic.';
  e['south roof'] = 'Roof over the south wing. Exact profile is schematic.';
  e['east roof'] = 'Roof over the east wing. Exact profile is schematic.';
  e['west roof'] = 'Roof over the west wing. Exact profile is schematic.';
  e['courtyard north wall'] = 'North wall of the inner courtyard. Exact detail is schematic.';
  e['courtyard south wall'] = 'South wall of the inner courtyard. Exact detail is schematic.';
  e['courtyard east wall'] = 'East wall of the inner courtyard. Exact detail is schematic.';
  e['courtyard west wall'] = 'West wall of the inner courtyard. Exact detail is schematic.';
  e['courtyard paving'] = 'Paving of the ceremonial courtyard. Exact pattern is schematic.';
  for (const [cid, cname] of [['neva-1', 'Neva bay 1'], ['neva-2', 'Neva bay 2'], ['neva-3', 'Neva bay 3'], ['square-1', 'Palace Square bay 1'], ['square-2', 'Palace Square bay 2'], ['square-3', 'Palace Square bay 3']]) {
    e[`${cname.toLowerCase()} cornice`] = `Cornice of ${cname.toLowerCase()}. Exact profile is schematic.`;
    void cid;
  }
  for (const ename of ['East', 'West']) for (let b = 1; b <= 2; b++) e[`${ename.toLowerCase()} bay ${b} cornice`] = `Cornice of ${ename.toLowerCase()} bay ${b}. Exact profile is schematic.`;
  e['neva entrance portal'] = 'The Neva entrance portal. Exact design is schematic.';
  e['palace square entrance portal'] = 'The Palace Square entrance portal. Exact design is schematic.';
  e['east entrance portal'] = 'The east entrance portal. Exact design is schematic.';
  e['west entrance portal'] = 'The west entrance portal. Exact design is schematic.';
  e['alexander column'] = 'The Alexander Column on Palace Square, raised 1830-1834 to commemorate the victory over Napoleon. It stands in front of the palace, not part of it. Exact form is schematic.';
  e['neva parapet balustrade'] = 'Balustrade between the Neva parapet statues. Exact form is schematic.';
  e['palace square parapet balustrade'] = 'Balustrade between the Palace Square parapet statues. Exact form is schematic.';
  e['courtyard fountain'] = 'Fountain in the ceremonial courtyard. Exact design is schematic.';
  e['courtyard east gate'] = 'East gate of the courtyard. Exact design is schematic.';
  e['courtyard west gate'] = 'West gate of the courtyard. Exact design is schematic.';
  e['palace square staircase'] = 'The exterior staircase to Palace Square. Exact form is schematic.';
  e['neva embankment wall'] = 'The granite embankment wall along the Neva. Exact construction is schematic.';
  e['jordan staircase'] = "The Jordan Staircase, the palace's great state staircase. Exact form is schematic.";
  e['jordan staircase columns'] = 'Columns of the Jordan Staircase. Exact order is schematic.';
  e['malachite room'] = 'The Malachite Room, lined with green malachite. Exact interior is schematic.';
  e['white hall'] = 'The White Hall. Exact interior is schematic.';
  e['gold drawing room'] = 'The Gold Drawing Room. Exact interior is schematic.';
  e['concert hall'] = 'The Concert Hall. Exact interior is schematic.';
  e['st. george hall'] = "St. George's Hall, the great throne room. Exact interior is schematic.";
  e['state corridor'] = 'The enfilade corridor linking the state rooms. Exact form is schematic.';
  return e;
}
Object.assign(explanations, buildExplanations());

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
const binName = 'winter-palace-0.bin';
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
  scope: 'Winter Palace, St. Petersburg (schematic)',
  title: 'Winter Palace',
  location: 'St. Petersburg, Russia',
  blurb: 'Bartolomeo Rastrelli\u2019s Elizabethan Baroque palace (1754-1762): a 215 m green-and-white facade on the Neva, home of the Romanovs and now the Hermitage Museum.',
  sourceUrls: [
    { label: 'Wikipedia: Winter Palace', url: 'https://en.wikipedia.org/wiki/Winter_Palace' },
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
  chunks: [{ url: '/models/winter-palace/winter-palace-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
