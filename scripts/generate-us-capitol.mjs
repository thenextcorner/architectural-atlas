// Procedural United States Capitol for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned U.S. Capitol in code and
// writes it in the atlas binary format:
//   public/models/us-capitol/atlas.json
//   public/models/us-capitol/us-capitol-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/us-capitol-attribution.md,
// opened 2026-09-30):
//   Seat of the United States Congress on Capitol Hill, Washington, D.C.;
//   neoclassical; begun 1793 (William Thornton's competition design);
//   length north to south 751 ft 4 in (229.01 m); greatest width including
//   approaches 350 ft (106.68 m); height above the east-front base line to
//   the top of the Statue of Freedom 287 ft 5 1/2 in (87.62 m); about 540
//   rooms; 658 windows, 108 in the dome; about 850 doorways; 365 steps from
//   the basement floor to the top of the dome; pre-1850 building 351 ft
//   7 1/2 in long; 1850s extensions by Thomas U. Walter more than doubled
//   the length (extension cornerstone laid July 4, 1851); wing veneer marble
//   from Lee, MA, columns from Cockeysville; cast-iron dome designed by
//   Thomas U. Walter (fourth Architect of the Capitol), constructed
//   1855-1866, 288 ft tall and 96 ft in diameter, painted to look like
//   stone, two domes one inside the other, 8,909,200 lb of cast iron,
//   frame by Janes, Fowler, Kirtland & Co. of the Bronx, 36 Corinthian
//   columns around the dome base by Poole & Hunt of Baltimore, hollow cast
//   iron; Statue of Freedom: 19.5 ft bronze, about 15,000 lb, designed by
//   Thomas Crawford, cast in five sections by Clark Mills 1860-1862 with
//   the help of the enslaved Philip Reid, final section raised December 2,
//   1863 to a 35-gun salute; Rotunda: 96 ft in diameter, 180 ft in height,
//   original walls 48 ft, built 1818-1824 under Charles Bulfinch, Bulfinch's
//   wooden dome removed fall 1856; corridors south to the House and north
//   to the Senate; National Statuary Hall immediately south of the rotunda,
//   the House chamber until 1857; Old Senate Chamber northeast, used by the
//   Senate until 1859 and the Supreme Court until 1935; Senate chamber in
//   the north wing, designed by Walter, floor 80 by 113 ft, in use since
//   January 4, 1859; crypt: circular room beneath the rotunda with 40 Doric
//   columns of Aquia Creek sandstone, holding 13 statues of the National
//   Statuary Hall Collection; Apotheosis of Washington fresco by Constantino
//   Brumidi completed 1866 in the eye of the canopy; Frieze of American
//   History in the rotunda; Olmsted commissioned 1874 for the grounds,
//   marble terraces on the north, west and south sides proposed 1875 and
//   completed 1892, octagonal Romanesque fountain added 1889, brick
//   summerhouse 1879-1881, over 100 varieties of trees and bushes; East
//   Front rebuilt 1904 to a design by Carrere and Hastings.
// Schematic (not sourced, never stated as fact in the UI): exact dome rib
// curvature and tholos column count; portico column counts and positions;
// wing facade window layouts; House chamber dimensions; interior layouts
// (desks, galleries, corridors, stairs); terrace tier heights; grounds
// planting and path layout; figure and statue profiles; cornerstone
// positions.
//
// Granularity: 104 named parts across 11 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-us-capitol.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'us-capitol');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (751 ft 4 in = 229.01 m) maps to 2.4 units.
const S = 2.4 / 229.01;

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
function cyl(rt, rb, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function cone(r, h, x, y, z, seg = 10) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(x, y, z);
  return g;
}
// Ring of n columns around (cx, cz).
function colRing(n, r, y0, y1, cr, cx = 0, cz = 0, seg = 10) {
  const g = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    g.push(cyl(cr, cr, y1 - y0, cx + r * Math.cos(a), (y0 + y1) / 2, cz + r * Math.sin(a), seg));
  }
  return g;
}
// Staircase ascending from y0 to y1 along x.
function stairs(x0, x1, y0, y1, z0, z1, n) {
  const g = [];
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    g.push(box(x0 + (x1 - x0) * t0, x0 + (x1 - x0) * t1, y0, y0 + (y1 - y0) * t1, z0, z1));
  }
  return g;
}
// Small schematic standing figure (statues).
function figure(x, y, z, s = 1) {
  const g = [];
  g.push(cyl(0.28 * s, 0.42 * s, 1.3 * s, x, y + 0.65 * s, z, 8));
  const head = new THREE.SphereGeometry(0.22 * s, 8, 6);
  head.translate(x, y + 1.55 * s, z);
  g.push(head);
  g.push(box(x - 0.3 * s, x + 0.3 * s, y, y + 0.12 * s, z - 0.3 * s, z + 0.3 * s));
  return g;
}

