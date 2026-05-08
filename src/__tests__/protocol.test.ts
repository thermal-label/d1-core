import { describe, expect, it } from 'vitest';
import { buildPrinterStream } from '../protocol.js';
import type { LabelBitmap } from '@mbtech-nl/bitmap';
import type { PrintEngine } from '@thermal-label/contracts';
import type { D1Media } from '../types.js';

/**
 * Make a head-aligned bitmap fixture.
 *
 * The protocol expects bitmaps in head-aligned orientation:
 * `widthPx` is the head-perpendicular dimension (across the tape) and
 * `heightPx` is the feed direction (along the tape).
 */
function makeBitmap(widthPx: number, heightPx: number): LabelBitmap {
  const bytesPerRow = Math.ceil(widthPx / 8);
  const data = new Uint8Array(bytesPerRow * heightPx);
  data[0] = 0b10000000;
  return { widthPx, heightPx, data };
}

/**
 * Reference engine — 64-dot LabelManager head, 8 mm leading + trailing
 * pad. 8 mm @ 180 dpi rounds to 57 dots, the same number the pre-d1-core
 * encoder used as a hardcoded `FEED_MARGIN_PX`.
 */
const ENGINE: PrintEngine = {
  role: 'primary',
  protocol: 'd1-tape',
  dpi: 180,
  headDots: 64,
  mediaCompatibility: ['d1'],
  printableArea: { leading: 8, trailing: 0, left: 0, right: 0 },
  forcedTrailingFeedMm: 8,
};

const FEED_MARGIN_PX = 57;

const MEDIA_12MM_BW: D1Media = {
  id: 'd1-12mm-bw',
  name: '12mm Black on White',
  type: 'tape',
  widthMm: 12,
  tapeWidthMm: 12,
  printableDots: 64,
  bytesPerLine: 8,
  text: 'black',
  background: 'white',
};

const MEDIA_6MM_BW: D1Media = {
  id: 'd1-6mm-bw',
  name: '6mm Black on White',
  type: 'tape',
  widthMm: 6,
  tapeWidthMm: 6,
  printableDots: 32,
  bytesPerLine: 4,
  text: 'black',
  background: 'white',
};

const MEDIA_12MM_BB: D1Media = {
  ...MEDIA_12MM_BW,
  id: 'd1-12mm-bb',
  name: '12mm Black on Blue',
  background: 'blue',
};

