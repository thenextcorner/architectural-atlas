// Procedural Golden Gate Bridge for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Golden Gate Bridge in code and
// writes it in the atlas binary format:
//   public/models/golden-gate/atlas.json + public/models/golden-gate/golden-gate-0.bin
//
// Dimensions used (all verified from the research file
// research/golden-gate-bridge.md, sources [G1] goldengate.org facts page,
// [W] Wikipedia, [S] Structurae, [G2] district NTSB statement, [G3] district
// Art Deco PDF; see research/golden-gate-attribution.md):
//   total length 2,737 m, main span 1,280 m, suspended span 1,966 m,
//   tower height 227 m above water / 152 m above roadway,
//   deck width 27 m at about 75 m above water, 6 lanes, 2 walkways,
//   main cable diameter 0.92 m, cable length 2,332 m, 27,572 wires per cable,
//   80,000 miles of wire in both cables, 250 pairs of vertical suspenders,
//   about 600,000 rivets per tower, 840 million lb bridge weight,
//   south tower fender ring, Fort Point arch about 98 m,
//   toll plaza at the south end, tolls southbound only, international orange,
//   opened May 27, 1937, deck replaced 1982 to 1986 in 747 sections,
//   movable median barrier installed January 2015,
//   walkway railings added 2003, 38 painters maintain the paintwork.
//
// Schematic (not stated as fact anywhere in the UI): the 343 m side spans are
// derived from two official figures; the cable parabola is derived from the
// tower top and deck heights; suspender spacing and the ten suspender groups,
// tower leg section boundaries and setback step dimensions, truss member
// sizes, anchorage concrete shape, fender profile, approach geometry,
// toll booth layout, and maintenance traveler rail layout are all procedural
// approximations. Part section splits (deck halves, cable side sections,
// truss halves, portal levels) are schematic groupings for the exploded view.
//
// Axes: X along the bridge (south at -X, north at +X), Y up, Z across.
// y = 0 is the fender base (lowest modeled point); water surface is at y = 12.
//
// Usage: node scripts/generate-golden-gate.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'golden-gate');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: the viewer handles thin objects via the explode layout, so the
// full 2,737 m length maps to 2.4 units.
const S = 2.4 / 2737;

// ---------------------------------------------------------------- constants
const WATER = 12;          // water surface, m above fender base
const DECK = 87;           // roadway top, 75 m above water [S]
const TOWER_TOP = 239;     // 227 m above water [G1]
const TOWER_X = 640;       // main span 1,280 m [G1]
const SUSP_END = 983;      // suspended span 1,966 m [G1]
const SIDE_SPAN = SUSP_END - TOWER_X; // 343 m, derived from [G1] figures
const HALF = 1368.5;       // total length 2,737 m [G1]
const CABLE_D = 0.92;      // main cable diameter [G1]
const CABLE_Z = 13.5;      // cable planes, just outside the 27 m deck [G1]

// Cable centerline: parabola over the main span through the tower saddles,
// straight tangent runs over the side spans into the anchorages. The exact
// published curve was not found, so this profile is schematic.
function cableY(x) {
  const ax = Math.abs(x);
  if (ax <= TOWER_X) return 89 + 148 * (ax / TOWER_X) ** 2;
  const t = (ax - TOWER_X) / (SUSP_END - TOWER_X);
  return 237 + (89 - 237) * t;
}

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
function cylStrut(a, b, r, seg = 10) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(vb, va);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()),
  );
  g.translate(va.x, va.y, va.z);
  return g;
}
function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Towers: each Art Deco leg split into below-deck, lower tier, and upper
//     tier sections; portal struts, fluted housings, and chevron ornament
//     split per portal level; cable saddles split per side. 36 parts.
const LEG_Z = 14;
const TIERS = [
  // [y0, y1, x-width, z-width]
  [87, 126, 8, 10],
  [126, 165, 7, 8.5],
  [165, 204, 6, 7],
  [204, 239, 5, 6],
];
function towerLegSection(tx, sz, section) {
  const geoms = [];
  if (section === 'below') {
    geoms.push(box(9, DECK - 8, 11, tx, (DECK + 8) / 2, sz * LEG_Z));
  } else {
    const pick = section === 'lower' ? [0, 1] : [2, 3];
    for (const ti of pick) {
      const [y0, y1, wx, wz] = TIERS[ti];
      geoms.push(box(wx, y1 - y0, wz, tx, (y0 + y1) / 2, sz * LEG_Z));
    }
  }
  return geoms;
}
const PORTALS = [108, 144, 180, 216]; // four portal levels above the roadway
const PORTAL_W = [6, 5.2, 4.4, 3.6]; // portals narrow as the tower rises [G3]
function portalStrutLevel(tx, level) {
  const i = level - 1;
  return [box(PORTAL_W[i], 4, LEG_Z * 2, tx, PORTALS[i], 0)];
}
function flutedHousingLevel(tx, level) {
  // Wide vertical fluting stamped into the steel plate housings [G3].
  const i = level - 1;
  const y = PORTALS[i];
  const w = PORTAL_W[i];
  const geoms = [];
  for (const fx of [-w / 2 - 0.25, w / 2 + 0.25]) {
    geoms.push(box(0.5, 4.8, LEG_Z * 2, tx + fx, y, 0));
    for (let k = 0; k < 9; k++) {
      const z = -LEG_Z + ((2 * LEG_Z) * k) / 8;
      geoms.push(box(0.7, 5, 0.7, tx + fx, y, z));
    }
  }
  return geoms;
}
function cableSaddleSide(tx, sz) {
  return [
    box(3.4, 2.6, 2.4, tx, 237.5, sz * CABLE_Z),
    box(2.2, 1.2, 1.6, tx, 239.4, sz * CABLE_Z),
  ];
}
function chevronLevel(tx, level) {
  // Chevron and fluting ornament in the Art Deco style [G3], south face.
  const i = level - 1;
  const y = PORTALS[i];
  const w = PORTAL_W[i];
  const fx = tx - w / 2 - 0.6;
  return [
    strut([fx, y - 2, -LEG_Z + 2], [fx, y + 1, 0], 1.1),
    strut([fx, y - 2, LEG_Z - 2], [fx, y + 1, 0], 1.1),
  ];
}
const TOWERS = [
  { id: 'nt', name: 'North', system: 'north-tower', tx: TOWER_X, chevron: false },
  { id: 'st', name: 'South', system: 'south-tower', tx: -TOWER_X, chevron: true },
];
for (const tower of TOWERS) {
  for (const [sz, side] of [[1, 'east'], [-1, 'west']]) {
    addPart(`${tower.id}-${side}-leg-below-deck`, `${tower.name} tower ${side} leg, below-deck section`, tower.system, towerLegSection(tower.tx, sz, 'below'));
    addPart(`${tower.id}-${side}-leg-lower-tiers`, `${tower.name} tower ${side} leg, lower tier section`, tower.system, towerLegSection(tower.tx, sz, 'lower'));
    addPart(`${tower.id}-${side}-leg-upper-tiers`, `${tower.name} tower ${side} leg, upper tier section`, tower.system, towerLegSection(tower.tx, sz, 'upper'));
    addPart(`${tower.id}-cable-saddle-${side}`, `${tower.name} tower cable saddle, ${side}`, tower.system, cableSaddleSide(tower.tx, sz));
  }
  for (let level = 1; level <= 4; level++) {
    addPart(`${tower.id}-portal-strut-${level}`, `${tower.name} tower portal strut, level ${level}`, tower.system, portalStrutLevel(tower.tx, level));
    addPart(`${tower.id}-fluted-housing-${level}`, `${tower.name} tower fluted housing, level ${level}`, tower.system, flutedHousingLevel(tower.tx, level));
    if (tower.chevron) {
      addPart(`${tower.id}-chevron-ornament-${level}`, `${tower.name} tower chevron ornament, level ${level}`, tower.system, chevronLevel(tower.tx, level));
    }
  }
}

