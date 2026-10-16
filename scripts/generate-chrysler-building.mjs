// Procedural Chrysler Building (DETAILED) for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Chrysler Building in code and
// writes it in the atlas binary format:
//   public/models/chrysler-building/atlas.json
//   public/models/chrysler-building/chrysler-building-0.bin
//
// Sourced dimensions and facts (from the Wikipedia "Chrysler Building"
// article and the NYC Landmarks Preservation Commission designation
// report LP-0992, opened 2026-10-10):
//   1,046 ft (319 m) to the spire tip; roof 925 ft (282 m); top floor
//   899 ft (274 m); 77 floors; completed and opened 27 May 1930;
//   architect William Van Alen, commissioned by Walter P. Chrysler,
//   founder of the Chrysler Corporation; tallest building in the world
//   from 27 May 1930 to 1 May 1931, preceded by 40 Wall Street and
//   surpassed by the Empire State Building; spire 185 ft (56 m), 27 tons,
//   Nirosta stainless steel, secretly assembled inside the crown and
//   raised through the roof in 90 minutes on 23 Oct 1929, one day before
//   the Wall Street Crash; rival H. Craig Severance's 40 Wall Street,
//   planned at 927 ft, Van Alen and Severance were former partners;
//   crown of seven radiating terraced arches with a stylized sunburst
//   motif in stainless steel; eight eagle-head gargoyles (stylized
//   American eagles) on the 61st floor corners; 1929 Chrysler
//   radiator-cap replicas on the 31st floor corners; hubcap frieze
//   motifs; car-wheel ornamental bands on the facade; setbacks at the
//   16th, 23rd and 30th floors; H-plan; white and dark-gray brickwork
//   emphasizing horizontal window rows; lobby three stories high with
//   entrances on Lexington Avenue, 42nd and 43rd Streets; Red Moroccan
//   marble walls, onyx, blue marble and steel; ceiling murals by Edward
//   Trumbull (refurbished 1978); 3,862 exterior windows; 32 elevators;
//   Cloud Club, a private club on the upper floors in the late 1920s to
//   the 1970s; National Historic Landmark 1976; NYC Landmark 1978
//   (facade and lobby); 405 Lexington Avenue; in 2007 ranked 9th on the
//   AIA List of America's Favorite Architecture.
// Schematic (not sourced, never stated as fact in the UI): exact stage
// footprints and the H-plan wing layout; floor heights (an average floor
// height of 282/77 m is used throughout); window band positions and
// mullion spacing; the crown's arch profiles, terrace depths and sunburst
// fin arrangement; spire segment divisions and taper; eagle,
// radiator-cap and hubcap forms and exact placement (beyond the verified
// counts and floor numbers); lobby layout and finishes beyond the
// materials named; steel frame layout; elevator bank arrangement; Cloud
// Club floor plates (the club's presence on the upper floors in the
// 1920s to 1970s is sourced, the exact floors shown are schematic).
//
// Coordinate frame: x = east-west (Lexington Avenue is -x, west), z =
// north-south (43rd Street is +z, north; 42nd Street is -z, south),
// y = up. All dimensions in meters.
//
// Granularity: 101 named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-chrysler-building.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'chrysler-building');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: 319 m (spire tip) maps to 2.4 units.
const S = 2.4 / 319;

// Average floor-to-floor height from the sourced roof height (282 m).
const FH = 282 / 77;
const H = (f) => f * FH; // height (m) of the top of floor f

