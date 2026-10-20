# Compare

Put SDXL images side by side, label them, export one image.

```bash
bun install
bun --bun next dev          # http://localhost:3000
bun --bun next build        # static site in out/
bunx wrangler deploy        # publish to Cloudflare Workers
```

- Drop, paste or pick images. Dozens are fine.
- Layouts: Grid, Masonry, Framed, Film, Row.
- Labels below, above, on the image or in a corner tag. Click one to edit it.
- Seed, steps, CFG, sampler, model and prompt are read from A1111/Forge and ComfyUI PNGs.
- Row and column headers for XY grids, plus title, subtitle and footer.
- Double-click an image to see it full size with its prompt and settings.
- Presets save a whole look. Preferences set the accent color, theme and workspace.
- Export PNG, JPG or WebP at 2048 px, 4096 px or full size, or copy to the clipboard.

Shortcuts: Ctrl/⌘ O add, S export, B sidebar, `,` preferences.

Icons come from [Iconify](https://iconify.design) (Phosphor and Tabler sets), bundled at build time.
