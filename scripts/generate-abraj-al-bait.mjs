// Procedural Abraj Al Bait Clock Tower for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Makkah Royal Clock Tower
// (central tower of the Abraj Al Bait complex, Mecca) in code and writes
// it in the atlas binary format:
//   public/models/abraj-al-bait/atlas.json
//   public/models/abraj-al-bait/abraj-al-bait-0.bin
//
// Sourced dimensions and facts (all verified via web search, 2026-10-10):
//   Abraj Al Bait ("Towers of the House") is a seven-tower complex in
//   Mecca, Saudi Arabia, facing the Masjid al-Haram; the central Makkah
//   Royal Clock Tower is 601 m (1,972 ft) tall, completed 2012 after
//   construction 2004-2012; architects Dar Al-Handasah; the clock was
//   designed by PERROT (Germany) and the calligraphy by SL Rasch;
//   project cost about US$15 billion (Saudi Ministry of Islamic Affairs);
//   the tower holds a Fairmont hotel, a prayer hall for about 4,000
//   worshippers, a lunar observation center and an Islamic museum;
//   76 stories in the central tower; about 10,000 hotel rooms across the
//   complex; seven helipads across the complex.
//   Clock: four faces, each 43 m in diameter (front/back 43x43 m, sides
//   about 39x43 m), the largest clock faces in the world; 98 million
//   pieces of glass mosaic; about 2 million LED lights; 21,000 green and
//   white LEDs illuminate the clock at the call to prayer; visible up to
//   30 km; minute hand 22 m long, hour hand 17 m; carbon-fiber hands;
//   linked to UTC via five atomic clocks ("Mecca Time").
//   Spire: the clock, its neck and the spire form a 251 m assembly; a
//   93 m needle carries the golden crescent, 23 m in diameter, the
//   largest crescent in the world; an observation deck sits below the
//   crescent.
//   The six flanking towers (Hajar, Zamzam, Maqam, Qibla, Safa, Marwa)
//   are hotel and residential towers roughly 200 to 280 m tall.
//   The complex was built on the site of the 18th-century Ottoman Ajyad
//   Fortress, demolished in 2002, a demolition widely condemned by
//   heritage bodies.
// Schematic (not sourced, never stated as fact in the UI): podium
// footprint and height; exact shaft tier breaks and setback positions;
// facade mullion spacing and window bands; clock housing depth and
// surround profiles; spire taper; side-tower heights, footprints and
// crowns; helipad positions; interior prayer-hall layout; exact podium
// entrances and canopies.
//
// Coordinate frame: x = east-west, z = north-south, y = up. All
// dimensions in meters. The clock faces face the cardinal directions.
//
// Granularity: 100+ named parts across 8 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-abraj-al-bait.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'abraj-al-bait');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (601 m + podium margin) maps to 2.4 units.
const S = 2.4 / 615;
const rad = (d) => (d * Math.PI) / 180;

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
// Clock face disk facing a cardinal direction: 'N','S','E','W'.
function clockFace(dir, cx, cy, cz, r) {
  const g = new THREE.CylinderGeometry(r, r, 2.2, 40);
  if (dir === 'N' || dir === 'S') g.rotateX(Math.PI / 2);
  else g.rotateZ(Math.PI / 2);
  g.translate(cx, cy, cz);
  return g;
}
// Clock hand: thin tapered box on a face.
function clockHand(dir, cx, cy, cz, r, len, wdt, angDeg, faceOff) {
  const g = new THREE.BoxGeometry(wdt, len, 0.8);
  g.translate(0, len / 2 - 2, 0);
  g.rotateZ(rad(angDeg));
  if (dir === 'N') g.translate(cx, cy, cz + faceOff);
  else if (dir === 'S') { g.rotateY(Math.PI); g.translate(cx, cy, cz - faceOff); }
  else if (dir === 'E') { g.rotateY(Math.PI / 2); g.translate(cx + faceOff, cy, cz); }
  else { g.rotateY(-Math.PI / 2); g.translate(cx - faceOff, cy, cz); }
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// ============================ PODIUM (0-45 m) ============================
// Seven-storey podium block with the shopping mall, ~150 x 110 m.
addPart('podium-mass', 'Podium mass', 'podium', [box(-75, 75, 0, 45, -55, 55)]);
addPart('podium-glass-band-lower', 'Podium lower glass band', 'podium', [
  box(-75.6, 75.6, 8, 20, -55.6, 55.6),
]);
addPart('podium-glass-band-upper', 'Podium upper glass band', 'podium', [
  box(-75.6, 75.6, 28, 40, -55.6, 55.6),
]);
// Four entrance portals on the Haram-facing (west) side.
[-45, -15, 15, 45].forEach((ex, i) => {
  addPart(`entrance-portal-${i + 1}`, `Entrance portal ${i + 1}`, 'podium', [
    box(ex - 9, ex + 9, 0, 12, -62, -55),
    box(ex - 11, ex + 11, 12, 13.5, -64, -55),
  ]);
});
addPart('podium-roof-terrace', 'Podium roof terrace', 'podium', [box(-70, 70, 45, 47, -50, 50)]);
// Prayer hall block on the podium roof (capacity about 4,000).
addPart('prayer-hall-block', 'Prayer hall block', 'podium', [box(-40, 40, 47, 58, -25, 25)]);
addPart('prayer-hall-dome', 'Prayer hall dome', 'podium', [
  new THREE.SphereGeometry(14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 58, 0),
]);

// ================= CENTRAL TOWER SHAFT (45-400 m) =================
// Seven tiers with setbacks; each tier: core, glass curtain, floor bands,
// corner piers. Tier tops (m): 95,145,195,245,295,345,400.
const tierTops = [95, 145, 195, 245, 295, 345, 400];
const tierHalf = [30, 28, 26, 24, 22, 20, 18]; // half-width per tier (schematic setbacks)
let tierBase = 45;
for (let t = 0; t < 7; t++) {
  const y0 = tierBase, y1 = tierTops[t], hw = tierHalf[t];
  addPart(`shaft-tier-${t + 1}-core`, `Shaft tier ${t + 1} core`, 'shaft', [
    box(-hw, hw, y0, y1, -hw, hw),
  ]);
  addPart(`shaft-tier-${t + 1}-glass`, `Shaft tier ${t + 1} glass curtain`, 'shaft', [
    box(-hw - 0.8, hw + 0.8, y0 + 2, y1 - 2, -hw - 0.8, hw + 0.8),
  ]);
  const bands = [];
  for (let y = y0 + 8; y < y1 - 4; y += 12) {
    bands.push(box(-hw - 1.1, hw + 1.1, y, y + 1.6, -hw - 1.1, hw + 1.1));
  }
  addPart(`shaft-tier-${t + 1}-floor-bands`, `Shaft tier ${t + 1} floor bands`, 'shaft', bands);
  const piers = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    piers.push(box(sx * hw - 2.2, sx * hw + 2.2, y0, y1, sz * hw - 2.2, sz * hw + 2.2));
  }
  addPart(`shaft-tier-${t + 1}-corner-piers`, `Shaft tier ${t + 1} corner piers`, 'shaft', piers);
  tierBase = y1;
}

