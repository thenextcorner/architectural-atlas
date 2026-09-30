// Procedural White House for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned White House in code and writes it
// in the atlas binary format: public/models/white-house/atlas.json +
// public/models/white-house/white-house-0.bin
//
// Dimensions used (all from the research file research/white-house.md):
//   Executive Residence footprint about 170 x 85 ft (52 x 26 m)
//   South Portico 61 ft wide, 6 Ionic columns, finished 1824
//   Curved double stairs rise almost 13 ft
//   North Portico tetrastyle (4 Ionic columns), 1829-1831
//   Six levels: Ground, State, Second, Third + two-story basement, 55,000 sq ft
//   North-side basement 12 to 13 ft below grade
//   East Room 40 x 82 ft; 132 rooms, 35 bathrooms, 412 doors, 147 windows,
//   28 fireplaces, 8 staircases, 3 elevators, 5 full-time chefs
//   Hip roof with 1927 shed dormers; Truman steel frame 1948-52;
//   two sub-basements with bomb shelter; $5.7M project, done March 27, 1952
//   Rose Garden: Mellon 1962 redesign, 50 by 100 ft central lawn, 12 ft borders
//   Jacqueline Kennedy Garden: 36 by 19 m, I. M. Pei pergola, dedicated 1965
//   Grounds: just over 18 acres (7.3 ha); 1935 Olmsted Jr. layout
//   Fence: over 3,500 ft of steel; 6 ft 6 in fence replaced by ~13 ft fence
//   from 2019; six vehicular and nine pedestrian gates
//
// The model shows the PRE-2025 configuration (the original East Wing was
// demolished in 2025). No reliable published overall height exists, so every
// vertical dimension above grade is a schematic proportion derived from the
// documented 170 x 85 ft footprint and is never stated as fact in the UI.
//
// Granularity: 129 named parts across 12 systems. Every explanation is either
// a sourced fact (see ~/workspace/architectural-atlas/research/
// white-house-attribution.md) or explicitly marked schematic.
//
// Usage: node scripts/generate-white-house.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'white-house');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: 52 m (main block length) maps to 2.4 units.
const S = 2.4 / 52;

// ---------------------------------------------------------------- helpers
function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
function cyl(rt, rb, h, seg, x, y, z, ts = 0, tl = Math.PI * 2, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, ts, tl);
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
// Triangular prism (pediments): apex up, base at local y = -h/3.
function triPrism(w, h, d) {
  const g = new THREE.CylinderGeometry(1, 1, d, 3, 1);
  g.rotateX(-Math.PI / 2);
  g.scale(w / 1.732, h / 1.5, 1);
  return g;
}
// Segmental (curved-top) pediment: upper half-disc in XY, thickness d along z.
function segPediment(r, d) {
  const g = new THREE.CylinderGeometry(r, r, d, 12, 1, false, Math.PI / 2, Math.PI);
  g.rotateX(Math.PI / 2);
  return g;
}
// Ionic-ish column: tapered shaft, capital box, abacus, volute scroll hints.
function ionicColumn(x, z, y0, h, r) {
  const geoms = [];
  const shaft = new THREE.CylinderGeometry(r * 0.92, r, h, 14);
  shaft.translate(x, y0 + h / 2, z);
  geoms.push(shaft);
  const cap = new THREE.BoxGeometry(r * 2.6, r * 0.9, r * 2.6);
  cap.translate(x, y0 + h + r * 0.45, z);
  geoms.push(cap);
  const abacus = new THREE.BoxGeometry(r * 3.0, r * 0.35, r * 3.0);
  abacus.translate(x, y0 + h + r * 0.9 + r * 0.175, z);
  geoms.push(abacus);
  for (const s of [-1, 1]) {
    const vol = new THREE.CylinderGeometry(r * 0.32, r * 0.32, r * 2.6, 10);
    vol.rotateX(Math.PI / 2);
    vol.translate(x, y0 + h + r * 0.45, z + s * r * 1.15);
    geoms.push(vol);
  }
  return geoms;
}
// Straight run of perimeter fence: pickets, two rails, posts every 6 units.
function fenceRun(x0, z0, x1, z1) {
  const geoms = [];
  const len = Math.hypot(x1 - x0, z1 - z0);
  geoms.push(strut([x0, 3.7, z0], [x1, 3.7, z1], 0.18));
  geoms.push(strut([x0, 0.6, z0], [x1, 0.6, z1], 0.18));
  const n = Math.max(2, Math.round(len / 6));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    geoms.push(cyl(0.14, 0.14, 4, 8, x0 + (x1 - x0) * t, 2, z0 + (z1 - z0) * t));
  }
  const p = Math.max(2, Math.round(len / 0.9));
  for (let i = 0; i <= p; i++) {
    const t = i / p;
    geoms.push(box(0.07, 3.2, 0.07, x0 + (x1 - x0) * t, 2.1, z0 + (z1 - z0) * t));
  }
  return geoms;
}

// ---------------------------------------------------------------- parts
const parts = [];
const explanations = {};
const addPart = (id, name, system, geoms, explanation) => {
  parts.push({ id, name, system, geoms });
  explanations[name] = explanation;
};

