# 3D Segmenter

Label 3D meshes per vertex in the browser and export a [Supervisely](https://supervisely.com) mesh project. Smart Select runs EdgeTAM (a 20 MB mobile SAM 2) on the device in a worker, so nothing is uploaded.

## Map

Start at `lib/app.ts`, then `lib/editor.ts` and `lib/api.ts`. [ARCHITECTURE.md](./ARCHITECTURE.md) explains why it's shaped this way.

- `lib/app.ts`: the keymap, and `start`, where everything begins
- `lib/core/`: signals, and the document (classes, labels, transactions, history). No three.js; no React beyond `useValue`
- `lib/editor.ts`: the interaction in flight, input and commands
- `lib/api.ts`: every command the UI can do
- `lib/tools/`: one file per tool, its look included, and `TOOLS`
- `lib/render.ts`, `lib/navigation.ts`: effects that keep the canvas and the orbit controls in step with state
- `lib/mesh/`: the merged geometry (`data`), parts, loading, materials, topology
- `lib/view.ts`: capture, projection, picking
- `lib/sam.ts`: the client for `sam.worker.ts`
- `lib/session.ts`: the session (view settings, held keys, the pointer)
- `lib/export/`: export formats (`EXPORTS`)
- `lib/hooks/`: shortcuts and pointer gestures

## Model

- **One merged `BufferGeometry`.** Each part is a contiguous vertex range (`start`, `count`) and triangle range (`faces`).
- **Labels are per vertex**, as Supervisely's are: a class id per vertex, `-1` for none. Every count in the UI is vertices.
- **State is signals.** Components read them with `useValue`, so each re-renders only for what it shows. Pointer moves and orbiting never render React, and the canvas only redraws on demand.
- **Modules that hold state are namespaces**: `doc`, `editor`, `mesh`, `session`, `view`. Write `session.xray`, `doc.labels`, `view.captured`; import them with `import * as session from './session'`, or `{ doc }` from the core. Types and utilities import by name.
- **Undo** keeps up to 50 steps, each a patch of what changed. Visibility isn't undone.

## Rules the structure keeps

Each of these used to be something to remember. Now the code can't do otherwise:

- **Labels change only in a transaction.** Outside one, their type has no way to write, and an ended transaction throws. A command made with `edit` is one undo step; a stroke is one, undone if aborted.
- **What's drawn, colored, counted and pickable follows the labels.** It's all derived in `render.ts` and `tally`; nothing calls a refresh.
- **Picking reads a capture that matches the camera.** It's retaken when what's drawn or what the tool needs changes, once the camera settles, and before a press or release if it's stale. `capture` runs nowhere else.
- **The interaction in flight ends before anything that would confuse it.** A command that `interrupts` (and every `edit`) completes it first, and the tool's `end` clears what it showed.
- **A new tool is one file** in `lib/tools/`, plus its place in `TOOLS`: the toolbar, the keymap, the cursor, the rail and the status all read it from there.
- **Nothing starts on import.** Effects begin in `app.start` and stop with what it returns.
- **The orbit controls are never disabled mid-gesture**: their buttons are derived from the tool and the gesture.

Still a convention: **faces are front-only** everywhere, depth pass included.

## Testing

- `pnpm test`: the core, the engine and the tools on small synthetic meshes, driven through the editor's gestures; `fixtures.ts` stands in for a capture.
- `pnpm test:e2e`: the real app in Chromium with real input. A fake model answers with square masks, so check EdgeTAM by hand. Slow without a GPU.
- Assert on state, not pixels. A bug fix gets a test that fails without it.
- In the dev console, `await import('/src/apps/3d-segmenter/lib/index.ts')` exposes everything: `doc`, `editor`, `mesh`, `session`, `view`, `api`, `tool` and the tools.

## Known limits

- Ending a stroke diffs and recounts every vertex: about 60 ms at a million.
- Topology builds on the main thread on the first Fill: about 0.8 s at a million.

## Ideas

1. **Section plane**: cut away everything in front of a plane to reach inside.
2. **Multi-view Smart Select**: vote per vertex across views, then snap to folds.
3. **Texture-aware Fill**: stop at color edges sampled through UVs, not only folds. Segmenting the texture atlas itself won't work: UV islands scatter objects across it.