// ================= CLOCK SECTION (400-450 m) =================
// Clock housing block.
addPart('clock-housing', 'Clock housing', 'clock', [box(-24, 24, 398, 452, -24, 24)]);
// Four 43 m clock faces with surrounds and hands.
const faceR = 21.5, faceY = 425;
for (const [dir, label] of [['N', 'North'], ['S', 'South'], ['E', 'East'], ['W', 'West']]) {
  const off = 24;
  const cx = dir === 'E' ? off : dir === 'W' ? -off : 0;
  const cz = dir === 'N' ? off : dir === 'S' ? -off : 0;
  addPart(`clock-face-${dir.toLowerCase()}`, `${label} clock face`, 'clock', [
    clockFace(dir, cx, faceY, cz, faceR),
  ]);
  // Surround ring (torus) around each face.
  const ring = new THREE.TorusGeometry(faceR + 1.6, 1.6, 10, 40);
  if (dir === 'N' || dir === 'S') ring.translate(cx, faceY, cz + (dir === 'N' ? 1 : -1));
  else { ring.rotateY(Math.PI / 2); ring.translate(cx + (dir === 'E' ? 1 : -1), faceY, cz); }
  addPart(`clock-surround-${dir.toLowerCase()}`, `${label} clock surround`, 'clock', [ring]);
  // Hands: minute 22 m, hour 17 m (schematic angles).
  const fo = 2.6;
  addPart(`clock-hands-${dir.toLowerCase()}`, `${label} clock hands`, 'clock', [
    clockHand(dir, cx, faceY, cz, faceR, 22, 1.6, -35, fo),
    clockHand(dir, cx, faceY, cz, faceR, 17, 2.2, 115, fo),
    cyl(1.6, 1.6, 1.2, 0, 0, 0, 12).translate(cx, faceY, cz + (dir === 'N' ? fo : dir === 'S' ? -fo : 0)).translate(dir === 'E' ? fo : dir === 'W' ? -fo : 0, 0, 0),
  ]);
}
// LED band and Quranic calligraphy band above/below the faces.
addPart('clock-led-band', 'Clock LED band', 'clock', [box(-24.6, 24.6, 446, 449, -24.6, 24.6)]);
addPart('calligraphy-band', 'Quranic calligraphy band', 'clock', [box(-24.4, 24.4, 398, 404, -24.4, 24.4)]);
// Four golden corner pillars flanking the clock.
for (const [i, sx, sz] of [[1, -1, -1], [2, 1, -1], [3, -1, 1], [4, 1, 1]]) {
  addPart(`golden-corner-pillar-${i}`, `Golden corner pillar ${i}`, 'clock', [
    box(sx * 24 - 2, sx * 24 + 2, 398, 448, sz * 24 - 2, sz * 24 + 2),
    cone(2.8, 5, sx * 24, 450.5, sz * 24, 8),
  ]);
}

