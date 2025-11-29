# Interaction & Selection

## Managers

- `SelectionManager` — Tracks selected shapes, hit-testing, and selection visuals (bounding boxes, marquee). Exposes helpers for pointer down/move, multi-select, and deletion.
- `PointerEventManager` — Centralizes pointer lifecycle: down/move/up, wheel, camera updates, cursor changes, paste.
- `KeyEventManager` — Handles keyboard shortcuts (e.g., delete, flips, mode toggles).
- `ContextMenuManager` — Detects context menu hits and constructs appropriate options for images/multi-selection/canvas.

## Bounding Boxes

- `BoundingBox` — Handles single-shape resize/drag interactions, edge/corner hit testing, and flip detection (by comparing scale signs).
- `MultiBoundingBox` — Aggregates multiple selected shapes to a composite box with handles for group resize, align (top/bottom/left/right), flip, and normalize operations (width/height/scale/size).

### Hit Testing

- Bounding box and handles are tested in world space after transforming pointer positions via `applyMatrixToPoint(worldMatrix, x, y)`.
- Handle collisions use a small margin for easier interaction.

### Resize & Flip

- Resize calculates multiplicative scale factors (`mulSX`, `mulSY`) from pointer deltas and parent world scale, with guards to avoid near-zero and flipping when undesired.
- Flip operations reposition around the group/shape center and invert scale in the chosen axis, preserving dimensions.

### Align & Normalize

- `align(direction)` computes target edges (min/max X/Y) among selected shapes and translates each to align.
- `normalize(type, mode)` supports matching height, width, scale, or area to either the first selected item or to the average across selection.

## Clipboard

- `copyImage()` serializes selected images for clipboard usage.
- `pasteImage(e)` inserts from clipboard at pointer position using world coordinate conversion.

## Modes & Grid

- Pointer interaction modes can be toggled (`togglePointerMode()`).
- Grid visibility/type toggles via `toggleGrid()`.
