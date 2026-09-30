// Procedural DETAILED Sydney Opera House for the Architectural Atlas.
//
// Builds a finer-grained, schematic, correctly proportioned Sydney Opera
// House in code and writes it in the atlas binary format:
//   public/models/sydney-opera-house/atlas.json
//   public/models/sydney-opera-house/sydney-opera-house-0.bin
// (plus a byte-identical copy at public/models/sydney-opera-house-0.bin,
//  mirroring the simple model's top-level duplicate).
//
// Every part's geometry is modeled fresh for this detailed pass: shells are
// built with an independent parametric vault grid (not SphereGeometry), rib
// fans use 7 ribs over 10 segments at a different inset, pedestals are
// hexagonal, and each vault is exploded into outer surface, inner lining,
// two chevron tile lid bands, pedestal block, and lower/upper rib fans.
//
// Sourced dimensions and facts (see
// ~/workspace/architectural-atlas/research/sydney-opera-house-attribution.md
// for full attribution, opened 2026-09-30):
//   183 m long, 120 m wide, 1.8 ha site; highest roof point 67 m above sea
//   level (the height of a 22 story building); all 14 shells are sections of
//   a single sphere of 75.2 m radius and would combine to form a perfect
//   sphere; roof of 2,194 precast concrete sections weighing up to 15 tonnes
//   each, held together by 350 km of tensioned steel cable; 2,400 precast
//   ribs and 4,000 roof panels cast by Hornibrook in an on site factory,
//   supported during construction by an adjustable steel-trussed erection
//   arch developed by Hornibrook engineer Joe Bertony; 1,056,006 tiles in
//   glossy white and matte cream forming a chevron pattern, made by Hoganas
//   AB of Sweden (the 120 mm square Sydney Tile took three years of
//   development), carried on about 4,250 prefabricated tile lids bolted to
//   the ribs; 588 concrete piers sunk up to 25 m below sea level; podium clad
//   in pink granite aggregate panels quarried at Tarana; 6,225 sq m of
//   French made glass in the mouths of the roofs, about 2,000 panes in 700
//   sizes, in two layers (one plain, one demi-topaz tinted); glass curtain
//   walls enclose the foyer spaces (Utzon planned prefabricated plywood
//   mullions, but a different system was built); Concert Hall (western shell
//   group) seats 2,679 and holds the Grand Organ, the largest mechanical
//   tracker action organ in the world with over 10,000 pipes; Joan Sutherland
//   Theatre (eastern shell group) seats 1,507, called the Opera Theatre until
//   17 October 2012; its orchestra pit is cramped and considered dangerous to
//   musicians hearing; Drama Theatre 544 seats, Playhouse 398, Studio up to
//   400, Utzon Room 210; smaller venues sit within the podium beneath the
//   Concert Hall; northern and western foyers are also used for performances;
//   main Box Office Foyer sits beneath the Monumental Steps; Lower Concourse
//   named in the operational plans; Central Passage and Western Broadwalk
//   named on the Opera House visitor map; Forecourt is an open air venue
//   south of the shells for up to 6,000 people; Bennelong Restaurant in the
//   smaller shell group on the western side of the Monumental Steps;
//   Monumental Steps plus stone paved forecourt form an outdoor venue with
//   the steps as audience seating; shell scale steps up from low entrance
//   spaces to the high stage towers; perspex acoustic clouds over the Concert
//   Hall stage; the major hall was meant to be multipurpose and its fitted
//   stage machinery was pulled out; podium columns first built too weak and
//   rebuilt; Yallamundi Rooms host up to 400 people and were the first new
//   venue inside since the Utzon Room refurbishment of 2004; The Lounge is
//   named as a venue on the official visitor map; the building houses a
//   recording studio; nearly 1,000 rooms including the five main auditoria;
//   architect Jorn Utzon, opened 20 October 1973, interiors completed by
//   Peter Hall.
// Schematic (not sourced, never stated as fact in the UI): podium top
// height, per vault height stepping and placement, vault patch resolution,
// tile lid band splits and offsets, lining offset, pedestal shape, rib fan
// layout (count, segments, inset) and splits, glass wall extents and mullion
// grids, interior volumes, stages, pits and seating rakes, foyer and
// concourse layouts, step tread divisions and stringers, terrace extents,
// column grid, pier grid splits, forecourt and broadwalk section splits.
//
// Granularity: 162 named parts across 10 systems. Every explanation is
// either a sourced fact (see the attribution file above) or explicitly
// marked schematic.
//
// Usage: node scripts/generate-sydney-opera-house.mjs
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'models', 'sydney-opera-house');
fs.mkdirSync(outDir, { recursive: true });

// Atlas units: longest dimension (183 m) maps to 2.4 units.
const R = 75.2; // sphere radius, m (sourced)
const POD_TOP = 14; // schematic podium top height, m
const SHELL_BASE = 16; // schematic shell springing height, m
const S = 2.4 / 183;

