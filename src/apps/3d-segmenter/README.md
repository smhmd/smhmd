# 3D Segmenter

Label 3D meshes per vertex in the browser and export a [Supervisely](https://supervisely.com) mesh project. Smart Select runs EdgeTAM (a 20 MB mobile SAM 2) on the device in a worker, so nothing is uploaded.

## Map

Start at `lib/api.ts`: everything the UI can do, and the dispatcher that drives the active tool.

- `lib/mesh/`: the merged geometry and labels (`data`), loading, materials
- `lib/view.ts`: capture, projection, picking
- `lib/topology.ts`: connectivity and folds, for Fill
- `lib/state.ts`: the stores. `lib/edit.ts`: label edits and undo
- `lib/tools/`: one `Behavior` per tool (`common.ts`); how each looks is `components/tools.tsx`
- `lib/sam.ts`: the client for `sam.worker.ts`
- `lib/export/`: export formats (`EXPORTS`)
- `lib/hooks/`: shortcuts, and pointer gestures turned into tool calls

## Model

- **One merged `BufferGeometry`.** Each part is a contiguous vertex range (`start`, `count`) and triangle range (`faces`).
- **Labels are per vertex**, as Supervisely's are: `data.labels` holds a class id per vertex, `-1` for none. Every count in the UI is vertices.
- **State lives outside React.** `data` and `view` are mutable; components subscribe to the stores (`ui`, `doc` for what's exported, `prompts`). Pointer moves and orbiting never set React state, and the canvas only redraws on demand.
- **Undo** snapshots labels and classes, up to 50. Visibility isn't undone.

## Rules

- **What's drawn is what's pickable.** Change visibility only through `refresh` (via `edit.sync()`); the depth pass, picking and Fill see only drawn vertices.
- **After an imperative change** (colors, materials, indices), call `view.invalidate()`.
- **Picking reads a capture** taken once the camera settles; `view.dirty` marks it stale. `capture` reads pixels synchronously, so never call it per frame.
- **Nothing asks which tool is active**; `api` calls the active `Behavior`. A new tool is a file in `lib/tools/`, plus entries in `tools/index.ts`, `TOOL_KEYS` and `components/tools.tsx`.
- **Never disable the orbit controls mid-gesture**: they'd lose the first finger and break two-finger orbit. `navigation()` takes their buttons away instead.
- **Faces are front-only** everywhere, depth pass included.

## Testing

- `pnpm test`: the engine, history and tools on small synthetic meshes, loaded through the real `parse`; `fixtures.ts` stands in for a capture.
- `pnpm test:e2e`: the real app in Chromium with real input. A fake model answers with square masks, so check EdgeTAM by hand. Slow without a GPU.
- Assert on state, not pixels. A bug fix gets a test that fails without it.
- In the dev console, `await import('/src/apps/3d-segmenter/lib/index.ts')` exposes `data`, `ui`, `doc` and `api`.

## Known limits

- Ending a stroke recounts every vertex: about 60 ms at a million.
- Topology builds on the main thread on the first Fill: about 0.8 s at a million.

## Ideas

1. **Section plane**: cut away everything in front of a plane to reach inside.
2. **Multi-view Smart Select**: vote per vertex across views, then snap to folds.
3. **Texture-aware Fill**: stop at color edges sampled through UVs, not only folds. Segmenting the texture atlas itself won't work: UV islands scatter objects across it.