// --- Tower piers and fender, split into pier, fender rings, and shore apron.
addPart('south-tower-pier', 'South tower pier', 'tower-piers', [
  box(30, 14, 24, -TOWER_X, 7, 0), // anchored to bedrock beneath the water [G2]
]);
{
  // Concrete ring, sand filled, 27 ft thick at base and 10 ft at sea level [G2].
  // Rounded-rectangle ring, exact plan profile not published (schematic).
  const geomsBase = [];
  const geomsSea = [];
  const ring = (geoms, y0, y1, thick, rw, rd) => {
    const N = 36;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (2 * Math.PI * i) / N;
      const cx = Math.cos(a);
      const sz = Math.sin(a);
      // superellipse-ish rounded rectangle
      const ex = Math.sign(cx) * Math.abs(cx) ** 0.6;
      const ez = Math.sign(sz) * Math.abs(sz) ** 0.6;
      pts.push([-TOWER_X + ex * rw, (y0 + y1) / 2, ez * rd]);
    }
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % N];
      geoms.push(strut(p, q, thick, y1 - y0));
    }
  };
  ring(geomsBase, 0, 9, 8.2, 23, 20);  // 27 ft thick at base
  ring(geomsSea, 9, 22, 3.2, 21, 18);  // about 10 ft thick at sea level
  addPart('south-tower-fender-base-ring', 'South tower fender, base ring', 'tower-piers', geomsBase);
  addPart('south-tower-fender-sea-ring', 'South tower fender, sea level ring', 'tower-piers', geomsSea);
}
addPart('north-tower-pier', 'North tower pier', 'tower-piers', [
  box(30, 12, 24, TOWER_X, 6, 0),
]);
addPart('north-tower-pier-shore-apron', 'North tower pier, shore apron', 'tower-piers', [
  box(90, 8, 60, TOWER_X + 45, 4, 0), // Marin shore: pier stands half on land, half in water [G2]
]);

// --- Main cables: main span split east/west; side spans split east/west and
//     north/south; wire bundles at both anchorages, east/west.
function mainSpanCable(sz) {
  const geoms = [];
  const step = 20;
  for (let x = -TOWER_X; x < TOWER_X; x += step) {
    geoms.push(cylStrut([x, cableY(x), sz * CABLE_Z], [x + step, cableY(x + step), sz * CABLE_Z], CABLE_D / 2));
  }
  return geoms;
}
function sideSpanCableSection(sz, sx) {
  // Tower saddle to the wire bundle section at the anchorage.
  const geoms = [];
  const x0 = sx * TOWER_X;
  const x1 = sx * 970;
  const step = 20;
  for (let x = x0; sx > 0 ? x < x1 : x > x1; x += sx * step) {
    const nx = sx > 0 ? Math.min(x + step, x1) : Math.max(x - step, x1);
    geoms.push(cylStrut([x, cableY(x), sz * CABLE_Z], [nx, cableY(nx), sz * CABLE_Z], CABLE_D / 2));
  }
  return geoms;
}
function wireBundle(sx, sz) {
  // Cutaway at the anchorage: the cable opens into its 27,572 wires [G1],
  // shown as a 61-wire hexagonal packing that fans into the splay chamber.
  const geoms = [];
  const wires = [[0, 0]];
  for (let ringN = 1; ringN <= 4; ringN++) {
    for (let k = 0; k < 6 * ringN; k++) {
      const a = (2 * Math.PI * k) / (6 * ringN);
      wires.push([Math.cos(a) * ringN * 0.062, Math.sin(a) * ringN * 0.062]);
    }
  }
  const x0 = sx * 970;
  const x1 = sx * 986;
  for (const [oy, oz] of wires) {
    geoms.push(
      strut(
        [x0, cableY(x0) + oy, sz * CABLE_Z + oz],
        [x1, cableY(x1) + oy * 6, sz * CABLE_Z + oz * 6],
        0.055,
      ),
    );
  }
  return geoms;
}
addPart('cable-east-main-span', 'East main span cable', 'main-cables', mainSpanCable(1));
addPart('cable-west-main-span', 'West main span cable', 'main-cables', mainSpanCable(-1));
for (const [sz, side] of [[1, 'east'], [-1, 'west']]) {
  for (const [sx, end] of [[-1, 'south'], [1, 'north']]) {
    addPart(`cable-${side}-${end}-side-span`, `${side[0].toUpperCase()}${side.slice(1)} side span cable, ${end}`, 'main-cables', sideSpanCableSection(sz, sx));
    addPart(`wire-bundle-${side}-${end}`, `${side[0].toUpperCase()}${side.slice(1)} wire bundle, ${end} anchorage`, 'main-cables', wireBundle(sx, sz));
  }
}

