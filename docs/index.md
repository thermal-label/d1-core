# @thermal-label/d1-core

Shared D1 tape-protocol primitives for the DYMO LabelManager and
LabelWriter Duo (tape side) drivers.

The D1 protocol is `ESC A..E` plus `SYN` (per the LW 400 Series Tech
Ref and on-the-wire analysis). Both standalone LabelManager chassis
and the LabelWriter Duo's tape engine speak it; this package
centralises the encoder, status parser, tape-type table, and the
shared cassette catalogue so both drivers stay byte-for-byte aligned.

## Pages

- [D1 tape protocol](./protocol) — wire format, opcode reference,
  USB topology, mode-switch, status, transport split.

## API surface

- `buildPrinterStream(bitmap, engine, options, media)` — encode a
  print job to a contiguous USB Printer-class byte stream.
- `parseStatus(bytes)` + `STATUS_REQUEST` — single-byte D1 status
  decoder (same shape on every D1 device).
- `tapeTypeFor(media)` + `TAPE_TYPE_DEFAULT` / `TAPE_TYPE_MAX` — map a
  user-selected media's `text` / `background` colours to the
  `ESC C n` selector (0..12). Host-declared: D1 firmware can detect
  cassette **presence** but not **type**.
- `D1_MEDIA` / `D1_MEDIA_LIST` — the unified D1 cassette catalogue
  (71 entries today: standard + Permanent Polyester + Flexible Nylon
  + Durable + Rhino-vinyl / -permanent / -flexible / -heat-shrink /
  -non-adhesive). 24 mm Standard included for the 128-dot Duo tier.
  Missing: 24 mm Rhino, Self-Laminating Rhino — pending authoritative
  SKU sources.

## Status

Pre-publish. Driver repos consume via `link:../d1-core` overrides
while the API stabilises. Will be published to npm with the first
stable release of the consuming drivers.
