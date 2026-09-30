// Procedural Trump International Hotel and Tower, Chicago for the Architectural
// Atlas.
//
// Builds a schematic, correctly proportioned Trump Tower Chicago in code and
// writes it in the atlas binary format:
//   public/models/trump-tower-chicago/atlas.json
//   public/models/trump-tower-chicago/trump-tower-chicago-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/trump-tower-chicago-attribution.md,
// opened 2026-09-30):
//   1,389 ft (423 m) including the spire (older Wikipedia revision and
//   Urbanize; current Wikipedia gives 1,388 ft, a 1 ft rounding difference);
//   roof 1,171 ft (357 m); 98 floors; 2.6 million sq ft (240,000 m2) of floor
//   space; designed by Adrian Smith of Skidmore, Owings and Merrill;
//   structural engineer William F. Baker; built by Bovis Lend Lease;
//   construction 17 March 2005 to 2009, completed 2009, cost $847 million;
//   486 luxury residential condominiums and 339 hotel rooms; three setbacks
//   stepping the tower back to echo nearby buildings: first setback on the
//   east at the Wrigley Building height (130 m), second on the west at the
//   Marina City height (179 m / 587 ft), third on the east at the IBM Building
//   / 330 North Wabash height (212 m / 696 ft); setback floors 16, 29 and 51;
//   body raised 30 ft above the Wabash entrance and 70 ft above the Chicago
//   River; rounded edges combat vortex formation; each setback houses an
//   outrigger stability system of 5.3 m deep by 1.7 m wide concrete monoliths
//   linking perimeter columns to the central core; no tuned dampers needed;
//   program from the ground up: retail, parking garage, hotel, condominiums;
//   floors 3 to 12 lobbies, retail and garage; 14th floor health club and spa;
//   floors 17 to 27 hotel condominiums and executive lounges; floors 28 to 85
//   residential condominiums; floors 86 to 89 penthouses; 89th floor a single
//   14,500 sq ft residence with 20 ft ceilings; about 100,000 sq ft of retail;
//   about 1,000 parking spaces; 23,000 sq ft spa; Sixteen restaurant on the
//   16th floor; tallest reinforced concrete building in the world; about
//   180,000 cubic yards of concrete; up to 16,000 psi concrete in transition
//   floors and shear walls; mat on rock-socketed caissons (8 ft and 10 ft
//   diameter); 27 Kone elevators at 8 m/s (1,600 ft/min), among the fastest in
//   the US; Permasteelisa curtain wall of clear low-e glass; curved
//   wing-shaped polished stainless steel mullions projecting 9 in (23 cm);
//   brushed stainless steel spandrels; clear anodized aluminum; 11,000 glass
//   panels rated for 200 mph winds; lobby wave wall 35 ft (10.6 m) of
//   structural glass hung from the second floor; spire 69 m (226 ft) above the
//   roofline, three steel sections clad in fiberglass tapering 3 m to 1.2 m;
//   1.2-acre riverfront park and riverwalk on a 500 ft frontage, opened 2010;
//   stainless steel TRUMP sign, letters over 20 ft tall, installed June 2014.
// Schematic (not sourced, never stated as fact in the UI): all footprint
// dimensions and tier plan offsets; the mapping of setback floors to setback
// heights (sources give both but they do not reconcile cleanly); podium
// height; slab counts and spacing; core, column, caisson and outrigger sizes
// and positions; spire section divisions; facade panel and mullion rhythm;
// all interior layouts; riverwalk planting and dock layout; sign letterforms.
//
// Granularity: 106 named parts across 10 systems. Every explanation is either
// a sourced fact (see the research notes above) or explicitly marked
// schematic.
//
// Usage: node scripts/generate-trump-tower-chicago.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'trump-tower-chicago');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (1,389 ft = 423 m tip) maps to 2.4 units.
const S = 2.4 / 423;