// ---------------------------------------------------------------- helpers
// Boxes and cylinders placed in meters, y-up, ground at y = 0.
// ry rotates about the vertical axis.
function B(w, h, d, x = 0, y = 0, z = 0, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}
function CY(rt, rb, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// === SHAFT AND FACADE ===
// Four setback stages. The setbacks above the 16th floor and below the
// 23rd and 30th floors are sourced; footprints are schematic.
const STAGES = [
  { id: 'a', f0: 1, f1: 16, hx: 30, hz: 24, yTop: H(16), bands: [1, 4, 7, 10, 13, 16] },
  { id: 'b', f0: 17, f1: 22, hx: 25, hz: 20, yTop: H(22), bands: [17, 19, 21] },
  { id: 'c', f0: 23, f1: 29, hx: 21, hz: 17, yTop: H(29), bands: [23, 25, 27, 29] },
  { id: 'd', f0: 30, f1: 61, hx: 17, hz: 14, yTop: H(61), bands: [31, 35, 39, 43, 47, 51, 55, 59] },
];
const STAGE_NAMES = {
  a: 'Base mass, floors 1 to 16',
  b: 'Tower mass, floors 17 to 22',
  c: 'Tower mass, floors 23 to 29',
  d: 'Tower mass, floors 30 to 61',
};
{
  let yBase = 0;
  for (const t of STAGES) {
    addPart(`stage-${t.id}-mass`, STAGE_NAMES[t.id], 'shaft-facade', [
      B(2 * t.hx, t.yTop - yBase, 2 * t.hz, 0, (yBase + t.yTop) / 2, 0),
    ]);
    yBase = t.yTop;
  }
}
// The corner wings of the H-plan base, standing slightly proud of the
// main walls (sourced plan shape; dimensions schematic).
{
  const A = STAGES[0];
  const wings = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      wings.push(B(
        5.8, A.yTop, 5.8,
        sx * (A.hx - 2.9 + 0.8), A.yTop / 2, sz * (A.hz - 2.9 + 0.8),
      ));
    }
  }
  addPart('h-plan-corner-wings', 'H-plan corner wings', 'shaft-facade', wings);
}
// Horizontal window bands: glass strips with mullions on all four faces,
// emphasizing the horizontal window rows of the brickwork (sourced
// rhythm; band positions and mullion spacing schematic).
function facadeBand(hx, hz, yc) {
  const geoms = [];
  const bh = 2.0;
  geoms.push(B(2 * hx + 0.7, bh, 0.5, 0, yc, hz + 0.25));
  geoms.push(B(2 * hx + 0.7, bh, 0.5, 0, yc, -hz - 0.25));
  geoms.push(B(0.5, bh, 2 * hz + 0.7, hx + 0.25, yc, 0));
  geoms.push(B(0.5, bh, 2 * hz + 0.7, -hx - 0.25, yc, 0));
  const pitch = 3.4;
  const nNS = Math.max(3, Math.round((2 * hx) / pitch));
  for (let k = 0; k <= nNS; k++) {
    const x = -hx + ((2 * hx) * k) / nNS;
    geoms.push(B(0.2, bh + 0.4, 0.62, x, yc, hz + 0.28));
    geoms.push(B(0.2, bh + 0.4, 0.62, x, yc, -hz - 0.28));
  }
  const nEW = Math.max(3, Math.round((2 * hz) / pitch));
  for (let k = 0; k <= nEW; k++) {
    const z = -hz + ((2 * hz) * k) / nEW;
    geoms.push(B(0.62, bh + 0.4, 0.2, hx + 0.28, yc, z));
    geoms.push(B(0.62, bh + 0.4, 0.2, -hx - 0.28, yc, z));
  }
  return geoms;
}
for (const t of STAGES) {
  for (const f of t.bands) {
    addPart(`window-band-floor-${f}`, `Window band, floor ${f}`, 'shaft-facade',
      facadeBand(t.hx, t.hz, H(f) - 1.5));
  }
}

// === CROWN ===
// Seven radiating terraced arches in Nirosta stainless steel, from the
// 61st floor to the roof at 925 ft (282 m). Each arch is a band of steel
// panels with radiating sunburst fins on its four faces; a flat terrace
// ring steps in to the next arch. Profiles and fin arrangement schematic.
const CROWN_BASE = H(61);
const CROWN_TOP = 282;
const ARCH_FRAC = [0.10, 0.11, 0.12, 0.14, 0.15, 0.18, 0.20];
const ARCH_HX = [16, 14, 12, 10, 8, 6, 4];
const ARCH_HZ = ARCH_HX.map((v) => +(v * 0.82).toFixed(2));
{
  let y = CROWN_BASE;
  for (let i = 0; i < 7; i++) {
    const n = i + 1;
    const hx = ARCH_HX[i];
    const hz = ARCH_HZ[i];
    const y0 = y;
    const y1 = y + ARCH_FRAC[i] * (CROWN_TOP - CROWN_BASE);
    y = y1;
    const h = y1 - y0;
    const ym = (y0 + y1) / 2;
    const t = 1.0;
    const band = [];
    band.push(B(2 * hx, h, t, 0, ym, hz - t / 2));
    band.push(B(2 * hx, h, t, 0, ym, -(hz - t / 2)));
    band.push(B(t, h, 2 * hz, hx - t / 2, ym, 0));
    band.push(B(t, h, 2 * hz, -(hx - t / 2), ym, 0));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const c = B(2.6, h, 2.6, 0, 0, 0, Math.PI / 4);
        c.translate(sx * (hx - 0.6), ym, sz * (hz - 0.6));
        band.push(c);
      }
    }
    // Terrace ring stepping in to the next arch (or to the spire base).
    const nhx = i < 6 ? ARCH_HX[i + 1] : 1.8;
    const nhz = i < 6 ? ARCH_HZ[i + 1] : 1.5;
    band.push(B(2 * hx, 0.9, hz - nhz, 0, y1 - 0.45, (hz + nhz) / 2));
    band.push(B(2 * hx, 0.9, hz - nhz, 0, y1 - 0.45, -(hz + nhz) / 2));
    band.push(B(hx - nhx, 0.9, 2 * nhz, (hx + nhx) / 2, y1 - 0.45, 0));
    band.push(B(hx - nhx, 0.9, 2 * nhz, -(hx + nhx) / 2, y1 - 0.45, 0));
    addPart(`terraced-arch-${n}-band`, `Terraced arch ${n} band`, 'crown', band);
    // Sunburst fins: five radiating fins per face, fanning outward.
    const fins = [];
    const fh = h * 0.55;
    const fy = y1 + fh * 0.08;
    for (let k = 0; k < 5; k++) {
      const a = (k - 2) * 0.32;
      const xo = -hx * 0.72 + (hx * 1.44 * k) / 4;
      const zo = -hz * 0.72 + (hz * 1.44 * k) / 4;
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
    addPart(`terraced-arch-${n}-sunburst`, `Terraced arch ${n} sunburst panels`, 'crown', fins);
  }
}
// Collar where the spire passes through the roof.
addPart('spire-base-collar', 'Spire base collar', 'crown', [
  CY(3.8, 4.6, 3.2, 0, CROWN_TOP + 1.6, 0, 8),
]);

