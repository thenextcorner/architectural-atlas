// Simplified schematic Chrysler Building for the Architectural Atlas.
//
// The "simple" variant of the Chrysler Building: same footprint, massing
// and proportions as the detailed model (see
// scripts/generate-chrysler-building.mjs, whose header lists every sourced
// dimension reused here), but coarser: 30 named parts across 6 systems
// instead of 101 across 8. Individual window bands, eagles, radiator
// caps, entrance portals, elevator banks and spire segments are merged
// into group parts; the crown's sunburst fins are reduced to a single
// group.
//
// Sourced dimensions reused from the detailed model (never re-stated here,
// see generate-chrysler-building.mjs for the full attribution):
//   1,046 ft (319 m) to the spire tip; roof 925 ft (282 m); top floor
//   899 ft (274 m); 77 floors; completed and opened 27 May 1930;
//   architect William Van Alen, commissioned by Walter P. Chrysler;
//   tallest building in the world 27 May 1930 to 1 May 1931, preceded by
//   40 Wall Street, surpassed by the Empire State Building; spire 185 ft
//   (56 m), 27 tons, Nirosta stainless steel, secretly assembled inside
//   the crown and raised through the roof in 90 minutes on 23 Oct 1929,
//   one day before the Wall Street Crash; rival 40 Wall Street at 927 ft;
//   crown of seven radiating terraced arches with a stylized sunburst
//   motif in stainless steel; eight eagle-head gargoyles on the 61st
//   floor corners; 1929 Chrysler radiator-cap replicas on the 31st floor
//   corners; hubcap frieze motifs; car-wheel ornamental bands; setbacks
//   at the 16th, 23rd and 30th floors; H-plan; white and dark-gray
//   brickwork emphasizing horizontal window rows; lobby three stories
//   high with entrances on Lexington Avenue, 42nd and 43rd Streets; Red
//   Moroccan marble walls, onyx, blue marble and steel; ceiling murals by
//   Edward Trumbull (refurbished 1978); 3,862 exterior windows; 32
//   elevators; Cloud Club on the upper floors in the late 1920s to the
//   1970s; National Historic Landmark 1976; NYC Landmark 1978 (facade
//   and lobby); 405 Lexington Avenue; ranked 9th on the 2007 AIA List of
//   America's Favorite Architecture.
// Schematic (not sourced, never stated as fact in the UI): exact stage
// footprints and the H-plan wing layout; floor heights (average 282/77 m);
// merged group geometry; simplified crown, spire and ornament forms.
//
// Writes:
//   public/models/chrysler-building-simple/atlas.json
//   public/models/chrysler-building-simple/chrysler-building-simple-0.bin
//
// Usage: node scripts/generate-chrysler-building-simple.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'chrysler-building-simple');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: 319 m (spire tip) maps to 2.4 units (same as detailed).
const S = 2.4 / 319;

const FH = 282 / 77;
const H = (f) => f * FH;

