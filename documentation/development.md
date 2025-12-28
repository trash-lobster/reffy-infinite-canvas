# Development

## Setup

- Install dependencies: `npm install`.
- Run the demo/dev server: `npm run dev` (Vite) and run the demo site in development mode.
- Build the library (ESM only) through `npm run build`
- Release the package with `npm run release`

## Formatting

- Prettier settings are enforced via scripts; the project prefers 4 tabs and semicolons.
- Format with: `npm run prettier`.

## Coding Conventions

- Use `Canvas.appendChild/removeChild` to mutate the scene.
- Call `markOrderDirty()` when changes affect render order.
- Treat input coordinates as CSS pixels; convert to world at the edge via `getWorldCoords`.
- Avoid direct manipulation of child arrays; let engine/state manage consistency. The state management library used is MobX and the allowed manipulation are exposed through arranged methods.

## Performance Optimization

- Rely on GPU depth with `renderOrder` for z-ordering when possible.
- Use culling (`AABB.isColliding(cameraBBox, shapeBBox)`) to skip off-screen draws.
- Prefer updating uniforms/buffers only when `dirty` rather than every frame.

## Persistence & History

- Push composite commands for pointer interactions rather than many tiny ones to keep undo/redo coherent, especially when multiple objects are impacted.
- Storage backends can be swapped; configure autosave frequency based on UX needs. Considering whether the local Indexed DB should be used regardless of storage backend to enable offline tracking and reconciliation.

## Event Hub

- Non-core operations like UI delays are triggered through event emission. The listeners are set up in the Component class.