# Architecture

This project exposes an infinite canvas as a Web Component powered by WebGL, with a small, imperative API for host apps.

## High-level Modules

- `src/Component.ts` — Lit Web Component `<infinite-canvas>` that creates a `<canvas>`, manages a `ResizeObserver`, and starts the render loop. The component was designed with windowed mode in mind. The element can be set to any size and moved to any position of the screen and it will work as expected.
- `src/Canvas.ts` — Engine: owns WebGL context, shader programs, render list, scene graph (`children`), camera, managers, and the main render function. Despite the general set up of the `Renderable` class, the only object that should have renderable children should be Canvas.
- `src/shapes/` — Drawable primitives and images
  - `Renderable.ts` → `Shape.ts` → concrete shapes: `Rect.ts`, `Grid.ts`, and `Img.ts`.
  - Each shape provides vertex data setup and a `render(gl, program)` that binds buffers and issues draws.
  - To keep the project as lightweight as possible, rectangle is used wherever possible.
- `src/shaders/` — GLSL source strings for shape/image/grid programs.
- `src/manager/` — Input and command managers (`SelectionManager`, `PointerEventManager`, `KeyEventManager`, `ContextMenuManager`) and command helpers for undo and redo history (`FlipCommand`, `TransformCommand`, `OrderCommand`, `SceneCommand`).
- `src/boundingBox/` — Hit areas and manipulation UI (`BoundingBox`, `MultiBoundingBox`, `Marquee`), plus AABB (Axis-Aligned Bounding Box) utilities.
- `src/camera/` — Camera model (`Camera.ts`) and supporting state in `src/state/`.
- `src/serializer/` — Serialize/deserialize scenes to a portable JSON bundle including all shapes, transforms, and file IDs.
- `src/storage/` — Abstracted backends (IndexedDB) to store image metadata and canvas snapshots.
- `src/util/` — Utility helpers: math, WebGL uniforms, file utilities, color, checks, performance.

## Rendering Flow

1. The component creates a `Canvas` instance with a HTMLCanvasElement and managers.
2. In the RAF (`requestAnimationFrame`) loop, `Canvas.render()`:
   - Clears color + depth and sets viewport.
   - Updates camera viewport size and computes the camera bounding box.
   - Culls shapes that don’t intersect the camera via AABB.
   - Sets per-draw program and uniforms; draws grid, then visible shapes.
   - Renders selection/bounding boxes overlay.

## Z-Order Strategy

- The project supports GPU depth for ordering via `Shape.getZ()` which maps `renderOrder` to a normalized depth ratio.
- Grid is always at the back (farthest depth); images and shapes are assigned depth based on `renderOrder`.
- Transparent blending uses `SRC_ALPHA`/`ONE_MINUS_SRC_ALPHA`; for heavy translucency, CPU sort may be combined with depth.

## Coordinate Spaces

- UI input uses CSS pixel coordinates; conversion to world space uses `util/camera/camera.ts:getWorldCoords()`.
- Shapes maintain local transforms; world matrices are derived from parent (`Canvas`) world matrix.

## Mutation and Consistency

- Scene mutations should happen via `Canvas.appendChild/removeChild` to keep selection and render caches consistent.
- Changing z-order uses `Canvas.setShapeZOrder(shape, toFront)` which adjusts `renderOrder` only.

## History

- `src/history/` tracks user commands for undo/redo. Pointer interactions aim to produce a single composite command per gesture.
