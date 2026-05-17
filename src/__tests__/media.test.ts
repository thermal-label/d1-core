import { describe, expect, it } from 'vitest';
import {
  D1_MEDIA,
  D1_MEDIA_LIST,
  D1_TAPE_6MM,
  D1_TAPE_9MM,
  D1_TAPE_12MM,
  D1_TAPE_19MM,
  D1_TAPE_24MM,
  findAllD1MediaByTapeWidth,
  findD1MediaById,
  findD1MediaByTapeWidth,
} from '../media.js';

describe('D1 catalogue invariants', () => {
  it('D1_MEDIA_LIST mirrors D1_MEDIA values', () => {
    expect(D1_MEDIA_LIST).toEqual(Object.values(D1_MEDIA));
  });

  it('every entry carries the catalogue-required fields', () => {
    for (const m of D1_MEDIA_LIST) {
      expect(m.id, m.name).toBeTypeOf('string');
      expect(m.type, String(m.id)).toBe('tape');
      expect(m.tapeWidthMm, String(m.id)).toBeTypeOf('number');
      expect(m.printableDots, String(m.id)).toBeTypeOf('number');
      expect(m.bytesPerLine, String(m.id)).toBe(Math.ceil((m.printableDots ?? 0) / 8));
      expect(m.text, String(m.id)).toBeTypeOf('string');
      expect(m.background, String(m.id)).toBeTypeOf('string');
    }
  });

  it('targetModels are drawn from {d1, d1-wide, d1-24}', () => {
    const allowed = new Set(['d1', 'd1-wide', 'd1-24']);
    for (const m of D1_MEDIA_LIST) {
      for (const t of m.targetModels ?? []) {
        expect(allowed.has(t), `${String(m.id)}: ${t}`).toBe(true);
      }
    }
  });

  it('tape-width tiers map to expected targetModels', () => {
    for (const m of D1_MEDIA_LIST) {
      if (m.tapeWidthMm === 24) {
        expect(m.targetModels, String(m.id)).toEqual(['d1-24']);
      } else if (m.tapeWidthMm === 19) {
        expect(m.targetModels, String(m.id)).toEqual(['d1-wide']);
      } else {
        expect(m.targetModels, String(m.id)).toEqual(['d1']);
      }
    }
  });
});

describe('canonical Black-on-White picks', () => {
  it.each([
    ['D1_TAPE_6MM', D1_TAPE_6MM, 6],
    ['D1_TAPE_9MM', D1_TAPE_9MM, 9],
    ['D1_TAPE_12MM', D1_TAPE_12MM, 12],
    ['D1_TAPE_19MM', D1_TAPE_19MM, 19],
    ['D1_TAPE_24MM', D1_TAPE_24MM, 24],
  ])('%s picks the standard B/W cartridge at %d mm', (_label, entry, width) => {
    expect(entry).toBeDefined();
    expect(entry?.tapeWidthMm).toBe(width);
    expect(entry?.material).toBe('standard');
    expect(entry?.text).toBe('black');
    expect(entry?.background).toBe('white');
  });
});

describe('lookup helpers', () => {
  it('findD1MediaByTapeWidth returns the canonical B/W entry', () => {
    expect(findD1MediaByTapeWidth(12)?.id).toBe('d1-standard-bw-12');
  });

  it('findD1MediaByTapeWidth returns undefined for unsupported widths', () => {
    expect(findD1MediaByTapeWidth(99)).toBeUndefined();
  });

  it('findAllD1MediaByTapeWidth returns every variant at that width', () => {
    const twelve = findAllD1MediaByTapeWidth(12);
    expect(twelve.length).toBeGreaterThan(1);
    for (const m of twelve) expect(m.tapeWidthMm).toBe(12);
  });

  it('findAllD1MediaByTapeWidth returns empty for unsupported widths', () => {
    expect(findAllD1MediaByTapeWidth(99)).toEqual([]);
  });

  it('findD1MediaById round-trips', () => {
    expect(findD1MediaById('d1-standard-bw-12')?.tapeWidthMm).toBe(12);
    expect(findD1MediaById('does-not-exist')).toBeUndefined();
  });
});
