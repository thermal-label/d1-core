import { getRow, rotateBitmap, scaleBitmap, type LabelBitmap } from '@mbtech-nl/bitmap';
import {
  getForcedTrailingFeedMm,
  getPrintableArea,
  type PrintEngine,
} from '@thermal-label/contracts';
import type { D1Media, D1PrintOptions } from './types.js';
import { TAPE_TYPE_MAX, tapeTypeFor } from './tape-type.js';

/**
 * D1 wire-protocol byte constants.
 *
 * `ESC` is the command prefix; opcodes that follow it (`A` start /
 * status query, `B` dot tab, `C` tape type, `D` bytes-per-line, `E`
 * cut) take their letters straight from the LW 450 Tech Ref. `SYN`
 * is the row-data prefix — one SYN per dot row, followed by
 * bytes-per-line payload bytes (or zero payload bytes when used as
 * a bare feed against `ESC D 0`).
 */
const D1 = {
  ESC: 0x1b,
  SYN: 0x16,
  START: 0x41, // ESC A — start / status query
  DOT_TAB: 0x42, // ESC B — horizontal print offset (bytes)
  TAPE_TYPE: 0x43, // ESC C — tape-type / palette selector
  BYTES_PER_LINE: 0x44, // ESC D — bytes-per-line for following SYN rows
  CUT: 0x45, // ESC E — autocut (autocut chassis only)
} as const;

/**
 * Convert a millimetre value to dot count at the given DPI.
 *
 * Rounds half-away-from-zero so values land on the same integer dot
 * count the LM driver had hardcoded pre-extraction (`8 mm × 180 / 25.4
 * ≈ 56.6929` → `57`).
 */
function mmToDots(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}

/**
 * Resolve the raster width in dots — how many head-perpendicular dots
 * are fired per row.
 *
 * Source-of-truth precedence:
 *   1. `media.printableDots` — per-cartridge constraint, the most
 *      accurate value when media is in scope.
 *   2. `engine.headDots` — fallback (also the absolute ceiling).
 *
 * Always capped by `engine.headDots`: the head physically cannot fire
 * more dots than it has pins. Callers that need to bypass the
 * media-derived width can pre-narrow the engine or supply a slimmed
 * media descriptor.
 */
function resolveRasterDots(engine: PrintEngine, media: D1Media | undefined): number {
  const fromMedia = media?.printableDots;
  const desired = fromMedia ?? engine.headDots;
  return Math.min(desired, engine.headDots);
}

function resolveTapeType(options: D1PrintOptions, media: D1Media | undefined): number {
  const fromOptions = options.tapeType;
  if (fromOptions !== undefined) {
    if (!Number.isInteger(fromOptions) || fromOptions < 0 || fromOptions > TAPE_TYPE_MAX) {
      throw new RangeError(
        `tapeType must be an integer 0..${String(TAPE_TYPE_MAX)} (got ${String(fromOptions)})`,
      );
    }
    return fromOptions;
  }
  return tapeTypeFor(media);
}

/**
 * Scale a head-aligned bitmap to the resolved raster width and resolve
 * leading / trailing skip-line counts for the chassis dead-zone +
 * post-print advance.
 *
 * **Input contract** — the bitmap is in head-aligned orientation:
 * `widthPx` is the head-perpendicular dimension (across the tape) and
 * `heightPx` is the feed direction (along the tape). The caller (the
 * driver layer, via `pickRotation` + `renderImage`'s `rotate` option)
 * is responsible for getting it into this orientation.
 *
 * Both skip-line counts are emitted by `buildPrinterStream` as
 * `ESC D 0 + N × SYN` — bare SYN bytes feed one dot row each with
 * zero payload, so trailing/leading advance costs 1 byte per dot row
 * instead of `1 + bytesPerLine` for a padded blank row. Prior art:
 * labelle's `LabelMaker._skip_lines` ("MLF" pattern).
 */
function prepareForEmission(
  bitmap: LabelBitmap,
  rasterDots: number,
  engine: PrintEngine,
  media: D1Media | undefined,
): { bitmap: LabelBitmap; leadingSkipLines: number; trailingSkipLines: number } {
  const swapped = rotateBitmap(bitmap, 90);
  const scaled = scaleBitmap(swapped, rasterDots);
  const headAligned = rotateBitmap(scaled, 270);

  const printableArea = getPrintableArea(engine, media);
  const leadingSkipLines = mmToDots(printableArea.leading, engine.dpi);
  const trailingSkipLines = mmToDots(getForcedTrailingFeedMm(engine), engine.dpi);

  return { bitmap: headAligned, leadingSkipLines, trailingSkipLines };
}