// ---------------------------------------------------------------- helpers
function B(w, h, d, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}
function CY(rt, rb, h, x, y, z, seg = 10) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// === SHAFT AND FACADE ===
// Same four setback stages and footprints as the detailed model.
const STAGES = [
  { f0: 1, f1: 16, hx: 30, hz: 24, yTop: H(16) },
  { f0: 17, f1: 22, hx: 25, hz: 20, yTop: H(22) },
  { f0: 23, f1: 29, hx: 21, hz: 17, yTop: H(29) },
  { f0: 30, f1: 61, hx: 17, hz: 14, yTop: H(61) },
];
{
  const base = STAGES[0];
  addPart('base-mass', 'Base mass, floors 1 to 16', 'shaft-facade', [
    B(2 * base.hx, base.yTop, 2 * base.hz, 0, base.yTop / 2, 0),
  ]);
  const wings = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      wings.push(B(5.8, base.yTop, 5.8, sx * (base.hx - 2.1), base.yTop / 2, sz * (base.hz - 2.1)));
    }
  }
  addPart('h-plan-corner-wings', 'H-plan corner wings', 'shaft-facade', wings);
  addPart('mid-stage-mass', 'Mid stage mass, floors 17 to 29', 'shaft-facade', [
    B(2 * STAGES[1].hx, H(29) - H(16), 2 * STAGES[1].hz, 0, (H(16) + H(29)) / 2, 0),
  ]);
  const up = STAGES[3];
  addPart('upper-shaft-mass', 'Upper shaft mass, floors 30 to 61', 'shaft-facade', [
    B(2 * up.hx, up.yTop - H(29), 2 * up.hz, 0, (H(29) + up.yTop) / 2, 0),
  ]);
}
// One merged group of horizontal window bands across the shaft.
{
  const bands = [];
  const bandFloors = [
    [STAGES[0], 4], [STAGES[0], 10], [STAGES[0], 16],
    [STAGES[2], 23], [STAGES[2], 29],
    [STAGES[3], 35], [STAGES[3], 45], [STAGES[3], 55],
  ];
  for (const [t, f] of bandFloors) {
    const yc = H(f) - 1.5;
    const bh = 2.0;
    bands.push(B(2 * t.hx + 0.7, bh, 0.5, 0, yc, t.hz + 0.25));
    bands.push(B(2 * t.hx + 0.7, bh, 0.5, 0, yc, -t.hz - 0.25));
    bands.push(B(0.5, bh, 2 * t.hz + 0.7, t.hx + 0.25, yc, 0));
    bands.push(B(0.5, bh, 2 * t.hz + 0.7, -t.hx - 0.25, yc, 0));
  }
  addPart('window-bands', 'Window bands', 'shaft-facade', bands);
}
// Dark-gray brick spandrel courses at the setback levels.
{
  const courses = [];
  for (const [y, w, d] of [[H(16), 61, 49], [H(22), 51, 41], [H(29), 43, 35]]) {
    courses.push(B(w, 1.2, d, 0, y - 0.6, 0));
  }
  addPart('dark-gray-spandrel-courses', 'Dark-gray spandrel courses', 'shaft-facade', courses);
}

// === CROWN ===
// All seven terraced arches merged into one band group, all sunburst
// fins into one group, plus the spire base collar.
const ARCH_FRAC = [0.10, 0.11, 0.12, 0.14, 0.15, 0.18, 0.20];
const ARCH_HX = [16, 14, 12, 10, 8, 6, 4];
const ARCH_HZ = ARCH_HX.map((v) => +(v * 0.82).toFixed(2));
{
  const bands = [];
  const fins = [];
  let y = H(61);
  for (let i = 0; i < 7; i++) {
    const hx = ARCH_HX[i];
    const hz = ARCH_HZ[i];
    const y0 = y;
    const y1 = y + ARCH_FRAC[i] * (282 - H(61));
    y = y1;
    const h = y1 - y0;
    const ym = (y0 + y1) / 2;
    const t = 1.0;
    bands.push(B(2 * hx, h, t, 0, ym, hz - t / 2));
    bands.push(B(2 * hx, h, t, 0, ym, -(hz - t / 2)));
    bands.push(B(t, h, 2 * hz, hx - t / 2, ym, 0));
    bands.push(B(t, h, 2 * hz, -(hx - t / 2), ym, 0));
    const nhx = i < 6 ? ARCH_HX[i + 1] : 1.8;
    const nhz = i < 6 ? ARCH_HZ[i + 1] : 1.5;
    bands.push(B(2 * hx, 0.9, hz - nhz, 0, y1 - 0.45, (hz + nhz) / 2));
    bands.push(B(2 * hx, 0.9, hz - nhz, 0, y1 - 0.45, -(hz + nhz) / 2));
    bands.push(B(hx - nhx, 0.9, 2 * nhz, (hx + nhx) / 2, y1 - 0.45, 0));
    bands.push(B(hx - nhx, 0.9, 2 * nhz, -(hx + nhx) / 2, y1 - 0.45, 0));
    const fh = h * 0.55;
    const fy = y1 + fh * 0.08;
    for (let k = 0; k < 3; k++) {
      const a = (k - 1) * 0.35;
      const xo = -hx * 0.6 + (hx * 1.2 * k) / 2;
      const zo = -hz * 0.6 + (hz * 1.2 * k) / 2;
      const fN = B(0.24, fh, 0.6);
      fN.rotateZ(a);
      fN.translate(xo, fy, hz + 0.15);
      fins.push(fN);
      const fS = B(0.24, fh, 0.6);
      fS.rotateZ(-a);
      fS.translate(xo, fy, -(hz + 0.15));
      fins.push(fS);
      const fE = B(0.6, fh, 0.24);
      fE.rotateX(-a);
      fE.translate(hx + 0.15, fy, zo);
      fins.push(fE);
      const fW = B(0.6, fh, 0.24);
      fW.rotateX(a);
      fW.translate(-(hx + 0.15), fy, zo);
      fins.push(fW);
    }
  }
  addPart('crown-arch-bands', 'Crown arch bands', 'crown', bands);
  addPart('crown-sunburst-fins', 'Crown sunburst fins', 'crown', fins);
  addPart('spire-base-collar', 'Spire base collar', 'crown', [
    CY(3.8, 4.6, 3.2, 0, 282 + 1.6, 0, 8),
  ]);
}

