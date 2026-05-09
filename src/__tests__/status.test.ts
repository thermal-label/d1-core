import { describe, expect, it } from 'vitest';
import { STATUS_REQUEST, parseStatus } from '../status.js';

describe('STATUS_REQUEST', () => {
  it('is the ESC A two-byte sequence', () => {
    expect(STATUS_REQUEST).toEqual(new Uint8Array([0x1b, 0x41]));
  });
});

describe('parseStatus', () => {
  it('returns loaded + ready for the bench-confirmed 0x40 byte', () => {
    // LM_PNP wire: media inserted + ready = 0x40 (bit 6 only).
    const status = parseStatus(new Uint8Array([0x40]));
    expect(status.ready).toBe(true);
    expect(status.mediaLoaded).toBe(true);
    expect(status.errors).toEqual([]);
    expect(status.detectedMedia).toBeUndefined();
    expect(status.rawBytes).toEqual(new Uint8Array([0x40]));
  });

  it('flags no-media when bit 6 is clear (0x00)', () => {
    // LM_PNP wire: no cassette = 0x00 (no bits).
    const status = parseStatus(new Uint8Array([0x00]));
    expect(status.mediaLoaded).toBe(false);
    expect(status.ready).toBe(false);
    expect(status.errors).toContainEqual({ code: 'no_media', message: 'No tape inserted' });
  });

  it('flags cutter-jam when bit 4 is set', () => {
    // 0x50 = bits 6 + 4 (loaded + cutter jammed).
    const status = parseStatus(new Uint8Array([0x50]));
    expect(status.mediaLoaded).toBe(true);
    expect(status.ready).toBe(false);
    expect(status.errors).toContainEqual({ code: 'paper_jam', message: 'Cutter jammed' });
  });

  it('flags general error when bit 2 is set (and no more specific signal)', () => {
    // 0x44 = bits 6 + 2 (loaded + general error, no cutter jam).
    const status = parseStatus(new Uint8Array([0x44]));
    expect(status.mediaLoaded).toBe(true);
    expect(status.ready).toBe(false);
    expect(status.errors).toContainEqual({
      code: 'printer_error',
      message: 'Printer reported an error',
    });
  });

  it('suppresses general-error when cutter-jam already accounts for it', () => {
    // 0x54 = bits 6 + 4 + 2. The cutter jam IS the general error;
    // don't double-report.
    const status = parseStatus(new Uint8Array([0x54]));
    expect(status.errors.map(e => e.code)).toEqual(['paper_jam']);
  });

  it('treats an empty buffer as all-zero (no media)', () => {
    const status = parseStatus(new Uint8Array([]));
    expect(status.mediaLoaded).toBe(false);
    expect(status.ready).toBe(false);
    expect(status.errors).toContainEqual({ code: 'no_media', message: 'No tape inserted' });
  });
});
