// Procedural Petronas Towers for the Architectural Atlas.
//
// Builds schematic, correctly proportioned Petronas Twin Towers in code
// and writes them in the atlas binary format:
//   public/models/petronas-towers/atlas.json
//   public/models/petronas-towers/petronas-towers-0.bin
//
// Sourced dimensions and facts (verified via web search 2026-10-10):
//   twin skyscrapers in Kuala Lumpur, Malaysia, designed by Argentine
//   architect Cesar Pelli (Cesar Pelli and Associates, with KLCC
//   architects); postmodern Islamic architecture; groundbreaking 1
//   January 1992, construction from 1 March 1993, completed June 1996,
//   opened 31 August 1999 by Prime Minister Mahathir Mohamad; cost
//   US$1.6 billion; 88 floors (5 underground); architectural height
//   451.9 m (1,483 ft), tip 451.9 m, roof about 405 m, top floor 375 m
//   (level 88), observatory 370 m (level 86); tallest buildings in the
//   world 1998 to 2004, still the tallest twin towers in the world;
//   floor plan of each tower is an eight-pointed star formed by two
//   interlocking squares, an Islamic geometric motif standing for unity,
//   harmony, stability and rationality; stainless steel (65,000 sq m)
//   and glass (77,000 sq m) facade with Islamic patterns; tube-in-tube
//   structural system with a stiff central core; foundation of a 4.5 m
//   thick concrete raft on 104 barrette piles 60 to 115 m deep, among
//   the deepest foundations in the world; the double-decker skybridge
//   joins the towers at levels 41 and 42, 58.4 m long, 170 m above
//   street level, weighing 750 tons, not rigidly fixed so it can move
//   independently of the towers in wind, and serving as a fire escape;
//   29 double-deck high-speed passenger lifts per tower (38 lifts per
//   tower total per some sources), 10 escalators per tower; built on the
//   site of a former horse race track; Tower 1 built by Hazama
//   Corporation, Tower 2 by Samsung C&T; Entrapment (1999) stages its
//   climactic heist at the towers; the Independence Day: Resurgence
//   (2016) trailer shows the towers collapsing onto London.
// Schematic (not sourced, never stated as fact in the UI): exact tower
// spacing and footprint size; number, heights and profiles of the
// setback sections; spire and pinnacle profiles; podium, lobby,
// concourse, mosque and garden layouts; skybridge strut arrangement;
// facade band divisions and mullion counts; lift car, core, escalator
// and sky lobby positions; mechanical floor positions; park and
// fountain layout; aircraft warning light positions.
//
// Coordinate frame: x = between the towers (Tower 1 west at -x, Tower 2
// east at +x), z = depth, y = up. All dimensions in meters.
//
// Granularity: 102 named parts across 9 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-petronas-towers.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'petronas-towers');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (451.9 m) maps to 2.4 units.
const S = 2.4 / 460;

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
// Eight-pointed star prism (two interlocking squares): a 16-segment
// cylinder with alternate rim vertices pulled inward, then normals
// recomputed. Indexed, like the other helpers.
function starCyl(rOutB, rInB, rOutT, rInT, h, x, y, z) {
  const g = new THREE.CylinderGeometry(rOutT, rOutB, h, 16, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i), vz = pos.getZ(i);
    const rad = Math.hypot(vx, vz);
    if (rad < 1e-6) continue;
    const ang = Math.atan2(vz, vx);
    const k = Math.round(ang / (Math.PI / 8));
    if ((((k % 2) + 2) % 2) === 1) {
      const t = (pos.getY(i) + h / 2) / h;
      const rO = rOutB + (rOutT - rOutB) * t;
      const rI = rInB + (rInT - rInB) * t;
      const s = rI / rO;
      pos.setX(i, vx * s);
      pos.setZ(i, vz * s);
    }
  }
  g.computeVertexNormals();
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

