# Development

## Setup

- Install dependencies: `npm install`.
- Run the demo/dev server: `npm run dev` (Vite) and open the served `examples/index.html`.
- Build the library:
  - ESM: `npm run build:esm`
  - CJS: `npm run build:cjs`
  - Demo site: `vite build`

## Formatting

- Prettier settings are enforced via scripts; the project prefers 4 tabs and semicolons.
- Format with: `npm run prettier`.

## Testing

- Playwright setup exists (`playwright.config.ts` and `tests/`), as well as `coverage/`; add tests to expand coverage.

## Coding Conventions

- Use `Canvas.appendChild/removeChild` to mutate the scene.
- Call `markOrderDirty()` when changes affect render order.
- Treat input coordinates as CSS pixels; convert to world at the edge via `getWorldCoords`.
- Avoid direct manipulation of child arrays; let engine/state manage consistency.

## Performance Tips

- Rely on GPU depth with `renderOrder` for z-ordering when possible.
- Use culling (`AABB.isColliding(cameraBBox, shapeBBox)`) to skip off-screen draws.
- Prefer updating uniforms/buffers only when `dirty` rather than every frame.

## Persistence & History

- Push composite commands for pointer interactions rather than many tiny ones to keep undo/redo coherent.
- Storage backends can be swapped; configure autosave frequency based on UX needs.
