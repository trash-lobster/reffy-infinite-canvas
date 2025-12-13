# Public API

The library exposes a small, imperative API for host apps via the Web Component and `src/API.ts`.

## Web Component `<infinite-canvas>`

Create and insert the element; it initializes the engine and starts rendering automatically.

Properties:

- `displayMode: 'fullscreen' | 'windowed'` — Controls the outer div size policy.
- `onCanvasChange?: () => void` — Callback when canvas state changes.

Methods:

- `togglePointerMode()` — Switch between interaction modes.
- `toggleGrid()` — Toggle grid visibility/type.
- `zoomIn()` / `zoomOut()` — Adjust camera zoom by fixed increments.
- `addImages(fileList: FileList)` — Add one or more images, centered on canvas.
- `addImageFromURL(url: string)` — Adds an image by URL, centered at canvas midpoint.
- `copyImage()` / `pasteImage(e: PointerEvent)` — Clipboard operations for selected images.
- `flipVertical()` / `flipHorizontal()` — Flip selected images.
- `deleteSelectedImages()` — Remove selected images from scene.
- `exportCanvas(filename?: string)` — Download a serialized JSON of the canvas state.
- `importCanvas(fileList: FileList)` — Restore canvas from a JSON file.
- `clearCanvas()` — Remove all children and reset history.

Storage helpers:

- `assignCanvasStorage(storage, frequency?)` — Set canvas state storage and autosave interval.
- `assignFileStorage(storage)` — Set image file metadata storage.
- `saveToCanvasStorage()` / `debounceSaveToCanvasStorage(timeout?)` — Save operations.

Context menu:

- `addContextMenu(x, y, type)` / `clearContextMenu()` / `isContextMenuActive()` — Control contextual UI.

## Engine (`Canvas`)

Selected methods:

- `appendChild(child)` / `removeChild(child)` — Manage scene graph.
- `render()` — Main draw loop.
- `toggleGrid()` — Toggle grid.
- `getSelected()` — Returns selected images.
- `setShapeZOrder(child, toFront: boolean)` — Adjust `renderOrder` only.
- `updateZoomByFixedAmount(direction?: 1 | -1)` — Zoom using the canvas center.
- `exportState()` / `importState(data, getFile)` — Serialize/deserialize canvas state.

## Suggested Extension API (Infinite Canvas Standard)

The following API surface outlines common, extensible operations expected of an infinite canvas engine. These are not all implemented today, but provide a forward-looking contract for extensions/plugins and host apps.

- `remove(nodeId: number | Renderable)`:
  Removes a node from the scene.
- `duplicate(nodeId: number | Renderable)`:
  Duplicates a node preserving transforms and style.
- `group(nodeIds: number[])` / `ungroup(groupId: number)`:
  Groups/ungroups nodes to apply transforms collectively.
- `setZOrder(nodeId: number, order: number)`:
  Explicitly set `renderOrder` for GPU depth-based z-ordering.
- `bringToFront(nodeId: number)` / `sendToBack(nodeId: number)`:
  Convenience z-order operations.
- `select(predicate: (node: Renderable) => boolean)` / `selectById(ids: number[])`:
  Programmatic selection.
- `clearSelection()` / `getSelection(): Renderable[]`:
  Selection management.
- `setTransform(nodeId: number, t: { x?: number; y?: number; sx?: number; sy?: number; rotation?: number })`:
  Update transforms (supports rotation when available).
- `fitToView(nodeId: number)` / `fitAllToView()`:
  Adjust camera to frame a node or entire scene.
- `zoomTo(rect: { x: number; y: number; width: number; height: number })`:
  Camera zoom to a world-space rect.
- `setGrid(type: 'none' | 'grid' | 'dots', opts?: { spacing?: number; color?: string; opacity?: number })`:
  Grid display customization.
- `enableSnap(options?: { toGrid?: boolean; toGuides?: boolean; toObjects?: boolean; tolerance?: number })`:
  Enable snapping with configurable targets and tolerance.