// ================= 1. Executive Residence massing (shell) =================
{
  const H = 17.6; // schematic facade height, never stated as fact
  addPart('shell-north-facade', 'north facade', 'shell',
    [box(52, H, 0.6, 0, H / 2, -13)],
    'The north front of the main block, about 170 ft of Aquia Creek sandstone painted white. The tetrastyle North Portico projects from its center.');
  addPart('shell-south-facade', 'south facade', 'shell',
    [box(52, H, 0.6, 0, H / 2, 13)],
    'The south front stretches about 170 ft, with the 168 ft south elevation documented by the White House Historical Association. The semicircular South Portico projects from its center.');
  addPart('shell-east-facade', 'east facade', 'shell',
    [box(0.6, H, 26, 26, H / 2, 0)],
    'The east end of the main block, about 85 ft deep. A row of pilasters rings the house on three sides.');
  addPart('shell-west-facade', 'west facade', 'shell',
    [box(0.6, H, 26, -26, H / 2, 0)],
    'The west end of the main block, about 85 ft deep. The West Colonnade extends from this side toward the West Wing.');
  addPart('shell-rusticated-base', 'rusticated ground floor walls', 'shell',
    [box(52.8, 4.4, 26.8, 0, 2.2, 0)],
    'The ground floor walls are rusticated stonework, shown here as a slightly proud band around the base. The north-side basement extends 12 to 13 ft below grade behind them.');
  const pil = [];
  for (let x = -24; x <= 24; x += 4) pil.push(box(0.9, 8.8, 0.35, x, 8.8, -13.35));
  for (let z = -12; z <= 12; z += 4) {
    pil.push(box(0.35, 8.8, 0.9, 26.35, 8.8, z));
    pil.push(box(0.35, 8.8, 0.9, -26.35, 8.8, z));
  }
  addPart('shell-pilastrade', 'pilastrade ring', 'shell', pil,
    'A row of pilasters rings the house on three sides, and the South Portico columns continue it three-dimensionally. Documented by the White House Historical Association.');
  const par = [
    box(52.4, 1.1, 0.35, 0, 18.15, -13),
    box(52.4, 1.1, 0.35, 0, 18.15, 13),
    box(0.35, 1.1, 26.4, -26, 18.15, 0),
    box(0.35, 1.1, 26.4, 26, 18.15, 0),
  ];
  for (let x = -25; x <= 25; x += 1.5) {
    par.push(cyl(0.07, 0.07, 0.8, 6, x, 18.15, -13));
    par.push(cyl(0.07, 0.07, 0.8, 6, x, 18.15, 13));
  }
  for (let z = -12; z <= 12; z += 1.5) {
    par.push(cyl(0.07, 0.07, 0.8, 6, -26, 18.15, z));
    par.push(cyl(0.07, 0.07, 0.8, 6, 26, 18.15, z));
  }
  addPart('shell-parapet', 'balustraded parapet', 'shell', par,
    'A balustraded parapet crowns the main block above the cornice. Shown schematically.');
  // Window bays per facade (house has 147 windows in total).
  const northWin = [];
  for (let x = -22; x <= 22; x += 4) {
    if (Math.abs(x) < 10) continue;
    northWin.push(box(1.6, 2.6, 0.2, x, 6.4, -13.35));
    northWin.push(box(1.6, 2.6, 0.2, x, 10.8, -13.35));
  }
  addPart('shell-north-windows', 'north facade window bays', 'shell', northWin,
    'Window bays of the north front on the state and second floors. The house has 147 windows in total; bay placement shown schematically.');
  const southWin = [];
  for (let x = -22; x <= 22; x += 4) {
    if (Math.abs(x) < 11) continue;
    southWin.push(box(1.6, 2.6, 0.2, x, 6.4, 13.35));
    southWin.push(box(1.6, 2.6, 0.2, x, 10.8, 13.35));
  }
  addPart('shell-south-windows', 'south facade window bays', 'shell', southWin,
    'Window bays of the south front on the state and second floors, flanking the central bow. Bay placement shown schematically.');
  const eastWin = [];
  const westWin = [];
  for (let z = -12; z <= 12; z += 4) {
    eastWin.push(box(0.2, 2.6, 1.6, 26.35, 6.4, z));
    eastWin.push(box(0.2, 2.6, 1.6, 26.35, 10.8, z));
    westWin.push(box(0.2, 2.6, 1.6, -26.35, 6.4, z));
    westWin.push(box(0.2, 2.6, 1.6, -26.35, 10.8, z));
  }
  addPart('shell-east-windows', 'east facade window bays', 'shell', eastWin,
    'Window bays of the east end on the state and second floors. Bay placement shown schematically.');
  addPart('shell-west-windows', 'west facade window bays', 'shell', westWin,
    'Window bays of the west end on the state and second floors. Bay placement shown schematically.');
  addPart('shell-cornice', 'main cornice', 'shell',
    [box(52.8, 0.6, 26.8, 0, 17.3, 0), box(53.2, 0.3, 27.2, 0, 17.65, 0)],
    'The main cornice band below the balustraded parapet. Shown schematically.');
  const chim = [];
  for (const cx of [-14, 14]) for (const cz of [-5, 5]) chim.push(box(1.6, 3, 1.6, cx, 19.5, cz));
  addPart('shell-chimneys', 'roof chimney stacks', 'shell', chim,
    'Chimney stacks rising above the hip roof. The house has 28 fireplaces; stack count and placement shown schematically.');
}

// ================= 2. North Portico =================
{
  const ped = triPrism(16.5, 3.2, 7);
  ped.translate(0, 17.6 + 3.2 / 3, -16.5);
  addPart('np-pediment', 'north portico pediment', 'northportico', [ped],
    'The triangular pediment caps the 1829 to 1831 North Portico. Pediment height shown schematically.');
  addPart('np-entablature', 'north portico entablature', 'northportico',
    [box(16.5, 2.0, 7, 0, 16.6, -16.5)],
    'The horizontal entablature carried by the four Ionic columns. It spans the full width of the tetrastyle front.');
  const colX = [-6, -2, 2, 6];
  colX.forEach((x, i) => {
    addPart(`np-column-${i + 1}`, `north portico column ${i + 1}`, 'northportico',
      ionicColumn(x, -17, 1.0, 14.6, 0.75),
      'One of four Ionic columns of the tetrastyle North Portico, called the most notable four-columned portico in the United States. The columns rise from the ground to the roof pediment; column height shown schematically.');
  });
  const plinths = [box(16, 0.5, 7, 0, 2.35, -16.5)];
  for (const x of colX) plinths.push(box(1.8, 1.0, 1.8, x, 0.5, -17));
  addPart('np-plinths', 'north portico floor and plinths', 'northportico', plinths,
    'Square plinths raise the Ionic columns above the portico floor. The porte cochere floor sits above the carriage drive.');
  addPart('np-ramp', 'porte cochere carriage ramp', 'northportico',
    [strut([0, 0, -28], [0, 2.6, -20], 8, 0.4)],
    'The carriage ramp of the porte cochere, where vehicles pass beneath the portico. Ramp slope shown schematically.');
  const steps = [];
  for (const sx of [-6.5, 6.5]) {
    for (let k = 0; k < 6; k++) {
      steps.push(box(3.2, 0.35, 1.1, sx, 0.35 + k * 0.42, -21.5 + k * 0.85));
    }
  }
  steps.push(box(16, 0.4, 2.2, 0, 2.55, -19.6));
  addPart('np-steps', 'north portico steps and landing', 'northportico', steps,
    'Steps flanking the carriage ramp rise to the porte cochere floor. Shown schematically.');
  addPart('np-door', 'north door', 'northportico',
    [box(2.4, 4, 0.5, 0, 4.6, -12.8)],
    'The ceremonial north entrance beneath the portico. Door and surround shown schematically.');
}

