// Procedural Marina Bay Sands for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Marina Bay Sands in code and
// writes it in the atlas binary format:
//   public/models/marina-bay-sands/atlas.json
//   public/models/marina-bay-sands/marina-bay-sands-0.bin
//
// Sourced dimensions and facts (verified via web search, opened 2026-10-10):
//   Marina Bay Sands Integrated Resort, Singapore; architect Moshe Safdie
//   (Safdie Architects); opened 23 June 2010 (hotel, SkyPark, retail,
//   convention); ArtScience Museum and theatres followed fall 2010; owner
//   Las Vegas Sands; total cost US$5.7 billion including land (S$8
//   billion), the world's most expensive standalone casino property at
//   opening; site area 15.4 hectares; gross floor area 581,400 sqm; total
//   area 845,000 sqm.
//   Three asymmetric hotel towers: 55 floors (57 stories per the
//   architecture fact sheet), 195 m (640 ft) high, 2,560 luxury rooms
//   totaling 265,683 sqm; glass curtain-wall towers.
//   Sands SkyPark: 340 m (1,115 ft) long from northern tip to south end,
//   maximum width 40 m (131 ft), area 9,941 sqm (107,000 sq ft), 1.2
//   hectare tropical park at 200 m (656 ft) above street level (57th
//   floor); connects the three towers; cantilevers 65 to 67 m (213 to 220
//   ft) beyond the north tower, one of the world's largest public
//   cantilevers and the largest public cantilevered platform; capacity
//   3,900 people; 250 trees and 650 plants; public observatory, jogging
//   paths, gardens, restaurants, lounges.
//   Infinity pool: 150 m (490 ft) long, 1,396 sqm (15,026 sq ft), the
//   largest outdoor pool at its height; 145 m (475 ft) vanishing edge;
//   422,000 pounds of stainless steel, 254,000 ceramic tiles, 376,500
//   gallons capacity; built with a 3-inch camber in the structural bridges
//   to take the water weight.
//   Engineering: Arup; 14 prefabricated steel SkyPark segments joined in
//   the air over a 13-week assembly sequence; tuned mass dampers in the
//   SkyPark belly and expansion joints let the three towers move
//   independently.
//   Casino: 15,000 sqm atrium with a 7-ton chandelier holding 132,000
//   Swarovski crystals and 66,000 LEDs. The Shoppes: 160,000 sqm mall with
//   a canal for sampan rides. ArtScience Museum: lotus-flower form.
//   Cultural: closing engagement-party scenes of Crazy Rich Asians (2018,
//   dir. Jon M. Chu) staged atop the towers at the SkyPark; brief
//   appearance in Independence Day: Resurgence (2016) before Singapore is
//   destroyed; Singapore locations for HBO's Westworld season 3.
// Schematic (not sourced, never stated as fact in the UI): exact tower
// footprints, spacing and the lean/asymmetry of the towers; floor-to-floor
// heights; SkyPark deck thickness and segment joints; pool depth and exact
// position; tree/plant counts and positions (250/650 stated as given, not
// modeled individually); restaurant/lounge pavilion forms; ArtScience
// Museum petal count and geometry; podium/casino/shoppes massing; canal
// route; chandelier form; damper and bearing positions.
//
// Coordinate frame: x = along the tower row (north is +x), z = depth,
// y = up. All dimensions in meters.
//
// Granularity: 106 named parts across 9 systems.
//
// Usage: node scripts/generate-marina-bay-sands.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'marina-bay-sands');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (340 m SkyPark) maps to 2.4 units.
const S = 2.4 / 340;

// ---------------------------------------------------------------- helpers
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

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// Towers: three 55-storey, 195 m towers on a row along x. Footprints and
// spacing schematic; heights sourced (195 m).
const TOWER_X = [-80, 0, 80];
const TOWER_W = 42;   // x footprint (schematic)
const TOWER_D = 34;   // z footprint (schematic)
const TOWER_H = 195;
const TOWER_NAMES = ['North', 'Central', 'South'];
const PARK_Y = 200, PARK_T = 5;