// ---------------------------------------------------------------- layout constants (meters, sourced where noted)
// Frame: x east, z south, y up. North is -z, south is +z.
const CBR = 14.6304; // dome and rotunda radius: 96 ft diameter
const CB = 53.59;    // central block half-length: 351 ft 7 1/2 in pre-1850
const WINGX = 45;    // wing half-width (schematic; 350 ft max incl. approaches)
const WINGZ = 114.5; // wing end (751 ft 4 in total)
const HTOP = 87.62;  // 287 ft 5 1/2 in: east-front base line to statue top
// Dome stack.
const DOME_BASE = 18, PERI_TOP = 32, DOME_TOP = 68, LAN_TOP = 76, CAP_TOP = 80, PED_TOP = 81.68;
// Rotunda interior: floor at second floor, 48 ft original walls, 180 ft canopy.
const RFLOOR = 7.3, RWALL = 21.93, RCAN = 62.16;

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Dome: Walter's cast-iron dome, 288 ft tall, 96 ft in diameter.
addPart('dome-drum', 'Dome drum', 'dome', [
  (() => { const g = new THREE.CylinderGeometry(CBR, CBR, PERI_TOP - DOME_BASE, 36, 1, true); g.translate(0, (DOME_BASE + PERI_TOP) / 2, 0); return g; })(),
]);
addPart('dome-peristyle', 'Dome peristyle columns', 'dome', colRing(36, CBR, DOME_BASE, 30, 0.55));
addPart('dome-entablature', 'Dome entablature', 'dome', [
  cyl(CBR + 0.9, CBR + 0.9, 2, 0, 31, 0, 36),
]);
addPart('dome-windows', 'Dome windows', 'dome', (() => {
  const g = [];
  for (let i = 0; i < 36; i++) {
    const a = ((i + 0.5) / 36) * Math.PI * 2;
    g.push(box(
      CBR * Math.cos(a) - 0.5, CBR * Math.cos(a) + 0.5, 21, 27,
      CBR * Math.sin(a) - 0.9, CBR * Math.sin(a) + 0.9,
    ));
  }
  return g;
})());
{
  const ribs = [];
  const NR = 36, SEG = 8;
  for (let i = 0; i < NR; i++) {
    const a = (i / NR) * Math.PI * 2;
    let prev = null;
    for (let j = 0; j <= SEG; j++) {
      const t = j / SEG;
      const r = CBR * Math.cos((t * Math.PI) / 2);
      const y = PERI_TOP + (DOME_TOP - PERI_TOP) * Math.sin((t * Math.PI) / 2);
      const p = [r * Math.cos(a), y, r * Math.sin(a)];
      if (prev) ribs.push(strut(prev, p, 0.55));
      prev = p;
    }
  }
  addPart('dome-ribs', 'Dome ribs', 'dome', ribs);
}
{
  const shell = new THREE.SphereGeometry(CBR, 36, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  shell.scale(1, (DOME_TOP - PERI_TOP) / CBR, 1); // rotate-free scale, then translate
  shell.translate(0, PERI_TOP, 0);
  addPart('dome-shell', 'Dome shell', 'dome', [shell]);
}
addPart('dome-cornice', 'Dome base cornice', 'dome', [
  cyl(CBR + 1.1, CBR + 1.1, 1.6, 0, DOME_BASE - 0.4, 0, 36),
]);
addPart('dome-lantern', 'Dome lantern drum', 'dome', [
  (() => { const g = new THREE.CylinderGeometry(3.5, 3.5, LAN_TOP - DOME_TOP, 24, 1, true); g.translate(0, (DOME_TOP + LAN_TOP) / 2, 0); return g; })(),
]);
addPart('dome-lantern-colonnade', 'Lantern colonnade', 'dome', colRing(12, 3.3, DOME_TOP, 74, 0.28, 0, 0, 8));
addPart('dome-lantern-cap', 'Lantern cap', 'dome', [
  cone(3.9, CAP_TOP - 74, 0, 74 + (CAP_TOP - 74) / 2, 0, 16),
]);
addPart('freedom-pedestal', 'Freedom pedestal', 'dome', [
  cyl(1.35, 1.6, PED_TOP - CAP_TOP, 0, (CAP_TOP + PED_TOP) / 2, 0, 12),
  (() => { const g = new THREE.SphereGeometry(1.1, 12, 8); g.translate(0, PED_TOP + 0.4, 0); return g; })(),
]);
{
  // Stylized robed figure: schematic, 19.5 ft tall overall with the pedestal globe.
  const g = [];
  g.push(cone(1.05, 3.4, 0, PED_TOP + 1.9, 0, 10));                    // robes
  g.push(cyl(0.52, 0.72, 1.1, 0, PED_TOP + 4.1, 0, 10));               // torso
  const head = new THREE.SphereGeometry(0.4, 10, 8);
  head.translate(0, PED_TOP + 5.0, 0);
  g.push(head);
  g.push(cone(0.5, 0.7, 0, PED_TOP + 5.55, 0, 8));                     // helmet crest
  g.push(strut([0.55, PED_TOP + 4.3, 0], [0.95, PED_TOP + 2.9, 0.25], 0.16)); // sword arm
  g.push(box(0.75, 1.15, PED_TOP + 2.9, PED_TOP + 4.1, 0.1, 0.4));     // sheathed sword
  g.push(box(-1.15, -0.75, PED_TOP + 3.0, PED_TOP + 4.2, -0.15, 0.15)); // shield
  addPart('statue-of-freedom', 'Statue of Freedom', 'dome', g);
}

// --- Rotunda: 96 ft in diameter, 180 ft high, built 1818-1824.
addPart('rotunda-drum', 'Rotunda drum wall', 'rotunda', [
  (() => { const g = new THREE.CylinderGeometry(CBR, CBR, DOME_BASE, 36, 1, true); g.translate(0, DOME_BASE / 2, 0); return g; })(),
]);
addPart('rotunda-cornice', 'Rotunda cornice', 'rotunda', [
  cyl(CBR + 0.7, CBR + 0.7, 1.2, 0, DOME_BASE + 0.2, 0, 36),
]);
addPart('rotunda-interior-wall', 'Rotunda interior wall', 'rotunda', [
  (() => { const g = new THREE.CylinderGeometry(13.4, 13.4, RWALL - RFLOOR, 36, 1, true); g.translate(0, (RFLOOR + RWALL) / 2, 0); return g; })(),
]);
addPart('rotunda-floor', 'Rotunda floor', 'rotunda', [
  cyl(13.4, 13.4, 0.35, 0, RFLOOR - 0.17, 0, 36),
]);
addPart('rotunda-pilasters', 'Rotunda pilasters', 'rotunda', (() => {
  const g = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    g.push(box(
      13.0 * Math.cos(a) - 0.35, 13.0 * Math.cos(a) + 0.35, RFLOOR, RWALL,
      13.0 * Math.sin(a) - 0.35, 13.0 * Math.sin(a) + 0.35,
    ));
  }
  return g;
})());
addPart('rotunda-frieze', 'Rotunda frieze', 'rotunda', [
  (() => { const g = new THREE.CylinderGeometry(13.05, 13.05, 2, 36, 1, true); g.translate(0, 15, 0); return g; })(),
]);
addPart('rotunda-paintings', 'Rotunda history paintings', 'rotunda', (() => {
  const g = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    g.push(box(
      12.6 * Math.cos(a) - 1.6, 12.6 * Math.cos(a) + 1.6, 9.5, 13.5,
      12.6 * Math.sin(a) - 0.25, 12.6 * Math.sin(a) + 0.25,
    ));
  }
  return g;
})());
addPart('rotunda-apotheosis', 'Apotheosis of Washington', 'rotunda', [
  cyl(3.2, 3.2, 0.4, 0, RCAN - 0.2, 0, 24),
]);
addPart('rotunda-inner-shell', 'Rotunda inner dome', 'rotunda', [
  (() => { const g = new THREE.CylinderGeometry(3.2, 13.4, RCAN - RWALL, 36, 1, true); g.translate(0, (RWALL + RCAN) / 2, 0); return g; })(),
]);
addPart('rotunda-doors', 'Rotunda doors', 'rotunda', [
  box(-1.8, 1.8, RFLOOR, RFLOOR + 4.5, CBR - 0.4, CBR + 0.4),   // east
  box(-1.8, 1.8, RFLOOR, RFLOOR + 4.5, -CBR - 0.4, -CBR + 0.4), // west
  box(CBR - 0.4, CBR + 0.4, RFLOOR, RFLOOR + 4.5, -1.8, 1.8),   // south
  box(-CBR - 0.4, -CBR + 0.4, RFLOOR, RFLOOR + 4.5, -1.8, 1.8), // north
]);
addPart('rotunda-stair-east', 'Rotunda east stair', 'rotunda', stairs(6, 12, 0, RFLOOR, -2, 2, 10));
addPart('rotunda-stair-west', 'Rotunda west stair', 'rotunda', stairs(-12, -6, 0, RFLOOR, -2, 2, 10));

