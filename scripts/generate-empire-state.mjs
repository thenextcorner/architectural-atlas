// Procedural Empire State Building for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Empire State Building in code and
// writes it in the atlas binary format:
//   public/models/empire-state/atlas.json
//   public/models/empire-state/empire-state-0.bin
//
// Dimensions used (all verified from the Empire State Building Wikipedia article
// https://en.wikipedia.org/wiki/Empire_State_Building and the Structurae entry
// https://structurae.net/en/structures/empire-state-building, both opened
// 2026-09-30):
//   tip 1,454 ft (443.2 m); antenna spire 204 ft (62.2 m); roof 1,250 ft (381.0 m);
//   top floor 1,224 ft (373.1 m); 86th floor observatory 1,050 ft (320 m);
//   102 stories; 73 elevators; 6,514 windows;
//   footprint 424 ft (129.2 m) east-west by 187 ft (57.0 m) north-south;
//   total floor area 2,768,591 sq ft (257,211 m2); base floors cover 2 acres;
//   five story base occupying the entire lot; 81 story shaft above it;
//   setback above the 5th story 60 ft (18 m) deep on all sides;
//   setbacks at the 21st, 25th, 30th, 72nd, 81st, and 85th stories
//     (mandated by the 1916 Zoning Resolution; correspond to tops of elevator shafts);
//   interior space at most 28 ft (8.5 m) deep; 210 structural columns per floor;
//   16 story, 200 ft (61 m) metal crown above the 86th floor, mostly mechanical;
//   203 ft (61.9 m) pinnacle covered by broadcast antennas, surmounted by a
//     lightning rod; 158 ft hollow steel mast with elevators and utilities;
//   mooring mast topped out November 21, 1930; dirigible docking plan abandoned
//     (high winds); airships would have moored at the 106th floor equivalent;
//   facade clad in Indiana limestone panels (Indiana Limestone Company,
//     south-central Indiana quarry), signature blonde color;
//   200,000 cu ft of limestone and granite, ten million bricks, 730 short tons
//     of aluminum and stainless steel in the facade;
//   tower bays in sets of one, two, or three windows per floor, projecting
//     slightly from the cladding; alternating narrow and wide piers;
//   windows separated by nickel-chrome steel mullions, joined by horizontal
//     aluminum spandrels (which avoided cross-bonding); stainless steel frames;
//   Fifth Avenue entrance: three sets of metal doors, molded piers topped with
//     sculpted concrete eagles, triple-height transom window with geometric
//     patterns, golden "Empire State" letters above the fifth floor windows;
//   two entrances each on 33rd and 34th Streets with stainless steel canopies;
//   first floor storefronts in aluminum framed doors and windows within black
//     granite; second through fourth stories alternate windows with wide stone
//     piers and narrower mullions; fifth story topped by a horizontal stone sill;
//   lobby: three stories high, the only space with narrative motifs; one set of
//     double doors between revolving doors; bronze motifs of Electricity,
//     Masonry, and Heating; two tiers of marble (darker wainscoting, lighter
//     above); zigzag terrazzo floor running east to west; north and south
//     storefronts flanked by tubes of dark rounded marble; escalators at the
//     west ends to a mezzanine; aluminum relief of the building as built
//     (without the antenna); 2009 renovation replaced the information desk
//     clock with an anemometer;
//   elevators: 73 total; original 64 by Otis (4 express lobby to 80th floor,
//     54 local, 8 freight); additional elevators connect the 80th floor to the
//     six floors above; one elevator connects the 86th and 102nd observatories
//     and the mechanical floors between the 87th and 101st;
//   observatories on the 80th (indoor, opened 2019, Stephen Wiltshire skyline
//     mural), 86th (enclosed gallery plus open air deck), and 102nd floors
//     (fully enclosed, redesigned 2019 with floor to ceiling windows);
//   visitors enter the observatories at 20 West 34th Street;
//   lighting: white searchlights first used November 1932 (Roosevelt victory);
//     four "Freedom Lights" in 1956; 72nd floor floodlights added February 1964
//     for the Worlds Fair; 204 metal-halide lights in 1976; colors since
//     October 12, 1977; 1,200 LED fixtures in 2012 (nine to 16 million colors);
//   broadcast: 200 ft broadcast tower completed 1953; separate FM antennae
//     ringing the 103rd floor built 1965; mast has 480 windows (replaced 2015);
//   designed by Shreve, Lamb and Harmon; structural engineer Homer Gage Balcom;
//     built by Starrett Brothers and Eken; construction March 17, 1930 to
//     April 11, 1931; opened May 1, 1931; cost $40,948,900;
//   riveted steel frame; 42 pounds per square foot structural stiffness;
//   building weight 365,000 short tons.
//
// Intermediate widths, interior layout, fixture placement, and foundation depth
// are schematic approximations and are not stated as facts anywhere in the UI.
//
// Granularity: 109 named parts across 10 systems. Every explanation is either a
// sourced fact (see ~/workspace/architectural-atlas/research/empire-state-attribution.md)
// or explicitly marked schematic.
//
// Usage: node scripts/generate-empire-state.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'empire-state');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: the viewer is tuned for an object about 2 units tall,
// so 443.2 m (tip) maps to 2.4 units.
const S = 2.4 / 443.2;

// ---------------------------------------------------------------- dimensions
// Average floor-to-floor height: 381 m roof / 102 floors.
const FH = 381 / 102;
const H = (f) => f * FH; // height (m) of the top of floor f

// Sourced heights (m)
const BASE_TOP = H(5); // five story base
const OBS86 = H(86); // 86th floor observatory: 321.2 m (1,050 ft = 320 m)
const ROOF = 381; // 102nd floor / roof: 1,250 ft
const TIP = 443.2; // lightning rod tip: 1,454 ft

