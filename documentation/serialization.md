# Serialization

The serializer exports/imports the full canvas state as JSON. This includes shape transforms, per-shape properties, and image file references.

## Format Overview

Top-level:
- `version`: schema version (currently `1`).
- `canvas`: `{ width, height, dpr }` recorded from the WebGL canvas at save time.
- `root`: serialized node for the canvas root, with children representing the scene.
- `files`: optional list of `{ id, dataURL, ... }` for image metadata.

Per node:
- `type`: `Rect` | `Img` | `Grid` | `Renderable`.
- `id`: internal sequence id.
- `transform`: `{ x, y, sx, sy }`.
- `renderOrder`: ordering value for GPU depth.
- Shape-specific fields:
  - `Rect`: `width`, `height`, `color`.
  - `Img`: `width`, `height`, `fileId`.
  - `Grid`: `style` (`gridType`).

## Serialization

`serializeCanvas(canvas, files?)`:
- Walks the scene graph from `canvas`, serializing each child.
- Captures `transform`, `renderOrder`, and shape-specific metadata.

## Deserialization

`deserializeCanvas(data, canvas, getFile, writeFileToDatabase?)`:
- Clears current children and rebuilds the scene graph.
- For `Img`, it looks up the `fileId` in `data.files` (if present) and sets a placeholder image immediately; real image data is loaded asynchronously via `getFile(id)`.
- Transforms and dimensions are restored.
- `renderOrder` is applied when present (guarded assignment).

### Placeholder Strategy

- If an image cannot be found immediately, a framed placeholder is generated at the target dimensions to avoid blank content.
- Real image data replaces the placeholder once loaded.

## Extensibility

- Add fields to `SerializedNode` variants as needed; bump `version` when making breaking changes.
- Guards (like checking `typeof renderOrder === 'number'`) help maintain backward compatibility with older saves.
