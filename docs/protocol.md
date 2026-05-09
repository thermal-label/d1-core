# D1 Tape Protocol

The wire protocol of DYMO's D1 tape printers — every standalone
LabelManager / LabelPoint chassis and the tape engine on the
LabelWriter Duo (`engine.protocol === 'd1-tape'`). The encoder lives
in `@thermal-label/d1-core` and is consumed by both the
`@thermal-label/labelmanager` and `@thermal-label/labelwriter`
drivers.

::: tip Related pages

- [LabelManager](../labelmanager/) — devices, transports, picker.
- [LabelWriter](../labelwriter/) — devices, transports, the Duo's
  tape side routes through this protocol.
  :::

## Chassis tiers

D1 chassis come in three mechanical width tiers; each accepts every
smaller cassette as well. The driver's `engine.mediaCompatibility`
declares the tier, and pickers filter cartridges accordingly.

| Tier  | Sizes accepted (mm)    | Example chassis                                     |
| ----- | ---------------------- | --------------------------------------------------- |
| 12 mm | 6 / 9 / 12             | LM PnP, LM PC, LabelPoint 350, MobileLabeler        |
| 19 mm | + 19                   | LM 420P, LM Wireless PnP, LabelWriter Duo (96-dot)  |
| 24 mm | + 24                   | LabelWriter 450 Duo, LabelWriter Duo (128-dot)      |

All D1 devices share Vendor ID **`0x0922`** (DYMO-CoStar Corp.).
Per-model PIDs and verification status live on each driver's
hardware page.

## USB topology

Standalone D1 chassis enumerate as a composite USB device with three
interfaces:

```
Configuration 1
  Interface 0 — Printer class (bInterfaceClass 0x07)
    Endpoint 0x05  OUT   Bulk    (print data)
    Endpoint 0x85  IN    Bulk    (1-byte status response)
  Interface 1 — Mass Storage (vestigial; firmware-update mode)
  Interface 2 — HID (bInterfaceClass 0x03)
    Endpoint 0x01  OUT   Interrupt
    Endpoint 0x81  IN    Interrupt
```

The same byte stream prints correctly on **either** the Printer-class
OUT endpoint **or** the HID OUT endpoint — bench-verified 2026-05-08.
Drivers default to the Printer-class interface because Linux doesn't
bind a kernel driver to it (no `detachKernelDriver` dance) and the
udev story is conventional. HID is a viable alternative transport;
choosing it is a transport-layer concern, not a protocol-layer one.

On the LabelWriter Duo, the tape engine is a **separate USB
interface** alongside the LabelWriter label engine — same vid/pid,
same cable, two endpoints. The Duo is electrically a LabelManager + a
LabelWriter sharing one chassis; the tape side speaks D1 identically
to a standalone LabelManager. See the LabelWriter docs for the Duo's
full interface map.

The encoder produces one contiguous byte stream
(`buildPrinterStream`); the transport layer chunks that stream as
needed for its endpoint's `wMaxPacketSize` (64 bytes for both the bulk
EP 5 and the interrupt EP 1).

### Mode-switch (Linux only)

Several models present as USB Mass Storage on first connect (the
"PLite" / setup partition that ships the Windows installer). To switch
to the printer interface:

1. The host sends a 3-byte vendor-specific message: `1B 5A 01`
   (`ESC Z 01`).
2. The device re-enumerates under its printer-class PID.

| Model            | Mass-storage PID | Printer PID |
| ---------------- | ---------------- | ----------- |
| LabelManager PnP | `0x1001`         | `0x1002`    |
| LabelManager 280 | `0x1005`         | `0x1006`    |

On Linux, this is handled by `usb_modeswitch` plus a udev rule
(driver packages ship generators for both). macOS and Windows
automatically switch to printer mode when the OS driver loads, so no
host-side action is needed.

## Status

Send the single-byte command `1B 41` (`ESC A`) to the OUT endpoint.
The printer replies with **one byte** on the IN endpoint:

| Bit | Set means                |
| --: | ------------------------ |
|   0 | Printer busy / not ready |
|   1 | No tape inserted         |
|   2 | Tape supply low          |

All other bits are reserved and observed as zero.

`ESC A` is a pure status query: it does not cut, it does not advance
the tape, and it does not flush a buffer. D1 firmware **cannot**
detect cassette type — only presence — so callers must always pass
`media` explicitly to `print()` (or rely on the driver's
`DEFAULT_MEDIA` fallback for previews).

## Tape width and head geometry

The print head is a fixed 64-pin column; the printable region depends
on the loaded tape width:

Standalone D1 chassis carry a 64-pin head (12mm and 19mm tiers — 19mm
prints on a centred 12mm strip). The Duo's tape engine doubles up: the
96-dot variant gives the 19mm tier its own headroom, the 128-dot
variant covers 24mm cassettes.