// === SPIRE ===
// The secret 185 ft (56 m), 27 ton Nirosta stainless steel spire, raised
// through the roof in 90 minutes on 23 Oct 1929. Eight tapering segments
// plus the needle tip, reaching 1,046 ft (319 m). Segment divisions
// schematic; the visible spire above the roof is 121 ft (37 m), the rest
// of the 185 ft structure extends into the crown below.
{
  const SEG = [5, 5, 5, 5, 5, 5, 4, 3];
  const RB = [3.4, 2.9, 2.45, 2.0, 1.6, 1.2, 0.85, 0.5];
  let y = 282;
  for (let i = 0; i < 8; i++) {
    const n = i + 1;
    const rt = i < 7 ? RB[i + 1] : 0.12;
    addPart(`spire-segment-${n}`, `Spire segment ${n}`, 'spire', [
      CY(rt, RB[i], SEG[i], 0, y + SEG[i] / 2, 0, 8),
    ]);
    y += SEG[i];
  }
  const tip = CY(0.03, 0.12, 2.4, 0, 319 - 1.2, 0, 8);
  const orb = new THREE.SphereGeometry(0.16, 10, 8);
  orb.translate(0, 318.9, 0);
  addPart('spire-needle-tip', 'Spire needle tip', 'spire', [tip, orb]);
}

// === ORNAMENT ===
// Stainless steel ornament drawn from Chrysler automobiles, plus the
// three street entrance portals.
// Eight eagle-head gargoyles on the 61st floor corners.
function eagleGeoms(ry) {
  const g = [];
  const body = B(1.4, 2.0, 0.9);
  body.translate(0, 1.0, 0);
  g.push(body);
  const head = B(0.8, 0.9, 0.8);
  head.translate(0, 2.4, 0.15);
  g.push(head);
  const beak = B(0.35, 0.3, 0.6);
  beak.translate(0, 2.3, 0.7);
  g.push(beak);
  const wingL = B(0.25, 1.6, 1.4);
  wingL.translate(-0.8, 1.2, 0);
  g.push(wingL);
  const wingR = B(0.25, 1.6, 1.4);
  wingR.translate(0.8, 1.2, 0);
  g.push(wingR);
  const tail = B(0.5, 0.9, 0.4);
  tail.translate(0, 0.5, -0.5);
  g.push(tail);
  for (const gg of g) gg.rotateY(ry);
  return g;
}
{
  const ey = H(61) - 4.5;
  const ex = 17;
  const ez = 14;
  const spots = [
    ['northeast', 'east', ex + 1.6, ez, Math.PI / 2],
    ['northeast', 'north', ex, ez + 1.6, 0],
    ['southeast', 'east', ex + 1.6, -ez, Math.PI / 2],
    ['southeast', 'south', ex, -ez - 1.6, Math.PI],
    ['southwest', 'west', -(ex + 1.6), -ez, -Math.PI / 2],
    ['southwest', 'south', -ex, -ez - 1.6, Math.PI],
    ['northwest', 'west', -(ex + 1.6), ez, -Math.PI / 2],
    ['northwest', 'north', -ex, ez + 1.6, 0],
  ];
  spots.forEach(([corner, dir, x, z, ry], i) => {
    const geoms = eagleGeoms(ry);
    for (const gg of geoms) gg.translate(x, ey, z);
    addPart(`eagle-61-${i + 1}`, `61st floor eagle ${i + 1} (${corner} corner, facing ${dir})`, 'ornament', geoms);
  });
}
// Four 1929 Chrysler radiator-cap replicas on the 31st floor corners.
{
  const ry31 = H(31);
  const cx = 17;
  const cz = 14;
  for (const [ci, corner, sx, sz] of [
    [1, 'northeast', 1, 1], [2, 'southeast', 1, -1],
    [3, 'southwest', -1, -1], [4, 'northwest', -1, 1],
  ]) {
    addPart(`radiator-cap-31-${ci}`, `31st floor radiator cap (${corner} corner)`, 'ornament', [
      B(1.7, 0.5, 1.7, sx * cx, ry31 + 0.25, sz * cz),
      CY(0.55, 0.72, 1.5, sx * cx, ry31 + 1.25, sz * cz, 10),
      CY(0.2, 0.2, 0.5, sx * cx, ry31 + 2.2, sz * cz, 8),
    ]);
  }
}
// Hubcap frieze band ringing the 31st floor.
{
  const y = H(31) - 2.6;
  const hx = 17;
  const hz = 14;
  const geoms = [];
  geoms.push(B(2 * hx + 0.6, 1.4, 0.4, 0, y, hz + 0.2));
  geoms.push(B(2 * hx + 0.6, 1.4, 0.4, 0, y, -hz - 0.2));
  geoms.push(B(0.4, 1.4, 2 * hz + 0.6, hx + 0.2, y, 0));
  geoms.push(B(0.4, 1.4, 2 * hz + 0.6, -hx - 0.2, y, 0));
  for (let k = 0; k < 10; k++) {
    const x = -hx + 1.5 + ((2 * hx - 3) * k) / 9;
    const dN = CY(0.55, 0.55, 0.5, x, y, hz + 0.45, 10);
    dN.rotateX(Math.PI / 2);
    geoms.push(dN);
    const dS = CY(0.55, 0.55, 0.5, x, y, -hz - 0.45, 10);
    dS.rotateX(Math.PI / 2);
    geoms.push(dS);
  }
  for (let k = 0; k < 8; k++) {
    const z = -hz + 1.5 + ((2 * hz - 3) * k) / 7;
    const d1 = CY(0.55, 0.55, 0.5, hx + 0.45, y, z, 10);
    d1.rotateZ(Math.PI / 2);
    geoms.push(d1);
    const d2 = CY(0.55, 0.55, 0.5, -hx - 0.45, y, z, 10);
    d2.rotateZ(Math.PI / 2);
    geoms.push(d2);
  }
  addPart('hubcap-frieze-band', 'Hubcap frieze band', 'ornament', geoms);
}
// Car-wheel ornamental bands on the facade, upper and lower.
function wheelBand(y, hx, hz) {
  const geoms = [];
  geoms.push(B(2 * hx + 0.6, 1.2, 0.4, 0, y + 1.6, hz + 0.2));
  geoms.push(B(2 * hx + 0.6, 1.2, 0.4, 0, y + 1.6, -hz - 0.2));
  geoms.push(B(0.4, 1.2, 2 * hz + 0.6, hx + 0.2, y + 1.6, 0));
  geoms.push(B(0.4, 1.2, 2 * hz + 0.6, -hx - 0.2, y + 1.6, 0));
  for (let k = 0; k < 8; k++) {
    const x = -hx + 2 + ((2 * hx - 4) * k) / 7;
    const wN = CY(1.0, 1.0, 0.35, x, y, hz + 0.35, 14);
    wN.rotateX(Math.PI / 2);
    geoms.push(wN);
    const wS = CY(1.0, 1.0, 0.35, x, y, -hz - 0.35, 14);
    wS.rotateX(Math.PI / 2);
    geoms.push(wS);
  }
  return geoms;
}
addPart('car-wheel-ornament-upper', 'Car wheel ornament band, upper', 'ornament',
  wheelBand(H(60) - 2.2, 17, 14));
