// Procedural Palace of Westminster for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Palace of Westminster in code
// and writes it in the atlas binary format:
//   public/models/palace-of-westminster/atlas.json
//   public/models/palace-of-westminster/palace-of-westminster-0.bin
//
// Sourced dimensions and facts (all verified from the pages listed in
// ~/workspace/architectural-atlas/research/palace-of-westminster-attribution.md,
// opened 2026-09-30):
//   nearly 300 m long, river front 265.8 m, roofline 21.3 m, terrace
//   206.7 m by 10 m, north front 70.7 m, south front 98.2 m, site 3.24 ha
//   (8 acres); more than 1,100 rooms, 100 staircases, 31 lifts, more than
//   3 km of passageways over seven levels; floor area 112,476 m2; Charles
//   Barry (Perpendicular Gothic Revival design) with Augustus Pugin's
//   details and Gothic interiors; fire of 16 October 1834 (tally sticks),
//   Lords Chamber completed 1847, Commons Chamber 1852, construction
//   1840-1876; Commons chamber destroyed by German bombs 10-11 May 1941,
//   rebuilt in simplified style under Giles Gilbert Scott, opened 1950;
//   Victoria Tower 98.5 m (323 ft), south-western corner, tallest part of
//   the palace, tallest secular building in the world on completion in
//   1858, Sovereign's Entrance with 15 m high archway, Parliamentary
//   Archives in 5.5 miles of steel shelves over 12 floors, cast-iron
//   pyramidal roof with 22 m flagstaff flying the Royal Standard or Union
//   Flag; Elizabeth Tower 96.3 m (316 ft), Pugin's last design (died 1852),
//   completed 1859, renamed in 2012 for the Diamond Jubilee, square base
//   40 ft (12.2 m) on each side, bricks clad with sand-coloured Anston
//   limestone, spire covered in cast iron roof-tiles, four dials 22.5 ft
//   (6.9 m) in diameter, hour hand 2.7 m, minute hand 4.3 m, five bells,
//   Great Bell 13.8 tonnes (properly called Big Ben), 334 steps to the
//   belfry, 52 shields with national emblems, Ayrton Light installed 1885
//   lit when either House sits after dark; Central Tower 91 m (299 ft),
//   octagonal, shortest of the three principal towers, over the Central
//   Lobby, added at the insistence of ventilation engineer Dr. David
//   Boswell Reid as a chimney for "vitiated air" (heat and smoke of about
//   four hundred fires), completely failed its purpose, the only palace
//   tower with a stone spire, largest known octagonal Gothic vault without
//   a central pillar; St Stephen's Tower in the middle of the west front
//   houses the public entrance; Speaker's Tower and Chancellor's Tower are
//   the pavilions at the northern and southern ends of the river front,
//   Speaker's Tower containing Speaker's House; pinnacles between window
//   bays and turrets along the skyline, many masking ventilation shafts;
//   Central Lobby (originally Octagon Hall) 18 m across and 23 m from the
//   floor to the centre of the vaulted ceiling, below the Central Tower,
//   Venetian glass mosaic between the vault ribs, mosaics of the four
//   patron saints, four bigger-than-life statues of 19th-century statesmen,
//   Minton encaustic tile floor with a Latin passage from Psalm 127, origin
//   of the term lobbying; Commons Chamber 14 by 20.7 m, green benches,
//   427 of 650 members seated, red lines 2.5 m apart, Speaker's Chair (gift
//   of Australia), Table of the House (gift of Canada), dispatch boxes
//   (gift of New Zealand); Members' Lobby a cube of 13.7 m with the Rubble
//   (Churchill) Arch; Lords Chamber 13.7 by 24.4 m, red benches on three
//   sides, Sovereign's Throne with gilded canopy, Woolsack, Judges'
//   Woolsack, Table of the House; Peers' Lobby 12 m square and 10 m high
//   with radiant Tudor rose floor of Derbyshire marbles and Brass Gates of
//   1.5 tonnes; Royal Gallery 33.5 by 13.7 m with two Maclise paintings
//   13.7 by 3.7 m and eight statues of Caen stone; Robing Room with Chair
//   of State and Arthurian frescoes; Norman Porch with 26 granite steps;
//   Westminster Hall oldest structure on the estate, completed in 1099,
//   20.7 m by 73.2 m, largest medieval timber roof in Northern Europe,
//   hammerbeam roof, saved from the 1834 fire; Anston magnesian limestone
//   from South Yorkshire, replaced with honey-coloured Clipsham stone from
//   Rutland from 1928; courtyards and grounds: Cromwell Green, Victoria
//   Tower Gardens, Black Rod's Garden, Old Palace Yard, New Palace Yard,
//   Speaker's Green, College Green.
// Schematic (not sourced, never stated as fact in the UI): exact footprint
// placement and orientation of all towers, chambers, courtyards and
// gardens; building width and courtyard positions beyond the sourced
// river-front, terrace, roofline and frontage lengths; river-terrace
// cross-section; Westminster Hall position and angle; pinnacle, turret
// and spire profiles; window-bay divisions and tracery; interior
// furniture shapes beyond the sourced names; chamber positions within the
// plan; statue and shield geometry; bell shapes; Central Lobby vault
// profile; archive interior layout.
//
// Granularity: 106 named parts across 13 systems. Every explanation is
// either a sourced fact (see the research notes above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-palace-of-westminster.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'palace-of-westminster');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (98.5 m) maps to 2.4 units.
const S = 2.4 / 98.5;

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
// Octagonal prism (Central Tower, Central Lobby): rotate before translating.
function oct(radius, h, x, y, z) {
  const g = new THREE.CylinderGeometry(radius, radius, h, 8);
  g.rotateY(Math.PI / 8);
  g.translate(x, y, z);
  return g;
}
// Gothic spire: 8-sided cone, rotate before translating.
function spire(r, y0, y1, x, z, seg = 8) {
  const g = new THREE.ConeGeometry(r, y1 - y0, seg);
  g.rotateY(Math.PI / seg);
  g.translate(x, (y0 + y1) / 2, z);
  return g;
}
// Staircase of n steps from (x, z0) rising in +z.
function stairs(x0, x1, y0, n, rise, depth, z0) {
  const geoms = [];
  for (let i = 0; i < n; i++) {
    geoms.push(box(x0, x1, y0, y0 + rise * (i + 1), z0 + depth * i, z0 + depth * (i + 1)));
  }
  return geoms;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Victoria Tower (98.5 m, south-western corner): 9 parts.
{
  const cx = -45, cz = 115;
  // Main archive body: 22 m square, 0 to 74.
  addPart('victoria-tower-body', 'Victoria Tower archive body', 'victoria-tower', [
    box(cx - 11, cx + 11, 0, 74, cz - 11, cz + 11),
  ]);
  // Schematic window rows on the archive block.
  {
    const rows = [];
    for (let y = 10; y < 72; y += 9) {
      rows.push(box(cx - 11.2, cx - 10.8, y, y + 4, cz - 9, cz + 9));
      rows.push(box(cx + 10.8, cx + 11.2, y, y + 4, cz - 9, cz + 9));
      rows.push(box(cx - 9, cx + 9, y, y + 4, cz - 11.2, cz - 10.8));
    }
    addPart('victoria-tower-window-rows', 'Victoria Tower window rows', 'victoria-tower', rows);
  }
  // Sovereign's Entrance: 15 m high archway on the west face.
  {
    const frame = box(cx - 12.5, cx - 11, 0, 15, cz - 6, cz + 6);
    const dark = box(cx - 12.6, cx - 11.2, 0, 13, cz - 4, cz + 4);
    addPart('victoria-tower-sovereign-entrance', 'Victoria Tower Sovereigns Entrance', 'victoria-tower', [frame, dark]);
  }
  // Statues of Saints George, Andrew and Patrick and Queen Victoria above the arch.
  {
    const statues = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.ConeGeometry(1, 3.5, 8);
      s.translate(cx - 12, 17, cz - 4.5 + i * 3);
      statues.push(s);
    }
    addPart('victoria-tower-archway-statues', 'Victoria Tower archway statues', 'victoria-tower', statues);
  }
  // Parliamentary Archives: 5.5 miles of steel shelves over 12 floors (schematic).
  {
    const stacks = [];
    for (let f = 0; f < 12; f++) {
      stacks.push(box(cx - 9, cx + 9, 3 + f * 6, 3.4 + f * 6, cz - 9, cz + 9));
    }
    addPart('victoria-tower-archive-stacks', 'Victoria Tower archive stacks', 'victoria-tower', stacks);
  }
  // Cast-iron pyramidal roof.
  {
    const roof = new THREE.ConeGeometry(15.5, 8, 4);
    roof.rotateY(Math.PI / 4);
    roof.translate(cx, 78, cz);
    addPart('victoria-tower-pyramidal-roof', 'Victoria Tower pyramidal roof', 'victoria-tower', [roof]);
  }
  // 22 m flagstaff.
  addPart('victoria-tower-flagstaff', 'Victoria Tower flagstaff', 'victoria-tower', [
    cyl(0.35, 0.5, 22, cx, 76.5 + 11, cz, 8),
  ]);
  // The flag: Royal Standard when the Sovereign is present, else the Union Flag.
  {
    const flag = box(cx, cx + 6, 93, 96.5, cz - 0.15, cz + 0.15);
    addPart('victoria-tower-flag', 'Victoria Tower flag', 'victoria-tower', [flag]);
  }
  // Corner pinnacles of the archive block.
  {
    const pins = [];
    for (const [px, pz] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) {
      pins.push(spire(1.8, 74, 84, cx + px, cz + pz, 6));
    }
    addPart('victoria-tower-corner-pinnacles', 'Victoria Tower corner pinnacles', 'victoria-tower', pins);
  }
  // Norman Porch beneath the tower: 26 granite steps.
  {
    const porch = box(cx - 5, cx + 5, 0, 8, cz - 11, cz - 5);
    const column = cyl(1, 1.2, 8, cx, 4, cz - 8, 10);
    addPart('norman-porch', 'Norman Porch', 'royal-apartments', [porch, column, ...stairs(cx - 5, cx + 5, 0, 26, 0.28, 0.45, cz - 24)]);
  }
}