// === SPIRE ===
// Lower half, upper half, and needle tip of the secret spire.
{
  const lower = [];
  const upper = [];
  const SEG = [5, 5, 5, 5, 5, 5, 4, 3];
  const RB = [3.4, 2.9, 2.45, 2.0, 1.6, 1.2, 0.85, 0.5];
  let y = 282;
  for (let i = 0; i < 8; i++) {
    const rt = i < 7 ? RB[i + 1] : 0.12;
    const seg = CY(rt, RB[i], SEG[i], 0, y + SEG[i] / 2, 0, 8);
    (i < 4 ? lower : upper).push(seg);
    y += SEG[i];
  }
  addPart('lower-spire', 'Lower spire', 'spire', lower);
  addPart('upper-spire', 'Upper spire', 'spire', upper);
  const tip = CY(0.03, 0.12, 2.4, 0, 319 - 1.2, 0, 8);
  const orb = new THREE.SphereGeometry(0.16, 8, 6);
  orb.translate(0, 318.9, 0);
  addPart('needle-tip', 'Needle tip', 'spire', [tip, orb]);
}

// === ORNAMENT ===
// Eight eagles, four radiator caps, the hubcap frieze, the wheel bands
// and the three entrance portals, each merged into one group part.
{
  const eagles = [];
  const ey = H(61) - 4.5;
  for (const [x, z] of [
    [18.6, 14], [17, 15.6], [18.6, -14], [17, -15.6],
    [-18.6, -14], [-17, -15.6], [-18.6, 14], [-17, 15.6],
  ]) {
    eagles.push(B(1.4, 2.0, 0.9, x, ey + 1.0, z));
    eagles.push(B(0.8, 0.9, 0.8, x, ey + 2.4, z + 0.15));
    eagles.push(B(0.35, 0.3, 0.6, x, ey + 2.3, z + 0.7));
  }
  addPart('eagle-gargoyles', 'Eagle gargoyles', 'ornament', eagles);
  const caps = [];
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    caps.push(B(1.7, 0.5, 1.7, sx * 17, H(31) + 0.25, sz * 14));
    caps.push(CY(0.55, 0.72, 1.5, sx * 17, H(31) + 1.25, sz * 14, 8));
  }
  addPart('radiator-cap-replicas', 'Radiator cap replicas', 'ornament', caps);
  const frieze = [];
  {
    const y = H(31) - 2.6;
    frieze.push(B(35, 1.4, 0.4, 0, y, 14.2));
    frieze.push(B(35, 1.4, 0.4, 0, y, -14.2));
    frieze.push(B(0.4, 1.4, 29, 17.2, y, 0));
    frieze.push(B(0.4, 1.4, 29, -17.2, y, 0));
    for (let k = 0; k < 8; k++) {
      const x = -15 + (30 * k) / 7;
      const d1 = CY(0.55, 0.55, 0.5, x, y, 14.45, 8);
      d1.rotateX(Math.PI / 2);
      frieze.push(d1);
      const d2 = CY(0.55, 0.55, 0.5, x, y, -14.45, 8);
      d2.rotateX(Math.PI / 2);
      frieze.push(d2);
    }
  }
  addPart('hubcap-frieze', 'Hubcap frieze', 'ornament', frieze);
  const wheels = [];
  for (const y of [H(60) - 2.2, H(28) - 2.2]) {
    for (let k = 0; k < 6; k++) {
      const x = -14 + (28 * k) / 5;
      const w1 = CY(1.0, 1.0, 0.35, x, y, 14.35, 10);
      w1.rotateX(Math.PI / 2);
      wheels.push(w1);
      const w2 = CY(1.0, 1.0, 0.35, x, y, -14.35, 10);
      w2.rotateX(Math.PI / 2);
      wheels.push(w2);
    }
  }
  addPart('car-wheel-bands', 'Car wheel bands', 'ornament', wheels);
  const portals = [];
  portals.push(B(1.2, 9, 1.4, -30.6, 4.5, -4.5));
  portals.push(B(1.2, 9, 1.4, -30.6, 4.5, 4.5));
  portals.push(B(1.4, 1.8, 10.4, -30.6, 9.9, 0));
  portals.push(B(0.5, 7, 8, -30.1, 3.5, 0));
  portals.push(B(3.2, 0.5, 11, -31.6, 8.2, 0));
  portals.push(B(1.4, 9, 1.2, -4.5, 4.5, 24.6));
  portals.push(B(1.4, 9, 1.2, 4.5, 4.5, 24.6));
  portals.push(B(10.4, 1.8, 1.4, 0, 9.9, 24.6));
  portals.push(B(11, 0.5, 3.2, 0, 8.2, 25.6));
  portals.push(B(1.4, 9, 1.2, -4.5, 4.5, -24.6));
  portals.push(B(1.4, 9, 1.2, 4.5, 4.5, -24.6));
  portals.push(B(10.4, 1.8, 1.4, 0, 9.9, -24.6));
  portals.push(B(11, 0.5, 3.2, 0, 8.2, -25.6));
  addPart('entrance-portals', 'Entrance portals', 'ornament', portals);
}

