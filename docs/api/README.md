# @thermal-label/d1-core

## Interfaces

| Interface | Description |
| ------ | ------ |
| [D1Media](interfaces/D1Media.md) | D1 tape media descriptor — minimum shape needed by the encoder. |
| [D1PrintOptions](interfaces/D1PrintOptions.md) | Print-time options understood by `buildPrinterStream`. |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [D1Material](type-aliases/D1Material.md) | D1 substrate family. Picker / preview UX hint — the rasterizer does not branch on this. The `rhino-*` values cover DYMO's industrial Rhino™ cartridge line. |
| [D1MediaKey](type-aliases/D1MediaKey.md) | - |

## Variables

| Variable | Description |
| ------ | ------ |
| [D1\_MEDIA](variables/D1_MEDIA.md) | - |
| [D1\_MEDIA\_LIST](variables/D1_MEDIA_LIST.md) | - |
| [D1\_TAPE\_12MM](variables/D1_TAPE_12MM.md) | Canonical 12 mm Black-on-White cartridge — picker default. |
| [D1\_TAPE\_19MM](variables/D1_TAPE_19MM.md) | Canonical 19 mm Black-on-White cartridge — picker default. |
| [D1\_TAPE\_24MM](variables/D1_TAPE_24MM.md) | Canonical 24 mm Black-on-White cartridge — picker default. |
| [D1\_TAPE\_6MM](variables/D1_TAPE_6MM.md) | Canonical 6 mm Black-on-White cartridge — picker default. |
| [D1\_TAPE\_9MM](variables/D1_TAPE_9MM.md) | Canonical 9 mm Black-on-White cartridge — picker default. |
| [STATUS\_REQUEST](variables/STATUS_REQUEST.md) | Status request — `ESC A`. |
| [TAPE\_TYPE\_DEFAULT](variables/TAPE_TYPE_DEFAULT.md) | `ESC C n` — D1 tape-type / colour-palette selector. |
| [TAPE\_TYPE\_MAX](variables/TAPE_TYPE_MAX.md) | - |

## Functions

| Function | Description |
| ------ | ------ |
| [buildPrinterStream](functions/buildPrinterStream.md) | Build a raw byte stream for the USB Printer-class endpoint. |
| [findAllD1MediaByTapeWidth](functions/findAllD1MediaByTapeWidth.md) | Find every catalogued cartridge for a given tape width. |
| [findD1MediaById](functions/findD1MediaById.md) | Look up an entry by its kebab-case `id`. Convenience for callers that have an id in hand and want the full descriptor without iterating the keyed registry. |
| [findD1MediaByTapeWidth](functions/findD1MediaByTapeWidth.md) | Find the canonical Black-on-White cartridge for a given tape width. |
| [parseStatus](functions/parseStatus.md) | Parse a D1 status reply (8 bytes; only byte 0 used). |
| [tapeTypeFor](functions/tapeTypeFor.md) | Map the user-selected media's text + background colours to the ESC C selector (0..12). Unknown / unenumerated combinations and `undefined` media both return `0`, the safe fallback (the cassette's ink prints regardless of the byte sent). |