// --- Elizabeth Tower (96.3 m, north end): 13 parts.
{
  const cx = -45, cz = -115;
  // Square shaft: 12.2 m base, 0 to 40.
  addPart('elizabeth-tower-shaft', 'Elizabeth Tower shaft', 'elizabeth-tower', [
    box(cx - 6.1, cx + 6.1, 0, 40, cz - 6.1, cz + 6.1),
  ]);
  // Concrete foundations 3.7 m thick.
  addPart('elizabeth-tower-foundations', 'Elizabeth Tower foundations', 'elizabeth-tower', [
    box(cx - 8, cx + 8, -3.7, 0, cz - 8, cz + 8),
  ]);
  // Clock stage: 40 to 61, slightly wider.
  addPart('elizabeth-tower-clock-stage', 'Elizabeth Tower clock stage', 'elizabeth-tower', [
    box(cx - 6.5, cx + 6.5, 40, 61, cz - 6.5, cz + 6.5),
  ]);
  // Four dials 6.9 m in diameter, centres 54.9 m above ground.
  const faces = [
    { id: 'north', geoms: () => { const d = cyl(3.45, 3.45, 0.4, 0, 0, 0, 24); d.rotateX(Math.PI / 2); d.translate(cx, 54.9, cz - 6.7); return d; } },
    { id: 'south', geoms: () => { const d = cyl(3.45, 3.45, 0.4, 0, 0, 0, 24); d.rotateX(Math.PI / 2); d.translate(cx, 54.9, cz + 6.7); return d; } },
    { id: 'east', geoms: () => { const d = cyl(3.45, 3.45, 0.4, 0, 0, 0, 24); d.rotateZ(Math.PI / 2); d.translate(cx + 6.7, 54.9, cz); return d; } },
    { id: 'west', geoms: () => { const d = cyl(3.45, 3.45, 0.4, 0, 0, 0, 24); d.rotateZ(Math.PI / 2); d.translate(cx - 6.7, 54.9, cz); return d; } },
  ];
  for (const f of faces) {
    addPart(`elizabeth-tower-dial-${f.id}`, `Elizabeth Tower ${f.id} dial`, 'elizabeth-tower', [f.geoms()]);
  }
  // Hands: hour hand 2.7 m, minute hand 4.3 m on each face (merged).
  {
    const hands = [];
    const mk = (x, z, dx, dz) => {
      const hr = box(x - 0.25, x + 0.25, 54.9 - 0.25, 54.9 + 0.25, z - 0.15, z + 0.15);
      hr.translate(dx * 1.2, 0.9, dz * 1.2);
      hands.push(hr);
      const mn = box(x - 0.2, x + 0.2, 54.9 - 0.2, 54.9 + 0.2, z - 0.12, z + 0.12);
      mn.translate(-dx * 1.8, 1.6, -dz * 1.8);
      hands.push(mn);
    };
    mk(cx, cz - 6.95, 0, -1);
    mk(cx, cz + 6.95, 0, 1);
    mk(cx + 6.95, cz, 1, 0);
    mk(cx - 6.95, cz, -1, 0);
    addPart('elizabeth-tower-clock-hands', 'Elizabeth Tower clock hands', 'elizabeth-tower', hands);
  }
  // Belfry: 61 to 70, corner piers and top slab (schematic arched openings).
  {
    const piers = [];
    for (const [px, pz] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) {
      piers.push(box(cx + px - 1.2, cx + px + 1.2, 61, 70, cz + pz - 1.2, cz + pz + 1.2));
    }
    const slab = box(cx - 5.7, cx + 5.7, 70, 71, cz - 5.7, cz + 5.7);
    addPart('elizabeth-tower-belfry', 'Elizabeth Tower belfry', 'elizabeth-tower', [...piers, slab]);
  }
  // Great Bell, properly called Big Ben, 13.8 tonnes.
  {
    const bell = new THREE.CylinderGeometry(1.1, 2.2, 3.4, 14);
    bell.translate(cx, 66.5, cz);
    addPart('elizabeth-tower-big-ben', 'Great Bell (Big Ben)', 'elizabeth-tower', [bell]);
  }
  // Four quarter bells.
  {
    const bells = [];
    for (const [ox, oz] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) {
      const b = new THREE.CylinderGeometry(0.7, 1.2, 2, 10);
      b.translate(cx + ox, 65.5, cz + oz);
      bells.push(b);
    }
    addPart('elizabeth-tower-quarter-bells', 'Elizabeth Tower quarter bells', 'elizabeth-tower', bells);
  }
  // 52 shields with national emblems above the belfry (merged group).
  {
    const shields = [];
    for (let i = 0; i < 13; i++) {
      const t = -5 + i * (10 / 12);
      const s1 = new THREE.SphereGeometry(0.7, 8, 6);
      s1.translate(cx + t, 72.5, cz - 5.9);
      const s2 = new THREE.SphereGeometry(0.7, 8, 6);
      s2.translate(cx + t, 72.5, cz + 5.9);
      const s3 = new THREE.SphereGeometry(0.7, 8, 6);
      s3.translate(cx - 5.9, 72.5, cz + t);
      const s4 = new THREE.SphereGeometry(0.7, 8, 6);
      s4.translate(cx + 5.9, 72.5, cz + t);
      shields.push(s1, s2, s3, s4);
    }
    addPart('elizabeth-tower-shields', 'Elizabeth Tower heraldic shields', 'elizabeth-tower', shields);
  }
  // Spire of cast iron roof-tiles: 71 to 96.3.
  addPart('elizabeth-tower-spire', 'Elizabeth Tower spire', 'elizabeth-tower', [
    spire(5.7, 71, 96.3, cx, cz, 8),
  ]);
  // Ayrton Light in the lantern, lit when either House sits after dark.
  {
    const lamp = new THREE.SphereGeometry(1.2, 10, 8);
    lamp.translate(cx, 73, cz);
    addPart('elizabeth-tower-ayrton-light', 'Elizabeth Tower Ayrton Light', 'elizabeth-tower', [lamp]);
  }
}