// === LOBBY ===
// The three story lobby interior, merged into four parts.
{
  const lh = H(3);
  addPart('lobby-shell', 'Lobby shell', 'lobby', [
    B(32, 0.4, 22, 0, 0.2, 0),
    B(32, lh, 0.5, 0, lh / 2, 10.75),
    B(32, lh, 0.5, 0, lh / 2, -10.75),
    B(0.5, lh, 22, 15.75, lh / 2, 0),
  ]);
  addPart('lobby-marble-and-onyx', 'Lobby marble and onyx', 'lobby', [
    B(31, 3.2, 0.3, 0, 1.9, 10.55),
    B(31, 3.2, 0.3, 0, 1.9, -10.55),
    B(0.5, 9, 14, -15.75, 4.5, 0),
  ]);
  addPart('mural-ceiling', 'Mural ceiling', 'lobby', [
    B(32, 0.4, 22, 0, lh - 0.2, 0),
    B(9, 0.15, 6, -10, lh - 0.45, 0),
    B(9, 0.15, 6, 0, lh - 0.45, 0),
    B(9, 0.15, 6, 10, lh - 0.45, 0),
  ]);
  const doors = [];
  for (let i = 0; i < 4; i++) {
    const z = -5.25 + i * 3.5;
    doors.push(B(0.35, 8, 2.4, -15.6, 4, z));
    doors.push(B(0.2, 7.2, 1.0, -15.45, 3.6, z - 0.55));
    doors.push(B(0.2, 7.2, 1.0, -15.45, 3.6, z + 0.55));
  }
  addPart('elevator-doors', 'Elevator doors', 'lobby', doors);
}

