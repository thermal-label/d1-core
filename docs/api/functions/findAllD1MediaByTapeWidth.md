# Function: findAllD1MediaByTapeWidth()

```ts
function findAllD1MediaByTapeWidth(tapeWidthMm: number): readonly D1Media[];
```

Find every catalogued cartridge for a given tape width.

Includes every material (Standard, Permanent, Flexible, Durable,
Rhino*) and every text/background colour combination at that width.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `tapeWidthMm` | `number` |

## Returns

readonly [`D1Media`](../interfaces/D1Media.md)[]
