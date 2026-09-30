// Procedural Notre-Dame de Paris for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Notre-Dame de Paris in code and
// writes it in the atlas binary format:
//   public/models/notre-dame-de-paris/atlas.json
//   public/models/notre-dame-de-paris/notre-dame-de-paris-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/notre-dame-de-paris-attribution.md,
// opened 2026-09-30):
//   Cathédrale Notre-Dame de Paris, Île de la Cité, Paris; dedicated to the
//   Virgin Mary; French Gothic; pioneering rib vault and flying buttress;
//   begun 1163 under Bishop Maurice de Sully (first stone with Pope
//   Alexander III), first Mass 1182, largely complete by 1260, completed
//   1345; architects Jean de Chelles (nave and west towers, 1240s), Pierre
//   de Montreuil (transept facades, rose windows), Jean Ravy (flying
//   buttresses, late 13th century, added because the walls bowed outward);
//   128 m total exterior length; transept 48 m wide and 14 m deep; total
//   width 40 m; west facade 43 m wide, 43 m to the base of the towers,
//   63 m to the top of the towers; towers 69 m with 380 steps; nave 12 m
//   wide; vault 33 m; roof 43 m; side aisles 10 m; choir 36 m long;
//   4,800 m² surface; 75 columns and pillars; three west portals sculpted
//   1200-1240: St Anne (south/right) first with a tympanum recycled from a
//   Romanesque church of about 1150, Virgin (north/left) next, Last Judgment
//   (center) last and tallest; Gallery of Kings: 28 statues of the kings of
//   Judah and Israel, decapitated in the Revolution, 21 heads found 1977,
//   now at the Musée de Cluny; west rose 9.6 m (about 1225); north rose
//   13.1 m (about 1250); south rose 12.9 m (about 1260); chimeras on the
//   Grand Gallery are 19th century Viollet-le-Duc additions, not medieval;
//   crossing spire 96 m: first 1220-1230 (78 m) dismantled late 18th
//   century; second by Viollet-le-Duc 1859, oak covered with lead,
//   destroyed 15 April 2019; third built 2022-2023 to the identical design,
//   copper rooster weathervane by Philippe Villeneuve placed 16 December
//   2023, unveiled 13 February 2024; the Forest: more than 1,300 oak trees,
//   about 21 hectares, lost in the fire; great organ: nearly 8,000 pipes,
//   five keyboards, pedalboard, 109 stops, 12 m tall, 16 m above the nave,
//   Cavaillé-Coll 1868, dismantled August 2020 and reassembled end of 2023;
//   10 bells: Emmanuel bourdon 13 tons in the south tower (recast 1681,
//   clapper 500 kg), north tower holds Marie 6,023 kg, Gabriel 4,162 kg,
//   Anne-Geneviève 3,477 kg, Denis 2,502 kg, Maurice 1,915 kg, Jean-Marie
//   1,822 kg, Benoît-Joseph 1,767 kg, Étienne 763 kg; Napoleon crowned 1804;
//   Hugo novel 1831; restoration 1844-1864 by Viollet-le-Duc; liberation
//   Magnificat 26 August 1944; facade cleaned 1963; restoration 1991-2000;
//   UNESCO Banks of the Seine 1991; about 12 million visitors a year;
//   Crown of Thorns and True Cross relics; Pietà by Nicolas Coustou in the
//   choir; parvis holds France's point zéro marker, the Archaeological
//   Crypt of the Île de la Cité, and the Charlemagne equestrian statue.
// Schematic (not sourced, never stated as fact in the UI): exact footprint
// placement and orientation of bays, piers, chapels, and the sacristy;
// the number and spacing of nave and choir bays; individual flyer profiles
// and the count modeled (11 per side); the number and placement of
// radiating chevet chapels; per-portal recess depths; per-king statue poses
// (28 niche figures as plain markers); rose window tracery patterns; organ
// case, pipe, and console shapes; spire stage divisions, dormer count, and
// rib profiles; lead roof seam lines; the Forest shown as schematic
// trusses; interior furnishings beyond the sourced organ, bells, Pietà, and
// relics; parvis extent and crypt interior.
//
// Granularity: 107 named parts across 12 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-notre-dame-de-paris.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'notre-dame-de-paris');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (128 m) maps to 2.4 units.
const S = 2.4 / 128;

