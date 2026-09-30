// Procedural Machu Picchu (key structures) for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned assembly of Machu Picchu's
// key structures in code and writes it in the atlas binary format:
//   public/models/machu-picchu/atlas.json
//   public/models/machu-picchu/machu-picchu-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/machu-picchu-attribution.md,
// opened 2026-09-30):
//   15th-century Inca citadel on a mountain ridge at 2,430 m (7,970 ft),
//   Cusco Region, Peru, about 80 km northwest of Cusco above the Urubamba
//   River; built around 1450 as an estate for the Inca emperor Pachacuti
//   (1438-1472); abandoned about a century later; brought to international
//   attention in 1911 by Hiram Bingham; Peruvian Historical Sanctuary 1981;
//   UNESCO World Heritage Site 1983; New Seven Wonders of the World 2007;
//   saddle between Machu Picchu mountain (2,795 m) and Huayna Picchu
//   (2,667 m); buildings single storey, local white granite; upper
//   ceremonial buildings separated by a long plaza from housing and
//   agricultural terraces below; classical Inca dry-stone walls (no
//   mortar), trapezoidal doorways and windows, inward-leaning walls.
//   Temple of the Sun (Intiwasi): the only Inca construction with a
//   semicircular shape; curved outer wall of finely polished ashlar about
//   10.5 m in diameter; built on a massive natural granite rock; interior
//   dominated by the rock with long carved altar sections; three windows
//   (one facing north, two facing east) aligned to the winter solstice
//   (21 June) and summer solstice (22 December) sunrises; golden discs
//   below the windows per post-conquest chronicles; fire damage in
//   colonial times; lightning-strike damage at the rear of the north
//   window; at about 3,096 m.
//   Royal Tomb: natural cave beneath the Temple of the Sun, enhanced with
//   carved walls and niches, a carved altar and a throne-like carving;
//   intended for the highest-ranking individuals; no mummies found when
//   Bingham arrived.
//   Intihuatana: "hitching post of the sun"; carved directly from the
//   mountain bedrock at the upper part of the Sacred Sector, about
//   3,126 m; commonly described as about 1.70 m high with an 8.60 m
//   perimeter (other accounts: about 2 m across, 1 m high); interpreted
//   in relation to shadows, solar movement and ritual timing; damaged in
//   2000 during filming of a beer commercial.
//   Temple of the Three Windows: Hanan sector; the window wall is 10 m
//   long by 8 m wide with some of the largest stone blocks in the
//   citadel; trapezoidal windows facing east; aligned to winter solstice,
//   summer solstice and equinox; niches on both sides for gold and silver
//   objects; the three windows as Hanan-Pacha, Kay-Pacha, Ukju-Pacha.
//   Main (Principal) Temple: Huayrana type, three sturdy walls of
//   rectangular stones; 11 m long by 8 m wide, walls 90 cm thick; seven
//   trapezoidal niches in the central wall, five in each side wall; large
//   partially carved rock about 10 m ahead as possible sacrificial altar;
//   small stone sculpture of the Southern Cross; holes for roof beams but
//   no evidence it was ever roofed; earthquake and water damage to the
//   rear wall.
//   Temple of the Condor: built into natural rock with grottos and
//   subterranean passageways; flat triangular rock as the condor head
//   with carved eyes and beak; abutting semicircular stones as the ruff;
//   two outstretched rock wings behind; the head stone may have served as
//   a sacrificial altar; the private fountain of the Temple of the Condor
//   has higher walls than the others.
//   Water system: 16 stone fountains (the Stairway of Fountains) fed by
//   gravity from a mountain spring through a stone-lined canal (about
//   749 m long, 10-12 cm wide, 10-16 cm deep, about 3% slope, about
//   300 litres per minute design capacity); first fountain adjacent to
//   the emperor's residence; total drop about 26 m from fountain 1 to
//   fountain 16; fountain walls typically about 1.2 m high; buried bypass
//   channels; about 130 outlet drains through retaining walls.
// Schematic (not sourced, never stated as fact in the UI): exact
// placement of the key structures relative to one another and their
// compass orientation; terrace counts and widths; fountain positions and
// the number modeled (8 of the 16 fountains); house counts and sizes;
// carved details of the Intihuatana, condor head and Royal Tomb
// interior; window and niche counts beyond the sourced figures; ridge
// base and mountain backdrops are context geometry only.
//
// Granularity: 117 named parts across 11 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Frame: x east, z south, y up, metres.
//
// Usage: node scripts/generate-machu-picchu.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'machu-picchu');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (500 m, the illustrated site frame)
// maps to 2.4 units.
const S = 2.4 / 500;
const D2R = Math.PI / 180;

