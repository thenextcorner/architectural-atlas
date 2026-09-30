// Procedural Empire State Building (DETAILED) for the Architectural Atlas.
//
// Builds a schematic, correctly proportioned Empire State Building in code and
// writes it in the atlas binary format:
//   public/models/empire-state/atlas.json
//   public/models/empire-state/empire-state-0.bin
//
// Sourced dimensions and facts (Empire State Building, Wikipedia, and the
// Structurae entry "Empire State Building (Manhattan, 1931)", both opened
// 2026-09-30; see ~/workspace/architectural-atlas/research/empire-state-attribution.md):
//   tip 1,454 ft (443.2 m); roof 1,250 ft (381.0 m); top floor 1,224 ft (373.1 m);
//   86th floor observatory 1,050 ft (320 m); 102 stories; 73 elevators;
//   6,514 windows; footprint 424 ft (129.2 m) east-west by 187 ft (57.0 m) north-south;
//   five story base occupying the entire lot; 81 story shaft above it;
//   setback above the 5th story 60 ft (18 m) deep on all sides;
//   setbacks at the 21st, 25th, 30th, 72nd, 81st, and 85th stories, mandated by
//   the 1916 Zoning Resolution and corresponding to the tops of elevator shafts;
//   interior space at most 28 ft (8.5 m) deep; 210 structural columns per floor;
//   16 story, 200 ft (61 m) metal crown above the 86th floor, mostly mechanical;
//   mooring mast: four rectangular tiers topped by a cylindrical shaft with a
//   conical pinnacle; 203 ft (61.9 m) pinnacle with broadcast antennas and a
//   lightning rod; 158 ft hollow steel mast with elevators and utilities;
//   dirigible docking plan abandoned (high winds); airships would have moored at
//   the 106th floor equivalent; mast topped out November 21, 1930;
//   Indiana limestone panels (Indiana Limestone Company, south-central Indiana
//   quarry), signature blonde color; 200,000 cu ft of limestone and granite,
//   ten million bricks, 730 short tons of aluminum and stainless steel;
//   tower bays in sets of one, two, or three windows per floor, projecting
//   slightly from the cladding; alternating narrow and wide piers;
//   nickel-chrome steel mullions; horizontal aluminum spandrels between floors;
//   stainless steel window frames;
//   Fifth Avenue entrance: three sets of metal doors, molded piers topped with
//   sculpted concrete eagles, triple-height transom window with geometric
//   patterns, golden "Empire State" letters above the fifth floor windows;
//   two entrances each on 33rd and 34th Streets with modernistic stainless steel
//   canopies; first floor storefronts in aluminum framed doors and windows
//   within black granite;
//   lobby: three stories high, the only space with narrative motifs; one set of
//   double doors between revolving doors; bronze motifs of Electricity, Masonry,
//   and Heating; two tiers of marble (darker wainscoting, lighter above);
//   zigzag terrazzo floor running east to west; escalators at the west ends to
//   a mezzanine; aluminum relief of the building as built (without the antenna);
//   2009 renovation replaced the information desk clock with an anemometer;
//   elevators: 73 total; original 64 by Otis (4 express connecting lobby, 80th
//   floor, and landings in between; 54 local passenger; 8 freight); additional
//   elevators connect the 80th floor to the six floors above; one elevator
//   connects the 86th and 102nd observatories and the mechanical floors between;
//   observatories on the 80th (indoor, opened 2019, Stephen Wiltshire skyline
//   mural), 86th (enclosed gallery plus open air deck), and 102nd floors
//   (fully enclosed, redesigned 2019 with floor to ceiling windows);
//   visitors enter the observatories at 20 West 34th Street; about four million
//   visitors a year;
//   lighting: white searchlights first used November 1932 (Roosevelt victory);
//   four "Freedom Lights" in 1956; 72nd floor floodlights added February 1964
//   for the Worlds Fair; 204 metal-halide lights in 1976; spire lit in colors
//   since October 12, 1977; 1,200 LED fixtures in 2012 (nine to 16 million colors);
//   broadcast: 200 ft broadcast tower completed 1953; separate FM antennae
//   ringing the 103rd floor built 1965; mast has 480 windows (replaced 2015);
//   103rd floor (originally the planned docking station) now holds electrical
//   equipment with an exterior balcony;
//   designed by Shreve, Lamb and Harmon; structural engineer Homer Gage Balcom;
//   built by Starrett Brothers and Eken; construction March 17, 1930 to
//   April 11, 1931; opened May 1, 1931; cost $40,948,900;
//   riveted steel frame; 42 pounds per square foot structural stiffness;
//   building weight 365,000 short tons.
//
// Intermediate widths, interior layout, fixture placement, and foundation depth
// are schematic approximations and are never stated as facts in the UI.
//
// Granularity: 139 named parts across 11 systems. Every explanation is either a
// sourced fact (see the attribution file above) or explicitly marked schematic.
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
const TIP = 443.2; // lightning rod tip: 1,454 ft
const ROOF = 381; // 102nd floor / roof: 1,250 ft