// ---------------------------------------------------------------- helpers
// Coordinate frame: metres; x across the church, z along its length (west
// front at z = -64, chevet tip at z = +64), y up.
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
// Sloped roof plane from eave (x0, y0) to ridge (x1, y1), spanning z0..z1.
function slope(x0, y0, x1, y1, z0, z1, t = 0.6) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const g = new THREE.BoxGeometry(len, t, z1 - z0);
  g.rotateZ(Math.atan2(dy, dx)); // rotate BEFORE translate
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
// Barrel vault with axis along Z, opening downward, apex at springY + r.
function vaultZ(r, len, cx, springY, cz, seg = 20) {
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, true, 0, Math.PI);
  g.rotateX(Math.PI / 2);
  g.rotateZ(Math.PI / 2);
  g.translate(cx, springY, cz);
  return g;
}
// Bell profile via lathe; yTop is the crown, mouth hangs below.
function bell(x, yTop, z, s = 1) {
  const pts = [
    new THREE.Vector2(0.12 * s, 0),
    new THREE.Vector2(0.9 * s, -0.2 * s),
    new THREE.Vector2(1.15 * s, -1.2 * s),
    new THREE.Vector2(1.35 * s, -2.2 * s),
    new THREE.Vector2(1.5 * s, -2.6 * s),
    new THREE.Vector2(1.35 * s, -2.75 * s),
  ];
  const g = new THREE.LatheGeometry(pts, 12);
  g.translate(x, yTop, z);
  return g;
}
// Rose window parts: [ring, glass] and tracery geoms. facing 'west' keeps the
// wheel in the XY plane; transept faces rotate it into the ZY plane.
// Rotation happens before translation.
function roseWheel(cx, cy, cz, r, facing) {
  const ring = new THREE.TorusGeometry(r, 0.22, 8, 28);
  const glass = new THREE.CircleGeometry(r - 0.2, 28);
  const inner = new THREE.TorusGeometry(r * 0.45, 0.16, 8, 20);
  const spokes = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const sp = new THREE.BoxGeometry(r * 2 - 0.5, 0.28, 0.28);
    sp.rotateZ(a); // rotate BEFORE translate
    spokes.push(sp);
  }
  const parts = [ring, glass, inner, ...spokes];
  if (facing !== 'west') {
    for (const g of parts) g.rotateY(Math.PI / 2); // rotate BEFORE translate
  }
  for (const g of parts) g.translate(cx, cy, cz);
  return { wheel: [ring, glass], tracery: [inner, ...spokes] };
}
// Small standing figure (statues, chimeras, apostles): body box + head.
function figure(x, yBase, z, h = 3, w = 0.9) {
  const body = box(x - w / 2, x + w / 2, yBase, yBase + h * 0.8, z - w / 2, z + w / 2);
  const head = new THREE.SphereGeometry(w * 0.42, 8, 8);
  head.translate(x, yBase + h * 0.9, z);
  return [body, head];
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- West towers (sourced: 69 m, 380 steps, 43 m wide facade) ---
{
  const geoms = [
    box(-21.5, -10.5, 0, 43, -64, -54),
    box(-21, -11, 43, 69, -63.5, -54.5),
    box(-21.5, -20.9, 0, 69, -64, -54), // corner buttress strips
    box(-11.1, -10.5, 0, 69, -64, -54),
  ];
  addPart('northwest-tower', 'Northwest tower', 'towers', geoms);
}
{
  const geoms = [
    box(10.5, 21.5, 0, 43, -64, -54),
    box(11, 21, 43, 69, -63.5, -54.5),
    box(10.5, 11.1, 0, 69, -64, -54),
    box(20.9, 21.5, 0, 69, -64, -54),
  ];
  addPart('southwest-tower', 'Southwest tower', 'towers', geoms);
}
{
  // Belfry openings as dark recesses with mullions (sourced: belfry stage).
  const geoms = [];
  for (const [ox, oz, face] of [[-16, -63.6, 'front'], [-21.1, -59, 'side']]) {
    for (const dx of [-2.6, 2.6]) {
      if (face === 'front') {
        geoms.push(box(ox + dx - 1.7, ox + dx + 1.7, 48, 62, oz - 0.5, oz + 0.5));
        geoms.push(box(ox + dx - 0.25, ox + dx + 0.25, 48, 62, oz - 0.6, oz + 0.6));
      } else {
        geoms.push(box(ox - 0.5, ox + 0.5, 48, 62, oz + dx - 1.7, oz + dx + 1.7));
        geoms.push(box(ox - 0.6, ox + 0.6, 48, 62, oz + dx - 0.25, oz + dx + 0.25));
      }
    }
  }
  addPart('north-belfry', 'North tower belfry', 'towers', geoms);
}
{
  const geoms = [];
  for (const [ox, oz, face] of [[16, -63.6, 'front'], [21.1, -59, 'side']]) {
    for (const dx of [-2.6, 2.6]) {
      if (face === 'front') {
        geoms.push(box(ox + dx - 1.7, ox + dx + 1.7, 48, 62, oz - 0.5, oz + 0.5));
        geoms.push(box(ox + dx - 0.25, ox + dx + 0.25, 48, 62, oz - 0.6, oz + 0.6));
      } else {
        geoms.push(box(ox - 0.5, ox + 0.5, 48, 62, oz + dx - 1.7, oz + dx + 1.7));
        geoms.push(box(ox - 0.6, ox + 0.6, 48, 62, oz + dx - 0.25, oz + dx + 0.25));
      }
    }
  }
  addPart('south-belfry', 'South tower belfry', 'towers', geoms);
}
{
  const geoms = [];
  for (const [x, z] of [[-21.5, -63], [-21.5, -55], [21.5, -63], [21.5, -55]]) {
    geoms.push(cyl(1.2, 1.5, 71, x, 35.5, z, 8));
    const cap = new THREE.ConeGeometry(1.6, 2.5, 8);
    cap.translate(x, 72.2, z);
    geoms.push(cap);
  }
  addPart('tower-stair-turrets', 'Tower stair turrets', 'towers', geoms);
}
{
  // Emmanuel: 13 ton bourdon in the south tower, recast 1681.
  const geoms = [bell(16, 60, -59, 1.6), box(14.5, 17.5, 60, 61.2, -60, -58)];
  addPart('emmanuel-bell', 'Emmanuel bell', 'towers', geoms);
}
{
  // North tower: eight smaller bells (sourced names and weights).
  const geoms = [];
  const names = ['marie', 'gabriel', 'anne-genevieve', 'denis', 'maurice', 'jean-marie', 'benoit-joseph', 'etienne'];
  names.forEach((n, i) => {
    const x = -19 + (i % 4) * 2.2;
    const z = -61 + Math.floor(i / 4) * 3.5;
    geoms.push(bell(x, 58, z, 0.7));
  });
  addPart('north-tower-bells', 'North tower bells', 'towers', geoms);
}
{
  const geoms = [];
  for (let x = -21.5; x <= -10.5; x += 1.4) {
    geoms.push(box(x, x + 0.7, 69, 70.4, -64, -63.4));
    geoms.push(box(x, x + 0.7, 69, 70.4, -54.6, -54));
  }
  for (let x = 10.5; x <= 21.5; x += 1.4) {
    geoms.push(box(x, x + 0.7, 69, 70.4, -64, -63.4));
    geoms.push(box(x, x + 0.7, 69, 70.4, -54.6, -54));
  }
  addPart('tower-parapets', 'Tower parapets', 'towers', geoms);
}

// --- West facade (sourced portal order, 28 kings, 9.6 m rose, chimeras) ---
{
  // Portal of the Virgin: north (left facing the facade), sculpted 1200-1240.
  const geoms = [
    box(-13.5, -8.5, 0, 9, -64.5, -63.8), // dark recess
  ];
  for (const jx of [-13.2, -12.4, -9.6, -8.8]) geoms.push(cyl(0.35, 0.4, 9, jx, 4.5, -63.9, 8));
  addPart('virgin-portal', 'Portal of the Virgin', 'facade', geoms);
  addPart('virgin-tympanum', 'Virgin portal tympanum', 'facade', [
    box(-13, -9, 9, 12.5, -64.3, -63.8),
    box(-12.4, -9.6, 10, 11.6, -64.4, -63.9),
  ]);
}
{
  // Portal of the Last Judgment: center, last and tallest of the three.
  const geoms = [box(-3.5, 3.5, 0, 11, -64.5, -63.8)];
  for (const jx of [-3.2, -2.4, 2.4, 3.2]) geoms.push(cyl(0.35, 0.4, 11, jx, 5.5, -63.9, 8));
  addPart('last-judgment-portal', 'Portal of the Last Judgment', 'facade', geoms);
  addPart('last-judgment-tympanum', 'Last Judgment tympanum', 'facade', [
    box(-3, 3, 11, 15, -64.3, -63.8),
    box(-2.4, 2.4, 12, 14, -64.4, -63.9),
  ]);
}
{
  // Portal of Saint Anne: south (right), first built; tympanum recycled
  // from a Romanesque church of about 1150.
  const geoms = [box(8.5, 13.5, 0, 9, -64.5, -63.8)];
  for (const jx of [8.8, 9.6, 12.4, 13.2]) geoms.push(cyl(0.35, 0.4, 9, jx, 4.5, -63.9, 8));
  addPart('saint-anne-portal', 'Portal of Saint Anne', 'facade', geoms);
  addPart('saint-anne-tympanum', 'Saint Anne tympanum', 'facade', [
    box(9, 13, 9, 12.5, -64.3, -63.8),
    box(9.6, 12.4, 10, 11.6, -64.4, -63.9),
  ]);
}
addPart('west-facade-wall', 'West facade wall', 'facade', [
  box(-10.5, 10.5, 0, 52, -64, -62.5),
  box(-10.5, 10.5, 52, 54, -64, -62.5),
]);
{
  // Gallery of Kings: 28 statues of the kings of Judah and Israel.
  const geoms = [box(-21.5, 21.5, 17, 17.8, -64.4, -63.6)];
  for (let i = 0; i < 28; i++) {
    const x = -20.7 + i * (41.4 / 27);
    geoms.push(...figure(x, 17.8, -64.1, 2.8, 0.8));
    geoms.push(box(x - 0.7, x + 0.7, 17.8, 20.8, -64.5, -64.2));
  }
  addPart('gallery-of-kings', 'Gallery of Kings', 'facade', geoms);
}
{
  const { wheel, tracery } = roseWheel(-64.2, 40, 0, 4.8, 'west');
  // roseWheel for 'west' translates by (0, cy, c); shift x by cx = 0 here.
  addPart('west-rose-window', 'West rose window', 'facade', wheel);
  addPart('west-rose-tracery', 'West rose tracery', 'facade', tracery);
}
{
  const geoms = [box(-10.5, 10.5, 30, 30.8, -64.3, -63.7)];
  for (let x = -9.5; x <= 9.5; x += 1.6) geoms.push(cyl(0.22, 0.22, 3.2, x, 32.4, -64, 6));
  addPart('rose-gallery', 'Rose window gallery', 'facade', geoms);
}
{
  // Grand Gallery connecting the towers, carrying the chimeras.
  const geoms = [box(-10.5, 10.5, 44, 44.8, -64, -62.8), box(-10.5, 10.5, 49.2, 50, -64, -62.8)];
  for (let x = -9.5; x <= 9.5; x += 1.9) geoms.push(cyl(0.28, 0.28, 4.4, x, 46.8, -63.4, 6));
  addPart('grand-gallery', 'Grand Gallery', 'facade', geoms);
}
{
  // Chimeras: 19th century Viollet-le-Duc additions, not medieval.
  const geoms = [];
  for (let i = 0; i < 9; i++) {
    const x = -8.5 + i * 2.1;
    geoms.push(...figure(x, 50, -63.6, 1.8, 0.7));
  }
  addPart('chimera-figures', 'Chimera figures', 'facade', geoms);
}
{
  const geoms = [];
  for (const gx of [-11, 0, 11]) {
    geoms.push(slope(gx - 3.4, 21, gx, 26, -64.2, -62.8));
    geoms.push(slope(gx + 3.4, 21, gx, 26, -64.2, -62.8));
  }
  addPart('west-gables', 'West facade gables', 'facade', geoms);
}

// --- Nave (sourced: 12 m wide vessel, 33 m vault, 10 m aisles) ---
{
  const geoms = [];
  for (let i = 0; i < 9; i++) {
    const z = -50 + i * 6.5;
    geoms.push(cyl(1.1, 1.3, 13, -6, 6.5, z, 10));
  }
  geoms.push(box(-6.6, -5.4, 13, 17, -54, 6));
  addPart('north-nave-arcade', 'North nave arcade', 'nave', geoms);
}
{
  const geoms = [];
  for (let i = 0; i < 9; i++) {
    const z = -50 + i * 6.5;
    geoms.push(cyl(1.1, 1.3, 13, 6, 6.5, z, 10));
  }
  geoms.push(box(5.4, 6.6, 13, 17, -54, 6));
  addPart('south-nave-arcade', 'South nave arcade', 'nave', geoms);
}
{
  const geoms = [];
  for (let i = 0; i < 9; i++) {
    const z = -50 + i * 6.5;
    geoms.push(cyl(0.9, 1.1, 10, -13.5, 5, z, 10));
    geoms.push(box(-20.5, -19.5, 0, 14, z - 0.6, z + 0.6));
  }
  addPart('north-aisle-piers', 'North outer aisle piers', 'nave', geoms);
}
{
  const geoms = [];
  for (let i = 0; i < 9; i++) {
    const z = -50 + i * 6.5;
    geoms.push(cyl(0.9, 1.1, 10, 13.5, 5, z, 10));
    geoms.push(box(19.5, 20.5, 0, 14, z - 0.6, z + 0.6));
  }
  addPart('south-aisle-piers', 'South outer aisle piers', 'nave', geoms);
}
addPart('nave-floor', 'Nave floor', 'nave', [box(-20, 20, -0.4, 0, -54, 44)]);
{
  const geoms = [box(-6.6, -5.4, 17, 21, -54, 6)];
  for (let i = 0; i < 9; i++) geoms.push(box(-6.5, -5.5, 17.6, 20.4, -52 + i * 6.5, -50.4 + i * 6.5));
  addPart('north-triforium', 'North triforium', 'nave', geoms);
}
{
  const geoms = [box(5.4, 6.6, 17, 21, -54, 6)];
  for (let i = 0; i < 9; i++) geoms.push(box(5.5, 6.5, 17.6, 20.4, -52 + i * 6.5, -50.4 + i * 6.5));
  addPart('south-triforium', 'South triforium', 'nave', geoms);
}
{
  const geoms = [box(-6.6, -5.4, 21, 31, -54, 6)];
  for (let i = 0; i < 9; i++) geoms.push(box(-6.5, -5.5, 22, 30, -52.6 + i * 6.5, -49.8 + i * 6.5));
  addPart('north-clerestory', 'North clerestory', 'nave', geoms);
}
{
  const geoms = [box(5.4, 6.6, 21, 31, -54, 6)];
  for (let i = 0; i < 9; i++) geoms.push(box(5.5, 6.5, 22, 30, -52.6 + i * 6.5, -49.8 + i * 6.5));
  addPart('south-clerestory', 'South clerestory', 'nave', geoms);
}
{
  const geoms = [vaultZ(6, 58, 0, 27, -24)];
  for (let i = 0; i < 9; i++) {
    const z = -50 + i * 6.5;
    geoms.push(strut([-6, 27, z], [0, 32.5, z], 0.5));
    geoms.push(strut([6, 27, z], [0, 32.5, z], 0.5));
  }
  addPart('nave-rib-vaults', 'Nave rib vaults', 'nave', geoms);
}
addPart('north-aisle-vaults', 'North aisle vaults', 'nave', [
  vaultZ(3.5, 58, -9.5, 10, -24),
  vaultZ(3.5, 58, -16.5, 10, -24),
]);
addPart('south-aisle-vaults', 'South aisle vaults', 'nave', [
  vaultZ(3.5, 58, 9.5, 10, -24),
  vaultZ(3.5, 58, 16.5, 10, -24),
]);

// --- Transept (sourced: 48 m wide, 14 m deep; roses 13.1 / 12.9 m) ---
{
  const geoms = [
    box(-24, -20, 0, 30, -2, 12),
    slope(-24, 30, -22, 36, -2, 12),
    slope(-20, 30, -22, 36, -2, 12),
  ];
  addPart('north-transept-arm', 'North transept arm', 'transept', geoms);
}
{
  const geoms = [
    box(20, 24, 0, 30, -2, 12),
    slope(20, 30, 22, 36, -2, 12),
    slope(24, 30, 22, 36, -2, 12),
  ];
  addPart('south-transept-arm', 'South transept arm', 'transept', geoms);
}
addPart('north-transept-portal', 'North transept portal', 'transept', [
  box(-24.5, -23.8, 0, 8, 2, 8),
  cyl(0.3, 0.35, 8, -24.1, 4, 2.2, 8),
  cyl(0.3, 0.35, 8, -24.1, 4, 7.8, 8),
]);
addPart('south-transept-portal', 'South transept portal', 'transept', [
  box(23.8, 24.5, 0, 8, 2, 8),
  cyl(0.3, 0.35, 8, 24.1, 4, 2.2, 8),
  cyl(0.3, 0.35, 8, 24.1, 4, 7.8, 8),
]);
{
  const { wheel, tracery } = roseWheel(-24.2, 32, 5, 6.55, 'north');
  addPart('north-rose-window', 'North rose window', 'transept', wheel);
  addPart('north-rose-tracery', 'North rose tracery', 'transept', tracery);
}
{
  const { wheel, tracery } = roseWheel(24.2, 32, 5, 6.45, 'south');
  addPart('south-rose-window', 'South rose window', 'transept', wheel);
  addPart('south-rose-tracery', 'South rose tracery', 'transept', tracery);
}
{
  const geoms = [];
  for (const [x, z] of [[-6, -2], [6, -2], [-6, 12], [6, 12]]) {
    geoms.push(box(x - 1.4, x + 1.4, 0, 33, z - 1.4, z + 1.4));
  }
  addPart('crossing-piers', 'Crossing piers', 'transept', geoms);
}
addPart('crossing-vault', 'Crossing vault', 'transept', [
  vaultZ(7, 14, 0, 26, 5),
  (() => {
    const g = new THREE.CylinderGeometry(7, 7, 12, 20, 1, true, 0, Math.PI);
    g.rotateZ(Math.PI / 2);
    g.translate(0, 26, 5);
    return g;
  })(),
]);

// --- Choir (sourced: 36 m long) ---
{
  const geoms = [];
  for (let i = 0; i < 5; i++) {
    const z = 15.5 + i * 6.25;
    geoms.push(cyl(1.1, 1.3, 13, -6, 6.5, z, 10));
  }
  geoms.push(box(-6.6, -5.4, 13, 17, 12, 44));
  addPart('north-choir-arcade', 'North choir arcade', 'choir', geoms);
}
{
  const geoms = [];
  for (let i = 0; i < 5; i++) {
    const z = 15.5 + i * 6.25;
    geoms.push(cyl(1.1, 1.3, 13, 6, 6.5, z, 10));
  }
  geoms.push(box(5.4, 6.6, 13, 17, 12, 44));
  addPart('south-choir-arcade', 'South choir arcade', 'choir', geoms);
}
{
  const geoms = [];
  for (let i = 0; i < 5; i++) {
    const z = 15.5 + i * 6.25;
    geoms.push(cyl(0.9, 1.1, 10, -13.5, 5, z, 10));
    geoms.push(cyl(0.9, 1.1, 10, 13.5, 5, z, 10));
  }
  addPart('choir-outer-piers', 'Choir outer piers', 'choir', geoms);
}
{
  const geoms = [vaultZ(6, 30, 0, 27, 29)];
  for (let i = 0; i < 5; i++) {
    const z = 15.5 + i * 6.25;
    geoms.push(strut([-6, 27, z], [0, 32.5, z], 0.5));
    geoms.push(strut([6, 27, z], [0, 32.5, z], 0.5));
  }
  addPart('choir-rib-vaults', 'Choir rib vaults', 'choir', geoms);
}
addPart('choir-aisle-vaults', 'Choir aisle vaults', 'choir', [
  vaultZ(3.5, 30, -9.5, 10, 29),
  vaultZ(3.5, 30, -16.5, 10, 29),
  vaultZ(3.5, 30, 9.5, 10, 29),
  vaultZ(3.5, 30, 16.5, 10, 29),
]);
addPart('high-altar', 'High altar', 'choir', [
  box(-2.5, 2.5, 1, 2.4, 30, 34),
  box(-3, 3, 0.8, 1, 29.5, 34.5),
  box(-0.4, 0.4, 2.4, 5, 31.8, 32.2),
]);
{
  const geoms = [];
  for (const sx of [-1, 1]) {
    geoms.push(box(sx * 3.5, sx * 5.2, 1, 3.2, 20, 38));
    for (let z = 21; z < 38; z += 2.4) geoms.push(box(sx * 3.4, sx * 5.3, 3.2, 4, z, z + 0.3));
  }
  addPart('choir-stalls', 'Choir stalls', 'choir', geoms);
}
addPart('sanctuary-floor', 'Sanctuary floor', 'choir', [box(-6, 6, 0, 1, 24, 44)]);

// --- Chevet and apse (schematic: chapel count and placement) ---
{
  const wall = new THREE.CylinderGeometry(20, 20, 28, 24, 1, true, -Math.PI / 2, Math.PI);
  wall.translate(0, 14, 44);
  const chap = new THREE.CylinderGeometry(20.6, 20.6, 8, 24, 1, true, -Math.PI / 2, Math.PI);
  chap.translate(0, 4, 44);
  addPart('chevet-wall', 'Chevet outer wall', 'apse', [wall, chap]);
}
{
  const amb = new THREE.CylinderGeometry(16.5, 16.5, 5, 24, 1, true, -Math.PI / 2, Math.PI);
  amb.translate(0, 8.5, 44);
  addPart('ambulatory-vault', 'Ambulatory vault', 'apse', [amb]);
}
{
  // Radiating chapels around the chevet (schematic count and placement).
  const geoms = [];
  for (const deg of [-65, -32.5, 0, 32.5, 65]) {
    const a = (deg * Math.PI) / 180;
    const g = box(-2.5, 2.5, 0, 9, -3, 3);
    g.rotateY(-a); // rotate BEFORE translate
    g.translate(21 * Math.sin(a), 0, 44 + 21 * Math.cos(a));
    const roof = new THREE.ConeGeometry(3.6, 2.5, 4);
    roof.rotateY(-a + Math.PI / 4); // rotate BEFORE translate
    roof.translate(21 * Math.sin(a), 10.2, 44 + 21 * Math.cos(a));
    geoms.push(g, roof);
  }
  addPart('radiating-chapels', 'Radiating chapels', 'apse', geoms);
}
{
  const dome = new THREE.ConeGeometry(6.2, 6, 16, 1, true, -Math.PI / 2, Math.PI);
  dome.translate(0, 30, 44);
  addPart('apse-semi-dome', 'Apse semi-dome', 'apse', [dome]);
}
{
  const geoms = [];
  for (const deg of [-60, -30, 0, 30, 60]) {
    const a = (deg * Math.PI) / 180;
    geoms.push(strut([0, 27, 44], [6.5 * Math.sin(a), 31, 44 + 6.5 * Math.cos(a)], 0.45));
  }
  addPart('apse-vault-ribs', 'Apse vault ribs', 'apse', geoms);
}
{
  const cl = new THREE.CylinderGeometry(6.5, 6.5, 10, 16, 1, true, -Math.PI / 2, Math.PI);
  cl.translate(0, 26, 44);
  addPart('chevet-clerestory', 'Chevet clerestory', 'apse', [cl]);
}

// --- Flying buttresses (sourced: late 13th century, among the earliest) ---
function flyerPart(id, name, side, z) {
  const sx = side < 0 ? -1 : 1;
  const geoms = [
    box(sx * 19.7 - 1.1, sx * 19.7 + 1.1, 0, 17, z - 1.1, z + 1.1),
    strut([sx * 19.7, 16, z], [sx * 7, 26.5, z], 1.2),
    strut([sx * 19.7, 17.5, z], [sx * 10, 25, z], 0.7),
  ];
  const pin = new THREE.ConeGeometry(1.1, 3.5, 4);
  pin.translate(sx * 19.7, 18.7, z);
  geoms.push(pin);
  addPart(id, name, 'buttresses', geoms);
}
{
  const naveBays = [-47.5, -41, -34.5, -28, -21.5, -15, -8.5];
  naveBays.forEach((z, i) => {
    flyerPart(`north-flyer-${i + 1}`, `North flyer ${i + 1}`, -1, z);
    flyerPart(`south-flyer-${i + 1}`, `South flyer ${i + 1}`, 1, z);
  });
  const choirBays = [17, 23.5, 30, 36.5];
  choirBays.forEach((z, i) => {
    flyerPart(`north-choir-flyer-${i + 1}`, `North choir flyer ${i + 1}`, -1, z);
    flyerPart(`south-choir-flyer-${i + 1}`, `South choir flyer ${i + 1}`, 1, z);
  });
}

// --- Crossing spire (sourced: 96 m, Viollet-le-Duc 1859, rebuilt 2024) ---
addPart('spire-base', 'Spire base', 'fleche', [
  box(-4, 4, 43, 49, 1, 9),
  box(-5, 5, 43, 45, 0, 10),
]);
{
  const lower = new THREE.CylinderGeometry(2.2, 3.6, 24, 8);
  lower.translate(0, 61, 5);
  addPart('spire-lower-stage', 'Spire lower stage', 'fleche', [lower]);
}
{
  const upper = new THREE.CylinderGeometry(0.7, 2.2, 17, 8);
  upper.translate(0, 81.5, 5);
  addPart('spire-upper-stage', 'Spire upper stage', 'fleche', [upper]);
}
{
  const geoms = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    geoms.push(strut(
      [3.4 * Math.cos(a), 49, 5 + 3.4 * Math.sin(a)],
      [0.8 * Math.cos(a), 89, 5 + 0.8 * Math.sin(a)],
      0.5,
    ));
  }
  addPart('spire-corner-ribs', 'Spire corner ribs', 'fleche', geoms);
}
{
  // Lucarne dormers on the lower stage (schematic count).
  const geoms = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = 2.9 * Math.cos(a), z = 5 + 2.9 * Math.sin(a);
    const d = box(-0.8, 0.8, 0, 3, -0.5, 0.5);
    d.rotateY(-a); // rotate BEFORE translate
    d.translate(x, 58, z);
    const cap = slope(-0.8, 0, 0, 1.2, -0.5, 0.5);
    cap.rotateY(-a);
    cap.translate(x, 61, z);
    geoms.push(d, cap);
  }
  addPart('spire-dormers', 'Spire dormers', 'fleche', geoms);
}
{
  // Sixteen copper statues ringed the spire (schematic poses).
  const geoms = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    geoms.push(...figure(5.2 * Math.cos(a), 43, 5 + 5.2 * Math.sin(a), 3.2, 0.8));
  }
  addPart('spire-copper-statues', 'Spire copper statues', 'fleche', geoms);
}
addPart('spire-cross', 'Spire cross', 'fleche', [
  box(-0.35, 0.35, 88, 95, 4.65, 5.35),
  box(-2.2, 2.2, 91.5, 92.5, 4.7, 5.3),
]);
{
  // Golden rooster weathervane by Philippe Villeneuve, placed 16 Dec 2023.
  const body = new THREE.SphereGeometry(0.55, 10, 10);
  body.scale(1.4, 1, 0.8);
  body.translate(0, 95.8, 5);
  const comb = box(-0.15, 0.15, 96.1, 96.7, 4.4, 4.9);
  const tail = box(-0.12, 0.12, 95.6, 96.6, 5.5, 6.1);
  addPart('golden-rooster', 'Golden rooster', 'fleche', [body, comb, tail]);
}