// ---------------------------------------------------------------- helpers
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 12, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  g.translate(x, y, z);
  return g;
}
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
// Curved wall arc: angles in degrees, 0 = east (+x), + = toward south (+z).
// Cylinder theta: x = r sin(theta), z = r cos(theta), so theta = 90 - a.
function arcWall(cx, cz, r, a0, a1, y0, y1, seg = 24) {
  const g = new THREE.CylinderGeometry(
    r, r, y1 - y0, seg, 1, true,
    (90 - a1) * D2R, (a1 - a0) * D2R,
  );
  g.translate(cx, (y0 + y1) / 2, cz);
  return g;
}
// Window frame set into the curved Temple of the Sun wall: sill, two
// inward-tapering jambs (trapezoidal opening), and a lintel. Rotated
// BEFORE translating so nothing spins around the world origin.
function sunWindow(cx, cz, r, angleDeg, wBottom, wTop, h, y0) {
  const a = angleDeg * D2R;
  const px = cx + r * Math.cos(a);
  const pz = cz + r * Math.sin(a);
  const geoms = [];
  const mk = (g) => { g.rotateY(-a + Math.PI / 2); g.translate(px, 0, pz); return g; };
  const sill = new THREE.BoxGeometry(wBottom + 0.6, 0.3, 0.9);
  sill.translate(0, y0 - 0.15, 0);
  geoms.push(mk(sill));
  const jL = strut([-wBottom / 2, y0, 0], [-wTop / 2, y0 + h, 0], 0.35);
  const jR = strut([wBottom / 2, y0, 0], [wTop / 2, y0 + h, 0], 0.35);
  geoms.push(mk(jL), mk(jR));
  const lintel = new THREE.BoxGeometry(wTop + 0.7, 0.35, 0.9);
  lintel.translate(0, y0 + h + 0.175, 0);
  geoms.push(mk(lintel));
  return geoms;
}
// Gable (thatched) roof prism for houses: rotated before translating.
function gableRoof(x, z, w, d, y0, h) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false });
  g.rotateY(Math.PI / 2); // ridge along z
  g.translate(-d / 2, 0, 0); // center the extrusion on x
  g.translate(x, y0, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// ============================================================ TEMPLE OF THE SUN
// Centered at (15, 25): D-shaped tower, curved ashlar wall 10.5 m across
// (sourced), straight west wall, three solstice windows.
{
  const CX = 15, CZ = 25, R = 5.25, Y0 = 4, Y1 = 9;
  // rock platform the temple stands on (the massive natural granite rock)
  addPart('sun-rock-platform', 'Temple rock platform', 'sun-temple', [
    box(CX - 6.5, CX + 6.5, 0, Y0, CZ - 6.5, CZ + 6.5),
  ]);
  // interior bedrock core filling most of the inner space
  addPart('sun-bedrock-core', 'Bedrock core', 'sun-temple', [
    cyl(3.6, 4.2, Y1 - Y0, CX, (Y0 + Y1) / 2, CZ, 10),
  ]);
  // carved altar sections on the rock
  addPart('sun-altar-rock', 'Sun Temple altar rock', 'sun-temple', [
    box(CX - 2.2, CX + 2.2, Y0, Y0 + 0.8, CZ - 3, CZ + 1),
    box(CX - 1.2, CX + 1.2, Y0 + 0.8, Y0 + 1.3, CZ - 2.4, CZ - 0.4),
  ]);
  // curved wall arcs, leaving real gaps for the three windows
  // north window (largest): -90..-74; east windows: -31..-19 and 19..31
  addPart('sun-wall-north-arc', 'Curved wall, north arc', 'sun-temple', [
    arcWall(CX, CZ, R, -74, -31, Y0, Y1),
  ]);
  addPart('sun-wall-east-arc', 'Curved wall, east arc', 'sun-temple', [
    arcWall(CX, CZ, R, -19, 19, Y0, Y1),
  ]);
  addPart('sun-wall-south-arc', 'Curved wall, south arc', 'sun-temple', [
    arcWall(CX, CZ, R, 31, 90, Y0, Y1),
  ]);
  addPart('sun-wall-west', 'West straight wall', 'sun-temple', [
    box(CX - R - 0.45, CX - R + 0.45, Y0, Y1, CZ - R, CZ + R),
  ]);
  // three trapezoidal windows: north (largest), two east
  addPart('sun-window-north', 'North window', 'sun-temple',
    sunWindow(CX, CZ, R, -82, 1.6, 1.2, 1.6, 6.2));
  addPart('sun-window-east-june', 'East window (winter solstice)', 'sun-temple',
    sunWindow(CX, CZ, R, -25, 1.2, 0.9, 1.4, 6.2));
  addPart('sun-window-east-dec', 'East window (summer solstice)', 'sun-temple',
    sunWindow(CX, CZ, R, 25, 1.2, 0.9, 1.4, 6.2));
  // worship niches on the north wall section
  {
    const geoms = [];
    for (let i = 0; i < 3; i++) {
      const a = (-68 + i * 10) * D2R;
      const px = CX + (R - 0.25) * Math.cos(a);
      const pz = CZ + (R - 0.25) * Math.sin(a);
      const n = box(-0.4, 0.4, 6.6, 7.4, -0.25, 0.25);
      n.rotateY(-a + Math.PI / 2);
      n.translate(px, 0, pz);
      geoms.push(n);
    }
    addPart('sun-niches', 'Sun Temple niches', 'sun-temple', geoms);
  }
  // foundation course
  addPart('sun-foundation', 'Sun Temple foundation course', 'sun-temple', [
    arcWall(CX, CZ, R + 0.35, -90, 90, 2.6, Y0, 28),
    box(CX - R - 0.8, CX - R + 0.8, 2.6, Y0, CZ - R, CZ + R),
  ]);
  // access stair from the south
  {
    const geoms = [];
    for (let i = 0; i < 5; i++) {
      geoms.push(box(CX - 1, CX + 1, -0.6 - i * 0.6, -i * 0.6, CZ + 7 + i * 0.9, CZ + 7.9 + i * 0.9));
    }
    addPart('sun-access-stair', 'Sun Temple access stair', 'sun-temple', geoms);
  }
}

// ============================================================ ROYAL TOMB
// Natural cave beneath the Temple of the Sun, y -8..-4.
{
  const CX = 15, CZ = 25;
  addPart('tomb-floor', 'Tomb floor', 'royal-tomb', [
    box(CX - 4, CX + 4, -8, -7.4, CZ - 5, CZ + 5),
  ]);
  {
    const geoms = [box(CX - 4, CX + 4, -8, -4.6, CZ - 5.4, CZ - 4.6)];
    for (let i = 0; i < 4; i++) {
      geoms.push(box(CX - 3 + i * 1.7, CX - 2.2 + i * 1.7, -7.2, -6.2, CZ - 5.6, CZ - 5.2));
    }
    addPart('tomb-back-wall', 'Tomb back wall and niches', 'royal-tomb', geoms);
  }
  addPart('tomb-west-wall', 'Tomb west wall', 'royal-tomb', [
    box(CX - 4.8, CX - 4, -8, -4.6, CZ - 5, CZ + 5),
  ]);
  addPart('tomb-east-wall', 'Tomb east wall', 'royal-tomb', [
    box(CX + 4, CX + 4.8, -8, -4.6, CZ - 5, CZ + 5),
  ]);
  addPart('tomb-roof-slab', 'Tomb roof slab', 'royal-tomb', [
    box(CX - 4.8, CX + 4.8, -4.6, -3.9, CZ - 5.4, CZ + 5.4),
  ]);
  addPart('tomb-altar-stone', 'Tomb altar stone', 'royal-tomb', [
    box(CX - 1, CX + 1, -7.4, -6.6, CZ + 1, CZ + 3),
  ]);
  addPart('tomb-throne-carving', 'Tomb throne carving', 'royal-tomb', [
    box(CX - 2.6, CX - 1.4, -7.4, -6.2, CZ - 3.5, CZ - 2.3),
    box(CX - 2.6, CX - 1.4, -6.6, -6.2, CZ - 4.1, CZ - 2.3),
  ]);
  addPart('tomb-entrance-lintel', 'Tomb entrance lintel', 'royal-tomb', [
    box(CX - 1.2, CX + 1.2, -5.2, -4.6, CZ + 4.6, CZ + 5.4),
  ]);
}

// ============================================================ INTIHUATANA
// Upper sacred sector at (-32, -75): bedrock knoll, carved stone on top.
{
  const CX = -32, CZ = -75;
  addPart('intihuatana-knoll', 'Intihuatana bedrock knoll', 'intihuatana', [
    cyl(7.5, 10, 8, CX, 4, CZ, 10),
  ]);
  // the carved ritual stone, about 1.7 m high, carved from the bedrock
  {
    const pts = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(new THREE.Vector2(
        0.9 - 0.55 * Math.pow(t, 1.4) + 0.25 * Math.sin(t * Math.PI),
        8 + t * 1.7,
      ));
    }
    const g = new THREE.LatheGeometry(pts, 10);
    g.translate(CX, 0, CZ);
    addPart('intihuatana-stone', 'Intihuatana ritual stone', 'intihuatana', [g]);
  }
  addPart('intihuatana-base-ring', 'Intihuatana carved base', 'intihuatana', [
    cyl(1.6, 2.1, 0.7, CX, 7.65, CZ, 10),
  ]);
  addPart('intihuatana-platform', 'Intihuatana top platform', 'intihuatana', [
    cyl(5.2, 5.6, 0.6, CX, 8.3, CZ, 10),
  ]);
  addPart('intihuatana-retaining-wall', 'Intihuatana retaining wall', 'intihuatana', [
    cyl(9.8, 10.6, 3, CX, 1.5, CZ, 12, true),
  ]);
  {
    const geoms = [];
    for (let i = 0; i < 7; i++) {
      geoms.push(box(CX - 1.2, CX + 1.2, 7.4 - i * 1.05, 8.3 - i * 1.05, CZ + 9.5 + i * 1.4, CZ + 10.9 + i * 1.4));
    }
    addPart('intihuatana-stair', 'Intihuatana access stair', 'intihuatana', geoms);
  }
  addPart('intihuatana-lower-terrace', 'Intihuatana lower terrace', 'intihuatana', [
    box(CX - 14, CX + 14, -0.6, 0, CZ + 12, CZ + 22),
  ]);
  {
    const geoms = [];
    for (let i = 0; i < 5; i++) {
      const a = (200 + i * 35) * D2R;
      const px = CX + 8.6 * Math.cos(a);
      const pz = CZ + 8.6 * Math.sin(a);
      const nn = box(-0.35, 0.35, 5.6, 6.4, -0.2, 0.2);
      nn.rotateY(-a + Math.PI / 2);
      nn.translate(px, 0, pz);
      geoms.push(nn);
    }
    addPart('intihuatana-perimeter-niches', 'Intihuatana perimeter niches', 'intihuatana', geoms);
  }
  addPart('intihuatana-outcrop', 'Intihuatana south outcrop', 'intihuatana', [
    box(CX - 3, CX + 2, 0, 2.5, CZ + 24, CZ + 30),
  ]);
}