// --- Suspender ropes: 250 pairs [S], grouped into 10 schematic groups of
//     about 25 pairs each along the 6,450 ft suspended span.
const SUSP_N = 250;
const SUSP_DX = (2 * SUSP_END) / SUSP_N; // about 7.86 m per pair, derived
function suspenderGroup(i0, i1) {
  const geoms = [];
  for (let i = i0; i < i1; i++) {
    const x = -SUSP_END + (i + 0.5) * SUSP_DX;
    const top = cableY(x) - 0.4;
    for (const sz of [-1, 1]) {
      geoms.push(cylStrut([x, DECK, sz * CABLE_Z], [x, top, sz * CABLE_Z], 0.12, 6));
    }
  }
  return geoms;
}
const SUSP_GROUPS = [
  ['susp-south-side-span-anchorage-half', 'South side span suspenders, anchorage half', 0, 22],
  ['susp-south-side-span-tower-half', 'South side span suspenders, tower half', 22, 44],
  ['susp-main-span-south-tower-section', 'Main span suspenders, south tower section', 44, 72],
  ['susp-main-span-south-middle-section', 'Main span suspenders, south middle section', 72, 100],
  ['susp-main-span-south-center-section', 'Main span suspenders, south center section', 100, 128],
  ['susp-main-span-north-center-section', 'Main span suspenders, north center section', 128, 156],
  ['susp-main-span-north-middle-section', 'Main span suspenders, north middle section', 156, 184],
  ['susp-main-span-north-tower-section', 'Main span suspenders, north tower section', 184, 206],
  ['susp-north-side-span-tower-half', 'North side span suspenders, tower half', 206, 228],
  ['susp-north-side-span-anchorage-half', 'North side span suspenders, anchorage half', 228, 250],
];
for (const [id, name, i0, i1] of SUSP_GROUPS) {
  addPart(id, name, 'suspenders', suspenderGroup(i0, i1));
}

// --- Stiffening truss: main span trusses split east/west and north/south
//     halves, side span trusses split east/west, and the 1953 to 1954
//     retrofit bracing split into north and south halves. 12 parts.
function trussRun(x0, x1, sz) {
  const geoms = [];
  const top = DECK - 1;
  const bot = DECK - 7;
  geoms.push(box(Math.abs(x1 - x0), 0.7, 0.7, (x0 + x1) / 2, top, sz * CABLE_Z));
  geoms.push(box(Math.abs(x1 - x0), 0.7, 0.7, (x0 + x1) / 2, bot, sz * CABLE_Z));
  const step = 20;
  const dir = x1 > x0 ? 1 : -1;
  for (let x = x0; dir > 0 ? x < x1 : x > x1; x += dir * step) {
    const nx = dir > 0 ? Math.min(x + step, x1) : Math.max(x - step, x1);
    geoms.push(strut([x, bot, sz * CABLE_Z], [x, top, sz * CABLE_Z], 0.5));
    geoms.push(strut([x, bot, sz * CABLE_Z], [nx, top, sz * CABLE_Z], 0.45));
  }
  return geoms;
}
addPart('truss-main-span-east-south', 'Main span east truss, south half', 'stiffening-truss', trussRun(-TOWER_X, 0, 1));
addPart('truss-main-span-east-north', 'Main span east truss, north half', 'stiffening-truss', trussRun(0, TOWER_X, 1));
addPart('truss-main-span-west-south', 'Main span west truss, south half', 'stiffening-truss', trussRun(-TOWER_X, 0, -1));
addPart('truss-main-span-west-north', 'Main span west truss, north half', 'stiffening-truss', trussRun(0, TOWER_X, -1));
addPart('truss-south-side-span-east', 'South side span east truss', 'stiffening-truss', trussRun(-SUSP_END, -TOWER_X, 1));
addPart('truss-south-side-span-west', 'South side span west truss', 'stiffening-truss', trussRun(-SUSP_END, -TOWER_X, -1));
addPart('truss-north-side-span-east', 'North side span east truss', 'stiffening-truss', trussRun(TOWER_X, SUSP_END, 1));
addPart('truss-north-side-span-west', 'North side span west truss', 'stiffening-truss', trussRun(TOWER_X, SUSP_END, -1));
function retrofitBracing(kind, x0, x1) {
  // 1953 to 1954 retrofit: lateral and diagonal bracing connecting the lower
  // chords of the two side trusses [S]. Member layout is schematic.
  const geoms = [];
  if (kind === 'lateral') {
    const bot = DECK - 7;
    for (let x = x0; x < x1; x += 40) {
      geoms.push(strut([x, bot, -CABLE_Z], [x, bot, CABLE_Z], 0.5));
      geoms.push(strut([x, bot, -CABLE_Z], [x + 40, bot, CABLE_Z], 0.4));
    }
  } else {
    const lvl = DECK - 3;
    for (let x = x0; x < x1; x += 40) {
      geoms.push(strut([x, lvl, -CABLE_Z], [x, lvl, CABLE_Z], 0.45));
      geoms.push(strut([x, lvl, CABLE_Z], [x + 40, lvl, -CABLE_Z], 0.4));
      geoms.push(strut([x, lvl, -CABLE_Z], [x + 40, lvl, CABLE_Z], 0.4));
    }
  }
  return geoms;
}
addPart('retrofit-lateral-south', 'Lateral bracing retrofit, south half', 'stiffening-truss', retrofitBracing('lateral', -TOWER_X, 0));
addPart('retrofit-lateral-north', 'Lateral bracing retrofit, north half', 'stiffening-truss', retrofitBracing('lateral', 0, TOWER_X));
addPart('retrofit-diagonal-south', 'Diagonal bracing retrofit, south half', 'stiffening-truss', retrofitBracing('diagonal', -TOWER_X, 0));
addPart('retrofit-diagonal-north', 'Diagonal bracing retrofit, north half', 'stiffening-truss', retrofitBracing('diagonal', 0, TOWER_X));