// --- Central Tower (91 m, octagonal, over the Central Lobby): 4 parts.
{
  const cx = -30, cz = 0;
  // Octagonal drum, 16 m across, 0 to 60.
  addPart('central-tower-drum', 'Central Tower drum', 'central-tower', [
    oct(8, 60, cx, 30, cz),
  ]);
  // Louvered ventilation openings (the tower was a chimney for vitiated air).
  {
    const vents = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const v = box(cx + Math.sin(a) * 8.1 - 0.6, cx + Math.sin(a) * 8.1 + 0.6, 46, 52, cz + Math.cos(a) * 8.1 - 1.2, cz + Math.cos(a) * 8.1 + 1.2);
      v.rotateY(-a);
      vents.push(v);
    }
    addPart('central-tower-ventilation-openings', 'Central Tower ventilation openings', 'central-tower', vents);
  }
  // Stone spire: 60 to 91.
  addPart('central-tower-spire', 'Central Tower stone spire', 'central-tower', [
    spire(8, 60, 91, cx, cz, 8),
  ]);
  // Finial.
  {
    const f = new THREE.SphereGeometry(1, 10, 8);
    f.translate(cx, 92, cz);
    addPart('central-tower-finial', 'Central Tower finial', 'central-tower', [f]);
  }
}

// --- River front (265.8 m frontage on the Thames): 9 parts.
{
  // Main river block facade: x -60 to 5, z -132.9 to 132.9, to the 21.3 m roofline.
  addPart('river-front-wall', 'River front wall', 'river-front', [
    box(-60, 5, 0, 21.3, -132.9, 132.9),
  ]);
  // Pinnacles rising between the window bays.
  {
    const pins = [];
    for (let z = -125; z <= 125; z += 12.5) {
      const p = spire(1.2, 21.3, 28, 5, z, 6);
      pins.push(p);
      const q = box(3.5, 5, 0, 21.3, z - 0.5, z + 0.5);
      pins.push(q);
    }
    addPart('river-front-pinnacles', 'River front pinnacles', 'river-front', pins);
  }
  // Terrace: 206.7 m by 10 m on the river side.
  addPart('river-terrace', 'River Terrace', 'river-front', [
    box(5, 15, 0, 0.6, -103.35, 103.35),
  ]);
  // Terrace balustrade.
  {
    const bal = box(14.6, 15, 0.6, 2.2, -103.35, 103.35);
    const posts = [];
    for (let z = -100; z <= 100; z += 10) {
      posts.push(box(14.5, 15.1, 2.2, 3.4, z - 0.4, z + 0.4));
    }
    addPart('river-terrace-balustrade', 'River Terrace balustrade', 'river-front', [bal, ...posts]);
  }
  // Speaker's Tower (north end) and Chancellor's Tower (south end).
  addPart('speakers-tower', 'Speakers Tower', 'river-front', [
    box(0, 10, 0, 40, -105, -95),
    spire(7, 40, 48, 5, -100, 6),
  ]);
  addPart('chancellors-tower', 'Chancellors Tower', 'river-front', [
    box(0, 10, 0, 40, 95, 105),
    spire(7, 40, 48, 5, 100, 6),
  ]);
  // Turrets masking ventilation shafts along the skyline.
  {
    const turrets = [];
    for (let z = -110; z <= 110; z += 22) {
      turrets.push(cyl(1.8, 2.2, 10, -25, 26.3, z, 8));
      turrets.push(spire(2.4, 31.3, 38, -25, z, 8));
    }
    addPart('roof-ventilation-turrets', 'Roof ventilation turrets', 'river-front', turrets);
  }
  // Embankment wall along the river side of the terrace (schematic).
  addPart('river-embankment-wall', 'River embankment wall', 'river-front', [
    box(15, 16.5, -6, 0.6, -110, 110),
  ]);
  // North front (70.7 m) and south front (98.2 m).
  addPart('north-front', 'North Front', 'river-front', [box(-60, 5, 0, 21.3, -134.9, -132.9)]);
  addPart('south-front', 'South Front', 'river-front', [box(-60, 5, 0, 21.3, 132.9, 134.9)]);
  // Pitched main roof to the roofline-plus.
  {
    const roof = new THREE.CylinderGeometry(9.2, 9.2, 265.8, 3, 1);
    roof.rotateZ(Math.PI / 2);
    roof.rotateY(Math.PI / 2);
    roof.translate(-27.5, 21.3 + 4.6, 0);
    addPart('main-roof', 'Main roof', 'roofs', [roof]);
  }
}

// --- House of Commons (north of the Central Lobby): 9 parts.
{
  const x0 = -37, x1 = -23, z0 = -74.4, z1 = -53.7; // 14 by 20.7 m
  addPart('commons-chamber', 'House of Commons Chamber', 'commons', [
    box(x0, x1, 0, 12, z0, z1),
  ]);
  // Speaker's Chair at the north end (gift of Australia).
  addPart('commons-speakers-chair', 'Commons Speakers Chair', 'commons', [
    box(-32.5, -27.5, 0, 5, z0, z0 + 3),
  ]);
  // Table of the House (gift of Canada) and dispatch boxes (gift of New Zealand).
  addPart('commons-table', 'Commons Table of the House', 'commons', [
    box(-33, -27, 0, 1.2, z0 + 8, z0 + 12),
  ]);
  {
    const d1 = box(-31.5, -30.5, 1.2, 2.4, z0 + 8, z0 + 9.2);
    const d2 = box(-29.5, -28.5, 1.2, 2.4, z0 + 8, z0 + 9.2);
    addPart('commons-despatch-boxes', 'Commons despatch boxes', 'commons', [d1, d2]);
  }
  // Green benches on either side.
  {
    const gov = [];
    for (let i = 0; i < 6; i++) {
      gov.push(box(-36, -32, 0, 1.6, z0 + 4 + i * 2.6, z0 + 5.6 + i * 2.6));
    }
    addPart('commons-benches-government', 'Commons Government benches', 'commons', gov);
  }
  {
    const opp = [];
    for (let i = 0; i < 6; i++) {
      opp.push(box(-28, -24, 0, 1.6, z0 + 4 + i * 2.6, z0 + 5.6 + i * 2.6));
    }
    addPart('commons-benches-opposition', 'Commons Opposition benches', 'commons', opp);
  }
  // The two red lines, 2.5 m apart.
  addPart('commons-red-lines', 'Commons red lines', 'commons', [
    box(-31.3, -31.1, 0, 0.1, z0 + 4, z1 - 4),
    box(-28.9, -28.7, 0, 0.1, z0 + 4, z1 - 4),
  ]);
  // Strangers' Gallery above the chamber (schematic).
  addPart('commons-strangers-gallery', 'Commons Strangers Gallery', 'commons', [
    box(x0, x1, 8, 11, z0, z1),
  ]);
  // Division lobbies on either side of the chamber.
  addPart('commons-division-lobby-aye', 'Commons Aye division lobby', 'commons', [
    box(x0 - 6, x0, 0, 8, z0, z1),
  ]);
  addPart('commons-division-lobby-no', 'Commons No division lobby', 'commons', [
    box(x1, x1 + 6, 0, 8, z0, z1),
  ]);
}