// ---------------------------------------------------------------- helpers
// Boxes and cylinders placed in meters, y-up, ground at y = 0.
// ry rotates about the vertical axis, rz about the z axis (for escalators etc).
function B(w, h, d, x = 0, y = 0, z = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}
function CY(rt, rb, h, x, y, z, seg = 12) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  g.translate(x, y, z);
  return g;
}
function RING(r, tube, x, y, z, seg = 28) {
  const g = new THREE.TorusGeometry(r, tube, 8, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- parts
const parts = [];
const addPart = (id, name, system, geoms, color) =>
  parts.push({ id, name, system, geoms, color });

// Facade depth shells, in meters out from a tier's limestone face:
//   piers stand proud 0.8, spandrel bands proud 0.42, mullions proud 0.35,
//   window glass proud 0.25. Nothing is coplanar, so the facade reads in 3D.
const PROUD = { pier: 0.8, spandrel: 0.42, mullion: 0.35, glass: 0.25 };

// Build the layered facade for a rectangular tower stage between y0 and y1
// with half widths hx (east-west) and hz (north-south). Returns geometry
// arrays { piersNS, piersEW, bays, spandrels }. All schematic except the
// overall Art Deco pier rhythm (alternating wide and narrow piers).
function facadeShell(hx, hz, y0, y1, opts = {}) {
  const h = y1 - y0;
  const ym = (y0 + y1) / 2;
  const piersNS = [];
  const piersEW = [];
  const bays = [];
  const spandrels = [];
  const bayPitch = opts.bayPitch ?? 7.5;
  for (const face of ['n', 's', 'e', 'w']) {
    const alongX = face === 'n' || face === 's';
    const len = alongX ? 2 * hx : 2 * hz;
    const sign = face === 'n' || face === 'w' ? -1 : 1;
    const nBays = Math.max(3, Math.round(len / bayPitch));
    const pitch = len / nBays;
    // Limestone piers at bay boundaries, alternating wide and narrow.
    for (let i = 0; i <= nBays; i++) {
      const u = -len / 2 + pitch * i;
      const wide = i % 2 === 0;
      const pw = wide ? 1.7 : 0.9;
      const g = new THREE.BoxGeometry(
        alongX ? pw : 1.0,
        h,
        alongX ? 1.0 : pw,
      );
      if (alongX) g.translate(u, ym, sign * (hz + PROUD.pier - 0.5));
      else g.translate(sign * (hx + PROUD.pier - 0.5), ym, u);
      (alongX ? piersNS : piersEW).push(g);
    }
    // Recessed window bays between the piers, with nickel-chrome mullions.
    for (let i = 0; i < nBays; i++) {
      const u = -len / 2 + pitch * (i + 0.5);
      const bayW = Math.max(1.2, pitch - 1.7);
      const g = new THREE.BoxGeometry(
        alongX ? bayW : 0.35,
        h - 1.4,
        alongX ? 0.35 : bayW,
      );
      if (alongX) g.translate(u, ym, sign * (hz + PROUD.glass - 0.175));
      else g.translate(sign * (hx + PROUD.glass - 0.175), ym, u);
      bays.push(g);
      for (const mu of [-bayW / 4, bayW / 4]) {
        const m = new THREE.BoxGeometry(
          alongX ? 0.14 : 0.12,
          h - 1.4,
          alongX ? 0.12 : 0.14,
        );
        if (alongX) m.translate(u + mu, ym, sign * (hz + PROUD.mullion - 0.06));
        else m.translate(sign * (hx + PROUD.mullion - 0.06), ym, u + mu);
        bays.push(m);
      }
    }
  }
  // Horizontal aluminum spandrel bands at each floor slab line, including the
  // top line of the stage (so single-floor stages still get one band).
  const f0 = opts.f0 ?? 0;
  const f1 = opts.f1 ?? 0;
  for (let f = f0; f <= f1; f++) {
    const sy = H(f);
    for (const alongX of [true, false]) {
      const len = alongX ? 2 * hx : 2 * hz;
      for (const sign of [-1, 1]) {
        const g = new THREE.BoxGeometry(
          alongX ? len : 0.22,
          1.0,
          alongX ? 0.22 : len,
        );
        if (alongX) g.translate(0, sy, sign * (hz + PROUD.spandrel - 0.11));
        else g.translate(sign * (hx + PROUD.spandrel - 0.11), sy, 0);
        spandrels.push(g);
      }
    }
  }
  return { piersNS, piersEW, bays, spandrels };
}

// === FOUNDATIONS ===
// Footings, mat, and bedrock anchors below street level (depth schematic),
// carrying the sourced 365,000 short ton weight of the building.
{
  const pads = [];
  for (let ix = -2; ix <= 2; ix++)
    for (let iz = -1; iz <= 1; iz++)
      pads.push(B(11, 3.2, 8.5, ix * 22, -6.4, iz * 20));
  addPart('spread-footing-grid', 'Spread footing grid', 'foundations', pads);
  addPart('bedrock-mat-slab', 'Bedrock mat slab', 'foundations', [
    B(120, 2.5, 52, 0, -3.75, 0),
  ]);
  const caissons = [];
  for (const cx of [-40, -13.5, 13.5, 40])
    for (const cz of [-16, 16]) caissons.push(CY(2, 2.4, 11, cx, -8.5, cz, 10));
  addPart('bedrock-caisson-anchors', 'Bedrock caisson anchors', 'foundations', caissons);
  addPart('basement-perimeter-walls', 'Basement perimeter walls', 'foundations', [
    B(124, 6, 1.2, 0, -3, 26.4),
    B(124, 6, 1.2, 0, -3, -26.4),
    B(1.2, 6, 52.8, 61.4, -3, 0),
    B(1.2, 6, 52.8, -61.4, -3, 0),
  ]);
}

// === BASE ===
// The five story limestone base fills the whole lot: 129.2 m east-west,
// 57.0 m north-south (sourced footprint), topped at the 5th floor.
const BASE_TOP = H(5);
addPart('five-story-base-mass', 'Five story base mass', 'base', [
  B(129.2, BASE_TOP - 0.4, 57.0, 0, (BASE_TOP - 0.4) / 2, 0),
]);

// Per-face base facades with layered depth: proud storefront band at ground
// level, proud alternating piers above, recessed window strips between them,
// and a fifth story sill band. Rhythm schematic; the sourced facts are the
// black granite storefronts, the pier and mullion alternation on floors 2 to 4,
// and the horizontal stone sill above the 5th story.
function baseFacade(face) {
  const alongX = face === 'n' || face === 's';
  const half = alongX ? 28.5 : 64.6;
  const len = alongX ? 129.2 : 57.0;
  const sign = face === 'n' || face === 'w' ? -1 : 1;
  const geoms = [];
  const at = (g, u, y, off) => {
    if (alongX) g.translate(u, y, sign * (half + off));
    else g.translate(sign * (half + off), y, u);
    return g;
  };
  // Ground floor storefront band, proud of the wall.
  geoms.push(at(B(alongX ? len : 0.9, 4.4, alongX ? 0.9 : len), 0, 2.2, 0.25));
  // Storefront pilasters and glazing.
  const nP = Math.max(4, Math.round(len / 7));
  for (let i = 0; i <= nP; i++) {
    const u = -len / 2 + (len * i) / nP;
    geoms.push(at(B(alongX ? 0.8 : 0.5, 4.0, alongX ? 0.5 : 0.8), u, 2.0, 0.4));
  }
  for (let i = 0; i < nP; i++) {
    const u = -len / 2 + (len * (i + 0.5)) / nP;
    geoms.push(
      at(B(alongX ? len / nP - 1.0 : 0.3, 3.2, alongX ? 0.3 : len / nP - 1.0), u, 1.9, 0.5),
    );
  }
  // Upper piers, alternating wide and narrow, from the storefront to the sill.
  const nBays = Math.max(5, Math.round(len / 8));
  const pitch = len / nBays;
  const yb = 4.4;
  const yh = BASE_TOP - yb;
  const ym = yb + yh / 2;
  for (let i = 0; i <= nBays; i++) {
    const u = -len / 2 + pitch * i;
    const pw = i % 2 === 0 ? 2.0 : 1.0;
    geoms.push(at(B(alongX ? pw : 0.9, yh, alongX ? 0.9 : pw), u, ym, 0.05));
  }
  // Recessed window strips between the piers.
  for (let i = 0; i < nBays; i++) {
    const u = -len / 2 + pitch * (i + 0.5);
    geoms.push(
      at(B(alongX ? pitch - 2.1 : 0.3, yh - 1.6, alongX ? 0.3 : pitch - 2.1), u, ym + 0.3, 0.02),
    );
  }
  // Fifth story stone sill band.
  geoms.push(at(B(alongX ? len + 0.4 : 0.7, 1.1, alongX ? 0.7 : len + 0.4), 0, BASE_TOP - 1.2, 0.2));
  const cname = face === 'n' ? 'North' : face === 's' ? 'South' : face === 'e' ? 'East' : 'West';
  addPart(
    `${face}-base-facade`,
    `${cname} base facade`,
    'base',
    geoms,
  );
}
for (const f of ['e', 'w', 'n', 's']) baseFacade(f);

// Fifth Avenue entrance on the east face: portal piers, three door sets,
// and entrance steps (sourced: three sets of metal doors, molded piers).
addPart('fifth-avenue-entry-portico', 'Fifth Avenue entry portico', 'base', [
  B(2.0, 12, 2.4, 64.6 + 0.7, 6, -7),
  B(2.0, 12, 2.4, 64.6 + 0.7, 6, 7),
  B(1.2, 5, 3.2, 64.6 + 0.3, 2.5, -4.4),
  B(1.2, 5, 3.2, 64.6 + 0.3, 2.5, 0),
  B(1.2, 5, 3.2, 64.6 + 0.3, 2.5, 4.4),
  B(2.6, 0.8, 17, 64.6 + 0.9, 6.6, 0),
  B(4.5, 0.35, 18, 64.6 + 2.2, 0.18, 0),
  B(3.6, 0.35, 18, 64.6 + 1.8, 0.52, 0),
]);
// Triple height transom window with geometric pattern bars above the doors.
addPart('triple-height-transom-glazing', 'Triple height transom glazing', 'base', [
  B(0.5, 9, 15, 64.6 + 0.35, 12.5, 0),
  B(0.55, 9, 0.3, 64.6 + 0.35, 12.5, -5),
  B(0.55, 9, 0.3, 64.6 + 0.35, 12.5, 0),
  B(0.55, 9, 0.3, 64.6 + 0.35, 12.5, 5),
  B(0.55, 0.3, 15, 64.6 + 0.35, 10, 0),
  B(0.55, 0.3, 15, 64.6 + 0.35, 15, 0),
], '#A8C3D4');
// Golden "Empire State" lettering above the fifth floor windows.
addPart('golden-empire-state-lettering', 'Golden Empire State lettering', 'base', [
  B(0.4, 1.6, 20, 64.6 + 0.2, BASE_TOP - 2.5, 0),
], '#D8A93B');
// Sculpted concrete eagles crowning the entrance piers.
addPart('concrete-entry-eagles', 'Concrete entry eagles', 'base', [
  B(1.4, 2.0, 1.0, 64.6 + 0.9, 13.2, -7),
  B(0.5, 1.4, 3.2, 64.6 + 0.9, 13.6, -7, 0.45),
  B(1.4, 2.0, 1.0, 64.6 + 0.9, 13.2, 7),
  B(0.5, 1.4, 3.2, 64.6 + 0.9, 13.6, 7, -0.45),
]);
// First floor storefronts in black granite (sourced) ringing the base.
addPart('ground-floor-storefront-band', 'Ground floor storefront band', 'base', [
  B(129.6, 1.4, 0.5, 0, 0.7, 28.5 + 0.35),
  B(129.6, 1.4, 0.5, 0, 0.7, -(28.5 + 0.35)),
  B(0.5, 1.4, 57.0, 64.6 + 0.35, 0.7, 0),
  B(0.5, 1.4, 57.0, -(64.6 + 0.35), 0.7, 0),
], '#3A3D40');
// Two entrances each on 33rd (south) and 34th (north) Streets with modernistic
// stainless steel canopies (sourced); triple windows above each doorway.
function sideEntry(id, name, x, z) {
  const s = z > 0 ? 1 : -1;
  addPart(id, name, 'base', [
    B(1.2, 4.6, 7, x, 2.3, z + s * 0.4),
    B(4.2, 0.6, 9, x, 5.2, z + s * 2.4),
    B(0.5, 3.0, 9, x, 8.6, z + s * 0.25),
    B(0.4, 0.9, 9.4, x, 5.9, z + s * 2.6),
  ]);
}
sideEntry('west-33rd-street-entry', 'West 33rd Street entry', -20, 28.5);
sideEntry('east-33rd-street-entry', 'East 33rd Street entry', 20, 28.5);
sideEntry('west-34th-street-entry', 'West 34th Street entry', -20, -28.5);
sideEntry('east-34th-street-entry', 'East 34th Street entry', 20, -28.5);

// === LOBBY ===
// The three story Art Deco lobby interior (sourced facts throughout;
// layout schematic). It sits at the east end of the base, entered from
// Fifth Avenue.
const LB = { x0: 10, x1: 58, z0: -11, z1: 11, h: H(3) };
addPart('lobby-interior-volume', 'Lobby interior volume', 'lobby', [
  B(LB.x1 - LB.x0, 0.4, LB.z1 - LB.z0, 34, 0.2, 0),
  B(LB.x1 - LB.x0, 0.5, LB.z1 - LB.z0, 34, LB.h - 0.25, 0),
  B(LB.x1 - LB.x0, LB.h, 0.6, 34, LB.h / 2, LB.z1 + 0.3),
  B(LB.x1 - LB.x0, LB.h, 0.6, 34, LB.h / 2, LB.z0 - 0.3),
  B(0.6, LB.h, LB.z1 - LB.z0, LB.x0 - 0.3, LB.h / 2, 0),
]);
// Zigzag terrazzo floor running east to west (sourced).
{
  const zz = [];
  for (let k = 0; k < 12; k++) {
    const x = 13 + k * 3.8;
    zz.push(B(4.4, 0.12, 0.7, x, 0.46, k % 2 ? 2.2 : -2.2, k % 2 ? 0.5 : -0.5));
  }
  addPart('zigzag-terrazzo-floor', 'Zigzag terrazzo floor', 'lobby', zz, '#9C8F74');
}
// Two tiers of marble: darker wainscoting below, lighter stone above.
addPart('dark-marble-wainscot', 'Dark marble wainscot', 'lobby', [
  B(47, 2.6, 0.25, 34, 1.7, 10.95),
  B(47, 2.6, 0.25, 34, 1.7, -10.95),
  B(0.25, 2.6, 21, 10.05, 1.7, 0),
], '#4E4438');
addPart('light-marble-upper-walls', 'Light marble upper walls', 'lobby', [
  B(47, 8.1, 0.25, 34, 6.9, 10.95),
  B(47, 8.1, 0.25, 34, 6.9, -10.95),
  B(0.25, 8.1, 21, 10.05, 6.9, 0),
], '#D9CFB4');
// Bronze narrative motifs: Electricity, Masonry, and Heating.
addPart('bronze-narrative-motifs', 'Bronze narrative motifs', 'lobby', [
  B(2.2, 2.2, 0.3, 24, 6.5, 10.8),
  B(2.2, 2.2, 0.3, 34, 6.5, 10.8),
  B(2.2, 2.2, 0.3, 44, 6.5, 10.8),
], '#8C6A3F');
// Coffered ceiling beams.
{
  const beams = [];
  for (let i = 0; i < 7; i++) beams.push(B(0.5, 0.6, 21, 12 + i * 7.3, LB.h - 0.8, 0));
  for (let j = 0; j < 4; j++) beams.push(B(46, 0.6, 0.5, 34, LB.h - 0.8, -7.9 + j * 5.3));
  addPart('lobby-coffered-ceiling', 'Lobby coffered ceiling', 'lobby', beams);
}
// Escalators at the west ends of the lobby to the mezzanine.
addPart('west-end-escalators', 'West end escalators', 'lobby', [
  B(10.3, 0.6, 1.3, 14, 3.9, 7, 0, 0.68),
  B(10.3, 0.6, 1.3, 14, 3.9, -7, 0, 0.68),
]);
// Mezzanine reached by the escalators.
addPart('lobby-mezzanine', 'Lobby mezzanine', 'lobby', [
  B(12, 0.5, 21, 16, 7, 0),
  B(12, 1.0, 0.25, 22.2, 7.7, 0),
]);
// Information desk; the 2009 renovation replaced its clock with an anemometer.
addPart('information-desk-and-anemometer', 'Information desk and anemometer', 'lobby', [
  B(4, 1.1, 1.2, 34, 0.95, 0),
  CY(0.06, 0.06, 2.0, 34, 2.4, 0, 8),
  B(0.9, 0.08, 0.08, 34, 3.4, 0),
  B(0.08, 0.08, 0.9, 34, 3.4, 0),
]);
// Aluminum relief of the building as built (without the antenna) at the west end.
addPart('aluminum-building-relief', 'Aluminum building relief', 'lobby', [
  B(0.3, 9, 5, 10.1, 5.5, 0),
  B(0.35, 1.2, 3.4, 10.1, 10.3, 0),
], '#C9CDD2');

// === SHAFT ===
// The 81 story setback shaft, modeled as seven stages per the sourced setback
// floors (21, 25, 30, 72, 81, 85). Stage widths are schematic; the 60 ft (18 m)
// setback above the 5th story is sourced and sizes stage 1.
const STAGES = [
  { n: 1, f0: 6, f1: 20, hx: 46.6, hz: 10.5 },
  { n: 2, f0: 21, f1: 24, hx: 41.0, hz: 9.4 },
  { n: 3, f0: 25, f1: 29, hx: 36.0, hz: 8.4 },
  { n: 4, f0: 30, f1: 71, hx: 31.0, hz: 7.4 },
  { n: 5, f0: 72, f1: 80, hx: 25.5, hz: 6.4 },
  { n: 6, f0: 81, f1: 84, hx: 20.5, hz: 5.5 },
  { n: 7, f0: 85, f1: 85, hx: 16.0, hz: 4.6 },
];
for (const t of STAGES) {
  const y0 = H(t.f0 - 1); // each stage covers floors f0..f1, so it starts at the top of floor f0-1
  const y1 = H(t.f1);
  const tag = `stage ${t.n}`;
  addPart(`tower-mass-stage-${t.n}`, `Tower mass, ${tag}`, 'shaft', [
    B(2 * t.hx, y1 - y0, 2 * t.hz, 0, (y0 + y1) / 2, 0),
  ]);
  const shell = facadeShell(t.hx, t.hz, y0, y1, { f0: t.f0, f1: t.f1 });
  addPart(`north-south-piers-stage-${t.n}`, `North south piers, ${tag}`, 'shaft', shell.piersNS);
  addPart(`east-west-piers-stage-${t.n}`, `East west piers, ${tag}`, 'shaft', shell.piersEW);
  addPart(`recessed-window-bays-stage-${t.n}`, `Recessed window bays, ${tag}`, 'shaft', shell.bays, '#A8C3D4');
  addPart(`aluminum-spandrel-bands-stage-${t.n}`, `Aluminum spandrel bands, ${tag}`, 'shaft', shell.spandrels, '#C9CDD2');
  addPart(`setback-cornice-stage-${t.n}`, `Setback cornice, ${tag}`, 'shaft', [
    B(2 * t.hx + 1.0, 0.9, 2 * t.hz + 1.0, 0, y1 - 0.45, 0),
  ]);
}

// === TERRACES ===
// Open setback terraces at each setback level, ring decks with parapets.
const TERRACES = [
  { n: 1, deck: 5, story: '5th', lx: 129.2, lz: 57.0, ux: 93.2, uz: 21.0 },
  { n: 2, deck: 20, story: '21st', lx: 93.2, lz: 21.0, ux: 82.0, uz: 18.8 },
  { n: 3, deck: 24, story: '25th', lx: 82.0, lz: 18.8, ux: 72.0, uz: 16.8 },
  { n: 4, deck: 29, story: '30th', lx: 72.0, lz: 16.8, ux: 62.0, uz: 14.8 },
  { n: 5, deck: 71, story: '72nd', lx: 62.0, lz: 14.8, ux: 51.0, uz: 12.8 },
  { n: 6, deck: 80, story: '81st', lx: 51.0, lz: 12.8, ux: 41.0, uz: 11.0 },
  { n: 7, deck: 84, story: '85th', lx: 32.0, lz: 9.2, ux: 24.0, uz: 7.0 },
];
for (const tr of TERRACES) {
  const y = H(tr.deck);
  const deckY = y + 0.06 - 0.25;
  const rx = (tr.lx - tr.ux) / 2;
  const rz = (tr.lz - tr.uz) / 2;
  const geoms = [
    B(tr.lx, 0.5, rz, 0, deckY, tr.uz / 2 + rz / 2),
    B(tr.lx, 0.5, rz, 0, deckY, -(tr.uz / 2 + rz / 2)),
    B(rx, 0.5, tr.uz, tr.ux / 2 + rx / 2, deckY, 0),
    B(rx, 0.5, tr.uz, -(tr.ux / 2 + rx / 2), deckY, 0),
  ];
  const py = y + 0.06 + 0.575;
  geoms.push(B(tr.lx, 1.15, 0.35, 0, py, tr.lz / 2 - 0.2));
  geoms.push(B(tr.lx, 1.15, 0.35, 0, py, -(tr.lz / 2 - 0.2)));
  geoms.push(B(0.35, 1.15, tr.lz - 0.7, tr.lx / 2 - 0.2, py, 0));
  geoms.push(B(0.35, 1.15, tr.lz - 0.7, -(tr.lx / 2 - 0.2), py, 0));
  addPart(`tier-${tr.n}-setback-terrace`, `Tier ${tr.n} setback terrace`, 'terraces', geoms);
}

// === STEEL FRAME ===
// Riveted steel frame: 210 structural columns per floor (sourced), shown as
// schematic grids per height zone, plus girder rings at the setback levels.
function columnGrid(x0, x1, nx, z0, z1, nz, ya, yb) {
  const cols = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const x = nx === 1 ? 0 : x0 + ((x1 - x0) * i) / (nx - 1);
      const z = nz === 1 ? 0 : z0 + ((z1 - z0) * j) / (nz - 1);
      cols.push(B(0.9, yb - ya, 0.9, x, (ya + yb) / 2, z));
    }
  return cols;
}
addPart('low-rise-column-grid', 'Low rise column grid', 'steel-frame',
  columnGrid(-60, 60, 11, -24, 24, 5, 0, H(30)));
addPart('mid-rise-column-grid', 'Mid rise column grid', 'steel-frame',
  columnGrid(-28, 28, 8, -6, 6, 3, H(30), H(72)));
addPart('high-rise-column-grid', 'High rise column grid', 'steel-frame',
  columnGrid(-22, 22, 7, -4.5, 4.5, 3, H(72), H(102)));
addPart('crown-column-grid', 'Crown column grid', 'steel-frame',
  columnGrid(-10, 10, 5, -3, 3, 3, H(86), H(102)));
// Girder rings at the setback levels (sourced setback floors).
{
  const rings = [];
  const levels = [
    [5, 129.2, 57.0],
    [20, 93.2, 21.0],
    [24, 82.0, 18.8],
    [29, 72.0, 16.8],
    [71, 62.0, 14.8],
    [80, 51.0, 12.8],
    [84, 41.0, 11.0],
  ];
  for (const [f, lx, lz] of levels) {
    const y = H(f);
    rings.push(B(lx + 1, 1.2, 1.0, 0, y, lz / 2));
    rings.push(B(lx + 1, 1.2, 1.0, 0, y, -lz / 2));
    rings.push(B(1.0, 1.2, lz, lx / 2, y, 0));
    rings.push(B(1.0, 1.2, lz, -lx / 2, y, 0));
  }
  addPart('setback-girder-rings', 'Setback girder rings', 'steel-frame', rings);
}
addPart('central-utility-core', 'Central utility core', 'steel-frame', [
  B(12, H(102), 6, 0, H(102) / 2, 0),
]);
// Deep transfer girders spreading the tower load across the base.
addPart('transfer-girders-at-base', 'Transfer girders at base', 'steel-frame', [
  B(120, 3, 1.5, 0, 9, -18),
  B(120, 3, 1.5, 0, 9, -6),
  B(120, 3, 1.5, 0, 9, 6),
  B(120, 3, 1.5, 0, 9, 18),
]);
// Floor diaphragm plates at intervals (schematic).
addPart('floor-diaphragm-plates', 'Floor diaphragm plates', 'steel-frame', [
  B(95.2, 0.8, 23, 0, H(20), 0),
  B(64, 0.8, 16.8, 0, H(50), 0),
  B(53, 0.8, 14.8, 0, H(80), 0),
]);

// === ELEVATORS ===
// The 73 elevators (sourced total) grouped into banks; shafts shown
// schematically inside the central core.
function elevatorBank(id, name, xs, z, ya, yb, carYs) {
  const geoms = [];
  for (const x of xs) {
    geoms.push(B(2.6, yb - ya, 2.6, x, (ya + yb) / 2, z));
    for (const cy of carYs) geoms.push(B(2.2, 2.6, 2.2, x, cy, z));
  }
  addPart(id, name, 'elevators', geoms);
}
elevatorBank('express-elevator-bank', 'Express elevator bank',
  [-4.5, -1.5, 1.5, 4.5], 0, 0, H(80), [8, 120, 200, 280]);
elevatorBank('low-zone-local-elevators', 'Low zone local elevators',
  [-9, -5.4, -1.8, 1.8, 5.4, 9], 3.5, 0, H(30), [6, 60, 100]);
elevatorBank('mid-zone-local-elevators', 'Mid zone local elevators',
  [-9, -5.4, -1.8, 1.8, 5.4, 9], -3.5, 0, H(72), [40, 130, 220]);
elevatorBank('high-zone-local-elevators', 'High zone local elevators',
  [-7.2, -3.6, 0, 3.6, 7.2, 10.8], 0, 0, H(102), [150, 260, 350]);
elevatorBank('freight-elevator-bank', 'Freight elevator bank',
  [-12, -9, -6, -3, 3, 6, 9, 12], 8, 0, H(80), [20, 150]);
elevatorBank('shuttle-elevators-80-to-86', 'Shuttle elevators 80 to 86',
  [-2, 2], 0, H(80), H(86), [H(83)]);
elevatorBank('shuttle-elevators-86-to-102', 'Shuttle elevators 86 to 102',
  [-2, 2], 0, H(86), H(102), [H(94)]);
addPart('observatory-service-elevator', 'Observatory service elevator', 'elevators', [
  B(2.6, H(102) - H(86), 2.6, 5, (H(86) + H(102)) / 2, 0),
  B(2.2, 2.6, 2.2, 5, H(94), 0),
  B(4, 2.5, 4, 5, H(102) - 1.2, 0),
]);

// === CROWN ===
// The 16 story, 200 ft (61 m) metal crown above the 86th floor (sourced),
// mostly mechanical, in two limestone stages. The 102nd floor is the
// fully enclosed observatory, so the upper stage stops at the 101st floor.
const CROWN = [
  { hx: 12.0, hz: 3.2, f0: 87, f1: 94 },
  { hx: 10.0, hz: 2.8, f0: 95, f1: 101 },
];
addPart('crown-lower-stage-mass', 'Crown lower stage mass', 'crown', [
  B(2 * CROWN[0].hx, H(94) - H(86), 2 * CROWN[0].hz, 0, (H(86) + H(94)) / 2, 0),
]);
addPart('crown-upper-stage-mass', 'Crown upper stage mass', 'crown', [
  B(2 * CROWN[1].hx, H(101) - H(94), 2 * CROWN[1].hz, 0, (H(94) + H(101)) / 2, 0),
]);
{
  const pNS = [];
  const pEW = [];
  const bays = [];
  const spans = [];
  for (const c of CROWN) {
    const s = facadeShell(c.hx, c.hz, H(c.f0 - 1), H(c.f1), { f0: c.f0, f1: c.f1, bayPitch: 6 });
    pNS.push(...s.piersNS);
    pEW.push(...s.piersEW);
    bays.push(...s.bays);
    spans.push(...s.spandrels);
  }
  addPart('crown-limestone-piers', 'Crown limestone piers', 'crown', [...pNS, ...pEW]);
  addPart('crown-recessed-window-strips', 'Crown recessed window strips', 'crown', bays, '#A8C3D4');
  addPart('crown-aluminum-spandrel-bands', 'Crown aluminum spandrel bands', 'crown', spans, '#C9CDD2');
}
// Mechanical floor core inside the crown (sourced: mostly mechanical).
addPart('crown-mechanical-floor-core', 'Crown mechanical floor core', 'crown', [
  B(16, H(100) - H(96), 5, 0, (H(96) + H(100)) / 2, 0),
  B(10, 2.2, 3.5, -3, H(97), 0),
  B(10, 2.2, 3.5, 3, H(99), 0),
]);
// Setback ledges between the crown stages and at the crown top.
addPart('crown-setback-ledge', 'Crown setback ledge', 'crown', [
  B(2 * CROWN[0].hx + 1.0, 0.9, 2 * CROWN[0].hz + 1.0, 0, H(94) - 0.45, 0),
  B(2 * CROWN[1].hx + 1.0, 0.9, 2 * CROWN[1].hz + 1.0, 0, H(101) - 0.45, 0),
]);
// Roof slab at the 102nd floor (sourced roof height 1,250 ft / 381.0 m).
addPart('roof-slab-102nd-floor', 'Roof slab, 102nd floor', 'crown', [
  B(23.5, 1.0, 8.5, 0, ROOF - 0.5, 0),
]);
// Rooftop penthouses and access houses (schematic).
addPart('rooftop-penthouses', 'Rooftop penthouses', 'crown', [
  B(6, 3.2, 4, -7, ROOF + 1.6, 0),
  B(4.5, 2.6, 3.2, 6.5, ROOF + 1.3, 1),
  B(3, 2.2, 3, 0, ROOF + 1.1, -1.5),
]);
// Crown parapet ringing the roof edge.
addPart('crown-parapet', 'Crown parapet', 'crown', [
  B(23.5, 1.2, 0.4, 0, ROOF + 0.6, 4.05),
  B(23.5, 1.2, 0.4, 0, ROOF + 0.6, -4.05),
  B(0.4, 1.2, 8.5, 11.55, ROOF + 0.6, 0),
  B(0.4, 1.2, 8.5, -11.55, ROOF + 0.6, 0),
]);

// === OBSERVATORIES ===
// The 86th floor observatory sits on the 85th story setback: enclosed gallery
// plus open air deck (sourced), at 1,050 ft (320 m).
addPart('86th-floor-deck-slab', '86th floor deck slab', 'observatories', [
  B(24, 0.5, 7, 0, H(85) + 0.31, 0),
]);
addPart('86th-floor-gallery-enclosure', '86th floor gallery enclosure', 'observatories', [
  B(24, H(86) - H(85) - 0.56, 0.5, 0, H(85) + 0.56 + (H(86) - H(85) - 0.56) / 2, 3.25),
  B(24, H(86) - H(85) - 0.56, 0.5, 0, H(85) + 0.56 + (H(86) - H(85) - 0.56) / 2, -3.25),
  B(0.5, H(86) - H(85) - 0.56, 6, 11.75, H(85) + 0.56 + (H(86) - H(85) - 0.56) / 2, 0),
  B(0.5, H(86) - H(85) - 0.56, 6, -11.75, H(85) + 0.56 + (H(86) - H(85) - 0.56) / 2, 0),
  B(24.5, 0.5, 7.5, 0, H(86) - 0.25, 0),
]);
// Window band wrapping the 86th floor gallery.
addPart('86th-floor-window-band', '86th floor window band', 'observatories', [
  B(22, 2.0, 0.2, 0, H(85) + 2.1, 3.55),
  B(22, 2.0, 0.2, 0, H(85) + 2.1, -3.55),
  B(0.2, 2.0, 5.4, 12.05, H(85) + 2.1, 0),
  B(0.2, 2.0, 5.4, -12.05, H(85) + 2.1, 0),
], '#A8C3D4');
// Open air deck railing outside the gallery, standing on the 85th story roof.
addPart('86th-floor-open-deck-railing', '86th floor open deck railing', 'observatories', [
  B(30, 1.1, 0.25, 0, H(85) + 0.61, 4.3),
  B(30, 1.1, 0.25, 0, H(85) + 0.61, -4.3),
  B(0.25, 1.1, 8.6, 15.7, H(85) + 0.61, 0),
  B(0.25, 1.1, 8.6, -15.7, H(85) + 0.61, 0),
]);
// Coin operated telescopes on the open deck.
{
  const scopes = [];
  for (const [sx, sz] of [[-9, 3.4], [-3, 3.4], [3, 3.4], [9, 3.4], [-6, -3.4], [6, -3.4]]) {
    scopes.push(CY(0.12, 0.16, 1.1, sx, H(85) + 1.1, sz, 8));
    scopes.push(B(0.5, 0.25, 0.25, sx, H(85) + 1.75, sz));
  }
  addPart('coin-operated-telescopes', 'Coin operated telescopes', 'observatories', scopes);
}
// The 102nd floor observatory: fully enclosed with floor to ceiling windows
// after the 2019 redesign (sourced).
addPart('102nd-floor-slab', '102nd floor slab', 'observatories', [
  B(22, 0.6, 7.5, 0, H(101) + 0.3, 0),
]);
addPart('fully-enclosed-102nd-floor-observatory', 'Fully enclosed 102nd floor observatory', 'observatories', [
  B(0.5, 3.14, 0.5, 10.75, H(101) + 2.17, 3.5),
  B(0.5, 3.14, 0.5, -10.75, H(101) + 2.17, 3.5),
  B(0.5, 3.14, 0.5, 10.75, H(101) + 2.17, -3.5),
  B(0.5, 3.14, 0.5, -10.75, H(101) + 2.17, -3.5),
  B(22, 0.4, 7.5, 0, H(101) + 0.8, 0),
]);
addPart('102nd-floor-to-ceiling-glazing', '102nd floor to ceiling glazing', 'observatories', [
  B(21.5, 3.0, 0.25, 0, H(101) + 2.17, 3.6),
  B(21.5, 3.0, 0.25, 0, H(101) + 2.17, -3.6),
  B(0.25, 3.0, 7.0, 10.85, H(101) + 2.17, 0),
  B(0.25, 3.0, 7.0, -10.85, H(101) + 2.17, 0),
], '#A8C3D4');
// The 80th floor indoor observatory (opened 2019) inside the tower.
addPart('80th-floor-indoor-observatory', 'Indoor 80th floor observatory', 'observatories', [
  B(20, 0.4, 8, 0, H(79) + 0.2, 0),
  B(20, 3.7, 0.4, 0, H(79) + 2.0, 3.8),
  B(20, 3.7, 0.4, 0, H(79) + 2.0, -3.8),
  B(0.4, 3.7, 8, 9.8, H(79) + 2.0, 0),
  B(0.4, 3.7, 8, -9.8, H(79) + 2.0, 0),
  B(20, 0.4, 8, 0, H(79) + 4.0, 0),
]);
// Skyline mural by Stephen Wiltshire inside the 80th floor observatory.
addPart('80th-floor-skyline-mural', 'Wiltshire skyline mural, 80th floor', 'observatories', [
  B(10, 2.5, 0.2, 0, H(79) + 1.9, 3.55),
], '#7E97A8');
// Visitor entrance at 20 West 34th Street (sourced), on the north face.
addPart('observatory-entrance-20-west-34th', 'Observatory entrance, 20 West 34th', 'base', [
  B(1.2, 4.5, 8, -30, 2.25, -28.5 - 0.3),
  B(3.5, 0.6, 10, -30, 5, -28.5 - 1.8),
  B(0.5, 3.2, 9.6, -30, 8.0, -28.5 - 0.25),
], '#A8C3D4');
// Queuing hall inside the north side of the base (schematic).
addPart('observatory-queuing-hall', 'Observatory queuing hall', 'observatories', [
  B(24, 0.3, 10, -30, 0.15, -20),
  B(20, 1.0, 0.2, -30, 1.0, -17),
  B(20, 1.0, 0.2, -30, 1.0, -20),
  B(20, 1.0, 0.2, -30, 1.0, -23),
]);

// === MAST ===
// The mooring mast above the roof: four rectangular tiers topped by a
// cylindrical shaft with a conical pinnacle (sourced), 203 ft (61.9 m) of
// pinnacle with broadcast antennas, lightning rod at the 443.2 m tip.
const MAST = [
  { y0: 381, y1: 393, hx: 8.5, hz: 3.2, word: 'one' },
  { y0: 393, y1: 402, hx: 7.0, hz: 2.7, word: 'two' },
  { y0: 402, y1: 410, hx: 5.6, hz: 2.2, word: 'three' },
  { y0: 410, y1: 417, hx: 4.2, hz: 1.8, word: 'four' },
];
for (const m of MAST) {
  addPart(`mooring-mast-tier-${m.word}`, `Mooring mast tier ${m.word}`, 'mast', [
    B(2 * m.hx, m.y1 - m.y0, 2 * m.hz, 0, (m.y0 + m.y1) / 2, 0),
  ]);
}
// Collar courses stepping between the mast tiers.
addPart('mast-collar-courses', 'Mast collar courses', 'mast',
  MAST.map((m) => B(2 * m.hx + 1.2, 0.8, 2 * m.hz + 1.2, 0, m.y1 - 0.4, 0)));
// Cylindrical mast shaft, then the conical pinnacle.
addPart('cylindrical-mast-shaft', 'Cylindrical mast shaft', 'mast', [
  CY(2.6, 2.6, 15, 0, 424.5, 0, 16),
]);
addPart('conical-mast-pinnacle', 'Conical mast pinnacle', 'mast', [
  CY(0.3, 2.6, 7, 0, 435.5, 0, 16),
]);
// Lightning rod reaching the 443.2 m tip (sourced tip height).
addPart('lightning-rod-finial', 'Lightning rod finial', 'mast', [
  CY(0.12, 0.12, 4.2, 0, 441.1, 0, 8),
]);
// Dirigible docking ring at the 106th floor equivalent (sourced mooring level,
// schematic ring); the docking plan was abandoned because of high winds.
addPart('mooring-ring-for-dirigibles', 'Mooring ring for dirigibles', 'mast', [
  RING(7.8, 0.35, 0, 396, 0),
]);
// The 103rd floor: originally the planned docking station, now electrical
// equipment (sourced), with an exterior balcony (sourced).
addPart('103rd-floor-equipment-room', '103rd floor equipment room', 'mast', [
  B(13, 7, 4.5, 0, 386, 0),
]);
addPart('103rd-floor-exterior-balcony', '103rd floor exterior balcony', 'mast', [
  B(19, 0.4, 1.6, 0, 389.5, 4.0),
  B(19, 0.4, 1.6, 0, 389.5, -4.0),
  B(1.6, 0.4, 8, 9.3, 389.5, 0),
  B(1.6, 0.4, 8, -9.3, 389.5, 0),
  B(19, 0.9, 0.2, 0, 390.2, 4.8),
  B(19, 0.9, 0.2, 0, 390.2, -4.8),
  B(0.2, 0.9, 8, 10.1, 390.2, 0),
  B(0.2, 0.9, 8, -10.1, 390.2, 0),
]);
// Mast window band: 480 windows, replaced in 2015 (sourced count).
{
  const wins = [];
  for (const m of MAST) {
    const h = m.y1 - m.y0;
    const ym = (m.y0 + m.y1) / 2;
    for (const [len, half, alongX] of [
      [2 * m.hx, m.hz, true],
      [2 * m.hz, m.hx, false],
    ]) {
      const n = 15;
      for (let i = 0; i < n; i++) {
        const u = -len / 2 + (len * (i + 0.5)) / n;
        const g = new THREE.BoxGeometry(alongX ? 0.55 : 0.18, 0.9, alongX ? 0.18 : 0.55);
        if (alongX) {
          g.translate(u, ym - h / 4, half + 0.09);
          wins.push(g);
          const g2 = new THREE.BoxGeometry(0.55, 0.9, 0.18);
          g2.translate(u, ym + h / 4, half + 0.09);
          wins.push(g2);
          const g3 = new THREE.BoxGeometry(0.55, 0.9, 0.18);
          g3.translate(u, ym - h / 4, -(half + 0.09));
          wins.push(g3);
          const g4 = new THREE.BoxGeometry(0.55, 0.9, 0.18);
          g4.translate(u, ym + h / 4, -(half + 0.09));
          wins.push(g4);
        } else {
          g.translate(half + 0.09, ym - h / 4, u);
          wins.push(g);
          const g2 = new THREE.BoxGeometry(0.18, 0.9, 0.55);
          g2.translate(half + 0.09, ym + h / 4, u);
          wins.push(g2);
          const g3 = new THREE.BoxGeometry(0.18, 0.9, 0.55);
          g3.translate(-(half + 0.09), ym - h / 4, u);
          wins.push(g3);
          const g4 = new THREE.BoxGeometry(0.18, 0.9, 0.55);
          g4.translate(-(half + 0.09), ym + h / 4, u);
          wins.push(g4);
        }
      }
    }
  }
  addPart('mast-window-band', 'Mast window band', 'mast', wins, '#A8C3D4');
}
// Separate FM antennae ringing the 103rd floor, built 1965 (sourced).
{
  const fm = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const x = Math.cos(a) * 9.3;
    const z = Math.sin(a) * 9.3;
    fm.push(CY(0.08, 0.08, 6, x, 388, z, 6));
    fm.push(B(0.5, 0.5, 0.5, x, 385.2, z));
  }
  addPart('fm-broadcast-antenna-ring', 'FM broadcast antenna ring', 'mast', fm);
}
// 200 ft broadcast tower completed 1953 (sourced): antenna array on the pinnacle.
{
  const bc = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.4;
    bc.push(CY(0.07, 0.07, 7, Math.cos(a) * 1.8, 435.5, Math.sin(a) * 1.8, 6));
  }
  bc.push(CY(0.1, 0.14, 5, 3.4, 419.5, 1.2, 6));
  bc.push(CY(0.1, 0.14, 5, -3.2, 419.5, -1.4, 6));
  addPart('broadcast-antenna-array', 'Broadcast antenna array', 'mast', bc);
}
// The 158 ft hollow steel mast holds elevators and utilities (sourced).
addPart('mast-elevator-and-utility-core', 'Mast elevator and utility core', 'mast', [
  B(3, 51, 3, 0, 406.5, 0),
  B(1.8, 40, 1.8, 0, 401, 0),
]);
// Maintenance platform around the cylindrical shaft (schematic).
addPart('pinnacle-maintenance-platform', 'Pinnacle maintenance platform', 'mast', [
  CY(3.4, 3.4, 0.4, 0, 430, 0, 16),
  CY(3.4, 0.25, 1.0, 0, 430.7, 0, 16),
]);

