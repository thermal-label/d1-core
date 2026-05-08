import type { PrinterError, PrinterStatus } from '@thermal-label/contracts';

/**
 * Single-byte status request — `ESC A`.
 *
 * The reply is one byte. Same opcode, same shape on every D1 device.
 */
export const STATUS_REQUEST = new Uint8Array([0x1b, 0x41]);

/**
 * Parse a D1 1-byte status reply.
 *
 * Bit layout:
 *   bit 0 — busy / not ready
 *   bit 1 — no tape inserted
 *   bit 2 — tape supply low
 *
 * `detectedMedia` is always `undefined` — D1 firmware can detect
 * cassette **presence** but not **type**. Callers must pass media
 * explicitly to `print()` / `createPreview()`.
 */
export function parseStatus(bytes: Uint8Array): PrinterStatus {
  const status = bytes[0] ?? 0;
  const ready = (status & 0b00000001) === 0;
  const tapeInserted = (status & 0b00000010) === 0;
  const labelLow = (status & 0b00000100) !== 0;

  const errors: PrinterError[] = [];
  if (!ready) errors.push({ code: 'not_ready', message: 'Printer busy' });
  if (!tapeInserted) errors.push({ code: 'no_media', message: 'No tape inserted' });
  if (labelLow) errors.push({ code: 'low_media', message: 'Tape supply low' });

  return {
    ready,
    mediaLoaded: tapeInserted,
    errors,
    rawBytes: bytes,
  };
}
