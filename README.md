# Compare

Put SDXL images side by side, label them, export one PNG.

```bash
bun install
bun --bun next dev     # http://localhost:3000
```

- Drop, paste or pick images. Dozens are fine.
- Layouts: Grid, Masonry, Framed, Film, Row.
- Labels can sit below, above, on the image, or in a corner tag. Click one to edit it.
- Seed, steps, CFG, sampler, model and prompt are read from A1111/Forge and ComfyUI PNGs.
- Drag to reorder. Images and settings stay put after a reload (stored in your browser).
- Export at 2048 px, 4096 px or full size, or copy to the clipboard.