// --- Central block: Thornton's original building, 351 ft 7 1/2 in pre-1850.
addPart('center-body', 'Central block', 'center-block', [
  box(-20, 20, 0, DOME_BASE, -CB, CB),
]);
addPart('center-roof', 'Central block roof', 'center-block', [
  box(-20.6, 20.6, DOME_BASE, DOME_BASE + 0.8, -CB - 0.6, CB + 0.6),
]);
addPart('center-cornice', 'Central block cornice', 'center-block', [
  box(-20.5, 20.5, 16.6, DOME_BASE, -CB - 0.5, -CB + 0.2),
  box(-20.5, 20.5, 16.6, DOME_BASE, CB - 0.2, CB + 0.5),
  box(19.8, 20.5, 16.6, DOME_BASE, -CB, CB),
  box(-20.5, -19.8, 16.6, DOME_BASE, -CB, CB),
]);
{
  // Semi-circular National Statuary Hall, south of the rotunda.
  const g = [];
  const hall = new THREE.CylinderGeometry(10, 10, 15 - RFLOOR, 24, 1, false, 0, Math.PI);
  hall.rotateY(-Math.PI / 2); // curved wall faces south, flat side toward the rotunda
  hall.translate(0, (RFLOOR + 15) / 2, 28);
  g.push(hall);
  addPart('statuary-hall', 'National Statuary Hall', 'center-block', g);
}
{
  const g = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 11) * Math.PI; // arc along the curved wall
    g.push(...figure(8.2 * Math.cos(a), RFLOOR, 28 + 8.2 * Math.sin(a), 1.6));
  }
  addPart('statuary-hall-statues', 'Statuary Hall statues', 'center-block', g);
}
addPart('old-senate-chamber', 'Old Senate Chamber', 'center-block', [
  box(4, 16, RFLOOR, 14.5, -40, -22),
  box(5, 15, RFLOOR, RFLOOR + 0.5, -39, -23),
]);
addPart('old-supreme-court', 'Old Supreme Court chamber', 'center-block', [
  box(-16, -4, 0, 6.8, -40, -22),
]);
{
  const g = [];
  for (let z = -48; z <= 48; z += 6) {
    g.push(box(20, 20.35, 3, 6, z - 1.1, z + 1.1));
    g.push(box(20, 20.35, 9.5, 12.5, z - 1.1, z + 1.1));
  }
  addPart('center-windows-east', 'Central block east windows', 'center-block', g);
}
{
  const g = [];
  for (let z = -48; z <= 48; z += 6) {
    g.push(box(-20.35, -20, 3, 6, z - 1.1, z + 1.1));
    g.push(box(-20.35, -20, 9.5, 12.5, z - 1.1, z + 1.1));
  }
  addPart('center-windows-west', 'Central block west windows', 'center-block', g);
}
addPart('east-front-extension', 'East Front extension', 'center-block', [
  box(20, 26, 0, DOME_BASE, -40, 40),
]);
addPart('center-vaults', 'Central block vaults', 'center-block', [
  box(-19, 19, -3, 0, -CB + 1, CB - 1),
]);
addPart('center-doors', 'Central block doors', 'center-block', [
  box(20, 20.6, 0, 5.5, -2.5, 2.5),
  box(-20.6, -20, 0, 5.5, -2.5, 2.5),
]);

// --- Senate wing: north wing, Walter's 1850s extension.
addPart('senate-body', 'Senate wing', 'senate-wing', [
  box(-WINGX, WINGX, 0, 20, -WINGZ, -CB),
]);
addPart('senate-roof', 'Senate wing roof', 'senate-wing', [
  box(-WINGX - 0.6, WINGX + 0.6, 20, 20.8, -WINGZ - 0.6, -CB + 0.6),
]);
addPart('senate-cornice', 'Senate wing cornice', 'senate-wing', [
  box(-WINGX - 0.5, WINGX + 0.5, 18.6, 20, -WINGZ - 0.5, -WINGZ + 0.2),
  box(-WINGX - 0.5, -WINGX + 0.2, 18.6, 20, -WINGZ, -CB),
  box(WINGX - 0.2, WINGX + 0.5, 18.6, 20, -WINGZ, -CB),
]);
addPart('senate-chamber', 'Senate chamber', 'senate-wing', [
  // Floor 80 by 113 ft, second floor.
  box(-12.19, 12.19, RFLOOR, 16.5, -102.2, -67.76),
]);
{
  // 100 desks on a tiered semicircular platform facing the rostrum (east).
  const g = [];
  for (let row = 0; row < 5; row++) {
    const r = 4 + row * 2;
    for (let k = 0; k < 20; k++) {
      const a = -1.2 + (2.4 * k) / 19;
      const x = 11 - r * Math.cos(a), z = -85 + r * Math.sin(a);
      g.push(box(x - 0.45, x + 0.45, RFLOOR + row * 0.55, RFLOOR + row * 0.55 + 0.75, z - 0.35, z + 0.35));
    }
  }
  addPart('senate-desks', 'Senate desks', 'senate-wing', g);
}
addPart('senate-rostrum', 'Senate rostrum', 'senate-wing', [
  box(10.5, 12.19, RFLOOR, RFLOOR + 1.6, -90, -80),
  box(9.5, 10.5, RFLOOR, RFLOOR + 2.6, -87.5, -82.5),
]);
addPart('senate-gallery', 'Senate gallery', 'senate-wing', [
  box(-12.19, 12.19, 13.2, 13.8, -102.2, -99.5),
  box(-12.19, 12.19, 13.2, 13.8, -70.5, -67.76),
  box(-12.19, -9.5, 13.2, 13.8, -99.5, -70.5),
  box(9.5, 12.19, 13.2, 13.8, -99.5, -70.5),
]);
{
  const g = [];
  for (let x = -40; x <= 40; x += 5) {
    g.push(box(x - 1.1, x + 1.1, 3, 6, -WINGZ, -WINGZ + 0.35));
    g.push(box(x - 1.1, x + 1.1, 9.5, 12.5, -WINGZ, -WINGZ + 0.35));
    g.push(box(x - 1.1, x + 1.1, 14.5, 17, -WINGZ, -WINGZ + 0.35));
  }
  addPart('senate-windows-north', 'Senate wing north windows', 'senate-wing', g);
}
{
  const g = [];
  for (let z = -110; z <= -58; z += 6) {
    g.push(box(WINGX, WINGX + 0.35, 3, 6, z - 1.1, z + 1.1));
    g.push(box(WINGX, WINGX + 0.35, 9.5, 12.5, z - 1.1, z + 1.1));
    g.push(box(WINGX, WINGX + 0.35, 14.5, 17, z - 1.1, z + 1.1));
  }
  addPart('senate-windows-east', 'Senate wing east windows', 'senate-wing', g);
}
{
  const g = [];
  for (let z = -110; z <= -58; z += 6) {
    g.push(box(-WINGX - 0.35, -WINGX, 3, 6, z - 1.1, z + 1.1));
    g.push(box(-WINGX - 0.35, -WINGX, 9.5, 12.5, z - 1.1, z + 1.1));
    g.push(box(-WINGX - 0.35, -WINGX, 14.5, 17, z - 1.1, z + 1.1));
  }
  addPart('senate-windows-west', 'Senate wing west windows', 'senate-wing', g);
}
addPart('senate-reception', 'Senate Reception Room', 'senate-wing', [
  box(-20, -8, RFLOOR, 14, -66, -58),
]);