const T1X = -45, T2X = 45; // tower centers
// Eight shaft sections with schematic setback radii (outer/inner).
const SECTIONS = [
  [20, 70, 24, 19.7], [70, 120, 23, 18.9], [120, 170, 22, 18.0],
  [170, 220, 20.5, 16.8], [220, 270, 19, 15.6], [270, 315, 17.5, 14.4],
  [315, 345, 16, 13.1], [345, 375, 14, 11.5],
];

// --- Foundations: 4.5 m rafts on deep barrette piles: 4 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`foundation-raft-tower-${tn}`, `Foundation raft tower ${tn}`, 'foundations', [
    box(tx - 30, tx + 30, -8, -3.5, -30, 30),
  ]);
  const piles = [];
  for (const [px, pz] of [[-18, -18], [0, -18], [18, -18], [-18, 0], [18, 0], [-18, 18], [0, 18], [18, 18]]) {
    piles.push(cyl(1.5, 1.5, 22, tx + px, -19, pz, 8));
  }
  addPart(`barrette-piles-tower-${tn}`, `Barrette piles tower ${tn}`, 'foundations', piles);
}

// --- Podium: two podium blocks, lobbies, concourse, mosque, roof garden:
// 7 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`podium-tower-${tn}`, `Podium tower ${tn}`, 'podium', [box(tx - 32, tx + 32, 0, 20, -32, 32)]);
  addPart(`lobby-tower-${tn}`, `Lobby tower ${tn}`, 'podium', [
    box(tx - 14, tx + 14, 0, 12, tx < 0 ? -44 : 32, tx < 0 ? -32 : 44),
  ]);
}
addPart('retail-concourse', 'Retail concourse', 'podium', [box(-77, 77, -3.5, 6, -50, 50)]);
addPart('surau-mosque', 'Surau mosque', 'podium', [
  box(60, 80, 0, 10, 40, 60),
  cyl(0.2, 8, 6, 70, 13, 50, 8),
]);
addPart('podium-roof-garden', 'Podium roof garden', 'podium', [box(-77, 77, 20, 21, -50, 50)]);

// --- Tower shafts: eight setback sections per tower: 16 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  SECTIONS.forEach(([y0, y1, rO, rI], i) => {
    const rOT = SECTIONS[Math.min(i + 1, 7)][2];
    const rIT = SECTIONS[Math.min(i + 1, 7)][3];
    addPart(`shaft-tower-${tn}-section-${i + 1}`, `Shaft tower ${tn} section ${i + 1}`, 'tower-shafts', [
      starCyl(rO, rI, rOT, rIT, y1 - y0, tx, (y0 + y1) / 2, 0),
    ]);
  });
}

// --- Setback terraces: one per section per tower: 16 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  SECTIONS.forEach(([y0, y1, rO, rI], i) => {
    addPart(`terrace-tower-${tn}-level-${i + 1}`, `Terrace tower ${tn} level ${i + 1}`, 'setbacks', [
      starCyl(rO + 1.2, rI + 1.2, rO + 1.2, rI + 1.2, 1.4, tx, y1 - 0.7, 0),
    ]);
  });
}