// ================= 3. South Portico =================
{
  const angles = [-75, -45, -15, 15, 45, 75];
  angles.forEach((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const x = 9.3 * Math.sin(a);
    const z = 13 + 9.3 * Math.cos(a);
    addPart(`sp-column-${i + 1}`, `south portico column ${i + 1}`, 'southportico',
      ionicColumn(x, z, 4.8, 8.4, 0.7),
      'One of six Ionic columns of the semicircular South Portico, finished in 1824. The shafts are Seneca sandstone made in sections and pinned at their centers with iron; column height shown schematically.');
  });
  const plinths = angles.map((deg) => {
    const a = (deg * Math.PI) / 180;
    return box(1.6, 0.8, 1.6, 9.3 * Math.sin(a), 4.4, 13 + 9.3 * Math.cos(a));
  });
  addPart('sp-plinths', 'south portico column plinths', 'southportico', plinths,
    'Square plinths raise each column shaft above the podium. The shafts were raised on square plinths when the portico was built.');
  const stair = (sign) => {
    const geoms = [];
    for (let k = 0; k < 12; k++) {
      const t = k / 11;
      const ang = (sign * (35 + 45 * t) * Math.PI) / 180;
      const rk = 14.5 - 3.5 * t;
      const g = new THREE.BoxGeometry(1.5, 0.35, 2.4);
      g.rotateY(ang);
      g.translate(rk * Math.sin(ang), 4 * t + 0.175, 13 + rk * Math.cos(ang));
      geoms.push(g);
    }
    return geoms;
  };
  addPart('sp-stair-east', 'east curved stair', 'southportico', stair(1),
    'One flight of the elegant curved double stair that rises almost 13 ft from the ground to the portico floor. Stair geometry shown schematically.');
  addPart('sp-stair-west', 'west curved stair', 'southportico', stair(-1),
    'One flight of the elegant curved double stair that rises almost 13 ft from the ground to the portico floor. Stair geometry shown schematically.');
  const railGeoms = [];
  for (const sign of [1, -1]) {
    let prev = null;
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const ang = (sign * (38 + 42 * t) * Math.PI) / 180;
      const rk = 15.9 - 3.4 * t;
      const p = [rk * Math.sin(ang), 4 * t + 1.15, 13 + rk * Math.cos(ang)];
      if (prev) railGeoms.push(strut(prev, p, 0.12));
      railGeoms.push(strut([p[0], 4 * t + 0.2, p[2]], p, 0.09));
      prev = p;
    }
  }
  addPart('sp-stair-balustrade', 'curved stair balustrades', 'southportico', railGeoms,
    'Balustrades flanking the curved double stair. Shown schematically.');
  const podium = cyl(10.5, 10.5, 4, 28, 0, 2, 13, -Math.PI / 2, Math.PI);
  addPart('sp-podium', 'south portico podium', 'southportico', [podium],
    'The tall podium carrying the South Portico, rising almost 13 ft above the ground. Its thick walls are pierced by seven arched openings.');
  const arches = [];
  for (let k = 0; k < 7; k++) {
    const deg = -60 + k * 20;
    const a = (deg * Math.PI) / 180;
    const x = 10.55 * Math.sin(a);
    const z = 13 + 10.55 * Math.cos(a);
    const inset = new THREE.CircleGeometry(0.85, 12, 0, Math.PI);
    inset.rotateY(a);
    inset.translate(x, 1.6, z);
    arches.push(inset);
    arches.push(box(1.7, 1.6, 0.12, x, 0.8, z));
    const frame = new THREE.TorusGeometry(0.95, 0.12, 6, 12, Math.PI);
    frame.rotateY(a);
    frame.translate(x, 1.6, z);
    arches.push(frame);
  }
  addPart('sp-arches', 'podium arched openings', 'southportico', arches,
    'Seven arched openings pierce the podium walls, the only outward expression of the groin vaults within. Documented by the White House Historical Association.');
  const ent = [
    cyl(9.9, 9.9, 1.4, 28, 0, 14.6, 13, -Math.PI / 2, Math.PI),
    cyl(10.4, 10.4, 0.5, 28, 0, 15.55, 13, -Math.PI / 2, Math.PI),
    cyl(10.2, 10.2, 0.8, 28, 0, 16.2, 13, -Math.PI / 2, Math.PI, true),
  ];
  addPart('sp-entablature', 'south portico entablature', 'southportico', ent,
    'The curved entablature crowning the six-column colonnade. The full portico is 61 ft wide.');
  const bal = [];
  const rail = new THREE.TorusGeometry(10.2, 0.09, 6, 28, Math.PI);
  rail.rotateX(Math.PI / 2);
  rail.translate(0, 16.65, 13);
  bal.push(rail);
  for (let k = 0; k <= 10; k++) {
    const a = ((-80 + k * 16) * Math.PI) / 180;
    bal.push(box(0.12, 0.7, 0.12, 10.2 * Math.sin(a), 16.2, 13 + 10.2 * Math.cos(a)));
  }
  addPart('sp-roof-balustrade', 'south portico roof balustrade', 'southportico', bal,
    'The roof balustrade above the curved entablature. Shown schematically.');
  const balc = [
    cyl(9.8, 9.8, 0.35, 28, 0, 8.8, 13, -Math.PI / 2, Math.PI),
    cyl(9.8, 9.8, 1.0, 28, 0, 9.5, 13, -Math.PI / 2, Math.PI, true),
  ];
  const brail = new THREE.TorusGeometry(9.8, 0.08, 6, 28, Math.PI);
  brail.rotateX(Math.PI / 2);
  brail.translate(0, 10.05, 13);
  balc.push(brail);
  addPart('sp-balcony', 'truman balcony', 'southportico', balc,
    'The second-floor balcony added to the South Portico by President Truman. Shown at the second-floor level.');
}

// ================= 4. Vaults and undercroft =================
{
  const vaults = [];
  const bay = (cx, cz, s, ySpring) => {
    const diag = (Math.SQRT2 * s) / 2;
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const t = new THREE.TorusGeometry(diag, 0.16, 6, 14, Math.PI);
      t.rotateY(a);
      t.translate(cx, ySpring, cz);
      vaults.push(t);
    }
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const t = new THREE.TorusGeometry(s / 2, 0.14, 6, 12, Math.PI);
      t.rotateY(a);
      t.translate(cx + Math.sin(a) * s / 2, ySpring, cz + Math.cos(a) * s / 2);
      vaults.push(t);
    }
  };
  for (const cx of [-3.4, 0, 3.4]) for (const cz of [14.6, 17.8]) bay(cx, cz, 3.2, 2.0);
  addPart('v-groin', 'south portico groin vaults', 'vaults', vaults,
    'Groin vaults carry the South Portico floor and remain as Hoban built them, among the only historic structural systems still doing their original job. Vault geometry shown schematically.');
  const seg = new THREE.CylinderGeometry(2.2, 2.2, 13, 16, 1, true, 0, Math.PI);
  seg.rotateZ(Math.PI / 2);
  seg.translate(0, 0, -16.5);
  addPart('v-segmental', 'north portico segmental vault', 'vaults', [seg],
    'A segmental vault built under the North Portico by Latrobe in 1807 and 1808, duplicated by Hoban in 1829 and 1830. Shown schematically.');
  addPart('v-service', 'basement service rooms', 'vaults',
    [
      box(48, 3.6, 0.3, 0, -1.9, -6),
      box(48, 3.6, 0.3, 0, -1.9, 6),
      box(0.3, 3.6, 20, -12, -1.9, 0),
      box(0.3, 3.6, 20, 12, -1.9, 0),
    ],
    'Service rooms fill the two-story basement beneath the main block. Layout shown schematically.');
  addPart('v-areaway', 'north areaway light well', 'vaults',
    [
      box(40, 3.6, 0.4, 0, -1.9, -14.4),
      box(40, 3.6, 0.4, 0, -1.9, -16.4),
      box(40, 0.3, 2.4, 0, -3.65, -15.4),
    ],
    'A sunken areaway along the north front brings light to the basement rooms. Shown schematically.');
}

// ================= 5. Colonnades and terraces =================
{
  // Each colonnade is two column runs plus a roof slab.
  const colonnadeRun = (sign, zrow) => {
    const geoms = [box(9, 0.4, 1.4, sign * 30, 0.2, zrow)];
    for (let x = 27; x <= 33; x += 1.5) geoms.push(cyl(0.3, 0.3, 3.2, 10, sign * x, 2.0, zrow));
    geoms.push(box(9, 0.5, 0.6, sign * 30, 3.85, zrow));
    return geoms;
  };
  addPart('c-east-north-run', 'east colonnade north column run', 'colonnades',
    colonnadeRun(1, -2),
    'The north column row of the East Colonnade, built by Jefferson with Benjamin Henry Latrobe and raised to conceal stables and storage. It links the residence with the East Wing; length shown schematically.');
  addPart('c-east-south-run', 'east colonnade south column run', 'colonnades',
    colonnadeRun(1, 2),
    'The south column row of the East Colonnade, built by Jefferson with Benjamin Henry Latrobe. White House visitors touring the house pass the Jacqueline Kennedy Garden along this colonnade; length shown schematically.');
  addPart('c-east-roof', 'east colonnade roof', 'colonnades',
    [box(9.5, 0.3, 5.4, 30, 4.25, 0)],
    'The roof slab over the East Colonnade. Shown schematically.');
  addPart('c-west-north-run', 'west colonnade north column run', 'colonnades',
    colonnadeRun(-1, -2),
    'The north column row of the West Colonnade, built by Jefferson with Benjamin Henry Latrobe and raised to conceal stables and storage. It links the residence with the West Wing; length shown schematically.');
  addPart('c-west-south-run', 'west colonnade south column run', 'colonnades',
    colonnadeRun(-1, 2),
    'The south column row of the West Colonnade, built by Jefferson with Benjamin Henry Latrobe. The Rose Garden borders this colonnade; length shown schematically.');
  addPart('c-west-roof', 'west colonnade roof', 'colonnades',
    [box(9.5, 0.3, 5.4, -30, 4.25, 0)],
    'The roof slab over the West Colonnade. Shown schematically.');
  addPart('c-east-terrace', 'east terrace', 'colonnades',
    [box(10, 0.3, 8, 30, 0.15, 7.5)],
    'Paved terrace beside the East Colonnade. Shown schematically.');
  addPart('c-west-terrace', 'west terrace', 'colonnades',
    [box(10, 0.3, 8, -30, 0.15, 7.5)],
    'Paved terrace beside the West Colonnade. Shown schematically.');
}