// === LIGHTING ===
// White searchlights first used November 1932 for the Roosevelt victory.
{
  const sl = [];
  for (const [sx, sz] of [[-9, 3], [9, 3], [-9, -3], [9, -3]]) {
    sl.push(CY(0.5, 0.6, 1.2, sx, ROOF + 1.0, sz, 10));
    sl.push(B(1.3, 0.5, 1.3, sx, ROOF + 0.3, sz));
  }
  addPart('white-searchlight-bank', 'White searchlight bank', 'lighting', sl, '#FFE08A');
}
// Four "Freedom Lights" added in 1956 (sourced), shown at the base corners.
{
  const fl = [];
  for (const [sx, sz] of [[-60, 24], [60, 24], [-60, -24], [60, -24]]) {
    fl.push(CY(0.15, 0.2, 14, sx, BASE_TOP + 7, sz, 8));
    fl.push(B(0.9, 0.7, 0.9, sx, BASE_TOP + 14.2, sz));
  }
  addPart('freedom-lights-quartet', 'Freedom Lights quartet', 'lighting', fl, '#FFE08A');
}
// 72nd floor floodlights added February 1964 for the Worlds Fair.
{
  const f72 = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    f72.push(B(0.5, 0.4, 0.6, Math.cos(a) * 26.5, H(72) + 0.5, Math.sin(a) * 7.4));
  }
  addPart('72nd-floor-floodlight-ring', '72nd floor floodlight ring', 'lighting', f72, '#FFE08A');
}
// 204 metal-halide lights installed in 1976 (sourced count); a schematic
// subset rings the crown base here.
{
  const mh = [];
  const y = H(88);
  for (let i = 0; i < 10; i++) {
    const x = -11 + (22 * (i + 0.5)) / 10;
    mh.push(B(0.45, 0.35, 0.45, x, y, 4.1));
    mh.push(B(0.45, 0.35, 0.45, x, y, -4.1));
  }
  for (let i = 0; i < 6; i++) {
    const z = -2.6 + (5.2 * (i + 0.5)) / 6;
    mh.push(B(0.45, 0.35, 0.45, 12.9, y, z));
    mh.push(B(0.45, 0.35, 0.45, -12.9, y, z));
  }
  addPart('metal-halide-floodlight-ring', 'Metal halide floodlight ring', 'lighting', mh, '#FFE08A');
}
// 1,200 LED fixtures installed in 2012 (sourced count); a schematic subset of
// 360 fixtures rings the crown stages, nine to 16 million colors.
{
  const led = [];
  const rings = [
    [H(90), 12.0, 3.2],
    [H(96), 10.0, 2.8],
    [H(100), 10.0, 2.8],
  ];
  for (const [y, hx, hz] of rings) {
    for (let i = 0; i < 40; i++) {
      const x = -hx + (2 * hx * (i + 0.5)) / 40;
      led.push(B(0.35, 0.35, 0.35, x, y, hz + 0.9));
      led.push(B(0.35, 0.35, 0.35, x, y, -(hz + 0.9)));
    }
    for (let i = 0; i < 20; i++) {
      const z = -hz + (2 * hz * (i + 0.5)) / 20;
      led.push(B(0.35, 0.35, 0.35, hx + 0.9, y, z));
      led.push(B(0.35, 0.35, 0.35, -(hx + 0.9), y, z));
    }
  }
  addPart('led-fixture-ring', 'LED fixture ring', 'lighting', led, '#FFE08A');
}
// Uplights washing the mast tiers (schematic).
{
  const up = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    up.push(B(0.4, 0.5, 0.4, Math.cos(a) * 9.5, 381.4, Math.sin(a) * 4.2));
  }
  addPart('spire-accent-uplights', 'Spire accent uplights', 'lighting', up, '#FFE08A');
}
// Aviation beacons on the mast (schematic).
addPart('mast-aviation-beacons', 'Mast aviation beacons', 'lighting', [
  B(0.5, 0.5, 0.5, 0, 417.4, 0),
  B(0.5, 0.5, 0.5, 0, 432.4, 0),
  B(0.4, 0.4, 0.4, 0, 439.6, 0),
], '#FF6B5E');
// Light strips under the entrance canopies (schematic).
addPart('entry-canopy-light-strips', 'Entry canopy light strips', 'lighting', [
  B(2.2, 0.15, 15, 64.6 + 0.9, 6.1, 0),
  B(3.8, 0.15, 8, -20, 4.8, 28.5 + 2.4),
  B(3.8, 0.15, 8, 20, 4.8, 28.5 + 2.4),
  B(3.8, 0.15, 8, -20, 4.8, -(28.5 + 2.4)),
  B(3.8, 0.15, 8, 20, 4.8, -(28.5 + 2.4)),
  B(3.0, 0.15, 9, -30, 4.6, -28.5 - 1.8),
], '#FFE08A');