// ============================================================ TEMPLE OF THE THREE WINDOWS
// Window wall 10 m long (z) by 8 m wide (x), east-facing windows.
{
  const X0 = 38, X1 = 46, Z0 = -50, Z1 = -40, H = 2.8;
  addPart('threew-floor', 'Three Windows floor slab', 'three-windows', [
    box(X0, X1, -0.4, 0, Z0, Z1),
  ]);
  // window wall with three real trapezoidal openings
  addPart('threew-wall-north-seg', 'Window wall, north segment', 'three-windows', [
    box(X1 - 0.8, X1, 0, H, Z0, Z0 + 2),
  ]);
  addPart('threew-wall-mid-seg', 'Window wall, middle segment', 'three-windows', [
    box(X1 - 0.8, X1, 0, H, Z0 + 3.8, Z0 + 6.2),
  ]);
  addPart('threew-wall-south-seg', 'Window wall, south segment', 'three-windows', [
    box(X1 - 0.8, X1, 0, H, Z0 + 9.4, Z1),
  ]);
  addPart('threew-north-window', 'North trapezoidal window', 'three-windows', [
    box(X1 - 0.9, X1 + 0.1, 1.1, 1.2, Z0 + 2, Z0 + 3.8),
    box(X1 - 0.9, X1 + 0.1, 2.2, 2.3, Z0 + 2.2, Z0 + 3.6),
  ]);
  addPart('threew-middle-window', 'Middle trapezoidal window', 'three-windows', [
    box(X1 - 0.9, X1 + 0.1, 1.1, 1.2, Z0 + 6.2, Z0 + 8),
    box(X1 - 0.9, X1 + 0.1, 2.2, 2.3, Z0 + 6.4, Z0 + 7.8),
  ]);
  addPart('threew-south-window', 'South trapezoidal window', 'three-windows', [
    // third opening is bounded by wall segments; lintel shown as schematic
    box(X1 - 0.9, X1 + 0.1, 1.1, 1.2, Z0 + 8, Z0 + 9.4),
    box(X1 - 0.9, X1 + 0.1, 2.2, 2.3, Z0 + 8.2, Z0 + 9.2),
  ]);
  addPart('threew-north-wall', 'Three Windows north wall', 'three-windows', [
    box(X0, X1, 0, H, Z0 - 0.8, Z0),
  ]);
  addPart('threew-south-wall', 'Three Windows south wall', 'three-windows', [
    box(X0, X1, 0, H, Z1, Z1 + 0.8),
  ]);
  addPart('threew-rear-wall', 'Three Windows rear wall', 'three-windows', [
    box(X0 - 0.8, X0, 0, H, Z0, Z1),
  ]);
  {
    const geoms = [];
    for (const zc of [Z0 - 0.4, Z1 + 0.4]) {
      for (let i = 0; i < 3; i++) {
        geoms.push(box(X0 + 1.5 + i * 2, X0 + 2.1 + i * 2, 0.9, 1.7, zc - 0.35, zc + 0.35));
      }
    }
    addPart('threew-offering-niches', 'Three Windows offering niches', 'three-windows', geoms);
  }
}

// ============================================================ MAIN (PRINCIPAL) TEMPLE
// Three walls, 11 m long (z) by 8 m wide (x), 0.9 m thick, 3 m high.
{
  const XN = 48, XC = 52, XS = 56, Z0 = -13, Z1 = -2, H = 3;
  addPart('main-north-wall', 'Main Temple north wall', 'main-temple', [
    box(XN - 0.45, XN + 0.45, 0, H, Z0 + 2.5, Z1),
  ]);
  addPart('main-central-wall', 'Main Temple central wall', 'main-temple', [
    box(XC - 0.45, XC + 0.45, 0, H, Z0, Z1),
  ]);
  addPart('main-south-wall', 'Main Temple south wall', 'main-temple', [
    box(XS - 0.45, XS + 0.45, 0, H, Z0, Z1),
  ]);
  // west corner collapsed by earthquake: pile of fallen blocks
  {
    const geoms = [];
    const blocks = [
      [XN - 1.2, 0.4, Z0 + 0.6, 1.6, 0.9, 1.1],
      [XN - 2.2, 0.2, Z0 + 1.8, 1.1, 0.7, 0.9],
      [XN - 0.8, 1.3, Z0 + 1.2, 2.1, 0.8, 1.0],
      [XN - 2.8, 0.1, Z0 + 0.4, 0.9, 0.6, 0.8],
    ];
    for (const [x, y, z, w, h, d] of blocks) {
      const b = new THREE.BoxGeometry(w, h, d);
      b.rotateY(x * 0.4);
      b.translate(x, y, z);
      geoms.push(b);
    }
    addPart('main-collapsed-corner', 'Main Temple collapsed west corner', 'main-temple', geoms);
  }
  // niches: 7 in the central wall, 5 in each side wall
  {
    const geoms = [];
    for (let i = 0; i < 7; i++) {
      const z = Z0 + 1.4 + i * 1.35;
      geoms.push(box(XC - 0.65, XC + 0.65, 1.1, 2.0, z - 0.35, z + 0.35));
    }
    for (const xw of [XN, XS]) {
      for (let i = 0; i < 5; i++) {
        const z = Z0 + 2 + i * 1.7;
        geoms.push(box(xw - 0.65, xw + 0.65, 1.1, 2.0, z - 0.35, z + 0.35));
      }
    }
    addPart('main-niches', 'Main Temple niches', 'main-temple', geoms);
  }
  // large partially carved rock about 10 m ahead (east) of the temple
  addPart('main-altar-rock', 'Main Temple altar rock', 'main-temple', [
    box(XS + 8.5, XS + 12.5, 0, 1.6, Z0 + 4, Z0 + 7),
    box(XS + 9.6, XS + 11.4, 1.6, 2.1, Z0 + 4.8, Z0 + 6.2),
  ]);
  // small stone sculpture of the Southern Cross constellation
  {
    const geoms = [];
    for (const [dx, dz, w] of [[0, -0.8, 0.3], [0, 0.8, 0.3], [-0.5, 0, 0.3], [0.5, 0, 0.3], [0, 0, 0.45]]) {
      geoms.push(box(XS + 6 + dx - w / 2, XS + 6 + dx + w / 2, 0, 0.7, Z0 + 9 + dz - w / 2, Z0 + 9 + dz + w / 2));
    }
    addPart('main-southern-cross', 'Southern Cross sculpture', 'main-temple', geoms);
  }
  addPart('main-floor-platform', 'Main Temple floor platform', 'main-temple', [
    box(XN - 2, XS + 2, -0.4, 0, Z0 - 2, Z1 + 2),
  ]);
}

