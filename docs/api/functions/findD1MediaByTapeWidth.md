# Function: findD1MediaByTapeWidth()

```ts
function findD1MediaByTapeWidth(tapeWidthMm: number): D1Media | undefined;
```

Find the canonical Black-on-White cartridge for a given tape width.

Used by pickers as the default "any 12 mm tape" entry. Returns
`undefined` for widths the catalogue doesn't cover (today: 6, 9,
12, 19, 24).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `tapeWidthMm` | `number` |

## Returns

[`D1Media`](../interfaces/D1Media.md) \| `undefined`