// ---------------------------------------------------------------- helpers
function box(w, h, d, x, y, z, ry = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  return g;
}
function cyl(rt, rb, h, x, y, z, seg = 14) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function hTorus(r, tube, x, y, z, seg = 24) {
  const g = new THREE.TorusGeometry(r, tube, 8, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// === FOUNDATIONS ===
// Below-grade footings and a bedrock anchor slab (depth schematic).
addPart('foundation-footings', 'Foundation footings', 'foundations', [
  box(112, 8, 52, 0, -4, 0),
  box(96, 6, 44, 0, -9, 0),
]);
addPart('foundation-bedrock-slab', 'Bedrock anchor slab', 'foundations', [
  box(122, 2.5, 62, 0, -10.25, 0),
]);

// === BASE ===
// Five story limestone base occupying the entire lot: 129.2 m east-west,
// 57.0 m north-south, 5 stories high.
addPart('five-story-base', 'Five story limestone base', 'base', [
  box(129.2, BASE_TOP, 57.0, 0, BASE_TOP / 2, 0),
]);
// Limestone facade skins per face with alternating wide and narrow piers
// (rhythm schematic; sourced: floors 2 to 4 alternate windows with wide stone
// piers and narrower mullions, the 5th story uses wide and narrow mullions).
function baseFacade(face) {
  const geoms = [];
  const east = face === 'east' || face === 'west';
  const sx = east ? 1 : 0;
  const faceX = east ? (face === 'east' ? 64.6 : -64.6) : 0;
  const faceZ = east ? 0 : face === 'south' ? 28.5 : -28.5;
  const len = east ? 57.0 : 129.2;
  const n = Math.max(6, Math.round(len / 6));
  for (let i = 0; i <= n; i++) {
    const t = -len / 2 + (len * i) / n;
    const wide = i % 2 === 0;
    const w = wide ? 1.6 : 0.9;
    if (east) geoms.push(box(0.7, BASE_TOP, w, faceX + (face === 'east' ? 0.3 : -0.3), BASE_TOP / 2, t));
    else geoms.push(box(w, BASE_TOP, 0.7, t, BASE_TOP / 2, faceZ + (face === 'south' ? 0.3 : -0.3)));
  }
  // Window strips between the piers (schematic).
  for (let i = 0; i < n; i++) {
    const t = -len / 2 + (len * (i + 0.5)) / n;
    const w = len / n - 2;
    if (east) geoms.push(box(0.3, BASE_TOP - 3, w, faceX + (face === 'east' ? 0.15 : -0.15), BASE_TOP / 2, t));
    else geoms.push(box(w, BASE_TOP - 3, 0.3, t, BASE_TOP / 2, faceZ + (face === 'south' ? 0.15 : -0.15)));
  }
  // Horizontal band at the top of the fourth story (schematic).
  if (east) geoms.push(box(0.8, 1.0, len + 0.6, faceX + (face === 'east' ? 0.3 : -0.3), H(4), 0));
  else geoms.push(box(len + 0.6, 1.0, 0.8, 0, H(4), faceZ + (face === 'south' ? 0.3 : -0.3)));
  addPart(`base-facade-${face}`, `Base ${face} facade`, 'base', geoms);
}
for (const f of ['east', 'west', 'north', 'south']) baseFacade(f);

// Fifth Avenue entrance (east face): three sets of metal doors and molded
// piers; the transom window and golden letters are separate parts.
addPart('fifth-avenue-entrance', 'Fifth Avenue entrance', 'base', [
  box(1.4, 6, 10, 64.6 + 0.5, 3, 0), // doors
  box(2.2, 14, 2.4, 64.6 + 0.8, 7, -8), // molded piers
  box(2.2, 14, 2.4, 64.6 + 0.8, 7, 8),
]);
addPart('fifth-avenue-transom', 'Fifth Avenue transom window', 'base', [
  box(1.2, 4.5, 15, 64.6 + 0.4, 11.5, 0), // triple height transom
  box(1.3, 4.5, 0.4, 64.6 + 0.4, 11.5, -5), // geometric pattern bars
  box(1.3, 4.5, 0.4, 64.6 + 0.4, 11.5, 0),
  box(1.3, 4.5, 0.4, 64.6 + 0.4, 11.5, 5),
]);
addPart('empire-state-letters', 'Empire State golden letters', 'base', [
  box(0.6, 2, 22, 64.6 + 0.2, BASE_TOP - 2, 0), // golden letters above the fifth floor
]);
// Sculpted concrete eagles crowning the entrance piers.
addPart('entrance-eagles', 'Entrance eagles', 'base', [
  box(1.6, 2.2, 1.2, 64.6 + 0.9, 15.4, -8),
  box(0.5, 1.6, 3.4, 64.6 + 0.9, 15.8, -8, 0.5),
  box(1.6, 2.2, 1.2, 64.6 + 0.9, 15.4, 8),
  box(0.5, 1.6, 3.4, 64.6 + 0.9, 15.8, 8, -0.5),
]);
// First floor storefronts: aluminum framed doors and windows in black granite.
addPart('storefront-granite-band', 'First floor granite storefronts', 'base', [
  box(129.6, 4.2, 0.9, 0, 2.1, 28.5 + 0.2),
  box(129.6, 4.2, 0.9, 0, 2.1, -(28.5 + 0.2)),
  box(0.9, 4.2, 57.0, 64.6 + 0.2, 2.1, 0),
  box(0.9, 4.2, 57.0, -(64.6 + 0.2), 2.1, 0),
]);
// 33rd Street (south) and 34th Street (north) secondary entrances, one part per
// doorway, each with its modernistic stainless steel canopy.
function sideEntrance(id, name, x, z, zc) {
  addPart(id, name, 'base', [
    box(10, 5, 1.2, x, 2.5, z + (z > 0 ? 0.4 : -0.4)),
    box(12, 0.7, 4.5, x, 5.6, z + (z > 0 ? 2.4 : -2.4)), // canopy
  ]);
}
sideEntrance('entrance-33rd-west', '33rd street west entrance', -20, 28.5);
sideEntrance('entrance-33rd-east', '33rd street east entrance', 20, 28.5);
sideEntrance('entrance-34th-west', '34th street west entrance', -20, -28.5);
sideEntrance('entrance-34th-east', '34th street east entrance', 20, -28.5);
// Horizontal stone sill topping the fifth story.
addPart('base-cornice', 'Base cornice', 'base', [
  box(130.4, 1.2, 58.2, 0, BASE_TOP - 0.6, 0),
]);

// === SHAFT ===
// The 81 story shaft split per setback tier, each tier in four parts: the
// structural core, the limestone piers, the window bays, and the aluminum
// spandrels between floors. Half-widths are schematic; the setback floors
// (21, 25, 30, 72, 81, 85) are documented.
const TIERS = [
  ['6-20', 'floors 6 to 20', 5, 20, 46.3, 10.2],
  ['21-24', 'floors 21 to 24', 21, 24, 41.5, 9.3],
  ['25-29', 'floors 25 to 29', 25, 29, 37.0, 8.4],
  ['30-71', 'floors 30 to 71', 30, 71, 32.0, 7.5],
  ['72-80', 'floors 72 to 80', 72, 80, 26.5, 6.6],
  ['81-84', 'floors 81 to 84', 81, 84, 21.5, 5.8],
  ['85', 'floor 85', 84, 85, 17.0, 5.0],
];
for (const [slug, label, f0, f1, hx, hz] of TIERS) {
  const y0 = H(f0);
  const y1 = H(f1);
  const ym = (y0 + y1) / 2;
  // Structural core.
  addPart(`shaft-${slug}-core`, `Shaft core, ${label}`, 'shaft', [
    box(2 * hx, y1 - y0, 2 * hz, 0, ym, 0),
  ]);
  // Vertical limestone piers on all four faces (rhythm schematic).
  const piers = [];
  const nX = Math.max(3, Math.round((2 * hx) / 10));
  for (let i = 0; i <= nX; i++) {
    const x = -hx + (2 * hx * i) / nX;
    piers.push(box(1.1, y1 - y0, 0.6, x, ym, hz + 0.2));
    piers.push(box(1.1, y1 - y0, 0.6, x, ym, -(hz + 0.2)));
  }
  const nZ = Math.max(2, Math.round((2 * hz) / 10));
  for (let i = 0; i <= nZ; i++) {
    const z = -hz + (2 * hz * i) / nZ;
    piers.push(box(0.6, y1 - y0, 1.1, hx + 0.2, ym, z));
    piers.push(box(0.6, y1 - y0, 1.1, -(hx + 0.2), ym, z));
  }
  addPart(`shaft-${slug}-piers`, `Limestone piers, ${label}`, 'shaft', piers);
  // Window bays between the piers, projecting slightly from the cladding.
  const wins = [];
  for (let i = 0; i < nX; i++) {
    const x = -hx + (2 * hx * (i + 0.5)) / nX;
    const w = (2 * hx) / nX - 1.6;
    wins.push(box(w, y1 - y0 - 1, 0.3, x, ym, hz + 0.05));
    wins.push(box(w, y1 - y0 - 1, 0.3, x, ym, -(hz + 0.05)));
  }
  for (let i = 0; i < nZ; i++) {
    const z = -hz + (2 * hz * (i + 0.5)) / nZ;
    const w = (2 * hz) / nZ - 1.6;
    wins.push(box(0.3, y1 - y0 - 1, w, hx + 0.05, ym, z));
    wins.push(box(0.3, y1 - y0 - 1, w, -(hx + 0.05), ym, z));
  }
  addPart(`shaft-${slug}-windows`, `Window bays, ${label}`, 'shaft', wins);
  // Horizontal aluminum spandrel band at each floor level.
  const spans = [];
  const floors = Math.max(1, Math.round(f1 - f0));
  for (let f = 0; f < floors; f++) {
    const y = y0 + ((y1 - y0) * (f + 1)) / floors - 0.5;
    spans.push(box(2 * hx + 0.4, 1.0, 2 * hz + 0.4, 0, y, 0));
  }
  addPart(`shaft-${slug}-spandrels`, `Aluminum spandrels, ${label}`, 'shaft', spans);
}

// The 16 story Art Deco crown tower above the 86th floor (87-102), used mostly
// for mechanical purposes. Stepped profile is schematic.
{
  const steps = [
    [H(86), 336, 12.5, 4.2],
    [336, 351, 10.5, 3.8],
    [351, 366, 8.5, 3.4],
    [366, ROOF, 7.0, 3.0],
  ];
  const core = [];
  const ledges = [];
  const wins = [];
  for (const [y0, y1, hx, hz] of steps) {
    core.push(box(2 * hx, y1 - y0, 2 * hz, 0, (y0 + y1) / 2, 0));
    ledges.push(box(2 * hx + 0.3, 0.8, 2 * hz + 0.3, 0, y1 - 0.4, 0));
    const nX = Math.max(3, Math.round((2 * hx) / 6));
    for (let i = 0; i < nX; i++) {
      const x = -hx + (2 * hx * (i + 0.5)) / nX;
      wins.push(box((2 * hx) / nX - 1.2, y1 - y0 - 2, 0.3, x, (y0 + y1) / 2, hz + 0.05));
      wins.push(box((2 * hx) / nX - 1.2, y1 - y0 - 2, 0.3, x, (y0 + y1) / 2, -(hz + 0.05)));
    }
  }
  addPart('crown-core', 'Art deco crown core', 'shaft', core);
  addPart('crown-windows', 'Crown window bands', 'shaft', wins);
  addPart('crown-ledges', 'Crown setback ledges', 'shaft', ledges);
  // Mechanical floors 87 to 101 inside the crown (interior, schematic).
  const mech = [];
  for (let f = 87; f <= 101; f++) {
    const y = H(f);
    mech.push(box(16, 0.4, 5, 0, y - 0.2, 0));
    mech.push(box(3, 2.5, 3, -4, y + 1.25, 0)); // equipment blocks
    mech.push(box(3, 2.5, 3, 4, y + 1.25, 0));
  }
  addPart('crown-mechanical', 'Crown mechanical floors', 'shaft', mech);
}

// === TERRACES ===
// Open terrace at each documented setback level (top of the wider segment
// below), each split into its deck and its railing. Widths schematic.
const TERRACE_LEVELS = [
  ['21', '21st floor', H(20), 46.3, 10.2],
  ['25', '25th floor', H(24), 41.5, 9.3],
  ['30', '30th floor', H(29), 37.0, 8.4],
  ['72', '72nd floor', H(71), 32.0, 7.5],
  ['81', '81st floor', H(80), 26.5, 6.6],
  ['85', '85th floor', H(84), 21.5, 5.8],
];
for (const [slug, label, y, hx, hz] of TERRACE_LEVELS) {
  addPart(`terrace-${slug}-deck`, `${label} setback terrace deck`, 'terraces', [
    box(2 * hx + 1.5, 1.1, 2 * hz + 1.5, 0, y - 0.55, 0),
  ]);
  const rail = [];
  const rh = 1.1;
  const px = hx + 0.7;
  const pz = hz + 0.7;
  rail.push(box(2 * px, 0.15, 0.15, 0, y + rh, pz));
  rail.push(box(2 * px, 0.15, 0.15, 0, y + rh, -pz));
  rail.push(box(0.15, 0.15, 2 * pz, px, y + rh, 0));
  rail.push(box(0.15, 0.15, 2 * pz, -px, y + rh, 0));
  for (let x = -px; x <= px + 0.01; x += 4) {
    rail.push(box(0.15, rh, 0.15, x, y + rh / 2, pz));
    rail.push(box(0.15, rh, 0.15, x, y + rh / 2, -pz));
  }
  for (let z = -pz; z <= pz + 0.01; z += 4) {
    rail.push(box(0.15, rh, 0.15, px, y + rh / 2, z));
    rail.push(box(0.15, rh, 0.15, -px, y + rh / 2, z));
  }
  addPart(`terrace-${slug}-railing`, `${label} setback terrace railing`, 'terraces', rail);
}

// === OBSERVATORIES ===
// 86th floor: open air deck at 1,050 ft (320 m). Split into the deck with its
// railing, the enclosed gallery band, and the telescope stands.
{
  const deck = [box(37.5, 1.2, 12.4, 0, OBS86 + 0.6, 0)];
  const rh = 1.3;
  const px = 18.4;
  const pz = 5.9;
  const dy = OBS86 + 1.2;
  deck.push(box(2 * px, 0.15, 0.15, 0, dy + rh, pz));
  deck.push(box(2 * px, 0.15, 0.15, 0, dy + rh, -pz));
  deck.push(box(0.15, 0.15, 2 * pz, px, dy + rh, 0));
  deck.push(box(0.15, 0.15, 2 * pz, -px, dy + rh, 0));
  for (let x = -px; x <= px + 0.01; x += 3) {
    deck.push(box(0.15, rh, 0.15, x, dy + rh / 2, pz));
    deck.push(box(0.15, rh, 0.15, x, dy + rh / 2, -pz));
  }
  addPart('obs-86-deck', '86th floor open air deck', 'observatories', deck);
}
{
  const gal = [box(35.5, 3.7, 10.8, 0, H(85) + 1.85, 0)];
  for (let x = -15; x <= 15.01; x += 5) {
    gal.push(box(3.4, 2.4, 0.3, x, H(85) + 1.85, 5.4 + 0.05));
    gal.push(box(3.4, 2.4, 0.3, x, H(85) + 1.85, -(5.4 + 0.05)));
  }
  addPart('obs-86-gallery', '86th floor enclosed gallery', 'observatories', gal);
}
{
  // Coin operated binocular stands (schematic).
  const scopes = [];
  const dy = OBS86 + 1.2;
  for (const bx of [-9, -3, 3, 9]) {
    scopes.push(cyl(0.18, 0.24, 1.1, bx, dy + 0.55, 5.9 - 0.6, 8));
    scopes.push(box(0.7, 0.3, 0.3, bx, dy + 1.2, 5.9 - 0.6));
  }
  addPart('obs-86-telescopes', '86th floor telescope stands', 'observatories', scopes);
}
// 102nd floor: enclosed observatory capping the crown at the 1,250 ft roof.
{
  const enc = [box(14.8, 4.5, 6.9, 0, 374, 0), box(14.2, 0.8, 6.3, 0, 371.6, 0)];
  for (let x = -7; x <= 7.01; x += 3.5) {
    enc.push(box(0.25, 4.5, 0.25, x, 374, 3.3));
    enc.push(box(0.25, 4.5, 0.25, x, 374, -3.3));
  }
  addPart('obs-102-enclosure', '102nd floor glass enclosure', 'observatories', enc);
  addPart('obs-102-roof', '102nd floor observation roof', 'observatories', [
    box(14.8, 0.7, 6.9, 0, 378.6, 0),
  ]);
}
// 80th floor: indoor observatory opened 2019 (interior, schematic layout),
// plus the skyline mural drawn by Stephen Wiltshire.
{
  const y = H(80);
  addPart('obs-80-interior', '80th floor indoor observatory', 'observatories', [
    box(50, 0.6, 12, 0, y - 0.3, 0), // floor plate
    box(50, 3, 0.5, 0, y + 1.5, 5.7), // exhibit walls
    box(50, 3, 0.5, 0, y + 1.5, -5.7),
    box(20, 2.2, 0.4, -12, y + 1.1, 0), // exhibit partitions
    box(16, 2.2, 0.4, 12, y + 1.1, 0),
  ]);
  addPart('obs-80-mural', '80th floor skyline mural', 'observatories', [
    box(24, 2.6, 0.3, 0, y + 1.3, -5.3), // mural panel
    box(24.6, 0.3, 0.4, 0, y + 2.75, -5.3), // frame
    box(24.6, 0.3, 0.4, 0, y - 0.15, -5.3),
  ]);
}
// Observatory visitor entrance at 20 West 34th Street (north face).
addPart('observatory-entrance', 'Observatory entrance, 20 west 34th street', 'observatories', [
  box(12, 5.5, 1.2, 0, 2.75, -(28.5 + 0.4)),
  box(14, 0.7, 5, 0, 6, -(28.5 + 2.6)), // canopy
  box(0.8, 3.2, 6, -5, 1.6, -(28.5 + 1.5)), // queue rails
  box(0.8, 3.2, 6, 5, 1.6, -(28.5 + 1.5)),
]);

// === MAST ===
// Above the 102nd story: the stepped steel mooring mast (dirigible docking was
// planned, then abandoned), carrying the broadcast antennas and lightning rod.
// 381 m roof + 203 ft (61.9 m) pinnacle = 443.2 m tip.
addPart('mast-tier-1', 'Mooring mast, tier 1', 'mast', [
  cyl(3.4, 4.6, 16, 0, ROOF + 8, 0), // 381-397
]);
addPart('mast-tier-2', 'Mooring mast, tier 2', 'mast', [
  cyl(2.3, 3.4, 16, 0, ROOF + 24, 0), // 397-413
]);
addPart('mast-tier-3', 'Mooring mast, tier 3', 'mast', [
  cyl(1.4, 2.3, 16, 0, ROOF + 40, 0), // 413-429
]);
addPart('mast-collar', 'Mooring mast base collar', 'mast', [
  box(7.4, 1.2, 7.4, 0, ROOF + 0.6, 0),
]);
// Schematic docking ring at the equivalent of the 106th floor, where airships
// would have been moored to the spire.
addPart('mast-docking-ring', 'Dirigible docking ring', 'mast', [
  hTorus(4.6, 0.45, 0, 396, 0),
]);
// The 103rd floor, originally planned as the airship docking station, now
// contains electrical equipment and has an exterior balcony.
{
  const bal = [box(9.5, 0.5, 9.5, 0, 384.7, 0)];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    bal.push(cyl(0.08, 0.08, 1.1, Math.cos(a) * 4.4, 385.5, Math.sin(a) * 4.4, 6));
  }
  bal.push(hTorus(4.4, 0.08, 0, 386, 0));
  addPart('mast-103-balcony', '103rd floor balcony', 'mast', bal);
}
// Broadcast antennas covering much of the pinnacle (schematic arrangement).
{
  const whips = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    whips.push(cyl(0.28, 0.28, 26, Math.cos(a) * 2.9, 416, Math.sin(a) * 2.9, 8));
  }
  addPart('mast-whips', 'Broadcast antenna whips', 'mast', whips);
  const panels = [];
  for (const [x, z, ry] of [[3.6, 0, 0], [-3.6, 0, 0], [0, 3.6, Math.PI / 2], [0, -3.6, Math.PI / 2]]) {
    panels.push(box(0.3, 18, 2.6, x, 414, z, ry));
  }
  addPart('mast-panels', 'Broadcast panel antennas', 'mast', panels);
}
// Separate set of FM antennae built in 1965, ringing the 103rd floor.
addPart('mast-fm-ring', 'FM antenna ring, 1965', 'mast', [
  hTorus(5.4, 0.3, 0, 385, 0),
]);
// Lightning rod surmounting the pinnacle; its tip is the 443.2 m point.
addPart('lightning-rod', 'Lightning rod', 'mast', [
  cyl(0.12, 0.45, TIP - 429, 0, 429 + (TIP - 429) / 2, 0, 8),
]);