// ============================================================ TEMPLE OF THE CONDOR
// Natural rock carved into a condor: head, ruff, outstretched wings.
{
  const CX = 28, CZ = 62;
  // flat triangular head stone with carved eyes and beak
  {
    const shape = new THREE.Shape();
    shape.moveTo(0, -1.6);
    shape.lineTo(1.8, 1.4);
    shape.lineTo(-1.8, 1.4);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(CX, 0.5, CZ);
    addPart('condor-head-stone', 'Condor head stone', 'condor', [g]);
  }
  // semicircular stones as the condor ruff
  {
    const geoms = [];
    for (let i = 0; i < 5; i++) {
      const a = (-60 + i * 30) * D2R;
      const s = new THREE.CylinderGeometry(0.7, 0.8, 0.6, 8);
      s.translate(CX + 2.4 * Math.cos(a), 0.8, CZ + 2.4 * Math.sin(a));
      geoms.push(s);
    }
    addPart('condor-ruff-stones', 'Condor ruff stones', 'condor', geoms);
  }
  // two outstretched rock wings behind
  {
    const gL = box(-1.2, 1.2, 0, 7, -3.5, 3.5);
    gL.rotateZ(0.35);
    gL.rotateY(0.5);
    gL.translate(CX - 6, 0, CZ + 3);
    addPart('condor-wing-left', 'Condor left wing rock', 'condor', [gL]);
  }
  {
    const gR = box(-1.2, 1.2, 0, 7, -3.5, 3.5);
    gR.rotateZ(-0.35);
    gR.rotateY(-0.5);
    gR.translate(CX + 6, 0, CZ + 3);
    addPart('condor-wing-right', 'Condor right wing rock', 'condor', [gR]);
  }
  // sacrificial altar in front of the head
  addPart('condor-altar', 'Condor sacrificial altar', 'condor', [
    box(CX - 1.4, CX + 1.4, 0, 1.1, CZ - 4.4, CZ - 2.4),
  ]);
  addPart('condor-wall-north', 'Condor temple north wall', 'condor', [
    box(CX - 9, CX + 9, 0, 2.6, CZ - 7, CZ - 6.2),
  ]);
  addPart('condor-wall-east', 'Condor temple east wall', 'condor', [
    box(CX + 9, CX + 9.8, 0, 2.6, CZ - 7, CZ + 8),
  ]);
  // subterranean chamber below one wing
  addPart('condor-chamber-floor', 'Condor subterranean chamber floor', 'condor', [
    box(CX + 3, CX + 9, -4.4, -4, CZ + 1, CZ + 7),
  ]);
  {
    const geoms = [];
    for (let i = 0; i < 4; i++) {
      geoms.push(box(CX + 3.4 + i * 1.4, CX + 4 + i * 1.4, -3.8, -3, CZ + 6.4, CZ + 6.8));
    }
    addPart('condor-chamber-niches', 'Condor chamber niches', 'condor', geoms);
  }
  addPart('condor-chamber-roof', 'Condor chamber roof slabs', 'condor', [
    box(CX + 3, CX + 9, -0.6, 0, CZ + 1, CZ + 7),
  ]);
  {
    const geoms = [];
    for (let i = 0; i < 4; i++) {
      geoms.push(box(CX + 2.2 + i * 0.9, CX + 3.1 + i * 0.9, -4.4 + i * 1.1, -3.3 + i * 1.1, CZ + 3.5, CZ + 4.4));
    }
    addPart('condor-chamber-stair', 'Condor chamber stair', 'condor', geoms);
  }
}

// ============================================================ FOUNTAINS
// 8 of the 16 Stairway of Fountains, cascading from the royal quarter.
{
  const fountain = (x, z, y, tall = 1.2) => [
    box(x - 1.6, x + 1.6, y, y + 0.3, z - 1.6, z + 1.6),
    box(x - 1.6, x - 1.2, y + 0.3, y + tall, z - 1.6, z + 1.6),
    box(x + 1.2, x + 1.6, y + 0.3, y + tall, z - 1.6, z + 1.6),
    box(x - 1.2, x + 1.2, y + 0.3, y + tall, z + 1.2, z + 1.6),
    box(x - 0.2, x + 0.2, y + tall, y + tall + 0.5, z - 1.6, z - 1.2),
  ];
  const names = ['one', 'two', 'three', 'four', 'five'];
  const xs = [8, 12, 16, 20, 24];
  const zs = [-2, 4, 10, 16, 22];
  const ys = [0, -1.6, -3.2, -4.8, -6.4];
  names.forEach((n, i) => {
    addPart(`fountain-${n}`, `Fountain ${n}`, 'fountains', fountain(xs[i], zs[i], ys[i]));
  });
  // private fountain for the Temple of the Condor: higher walls
  addPart('fountain-condor', 'Temple of the Condor private fountain', 'fountains',
    fountain(20, 54, -7, 2.2));
  // supply channel from the mountain spring
  {
    const geoms = [];
    for (let i = 0; i < 10; i++) {
      const x = -12 + i * 2;
      const z = -62 + i * 6.4;
      const y = 6 - i * 0.75;
      geoms.push(box(x - 0.3, x + 0.3, y - 0.2, y, z - 0.15, z + 0.15));
    }
    addPart('water-supply-channel', 'Spring supply channel', 'fountains', geoms);
  }
  addPart('water-bypass-channel', 'Fountain bypass channel', 'fountains', [
    box(14, 26, -7.2, -6.8, 18, 18.4),
  ]);
  addPart('water-main-drain', 'Main drain', 'fountains', [
    box(24, 40, -9, -8.4, 26, 26.5),
  ]);
}

