# Type Alias: D1Material

```ts
type D1Material = 
  | "standard"
  | "permanent-polyester"
  | "flexible-nylon"
  | "durable"
  | "rhino-vinyl"
  | "rhino-permanent-polyester"
  | "rhino-flexible-nylon"
  | "rhino-heat-shrink"
  | "rhino-non-adhesive-tag"
  | "rhino-self-laminating";
```

D1 substrate family. Picker / preview UX hint — the rasterizer does
not branch on this. The `rhino-*` values cover DYMO's industrial
Rhino™ cartridge line.
