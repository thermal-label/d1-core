# @thermal-label/d1-core

Shared D1 tape-protocol primitives — the wire-format encoder, status-byte
parser, and tape-type / colour-palette table — for the DYMO LabelManager
and LabelWriter Duo (tape side) drivers.

The D1 protocol is `ESC A..E` plus `SYN` (per the LW 400 Series Tech Ref
and on-the-wire analysis). Both the standalone LabelManager chassis and
the LabelWriter Duo's tape engine speak it; this package centralises the
encoder so both drivers stay byte-for-byte aligned.

## What's here

- `buildPrinterStream(bitmap, engine, options, media)` — encode a print
  job to a contiguous USB Printer-class byte stream.
- `parseStatus(bytes)` + `STATUS_REQUEST` — single-byte D1 status
  decoder. Same shape on every D1 device.
- `tapeTypeFor(media)` + `TAPE_TYPE_DEFAULT` / `TAPE_TYPE_MAX` — map a
  user-selected media's `text` / `background` colours to the `ESC C n`
  selector (0..12) per LW 400 Series Tech Ref p.24. Host-declared:
  D1 firmware can detect cassette **presence** but not **type**.

## Status

Pre-publish. Driver repos consume via `link:../d1-core` overrides while
the API stabilises. Will be published to npm with the first stable
release of the consuming drivers.