// --- Deck: roadway split into main span halves and side spans, walkways and
//     railings split east/west, movable median barrier split per span.
addPart('deck-main-roadway-south', 'Main span roadway deck, south half', 'deck', [
  box(TOWER_X, 2.5, 27, -TOWER_X / 2, DECK - 1.25, 0), // 90 ft wide, 6 lanes of US 101 / SR 1 [G1][W]
]);
addPart('deck-main-roadway-north', 'Main span roadway deck, north half', 'deck', [
  box(TOWER_X, 2.5, 27, TOWER_X / 2, DECK - 1.25, 0),
]);
addPart('deck-south-side-span-roadway', 'South side span roadway deck', 'deck', [
  box(SIDE_SPAN, 2.5, 27, -(TOWER_X + SUSP_END) / 2, DECK - 1.25, 0),
]);
addPart('deck-north-side-span-roadway', 'North side span roadway deck', 'deck', [
  box(SIDE_SPAN, 2.5, 27, (TOWER_X + SUSP_END) / 2, DECK - 1.25, 0),
]);
addPart('walkway-east', 'East walkway', 'deck', [box(2 * SUSP_END, 0.4, 2.6, 0, DECK + 0.2, 12.2)]);
addPart('walkway-west', 'West walkway', 'deck', [box(2 * SUSP_END, 0.4, 2.6, 0, DECK + 0.2, -12.2)]);
function walkwayRailing(sz) {
  // Railings between the walkways and the traffic lanes, added in 2003 [W].
  // Post spacing and rail sizes are schematic.
  const geoms = [];
  const z = sz * 13.2;
  for (let x = -SUSP_END; x <= SUSP_END; x += 20) {
    geoms.push(strut([x, DECK, z], [x, DECK + 1.1, z], 0.15));
  }
  geoms.push(box(2 * SUSP_END, 0.12, 0.12, 0, DECK + 1.1, z));
  geoms.push(box(2 * SUSP_END, 0.1, 0.1, 0, DECK + 0.6, z));
  return geoms;
}
addPart('railing-east', 'East walkway railing', 'deck', walkwayRailing(1));
addPart('railing-west', 'West walkway railing', 'deck', walkwayRailing(-1));
addPart('median-barrier-main-span', 'Main span median barrier', 'deck', [
  box(2 * TOWER_X, 1.0, 0.6, 0, DECK + 0.5, 0),
]);
addPart('median-barrier-south-side-span', 'South side span median barrier', 'deck', [
  box(SIDE_SPAN, 1.0, 0.6, -(TOWER_X + SUSP_END) / 2, DECK + 0.5, 0),
]);
addPart('median-barrier-north-side-span', 'North side span median barrier', 'deck', [
  box(SIDE_SPAN, 1.0, 0.6, (TOWER_X + SUSP_END) / 2, DECK + 0.5, 0),
]);

// --- Anchorages: each block split into base plinth and main block, with the
//     splay chambers split east/west. The main cables are fixed in concrete
//     at each end [S]. Concrete shapes are schematic.
function anchoragePlinth(sx) {
  return [box(60, 65, 50, sx * 1007, 32.5, 0)];
}
function anchorageBlock(sx) {
  return [box(45, 35, 34, sx * 1007, 77.5, 0)];
}
function splayChamber(sx, sz) {
  return [box(10, 5, 5, sx * 981, cableY(981), sz * CABLE_Z)];
}
for (const [sx, end] of [[-1, 'south'], [1, 'north']]) {
  addPart(`anchorage-${end}-plinth`, `${end[0].toUpperCase()}${end.slice(1)} anchorage base plinth`, 'anchorages', anchoragePlinth(sx));
  addPart(`anchorage-${end}-block`, `${end[0].toUpperCase()}${end.slice(1)} anchorage main block`, 'anchorages', anchorageBlock(sx));
  for (const [sz, side] of [[1, 'east'], [-1, 'west']]) {
    addPart(`anchorage-${end}-splay-${side}`, `${end[0].toUpperCase()}${end.slice(1)} splay chamber, ${side}`, 'anchorages', splayChamber(sx, sz));
  }
}