// --- Crowns: spire bases, spires, corner pinnacles: 12 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`spire-base-tower-${tn}`, `Spire base tower ${tn}`, 'crowns', [
    starCyl(14, 11.5, 8, 6.6, 30, tx, 390, 0),
  ]);
  addPart(`spire-tower-${tn}`, `Spire tower ${tn}`, 'crowns', [
    cyl(0.4, 3.2, 46.9, tx, 428.45, 0, 10),
  ]);
  [[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(([px, pz], i) => {
    addPart(`pinnacle-tower-${tn}-${i + 1}`, `Pinnacle tower ${tn} ${i + 1}`, 'crowns', [
      cyl(0.15, 1.1, 20, tx + px, 385, pz, 8),
    ]);
  });
}

// --- Skybridge: deck, inclined struts, end frames, visitor gallery:
// 6 parts. Levels 41-42, 170 m up, 58.4 m long.
addPart('skybridge-deck', 'Skybridge deck', 'skybridge', [box(-29.2, 29.2, 170, 182, -4, 4)]);
addPart('skybridge-strut-north', 'Skybridge strut north', 'skybridge', [
  strut([-27, 148, 3.5], [-12, 170, 3.5], 1.6),
  strut([27, 148, 3.5], [12, 170, 3.5], 1.6),
]);
addPart('skybridge-strut-south', 'Skybridge strut south', 'skybridge', [
  strut([-27, 148, -3.5], [-12, 170, -3.5], 1.6),
  strut([27, 148, -3.5], [12, 170, -3.5], 1.6),
]);
addPart('skybridge-end-frame-tower-1', 'Skybridge end frame tower 1', 'skybridge', [
  box(-30, -26, 168, 184, -5, 5),
]);
addPart('skybridge-end-frame-tower-2', 'Skybridge end frame tower 2', 'skybridge', [
  box(26, 30, 168, 184, -5, 5),
]);
addPart('skybridge-visitor-gallery', 'Skybridge visitor gallery', 'skybridge', [
  box(-29.2, 29.2, 176, 182, -4, 4),
]);

// --- Facade: stainless bands, glass curtains, Islamic screens, mullions:
// 18 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`cladding-tower-${tn}-lower`, `Cladding tower ${tn} lower`, 'facade', [
    starCyl(24.6, 20.2, 21.1, 17.3, 150, tx, 95, 0),
  ]);
  addPart(`cladding-tower-${tn}-upper`, `Cladding tower ${tn} upper`, 'facade', [
    starCyl(21.1, 17.3, 14.6, 12.0, 205, tx, 272.5, 0),
  ]);
  addPart(`glass-curtain-tower-${tn}-lower`, `Glass curtain tower ${tn} lower`, 'facade', [
    starCyl(23.4, 19.2, 20.0, 16.4, 60, tx, 50, 0),
  ]);
  addPart(`glass-curtain-tower-${tn}-upper`, `Glass curtain tower ${tn} upper`, 'facade', [
    starCyl(18.0, 14.8, 15.0, 12.3, 60, tx, 300, 0),
  ]);
  addPart(`islamic-screen-tower-${tn}`, `Islamic screen tower ${tn}`, 'facade', [
    starCyl(24.9, 20.4, 24.9, 20.4, 18, tx, 29, 0),
  ]);
  const dirs = [['n', 0, -1], ['e', 1, 0], ['s', 0, 1], ['w', -1, 0]];
  for (const [dn, dx, dz] of dirs) {
    addPart(`mullions-tower-${tn}-${dn}`, `Mullions tower ${tn} ${dn}`, 'facade', [
      box(tx + dx * 22 - 0.5, tx + dx * 22 + 0.5, 20, 375, dz * 22 - 0.5, dz * 22 + 0.5),
    ]);
  }
}

// --- Vertical transport: cores, double-deck lift cars, escalators, sky
// lobbies: 12 parts.
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`lift-core-tower-${tn}`, `Lift core tower ${tn}`, 'vertical-transport', [
    box(tx - 6, tx + 6, 0, 375, -6, 6),
  ]);
  addPart(`lift-cars-tower-${tn}-a`, `Lift cars tower ${tn} A`, 'vertical-transport', [
    box(tx - 4, tx + 4, 120, 132, -4, 4),
  ]);
  addPart(`lift-cars-tower-${tn}-b`, `Lift cars tower ${tn} B`, 'vertical-transport', [
    box(tx - 4, tx + 4, 240, 252, -4, 4),
  ]);
  addPart(`escalators-tower-${tn}`, `Escalators tower ${tn}`, 'vertical-transport', [
    strut([tx - 10, 0, 10], [tx - 4, 12, 10], 2),
    strut([tx + 4, 12, 10], [tx + 10, 24, 10], 2),
  ]);
  addPart(`sky-lobby-tower-${tn}-a`, `Sky lobby tower ${tn} A`, 'vertical-transport', [
    box(tx - 12, tx + 12, 168, 176, -12, 12),
  ]);
  addPart(`sky-lobby-tower-${tn}-b`, `Sky lobby tower ${tn} B`, 'vertical-transport', [
    box(tx - 12, tx + 12, 268, 276, -12, 12),
  ]);
}