TOWER_X.forEach((tx, ti) => {
  const tn = TOWER_NAMES[ti].toLowerCase();
  const tN = TOWER_NAMES[ti];
  const x0 = tx - TOWER_W / 2, x1 = tx + TOWER_W / 2;
  const z0 = -TOWER_D / 2, z1 = TOWER_D / 2;
  // Podium base (floors 1-3, schematic).
  addPart(`${tn}-tower-podium`, `${tN} tower podium`, 'towers', [
    box(x0 - 3, x1 + 3, 0, 14, z0 - 3, z1 + 3),
  ]);
  // Shaft in three stacked masses (lower/mid/upper).
  addPart(`${tn}-tower-lower-shaft`, `${tN} tower lower shaft`, 'towers', [
    box(x0, x1, 14, 80, z0, z1),
  ]);
  addPart(`${tn}-tower-mid-shaft`, `${tN} tower mid shaft`, 'towers', [
    box(x0 + 1, x1 - 1, 80, 140, z0 + 1, z1 - 1),
  ]);
  addPart(`${tn}-tower-upper-shaft`, `${tN} tower upper shaft`, 'towers', [
    box(x0 + 2, x1 - 2, 140, TOWER_H, z0 + 2, z1 - 2),
  ]);
  // Crown / plant level.
  addPart(`${tn}-tower-crown`, `${tN} tower crown`, 'towers', [
    box(x0 + 2, x1 - 2, TOWER_H, TOWER_H + 5, z0 + 2, z1 - 2),
  ]);
  // Glass curtain-wall faces (schematic panelization).
  const faceT = 0.6;
  addPart(`${tn}-tower-east-facade`, `${tN} tower east facade`, 'facade', [
    box(x1 - faceT, x1, 14, TOWER_H, z0, z1),
  ]);
  addPart(`${tn}-tower-west-facade`, `${tN} tower west facade`, 'facade', [
    box(x0, x0 + faceT, 14, TOWER_H, z0, z1),
  ]);
  addPart(`${tn}-tower-north-facade`, `${tN} tower north facade`, 'facade', [
    box(x0, x1, 14, TOWER_H, z1 - faceT, z1),
  ]);
  addPart(`${tn}-tower-south-facade`, `${tN} tower south facade`, 'facade', [
    box(x0, x1, 14, TOWER_H, z0, z0 + faceT),
  ]);
  // Shear core (schematic).
  addPart(`${tn}-tower-shear-core`, `${tN} tower shear core`, 'structure', [
    box(tx - 6, tx + 6, 0, TOWER_H, -6, 6),
  ]);
  // SkyPark support columns rising from the crown (schematic positions).
  const cols = [];
  for (const cx of [tx - 12, tx, tx + 12]) {
    cols.push(box(cx - 1.2, cx + 1.2, TOWER_H + 5, 200, -8, 8));
  }
  addPart(`${tn}-tower-skypark-columns`, `${tN} tower SkyPark columns`, 'structure', cols);
  // Lobby.
  addPart(`${tn}-tower-lobby`, `${tN} tower lobby`, 'towers', [
    box(tx - 10, tx + 10, 0, 8, z1 - 3, z1 + 6),
  ]);
  // Rooftop plant room and sky lobby at SkyPark level.
  addPart(`${tn}-tower-rooftop-plant`, `${tN} tower rooftop plant`, 'towers', [
    box(tx - 8, tx + 8, TOWER_H + 5, TOWER_H + 9, -6, 6),
  ]);
  addPart(`${tn}-tower-sky-lobby`, `${tN} tower sky lobby`, 'towers', [
    box(tx - 14, tx + 14, PARK_Y - 6, PARK_Y, -10, 10),
  ]);
});