// === STRUCTURE AND CORE ===
{
  const cols = [];
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 7; j++) {
      cols.push(B(0.9, H(16), 0.9, -27 + (54 * i) / 8, H(16) / 2, -21 + (42 * j) / 6));
    }
  }
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 5; j++) {
      cols.push(B(0.9, H(61) - H(16), 0.9, -14 + (28 * i) / 5, (H(16) + H(61)) / 2, -11 + (22 * j) / 4));
    }
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      cols.push(B(0.9, 274 - H(61), 0.9, -8 + (16 * i) / 3, (H(61) + 274) / 2, -6 + (12 * j) / 2));
    }
  }
  addPart('steel-column-grid', 'Steel column grid', 'structure-core', cols);
  addPart('central-core-shaft', 'Central core shaft', 'structure-core', [
    B(10, 282, 8, 0, 141, 0),
  ]);
  const banks = [];
  for (const x of [-4.5, -1.5, 1.5, 4.5, 7.5, -7.5]) {
    banks.push(B(2.6, H(61), 2.6, x, H(61) / 2, 0));
    banks.push(B(2.2, 2.8, 2.2, x, 30, 0));
    banks.push(B(2.2, 2.8, 2.2, x, 150, 0));
  }
  addPart('elevator-banks', 'Elevator banks', 'structure-core', banks);
  const plates = [];
  for (const f of [16, 30, 61]) {
    plates.push(B(56, 0.8, 44, 0, H(f) - 0.4, 0));
  }
  for (const f of [66, 67, 68]) {
    plates.push(B(20, 0.7, 16, 0, H(f) - 0.35, 0));
  }
  addPart('floor-plates', 'Floor plates', 'structure-core', plates);
}

// === SETBACKS AND CORNICES ===
{
  const cornices = [];
  const terraces = [];
  for (const [y, lhx, lhz] of [[H(16), 30, 24], [H(22), 25, 20], [H(29), 21, 17]]) {
    cornices.push(B(2 * lhx + 2, 1.1, 2 * lhz + 2, 0, y - 0.55, 0));
    terraces.push(B(2 * lhx, 0.5, 3, 0, y - 0.25, lhz - 1.5));
    terraces.push(B(2 * lhx, 0.5, 3, 0, y - 0.25, -(lhz - 1.5)));
  }
  addPart('setback-cornices', 'Setback cornices', 'shaft-facade', cornices);
  addPart('setback-terraces', 'Setback terraces', 'shaft-facade', terraces);
  addPart('roof-platform-and-parapet', 'Roof platform and parapet', 'shaft-facade', [
    B(10, 0.8, 8, 0, 282 - 0.4, 0),
    B(10.4, 1.2, 0.35, 0, 282 + 0.6, 3.85),
    B(10.4, 1.2, 0.35, 0, 282 + 0.6, -3.85),
    B(0.35, 1.2, 8, 5.05, 282 + 0.6, 0),
    B(0.35, 1.2, 8, -5.05, 282 + 0.6, 0),
  ]);
}