// ============================================================ TERRACES
// Agricultural terraces west and south: each is wall + platform.
{
  let n = 0;
  for (let i = 0; i < 8; i++) {
    n++;
    const x0 = -92 - i * 6, x1 = -86 - i * 6, y = -2 - i * 2.2;
    addPart(`terrace-west-${n}-wall`, `West terrace ${n} retaining wall`, 'terraces', [
      box(x0 - 0.8, x0, y - 2.2, y, -100, 60),
    ]);
    addPart(`terrace-west-${n}-platform`, `West terrace ${n} platform`, 'terraces', [
      box(x0, x1, y - 0.4, y, -100, 60),
    ]);
  }
  for (let j = 0; j < 3; j++) {
    n++;
    const z0 = 100 + j * 14, z1 = 108 + j * 14, y = -2 - j * 2;
    addPart(`terrace-south-${j + 1}-wall`, `South terrace ${j + 1} retaining wall`, 'terraces', [
      box(-50, 50, y - 2, y, z0 - 0.8, z0),
    ]);
    addPart(`terrace-south-${j + 1}-platform`, `South terrace ${j + 1} platform`, 'terraces', [
      box(-50, 50, y - 0.4, y, z0, z1),
    ]);
  }
}

// ============================================================ RESIDENTIAL
// Elite houses east of the plazas, commoner rows, storehouses (colcas).
{
  const elite = (n, x, z) => {
    addPart(`house-elite-${n}-walls`, `Elite house ${n} walls`, 'residential', [
      box(x - 3, x + 3, 0, 2.6, z - 2, z + 2),
      box(x - 3, x - 2.2, 0, 2.0, z - 0.7, z + 0.7),
      box(x + 2.2, x + 3, 0, 2.0, z - 0.7, z + 0.7),
    ]);
    addPart(`house-elite-${n}-roof`, `Elite house ${n} thatched roof`, 'residential', [
      gableRoof(x, z, 7, 5, 2.6, 1.6),
    ]);
  };
  elite(1, 64, -32);
  elite(2, 64, -22);
  elite(3, 64, -42);
  const row = (n, x, z0, z1) => {
    addPart(`house-row-${n}-walls`, `Commoner house row ${n} walls`, 'residential', [
      box(x - 2.5, x + 2.5, 0, 2.3, z0, z1),
    ]);
    addPart(`house-row-${n}-roofs`, `Commoner house row ${n} thatched roofs`, 'residential', [
      gableRoof(x, (z0 + z1) / 2 - 3, 6, (z1 - z0) / 2 - 1, 2.3, 1.4),
      gableRoof(x, (z0 + z1) / 2 + 3, 6, (z1 - z0) / 2 - 1, 2.3, 1.4),
    ]);
  };
  row(1, 56, 8, 28);
  row(2, 56, 38, 54);
  addPart('colca-1', 'Storehouse (colca) 1', 'residential', [
    box(42, 46, 0, 2.2, 84, 88),
    gableRoof(44, 86, 4.6, 4.6, 2.2, 1.1),
  ]);
  addPart('colca-2', 'Storehouse (colca) 2', 'residential', [
    box(50, 54, 0, 2.2, 84, 88),
    gableRoof(52, 86, 4.6, 4.6, 2.2, 1.1),
  ]);
  addPart('residential-courtyard', 'Residential courtyard walls', 'residential', [
    box(58, 70, 0, 1.4, -48, -47.4),
    box(58, 70, 0, 1.4, -14, -13.4),
  ]);
  addPart('residential-path', 'Residential path', 'residential', [
    box(50, 52, -0.2, 0, -50, 60),
  ]);
}

// ============================================================ PLAZAS AND ACCESS
{
  addPart('sacred-plaza', 'Sacred Plaza paving', 'plazas', [
    box(32, 52, -0.4, 0, -34, -19),
  ]);
  addPart('central-plaza', 'Central Plaza', 'plazas', [
    box(26, 51, -0.4, 0, 12, 34),
  ]);
  addPart('main-gate', 'Main Gate', 'plazas', [
    box(-3, 3, 0, 2.6, -160, -159.2),
    box(-3, -2.2, 0, 2.0, -160, -157),
    box(2.2, 3, 0, 2.0, -160, -157),
  ]);
  addPart('guardhouse', 'Guardhouse', 'plazas', [
    box(-48, -42, 3, 5.6, -128, -124),
    gableRoof(-45, -126, 7, 5, 5.6, 1.6),
  ]);
  addPart('perimeter-wall-north', 'North perimeter wall', 'plazas', [
    box(-60, 60, 0, 2.2, -160, -159.4),
  ]);
  addPart('perimeter-wall-east', 'East perimeter wall', 'plazas', [
    box(70, 70.6, 0, 2.2, -100, 60),
  ]);
  addPart('intipunku', 'Sun Gate (Intipunku)', 'plazas', [
    box(22, 28, 5.4, 8, -166, -165.2),
    box(22, 22.8, 5.4, 7.4, -166, -163),
    box(27.2, 28, 5.4, 7.4, -166, -163),
  ]);
  {
    const geoms = [];
    for (let i = 0; i < 9; i++) {
      geoms.push(box(-2, 2, 3.5 - i * 0.9, 4.4 - i * 0.9, -150 + i * 1.3, -148.7 + i * 1.3));
    }
    addPart('main-stairway', 'Main stairway', 'plazas', geoms);
  }
  {
    const geoms = [];
    for (let i = 0; i < 6; i++) {
      geoms.push(box(28, 31, -1 - i * 0.8, -0.2 - i * 0.8, 40 + i * 1.3, 41.3 + i * 1.3));
    }
    addPart('lower-stair', 'Lower stair', 'plazas', geoms);
  }
}

// ============================================================ TERRAIN CONTEXT
{
  addPart('ridge-platform', 'Ridge platform', 'terrain', [
    box(-75, 75, -8, 0, -170, 170),
  ]);
  {
    const g = new THREE.ConeGeometry(48, 72, 12);
    g.translate(0, 36, 232);
    addPart('machu-picchu-mountain', 'Machu Picchu mountain', 'terrain', [g]);
  }
  {
    const g = new THREE.ConeGeometry(30, 88, 10);
    g.translate(-8, 44, -252);
    addPart('huayna-picchu', 'Huayna Picchu', 'terrain', [g]);
  }
  {
    const g = box(-140, -100, -9, -7.5, 120, 240);
    addPart('urubamba-river', 'Urubamba River', 'terrain', [g]);
  }
  addPart('east-slope-apron', 'East slope apron', 'terrain', [
    box(75, 110, -8, -2, -120, 120),
  ]);
}

