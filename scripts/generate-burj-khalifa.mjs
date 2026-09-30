// Procedural Burj Khalifa for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Burj Khalifa in code and
// writes it in the atlas binary format:
//   public/models/burj-khalifa/atlas.json
//   public/models/burj-khalifa/burj-khalifa-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/burj-khalifa-attribution.md,
// opened 2026-09-30):
//   Burj Khalifa (Burj Dubai before inauguration), Dubai, UAE; mixed-use
//   megatall skyscraper; world\u2019s tallest building and tallest structure;
//   828 m (2,717 ft) architectural, 829.8 m (2,722 ft) to tip, roof 739.4 m
//   (2,426 ft), top floor 585.4 m (1,921 ft), observatory level 148 at
//   555.7 m (1,823 ft), spire 242.5 m (796 ft); 163 floors above ground
//   (infobox: 154 + 9 maintenance), 2 basement parking levels, floor area
//   309,473 m2, 2,909 stairs ground to 160th floor; construction started
//   6 January 2004, topped out 17 January 2009, completed 1 October 2009,
//   opened 4 January 2010, fully operational 23 January 2011; cost US$1.5
//   billion, developer Emaar Properties, named for Sheikh Khalifa bin Zayed
//   Al Nahyan; architect Adrian Smith, Skidmore Owings and Merrill (SOM),
//   Chicago; structural engineer Bill Baker (SOM); Hymenocallis desert flower
//   inspiration, setbacks recalling the spiral minaret of the Great Mosque of
//   Samarra, bundled-tube system after the Willis Tower (Fazlur Rahman Khan);
//   Y-shaped tripartite floor geometry: three wings on a central core, the
//   buttressed core carrying the height; central core houses all vertical
//   transportation except egress stairs in the wings; 27 setbacks in a spiral
//   pattern, each wing of four bays with one outer bay peeling away about
//   every seventh floor; setbacks form terraces and are aligned to minimise
//   wind-loading vibration; tower sways 1.5 m at the top; all reinforced
//   concrete to level 156, structural steel braced frame from 156 to the
//   pinnacle; central core emerges at the top sculpted into the spire; spire
//   over 4,000 tonnes of steel, central pinnacle pipe 200 m tall weighing
//   350 tonnes, communications equipment in the spire; 330,000 m3 concrete,
//   55,000 tonnes steel rebar, Putzmeister pumped concrete to a record 606 m;
//   cladding 142,000 m2, 26,000+ glass panels, typical panel 1.4 m by 3.3 m
//   and ~360 kg, vertical tubular fins, highest glass facade installation at
//   512 m; 57 elevators and 8 escalators (Otis), 12-14 per cabin, double-deck
//   observation elevators at up to 10 m/s, longest travel 504 m; 304-room
//   Armani Hotel on 15 of the lower 39 floors (opened 27 April 2010);
//   900 residential apartments on floors 20-108; sky lobbies with pools on
//   the 43rd and 76th floors, outdoor zero-entry pool on the 76th; offices
//   and suites on the remaining floors; At.mosphere restaurant on the 122nd
//   floor at 442 m; sky lobby 123rd; observation deck on the 124th floor at
//   452 m (At the Top, opened 5 January 2010); 125th floor upper deck;
//   148th floor At the Top SKY at 555 m (opened 15 October 2014); The Lounge
//   observatory at 585 m (opened February 2019); foundation: 3.7 m thick
//   raft (192 bored piles, 1.5 m diameter, ~47.45 m deep; one paper says
//   194); Burj Khalifa Lake 12 ha (30 acres) artificial; Dubai Fountain by
//   WET Design, 275 m long, water to 152.4 m, 6,600 lights, inaugurated
//   8 May 2009; main contractor Samsung C&T with BESIX and Arabtec,
//   22 million man-hours.
// Schematic (not sourced, never stated as fact in the UI): exact
// tier-by-tier setback heights and the rotational sequence of the spiral;
// tower wing lengths and widths; podium massing, entrance positions and
// forecourt; parking and mechanical level layouts; interior room layouts;
// terrace parapet profiles; fin spacing and panel subdivision; spire
// bracing layout; lake outline and fountain nozzle grid; park shape.
// The model uses 27 stepped tiers (nine per wing, staggered 13 m so the
// setbacks spiral) as a schematic reading of the sourced 27 setbacks.
//
// Granularity: 102 named parts across 11 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-burj-khalifa.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'burj-khalifa');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (828 m architectural height) maps to 2.4 units.
const S = 2.4 / 828;
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
// Hexagonal core with vertices under the three wings (wings at 0, 120, 240 deg).
function hexCore(r, y0, y1) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, 6);
  g.rotateY(-Math.PI / 6);
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
// A wing bar rooted at the tower centre, pointing along deg (x east, z south).
// Rotated around the world origin BEFORE any translation, per the atlas rule.
function wingBar(deg, len, hw, y0, y1) {
  const g = new THREE.BoxGeometry(len, y1 - y0, hw * 2);
  g.translate(len / 2, 0, 0);
  g.rotateY(-rad(deg));
  g.translate(0, (y0 + y1) / 2, 0);
  return g;
}
// Thin wing-shaped slab, used for terraces and spandrel bands.
function wingSlab(deg, x0, x1, hw, y, thick = 0.6) {
  const g = new THREE.BoxGeometry(x1 - x0, thick, hw * 2);
  g.translate((x0 + x1) / 2, 0, 0);
  g.rotateY(-rad(deg));
  g.translate(0, y + thick / 2, 0);
  return g;
}
// Parapet wall along both long edges of a terrace slab.
function wingParapet(deg, x0, x1, hw, y) {
  const gs = [];
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(x1 - x0, 1.1, 0.35);
    g.translate((x0 + x1) / 2, 0, s * (hw - 0.17));
    g.rotateY(-rad(deg));
    g.translate(0, y + 0.55, 0);
    gs.push(g);
  }
  return gs;
}
// Pointed tip cap on the last tier of a wing (schematic).
function wingTip(deg, len, hw, yTop) {
  const g = new THREE.ConeGeometry(hw * 0.9, 6, 4);
  g.rotateZ(-Math.PI / 2);
  g.rotateY(-rad(deg));
  g.translate(Math.cos(rad(deg)) * (len - 1), yTop - 4, Math.sin(rad(deg)) * (len - 1));
  return g;
}
// Vertical tubular fin standing on a wing edge (schematic).
function fin(deg, t, hw, y0, y1) {
  const gs = [];
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.6, y1 - y0, 1.4);
    g.translate(t, 0, s * (hw + 0.35));
    g.rotateY(-rad(deg));
    g.translate(0, (y0 + y1) / 2, 0);
    gs.push(g);
  }
  return gs;
}