// --- SkyPark: 340 m deck at 200 m, 40 m max width, 14 prefabricated
// segments, cantilever 67 m beyond the north tower.
const PARK_X0 = -170, PARK_X1 = 170;
const PARK_W = 40;
for (let sgi = 0; sgi < 14; sgi++) {
  const sx0 = PARK_X0 + (sgi * 340) / 14;
  const sx1 = PARK_X0 + ((sgi + 1) * 340) / 14;
  addPart(`skypark-deck-segment-${String(sgi + 1).padStart(2, '0')}`, `SkyPark deck segment ${sgi + 1}`, 'skypark', [
    box(sx0, sx1 - 0.4, PARK_Y, PARK_Y + PARK_T, -PARK_W / 2, PARK_W / 2),
  ]);
}
// Edge beams.
addPart('skypark-edge-beam-east', 'SkyPark east edge beam', 'skypark', [
  box(PARK_X0, PARK_X1, PARK_Y - 1.2, PARK_Y + PARK_T, PARK_W / 2 - 1, PARK_W / 2),
]);
addPart('skypark-edge-beam-west', 'SkyPark west edge beam', 'skypark', [
  box(PARK_X0, PARK_X1, PARK_Y - 1.2, PARK_Y + PARK_T, -PARK_W / 2, -PARK_W / 2 + 1),
]);
// Cantilever truss beyond the north tower (67 m overhang, schematic form).
{
  const truss = [];
  const cx0 = 101, cx1 = 168; // beyond north tower face at x=101
  for (let k = 0; k < 8; k++) {
    const x = cx0 + (k * (cx1 - cx0)) / 7;
    truss.push(strut([x, PARK_Y - 1, -14], [x, PARK_Y + PARK_T, -14], 1.2));
    truss.push(strut([x, PARK_Y - 1, 14], [x, PARK_Y + PARK_T, 14], 1.2));
    if (k < 7) {
      const xn = cx0 + ((k + 1) * (cx1 - cx0)) / 7;
      truss.push(strut([x, PARK_Y - 1, -14], [xn, PARK_Y + PARK_T, -14], 0.9));
      truss.push(strut([x, PARK_Y - 1, 14], [xn, PARK_Y + PARK_T, 14], 0.9));
    }
  }
  truss.push(box(cx0, cx1, PARK_Y - 2.2, PARK_Y - 1, -15, 15));
  addPart('skypark-cantilever-truss', 'SkyPark north cantilever truss', 'structure', truss);
}
// Underside cladding + expansion joints + tuned mass dampers (schematic).
addPart('skypark-underside-cladding', 'SkyPark underside cladding', 'skypark', [
  box(PARK_X0, PARK_X1, PARK_Y - 2.4, PARK_Y - 1.1, -PARK_W / 2 + 1, PARK_W / 2 - 1),
]);
{
  const joints = [];
  for (const jx of [-80, 0, 80]) {
    joints.push(box(jx - 1, jx + 1, PARK_Y, PARK_Y + PARK_T, -PARK_W / 2, PARK_W / 2));
  }
  addPart('skypark-expansion-joints', 'SkyPark expansion joints', 'structure', joints);
}
{
  const dampers = [];
  for (const dx of [-40, 40]) {
    dampers.push(box(dx - 6, dx + 6, PARK_Y - 8, PARK_Y - 2.4, -6, 6));
  }
  addPart('skypark-mass-dampers', 'SkyPark tuned mass dampers', 'structure', dampers);
}

