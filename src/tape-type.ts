import type { D1Media } from './types.js';

/**
 * `ESC C n` — D1 tape-type / colour-palette selector.
 *
 * The byte declares which cassette is loaded so the firmware can pick
 * the right thermal-energy curve. **The firmware cannot detect
 * cartridge type** — only cassette presence (see `parseStatus` and the
 * `mediaLoaded` / `detectedMedia` split). The host has to declare it,
 * normally via the user's media selection passed through to
 * `tapeTypeFor()`; the firmware trusts whatever value arrives.
 *
 * The byte does **not** change the printed ink (ink is determined by
 * the cassette itself); but the matching value gives correct heat
 * calibration and noticeably better print quality on coloured /
 * reverse-print substrates. Sending `0` when the user hasn't selected
 * a cartridge is safe — the cassette's actual ink prints either way.
 *
 * Spec table per `LabelWriter 400 Series Technical Reference` p.24
 * (LabelManager firmware uses the same table; the protocol is shared
 * D1):
 *
 *   0  Black on white or clear        7  Black on fluorescent green*
 *   1  Black on blue                  8  Black on fluorescent red*
 *   2  Black on red                   9  White on clear
 *   3  Black on silver*              10  White on black
 *   4  Black on yellow               11  Blue on white or clear
 *   5  Black on gold*                12  Red on white or clear
 *   6  Black on green
 *
 *   * — substrate variants without a catalogued cassette today
 *       (silver, gold, fluorescent green, fluorescent red). The
 *       branches below default to 0 for those; add a case here if a
 *       cassette ever declares one of those backgrounds.
 */

export const TAPE_TYPE_DEFAULT = 0;
export const TAPE_TYPE_MAX = 12;

/**
 * Map the user-selected media's text + background colours to the
 * ESC C selector (0..12). Unknown / unenumerated combinations and
 * `undefined` media both return `0`, the safe fallback (the
 * cassette's ink prints regardless of the byte sent).
 */
export function tapeTypeFor(media?: Pick<D1Media, 'text' | 'background'>): number {
  if (!media) return TAPE_TYPE_DEFAULT;
  const { text, background } = media;
  if (text === 'black') {
    if (background === 'white' || background === 'clear') return 0;
    if (background === 'blue') return 1;
    if (background === 'red') return 2;
    if (background === 'yellow') return 4;
    if (background === 'green') return 6;
    return TAPE_TYPE_DEFAULT;
  }
  if (text === 'white') {
    if (background === 'clear') return 9;
    if (background === 'black') return 10;
    return TAPE_TYPE_DEFAULT;
  }
  if (background === 'white' || background === 'clear') {
    if (text === 'blue') return 11;
    if (text === 'red') return 12;
  }
  return TAPE_TYPE_DEFAULT;
}