// ---------------------------------------------------------------- helpers
// Rotate geometry BEFORE translating. Never call rotate on an already
// translated geometry (it spins around the world origin).
function box(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
function slab(x0, x1, y, z0, z1, t = 0.7) {
  return box(x0, x1, y, y + t, z0, z1);
}
function cyl(rt, rb, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function ball(r, x, y, z) {
  const g = new THREE.SphereGeometry(r, 10, 8);
  g.translate(x, y, z);
  return g;
}
function columns(xs, zs, y0, y1, r) {
  const g = [];
  for (const x of xs) for (const z of zs) g.push(cyl(r, r, y1 - y0, x, (y0 + y1) / 2, z, 10));
  return g;
}

// ---------------------------------------------------------------- layout (metres)
// x east, z south, y up. Sourced heights; all plan dimensions schematic.
// Setbacks: tier 2 cut on the east, tier 3 cut on the west, crown cut on the
// east, matching the sourced setback sides.
const T1 = 130, T2 = 179, T3 = 212, ROOF = 357, TIP = 423;
const POD_TOP = 44;

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Podium: retail, lobbies and parking base (schematic plan, sourced program).
addPart('podium-mass', 'Podium mass', 'podium', [
  box(-36, 36, 0, POD_TOP, -28, 28),
]);
{
  const g = [
    box(36, 36.6, 2, 14, -28, 28),
    box(-36.6, -36, 2, 14, -28, 28),
    box(-36, 36, 2, 14, -28.6, -28),
    box(-36, 36, 2, 14, 28, 28.6),
  ];
  addPart('podium-retail-glass', 'Podium retail glass', 'podium', g);
}
{
  const g = [];
  for (const y of [20, 28, 36]) g.push(box(-34, 34, y, y + 0.8, -26, 26));
  addPart('podium-garage-decks', 'Podium garage decks', 'podium', g);
}
addPart('podium-lobby', 'Podium lobby', 'podium', [
  box(-24, 24, 0, 16, -12, 12),
]);
{
  // 35 ft (10.6 m) structural glass wave wall, hung from the second floor:
  // angled fin panels in a shallow wave.
  const g = [];
  for (let i = 0; i < 10; i++) {
    const p = box(-1.95, 1.95, 0, 10.6, -0.12, 0.12);
    p.rotateY(i % 2 ? 0.14 : -0.14);
    p.translate(-18 + i * 4, 5.3, -12);
    g.push(p);
  }
  addPart('lobby-wave-wall', 'Lobby wave wall', 'podium', g);
}
{
  const g = [
    box(36, 44, 7, 10, -9, 9),
    box(36, 37.2, 0, 10, -9, -7.8),
    box(36, 37.2, 0, 10, 7.8, 9),
  ];
  addPart('wabash-entrance', 'Wabash entrance', 'podium', g);
}
addPart('podium-river-terrace', 'Podium river terrace', 'podium', [
  box(-54, -36, 0, 1, -22, 22),
]);
addPart('podium-roof-terrace', 'Podium roof terrace', 'podium', [
  box(-36, 36, POD_TOP, POD_TOP + 0.8, -28, 28),
]);
addPart('podium-cornice', 'Podium cornice', 'podium', [
  box(-36.8, 36.8, 42, POD_TOP, -28.8, 28.8),
]);
{
  // Garage ramps between decks: thin slabs rotated about z, then translated.
  const g = [];
  for (const [y0, zc] of [[20.4, 10], [28.4, -10]]) {
    const r = new THREE.BoxGeometry(60.5, 0.6, 8);
    r.rotateZ(Math.atan2(8, 60));
    r.translate(0, y0 + 4, zc);
    g.push(r);
  }
  addPart('garage-ramps', 'Garage ramps', 'podium', g);
}
addPart('service-dock', 'Service dock', 'podium', [
  box(-10, 10, 0, 8, 28, 36),
]);
addPart('retail-mezzanine', 'Retail mezzanine', 'podium', [
  box(-30, 30, 14, 14.8, -24, 24),
]);

// --- Tier 1: podium top to the 130 m Wrigley-height setback (east side steps).
addPart('tier1-mass', 'Tier 1 mass', 'tier-1', [
  box(-32, 32, POD_TOP, T1, -24, 24),
]);
{
  const g = [];
  for (const y of [52, 60, 68, 76]) g.push(slab(-31, 31, y, -23, 23));
  addPart('tier1-lower-slabs', 'Tier 1 lower slabs', 'tier-1', g);
}
{
  const g = [];
  for (const y of [88, 96, 104, 112, 120, 128]) g.push(slab(-31, 31, y, -23, 23));
  addPart('tier1-upper-slabs', 'Tier 1 upper slabs', 'tier-1', g);
}
addPart('tier1-core', 'Tier 1 core', 'tier-1', [
  box(-10, 10, POD_TOP, T1, -8, 8),
]);
addPart('tier1-perimeter-columns', 'Tier 1 perimeter columns', 'tier-1',
  columns([-30, -15, 0, 15, 30], [-22, 22], POD_TOP, T1, 0.8));
addPart('tier1-outrigger-level', 'Tier 1 outrigger level', 'tier-1', [
  box(-30, 30, 124, T1, -0.85, 0.85),
  box(-0.85, 0.85, 124, T1, -22, 22),
]);
addPart('tier1-setback-terrace', 'Tier 1 setback terrace', 'tier-1', [
  box(20, 32, T1, T1 + 1, -24, 24),
]);
{
  const g = [
    box(-32, 32, 129, 130.5, -24, -23.4),
    box(-32, 32, 129, 130.5, 23.4, 24),
    box(-32, -31.4, 129, 130.5, -24, 24),
    box(31.4, 32, 129, 130.5, -24, 24),
  ];
  addPart('tier1-edge-beams', 'Tier 1 edge beams', 'tier-1', g);
}
addPart('tier1-mechanical-band', 'Tier 1 mechanical band', 'tier-1', [
  box(-32.6, 32.6, 80, 84, -24.6, 24.6),
]);
{
  const g = [
    box(20, 32, T1 + 1, T1 + 2.4, -24, -23.4),
    box(20, 32, T1 + 1, T1 + 2.4, 23.4, 24),
    box(31.4, 32, T1 + 1, T1 + 2.4, -24, 24),
  ];
  addPart('tier1-parapet', 'Tier 1 parapet', 'tier-1', g);
}

// --- Tier 2: 130 m to the 179 m Marina City-height setback (west side steps).
addPart('tier2-mass', 'Tier 2 mass', 'tier-2', [
  box(-32, 20, T1, T2, -24, 24),
]);
{
  const g = [];
  for (const y of [136, 143, 150, 157, 164, 171, 178]) g.push(slab(-31, 19, y, -23, 23));
  addPart('tier2-slabs', 'Tier 2 slabs', 'tier-2', g);
}
addPart('tier2-core', 'Tier 2 core', 'tier-2', [
  box(-10, 10, T1, T2, -8, 8),
]);
addPart('tier2-perimeter-columns', 'Tier 2 perimeter columns', 'tier-2',
  columns([-30, -15, 0, 15], [-22, 22], T1, T2, 0.75));
addPart('tier2-outrigger-level', 'Tier 2 outrigger level', 'tier-2', [
  box(-30, 18, 173, T2, -0.85, 0.85),
  box(-0.85, 0.85, 173, T2, -22, 22),
]);
addPart('tier2-setback-terrace', 'Tier 2 setback terrace', 'tier-2', [
  box(-32, -20, T2, T2 + 1, -24, 24),
]);
{
  const g = [
    box(-32, 20, 178, 179.5, -24, -23.4),
    box(-32, 20, 178, 179.5, 23.4, 24),
    box(-32, -31.4, 178, 179.5, -24, 24),
    box(19.4, 20, 178, 179.5, -24, 24),
  ];
  addPart('tier2-edge-beams', 'Tier 2 edge beams', 'tier-2', g);
}
addPart('tier2-mechanical-band', 'Tier 2 mechanical band', 'tier-2', [
  box(-32.6, 20.6, 150, 154, -24.6, 24.6),
]);
{
  const g = [
    box(-32, -20, T2 + 1, T2 + 2.4, -24, -23.4),
    box(-32, -20, T2 + 1, T2 + 2.4, 23.4, 24),
    box(-32, -31.4, T2 + 1, T2 + 2.4, -24, 24),
  ];
  addPart('tier2-parapet', 'Tier 2 parapet', 'tier-2', g);
}

// --- Tier 3: 179 m to the 212 m IBM-height setback (east side steps).
addPart('tier3-mass', 'Tier 3 mass', 'tier-3', [
  box(-20, 20, T2, T3, -24, 24),
]);
{
  const g = [];
  for (const y of [186, 193, 200, 207]) g.push(slab(-19, 19, y, -23, 23));
  addPart('tier3-slabs', 'Tier 3 slabs', 'tier-3', g);
}
addPart('tier3-core', 'Tier 3 core', 'tier-3', [
  box(-9, 9, T2, T3, -7, 7),
]);
addPart('tier3-perimeter-columns', 'Tier 3 perimeter columns', 'tier-3',
  columns([-18, -6, 6, 18], [-22, 22], T2, T3, 0.7));
addPart('tier3-outrigger-level', 'Tier 3 outrigger level', 'tier-3', [
  box(-18, 18, 206, T3, -0.85, 0.85),
  box(-0.85, 0.85, 206, T3, -22, 22),
]);
addPart('tier3-setback-terrace', 'Tier 3 setback terrace', 'tier-3', [
  box(8, 20, T3, T3 + 1, -24, 24),
]);
{
  const g = [
    box(-20, 20, 211, 212.5, -24, -23.4),
    box(-20, 20, 211, 212.5, 23.4, 24),
    box(-20, -19.4, 211, 212.5, -24, 24),
    box(19.4, 20, 211, 212.5, -24, 24),
  ];
  addPart('tier3-edge-beams', 'Tier 3 edge beams', 'tier-3', g);
}
addPart('tier3-mechanical-band', 'Tier 3 mechanical band', 'tier-3', [
  box(-20.6, 20.6, 192, 196, -24.6, 24.6),
]);
{
  const g = [
    box(8, 20, T3 + 1, T3 + 2.4, -24, -23.4),
    box(8, 20, T3 + 1, T3 + 2.4, 23.4, 24),
    box(19.4, 20, T3 + 1, T3 + 2.4, -24, 24),
  ];
  addPart('tier3-parapet', 'Tier 3 parapet', 'tier-3', g);
}

// --- Crown: 212 m to the 1,171 ft roof, penthouse and spire.
addPart('crown-mass', 'Crown mass', 'crown', [
  box(-20, 8, T3, ROOF, -24, 24),
]);
{
  const g = [];
  for (let y = 220; y <= 300; y += 8) g.push(slab(-19, 7, y, -23, 23));
  addPart('crown-lower-slabs', 'Crown lower slabs', 'crown', g);
}
{
  const g = [];
  for (const y of [308, 316, 324, 332, 340, 348, 356]) g.push(slab(-19, 7, y, -23, 23));
  addPart('crown-upper-slabs', 'Crown upper slabs', 'crown', g);
}
addPart('crown-core', 'Crown core', 'crown', [
  box(-9, 9, T3, ROOF, -7, 7),
]);
addPart('crown-perimeter-columns', 'Crown perimeter columns', 'crown',
  columns([-18, -6, 6], [-22, 22], T3, ROOF, 0.65));
addPart('roof-slab', 'Roof slab', 'crown', [
  box(-20, 8, ROOF, ROOF + 2, -24, 24),
]);
addPart('mechanical-penthouse', 'Mechanical penthouse', 'crown', [
  box(-14, 2, ROOF + 2, ROOF + 11, -16, 16),
]);
{
  const g = [
    box(-14.4, -14, ROOF + 3, ROOF + 10, -16, 16),
    box(2, 2.4, ROOF + 3, ROOF + 10, -16, 16),
    box(-14, 2, ROOF + 3, ROOF + 10, -16.4, -16),
    box(-14, 2, ROOF + 3, ROOF + 10, 16, 16.4),
  ];
  addPart('penthouse-louvers', 'Penthouse louvers', 'crown', g);
}
// Spire: three tapering sections of steel clad in fiberglass, about 69 m
// (226 ft) above the roofline, reaching the 1,389 ft tip.
addPart('spire-base', 'Spire base section', 'crown', [
  cyl(1.2, 1.5, 26, -6, ROOF + 13, 0, 10),
]);
addPart('spire-mid', 'Spire middle section', 'crown', [
  cyl(0.9, 1.2, 20, -6, ROOF + 36, 0, 10),
]);
addPart('spire-tip', 'Spire tip section', 'crown', [
  cyl(0.35, 0.9, 20, -6, ROOF + 56, 0, 10),
]);
addPart('spire-beacon', 'Spire aviation beacon', 'crown', [
  ball(0.5, -6, TIP + 0.4, 0),
]);

// --- Facade: Permasteelisa curtain wall per tier (glass, mullions, spandrels).
// Sourced: clear low-e glass, wing-shaped polished stainless mullions
// projecting 9 in, brushed stainless spandrels, clear anodized aluminum,
// 11,000 panels rated for 200 mph winds, rounded edges against vortexes.
// Panel and mullion rhythm is schematic.
function glassShell(x0, x1, y0, y1, z0, z1, p = 0.35) {
  return [
    box(x1, x1 + p, y0, y1, z0, z1),
    box(x0 - p, x0, y0, y1, z0, z1),
    box(x0, x1, y0, y1, z0 - p, z0),
    box(x0, x1, y0, y1, z1, z1 + p),
  ];
}
function mullionFins(x0, x1, y0, y1, z0, z1, p = 0.9, step = 4) {
  const g = [];
  for (let x = x0; x <= x1 + 0.01; x += step) {
    g.push(box(x - 0.25, x + 0.25, y0, y1, z1, z1 + p));
    g.push(box(x - 0.25, x + 0.25, y0, y1, z0 - p, z0));
  }
  for (let z = z0; z <= z1 + 0.01; z += step) {
    g.push(box(x1, x1 + p, y0, y1, z - 0.25, z + 0.25));
    g.push(box(x0 - p, x0, y0, y1, z - 0.25, z + 0.25));
  }
  return g;
}
function cornerFins(xs, zs, y0, y1) {
  const g = [];
  for (const x of xs) for (const z of zs) g.push(cyl(1, 1, y1 - y0, x, (y0 + y1) / 2, z, 10));
  return g;
}
addPart('tier1-glass', 'Tier 1 glass envelope', 'facade', glassShell(-32, 32, POD_TOP, T1, -24, 24));
addPart('tier1-mullions', 'Tier 1 mullion fins', 'facade', mullionFins(-32, 32, POD_TOP, T1, -24, 24));
addPart('tier1-spandrels', 'Tier 1 spandrel band', 'facade', [
  box(-32.4, 32.4, 126, T1, -24.4, 24.4),
]);
addPart('tier1-corner-fins', 'Tier 1 corner fins', 'facade', cornerFins([-32, 32], [-24, 24], POD_TOP, T1));
addPart('tier2-glass', 'Tier 2 glass envelope', 'facade', glassShell(-32, 20, T1, T2, -24, 24));
addPart('tier2-mullions', 'Tier 2 mullion fins', 'facade', mullionFins(-32, 20, T1, T2, -24, 24));
addPart('tier2-spandrels', 'Tier 2 spandrel band', 'facade', [
  box(-32.4, 20.4, 175, T2, -24.4, 24.4),
]);
addPart('tier2-corner-fins', 'Tier 2 corner fins', 'facade', cornerFins([-32, 20], [-24, 24], T1, T2));
addPart('tier3-glass', 'Tier 3 glass envelope', 'facade', glassShell(-20, 20, T2, T3, -24, 24));
addPart('tier3-mullions', 'Tier 3 mullion fins', 'facade', mullionFins(-20, 20, T2, T3, -24, 24));
addPart('tier3-spandrels', 'Tier 3 spandrel band', 'facade', [
  box(-20.4, 20.4, 208, T3, -24.4, 24.4),
]);
addPart('tier3-corner-fins', 'Tier 3 corner fins', 'facade', cornerFins([-20, 20], [-24, 24], T2, T3));
addPart('crown-glass', 'Crown glass envelope', 'facade', glassShell(-20, 8, T3, ROOF, -24, 24));
addPart('crown-mullions', 'Crown mullion fins', 'facade', mullionFins(-20, 8, T3, ROOF, -24, 24));
addPart('crown-spandrels', 'Crown spandrel band', 'facade', [
  box(-20.4, 8.4, 353, ROOF, -24.4, 24.4),
]);
addPart('crown-corner-fins', 'Crown corner fins', 'facade', cornerFins([-20, 8], [-24, 24], T3, ROOF));

// --- Hotel: floors 17 to 27, 339 rooms (sourced program, schematic layout).
{
  const g = [];
  for (let i = 0; i <= 10; i++) g.push(slab(-30, 30, 62 + i * 3.64, -22, 22, 0.6));
  addPart('hotel-floor-plates', 'Hotel floor plates', 'hotel', g);
}
{
  const g = [];
  for (const y0 of [66, 84]) {
    for (let i = 0; i < 10; i++) {
      g.push(box(-30 + i * 6, -30 + i * 6 + 5.4, y0, y0 + 3, 4, 20));
      g.push(box(-30 + i * 6, -30 + i * 6 + 5.4, y0, y0 + 3, -20, -4));
    }
  }
  addPart('hotel-guestroom-modules', 'Hotel guestroom modules', 'hotel', g);
}
addPart('hotel-corridor-spine', 'Hotel corridor spine', 'hotel', [
  box(-30, 30, 62, 99, -2, 2),
]);
addPart('hotel-sky-lobby', 'Hotel sky lobby', 'hotel', [
  box(-20, 20, 62, 70, -14, 14),
]);
addPart('sixteen-restaurant', 'Sixteen restaurant', 'hotel', [
  box(-32, 32, 56, 62, -24, 24),
]);
addPart('hotel-executive-lounge', 'Hotel executive lounge', 'hotel', [
  box(-24, 24, 94, 99, -16, 16),
]);
addPart('hotel-elevator-bank', 'Hotel elevator bank', 'hotel', [
  box(12, 15, 0, 99, 8, 11),
  box(16, 19, 0, 99, 8, 11),
  box(12, 15, 0, 99, -11, -8),
  box(16, 19, 0, 99, -11, -8),
]);
addPart('hotel-service-core', 'Hotel service core', 'hotel', [
  box(-32, -28, 62, 99, -8, 8),
]);

// --- Residential: floors 28 to 85 condominiums, 86 to 89 penthouses.
{
  const g = [];
  for (let y = 103; y <= 352; y += 3.64) {
    const xr = y < T1 ? [-31, 31] : y < T2 ? [-31, 19] : y < T3 ? [-19, 19] : [-19, 7];
    g.push(slab(xr[0], xr[1], y, -23, 23, 0.6));
  }
  addPart('residential-floor-plates', 'Residential floor plates', 'residential', g);
}
{
  const g = [];
  for (const [y0, x0, x1] of [[110, -31, 31], [200, -19, 19], [260, -19, 7]]) {
    for (let x = x0; x < x1 - 1; x += 7.5) {
      g.push(box(x, x + 0.3, y0, y0 + 3, -20, 20));
    }
  }
  addPart('residential-unit-partitions', 'Residential unit partitions', 'residential', g);
}
addPart('residential-corridors', 'Residential corridors', 'residential', [
  box(-28, 28, 103, T1, -1.5, 1.5),
  box(-28, 16, T1, T2, -1.5, 1.5),
  box(-16, 16, T2, T3, -1.5, 1.5),
  box(-16, 4, T3, 330, -1.5, 1.5),
]);
addPart('residential-lobby', 'Residential lobby', 'residential', [
  box(-16, 16, 103, 110, -10, 10),
]);
// 14th floor health club and spa (sourced), 23,000 sq ft spa.
addPart('health-club-spa', 'Health club and spa', 'residential', [
  box(-32, 32, 48, 56, -24, 24),
]);
addPart('penthouse-levels', 'Penthouse levels 86 to 88', 'residential', [
  box(-19, 7, 313, 327, -23, 23),
]);
// 89th floor: a single 14,500 sq ft residence with 20 ft ceilings.
addPart('penthouse-89', 'Penthouse 89', 'residential', [
  box(-20, 8, 327, 333.5, -24, 24),
]);
addPart('penthouse-terrace', 'Penthouse terrace', 'residential', [
  box(-20, 8, 333.5, 334.3, -24, 24),
]);
addPart('residential-express-elevators', 'Residential express elevators', 'residential', [
  box(-16, -12, 0, 334, 10, 14),
  box(-11, -7, 0, 334, 10, 14),
]);
addPart('residential-service-core', 'Residential service core', 'residential', [
  box(2, 6, 103, 334, -6, 6),
]);

// --- Structure: reinforced concrete core, outriggers, caisson foundations.
// Sourced: tallest all-concrete building in the world; up to 16,000 psi
// concrete in transition floors and shear walls; 5.3 m by 1.7 m outrigger
// monoliths at each setback; 8 ft and 10 ft rock-socketed caissons under a
// concrete mat. All sizes and positions schematic.
addPart('concrete-core-base', 'Concrete core base', 'structure', [
  box(-11, 11, -6, T1, -9, 9),
]);
addPart('concrete-core-mid', 'Concrete core mid', 'structure', [
  box(-10, 10, T1, T3, -8, 8),
]);
addPart('concrete-core-upper', 'Concrete core upper', 'structure', [
  box(-9, 9, T3, ROOF, -7, 7),
]);
addPart('outrigger-level-1', 'Outrigger level 1', 'structure', [
  box(-30, 30, 124, T1, -0.85, 0.85),
  box(-0.85, 0.85, 124, T1, -22, 22),
  box(-30, 30, 124, T1, 20.3, 22),
  box(-30, 30, 124, T1, -22, -20.3),
]);
addPart('outrigger-level-2', 'Outrigger level 2', 'structure', [
  box(-30, 18, 173, T2, -0.85, 0.85),
  box(-0.85, 0.85, 173, T2, -22, 22),
]);
addPart('outrigger-level-3', 'Outrigger level 3', 'structure', [
  box(-18, 18, 206, T3, -0.85, 0.85),
  box(-0.85, 0.85, 206, T3, -22, 22),
]);
addPart('transfer-girders', 'Transfer girders', 'structure', [
  box(-34, 34, 40, POD_TOP, -26, 26),
]);
addPart('shear-walls', 'Shear walls', 'structure', [
  box(-1, 1, POD_TOP, T1, -24, -22),
  box(-1, 1, POD_TOP, T1, 22, 24),
  box(-1, 1, T1, T2, -24, -22),
  box(-1, 1, T1, T2, 22, 24),
]);
{
  const g = [];
  let k = 0;
  for (const gx of [-30, -15, 0, 15, 30])
    for (const gz of [-20, 0, 20]) {
      const r = k % 2 ? 1.5 : 1.2;
      g.push(cyl(r, r, 26, gx, -19, gz, 10));
      k++;
    }
  addPart('caisson-foundation', 'Caisson foundation', 'structure', g);
}
addPart('mat-foundation', 'Mat foundation', 'structure', [
  box(-38, 38, -8, -4, -30, 30),
]);

// --- Riverwalk and plaza: river, promenade, park, plaza (schematic layout,
// sourced extents: 500 ft frontage, 1.2-acre park).
addPart('chicago-river', 'Chicago River', 'riverwalk', [
  box(-150, -80, -16, -15.4, -95, 95),
]);
addPart('riverwalk-promenade', 'Riverwalk promenade', 'riverwalk', [
  box(-80, -71, -0.6, 0, -75, 75),
]);
addPart('riverfront-park', 'Riverfront park', 'riverwalk', [
  box(-71, -55, -0.6, 0, -75, 75),
]);
{
  const g = [
    box(-70, -56, -0.5, 0.1, -70, -40),
    box(-70, -56, -0.5, 0.1, -30, 0),
    box(-70, -56, -0.5, 0.1, 10, 40),
  ];
  addPart('park-lawns', 'Park lawns', 'riverwalk', g);
}
{
  const g = [];
  for (let z = -70; z <= 70; z += 10) {
    g.push(cyl(0.25, 0.3, 3, -63, 1.5, z, 6));
    g.push(ball(1.8, -63, 4.2, z));
  }
  addPart('park-trees', 'Park trees', 'riverwalk', g);
}
addPart('river-edge-wall', 'River edge wall', 'riverwalk', [
  box(-80.8, -80, -16, 0, -95, 95),
]);
{
  const g = [box(-96, -80, -1.2, 0, -24, -12)];
  for (const [px, pz] of [[-94, -22], [-94, -14], [-82, -22], [-82, -14]])
    g.push(cyl(0.3, 0.3, 15, px, -8, pz, 6));
  addPart('river-dock', 'River tour dock', 'riverwalk', g);
}
addPart('trump-plaza', 'Trump plaza', 'riverwalk', [
  box(36, 62, -0.6, 0, -24, 24),
]);
addPart('wabash-avenue', 'Wabash Avenue', 'riverwalk', [
  box(62, 84, -0.6, 0, -95, 95),
]);
{
  // Stainless steel TRUMP letters on the river face, over 20 ft tall,
  // installed June 2014. Letterforms are schematic blocks.
  const g = [];
  for (let i = 0; i < 5; i++) {
    g.push(box(-34.6, -33.6, 100, 106.1, -21 + i * 9, -15 + i * 9));
  }
  addPart('river-sign', 'River sign', 'riverwalk', g);
}

// ---------------------------------------------------------------- colors
// Light schematic palette: glass blue, warm concrete grey, stainless silver,
// park green. Only the Eiffel Tower is dark realistic.
function colorFor(id) {
  if (id === 'podium-mass') return '#c9c2b2';
  if (id === 'podium-retail-glass') return '#a8c8d8';
  if (id === 'podium-garage-decks') return '#9a948a';
  if (id === 'podium-lobby') return '#d8cfb8';
  if (id === 'lobby-wave-wall') return '#b8d8e8';
  if (id === 'wabash-entrance') return '#b8b0a0';
  if (id === 'podium-river-terrace') return '#b4a88e';
  if (id === 'podium-roof-terrace') return '#a89e86';
  if (id === 'podium-cornice') return '#b0a890';
  if (id === 'garage-ramps') return '#8a8478';
  if (id === 'service-dock') return '#9a948a';
  if (id === 'retail-mezzanine') return '#c4bca8';
  if (id.startsWith('tier1-')) {
    if (id === 'tier1-mass') return '#c2ced6';
    if (id.endsWith('-slabs')) return '#a8b4bc';
    if (id === 'tier1-core') return '#b0a890';
    if (id === 'tier1-perimeter-columns') return '#d8d4c8';
    if (id === 'tier1-outrigger-level') return '#9a9284';
    if (id === 'tier1-setback-terrace') return '#9fb3bd';
    if (id === 'tier1-edge-beams') return '#8f9aa2';
    if (id === 'tier1-mechanical-band') return '#98a2aa';
    if (id === 'tier1-parapet') return '#b8c2c8';
  }
  if (id.startsWith('tier2-')) {
    if (id === 'tier2-mass') return '#c6d2da';
    if (id.endsWith('-slabs')) return '#acb8c0';
    if (id === 'tier2-core') return '#b4ac94';
    if (id === 'tier2-perimeter-columns') return '#dcd8cc';
    if (id === 'tier2-outrigger-level') return '#9e9688';
    if (id === 'tier2-setback-terrace') return '#a3b7c1';
    if (id === 'tier2-edge-beams') return '#939ea6';
    if (id === 'tier2-mechanical-band') return '#9ca6ae';
    if (id === 'tier2-parapet') return '#bcc6cc';
  }
  if (id.startsWith('tier3-')) {
    if (id === 'tier3-mass') return '#cad6de';
    if (id.endsWith('-slabs')) return '#b0bcc4';
    if (id === 'tier3-core') return '#b8b098';
    if (id === 'tier3-perimeter-columns') return '#e0dcd0';
    if (id === 'tier3-outrigger-level') return '#a29a8c';
    if (id === 'tier3-setback-terrace') return '#a7bbc5';
    if (id === 'tier3-edge-beams') return '#97a2aa';
    if (id === 'tier3-mechanical-band') return '#a0aab2';
    if (id === 'tier3-parapet') return '#c0cad0';
  }
  if (id === 'crown-mass') return '#cedae2';
  if (id === 'crown-lower-slabs' || id === 'crown-upper-slabs') return '#b4c0c8';
  if (id === 'crown-core') return '#bcb49c';
  if (id === 'crown-perimeter-columns') return '#e4e0d4';
  if (id === 'roof-slab') return '#9aa4ac';
  if (id === 'mechanical-penthouse') return '#b8c0c8';
  if (id === 'penthouse-louvers') return '#8f9aa2';
  if (id === 'spire-beacon') return '#e05a4a';
  if (id.startsWith('spire-')) return '#d8dce0';
  if (id.endsWith('-glass')) return '#aed2e2';
  if (id.endsWith('-mullions')) return '#d5d9dc';
  if (id.endsWith('-spandrels')) return '#b9c0c4';
  if (id.endsWith('-corner-fins')) return '#cdd4d8';
  if (id === 'hotel-floor-plates') return '#c8b898';
  if (id === 'hotel-guestroom-modules') return '#d8c8a8';
  if (id === 'hotel-corridor-spine') return '#b8a888';
  if (id === 'hotel-sky-lobby') return '#e0d0b0';
  if (id === 'sixteen-restaurant') return '#d8b888';
  if (id === 'hotel-executive-lounge') return '#e4d4b4';
  if (id === 'hotel-elevator-bank') return '#a89a86';
  if (id === 'hotel-service-core') return '#9a8c78';
  if (id === 'residential-floor-plates') return '#c4b494';
  if (id === 'residential-unit-partitions') return '#d4c4a4';
  if (id === 'residential-corridors') return '#b4a484';
  if (id === 'residential-lobby') return '#dcc8a8';
  if (id === 'health-club-spa') return '#b8d0c8';
  if (id === 'penthouse-levels') return '#d8c49c';
  if (id === 'penthouse-89') return '#e0cca0';
  if (id === 'penthouse-terrace') return '#b0a080';
  if (id === 'residential-express-elevators') return '#a49680';
  if (id === 'residential-service-core') return '#968872';
  if (id === 'concrete-core-base' || id === 'concrete-core-mid' || id === 'concrete-core-upper') return '#a89e8c';
  if (id.startsWith('outrigger-level-')) return '#8f8778';
  if (id === 'transfer-girders') return '#847c6e';
  if (id === 'shear-walls') return '#9c9484';
  if (id === 'caisson-foundation') return '#7a7468';
  if (id === 'mat-foundation') return '#8a8478';
  if (id === 'chicago-river') return '#7fb3d5';
  if (id === 'riverwalk-promenade') return '#c4b898';
  if (id === 'riverfront-park') return '#8fbf7f';
  if (id === 'park-lawns') return '#9fcf8f';
  if (id === 'park-trees') return '#5a8f4f';
  if (id === 'river-edge-wall') return '#8a8478';
  if (id === 'river-dock') return '#a89880';
  if (id === 'trump-plaza') return '#c0b498';
  if (id === 'wabash-avenue') return '#8a8d90';
  if (id === 'river-sign') return '#d5d9dc';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'podium', name: 'Retail podium', color: '#c4b898', description: 'The retail, lobby and parking base along the river: lobbies, retail and the garage on floors 3 to 12. Plan and heights are schematic.' },
  { id: 'tier-1', name: 'First setback tier', color: '#c2ced6', description: 'The lowest tier, rising to the first setback at 130 m on the east side, the height of the neighbouring Wrigley Building.' },
  { id: 'tier-2', name: 'Second setback tier', color: '#c6d2da', description: 'The middle tier, stepping back on the west side at 179 m, the height of the Marina City towers.' },
  { id: 'tier-3', name: 'Third setback tier', color: '#cad6de', description: 'The upper tier, stepping back on the east side at 212 m, the height of 330 North Wabash (IBM Plaza).' },
  { id: 'crown', name: 'Spire and crown', color: '#cedae2', description: 'The top tier from 212 m to the 1,171 ft roof, with the mechanical penthouse and the 226 ft spire reaching the 1,389 ft tip.' },
  { id: 'facade', name: 'Facade', color: '#aed2e2', description: 'The Permasteelisa curtain wall: clear low-e glass, polished stainless steel mullions, brushed stainless spandrels and clear anodized aluminum. Panel rhythm is schematic.' },
  { id: 'hotel', name: 'Hotel floors', color: '#d8c8a8', description: 'The 339-room hotel on floors 17 to 27, with the Sixteen restaurant on the 16th floor. Layout is schematic.' },
  { id: 'residential', name: 'Residential floors', color: '#d4c4a4', description: 'The 486 condominiums on floors 28 to 85, the 14th floor health club and spa, and the penthouses on floors 86 to 89. Layout is schematic.' },
  { id: 'structure', name: 'Concrete core and structure', color: '#a89e8c', description: 'The reinforced concrete core, outrigger levels at the setbacks, shear walls and caisson foundations. All sizes are schematic.' },
  { id: 'riverwalk', name: 'Riverwalk and plaza', color: '#8fbf7f', description: 'The Chicago River, the 500 ft riverwalk, the 1.2-acre riverfront park, the plaza and Wabash Avenue. Layout is schematic.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'podium mass': 'Schematic mass of the retail, lobby and parking podium. Sources place lobbies, retail space and the parking garage on floors 3 to 12; the podium height and outline are schematic.',
  'podium retail glass': 'Schematic glass band for the podium retail levels. The tower holds about 100,000 sq ft of retail space. Position and extent are schematic.',
  'podium garage decks': 'Schematic parking decks inside the podium. The tower holds about 1,000 parking spaces on the lower floors. Deck count and layout are schematic.',
  'podium lobby': 'Schematic double-height lobby volume at the foot of the tower. Interior layout is schematic.',
  'lobby wave wall': 'A 35 ft (10.6 m) structural glass wall in the lobby, hung from the second floor and shaped like a cascading wave, built from angled glass fins with no steel supports. The wave profile shown is schematic.',
  'wabash entrance': 'Schematic main entrance on the Wabash Avenue side. Sources note the tower body is raised 30 ft above the Wabash entrance; the entrance form is schematic.',
  'podium river terrace': 'Schematic terrace between the podium and the riverwalk. Treatment is schematic.',
  'podium roof terrace': 'Schematic roof of the podium where the tower tiers rise. Roof treatment is schematic.',
  'podium cornice': 'Schematic cornice band crowning the podium. Profile is schematic.',
  'garage ramps': 'Schematic ramps between the parking decks. Routing is schematic.',
  'service dock': 'Schematic service and loading dock at the podium. Position is schematic.',
  'retail mezzanine': 'Schematic mezzanine level inside the podium retail volume. Layout is schematic.',
  'tier 1 mass': 'Schematic structural mass of the first tier, from the podium top to the first setback at 130 m (427 ft), the height of the neighbouring Wrigley Building. Footprint is schematic.',
  'tier 1 lower slabs': 'Schematic lower floor plates of the first tier, carrying the 14th floor health club, the 16th floor restaurant and the lower hotel floors. Slab count and spacing are schematic.',
  'tier 1 upper slabs': 'Schematic upper floor plates of the first tier, carrying the upper hotel floors and the lowest residential floors. Slab count and spacing are schematic.',
  'tier 1 core': 'Schematic segment of the reinforced concrete core inside the first tier. Core size is schematic.',
  'tier 1 perimeter columns': 'Schematic perimeter columns of the first tier, linked to the core by the outrigger level at the setback. Column grid is schematic.',
  'tier 1 outrigger level': 'Schematic outrigger walls at the first setback. Sources describe 5.3 m deep by 1.7 m wide concrete monoliths at each setback transferring lateral loads between the perimeter columns and the central core. Exact arrangement is schematic.',
  'tier 1 setback terrace': 'Schematic terrace on the east side where the tower steps back at 130 m. Terrace treatment is schematic.',
  'tier 1 edge beams': 'Schematic edge beams ringing the top of the first tier. Beam sizes are schematic.',
  'tier 1 mechanical band': 'Schematic mechanical floor band inside the first tier. Position is schematic.',
  'tier 1 parapet': 'Schematic parapet around the first setback terrace. Height is schematic.',
  'tier 2 mass': 'Schematic structural mass of the second tier, from 130 m to the second setback at 179 m (587 ft), the height of the Marina City towers, stepping back on the west side. Footprint is schematic.',
  'tier 2 slabs': 'Schematic floor plates of the second tier, carrying residential condominiums. Slab count and spacing are schematic.',
  'tier 2 core': 'Schematic segment of the reinforced concrete core inside the second tier. Core size is schematic.',
  'tier 2 perimeter columns': 'Schematic perimeter columns of the second tier, linked to the core by the outrigger level at the setback. Column grid is schematic.',
  'tier 2 outrigger level': 'Schematic outrigger walls at the second setback, transferring lateral loads between the perimeter columns and the central core. Exact arrangement is schematic.',
  'tier 2 setback terrace': 'Schematic terrace on the west side where the tower steps back at 179 m. Terrace treatment is schematic.',
  'tier 2 edge beams': 'Schematic edge beams ringing the top of the second tier. Beam sizes are schematic.',
  'tier 2 mechanical band': 'Schematic mechanical floor band inside the second tier. Position is schematic.',
  'tier 2 parapet': 'Schematic parapet around the second setback terrace. Height is schematic.',
  'tier 3 mass': 'Schematic structural mass of the third tier, from 179 m to the third setback at 212 m (696 ft), the height of 330 North Wabash (IBM Plaza), stepping back on the east side. Footprint is schematic.',
  'tier 3 slabs': 'Schematic floor plates of the third tier, carrying residential condominiums. Slab count and spacing are schematic.',
  'tier 3 core': 'Schematic segment of the reinforced concrete core inside the third tier. Core size is schematic.',
  'tier 3 perimeter columns': 'Schematic perimeter columns of the third tier, linked to the core by the outrigger level at the setback. Column grid is schematic.',
  'tier 3 outrigger level': 'Schematic outrigger walls at the third setback, transferring lateral loads between the perimeter columns and the central core. Exact arrangement is schematic.',
  'tier 3 setback terrace': 'Schematic terrace on the east side where the tower steps back at 212 m. Terrace treatment is schematic.',
  'tier 3 edge beams': 'Schematic edge beams ringing the top of the third tier. Beam sizes are schematic.',
  'tier 3 mechanical band': 'Schematic mechanical floor band inside the third tier. Position is schematic.',
  'tier 3 parapet': 'Schematic parapet around the third setback terrace. Height is schematic.',
  'crown mass': 'Schematic structural mass of the crown tier, from 212 m to the 1,171 ft (357 m) roof, carrying the upper residences. Footprint is schematic.',
  'crown lower slabs': 'Schematic lower floor plates of the crown tier. Slab count and spacing are schematic.',
  'crown upper slabs': 'Schematic upper floor plates of the crown tier, carrying the penthouse levels. Slab count and spacing are schematic.',
  'crown core': 'Schematic segment of the reinforced concrete core inside the crown tier. Core size is schematic.',
  'crown perimeter columns': 'Schematic perimeter columns of the crown tier. Column grid is schematic.',
  'roof slab': 'Schematic roof plate at 1,171 ft (357 m). Roof detailing is schematic.',
  'mechanical penthouse': 'Schematic mechanical penthouse on the roof. Size and cladding are schematic.',
  'penthouse louvers': 'Schematic ventilation louvers on the mechanical penthouse. Layout is schematic.',
  'spire base section': 'Lowest of three schematic spire sections. Sources describe the real spire as structural steel clad in fiberglass, tapering from 3 m diameter at its base. Section divisions are schematic.',
  'spire middle section': 'Middle of three schematic spire sections rising toward the 1,389 ft tip. Section divisions are schematic.',
  'spire tip section': 'Top of three schematic spire sections. Sources describe the real spire tapering to 1.2 m (4 ft) diameter at its top, 69 m (226 ft) above the roofline. Section divisions are schematic.',
  'spire aviation beacon': 'Schematic aviation warning beacon at the 1,389 ft tip. Position is schematic.',
  'tier 1 glass envelope': 'Schematic glass skin of the first tier. Sources describe a Permasteelisa curtain wall of clear low-emissivity coated glass; panel layout is schematic.',
  'tier 1 mullion fins': 'Schematic vertical mullion fins on the first tier. Sources describe a curved wing-shaped polished stainless steel mullion system projecting 9 in (23 cm) from the glass line; fin rhythm is schematic.',
  'tier 1 spandrel band': 'Schematic brushed stainless steel spandrel band at the first setback. Sources list brushed stainless steel spandrel panels and clear anodized aluminum in the facade; band position is schematic.',
  'tier 1 corner fins': 'Schematic rounded corner fins on the first tier. Sources note the rounded edges combat vortex formation; corner profiles are schematic.',
  'tier 2 glass envelope': 'Schematic glass skin of the second tier. Panel layout is schematic.',
  'tier 2 mullion fins': 'Schematic vertical mullion fins on the second tier. Fin rhythm is schematic.',
  'tier 2 spandrel band': 'Schematic brushed stainless steel spandrel band at the second setback. Band position is schematic.',
  'tier 2 corner fins': 'Schematic rounded corner fins on the second tier. Corner profiles are schematic.',
  'tier 3 glass envelope': 'Schematic glass skin of the third tier. Panel layout is schematic.',
  'tier 3 mullion fins': 'Schematic vertical mullion fins on the third tier. Fin rhythm is schematic.',
  'tier 3 spandrel band': 'Schematic brushed stainless steel spandrel band at the third setback. Band position is schematic.',
  'tier 3 corner fins': 'Schematic rounded corner fins on the third tier. Corner profiles are schematic.',
  'crown glass envelope': 'Schematic glass skin of the crown tier. Panel layout is schematic.',
  'crown mullion fins': 'Schematic vertical mullion fins on the crown tier. Fin rhythm is schematic.',
  'crown spandrel band': 'Schematic brushed stainless steel spandrel band below the roof. Band position is schematic.',
  'crown corner fins': 'Schematic rounded corner fins on the crown tier. Corner profiles are schematic.',
  'hotel floor plates': 'Schematic floor plates for the 339-room hotel on floors 17 to 27. Sources place the hotel condominiums and executive lounges on floors 17 to the 27th floor mezzanine; slab count is schematic.',
  'hotel guestroom modules': 'Schematic guestroom blocks on two sample hotel floors. Room count and layout are schematic.',
  'hotel corridor spine': 'Schematic corridor spine serving the hotel floors. Layout is schematic.',
  'hotel sky lobby': 'Schematic hotel sky lobby at the base of the hotel floors. Layout is schematic.',
  'sixteen restaurant': 'Schematic volume for the Sixteen restaurant on the 16th floor, which held two Michelin stars in 2016. Interior layout is schematic.',
  'hotel executive lounge': 'Schematic executive lounge near the top of the hotel floors. Sources place executive lounges with the hotel condominiums; layout is schematic.',
  'hotel elevator bank': 'Schematic hotel elevator shafts. Sources describe 27 Kone elevators at 8 m/s (1,600 ft/min), among the fastest in the US; bank grouping is schematic.',
  'hotel service core': 'Schematic service core for the hotel floors. Layout is schematic.',
  'residential floor plates': 'Schematic floor plates for the 486 residential condominiums on floors 28 to 85. Slab count and spacing are schematic.',
  'residential unit partitions': 'Schematic unit partition walls on three sample residential floors. Layout is schematic.',
  'residential corridors': 'Schematic residential corridors per tier. Layout is schematic.',
  'residential lobby': 'Schematic residential lobby at the base of the residential floors. Layout is schematic.',
  'health club and spa': 'Schematic volume for the health club and 23,000 sq ft spa on the 14th floor. Interior layout is schematic.',
  'penthouse levels 86 to 88': 'Schematic volume for the penthouse levels 86 to 88. Sources place penthouses on floors 86 to 89; interior layout is schematic.',
  'penthouse 89': 'Schematic volume for the 89th floor residence: a single 14,500 sq ft home with 20 ft floor-to-ceiling windows occupying the entire floor. Interior layout is schematic.',
  'penthouse terrace': 'Schematic roof terrace above the 89th floor penthouse. Treatment is schematic.',
  'residential express elevators': 'Schematic express elevator shafts for the residences, running from the ground to the penthouse levels. Grouping is schematic.',
  'residential service core': 'Schematic service core for the residential floors. Layout is schematic.',
  'concrete core base': 'Schematic base segment of the reinforced concrete core. The tower is the tallest all-concrete building in the world, using up to 16,000 psi concrete in transition floors and shear walls; core size is schematic.',
  'concrete core mid': 'Schematic middle segment of the reinforced concrete core. Core size is schematic.',
  'concrete core upper': 'Schematic upper segment of the reinforced concrete core. Core size is schematic.',
  'outrigger level 1': 'Schematic outrigger walls at the first setback: 5.3 m deep by 1.7 m wide concrete monoliths linking the perimeter columns to the central core. Exact arrangement is schematic.',
  'outrigger level 2': 'Schematic outrigger walls at the second setback, linking the perimeter columns to the central core. Exact arrangement is schematic.',
  'outrigger level 3': 'Schematic outrigger walls at the third setback, linking the perimeter columns to the central core. Exact arrangement is schematic.',
  'transfer girders': 'Schematic deep transfer girders spreading the tower columns across the podium. Sizes are schematic.',
  'shear walls': 'Schematic concrete shear walls stiffening the lower tiers. Sources note 16,000 psi concrete in the shear walls; wall positions are schematic.',
  'caisson foundation': 'Schematic rock-socketed caissons under the tower. Sources describe 8 ft and 10 ft diameter caissons drilled to rock beneath a concrete mat; count and layout are schematic.',
  'mat foundation': 'Schematic concrete foundation mat under the tower. Depth and extent are schematic.',
  'chicago river': 'The main branch of the Chicago River beside the tower, with a view toward the entry to Lake Michigan. Water level and extent are schematic.',
  'riverwalk promenade': 'Schematic riverwalk promenade along the 500 ft river frontage. Sources describe a 1.2-acre riverfront park and riverwalk linking the building with river commuters; layout is schematic.',
  'riverfront park': 'Schematic riverfront park strip beside the promenade. Planting layout is schematic.',
  'park lawns': 'Schematic park lawns. Layout is schematic.',
  'park trees': 'Schematic park trees along the promenade. Species and positions are schematic.',
  'river edge wall': 'Schematic river edge wall (seawall) retaining the promenade. Profile is schematic.',
  'river tour dock': 'Schematic dock for the architectural boat tours that show off the tower from the river. Position is schematic.',
  'trump plaza': 'Schematic plaza in front of the Wabash entrance. Paving and extent are schematic.',
  'wabash avenue': 'Schematic strip of Wabash Avenue east of the tower. The tower stands at 401 N. Wabash Avenue; street extent is schematic.',
  'river sign': 'The stainless steel TRUMP sign on the river face: letters more than 20 ft tall spanning nearly half a football field, installed in June 2014. Letterforms are schematic blocks.',
};

// ---------------------------------------------------------------- serialize
// Atlas v1 contract: per part, 4-byte aligned Float32 positions, Int16
// normals and Uint32 indices in one binary chunk; atlas.json carries byte
// offsets, bounds, explanations, concepts and triangles.
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
const binName = 'trump-tower-chicago-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the trump-tower-chicago directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Trump International Hotel and Tower, Chicago (detailed schematic)',
  title: 'Trump International Hotel and Tower',
  location: 'Chicago, United States',
  blurb: 'Chicago\u2019s 1,389 ft condo-hotel tower by Adrian Smith of SOM, completed in 2009. Three setbacks step the concrete frame back at the heights of the Wrigley Building, Marina City and the IBM Building, rising to a 226 ft spire above a glass, stainless steel and aluminum facade.',
  sourceUrls: [
    { label: 'Wikipedia: Trump International Hotel and Tower (Chicago)', url: 'http://en.wikipedia.org/wiki/Trump_International_Hotel_and_Tower_(Chicago)' },
    { label: 'New Civil Engineer: Windy City Wonder', url: 'https://www.newcivilengineer.com/archive/windy-city-wonder-25-10-2007/' },
    { label: 'NPR Illinois: Trump Stands Firm On Giant Chicago Sign', url: 'https://www.nprillinois.org/2014-06-21/trump-stands-firm-on-giant-chicago-sign' },
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
  chunks: [{ url: '/models/trump-tower-chicago/trump-tower-chicago-0.bin', bytes: offset }],
  triangles,
  // The exploded cloud lifts +1 above the assembled centre while the camera
  // targets the model centre, so compact packings clip at the top of the
  // frame. 1.4 restores full framing for this tall model.
  spread: 1.4,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));

// Freshness gate against the simple model: 0 shared part names and 0
// identical bounds are allowed. Fails the build on violation.
const simpleAtlas = JSON.parse(
  fs.readFileSync(path.join(outDir, '..', 'trump-tower-chicago-simple', 'atlas.json'), 'utf8'),
);
const simpleNames = new Set(simpleAtlas.parts.map((p) => p.name));
const simpleBounds = new Set(simpleAtlas.parts.map((p) => JSON.stringify(p.bounds)));
let nameHits = 0;
let boundHits = 0;
for (const r of records) {
  if (simpleNames.has(r.part.name)) { nameHits++; console.error('SHARED NAME:', r.part.name); }
  if (simpleBounds.has(JSON.stringify(r.bounds))) { boundHits++; console.error('IDENTICAL BOUNDS:', r.part.id); }
}
console.log(`Freshness vs simple: ${nameHits} shared names, ${boundHits} identical bounds (both must be 0)`);
if (nameHits > 0 || boundHits > 0) process.exit(1);