// ---------------------------------------------------------------- systems
const SYSTEMS = [
  { id: 'foundations', name: 'Foundations', color: '#8A8D91', description: 'Concrete footings, mat, and bedrock anchors below street level, carrying the 365,000 short ton weight of the building.' },
  { id: 'base', name: 'Base', color: '#E9DFC6', description: 'The five story Indiana limestone base filling the whole city block, with the Fifth Avenue entrance, the side entrances, and the storefronts.' },
  { id: 'lobby', name: 'Lobby', color: '#C9B896', description: 'The three story Art Deco lobby interior, with marble, terrazzo, bronze motifs, and the building relief.' },
  { id: 'shaft', name: 'Shaft', color: '#DFD2B4', description: 'The 81 story setback shaft between the base and the crown, in seven stages with limestone piers, recessed window bays, and aluminum spandrels.' },
  { id: 'terraces', name: 'Setback terraces', color: '#6F7F5E', description: 'Open terraces at each setback level, stepping the tower back as required by the 1916 Zoning Resolution.' },
  { id: 'steel-frame', name: 'Steel frame', color: '#5A626B', description: 'The riveted steel frame and the central utility core, revealed when the model is exploded.' },
  { id: 'elevators', name: 'Elevators', color: '#B08D57', description: 'The 73 elevators in vertical banks in the central core, with express shuttles to the observatories.' },
  { id: 'crown', name: 'Crown', color: '#E3D6B8', description: 'The 16 story, 200 ft metal crown above the 86th floor, mostly mechanical, topped by the 102nd floor roof.' },
  { id: 'observatories', name: 'Observatories', color: '#8FB8D8', description: 'The 80th, 86th, and 102nd floor observatories, visited by about four million tourists a year.' },
  { id: 'mast', name: 'Mast', color: '#C7CCD1', description: 'The mooring mast and pinnacle above the 102nd floor, first planned for docking dirigibles and now carrying broadcast antennas.' },
  { id: 'lighting', name: 'Crown lighting', color: '#FFD97A', description: 'Architectural lighting for the crown and mast, from the 1932 searchlights to the 1,200 LED fixtures of 2012.' },
];