/**
 * Build a raw byte stream for the USB Printer-class endpoint.
 *
 * Wire shape per copy:
 *   ESC C n
 *   [if leading skip-lines: ESC D 0 + N × SYN]
 *   ESC D N (bytes-per-line for content)
 *   SYN + row × M (content)
 *   [if trailing skip-lines: ESC D 0 + N × SYN]
 *   [if engine.capabilities.autocut: ESC E]
 *   ESC A
 *
 * `n` for `ESC C` is the tape-type / colour-palette selector. The
 * firmware can't detect cartridge type — the host declares it.
 * Resolved from `options.tapeType` (explicit override), else
 * `tapeTypeFor(media)` (user-selected media → palette index), else
 * `0` (safe fallback). `ESC E` is emitted only when the engine
 * declares `capabilities.autocut: true`; manual-cutter chassis (every
 * standalone LabelManager today) skip it.
 *
 * Leading + trailing tape advance is emitted as bare SYN bytes against
 * `ESC D 0` (zero bytes-per-line). Each bare SYN advances one dot row
 * with no payload — same physical feed as a padded blank row but at
 * 1 byte/row instead of `1 + bytesPerLine` bytes/row.
 *
 * Input bitmap is head-aligned (caller's responsibility — typically
 * via `pickRotation` + `renderImage`).
 */
export function buildPrinterStream(
  bitmap: LabelBitmap,
  engine: PrintEngine,
  options: D1PrintOptions = {},
  media?: D1Media,
): Uint8Array {
  const copies = Math.max(1, options.copies ?? 1);
  const rasterDots = resolveRasterDots(engine, media);
  const tapeType = resolveTapeType(options, media);
  const autocut = engine.capabilities?.autocut === true;

  const { bitmap: scaled, leadingSkipLines, trailingSkipLines } = prepareForEmission(
    bitmap,
    rasterDots,
    engine,
    media,
  );
  const bytesPerLine = Math.ceil(rasterDots / 8);

  // `ESC B N` — Dot Tab. Horizontal print offset measured in
  // bytes (1 byte = 8 dot pixels). Sits between `ESC C` and
  // `ESC D`. Centres the raster on the head when the content
  // is narrower than the head's full dot count: a 12 mm tape
  // (64 dots printable) on a 128-dot Duo head wants `ESC B 4`,
  // shifting content from head pixel 32 — putting the 64-dot
  // raster squarely in the middle of the 128-dot head, aligned
  // with the centred-on-head tape.
  //
  // ESC B is always emitted (including dotTab=0). Bench evidence:
  // standalone LM (head==raster, computed dotTab=0) printed shifted
  // right when ESC B was suppressed — the firmware retained a
  // non-zero default margin. Sending `ESC B 0` explicitly resets it.
  //
  // Spec: LW 450 Series Tech Ref, ESC B section. Max value =
  // (engine.headDots / 8) - 1; clamp defensively. Granularity
  // is 8 pixels — for typical bands this rounds to a whole byte
  // exactly (e.g. 64-dot raster on 128-dot head → 32 unused
  // pixels each side → exactly 4 bytes).
  const headExcessBytes = Math.max(0, Math.floor((engine.headDots - rasterDots) / 16));
  const maxDotTab = Math.max(0, Math.floor(engine.headDots / 8) - 1);
  const dotTab = Math.min(headExcessBytes, maxDotTab);

  const chunks: number[] = [];

  for (let i = 0; i < copies; i += 1) {
    chunks.push(D1.ESC, D1.TAPE_TYPE, tapeType);

    // Always emitted (including dotTab=0) — see ESC B note above.
    chunks.push(D1.ESC, D1.DOT_TAB, dotTab);

    if (leadingSkipLines > 0) {
      chunks.push(D1.ESC, D1.BYTES_PER_LINE, 0x00);
      for (let n = 0; n < leadingSkipLines; n += 1) chunks.push(D1.SYN);
    }

    chunks.push(D1.ESC, D1.BYTES_PER_LINE, bytesPerLine);

    for (let y = 0; y < scaled.heightPx; y += 1) {
      const row = getRow(scaled, y);
      chunks.push(D1.SYN, ...Array.from(row));
    }

    if (trailingSkipLines > 0) {
      chunks.push(D1.ESC, D1.BYTES_PER_LINE, 0x00);
      for (let n = 0; n < trailingSkipLines; n += 1) chunks.push(D1.SYN);
    }

    if (autocut) {
      chunks.push(D1.ESC, D1.CUT);
    }

    chunks.push(D1.ESC, D1.START);
  }

  return new Uint8Array(chunks);
}