addPart('car-wheel-ornament-lower', 'Car wheel ornament band, lower', 'ornament',
  wheelBand(H(28) - 2.2, 21, 17));
// Street entrance portals: Lexington Avenue, 42nd Street, 43rd Street.
function portal(face) {
  const g = [];
  if (face === 'lex') {
    const x = -30;
    g.push(B(1.2, 9, 1.4, x - 0.6, 4.5, -4.5));
    g.push(B(1.2, 9, 1.4, x - 0.6, 4.5, 4.5));
    g.push(B(1.4, 1.8, 10.4, x - 0.6, 9.9, 0));
    g.push(B(0.5, 7, 8, x - 0.1, 3.5, 0));
    g.push(B(3.2, 0.5, 11, x - 1.6, 8.2, 0));
    g.push(B(0.3, 2.2, 11.4, x - 3.0, 7.0, 0));
  } else {
    const s = face === '43rd' ? 1 : -1;
    const z = s * 24;
    g.push(B(1.4, 9, 1.2, -4.5, 4.5, z + s * 0.6));
    g.push(B(1.4, 9, 1.2, 4.5, 4.5, z + s * 0.6));
    g.push(B(10.4, 1.8, 1.4, 0, 9.9, z + s * 0.6));
    g.push(B(8, 7, 0.5, 0, 3.5, z + s * 0.1));
    g.push(B(11, 0.5, 3.2, 0, 8.2, z + s * 1.6));
    g.push(B(11.4, 2.2, 0.3, 0, 7.0, z + s * 3.0));
  }
  return g;
}
addPart('entrance-portal-lexington', 'Lexington Avenue entrance portal', 'ornament', portal('lex'));
addPart('entrance-portal-42nd', '42nd Street entrance portal', 'ornament', portal('42nd'));
addPart('entrance-portal-43rd', '43rd Street entrance portal', 'ornament', portal('43rd'));