// --- House wing: south wing, Walter's 1850s extension.
addPart('house-body', 'House wing', 'house-wing', [
  box(-WINGX, WINGX, 0, 20, CB, WINGZ),
]);
addPart('house-roof', 'House wing roof', 'house-wing', [
  box(-WINGX - 0.6, WINGX + 0.6, 20, 20.8, CB - 0.6, WINGZ + 0.6),
]);
addPart('house-cornice', 'House wing cornice', 'house-wing', [
  box(-WINGX - 0.5, WINGX + 0.5, 18.6, 20, WINGZ - 0.2, WINGZ + 0.5),
  box(-WINGX - 0.5, -WINGX + 0.2, 18.6, 20, CB, WINGZ),
  box(WINGX - 0.2, WINGX + 0.5, 18.6, 20, CB, WINGZ),
]);
addPart('house-chamber', 'House chamber', 'house-wing', [
  // Schematic volume, larger than the Senate chamber, in use since 1857.
  box(-16, 16, RFLOOR, 17, 66, 108),
]);
{
  // 435 desks in tiered arcs facing the rostrum (schematic arrangement).
  const g = [];
  for (let row = 0; row < 5; row++) {
    const r = 5 + row * 2.4;
    for (let k = 0; k < 87; k++) {
      const a = -1.25 + (2.5 * k) / 86;
      const x = 14 - r * Math.cos(a), z = 87 + r * Math.sin(a);
      g.push(box(x - 0.45, x + 0.45, RFLOOR + row * 0.55, RFLOOR + row * 0.55 + 0.75, z - 0.35, z + 0.35));
    }
  }
  addPart('house-desks', 'House desks', 'house-wing', g);
}
addPart('house-rostrum', 'House rostrum', 'house-wing', [
  box(14, 16, RFLOOR, RFLOOR + 1.8, 81, 93),
  box(12.8, 14, RFLOOR, RFLOOR + 2.8, 84, 90),
]);
addPart('house-gallery', 'House gallery', 'house-wing', [
  box(-16, 16, 13.6, 14.2, 66, 69),
  box(-16, 16, 13.6, 14.2, 105, 108),
  box(-16, -13, 13.6, 14.2, 69, 105),
  box(13, 16, 13.6, 14.2, 69, 105),
]);
{
  const g = [];
  for (let x = -40; x <= 40; x += 5) {
    g.push(box(x - 1.1, x + 1.1, 3, 6, WINGZ - 0.35, WINGZ));
    g.push(box(x - 1.1, x + 1.1, 9.5, 12.5, WINGZ - 0.35, WINGZ));
    g.push(box(x - 1.1, x + 1.1, 14.5, 17, WINGZ - 0.35, WINGZ));
  }
  addPart('house-windows-south', 'House wing south windows', 'house-wing', g);
}
{
  const g = [];
  for (let z = 58; z <= 110; z += 6) {
    g.push(box(WINGX, WINGX + 0.35, 3, 6, z - 1.1, z + 1.1));
    g.push(box(WINGX, WINGX + 0.35, 9.5, 12.5, z - 1.1, z + 1.1));
    g.push(box(WINGX, WINGX + 0.35, 14.5, 17, z - 1.1, z + 1.1));
  }
  addPart('house-windows-east', 'House wing east windows', 'house-wing', g);
}
{
  const g = [];
  for (let z = 58; z <= 110; z += 6) {
    g.push(box(-WINGX - 0.35, -WINGX, 3, 6, z - 1.1, z + 1.1));
    g.push(box(-WINGX - 0.35, -WINGX, 9.5, 12.5, z - 1.1, z + 1.1));
    g.push(box(-WINGX - 0.35, -WINGX, 14.5, 17, z - 1.1, z + 1.1));
  }
  addPart('house-windows-west', 'House wing west windows', 'house-wing', g);
}
addPart('speakers-lobby', 'Speaker\u2019s Lobby', 'house-wing', [
  box(16.5, 24, RFLOOR, 13, 80, 94),
]);

// --- Porticos: column counts and positions are schematic.
// Triangular gable: triangular profile across z (z0..z1), thickness along
// x (x0..x1), base at y0. Rotate before translating.
function pediment(x0, x1, y0, z0, z1) {
  const shape = new THREE.Shape();
  shape.moveTo(-z0, y0);
  shape.lineTo(-z1, y0);
  shape.lineTo(-(z0 + z1) / 2, y0 + ((z1 - z0) / 2) * 0.28);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false });
  g.rotateY(Math.PI / 2); // (u,v,w) -> (w, v, -u): thickness along x, profile across z
  g.translate(x0, 0, 0);
  return g;
}
{
  const cols = [];
  for (let z = -18; z <= 18; z += 4) cols.push(cyl(0.7, 0.8, 16 - RFLOOR, 24, (RFLOOR + 16) / 2, z, 10));
  cols.push(box(22.5, 25.5, 16, 17, -20, 20));
  addPart('east-portico', 'East Portico', 'porticos', cols);
  addPart('east-pediment', 'East pediment', 'porticos', [pediment(22.5, 25.5, 17, -20, 20)]);
}
{
  const cols = [];
  for (let z = -18; z <= 18; z += 4) cols.push(cyl(0.7, 0.8, 16 - RFLOOR, -24, (RFLOOR + 16) / 2, z, 10));
  cols.push(box(-25.5, -22.5, 16, 17, -20, 20));
  addPart('west-portico', 'West Portico', 'porticos', cols);
  addPart('west-pediment', 'West pediment', 'porticos', [pediment(-25.5, -22.5, 17, -20, 20)]);
}
{
  const cols = [];
  for (let z = -100; z <= -70; z += 5) cols.push(cyl(0.7, 0.8, 12.7, -49, 13.65, z, 10));
  cols.push(box(-50.5, -47.5, 20, 21, -102, -68));
  addPart('senate-west-portico', 'Senate west portico', 'porticos', cols);
}
{
  const cols = [];
  for (let z = -100; z <= -70; z += 5) cols.push(cyl(0.7, 0.8, 12.7, 49, 13.65, z, 10));
  cols.push(box(47.5, 50.5, 20, 21, -102, -68));
  addPart('senate-east-portico', 'Senate east portico', 'porticos', cols);
}
{
  const cols = [];
  for (let x = -18; x <= 18; x += 4) cols.push(cyl(0.7, 0.8, 12.7, x, 13.65, -WINGZ - 4, 10));
  cols.push(box(-20, 20, 20, 21, -WINGZ - 5.5, -WINGZ - 2.5));
  addPart('senate-north-portico', 'Senate north portico', 'porticos', cols);
}
{
  const cols = [];
  for (let z = 70; z <= 100; z += 5) cols.push(cyl(0.7, 0.8, 12.7, -49, 13.65, z, 10));
  cols.push(box(-50.5, -47.5, 20, 21, 68, 102));
  addPart('house-west-portico', 'House west portico', 'porticos', cols);
}
{
  const cols = [];
  for (let z = 70; z <= 100; z += 5) cols.push(cyl(0.7, 0.8, 12.7, 49, 13.65, z, 10));
  cols.push(box(47.5, 50.5, 20, 21, 68, 102));
  addPart('house-east-portico', 'House east portico', 'porticos', cols);
}
{
  const cols = [];
  for (let x = -18; x <= 18; x += 4) cols.push(cyl(0.7, 0.8, 12.7, x, 13.65, WINGZ + 4, 10));
  cols.push(box(-20, 20, 20, 21, WINGZ + 2.5, WINGZ + 5.5));
  addPart('house-south-portico', 'House south portico', 'porticos', cols);
}
addPart('east-steps', 'East Front steps', 'porticos', stairs(26, 36, 0, RFLOOR, -14, 14, 12));

