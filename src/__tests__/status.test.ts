import { describe, expect, it } from 'vitest';
import { STATUS_REQUEST, parseStatus } from '../status.js';

describe('STATUS_REQUEST', () => {
  it('is the ESC A two-byte sequence', () => {
    expect(STATUS_REQUEST).toEqual(new Uint8Array([0x1b, 0x41]));
  });
});

describe('parseStatus', () => {
  it('returns ready + media-loaded for an all-zero byte', () => {
    const status = parseStatus(new Uint8Array([0x00]));
    expect(status.ready).toBe(true);
    expect(status.mediaLoaded).toBe(true);
    expect(status.errors).toEqual([]);
    expect(status.detectedMedia).toBeUndefined();
    expect(status.rawBytes).toEqual(new Uint8Array([0x00]));
  });

  it('flags not-ready when bit 0 is set', () => {
    const status = parseStatus(new Uint8Array([0b00000001]));
    expect(status.ready).toBe(false);
    expect(status.errors).toContainEqual({ code: 'not_ready', message: 'Printer busy' });
  });

  it('flags no-media when bit 1 is set', () => {
    const status = parseStatus(new Uint8Array([0b00000010]));
    expect(status.mediaLoaded).toBe(false);
    expect(status.errors).toContainEqual({ code: 'no_media', message: 'No tape inserted' });
  });

  it('flags low-media when bit 2 is set', () => {
    const status = parseStatus(new Uint8Array([0b00000100]));
    expect(status.errors).toContainEqual({ code: 'low_media', message: 'Tape supply low' });
  });

  it('combines all three error bits', () => {
    const status = parseStatus(new Uint8Array([0b00000111]));
    expect(status.ready).toBe(false);
    expect(status.mediaLoaded).toBe(false);
    expect(status.errors).toHaveLength(3);
  });

  it('treats an empty buffer as all-zero', () => {
    const status = parseStatus(new Uint8Array([]));
    expect(status.ready).toBe(true);
    expect(status.mediaLoaded).toBe(true);
    expect(status.errors).toEqual([]);
  });
});