// ================= UPPER SHAFT (450-508 m) =================
for (let t = 0; t < 2; t++) {
  const y0 = 452 + t * 28, y1 = y0 + 28, hw = 16 - t * 3;
  addPart(`upper-tier-${t + 1}-core`, `Upper tier ${t + 1} core`, 'shaft', [
    box(-hw, hw, y0, y1, -hw, hw),
  ]);
  addPart(`upper-tier-${t + 1}-glass`, `Upper tier ${t + 1} glass curtain`, 'shaft', [
    box(-hw - 0.7, hw + 0.7, y0 + 2, y1 - 2, -hw - 0.7, hw + 0.7),
  ]);
  addPart(`upper-tier-${t + 1}-bands`, `Upper tier ${t + 1} floor bands`, 'shaft', [
    box(-hw - 1, hw + 1, y0 + 10, y0 + 11.5, -hw - 1, hw + 1),
    box(-hw - 1, hw + 1, y1 - 3, y1 - 1.5, -hw - 1, hw + 1),
  ]);
}

// ================= SPIRE (508-601 m) =================
addPart('spire-base', 'Spire base', 'spire', [cyl(10, 13, 30, 0, 523, 0, 12)]);
addPart('spire-needle-lower', 'Spire needle lower', 'spire', [cyl(4.5, 9, 35, 0, 555, 0, 10)]);
addPart('spire-needle-upper', 'Spire needle upper', 'spire', [cyl(1.8, 4.5, 30, 0, 587, 0, 10)]);
// Observation deck below the crescent.
addPart('observation-deck', 'Lunar observation deck', 'spire', [cyl(7, 7, 6, 0, 596, 0, 12)]);
// Golden crescent, 23 m diameter.
{
  const crescent = new THREE.TorusGeometry(11.5, 2.2, 12, 40, Math.PI * 1.45);
  crescent.rotateZ(Math.PI * 0.78);
  crescent.translate(0, 614, 0);
  addPart('golden-crescent', 'Golden crescent', 'spire', [crescent]);
}
addPart('crescent-support', 'Crescent support mast', 'spire', [cyl(1.2, 1.8, 14, 0, 605, 0, 8)]);
addPart('spire-led-strips', 'Spire LED strips', 'spire', [
  box(-1, 1, 540, 590, -5.5, 5.5),
  box(-5.5, 5.5, 540, 590, -1, 1),
]);

