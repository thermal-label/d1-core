import type { D1Media } from './types.js';
import { D1_MEDIA, D1_MEDIA_LIST, type D1MediaKey } from './media.generated.js';

export { D1_MEDIA, D1_MEDIA_LIST };
export type { D1MediaKey };

/**
 * Find the canonical Black-on-White cartridge for a given tape width.
 *
 * Used by pickers as the default "any 12 mm tape" entry. Returns
 * `undefined` for widths the catalogue doesn't cover (today: 6, 9,
 * 12, 19, 24).
 */
export function findD1MediaByTapeWidth(tapeWidthMm: number): D1Media | undefined {
  return D1_MEDIA_LIST.find(
    m =>
      m.tapeWidthMm === tapeWidthMm &&
      m.material === 'standard' &&
      m.text === 'black' &&
      m.background === 'white',
  );
}

/**
 * Find every catalogued cartridge for a given tape width.
 *
 * Includes every material (Standard, Permanent, Flexible, Durable,
 * Rhino*) and every text/background colour combination at that width.
 */
export function findAllD1MediaByTapeWidth(tapeWidthMm: number): readonly D1Media[] {
  return D1_MEDIA_LIST.filter(m => m.tapeWidthMm === tapeWidthMm);
}

/**
 * Look up an entry by its kebab-case `id`. Convenience for callers
 * that have an id in hand and want the full descriptor without
 * iterating the keyed registry.
 */
export function findD1MediaById(id: string): D1Media | undefined {
  return D1_MEDIA_LIST.find(m => m.id === id);
}

/** Canonical 6 mm Black-on-White cartridge — picker default. */
export const D1_TAPE_6MM = findD1MediaByTapeWidth(6);
/** Canonical 9 mm Black-on-White cartridge — picker default. */
export const D1_TAPE_9MM = findD1MediaByTapeWidth(9);
/** Canonical 12 mm Black-on-White cartridge — picker default. */
export const D1_TAPE_12MM = findD1MediaByTapeWidth(12);
/** Canonical 19 mm Black-on-White cartridge — picker default. */
export const D1_TAPE_19MM = findD1MediaByTapeWidth(19);
/** Canonical 24 mm Black-on-White cartridge — picker default. */
export const D1_TAPE_24MM = findD1MediaByTapeWidth(24);