// === LOBBY ===
// The three story lobby interior (materials sourced; layout schematic),
// entered from Lexington Avenue, 42nd and 43rd Streets.
const LB = { x0: -16, x1: 16, z0: -11, z1: 11, h: H(3) };
addPart('lobby-floor', 'Lobby floor', 'lobby', [
  B(LB.x1 - LB.x0, 0.4, LB.z1 - LB.z0, 0, 0.2, 0),
]);
addPart('red-moroccan-marble-walls', 'Red Moroccan marble walls', 'lobby', [
  B(32, LB.h, 0.5, 0, LB.h / 2, LB.z1 - 0.25),
  B(32, LB.h, 0.5, 0, LB.h / 2, LB.z0 + 0.25),
  B(0.5, LB.h, 22, LB.x1 - 0.25, LB.h / 2, 0),
]);
addPart('onyx-elevator-surround', 'Onyx elevator surround', 'lobby', [
  B(0.5, 9, 14, LB.x0 + 0.25, 4.5, 0),
  B(0.7, 1.2, 15, LB.x0 + 0.35, 9.6, 0),
]);
addPart('mural-ceiling-panels', 'Mural ceiling panels', 'lobby', [
  B(32, 0.4, 22, 0, LB.h - 0.2, 0),
  B(9, 0.15, 6, -10, LB.h - 0.45, 0),
  B(9, 0.15, 6, 0, LB.h - 0.45, 0),
  B(9, 0.15, 6, 10, LB.h - 0.45, 0),
]);
for (let i = 0; i < 4; i++) {
  const z = -5.25 + i * 3.5;
  addPart(`lobby-elevator-doors-${i + 1}`, `Lobby elevator doors ${i + 1}`, 'lobby', [
    B(0.35, 8, 2.4, LB.x0 + 0.4, 4, z),
    B(0.2, 7.2, 1.0, LB.x0 + 0.55, 3.6, z - 0.55),
    B(0.2, 7.2, 1.0, LB.x0 + 0.55, 3.6, z + 0.55),
  ]);
}
addPart('lobby-entrance-vestibule', 'Lobby entrance vestibule', 'lobby', [
  B(7, 8, 10, LB.x1 + 3.5, 4, 0),
  B(7, 0.5, 10, LB.x1 + 3.5, 8.2, 0),
]);

// === STRUCTURE AND CORE ===
// Steel frame column grids per height zone (sourced steel frame;
// grids schematic), floor plates, the central core, and the 32
// elevators in four banks (sourced count; bank arrangement schematic).
function columnGrid(x0, x1, nx, z0, z1, nz, ya, yb, w = 0.9) {
  const cols = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x = nx === 1 ? 0 : x0 + (((x1 - x0) * i) / (nx - 1));
      const z = nz === 1 ? 0 : z0 + (((z1 - z0) * j) / (nz - 1));
      cols.push(B(w, yb - ya, w, x, (ya + yb) / 2, z));
    }
  }
  return cols;
}
addPart('column-grid-base', 'Base column grid', 'structure-core',
  columnGrid(-27, 27, 9, -21, 21, 7, 0, H(16)));
addPart('column-grid-mid', 'Mid column grid', 'structure-core',
  columnGrid(-22, 22, 7, -17, 17, 5, H(16), H(30)));
addPart('column-grid-upper', 'Upper column grid', 'structure-core',
  columnGrid(-14, 14, 6, -11, 11, 5, H(30), H(61)));
addPart('column-grid-crown', 'Crown core column grid', 'structure-core',
  columnGrid(-8, 8, 4, -6, 6, 3, H(61), 274));
for (const f of [16, 30, 61]) {
  const t = STAGES.find((s) => Math.abs(s.yTop - H(f)) < 0.01) || STAGES[3];
  const ord = f === 16 ? '16th' : f === 30 ? '30th' : '61st';
  addPart(`diaphragm-plate-${f}`, `Diaphragm plate, ${ord} floor`, 'structure-core', [
    B(2 * t.hx - 1, 0.8, 2 * t.hz - 1, 0, H(f) - 0.4, 0),
  ]);
}
addPart('central-core-shaft', 'Central core shaft', 'structure-core', [
  B(10, 282, 8, 0, 141, 0),
]);
function elevatorBank(id, name, xs, z, ya, yb, carYs) {
  const geoms = [];
  for (const x of xs) {
    geoms.push(B(2.6, yb - ya, 2.6, x, (ya + yb) / 2, z));
    for (const cy of carYs) geoms.push(B(2.2, 2.8, 2.2, x, cy, z));
  }
  addPart(id, name, 'structure-core', geoms);
}
elevatorBank('elevator-bank-a', 'Elevator bank A', [-4.5, -1.5, 1.5, 4.5, 7.5, 10.5, -7.5, -10.5], 0, 0, H(16), [5, 30, 50]);
elevatorBank('elevator-bank-b', 'Elevator bank B', [-4.5, -1.5, 1.5, 4.5, 7.5, 10.5, -7.5, -10.5], 0, 0, H(30), [20, 60, 95]);
elevatorBank('elevator-bank-c', 'Elevator bank C', [-3.6, -1.2, 1.2, 3.6, 6.0, 8.4, -6.0, -8.4], 0, 0, H(61), [60, 130, 200]);
elevatorBank('elevator-bank-d', 'Elevator bank D', [-2.4, 0, 2.4, -4.8, 4.8, -7.2, 7.2, -9.6], 0, H(30), 274, [150, 220, 260]);
// The historic Cloud Club levels on the upper floors (sourced club,
// exact floors shown schematic).
{
  const cc = [];
  for (const f of [66, 67, 68]) {
    cc.push(B(20, 0.7, 16, 0, H(f) - 0.35, 0));
  }
  addPart('cloud-club-floor-plates', 'Cloud Club floor plates', 'structure-core', cc);
}

