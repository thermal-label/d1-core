# Interface: D1PrintOptions

Print-time options understood by `buildPrinterStream`.

`tapeType` is the `ESC C` palette selector (0..12), host-declared
(see `tape-type.ts`). When omitted, the encoder derives it from the
supplied media via `tapeTypeFor()`. Driver-side options interfaces
extend this with family-specific fields (`density`, `tapeWidth`,
`rotate`, etc.).

## Properties

| Property | Type |
| ------ | ------ |
| <a id="property-copies"></a> `copies?` | `number` |
| <a id="property-tapetype"></a> `tapeType?` | `number` |