// ---------------------------------------------------------------- explanations
// Keyed by lowercase part name. Every fact comes from the Wikipedia article or
// the Structurae entry opened for this model; placement and proportions not
// stated on those pages are schematic.
const EXPLANATIONS = {
  'spread footing grid': 'Concrete spread footings carry the 365,000 short ton weight of the building down to the rock. Their depth and spread are schematic.',
  'bedrock mat slab': 'A concrete mat ties the footings together above Manhattan bedrock. Shown schematically below street level.',
  'bedrock caisson anchors': 'Caisson anchors pin the mat to bedrock against wind uplift. Count and placement are schematic.',
  'basement perimeter walls': 'Perimeter basement walls retain the earth around the below grade floors. Depth shown schematically.',
  'five story base mass': 'The five story base occupies the entire lot, with the 81 story shaft set back sharply above it. It is clad in Indiana limestone panels that give the building its signature blonde color.',
  'east base facade': 'The Fifth Avenue face of the base: black granite storefronts at ground level, alternating piers and window strips above, and a stone sill topping the fifth story.',
  'west base facade': 'The rear face of the base, with the same limestone pier rhythm and storefront band as the other faces. Rhythm schematic.',
  'north base facade': 'The 34th Street face of the base, carrying two of the side entrances with their stainless steel canopies.',
  'south base facade': 'The 33rd Street face of the base, carrying two of the side entrances with their stainless steel canopies.',
  'fifth avenue entry portico': 'The main entrance at the center of the Fifth Avenue elevation: three sets of metal doors flanked by molded piers.',
  'triple height transom glazing': 'A triple height transom window with geometric patterns sits above the main entrance.',
  'golden empire state lettering': 'Golden letters spelling Empire State sit above the fifth floor windows.',
  'concrete entry eagles': 'A pair of sculpted concrete eagles crowns the molded piers that flank the Fifth Avenue entrance.',
  'ground floor storefront band': 'First floor storefronts with aluminum framed doors and windows set in black granite ring the base.',
  'west 33rd street entry': 'One of two entrances on 33rd Street, with a modernistic stainless steel canopy and triple windows above. Less elaborate than the Fifth Avenue entrance.',
  'east 33rd street entry': 'One of two entrances on 33rd Street, with a modernistic stainless steel canopy and triple windows above.',
  'west 34th street entry': 'One of two entrances on 34th Street, with a modernistic stainless steel canopy and triple windows above.',
  'east 34th street entry': 'One of two entrances on 34th Street, with a modernistic stainless steel canopy and triple windows above.',
  'lobby interior volume': 'The three story lobby is the only space in the building with narrative motifs. Its shell is shown here; finishes are separate parts.',
  'zigzag terrazzo floor': 'A zigzag terrazzo floor runs east to west through the lobby. Pattern shown schematically.',
  'dark marble wainscot': 'Two tiers of marble line the lobby walls: darker wainscoting below, lighter stone above.',
  'light marble upper walls': 'Lighter marble rises above the dark wainscoting to the coffered ceiling.',
  'bronze narrative motifs': 'Bronze motifs of Electricity, Masonry, and Heating decorate the lobby walls.',
  'lobby coffered ceiling': 'A coffered ceiling caps the three story lobby volume. Detail schematic.',
  'west end escalators': 'Escalators at the west ends of the lobby rise to a mezzanine.',
  'lobby mezzanine': 'A mezzanine overlooks the lobby from the west end, reached by the escalators.',
  'information desk and anemometer': 'The information desk in the lobby; the 2009 renovation replaced its clock with an anemometer.',
  'aluminum building relief': 'An aluminum relief of the building as built, without the antenna, stands at the west end of the lobby.',
  'low rise column grid': 'Riveted steel columns rise through the base and lower tower. The building has 210 structural columns per floor; the grid shown is schematic.',
  'mid rise column grid': 'The column grid narrows with the setbacks through the middle of the tower. Schematic.',
  'high rise column grid': 'A tighter column grid carries the upper tower and crown. Schematic.',
  'crown column grid': 'Steel columns inside the mechanical crown carry the mooring mast above. Schematic.',
  'setback girder rings': 'Girder rings at the setback levels transfer the tower loads inward at each step. The setback floors are sourced; the rings are schematic.',
  'central utility core': 'A central core carries elevators, stairs, and utilities the full height of the building. Interior space is at most 28 ft (8.5 m) deep from the core to the windows.',
  'transfer girders at base': 'Deep transfer girders spread the tower columns across the five story base. Schematic.',
  'floor diaphragm plates': 'Representative floor plates brace the frame at intervals up the tower. Schematic.',
  'express elevator bank': 'Four express elevators built by Otis connect the lobby, the 80th floor, and landings in between.',
  'low zone local elevators': 'Local passenger elevators serve the lower zone of the tower. The original 54 local cars are grouped into banks here; placement is schematic.',
  'mid zone local elevators': 'Local passenger elevators serve the middle zone of the tower. Placement schematic.',
  'high zone local elevators': 'Local passenger elevators serve the upper zone of the tower. Placement schematic.',
  'freight elevator bank': 'Eight freight elevators serve the tower. Placement schematic.',
  'shuttle elevators 80 to 86': 'Additional elevators connect the 80th floor to the six floors above it.',
  'shuttle elevators 86 to 102': 'Elevators run from the 86th floor observatory up through the crown to the 102nd floor.',
  'observatory service elevator': 'One elevator connects the 86th and 102nd observatories and the mechanical floors between the 87th and 101st.',
  'crown lower stage mass': 'The lower stage of the 16 story, 200 ft (61 m) metal crown above the 86th floor, mostly mechanical.',
  'crown upper stage mass': 'The upper stage of the mechanical crown, stepping back below the 102nd floor observatory.',
  'crown limestone piers': 'Limestone piers continue the tower rhythm up the crown stages. Detail schematic.',
  'crown recessed window strips': 'Recessed window strips light the occupied crown floors between the piers. Detail schematic.',
  'crown aluminum spandrel bands': 'Horizontal aluminum spandrel bands cross the crown at each floor line, as on the tower.',
  'crown mechanical floor core': 'Mechanical floors fill most of the crown with building systems. Interior shown schematically.',
  'crown setback ledge': 'Ledges step the crown back between its two stages and at the roof.',
  'roof slab, 102nd floor': 'The roof slab at 1,250 ft (381.0 m), the top of the 102nd floor.',
  'rooftop penthouses': 'Rooftop penthouses house elevator overruns and access stairs. Schematic.',
  'crown parapet': 'A parapet rings the roof edge at the 102nd floor.',
  '86th floor deck slab': 'The deck of the 86th floor observatory at 1,050 ft (320 m), the highest open air observatory.',
  '86th floor gallery enclosure': 'An enclosed gallery wraps the 86th floor beside the open air deck.',
  '86th floor window band': 'Glazing wraps the enclosed 86th floor gallery.',
  '86th floor open deck railing': 'A railing guards the open air deck outside the 86th floor gallery.',
  'coin operated telescopes': 'Coin operated telescopes line the 86th floor open deck.',
  '102nd floor slab': 'The floor slab of the 102nd floor observatory inside the crown top.',
  'fully enclosed 102nd floor observatory': 'The 102nd floor observatory, redesigned in 2019 as a fully enclosed space.',
  '102nd floor to ceiling glazing': 'Floor to ceiling windows added in the 2019 redesign ring the 102nd floor observatory.',
  'indoor 80th floor observatory': 'The indoor 80th floor observatory, opened in 2019, sits inside the tower.',
  'wiltshire skyline mural, 80th floor': 'A skyline mural by Stephen Wiltshire covers a wall of the 80th floor observatory.',
  'observatory entrance, 20 west 34th': 'Visitors enter the observatories at 20 West 34th Street, on the north face of the base.',
  'observatory queuing hall': 'A queuing hall inside the base organizes the four million yearly observatory visitors. Layout schematic.',
  'mooring mast tier one': 'The first of four rectangular mooring mast tiers above the roof, holding the 103rd floor equipment room.',
  'mooring mast tier two': 'The second rectangular tier of the mooring mast, stepping back toward the pinnacle.',
  'mooring mast tier three': 'The third rectangular tier of the mooring mast.',
  'mooring mast tier four': 'The fourth and smallest rectangular tier of the mooring mast.',
  'mast collar courses': 'Collar courses step the mast back between its four tiers.',
  'cylindrical mast shaft': 'A cylindrical steel shaft tops the four rectangular mast tiers.',
  'conical mast pinnacle': 'A conical pinnacle caps the cylindrical mast shaft below the lightning rod.',
  'lightning rod finial': 'A lightning rod reaches the 1,454 ft (443.2 m) tip of the building.',
  'mooring ring for dirigibles': 'A docking ring marks where airships would have moored at the 106th floor equivalent; the dirigible plan was abandoned because of high winds. Ring schematic.',
  '103rd floor equipment room': 'The 103rd floor, originally the planned docking station, now holds electrical equipment.',
  '103rd floor exterior balcony': 'An exterior balcony rings the 103rd floor equipment room.',
  'mast window band': 'The mast holds 480 windows, replaced in 2015. Placement shown schematically.',
  'fm broadcast antenna ring': 'Separate FM antennae ringing the 103rd floor were built in 1965. Arrangement schematic.',
  'broadcast antenna array': 'The 200 ft broadcast tower completed in 1953 carries the pinnacle antenna array. Arrangement schematic.',
  'mast elevator and utility core': 'The 158 ft hollow steel mast is fitted with elevators and utilities.',
  'pinnacle maintenance platform': 'A maintenance platform rings the cylindrical mast shaft. Schematic.',
  'white searchlight bank': 'White searchlights were first used in November 1932 to celebrate the Roosevelt victory.',
  'freedom lights quartet': 'Four "Freedom Lights" were added in 1956. Placement schematic.',
  '72nd floor floodlight ring': 'Floodlights at the 72nd floor were added in February 1964 for the Worlds Fair. Placement schematic.',
  'metal halide floodlight ring': '204 metal-halide lights were installed in 1976. A schematic subset rings the crown here.',
  'led fixture ring': '1,200 LED fixtures installed in 2012 light the crown in nine to over 16 million colors. A schematic subset of 360 fixtures is shown.',
  'spire accent uplights': 'Uplights wash the mooring mast tiers at night. Placement schematic.',
  'mast aviation beacons': 'Aviation beacons mark the mast for aircraft. Placement schematic.',
  'entry canopy light strips': 'Light strips glow under the entrance canopies. Placement schematic.',
};
// Per-stage shaft explanations, generated from the stage table.
const STAGE_FLOORS = {
  1: 'floors 6 through 20',
  2: 'floors 21 through 24',
  3: 'floors 25 through 29',
  4: 'floors 30 through 71',
  5: 'floors 72 through 80',
  6: 'floors 81 through 84',
  7: 'floor 85',
};
for (const t of STAGES) {
  const fl = STAGE_FLOORS[t.n];
  EXPLANATIONS[`tower mass, stage ${t.n}`] =
    `The limestone tower mass for ${fl}, one of seven setback stages. The setback floors are mandated by the 1916 Zoning Resolution; stage widths are schematic.`;
  EXPLANATIONS[`north south piers, stage ${t.n}`] =
    `Limestone piers stand proud of the north and south faces for ${fl}, alternating wide and narrow in the Art Deco rhythm.`;
  EXPLANATIONS[`east west piers, stage ${t.n}`] =
    `Limestone piers stand proud of the east and west faces for ${fl}, alternating wide and narrow in the Art Deco rhythm.`;
  EXPLANATIONS[`recessed window bays, stage ${t.n}`] =
    `Window bays for ${fl} sit recessed between the piers, with nickel-chrome steel mullions. The building has 6,514 windows in total.`;
  EXPLANATIONS[`aluminum spandrel bands, stage ${t.n}`] =
    `Horizontal aluminum spandrels join the windows between floors for ${fl}, avoiding cross-bonding in the masonry.`;
  EXPLANATIONS[`setback cornice, stage ${t.n}`] =
    `A stone cornice caps stage ${t.n} at its setback, casting the shadow line that makes the zoning steps read from the street.`;
}
for (const tr of TERRACES) {
  EXPLANATIONS[`tier ${tr.n} setback terrace`] =
    `The open setback terrace at the ${tr.story} story, stepping the tower back under the 1916 Zoning Resolution.`;
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

const atlas = {
  version: '1',
  source: 'Architectural Atlas procedural model',
  scope: 'Empire State Building, New York City',
  title: 'Empire State Building',
  location: 'New York City, USA',
  blurb:
    'The 102 story Art Deco skyscraper at 350 Fifth Avenue in Manhattan, the world\'s tallest building from 1931 to 1970. This detailed model breaks the tower into seven setback stages, from the five story limestone base to the dirigible mooring mast, with the Art Deco lobby, the three observatories, and the 73 elevator banks inside.',
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
    ...(r.part.color ? { color: r.part.color } : {}),
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
  spread: 1.2,
};
fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas));

const bySystem = {};
for (const r of records) bySystem[r.part.system] = (bySystem[r.part.system] || 0) + 1;
console.log(
  `Wrote ${records.length} parts (${triangles.toLocaleString()} triangles, ${(offset / 1024).toFixed(0)} KB)`,
);
console.log('Systems:', JSON.stringify(bySystem));
