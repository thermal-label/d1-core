import type { MediaDescriptor } from '@thermal-label/contracts';

/**
 * D1 tape media descriptor — minimum shape needed by the encoder.
 *
 * Driver-side media types (LabelManager's `LabelManagerMedia`,
 * LabelWriter's tape media) extend this with family-specific fields
 * (substrate `material`, marketing names, SKU mappings). The encoder
 * itself only reads `printableDots`, `text`, and `background`.
 *
 * - `printableDots` — cartridge-printable raster width in dots.
 *   Encoder uses this to size `ESC D N` (bytes-per-line) when present.
 * - `text` / `background` — symbolic colour names used by
 *   `tapeTypeFor()` to derive the `ESC C n` palette selector.
 */
export interface D1Media extends MediaDescriptor {
  /** Cartridge-printable raster width in dots. */
  printableDots?: number;
  /** Bytes-per-line (`ceil(printableDots / 8)`). Convenience mirror of `printableDots`. */
  bytesPerLine?: number;
  /** Tape width in mm — informational; the encoder reads `printableDots`. */
  tapeWidthMm?: number;
  /** Printed ink colour, named (the only ink the cassette carries). */
  text?: string;
  /** Substrate colour, named. */
  background?: string;
}

/**
 * Print-time options understood by `buildPrinterStream`.
 *
 * `tapeType` is the `ESC C` palette selector (0..12), host-declared
 * (see `tape-type.ts`). When omitted, the encoder derives it from the
 * supplied media via `tapeTypeFor()`. Driver-side options interfaces
 * extend this with family-specific fields (`density`, `tapeWidth`,
 * `rotate`, etc.).
 */
export interface D1PrintOptions {
  copies?: number;
  tapeType?: number;
}