// --- Fort Point arch: ribs split east/west with a separate cross bracing
//     part; approach viaducts split into deck and piers per side; entrance
//     pylons split into south and north pairs.
{
  // Graceful steel arch spanning about 320 ft (98 m) over Fort Point [S].
  // Charles Ellis designed it as a bridge within a bridge to avoid
  // demolishing the fort below [W]. Rib geometry is schematic.
  const ax0 = -1030;
  const ax1 = -1128;
  const apex = (ax0 + ax1) / 2;
  const ribY = (x) => 60 + 26 * (1 - ((x - apex) / 49) ** 2);
  for (const [sz, side] of [[1, 'east'], [-1, 'west']]) {
    const geoms = [];
    const N = 20;
    for (let i = 0; i < N; i++) {
      const x = ax0 + ((ax1 - ax0) * i) / N;
      const nx = ax0 + ((ax1 - ax0) * (i + 1)) / N;
      geoms.push(strut([x, ribY(x), sz * 11], [nx, ribY(nx), sz * 11], 1.4));
      const hx = (x + nx) / 2;
      geoms.push(strut([hx, ribY(hx), sz * 11], [hx, DECK - 1.25, sz * 11], 0.5));
    }
    addPart(`fort-point-arch-${side}-rib`, `Fort Point arch, ${side} rib`, 'fort-point', geoms);
  }
  const braceGeoms = [];
  for (let i = 0; i <= 20; i += 2) {
    const x = ax0 + ((ax1 - ax0) * i) / 20;
    braceGeoms.push(strut([x, ribY(x), -11], [x, ribY(x), 11], 0.6));
    if (i < 20) {
      const nx = ax0 + ((ax1 - ax0) * (i + 2)) / 20;
      braceGeoms.push(strut([x, ribY(x), -11], [nx, ribY(nx), 11], 0.45));
    }
  }
  addPart('fort-point-arch-cross-bracing', 'Fort Point arch cross bracing', 'fort-point', braceGeoms);
}
function approachDeck(sx, x0, x1) {
  // Truss causeway approach [W], geometry schematic.
  return [box(Math.abs(x1 - x0), 2.5, 27, (x0 + x1) / 2, DECK - 1.25, 0)];
}
function approachPiers(sx, x0, x1) {
  const geoms = [];
  const step = 48;
  for (let x = Math.min(x0, x1) + step / 2; x < Math.max(x0, x1); x += step) {
    geoms.push(box(3, DECK - 2.5 - 30, 6, x, (DECK - 2.5 + 30) / 2, 9));
    geoms.push(box(3, DECK - 2.5 - 30, 6, x, (DECK - 2.5 + 30) / 2, -9));
    geoms.push(box(3, 2, 24, x, DECK - 3.5, 0));
  }
  return geoms;
}
addPart('approach-south-deck', 'South approach viaduct deck', 'fort-point', approachDeck(-1, -1128, -HALF));
addPart('approach-south-piers', 'South approach viaduct piers', 'fort-point', approachPiers(-1, -1128, -HALF));
addPart('approach-north-deck', 'North approach viaduct deck', 'fort-point', approachDeck(1, SUSP_END + 47, HALF));
addPart('approach-north-piers', 'North approach viaduct piers', 'fort-point', approachPiers(1, SUSP_END + 47, HALF));
{
  // Angular concrete pylons mark the entrance to the bridge [G3].
  for (const [sx, end] of [[-1, 'south'], [1, 'north']]) {
    const geoms = [];
    for (const sz of [-1, 1]) {
      const g = new THREE.BoxGeometry(4, 20, 4);
      g.rotateZ(sx * 0.12);
      g.translate(sx * (HALF - 15), DECK + 10, sz * 16);
      geoms.push(g);
    }
    addPart(`entrance-pylons-${end}`, `Entrance pylons, ${end} pair`, 'fort-point', geoms);
  }
}

// --- Toll plaza: canopy, booths, and columns split apart; light standards
//     split into south approach, suspended span, and north approach runs.
{
  // Toll plaza at the southern end, tolls southbound only [S][W].
  // Booth count and canopy layout are schematic.
  const px = -1300;
  const booths = [];
  for (let k = -2; k <= 2; k++) {
    booths.push(box(3, 3.2, 2.6, px, DECK + 1.6, k * 5));
  }
  addPart('toll-booths', 'Toll booths', 'toll-plaza', booths);
  addPart('toll-plaza-canopy', 'Toll plaza canopy', 'toll-plaza', [
    box(30, 1.5, 27, px, DECK + 7, 0),
  ]);
  const columns = [];
  for (const ox of [-13, 13]) {
    for (const oz of [-12, 12]) {
      columns.push(box(1.2, DECK + 7 - DECK, 1.2, px + ox, (DECK + DECK + 7) / 2, oz));
    }
  }
  addPart('toll-plaza-columns', 'Toll plaza canopy columns', 'toll-plaza', columns);
}
function lightStandardRun(x0, x1) {
  // Morrow's streamlined angled light standards [G3], lining the deck.
  const geoms = [];
  for (let x = x0; x <= x1; x += 50) {
    for (const sz of [-1, 1]) {
      const bx = x;
      const bz = sz * 13;
      geoms.push(strut([bx, DECK, bz], [bx, DECK + 8.6, bz - sz * 1.4], 0.32));
      geoms.push(strut([bx, DECK + 8.6, bz - sz * 1.4], [bx, DECK + 9.4, bz - sz * 4.4], 0.24));
    }
  }
  return geoms;
}
addPart('light-standards-south', 'Art Deco light standards, south approach', 'toll-plaza', lightStandardRun(-1350, -1100));
addPart('light-standards-suspended', 'Art Deco light standards, suspended span', 'toll-plaza', lightStandardRun(-1050, 1100));
addPart('light-standards-north', 'Art Deco light standards, north approach', 'toll-plaza', lightStandardRun(1150, 1350));
{
  // Two foghorns at the base of the south tower, 40 ft above water [W].
  const geoms = [];
  for (const sz of [-1, 1]) {
    const g = new THREE.CylinderGeometry(0.9, 0.35, 3.2, 10);
    g.rotateZ(Math.PI / 2);
    g.translate(-TOWER_X - 14, WATER + 12.2, sz * 17);
    geoms.push(g);
    geoms.push(box(1, 3, 1, -TOWER_X - 12.5, WATER + 10.7, sz * 17));
  }
  addPart('foghorns-south-tower', 'South tower foghorns', 'toll-plaza', geoms);
}