// --- House of Lords (south of the Central Lobby): 10 parts.
{
  const x0 = -36.7, x1 = -23, z0 = 52, z1 = 76.4; // 13.7 by 24.4 m
  addPart('lords-chamber', 'House of Lords Chamber', 'lords', [
    box(x0, x1, 0, 12, z0, z1),
  ]);
  // Sovereign's Throne at the south end with gilded canopy.
  addPart('lords-throne', 'Lords Sovereigns Throne', 'lords', [
    box(-32.5, -27.5, 0, 6, z1 - 3, z1),
  ]);
  {
    const canopy = box(-33.5, -26.5, 6, 8, z1 - 4, z1 + 1);
    addPart('lords-canopy', 'Lords gilded canopy', 'lords', [canopy]);
  }
  // Woolsack and Judges' Woolsack.
  addPart('lords-woolsack', 'Lords Woolsack', 'lords', [
    new THREE.SphereGeometry(1.6, 10, 8).translate(-30, 0.8, z1 - 8),
  ]);
  addPart('lords-judges-woolsack', 'Lords Judges Woolsack', 'lords', [
    new THREE.SphereGeometry(2, 10, 8).translate(-30, 0.9, z1 - 12),
  ]);
  // Red benches on three sides.
  {
    const sp = [];
    for (let i = 0; i < 5; i++) {
      sp.push(box(-36, -33.5, 0, 1.6, z0 + 4 + i * 3, z0 + 6 + i * 3));
    }
    addPart('lords-benches-spiritual', 'Lords Spiritual Side benches', 'lords', sp);
  }
  {
    const tp = [];
    for (let i = 0; i < 5; i++) {
      tp.push(box(-26.5, -24, 0, 1.6, z0 + 4 + i * 3, z0 + 6 + i * 3));
    }
    addPart('lords-benches-temporal', 'Lords Temporal Side benches', 'lords', tp);
  }
  {
    const cb = [];
    for (let i = 0; i < 4; i++) {
      cb.push(box(-33 + i * 2.4, -31.4 + i * 2.4, 0, 1.6, z0 + 1, z0 + 3));
    }
    addPart('lords-crossbenches', 'Lords crossbenches', 'lords', cb);
  }
  // Table of the House, at which the clerks sit.
  addPart('lords-table-of-the-house', 'Lords Table of the House', 'lords', [
    box(-33, -27, 0, 1.2, z1 - 16, z1 - 13),
  ]);
  // The mace on the back of the Woolsack.
  {
    const m = cyl(0.12, 0.12, 2.4, -30, 2.4, z1 - 8, 8);
    m.rotateZ(Math.PI / 2);
    addPart('lords-mace', 'Lords mace', 'lords', [m]);
  }
  // Brass Gates enclosing the south doorway (1.5 tonnes, schematic).
  addPart('lords-brass-gates', 'Lords Brass Gates', 'lords', [
    box(-32, -28, 0, 4.5, z0 - 0.6, z0),
  ]);
}