describe('buildPrinterStream', () => {
  it('emits content via SYN+row and skip-lines via ESC D 0 + bare SYN', () => {
    const scaledFeed = Math.round(40 * (64 / 8)); // 320
    const bitmap = makeBitmap(8, 40);
    const stream = buildPrinterStream(bitmap, ENGINE, {}, MEDIA_12MM_BW);

    const expectedLength =
      3 + // ESC C 0
      3 +
      FEED_MARGIN_PX + // leading: ESC D 0 + 57×SYN
      3 + // ESC D 8
      scaledFeed * 9 + // content rows (SYN + 8 bytes each)
      3 +
      FEED_MARGIN_PX + // trailing: ESC D 0 + 57×SYN
      2; // ESC A

    expect(stream).toHaveLength(expectedLength);

    expect(stream[0]).toBe(0x1b);
    expect(stream[1]).toBe(0x43);
    expect(stream[2]).toBe(0x00);

    expect(stream[3]).toBe(0x1b);
    expect(stream[4]).toBe(0x44);
    expect(stream[5]).toBe(0x00);
    for (let i = 0; i < FEED_MARGIN_PX; i += 1) {
      expect(stream[6 + i]).toBe(0x16);
    }

    const contentDOffset = 6 + FEED_MARGIN_PX;
    expect(stream[contentDOffset]).toBe(0x1b);
    expect(stream[contentDOffset + 1]).toBe(0x44);
    expect(stream[contentDOffset + 2]).toBe(8);
    expect(stream[contentDOffset + 3]).toBe(0x16);

    expect(stream.at(-2)).toBe(0x1b);
    expect(stream.at(-1)).toBe(0x41);

    for (let i = 0; i < FEED_MARGIN_PX; i += 1) {
      expect(stream[stream.length - 2 - FEED_MARGIN_PX + i]).toBe(0x16);
    }
    const trailingDOffset = stream.length - 2 - FEED_MARGIN_PX - 3;
    expect(stream[trailingDOffset]).toBe(0x1b);
    expect(stream[trailingDOffset + 1]).toBe(0x44);
    expect(stream[trailingDOffset + 2]).toBe(0x00);
  });

  it('uses bytes-per-line from media.printableDots', () => {
    const bitmap = makeBitmap(8, 10);
    const cases: { media: D1Media; rasterDots: number; bytesPerLine: number }[] = [
      { media: MEDIA_6MM_BW, rasterDots: 32, bytesPerLine: 4 },
      { media: MEDIA_12MM_BW, rasterDots: 64, bytesPerLine: 8 },
    ];

    for (const { media, rasterDots, bytesPerLine } of cases) {
      const stream = buildPrinterStream(bitmap, ENGINE, {}, media);
      const scaledFeed = Math.round(10 * (rasterDots / 8));

      const contentDOffset = 3 + 3 + FEED_MARGIN_PX;
      expect(stream[contentDOffset]).toBe(0x1b);
      expect(stream[contentDOffset + 1]).toBe(0x44);
      expect(stream[contentDOffset + 2]).toBe(bytesPerLine);

      expect(stream).toHaveLength(
        3 + 3 + FEED_MARGIN_PX + 3 + scaledFeed * (1 + bytesPerLine) + 3 + FEED_MARGIN_PX + 2,
      );
    }
  });

  it('falls back to engine.headDots when media has no printableDots', () => {
    const bareEngine: PrintEngine = {
      role: 'primary',
      protocol: 'd1-tape',
      dpi: 180,
      headDots: 64,
    };
    const bitmap = makeBitmap(64, 64);
    const stream = buildPrinterStream(bitmap, bareEngine);

    expect(stream).toHaveLength(3 + 3 + 64 * 9 + 2);
    expect(stream[3]).toBe(0x1b);
    expect(stream[4]).toBe(0x44);
    expect(stream[5]).toBe(8);
    expect(stream[6]).toBe(0x16);
  });

  it('omits skip-line blocks when leading + trailing are zero', () => {
    const bareEngine: PrintEngine = {
      role: 'primary',
      protocol: 'd1-tape',
      dpi: 180,
      headDots: 64,
    };
    const bitmap = makeBitmap(64, 64);
    const stream = buildPrinterStream(bitmap, bareEngine, {}, MEDIA_12MM_BW);

    expect(stream).toHaveLength(3 + 3 + 64 * 9 + 2);
    expect(stream[3]).toBe(0x1b);
    expect(stream[4]).toBe(0x44);
    expect(stream[5]).toBe(8);
    expect(stream[6]).toBe(0x16);
  });

  it('reads leading pad from engine.printableArea and trailing from forcedTrailingFeedMm', () => {
    const asymEngine: PrintEngine = {
      ...ENGINE,
      printableArea: { leading: 4, trailing: 0, left: 0, right: 0 },
      forcedTrailingFeedMm: 12,
    };
    const leadingDots = Math.round((4 * 180) / 25.4);
    const trailingDots = Math.round((12 * 180) / 25.4);

    const bitmap = makeBitmap(64, 64);
    const stream = buildPrinterStream(bitmap, asymEngine, {}, MEDIA_12MM_BW);

    expect(stream).toHaveLength(3 + 3 + leadingDots + 3 + 64 * 9 + 3 + trailingDots + 2);
  });

  it('repeats the per-copy block for copies > 1', () => {
    const bitmap = makeBitmap(64, 64);
    const single = buildPrinterStream(bitmap, ENGINE, {}, MEDIA_12MM_BW);
    const triple = buildPrinterStream(bitmap, ENGINE, { copies: 3 }, MEDIA_12MM_BW);
    expect(triple).toHaveLength(single.length * 3);
  });

  it('clamps copies < 1 to a single emission', () => {
    const bitmap = makeBitmap(64, 64);
    const single = buildPrinterStream(bitmap, ENGINE, {}, MEDIA_12MM_BW);
    const zero = buildPrinterStream(bitmap, ENGINE, { copies: 0 }, MEDIA_12MM_BW);
    expect(zero).toHaveLength(single.length);
  });

  it('derives ESC C selector from media colours', () => {
    const bitmap = makeBitmap(64, 8);
    const stream = buildPrinterStream(bitmap, ENGINE, {}, MEDIA_12MM_BB);
    expect(stream[0]).toBe(0x1b);
    expect(stream[1]).toBe(0x43);
    expect(stream[2]).toBe(0x01);
  });

  it('honours options.tapeType override over media-derived selector', () => {
    const bitmap = makeBitmap(64, 8);
    const stream = buildPrinterStream(bitmap, ENGINE, { tapeType: 9 }, MEDIA_12MM_BW);
    expect(stream[2]).toBe(0x09);
  });

  it('rejects out-of-range options.tapeType', () => {
    const bitmap = makeBitmap(64, 8);
    expect(() => buildPrinterStream(bitmap, ENGINE, { tapeType: 13 }, MEDIA_12MM_BW)).toThrow(
      RangeError,
    );
    expect(() => buildPrinterStream(bitmap, ENGINE, { tapeType: -1 }, MEDIA_12MM_BW)).toThrow(
      RangeError,
    );
    expect(() => buildPrinterStream(bitmap, ENGINE, { tapeType: 1.5 }, MEDIA_12MM_BW)).toThrow(
      RangeError,
    );
  });

  it('emits ESC E before ESC A when engine.capabilities.autocut is set', () => {
    const cuttingEngine: PrintEngine = {
      ...ENGINE,
      capabilities: { autocut: true },
    };
    const bitmap = makeBitmap(64, 8);
    const stream = buildPrinterStream(bitmap, cuttingEngine, {}, MEDIA_12MM_BW);

    expect(stream.at(-4)).toBe(0x1b);
    expect(stream.at(-3)).toBe(0x45);
    expect(stream.at(-2)).toBe(0x1b);
    expect(stream.at(-1)).toBe(0x41);
  });

  it('omits ESC E for manual-cutter engines', () => {
    const bitmap = makeBitmap(64, 8);
    const stream = buildPrinterStream(bitmap, ENGINE, {}, MEDIA_12MM_BW);

    expect(stream.at(-2)).toBe(0x1b);
    expect(stream.at(-1)).toBe(0x41);
    expect(stream.at(-3)).not.toBe(0x45);
  });

  it('emits ESC E once per copy when autocut is set', () => {
    const cuttingEngine: PrintEngine = {
      ...ENGINE,
      capabilities: { autocut: true },
    };
    const bitmap = makeBitmap(64, 8);
    const stream = buildPrinterStream(bitmap, cuttingEngine, { copies: 3 }, MEDIA_12MM_BW);

    let cutCount = 0;
    for (let i = 0; i < stream.length - 1; i += 1) {
      if (stream[i] === 0x1b && stream[i + 1] === 0x45) cutCount += 1;
    }
    expect(cutCount).toBe(3);
  });

  it('caps raster width at engine.headDots when media exceeds it', () => {
    const narrowEngine: PrintEngine = {
      role: 'primary',
      protocol: 'd1-tape',
      dpi: 180,
      headDots: 32,
    };
    const bitmap = makeBitmap(32, 8);
    const stream = buildPrinterStream(bitmap, narrowEngine, {}, MEDIA_12MM_BW);

    expect(stream[3]).toBe(0x1b);
    expect(stream[4]).toBe(0x44);
    expect(stream[5]).toBe(4);
  });
});