// --- Crypt and ground floor: 40 Doric columns of Aquia Creek sandstone.
{
  const g = [];
  let placed = 0;
  for (let ix = -2; ix <= 2 && placed < 40; ix++) {
    for (let iz = -4; iz <= 4 && placed < 40; iz++) {
      const x = ix * 4.6, z = iz * 3.4;
      if (Math.hypot(x, z) > 13) continue;
      g.push(cyl(0.55, 0.65, RFLOOR, x, RFLOOR / 2, z, 10));
      placed++;
    }
  }
  addPart('crypt-columns', 'Crypt columns', 'crypt', g);
}
addPart('crypt-vaults', 'Crypt vault ceiling', 'crypt', [
  cyl(13.4, 13.4, 0.6, 0, RFLOOR - 0.3, 0, 36),
]);
addPart('washingtons-tomb', 'Washington\u2019s Tomb', 'crypt', [
  box(-4, 4, -4.5, -0.2, -4, 4),
  box(-1.2, 1.2, -4.5, -3.2, -2.5, 2.5),
]);
addPart('compass-stone', 'Compass stone', 'crypt', [
  cyl(0.8, 0.8, 0.12, 0, 0.06, 0, 16),
]);
{
  const g = [];
  for (let i = 0; i < 13; i++) {
    const a = (i / 13) * Math.PI * 2;
    g.push(...figure(10.5 * Math.cos(a), 0, 10.5 * Math.sin(a), 1.6));
  }
  addPart('crypt-statues', 'Crypt statues', 'crypt', g);
}
addPart('foundation-slab', 'Foundation slab', 'crypt', [
  box(-50, 50, -0.6, 0, -116, 116),
]);
addPart('crypt-stair', 'Crypt stair', 'crypt', stairs(-2, 2, -4.5, 0, -6, -2, 8));

// --- Corridors and stairs linking rotunda, wings and the visitor level.
addPart('north-corridor', 'North connector corridor', 'corridors', [
  box(-4, 4, 0, RFLOOR, -62, -45),
]);
addPart('south-corridor', 'South connector corridor', 'corridors', [
  box(-4, 4, 0, RFLOOR, 45, 62),
]);
addPart('east-corridor', 'East connector corridor', 'corridors', [
  box(20, 36, 0, RFLOOR, -4, 4),
]);
addPart('north-grand-stair', 'Senate grand stair', 'corridors', stairs(-40, -28, 0, RFLOOR, -60, -56, 12));
addPart('south-grand-stair', 'House grand stair', 'corridors', stairs(28, 40, 0, RFLOOR, 56, 60, 12));
addPart('visitor-center', 'Capitol Visitor Center', 'corridors', [
  box(42, 80, -8, -1, -25, 25),
  box(36, 42, -8, -1, -8, 8),
]);

// --- Terraces: Olmsted's marble terraces on the north, west and south.
addPart('west-terrace', 'West marble terrace', 'terraces', [
  box(-46, -32, 0, 2.2, -80, 80),
  box(-50, -46, 0, 4.4, -80, 80),
  box(-54, -50, 0, 6.6, -80, 80),
]);
addPart('north-terrace', 'North marble terrace', 'terraces', [
  box(-40, 40, 0, 3, -126, -116),
]);
addPart('south-terrace', 'South marble terrace', 'terraces', [
  box(-40, 40, 0, 3, 116, 126),
]);
addPart('west-grand-stairs', 'West terrace grand stairs', 'terraces', stairs(-66, -54, 0, 6.6, -9, 9, 14));
addPart('terrace-fountain', 'Terrace fountain', 'terraces', [
  (() => { const g = new THREE.CylinderGeometry(2.6, 2.9, 1.6, 8); g.translate(-60, 7.4, 0); return g; })(),
  cyl(0.4, 0.5, 2.2, -60, 8.2, 0, 8),
]);
addPart('terrace-rooms', 'Terrace committee rooms', 'terraces', [
  box(-53, -33, 0, 5.5, -70, 70),
]);
addPart('terrace-balustrade', 'Terrace balustrade', 'terraces', [
  box(-54.2, -53.8, 6.6, 7.8, -80, 80),
  box(-40.2, -39.8, 3, 4.2, -126, -116),
  box(39.8, 40.2, 3, 4.2, 116, 126),
]);
addPart('inaugural-platform', 'Inaugural platform', 'terraces', [
  box(-52, -34, 6.6, 7.6, -14, 14),
]);

// --- Grounds: Olmsted's landscape, kept inside the building's footprint.
addPart('west-lawn', 'West lawn', 'grounds', [box(-115, -66, -0.4, 0, -80, 80)]);
addPart('east-lawn', 'East lawn', 'grounds', [box(55, 115, -0.4, 0, -80, 80)]);
addPart('north-lawn', 'North lawn', 'grounds', [box(-55, 55, -0.4, 0, -115, -80)]);
addPart('south-lawn', 'South lawn', 'grounds', [box(-55, 55, -0.4, 0, 80, 115)]);
{
  const g = [];
  // Curved walkways: flat arc strips west and east of the building.
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= 20; i++) {
      const a = (-0.9 + (1.8 * i) / 20);
      const r = 78;
      g.push(box(
        sx * (r * Math.cos(a)) - 1.4, sx * (r * Math.cos(a)) + 1.4, -0.05, 0.12,
        r * Math.sin(a) - 1.4, r * Math.sin(a) + 1.4,
      ));
    }
  }
  addPart('grounds-paths', 'Grounds paths', 'grounds', g);
}
{
  const g = [];
  // Schematic tree clusters; Olmsted planted over 100 varieties.
  const spots = [
    [-90, -50], [-95, 20], [-85, 60], [80, -55], [90, 30], [75, 65],
    [-60, -95], [55, 95], [-70, 95], [70, -95], [-100, -20], [100, -10],
  ];
  for (const [x, z] of spots) {
    g.push(cyl(0.25, 0.35, 2.2, x, 1.1, z, 6));
    const crown = new THREE.SphereGeometry(2.2, 8, 6);
    crown.translate(x, 3.6, z);
    g.push(crown);
  }
  addPart('grounds-trees', 'Grounds trees', 'grounds', g);
}
{
  const g = [];
  // Octagonal brick summerhouse with a central fountain, 1879-1881.
  const walls = new THREE.CylinderGeometry(4, 4, 3.6, 8, 1, true);
  walls.translate(-80, 1.8, -50);
  g.push(walls);
  const roof = new THREE.ConeGeometry(4.6, 1.8, 8);
  roof.translate(-80, 4.5, -50);
  g.push(roof);
  g.push(cyl(0.9, 1.1, 1.2, -80, 0.6, -50, 8));
  addPart('summerhouse', 'Summerhouse', 'grounds', g);
}
addPart('reflecting-pool', 'Capitol Reflecting Pool', 'grounds', [
  box(-112, -72, -0.3, 0.15, -7, 7),
]);

// --- Ornament and flags.
addPart('east-pediment-sculpture', 'East pediment sculpture', 'ornament', (() => {
  const g = [];
  for (let i = -3; i <= 3; i++) g.push(...figure(24, 17.4 + (3 - Math.abs(i)) * 0.5, i * 4.5, 1.9));
  return g;
})());
addPart('west-pediment-sculpture', 'West pediment sculpture', 'ornament', (() => {
  const g = [];
  for (let i = -3; i <= 3; i++) g.push(...figure(-24, 17.4 + (3 - Math.abs(i)) * 0.5, i * 4.5, 1.9));
  return g;
})());
{
  const g = [cyl(0.09, 0.12, 9, -20, 25.3, -85, 6)];
  g.push(box(-20, -18.6, 27.5, 29.3, -85.7, -84.3)); // flag flies when the Senate sits
  addPart('senate-flag', 'Senate flag', 'ornament', g);
}
{
  const g = [cyl(0.09, 0.12, 9, 20, 25.3, 85, 6)];
  g.push(box(18.6, 20, 27.5, 29.3, 84.3, 85.7)); // flag flies when the House sits
  addPart('house-flag', 'House flag', 'ornament', g);
}
addPart('east-bronze-doors', 'East bronze doors', 'ornament', [
  box(25.5, 25.9, 0, 5.5, -3.2, -0.2),
  box(25.5, 25.9, 0, 5.5, 0.2, 3.2),
]);
addPart('cornerstone-1851', '1851 cornerstone', 'ornament', [
  box(43.5, 45, 0, 1.6, 52, 53.6),
]);

