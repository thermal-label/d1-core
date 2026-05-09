import type { PrinterError, PrinterStatus } from '@thermal-label/contracts';

/**
 * Status request — `ESC A`.
 *
 * Per LW Tech Ref: returns 8 status bytes. Only byte 0 carries the
 * status info (the remaining 7 bytes are reserved / firmware-internal
 * state and vary noisily across reads). LW Duo paper side and
 * standalone LabelManager chassis share this opcode and the
 * byte 0 layout.
 */
export const STATUS_REQUEST = new Uint8Array([0x1b, 0x41]);

/**
 * Parse a D1 status reply (8 bytes; only byte 0 used).
 *
 * Bit layout in byte 0 — bench-confirmed (LM_PNP, 2026-05-09):
 *
 *   bit 6 — cassette detection (set = inserted)
 *   bit 4 — cutter jammed (may not fire on manual cutters)
 *   bit 2 — general error (1 = error, 0 = no error)
 *
 * Other bits reserved / unobserved. Bench captures:
 *   loaded + ready → 0x40 (bit 6 only)
 *   no media       → 0x00
 *
 * Earlier versions of this parser used `bit 1 = no tape` derived
 * from a spec snippet; LM_PNP wire shows that bit doesn't toggle
 * on cassette removal. Bit 6 is the actual indicator.
 *
 * `detectedMedia` is always `undefined` — D1 firmware can detect
 * cassette **presence** but not **type**. Callers must pass media
 * explicitly to `print()` / `createPreview()`.
 */
export function parseStatus(bytes: Uint8Array): PrinterStatus {
  const status = bytes[0] ?? 0;
  const mediaLoaded = (status & 0b01000000) !== 0; // bit 6
  const cutterJam = (status & 0b00010000) !== 0; // bit 4
  const generalError = (status & 0b00000100) !== 0; // bit 2

  const errors: PrinterError[] = [];
  if (!mediaLoaded) errors.push({ code: 'no_media', message: 'No tape inserted' });
  if (cutterJam) errors.push({ code: 'paper_jam', message: 'Cutter jammed' });
  // Surface the catch-all only when neither of the more-specific
  // signals fired — otherwise we'd double-report the same condition.
  if (generalError && !cutterJam && mediaLoaded) {
    errors.push({ code: 'printer_error', message: 'Printer reported an error' });
  }

  return {
    ready: errors.length === 0,
    mediaLoaded,
    errors,
    rawBytes: bytes,
  };
}
