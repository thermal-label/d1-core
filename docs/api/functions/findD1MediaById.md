# Function: findD1MediaById()

```ts
function findD1MediaById(id: string): D1Media | undefined;
```

Look up an entry by its kebab-case `id`. Convenience for callers
that have an id in hand and want the full descriptor without
iterating the keyed registry.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |

## Returns

[`D1Media`](../interfaces/D1Media.md) \| `undefined`