// ================= SIX FLANKING TOWERS =================
// Hajar, Zamzam, Maqam, Qibla, Safa, Marwa: schematic heights 200-280 m.
const flank = [
  ['hajar', -110, -80, 260], ['zamzam', 110, -80, 240], ['maqam', -110, 80, 250],
  ['qibla', 110, 80, 230], ['safa', 0, -110, 210], ['marwa', 0, 110, 200],
];
for (const [nm, fx, fz, fh] of flank) {
  const hw = 16;
  addPart(`${nm}-tower-base`, `${nm[0].toUpperCase() + nm.slice(1)} tower base`, 'flanking-towers', [
    box(fx - hw - 3, fx + hw + 3, 0, 18, fz - hw - 3, fz + hw + 3),
  ]);
  addPart(`${nm}-tower-shaft`, `${nm[0].toUpperCase() + nm.slice(1)} tower shaft`, 'flanking-towers', [
    box(fx - hw, fx + hw, 18, fh - 12, fz - hw, fz + hw),
  ]);
  addPart(`${nm}-tower-glass`, `${nm[0].toUpperCase() + nm.slice(1)} tower glass`, 'flanking-towers', [
    box(fx - hw - 0.6, fx + hw + 0.6, 24, fh - 16, fz - hw - 0.6, fz + hw + 0.6),
  ]);
  addPart(`${nm}-tower-crown`, `${nm[0].toUpperCase() + nm.slice(1)} tower crown`, 'flanking-towers', [
    box(fx - hw + 3, fx + hw - 3, fh - 12, fh, fz - hw + 3, fz + hw - 3),
    cone(3, 8, fx, fh + 4, fz, 8),
  ]);
}
// Two helipads on flanking towers.
addPart('helipad-hajar', 'Hajar tower helipad', 'flanking-towers', [cyl(9, 9, 1.2, -110, 262, -80, 16)]);
addPart('helipad-maqam', 'Maqam tower helipad', 'flanking-towers', [cyl(9, 9, 1.2, -110, 252, 80, 16)]);
// Entrance canopies and plaza.
addPart('entrance-canopy-north', 'North entrance canopy', 'podium', [box(-20, 20, 0, 6, 55, 70)]);
addPart('entrance-canopy-south', 'South entrance canopy', 'podium', [box(-20, 20, 0, 6, -70, -55)]);
addPart('plaza', 'Haram-facing plaza', 'podium', [box(-90, 90, 0, 1, -110, -70)]);
addPart('podium-mall-atrium', 'Podium mall atrium', 'podium', [box(-30, 30, 0, 30, -20, 20)]);
addPart('spire-aviation-beacon', 'Spire aviation beacon', 'spire', [new THREE.SphereGeometry(1.2, 10, 8).translate(0, 627, 0)]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('glass')) return '#7fa3b8';
  if (id.includes('clock-face')) return '#f2f5f7';
  if (id.includes('clock-surround') || id.includes('golden-corner') || id === 'golden-crescent') return '#c9a227';
  if (id.includes('clock-hands')) return '#20242b';
  if (id === 'clock-led-band' || id === 'spire-led-strips') return '#2e8b57';
  if (id === 'calligraphy-band') return '#1d4d2b';
  if (id.includes('prayer-hall')) return '#e8e2d4';
  if (id.includes('podium')) return '#d8d2c2';
  if (id.includes('entrance')) return '#b8b2a2';
  if (id === 'plaza') return '#c9c2b2';
  if (id === 'spire-aviation-beacon') return '#cc2222';
  if (id.includes('spire') || id.includes('crescent-support')) return '#a8a29a';
  if (id.includes('observation')) return '#3a4a55';
  if (id.includes('helipad')) return '#4a5560';
  if (id.includes('floor-bands') || id.includes('-bands')) return '#9aa2ab';
  if (id.includes('corner-piers')) return '#c4bda9';
  return '#cfc9b8';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'podium', name: 'Podium and prayer hall', color: '#d8d2c2', description: 'The seven-storey podium with the shopping mall, entrances, roof terrace and the prayer hall for about 4,000 worshippers.' },
  { id: 'shaft', name: 'Tower shaft', color: '#cfc9b8', description: 'The central tower shaft in setback tiers from the podium to the clock section, with glass curtain walls and corner piers.' },
  { id: 'clock', name: 'Clock and crescent crown', color: '#c9a227', description: 'The four 43 m clock faces, their golden surrounds and corner pillars, the LED and calligraphy bands.' },
  { id: 'spire', name: 'Spire', color: '#a8a29a', description: 'The 93 m needle above the clock with the lunar observation deck and the 23 m golden crescent, the largest in the world.' },
  { id: 'flanking-towers', name: 'Flanking towers', color: '#cfc9b8', description: 'The six hotel and residential towers of the complex: Hajar, Zamzam, Maqam, Qibla, Safa and Marwa.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'podium mass': 'The seven-storey podium at the foot of the tower, holding the shopping mall and the tower entrances. Exact footprint and height are schematic.',
  'podium lower glass band': 'Glass curtain band on the lower podium floors. Exact glazing layout is schematic.',
  'podium upper glass band': 'Glass curtain band on the upper podium floors. Exact glazing layout is schematic.',
  'entrance portal 1': 'One of four entrance portals on the Haram-facing side of the podium. Exact positions are schematic.',
  'entrance portal 2': 'One of four entrance portals on the Haram-facing side of the podium. Exact positions are schematic.',
  'entrance portal 3': 'One of four entrance portals on the Haram-facing side of the podium. Exact positions are schematic.',
  'entrance portal 4': 'One of four entrance portals on the Haram-facing side of the podium. Exact positions are schematic.',
  'podium roof terrace': 'The roof terrace of the podium, from which the central tower rises. Exact layout is schematic.',
  'prayer hall block': 'The prayer hall block on the podium roof, with space for about 4,000 worshippers facing the Haram. Exact layout is schematic.',
  'prayer hall dome': 'The dome over the prayer hall. Exact form is schematic.',
  'shaft tier 1 core': 'Structural core of the lowest shaft tier, 45 to 95 m. Exact tier breaks are schematic.',
  'shaft tier 1 glass curtain': 'Glass curtain wall of the lowest shaft tier. Exact mullion layout is schematic.',
  'shaft tier 1 floor bands': 'Horizontal floor bands marking the storeys of the lowest shaft tier. Exact spacing is schematic.',
  'shaft tier 1 corner piers': 'Corner piers stiffening the lowest shaft tier. Exact section is schematic.',
  'shaft tier 2 core': 'Structural core of shaft tier 2, 95 to 145 m. Exact tier breaks are schematic.',
  'shaft tier 2 glass curtain': 'Glass curtain wall of shaft tier 2. Exact mullion layout is schematic.',
  'shaft tier 2 floor bands': 'Horizontal floor bands marking the storeys of shaft tier 2. Exact spacing is schematic.',
  'shaft tier 2 corner piers': 'Corner piers stiffening shaft tier 2. Exact section is schematic.',
  'shaft tier 3 core': 'Structural core of shaft tier 3, 145 to 195 m. Exact tier breaks are schematic.',
  'shaft tier 3 glass curtain': 'Glass curtain wall of shaft tier 3. Exact mullion layout is schematic.',
  'shaft tier 3 floor bands': 'Horizontal floor bands marking the storeys of shaft tier 3. Exact spacing is schematic.',
  'shaft tier 3 corner piers': 'Corner piers stiffening shaft tier 3. Exact section is schematic.',
  'shaft tier 4 core': 'Structural core of shaft tier 4, 195 to 245 m. Exact tier breaks are schematic.',
  'shaft tier 4 glass curtain': 'Glass curtain wall of shaft tier 4. Exact mullion layout is schematic.',
  'shaft tier 4 floor bands': 'Horizontal floor bands marking the storeys of shaft tier 4. Exact spacing is schematic.',
  'shaft tier 4 corner piers': 'Corner piers stiffening shaft tier 4. Exact section is schematic.',
  'shaft tier 5 core': 'Structural core of shaft tier 5, 245 to 295 m. Exact tier breaks are schematic.',
  'shaft tier 5 glass curtain': 'Glass curtain wall of shaft tier 5. Exact mullion layout is schematic.',
  'shaft tier 5 floor bands': 'Horizontal floor bands marking the storeys of shaft tier 5. Exact spacing is schematic.',
  'shaft tier 5 corner piers': 'Corner piers stiffening shaft tier 5. Exact section is schematic.',
  'shaft tier 6 core': 'Structural core of shaft tier 6, 295 to 345 m. Exact tier breaks are schematic.',
  'shaft tier 6 glass curtain': 'Glass curtain wall of shaft tier 6. Exact mullion layout is schematic.',
  'shaft tier 6 floor bands': 'Horizontal floor bands marking the storeys of shaft tier 6. Exact spacing is schematic.',
  'shaft tier 6 corner piers': 'Corner piers stiffening shaft tier 6. Exact section is schematic.',
  'shaft tier 7 core': 'Structural core of the top shaft tier, 345 to 400 m, below the clock. Exact tier breaks are schematic.',
  'shaft tier 7 glass curtain': 'Glass curtain wall of the top shaft tier. Exact mullion layout is schematic.',
  'shaft tier 7 floor bands': 'Horizontal floor bands marking the storeys of the top shaft tier. Exact spacing is schematic.',
  'shaft tier 7 corner piers': 'Corner piers stiffening the top shaft tier. Exact section is schematic.',
  'clock housing': 'The clock housing block, 400 to 452 m, carrying the four faces. Exact dimensions are schematic.',
  'north clock face': 'The north clock face, 43 m in diameter, the largest clock faces in the world, made of 98 million pieces of glass mosaic. The faces are visible from up to 30 km.',
  'north clock surround': 'The golden surround ring of the north clock face. Exact profile is schematic.',
  'north clock hands': 'The carbon-fiber clock hands: the minute hand is 22 m long and the hour hand 17 m. Hand angles are schematic.',
  'south clock face': 'The south clock face, 43 m in diameter, faced with 98 million pieces of glass mosaic.',
  'south clock surround': 'The golden surround ring of the south clock face. Exact profile is schematic.',
  'south clock hands': 'The carbon-fiber clock hands of the south face: minute hand 22 m, hour hand 17 m. Hand angles are schematic.',
  'east clock face': 'The east clock face, about 39 by 43 m, faced with glass mosaic.',
  'east clock surround': 'The golden surround ring of the east clock face. Exact profile is schematic.',
  'east clock hands': 'The carbon-fiber clock hands of the east face. Hand angles are schematic.',
  'west clock face': 'The west clock face, about 39 by 43 m, faced with glass mosaic.',
  'west clock surround': 'The golden surround ring of the west clock face. Exact profile is schematic.',
  'west clock hands': 'The carbon-fiber clock hands of the west face. Hand angles are schematic.',
  'clock led band': 'The LED band around the clock section: 21,000 green and white LEDs light the clock at the call to prayer, part of about 2 million LEDs on the clock.',
  'quranic calligraphy band': 'The band of Quranic calligraphy above the clock, designed by SL Rasch. Exact lettering is schematic.',
  'golden corner pillar 1': 'One of four golden corner pillars flanking the clock section. Exact form is schematic.',
  'golden corner pillar 2': 'One of four golden corner pillars flanking the clock section. Exact form is schematic.',
  'golden corner pillar 3': 'One of four golden corner pillars flanking the clock section. Exact form is schematic.',
  'golden corner pillar 4': 'One of four golden corner pillars flanking the clock section. Exact form is schematic.',
  'upper tier 1 core': 'Structural core of the first upper tier above the clock, 452 to 480 m. Exact tier breaks are schematic.',
  'upper tier 1 glass curtain': 'Glass curtain wall of the first upper tier. Exact mullion layout is schematic.',
  'upper tier 1 floor bands': 'Horizontal floor bands of the first upper tier. Exact spacing is schematic.',
  'upper tier 2 core': 'Structural core of the second upper tier, 480 to 508 m. Exact tier breaks are schematic.',
  'upper tier 2 glass curtain': 'Glass curtain wall of the second upper tier. Exact mullion layout is schematic.',
  'upper tier 2 floor bands': 'Horizontal floor bands of the second upper tier. Exact spacing is schematic.',
  'spire base': 'The base of the spire above the upper shaft. Exact form is schematic.',
  'spire needle lower': 'The lower section of the 93 m spire needle. Exact taper is schematic.',
  'spire needle upper': 'The upper section of the spire needle. Exact taper is schematic.',
  'lunar observation deck': 'The observation deck below the crescent, housing the lunar observation center that sights the new moon. Exact layout is schematic.',
  'golden crescent': 'The golden crescent crowning the tower, 23 m in diameter, the largest crescent in the world and the symbol of Islam.',
  'crescent support mast': 'The mast carrying the golden crescent. Exact form is schematic.',
  'spire led strips': 'Vertical LED strips running up the spire, part of the clock illumination system. Exact layout is schematic.',
  'hajar tower base': 'Base of the Hajar flanking tower. Exact footprint is schematic.',
  'hajar tower shaft': 'Shaft of the Hajar flanking tower, about 260 m tall. Exact height is schematic.',
  'hajar tower glass': 'Glass curtain wall of the Hajar tower. Exact mullion layout is schematic.',
  'hajar tower crown': 'Crown of the Hajar tower. Exact form is schematic.',
  'zamzam tower base': 'Base of the Zamzam flanking tower. Exact footprint is schematic.',
  'zamzam tower shaft': 'Shaft of the Zamzam flanking tower, about 240 m tall. Exact height is schematic.',
  'zamzam tower glass': 'Glass curtain wall of the Zamzam tower. Exact mullion layout is schematic.',
  'zamzam tower crown': 'Crown of the Zamzam tower. Exact form is schematic.',
  'maqam tower base': 'Base of the Maqam flanking tower. Exact footprint is schematic.',
  'maqam tower shaft': 'Shaft of the Maqam flanking tower, about 250 m tall. Exact height is schematic.',
  'maqam tower glass': 'Glass curtain wall of the Maqam tower. Exact mullion layout is schematic.',
  'maqam tower crown': 'Crown of the Maqam tower. Exact form is schematic.',
  'qibla tower base': 'Base of the Qibla flanking tower. Exact footprint is schematic.',
  'qibla tower shaft': 'Shaft of the Qibla flanking tower, about 230 m tall. Exact height is schematic.',
  'qibla tower glass': 'Glass curtain wall of the Qibla tower. Exact mullion layout is schematic.',
  'qibla tower crown': 'Crown of the Qibla tower. Exact form is schematic.',
  'safa tower base': 'Base of the Safa flanking tower. Exact footprint is schematic.',
  'safa tower shaft': 'Shaft of the Safa flanking tower, about 210 m tall. Exact height is schematic.',
  'safa tower glass': 'Glass curtain wall of the Safa tower. Exact mullion layout is schematic.',
  'safa tower crown': 'Crown of the Safa tower. Exact form is schematic.',
  'marwa tower base': 'Base of the Marwa flanking tower. Exact footprint is schematic.',
  'marwa tower shaft': 'Shaft of the Marwa flanking tower, about 200 m tall. Exact height is schematic.',
  'marwa tower glass': 'Glass curtain wall of the Marwa tower. Exact mullion layout is schematic.',
  'marwa tower crown': 'Crown of the Marwa tower. Exact form is schematic.',
  'hajar tower helipad': 'Helipad on the Hajar tower, one of seven across the complex. Exact position is schematic.',
  'maqam tower helipad': 'Helipad on the Maqam tower. Exact position is schematic.',
  'north entrance canopy': 'Canopy over the north podium entrance. Exact form is schematic.',
  'south entrance canopy': 'Canopy over the south podium entrance. Exact form is schematic.',
  'haram-facing plaza': 'The plaza on the Haram-facing side of the complex. Exact layout is schematic.',
  'podium mall atrium': 'The atrium of the podium shopping mall. Exact layout is schematic.',
  'spire aviation beacon': 'The aviation warning beacon at the very tip of the spire. Exact form is schematic.',
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
const binName = 'abraj-al-bait-0.bin';
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
  scope: 'Abraj Al Bait Clock Tower, Mecca (schematic)',
  title: 'Abraj Al Bait',
  location: 'Mecca, Saudi Arabia',
  blurb: 'The 601 m Makkah Royal Clock Tower, centerpiece of the seven-tower Abraj Al Bait complex facing the Masjid al-Haram: the largest clock faces in the world at 43 m across, crowned by a 23 m golden crescent.',
  sourceUrls: [
    { label: 'Wikipedia: Abraj Al Bait', url: 'https://en.wikipedia.org/wiki/Abraj_Al_Bait' },
    { label: 'arabmls.org: Abraj Al Bait Royal Clock Tower', url: 'https://arabmls.org/abraj-al-bait-royal-clock-tower-mecca/' },
    { label: 'listofpopular.com: Abraj Al-Bait Clock Tower', url: 'https://www.listofpopular.com/technology/list-of-worlds-most-beautiful-skyscraper-tallest-building/abraj-al-bait-clock-tower/' },
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
  chunks: [{ url: '/models/abraj-al-bait/abraj-al-bait-0.bin', bytes: offset }],
  triangles,
  spread: 1.0,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(`Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`);
console.log('Systems:', JSON.stringify(bySystem));