// === LIGHTING ===
{
  const fl = [];
  for (let i = 0; i < 12; i++) {
    const a = ((i / 12) * Math.PI * 2);
    fl.push(B(0.5, 0.5, 0.5, Math.cos(a) * 17.5, H(61) + 1.5, Math.sin(a) * 14.5));
  }
  addPart('crown-floodlights', 'Crown floodlights', 'lighting', fl);
  addPart('spire-beacon', 'Spire beacon', 'lighting', [
    B(0.45, 0.45, 0.45, 0, 319.0, 0),
  ]);
}

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id === 'lower-spire' || id === 'upper-spire' || id === 'needle-tip' || id === 'spire-base-collar') return '#D7DBDE';
  if (id === 'crown-sunburst-fins') return '#E7EBEE';
  if (id === 'crown-arch-bands') return '#C9CED3';
  if (id === 'window-bands') return '#8FA9BC';
  if (id === 'eagle-gargoyles') return '#9AA0A5';
  if (id === 'radiator-cap-replicas') return '#C9CDD2';
  if (id === 'hubcap-frieze') return '#B9BEC3';
  if (id === 'car-wheel-bands') return '#AEB4B9';
  if (id === 'entrance-portals') return '#6E6257';
  if (id === 'lobby-shell') return '#C9BFA4';
  if (id === 'lobby-marble-and-onyx') return '#8E3B2F';
  if (id === 'mural-ceiling') return '#B78D4F';
  if (id === 'elevator-doors') return '#7A5C3E';
  if (id === 'steel-column-grid') return '#5A626B';
  if (id === 'central-core-shaft') return '#7C8288';
  if (id === 'elevator-banks') return '#B08D57';
  if (id === 'floor-plates') return '#6E757D';
  if (id === 'setback-cornices') return '#D9D2C2';
  if (id === 'setback-terraces') return '#6F7F5E';
  if (id === 'roof-platform-and-parapet') return '#8A8D91';
  if (id === 'crown-floodlights') return '#FFE08A';
  if (id === 'spire-beacon') return '#FF6B5E';
  if (id === 'dark-gray-spandrel-courses') return '#4A4A4C';
  if (id === 'h-plan-corner-wings') return '#DCD5C5';
  return '#E4DED2';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'shaft-facade', name: 'Shaft and facade', color: '#E4DED2', description: 'The setback tower mass in four stages, with horizontal window bands in white and dark-gray brick emphasizing the window rows.' },
  { id: 'crown', name: 'Crown', color: '#C9CED3', description: 'The seven radiating terraced arches with stylized sunburst panels in Nirosta stainless steel, rising from the 61st floor to the 925 ft roof.' },
  { id: 'spire', name: 'Spire', color: '#D7DBDE', description: 'The secret 185 ft Nirosta stainless steel spire, assembled inside the crown and raised through the roof in 90 minutes on 23 October 1929.' },
  { id: 'ornament', name: 'Automobile ornament', color: '#9AA0A5', description: 'Stainless steel ornament drawn from Chrysler automobiles: eagle gargoyles, radiator caps, hubcaps and wheel motifs, plus the street entrance portals.' },
  { id: 'lobby', name: 'Lobby', color: '#8E6B4F', description: 'The three story lobby interior with Red Moroccan marble, onyx, and the Edward Trumbull ceiling murals.' },
  { id: 'structure-core', name: 'Structure and core', color: '#5A626B', description: 'The steel frame, the central core, the 32 elevators, and floor plates, revealed when the model is exploded.' },
  { id: 'lighting', name: 'Lighting', color: '#FFD97A', description: 'Floodlighting for the stainless steel crown and the spire aviation beacon.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'base mass, floors 1 to 16': 'The base of the tower, floors 1 to 16, the widest of the setback stages. The setback above the 16th floor is sourced; the exact footprint is schematic.',
  'h-plan corner wings': 'The corner wings of the H-plan base, standing slightly proud of the main walls. The H-shaped plan is sourced; exact wing dimensions are schematic.',
  'mid stage mass, floors 17 to 29': 'The merged second and third setback stages, floors 17 to 29. The setbacks below the 23rd and 30th floors are sourced; exact footprints are schematic.',
  'upper shaft mass, floors 30 to 61': 'The main shaft, floors 30 to 61, carrying the eagle gargoyles at its corners and the crown above. The exact footprint is schematic.',
  'window bands': 'Merged horizontal window bands across the shaft, part of the white and dark-gray brickwork that emphasizes the horizontal window rows. Band positions are schematic.',
  'dark-gray spandrel courses': 'Dark-gray brick spandrel courses at the setback levels, emphasizing the horizontal window rows. Positions are schematic.',
  'crown arch bands': 'The seven radiating terraced arches of the crown, merged into one part, clad in Nirosta stainless steel. Arch profiles are schematic.',
  'crown sunburst fins': 'The stylized sunburst fins of the crown, merged into one part: radiating stainless steel fins that give the crown its sunrise motif. Arrangement is schematic.',
  'spire base collar': 'The collar where the spire passes through the roof at 925 ft (282 m). The spire was secretly assembled inside the crown and raised through the roof in 90 minutes on 23 October 1929. Form shown schematically.',
  'lower spire': 'The lower half of the secret 185 ft (56 m), 27 ton Nirosta stainless steel spire. Segment divisions are schematic.',
  'upper spire': 'The upper half of the secret spire, tapering to the needle tip. Segment divisions are schematic.',
  'needle tip': 'The needle tip of the spire at 1,046 ft (319 m), which made the Chrysler Building the tallest building in the world from 27 May 1930 to 1 May 1931. Exact tip form is schematic.',
  'eagle gargoyles': 'The eight stylized American eagle-head gargoyles on the 61st floor corners, merged into one part. Exact forms and placement are schematic.',
  'radiator cap replicas': 'The four 1929 Chrysler radiator-cap replicas on the 31st floor corners, merged into one part. Exact forms are schematic.',
  'hubcap frieze': 'A frieze band of hubcap motifs ringing the 31st floor, drawn from Chrysler automobile design. Exact motif arrangement is schematic.',
  'car wheel bands': 'Ornamental bands of car-wheel motifs on the shaft, merged into one part. Exact motifs are schematic.',
  'entrance portals': 'The three street entrance portals on Lexington Avenue, 42nd and 43rd Streets, merged into one part. Portal designs are schematic.',
  'lobby shell': 'The shell of the three story lobby interior: floor, walls and ceiling slab. Layout is schematic.',
  'lobby marble and onyx': 'The Red Moroccan marble wall panels and the onyx elevator surround of the lobby, merged into one part. The lobby combines Red Moroccan marble with onyx, blue marble and steel; layout is schematic.',
  'mural ceiling': 'The lobby ceiling with murals by Edward Trumbull, refurbished in 1978. Mural content is shown schematically as gold panels.',
  'elevator doors': 'The four elevator doors of the lobby bank, merged into one part, from the 32 elevators in the building. Door designs are schematic.',
  'steel column grid': 'The steel frame column grids through the tower, merged into one part. Shown schematically and revealed when the model is exploded.',
  'central core shaft': 'The central core carrying elevators, stairs and services the full height of the building. Interior layout is schematic.',
  'elevator banks': 'The 32 elevators of the building, merged into one bank part. Arrangement is schematic.',
  'floor plates': 'Floor plates bracing the steel frame, including the historic Cloud Club levels on the upper floors, a private club of the late 1920s to the 1970s. Exact floors shown are schematic.',
  'setback cornices': 'Cornice bands at the 16th, 23rd and 30th floor setbacks, merged into one part. The setbacks are sourced; cornice profiles are schematic.',
  'setback terraces': 'Open terrace decks at the setback levels, merged into one part. Shown schematically.',
  'roof platform and parapet': 'The roof platform at 925 ft (282 m) with its parapet, where the spire emerges from the crown. Shown schematically.',
  'crown floodlights': 'Floodlights washing the stainless steel crown at night, merged into one part. Fixture count and placement are schematic.',
  'spire beacon': 'The aviation warning beacon at the spire tip. Shown schematically.',
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
const binName = 'chrysler-building-simple-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the chrysler-building-simple directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Chrysler Building, New York (simplified schematic)',
  title: 'Chrysler Building',
  location: 'New York, NY, USA',
  blurb: "William Van Alen's Art Deco skyscraper at 405 Lexington Avenue, completed 27 May 1930, in simplified schematic form: a secret 185 ft stainless steel spire, seven radiating terraced arches, and a shaft dressed in automobile ornament.",
  sourceUrls: [
    { label: 'Wikipedia: Chrysler Building', url: 'https://en.wikipedia.org/wiki/Chrysler_Building' },
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
  chunks: [{ url: '/models/chrysler-building-simple/chrysler-building-simple-0.bin', bytes: offset }],
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
