## Purpose & scope
TypeScript library that exposes an infinite canvas as a Web Component, with a small imperative API for host apps. The initial focus is placing and manipulating images; other shapes exist for UI (grid, bounding boxes).

## Architecture (big picture)
- Web Component: `src/Component.ts` defines `<infinite-canvas>` (Lit). It creates a `<canvas>`, resizes it with `ResizeObserver`, and drives a `requestAnimationFrame` render loop.
- Engine: `src/Canvas.ts` owns the WebGL context, shader programs, render list, and user interaction managers. Children are `Renderable`s; render order is cached (`renderList`) and rebuilt when `markOrderDirty()` is set.
- Shapes: `src/shapes/` hierarchy
    - `Renderable` → `WebGLRenderable` → `Shape` → `Rect`, `Img`, `Grid`
    - Each shape implements `render(gl, program)` and `destroy(gl)`. `Img` uploads textures; `Grid` draws background.
- State: `src/state/` (MobX)
    - `RenderableState` tracks translation/scale/rotation, matrices, tree (children/parent), and a `dirty` flag.
    - `CameraState`, `PointerEventState` capture camera transforms and pointer interactions.
- Managers: `src/manager/`
    - `SelectionManager`, `PointerEventManager`, `KeyEventManager` map input to commands and selections.
    - Scene commands in `manager/SceneCommand.ts` (add/remove/multi-add/multi-remove).
- History: `src/history/` command stack (undo/redo). Pointer interactions should push a single composite command per interaction.

## Coordinates & camera
- Use `util/camera/camera.ts:getWorldCoords(clientX, clientY, canvas)` to convert CSS pixel positions into world-space. Always pass CSS pixels (from `getBoundingClientRect`), not device pixels.
- `Canvas.addToCanvas(src, x, y, center)` accepts CSS pixels; it converts to world and, if `center`, offsets by half the image size after load for true centering.

## WebGL specifics
- Context created in `Canvas` with blending enabled (`SRC_ALPHA`, `ONE_MINUS_SRC_ALPHA`). Two programs are used: basic shapes and images; program switches are minimized in the render loop.
- Always free GPU resources: call `Canvas.removeChild(child)` (it updates selection, calls `child.destroy(gl)`, and marks order dirty). `Img.destroy` deletes texture and buffers and calls `super.destroy(gl)` to free the position buffer.

## API surface & usage
- `src/API.ts` exposes `canvasReady` and `InfiniteCanvasAPI` (zoomIn/zoomOut, toggleMode, addImageFromLocal). `addImageFromLocal` rejects non-image files up front.
- Example wiring in `examples/index.ts`: hidden input + button trigger; or use the File System Access API when available.

## Developer workflow
- Run: `npm run dev` (Vite) then open `examples/index.html` served by Vite.
- Build library: `npm run build:esm` and/or `npm run build:cjs` (TypeScript emits to `esm/` and `lib/`). `vite build` deploys the demo.
- Formatting: `npm run prettier` (project prefers 4 tabs and semicolons; Prettier is configured via script).
- TODO: add testing

## Conventions & patterns (project-specific)
- Mutations that affect render order must call `markOrderDirty()` (already done in `appendChild`/`removeChild`).
- Use commands for undoable actions; prefer batching a drag/resize into a single composite command.
- Treat input coordinates as CSS pixels; convert once at the edge using `getWorldCoords`.
- Avoid direct child array edits; use `Canvas.appendChild`/`removeChild` to keep selection/render caches consistent.

## Key files to study first
- `src/Component.ts`, `src/Canvas.ts`, `src/shapes/Img.ts`, `src/manager/SceneCommand.ts`, `src/state/renderable.ts`, `src/util/camera/camera.ts`.

## Code style
- 4 tabs indentation; end blocks with semicolons. Keep modules decoupled; prefer injecting functions at init over tight coupling when practical.