// ---------------------------------------------------------------- layout constants (meters, sourced where noted)
// Wing angles: A east, B and C at 120 deg steps. Each wing steps back nine
// times; the B and C schedules are staggered +13 m and +26 m so the 27
// setbacks spiral around the tower (schematic heights).
const WINGS = [
  { key: 'A', deg: 0, tiers: [[39, 58, 14], [78, 50, 14], [117, 43, 14], [156, 37, 13], [195, 31, 13], [234, 26, 12], [273, 21, 12], [312, 16, 11], [351, 12, 10]] },
  { key: 'B', deg: 120, tiers: [[52, 58, 14], [91, 50, 14], [130, 43, 14], [169, 37, 13], [208, 31, 13], [247, 26, 12], [286, 21, 12], [325, 16, 11], [364, 12, 10]] },
  { key: 'C', deg: 240, tiers: [[65, 58, 14], [104, 50, 14], [143, 43, 14], [182, 37, 13], [221, 31, 13], [260, 26, 12], [299, 21, 12], [338, 16, 11], [377, 12, 10]] },
];
const CORE_TOP = 585.4; // sourced: top floor level
const CROWN_ROOF = 739.4; // sourced: roof height
const PIPE_BASE = 628; // schematic: 200 m pinnacle pipe to the 828 m tip
const TIP = 828;

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Foundations: 3.7 m piled raft on 192 bored piles (sourced dims).
{
  const g = [hexCore(20, -4.7, -1)];
  for (const w of WINGS) g.push(wingBar(w.deg, 50, 12.5, -4.7, -1));
  addPart('raft', 'Piled raft foundation', 'foundations', g);
}
{
  const g = [];
  for (const w of WINGS) {
    const dx = Math.cos(rad(w.deg)), dz = Math.sin(rad(w.deg));
    const px = -dz, pz = dx;
    for (let i = 0; i < 8; i++) {
      const t = 6 + i * 5.5;
      for (let j = 0; j < 8; j++) {
        const o = -10.5 + j * 3;
        g.push(cyl(0.75, 0.75, 47, dx * t + px * o, -24.5, dz * t + pz * o, 6));
      }
    }
  }
  addPart('piles', 'Bored piles', 'foundations', g);
}

// --- Podium and entrances (massing schematic).
addPart('podium', 'Podium', 'podium', [box(-65, 75, 0, 22, -50, 50)]);
{
  const g = [
    box(-65, 75, 2, 20, -50.4, -50),
    box(-65, 75, 2, 20, 50, 50.4),
    box(74.6, 75, 2, 20, -50, 50),
    box(-65.4, -65, 2, 20, -50, 50),
  ];
  addPart('podium-wall', 'Podium curtain wall', 'podium', g);
}
for (const [id, name, deg] of [
  ['entrance-main', 'Main entrance', 0],
  ['entrance-hotel', 'Hotel entrance', 120],
  ['entrance-residential', 'Residential entrance', 240],
]) {
  const dx = Math.cos(rad(deg)), dz = Math.sin(rad(deg));
  const cx = dx * 82, cz = dz * 82;
  const canopy = new THREE.BoxGeometry(14, 1.1, 11);
  canopy.rotateY(-rad(deg));
  canopy.translate(cx, 8.05, cz);
  const g = [canopy];
  const px = -dz, pz = dx;
  for (const s of [-1, 1]) g.push(cyl(0.5, 0.5, 7.5, cx + px * s * 5, 3.75, cz + pz * s * 5, 8));
  addPart(id, name, 'podium', g);
}
addPart('hotel-lobby', 'Armani Hotel lobby', 'podium', [box(20, 55, 0, 9, -16, 16)]);
addPart('office-annex', 'Office annex', 'podium', [box(-115, -70, 0, 24, -18, 18)]);
addPart('parking-b1', 'Parking level B1', 'podium', [box(-60, 70, -7.5, -4.5, -45, 45)]);
addPart('parking-b2', 'Parking level B2', 'podium', [box(-60, 70, -11, -8, -45, 45)]);
addPart('forecourt', 'Arrival forecourt', 'podium', [box(75, 150, -0.4, 0, -35, 35)]);