// ---------------------------------------------------------------- colors
// Schematic light palette: sandstone cream, Lee marble white, cast-iron
// dome painted stone-pale, bronze green for the statue, dark glazing.
function colorFor(id) {
  if (id === 'dome-drum' || id === 'dome-lantern') return '#d8d4c8';
  if (id === 'dome-peristyle' || id === 'dome-lantern-colonnade') return '#e2ded2';
  if (id === 'dome-entablature' || id === 'dome-cornice') return '#cfccc0';
  if (id === 'dome-windows') return '#3d4a56';
  if (id === 'dome-ribs' || id === 'dome-shell' || id === 'dome-lantern-cap') return '#ddd9cd';
  if (id === 'freedom-pedestal') return '#8a8578';
  if (id === 'statue-of-freedom') return '#7d8a68';
  if (id === 'rotunda-drum') return '#e6dcc3';
  if (id === 'rotunda-cornice') return '#d9cfae';
  if (id === 'rotunda-interior-wall' || id === 'rotunda-inner-shell') return '#efe6d0';
  if (id === 'rotunda-floor') return '#d9cfbb';
  if (id === 'rotunda-pilasters') return '#e0d3ae';
  if (id === 'rotunda-frieze') return '#c9bfa4';
  if (id === 'rotunda-paintings' || id === 'rotunda-doors') return '#6b5a44';
  if (id === 'rotunda-apotheosis') return '#a8b8c8';
  if (id === 'rotunda-stair-east' || id === 'rotunda-stair-west') return '#cfc4a8';
  if (id === 'center-body') return '#e6dcc3';
  if (id === 'center-roof') return '#b9b3a4';
  if (id === 'center-cornice') return '#d9cfae';
  if (id === 'statuary-hall') return '#efe6d0';
  if (id === 'statuary-hall-statues' || id === 'crypt-statues') return '#d9d2bd';
  if (id === 'old-senate-chamber') return '#cbbfa0';
  if (id === 'old-supreme-court') return '#c4b797';
  if (id === 'center-windows-east' || id === 'center-windows-west') return '#3d4a56';
  if (id === 'east-front-extension') return '#efece2';
  if (id === 'center-vaults') return '#a89f88';
  if (id === 'center-doors') return '#6b5a44';
  if (id === 'senate-body' || id === 'house-body') return '#efece2';
  if (id === 'senate-roof' || id === 'house-roof') return '#b9b3a4';
  if (id === 'senate-cornice' || id === 'house-cornice') return '#ddd8c8';
  if (id === 'senate-chamber' || id === 'house-chamber') return '#d9cba8';
  if (id === 'senate-desks' || id === 'house-desks') return '#8a6f4d';
  if (id === 'senate-rostrum' || id === 'house-rostrum') return '#7a6242';
  if (id === 'senate-gallery' || id === 'house-gallery') return '#a98d64';
  if (id.startsWith('senate-windows-') || id.startsWith('house-windows-')) return '#3d4a56';
  if (id === 'senate-reception' || id === 'speakers-lobby') return '#d9cba8';
  if (id.endsWith('-portico') && !id.endsWith('-portico-sculpture')) return '#e8e4d6';
  if (id.endsWith('-pediment')) return '#e0dccb';
  if (id === 'east-steps') return '#cfc4a8';
  if (id === 'crypt-columns') return '#c9bfa4';
  if (id === 'crypt-vaults' || id === 'crypt-stair') return '#b5ab93';
  if (id === 'washingtons-tomb') return '#8a8172';
  if (id === 'compass-stone') return '#f0f0ea';
  if (id === 'foundation-slab') return '#9d978b';
  if (id === 'north-corridor' || id === 'south-corridor' || id === 'east-corridor') return '#d9cba8';
  if (id === 'north-grand-stair' || id === 'south-grand-stair') return '#cfc4a8';
  if (id === 'visitor-center') return '#b5ab93';
  if (id === 'west-terrace' || id === 'north-terrace' || id === 'south-terrace') return '#e8e4d6';
  if (id === 'terrace-fountain') return '#d0d8dc';
  if (id === 'terrace-balustrade') return '#ddd8c8';
  if (id === 'terrace-rooms') return '#d5cdb4';
  if (id === 'inaugural-platform') return '#8a8478';
  if (id.endsWith('-lawn')) return '#7fae6a';
  if (id === 'grounds-paths') return '#cfc4a8';
  if (id === 'grounds-trees') return '#5d8a52';
  if (id === 'summerhouse') return '#b08a5e';
  if (id === 'reflecting-pool') return '#7fb3d5';
  if (id === 'east-pediment-sculpture' || id === 'west-pediment-sculpture') return '#d9d2bd';
  if (id === 'senate-flag' || id === 'house-flag') return '#b04a3a';
  if (id === 'east-bronze-doors') return '#6b5a3a';
  if (id === 'cornerstone-1851') return '#b9a86a';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'dome', name: 'Dome', color: '#d8d4c8', description: 'Thomas U. Walter\u2019s cast-iron dome, 288 ft tall and 96 ft in diameter, built 1855 to 1866: drum, peristyle colonnade, ribs, lantern and the Statue of Freedom.' },
  { id: 'rotunda', name: 'Rotunda', color: '#e6dcc3', description: 'The 96 ft circular hall beneath the dome, built 1818 to 1824: walls, frieze, history paintings and Brumidi\u2019s Apotheosis of Washington in the canopy.' },
  { id: 'center-block', name: 'Central Block', color: '#e6dcc3', description: 'The original central building from Thornton\u2019s 1793 design: Statuary Hall, the old chambers and the East Front extension.' },
  { id: 'senate-wing', name: 'Senate Wing', color: '#efece2', description: 'The north wing of Walter\u2019s 1850s extension, in Lee marble: the Senate chamber, floor 80 by 113 ft, in use since January 4, 1859.' },
  { id: 'house-wing', name: 'House Wing', color: '#efece2', description: 'The south wing of Walter\u2019s 1850s extension, in Lee marble: the House chamber in use since 1857.' },
  { id: 'porticos', name: 'Porticos', color: '#e8e4d6', description: 'The columned porticos and pediments of the east and west fronts and the wing ends (column counts schematic).' },
  { id: 'crypt', name: 'Crypt and Ground Floor', color: '#c9bfa4', description: 'The circular crypt beneath the rotunda with its 40 Doric sandstone columns, Washington\u2019s Tomb and the foundation.' },
  { id: 'corridors', name: 'Corridors and Stairs', color: '#d9cba8', description: 'Connector corridors, grand stairs and the underground Capitol Visitor Center.' },
  { id: 'terraces', name: 'Terraces', color: '#e8e4d6', description: 'Frederick Law Olmsted\u2019s marble terraces on the north, west and south sides, completed 1892.' },
  { id: 'grounds', name: 'Grounds', color: '#7fae6a', description: 'Olmsted\u2019s landscaped grounds: lawns, paths, trees, the 1879 to 1881 summerhouse and the Reflecting Pool (layout schematic).' },
  { id: 'ornament', name: 'Ornament and Flags', color: '#d9d2bd', description: 'Pediment sculpture, bronze doors, the 1851 cornerstone and the chamber flags that fly when each house sits.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'dome drum': 'The drum carrying Walter\u2019s cast-iron dome, ringed by the peristyle colonnade. The dome is 288 ft tall and 96 ft in diameter, built 1855 to 1866, and is really two domes, one inside the other. Exact drum profile is schematic.',
  'dome peristyle columns': 'Thirty-six hollow cast-iron Corinthian columns around the base of the dome, supplied by Poole and Hunt of Baltimore. They are purely decorative and carry none of the dome\u2019s weight. Positions are schematic.',
  'dome entablature': 'The entablature crowning the peristyle, doubling as flues and rain leaders for the rooms below. Exact profile is schematic.',
  'dome ribs': 'The cast-iron ribs that carry the dome\u2019s shell, the inner shell with the Apotheosis of Washington, and the tholos. The frame was built by Janes, Fowler, Kirtland and Co. of the Bronx. Exact rib curvature is schematic.',
  'dome shell': 'The outer cast-iron shell of the dome, made of fish-scaled overlapping plates painted to look like the stone of the building below. Exact surface is schematic.',
  'dome windows': 'A selection of the 108 windows in the dome, lighting the rotunda from the drum. Exact window layout is schematic.',
  'dome base cornice': 'Cornice at the foot of the dome drum, spreading its visual weight onto the rotunda walls. Exact profile is schematic.',
  'dome lantern drum': 'The tholos, the small lantern temple above the dome that carries the Statue of Freedom. Dimensions are schematic.',
  'lantern colonnade': 'The colonnade ringing the tholos lantern. Column count is schematic.',
  'lantern cap': 'The cap over the lantern, the last ironwork before the statue\u2019s pedestal. Exact profile is schematic.',
  'freedom pedestal': 'The cast-iron pedestal and globe on which the Statue of Freedom stands. Exact shape is schematic.',
  'statue of freedom': 'The 19.5 ft bronze Statue of Freedom by Thomas Crawford, weighing about 15,000 lb: a female allegorical figure with a sheathed sword, laurel wreath and shield. Cast in five sections by Clark Mills in 1860 to 1862 with the help of the enslaved Philip Reid, and raised on December 2, 1863 to a 35-gun salute. This figure is a stylized schematic.',
  'rotunda drum wall': 'The circular sandstone wall of the rotunda, 96 ft across, rising through the central block to carry the dome. Built 1818 to 1824 under Charles Bulfinch from William Thornton\u2019s 1793 design. Exact wall treatment is schematic.',
  'rotunda cornice': 'Cornice crowning the rotunda drum where the dome\u2019s peristyle begins. Exact profile is schematic.',
  'rotunda interior wall': 'The curved interior wall of the rotunda, rising 48 ft above the floor to the top of Bulfinch\u2019s original walls. Exact surface is schematic.',
  'rotunda floor': 'The second-floor level of the rotunda, the ceremonial heart of the Capitol where honored dead lie in state. Exact floor pattern is schematic.',
  'rotunda pilasters': 'Fluted Doric pilasters dividing the curved rotunda wall, a schematic rendering of Bulfinch\u2019s neoclassical detail.',
  'rotunda frieze': 'The Frieze of American History circling the rotunda wall. Exact artwork is schematic.',
  'rotunda history paintings': 'Four of the large history paintings hung in the rotunda, including Trumbull\u2019s Declaration of Independence, Surrender of Lord Cornwallis and Washington Resigning His Commission. Frames and positions are schematic.',
  'apotheosis of washington': 'Constantino Brumidi\u2019s fresco of the Apotheosis of Washington, completed in 1866 in the oculus at the top of the inner dome, 180 ft above the rotunda floor. This disc is a schematic marker.',
  'rotunda inner dome': 'The inner of Walter\u2019s two domes, seen from the rotunda floor rising to the canopy. Exact profile is schematic.',
  'rotunda doors': 'The four doorways of the rotunda, opening north to the Senate, south to the House, east to the front and west to the terraces. Exact door design is schematic.',
  'rotunda east stair': 'Staircase rising to the rotunda floor on the east side. Exact stair layout is schematic.',
  'rotunda west stair': 'Staircase rising to the rotunda floor on the west side. Exact stair layout is schematic.',
  'central block': 'The original central building from Thornton\u2019s 1793 competition design, 351 ft 7 1/2 in long before Walter\u2019s extensions. Exact massing is schematic.',
  'central block roof': 'Roof slab of the central block carrying the dome drum. Exact construction is schematic.',
  'central block cornice': 'Cornice banding the central block below the roofline. Exact profile is schematic.',
  'national statuary hall': 'The semi-circular National Statuary Hall immediately south of the rotunda, the House of Representatives chamber until 1857. Exact room shape is schematic.',
  'statuary hall statues': 'A selection of the 35 statues of the National Statuary Hall Collection now displayed in the hall. Figures and positions are schematic.',
  'old senate chamber': 'The Old Senate Chamber northeast of the rotunda, used by the Senate until 1859 and then by the Supreme Court until 1935. Interior is schematic.',
  'old supreme court chamber': 'The chamber below the old Senate room that housed the Supreme Court in the early 1800s. Interior is schematic.',
  'central block east windows': 'Window bays of the central block\u2019s east front. Exact fenestration is schematic.',
  'central block west windows': 'Window bays of the central block\u2019s west front. Exact fenestration is schematic.',
  'east front extension': 'The mid-20th-century marble extension of the East Front, built after the original 1828 sandstone portico columns were removed to the National Arboretum. Exact massing is schematic.',
  'central block vaults': 'Vaulted basement spaces of the central block. Interior is schematic.',
  'central block doors': 'The east and west entrance doors of the central block. Exact door design is schematic.',
  'senate wing': 'The north wing of Walter\u2019s 1850s extension, faced in Lee, Massachusetts marble with Cockeysville marble columns, more than doubling the building\u2019s length. Exact massing is schematic.',
  'senate wing roof': 'Roof slab of the Senate wing. Exact construction is schematic.',
  'senate wing cornice': 'Cornice banding the Senate wing. Exact profile is schematic.',
  'senate chamber': 'The Senate chamber in the north wing, designed by Walter: a two-story room whose floor is 80 by 113 ft, in use since January 4, 1859. Interior detail is schematic.',
  'senate desks': 'The 100 senators\u2019 desks on a tiered semicircular platform facing the rostrum. Arrangement is schematic.',
  'senate rostrum': 'The rostrum at the front of the Senate chamber. Exact form is schematic.',
  'senate gallery': 'The second-floor gallery overlooking the Senate floor on all four sides. Exact layout is schematic.',
  'senate wing north windows': 'Window bays of the Senate wing\u2019s north end. Exact fenestration is schematic.',
  'senate wing east windows': 'Window bays of the Senate wing\u2019s east side. Exact fenestration is schematic.',
  'senate wing west windows': 'Window bays of the Senate wing\u2019s west side. Exact fenestration is schematic.',
  'senate reception room': 'The Senate Reception Room adjoining the chamber. Interior is schematic.',
  'house wing': 'The south wing of Walter\u2019s 1850s extension, faced in Lee, Massachusetts marble. Exact massing is schematic.',
  'house wing roof': 'Roof slab of the House wing. Exact construction is schematic.',
  'house wing cornice': 'Cornice banding the House wing. Exact profile is schematic.',
  'house chamber': 'The House chamber in the south wing, in use since 1857 when the House left Statuary Hall. Dimensions and interior are schematic.',
  'house desks': 'The 435 representatives\u2019 desks in tiered arcs facing the rostrum. Arrangement is schematic.',
  'house rostrum': 'The Speaker\u2019s rostrum at the front of the House chamber. Exact form is schematic.',
  'house gallery': 'The second-floor gallery overlooking the House floor. Exact layout is schematic.',
  'house wing south windows': 'Window bays of the House wing\u2019s south end. Exact fenestration is schematic.',
  'house wing east windows': 'Window bays of the House wing\u2019s east side. Exact fenestration is schematic.',
  'house wing west windows': 'Window bays of the House wing\u2019s west side. Exact fenestration is schematic.',
  'speaker\u2019s lobby': 'The Speaker\u2019s Lobby behind the House rostrum. Interior is schematic.',
  'east portico': 'The columned East Portico, the ceremonial front of the Capitol. Column count and positions are schematic.',
  'east pediment': 'The triangular pediment over the East Portico. Exact sculpture and profile are schematic.',
  'west portico': 'The columned West Portico facing the National Mall. Column count and positions are schematic.',
  'west pediment': 'The triangular pediment over the West Portico. Exact profile is schematic.',
  'senate west portico': 'The west colonnade of the Senate wing. Column count and positions are schematic.',
  'senate east portico': 'The east colonnade of the Senate wing. Column count and positions are schematic.',
  'senate north portico': 'The portico on the north end of the Senate wing. Column count and positions are schematic.',
  'house west portico': 'The west colonnade of the House wing. Column count and positions are schematic.',
  'house east portico': 'The east colonnade of the House wing. Column count and positions are schematic.',
  'house south portico': 'The portico on the south end of the House wing. Column count and positions are schematic.',
  'east front steps': 'The grand steps rising to the East Front. Exact step count is schematic.',
  'crypt columns': 'Forty Doric columns of Aquia Creek sandstone carrying the rotunda floor on groined arches, installed in the 1820s under Bulfinch. Grid positions are schematic.',
  'crypt vault ceiling': 'The groined vaulting over the crypt that carries the rotunda floor. Exact vaulting is schematic.',
  'washington\u2019s tomb': 'The empty burial chamber two stories below the rotunda, built into Thornton\u2019s original design to entomb George Washington and never used. Interior is schematic.',
  'compass stone': 'A white marble compass stone in the crypt floor marking the point where Washington, D.C.\u2019s four quadrants meet. Exact marker is schematic.',
  'crypt statues': 'Thirteen statues of the National Statuary Hall Collection displayed in the crypt. Figures and positions are schematic.',
  'foundation slab': 'The foundation carrying the Capitol\u2019s 175,170 sq ft footprint. Exact extent is schematic.',
  'crypt stair': 'Stair descending to the tomb level beneath the crypt. Exact layout is schematic.',
  'north connector corridor': 'The corridor linking the rotunda to the Senate wing. Exact route is schematic.',
  'south connector corridor': 'The corridor linking the rotunda to the House wing. Exact route is schematic.',
  'east connector corridor': 'The corridor linking the rotunda to the East Front. Exact route is schematic.',
  'senate grand stair': 'A grand staircase of the Senate wing. Exact stair is schematic.',
  'house grand stair': 'A grand staircase of the House wing. Exact stair is schematic.',
  'capitol visitor center': 'The underground Capitol Visitor Center east of the building. Massing is schematic.',
  'west marble terrace': 'Frederick Law Olmsted\u2019s multitiered marble terrace along the west front, giving the building a solid structural foundation on the hill. Tier heights are schematic.',
  'north marble terrace': 'Olmsted\u2019s marble terrace wrapping the north side, proposed in 1875. Exact extent is schematic.',
  'south marble terrace': 'Olmsted\u2019s marble terrace wrapping the south side, proposed in 1875. Exact extent is schematic.',
  'west terrace grand stairs': 'The grand stairs climbing the west terrace. Exact stair is schematic.',
  'terrace fountain': 'The octagonal fountain in the Romanesque style added between the grand stairs in 1889. Exact design is schematic.',
  'terrace committee rooms': 'Committee rooms and storage built into Olmsted\u2019s terrace. Interior is schematic.',
  'terrace balustrade': 'The balustrade edging the marble terraces. Exact pattern is schematic.',
  'inaugural platform': 'The inaugural platform erected on the west terrace for presidential inaugurations. Exact structure is schematic.',
  'west lawn': 'The west lawn of the Capitol grounds sloping toward the National Mall. Extent is schematic.',
  'east lawn': 'The east lawn of the Capitol grounds. Extent is schematic.',
  'north lawn': 'The north lawn of the Capitol grounds. Extent is schematic.',
  'south lawn': 'The south lawn of the Capitol grounds. Extent is schematic.',
  'grounds paths': 'Olmsted\u2019s curved walkways contrasting with the building\u2019s straight lines. Layout is schematic.',
  'grounds trees': 'A schematic stand of the grounds\u2019 planting; Olmsted used over 100 varieties of trees and bushes. Positions are schematic.',
  'summerhouse': 'The brick summerhouse northwest of the building, built 1879 to 1881, an octagonal shelter with a central drinking fountain. Exact form is schematic.',
  'capitol reflecting pool': 'The Capitol Reflecting Pool west of the terraces. Exact extent is schematic.',
  'east pediment sculpture': 'Sculptural figures filling the east pediment. Artwork is schematic.',
  'west pediment sculpture': 'Sculptural figures filling the west pediment. Artwork is schematic.',
  'senate flag': 'The flag flown above the Senate wing while the Senate is in session. Position is schematic.',
  'house flag': 'The flag flown above the House wing while the House is in session. Position is schematic.',
  'east bronze doors': 'The bronze doors of the East Front. Exact design is schematic.',
  '1851 cornerstone': 'The cornerstone of Walter\u2019s extension, laid July 4, 1851 at the House wing with Daniel Webster\u2019s oration. Exact stone is schematic.',
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
const binName = 'us-capitol-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the us-capitol directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'United States Capitol, Washington DC (detailed schematic)',
  title: 'United States Capitol',
  location: 'Washington, D.C., United States',
  blurb: 'The seat of the United States Congress on Capitol Hill: 751 ft long, crowned by Thomas U. Walter\u2019s 288 ft cast-iron dome and the bronze Statue of Freedom, with the Senate wing to the north and the House wing to the south.',
  sourceUrls: [
    { label: 'Wikipedia: United States Capitol', url: 'http://en.wikipedia.org/wiki/United_States_Capitol' },
    { label: 'Wikipedia: United States Capitol dome', url: 'https://en.wikipedia.org/wiki/United_States_Capitol_dome' },
    { label: 'Wikipedia: United States Capitol rotunda', url: 'https://webfiddle.net/cats-d8c4vu/en.wikipedia.org/wiki/United_States_Capitol_rotunda' },
    { label: 'Wikipedia: Statue of Freedom', url: 'https://en.wikipedia.org/wiki/Statue_of_Freedom' },
    { label: 'Architect of the Capitol: Rotunda restoration', url: 'http://aoc.gov/explore-capitol-campus/blog/capitol-rotunda-restoration' },
    { label: 'Architect of the Capitol: Frederick Law Olmsted', url: 'https://www.aoc.gov/explore-capitol-campus/frederick-law-olmsted' },
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
  chunks: [{ url: '/models/us-capitol/us-capitol-0.bin', bytes: offset }],
  triangles,
  // The exploded cloud lifts +1 above the assembled centre while the camera
  // targets the model centre, so compact packings clip at the top of the
  // frame. 1.4 restores full framing (same value as Sagrada Familia detailed).
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