// --- Central Lobby and the two lobbies: 11 parts.
{
  const cx = -30, cz = 0;
  // Octagon 18 m across, 23 m to the centre of the vaulted ceiling.
  addPart('central-lobby-octagon', 'Central Lobby octagon', 'central-lobby', [
    oct(9, 23, cx, 11.5, cz),
  ]);
  // Vaulted ceiling with Venetian glass mosaic between the ribs.
  {
    const vault = new THREE.SphereGeometry(9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    vault.translate(cx, 23, cz);
    addPart('central-lobby-vault', 'Central Lobby vaulted ceiling', 'central-lobby', [vault]);
  }
  // Great chandelier.
  {
    const chain = cyl(0.15, 0.15, 8, cx, 19, cz, 8);
    const lamp = new THREE.SphereGeometry(1.6, 12, 10);
    lamp.translate(cx, 14, cz);
    addPart('central-lobby-chandelier', 'Central Lobby chandelier', 'central-lobby', [chain, lamp]);
  }
  // Mosaics of the four patron saints (merged group).
  {
    const saints = [];
    for (const [ox, oz] of [[-9.2, 0], [9.2, 0], [0, -9.2], [0, 9.2]]) {
      const m = box(cx + ox - 1.5, cx + ox + 1.5, 8, 14, cz + oz - 1.5, cz + oz + 1.5);
      saints.push(m);
    }
    addPart('central-lobby-patron-saint-mosaics', 'Central Lobby patron saint mosaics', 'central-lobby', saints);
  }
  // Four bigger-than-life statues of 19th-century statesmen (merged group).
  {
    const statues = [];
    for (const [ox, oz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) {
      const s = new THREE.ConeGeometry(1, 3.5, 8);
      s.translate(cx + ox, 1.75, cz + oz);
      statues.push(s);
    }
    addPart('central-lobby-statesmen-statues', 'Central Lobby statesmen statues', 'central-lobby', statues);
  }
  // Minton encaustic tile floor with the Psalm 127 passage.
  addPart('central-lobby-floor', 'Central Lobby Minton tile floor', 'central-lobby', [
    oct(8.6, 0.3, cx, 0.15, cz),
  ]);
  // Corridors north and south of the lobby.
  addPart('commons-corridor', 'Commons Corridor', 'central-lobby', [
    box(-33, -27, 0, 8, -40, -9),
  ]);
  addPart('peers-corridor', 'Peers Corridor', 'central-lobby', [
    box(-33, -27, 0, 8, 9, 40),
  ]);
  // Members' Lobby: a cube of 13.7 m.
  addPart('members-lobby', 'Members Lobby', 'central-lobby', [
    box(-36.85, -23.15, 0, 13.7, -53.7, -40),
  ]);
  // The Rubble (Churchill) Arch, left unrepaired as a reminder of the war.
  addPart('members-lobby-rubble-arch', 'Members Lobby Rubble Arch', 'central-lobby', [
    box(-32, -28, 0, 6, -54.2, -53.5),
  ]);
  // Peers' Lobby: 12 m square, 10 m high, with the Tudor rose floor.
  addPart('peers-lobby', 'Peers Lobby', 'central-lobby', [
    box(-36, -24, 0, 10, 40, 52),
  ]);
  // Lower Waiting Hall east of the Central Lobby.
  addPart('lower-waiting-hall', 'Lower Waiting Hall', 'central-lobby', [
    box(-27, -10, 0, 8, -8, 8),
  ]);
}

// --- Royal Apartments (south of the Lords Chamber): 8 parts.
{
  const x0 = -36.7, x1 = -23;
  // Robing Room at the southern end.
  addPart('robing-room', 'Robing Room', 'royal-apartments', [
    box(x0, x1, 0, 10, 119.5, 132.9),
  ]);
  // Chair of State under its canopy.
  addPart('robing-room-chair-of-state', 'Robing Room Chair of State', 'royal-apartments', [
    box(-32, -28, 0, 4.5, 126, 128),
  ]);
  // Royal Gallery: 33.5 by 13.7 m.
  addPart('royal-gallery', 'Royal Gallery', 'royal-apartments', [
    box(x0, x1, 0, 13.7, 86, 119.5),
  ]);
  // Two Maclise paintings, 13.7 by 3.7 m each.
  {
    const p1 = box(-36.8, -36.5, 4, 7.7, 92, 105.7);
    const p2 = box(-36.8, -36.5, 4, 7.7, 105.8, 119.5);
    addPart('royal-gallery-maclise-paintings', 'Royal Gallery Maclise paintings', 'royal-apartments', [p1, p2]);
  }
  // Eight statues of gilded Caen stone.
  {
    const statues = [];
    for (let i = 0; i < 8; i++) {
      const s = new THREE.ConeGeometry(0.9, 3, 8);
      s.translate(-30, 1.5, 88 + i * 4);
      statues.push(s);
    }
    addPart('royal-gallery-statues', 'Royal Gallery Caen stone statues', 'royal-apartments', statues);
  }
  // Prince's Chamber between the Royal Gallery and the Lords Chamber.
  addPart('princes-chamber', 'Princes Chamber', 'royal-apartments', [
    box(x0, x1, 0, 10, 76.4, 86),
  ]);
  // Marble fireplace with gilded statuettes of Saint George and Saint Michael.
  {
    const fp = box(-32.5, -27.5, 0, 3.5, 119.5, 120.3);
    const s1 = new THREE.ConeGeometry(0.5, 1.5, 8);
    s1.translate(-31.5, 4.2, 119.9);
    const s2 = new THREE.ConeGeometry(0.5, 1.5, 8);
    s2.translate(-28.5, 4.2, 119.9);
    addPart('robing-room-marble-fireplace', 'Robing Room marble fireplace', 'royal-apartments', [fp, s1, s2]);
  }
  // Panelled ceiling 13.7 m above the Royal Gallery floor (schematic).
  addPart('royal-gallery-ceiling', 'Royal Gallery panelled ceiling', 'royal-apartments', [
    box(x0, x1, 13.2, 13.7, 86, 119.5),
  ]);
}

// --- Westminster Hall (the medieval survival): 6 parts.
{
  const x0 = -85, x1 = -64.3, z0 = 20, z1 = 93.2; // 20.7 by 73.2 m
  addPart('westminster-hall-walls', 'Westminster Hall walls', 'westminster-hall', [
    box(x0, x1, 0, 16, z0, z1),
  ]);
  // Hammerbeam roof: pitched timber roof, largest medieval timber roof in Northern Europe.
  {
    const roof = new THREE.CylinderGeometry(7.3, 7.3, 73.2, 3, 1);
    roof.rotateZ(Math.PI / 2);
    roof.rotateY(Math.PI / 2);
    roof.translate((x0 + x1) / 2, 16 + 3.6, (z0 + z1) / 2);
    addPart('westminster-hall-hammerbeam-roof', 'Westminster Hall hammerbeam roof', 'westminster-hall', [roof]);
  }
  // High windows along the hall.
  {
    const wins = [];
    for (let z = z0 + 8; z < z1 - 4; z += 10) {
      wins.push(box(x0 - 0.3, x0 + 0.3, 8, 14, z, z + 4));
      wins.push(box(x1 - 0.3, x1 + 0.3, 8, 14, z, z + 4));
    }
    addPart('westminster-hall-high-windows', 'Westminster Hall high windows', 'westminster-hall', wins);
  }
  // North and south porches.
  addPart('westminster-hall-north-porch', 'Westminster Hall north porch', 'westminster-hall', [
    box(x0 - 4, x1 + 4, 0, 10, z0 - 6, z0),
  ]);
  addPart('westminster-hall-south-porch', 'Westminster Hall south porch', 'westminster-hall', [
    box(x0 - 4, x1 + 4, 0, 10, z1, z1 + 6),
  ]);
  // Statue of Oliver Cromwell on Cromwell Green (erected 1899).
  {
    const s = new THREE.ConeGeometry(1, 3.5, 8);
    s.translate(-100, 1.75, 107);
    addPart('cromwell-statue', 'Cromwell statue', 'westminster-hall', [s, box(-101.5, -98.5, 0, 1.2, 105.5, 108.5)]);
  }
}

// --- West front (St Stephen's Tower, St Stephen's Hall, west facade): 5 parts.
{
  // West facade of the main block.
  addPart('west-front-facade', 'West front facade', 'west-front', [
    box(-60.5, -60, 0, 21.3, -132.9, 132.9),
  ]);
  // Pinnacles between the window bays of the west front.
  {
    const pins = [];
    for (let z = -125; z <= 125; z += 12.5) {
      pins.push(spire(1.2, 21.3, 28, -60, z, 6));
    }
    addPart('west-front-pinnacles', 'West front pinnacles', 'west-front', pins);
  }
  // St Stephen's Tower in the middle of the west front, housing the public entrance.
  addPart('st-stephens-tower', 'St Stephens Tower', 'west-front', [
    box(-66, -54, 0, 38, 24, 36),
    spire(8.5, 38, 48, -60, 30, 6),
  ]);
  // St Stephen's Hall: the public route from St Stephen's Entrance to the Central Lobby.
  addPart('st-stephens-hall', 'St Stephens Hall', 'west-front', [
    box(-58, -40, 0, 10, 18, 34),
  ]);
  // Marble statues of prominent parliamentarians in St Stephen's Hall.
  {
    const statues = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.ConeGeometry(0.9, 3, 8);
      s.translate(-55, 1.5, 20 + i * 2.4);
      const t = new THREE.ConeGeometry(0.9, 3, 8);
      t.translate(-43, 1.5, 20 + i * 2.4);
      statues.push(s, t);
    }
    addPart('st-stephens-hall-statues', 'St Stephens Hall statues', 'west-front', statues);
  }
  // Old Palace Yard gateway blocks (schematic).
  addPart('old-palace-yard-gateway', 'Old Palace Yard gateway', 'west-front', [
    box(-70, -66, 0, 12, 90, 100),
  ]);
}

// --- Courtyards and grounds: 10 parts.
{
  const slab = (x0, x1, z0, z1) => box(x0, x1, -0.4, 0, z0, z1);
  addPart('new-palace-yard', 'New Palace Yard', 'courtyards', [slab(-60, 15, -160, -135)]);
  addPart('old-palace-yard', 'Old Palace Yard', 'courtyards', [slab(-130, -85, 10, 100)]);
  addPart('cromwell-green', 'Cromwell Green', 'courtyards', [slab(-115, -88, 95, 120)]);
  addPart('speakers-court', 'Speakers Court', 'courtyards', [slab(-52, -20, -112, -96)]);
  addPart('state-officers-court', 'State Officers Court', 'courtyards', [slab(-52, -40, 8, 24)]);
  addPart('royal-court', 'Royal Court', 'courtyards', [slab(-20, -8, 60, 76)]);
  addPart('black-rods-garden', 'Black Rods Garden', 'courtyards', [slab(-60, -35, 135, 155)]);
  addPart('victoria-tower-gardens', 'Victoria Tower Gardens', 'courtyards', [slab(-35, 20, 135, 185)]);
  addPart('speakers-green', 'Speakers Green', 'courtyards', [slab(-50, -5, -185, -135)]);
  addPart('college-green', 'College Green', 'courtyards', [slab(-110, -85, -20, 10)]);
}

// --- Roofs: chimney clusters from the four hundred fires.
{
  const chimneys = [];
  for (let z = -120; z <= 120; z += 20) {
    for (const x of [-45, -15]) {
      chimneys.push(box(x - 1, x + 1, 27, 34, z - 1, z + 1));
    }
  }
  addPart('roof-chimney-stacks', 'Roof chimney stacks', 'roofs', chimneys);
}

// ---------------------------------------------------------------- colors
// Schematic light stone palette: Anston magnesian limestone is
// sand-coloured; the Eiffel Tower is the only dark realistic model.
function colorFor(id) {
  if (id === 'elizabeth-tower-big-ben') return '#8a6d1f';
  if (id === 'elizabeth-tower-quarter-bells') return '#8a6d1f';
  if (id === 'elizabeth-tower-ayrton-light') return '#f5e9b8';
  if (id.startsWith('elizabeth-tower-dial-')) return '#2b2b2b';
  if (id === 'elizabeth-tower-clock-hands') return '#c9a227';
  if (id === 'elizabeth-tower-shields') return '#8f1f1f';
  if (id.startsWith('elizabeth-tower-')) return '#d9cfbb';
  if (id === 'victoria-tower-window-rows') return '#2f5f8f';
  if (id === 'victoria-tower-archive-stacks') return '#6e6a60';
  if (id === 'victoria-tower-flag') return '#a33a3a';
  if (id === 'victoria-tower-flagstaff') return '#3f4448';
  if (id === 'victoria-tower-sovereign-entrance') return '#4a3728';
  if (id === 'victoria-tower-archway-statues') return '#8a8478';
  if (id.startsWith('victoria-tower-')) return '#d9cfbb';
  if (id === 'central-tower-ventilation-openings') return '#2b2b2b';
  if (id.startsWith('central-tower-')) return '#d9cfbb';
  if (id === 'river-terrace' || id === 'river-terrace-balustrade') return '#b9b2a0';
  if (id.startsWith('river-front-pinnacles') || id === 'roof-ventilation-turrets') return '#cfc8b4';
  if (id.startsWith('river-') || id === 'north-front' || id === 'south-front') return '#d9cfbb';
  if (id === 'main-roof' || id === 'roof-chimney-stacks') return '#8a8478';
  if (id === 'westminster-hall-high-windows') return '#2f5f8f';
  if (id === 'westminster-hall-hammerbeam-roof') return '#6b4a2e';
  if (id === 'cromwell-statue') return '#3f4448';
  if (id.startsWith('westminster-hall-')) return '#d9cfbb';
  if (id === 'west-front-pinnacles') return '#cfc8b4';
  if (id.startsWith('west-front-') || id.startsWith('st-stephens-') || id === 'old-palace-yard-gateway') return '#d9cfbb';
  if (id === 'commons-benches-government' || id === 'commons-benches-opposition') return '#1e5c3a';
  if (id === 'commons-speakers-chair') return '#6b4a2e';
  if (id === 'commons-red-lines') return '#a33a3a';
  if (id.startsWith('commons-')) return '#a89a80';
  if (id === 'lords-throne' || id === 'lords-canopy') return '#c9a227';
  if (id === 'lords-woolsack' || id === 'lords-judges-woolsack') return '#8f1f1f';
  if (id.startsWith('lords-benches-') || id === 'lords-crossbenches') return '#8f1f1f';
  if (id === 'lords-mace') return '#c9a227';
  if (id === 'lords-brass-gates') return '#8a6d1f';
  if (id.startsWith('lords-')) return '#9a7a6a';
  if (id === 'central-lobby-vault') return '#8a8478';
  if (id === 'central-lobby-chandelier') return '#c9a227';
  if (id === 'central-lobby-patron-saint-mosaics') return '#2f5f8f';
  if (id === 'central-lobby-statesmen-statues') return '#8a8478';
  if (id === 'central-lobby-floor') return '#4a5a6a';
  if (id === 'members-lobby-rubble-arch') return '#6e6a60';
  if (id === 'peers-lobby') return '#9a7a6a';
  if (id.startsWith('central-lobby-') || id.endsWith('-corridor') || id.endsWith('-lobby')) return '#d9cfbb';
  if (id === 'robing-room-marble-fireplace') return '#efe9d8';
  if (id === 'st-stephens-hall-statues') return '#8a8478';
  if (id === 'river-embankment-wall') return '#8a8478';
  if (id === 'robing-room-chair-of-state') return '#c9a227';
  if (id === 'royal-gallery-maclise-paintings') return '#4a3728';
  if (id === 'royal-gallery-statues') return '#c9a227';
  if (id === 'norman-porch') return '#a89a80';
  if (id.startsWith('royal-') || id === 'robing-room' || id === 'princes-chamber') return '#9a7a6a';
  if (id === 'cromwell-green' || id === 'victoria-tower-gardens' || id === 'black-rods-garden' || id === 'speakers-green' || id === 'college-green') return '#3f7a3f';
  if (id.endsWith('-yard') || id.endsWith('-court')) return '#b9b2a0';
  return '#d9cfbb';
}

// ---------------------------------------------------------------- systems
const systems = [
  { id: 'victoria-tower', name: 'Victoria Tower', color: '#d9cfbb', description: 'The 98.5 m tower at the south-western corner, the tallest part of the palace, housing the Parliamentary Archives and the Sovereigns Entrance.' },
  { id: 'elizabeth-tower', name: 'Elizabeth Tower', color: '#d9cfbb', description: 'The 96.3 m clock tower at the north end, designed by Pugin and housing the Great Clock and the Great Bell, Big Ben.' },
  { id: 'central-tower', name: 'Central Tower', color: '#d9cfbb', description: 'The 91 m octagonal tower over the Central Lobby, originally built as a ventilation chimney.' },
  { id: 'river-front', name: 'River front', color: '#d9cfbb', description: 'The 265.8 m river frontage on the Thames, with the Terrace and the pavilion towers at either end.' },
  { id: 'commons', name: 'House of Commons', color: '#a89a80', description: 'The Commons Chamber, rebuilt after the 1941 Blitz, with its green benches, lobbies and division lobbies.' },
  { id: 'lords', name: 'House of Lords', color: '#9a7a6a', description: 'The Lords Chamber with its red benches, the Sovereigns Throne, the Woolsack and the Peers Lobby.' },
  { id: 'central-lobby', name: 'Central Lobby and lobbies', color: '#d9cfbb', description: 'The octagonal heart of the palace, 18 m across and 23 m high, with the Members and Peers lobbies.' },
  { id: 'royal-apartments', name: 'Royal Apartments', color: '#9a7a6a', description: 'The monarchs processional rooms at the southern end: the Norman Porch, Robing Room, Royal Gallery and Princes Chamber.' },
  { id: 'westminster-hall', name: 'Westminster Hall', color: '#d9cfbb', description: 'The oldest structure on the estate, completed in 1099, with the largest medieval timber roof in Northern Europe.' },
  { id: 'west-front', name: 'West front', color: '#d9cfbb', description: 'The west front with St Stephens Tower, the public entrance, and St Stephens Hall.' },
  { id: 'courtyards', name: 'Courtyards and grounds', color: '#b9b2a0', description: 'The yards, courts and gardens inside and around the palace.' },
  { id: 'roofs', name: 'Roofs and chimneys', color: '#8a8478', description: 'The main roof and the chimney stacks from the palaces four hundred fires.' },
];

// ---------------------------------------------------------------- explanations
const explanations = {
  'victoria tower corner pinnacles': 'The corner pinnacles of the Victoria Tower archive block. Exact pinnacle shapes are schematic.',
  'victoria tower archive body': 'The main body of the Victoria Tower, 98.5 m tall at the south-western corner of the palace, the tallest part of the palace and the tallest secular building in the world when it was completed in 1858. The interior is the Parliamentary Archives. Exact window divisions are schematic.',
  'victoria tower window rows': 'Schematic window rows of the archive block. The Archives hold the master copies of all Acts of Parliament since 1497 in 5.5 miles of steel shelves over 12 floors.',
  'victoria tower sovereigns entrance': 'The Sovereigns Entrance at the base of the Victoria Tower, a 15 m high archway richly decorated with sculpture, used by the monarch at the State Opening of Parliament. Exact arch profile is schematic.',
  'victoria tower archway statues': 'Statues of Saints George, Andrew and Patrick and Queen Victoria above the Sovereigns Entrance archway. Exact sculptures are schematic.',
  'victoria tower archive stacks': 'Schematic archive stacks: 5.5 miles of steel shelves over 12 floors holding the Parliamentary Archives. Interior layout is schematic.',
  'victoria tower pyramidal roof': 'The cast-iron pyramidal roof of the Victoria Tower. Exact profile is schematic.',
  'victoria tower flagstaff': 'The 22 m flagstaff on the pyramidal roof. It flies the Royal Standard when the Sovereign is present in the palace, and the Union Flag on all other days.',
  'victoria tower flag': 'The flag on the Victoria Tower: the Royal Standard when the Sovereign is present, the Union Flag otherwise.',
  'norman porch': 'The Norman Porch beneath the Victoria Tower, reached by a broad unbroken flight of 26 grey granite steps, leading to the Royal Gallery and the Robing Room. Exact interior is schematic.',
  'elizabeth tower foundations': 'The concrete foundations of the Elizabeth Tower, 3.7 m thick, below the square shaft. Exact foundation layout is schematic.',
  'elizabeth tower shaft': 'The square shaft of the Elizabeth Tower, 12.2 m on each side, built of bricks clad with sand-coloured Anston limestone from South Yorkshire. Exact coursing is schematic.',
  'elizabeth tower clock stage': 'The clock stage of the Elizabeth Tower, housing the Great Clock of Westminster, which uses its original mechanism from 1859. Exact stage articulation is schematic.',
  'elizabeth tower north dial': 'One of the four clock dials, 6.9 m in diameter, with the centre 54.9 m above ground level. The dials are made of milk glass and lit from behind at night.',
  'elizabeth tower south dial': 'One of the four clock dials, 6.9 m in diameter, with the centre 54.9 m above ground level. The dials are made of milk glass and lit from behind at night.',
  'elizabeth tower east dial': 'One of the four clock dials, 6.9 m in diameter, with the centre 54.9 m above ground level. The dials are made of milk glass and lit from behind at night.',
  'elizabeth tower west dial': 'One of the four clock dials, 6.9 m in diameter, with the centre 54.9 m above ground level. The dials are made of milk glass and lit from behind at night.',
  'elizabeth tower clock hands': 'The clock hands: the hour hand is 2.7 m long and the minute hand 4.3 m. Exact hand shapes are schematic.',
  'elizabeth tower belfry': 'The belfry above the clock, housing the five bells. The climb from ground level to the belfry is 334 steps.',
  'great bell (big ben)': 'The Great Bell, properly called Big Ben, weighing 13.8 tonnes, the third-heaviest bell in Britain. Its nickname, of uncertain origin, has been applied to the whole tower.',
  'elizabeth tower quarter bells': 'The four quarter bells that strike the Westminster Chimes every quarter hour. Exact bell shapes are schematic.',
  'elizabeth tower heraldic shields': '52 shields above the belfry decorated with the national emblems of the four countries of the UK, the Tudor rose, the portcullis and fleurs-de-lis. Exact shields are schematic.',
  'elizabeth tower spire': 'The spire of the Elizabeth Tower, covered in hundreds of cast iron roof-tiles. Exact tile work is schematic.',
  'elizabeth tower ayrton light': 'The Ayrton Light in the lantern, installed in 1885 at the request of Queen Victoria. It is lit when either House of Parliament is sitting after dark.',
  'central tower drum': 'The octagonal drum of the Central Tower, standing over the middle of the building above the Central Lobby.',
  'central tower ventilation openings': 'Louvered ventilation openings in the Central Tower. The tower was added at the insistence of Dr. David Boswell Reid as a central chimney to draw vitiated air out of the building; it completely failed its purpose.',
  'central tower stone spire': 'The stone spire of the Central Tower, 91 m to the top, the only palace tower with a stone spire. Barry made it a spire to balance the more massive lateral towers.',
  'central tower finial': 'The finial topping the Central Tower spire. Exact shape is schematic.',
  'river front wall': 'The river front wall facing the Thames, 265.8 m long and 21.3 m to the roofline, built of sand-coloured Anston magnesian limestone, much of it later replaced with honey-coloured Clipsham stone. Exact bay divisions are schematic.',
  'river front pinnacles': 'Pinnacles rising between the window bays along the river front, enlivening the skyline. Exact pinnacle shapes are schematic.',
  'river terrace': 'The River Terrace on the Thames side, 206.7 m by 10 m. Exact terrace detail is schematic.',
  'river terrace balustrade': 'The balustrade along the River Terrace. Exact balustrade pattern is schematic.',
  'river embankment wall': 'The embankment wall between the River Terrace and the Thames. Exact wall detail is schematic.',
  'speakers tower': 'Speakers Tower, the pavilion at the northern end of the river front, containing Speakers House, the official residence of the Speaker of the House of Commons. Exact massing is schematic.',
  'chancellors tower': 'Chancellors Tower, the pavilion at the southern end of the river front. Exact massing is schematic.',
  'roof ventilation turrets': 'Turrets along the skyline that mask ventilation shafts. Like the Central Tower, they were built for practical reasons.',
  'north front': 'The North Front, 70.7 m long. Exact facade detail is schematic.',
  'south front': 'The South Front, 98.2 m long. Exact facade detail is schematic.',
  'main roof': 'The main pitched roof of the palace behind the river front. Exact roof profile is schematic.',
  'house of commons chamber': 'The Chamber of the House of Commons at the northern end of the palace, 14 by 20.7 m, opened in 1950 after the Victorian chamber was destroyed by German bombs in 1941 and rebuilt in a simplified style under Giles Gilbert Scott.',
  'commons speakers chair': 'The Speakers Chair at the north end of the Commons Chamber, a gift to Parliament from Australia. Exact chair detail is schematic.',
  'commons table of the house': 'The Table of the House, at which the clerks sit, a gift from Canada. Exact table detail is schematic.',
  'commons despatch boxes': 'The dispatch boxes in front of the Speakers Chair, a gift from New Zealand, on which front-bench members rest notes during speeches.',
  'commons government benches': 'The green benches of the Commons, occupied on the Speakers right by members of the Government party. The chamber seats only 427 of the 650 members.',
  'commons opposition benches': 'The green benches of the Commons, occupied on the Speakers left by the Opposition. There are no cross-benches as in the House of Lords.',
  'commons red lines': 'The two red lines on the floor of the House of Commons, 2.5 m apart, said by apocryphal tradition to be just over two sword-lengths.',
  'commons aye division lobby': 'The Aye division lobby beside the Commons Chamber. Votes in both Houses are conducted as divisions.',
  'commons no division lobby': 'The No division lobby beside the Commons Chamber. Votes in both Houses are conducted as divisions.',
  'commons strangers gallery': 'The Strangers Gallery above the Commons Chamber. Exact gallery layout is schematic.',
  'house of lords chamber': 'The Chamber of the House of Lords in the southern part of the palace, 13.7 by 24.4 m, lavishly decorated with red benches on three sides.',
  'lords sovereigns throne': 'The Sovereigns Throne at the south end of the Lords Chamber. The Sovereign attends only the State Opening of Parliament.',
  'lords gilded canopy': 'The ornate gold canopy above the Sovereigns Throne. Exact canopy detail is schematic.',
  'lords woolsack': 'The Woolsack, an armless red cushion stuffed with wool representing the historical importance of the wool trade, used by the officer presiding over the House.',
  'lords judges woolsack': 'The Judges Woolsack, a larger red cushion in front of the Woolsack, used during the State Opening to represent the judicial branch.',
  'lords spiritual side benches': 'The red benches of the Spiritual Side of the Lords Chamber, on the Lord Speakers right, occupied by the Lords Spiritual and members of the Government party.',
  'lords temporal side benches': 'The red benches of the Temporal Side of the Lords Chamber, on the Lord Speakers left, occupied by the Opposition.',
  'lords crossbenches': 'The crossbenches in the middle of the Lords Chamber opposite the Woolsack, for peers with no party affiliation.',
  'lords table of the house': 'The Table of the House in the Lords Chamber, at which the clerks sit. Exact table detail is schematic.',
  'lords mace': 'The Houses mace, representing royal authority, placed on the back of the Woolsack. Exact mace detail is schematic.',
  'lords brass gates': 'The Brass Gates enclosing the doorway from the Peers Lobby into the Lords Chamber, a pair of elaborately pierced and studded doors weighing 1.5 tonnes. Exact gate detail is schematic.',
  'central lobby octagon': 'The Central Lobby, originally named Octagon Hall, 18 m across and 23 m from the floor to the centre of the vaulted ceiling, directly below the Central Tower.',
  'central lobby vaulted ceiling': 'The vaulted ceiling of the Central Lobby; the panels between the vaults ribs are covered with Venetian glass mosaic displaying floral emblems and heraldic badges. Exact vault profile is schematic.',
  'central lobby chandelier': 'The great chandelier of the Central Lobby, under which a person can see both the Royal Throne and the Speakers Chair when all the intervening doors are open. Exact chandelier detail is schematic.',
  'central lobby patron saint mosaics': 'The tympana above the four doorways of the Central Lobby, adorned with mosaics of the patron saints of the UKs constituent nations: Saint George for England, Saint Andrew for Scotland, Saint David for Wales and Saint Patrick for Ireland.',
  'central lobby statesmen statues': 'Four bigger-than-life statues of 19th-century statesmen in the Central Lobby, including one of four-time prime minister William Gladstone. Exact statues are schematic.',
  'central lobby minton tile floor': 'The Minton encaustic tile floor of the Central Lobby, in intricate patterns, including a passage from Psalm 127 written in Latin.',
  'commons corridor': 'The Commons Corridor leading north from the Central Lobby toward the Members Lobby, decorated with scenes of 17th-century political history. Exact decoration is schematic.',
  'peers corridor': 'The Peers Corridor leading south from the Central Lobby toward the Peers Lobby, vaulted and decorated with murals of the English Civil War period. Exact decoration is schematic.',
  'members lobby': 'The Members Lobby, a cube of 13.7 m, where members of Parliament hold discussions and are interviewed by accredited journalists, collectively known as The Lobby.',
  'members lobby rubble arch': 'The Rubble Arch (or Churchill Arch) of the Members Lobby, left unrepaired after the 1941 bombing as a reminder of the evils of war.',
  'peers lobby': 'The Peers Lobby north of the Lords Chamber, 12 m square and 10 m high, with a floor centrepiece of a radiant Tudor rose made of Derbyshire marbles.',
  'lower waiting hall': 'The Lower Waiting Hall east of the Central Lobby, reached from the East Corridor. Exact room layout is schematic.',
  'robing room': 'The Robing Room at the southern end of the palace, where the Sovereign prepares for the State Opening of Parliament by changing into official robes and the Imperial State Crown.',
  'robing room chair of state': 'The Chair of State in the Robing Room, on a dais of three steps under a canopy. Exact chair detail is schematic.',
  'royal gallery': 'The Royal Gallery north of the Robing Room, 33.5 by 13.7 m, the stage of the royal procession at State Openings of Parliament.',
  'royal gallery maclise paintings': 'The two large paintings by Daniel Maclise in the Royal Gallery, each 13.7 by 3.7 m: The Death of Nelson and The Meeting of Wellington and Blucher after the Battle of Waterloo. Exact paintings are schematic.',
  'royal gallery caen stone statues': 'The eight statues of gilded Caen stone flanking the doorways and bay window of the Royal Gallery, each depicting a monarch during whose reign a key battle or war took place. Exact statues are schematic.',
  'princes chamber': 'The Princes Chamber, a small anteroom between the Royal Gallery and the Lords Chamber, where members of the Lords meet to discuss business. Exact decoration is schematic.',
  'robing room marble fireplace': 'The ornate marble fireplace of the Robing Room, with gilded statuettes of Saint George and Saint Michael. Exact fireplace detail is schematic.',
  'royal gallery panelled ceiling': 'The panelled ceiling of the Royal Gallery, 13.7 m above the floor, featuring Tudor roses and lions. Exact ceiling detail is schematic.',
  'westminster hall walls': 'The walls of Westminster Hall, the oldest structure on the estate, completed in 1099. Exact wall articulation is schematic.',
  'westminster hall hammerbeam roof': 'The hammerbeam roof of Westminster Hall, the largest medieval timber roof in Northern Europe, 20.7 m by 73.2 m, built under Richard II. Exact timber work is schematic.',
  'westminster hall high windows': 'The high windows of Westminster Hall. Exact tracery is schematic.',
  'westminster hall north porch': 'The north porch of Westminster Hall. Exact porch detail is schematic.',
  'westminster hall south porch': 'The south porch of Westminster Hall. Exact porch detail is schematic.',
  'cromwell statue': 'The bronze statue of Oliver Cromwell on Cromwell Green, erected amid controversy in 1899. Exact statue is schematic.',
  'west front facade': 'The west front facade of the palace. Exact facade detail is schematic.',
  'west front pinnacles': 'Pinnacles between the window bays of the west front. Exact pinnacle shapes are schematic.',
  'st stephens tower': 'St Stephens Tower in the middle of the west front, between Westminster Hall and Old Palace Yard, housing the public entrance to the palace. Exact massing is schematic.',
  'st stephens hall': 'St Stephens Hall, the public route from St Stephens Entrance through a flight of stairs to the Central Lobby, with marble statues of prominent parliamentarians. Exact interior is schematic.',
  'st stephens hall statues': 'The marble statues of prominent parliamentarians in St Stephens Hall. Exact statues are schematic.',
  'old palace yard gateway': 'The gateway block at Old Palace Yard on the west front. Exact gateway detail is schematic.',
  'new palace yard': 'New Palace Yard on the north side of the palace, private and closed to the public. Exact layout is schematic.',
  'old palace yard': 'Old Palace Yard in front of the palace, paved over and covered in concrete security blocks. Exact layout is schematic.',
  'cromwell green': 'Cromwell Green outside Westminster Hall, site of the bronze statue of Oliver Cromwell. Exact layout is schematic.',
  'speakers court': 'Speakers Court, one of the internal courtyards of the palace. Exact layout is schematic.',
  'state officers court': 'State Officers Court, one of the internal courtyards of the palace. Exact layout is schematic.',
  'royal court': 'Royal Court, one of the internal courtyards of the palace. Exact layout is schematic.',
  'black rods garden': 'Black Rods Garden, named after the Gentleman Usher of the Black Rod, closed to the public and used as a private entrance. Exact layout is schematic.',
  'victoria tower gardens': 'Victoria Tower Gardens, a public park along the river south of the palace. Exact layout is schematic.',
  'speakers green': 'Speakers Green, directly north of the palace, private and closed to the public. Exact layout is schematic.',
  'college green': 'College Green opposite the House of Lords, a small triangular green commonly used for television interviews with politicians. Exact layout is schematic.',
  'roof chimney stacks': 'Chimney stacks along the main roof. Reid planned for the heat and smoke of about four hundred fires around the palace. Exact stack positions are schematic.',
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
const binName = 'palace-of-westminster-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the palace-of-westminster directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const missing = records.filter((r) => !explanations[r.part.name.toLowerCase()]).map((r) => r.part.name);
if (missing.length) {
  console.error('MISSING EXPLANATIONS:', missing);
  process.exit(1);
}

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Palace of Westminster, London',
  title: 'Palace of Westminster',
  location: 'London, England',
  blurb: 'The Palace of Westminster in London, meeting place of the UK Parliament. Nearly 300 m of Perpendicular Gothic Revival river frontage on the Thames, with the 98.5 m Victoria Tower, the 96.3 m Elizabeth Tower housing the Great Bell Big Ben, and the 91 m octagonal Central Tower.',
  sourceUrls: [
    { label: 'Wikipedia: Palace of Westminster', url: 'https://en.wikipedia.org/wiki/Palace_of_Westminster' },
    { label: 'Wikipedia: Big Ben (Elizabeth Tower)', url: 'https://en.wikipedia.org/wiki/Clock_Tower,_Palace_of_Westminster' },
    { label: 'Wikipedia: Victoria Tower', url: 'https://en.wikipedia.org/wiki/Victoria_Tower' },
    { label: 'parliament.uk: Palace of Westminster factsheet', url: 'http://www.parliament.uk/documents/lords-information-office/2013/palace-of-westminster-factsheet.pdf' },
    { label: 'parliament.uk: House of Commons factsheet G11', url: 'https://b5d7ac.staticwbm.com/20131203040742/http://www.parliament.uk/documents/commons-information-office/g11.pdf' },
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
  chunks: [{ url: '/models/palace-of-westminster/palace-of-westminster-0.bin', bytes: offset }],
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
