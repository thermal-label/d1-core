# @thermal-label/d1-core

[![npm version](https://img.shields.io/npm/v/@thermal-label/d1-core.svg)](https://www.npmjs.com/package/@thermal-label/d1-core)
[![CI](https://github.com/thermal-label/d1-core/actions/workflows/ci.yml/badge.svg)](https://github.com/thermal-label/d1-core/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/thermal-label/d1-core/branch/main/graph/badge.svg)](https://codecov.io/gh/thermal-label/d1-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Shared **D1 tape protocol** primitives — wire-format encoder, status-byte
parser, and tape-type / colour-palette tables — for the
[DYMO LabelManager](https://github.com/thermal-label/labelmanager) and
[DYMO LabelWriter Duo (tape side)](https://github.com/thermal-label/labelwriter)
drivers.

The D1 vocabulary is `ESC A..E` plus `SYN` (per the LW 400 Series Tech
Ref and on-the-wire analysis). Both the standalone LabelManager chassis
and the LabelWriter Duo's tape engine speak the same protocol with the
same 1-byte status reply; this package centralises the encoder so both
drivers stay byte-for-byte aligned. The 8-byte status reply that some
DYMO firmware references belongs to the Duo's *label-side*
`lw-450` engine on a separate endpoint and is not D1.

## Install

```bash
pnpm add @thermal-label/d1-core
```

Most users won't depend on this package directly — install the
runtime-flavoured LabelManager or LabelWriter driver instead, which
re-exports the relevant surface.

## Quick start

```ts
import {
  buildPrinterStream,
  parseStatus,
  STATUS_REQUEST,
  tapeTypeFor,
} from '@thermal-label/d1-core';

// engine + media come from the driver's DEVICES + MEDIA tables.
const stream = buildPrinterStream(bitmap, engine, options, media);
// Ship `stream` over the transport. Then poll status:
const reply = await transport.exchange(STATUS_REQUEST);
const status = parseStatus(reply);
```

## What's inside

- `buildPrinterStream(bitmap, engine, options, media)` — encode a print
  job to a contiguous USB Printer-class byte stream.
- `parseStatus(bytes)` + `STATUS_REQUEST` — single-byte D1 status
  decoder. Same shape on every D1 device.
- `tapeTypeFor(media)` + `TAPE_TYPE_DEFAULT` / `TAPE_TYPE_MAX` — map a
  user-selected media's `text` / `background` colours to the `ESC C n`
  selector (0..12) per LW 400 Series Tech Ref p.24. Host-declared:
  D1 firmware detects cassette **presence** but not **type**.

## Consumers

- [`@thermal-label/labelmanager-core`](https://www.npmjs.com/package/@thermal-label/labelmanager-core)
  — standalone LabelManager handheld chassis.
- [`@thermal-label/labelwriter-core`](https://www.npmjs.com/package/@thermal-label/labelwriter-core)
  — LabelWriter Duo composite (tape side).

## Documentation

<https://thermal-label.github.io/d1-core/>

## License

MIT
