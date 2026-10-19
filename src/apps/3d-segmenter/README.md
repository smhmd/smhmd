# 3D Segmenter

Label 3D meshes per vertex in the browser and export [Supervisely](https://supervisely.com) mesh projects. Smart Select runs EdgeTAM, a 20 MB model, locally in a worker.

## Code map

- `lib/app.ts`, `lib/editor.ts`, `lib/api.ts`: application lifecycle, interactions and commands
- `lib/core/`: signals, document state, transactions and history
- `lib/tools/`: tools and their definitions
- `lib/mesh/`, `lib/view.ts`, `lib/render.ts`, `lib/navigation.ts`: geometry, picking, rendering and navigation
- `lib/sam.ts`, `lib/sam.worker.ts`: on-device model integration
- `lib/export/`: export formats
- `lib/session.ts`, `lib/hooks/`: session state and input helpers

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the design principles and module boundaries.

## Testing

- `pnpm test`: unit and engine tests using synthetic meshes and simulated gestures.
- `pnpm test:e2e`: browser tests in Chromium with real input. These use a fake model that returns square masks; validate EdgeTAM separately.

Tests should assert on state rather than pixels. Bug fixes should include regression tests.

## Ideas

1. **Section plane**: cut away everything in front of a plane to reach inside.
2. **Multi-view Smart Select**: vote per vertex across views, then snap to folds.
3. **Texture-aware Fill**: stop at color edges sampled through UVs, not only folds. Segmenting the texture atlas itself won't work: UV islands scatter objects across it.