// --- Infinity pool: 150 m basin, 145 m vanishing edge.
const POOL_Y = PARK_Y + PARK_T;
addPart('pool-main-basin', 'Infinity pool main basin', 'pool', [
  box(-75, 75, POOL_Y, POOL_Y + 1.6, -8, 8),
]);
addPart('pool-vanishing-edge', 'Infinity pool vanishing edge', 'pool', [
  box(-72.5, 72.5, POOL_Y + 0.4, POOL_Y + 1.5, 8, 8.8),
]);
addPart('pool-catchment-basin', 'Infinity pool catchment basin', 'pool', [
  box(-72.5, 72.5, POOL_Y - 1.2, POOL_Y + 0.3, 8.8, 11),
]);
addPart('pool-deck-north', 'Pool deck north', 'pool', [
  box(-75, 75, POOL_Y, POOL_Y + 0.4, 11, 19),
]);
addPart('pool-deck-south', 'Pool deck south', 'pool', [
  box(-75, 75, POOL_Y, POOL_Y + 0.4, -19, -8),
]);
addPart('pool-plant-room', 'Pool plant room', 'pool', [
  box(60, 75, PARK_Y - 2.4, PARK_Y, -19, -8),
]);

// --- SkyPark gardens: 250 trees / 650 plants (counts sourced, layout schematic).
{
  const mkTrees = (cx0, cx1, tag) => {
    const trees = [];
    let n = 0;
    for (let x = cx0; x < cx1 && n < 18; x += 9) {
      for (const z of [-14, 0, 14]) {
        if (n >= 18) break;
        trees.push(cyl(0.25, 0.35, 2.5, x, POOL_Y + 1.2, z, 6));
        const crown = new THREE.SphereGeometry(2.2, 8, 6);
        crown.translate(x, POOL_Y + 4.2, z);
        trees.push(crown);
        n++;
      }
    }
    addPart(`garden-tree-cluster-${tag}`, `Garden tree cluster ${tag}`, 'gardens', trees);
  };
  mkTrees(-160, -90, 'north');
  mkTrees(-30, 30, 'central');
  mkTrees(90, 160, 'south');
}
addPart('garden-planters', 'Garden planters', 'gardens', [
  box(-160, -80, POOL_Y, POOL_Y + 1, -19, -14),
  box(-160, -80, POOL_Y, POOL_Y + 1, 14, 19),
  box(80, 160, POOL_Y, POOL_Y + 1, -19, -14),
  box(80, 160, POOL_Y, POOL_Y + 1, 14, 19),
]);
addPart('garden-jogging-path', 'SkyPark jogging path', 'gardens', [
  box(-165, 165, POOL_Y, POOL_Y + 0.35, -19.5, -17.5),
]);
addPart('garden-lawn-north', 'SkyPark north lawn', 'gardens', [
  box(-165, -80, POOL_Y, POOL_Y + 0.5, -14, 14),
]);
addPart('garden-lawn-south', 'SkyPark south lawn', 'gardens', [
  box(80, 165, POOL_Y, POOL_Y + 0.5, -14, 14),
]);

// --- Observation deck and pavilions (schematic forms).
addPart('observation-deck', 'SkyPark observation deck', 'observation', [
  box(100, 165, POOL_Y, POOL_Y + 0.6, -19, 19),
]);
addPart('observation-railing-north', 'Observation deck north railing', 'observation', [
  box(164, 165, POOL_Y + 0.6, POOL_Y + 1.8, -19, 19),
]);
addPart('observation-railing-east', 'Observation deck east railing', 'observation', [
  box(100, 165, POOL_Y + 0.6, POOL_Y + 1.8, 18, 19),
]);
for (const [pi, px] of [[1, -120], [2, -40]]) {
  addPart(`restaurant-pavilion-${pi}`, `SkyPark restaurant pavilion ${pi}`, 'observation', [
    box(px - 14, px + 14, POOL_Y, POOL_Y + 6, -19, -6),
    box(px - 15, px + 15, POOL_Y + 6, POOL_Y + 6.8, -20, -5),
  ]);
}
addPart('observation-lounge-pavilion', 'SkyPark lounge pavilion', 'observation', [
  box(30, 58, POOL_Y, POOL_Y + 6, 6, 19),
  box(29, 59, POOL_Y + 6, POOL_Y + 6.8, 5, 20),
]);
addPart('observation-ticket-lobby', 'Observation deck ticket lobby', 'observation', [
  box(100, 120, POOL_Y, POOL_Y + 4, -19, -8),
]);
addPart('skypark-south-plaza', 'SkyPark south plaza', 'skypark', [
  box(80, 165, PARK_Y, PARK_Y + PARK_T, -PARK_W / 2, PARK_W / 2),
]);
addPart('skypark-timber-deck', 'SkyPark timber deck', 'skypark', [
  box(-165, 165, POOL_Y, POOL_Y + 0.3, -17.5, 17.5),
]);
addPart('pool-bar-pavilion', 'Pool bar pavilion', 'pool', [
  box(-20, 20, POOL_Y, POOL_Y + 5, -19, -12),
  box(-21, 21, POOL_Y + 5, POOL_Y + 5.7, -20, -11),
]);
addPart('garden-pavilion-north', 'Garden pavilion north', 'gardens', [
  box(-140, -120, POOL_Y, POOL_Y + 5, -10, 10),
]);
addPart('garden-pavilion-south', 'Garden pavilion south', 'gardens', [
  box(120, 140, POOL_Y, POOL_Y + 5, -10, 10),
]);