// --- Roofs (sourced: the Forest of 1,300 oaks, lost in the 2019 fire) ---
addPart('nave-lead-roof', 'Nave lead roof', 'roof', [
  slope(-7.5, 33, 0, 43, -54, 6),
  slope(7.5, 33, 0, 43, -54, 6),
]);
addPart('choir-lead-roof', 'Choir lead roof', 'roof', [
  slope(-7.5, 33, 0, 43, 12, 44),
  slope(7.5, 33, 0, 43, 12, 44),
]);
addPart('transept-roofs', 'Transept roofs', 'roof', [
  slope(-24, 30, -22, 36, -2, 12),
  slope(-20, 30, -22, 36, -2, 12),
  slope(20, 30, 22, 36, -2, 12),
  slope(24, 30, 22, 36, -2, 12),
]);
{
  // The Forest: schematic oak trusses under the nave roof.
  const geoms = [];
  for (let z = -51; z <= 3; z += 6) {
    geoms.push(strut([-7, 33.5, z], [0, 42, z], 0.5));
    geoms.push(strut([7, 33.5, z], [0, 42, z], 0.5));
    geoms.push(box(-7, 7, 33, 33.8, z - 0.25, z + 0.25));
  }
  addPart('the-forest', 'The Forest', 'roof', geoms);
}