// ================= 6. West Wing =================
{
  addPart('ww-block', 'west wing office block', 'westwing',
    [box(24, 9, 18, -46, 4.5, 0), box(24.6, 0.4, 18.6, -46, 9.2, 0)],
    'Theodore Roosevelt had all work offices relocated to the newly constructed West Wing in 1902. Footprint and height shown schematically.');
  const oval = new THREE.CylinderGeometry(1, 1, 4.5, 24);
  oval.scale(4.2, 1, 3.4);
  oval.translate(-38, 2.25, 9);
  const ovalRoof = new THREE.CylinderGeometry(1, 1, 0.3, 24);
  ovalRoof.scale(4.4, 1, 3.6);
  ovalRoof.translate(-38, 4.6, 9);
  addPart('ww-oval', 'oval office', 'westwing', [oval, ovalRoof],
    'The Oval Office was created in 1909 by William Howard Taft with architect Nathan C. Wyeth, and moved to its present location at the southeast corner of the West Wing, adjacent to the Rose Garden, under Franklin D. Roosevelt in the 1930s. Shown schematically within the West Wing.');
  addPart('ww-cabinet-room', 'cabinet room', 'westwing',
    [
      box(9, 4, 7, -38, 2.25, 0.5),
      box(4.5, 0.15, 2.2, -38, 3.1, 0.5),
      box(3.6, 0.9, 1.4, -38, 2.6, 0.5),
    ],
    'The Cabinet Room, where the president conducts business meetings and where the Cabinet meets, adjoining the Oval Office. Layout shown schematically.');
  addPart('ww-roosevelt-room', 'roosevelt room', 'westwing',
    [
      box(8, 4, 6.5, -47, 2.25, -3.5),
      box(4, 0.15, 2, -47, 3.1, -3.5),
      box(3.2, 0.9, 1.2, -47, 2.6, -3.5),
    ],
    'The Roosevelt Room, a windowless conference room named by President Nixon in 1969 to honor Theodore Roosevelt, who started the West Wing, and Franklin D. Roosevelt, who enlarged it. Layout shown schematically.');
  addPart('ww-press-briefing-room', 'james s. brady press briefing room', 'westwing',
    [
      box(11, 4.2, 8, -52.5, 2.6, 0),
      box(1.4, 1.2, 0.9, -52.5, 1.1, 2.8),
      box(8, 0.5, 1.2, -52.5, 1.0, -1),
      box(8, 0.5, 1.2, -52.5, 1.0, -2.6),
    ],
    'The James S. Brady Press Briefing Room, named for President Reagan\'s press secretary. Nixon created it in 1970 over Franklin Roosevelt\'s indoor swimming pool, built in 1933; a 2007 renovation took 11 months and cost 8 million dollars. Layout shown schematically.');
  addPart('ww-situation-room', 'white house situation room', 'westwing',
    [
      box(11, 3, 8, -46, -1.6, -4),
      box(5, 0.15, 2.4, -46, -0.7, -4),
      box(4, 0.8, 1.6, -46, -1.1, -4),
    ],
    'The White House Situation Room, created in 1961 by President Kennedy after the Bay of Pigs invasion as a secure crisis management center, staffed around the clock. Shown schematically below grade in the West Wing basement.');
  addPart('ww-basement', 'west wing staff basement', 'westwing',
    [box(24, 3.2, 18, -46, -1.6, 0)],
    'Expanded staff basement beneath the West Wing. Shown schematically.');
}

// ================= 7. East Wing (pre-2025) =================
{
  addPart('ew-block', 'east wing block (pre-2025)', 'eastwing',
    [box(20, 8, 14, 44, 4, 0), box(20.6, 0.4, 14.6, 44, 8.2, 0)],
    'The first small East Wing was built in 1902 as a guest entrance; Franklin D. Roosevelt oversaw its expansion in 1942, adding a second floor that concealed the construction of the underground bunker. The original East Wing was demolished in 2025, so the model shows the pre-2025 configuration; footprint shown schematically.');
  addPart('ew-first-lady-office', 'office of the first lady', 'eastwing',
    [box(6, 3.4, 5, 48, 6.1, -3.5)],
    'The Office of the First Lady. Rosalynn Carter was the first to place her personal office in the East Wing, in 1977. Layout shown schematically.');
  addPart('ew-social-office', 'white house social office', 'eastwing',
    [box(6, 3.4, 5, 41, 6.1, -3.5)],
    'The White House Social Office. The social secretary prepares all of the invitations and written correspondence for every event held at the White House; Eleanor Roosevelt employed the first social secretary. Layout shown schematically.');
  addPart('ew-calligraphy', 'graphics and calligraphy office', 'eastwing',
    [box(5, 3.4, 4, 48.5, 6.1, 3)],
    'The White House Graphics and Calligraphy Office in the East Wing. Layout shown schematically.');
  const theater = new THREE.BoxGeometry(9, 3.6, 6);
  theater.translate(39, 1.9, 1);
  const screen = new THREE.BoxGeometry(0.3, 2, 4);
  screen.translate(34.6, 2.2, 1);
  addPart('ew-family-theater', 'white house family theater', 'eastwing', [theater, screen],
    'The White House Family Theater, the official movie theater. It was converted from Theodore Roosevelt\'s 1902 coatroom in 1942, and Franklin D. Roosevelt watched wartime newsreels here. Layout shown schematically.');
  addPart('ew-garden-room', 'garden room', 'eastwing',
    [box(6, 3.6, 5, 49, 1.9, 2.5)],
    'The Garden Room of the East Wing, overlooking the Jacqueline Kennedy Garden and used by the first lady for informal gatherings. Layout shown schematically.');
  addPart('ew-corridor', 'east wing corridor', 'eastwing',
    [
      box(16, 3.4, 1.8, 44, 1.7, 5.8),
      strut([36.5, 0.2, 5.8], [43.5, 1.6, 5.8], 1.8, 0.25),
    ],
    'The East Wing corridor, a passage with windows facing the South Lawn that connects the wing to the ground floor of the residence. A wheelchair ramp was added in the 1990s at Hillary Clinton\'s suggestion for easier access on public tours. Layout shown schematically.');
  addPart('ew-visitors-foyer', 'visitors foyer and tour entrance', 'eastwing',
    [box(5, 3.6, 5, 51, 1.9, -3.5)],
    'The Visitors Foyer. Before the 2025 demolition, public tours entered the White House from the south side of East Executive Avenue directly into the East Wing. Layout shown schematically.');
  addPart('ew-peoc', 'presidential emergency operations center', 'eastwing',
    [box(14, 3, 10, 44, -1.5, 0)],
    'The below-grade Presidential Emergency Operations Center beneath the East Wing, built in 1942. Shown schematically in the pre-2025 configuration.');
}

