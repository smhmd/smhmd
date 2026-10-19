# Architecture

The aim is an editor that can keep growing without a growing list of things to remember. When a rule matters, the code is shaped so breaking it is hard: the wrong call doesn't exist, the wrong write doesn't type-check, or the cleanup happens on its own.

## The model in four ideas

**1. State is signals; everything else is derived.** The document, the session and each service hold their state in signals. What depends on that state, like counts, visibility, colors, the status line or a tool's preview, is a `computed` or an effect that re-runs on its own. Nothing calls "refresh" or "recount". If you find yourself updating B after changing A, B should be derived from A.

**2. The document changes only through transactions.** Labels (a class id per vertex) are read-only to everything outside a transaction; the type has no method that writes. A transaction is the only writer, and each one becomes one step of undo, stored as a patch of what it changed. A stroke is a transaction held open for a drag, then kept or dropped as a whole.

**3. One interaction is in flight at a time, and the editor ends it.** A stroke, or a live edit like Smart Select's selection, stays open across events. Any command that would confuse it declares `interrupts`, and the editor completes the interaction before the command runs. The tool's `end` then clears whatever it showed. Tools never need to know what else is going on.

**4. Nothing starts on import.** Importing a module only defines things. Effects begin in `app.start` (the app) or `app.wire` (tests), and each returns a function that stops them, so a remount or a hot reload starts clean. Lists, like `TOOLS` and the keymap, are plain data in one place, so they can't drift or pile up.

## Layers

| Where                           | What                                                                   | Knows about                         |
| ------------------------------- | ---------------------------------------------------------------------- | ----------------------------------- |
| `core/`                         | signals, and the document: classes, labels, transactions, history      | nothing else in the app             |
| `editor.ts`                     | the interaction in flight, input, commands                             | the document, the view, the session |
| `tools/`                        | one file per tool, and `TOOLS`                                         | the editor, and whatever they pick  |
| `api.ts`, `app.ts`              | the commands; the keymap and `start`, where everything begins          | everything                          |
| `mesh/`, `view.ts`, `render.ts` | the geometry, the capture and picking, and the effects that draw state | the document, the session           |
| `components/`                   | React: read state with `useValue`, call `api`                          | `lib/`                              |

Three boundaries matter more than the rest:

- **`core` knows nothing about rendering or UI.** No three.js, and no React beyond the one hook that reads signals. It would serve point clouds or volumes as well as meshes.
- **The editor never touches three.js.** It deals in tools, transactions and picks, and asks the view for captures; the canvas, the orbit controls and the GPU stay in the modules that own them.
- **Tools only declare.** A tool is a plain object: its look, what it needs from the view, and its gesture (`stroke`, `box` or none), with handlers for that gesture. Its own state sits beside it in its module.

## Adding things

- **A tool**: a file in `lib/tools/` exporting `tool`, then an entry in `TOOLS`. The toolbar, keymap, cursor, rail and status all read from it.
- **A command**: an entry in `api`. Use `edit` if it changes the document, which makes it one undo step; use `command` otherwise, with `interrupts` if it shouldn't run mid-interaction. Give it a key in `app.ts` if it needs one.
- **An export format**: an entry in `EXPORTS`, reading `doc.labels.peek()` and returning a `Blob`.
- **A service** (a worker, a model): a module whose state is signals, like `sam.ts`. Tools react to it in their `activate` effects.

## Decisions worth knowing

- **Signals (`@preact/signals-core`), not the repo's `createStore`.** A store can't see what a computation read, so state derived across stores would need hand-written subscriptions, which is the bookkeeping this design removes. `useValue` is the only bridge to React.
- **No state machine library.** Smart Select's model status is three plain signals and one computed status. A statechart would be more code for the same guarantees here.
- **Patches, not snapshots, for undo.** Undo memory follows the size of the edit, not the size of the mesh.
- **Effects run synchronously.** A test or a command can change state and read the result on the next line.

## Things to watch

- **Mutable data next to signals.** GPU buffers and typed arrays can't be signals, so an effect sometimes reads a signal only to depend on it (`void doc.activeId.value`, `mesh.pickable()`). Where the reason isn't obvious, say it in a comment.
- **Faces are front-only** everywhere, depth pass included. That one is still a convention.
