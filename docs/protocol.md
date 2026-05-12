# D1 Tape Protocol

The wire protocol of DYMO's D1 tape printers — every standalone
LabelManager / LabelPoint chassis and the tape engine on the
LabelWriter Duo.

Chassis families, USB topology, mode-switch, and head geometry live in
[Chassis and USB topology](/d1-core/topology). The LabelWriter Duo
pairs this tape engine with the
[LW raster protocol](/labelwriter/protocol/lw-raster) on a second USB
interface (label side).

## Opcode vocabulary

The complete D1 vocabulary is **`ESC A` through `ESC E`** plus the
`SYN` data opcode. Anything else is unrecognised by the firmware;
some unrecognised opcodes silently corrupt the parser state and brick
the device until power-cycle. Don't experiment on hardware you'd
mind losing.

| Opcode                                          | Bytes     | Description                                                |
| ----------------------------------------------- | --------- | ---------------------------------------------------------- |
| [`ESC A`](#esc-a-—-status-query)                | `1B 41`   | Status query.                                              |
| [`ESC B`](#esc-b-—-dot-tab-bias-offset)         | `1B 42 N` | Set Dot Tab bias offset — skip `N` bytes from left.        |
| [`ESC C`](#esc-c-—-set-tape-type)               | `1B 43 n` | Set tape type / colour palette.                            |
| [`ESC D`](#esc-d-—-set-bytes-per-line)          | `1B 44 N` | Set bytes-per-line. `ESC D 0` enables skip-line mode.      |
| [`ESC E`](#esc-e-—-cut)                         | `1B 45`   | Cut.                                                       |
| [`SYN`](#syn-—-raster-row-one-column)           | `16` + N  | Print one row (or, with `ESC D 0`, advance one row).       |

## Print job structure

A complete job is a single byte stream sent to the OUT endpoint,
repeated once per copy:

```
[per copy]
  ESC C n           — set tape type / colour palette (n = 0..12)
  ESC B dotTab      — head-axis bias offset (bytes from left)
  ESC D N           — set bytes-per-line for content (N = ceil(rasterDots / 8))
  [for each row]
    SYN row…        — one column of pixel data
  [if trailing skip: ESC D 0 + N × SYN]   — post-print tape advance
  [if autocut:       ESC E]               — cut tape (autocut chassis only)
  ESC A             — status query (ends the job)
```

Emitting `ESC B` every job (including `dotTab = 0`) is probably a
good idea — the firmware can carry a non-zero margin across jobs, so
an explicit `ESC B 0` resets it.

Trailing tape advance pushes the printed region forward past the
cutter blade so the cut lands on bare tape, not on print. It's
emitted as bare `0x16` SYN bytes against `ESC D 0`: each byte
advances one dot row with no payload — same physical feed as a blank
padded row, at 1 byte per row instead of `1 + bytesPerLine`.

On the LabelManager PnP, 16 mm of trailing advance centres the
printed content between the cut and the head — 8 mm of bare tape on
each side of the print. Exact figures vary by chassis (head-to-cutter
distance is mechanical).

## `ESC A` — status query

```
1B 41
```

A pure status read: no cut, no advance, no buffer flush. Conventionally
emitted at the end of every job, but the firmware will accept and print
the preceding stream regardless.

The printer replies with **one byte** on the IN endpoint:

| Bit  | Mask   | Meaning                                               |
| ---: | -----: | ----------------------------------------------------- |
|    6 | `0x40` | Cassette inserted                                     |
|    4 | `0x10` | Cutter jammed (no-op on manual-cutter chassis)        |
|    2 | `0x04` | General error                                         |

Bits 7, 5, 3, 1, 0 are **ignore**.

Example values: `0x40` idle / ready · `0x00` no cassette · `0x50`
loaded + cutter jam · `0x44` loaded + general error.

D1 firmware reports cassette **presence only**, never type.

## `ESC B` — Dot Tab bias offset

```
1B 42 N
```

Skips `N` **bytes** (i.e. `8 × N` pins) from the left print edge before
each `SYN` row's payload lands on the head. A Dot Tab of 3 starts the
data 24 pixels in.

Useful when printing a narrower cassette on a wider head: instead of
padding `N` zero bytes onto every raster row to centre the bitmap,
set the Dot Tab once and emit only the cassette's printable payload.

Range: `0` … `(headDots / 8) - 1`. Values above the maximum are
clamped at print time, not rejected:

| Head pins | Max `N` |
| --------: | ------: |
|        64 |       7 |
|        96 |      11 |
|       128 |      15 |

See [tape width and head geometry](/d1-core/topology#tape-width-and-head-geometry)
for head-vs-cassette pin counts.

## `ESC C` — set tape type

```
1B 43 nn
```

`n` selects the tape-type / colour palette (the cassette's text +
substrate combination); the firmware uses it to pick the strobe
profile / heat-sensitivity curve. The byte is **host-declared** —
firmware detects cassette presence but **not** type, so the host has
to declare what's loaded. The byte does **not** change the printed
ink (ink is determined by the cassette itself); the matching value
gives correct heat calibration and noticeably better print quality on
coloured / reverse-print substrates. `0` is safe when the cartridge
is unknown.

|  n  | Combination                  |  n  | Combination                |
| --: | ---------------------------- | --: | -------------------------- |
| `0` | Black on white or clear      | `7` | Black on fluorescent green |
| `1` | Black on blue                | `8` | Black on fluorescent red   |
| `2` | Black on red                 | `9` | White on clear             |
| `3` | Black on silver              | `10`| White on black             |
| `4` | Black on yellow              | `11`| Blue on white or clear     |
| `5` | Black on gold                | `12`| Red on white or clear      |
| `6` | Black on green               |     |                            |

Always send this **before** the bytes-per-line command. Sent once per
copy (not per row).

## `ESC D` — set bytes-per-line

```
1B 44 N
```

`N` is the number of payload bytes that will follow each `SYN`
opcode, computed as `ceil(rasterDots / 8)`. The full
head-vs-cassette mapping is in
[tape width and head geometry](/d1-core/topology#tape-width-and-head-geometry):
`4` bytes for 6 mm tape, `8` for 12/19 mm on the 64-pin head, `16`
for 24 mm on the 128-pin Duo tape head.

`ESC D 0` is a special case used for skip-lines: each subsequent
`SYN` byte feeds one dot row with **zero** payload bytes. Re-issue
`ESC D N` to return to printing.

## `ESC E` — cut

```
1B 45
```

Drives the blade on motorised-cutter chassis. No-op on manual-cutter
chassis (the user advances tape with the chassis lever instead).

## `SYN` — raster row (one column)

```
16 b0 b1 ... b(N-1)
```

`0x16` is the SYN opcode. The `N` payload bytes carry one column of
pixel data, MSB-first within each byte. Bit 7 of `b0` is the topmost
pin; bit 0 of `b(N-1)` is the bottommost pin (or one of the inactive
margin pins, depending on tape width).

D1 tape printers feed the tape **forward by one column per row** — the
"row" axis in the byte stream is along the feed direction, not across
the head. Landscape source bitmaps must be rotated 90° clockwise
before emission.

## References

- _LabelWriter 400 Series Printers Technical Reference Manual_ and
  _LabelWriter® 450 Series Printers Technical Reference Manual_,
  DYMO / Sanford. The two manuals carry the same D1 specification
  and agree with each other — `ESC A..E` + `SYN` opcode set,
  Dot Tab semantics, and the tape-type table.
- [`labelle`](https://github.com/labelle-org/labelle) — Python driver
  for the same hardware family. Reference implementation of the D1
  opcode set and the skip-lines pattern.
- [`dymoprint`](https://github.com/computerlyrik/dymoprint) — Python
  predecessor of labelle (deprecated 2023).