// ================= 8. Floors and circulation =================
{
  const plates = [
    ['f-ground', 'ground floor plate', -0.2,
      'The Ground Floor slab of the six-level stack. Floor-to-floor heights shown schematically.'],
    ['f-state', 'state floor plate', 4.4,
      'The State Floor slab, holding the principal reception rooms including the 40 by 82 ft East Room, the largest on the floor. Heights shown schematically.'],
    ['f-second', 'second floor plate', 8.8,
      'The Second Floor slab, the private family quarters level. Heights shown schematically.'],
    ['f-third', 'third floor plate', 13.2,
      'The Third Floor slab, converted from attic to living quarters in 1927. Heights shown schematically.'],
  ];
  for (const [id, name, y, expl] of plates) {
    addPart(id, name, 'floors', [box(50.8, 0.4, 24.8, 0, y, 0)], expl);
  }
  addPart('f-basement', 'two-story basement', 'floors',
    [box(50, 7.6, 24, 0, -3.8, 0)],
    'The two-story basement beneath the Ground Floor, part of the six levels totaling 55,000 sq ft. The north-side basement runs 12 to 13 ft below grade.');
  // State Floor rooms (slab top at 4.6).
  addPart('f-east-room', 'east room', 'floors',
    [box(24, 4, 12, 13, 6.6, 0)],
    'The East Room, 40 by 82 ft, the largest room in the White House. Large receptions are usually held here. Layout shown schematically.');
  const blue = cyl(6.5, 6.5, 4, 24, 0, 6.6, 5);
  blue.scale(1, 1, 0.8);
  addPart('f-blue-room', 'blue room', 'floors', [blue],
    'The elliptical Blue Room, the scene of many social, diplomatic, and official receptions. Layout shown schematically.');
  addPart('f-red-room', 'red room', 'floors',
    [box(8, 4, 9, -11, 6.6, 5)],
    'The Red Room, used for private and quasi-official gatherings. Layout shown schematically.');
  addPart('f-green-room', 'green room', 'floors',
    [box(8, 4, 9, 11, 6.6, 5)],
    'The Green Room on the State Floor. Layout shown schematically.');
  addPart('f-state-dining-room', 'state dining room', 'floors',
    [box(12, 4, 11, -18, 6.6, 0)],
    'The State Dining Room. President Franklin D. Roosevelt had John Adams\'s blessing for the house carved into the mantel here. Layout shown schematically.');
  addPart('f-cross-hall', 'cross hall', 'floors',
    [box(34, 3.6, 2.6, 0, 6.5, -10)],
    'The Cross Hall, which connects the State Dining Room and the East Room on the State Floor. Layout shown schematically.');
  // Ground Floor rooms.
  addPart('f-diplomatic-reception-room', 'diplomatic reception room', 'floors',
    [box(10, 3.8, 8, 0, 1.9, 3)],
    'The Diplomatic Reception Room on the Ground Floor. Jacqueline Kennedy installed the antique Vue de l\'Amerique Nord wallpaper, designed by Zuber and Cie in 1834, here. Layout shown schematically.');
  addPart('f-main-kitchen', 'main kitchen', 'floors',
    [box(12, 3.8, 8, -15, 1.9, 3)],
    'The main kitchen on the Ground Floor. The house has five full-time chefs. Layout shown schematically.');
  addPart('f-library', 'white house library', 'floors',
    [box(10, 3.8, 8, 15, 1.9, -3)],
    'The Library on the Ground Floor. Under Truman its walls were paneled in wood from the original timber frame, along with the Vermeil, China, and Map Rooms. Layout shown schematically.');
  // Second Floor rooms.
  addPart('f-yellow-oval-room', 'yellow oval room', 'floors',
    [box(10, 3.8, 7, 0, 10.9, 4)],
    'The Yellow Oval Room in the second floor family residence. Layout shown schematically.');
  addPart('f-lincoln-bedroom', 'lincoln bedroom', 'floors',
    [box(8, 3.8, 7, -15, 10.9, -2)],
    'The Lincoln Bedroom in the second floor family residence. Layout shown schematically.');
  // Basement recreation.
  addPart('f-bowling-alley', 'white house bowling alley', 'floors',
    [
      box(13, 0.25, 1.4, -8, -3.2, 8),
      box(2, 0.25, 1.4, -0.5, -3.2, 8),
      box(1.2, 1.6, 2.2, 1.2, -2.6, 8),
    ],
    'The single-lane bowling alley added to the White House basement during the Nixon administration. Layout shown schematically.');
  addPart('f-stairs', 'grand staircase', 'floors',
    [
      strut([10, 0, 5], [10, 4.4, -5], 3, 0.5),
      strut([10, 4.4, -5], [10, 8.8, 5], 3, 0.5),
      box(3, 0.4, 3, 10, 4.2, -5),
    ],
    'The Grand Staircase linking the state floors; the house has 8 staircases in total. Shown schematically.');
  addPart('f-elevators', 'elevator shafts', 'floors',
    [
      box(2, 21.2, 2, -15, 3, -8),
      box(2, 21.2, 2, 0, 3, -8),
      box(2, 21.2, 2, 15, 3, -8),
    ],
    'The house has 3 elevators; their shafts run the full height of the stack. Shown schematically.');
}

// ================= 9. Roof and Truman-era structure =================
{
  const hip = new THREE.ConeGeometry(1, 5.4, 4, 1);
  hip.rotateY(Math.PI / 4);
  hip.scale(52 / Math.SQRT2, 1, 26 / Math.SQRT2);
  hip.translate(0, 17.6 + 2.7, 0);
  addPart('r-hip', 'hip roof', 'roof', [hip],
    'The hip roof over the main block, augmented in 1927 with long shed dormers when the attic became living quarters. Roof height shown schematically.');
  const ds = box(30, 1.6, 2.2, 0, 20.8, 7.0);
  ds.rotateX(-0.39);
  const dsw = box(30, 0.9, 0.3, 0, 20.3, 8.15);
  const dn = box(30, 1.6, 2.2, 0, 20.8, -7.0);
  dn.rotateX(0.39);
  const dnw = box(30, 0.9, 0.3, 0, 20.3, -8.15);
  addPart('r-dormers', '1927 shed dormers', 'roof', [ds, dsw, dn, dnw],
    'Long shed dormers added in 1927 to light the converted third-floor attic. Shown schematically.');
  addPart('r-solarium', 'third floor solarium', 'roof',
    [box(6, 2.6, 4.5, 10, 21.6, 5), box(6.4, 0.3, 4.9, 10, 23.0, 5)],
    'The Truman-era solarium on the third floor. Shown schematically.');
  addPart('r-penthouse', '1952 rooftop penthouse', 'roof',
    [box(8, 2.6, 6, 0, 18.9, -5), box(8.4, 0.3, 6.4, 0, 20.35, -5)],
    'The rooftop penthouse added during the Truman reconstruction in 1952. Shown schematically.');
  const steel = [];
  const xs = [-20, -12, -4, 4, 12, 20];
  const zs = [-8, 0, 8];
  for (const x of xs) for (const z of zs) steel.push(box(0.5, 17.6, 0.5, x, 8.8, z));
  for (const y of [4.4, 8.8, 13.2]) {
    for (const z of zs) steel.push(box(41, 0.5, 0.4, 0, y, z));
    for (const x of xs) steel.push(box(0.4, 0.5, 17, x, y, 0));
  }
  addPart('r-steel', 'truman steel frame', 'roof', steel,
    'Under Truman the interior rooms were completely dismantled and a new internal load-bearing steel frame was built inside the walls, completed in 1952. In the exploded view the sandstone shell lifts off this frame.');
  addPart('r-subbasement', 'sub-basements and bomb shelter', 'roof',
    [box(40, 7.6, 20, 0, -11.4, 0), box(8, 3, 6, 10, -13.6, 0)],
    'Two additional sub-basements were added under Truman, providing workrooms, storage and a bomb shelter; the 5.7 million dollar project finished with the Trumans returning March 27, 1952. Shown schematically.');
}