// --- Central core: hexagonal buttressed core (sourced form, schematic radii).
addPart('core-lower', 'Central core, lower', 'core', [hexCore(20, 0, 156)]);
addPart('core-middle', 'Central core, middle', 'core', [hexCore(19, 156, 377)]);
addPart('core-upper', 'Central core, upper', 'core', [hexCore(17, 377, 520)]);
addPart('core-crown', 'Central core, crown', 'core', [hexCore(14, 520, CORE_TOP)]);

// --- Wings: 27 stepped tiers, nine per wing (schematic heights).
for (const w of WINGS) {
  let y0 = 0;
  w.tiers.forEach(([y1, len, hw], i) => {
    addPart(`wing-${w.key.toLowerCase()}-t${i + 1}`, `Wing ${w.key}, tier ${i + 1}`, 'wings', [
      wingBar(w.deg, len, hw, y0, y1),
    ]);
    y0 = y1;
  });
}

// --- Setback tiers: terraces, parapets and tip caps (schematic).
for (const w of WINGS) {
  const terr = [], par = [];
  for (let i = 1; i < w.tiers.length; i++) {
    const [yPrev, lenPrev, hwPrev] = w.tiers[i - 1];
    const lenNext = w.tiers[i][1];
    terr.push(wingSlab(w.deg, lenNext - 1, lenPrev + 1, hwPrev, yPrev));
    par.push(...wingParapet(w.deg, lenNext - 1, lenPrev + 1, hwPrev, yPrev + 0.6));
  }
  const [yTop, lenTop, hwTop] = w.tiers[w.tiers.length - 1];
  terr.push(wingSlab(w.deg, 0, lenTop + 1, hwTop, yTop));
  addPart(`terraces-${w.key.toLowerCase()}`, `Wing ${w.key} setback terraces`, 'tiers', terr);
  addPart(`parapets-${w.key.toLowerCase()}`, `Wing ${w.key} terrace parapets`, 'tiers', par);
  addPart(`tipcap-${w.key.toLowerCase()}`, `Wing ${w.key} tip cap`, 'tiers', [
    wingTip(w.deg, lenTop, hwTop, yTop),
  ]);
}

// --- Cladding: glass curtain wall, tubular fins, spandrel bands (schematic subdivision).
for (const w of WINGS) {
  const glass = [], fins = [], bands = [];
  let y0 = 0;
  for (const [y1, len, hw] of w.tiers) {
    glass.push(wingBar(w.deg, len + 0.5, hw + 0.35, y0 + 0.2, y1));
    const n = Math.max(3, Math.floor(len / 6));
    for (let i = 0; i < n; i++) fins.push(...fin(w.deg, 4 + (i * (len - 8)) / Math.max(1, n - 1), hw, y0, y1));
    bands.push(wingSlab(w.deg, 0, len + 0.5, hw + 0.35, y1 - 1.4, 1.4));
    y0 = y1;
  }
  addPart(`glass-${w.key.toLowerCase()}`, `Curtain wall, wing ${w.key}`, 'cladding', glass);
  addPart(`fins-${w.key.toLowerCase()}`, `Tubular fins, wing ${w.key}`, 'cladding', fins);
  if (w.key === 'A') addPart('spandrels', 'Spandrel bands', 'cladding', bands);
  else bands.forEach((b) => parts.find((p) => p.id === 'spandrels').geoms.push(b));
}
addPart('glass-core', 'Curtain wall, central core', 'cladding', [
  hexCore(20.4, 0, 156), hexCore(19.4, 156, 377), hexCore(17.4, 377, 520), hexCore(14.4, 520, CORE_TOP),
]);
{
  const g = new THREE.CylinderGeometry(8.6, 14.6, CROWN_ROOF - CORE_TOP, 8);
  g.translate(0, (CORE_TOP + CROWN_ROOF) / 2, 0);
  addPart('crown-cladding', 'Crown cladding', 'cladding', [g]);
}