// --- Crown amenities: observation deck, glazing, mechanical floors, park,
// fountains, warning lights: 11 parts.
addPart('observation-deck', 'Observation deck', 'crown-amenities', [
  box(T1X - 14, T1X + 14, 368, 372, -14, 14),
]);
addPart('observation-glazing', 'Observation glazing', 'crown-amenities', [
  box(T1X - 14.5, T1X + 14.5, 372, 376, -14.5, 14.5),
]);
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  addPart(`mechanical-floor-tower-${tn}-a`, `Mechanical floor tower ${tn} A`, 'crown-amenities', [
    box(tx - 16, tx + 16, 218, 222, -16, 16),
  ]);
  addPart(`mechanical-floor-tower-${tn}-b`, `Mechanical floor tower ${tn} B`, 'crown-amenities', [
    box(tx - 14, tx + 14, 313, 317, -14, 14),
  ]);
}
addPart('klcc-park', 'KLCC park', 'crown-amenities', [box(-110, 110, -0.5, 0, -80, 80)]);
addPart('park-fountain-1', 'Park fountain 1', 'crown-amenities', [
  cyl(6, 7, 1.5, -90, 0.75, 40, 16),
]);
addPart('park-fountain-2', 'Park fountain 2', 'crown-amenities', [
  cyl(6, 7, 1.5, 90, 0.75, -40, 16),
]);
for (const [tn, tx] of [[1, T1X], [2, T2X]]) {
  const lamp = new THREE.SphereGeometry(0.8, 8, 6);
  lamp.translate(tx, 452.5, 0);
  addPart(`aircraft-warning-light-${tn}`, `Aircraft warning light ${tn}`, 'crown-amenities', [lamp]);
}