// === SETBACKS AND CORNICES ===
// Cornice bands and open terrace decks at the sourced setback levels,
// plus the roof platform and its parapet.
const SETBACKS = [
  { f: 16, ord: '16th', y: H(16), lhx: 30, lhz: 24, uhx: 25, uhz: 20 },
  { f: 23, ord: '23rd', y: H(22), lhx: 25, lhz: 20, uhx: 21, uhz: 17 },
  { f: 30, ord: '30th', y: H(29), lhx: 21, lhz: 17, uhx: 17, uhz: 14 },
];
for (const s of SETBACKS) {
  addPart(`setback-cornice-${s.f}`, `${s.ord} floor setback cornice`, 'setbacks-cornices', [
    B(2 * s.lhx + 2, 1.1, 2 * s.lhz + 2, 0, s.y - 0.55, 0),
  ]);
  const dy = s.y + 0.06;
  const deck = [
    B(2 * s.lhx, 0.5, s.lhz - s.uhz, 0, dy - 0.25, (s.lhz + s.uhz) / 2),
    B(2 * s.lhx, 0.5, s.lhz - s.uhz, 0, dy - 0.25, -(s.lhz + s.uhz) / 2),
    B(s.lhx - s.uhx, 0.5, 2 * s.uhz, (s.lhx + s.uhx) / 2, dy - 0.25, 0),
    B(s.lhx - s.uhx, 0.5, 2 * s.uhz, -(s.lhx + s.uhx) / 2, dy - 0.25, 0),
  ];
  const py = s.y + 0.06 + 0.6;
  deck.push(B(2 * s.lhx, 1.2, 0.3, 0, py, s.lhz - 0.15));
  deck.push(B(2 * s.lhx, 1.2, 0.3, 0, py, -(s.lhz - 0.15)));
  deck.push(B(0.3, 1.2, 2 * s.lhz - 0.6, s.lhx - 0.15, py, 0));
  deck.push(B(0.3, 1.2, 2 * s.lhz - 0.6, -(s.lhx - 0.15), py, 0));
  addPart(`setback-terrace-deck-${s.f}`, `${s.ord} floor setback terrace`, 'setbacks-cornices', deck);
}
addPart('roof-platform', 'Roof platform', 'setbacks-cornices', [
  B(10, 0.8, 8, 0, 282 - 0.4, 0),
]);
addPart('crown-parapet', 'Crown parapet', 'setbacks-cornices', [
  B(10.4, 1.2, 0.35, 0, 282 + 0.6, 3.85),
  B(10.4, 1.2, 0.35, 0, 282 + 0.6, -3.85),
  B(0.35, 1.2, 8, 5.05, 282 + 0.6, 0),
  B(0.35, 1.2, 8, -5.05, 282 + 0.6, 0),
]);

// === LIGHTING ===
{
  const fl = [];
  for (let i = 0; i < 16; i++) {
    const a = ((i / 16) * Math.PI * 2);
    fl.push(B(0.5, 0.5, 0.5, Math.cos(a) * 17.5, CROWN_BASE + 1.5, Math.sin(a) * 14.5));
  }
  addPart('crown-floodlight-ring', 'Crown floodlight ring', 'lighting', fl);
}
addPart('spire-aviation-beacon', 'Spire aviation beacon', 'lighting', [
  CY(0.08, 0.08, 1.6, 0, 318.2, 0, 8),
  B(0.45, 0.45, 0.45, 0, 319.0, 0),
]);
addPart('entrance-canopy-light-strips', 'Entrance canopy light strips', 'lighting', [
  B(2.6, 0.15, 10, -31.6, 7.9, 0),
  B(10, 0.15, 2.6, 0, 7.9, 25.6),
  B(10, 0.15, 2.6, 0, 7.9, -25.6),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.startsWith('spire-segment-') || id === 'spire-needle-tip' || id === 'spire-base-collar') return '#D7DBDE';
  if (id.includes('sunburst')) return '#E7EBEE';
  if (id.startsWith('terraced-arch-')) return '#C9CED3';
  if (id.startsWith('window-band-floor-')) return '#8FA9BC';
  if (id.startsWith('eagle-61-')) return '#9AA0A5';
  if (id.startsWith('radiator-cap-31-')) return '#C9CDD2';
  if (id === 'hubcap-frieze-band') return '#B9BEC3';
  if (id.startsWith('car-wheel-ornament-')) return '#AEB4B9';
  if (id.startsWith('entrance-portal-')) return '#6E6257';
  if (id === 'lobby-floor') return '#7A6A58';
  if (id === 'red-moroccan-marble-walls') return '#8E3B2F';
  if (id === 'onyx-elevator-surround') return '#3E2F28';
  if (id === 'mural-ceiling-panels') return '#B78D4F';
  if (id.startsWith('lobby-elevator-doors-')) return '#7A5C3E';
  if (id === 'lobby-entrance-vestibule') return '#C9BFA4';
  if (id.startsWith('column-grid-')) return '#5A626B';
  if (id.startsWith('diaphragm-plate-')) return '#6E757D';
  if (id === 'central-core-shaft') return '#7C8288';
  if (id.startsWith('elevator-bank-')) return '#B08D57';
  if (id === 'cloud-club-floor-plates') return '#8C7B5F';
  if (id.startsWith('setback-cornice-')) return '#D9D2C2';
  if (id.startsWith('setback-terrace-deck-')) return '#6F7F5E';
  if (id === 'roof-platform') return '#8A8D91';
  if (id === 'crown-parapet') return '#C9CED3';
  if (id === 'crown-floodlight-ring') return '#FFE08A';
  if (id === 'spire-aviation-beacon') return '#FF6B5E';
  if (id === 'entrance-canopy-light-strips') return '#FFE08A';
  if (id === 'h-plan-corner-wings') return '#DCD5C5';
  if (id === 'stage-a-mass') return '#E7E1D3';
  return '#E4DED2';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'shaft-facade', name: 'Shaft and facade', color: '#E4DED2', description: 'The setback tower mass in four stages, with horizontal window bands in white and dark-gray brick emphasizing the window rows.' },
  { id: 'crown', name: 'Crown', color: '#C9CED3', description: 'The seven radiating terraced arches with stylized sunburst panels in Nirosta stainless steel, rising from the 61st floor to the 925 ft roof.' },
  { id: 'spire', name: 'Spire', color: '#D7DBDE', description: 'The secret 185 ft Nirosta stainless steel spire, assembled inside the crown and raised through the roof in 90 minutes on 23 October 1929.' },
  { id: 'ornament', name: 'Automobile ornament', color: '#9AA0A5', description: 'Stainless steel ornament drawn from Chrysler automobiles: eagle gargoyles, radiator caps, hubcaps and wheel motifs, plus the three street entrance portals.' },
  { id: 'lobby', name: 'Lobby', color: '#8E6B4F', description: 'The three story lobby interior with Red Moroccan marble, onyx, and the Edward Trumbull ceiling murals.' },
  { id: 'structure-core', name: 'Structure and core', color: '#5A626B', description: 'The steel frame column grids, floor plates, the central core, and the 32 elevators, revealed when the model is exploded.' },
  { id: 'setbacks-cornices', name: 'Setbacks and cornices', color: '#D9D2C2', description: 'Cornice bands and open terrace decks at the 16th, 23rd and 30th floor setbacks, with the roof platform and crown parapet.' },
  { id: 'lighting', name: 'Lighting', color: '#FFD97A', description: 'Floodlighting for the stainless steel crown, the spire aviation beacon, and the entrance canopy lights.' },
];

