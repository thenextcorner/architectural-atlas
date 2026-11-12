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

export function colosseumLayer(p: Part): number {
  if (p.system === 'hypogeum') return 0;
  if (p.system === 'arena' || p.system === 'materials' || p.system === 'ruin') return 1;
  if (p.system === 'velarium') return 3;
  if (p.system === 'attic') {
    const cy = (p.bounds[0][1] + p.bounds[1][1]) / 2;
    return cy >= 0.42 ? 3 : 2;
  }
  return 2;
}
