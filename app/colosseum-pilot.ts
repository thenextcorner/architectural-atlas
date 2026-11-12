import type {Part} from './atlas';

/** Colosseum pilot: Floors and Tour modes.
 * Layer names and tour stops use only facts already in stories/colosseum.json.
 * The layer split is by system, except the attic: its low parts (stylobate
 * base ring, pavement, entablature) stay with the seating bowl, while the
 * attic storey itself lifts with the velarium. The cut sits at 0.42, between
 * the entablature (0.355) and the attic window panels (0.45). */
export interface PilotLayer {
  name: string;
  label: string;
  hotspotPart: string;
}

export const COLOSSEUM_LAYERS: PilotLayer[] = [
  {name: 'Hypogeum', label: 'HYPOGEUM', hotspotPart: 'Hypogeum central corridor'},
  {name: 'Arena', label: 'ARENA', hotspotPart: 'NE arena sand surface'},
  {name: 'Seating tiers', label: 'SEATING TIERS', hotspotPart: 'NE lower maenianum primum wedges'},
  {name: 'Attic and velarium', label: 'ATTIC AND VELARIUM', hotspotPart: 'NE velarium mast corbels (60)'},
];

/** Tour stops in narrative order: arrive, see the fight floor, go below it,
 * sit with the emperor, sit with the crowd, look up at the awning, then see
 * what time did to the wall. Each name matches a hotspot in
 * stories/colosseum.json, so the stop text is the hotspot text. */
export const COLOSSEUM_TOUR: string[] = [
  'NE numbered entrances (19)',
  'NE arena sand surface',
  'Hypogeum central corridor',
  'Imperial box (pulvinar)',
  'NE lower maenianum primum wedges',
  'NE velarium mast corbels (60)',
  'Collapsed south wall, fallen blocks',
];

export const FLOOR_GAP = 0.38;

/** Which Floors layer a part belongs to. Layers are vertical strata, so the
 * assignment is by height and position, not by system: a part that sits at
 * ground level must stay at ground level instead of lifting with the
 * seating bowl, or it reads as floating debris.
 * Layer 0, Hypogeum: everything below ground, plus the ground plane
 * itself (the travertine pavement and the stylobate base ring, which are
 * the floor the building stands on) and the ground-floor corridors.
 * Layer 1, Arena: the arena disc assembly, and the parts at its edge
 * (podium ring, imperial box, arena gates), which are small and sit
 * inside the arena's footprint.
 * Layer 2, Seating tiers: the facade arcades, entrances, corridors,
 * stairs, support walls and seating wedges.
 * Layer 3, Attic and velarium: the attic storey and the awning. The
 * attic's low parts (stylobate, pavement, entablature) are caught by the
 * ground and seating rules above, so only the storey itself lifts. */
export function colosseumLayer(p: Part): number {
  const cy = (p.bounds[0][1] + p.bounds[1][1]) / 2;
  const ex = Math.max(Math.abs(p.bounds[0][0]), Math.abs(p.bounds[1][0]));
  const ez = Math.max(Math.abs(p.bounds[0][2]), Math.abs(p.bounds[1][2]));
  if (p.system === 'hypogeum') return 0;
  if (p.system === 'arena') return 1;
  // Parts at the arena's edge (podium ring, imperial box, arena gates)
  // lift with the arena floor. Checked before the ground rule: the
  // podium ring's centre sits just below ground level, but it belongs to
  // the arena assembly, not to the ground plane.
  if (ex < 0.7 && ez < 0.5 && cy < 0.11) return 1;
  if (cy < 0.03) return 0;
  if (p.system === 'velarium') return 3;
  if (p.system === 'attic') {
    return cy >= 0.42 ? 3 : 2;
  }
  return 2;
}