// --- Maintenance access: under deck traveler rails per span section.
//     Rail layout is schematic; the district maintains the bridge continuously.
function travelerRail(x0, x1) {
  const geoms = [];
  const y = DECK - 7.6;
  for (const z of [-8, 8]) {
    geoms.push(box(Math.abs(x1 - x0), 0.3, 0.3, (x0 + x1) / 2, y, z));
  }
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 40) {
    geoms.push(box(0.4, 0.3, 16, x, y, 0));
  }
  return geoms;
}
addPart('traveler-rail-main-span', 'Under-deck traveler rail, main span', 'maintenance-access', travelerRail(-TOWER_X, TOWER_X));
addPart('traveler-rail-south-side-span', 'Under-deck traveler rail, south side span', 'maintenance-access', travelerRail(-SUSP_END, -TOWER_X));
addPart('traveler-rail-north-side-span', 'Under-deck traveler rail, north side span', 'maintenance-access', travelerRail(TOWER_X, SUSP_END));

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
fs.writeFileSync(path.join(outDir, 'golden-gate-0.bin'), buffer);

// ---------------------------------------------------------------- metadata
const SYSTEMS = [
  { id: 'north-tower', name: 'North tower', color: '#c0362c', description: 'Marin side tower. Art Deco steel tower rising 746 ft above the water.' },
  { id: 'south-tower', name: 'South tower', color: '#b53428', description: 'San Francisco side tower. Art Deco steel tower rising 746 ft above the water.' },
  { id: 'tower-piers', name: 'Tower piers and fender', color: '#8b8f93', description: 'Tower foundations and the south fender. The south pier is anchored to bedrock beneath the water; the north pier stands half on land and half in water.' },
  { id: 'main-cables', name: 'Main cables', color: '#a03028', description: 'The two main cables, each 36 3/8 in in diameter and 7,650 ft long, spun from 27,572 wires.' },
  { id: 'suspenders', name: 'Suspender ropes', color: '#cf4a3c', description: '250 pairs of vertical suspender ropes hang the roadway from the two main cables.' },
  { id: 'stiffening-truss', name: 'Stiffening truss and bracing', color: '#bd3a2e', description: 'The stiffening truss plus the lateral and diagonal bracing retrofitted in 1953 to 1954 to keep the deck rigid.' },
  { id: 'deck', name: 'Deck, lanes, and walkways', color: '#33373b', description: 'The 90 ft wide deck with six lanes of US 101 and SR 1, two walkways, railings, and a movable median barrier.' },
  { id: 'anchorages', name: 'Anchorages', color: '#9a9da1', description: 'Concrete blocks that fix the main cables at each end of the bridge.' },
  { id: 'fort-point', name: 'Fort Point arch and approaches', color: '#7f858a', description: 'The steel arch over Fort Point, the approach viaducts, and the angular entrance pylons.' },
  { id: 'toll-plaza', name: 'Toll plaza, lighting, and signals', color: '#4b5055', description: 'The southern toll plaza, the Art Deco light standards, and the south tower foghorns.' },
  { id: 'maintenance-access', name: 'Maintenance access', color: '#5e6a72', description: 'Under deck rails for maintenance travelers. Rail layout is schematic; the bridge is continuously maintained, with 38 painters keeping up the paintwork.' },
];

