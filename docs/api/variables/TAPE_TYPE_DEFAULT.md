# Variable: TAPE\_TYPE\_DEFAULT

```ts
const TAPE_TYPE_DEFAULT: 0 = 0;
```

`ESC C n` — D1 tape-type / colour-palette selector.

The byte declares which cassette is loaded so the firmware can pick
the right thermal-energy curve. **The firmware cannot detect
cartridge type** — only cassette presence (see `parseStatus` and the
`mediaLoaded` / `detectedMedia` split). The host has to declare it,
normally via the user's media selection passed through to
`tapeTypeFor()`; the firmware trusts whatever value arrives.

The byte does **not** change the printed ink (ink is determined by
the cassette itself); but the matching value gives correct heat
calibration and noticeably better print quality on coloured /
reverse-print substrates. Sending `0` when the user hasn't selected
a cartridge is safe — the cassette's actual ink prints either way.

Spec table per `LabelWriter 400 Series Technical Reference` p.24
(LabelManager firmware uses the same table; the protocol is shared
D1):

  0  Black on white or clear        7  Black on fluorescent green*
  1  Black on blue                  8  Black on fluorescent red*
  2  Black on red                   9  White on clear
  3  Black on silver*              10  White on black
  4  Black on yellow               11  Blue on white or clear
  5  Black on gold*                12  Red on white or clear
  6  Black on green

  * — substrate variants without a catalogued cassette today
      (silver, gold, fluorescent green, fluorescent red). The
      branches below default to 0 for those; add a case here if a
      cassette ever declares one of those backgrounds.