// --- Interior fittings ---
addPart('pulpit', 'Pulpit', 'interior', [
  cyl(0.5, 0.7, 3, 7.5, 1.5, 8, 8),
  cyl(1.3, 1.0, 2, 7.5, 4, 8, 8),
  new THREE.ConeGeometry(1.6, 1.5, 8).translate(7.5, 5.75, 8),
]);
addPart('pieta', 'Pietà', 'interior', [
  box(-2, 2, 1, 2, 40, 43), // base behind the high altar
  ...figure(0, 2, 41.5, 2.5, 1.2), // Virgin
  box(-1.2, 1.2, 2, 2.8, 40.6, 41.4), // Christ across her lap
]);
{
  const geoms = [];
  for (let z = -48; z <= -10; z += 2.6) {
    geoms.push(box(-5, -1, 0, 1.1, z, z + 1.8));
    geoms.push(box(1, 5, 0, 1.1, z, z + 1.8));
  }
  addPart('nave-pews', 'Nave pews', 'interior', geoms);
}
addPart('crown-of-thorns-treasury', 'Crown of Thorns treasury', 'interior', [
  box(13.5, 16.5, 0, 2.2, 23, 27),
  box(14, 16, 2.2, 3.4, 23.5, 26.5),
]);
addPart('baptismal-font', 'Baptismal font', 'interior', [
  cyl(0.4, 0.6, 1.2, -9, 0.6, -48, 8),
  cyl(1.1, 0.8, 0.8, -9, 1.6, -48, 10),
]);
{
  const geoms = [];
  for (let z = -44; z <= 34; z += 13) {
    geoms.push(box(-17.5, -15.5, 0, 1.6, z, z + 2.4));
    geoms.push(box(15.5, 17.5, 0, 1.6, z, z + 2.4));
  }
  addPart('side-chapel-altars', 'Side chapel altars', 'interior', geoms);
}
addPart('sacristy', 'Sacristy', 'interior', [
  box(21, 29, 0, 9, 24, 40),
  slope(21, 9, 25, 12, 24, 40),
  slope(29, 9, 25, 12, 24, 40),
]);