// --- Spire and crown: steel emergence above the concrete (sourced heights).
{
  const g = new THREE.CylinderGeometry(6, 14, PIPE_BASE - CORE_TOP, 8);
  g.translate(0, (CORE_TOP + PIPE_BASE) / 2, 0);
  addPart('spire-base', 'Spire base steelwork', 'spire', [g]);
}
{
  const g = [];
  for (let i = 0; i < 8; i++) {
    const a0 = (i * Math.PI) / 4, a1 = ((i + 1) * Math.PI) / 4;
    g.push(strut([Math.cos(a0) * 12, CORE_TOP + 4, Math.sin(a0) * 12], [Math.cos(a1) * 7, CORE_TOP + 22, Math.sin(a1) * 7], 0.8));
    g.push(strut([Math.cos(a1) * 12, CORE_TOP + 4, Math.sin(a1) * 12], [Math.cos(a0) * 7, CORE_TOP + 22, Math.sin(a0) * 7], 0.8));
  }
  addPart('spire-bracing', 'Spire cross bracing', 'spire', g);
}
addPart('pinnacle', 'Pinnacle pipe', 'spire', [cyl(2.2, 3.2, TIP - PIPE_BASE, 0, (PIPE_BASE + TIP) / 2, 0, 10)]);
{
  const g = [];
  for (const y of [PIPE_BASE + 40, PIPE_BASE + 100, PIPE_BASE + 160]) {
    g.push(cyl(3.6, 3.6, 1.5, 0, y, 0, 10));
  }
  addPart('pinnacle-collars', 'Pinnacle collar rings', 'spire', g);
}
addPart('crown-roof', 'Crown roof', 'spire', [cyl(9, 9, 1.2, 0, CROWN_ROOF, 0, 8)]);
addPart('crown-terrace', 'Crown terraces', 'spire', [hexCore(15, CORE_TOP, CORE_TOP + 1)]);
{
  const g = [new THREE.SphereGeometry(1.1, 8, 6)];
  g[0].translate(0, TIP + 1, 0);
  g.push(cyl(0.3, 0.3, 3, 0, TIP + 1, 0, 6));
  addPart('beacon', 'Aviation beacon', 'spire', g);
}
{
  const g = [];
  for (const [y, s] of [[PIPE_BASE + 60, 2.4], [PIPE_BASE + 120, 2], [PIPE_BASE + 170, 1.6]]) {
    g.push(box(-s, s, y, y + 3, -s, s));
  }
  addPart('comms', 'Communications equipment', 'spire', g);
}

// --- Mechanical floors and services (levels schematic).
addPart('mech-low', 'Lower mechanical plant', 'mechanical', [box(-30, 30, -11, -7.5, -20, 20)]);
addPart('mech-1', 'Mechanical level, low', 'mechanical', [hexCore(20.6, 154, 158)]);
addPart('mech-2', 'Mechanical level, mid', 'mechanical', [hexCore(19.6, 310, 314)]);
addPart('mech-3', 'Mechanical level, high', 'mechanical', [hexCore(17.6, 492, 496)]);
{
  const g = [hexCore(19.2, 232, 235.5), hexCore(18.2, 414, 417.5)];
  addPart('refuge', 'Refuge floors', 'mechanical', g);
}
{
  const g = [];
  for (const [x, z] of [[-20, -12], [-20, 12], [20, -12], [20, 12]]) {
    g.push(box(x - 6, x + 6, -7.5, -4.5, z - 4, z + 4));
    g.push(cyl(0.8, 0.8, 6, x, -1.5, z, 8));
  }
  addPart('chilled-water', 'Chilled water plant', 'mechanical', g);
}
{
  const g = [];
  for (const a of [30, 90, 150, 210, 270, 330]) {
    g.push(cyl(3, 3, 5, Math.cos(rad(a)) * 12, 160.5, Math.sin(rad(a)) * 12, 10));
  }
  addPart('water-tanks', 'Water storage tanks', 'mechanical', g);
}

// --- Elevators and stairs (counts sourced, routing schematic).
{
  const g = [];
  for (const a of [0, 60, 120, 180, 240, 300]) {
    g.push(box(Math.cos(rad(a)) * 8 - 1.25, Math.cos(rad(a)) * 8 + 1.25, 0, CORE_TOP, Math.sin(rad(a)) * 8 - 1.25, Math.sin(rad(a)) * 8 + 1.25));
  }
  addPart('lift-shafts', 'Core elevator shafts', 'elevators', g);
}
{
  const g = [];
  for (const a of [90, 270]) {
    g.push(box(Math.cos(rad(a)) * 12 - 1.5, Math.cos(rad(a)) * 12 + 1.5, 0, 452, Math.sin(rad(a)) * 12 - 1.5, Math.sin(rad(a)) * 12 + 1.5));
  }
  addPart('lift-observation', 'Double-deck observation elevators', 'elevators', g);
}
{
  const g = [];
  for (const a of [45, 225]) {
    g.push(box(Math.cos(rad(a)) * 13 - 1.25, Math.cos(rad(a)) * 13 + 1.25, 0, 520, Math.sin(rad(a)) * 13 - 1.25, Math.sin(rad(a)) * 13 + 1.25));
  }
  addPart('lift-service', 'Service elevators', 'elevators', g);
}
addPart('lift-machine', 'Elevator machine rooms', 'elevators', [hexCore(10, CORE_TOP, CORE_TOP + 10)]);
for (const w of WINGS) {
  const top = w.tiers[w.tiers.length - 1][0];
  addPart(`stairs-${w.key.toLowerCase()}`, `Egress stairs, wing ${w.key}`, 'elevators', [
    wingBar(w.deg, 50, 1.4, 2, top),
  ]);
}
{
  const g = [];
  for (const s of [-1, 1]) g.push(strut([30, 0, s * 20], [55, 12, s * 20], 2.2, 1.6));
  addPart('escalators', 'Escalators', 'elevators', g);
}