// Keyed by lowercase part name. Every fact comes from one of the sources
// listed in research/golden-gate-attribution.md; geometry not documented in
// those sources is explicitly marked schematic.
const EXPLANATIONS = {};
for (const tower of TOWERS) {
  const nl = tower.name.toLowerCase();
  for (const side of ['east', 'west']) {
    EXPLANATIONS[`${nl} tower ${side} leg, below-deck section`] = `The ${side} leg of the ${nl} tower below the roadway. The two Art Deco tower legs rise 746 ft above the water, standing 500 ft above the roadway. About 600,000 rivets hold each tower together. Leg section boundaries in the model are schematic.`;
    EXPLANATIONS[`${nl} tower ${side} leg, lower tier section`] = `The lower tiers of the ${side} leg of the ${nl} tower. The tower is stepped back as it rises, with four rectangular portals that decrease in width. Setback dimensions in the model are schematic.`;
    EXPLANATIONS[`${nl} tower ${side} leg, upper tier section`] = `The upper tiers of the ${side} leg of the ${nl} tower, rising to 746 ft above the water. Setback dimensions in the model are schematic.`;
    EXPLANATIONS[`${nl} tower cable saddle, ${side}`] = `Steel saddle on the ${nl} tower top carrying the ${side} main cable. Each cable runs 7,650 ft from anchorage to anchorage.`;
  }
  for (let level = 1; level <= 4; level++) {
    EXPLANATIONS[`${nl} tower portal strut, level ${level}`] = `Level ${level} of four rectangular portals tying the two ${nl} tower legs together. The portals decrease in width as the stepped back tower rises ladderlike from the roadway. Portal sizes in the model are schematic.`;
    EXPLANATIONS[`${nl} tower fluted housing, level ${level}`] = `Wide vertical fluting is stamped into the steel plate housings covering the horizontal bracing struts at portal level ${level}. The fluting is pure Art Deco ornament on structural steel.`;
    if (tower.chevron) {
      EXPLANATIONS[`${nl} tower chevron ornament, level ${level}`] = `Chevron and fluting ornament in the Art Deco style dresses the south tower steelwork at portal level ${level}. Morrow shaped the decorative character of the whole bridge.`;
    }
  }
}
EXPLANATIONS['south tower pier'] = 'The south tower foundation is anchored to bedrock beneath the water. It carries a tower 746 ft above the water.';
EXPLANATIONS['south tower fender, base ring'] = 'The lower ring of the sand filled concrete fender shielding the south tower, 27 ft thick at its base. The ring plan profile in the model is schematic.';
EXPLANATIONS['south tower fender, sea level ring'] = 'The upper ring of the sand filled concrete fender shielding the south tower, about 10 ft thick at sea level. The ring plan profile in the model is schematic.';
EXPLANATIONS['north tower pier'] = 'The north tower foundation stands half on land and half in water. It carries the Marin side tower 746 ft above the water.';
EXPLANATIONS['north tower pier, shore apron'] = 'Schematic apron where the north tower pier meets the Marin shore. The pier stands half on land and half in water; foundation geometry is not published.';
EXPLANATIONS['east main span cable'] = 'Each main cable is 36 3/8 in (0.92 m) in diameter. The pair carries the 4,200 ft main span between the towers.';
EXPLANATIONS['west main span cable'] = 'Each main cable is 36 3/8 in (0.92 m) in diameter. The pair carries the 4,200 ft main span between the towers.';
for (const side of ['east', 'west']) {
  const sc = side[0].toUpperCase() + side.slice(1);
  for (const end of ['south', 'north']) {
    const ec = end[0].toUpperCase() + end.slice(1);
    EXPLANATIONS[`${sc.toLowerCase()} side span cable, ${end}`] = `The ${end} side span run of the ${side} main cable, from the tower saddle down to the anchorage. Each cable runs 7,650 ft from anchorage to anchorage.`;
    EXPLANATIONS[`${sc.toLowerCase()} wire bundle, ${end} anchorage`] = `Each cable is composed of 27,572 steel wires spun in place over the towers; the two cables together hold 80,000 miles of wire. This cutaway shows the cable opening into its wires before it is anchored. Wire packing in the model is schematic.`;
  }
}
for (const [, name] of SUSP_GROUPS) {
  EXPLANATIONS[name.toLowerCase()] = 'One of ten schematic suspender groups along the 6,450 ft suspended span. The roadway weight is hung from 250 pairs of vertical suspender ropes attached to the two main cables.';
}
EXPLANATIONS['main span east truss, south half'] = 'The south half of the east stiffening truss. The truss runs the length of the suspended span to keep the deck rigid in wind. Truss member sizes in the model are schematic.';
EXPLANATIONS['main span east truss, north half'] = 'The north half of the east stiffening truss. The 4,200 ft main span hangs between the two towers. Truss member sizes in the model are schematic.';
EXPLANATIONS['main span west truss, south half'] = 'The south half of the west stiffening truss. The truss runs the length of the suspended span to keep the deck rigid in wind. Truss member sizes in the model are schematic.';
EXPLANATIONS['main span west truss, north half'] = 'The north half of the west stiffening truss. Twin trusses edge the 90 ft wide deck. Truss member sizes in the model are schematic.';
EXPLANATIONS['south side span east truss'] = 'Truss segment carrying the south side span from the tower toward the anchorage. The suspended span totals 6,450 ft including both side spans.';
EXPLANATIONS['south side span west truss'] = 'Truss segment carrying the south side span from the tower toward the anchorage. The suspended span totals 6,450 ft including both side spans.';
EXPLANATIONS['north side span east truss'] = 'Truss segment carrying the north side span from the tower toward the anchorage. The suspended span totals 6,450 ft including both side spans.';
EXPLANATIONS['north side span west truss'] = 'Truss segment carrying the north side span from the tower toward the anchorage. The suspended span totals 6,450 ft including both side spans.';
EXPLANATIONS['lateral bracing retrofit, south half'] = 'In 1953 to 1954, lateral and diagonal bracing was retrofitted to connect the lower chords of the two side trusses, stiffening the deck in torsion against wind. Bracing layout in the model is schematic.';
EXPLANATIONS['lateral bracing retrofit, north half'] = 'In 1953 to 1954, lateral and diagonal bracing was retrofitted to connect the lower chords of the two side trusses, stiffening the deck in torsion against wind. Bracing layout in the model is schematic.';
EXPLANATIONS['diagonal bracing retrofit, south half'] = 'Diagonal bracing added in 1953 to 1954 ties the truss chords together against wind loads. Bracing layout in the model is schematic.';
EXPLANATIONS['diagonal bracing retrofit, north half'] = 'Diagonal bracing added in 1953 to 1954 ties the truss chords together against wind loads. Bracing layout in the model is schematic.';
EXPLANATIONS['main span roadway deck, south half'] = 'The 90 ft wide deck carries 6 lanes of US 101 and SR 1 and stands about 245 ft above the water. From 1982 to 1986 the original concrete deck was replaced in 747 sections with steel orthotropic panels 40 percent lighter. The deck split in the model is schematic.';
EXPLANATIONS['main span roadway deck, north half'] = 'The 90 ft wide deck carries 6 lanes of US 101 and SR 1 and stands about 245 ft above the water. The deck split in the model is schematic.';
EXPLANATIONS['south side span roadway deck'] = 'Side span decks continue the 90 ft roadway from the main span toward the anchorages. The deck split in the model is schematic.';
EXPLANATIONS['north side span roadway deck'] = 'Side span decks continue the 90 ft roadway from the main span toward the anchorages. The deck split in the model is schematic.';
EXPLANATIONS['east walkway'] = 'The main walkway is on the eastern side, used by pedestrians and bicycles at different hours. Railings between the walkways and the traffic lanes were added in 2003. Walkway geometry is schematic.';
EXPLANATIONS['west walkway'] = 'The western walkway is open to bicyclists only during the hours they are not allowed on the eastern walkway. Railings between the walkways and the traffic lanes were added in 2003. Walkway geometry is schematic.';
EXPLANATIONS['east walkway railing'] = 'Railing separating the east walkway from the traffic lanes. The walkway railings were added in 2003 as a measure to keep bicyclists out of the roadway. Railing geometry is schematic.';
EXPLANATIONS['west walkway railing'] = 'Railing separating the west walkway from the traffic lanes. The walkway railings were added in 2003 as a measure to keep bicyclists out of the roadway. Railing geometry is schematic.';
EXPLANATIONS['main span median barrier'] = 'A movable barrier divides the six lanes and is shifted several times daily to match traffic direction patterns. The barrier system was installed in January 2015.';
EXPLANATIONS['south side span median barrier'] = 'The movable barrier continues over the south side span. It is shifted several times daily to match traffic direction patterns.';
EXPLANATIONS['north side span median barrier'] = 'The movable barrier continues over the north side span. It is shifted several times daily to match traffic direction patterns.';
for (const end of ['south', 'north']) {
  EXPLANATIONS[`${end} anchorage base plinth`] = `The concrete base where the ${end} cables are fixed at the end of the bridge. The bridge weighs 840 million lb, not counting the concrete anchorages. Anchorage geometry is schematic.`;
  EXPLANATIONS[`${end} anchorage main block`] = end === 'south'
    ? 'The main cables are fixed in concrete at each end of the bridge. The anchorage blocks hold the full pull of the cables. Joseph Strauss placed a brick from his alma mater in the south anchorage before the concrete was poured. Block geometry is schematic.'
    : 'The main cables are fixed in concrete at each end of the bridge. The anchorage blocks hold the full pull of the cables. Block geometry is schematic.';
  EXPLANATIONS[`${end} splay chamber, east`] = `Inside the ${end} anchorage the east cable splays into strands fixed in the concrete. Chamber geometry is schematic.`;
  EXPLANATIONS[`${end} splay chamber, west`] = `Inside the ${end} anchorage the west cable splays into strands fixed in the concrete. Chamber geometry is schematic.`;
}
EXPLANATIONS['fort point arch, east rib'] = 'A graceful steel arch spanning about 320 ft carries the roadway over Fort Point to the southern anchorage. Charles Ellis designed it as a bridge within a bridge to avoid demolishing the Civil War era fort below. Rib geometry is schematic.';
EXPLANATIONS['fort point arch, west rib'] = 'A graceful steel arch spanning about 320 ft carries the roadway over Fort Point to the southern anchorage. Charles Ellis designed it as a bridge within a bridge to avoid demolishing the Civil War era fort below. Rib geometry is schematic.';
EXPLANATIONS['fort point arch cross bracing'] = 'Cross bracing ties the two ribs of the Fort Point arch together. Bracing layout in the model is schematic.';
EXPLANATIONS['south approach viaduct deck'] = 'Truss causeways carry the roadway from the anchorage to the toll plaza. The bridge is 8,981 ft long from abutment to abutment. Viaduct geometry is schematic.';
EXPLANATIONS['south approach viaduct piers'] = 'Support piers under the southern approach viaduct. Pier geometry is schematic.';
EXPLANATIONS['north approach viaduct deck'] = 'Truss causeways carry the roadway from the north anchorage toward the Marin abutment. Viaduct geometry is schematic.';
EXPLANATIONS['north approach viaduct piers'] = 'Support piers under the northern approach viaduct. Pier geometry is schematic.';
EXPLANATIONS['entrance pylons, south pair'] = 'Angular concrete pylons mark the entrance to the bridge. They belong to the bridge Art Deco styling.';
EXPLANATIONS['entrance pylons, north pair'] = 'Angular concrete pylons mark the entrance to the bridge. They belong to the bridge Art Deco styling.';
EXPLANATIONS['toll booths'] = 'Toll booths at the southern end of the bridge. Tolls are collected southbound only. Booth count and layout in the model are schematic.';
EXPLANATIONS['toll plaza canopy'] = 'The toll plaza sits at the southern end of the bridge. Tolls are collected southbound only, and clearance at the toll gates is 14 ft. Canopy geometry is schematic.';
EXPLANATIONS['toll plaza canopy columns'] = 'Columns supporting the toll plaza canopy. Column layout in the model is schematic.';
EXPLANATIONS['art deco light standards, south approach'] = 'Morrow designed streamlined angled light standards for the roadway. They line the full 8,981 ft length. Light standard placement in the model is schematic.';
EXPLANATIONS['art deco light standards, suspended span'] = 'Morrow designed streamlined angled light standards for the roadway. They line the full 8,981 ft length. Light standard placement in the model is schematic.';
EXPLANATIONS['art deco light standards, north approach'] = 'Morrow designed streamlined angled light standards for the roadway. They line the full 8,981 ft length. Light standard placement in the model is schematic.';
EXPLANATIONS['south tower foghorns'] = 'Two foghorns are mounted at the base of the south tower, 40 ft above the water.';
EXPLANATIONS['under-deck traveler rail, main span'] = 'Under deck rails carry maintenance travelers for inspection and repair along the main span. The bridge is continuously maintained, with 38 painters keeping up the international orange paintwork. Rail layout in the model is schematic.';
EXPLANATIONS['under-deck traveler rail, south side span'] = 'Under deck rails carry maintenance travelers for inspection and repair along the south side span. Rail layout in the model is schematic.';
EXPLANATIONS['under-deck traveler rail, north side span'] = 'Under deck rails carry maintenance travelers for inspection and repair along the north side span. Rail layout in the model is schematic.';

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Golden Gate Bridge, San Francisco',
  title: 'Golden Gate Bridge',
  location: 'San Francisco, USA',
  blurb: 'The 2,737 m Golden Gate Bridge carries six lanes of US 101 across the strait between San Francisco and Marin County, hung from two 227 m Art Deco towers by cables spun from 27,572 wires each.',
  sourceUrls: [
    { label: 'Golden Gate Bridge District: Facts and Figures', url: 'https://www.goldengate.org/exhibits/facts-and-figures-about-the-bridge/' },
    { label: 'Wikipedia: Golden Gate Bridge', url: 'https://en.wikipedia.org/wiki/Golden_Gate_Bridge' },
    { label: 'Structurae: Golden Gate Bridge', url: 'https://structurae.net/en/structures/golden-gate-bridge' },
    { label: 'Golden Gate Bridge District: NTSB statement', url: 'https://www.goldengate.org/golden-gate-bridge-district-statement-on-recent-ntsb-report/' },
    { label: 'Golden Gate Bridge District: Art Deco Style', url: 'https://www.goldengate.org/assets/1/6/art_deco_ggb1.pdf' },
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
  chunks: [{ url: '/models/golden-gate/golden-gate-0.bin', bytes: offset }],
  triangles,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
