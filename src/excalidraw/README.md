# Vendored Excalidraw source

This directory contains the runtime source for Excalidraw's reusable editor
packages, copied from upstream commit `e160ff7b`. The original package
boundaries are retained so upstream imports remain easy to compare and update:

- `common`, `math`, `fractional-indexing`, and `laser-pointer` contain shared
  primitives.
- `element` contains the scene element model and geometry operations.
- `utils` contains import/export helpers.
- `excalidraw` contains the React editor, UI, renderer, styles, locales, workers,
  and bundled fonts.

The `@excalidraw/*` aliases in the root `tsconfig.json` resolve directly to
these sources. The nested upstream clone is not part of the app build.

Upstream: <https://github.com/excalidraw/excalidraw>

License: MIT. See `LICENSE` in this directory.
