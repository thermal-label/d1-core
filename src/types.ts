import type { MediaDescriptor } from '@thermal-label/contracts';

/**
 * D1 substrate family. Picker / preview UX hint — the rasterizer does
 * not branch on this. The `rhino-*` values cover DYMO's industrial
 * Rhino™ cartridge line.
 */
export type D1Material =
  | 'standard'
  | 'permanent-polyester'
  | 'flexible-nylon'
  | 'durable'
  | 'rhino-vinyl'
  | 'rhino-permanent-polyester'
  | 'rhino-flexible-nylon'
  | 'rhino-heat-shrink'
  | 'rhino-non-adhesive-tag'
  | 'rhino-self-laminating';

/**
 * D1 tape media descriptor — minimum shape needed by the encoder.
 *
 * Driver-side media types (LabelManager's `LabelManagerMedia`,
 * LabelWriter's tape media) extend this with family-specific
 * narrowing or additional UX fields. The encoder itself only reads
 * `printableDots`, `text`, and `background`.
 *
 * - `printableDots` — cartridge-printable raster width in dots.
 *   Encoder uses this to size `ESC D N` (bytes-per-line) when present.
 * - `text` / `background` — symbolic colour names used by
 *   `tapeTypeFor()` to derive the `ESC C n` palette selector.
 *
 * Catalogued entries (`D1_MEDIA` from `media.generated.ts`) populate
 * every field; user-constructed media for the encoder may pass a
 * subset (any field absent falls back to `engine.headDots` /
 * `tapeTypeFor` defaults).
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
  /** D1 substrate family (UX hint). */
  material?: D1Material;
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
