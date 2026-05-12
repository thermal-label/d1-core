# Interface: D1Media

D1 tape media descriptor — minimum shape needed by the encoder.

Driver-side media types (LabelManager's `LabelManagerMedia`,
LabelWriter's tape media) extend this with family-specific
narrowing or additional UX fields. The encoder itself only reads
`printableDots`, `text`, and `background`.

- `printableDots` — cartridge-printable raster width in dots.
  Encoder uses this to size `ESC D N` (bytes-per-line) when present.
- `text` / `background` — symbolic colour names used by
  `tapeTypeFor()` to derive the `ESC C n` palette selector.

Catalogued entries (`D1_MEDIA` from `media.generated.ts`) populate
every field; user-constructed media for the encoder may pass a
subset (any field absent falls back to `engine.headDots` /
`tapeTypeFor` defaults).

## Extends

- [`MediaDescriptor`](/contracts/api/interfaces/MediaDescriptor)

## Properties

| Property | Modifier | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-background"></a> `background?` | `public` | `string` | Substrate colour, named. | - |
| <a id="property-bytesperline"></a> `bytesPerLine?` | `public` | `number` | Bytes-per-line (`ceil(printableDots / 8)`). Convenience mirror of `printableDots`. | - |
| <a id="property-category"></a> `category?` | `public` | \| `"address"` \| `"shipping"` \| `"file-folder"` \| `"multi-purpose"` \| `"name-badge"` \| `"barcode"` \| `"price-tag"` \| `"continuous"` \| `"cartridge"` \| `"tape"` \| `"die-cut"` | Coarse category for grouping in docs and UI. Driver-extensible; common values listed for cross-driver consistency. | `MediaDescriptor.category` |
| <a id="property-cornerradiusmm"></a> `cornerRadiusMm?` | `public` | `number` | Corner radius (mm) of die-cut labels with rounded corners. Only meaningful for die-cut media. Undefined or `0` = sharp corners. For round labels, set this to `widthMm / 2` so the rounded rectangle degenerates to a circle. | `MediaDescriptor.cornerRadiusMm` |
| <a id="property-defaultorientation"></a> `defaultOrientation?` | `public` | `"horizontal"` \| `"vertical"` | Hint for how the user is expected to author content for this media. Drives the auto-rotate decision in `print()`: - `'horizontal'` — long axis horizontal when reading (landscape). Driver rotates 90° in the family-specific direction when input matches landscape dimensions. Examples: 89×28 mm address labels, 12 mm narrow tape with a name on it. - `'vertical'` — long axis vertical when reading (portrait). Driver passes through. - `undefined` — driver passes through. Recommended for continuous wide tape (62 mm) where users may go either way. | `MediaDescriptor.defaultOrientation` |
| <a id="property-heightmm"></a> `heightMm?` | `public` | `number` | Physical height/length in mm. - Undefined = continuous (variable length; printer cuts to content). - A number = fixed length (die-cut labels, tape segments). | `MediaDescriptor.heightMm` |
| <a id="property-id"></a> `id` | `public` | `string` \| `number` | Unique identifier within the driver family. | `MediaDescriptor.id` |
| <a id="property-material"></a> `material?` | `public` | [`D1Material`](../type-aliases/D1Material.md) | D1 substrate family (UX hint). | - |
| <a id="property-name"></a> `name` | `public` | `string` | Human-readable name, e.g. `"62mm continuous"` or `"DK-22251"`. | `MediaDescriptor.name` |
| <a id="property-palette"></a> `palette?` | `public` | readonly [`PaletteEntry`](/contracts/api/interfaces/PaletteEntry)[] | Inks this media supports, beyond the implicit white substrate. - Undefined = single-colour black-on-white. Driver renders via `renderImage` (luminance threshold + optional dither). - Defined = multi-plane media. Driver renders via `renderMultiPlaneImage` with this palette. For DK-22251 (the only multi-ink media we ship today): `[{ name: 'black', rgb: [0, 0, 0] }, { name: 'red', rgb: [255, 0, 0] }]` | `MediaDescriptor.palette` |
| <a id="property-printabledots"></a> `printableDots?` | `public` | `number` | Cartridge-printable raster width in dots. | - |
| <a id="property-printmargins"></a> `printMargins?` | `public` | \{ `bottomMm`: `number`; `leftMm`: `number`; `rightMm`: `number`; `topMm`: `number`; \} | Insets (mm) inside the media bounds where the printer may clip a design (paper-feed tolerance, head edges, die-cut slack). Informational — for label designers and previews. Drivers do not enforce these; protocol-level margins (head pin offsets, head-dot fitting) are handled separately by family-specific fields. When present, all four edges are required (pass `0` where there is no margin). Omit the whole field when the entire media area is safe to design within. | `MediaDescriptor.printMargins` |
| `printMargins.bottomMm` | `readonly` | `number` | - | - |
| `printMargins.leftMm` | `readonly` | `number` | - | - |
| `printMargins.rightMm` | `readonly` | `number` | - | - |
| `printMargins.topMm` | `readonly` | `number` | - | - |
| <a id="property-skus"></a> `skus?` | `public` | readonly `string`[] | Vendor SKUs for this media — e.g. Dymo `'30321'` / `'S0722400'`, Brother `'DK-22251'`. Mixed formats allowed; the registry does no validation. Used by docs (per-device "supported media" table) and by UI consumers that let users search by SKU. | `MediaDescriptor.skus` |
| <a id="property-tapewidthmm"></a> `tapeWidthMm?` | `public` | `number` | Tape width in mm — informational; the encoder reads `printableDots`. | - |
| <a id="property-targetmodels"></a> `targetModels?` | `public` | readonly `string`[] | Devices this media is compatible with. Driver-defined string set; matched against `PrintEngine.mediaCompatibility`. Examples: `['standard']` (paper roll fits 672-dot heads), `['4xl', '5xl']` (wide-head only), `['duo']` (D1 cartridges). Omit = fits every device in the family. | `MediaDescriptor.targetModels` |
| <a id="property-text"></a> `text?` | `public` | `string` | Printed ink colour, named (the only ink the cassette carries). | - |
| <a id="property-type"></a> `type` | `public` | `string` | Media type classification — driver-specific string values. Common values: `'continuous'`, `'die-cut'`, `'tape'`. Drivers may define additional values as needed. | `MediaDescriptor.type` |
| <a id="property-widthmm"></a> `widthMm` | `public` | `number` | Physical width in mm. | `MediaDescriptor.widthMm` |
