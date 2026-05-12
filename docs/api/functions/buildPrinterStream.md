# Function: buildPrinterStream()

```ts
function buildPrinterStream(
   bitmap: LabelBitmap, 
   engine: PrintEngine, 
   options?: D1PrintOptions, 
   media?: D1Media): Uint8Array;
```

Build a raw byte stream for the USB Printer-class endpoint.

Wire shape per copy:
  ESC C n
  [if leading skip-lines: ESC D 0 + N × SYN]
  ESC D N (bytes-per-line for content)
  SYN + row × M (content)
  [if trailing skip-lines: ESC D 0 + N × SYN]
  [if engine.capabilities.autocut: ESC E]
  ESC A

`n` for `ESC C` is the tape-type / colour-palette selector. The
firmware can't detect cartridge type — the host declares it.
Resolved from `options.tapeType` (explicit override), else
`tapeTypeFor(media)` (user-selected media → palette index), else
`0` (safe fallback). `ESC E` is emitted only when the engine
declares `capabilities.autocut: true`; manual-cutter chassis (every
standalone LabelManager today) skip it.

Leading + trailing tape advance is emitted as bare SYN bytes against
`ESC D 0` (zero bytes-per-line). Each bare SYN advances one dot row
with no payload — same physical feed as a padded blank row but at
1 byte/row instead of `1 + bytesPerLine` bytes/row.

Input bitmap is head-aligned (caller's responsibility — typically
via `pickRotation` + `renderImage`).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `bitmap` | [`LabelBitmap`](/contracts/api/interfaces/LabelBitmap) |
| `engine` | [`PrintEngine`](/contracts/api/interfaces/PrintEngine) |
| `options` | [`D1PrintOptions`](../interfaces/D1PrintOptions.md) |
| `media?` | [`D1Media`](../interfaces/D1Media.md) |

## Returns

`Uint8Array`