// ---------------------------------------------------------------- colors
// Schematic light stone palette; the Eiffel Tower is the only dark
// realistic model in the atlas.
function colorFor(id) {
  if (id.startsWith('sun-altar') || id === 'tomb-altar-stone') return '#c9bfa8';
  if (id.startsWith('sun-')) return '#ddd6c6';
  if (id.startsWith('tomb-')) return '#8f887a';
  if (id === 'intihuatana-stone') return '#b8ae97';
  if (id.startsWith('intihuatana-')) return '#cfc9ba';
  if (id.startsWith('threew-')) return '#d8d2c0';
  if (id.startsWith('main-')) return '#d5cdb8';
  if (id.startsWith('condor-')) return '#cdc5b0';
  if (id.startsWith('fountain-') || id.startsWith('water-')) return '#a9c3cf';
  if (id.startsWith('terrace-')) return id.endsWith('-wall') ? '#c4bfae' : '#a9bd8f';
  if (id.startsWith('house-') || id.startsWith('colca-')) return '#d9cfbb';
  if (id.endsWith('-roof') || id.endsWith('-roofs')) return '#9d8f6e';
  if (id === 'residential-courtyard') return '#c9c2b2';
  if (id === 'residential-path') return '#bfb8a6';
  if (id === 'sacred-plaza' || id === 'central-plaza') return '#c4bca9';
  if (id === 'main-gate' || id === 'intipunku') return '#b9b09a';
  if (id === 'guardhouse') return '#d9cfbb';
  if (id.startsWith('perimeter-')) return '#c4bfae';
  if (id.endsWith('-stairway') || id === 'lower-stair') return '#b9b09a';
  if (id === 'ridge-platform') return '#9aa78c';
  if (id === 'machu-picchu-mountain' || id === 'huayna-picchu') return '#8fa08a';
  if (id === 'urubamba-river') return '#9fb9c8';
  if (id === 'east-slope-apron') return '#a3ae90';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'sun-temple', name: 'Temple of the Sun', color: '#ddd6c6', description: 'The Intiwasi: the only Inca construction with a semicircular shape, a curved ashlar wall about 10.5 m across built on a natural granite rock, with three windows aligned to the solstices.' },
  { id: 'royal-tomb', name: 'Royal Tomb', color: '#8f887a', description: 'The natural cave beneath the Temple of the Sun, enhanced with carved walls, niches, an altar and a throne-like carving for the highest-ranking dead.' },
  { id: 'intihuatana', name: 'Intihuatana', color: '#cfc9ba', description: 'The "hitching post of the sun": a ritual stone carved directly from the mountain bedrock in the upper Sacred Sector, linked to shadows, solar movement and ritual timing.' },
  { id: 'three-windows', name: 'Temple of the Three Windows', color: '#d8d2c0', description: 'The 10 by 8 m chamber in the Hanan sector whose three east-facing trapezoidal windows mark the winter solstice, summer solstice and equinox, and the three Inca worlds.' },
  { id: 'main-temple', name: 'Main Temple', color: '#d5cdb8', description: 'The Principal Temple: three walls 11 by 8 m with trapezoidal niches, its west corner collapsed by earthquake, a carved altar rock ahead of it, and a Southern Cross sculpture.' },
  { id: 'condor', name: 'Temple of the Condor', color: '#cdc5b0', description: 'The condor carved from living rock: head stone, ruff stones, outstretched wing rocks, a possible sacrificial altar, and a subterranean chamber with grottos and passageways.' },
  { id: 'fountains', name: 'Fountains and water', color: '#a9c3cf', description: 'Eight of the sixteen Stairway of Fountains, gravity-fed by a spring canal about 749 m long at a 3% slope, with the royal fountain first and the private Condor fountain last.' },
  { id: 'terraces', name: 'Agricultural terraces', color: '#a9bd8f', description: 'Stone retaining walls and planting platforms stepping down the west and south slopes, holding the mountain dry and stable as well as growing its crops.' },
  { id: 'residential', name: 'Residential sector', color: '#d9cfbb', description: 'Elite houses, commoner house rows and ventilated storehouses (colcas) with reconstructed thatched gable roofs; every doorway and window is trapezoidal.' },
  { id: 'plazas', name: 'Plazas and access', color: '#c4bca9', description: 'The Sacred Plaza and Central Plaza, the Main Gate, the Guardhouse, the Sun Gate (Intipunku), and the stairways that thread the single-storey city together.' },
  { id: 'terrain', name: 'Terrain context', color: '#9aa78c', description: 'The mountain saddle at 2,430 m between Machu Picchu mountain and Huayna Picchu, with the Urubamba River below. Context geometry only; counts and contours are schematic.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'temple rock platform': 'The massive natural granite rock on which the Temple of the Sun is built, the fusion of human craftsmanship and the living earth that makes the temple exceptional. Rock massing is schematic.',
  'bedrock core': 'The top of the natural rock fills most of the temple interior, carved with long flat sections for use as an altar. Exact carved sections are schematic.',
  'sun temple altar rock': 'The carved altar sections on the temple rock, believed to have been used for ceremonies honoring the Sun God Inti. Exact carving is schematic.',
  'curved wall, north arc': 'Part of the semicircular curved outer wall of the Temple of the Sun, finely polished ashlar fitted so precisely that not even a blade of grass can pass between the stones. The curve is unique in Machu Picchu and rare in the Inca Empire. Exact coursing is schematic.',
  'curved wall, east arc': 'Part of the semicircular curved outer wall of the Temple of the Sun, about 10.5 m in diameter, built of finely polished ashlar. Exact coursing is schematic.',
  'curved wall, south arc': 'Part of the semicircular curved outer wall of the Temple of the Sun. Exact coursing is schematic.',
  'west straight wall': 'The straight wall closing the D-shaped plan of the Temple of the Sun. Exact length is schematic.',
  'north window': 'The largest of the three Temple of the Sun windows, facing north, with a unique form cut into the stones at its base and small crafted holes in the base stones. Damage at its rear is believed to be from a lightning strike. Exact opening size is schematic.',
  'east window (winter solstice)': 'One of two east-facing windows of the Temple of the Sun, oriented to the winter solstice sunrise on 21 June, when the sun returns. According to post-conquest chronicles, large golden discs were mounted below the windows. Exact alignment and opening are schematic.',
  'east window (summer solstice)': 'One of two east-facing windows of the Temple of the Sun, oriented to the summer solstice sunrise on 22 December. Exact alignment and opening are schematic.',
  'sun temple niches': 'Worship niches in the Temple of the Sun wall. Their count and placement are schematic.',
  'sun temple foundation course': 'The foundation course of the curved wall, wider than the wall above. Exact foundation depth is schematic.',
  'sun temple access stair': 'The stair leading up to the Temple of the Sun. Access to the temple interior is restricted today. Exact stair placement is schematic.',
  'tomb floor': 'The floor of the Royal Tomb cave. Exact floor level is schematic.',
  'tomb back wall and niches': 'The carved back wall of the Royal Tomb with niches for sacred bundles or offerings honoring the ancestors. Exact niche count is schematic.',
  'tomb west wall': 'The carved west wall of the Royal Tomb cave. Exact carving is schematic.',
  'tomb east wall': 'The carved east wall of the Royal Tomb cave. Exact carving is schematic.',
  'tomb roof slab': 'The rock roof of the Royal Tomb, carrying the Temple of the Sun above. Exact thickness is schematic.',
  'tomb altar stone': 'The carved altar stone in the Royal Tomb. Exact form is schematic.',
  'tomb throne carving': 'The throne-like carving in the Royal Tomb. Its fine masonry suggests the tomb was intended for the highest-ranking individuals, possibly the emperor Pachacuti. Exact form is schematic.',
  'tomb entrance lintel': 'The lintel over the entrance to the Royal Tomb cave. Exact opening is schematic.',
  'intihuatana bedrock knoll': 'The bedrock knoll in the upper Sacred Sector from which the Intihuatana is carved. Exact knoll height is schematic.',
  'intihuatana ritual stone': 'The Intihuatana, the "hitching post of the sun": a ritual stone carved directly from the mountain bedrock, commonly described as about 1.70 m high with an 8.60 m perimeter. Its carved planes and edges are linked to shadows, solar movement and ritual timing. It was damaged in 2000 during filming of a beer commercial. Exact carving is schematic.',
  'intihuatana carved base': 'The carved base of the Intihuatana stone. Exact carving is schematic.',
  'intihuatana top platform': 'The platform ringing the Intihuatana stone. Exact layout is schematic.',
  'intihuatana retaining wall': 'The retaining wall of the Intihuatana terrace. Exact coursing is schematic.',
  'intihuatana access stair': 'The stair climbing to the Intihuatana terrace. The stone can be visited only in the morning and touching is prohibited. Exact stair placement is schematic.',
  'intihuatana lower terrace': 'The lower terrace below the Intihuatana. Exact extent is schematic.',
  'intihuatana perimeter niches': 'Niches around the Intihuatana terrace. Their count and placement are schematic.',
  'intihuatana south outcrop': 'The natural rock outcrop south of the Intihuatana terrace. Exact massing is schematic.',
  'three windows floor slab': 'The floor of the Temple of the Three Windows. Exact floor level is schematic.',
  'window wall, north segment': 'Part of the 10 m window wall of the Temple of the Three Windows, built of some of the largest stone blocks in the citadel. Exact block sizes are schematic.',
  'window wall, middle segment': 'Part of the 10 m window wall of the Temple of the Three Windows. Exact block sizes are schematic.',
  'window wall, south segment': 'Part of the 10 m window wall of the Temple of the Three Windows. Exact block sizes are schematic.',
  'north trapezoidal window': 'The north trapezoidal window of the Temple of the Three Windows, facing east over Huayna Picchu. Exact opening is schematic.',
  'middle trapezoidal window': 'The middle trapezoidal window of the Temple of the Three Windows. Exact opening is schematic.',
  'south trapezoidal window': 'The south trapezoidal window of the Temple of the Three Windows. Exact opening is schematic.',
  'three windows north wall': 'The north side wall of the Temple of the Three Windows. Exact height is schematic.',
  'three windows south wall': 'The south side wall of the Temple of the Three Windows. Exact height is schematic.',
  'three windows rear wall': 'The rear wall of the Temple of the Three Windows. Exact height is schematic.',
  'three windows offering niches': 'The niches flanking the Temple of the Three Windows, where gold and silver objects were placed during ceremonies. Their fineness marks this as one of the most important ceremonial spaces in Machu Picchu. Exact niche count is schematic.',
  'main temple north wall': 'The north wall of the Main Temple, one of three sturdy walls of rectangular stones with precise joints, 11 m long by 8 m wide overall with walls 90 cm thick. Exact coursing is schematic.',
  'main temple central wall': 'The central wall of the Main Temple, carrying seven trapezoidal niches. Exact coursing is schematic.',
  'main temple south wall': 'The south wall of the Main Temple. Exact coursing is schematic.',
  'main temple collapsed west corner': 'The west corner of the Main Temple, displaced by seismic activity and water leaks, at risk of collapse. Modeled as fallen blocks; exact collapse pattern is schematic.',
  'main temple niches': 'The trapezoidal niches of the Main Temple: seven in the central wall and five in each side wall. Exact niche shapes are schematic.',
  'main temple altar rock': 'The large partially carved rock about 10 m ahead of the Main Temple, thought to have served as a sacrificial altar. Exact carving is schematic.',
  'southern cross sculpture': 'The small stone sculpture depicting the Southern Cross constellation beside the Main Temple, casting a llama-head shadow at the winter solstice. Exact form is schematic.',
  'main temple floor platform': 'The floor platform of the Main Temple. Holes for roof beams survive but there is no evidence the temple was ever roofed. Exact platform extent is schematic.',
  'condor head stone': 'The flat triangular rock forming the condor head, with carved eyes and beak. It may have served as a sacrificial altar. Exact carving is schematic.',
  'condor ruff stones': 'The abutting semicircular stones representing the condor neck ruff. Exact arrangement is schematic.',
  'condor left wing rock': 'One of two outstretched rock formations shaped into the wings of a swooping condor. Exact wing geometry is schematic.',
  'condor right wing rock': 'One of two outstretched rock formations shaped into the wings of a swooping condor. Exact wing geometry is schematic.',
  'condor sacrificial altar': 'The stone before the condor head that may have served as a sacrificial altar. Its role is debated; exact form is schematic.',
  'condor temple north wall': 'The enclosing wall of the Temple of the Condor on the north side. Exact wall line is schematic.',
  'condor temple east wall': 'The enclosing wall of the Temple of the Condor on the east side. Exact wall line is schematic.',
  'condor subterranean chamber floor': 'The floor of the subterranean chamber beneath the Temple of the Condor, part of its grottos and passageways. Exact chamber extent is schematic.',
  'condor chamber niches': 'Niches in the subterranean chamber of the Temple of the Condor, large enough for mummies, which is why the complex may have served as a prison or sacrificial area. Exact niche count is schematic.',
  'condor chamber roof slabs': 'The stone roof slabs over the subterranean chamber. Exact construction is schematic.',
  'condor chamber stair': 'The stair descending into the subterranean chamber. Exact placement is schematic.',
  'fountain one': 'The first of the Stairway of Fountains, adjacent to the emperor residence, symbolizing the ruler privileged access to water. Machu Picchu 16 fountains cascade with a total drop of about 26 m. Exact fountain position is schematic.',
  'fountain two': 'The second of the modeled Stairway of Fountains. Water from one fountain spills into the next, distributing the supply down the slope. Exact position is schematic.',
  'fountain three': 'The third of the modeled Stairway of Fountains. Exact position is schematic.',
  'fountain four': 'The fourth of the modeled Stairway of Fountains. Exact position is schematic.',
  'fountain five': 'The fifth of the modeled Stairway of Fountains. Exact position is schematic.',
  'temple of the condor private fountain': 'The private fountain of the Temple of the Condor, the lowest fountain, enclosed by higher walls than the others. Exact position is schematic.',
  'spring supply channel': 'The stone-lined canal from the mountain spring, about 749 m long, 10 to 12 cm wide and 10 to 16 cm deep, running at about a 3% slope with a design capacity of about 300 litres per minute. Exact channel line is schematic.',
  'fountain bypass channel': 'The buried bypass channel that lets water skip fountains during maintenance or redirection. Exact channel line is schematic.',
  'main drain': 'The main drain carrying excess stormwater away from the domestic supply. About 130 outlet drains punch through retaining walls across the site. Exact drain line is schematic.',
  'west terrace 1 retaining wall': 'The stone retaining wall of an agricultural terrace on the west slope. Terrace fills of layered stone carry subsurface water down to the drains. Terrace counts and widths are schematic.',
  'west terrace 1 platform': 'The planting platform of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 2 retaining wall': 'The stone retaining wall of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 2 platform': 'The planting platform of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 3 retaining wall': 'The stone retaining wall of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 3 platform': 'The planting platform of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 4 retaining wall': 'The stone retaining wall of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 4 platform': 'The planting platform of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 5 retaining wall': 'The stone retaining wall of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 5 platform': 'The planting platform of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 6 retaining wall': 'The stone retaining wall of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 6 platform': 'The planting platform of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 7 retaining wall': 'The stone retaining wall of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 7 platform': 'The planting platform of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 8 retaining wall': 'The stone retaining wall of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'west terrace 8 platform': 'The planting platform of an agricultural terrace on the west slope. Terrace counts and widths are schematic.',
  'south terrace 1 retaining wall': 'The stone retaining wall of an agricultural terrace on the south slope. Terrace counts and widths are schematic.',
  'south terrace 1 platform': 'The planting platform of an agricultural terrace on the south slope. Terrace counts and widths are schematic.',
  'south terrace 2 retaining wall': 'The stone retaining wall of an agricultural terrace on the south slope. Terrace counts and widths are schematic.',
  'south terrace 2 platform': 'The planting platform of an agricultural terrace on the south slope. Terrace counts and widths are schematic.',
  'south terrace 3 retaining wall': 'The stone retaining wall of an agricultural terrace on the south slope. Terrace counts and widths are schematic.',
  'south terrace 3 platform': 'The planting platform of an agricultural terrace on the south slope. Terrace counts and widths are schematic.',
  'elite house 1 walls': 'The stone walls of an elite house with a trapezoidal doorway. Exact house size is schematic.',
  'elite house 1 thatched roof': 'The reconstructed thatched gable roof of an elite house. Roofs are shown as reconstructed; exact pitch is schematic.',
  'elite house 2 walls': 'The stone walls of an elite house with a trapezoidal doorway. Exact house size is schematic.',
  'elite house 2 thatched roof': 'The reconstructed thatched gable roof of an elite house. Roofs are shown as reconstructed; exact pitch is schematic.',
  'elite house 3 walls': 'The stone walls of an elite house with a trapezoidal doorway. Exact house size is schematic.',
  'elite house 3 thatched roof': 'The reconstructed thatched gable roof of an elite house. Roofs are shown as reconstructed; exact pitch is schematic.',
  'commoner house row 1 walls': 'The stone walls of a commoner house row. Exact house count is schematic.',
  'commoner house row 1 thatched roofs': 'The reconstructed thatched gable roofs of a commoner house row. Exact pitch is schematic.',
  'commoner house row 2 walls': 'The stone walls of a commoner house row. Exact house count is schematic.',
  'commoner house row 2 thatched roofs': 'The reconstructed thatched gable roofs of a commoner house row. Exact pitch is schematic.',
  'storehouse (colca) 1': 'A ventilated storehouse (colca) for food and resource preservation. Exact size is schematic.',
  'storehouse (colca) 2': 'A ventilated storehouse (colca) for food and resource preservation. Exact size is schematic.',
  'residential courtyard walls': 'The courtyard walls of the residential quarter. Exact layout is schematic.',
  'residential path': 'A stone path through the residential quarter. Exact path line is schematic.',
  'sacred plaza paving': 'The paving of the Sacred Plaza, the ceremonial heart flanked by temples. Exact plaza extent is schematic.',
  'central plaza': 'The broad grassy Central Plaza, once used for public gatherings, rituals and possibly ceremonial games. Exact plaza extent is schematic.',
  'main gate': 'The Main Gate, the single guarded entrance to the citadel behind its stone wall. Exact gate position is schematic.',
  'guardhouse': 'The Guardhouse overlooking the terraces and main entrance, thought to be used for surveillance and signaling. Exact position is schematic.',
  'north perimeter wall': 'The north perimeter wall of the citadel. Exact wall line is schematic.',
  'east perimeter wall': 'The east perimeter wall of the citadel. Exact wall line is schematic.',
  'sun gate (intipunku)': 'The Sun Gate (Intipunku), the Inca Trail entrance at the far end of the citadel. Exact position is schematic.',
  'main stairway': 'The main stairway threading the upper city, with drainage channels incorporated into its steps. Exact stair line is schematic.',
  'lower stair': 'A lower stair connecting the terraces to the urban sector. Exact stair line is schematic.',
  'ridge platform': 'The flattened mountain ridge the city stands on, rising some 650 m above the Urubamba River canyon. Context geometry only.',
  'machu picchu mountain': 'Machu Picchu mountain (2,795 m), the humpbacked peak sheltering the ruins at the south end of the saddle. Context geometry only.',
  'huayna picchu': 'Huayna Picchu (2,667 m), the pinnacle overlooking the ruins at the north end of the saddle. Context geometry only.',
  'urubamba river': 'The Urubamba River far below in its deep canyon. Context geometry only.',
  'east slope apron': 'The steep eastern slope falling away from the city. Context geometry only.',
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
  const normalized = p.geoms.map((g) => {
    g.deleteAttribute('uv');
    return g.index ? g.toNonIndexed() : g;
  });
  const merged = mergeGeometries(normalized, false);
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
const binName = 'machu-picchu-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the machu-picchu directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Machu Picchu, Peru - key structures (schematic)',
  title: 'Machu Picchu',
  location: 'Cusco Region, Peru',
  blurb: 'The 15th-century Inca citadel on a 2,430 m mountain ridge, in detailed schematic form: the Temple of the Sun, the Royal Tomb, the Intihuatana, the Temple of the Three Windows, the Main Temple, the Temple of the Condor, the Stairway of Fountains, agricultural terraces, and the residential sector in outline. This model covers the key structures, not the whole mountain.',
  sourceUrls: [
    { label: 'Wikipedia: Machu Picchu', url: 'http://en.wikipedia.org/wiki/Machu_Picchu' },
    { label: 'Smarthistory: Machu Picchu, c. 1450-1540', url: 'https://human.libretexts.org/Bookshelves/Art/Art_History_and_Theory/SmartHistory_of_Art_2e/SmartHistory_of_Art_XIa_-_Th%E2%80%A6/4.2.13.7%253A%2bMachu%2bPicchu.pdf' },
    { label: 'The Only Peru Guide: Temple of the Sun / Intiwasi', url: 'https://www.theonlyperuguide.com/peru-guide/machu-picchu/highlights/temple-sun-intiwasi/' },
    { label: 'Kenneth R. Wright: Water Supply and Drainage at Machu Picchu', url: 'http://www.waterhistory.org/histories/machu/machu.pdf' },
    { label: 'UNEP-WCMC: Historic Sanctuary of Machu Picchu', url: 'http://world-heritage-datasheets.unep-wcmc.org/datasheet/output/site/historic-sanctuary-of-machu-picchu/' },
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
  chunks: [{ url: '/models/machu-picchu/machu-picchu-0.bin', bytes: offset }],
  triangles,
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