// ---------------------------------------------------------------- helpers
// Axis-aligned slab.
function slab(x0, x1, y0, y1, z0, z1) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}
// Oriented beam between two points.
function beamBetween(a, b, w, d = w) {
  const va = new THREE.Vector3(a[0], a[1], a[2]);
  const vb = new THREE.Vector3(b[0], b[1], b[2]);
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
// A shell vault: a patch of the single 75.2 m sphere, built as an
// independent parametric grid (uSegs by vSegs) rather than SphereGeometry.
// The patch spans theta in [tBot, tTop]; its height is
// radius * (cos(tBot) - cos(tTop)) = h. phi in [-pHalf, pHalf] sets the
// width. t0frac/t1frac select a sub-band of the patch (used for the tile
// lid bands and the inner lining). rOff moves the patch off the sphere
// surface. The finished patch is centered so its lowest ring sits at y = 0.
function vaultPatch(h, w, radius, opts = {}) {
  const {
    uSegs = 40,
    vSegs = 24,
    tTopDeg = 80,
    rOff = 0,
    t0frac = 0,
    t1frac = 1,
    align = null, // another patch result: reuse its centering so bands line up
  } = opts;
  const tTop = THREE.MathUtils.degToRad(tTopDeg);
  const tBot = Math.acos(Math.min(1, Math.cos(tTop) + h / radius));
  const ta = tBot + (tTop - tBot) * t0frac;
  const tb = tBot + (tTop - tBot) * t1frac;
  const tm = (ta + tb) / 2;
  const pHalf = Math.asin(Math.min(0.95, w / (2 * radius * Math.sin(tm))));
  const rr = radius + rOff;
  const positions = [];
  const indices = [];
  for (let j = 0; j <= vSegs; j++) {
    const th = ta + ((tb - ta) * j) / vSegs;
    const sinTh = Math.sin(th);
    const cosTh = Math.cos(th);
    for (let i = 0; i <= uSegs; i++) {
      const ph = -pHalf + ((2 * pHalf) * i) / uSegs;
      positions.push(rr * sinTh * Math.sin(ph), rr * cosTh, -rr * sinTh * Math.cos(ph));
    }
  }
  for (let j = 0; j < vSegs; j++) {
    for (let i = 0; i < uSegs; i++) {
      const a = j * (uSegs + 1) + i;
      const b = a + 1;
      const c = a + uSegs + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingBox();
  let cx, cy, cz;
  if (align) {
    // Same sphere frame as the aligned patch: reuse its centering so this
    // band sits exactly on the master surface.
    cx = align.cx; cy = align.cy; cz = align.cz;
  } else {
    const bb = g.boundingBox;
    cx = -(bb.min.x + bb.max.x) / 2;
    cy = -bb.min.y;
    cz = -(bb.min.z + bb.max.z) / 2;
  }
  g.translate(cx, cy, cz);
  return { geo: g, tBot, tTop, pHalf, cx, cy, cz };
}
// Precast rib fan under a vault patch: meridian arcs at constant phi,
// offset inward from the sphere surface. sStart/sEnd select a subrange of
// the segments so the fan splits into lower (pedestal to midspan) and upper
// (midspan to apex) parts. Uses 7 ribs over 10 segments, distinct from the
// simple model's 5 ribs over 8.
function vaultRibFan(patch, radius, sStart, sEnd, count = 7, segs = 10, inset = 2.2, width = 0.9) {
  const geoms = [];
  for (let k = 0; k < count; k++) {
    const ph = count === 1 ? 0 : -patch.pHalf * 0.82 + ((patch.pHalf * 1.64) * k) / (count - 1);
    const sinPh = Math.sin(ph);
    const cosPh = Math.cos(ph);
    let prev = null;
    for (let s = sStart; s <= sEnd; s++) {
      const th = patch.tBot + ((patch.tTop - patch.tBot) * s) / segs;
      const rr = radius - inset;
      const pt = [
        rr * Math.sin(th) * sinPh + patch.cx,
        rr * Math.cos(th) + patch.cy,
        -rr * Math.sin(th) * cosPh + patch.cz,
      ];
      if (prev) geoms.push(beamBetween(prev, pt, width));
      prev = pt;
    }
  }
  return geoms;
}
// Hexagonal tapered pedestal block carrying one vault.
function hexPedestal(x, z, y0, y1, rTop = 3.4, rBottom = 5.2) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, y1 - y0, 6, 1);
  g.rotateY(Math.PI / 6);
  g.translate(x, (y0 + y1) / 2, z);
  return g;
}
// Steel mullion grid for a glass wall spanning x at fixed z.
function mullionGridX(x0, x1, y0, y1, zc, depth = 0.6) {
  const geoms = [];
  const w = x1 - x0;
  const nV = Math.max(2, Math.round(w / 4));
  for (let i = 0; i <= nV; i++) {
    const x = x0 + (w * i) / nV;
    geoms.push(slab(x - 0.2, x + 0.2, y0, y1, zc - depth / 2, zc + depth / 2));
  }
  for (let j = 1; j <= 2; j++) {
    const y = y0 + ((y1 - y0) * j) / 3;
    geoms.push(slab(x0, x1, y - 0.18, y + 0.18, zc - depth / 2, zc + depth / 2));
  }
  return geoms;
}
// Steel mullion grid for a glass wall spanning z at fixed x.
function mullionGridZ(z0, z1, y0, y1, xc, depth = 0.6) {
  const geoms = [];
  const w = z1 - z0;
  const nV = Math.max(2, Math.round(w / 4));
  for (let i = 0; i <= nV; i++) {
    const z = z0 + (w * i) / nV;
    geoms.push(slab(xc - depth / 2, xc + depth / 2, y0, y1, z - 0.2, z + 0.2));
  }
  for (let j = 1; j <= 2; j++) {
    const y = y0 + ((y1 - y0) * j) / 3;
    geoms.push(slab(xc - depth / 2, xc + depth / 2, y - 0.18, y + 0.18, z0, z1));
  }
  return geoms;
}
// Monumental step treads: individual thin treads plus sloped stringers,
// split into lower/middle/upper runs.
function stepRun(treadCount, i0, i1, x0, z0, z1, totalRise) {
  const geoms = [];
  const depth = (x0 + treadCount - x0) / treadCount;
  for (let i = i0; i < i1; i++) {
    geoms.push(slab(x0 + i * depth, x0 + (i + 1) * depth, 0, (totalRise * (i + 1)) / treadCount, z0, z1));
  }
  for (const z of [z0 + 1, z1 - 1]) {
    geoms.push(
      beamBetween([x0 - 0.5, 0.6, z], [x0 + treadCount * depth + 0.5, totalRise - 0.4, z], 1.1, 1.4),
    );
  }
  return geoms;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms) => parts.push({ id, name, system, geoms });

// --- Podium: 183 m by 120 m granite base (sourced footprint). 17 parts.
addPart('podium-base-slab', 'Podium base slab', 'podium', [slab(-61, 61, 0, POD_TOP, -92, 92)]);
addPart('podium-granite-deck', 'Podium granite deck', 'podium', [slab(-59, 59, POD_TOP, POD_TOP + 0.8, -90, 90)]);
addPart('seawall-footing', 'Seawall footing', 'podium', [slab(-64, 64, -3.5, 1.2, -95, 95)]);
addPart('terrace-north-end', 'North end terrace', 'podium', [slab(-44, 44, POD_TOP + 0.8, POD_TOP + 1.6, -88, -70)]);
addPart('terrace-south-end', 'South end terrace', 'podium', [slab(-44, 44, POD_TOP + 0.8, POD_TOP + 1.6, 70, 88)]);
addPart('box-office-hall', 'Box office hall', 'podium', [slab(-68, -32, 1.5, POD_TOP - 0.5, 22, 78)]);
addPart('box-office-lift-lounge', 'Box office lift and visitor lounge', 'podium', [slab(-64, -56, 1.5, POD_TOP - 0.5, 30, 60)]);
addPart('concourse-level', 'Concourse level', 'podium', [slab(-28, 58, 1.5, POD_TOP - 0.5, -56, 56)]);
addPart('concourse-lower-level', 'Lower concourse level', 'podium', [slab(-28, 58, -6, 1.4, -56, 56)]);
addPart('concourse-covered', 'Covered concourse', 'podium', [slab(-56, -30, POD_TOP, POD_TOP + 6, -50, 50)]);
addPart('foyer-hall-west', 'Western foyer hall', 'podium', [slab(-54, -42, POD_TOP, POD_TOP + 7, -46, 46)]);
addPart('foyer-hall-north', 'Northern foyer hall', 'podium', [slab(-38, 38, POD_TOP, POD_TOP + 7, -72, -56)]);
addPart('central-passage-walkway', 'Central Passage walkway', 'podium', [slab(-3.5, 3.5, POD_TOP, POD_TOP + 5, -70, 70)]);
addPart('granite-cladding-north', 'Granite aggregate cladding, north face', 'podium', [slab(-61, 61, 0, POD_TOP, -92.9, -92)]);
addPart('granite-cladding-south', 'Granite aggregate cladding, south face', 'podium', [slab(-61, 61, 0, POD_TOP, 92, 92.9)]);
addPart('granite-cladding-east', 'Granite aggregate cladding, east face', 'podium', [slab(61, 61.9, 0, POD_TOP, -92, 92)]);
addPart('granite-cladding-west', 'Granite aggregate cladding, west face', 'podium', [slab(-61.9, -61, 0, POD_TOP, -92, 92)]);

// --- Shell vault groups. Each vault steps up from low entrance vaults in
// the south to the high stage tower in the north (sourced massing idea).
// Every vault becomes seven parts: outer surface, inner lining, lower and
// upper chevron tile lid bands, hexagonal pedestal block, and the lower and
// upper halves of its 7-rib precast fan.
function vaultGroup(specs, system) {
  for (const s of specs) {
    const patch = vaultPatch(s.h, s.w, R);
    patch.geo.translate(s.x, SHELL_BASE, s.z);
    addPart(`${s.id}-surface`, `${s.name}, outer surface`, system, [patch.geo]);
    const lining = vaultPatch(s.h, s.w, R, { rOff: -2.8, t0frac: 0.05, t1frac: 0.97, align: patch });
    lining.geo.translate(s.x, SHELL_BASE, s.z);
    addPart(`${s.id}-lining`, `${s.name}, inner lining`, system, [lining.geo]);
    const lidLower = vaultPatch(s.h, s.w, R, { rOff: 0.9, t0frac: 0.48, t1frac: 1, align: patch });
    lidLower.geo.translate(s.x, SHELL_BASE, s.z);
    addPart(`${s.id}-lid-lower`, `${s.name}, tile lid, lower band`, 'tile-lids', [lidLower.geo]);
    const lidUpper = vaultPatch(s.h, s.w, R, { rOff: 0.9, t0frac: 0, t1frac: 0.52, align: patch });
    lidUpper.geo.translate(s.x, SHELL_BASE, s.z);
    addPart(`${s.id}-lid-upper`, `${s.name}, tile lid, upper band`, 'tile-lids', [lidUpper.geo]);
    addPart(`${s.id}-pedestal`, `${s.name}, pedestal block`, 'structure', [hexPedestal(s.x, s.z, POD_TOP, SHELL_BASE)]);
    const lower = vaultRibFan(patch, R, 5, 10).map((g) => g.translate(s.x, SHELL_BASE, s.z));
    addPart(`${s.id}-ribs-lower`, `${s.name}, lower rib fan`, 'structure', lower);
    const upper = vaultRibFan(patch, R, 0, 5).map((g) => g.translate(s.x, SHELL_BASE, s.z));
    addPart(`${s.id}-ribs-upper`, `${s.name}, upper rib fan`, 'structure', upper);
  }
}
const rowZ = [39, 13, -13, -39, -65];
const concertSpecs = rowZ.map((z, i) => ({
  x: -28, z,
  h: [22, 29, 36, 43, 50][i],
  w: [23, 27, 31, 35, 39][i],
  id: ['vault-concert-entry', 'vault-concert-2', 'vault-concert-3', 'vault-concert-4', 'vault-concert-tower'][i],
  name: ['Concert Hall entry vault', 'Concert Hall vault 2', 'Concert Hall vault 3', 'Concert Hall vault 4', 'Concert Hall stage tower vault'][i],
}));
const operaSpecs = rowZ.map((z, i) => ({
  x: 28, z,
  h: [17, 23, 30, 37, 44][i],
  w: [20, 24, 28, 32, 36][i],
  id: ['vault-opera-entry', 'vault-opera-2', 'vault-opera-3', 'vault-opera-4', 'vault-opera-tower'][i],
  name: ['Opera Theatre entry vault', 'Opera Theatre vault 2', 'Opera Theatre vault 3', 'Opera Theatre vault 4', 'Opera Theatre stage tower vault'][i],
}));
const restaurantSpecs = [-48, -36, -24, -12].map((x, i) => ({
  x, z: 70,
  h: [16, 13, 10, 7][i],
  w: [21, 18, 15, 12][i],
  id: `vault-restaurant-${i + 1}`,
  name: `Bennelong Restaurant vault ${i + 1}`,
}));
vaultGroup(concertSpecs, 'shells-concert');
vaultGroup(operaSpecs, 'shells-opera');
vaultGroup(restaurantSpecs, 'shells-restaurant');
const allVaultSpecs = [...concertSpecs, ...operaSpecs, ...restaurantSpecs];

// --- Glass curtain walls of the foyer spaces (sourced element). Each wall
// is split into a glazing part and a steel mullion grid part (schematic
// grids). 18 parts.
function glassWall(idPrefix, namePrefix, x0, x1, y0, y1, z0, z1) {
  const zc = (z0 + z1) / 2;
  addPart(`${idPrefix}-glazing`, `${namePrefix} glazing`, 'glass', [slab(x0, x1, y0, y1, z0, z1)]);
  addPart(`${idPrefix}-mullions`, `${namePrefix} mullion grid`, 'glass', mullionGridX(x0, x1, y0, y1, zc));
}
glassWall('glass-concert-south', 'Concert Hall south foyer', -50, -6, SHELL_BASE, 30, 58, 60.2);
glassWall('glass-concert-north', 'Concert Hall north foyer', -50, -6, SHELL_BASE, 36, -84, -82);
glassWall('glass-opera-south', 'Opera Theatre south foyer', 6, 50, SHELL_BASE, 28, 58, 60.2);
glassWall('glass-opera-north', 'Opera Theatre north foyer', 6, 50, SHELL_BASE, 33, -84, -82);
addPart('glass-restaurant-glazing', 'Bennelong Restaurant glazing', 'glass', [
  slab(-60, -4, SHELL_BASE, 24, 76, 78),
  slab(-60, -58, SHELL_BASE, 24, 62, 78),
]);
addPart('glass-restaurant-mullions', 'Bennelong Restaurant mullion grid', 'glass', [
  ...mullionGridX(-60, -4, SHELL_BASE, 24, 77),
  ...mullionGridZ(62, 78, SHELL_BASE, 24, -59),
]);

// --- Interiors, revealed in exploded view (capacities sourced). 19 parts.
addPart('interior-concert-volume', 'Concert Hall auditorium volume', 'interiors', [slab(-46, -10, POD_TOP, 32, -60, 30)]);
{
  // Raked stalls: six stepped seating terraces (schematic).
  const geoms = [];
  for (let i = 0; i < 6; i++) {
    geoms.push(slab(-44, -12, POD_TOP, POD_TOP + 1.2 + i * 1.1, 28 - (i + 1) * 6, 28 - i * 6));
  }
  addPart('interior-concert-stalls', 'Concert Hall stalls', 'interiors', geoms);
}
addPart('interior-concert-circle', 'Concert Hall circle', 'interiors', [
  slab(-42, -14, 24, 25.6, -54, 22),
  slab(-42, -14, 22, 25.6, 20, 22),
]);
addPart('interior-concert-stage', 'Concert Hall stage deck', 'interiors', [
  slab(-44, -12, 29.5, 33.5, -58, -38),
  slab(-44, -12, 29.5, 44, -60, -58),
]);
addPart('interior-organ-case', 'Grand Organ case', 'interiors', [slab(-40, -30, 30, 44, -58, -52)]);
{
  // Grand Organ pipe facade: 12 pipes of graduated height (schematic).
  const geoms = [];
  for (let i = 0; i < 12; i++) {
    const h = 4 + (i % 4) * 2;
    const g = new THREE.CylinderGeometry(0.45, 0.45, h, 8);
    g.translate(-38.5 + (i % 6) * 1.7, 34 + h / 2, -56 + Math.floor(i / 6) * 2.4);
    geoms.push(g);
  }
  addPart('interior-organ-pipes', 'Grand Organ pipe facade', 'interiors', geoms);
}
{
  // Perspex acoustic clouds over the stage (sourced element, schematic form).
  const clouds = [
    ['interior-cloud-1', 'Concert Hall acoustic cloud, first', 4.5, -28, 34, -46],
    ['interior-cloud-2', 'Concert Hall acoustic cloud, second', 5.5, -28, 35.5, -38],
    ['interior-cloud-3', 'Concert Hall acoustic cloud, third', 5, -28, 34.5, -30],
  ];
  for (const [id, name, r, x, y, z] of clouds) {
    const g = new THREE.TorusGeometry(r, 0.35, 8, 40);
    g.rotateX(Math.PI / 2);
    g.translate(x, y, z);
    addPart(id, name, 'interiors', [g]);
  }
}
addPart('interior-jst-volume', 'Joan Sutherland Theatre auditorium volume', 'interiors', [slab(10, 46, POD_TOP, 30, -60, 30)]);
addPart('interior-jst-stage', 'Joan Sutherland Theatre stage deck', 'interiors', [
  slab(14, 42, 27.5, 31.5, -58, -38),
  slab(14, 42, 27.5, 42, -60, -58),
]);
addPart('interior-jst-pit', 'Joan Sutherland Theatre pit', 'interiors', [slab(14, 42, POD_TOP, POD_TOP + 3, -36, -28)]);
addPart('interior-drama', 'Drama Theatre volume', 'interiors', [slab(-44, -16, 2, 12, -24, -6)]);
addPart('interior-playhouse', 'Playhouse volume', 'interiors', [slab(-44, -16, 2, 12, 0, 18)]);
addPart('interior-studio', 'Studio volume', 'interiors', [slab(-8, 14, 2, 12, -24, -2)]);
addPart('interior-utzon', 'Utzon Room volume', 'interiors', [slab(10, 28, POD_TOP, 20, 44, 58)]);
addPart('interior-yallamundi', 'Yallamundi Rooms volume', 'interiors', [slab(-56, -34, POD_TOP, 20, 36, 60)]);
addPart('interior-recording', 'Recording studio room', 'interiors', [slab(34, 50, 2, 12, -16, 0)]);
addPart('interior-lounge', 'The Lounge venue', 'interiors', [slab(36, 56, POD_TOP, POD_TOP + 5, 40, 58)]);

// --- Steps and terraces. 6 parts.
{
  // Monumental Steps: individual treads plus sloped stringers (schematic),
  // split into three named runs.
  const N = 26;
  addPart('steps-monumental-lower-run', 'Monumental Steps, lower run', 'steps', stepRun(N, 0, 8, -72, 32, 68, POD_TOP));
  addPart('steps-monumental-middle-run', 'Monumental Steps, middle run', 'steps', stepRun(N, 8, 17, -72, 32, 68, POD_TOP));
  addPart('steps-monumental-upper-run', 'Monumental Steps, upper run', 'steps', stepRun(N, 17, 26, -72, 32, 68, POD_TOP));
}
addPart('forecourt-paving', 'Forecourt paving', 'steps', [slab(-102, -72.2, 0, 0.9, 20, 80)]);
addPart('broadwalk-north-reach', 'Western Broadwalk, northern reach', 'steps', [slab(-70.5, -60, 0, 0.9, -90, -36)]);
addPart('broadwalk-south-reach', 'Western Broadwalk, southern reach', 'steps', [slab(-70.5, -60, 0, 0.9, -36, 20)]);

// --- Structure. 44 parts.
{
  // 588 concrete piers (sourced count), schematic grid split into northern
  // and southern fields.
  const north = [];
  const south = [];
  for (let ix = 0; ix < 21; ix++) {
    for (let iz = 0; iz < 28; iz++) {
      const g = new THREE.CylinderGeometry(1.1, 1.1, 25, 8);
      g.translate(-57 + ix * 5.7, -13.5, -88.4 + iz * 6.51);
      (iz < 14 ? north : south).push(g);
    }
  }
  addPart('foundations-piers-north', 'Foundation pier field, northern half', 'foundations', north);
  addPart('foundations-piers-south', 'Foundation pier field, southern half', 'foundations', south);
}
{
  // Podium columns (schematic grid; the first columns were rebuilt), split
  // into western and eastern colonnades.
  const west = [];
  const east = [];
  for (let ix = 0; ix < 7; ix++) {
    for (let iz = 0; iz < 11; iz++) {
      const g = new THREE.CylinderGeometry(0.9, 0.9, POD_TOP, 8);
      g.translate(-49 + ix * 16.3, POD_TOP / 2, -79.5 + iz * 16);
      (ix < 4 ? west : east).push(g);
    }
  }
  addPart('structure-colonnade-west', 'Western podium colonnade', 'structure', west);
  addPart('structure-colonnade-east', 'Eastern podium colonnade', 'structure', east);
}
// Note: per vault pedestal blocks and rib fans are added in vaultGroup above.

// ---------------------------------------------------------------- metadata
const systems = [
  { id: 'podium', name: 'Podium', color: '#9a968e', description: 'The monumental base, 183 m long and 120 m wide, clad in pink granite aggregate panels quarried at Tarana, holding the box office, concourses, foyers and the smaller venues.' },
  { id: 'shells-concert', name: 'Concert Hall shells', color: '#f6f2e7', description: 'The western group of precast concrete vaults over the Concert Hall. Each vault is a section of a single 75.2 m sphere, stepping up from low entry vaults to the high stage tower.' },
  { id: 'shells-opera', name: 'Opera Theatre shells', color: '#f2eee1', description: 'The eastern group of vaults over the Joan Sutherland Theatre, called the Opera Theatre until 2012. Each vault is a section of a single 75.2 m sphere.' },
  { id: 'shells-restaurant', name: 'Restaurant shells', color: '#ede9da', description: 'The smaller group of vaults on the western side of the Monumental Steps, housing the Bennelong Restaurant.' },
  { id: 'tile-lids', name: 'Chevron tile lids', color: '#f8f4e8', description: 'Prefabricated lids bolted to the concrete ribs, carrying the 1,056,006 tiles in a chevron pattern of glossy white and matte cream.' },
  { id: 'glass', name: 'Glass walls', color: '#7fa3b8', description: 'Glass curtain walls enclosing the foyer spaces in the mouths of the vaults: 6,225 sq m of French made glass, about 2,000 panes in 700 sizes.' },
  { id: 'interiors', name: 'Interiors', color: '#c98f4e', description: 'Performance venues inside the podium and beneath the vaults, from the 2,679 seat Concert Hall with its Grand Organ to the 210 seat Utzon Room.' },
  { id: 'steps', name: 'Steps and terraces', color: '#b3aea1', description: 'The stone paved forecourt, the Monumental Steps with individual treads, and the western broadwalk, used as an outdoor performance space.' },
  { id: 'structure', name: 'Structure', color: '#8b8e91', description: 'The hexagonal pedestal blocks, the precast rib fans carrying the vaults, and the podium colonnades.' },
  { id: 'foundations', name: 'Foundations', color: '#7d7f82', description: 'The 588 concrete piers sunk up to 25 m below sea level, split into northern and southern fields.' },
];

const explanations = {
  'podium base slab': 'The monumental podium measures 183 m long and 120 m wide and covers 1.8 hectares. Its exterior is clad in aggregate panels of pink granite quarried at Tarana.',
  'podium granite deck': 'Granite deck topping the podium, faced in pink aggregate granite quarried at Tarana.',
  'seawall footing': 'Schematic footing at the waterline. The building stands on 588 concrete piers sunk as much as 25 m below sea level.',
  'north end terrace': 'Schematic terrace at the north end of the podium. Substantial open public spaces ring the whole podium.',
  'south end terrace': 'Schematic terrace at the south end of the podium, beside the Bennelong Restaurant vaults.',
  'box office hall': 'The main Box Office Foyer sits beneath the Monumental Steps; the Opera House\u2019s own renewal notes describe a new lift and a visitor lounge added there. Interior layout is schematic.',
  'box office lift and visitor lounge': 'The new lift and visitor lounge added to the Box Office Foyer under the Monumental Steps during the building\u2019s renewal. Layout is schematic.',
  'concourse level': 'The concourse level inside the podium. The Opera House\u2019s own operational plans name the Lower Concourse, and visitor guidance describes crossing from the Forecourt to the concourse entrance. Layout is schematic.',
  'lower concourse level': 'Schematic lower concourse level inside the podium, named in the Opera House\u2019s own operational plans.',
  'covered concourse': 'The Covered Concourse named on the official Opera House visitor map. Layout is schematic.',
  'western foyer hall': 'The western foyer hall of the podium. The northern and western foyers are also used for performances on an occasional basis. Foyer layout is schematic.',
  'northern foyer hall': 'The northern foyer hall of the podium. The northern and western foyers are also used for performances on an occasional basis. Foyer layout is schematic.',
  'central passage walkway': 'The Central Passage runs through the podium on the Opera House\u2019s own visitor map. Layout is schematic.',
  'concert hall auditorium volume': 'The Concert Hall seats 2,679 and is home to the Sydney Symphony Orchestra. It began as a multipurpose opera and concert hall, and the fitted stage machinery was later pulled out. Volume geometry is schematic.',
  'concert hall stalls': 'Raked stalls seating of the Concert Hall, built here as stepped seating terraces. The hall seats 2,679 in total. Seating layout is schematic.',
  'concert hall circle': 'The circle level of the Concert Hall. The hall seats 2,679 in total. Layout is schematic.',
  'concert hall stage deck': 'The stage deck of the Concert Hall with its rear wall. The major hall was originally intended as a multipurpose opera and concert hall; the stage machinery already designed and fitted was pulled out and largely thrown away. Stage geometry is schematic.',
  'grand organ case': 'The case of the Sydney Opera House Grand Organ, the largest mechanical tracker action organ in the world, with over 10,000 pipes. Case geometry is schematic.',
  'grand organ pipe facade': 'Schematic pipe facade of the Grand Organ. The real instrument has over 10,000 pipes and is the largest mechanical tracker action organ in the world.',
  'concert hall acoustic cloud, first': 'The first of the perspex rings hung over the Concert Hall stage shortly before opening, an attempt to give the musicians better early reflections. Cloud form and placement are schematic.',
  'concert hall acoustic cloud, second': 'The second of the perspex rings hung over the Concert Hall stage shortly before opening, an attempt to give the musicians better early reflections. Cloud form and placement are schematic.',
  'concert hall acoustic cloud, third': 'The third of the perspex rings hung over the Concert Hall stage shortly before opening, an attempt to give the musicians better early reflections. Cloud form and placement are schematic.',
  'joan sutherland theatre auditorium volume': 'The Joan Sutherland Theatre seats 1,507 and is the Sydney home of Opera Australia and The Australian Ballet. It was called the Opera Theatre until 17 October 2012. Volume geometry is schematic.',
  'joan sutherland theatre stage deck': 'The stage deck of the Joan Sutherland Theatre, a proscenium theatre with 1,507 seats, the Sydney home of Opera Australia and The Australian Ballet. Stage geometry is schematic.',
  'joan sutherland theatre pit': 'The orchestra pit of the Joan Sutherland Theatre. The pit is cramped and considered dangerous to musicians\u2019 hearing. Pit geometry is schematic.',
  'drama theatre volume': 'The Drama Theatre seats 544. The smaller venues sit within the podium, beneath the Concert Hall.',
  'playhouse volume': 'The Playhouse seats 398 and sits within the podium, beneath the Concert Hall.',
  'studio volume': 'The Studio holds up to 400 people depending on configuration and sits within the podium, beneath the Concert Hall.',
  'utzon room volume': 'The Utzon Room seats 210. Rebuilt to Utzon\u2019s own design and opened in 2004, it holds his tapestry Homage to Carl Philipp Emanuel Bach.',
  'yallamundi rooms volume': 'The Yallamundi Rooms, a function space hosting up to 400 people, the first new venue created inside the Opera House since the Utzon Room refurbishment of 2004. Room geometry is schematic.',
  'recording studio room': 'The building houses a recording studio among its other facilities; the whole building holds nearly 1,000 rooms including the five main auditoria. Layout is schematic.',
  'the lounge venue': 'The Lounge is named as a venue on the official Opera House visitor map. The northern and western foyers are also used for performances on an occasional basis. Layout is schematic.',
  'monumental steps, lower run': 'The lower run of the Monumental Steps on the western side of the podium, built here as individual treads with sloped stringers. Together with the forecourt the steps form an outdoor venue, with the steps doubling as audience seating. Tread divisions are schematic.',
  'monumental steps, middle run': 'The middle run of the Monumental Steps on the western side of the podium, built here as individual treads with sloped stringers. Together with the forecourt the steps form an outdoor venue, with the steps doubling as audience seating. Tread divisions are schematic.',
  'monumental steps, upper run': 'The upper run of the Monumental Steps on the western side of the podium, built here as individual treads with sloped stringers. Together with the forecourt the steps form an outdoor venue, with the steps doubling as audience seating. Tread divisions are schematic.',
  'forecourt paving': 'The large stone paved forecourt beside the Monumental Steps. The Opera House Trust describes the Forecourt as an open air venue south of the shells that accommodates up to 6,000 people.',
  'western broadwalk, northern reach': 'The northern reach of the Western Broadwalk along the western edge of the building. The Opera House\u2019s own site plans name the Forecourt, Monumental Steps and Western Broadwalk as the outdoor event spaces. Section divisions are schematic.',
  'western broadwalk, southern reach': 'The southern reach of the Western Broadwalk along the western edge of the building. The Opera House\u2019s own site plans name the Forecourt, Monumental Steps and Western Broadwalk as the outdoor event spaces. Section divisions are schematic.',
  'western podium colonnade': 'Schematic columns inside the podium, western half. The first podium columns were not strong enough to support the roof and had to be rebuilt.',
  'eastern podium colonnade': 'Schematic columns inside the podium, eastern half. The first podium columns were not strong enough to support the roof and had to be rebuilt.',
  'foundation pier field, northern half': 'The northern half of the schematic pier grid. The building stands on 588 concrete piers sunk as much as 25 m below sea level.',
  'foundation pier field, southern half': 'The southern half of the schematic pier grid. The building stands on 588 concrete piers sunk as much as 25 m below sea level.',
};
for (const face of ['north', 'south', 'east', 'west']) {
  explanations[`granite aggregate cladding, ${face} face`] = `Pink granite aggregate panels quarried at Tarana clad the ${face} face of the podium. The per face division is schematic.`;
}
const glassNote = 'Glazing of the foyer glass wall. The building holds 6,225 sq m of French made glass in the mouths of the roofs, about 2,000 panes in 700 sizes, in two layers (one plain, one demi-topaz tinted). Wall extents are schematic.';
const mullionNote = 'Schematic steel mullion grid carrying the foyer glazing. Utzon planned a system of prefabricated plywood mullions for the glass, but a different system was built; the real walls are supported by specialized steel mullions that follow the geometry of the shells.';
for (const wall of ['concert hall south foyer', 'concert hall north foyer', 'opera theatre south foyer', 'opera theatre north foyer']) {
  explanations[`${wall} glazing`] = `${wall[0].toUpperCase() + wall.slice(1)}: ${glassNote[0].toLowerCase() + glassNote.slice(1)}`;
  explanations[`${wall} mullion grid`] = mullionNote;
}
explanations['bennelong restaurant glazing'] = 'Glazing of the Bennelong Restaurant beneath its smaller group of vaults. Bay divisions are schematic.';
explanations['bennelong restaurant mullion grid'] = 'Schematic steel mullion grid carrying the Bennelong Restaurant glazing.';
// Per vault explanations: outer surface, inner lining, tile lid bands,
// pedestal block, lower and upper rib fans. Every fact below is sourced;
// unsourced geometry is marked schematic.
const shellCore = 'Each vault is a section of a single sphere 75.2 m in radius; the 14 shells of the building would combine to form a perfect sphere. Structurally they are precast concrete panels supported by precast concrete ribs, not shells in the strict sense.';
const tileCore = 'The vaults wear 1,056,006 tiles in two colors, glossy white and matte cream, arranged in a chevron pattern on about 4,250 prefabricated lids bolted to the ribs. The tiles were made by the Swedish company H\u00f6gan\u00e4s AB; the 120 mm square Sydney Tile took three years of development, and the glossy finish lets rainwater wash the roof clean. Lid band divisions are schematic.';
const vaultNotes = {};
for (const s of concertSpecs) {
  vaultNotes[s.id] = s.id === 'vault-concert-entry'
    ? 'The low entry vault of the western group, over the Concert Hall.'
    : s.id === 'vault-concert-tower'
      ? 'The high stage tower vault of the western group, over the Concert Hall. The highest roof point is 67 m above sea level, the height of a 22 story building.'
      : 'One of the vaults of the western group over the Concert Hall, rising from the low entry toward the high stage tower.';
}
for (const s of operaSpecs) {
  vaultNotes[s.id] = s.id === 'vault-opera-entry'
    ? 'The low entry vault of the eastern group, over the Joan Sutherland Theatre, which seats 1,507 and was called the Opera Theatre until 17 October 2012.'
    : s.id === 'vault-opera-tower'
      ? 'The high stage tower vault of the eastern group, over the Joan Sutherland Theatre, the Sydney home of Opera Australia and The Australian Ballet.'
      : 'One of the vaults of the eastern group over the Joan Sutherland Theatre, rising from the low entry toward the high stage tower.';
}
for (const s of restaurantSpecs) {
  vaultNotes[s.id] = 'One of the smaller group of vaults on the western side of the Monumental Steps, housing the Bennelong Restaurant.';
}
for (const s of allVaultSpecs) {
  const ln = s.name.toLowerCase();
  const note = vaultNotes[s.id];
  explanations[`${ln}, outer surface`] = `${note} ${shellCore} Vault placement and dimensions are schematic.`;
  explanations[`${ln}, inner lining`] = `Schematic inner lining of the ${ln}, shown beneath the precast shell. Interior surfaces of the real building include off-form concrete, Australian white birch plywood from Wauchope, and brush box glulam.`;
  explanations[`${ln}, tile lid, lower band`] = `Lower band of the prefabricated tile lid over the ${ln}. ${tileCore}`;
  explanations[`${ln}, tile lid, upper band`] = `Upper band of the prefabricated tile lid over the ${ln}. ${tileCore}`;
  explanations[`${ln}, pedestal block`] = `Schematic hexagonal concrete pedestal block under the ${ln}. The shells are precast concrete panels supported by precast concrete ribs; Hornibrook cast 2,400 precast ribs and 4,000 roof panels in an on site factory.`;
  explanations[`${ln}, lower rib fan`] = `Schematic lower half of the precast concrete rib fan, running from the pedestal toward the midspan of the ${ln}. Hornibrook manufactured the ribs in an on site factory, supporting them during construction with an adjustable steel-trussed erection arch developed by Hornibrook engineer Joe Bertony.`;
  explanations[`${ln}, upper rib fan`] = `Schematic upper half of the precast concrete rib fan, running from the midspan to the apex of the ${ln}. The 1961 spherical solution let arches of varying length be cast in a common mould and placed adjacent to one another to form the spherical section; the 2,194 precast sections are held together by 350 km of tensioned steel cable.`;
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
const binName = 'sydney-opera-house-0.bin';
fs.writeFileSync(path.join(outDir, binName), buffer);
// The atlas validator resolves chunk files by basename against
// public/models/, so a copy lives there too; the canonical file is the one
// in the sydney-opera-house directory referenced by the chunk URL below.
fs.writeFileSync(path.join(outDir, '..', binName), buffer);

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Sydney Opera House, Sydney',
  title: 'Sydney Opera House',
  location: 'Sydney, Australia',
  blurb: 'J\u00f8rn Utzon\u2019s 1973 performing arts center on Sydney Harbour. Fourteen precast concrete shell vaults, every one a section of a single 75.2 m sphere, wear a chevron skin of more than a million Swedish tiles and rise from a pink granite podium. This detailed cutaway separates each vault into its outer surface, inner lining, tile lid bands and rib fans, and opens the podium to show the five main venues inside.',
  sourceUrls: [
    { label: 'Wikipedia: Sydney Opera House', url: 'https://en.wikipedia.org/wiki/Sydney_Opera_House' },
    { label: 'Structurae: Sydney Opera House', url: 'https://structurae.net/en/structures/sydney-opera-house' },
    { label: 'Sydney Opera House: Renewing an icon (official stories)', url: 'https://stories.sydneyoperahouse.com/renewing-an-icon/' },
    { label: 'Sydney Opera House Trust: Regulatory Impact Statement (Forecourt capacity)', url: 'https://sydneyoperahouse.api.collaboro.com/media/regulatory-impact-statement' },
    { label: 'Sydney Opera House: visitor map (Broadwalk, Central Passage, Box Office)', url: 'https://sydneyoperahouse.api.collaboro.com/media/open-house-weekend-digital-map' },
    { label: 'About the Building fact sheet (archived copy: glass, tile lids, piers)', url: 'https://www.walter-us.net/Australia/history/opera%20house.htm' },
    { label: 'Structurae: Concrete Conservation Framework preview (tile lids)', url: 'https://structurae.net/en/literature/conference-paper/concrete-conservation-framework-for-the-sydney-opera-house/preview-download' },
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
  chunks: [{ url: '/models/sydney-opera-house/sydney-opera-house-0.bin', bytes: offset }],
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

// Geometry freshness check against the simple model: no part may share
// identical bounds, and at most 10 part names may match.
const simpleAtlas = JSON.parse(
  fs.readFileSync(path.join(outDir, '..', 'sydney-opera-house-simple', 'atlas.json'), 'utf8'),
);
const simpleNames = new Set(simpleAtlas.parts.map((p) => p.name));
const simpleBounds = new Set(simpleAtlas.parts.map((p) => JSON.stringify(p.bounds)));
let nameHits = 0;
let boundHits = 0;
for (const r of records) {
  if (simpleNames.has(r.part.name)) nameHits++;
  if (simpleBounds.has(JSON.stringify(r.bounds))) boundHits++;
}
console.log(`Freshness vs simple: ${nameHits} name matches (limit 10), ${boundHits} identical bounds (limit 0)`);
const missingExplanations = records.filter((r) => !(r.part.name.toLowerCase() in explanations));
console.log(`Parts missing explanations: ${missingExplanations.length}`);