| Tape width | Printable dots | Head     | Top margin (pins) | Bottom margin (pins) |
| ---------- | -------------- | -------- | ----------------- | -------------------- |
| 6 mm       | 32             | 64 / 96 / 128 | 16 / 32 / 48 | 16 / 32 / 48 |
| 9 mm       | 48             | 64 / 96 / 128 | 8 / 24 / 40  | 8 / 24 / 40  |
| 12 mm      | 64             | 64 / 96 / 128 | 0 / 16 / 32  | 0 / 16 / 32  |
| 19 mm      | 64 / 96        | 64 / 96 / 128 | 0 / 0 / 16  | 0 / 0 / 16  |
| 24 mm      | 128            | 128            | 0            | 0            |

The encoder derives raster width from `media.printableDots` (capped
at `engine.headDots`) and centres the bitmap on the head-perpendicular
axis before emitting columns. See `prepareForEmission()` in
`@thermal-label/d1-core`'s `protocol.ts`.

## Opcode vocabulary

The complete D1 vocabulary is **`ESC A` through `ESC E`** plus the
`SYN` data opcode. Anything else is unrecognised by the firmware;
some unrecognised opcodes silently corrupt the parser state and brick
the device until power-cycle. Don't experiment in production code.

| Opcode  | Bytes      | Meaning                                                           |
| ------- | ---------- | ----------------------------------------------------------------- |
| `SYN`   | `16` + N   | Print one row (or, with `ESC D 0` set, advance one row).          |
| `ESC A` | `1B 41`    | Status query — see [Status](#status).                             |
| `ESC B` | `1B 42 N`  | Set bias offset (`dot_tab`). Unused by this driver.               |
| `ESC C` | `1B 43 n`  | Set tape type / colour palette (`n = 0..12`, see [`ESC C n`](#esc-c-n--set-tape-type)). |
| `ESC D` | `1B 44 N`  | Set bytes-per-line. `ESC D 0` enables MLF skip-line mode.         |
| `ESC E` | `1B 45`    | Cut. Drives the blade on motorised-cutter chassis; no-op on manual-cutter chassis. Emitted by the encoder only when `engine.capabilities.autocut` is set. |

## Print job structure

A complete job is a single byte stream sent to the device's OUT
endpoint, repeated once per copy:

```
[per copy]
  ESC C n           — set tape type / colour palette (n = 0..12)
  [if leading skip:  ESC D 0 + N × SYN]   — chassis dead-zone
  ESC D N           — set bytes-per-line for content (N = ceil(rasterDots / 8))
  [for each row]
    SYN row…        — one column of pixel data
  [if trailing skip: ESC D 0 + N × SYN]   — post-print tape advance
  [if autocut:       ESC E]               — cut tape (autocut chassis only)
  ESC A             — status query (ends the job)
```

Leading and trailing tape advance are emitted as **zero-payload SYN
rows** against `ESC D 0` (the "MLF skip-lines" pattern from labelle's
`_skip_lines` helper). Each bare `0x16` byte advances one dot row with
no printed payload — same physical feed as a blank padded row but at
1 byte per row instead of `1 + bytesPerLine`.

All values are hexadecimal. Each opcode is described below.

### `ESC C n` — set tape type

```
1B 43 nn
```

`n` selects the tape-type / colour palette (the cassette's text +
substrate combination); the firmware uses it to pick the right strobe
profile / heat-sensitivity curve. The byte is **host-declared** —
LabelManager firmware can detect cassette presence but **not** type,
so the host has to tell it what's loaded (normally via the user's
media selection). The byte does **not** change the printed ink (ink
is determined by the cassette itself); but the matching value gives
correct heat calibration and noticeably better print quality on
coloured / reverse-print substrates. Sending `0` when the user hasn't
selected a cartridge is safe.

Spec table per `LabelWriter 400 Series Technical Reference` p.24
(LabelManager firmware uses the same table; the protocol is shared
D1):

|  n  | Combination                  |  n  | Combination                |
| --: | ---------------------------- | --: | -------------------------- |
| `0` | Black on white or clear      | `7` | Black on fluorescent green |
| `1` | Black on blue                | `8` | Black on fluorescent red   |
| `2` | Black on red                 | `9` | White on clear             |
| `3` | Black on silver              | `10`| White on black             |
| `4` | Black on yellow              | `11`| Blue on white or clear     |
| `5` | Black on gold                | `12`| Red on white or clear      |
| `6` | Black on green               |     |                            |

The encoder derives `n` from the user-selected media's `text` /
`background` colours via `tapeTypeFor(media)`; callers can override
via `D1PrintOptions.tapeType` (or the driver-side equivalent
— `LabelManagerPrintOptions.tapeType`, the LabelWriter Duo media's
pre-computed `tapeColour`). When neither is supplied, `n` defaults
to `0`.

Always send this **before** the bytes-per-line command. Sent once per
copy (not per row).

### `ESC D N` — set bytes-per-line

```
1B 44 N
```

`N` is the number of payload bytes that will follow each `SYN` opcode,
computed as `ceil(rasterDots / 8)` where `rasterDots` is the
cartridge-printable dot count (`media.printableDots`, capped by
`engine.headDots`) — `4` bytes for 6 mm tape, `6` for 9 mm, `8` for
12/19 mm on the 64-pin LabelManager head, `16` for 24 mm on the
128-pin Duo tape head.

`ESC D 0` is a special case used for skip-lines: each subsequent
`SYN` byte feeds one dot row with **zero** payload bytes. Re-issue
`ESC D N` to return to printing.

### `SYN <row bytes>` — raster row (one column)

```
16 b0 b1 ... b(N-1)
```

`0x16` is the SYN opcode. The `N` payload bytes carry one column of
pixel data, MSB-first within each byte. Bit 7 of `b0` is the topmost
pin; bit 0 of `b(N-1)` is the bottommost pin (or one of the inactive
margin pins, depending on tape width).

D1 tape printers feed the tape **forward by one column per row** — the
"row" axis in the byte stream is along the feed direction, not across
the head. The driver rotates landscape input 90° clockwise via
`pickRotation` before emission.

### `ESC A` — status query (job terminator)

```
1B 41
```

Acts as a non-destructive status read; the printer replies with a
1-byte status on the IN endpoint (see [Status](#status)). Used at the
end of every job by convention, but the firmware will accept and print
the preceding stream regardless. Cutting and tape advance are handled
by the opcodes above, not by `ESC A`.

## Encoder + transport split

`@thermal-label/d1-core` produces **one** contiguous byte stream — the
order of opcodes in [Print job structure](#print-job-structure) is
fixed.

| Function             | Output       | Notes                                       |
| -------------------- | ------------ | ------------------------------------------- |
| `buildPrinterStream` | `Uint8Array` | Full job stream (per `D1PrintOptions`)       |

The transport layer (in each driver package) is responsible for
shipping that stream: chunking to the endpoint's `wMaxPacketSize` (64
bytes for both the bulk Printer-class endpoint and the HID interrupt
endpoint), inserting inter-chunk delays, and selecting the target
interface. Standalone LabelManager drivers default to the
Printer-class interface (IF 0, EP 5 OUT); the HID interface (IF 2,
EP 1 OUT) is a valid alternative that requires detaching `usbhid`
first. The LabelWriter Duo's tape engine routes via its own USB
interface, separate from the label-side endpoint.

## Flow control (synwait)

For long labels, the host can outrun the printer's internal buffer. The
firmware exposes a `synwait`-style flow-control loop:

1. Send `ESC A` (status query).
2. Wait for the 1-byte status response on EP `0x85` IN.
3. Send the next chunk — at most `synwait = 64` `SYN` commands.
4. Repeat.

The current Node.js driver does **not** implement synwait — it streams
the entire job with a 5 ms inter-chunk delay. In practice this works
reliably for text labels up to several hundred columns. Image labels
longer than ~200 columns can hit `LIBUSB_ERROR_TIMEOUT`; implementing
synwait would fix this. A minimal sketch:

```ts
const SYNWAIT = 64;
const STATUS_QUERY = Buffer.from([0x1b, 0x41]);

async function writeWithSynwait(stream: Uint8Array, transport: Transport) {
  let pos = 0;
  while (pos < stream.length) {
    await transport.write(STATUS_QUERY);
    await transport.read(64);

    let synCount = 0;
    let end = pos;
    while (end < stream.length && synCount < SYNWAIT) {
      if (stream[end] === 0x16) synCount++;
      end++;
    }
    await transport.write(Buffer.from(stream.subarray(pos, end)));
    pos = end;
  }
}
```

## WebUSB

The browser package uses the WebUSB API to target the Printer-class
interface:

```ts
device.open()
  → device.selectConfiguration(1)
  → device.claimInterface(0)        // Printer class
  → device.transferOut(5, chunk)    // 64-byte chunks
  → device.transferIn(5, 1)         // 1-byte status reply
```

WebUSB requires a secure context (`https://` or `localhost`). Mode-switch
is not possible from the browser — devices stuck in mass-storage mode
are filtered out at discovery and surface a "set up via the desktop
installer first" message.

WebHID against the HID interface (IF 2) is also viable in principle —
the same byte stream prints there — but the package doesn't currently
expose that path.

## References

- [`labelle`](https://github.com/labelle-org/labelle) — Python driver
  for the same hardware family. Primary reference for the D1 opcode
  set (`ESC C` / `ESC D` / `SYN` / `ESC E` / `ESC A`), the MLF
  skip-lines pattern, and synwait flow control.
- [`dymoprint`](https://github.com/computerlyrik/dymoprint) — Python
  predecessor of labelle (deprecated 2023). Original reverse-engineering
  effort; PR #56 documents the migration from raw HID file I/O to
  PyUSB.
- Implementation:
  - `@thermal-label/d1-core` `src/protocol.ts` — encoder.
  - `@thermal-label/d1-core` `src/status.ts` — status-byte parser.
  - `@thermal-label/d1-core` `src/tape-type.ts` — `ESC C` selector.
  - `@thermal-label/labelmanager-node` `src/printer.ts` — chunked USB
    write loop for the standalone LabelManager chassis.
  - `@thermal-label/labelwriter-node` `src/printer.ts` — chunked USB
    write loop, dispatching the Duo's tape engine through this
    encoder.