// --- Great organ (sourced: 8,000 pipes, 5 manuals, 109 stops) ---
addPart('organ-tribune', 'Organ tribune', 'organ', [
  box(-6, 6, 12, 14, -54, -49),
  box(-6, 6, 10, 12, -54, -53.4),
]);
addPart('organ-case', 'Organ case', 'organ', [
  box(-5, 5, 14, 24, -54, -52),
  box(-5.5, 5.5, 23.4, 24.6, -54, -52),
]);
{
  const geoms = [];
  for (const px of [-4, -2, 0, 2, 4]) {
    geoms.push(cyl(0.8, 0.8, 9, px, 18.5, -53, 8));
    const cap = new THREE.ConeGeometry(0.9, 1, 8);
    cap.translate(px, 23.5, -53);
    geoms.push(cap);
  }
  addPart('organ-pipes', 'Organ pipes', 'organ', geoms);
}
addPart('organ-console', 'Organ console', 'organ', [
  box(-1.5, 1.5, 14, 15.4, -51.5, -50),
  box(-1.5, 1.5, 15.4, 16.2, -51.3, -50.8),
]);

// --- Parvis and setting (sourced: Point Zero, crypt, Charlemagne) ---
addPart('parvis-square', 'Parvis square', 'parvis', [box(-45, 45, -0.4, 0, -115, -64)]);
{
  const med = new THREE.CylinderGeometry(0.9, 0.9, 0.12, 16);
  med.translate(0, 0.02, -84);
  addPart('point-zero-marker', 'Point Zero marker', 'parvis', [med]);
}
addPart('archaeological-crypt', 'Archaeological crypt', 'parvis', [
  box(-25, 25, -6, -1, -105, -75),
  box(-25, 25, -1.2, -0.4, -105, -75),
]);
{
  const geoms = [
    box(-30, -26, 0, 1.5, -82, -78), // pedestal
    box(-29.2, -26.8, 1.5, 3.2, -81.2, -78.8), // horse body
    ...figure(-28, 3.2, -80, 2.2, 0.9), // rider
  ];
  addPart('charlemagne-statue', 'Charlemagne statue', 'parvis', geoms);
}