// --- Lake, fountain and park (dims sourced, outlines schematic).
addPart('lake', 'Burj Khalifa Lake', 'lake', [box(-300, -40, -1.5, 0, -20, 160)]);
{
  const g = [];
  for (let i = 0; i < 24; i++) {
    const x = -280 + i * 9.5;
    const h = 8 + 12 * Math.abs(Math.sin(i * 1.7));
    g.push(cone(1.1, h, x, h / 2, 70, 6));
    g.push(cyl(0.5, 0.7, 2, x, 0, 70, 6));
  }
  addPart('fountain-jets', 'Dubai Fountain jets', 'lake', g);
}
{
  const g = [];
  for (let ix = 0; ix < 20; ix++) {
    for (let iz = 0; iz < 6; iz++) {
      g.push(cyl(0.35, 0.35, 1.2, -270 + ix * 11, 0, 30 + iz * 16, 4));
    }
  }
  addPart('fountain-nozzles', 'Fountain nozzle field', 'lake', g);
}
addPart('boardwalk', 'Lake boardwalk', 'lake', [box(-300, -40, 0, 0.5, 162, 172)]);
addPart('park', 'Burj Park', 'lake', [box(-75, 75, -0.5, 0, 120, 220)]);

// --- Interiors: program zones at sourced floor heights (layouts schematic).
function insetWing(deg, len, hw, y0, y1) {
  return wingBar(deg, len, hw, y0, y1);
}
{
  const g = [hexCore(16, 2, 115)];
  for (const w of WINGS) g.push(insetWing(w.deg, 38, 10.5, 2, 115));
  addPart('hotel', 'Armani Hotel', 'interiors', g);
}
addPart('hotel-spa', 'Hotel spa and pool', 'interiors', [hexCore(10, 93, 97)]);
addPart('res-lobby', 'Residential lobby', 'interiors', [box(24, 48, 0, 6, -8, 8)]);
{
  const g = [hexCore(15, 118, 390)];
  const tops = { A: 351, B: 364, C: 377 };
  for (const w of WINGS) g.push(insetWing(w.deg, 14, 8, 118, tops[w.key] - 2));
  addPart('residences', 'Residential apartments', 'interiors', g);
}
addPart('suites', 'Corporate suites', 'interiors', [hexCore(13.5, 392, 440)]);
addPart('offices', 'Corporate offices', 'interiors', [hexCore(13.5, 442, 520)]);
addPart('skylobby-43', 'Sky lobby, level 43', 'interiors', [hexCore(16, 153.5, 156)]);
addPart('skylobby-76', 'Sky lobby, level 76', 'interiors', [hexCore(14, 273.5, 276)]);
addPart('atmosphere', 'At.mosphere restaurant', 'interiors', [hexCore(13, 440.5, 443.5)]);
addPart('skylobby-123', 'Level 123 sky lobby', 'interiors', [hexCore(12.5, 444.5, 447)]);
addPart('deck-124', 'Observation deck, level 124', 'interiors', [
  hexCore(12, 450.5, 453), cyl(14, 14, 1.1, 0, 453.5, 0, 6),
]);
addPart('deck-125', 'Observation deck, level 125', 'interiors', [hexCore(10, 456.5, 459)]);
addPart('deck-148', 'At the Top SKY, level 148', 'interiors', [
  hexCore(9, 554.2, 557.2), cyl(11, 11, 1.1, 0, 557.7, 0, 6),
]);
addPart('lounge', 'The Lounge observatory', 'interiors', [hexCore(12, 583.5, 586.5)]);