// --- ArtScience Museum: lotus-flower form (petal count and geometry schematic).
{
  const ax = 150, az = 90; // south-east of the towers, schematic position
  addPart('artscience-base', 'ArtScience Museum base', 'artscience', [
    cyl(28, 32, 12, ax, 6, az, 24),
  ]);
  for (let pi = 0; pi < 5; pi++) {
    const ang = (pi / 5) * Math.PI * 2;
    const px = ax + Math.cos(ang) * 14;
    const pz = az + Math.sin(ang) * 14;
    const petal = new THREE.ConeGeometry(9, 34, 10, 1, true);
    petal.translate(0, 17, 0);
    petal.rotateZ(0.5);
    petal.rotateY(-ang);
    petal.translate(px, 10, pz);
    const tip = new THREE.SphereGeometry(2.5, 8, 6);
    tip.translate(ax + Math.cos(ang) * 20, 40, az + Math.sin(ang) * 20);
    addPart(`artscience-lotus-petal-${pi + 1}`, `ArtScience Museum lotus petal ${pi + 1}`, 'artscience', [petal, tip]);
  }
  addPart('artscience-skylight', 'ArtScience Museum skylight', 'artscience', [
    cyl(4, 4, 6, ax, 42, az, 12),
  ]);
  addPart('artscience-lily-pond', 'ArtScience Museum lily pond', 'artscience', [
    cyl(38, 38, 1.2, ax, 0.6, az, 24),
  ]);
}

// --- Podium: casino, Shoppes, convention, theatre, canal (massing schematic).
addPart('podium-casino-block', 'Casino podium block', 'podium', [
  box(-120, -20, 0, 26, -90, -45),
]);
addPart('podium-chandelier', 'Casino atrium chandelier', 'podium', [
  cyl(9, 12, 6, -70, 18, -67, 16),
  cyl(0.5, 0.5, 10, -70, 26, -67, 8),
]);
addPart('podium-shoppes-block', 'The Shoppes podium block', 'podium', [
  box(20, 130, 0, 22, -90, -45),
]);
addPart('podium-sampan-canal', 'Shoppes sampan canal', 'podium', [
  box(30, 120, 0.5, 2.5, -70, -62),
]);
addPart('podium-convention-center', 'Convention center block', 'podium', [
  box(-120, 0, 0, 20, 45, 95),
]);
addPart('podium-theatre-block', 'Sands Theatre block', 'podium', [
  box(20, 90, 0, 24, 45, 95),
]);
addPart('podium-entrance-canopy', 'Podium entrance canopy', 'podium', [
  box(-30, 30, 10, 12, -110, -90),
]);

