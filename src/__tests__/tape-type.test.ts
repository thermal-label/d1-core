import { describe, expect, it } from 'vitest';
import { TAPE_TYPE_DEFAULT, TAPE_TYPE_MAX, tapeTypeFor } from '../tape-type.js';

describe('tapeTypeFor', () => {
  it('returns 0 for undefined media', () => {
    expect(tapeTypeFor()).toBe(0);
  });

  it('maps black-on-* combinations per spec', () => {
    expect(tapeTypeFor({ text: 'black', background: 'white' })).toBe(0);
    expect(tapeTypeFor({ text: 'black', background: 'clear' })).toBe(0);
    expect(tapeTypeFor({ text: 'black', background: 'blue' })).toBe(1);
    expect(tapeTypeFor({ text: 'black', background: 'red' })).toBe(2);
    expect(tapeTypeFor({ text: 'black', background: 'yellow' })).toBe(4);
    expect(tapeTypeFor({ text: 'black', background: 'green' })).toBe(6);
  });

  it('falls back to 0 for unenumerated black-on-* substrates', () => {
    expect(tapeTypeFor({ text: 'black', background: 'orange' })).toBe(0);
    expect(tapeTypeFor({ text: 'black', background: 'silver' })).toBe(0);
  });

  it('maps white-on-* combinations per spec', () => {
    expect(tapeTypeFor({ text: 'white', background: 'clear' })).toBe(9);
    expect(tapeTypeFor({ text: 'white', background: 'black' })).toBe(10);
  });

  it('falls back to 0 for unenumerated white-on-* substrates', () => {
    expect(tapeTypeFor({ text: 'white', background: 'red' })).toBe(0);
  });

  it('maps blue/red on white-or-clear per spec', () => {
    expect(tapeTypeFor({ text: 'blue', background: 'white' })).toBe(11);
    expect(tapeTypeFor({ text: 'blue', background: 'clear' })).toBe(11);
    expect(tapeTypeFor({ text: 'red', background: 'white' })).toBe(12);
    expect(tapeTypeFor({ text: 'red', background: 'clear' })).toBe(12);
  });

  it('falls back to 0 for blue/red on non-white-or-clear substrates', () => {
    expect(tapeTypeFor({ text: 'blue', background: 'yellow' })).toBe(0);
    expect(tapeTypeFor({ text: 'red', background: 'black' })).toBe(0);
  });

  it('falls back to 0 for unrecognised text colour', () => {
    expect(tapeTypeFor({ text: 'green', background: 'white' })).toBe(0);
  });

  it('falls back to 0 when text or background is undefined', () => {
    expect(tapeTypeFor({})).toBe(0);
    expect(tapeTypeFor({ text: 'black' })).toBe(0);
    expect(tapeTypeFor({ background: 'white' })).toBe(0);
  });

  it('exposes default and max constants', () => {
    expect(TAPE_TYPE_DEFAULT).toBe(0);
    expect(TAPE_TYPE_MAX).toBe(12);
  });
});
