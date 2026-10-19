# Architecture

The editor is organized around a few rules that keep state, interactions and rendering decoupled.

## Principles

- **State is signals; derived state is computed.** The document, session and services own signals. Counts, visibility, colors and UI status derive from them through `computed` values and effects.
- **Document writes go through transactions.** Transactions are the only way to change labels, and each produces one undo step backed by a patch. A drag can hold a transaction open until it commits or cancels.
- **The editor owns interaction lifecycles.** Only one interaction is active at a time. Commands declare when they interrupt it, and the editor ends the interaction before running them.
- **Effects have explicit lifecycles.** Modules define effects without starting them. `app.start` (web) and `app.wire` (tests) start them and return cleanup functions.

## Layers

| Module                          | Responsibility                                         |
| ------------------------------- | ------------------------------------------------------ |
| `core/`                         | Signals, classes, labels, transactions, and history    |
| `editor.ts`                     | User input and commands (for sessions, view, and mesh) |
| `tools/`                        | Tool definitions, gestures and tool-specific state     |
| `api.ts`, `app.ts`              | Public commands, keymap and application lifecycle      |
| `mesh/`, `view.ts`, `render.ts` | Geometry, picking, capture and rendering               |
| `components/`                   | UI; reads state through `useValue` and invokes `api`   |

## Boundaries

- **Core is independent of the UI and renderer.** Its document model is not tied to meshes, Three.js or React.
- **The editor is renderer-agnostic.** It coordinates tools, transactions and interactions through the view's interface.
- **Tools are declarative.** Each defines its presentation, gesture and handlers, with tool-specific state kept alongside it.

## Key decisions

- **`@preact/signals-core`** provides dependency tracking for derived state across modules. `useValue` bridges signals into React.
- **Patch-based undo** stores changes rather than full document snapshots.
- **Synchronous effects** make state changes immediately observable to commands and tests.

## Details

- **Merged geometry.** Parts occupy contiguous vertex and triangle ranges in one `BufferGeometry`.
- **Per-vertex labels.** Each vertex holds a class ID, or `-1` if unassigned. UI counts refer to vertices.
- **Undo.** Up to 50 patch-based steps. Visibility changes are not undoable.
