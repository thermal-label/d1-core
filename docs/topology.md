# Chassis and USB topology

How D1 devices present on a USB bus: which chassis exist, what
interfaces and endpoints they enumerate, the Linux-only mode-switch
dance, head pin counts per cassette tier, and the WebUSB claim
sequence.

The wire protocol itself lives in [D1 tape protocol](/d1-core/protocol).

## Chassis tiers

D1 chassis come in three mechanical width tiers; each accepts every
smaller cassette as well.

| Tier  | Sizes accepted (mm)    | Example chassis                                     |
| ----- | ---------------------- | --------------------------------------------------- |
| 12 mm | 6 / 9 / 12             | LM PnP, LM PC, LabelPoint 350, MobileLabeler        |
| 19 mm | + 19                   | LM 420P, LM Wireless PnP, LabelWriter Duo (96-dot)  |
| 24 mm | + 24                   | LabelWriter 450 Duo, LabelWriter Duo (128-dot)      |

All D1 devices share Vendor ID **`0x0922`** (DYMO-CoStar Corp.).

There are two USB topologies that carry D1: standalone LabelManager
chassis, and the LabelWriter Duo (composite label-plus-tape device).
Both share Vendor ID `0x0922`.

### Standalone LabelManager

Composite USB device with three interfaces. Per-model PIDs are
listed in [Mode-switch](#mode-switch-linux-only).

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
OUT endpoint **or** the HID OUT endpoint. The Printer-class interface
is the conventional choice on Linux (no kernel driver bound); HID is
a valid alternative transport. Both endpoints carry
`wMaxPacketSize = 64`.

### LabelWriter Duo

The Duo is electrically a LabelWriter and a LabelManager sharing one
chassis. Single USB device, single vid/pid, with two
printer-class interfaces — the label side and the tape side enumerate
side by side and are claimed independently.

| Model                     | PID      | Tape head |
| ------------------------- | -------- | --------: |
| LabelWriter 450 Duo       | `0x0023` |       128 |
| LabelWriter Duo (96-dot)  | `0x0017` |        96 |
| LabelWriter Duo (128-dot) | `0x001d` |       128 |

```
Configuration 1
  Interface 0 — Printer class (lw-raster label engine, 672-dot head)
    Bulk OUT / Bulk IN
  Interface 1 — Printer class (d1-tape engine, 128-dot head; 96-dot on LW_DUO_96)
    Bulk OUT / Bulk IN
```

The tape side speaks D1 identically to a standalone LabelManager —
same `ESC A..E` + `SYN` vocabulary, same 1-byte status reply, same
`wMaxPacketSize = 64`. Only the head pin count and the interface
number change. The label side speaks `lw-raster`, a different protocol
documented separately.

Mode-switch is **not** required for the Duo — it presents as the
composite printer-class device from boot.

## Mode-switch (Linux only)

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

On Linux, this is handled by `usb_modeswitch` plus a udev rule.
macOS and Windows automatically switch to printer mode when the OS
driver loads, so no host-side action is needed.

## Tape width and head geometry

Each cassette has a fixed maximum number of printable dots; the
host sends [`ESC D`](/d1-core/protocol#esc-d-—-set-bytes-per-line) `N`
bytes per row, where `N = ceil(maxDots / 8)`:

| Tape width | Max dots | `ESC D` N |
| ---------- | -------: | --------: |
| 6 mm       |       32 |         4 |
| 9 mm       |       48 |         6 |
| 12 mm      |       64 |         8 |
| 19 mm      |       96 |        12 |
| 24 mm      |      128 |        16 |

A head can't address more dots than its pin count. On a 64-pin head,
19 mm and 24 mm cassettes print on a centred 64-dot strip
(`ESC D 8`); the wider tape lives outside the print region. The
Duo's 96-dot head reaches the full 19 mm width; its 128-dot head
adds 24 mm.

[`ESC B`](/d1-core/protocol#esc-b-—-dot-tab-bias-offset) (Dot Tab)
centres a narrower cassette on a wider head — the value is the
left-side excess in bytes:

| Tape width | 64-dot head | 96-dot head | 128-dot head |
| ---------- | ----------: | ----------: | -----------: |
| 6 mm       |           2 |           4 |            6 |
| 9 mm       |           1 |           3 |            5 |
| 12 mm      |           0 |           2 |            4 |
| 19 mm      |           — |           0 |            2 |
| 24 mm      |           — |           — |            0 |

So a 12 mm cassette on the 128-dot Duo head wants `ESC D 8` plus
`ESC B 4`, landing 32 pixels in from the left edge of the head.

## WebUSB

WebUSB is supported as a transport for D1. The interface to claim
depends on the chassis — D1 lives on **Interface 0** on a standalone
LabelManager and on **Interface 1** on a LabelWriter Duo.

Standalone LabelManager:

```
device.open()
  → device.selectConfiguration(1)
  → device.claimInterface(0)        // Printer class
  → device.transferOut(5, chunk)    // 64-byte chunks → EP 5 OUT
  → device.transferIn(5, 1)         // 1-byte status reply ← EP 5 IN
```

LabelWriter Duo (tape side):

```
device.open()
  → device.selectConfiguration(1)
  → device.claimInterface(1)        // tape engine
  → device.transferOut(<ep>, chunk) // 64-byte chunks → IF 1 bulk OUT
  → device.transferIn(<ep>, 1)      // 1-byte status reply ← IF 1 bulk IN
```

The label side of the same Duo chassis lives on Interface 0 and
speaks `lw-raster`; only the tape side is D1. Each interface is claimed
independently — a host that drives both engines holds two claims on
the same `USBDevice`.

WebUSB requires a secure context (`https://` or `localhost`).
Mode-switch is not possible from the browser; standalone LabelManager
chassis stuck in mass-storage mode require desktop-side setup first.
The Duo does not need mode-switch.

WebHID against the LabelManager's IF 2 (EP 1 OUT / EP 0x81 IN) prints
the same byte stream — the protocol does not distinguish the two
transports.