// ---------------------------------------------------------------- colors
// Stainless steel and glass palette; the spires keep a bright steel tone.
function colorFor(id) {
  if (id.includes('spire')) return '#ccd2d8';
  if (id.includes('pinnacle')) return '#c2c9d1';
  if (id.includes('cladding')) return '#b8c0c8';
  if (id.includes('glass') || id.includes('glazing')) return '#7a9ab0';
  if (id.includes('screen')) return '#a8b0b8';
  if (id.includes('mullion')) return '#9aa4ae';
  if (id.includes('skybridge')) return '#9aa4ae';
  if (id.includes('shaft') || id.includes('terrace')) return '#aeb6be';
  if (id.includes('raft') || id.includes('piles')) return '#8a8f96';
  if (id.includes('podium') || id.includes('concourse') || id.includes('lobby') && !id.includes('sky')) return '#8a8f96';
  if (id.includes('mosque')) return '#a8a898';
  if (id.includes('garden') || id.includes('park')) return '#6a8a5a';
  if (id.includes('fountain')) return '#5f7f8f';
  if (id.includes('core') || id.includes('lift') || id.includes('escalator')) return '#7a828c';
  if (id.includes('mechanical')) return '#8f979f';
  if (id.includes('observation')) return '#8aa4b8';
  if (id.includes('warning')) return '#c23b3b';
  return '#aeb6be';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'foundations', name: 'Foundations', color: '#8a8f96', description: 'The 4.5 m concrete rafts on 104 barrette piles 60 to 115 m deep, among the deepest foundations in the world. Pile counts shown schematically.' },
  { id: 'podium', name: 'Podium and concourse', color: '#8a8f96', description: 'The podium blocks, lobbies, retail concourse, mosque and roof garden at the towers\u2019 feet. Layout is schematic.' },
  { id: 'tower-shafts', name: 'Tower shafts', color: '#aeb6be', description: 'The eight setback shaft sections of each tower on the eight-pointed star plan, two interlocking squares standing for unity, harmony, stability and rationality.' },
  { id: 'setbacks', name: 'Setback terraces', color: '#9aa4ae', description: 'The terraces at each setback level. Exact setback positions are schematic.' },
  { id: 'crowns', name: 'Crowns and spires', color: '#ccd2d8', description: 'The spire bases, the stainless steel spires completing the 451.9 m height, and the corner pinnacles. Profiles are schematic.' },
  { id: 'skybridge', name: 'Skybridge', color: '#9aa4ae', description: 'The double-decker skybridge at levels 41 and 42, 58.4 m long and 170 m up, moving independently of the towers in wind and doubling as a fire escape.' },
  { id: 'facade', name: 'Facade', color: '#b8c0c8', description: 'Stainless steel cladding (65,000 sq m), glass curtain wall (77,000 sq m), Islamic pattern screens and mullions. Band divisions are schematic.' },
  { id: 'vertical-transport', name: 'Vertical transport', color: '#7a828c', description: 'The stiff central lift cores of the tube-in-tube structure, double-deck lift cars, escalators and sky lobbies. Positions are schematic.' },
  { id: 'crown-amenities', name: 'Crown amenities and park', color: '#8aa4b8', description: 'The level 86 observation deck at 370 m, mechanical floors, the KLCC park and fountains, and aircraft warning lights.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'skybridge deck': 'The double-decker skybridge joining the towers at levels 41 and 42: 58.4 m long, 170 m above street level, weighing 750 tons. It is not rigidly fixed to either tower, so it can move independently in wind, and it serves as a fire escape.',
  'skybridge strut north': 'Schematic inclined struts carrying the north side of the skybridge. Exact arrangement is schematic.',
  'skybridge strut south': 'Schematic inclined struts carrying the south side of the skybridge.',
  'skybridge end frame tower 1': 'The frame where the skybridge meets Tower 1. Exact connection detail is schematic.',
  'skybridge end frame tower 2': 'The frame where the skybridge meets Tower 2. Exact connection detail is schematic.',
  'skybridge visitor gallery': 'The visitor gallery level inside the skybridge deck. Fit-out is schematic.',
  'observation deck': 'The observation deck on level 86 at 370 m, the highest public floor of the towers.',
  'observation glazing': 'The glazing band of the observation deck. Exact mullion layout is schematic.',
  'retail concourse': 'The retail concourse linking the towers at podium level. Layout is schematic.',
  'surau mosque': 'The mosque in the tower complex, one of its public amenities. Exact form is schematic.',
  'podium roof garden': 'Schematic roof garden over the podium.',
  'klcc park': 'The KLCC park at the towers\u2019 feet. Layout is schematic.',
  'park fountain 1': 'One of the park fountains. Exact position is schematic.',
  'park fountain 2': 'One of the park fountains. Exact position is schematic.',
};
for (const tn of [1, 2]) {
  explanations[`foundation raft tower ${tn}`] = `The 4.5 m thick reinforced concrete raft under Tower ${tn}, part of a foundation on 104 barrette piles 60 to 115 m deep, among the deepest in the world. Exact raft extent is schematic.`;
  explanations[`barrette piles tower ${tn}`] = `Schematic barrette piles under Tower ${tn}; the real foundations use 104 piles per tower, 60 to 115 m deep. Count shown is schematic.`;
  explanations[`podium tower ${tn}`] = `The podium block at the foot of Tower ${tn}. Exact massing is schematic.`;
  explanations[`lobby tower ${tn}`] = `The entrance lobby of Tower ${tn}. Exact form is schematic.`;
  for (let s = 1; s <= 8; s++) {
    explanations[`shaft tower ${tn} section ${s}`] = `Setback section ${s} of Tower ${tn}\u2019s shaft on the eight-pointed star plan, two interlocking squares. The towers taper as they rise toward the 451.9 m pinnacles. Exact setback heights are schematic.`;
    explanations[`terrace tower ${tn} level ${s}`] = `The setback terrace at the top of shaft section ${s} of Tower ${tn}. Exact position is schematic.`;
  }
  explanations[`spire base tower ${tn}`] = `The tapering crown of Tower ${tn} below its spire. Exact profile is schematic.`;
  explanations[`spire tower ${tn}`] = `The stainless steel spire of Tower ${tn}, completing the architectural height of 451.9 m (1,483 ft). Exact spire profile is schematic.`;
  for (let p = 1; p <= 4; p++) {
    explanations[`pinnacle tower ${tn} ${p}`] = `A schematic corner pinnacle on the crown of Tower ${tn}. Exact pinnacles are schematic.`;
  }
  explanations[`cladding tower ${tn} lower`] = `Stainless steel cladding on the lower shaft of Tower ${tn}; the towers wear 65,000 sq m of it. Band divisions are schematic.`;
  explanations[`cladding tower ${tn} upper`] = `Stainless steel cladding on the upper shaft of Tower ${tn}. Band divisions are schematic.`;
  explanations[`glass curtain tower ${tn} lower`] = `Glass curtain wall on the lower shaft of Tower ${tn}; 77,000 sq m of vision glass in total. Divisions are schematic.`;
  explanations[`glass curtain tower ${tn} upper`] = `Glass curtain wall on the upper shaft of Tower ${tn}. Divisions are schematic.`;
  explanations[`islamic screen tower ${tn}`] = `Facade screen with Islamic geometric patterning at the base of Tower ${tn}, echoing the eight-pointed star plan. Exact pattern is schematic.`;
  for (const dn of ['n', 'e', 's', 'w']) {
    const full = { n: 'north', e: 'east', s: 'south', w: 'west' }[dn];
    explanations[`mullions tower ${tn} ${dn}`] = `Schematic ${full} vertical mullion fins of Tower ${tn}\u2019s curtain wall. Count and spacing are schematic.`;
  }
  explanations[`lift core tower ${tn}`] = `The stiff central concrete core of Tower ${tn}, carrying lifts, stairs and services and taking over half the wind overturning load in the tube-in-tube structure. Exact core size is schematic.`;
  explanations[`lift cars tower ${tn} a`] = `Schematic double-deck lift cars in Tower ${tn}; each tower has 29 double-deck high-speed passenger lifts. Positions are schematic.`;
  explanations[`lift cars tower ${tn} b`] = `Schematic double-deck lift cars in the upper shaft of Tower ${tn}. Positions are schematic.`;
  explanations[`escalators tower ${tn}`] = `Schematic escalator banks in Tower ${tn}; 10 per tower. Positions are schematic.`;
  explanations[`sky lobby tower ${tn} a`] = `A schematic sky lobby in Tower ${tn}, where express lifts meet local lifts. Position is schematic.`;
  explanations[`sky lobby tower ${tn} b`] = `A schematic upper sky lobby in Tower ${tn}. Position is schematic.`;
  explanations[`mechanical floor tower ${tn} a`] = `A schematic mechanical floor in Tower ${tn}. Position is schematic.`;
  explanations[`mechanical floor tower ${tn} b`] = `A schematic upper mechanical floor in Tower ${tn}. Position is schematic.`;
  explanations[`aircraft warning light ${tn}`] = `Schematic aircraft warning light atop the spire of Tower ${tn}.`;
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
const binName = 'petronas-towers-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the petronas-towers directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Petronas Towers, Kuala Lumpur, Malaysia',
  title: 'Petronas Towers',
  location: 'Kuala Lumpur, Malaysia',
  blurb: 'Cesar Pelli\u2019s 1998 twin supertalls in Kuala Lumpur: 88 floors and 451.9 m on eight-pointed star plans, joined at levels 41 and 42 by a double-decker skybridge, the world\u2019s tallest buildings from 1998 to 2004 and still the tallest twins.',
  sourceUrls: [
    { label: 'Wikipedia: Petronas Towers', url: 'https://en.wikipedia.org/wiki/Petronas_Towers' },
    { label: 'Engineering.com: Petronas Twin Towers at a glance', url: 'https://mobile.engineering.com/amp/72.html' },
    { label: 'Sceen-it: Entrapment at the Petronas Towers', url: 'https://www.sceen-it.com/sceen/2555/Entrapment/The-Petronas-Towers' },
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
  chunks: [{ url: '/models/petronas-towers/petronas-towers-0.bin', bytes: offset }],
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