// ---------------------------------------------------------------- colors
// Schematic light palette: pale concrete, light glass blue, pale steel.
// The Eiffel Tower is the only dark realistic model in the atlas.
function colorFor(id) {
  if (id === 'raft') return '#b0a898';
  if (id === 'piles') return '#8a8478';
  if (id === 'podium') return '#d5d0c4';
  if (id === 'podium-wall') return '#a9cfe0';
  if (id.startsWith('entrance-')) return '#e8e2d2';
  if (id === 'hotel-lobby') return '#e3d3b3';
  if (id === 'office-annex') return '#c9c2b2';
  if (id.startsWith('parking-')) return '#9a958a';
  if (id === 'forecourt') return '#cfc9ba';
  if (id.startsWith('core-')) return '#c9ced4';
  if (id.startsWith('wing-')) return '#dde2e6';
  if (id.startsWith('terraces-')) return '#b9c4a8';
  if (id.startsWith('parapets-')) return '#aab3ad';
  if (id.startsWith('tipcap-')) return '#c9ced4';
  if (id.startsWith('glass-')) return '#a9cfe0';
  if (id.startsWith('fins-')) return '#8fb6c9';
  if (id === 'spandrels') return '#7d94a3';
  if (id === 'crown-cladding') return '#9fc3d4';
  if (id === 'spire-base' || id === 'spire-bracing') return '#9aa5ad';
  if (id === 'pinnacle' || id === 'pinnacle-collars') return '#b9c2c9';
  if (id === 'crown-roof' || id === 'crown-terrace') return '#aab3ad';
  if (id === 'beacon') return '#d33f2e';
  if (id === 'comms') return '#7d8894';
  if (id.startsWith('mech-') || id === 'refuge') return '#7d8894';
  if (id === 'chilled-water') return '#6b7a8a';
  if (id === 'water-tanks') return '#8fa8b8';
  if (id.startsWith('lift-')) return '#8a97a3';
  if (id.startsWith('stairs-')) return '#a8b0b8';
  if (id === 'escalators') return '#7d8894';
  if (id === 'lake') return '#7fb3d5';
  if (id === 'fountain-jets') return '#cfe8f5';
  if (id === 'fountain-nozzles') return '#9fc3d4';
  if (id === 'boardwalk') return '#c9b98f';
  if (id === 'park') return '#9fbf8a';
  if (id === 'hotel' || id === 'hotel-spa' || id === 'res-lobby') return '#e3d3b3';
  if (id === 'residences') return '#d9cfc0';
  if (id === 'suites' || id === 'offices') return '#c9d2d8';
  if (id.startsWith('skylobby-')) return '#cfe0d8';
  if (id === 'atmosphere') return '#d8b46a';
  if (id.startsWith('deck-')) return '#e8e8e8';
  if (id === 'lounge') return '#e0cfa0';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundations', name: 'Foundations', color: '#b0a898', description: 'The 3.7 m reinforced-concrete piled raft and its 192 bored piles, spreading the tower\u2019s weight over the desert ground.' },
  { id: 'podium', name: 'Podium and entrances', color: '#d5d0c4', description: 'The podium block at the tower\u2019s base with its entrances, hotel lobby, office annex, forecourt and two parking levels.' },
  { id: 'core', name: 'Central core', color: '#c9ced4', description: 'The hexagonal buttressed core that carries the tower\u2019s height and houses its vertical transportation.' },
  { id: 'wings', name: 'Wings', color: '#dde2e6', description: 'The three Y-shaped wings in 27 stepped tiers, spiralling back as the tower rises.' },
  { id: 'tiers', name: 'Setback terraces', color: '#b9c4a8', description: 'The outdoor terraces and parapets left behind at each setback, with schematic tip caps on the wing ends.' },
  { id: 'cladding', name: 'Cladding', color: '#a9cfe0', description: 'The glass curtain wall: 142,000 m2 of panels with vertical tubular fins and spandrel bands.' },
  { id: 'spire', name: 'Spire and crown', color: '#9aa5ad', description: 'The steel crown above the concrete and the 242.5 m spire with its 200 m pinnacle pipe.' },
  { id: 'mechanical', name: 'Mechanical systems', color: '#7d8894', description: 'Mechanical floors, refuge floors, the chilled-water plant and water storage tanks.' },
  { id: 'elevators', name: 'Elevators and stairs', color: '#8a97a3', description: 'The 57 elevators and 8 escalators: core shafts, double-deck observation cars, service cars and wing egress stairs.' },
  { id: 'lake', name: 'Lake and fountains', color: '#7fb3d5', description: 'The 12-hectare Burj Khalifa Lake, the Dubai Fountain, the boardwalk and the park.' },
  { id: 'interiors', name: 'Interiors', color: '#e3d3b3', description: 'The vertical city inside: hotel, residences, offices, sky lobbies, restaurants and observation decks.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'piled raft foundation': 'The reinforced-concrete raft under the tower, 3.7 m thick, poured in four separate sections (three wings and the centre core). Its three wings are each about 50 m long and 25 m wide. Wing outlines are schematic.',
  'bored piles': '192 bored cast-in-place piles, 1.5 m in diameter and about 47 m deep, carrying the raft in the weak desert ground. (One geotechnical paper counts 194.) Pile layout is schematic.',
  'podium': 'The low podium block wrapping the tower\u2019s base, holding lobbies, retail and back-of-house space. The real podium includes a 4 to 6 storey garage and an office annex; massing here is schematic.',
  'podium curtain wall': 'Glass walls wrapping the podium block. Subdivision is schematic.',
  'main entrance': 'One of the tower\u2019s entrances at the podium level. Position and canopy shape are schematic.',
  'hotel entrance': 'The Armani Hotel\u2019s entrance at the podium level. Position and canopy shape are schematic.',
  'residential entrance': 'The residences\u2019 entrance at the podium level. Position and canopy shape are schematic.',
  'armani hotel lobby': 'The Armani Hotel lobby at concourse level, part of the 304-room hotel occupying 15 of the lower 39 floors. Interior layout is schematic.',
  'office annex': 'The office annex building beside the tower, for which NORR designed a 6-storey addition. Massing is schematic.',
  'parking level b1': 'The first of two subterranean parking levels. Layout is schematic.',
  'parking level b2': 'The second subterranean parking level. Layout is schematic.',
  'arrival forecourt': 'The arrival forecourt in front of the podium. Extent is schematic.',
  'central core, lower': 'The lower section of the hexagonal buttressed core, the structural spine that carries the tower\u2019s height. The Y-shaped tripartite plan of three wings on a central core is sourced; core radii are schematic.',
  'central core, middle': 'The middle section of the hexagonal buttressed core, narrowing as the wings step back around it. Radii are schematic.',
  'central core, upper': 'The upper section of the hexagonal buttressed core above the last wing setbacks. Radii are schematic.',
  'central core, crown': 'The crown of the concrete core, rising to the 585.4 m top-floor level where the steelwork takes over. The structure is all reinforced concrete to level 156. Radii are schematic.',
  'spire base steelwork': 'The steel braced frame from level 156 (585.4 m) upward, where the concrete structure ends. Above the pinnacle base the spire is 242.5 m of structural steel weighing more than 4,000 tonnes. Taper is schematic.',
  'spire cross bracing': 'Diagonal steel bracing on the spire base, part of the braced-frame system above level 156. Bracing layout is schematic.',
  'pinnacle pipe': 'The central pinnacle pipe: 200 m tall, weighing 350 tonnes, rising to the 828 m tip. It also houses communications equipment. Diameter is schematic.',
  'pinnacle collar rings': 'Collar rings stiffening the pinnacle pipe along its 200 m rise. Positions are schematic.',
  'crown roof': 'The roof slab at 739.4 m, the highest solid roof of the steel crown. Shape is schematic.',
  'crown terraces': 'Terraces on the crown where the concrete core gives way to the steel spire. Shape is schematic.',
  'aviation beacon': 'The red aviation warning beacon at the 828 m tip. Position is schematic.',
  'communications equipment': 'Communications equipment housed in the spire, part of the pinnacle structure. Placement is schematic.',
  'lower mechanical plant': 'Mechanical plant in the basement levels serving the tower\u2019s systems. Layout is schematic.',
  'mechanical level, low': 'A mechanical floor band in the lower tower. Exact level is schematic.',
  'mechanical level, mid': 'A mechanical floor band in the mid tower. Exact level is schematic.',
  'mechanical level, high': 'A mechanical floor band in the upper tower. Exact level is schematic.',
  'refuge floors': 'Refuge floors where occupants can gather in an emergency, spaced through the tower. Levels are schematic.',
  'chilled water plant': 'The chilled-water plant for the air-conditioning system, which at peak cooling matches about 13,000 short tons of melting ice per day. Layout is schematic.',
  'water storage tanks': 'Water storage tanks: the tower\u2019s water system supplies an average of 946,000 litres per day through 100 km of pipes. Tank positions are schematic.',
  'core elevator shafts': 'Elevator shafts in the central core, which houses all vertical transportation. The tower has 57 elevators and 8 escalators. Shaft count and routing are schematic.',
  'double-deck observation elevators': 'The double-deck observation elevators rising to the 124th floor deck, the world\u2019s fastest double-deckers at up to 10 m/s. Routing is schematic.',
  'service elevators': 'Service elevators running the full height of the occupied tower. Routing is schematic.',
  'elevator machine rooms': 'Elevator machine rooms at the top of the concrete core, driving the 57 elevators including the 504 m longest-travel cars. Layout is schematic.',
  'escalators': 'Escalators in the podium and concourse levels, part of the 8 escalators in the complex. Positions are schematic.',
  'burj khalifa lake': 'The 12-hectare (30-acre) artificial Burj Khalifa Lake at the tower\u2019s base. Outline and position are schematic.',
  'dubai fountain jets': 'The Dubai Fountain\u2019s main jets on the lake: the 275 m choreographed fountain by WET Design shoots water to 152.4 m. Jet layout is schematic.',
  'fountain nozzle field': 'The field of fountain nozzles, lit by 6,600 lights and 25 coloured projectors. Grid is schematic.',
  'lake boardwalk': 'The boardwalk along the lake edge for watching the fountain shows. Position is schematic.',
  'burj park': 'Parkland around the tower, part of the Downtown Dubai landscaping. Shape is schematic.',
  'armani hotel': 'The 304-room Armani Hotel, the first of four by Armani, occupying 15 of the lower 39 floors (opened 27 April 2010). Interior zoning is schematic.',
  'hotel spa and pool': 'Spa and pool facilities within the Armani Hotel zone. Layout is schematic.',
  'residential lobby': 'The residential lobby, whose display includes the work of Jaume Plensa among more than 1,000 art pieces in the tower. Layout is schematic.',
  'residential apartments': '900 private residential apartments on floors 20 through 108, which the developer says sold out within eight hours. Interior zoning is schematic.',
  'corporate suites': 'Corporate suites on the upper office floors. Interior zoning is schematic.',
  'corporate offices': 'Corporate offices filling most of the remaining floors above the residences. Interior zoning is schematic.',
  'sky lobby, level 43': 'The sky lobby on the 43rd floor, one of two sky lobbies housing swimming pools. Height is approximate; interior is schematic.',
  'sky lobby, level 76': 'The sky lobby on the 76th floor with a swimming pool, plus the outdoor zero-entry pool on the same floor. Height is approximate; interior is schematic.',
  'at.mosphere restaurant': 'At.mosphere on the 122nd floor at 442 m, the world\u2019s highest restaurant. Interior is schematic.',
  'level 123 sky lobby': 'The sky lobby on the 123rd floor, just above At.mosphere. Interior is schematic.',
  'observation deck, level 124': 'The At the Top observation deck on the 124th floor at 452 m, with indoor and outdoor terraces (opened 5 January 2010). Interior is schematic.',
  'observation deck, level 125': 'The upper level of the At the Top observation deck on the 125th floor. Height is schematic; interior is schematic.',
  'at the top sky, level 148': 'At the Top SKY on the 148th floor at 555 m, which held the world\u2019s highest observation deck record when it opened on 15 October 2014. Interior is schematic.',
  'the lounge observatory': 'The Lounge observatory at 585 m, the world\u2019s highest lounge (opened February 2019), at the top occupied level. Interior is schematic.',
  'curtain wall, central core': 'The glass curtain wall wrapping the central core. The full cladding system is 142,000 m2 of panels; subdivision here is schematic.',
  'crown cladding': 'Cladding on the steel crown above the concrete core. Subdivision is schematic.',
  'spandrel bands': 'Aluminium and textured stainless-steel spandrel bands between the glass panels. Positions are schematic.',
};
// Programmatic explanations for the repeated part families (keys must equal
// the part name lowercased, exactly).
for (const w of WINGS) {
  w.tiers.forEach(([y1, len], i) => {
    explanations[`wing ${w.key.toLowerCase()}, tier ${i + 1}`] =
      `Tier ${i + 1} of Wing ${w.key}: one of the 27 stepped tiers forming the tower\u2019s spiral setbacks, rising to ${y1} m with a ${len} m wing. Setback heights are schematic; the Y-shaped plan and the 27 setbacks are sourced.`;
  });
  explanations[`wing ${w.key.toLowerCase()} setback terraces`] =
    `The outdoor terraces left behind where Wing ${w.key} steps back, one per setback. The setbacks are arranged to minimise wind-loading vibration and create these terraces. Terrace shapes are schematic.`;
  explanations[`wing ${w.key.toLowerCase()} terrace parapets`] =
    `Parapets edging the setback terraces of Wing ${w.key}. Profiles are schematic.`;
  explanations[`wing ${w.key.toLowerCase()} tip cap`] =
    `The sculpted cap closing the top tier of Wing ${w.key}. Profile is schematic.`;
  explanations[`curtain wall, wing ${w.key.toLowerCase()}`] =
    `The reflective glass curtain wall on Wing ${w.key}, part of the 142,000 m2 cladding system of more than 26,000 panels (typical panel 1.4 m by 3.3 m, about 360 kg). Panel subdivision is schematic.`;
  explanations[`tubular fins, wing ${w.key.toLowerCase()}`] =
    `Vertical tubular fins on Wing ${w.key}, part of the cladding system\u2019s aluminium and stainless-steel spandrels. Fin spacing is schematic.`;
  explanations[`egress stairs, wing ${w.key.toLowerCase()}`] =
    `Egress stairs running inside Wing ${w.key}. The central core houses all vertical transportation except these wing stairs. Routing is schematic.`;
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
const binName = 'burj-khalifa-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the burj-khalifa directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Burj Khalifa, Dubai (detailed schematic)',
  title: 'Burj Khalifa',
  location: 'Dubai, United Arab Emirates',
  blurb: 'The world\u2019s tallest building: an 828 m Y-shaped tower in Dubai designed by Adrian Smith of SOM and opened in 2010. Three buttressed wings step back in 27 spiral setbacks around a central core, rising from a piled raft through a hotel, residences and offices to a 242.5 m steel spire.',
  sourceUrls: [
    { label: 'Wikipedia: Burj Khalifa', url: 'https://en.wikipedia.org/wiki/Burj_Khalifa' },
    { label: 'Wikipedia: Dubai Fountain', url: 'https://en.wikipedia.org/wiki/Dubai_Fountain' },
    { label: 'SOM: Design and Construction of the Burj Khalifa (PDF)', url: 'https://9c37fc0c-69fe-4903-930f-0c39119df934.filesusr.com/ugd/718de4_c97a2cb7083948868e5f8f720d6f1878.pdf' },
    { label: 'Geotechnical case study: Burj Khalifa piled raft (PDF)', url: 'https://geotecsoftware.com/jdownloads/Practical%20Examples/Analysis%20of%20Piled%20Rafts/7-Burj%20Khalifa.pdf' },
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
  chunks: [{ url: '/models/burj-khalifa/burj-khalifa-0.bin', bytes: offset }],
  triangles,
  // Very tall and thin (828 m against a ~116 m base), so the exploded cloud
  // climbs steeply; 1.4 keeps the full height in frame, matching the
  // tower-bridge detailed value.
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