// ---------------------------------------------------------------- colors
// Schematic light stone palette; the Eiffel Tower is the only dark
// realistic model in the atlas.
function colorFor(id) {
  if (id === 'emmanuel-bell' || id === 'north-tower-bells') return '#8a6f3c';
  if (id === 'north-belfry' || id === 'south-belfry') return '#3d3a34';
  if (id === 'virgin-portal' || id === 'last-judgment-portal' || id === 'saint-anne-portal'
    || id === 'north-transept-portal' || id === 'south-transept-portal') return '#4a4238';
  if (id === 'west-rose-window' || id === 'north-rose-window' || id === 'south-rose-window') return '#2f4d6e';
  if (id === 'west-rose-tracery' || id === 'north-rose-tracery' || id === 'south-rose-tracery') return '#d9cfbb';
  if (id === 'spire-lower-stage' || id === 'spire-upper-stage' || id === 'spire-base') return '#9aa39b';
  if (id === 'spire-cross') return '#6e7a6e';
  if (id === 'golden-rooster') return '#c9a227';
  if (id === 'spire-copper-statues') return '#5f7a6b';
  if (id === 'nave-lead-roof' || id === 'choir-lead-roof' || id === 'transept-roofs') return '#8f9a94';
  if (id === 'the-forest') return '#6b4f35';
  if (id === 'organ-case' || id === 'choir-stalls' || id === 'nave-pews' || id === 'pulpit') return '#8a6b45';
  if (id === 'organ-pipes') return '#b9b2a0';
  if (id === 'high-altar' || id === 'pieta' || id === 'baptismal-font') return '#e8e2d4';
  if (id === 'crown-of-thorns-treasury') return '#7a5c2e';
  if (id === 'point-zero-marker') return '#8a8478';
  if (id === 'archaeological-crypt') return '#5a564c';
  if (id === 'nave-floor' || id === 'sanctuary-floor' || id === 'parvis-square') return '#b9b2a0';
  if (id === 'north-clerestory' || id === 'south-clerestory') return '#cfc4a8';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'towers', name: 'West towers', color: '#d8cfb8', description: 'The two 69 m west towers with their belfries, the 13 ton Emmanuel bourdon, and the 380 steps to the top.' },
  { id: 'facade', name: 'West facade', color: '#e3d9c2', description: 'The west front: three sculpted portals, the Gallery of Kings with its 28 statues, the 9.6 m rose window, and the Grand Gallery of chimeras.' },
  { id: 'nave', name: 'Nave', color: '#d9cfbb', description: 'The 12 m wide central vessel with its double aisles, rising 33 m to the rib vaults.' },
  { id: 'transept', name: 'Transept', color: '#d5ccb6', description: 'The shallow 48 m transept with its two great rose windows: 13.1 m to the north and 12.9 m to the south.' },
  { id: 'choir', name: 'Choir', color: '#d9cfbb', description: 'The 36 m choir with the high altar, the stalls, and the raised sanctuary.' },
  { id: 'apse', name: 'Chevet and apse', color: '#d5ccb6', description: 'The eastern chevet: outer wall, ambulatory, radiating chapels, and the half dome over the apse.' },
  { id: 'buttresses', name: 'Flying buttresses', color: '#c4bba4', description: 'The flying buttresses added in the late 13th century to stop the walls bowing outward, among the earliest of their kind.' },
  { id: 'fleche', name: 'Crossing spire', color: '#9aa39b', description: 'The 96 m crossing spire: Viollet-le-Duc\u2019s 1859 oak and lead fl\u00e8che, destroyed in 2019 and rebuilt identically by 2024.' },
  { id: 'roof', name: 'Roofs', color: '#8f9a94', description: 'The lead roofs and the Forest, the frame of more than 1,300 oak trees lost in the 2019 fire.' },
  { id: 'interior', name: 'Interior fittings', color: '#e8e0cd', description: 'Fittings of the interior: pulpit, pews, font, altars, treasury, and sacristy.' },
  { id: 'organ', name: 'Great organ', color: '#b08d57', description: 'The great organ: nearly 8,000 pipes, five keyboards, and 109 stops, 12 m tall above the west end of the nave.' },
  { id: 'parvis', name: 'Parvis and setting', color: '#b9b2a0', description: 'The square in front of the cathedral with France\u2019s Point Zero marker, the archaeological crypt, and the Charlemagne statue.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'northwest tower': 'The northwest tower of the west front, rising to the sourced 69 m. Exact stage divisions are schematic.',
  'southwest tower': 'The southwest tower of the west front, rising to the sourced 69 m. Exact stage divisions are schematic.',
  'north tower belfry': 'The belfry stage of the north tower with its tall paired openings. Exact opening shapes are schematic.',
  'south tower belfry': 'The belfry stage of the south tower with its tall paired openings. Exact opening shapes are schematic.',
  'tower stair turrets': 'Stair turrets on the tower corners; 380 steps climb to the top of the towers. Exact turret placement is schematic.',
  'emmanuel bell': 'Emmanuel, the 13 ton bourdon in the south tower, recast in 1681; its clapper alone weighs 500 kg. It is rung for great national occasions. Bell profile is schematic.',
  'north tower bells': 'The eight smaller bells of the north tower: Marie, Gabriel, Anne-Genevi\u00e8ve, Denis, Maurice, Jean-Marie, Beno\u00eet-Joseph, and \u00c9tienne. Bell profiles and positions are schematic.',
  'tower parapets': 'Crenellated parapets crowning the towers. Exact crenellation is schematic.',
  'portal of the virgin': 'The Portal of the Virgin on the north (left) side of the west front, sculpted between 1200 and 1240, dedicated to the life of the Virgin Mary. Exact recess depth is schematic.',
  'virgin portal tympanum': 'The sculpted tympanum over the Portal of the Virgin. Exact sculpture is schematic.',
  'portal of the last judgment': 'The central Portal of the Last Judgment, sculpted in the 1220s and 1230s, the last and tallest of the three west portals. Exact recess depth is schematic.',
  'last judgment tympanum': 'The tympanum of the Last Judgment portal, with Christ as the suffering savior of humanity. Exact sculpture is schematic.',
  'portal of saint anne': 'The Portal of Saint Anne on the south (right) side, the first of the three portals installed, around 1200. Exact recess depth is schematic.',
  'saint anne tympanum': 'The tympanum of the Saint Anne portal, recycled from a Romanesque church of about 1150 and adapted to fit the Gothic front. Exact sculpture is schematic.',
  'west facade wall': 'The west facade wall between the towers, 43 m wide, rising 43 m to the base of the towers. Exact wall articulation is schematic.',
  'gallery of kings': 'The Gallery of Kings: 28 statues of the kings of Judah and Israel. Revolutionaries mistook them for French kings and beheaded them; 21 heads were found in 1977 and are now at the Mus\u00e9e de Cluny. Individual statue poses are schematic.',
  'west rose window': 'The west rose window, 9.6 m across, the oldest of the three, from about 1225. Much of its 13th century glass survives. Tracery pattern is schematic.',
  'west rose tracery': 'The stone tracery of the west rose window. Exact pattern is schematic.',
  'rose window gallery': 'The small arcaded gallery beneath the west rose window. Exact arcade divisions are schematic.',
  'grand gallery': 'The Grand Gallery connecting the two towers at the level of the rose, an open colonnade. Exact column spacing is schematic.',
  'chimera figures': 'The chimeras of the Grand Gallery. They look medieval but are 19th century additions by Viollet-le-Duc, unlike the true medieval gargoyles that drain the gutters. Individual figures are schematic.',
  'west facade gables': 'Triangular gables crowning the three west portals. Exact profiles are schematic.',
  'north nave arcade': 'The north arcade of the 12 m wide nave, the great ground-floor arches. Bay count and spacing are schematic.',
  'south nave arcade': 'The south arcade of the 12 m wide nave, the great ground-floor arches. Bay count and spacing are schematic.',
  'north outer aisle piers': 'Piers of the north outer aisle; Notre-Dame has double aisles on each side of the nave. Exact pier positions are schematic.',
  'south outer aisle piers': 'Piers of the south outer aisle; Notre-Dame has double aisles on each side of the nave. Exact pier positions are schematic.',
  'nave floor': 'The nave floor slab. Exact paving is schematic.',
  'north triforium': 'The north triforium, the middle level of the nave elevation between arcade and clerestory. Exact openings are schematic.',
  'south triforium': 'The south triforium, the middle level of the nave elevation between arcade and clerestory. Exact openings are schematic.',
  'north clerestory': 'The north clerestory with its tall windows flooding the nave with light. Exact window divisions are schematic.',
  'south clerestory': 'The south clerestory with its tall windows flooding the nave with light. Exact window divisions are schematic.',
  'nave rib vaults': 'The rib-vaulted ceiling of the nave, 33 m above the floor; the ceiling was reconceived with rib vaults in 1220. Exact rib profiles are schematic.',
  'north aisle vaults': 'The vaults over the north double aisle, 10 m above the floor. Exact profiles are schematic.',
  'south aisle vaults': 'The vaults over the south double aisle, 10 m above the floor. Exact profiles are schematic.',
  'north transept arm': 'The north arm of the shallow transept, 48 m across and 14 m deep in total. Exact massing is schematic.',
  'south transept arm': 'The south arm of the shallow transept, 48 m across and 14 m deep in total. Exact massing is schematic.',
  'north transept portal': 'The portal on the north transept face, built under Jean de Chelles. Exact sculpture is schematic.',
  'south transept portal': 'The portal on the south transept face, built under Pierre de Montreuil. Exact sculpture is schematic.',
  'north rose window': 'The north rose window, 13.1 m across, the largest of the three, created around 1250 under Pierre de Montreuil. Tracery pattern is schematic.',
  'north rose tracery': 'The stone tracery of the north rose window. Exact pattern is schematic.',
  'south rose window': 'The south rose window, 12.9 m across, completed around 1260. Tracery pattern is schematic.',
  'south rose tracery': 'The stone tracery of the south rose window. Exact pattern is schematic.',
  'crossing piers': 'The four great piers at the crossing of nave and transept, carrying the spire. Exact positions are schematic.',
  'crossing vault': 'The vault over the crossing beneath the spire. Exact profile is schematic.',
  'north choir arcade': 'The north arcade of the 36 m long choir. Bay count and spacing are schematic.',
  'south choir arcade': 'The south arcade of the 36 m long choir. Bay count and spacing are schematic.',
  'choir outer piers': 'Piers of the choir aisles. Exact positions are schematic.',
  'choir rib vaults': 'The rib vaults over the choir at 33 m. Exact profiles are schematic.',
  'choir aisle vaults': 'The vaults over the choir aisles. Exact profiles are schematic.',
  'high altar': 'The high altar of the choir. Exact form is schematic.',
  'choir stalls': 'The choir stalls flanking the sanctuary. Exact stall count is schematic.',
  'sanctuary floor': 'The raised sanctuary floor at the east end of the choir. Exact extent is schematic.',
  'chevet outer wall': 'The curved outer wall of the eastern chevet. Exact radius and chapels are schematic.',
  'ambulatory vault': 'The ambulatory ringing the choir behind the apse. Exact layout is schematic.',
  'radiating chapels': 'Chapels radiating from the chevet around the ambulatory. Count and placement are schematic.',
  'apse semi-dome': 'The half dome over the apse. Exact profile is schematic.',
  'apse vault ribs': 'The ribs fanning over the apse from the choir vault. Exact geometry is schematic.',
  'chevet clerestory': 'The clerestory level of the chevet above the ambulatory. Exact window divisions are schematic.',
  'north flyer 1': 'A flying buttress on the north side of the nave. The flyers were added in the late 13th century, after the walls began bowing outward, and are among the earliest of their kind. Exact profile is schematic.',
  'north flyer 2': 'A flying buttress on the north side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'north flyer 3': 'A flying buttress on the north side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'north flyer 4': 'A flying buttress on the north side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'north flyer 5': 'A flying buttress on the north side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'north flyer 6': 'A flying buttress on the north side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'north flyer 7': 'A flying buttress on the north side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'south flyer 1': 'A flying buttress on the south side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'south flyer 2': 'A flying buttress on the south side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'south flyer 3': 'A flying buttress on the south side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'south flyer 4': 'A flying buttress on the south side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'south flyer 5': 'A flying buttress on the south side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'south flyer 6': 'A flying buttress on the south side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'south flyer 7': 'A flying buttress on the south side of the nave, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'north choir flyer 1': 'A flying buttress on the north side of the choir, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'north choir flyer 2': 'A flying buttress on the north side of the choir, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'north choir flyer 3': 'A flying buttress on the north side of the choir, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'north choir flyer 4': 'A flying buttress on the north side of the choir, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'south choir flyer 1': 'A flying buttress on the south side of the choir, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'south choir flyer 2': 'A flying buttress on the south side of the choir, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'south choir flyer 3': 'A flying buttress on the south side of the choir, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'south choir flyer 4': 'A flying buttress on the south side of the choir, added in the late 13th century when the walls bowed outward. Exact profile is schematic.',
  'spire base': 'The square base of the crossing spire above the crossing vault. Exact form is schematic.',
  'spire lower stage': 'The lower stage of the 96 m spire, an oak frame covered in lead. Stage divisions are schematic.',
  'spire upper stage': 'The upper stage of the 96 m spire tapering to the cross. Stage divisions are schematic.',
  'spire corner ribs': 'The corner ribs articulating the octagonal spire. Exact profiles are schematic.',
  'spire dormers': 'Small gabled dormers (lucarnes) piercing the spire. Count and placement are schematic.',
  'spire copper statues': 'The sixteen copper statues that ringed the spire, apostles and evangelists, removed for restoration just before the 2019 fire. Individual figures are schematic.',
  'spire cross': 'The cross crowning the 96 m spire. Exact form is schematic.',
  'golden rooster': 'The golden rooster weathervane by architect Philippe Villeneuve, placed on the rebuilt spire on 16 December 2023 as a symbol of rebirth. Exact form is schematic.',
  'nave lead roof': 'The lead-covered roof over the nave, 43 m at the ridge. Exact seam lines are schematic.',
  'choir lead roof': 'The lead-covered roof over the choir, 43 m at the ridge. Exact seam lines are schematic.',
  'transept roofs': 'The roofs over the transept arms. Exact profiles are schematic.',
  'the forest': 'The Forest: the roof frame of more than 1,300 oak trees, about 21 hectares of medieval timber, each beam from a single tree, destroyed in the 2019 fire. Shown as schematic trusses.',
  'pulpit': 'The pulpit of the nave. Exact form is schematic.',
  'pietà': 'The Piet\u00e0 by Nicolas Coustou behind the high altar. Exact sculpture is schematic.',
  'nave pews': 'The rows of pews filling the nave. Exact arrangement is schematic.',
  'crown of thorns treasury': 'The treasury holding the Crown of Thorns and relics of the True Cross, among the most important relics in Christendom. Exact case is schematic.',
  'baptismal font': 'The baptismal font. Exact form and placement are schematic.',
  'side chapel altars': 'Altars in the side chapels of the outer aisles. Exact count and forms are schematic.',
  'sacristy': 'The sacristy on the south side of the choir. Exact footprint is schematic.',
  'organ tribune': 'The stone tribune carrying the great organ, 16 m above the nave floor. Exact form is schematic.',
  'organ case': 'The carved wooden case of the great organ, 12 m tall. Exact case design is schematic.',
  'organ pipes': 'The nearly 8,000 pipes of the great organ, the longest 32 feet, the shortest half the length of a pencil. Arrangement is schematic.',
  'organ console': 'The console of the great organ with its five keyboards and pedalboard, 109 stops. Exact console is schematic.',
  'parvis square': 'The parvis, the great square in front of the west front. Exact extent is schematic.',
  'point zero marker': 'The Point Z\u00e9ro des routes de France, the small marker from which all road distances in France are measured. Exact marker design is schematic.',
  'archaeological crypt': 'The Archaeological Crypt of the \u00cele de la Cit\u00e9 beneath the parvis. Interior layout is schematic.',
  'charlemagne statue': 'The equestrian statue Charlemagne et ses Leudes on the parvis. Exact sculpture is schematic.',
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
const binName = 'notre-dame-de-paris-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the notre-dame-de-paris directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Notre-Dame de Paris (detailed schematic)',
  title: 'Notre-Dame de Paris',
  location: 'Paris, France',
  blurb: 'The great French Gothic cathedral on the \u00cele de la Cit\u00e9 in Paris, begun in 1163: twin 69 m west towers, three sculpted portals, the Gallery of Kings, flying buttresses, three rose windows, the great organ of nearly 8,000 pipes, and the 96 m crossing spire rebuilt after the fire of 15 April 2019.',
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
  chunks: [{ url: '/models/notre-dame-de-paris/notre-dame-de-paris-0.bin', bytes: offset }],
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
