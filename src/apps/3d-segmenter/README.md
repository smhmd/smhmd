# 3D Segmenter

Label 3D meshes per vertex, in the browser, and export them for [Supervisely](https://supervisely.com). Smart Select runs EdgeTAM (a 20 MB mobile SAM 2) on the user's device, so nothing is uploaded. Route: `/3d-segmenter`.

## Principles

- **Small, readable code.** Few dependencies, few comments; a comment says why, not what.
- **Accessible.** Keyboard reachable, visible focus, labeled icon buttons, state never shown by color alone.
- **Cheap renders.** State lives outside React, and pointer moves and orbiting never set React state. The canvas only redraws on demand.
- **Subtle UI.** Tailwind with `hocus`/`hocus-within` instead of `hover`; Base UI for primitives; `motion` only where it earns its place.

## Where things live

`lib/` is layered; each layer only imports the ones above it.

- `lib/mesh/`: the engine. The merged geometry and labels, loading, materials, the Supervisely export.
- `lib/view.ts`, `lib/topology.ts`: camera, capture and picking; connectivity and folds.
- `lib/state.ts`: the stores. `lib/edit.ts`: label edits and undo.
- `lib/sam.ts`: the client for EdgeTAM's worker (`sam.worker.ts`).
- `lib/tools/`: what each tool does, behind one interface (`Behavior` in `common.ts`).
- `lib/api.ts`: everything the UI can do, and the dispatcher that drives the active tool. Start here.
- `lib/hooks/`: keyboard shortcuts, and pointer gestures turned into tool calls.
- `components/`: the React UI. `tools.tsx` is how each tool looks; `Scene` is the 3D scene.
- `lib/platform.ts`: ⌘ on Apple keyboards, Ctrl elsewhere, for the hand and every shortcut hint.

## Data model

- **One merged `BufferGeometry`.** Each part is a contiguous vertex range (`start`, `count`) and triangle range (`faces`).
- **Labels are per vertex**: `data.labels` is an `Int32Array` of class ids, `-1` for unlabeled. This matches Supervisely's per-vertex PLY, and is why every count in the UI is vertices.
- **Tools are modules.** A tool implements the `Behavior` events it needs (press, drag, release, hover, flush…) and keeps its own state; `api` calls the active one, and nothing else asks which tool is active. A new tool is a file in `lib/tools/` plus an entry in `components/tools.tsx`.
- **What's drawn is what's pickable.** `refresh(xray)` splits `data.triangles` into the drawn index (`data.geometry`) and the ghost (`data.ghost`), and fills `data.shown` per vertex. The depth pass, projection, picking and Fill only ever see drawn vertices. Change visibility through `refresh` (via `sync()` in `edit.ts`), never by hand.
- **Connectivity and folds** (`topology.ts`) are built on first use and cached per geometry. Vertices at the same position count as connected, so models with split normals or UV seams still hold together.
- **Stores** (`createStore` from `src/lib/react`):
  - `ui`: primitives only (tool, status, toggles, counters).
  - `doc`: what gets exported (name, classes, active class, parts). `tally` keeps unchanged class and part objects identical so memoized rows skip renders.
  - `prompts`: Smart Select's box and points.
- **`use(selector)` only accepts primitives.** Select a primitive, or call `use()` for the whole state.
- **Undo** snapshots labels and classes (last 50). Visibility (class eyes, X-ray, hidden parts) isn't undone.

## How labeling works

1. **Capture.** When the camera stops (250 ms after the last move), `settle` calls `capture`: a packed depth render decides which vertices are visible, and every vertex is projected to the screen. In Smart Select it also renders the textured view and sends it to the worker to encode. `view.dirty` marks a stale capture.
2. **Brush and eraser** label the visible vertices inside a screen-space radius.
3. **Fill** takes the surface connected to the triangle under the pointer (`under`, so a big flat face counts even far from its corners), within the ring (its pixel radius turned into a 3D distance at that depth), through unlabeled vertices, its own label and the active class, and up to folds. Folds follow the minima rule (parts meet along inward folds): `topology.ts` measures each vertex's sharpest inward curvature on the welded surface, and the most folded 10% of the surface acts as walls, thickened by one ring so fills can't slip through. Bends wider than a quarter of the model never count. It's a brush stroke: hovering previews one dab, and each point along a drag fills its own ring (one undo step), staying on the part, up to folds, where the drag started. Scrolling resizes it; holding Shift (previewed too) or a long press takes the whole connected piece instead. Holding ⌘ (Ctrl off Apple) or right-dragging orbits, and ⌘-scroll zooms, as with the brush.
4. **Smart Select** sends the box and points to the worker and gets a 2D mask. Visible vertices inside it are labeled live, from a snapshot of the labels before the selection (`data.base`). Apply (Space or ↵) keeps it, Esc undoes it, and a new box starts the next one. Dashed guides help line up the box, and holding Space mid-drag moves it.
5. **X-ray** turns labels into see-through ghosts that can't be painted over, so you can label what's behind them. A stroke or selection stays solid until it's done (mouse released or selection applied), then joins the ghosts.
6. **While dragging**, shortcuts wait until the drag ends, so a stroke can't be cut in half; Esc cancels the drag itself. Over the floating controls the ring stays where it was, so dragging the size slider shows the new size, and scrolling there doesn't resize.
7. **Parts** are the pieces the file came with; the geometry is never changed. Hovering a part outlines it; clicking selects it, and F fits it to view.
8. **Export** writes an ASCII per-vertex PLY (`class_id`, `object_id = -1`, class colors) and `meta.json`. Supervisely rejects binary PLY.

Faces are front-only everywhere, including the depth pass: to reach a back face, orbit to it.

## Gotchas

- **After any imperative change** (colors, materials, indices), call `view.invalidate()`, or the canvas won't redraw.
- **`capture` reads pixels synchronously** and is expensive. Never call it per frame.
- **The model only runs in Smart Select**: the SAM Cam and encoding are skipped in other tools to save GPU time.
- **Shading is one mode** (`ui.shading`): Solid, Textures or Wireframe. Wireframe keeps the surface as an invisible depth writer, so back edges stay hidden and the depth pass still sees the model.
- **The gizmo takes its own presses**: gestures skip points where `onGizmo` is true. Move the gizmo only through `gizmoMargin`, which both the scene and that check read.
- **Nothing waits on EdgeTAM**: the other tools work while it downloads, and Smart Select prompts made before it's ready stay on screen and run once it is (`settled` in `tools/smart.ts`). The worker falls back from WebGPU to WebAssembly on its own.
- **Errors go to the status**: `notify()` shows a passing one (a file that won't open, a view that failed); a model that never loaded offers Retry.
- **Class hotkeys use `e.code` (`Digit1`–`Digit9`)**, so they work on any keyboard layout.
- **Dev console:** `await import('/src/apps/3d-segmenter/lib/index.ts')` exposes `data`, `ui`, `doc` and `api`.
- **Sample:** `public/models/groceries.glb`, eight YCB objects (CC BY 4.0), credited in the About dialog.

## Testing

- `pnpm test` (Vitest, Node, about 2 s): `tests/unit/`. The engine, history, Fill and Smart Select on small synthetic meshes loaded through the real `parse`; `fixtures.ts` stands in for a capture.
- `pnpm test:e2e` (Playwright): `tests/e2e/`. The real app in headless Chromium, driven with real pointer and keyboard input. It renders on the GPU; without one, Chromium falls back to drawing on the CPU, several times slower. A fake model answers boxes and points with square masks, so Smart Select runs without EdgeTAM; check the real model by hand.
- Assert on state (labels, preview triangles, the ring's position), not pixels. A bug fix gets a test that fails without it.

## Known limits

- A stroke only recolors what it touches, but ending one recounts every vertex: about 60 ms at a million.
- Connectivity and folds are built on the main thread the first time Fill runs: about 0.8 s for a million vertices.
- A file that fails to load only logs to the console.

## Ideas, roughly in order

1. **Section plane**: cut away everything in front of a plane to reach inside unlabeled geometry.
2. **Multi-view Smart Select**: accumulate mask votes per vertex across views, then snap the result to fold boundaries.
3. **Texture-aware Fill**: sample each vertex's texture color through its UVs, and let Fill stop at color edges as well as folds, for boundaries the shape doesn't show (a printed label on a smooth can). Segmenting the texture image itself and mapping back through UVs won't work as well: atlases are cut into scattered UV islands, so objects don't look like objects there.