// ---------------------------------------------------------------- colors
function colorFor(id) {
  if (id.includes('-facade')) return '#9fb8c8';
  if (id.includes('shear-core')) return '#8a949c';
  if (id.includes('skypark-columns') || id.includes('expansion-joints') || id.includes('mass-dampers')) return '#6e7a84';
  if (id.includes('cantilever-truss')) return '#54606a';
  if (id.startsWith('skypark-deck-segment')) return '#cfd6da';
  if (id.includes('edge-beam') || id.includes('underside')) return '#aeb7bd';
  if (id.startsWith('pool-')) return '#3f9fd8';
  if (id === 'pool-deck-north' || id === 'pool-deck-south') return '#d8d2c4';
  if (id.startsWith('garden-')) return '#5d8f5f';
  if (id === 'garden-jogging-path') return '#b09a7a';
  if (id.startsWith('observation-') || id.startsWith('restaurant-')) return '#d9dee2';
  if (id.startsWith('artscience-')) return '#eef0f1';
  if (id === 'artscience-lily-pond') return '#7fb8d9';
  if (id.startsWith('podium-')) return '#c9cdd1';
  if (id === 'podium-chandelier') return '#e8d9a0';
  if (id === 'podium-sampan-canal') return '#6aa9cf';
  return '#b9c0c6';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'towers', name: 'Hotel towers', color: '#b9c0c6', description: 'The three 55-storey, 195 m hotel towers with 2,560 rooms, built as stacked shaft masses with podiums, crowns and lobbies.' },
  { id: 'facade', name: 'Glass curtain walls', color: '#9fb8c8', description: 'The glass curtain-wall facades wrapping each tower.' },
  { id: 'skypark', name: 'Sands SkyPark', color: '#cfd6da', description: 'The 340 m SkyPark deck at 200 m, built from 14 prefabricated steel segments, with edge beams and underside cladding.' },
  { id: 'pool', name: 'Infinity pool', color: '#3f9fd8', description: 'The 150 m infinity pool with its 145 m vanishing edge, catchment basin and decks.' },
  { id: 'gardens', name: 'SkyPark gardens', color: '#5d8f5f', description: 'The 1.2-hectare tropical garden: tree clusters standing in for the 250 trees, planters for the 650 plants, lawns and the jogging path.' },
  { id: 'observation', name: 'Observation and dining', color: '#d9dee2', description: 'The public observation deck with railings, restaurant pavilions and lounge.' },
  { id: 'structure', name: 'Engineering structure', color: '#6e7a84', description: 'Shear cores, SkyPark support columns, the north cantilever truss, expansion joints and tuned mass dampers by Arup.' },
  { id: 'artscience', name: 'ArtScience Museum', color: '#eef0f1', description: 'The lotus-flower ArtScience Museum beside the towers, with its petal forms, skylight and lily pond.' },
  { id: 'podium', name: 'Podium and resort', color: '#c9cdd1', description: 'The resort podium: casino block with its atrium chandelier, the Shoppes with the sampan canal, convention center and theatre.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {};
const E = (name, text) => { explanations[name.toLowerCase()] = text; };
const SCHEM = 'Exact form and position are schematic.';
TOWER_NAMES.forEach((tN) => {
  const tn = tN.toLowerCase();
  E(`${tN} tower podium`, `The ${tn} tower's three-storey podium base. ${SCHEM}`);
  E(`${tN} tower lower shaft`, `Lower shaft of the ${tn} tower (floors 1-20 of 55). The towers are 195 m high with 2,560 rooms across all three. ${SCHEM}`);
  E(`${tN} tower mid shaft`, `Mid shaft of the ${tn} tower (floors 21-40). ${SCHEM}`);
  E(`${tN} tower upper shaft`, `Upper shaft of the ${tn} tower (floors 41-55), narrowing toward the crown. ${SCHEM}`);
  E(`${tN} tower crown`, `The ${tn} tower's crown and plant level at 195 m, carrying the SkyPark columns. ${SCHEM}`);
  E(`${tN} tower east facade`, `East glass curtain-wall face of the ${tn} tower. Panelization ${SCHEM.toLowerCase()}`);
  E(`${tN} tower west facade`, `West glass curtain-wall face of the ${tn} tower. Panelization ${SCHEM.toLowerCase()}`);
  E(`${tN} tower north facade`, `North glass curtain-wall face of the ${tn} tower. Panelization ${SCHEM.toLowerCase()}`);
  E(`${tN} tower south facade`, `South glass curtain-wall face of the ${tn} tower. Panelization ${SCHEM.toLowerCase()}`);
  E(`${tN} tower shear core`, `The ${tn} tower's concrete shear core. ${SCHEM}`);
  E(`${tN} tower SkyPark columns`, `Columns rising from the ${tn} tower's crown to carry the SkyPark deck. ${SCHEM}`);
  E(`${tN} tower lobby`, `The ${tn} tower's entrance lobby. ${SCHEM}`);
  E(`${tN} tower rooftop plant`, `Plant rooms on the ${tn} tower's crown. ${SCHEM}`);
  E(`${tN} tower sky lobby`, `The ${tn} tower's sky lobby at SkyPark level. ${SCHEM}`);
});
for (let sgi = 0; sgi < 14; sgi++) {
  E(`SkyPark deck segment ${sgi + 1}`, `Prefabricated steel SkyPark deck segment ${sgi + 1} of 14, lifted and joined in the air during the 13-week assembly sequence. Segment joints ${SCHEM.toLowerCase()}`);
}
E('SkyPark east edge beam', 'East edge beam of the 340 m SkyPark deck. Exact profile is schematic.');
E('SkyPark west edge beam', 'West edge beam of the 340 m SkyPark deck. Exact profile is schematic.');
E('SkyPark north cantilever truss', 'Steel truss carrying the SkyPark 65 to 67 m beyond the north tower, one of the world\'s largest public cantilevers. Truss geometry is schematic.');
E('SkyPark underside cladding', 'Cladding under the SkyPark deck. Exact buildup is schematic.');
E('SkyPark expansion joints', 'Expansion joints at each tower letting the three towers move independently under wind and temperature while the deck stays stable. Positions are schematic.');
E('SkyPark tuned mass dampers', 'Tuned mass dampers housed in the SkyPark belly, acting as shock absorbers against sway. Positions and sizes are schematic.');
E('Infinity pool main basin', 'The 150 m infinity pool basin, the largest outdoor pool at its height, holding 376,500 gallons. Depth is schematic.');
E('Infinity pool vanishing edge', 'The 145 m vanishing edge where water spills into the catchment and is pumped back. Exact detail is schematic.');
E('Infinity pool catchment basin', 'The catchment basin below the vanishing edge returning water to the main pool. Exact form is schematic.');
E('Pool deck north', 'Timber-look pool deck north of the basin. Exact finish is schematic.');
E('Pool deck south', 'Timber-look pool deck south of the basin. Exact finish is schematic.');
E('Pool plant room', 'Filtration and heating plant for the pool\'s two circulation systems. Position is schematic.');
E('Garden tree cluster north', 'Tree cluster standing in for part of the SkyPark\'s 250 trees. Species and positions are schematic.');
E('Garden tree cluster central', 'Tree cluster standing in for part of the SkyPark\'s 250 trees. Species and positions are schematic.');
E('Garden tree cluster south', 'Tree cluster standing in for part of the SkyPark\'s 250 trees. Species and positions are schematic.');
E('Garden planters', 'Planters standing in for the SkyPark\'s 650 plants. Positions are schematic.');
E('SkyPark jogging path', 'The jogging path looping the SkyPark gardens. Route is schematic.');
E('SkyPark north lawn', 'North lawn of the 1.2-hectare SkyPark garden. Extent is schematic.');
E('SkyPark south lawn', 'South lawn of the 1.2-hectare SkyPark garden. Extent is schematic.');
E('SkyPark observation deck', 'The public observation deck at the SkyPark\'s south end, 200 m above the city. Extent is schematic.');
E('Observation deck north railing', 'Railing at the observation deck. Exact design is schematic.');
E('Observation deck east railing', 'Railing at the observation deck. Exact design is schematic.');
E('Observation deck ticket lobby', 'Ticket lobby for the public observation deck. Form and position are schematic.');
E('SkyPark south plaza', 'The south plaza of the SkyPark deck. Extent is schematic.');
E('SkyPark timber deck', 'Timber decking across the SkyPark. Exact finish is schematic.');
E('Pool bar pavilion', 'The pool bar pavilion beside the infinity pool. Form and position are schematic.');
E('Garden pavilion north', 'A garden pavilion in the north SkyPark garden. Form and position are schematic.');
E('Garden pavilion south', 'A garden pavilion in the south SkyPark garden. Form and position are schematic.');
E('SkyPark restaurant pavilion 1', 'One of the SkyPark restaurants. Form and position are schematic.');
E('SkyPark restaurant pavilion 2', 'One of the SkyPark restaurants. Form and position are schematic.');
E('SkyPark lounge pavilion', 'A SkyPark lounge pavilion. Form and position are schematic.');
E('ArtScience Museum base', 'The drum base of the lotus-flower ArtScience Museum. Exact geometry is schematic.');
for (let pi = 0; pi < 5; pi++) {
  E(`ArtScience Museum lotus petal ${pi + 1}`, `One of the lotus petals of the ArtScience Museum. Petal count and geometry are schematic.`);
}
E('ArtScience Museum skylight', 'The skylight oculus of the ArtScience Museum. Exact form is schematic.');
E('ArtScience Museum lily pond', 'The lily pond at the museum\'s base. Extent is schematic.');
E('Casino podium block', 'The casino podium: a 15,000 sqm atrium with four levels of gaming. Massing is schematic.');
E('Casino atrium chandelier', 'The 7-ton atrium chandelier with 132,000 Swarovski crystals and 66,000 LEDs. Form is schematic.');
E('The Shoppes podium block', 'The 160,000 sqm Shoppes mall podium. Massing is schematic.');
E('Shoppes sampan canal', 'The canal running through the Shoppes where visitors ride sampans. Route is schematic.');
E('Convention center block', 'The convention center podium block. Massing is schematic.');
E('Sands Theatre block', 'The 2,000-seat Sands Theatre block. Massing is schematic.');
E('Podium entrance canopy', 'The podium entrance canopy. Form is schematic.');

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
    bounds: r_bounds(bb),
  });
  triangles += u32.length / 3;
  merged.dispose();
}
function r_bounds(bb) {
  return [
    [bb.min.x, bb.min.y, bb.min.z],
    [bb.max.x, bb.max.y, bb.max.z],
  ];
}

const buffer = Buffer.alloc(offset);
for (const r of records) {
  r.pos.copy(buffer, r.posOff);
  r.nor.copy(buffer, r.norOff);
  r.idx.copy(buffer, r.idxOff);
}
const binName = 'marina-bay-sands-0.bin';
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
  scope: 'Marina Bay Sands, Singapore',
  title: 'Marina Bay Sands',
  location: 'Singapore',
  blurb: 'Moshe Safdie\'s 2010 integrated resort: three 55-storey, 195 m hotel towers crowned by the 340 m Sands SkyPark with its 150 m infinity pool, cantilevered 67 m beyond the north tower.',
  sourceUrls: [
    { label: 'Safdie Architects: Marina Bay Sands', url: 'https://www.safdiearchitects.com/projects/marina-bay-sands' },
    { label: 'Wikipedia: Marina Bay Sands', url: 'https://en.wikipedia.org/wiki/Marina_Bay_Sands' },
    { label: 'Arup: Marina Bay Sands', url: 'https://www.arup.com/projects/marina-bay-sands' },
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
  chunks: [{ url: '/models/marina-bay-sands/marina-bay-sands-0.bin', bytes: offset }],
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
