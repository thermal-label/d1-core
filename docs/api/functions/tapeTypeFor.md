# Function: tapeTypeFor()

```ts
function tapeTypeFor(media?: Pick<D1Media, "text" | "background">): number;
```

Map the user-selected media's text + background colours to the
ESC C selector (0..12). Unknown / unenumerated combinations and
`undefined` media both return `0`, the safe fallback (the
cassette's ink prints regardless of the byte sent).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `media?` | `Pick`\<[`D1Media`](../interfaces/D1Media.md), `"text"` \| `"background"`\> |

## Returns

`number`