// ================= 10. Ornament and fenestration =================
{
  const garland = new THREE.TorusGeometry(1.6, 0.28, 8, 18, Math.PI);
  garland.translate(0, 7.4, -12.55);
  addPart('o-garland', 'north door carved garland', 'ornament', [garland],
    'A carved rose-and-acorn garland over the north door. A variation on the Ionic order was devised for the North Portico, with a swag of roses between the volutes.');
  const peds = [];
  const winX = [];
  for (let x = -22; x <= 22; x += 4) winX.push(x);
  let n = 0;
  const placePed = (px, py, pz, alongX) => {
    let g;
    if (n % 2 === 0) {
      g = triPrism(2.2, 0.8, 0.4);
      g.translate(0, 0.8 / 3, 0);
    } else {
      g = segPediment(1.1, 0.4);
    }
    if (!alongX) g.rotateY(Math.PI / 2);
    g.translate(px, py, pz);
    peds.push(g);
    n++;
  };
  for (const x of winX) {
    if (Math.abs(x) >= 10) placePed(x, 11.5, -13.45, true);
    placePed(x, 11.5, 13.45, true);
  }
  for (let z = -12; z <= 12; z += 4) {
    placePed(26.45, 11.5, z, false);
    placePed(-26.45, 11.5, z, false);
  }
  addPart('o-pediments', 'window pediments', 'ornament', peds,
    'Alternating triangular and segmented pediments crown the upper windows, inspired by Leinster House in Dublin. Shown schematically.');
  const fish = [];
  for (let x = -22; x <= 22; x += 2) {
    fish.push(cyl(0.28, 0.28, 0.12, 8, x, 9.9, -13.42));
    fish.push(cyl(0.28, 0.28, 0.12, 8, x, 9.9, 13.42));
  }
  for (let z = -12; z <= 12; z += 2) {
    fish.push(cyl(0.28, 0.28, 0.12, 8, 26.42, 9.9, z));
    fish.push(cyl(0.28, 0.28, 0.12, 8, -26.42, 9.9, z));
  }
  addPart('o-fish-scale', 'window hood fish scale pattern', 'ornament', fish,
    'The fish scale pattern beneath the pediments of the window hoods, carved by Scottish masons who raised the sandstone walls. Pattern shown schematically.');
  const swags = [];
  for (const x of [-6, -2, 2, 6]) {
    const t = new THREE.TorusGeometry(0.5, 0.12, 6, 12, Math.PI);
    t.translate(x, 16.15, -17.95);
    swags.push(t);
  }
  addPart('o-rose-swags', 'north portico rose swags', 'ornament', swags,
    'Swags of roses between the volutes of the North Portico capitals, the variation on the Ionic order devised to link the portico with the carved roses above the entrance. Shown schematically.');
  const fan = new THREE.CircleGeometry(1.2, 16, 0, Math.PI);
  fan.rotateY(Math.PI);
  fan.translate(0, 6.75, -12.56);
  addPart('o-fanlight', 'entrance lunette fanlight', 'ornament', [fan],
    'The fanlight lunette above the entrance door. Shown schematically.');
  const stone = [cyl(9.95, 9.95, 0.5, 28, 0, 14.6, 13, -Math.PI / 2, Math.PI, true)];
  for (let k = 0; k < 14; k++) {
    const a = ((-84 + k * 12.92) * Math.PI) / 180;
    stone.push(box(0.3, 0.3, 0.25, 10.0 * Math.sin(a), 14.6, 13 + 10.0 * Math.cos(a)));
  }
  addPart('o-stonework', 'italian-carved portico stonework', 'ornament', stone,
    'Italian artisans brought to Washington for the Capitol carved the decorative stonework on both porticos.');
}