// ---------------------------------------------------------------- explanations
// Keyed by lowercase part name. Every fact comes from the Wikipedia
// "Chrysler Building" article or the LPC designation report opened for
// this model; placement and proportions not stated there are schematic.
const explanations = {
  'base mass, floors 1 to 16': 'The base of the tower, floors 1 to 16, the widest of the four setback stages. The setback above the 16th floor is sourced; the exact footprint is schematic.',
  'tower mass, floors 17 to 22': 'The second setback stage, floors 17 to 22. The setback below the 23rd floor is sourced; the exact footprint is schematic.',
  'tower mass, floors 23 to 29': 'The third setback stage, floors 23 to 29. The setback below the 30th floor is sourced; the exact footprint is schematic.',
  'tower mass, floors 30 to 61': 'The main shaft, floors 30 to 61, carrying the eagle gargoyles at its corners and the crown above. The exact footprint is schematic.',
  'h-plan corner wings': 'The corner wings of the H-plan base, standing slightly proud of the main walls. The H-shaped plan is sourced; exact wing dimensions are schematic.',
  'spire base collar': 'The collar where the spire passes through the roof at 925 ft (282 m). The spire was secretly assembled inside the crown and raised through the roof in 90 minutes on 23 October 1929. Form shown schematically.',
  'hubcap frieze band': 'A frieze band of hubcap motifs ringing the 31st floor, drawn from Chrysler automobile design. Exact motif arrangement is schematic.',
  'car wheel ornament band, upper': 'An ornamental band of car-wheel motifs on the upper shaft, near the 60th floor. Exact motifs are schematic.',
  'car wheel ornament band, lower': 'An ornamental band of car-wheel motifs on the lower shaft, near the 28th floor. Exact motifs are schematic.',
  'lexington avenue entrance portal': 'The main entrance portal on Lexington Avenue. The lobby has entrances on Lexington Avenue, 42nd and 43rd Streets; the portal design is schematic.',
  '42nd street entrance portal': 'The entrance portal on 42nd Street. Portal design is schematic.',
  '43rd street entrance portal': 'The entrance portal on 43rd Street. Portal design is schematic.',
  'lobby floor': 'The floor of the three story lobby interior. Finish shown schematically.',
  'red moroccan marble walls': 'The Red Moroccan marble walls of the lobby, combined with onyx, blue marble and steel. Panel layout is schematic.',
  'onyx elevator surround': 'The onyx surround of the lobby elevator bank. Exact stonework is schematic.',
  'mural ceiling panels': 'The lobby ceiling with murals by Edward Trumbull, refurbished in 1978. Mural content is shown schematically as gold panels.',
  'lobby entrance vestibule': 'The entrance vestibule connecting the Lexington Avenue portal to the lobby. Layout is schematic.',
  'base column grid': 'Steel frame columns through the base, floors 1 to 16. The frame is shown schematically and is revealed when the model is exploded.',
  'mid column grid': 'Steel frame columns through the second and third stages, floors 17 to 29. Shown schematically.',
  'upper column grid': 'Steel frame columns through the main shaft, floors 30 to 61. Shown schematically.',
  'crown core column grid': 'Steel frame columns inside the crown, carrying the spire above. Shown schematically.',
  'central core shaft': 'The central core carrying elevators, stairs and services the full height of the building. Interior layout is schematic.',
  'elevator bank a': 'Elevator bank A: eight cars serving the lower floors, part of the 32 elevators in the building. Bank arrangement is schematic.',
  'elevator bank b': 'Elevator bank B: eight cars serving the middle floors, part of the 32 elevators in the building. Bank arrangement is schematic.',
  'elevator bank c': 'Elevator bank C: eight cars serving the upper shaft, part of the 32 elevators in the building. Bank arrangement is schematic.',
  'elevator bank d': 'Elevator bank D: eight cars serving the upper floors and the crown, part of the 32 elevators in the building. Bank arrangement is schematic.',
  'cloud club floor plates': 'Floor plates of the historic Cloud Club levels on the upper floors, a private club of the late 1920s to the 1970s. The exact floors shown are schematic.',
  '16th floor setback cornice': 'Cornice band at the setback above the 16th floor. The setback is sourced; the cornice profile is schematic.',
  '23rd floor setback cornice': 'Cornice band at the setback below the 23rd floor. The setback is sourced; the cornice profile is schematic.',
  '30th floor setback cornice': 'Cornice band at the setback below the 30th floor. The setback is sourced; the cornice profile is schematic.',
  '16th floor setback terrace': 'Open terrace deck at the 16th floor setback, ringed by a parapet. Shown schematically.',
  '23rd floor setback terrace': 'Open terrace deck at the 23rd floor setback, ringed by a parapet. Shown schematically.',
  '30th floor setback terrace': 'Open terrace deck at the 30th floor setback, ringed by a parapet. Shown schematically.',
  'roof platform': 'The roof platform at 925 ft (282 m), where the spire emerges from the crown. Shown schematically.',
  'crown parapet': 'The parapet ringing the roof platform at the top of the crown. Shown schematically.',
  'crown floodlight ring': 'Floodlights washing the stainless steel crown at night. Fixture count and placement are schematic.',
  'spire aviation beacon': 'The aviation warning beacon at the spire tip. Shown schematically.',
  'entrance canopy light strips': 'Light strips under the three entrance canopies. Shown schematically.',
};
for (const t of STAGES) {
  for (const f of t.bands) {
    explanations[`window band, floor ${f}`] =
      `Horizontal window band at floor ${f}, part of the white and dark-gray brickwork that emphasizes the horizontal window rows. Band position and mullion spacing are schematic.`;
  }
}
for (let i = 1; i <= 7; i++) {
  explanations[`terraced arch ${i} band`] =
    `Terraced arch ${i} of the seven radiating arches of the crown, clad in Nirosta stainless steel. Arch profiles and dimensions are schematic.`;
  explanations[`terraced arch ${i} sunburst panels`] =
    `The stylized sunburst panels of terraced arch ${i}: radiating stainless steel fins that give the crown its sunrise motif. Arrangement is schematic.`;
}
for (let i = 1; i <= 8; i++) {
  explanations[`spire segment ${i}`] =
    `Tapering Nirosta stainless steel segment ${i} of the spire. The full spire is 185 ft (56 m) tall and weighs 27 tons; the segment divisions are schematic.`;
}
explanations['spire needle tip'] = 'The needle tip of the spire at 1,046 ft (319 m), which made the Chrysler Building the tallest building in the world from 27 May 1930 to 1 May 1931. Exact tip form is schematic.';
{
  const corners = [
    ['northeast', 'east'], ['northeast', 'north'],
    ['southeast', 'east'], ['southeast', 'south'],
    ['southwest', 'west'], ['southwest', 'south'],
    ['northwest', 'west'], ['northwest', 'north'],
  ];
  corners.forEach(([corner, dir], i) => {
    explanations[`61st floor eagle ${i + 1} (${corner} corner, facing ${dir})`] =
      `Stylized American eagle-head gargoyle ${i + 1} on the 61st floor ${corner} corner, one of eight. Exact form and placement are schematic.`;
  });
  for (const [ci, corner] of [[1, 'northeast'], [2, 'southeast'], [3, 'southwest'], [4, 'northwest']]) {
    explanations[`31st floor radiator cap (${corner} corner)`] =
      `Replica of a 1929 Chrysler radiator cap on the ${corner} corner of the 31st floor, one of four. Exact form is schematic.`;
  }
}
for (let i = 1; i <= 4; i++) {
  explanations[`lobby elevator doors ${i}`] =
    `Elevator door ${i} of the lobby bank, one of the 32 elevators in the building. Door design is schematic.`;
}
for (const [f, ord] of [[16, '16th'], [30, '30th'], [61, '61st']]) {
  explanations[`diaphragm plate, ${ord} floor`] =
    `Floor plate bracing the steel frame at the ${ord} floor. Shown schematically.`;
}

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
const binName = 'chrysler-building-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the chrysler-building directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Chrysler Building, New York',
  title: 'Chrysler Building',
  location: 'New York, NY, USA',
  blurb: "William Van Alen's Art Deco skyscraper at 405 Lexington Avenue, completed 27 May 1930. A secret 185 ft stainless steel spire made it the tallest building in the world for 11 months; seven radiating terraced arches crown a shaft dressed in automobile ornament.",
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
  chunks: [{ url: '/models/chrysler-building/chrysler-building-0.bin', bytes: offset }],
  triangles,
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