- `createGuide(axis: 'x' | 'y', position: number)` / `removeGuide(id: number)`:
  Simple guides for alignment.
- `history.undo()` / `history.redo()` / `history.clear()` / `history.batch(fn: () => void)`:
  Command history control with batching.
- `export(type: 'json' | 'png' | 'svg', options?: ExportOptions)` / `import(data: SerializedCanvas | Blob)`:
  Multi-format export/import.
- `on(event: CanvasEvent, handler: (...args: any[]) => void)` / `off(event, handler)`:
  Event subscription for changes, selection, pointer, context menu, storage.
- `registerTool(name: string, tool: ToolDefinition)`:
  Pluggable tools (e.g., pan/zoom, brush, lasso) that integrate with pointer lifecycle.

### Event Model (recommended)

- `CanvasEvent.Change` — Any mutation affecting render or state.
- `CanvasEvent.SelectionChange` — Selection set updated.
- `CanvasEvent.Zoom` / `CanvasEvent.Pan` — Camera changes.
- `CanvasEvent.ResourceLoaded` — Image/asset finished loading.
- `SaveEvent.Save` / `SaveEvent.SaveCompleted` / `SaveEvent.SaveFailed` — Persistence lifecycle.

### Data Contracts (recommended)

- `RenderableDescriptor` (serializable): `{ id, type, transform: { x, y, sx, sy }, renderOrder, style?: { fill, stroke, opacity }, meta?: Record<string, any> }`.
- `CameraState` (serializable): `{ x, y, zoom, viewport: { width, height } }`.

### Performance Considerations

- Prefer GPU depth via `renderOrder` over CPU sorts; reserve CPU sorts for complex transparency.
- Implement frustum culling for all renderables via AABB intersection with camera.
- Defer image uploads and use low-resolution textures while loading or at small screen coverage.

## Usage Examples

Below are quick examples showing how host apps might use the component and the suggested extension API.

### Create and use the Web Component

```html
<infinite-canvas id="canvas"></infinite-canvas>
<script type="module">
	import './esm/index.js';

	const canvasEl = document.getElementById('canvas');
	canvasEl.onCanvasChange = () => console.log('Canvas changed');

	// Toggle grid
	canvasEl.toggleGrid();

	// Zoom
	canvasEl.zoomIn();
	canvasEl.zoomOut();

	// Add images via input
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = 'image/*';
	input.onchange = () => canvasEl.addImages(input.files);
	document.body.appendChild(input);
```

### Programmatic selection and z-order

```ts
// Assuming you have access to the engine
const engine = canvasEl.engine;
const selected = engine.getSelected();

// Bring the first selected to front
if (selected.length) {
  engine.setShapeZOrder(selected[0], true);
}
```

### Suggested Extension API (examples)

```ts
// Add an image by URL centered
engine.addImageFromURL("https://example.com/pic.png", { center: true });

// Add a rectangle
engine.addShape("rect", {
  x: 100,
  y: 80,
  width: 320,
  height: 180,
  style: { fill: "#4477ee", stroke: "#224488", opacity: 0.9 },
});

// Add text
engine.addText("Hello Canvas", {
  x: 50,
  y: 50,
  font: "16px Inter",
  color: "#111",
});

// Group and align
const ids = engine.getSelection().map((n) => n.id);
const groupId = engine.group(ids);
engine.alignSelection?.("top");

// Explicit z-order
engine.setZOrder(groupId, 1000);

// Camera fit
engine.fitAllToView();

// Export / Import
const json = engine.export("json");
engine.import(json);

// History
engine.history.batch(() => {
  engine.bringToFront(ids[0]);
  engine.sendToBack(ids[1]);
});
engine.history.undo();
```

## Serialization (`src/serializer/serializer.ts`)

Saved per shape:

- `type`, `id`, `layer` (legacy), `renderOrder`, `transform { x, y, sx, sy }`, dimension-specific props (width, height, color), and `fileId` for images.
- Grid saves `style` (`gridType`).

Deserialization rebuilds the scene graph and restores transforms/file associations, guarding optional fields like `renderOrder`.