// ================= 11. White House grounds =================
{
  addPart('g-north-lawn', 'north lawn', 'grounds',
    [box(120, 0.15, 42, 0, 0.02, -41)],
    'The North Lawn facing Pennsylvania Avenue and Lafayette Square. Jefferson drafted a planting plan for the North Lawn with large trees that would have mostly obscured the house from Pennsylvania Avenue. Lawn extent shown schematically.');
  const nf = [
    cyl(3.2, 3.4, 1, 20, 0, 0.5, -34),
    cyl(2.8, 2.8, 0.2, 20, 0, 0.9, -34),
    cyl(0.3, 0.45, 1.6, 10, 0, 1.6, -34),
    cyl(0.9, 0.9, 0.15, 12, 0, 2.45, -34),
  ];
  addPart('g-north-fountain', 'north fountain', 'grounds', nf,
    'The north fountain on the North Lawn. Shown schematically.');
  addPart('g-south-lawn', 'south lawn', 'grounds',
    [box(120, 0.15, 52, 0, 0.02, 48)],
    'The South Lawn facing the Ellipse. The concept for the sprawling South Lawn was created in 1935 by Frederick Law Olmsted Jr. for President Franklin D. Roosevelt; State Arrival Ceremonies are held here. Lawn extent shown schematically.');
  const sf = [
    cyl(3.2, 3.4, 1, 20, 0, 0.5, 38),
    cyl(2.8, 2.8, 0.2, 20, 0, 0.9, 38),
    cyl(0.3, 0.45, 1.6, 10, 0, 1.6, 38),
    cyl(0.9, 0.9, 0.15, 12, 0, 2.45, 38),
  ];
  addPart('g-south-fountain', 'south fountain', 'grounds', sf,
    'The south fountain on the South Lawn. Shown schematically.');
  // Rose Garden: borders the West Colonnade, near the Oval Office.
  addPart('g-rose-central-lawn', 'rose garden central lawn', 'grounds',
    [box(10, 0.2, 20, -35, 0.1, 24)],
    'The 50 by 100 ft central lawn of the Rose Garden, as envisioned by Rachel Lambert Mellon in her 1962 redesign: large enough to hold a thousand people for a ceremony. Position shown schematically.');
  const roseBeds = (cx) => {
    const geoms = [box(3.6, 0.5, 20, cx, 0.25, 24)];
    for (let z = 16; z <= 32; z += 2.5) {
      for (const ox of [-1.1, 0, 1.1]) {
        const b = new THREE.SphereGeometry(0.55, 8, 6);
        b.translate(cx + ox, 0.7, z);
        geoms.push(b);
      }
    }
    return geoms;
  };
  addPart('g-rose-west-beds', 'rose garden west planting beds', 'grounds', roseBeds(-43),
    'The 12 ft wide west borders of the Rose Garden, planted per Mellon\'s plan with smaller trees, roses and other flowers, including varieties from Jefferson\'s time. Bed layout shown schematically.');
  addPart('g-rose-east-beds', 'rose garden east planting beds', 'grounds', roseBeds(-27),
    'The 12 ft wide east borders of the Rose Garden, planted with roses, perennials, annuals, and herbs. Bed layout shown schematically.');
  addPart('g-rose-terrace', 'rose garden east flagstone terrace', 'grounds',
    [box(6, 0.25, 14, -19.5, 0.12, 24)],
    'The flagstone terrace at the east end of the Rose Garden, planned by Mellon as a place where the president could relax and entertain guests. Shown schematically.');
  addPart('g-rose-platform', 'rose garden west platform', 'grounds',
    [box(6, 0.5, 8, -49.5, 0.25, 24)],
    'The platform at the west end of the Rose Garden, near the Oval Office, in Mellon\'s 1962 plan. Shown schematically.');
  // Jacqueline Kennedy Garden: south of the East Colonnade.
  addPart('g-jk-central-panel', 'jacqueline kennedy garden central panel', 'grounds',
    [box(30, 0.2, 12, 33, 0.1, 24)],
    'The large fescue grass panel in the center of the Jacqueline Kennedy Garden. The garden covers about 36 by 19 m; panel layout shown schematically.');
  addPart('g-jk-beds', 'jacqueline kennedy garden planting beds', 'grounds',
    [
      box(30, 0.5, 4, 33, 0.25, 14.5),
      box(30, 0.5, 4, 33, 0.25, 33.5),
    ],
    'Planting beds of the Jacqueline Kennedy Garden, bordered by boxwoods and filled with tulips, pansies and grape hyacinth; rosemary, thyme and other herbs under the holly trees are used by the White House chefs. Layout shown schematically.');
  addPart('g-jk-holly-hedge', 'jacqueline kennedy garden holly hedges', 'grounds',
    [
      box(32, 1.2, 1, 33, 0.6, 11.5),
      box(32, 1.2, 1, 33, 0.6, 36.5),
    ],
    'Holly hedges framing the Jacqueline Kennedy Garden on its north and south sides, with eight American holly trees. Shown schematically.');
  const perg = [];
  for (const px of [15.5, 20.5]) for (const pz of [21, 27]) perg.push(cyl(0.15, 0.15, 2.6, 8, px, 1.3, pz));
  for (let k = 0; k < 5; k++) perg.push(box(0.25, 0.12, 8, 15.5 + k * 1.25, 2.65, 24));
  addPart('g-jk-pergola', 'jacqueline kennedy garden pergola', 'grounds', perg,
    'The pergola at the west end of the Jacqueline Kennedy Garden, designed by architect I. M. Pei. Structure shown schematically.');
  // South Lawn features.
  const kg = [box(12, 0.4, 8, -20, 0.2, 48)];
  for (let k = 0; k < 5; k++) kg.push(box(11, 0.25, 0.8, -20, 0.5, 45 + k * 1.5));
  addPart('g-kitchen-garden', 'white house kitchen garden', 'grounds', kg,
    'The organic kitchen garden on the South Lawn, planted by Michelle Obama, the White House\'s first organic garden. Its produce and honey are used for the First Family, state dinners, and official gifts. Layout shown schematically.');
  const bees = [];
  for (const bx of [22, 24, 26]) {
    bees.push(box(0.8, 1.2, 0.8, bx, 1.0, 46));
    bees.push(box(1.0, 0.15, 1.0, bx, 0.35, 46));
  }
  addPart('g-beehives', 'south lawn beehives', 'grounds', bees,
    'Beehives on the South Lawn. White House carpenter Charlie Brandt began beekeeping on the complex as a hobby, and the honey is used in food preparation and as official gifts. Shown schematically.');
  addPart('g-tennis-court', 'tennis court', 'grounds',
    [
      box(12, 0.15, 24, 44, 0.08, 48),
      box(0.15, 1, 12, 44, 0.6, 48),
      box(0.15, 0.9, 0.15, 44, 0.45, 42.2),
      box(0.15, 0.9, 0.15, 44, 0.45, 53.8),
    ],
    'The tennis court on the grounds. First Lady Melania Trump oversaw the design and construction of the White House Tennis Pavilion during her husband\'s first term. Court position shown schematically.');
  addPart('g-putting-green', 'putting green', 'grounds',
    [cyl(5, 5, 0.15, 20, -40, 0.08, 48)],
    'The putting green on the grounds. Shown schematically.');
  const track = new THREE.TorusGeometry(16, 1.4, 6, 48);
  track.rotateX(Math.PI / 2);
  track.scale(1.4, 1, 1);
  track.translate(0, 0.1, 50);
  addPart('g-jogging-track', 'jogging track', 'grounds', [track],
    'The jogging track on the grounds. Path shown schematically.');
  const mag = [cyl(0.35, 0.5, 3, 10, -16, 1.5, 22)];
  for (const [ox, oy, oz, r] of [[0, 4.2, 0, 2.4], [1.6, 3.4, 0.8, 1.7], [-1.5, 3.6, -0.6, 1.8]]) {
    const s = new THREE.SphereGeometry(r, 10, 8);
    s.translate(-16 + ox, oy, 22 + oz);
    mag.push(s);
  }
  addPart('g-jackson-magnolia', 'jackson magnolia', 'grounds', mag,
    'Magnolias planted by Andrew Jackson stood west of the South Portico for over 200 years; the Jackson magnolia was removed in 2017 and replaced with one of its offspring. Tree shown schematically.');
  addPart('g-swimming-pool', 'outdoor swimming pool', 'grounds',
    [
      box(12, 0.3, 8, -46, 0.15, 24),
      box(10, 0.2, 6, -46, 0.18, 24),
    ],
    'The outdoor swimming pool southwest of the West Wing, built under President Gerald Ford. Position shown schematically.');
}