// === CROWN LIGHTING ===
// Architectural lighting across its history (fixture positions schematic).
addPart('lights-searchlights', 'Original rooftop searchlights', 'lighting', [
  box(1.2, 1, 1.2, 2.8, 420, 0),
  box(1.2, 1, 1.2, -2.8, 420, 0),
]);
addPart('lights-freedom', 'Freedom lights, 1956', 'lighting', [
  box(1, 1, 1, 3.2, 430, 0),
  box(1, 1, 1, -3.2, 430, 0),
  box(1, 1, 1, 0, 430, 3.2),
  box(1, 1, 1, 0, 430, -3.2),
]);
{
  // February 1964: flood lights on the 72nd floor for the Worlds Fair.
  const geoms = [];
  for (let i = 0; i < 16; i++) {
    const x = -30 + (60 * i) / 15;
    geoms.push(box(1, 1, 1, x, H(71) + 1.2, 7.8));
    geoms.push(box(1, 1, 1, x, H(71) + 1.2, -7.8));
  }
  addPart('lights-72', '72nd floor floodlights', 'lighting', geoms);
}
{
  // Schematic light rings on the mast and the 86th floor deck.
  const geoms = [];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    geoms.push(box(0.9, 0.9, 0.9, Math.cos(a) * 3.6, 414, Math.sin(a) * 3.6));
  }
  for (let i = 0; i < 12; i++) {
    const x = -16.5 + (33 * i) / 11;
    geoms.push(box(0.8, 0.8, 0.8, x, OBS86 + 2.1, 5.9));
  }
  addPart('lights-rings', 'Mast and deck light rings', 'lighting', geoms);
}
{
  // 2012: 1,200 computer controlled LED fixtures on the crown.
  const geoms = [];
  for (const [y1, hx, hz] of [[336, 12.5, 4.2], [351, 10.5, 3.8], [366, 8.5, 3.4], [ROOF, 7.0, 3.0]]) {
    const y = y1 - 1;
    for (const [x, z] of [[-hx, 0], [hx, 0], [0, -hz], [0, hz], [-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) {
      geoms.push(box(0.7, 0.7, 0.7, x, y, z));
    }
  }
  addPart('lights-led', 'LED crown fixtures', 'lighting', geoms);
}

// === LOBBY ===
// Three story Art Deco lobby interior (inside the base; revealed in exploded
// view). Layout schematic; materials and motifs sourced.
{
  const cols = [];
  for (const cx of [-24, -12, 0, 12, 24]) {
    for (const cz of [-8, 8]) cols.push(cyl(0.8, 0.9, 11, cx, 5.5, cz, 10));
  }
  addPart('lobby-columns', 'Lobby marble columns', 'lobby', cols);
}
{
  // Two tiers of marble: darker wainscoting topped by lighter marble.
  addPart('lobby-walls', 'Lobby marble walls', 'lobby', [
    box(62, 1.6, 0.7, 0, 0.8, 12.65),
    box(62, 1.6, 0.7, 0, 0.8, -12.65),
    box(62, 3, 0.6, 0, 9.5, 12.7),
    box(62, 3, 0.6, 0, 9.5, -12.7),
  ]);
  addPart('lobby-ceiling', 'Lobby ceiling slab', 'lobby', [
    box(62, 0.8, 26, 0, 11.2, 0),
  ]);
}
{
  // Zigzag terrazzo floor, pattern running east to west (schematic).
  const geoms = [box(62, 0.5, 26, 0, 0.25, 0)];
  for (let i = 0; i < 24; i++) {
    const x = -29 + i * 2.5;
    geoms.push(box(1.6, 0.12, 20, x, 0.55, 0, i % 2 ? 0.5 : -0.5));
  }
  addPart('lobby-terrazzo', 'Lobby terrazzo floor', 'lobby', geoms);
}
{
  // Sky and Machine Age ceiling mural (reproductions; schematic panel).
  addPart('lobby-mural', 'Lobby ceiling mural', 'lobby', [
    box(40, 0.25, 16, 0, 10.75, 0),
    box(38, 0.15, 2, 0, 10.6, 0, 0.3),
    box(30, 0.15, 2, 0, 10.6, 0, -0.3),
  ]);
}
{
  // Bronze motifs above the doorways: Electricity, Masonry, Heating.
  const geoms = [];
  for (const mx of [-8, 0, 8]) {
    geoms.push(box(3.2, 4, 0.5, mx, 8, 12.3));
    geoms.push(box(2.2, 0.6, 0.6, mx, 6.2, 12.3));
    geoms.push(box(0.6, 2.2, 0.6, mx, 8.6, 12.3));
  }
  addPart('lobby-bronze', 'Lobby bronze motifs', 'lobby', geoms);
}
{
  // Information desk; the 2009 renovation replaced its clock with an anemometer.
  const geoms = [box(10, 1.2, 3, 0, 0.6, -6)];
  geoms.push(cyl(0.1, 0.1, 1.5, 0, 2, -6, 6));
  geoms.push(new THREE.SphereGeometry(0.25, 8, 6).translate(0, 2.9, -6));
  addPart('lobby-desk', 'Lobby information desk', 'lobby', geoms);
}
{
  // Aluminum relief at the west end: the building as built, without the
  // antenna, with rays from the spire and the sun behind it (schematic).
  const geoms = [box(0.4, 5, 8, -29.8, 2.5, 0)];
  for (let k = 0; k < 5; k++) {
    const a = -0.6 + k * 0.3;
    const ray = new THREE.BoxGeometry(0.2, 3.2, 0.2);
    ray.rotateZ(a);
    ray.translate(-29.4 + Math.cos(a + Math.PI / 2) * 1.4, 4.6 + Math.sin(a + Math.PI / 2) * 1.4, 0);
    geoms.push(ray);
  }
  addPart('lobby-relief', 'Lobby aluminum relief', 'lobby', geoms);
}
{
  // One set of double doors between a pair of revolving doors (schematic).
  const geoms = [box(0.4, 3, 3, 31, 1.5, 0)];
  for (const dz of [-5, 5]) geoms.push(cyl(1.8, 1.8, 3.2, 30, 1.6, dz, 10));
  addPart('lobby-doors', 'Lobby revolving doors', 'lobby', geoms);
}
{
  // Escalators at the west ends of the north and south walls to a mezzanine.
  const geoms = [];
  for (const ez of [-12, 12]) {
    const g = new THREE.BoxGeometry(2, 0.5, 8);
    g.rotateX(ez > 0 ? 0.45 : -0.45);
    g.translate(-20, 2.2, ez);
    geoms.push(g);
  }
  addPart('lobby-escalators', 'Lobby escalators', 'lobby', geoms);
}

// === STEEL FRAME ===
// Riveted steel frame, revealed in exploded view. Column counts per floor are
// sourced (210); the grids shown are schematic.
function columnGrid(y0, y1, hx, hz) {
  const geoms = [];
  for (let x = -hx + 2; x <= hx - 2 + 0.01; x += 8) {
    for (let z = -hz + 2; z <= hz - 2 + 0.01; z += 8) {
      geoms.push(cyl(0.55, 0.55, y1 - y0, x, (y0 + y1) / 2, z, 8));
    }
  }
  return geoms;
}
addPart('columns-low', 'Steel columns, floors 1 to 30', 'steel-frame', columnGrid(0, H(30), 46.3, 10.2));
addPart('columns-mid', 'Steel columns, floors 31 to 71', 'steel-frame', columnGrid(H(30), H(71), 32.0, 7.5));
addPart('columns-high', 'Steel columns, floors 72 to 86', 'steel-frame', columnGrid(H(71), OBS86, 17.0, 5.0));
addPart('columns-crown', 'Steel columns, crown tower', 'steel-frame', columnGrid(OBS86, ROOF, 12.5, 4.2));
// Central shaft grouping the utilities.
addPart('utility-core', 'Central utility shaft', 'steel-frame', [
  box(7, ROOF, 7, 0, ROOF / 2, 0),
]);
// Typical office floor plates (interior, schematic).
{
  const geoms = [];
  for (const [, , f0, , hx, hz] of TIERS) {
    geoms.push(box(2 * hx - 2, 0.5, 2 * hz - 2, 0, H(f0) + 0.25, 0));
  }
  addPart('floor-plates', 'Typical office floor plates', 'steel-frame', geoms);
}
// Girders tying the frame at each setback level (schematic).
{
  const geoms = [];
  const levels = [
    [H(20), 46.3, 10.2],
    [H(24), 41.5, 9.3],
    [H(29), 37.0, 8.4],
    [H(71), 32.0, 7.5],
    [H(80), 26.5, 6.6],
    [H(84), 21.5, 5.8],
    [OBS86, 17.0, 5.0],
  ];
  for (const [y, hx, hz] of levels) {
    geoms.push(box(2 * hx, 1.4, 1.4, 0, y, 0));
    geoms.push(box(1.4, 1.4, 2 * hz, 0, y, 0));
  }
  addPart('girders-setback', 'Setback level girder rings', 'steel-frame', geoms);
}
{
  const geoms = [];
  for (const [y, hx, hz] of [[336, 12.5, 4.2], [351, 10.5, 3.8], [366, 8.5, 3.4], [ROOF, 7.0, 3.0]]) {
    geoms.push(box(2 * hx, 1.2, 1.2, 0, y, 0));
    geoms.push(box(1.2, 1.2, 2 * hz, 0, y, 0));
  }
  addPart('girders-crown', 'Crown tower girder rings', 'steel-frame', geoms);
}

// === ELEVATORS ===
// 73 elevators in vertical banks in the central core (arrangement schematic).
function elevatorBank(id, name, x0, z, y0, top, n = 4) {
  const geoms = [];
  for (let i = 0; i < n; i++) {
    geoms.push(box(2.6, top - y0, 2.6, x0 + i * 4.5, (y0 + top) / 2, z));
  }
  addPart(id, name, 'elevators', geoms);
}
elevatorBank('elevators-express', 'Express elevators, lobby to 80th floor', -13.5, -6, 0, H(80));
elevatorBank('elevators-local-low', 'Low rise local elevators', -13.5, -3, 0, H(30));
elevatorBank('elevators-local-mid', 'Mid rise local elevators', -13.5, 0, 0, H(72));
elevatorBank('elevators-local-high', 'High rise local elevators', -13.5, 3, 0, OBS86);
elevatorBank('elevators-freight', 'Freight elevators', -13.5, 6, 0, H(80));
elevatorBank('elevators-shuttle-80-86', '80th to 86th shuttle elevators', 6, -2.5, H(80), OBS86, 2);
elevatorBank('elevators-shuttle-86-102', '86th to 102nd observatory elevator', 6, 2.5, OBS86, ROOF, 1);

// ---------------------------------------------------------------- metadata
const SYSTEMS = [
  { id: 'foundations', name: 'Foundations', color: '#8A8D91', description: 'Concrete footings and bedrock anchors below street level, carrying the 365,000 short ton weight of the building.' },
  { id: 'base', name: 'Base', color: '#E9DFC6', description: 'The five story Indiana limestone base filling the whole city block, with the Fifth Avenue entrance and the storefronts.' },
  { id: 'shaft', name: 'Shaft', color: '#DFD2B4', description: 'The 81 story setback shaft between the base and the crown, clad in limestone with steel framed windows.' },
  { id: 'terraces', name: 'Setback terraces', color: '#6F7F5E', description: 'Open terraces at each setback level, stepping the tower back as required by the 1916 Zoning Resolution.' },
  { id: 'observatories', name: 'Observatories', color: '#8FB8D8', description: 'The 80th, 86th, and 102nd floor observatories, visited by about four million tourists a year.' },
  { id: 'mast', name: 'Mast', color: '#C7CCD1', description: 'The mooring mast and pinnacle above the 102nd floor, first planned for docking dirigibles and now carrying broadcast antennas.' },
  { id: 'lighting', name: 'Crown lighting', color: '#FFD97A', description: 'Architectural lighting for the crown, from the 1964 Worlds Fair floodlights to the 1,200 LED fixtures of 2012.' },
  { id: 'lobby', name: 'Lobby', color: '#C9B896', description: 'The three story Art Deco lobby interior, with marble, terrazzo, bronze motifs, and a sky mural.' },
  { id: 'steel-frame', name: 'Steel frame', color: '#5A626B', description: 'The riveted steel frame and the central utility core, revealed when the model is exploded.' },
  { id: 'elevators', name: 'Elevators', color: '#B08D57', description: 'The 73 elevators in vertical banks in the central core, with express shuttles to the observatories.' },
];

// Explanations keyed by lowercase part name. Every fact comes from the
// Wikipedia article or the Structurae entry opened for this model; placement
// and proportions not stated on those pages are schematic.
const EXPLANATIONS = {
  'foundation footings': 'Concrete footings spread the 365,000 short ton weight of the building onto the rock below. Depth and spread shown here are schematic.',
  'bedrock anchor slab': 'A rock anchor slab ties the footings to Manhattan bedrock. Shown schematically below street level.',
  'five story limestone base': 'The five story base occupies the entire lot, with the 81 story shaft set back sharply above it. The facade is clad in Indiana limestone panels that give the building its signature blonde color.',
  'fifth avenue entrance': 'The main entrance sits at the center of the Fifth Avenue elevation: three sets of metal doors flanked by molded piers.',
  'fifth avenue transom window': 'A triple height transom window with geometric patterns sits above the main entrance.',
  'empire state golden letters': 'Golden letters spelling Empire State sit above the fifth floor windows.',
  'entrance eagles': 'A pair of sculpted concrete eagles crowns the molded piers that flank the Fifth Avenue entrance.',
  'first floor granite storefronts': 'The first floor storefronts use aluminum framed doors and windows set within black granite cladding.',
  '33rd street west entrance': 'One of two entrances on 33rd Street, carrying a modernistic stainless steel canopy. The triple windows above the secondary entrances are less elaborate than those on Fifth Avenue.',
  '33rd street east entrance': 'One of two entrances on 33rd Street, carrying a modernistic stainless steel canopy. The triple windows above the secondary entrances are less elaborate than those on Fifth Avenue.',
  '34th street west entrance': 'One of two entrances on 34th Street, carrying a modernistic stainless steel canopy. The triple windows above the secondary entrances are less elaborate than those on Fifth Avenue.',
  '34th street east entrance': 'One of two entrances on 34th Street, carrying a modernistic stainless steel canopy. The triple windows above the secondary entrances are less elaborate than those on Fifth Avenue.',
  'base cornice': 'The fifth story is topped by a horizontal stone sill, marking the top of the five story base.',
  'art deco crown core': 'The 16 story, 200 foot (61 m) metal crown above the 86th floor. The spire does not contain intermediate levels and is used mostly for mechanical purposes.',
  'crown window bands': 'Schematic window bands on the crown tower.',
  'crown setback ledges': 'The stepped ledges of the Art Deco crown profile. The stepping is schematic.',
  'crown mechanical floors': 'Mechanical floors between the 87th and 101st floors, inside the crown. The elevator between the 86th and 102nd floors also serves employees reaching these floors. Layout is schematic.',
  '86th floor open air deck': 'The 86th floor observatory pairs an enclosed viewing gallery with this open air outdoor viewing area at 1,050 feet (320 m), so it can stay open 365 days a year regardless of the weather.',
  '86th floor enclosed gallery': 'The enclosed viewing gallery of the 86th floor observatory.',
  '86th floor telescope stands': 'Viewing stands on the 86th floor deck. Fixture positions are schematic.',
  '102nd floor glass enclosure': 'The 102nd floor observatory is completely enclosed and much smaller than the 86th. It was redesigned in 2019 with floor to ceiling windows.',
  '102nd floor observation roof': 'The roof of the 102nd floor observatory at the 1,250 foot (381 m) roof height.',
  '80th floor indoor observatory': 'An indoor observatory on the 80th floor opened in 2019 with exhibits and hands on displays about the building history.',
  '80th floor skyline mural': 'A mural of the skyline drawn by British artist Stephen Wiltshire, installed in the 80th floor observatory. Shown schematically.',
  'observatory entrance, 20 west 34th street': 'Visitors to the observatories enter at 20 West 34th Street. Before August 2018 they entered through the Fifth Avenue lobby.',
  'mooring mast, tier 1': 'The lowest stacked tier of the mooring mast above the 102nd story. The mast was first planned for docking zeppelins and other airships, but the plan was abandoned because high winds made docking impossible. Tier divisions are schematic.',
  'mooring mast, tier 2': 'The middle stacked tier of the mooring mast. The mast holds a 158 foot hollow steel shaft fitted with elevators and utilities. Tier divisions are schematic.',
  'mooring mast, tier 3': 'The upper stacked tier of the mooring mast. As constructed, the mast contains four rectangular tiers topped by a cylindrical shaft with a conical pinnacle. Tier divisions are schematic.',
  'mooring mast base collar': 'Base collar where the mooring mast meets the 102nd story. Shown schematically.',
  'dirigible docking ring': 'Schematic docking ring at the equivalent of the 106th floor, where airships would have been moored to the spire. No dirigible ever docked here.',
  '103rd floor balcony': 'The 103rd floor, originally planned as the airship docking station, now contains electrical equipment and has an exterior balcony. Shown schematically.',
  'broadcast antenna whips': 'Broadcast antenna whips on the pinnacle. Much of the 203 foot (61.9 m) pinnacle is covered by broadcast antennas. Arrangement is schematic.',
  'broadcast panel antennas': 'Broadcast panel antennas on the pinnacle. A dedicated 200 foot broadcast tower was completed in 1953. Arrangement is schematic.',
  'fm antenna ring, 1965': 'A separate set of FM antennae built in 1965, ringing the 103rd floor observation area as a master antenna. Shown schematically.',
  'lightning rod': 'A lightning rod surmounts the pinnacle at the very top, reaching the 1,454 foot (443.2 m) tip.',
  'original rooftop searchlights': 'The building was originally equipped with white searchlights at the top. They were first used in November 1932 when they lit up to signal the Roosevelt victory over Hoover in the presidential election.',
  'freedom lights, 1956': 'Four "Freedom Lights" installed in 1956, replacing the original searchlights.',
  '72nd floor floodlights': 'Flood lights were added on the 72nd floor in February 1964 to illuminate the top of the building at night so it could be seen from the Worlds Fair later that year.',
  'mast and deck light rings': 'Schematic light rings on the mooring mast and the 86th floor deck.',
  'led crown fixtures': 'In 2012, four hundred metal halide lamps and floodlights were replaced with 1,200 computer controlled LED fixtures, raising the available colors from nine to over 16 million. Fixture positions are schematic.',
  'lobby marble columns': 'Marble columns in the three story lobby. Layout is schematic.',
  'lobby marble walls': 'The lobby contains two tiers of marble: a wainscoting of darker marble, topped by lighter marble. Wall layout is schematic.',
  'lobby ceiling slab': 'The ceiling slab of the three story lobby. The original ceilings held an Art Deco mural, shown as a separate part. Layout is schematic.',
  'lobby terrazzo floor': 'A zigzagging terrazzo tile pattern crosses the lobby floor from east to west.',
  'lobby ceiling mural': 'An Art Deco mural inspired by the sky and the Machine Age was installed in the lobby ceilings. Reproductions were installed after the originals were damaged.',
  'lobby bronze motifs': 'Above each lobby doorway sits a bronze motif depicting one of three crafts used in construction: Electricity, Masonry, and Heating.',
  'lobby information desk': 'The information desk in the Fifth Avenue lobby. A 2009 renovation replaced the clock over the desk with an anemometer.',
  'lobby aluminum relief': 'An aluminum relief of the skyscraper as it was originally built, without the antenna, at the west end of the lobby, with rays radiating from the spire and the sun behind it. Shown schematically.',
  'lobby revolving doors': 'The lobby entrance holds one set of double doors between a pair of revolving doors. Shown schematically.',
  'lobby escalators': 'Escalators at the west ends of the north and south lobby walls lead to a mezzanine level. Shown schematically.',
  'steel columns, floors 1 to 30': 'Riveted steel columns in the low range. The riveted steel frame was designed to handle all of the gravitational stresses and wind loads. Each floor is pierced by 210 structural columns; the grid shown is schematic.',
  'steel columns, floors 31 to 71': 'Riveted steel columns in the middle range. Each floor is pierced by 210 structural columns; the grid shown is schematic.',
  'steel columns, floors 72 to 86': 'Riveted steel columns in the high range. Each floor is pierced by 210 structural columns; the grid shown is schematic.',
  'steel columns, crown tower': 'Riveted steel columns inside the crown tower. The grid shown is schematic.',
  'central utility shaft': 'Utilities are grouped in a central shaft. On the 6th through 86th stories the shaft is surrounded by a main corridor on all four sides.',
  'typical office floor plates': 'Typical office floor plates. The corridor is surrounded in turn by office space 28 feet (8.5 m) deep. Shown schematically.',
  'setback level girder rings': 'Steel girders tie the frame at each setback level. The structure rates 42 pounds per square foot of structural stiffness.',
  'crown tower girder rings': 'Steel girders tie the crown tower frame. Shown schematically.',
  'express elevators, lobby to 80th floor': 'Four express elevators originally connected the lobby, the 80th floor, and landings in between. The original 64 elevators were built by the Otis Elevator Company.',
  'low rise local elevators': 'Local elevators serve the low rise floors. Of the original 64 elevators, 54 were local cars for passengers. Bank arrangement is schematic.',
  'mid rise local elevators': 'Local elevators serve the mid rise floors. The setbacks correspond to the tops of the elevator shafts. Bank arrangement is schematic.',
  'high rise local elevators': 'Local elevators serve the high rise floors and the 86th floor observatory. Bank arrangement is schematic.',
  'freight elevators': 'Eight of the original elevators were for freight deliveries. Shown schematically.',
  '80th to 86th shuttle elevators': 'Additional elevators connect the 80th floor to the six floors above it, since the six extra floors were approved after the original 80 stories.',
  '86th to 102nd observatory elevator': 'An elevator connects the 86th and 102nd floor observatories, and lets employees reach the mechanical floors between the 87th and 101st floors.',
};
for (const [face, label] of [['east', 'east'], ['west', 'west'], ['north', 'north'], ['south', 'south']]) {
  EXPLANATIONS[`base ${face} facade`] = `Indiana limestone panels on the base ${label} facade, made by the Indiana Limestone Company from stone quarried in south-central Indiana. The second through fourth stories alternate windows with wide stone piers and narrower mullions. Pier and window rhythm is schematic.`;
}
for (const [slug, label, f0, f1] of TIERS) {
  EXPLANATIONS[`shaft core, ${label}`] = `The structural core of the ${label} run of the 81 story shaft. Interior office space is at most 28 feet (8.5 m) deep, ringing the central core. Setback widths are schematic.`;
  EXPLANATIONS[`limestone piers, ${label}`] = `Indiana limestone piers on the ${label} run. The tower bays are separated by alternating narrow and wide piers, a rhythm possibly influenced by the contemporary Daily News Building. Pier spacing is schematic.`;
  EXPLANATIONS[`window bays, ${label}`] = `Window bays on the ${label} run. The windows project slightly from the limestone cladding and are arranged in bays of one, two, or three per floor, separated by vertical nickel-chrome steel mullions within stainless steel frames. Window layout is schematic.`;
  EXPLANATIONS[`aluminum spandrels, ${label}`] = `Horizontal aluminum spandrel bands between the floors of the ${label} run. Using aluminum spandrels instead of stone avoided the need for cross-bonding. Band positions are schematic.`;
}
for (const [slug, label] of TERRACE_LEVELS.map(([s, l]) => [s, l])) {
  EXPLANATIONS[`${label} setback terrace deck`] = `Terrace deck above the ${label} setback. The setbacks were mandated by the 1916 Zoning Resolution so sunlight could reach the streets.`;
  EXPLANATIONS[`${label} setback terrace railing`] = `Safety railing around the ${label} setback terrace. Railing geometry is schematic.`;
}
for (const p of parts) {
  if (!EXPLANATIONS[p.name.toLowerCase()]) {
    throw new Error(`Missing explanation for part "${p.name}"`);
  }
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
const binName = 'empire-state-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// validate-atlas.mjs resolves chunk files by basename under public/models, so
// keep a same-bytes copy there too; the canonical viewer path is the chunk url.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Empire State Building, New York City',
  title: 'Empire State Building',
  location: 'New York City, USA',
  blurb:
    "The 102 story Art Deco skyscraper at 350 Fifth Avenue in Manhattan, the world's tallest building from 1931 to 1970. Its Indiana limestone tower, twin observatories, and dirigible mooring mast made it a global icon.",
  sourceUrls: [
    { label: 'Empire State Building, Wikipedia', url: 'https://en.wikipedia.org/wiki/Empire_State_Building' },
    { label: 'Empire State Building (Manhattan, 1931), Structurae', url: 'https://structurae.net/en/structures/empire-state-building' },
  ],
  systems: SYSTEMS,
  explanations: EXPLANATIONS,
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
  chunks: [{ url: '/models/empire-state/empire-state-0.bin', bytes: offset }],
  triangles,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