// ================= 12. Perimeter fence and gates =================
{
  addPart('p-fence-north', 'north fence run', 'perimeter',
    fenceRun(-66, -62, 66, -62),
    'The north fence run along Pennsylvania Avenue. The fence largely dated to the early 1900s, when a 6 ft 6 in fence was set on a stone wall added in Jefferson\'s time. Run shown schematically.');
  addPart('p-fence-south', 'south fence run', 'perimeter',
    fenceRun(-66, 72, 66, 72),
    'The south fence run. Beginning in 2019 the 6 ft 6 in fence was replaced by an approximately 13 ft fence with anti-climb and intrusion detection features; the model shows the taller fence. Run shown schematically.');
  addPart('p-fence-east', 'east fence run', 'perimeter',
    fenceRun(66, -62, 66, 72),
    'The east fence run. The fence encompasses the 18-acre complex with over 3,500 ft of steel fencing. Run shown schematically.');
  addPart('p-fence-west', 'west fence run', 'perimeter',
    fenceRun(-66, -62, -66, 72),
    'The west fence run. In 1976 the 1818 to 1819 wrought-iron gates on Pennsylvania Avenue were replaced by reinforced steel gates built to withstand automobile crashes. Run shown schematically.');
  const gate = (gx, gz) => {
    const geoms = [
      box(0.8, 4.6, 0.8, gx - 4.4, 2.3, gz),
      box(0.8, 4.6, 0.8, gx + 4.4, 2.3, gz),
      box(1.1, 0.4, 1.1, gx - 4.4, 4.8, gz),
      box(1.1, 0.4, 1.1, gx + 4.4, 4.8, gz),
    ];
    const leafL = new THREE.BoxGeometry(4, 3.2, 0.12);
    leafL.translate(-2, 0, 0);
    leafL.rotateY(0.35);
    leafL.translate(gx - 4, 2.1, gz);
    const leafR = new THREE.BoxGeometry(4, 3.2, 0.12);
    leafR.translate(2, 0, 0);
    leafR.rotateY(-0.35);
    leafR.translate(gx + 4, 2.1, gz);
    geoms.push(leafL, leafR);
    return geoms;
  };
  const booth = (bx, bz) => [
    box(2.4, 2.6, 2.4, bx, 1.3, bz),
    box(3, 0.3, 3, bx, 2.75, bz),
    box(2.0, 0.7, 0.1, bx, 1.9, bz - 1.15),
    box(2.0, 0.7, 0.1, bx, 1.9, bz + 1.15),
  ];
  addPart('p-gate-northwest', 'northwest gate', 'perimeter', gate(-52, -62),
    'The northwest vehicle gate in the perimeter fence. The fence has six vehicular and nine pedestrian gates; gate positions shown schematically.');
  addPart('p-booth-northwest', 'northwest gate guard booth', 'perimeter', booth(-58, -62),
    'Guard booth beside the northwest gate. Shown schematically.');
  addPart('p-gate-northeast', 'northeast gate', 'perimeter', gate(52, -62),
    'The northeast vehicle gate in the perimeter fence. Gate positions shown schematically.');
  addPart('p-booth-northeast', 'northeast gate guard booth', 'perimeter', booth(58, -62),
    'Guard booth beside the northeast gate. Shown schematically.');
  addPart('p-gate-southwest', 'southwest gate', 'perimeter', gate(-52, 72),
    'The southwest vehicle gate in the perimeter fence. Gate positions shown schematically.');
  addPart('p-booth-southwest', 'southwest gate guard booth', 'perimeter', booth(-58, 72),
    'Guard booth beside the southwest gate. Shown schematically.');
  addPart('p-gate-southeast', 'southeast gate', 'perimeter', gate(52, 72),
    'The southeast vehicle gate in the perimeter fence. Gate positions shown schematically.');
  addPart('p-booth-southeast', 'southeast gate guard booth', 'perimeter', booth(58, 72),
    'Guard booth beside the southeast gate. Shown schematically.');
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
fs.writeFileSync(path.join(outDir, 'white-house-0.bin'), buffer);

const systems = [
  { id: 'shell', name: 'Executive Residence massing', color: '#f3eee2', description: 'The main block is about 170 by 85 ft of Aquia Creek sandstone painted white. Heights above grade are shown schematically since no reliable published overall height exists.' },
  { id: 'northportico', name: 'North Portico', color: '#c9c2b2', description: 'Tetrastyle Ionic portico of 1829 to 1831, called the most notable four-columned portico in the United States. Its columns rise from the ground to the roof pediment over a porte cochere carriage drive.' },
  { id: 'southportico', name: 'South Portico', color: '#d6cdb8', description: 'Semicircular colonnade of six Ionic columns, finished in 1824 and 61 ft wide. A curved double stair rises almost 13 ft from the ground to the portico floor.' },
  { id: 'vaults', name: 'Vaults and undercroft', color: '#a8a088', description: 'Groin and segmental vaults beneath the porticoes, among the only historic structural systems still doing their original job. Shown schematically below the portico floors.' },
  { id: 'colonnades', name: 'Colonnades and terraces', color: '#eae3d3', description: 'The East and West Colonnades were added by Jefferson with Benjamin Henry Latrobe to conceal stables and storage. They now link the residence with the East and West Wings.' },
  { id: 'westwing', name: 'West Wing', color: '#efe8d7', description: 'Theodore Roosevelt moved all work offices to the newly built West Wing in 1902. Footprint and height shown schematically.' },
  { id: 'eastwing', name: 'East Wing, pre-2025', color: '#e4ddca', description: 'Built in the early 1940s as a reception area for social events, with office alterations completed in 1946. The original East Wing was demolished in 2025, so this model shows the pre-2025 block.' },
  { id: 'floors', name: 'Floors and circulation', color: '#bda98d', description: 'Six levels: Ground Floor, State Floor, Second Floor and Third Floor over a two-story basement, totaling 55,000 sq ft. Floor-to-floor heights are shown schematically.' },
  { id: 'roof', name: 'Roof and Truman-era structure', color: '#6d7f92', description: 'Hip roof with long shed dormers added when the attic became living quarters in 1927. Inside the shell, the 1948 to 1952 Truman reconstruction installed a new load-bearing steel frame and two sub-basements with a bomb shelter.' },
  { id: 'ornament', name: 'Ornament and fenestration', color: '#d9c48f', description: 'Carved garlands, alternating window pediments and the entrance fanlight. Italian artisans brought to Washington for the Capitol carved the portico stonework.' },
  { id: 'grounds', name: 'White House grounds', color: '#9cb380', description: 'The White House and grounds cover just over 18 acres (about 7.3 hectares). The general layout of the grounds today is based on the 1935 design by Frederick Law Olmsted Jr. Lawn extents and garden layouts are shown schematically.' },
  { id: 'perimeter', name: 'Perimeter fence and gates', color: '#8f959c', description: 'Steel fencing encloses the 18-acre complex, over 3,500 ft of fence. The 6 ft 6 in fence was replaced by an approximately 13 ft fence with anti-climb features beginning in 2019. Fence runs, gates and booths are shown schematically.' },
];

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'White House, Washington, D.C.',
  title: 'White House',
  location: 'Washington, D.C., USA',
  blurb: 'A procedural model of the White House in its pre-2025 configuration, before the original East Wing was demolished. Explode the view to lift the white-painted Aquia Creek sandstone shell off the hidden steel frame built inside it during the 1948 to 1952 Truman reconstruction.',
  sourceUrls: [
    { label: 'White House, Wikipedia', url: 'https://en.wikipedia.org/wiki/White_House' },
    { label: 'East Wing, Wikipedia', url: 'https://en.wikipedia.org/wiki/East_Wing' },
    { label: 'Roosevelt Room, Wikipedia', url: 'https://en.wikipedia.org/wiki/Roosevelt_Room' },
    { label: 'Situation Room, Wikipedia', url: 'https://en.wikipedia.org/wiki/Situation_Room' },
    { label: 'In a White House Passageway, White House Historical Association', url: 'https://www.whitehousehistory.org/in-a-white-house-passageway' },
    { label: 'White House Fence Timeline, White House Historical Association', url: 'https://d1y822qhq55g6.cloudfront.net/pdfs/White-House-Fence-Timeline_historianupdates.pdf' },
    { label: 'Rose Garden, National Park Service', url: 'https://www.nps.gov/whho/learn/historyculture/rose-garden.htm' },
    { label: 'Jacqueline Kennedy Garden, National Park Service', url: 'https://www.nps.gov/whho/learn/historyculture/jacqueline-kennedy-garden.htm' },
    { label: 'Portico, Wikipedia', url: 'http://en.wikipedia.org/wiki/Portico' },
    { label: 'White House, Columbia Electronic Encyclopedia via FactMonster', url: 'https://www.factmonster.com/encyclopedia/places/north-america/us-national-parks/white-house' },
  ],
  systems,
  explanations,
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
  chunks: [{ url: '/models/white-house/white-house-0.bin', bytes: offset }],
  triangles,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
