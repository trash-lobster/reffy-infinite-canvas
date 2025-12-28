# Storage

The project abstracts storage for canvas state and image metadata.

## Canvas Storage

- Canvas state (scene graph, transforms, ordering) can be persisted via storage backends. `Component.ts` exposes the API.
- Originally, we used local storage as a backup. However, due to implementation potentially having multiple canvases, we switched to using Indexed DB as well.
- Auto-save can be configured with a frequency; debounced saves are supported to avoid excessive writes.

Key flows:

- `assignCanvasStorage(storage, saveFrequency)` — set the backend and autosave interval.
- `saveToCanvasStorage()` — immediate save.
- `debounceSaveToCanvasStorage(timeout?)` — schedule a save.
- On load, `restoreStateFromCanvasStorage()` deserializes saved state and restores the canvas back to the saved state.
- `deleteStateFromCanvasStorage()` - deletes the save state of the current canvas.
- `renameCanvasInStorage(newName)` - renames the canvas in storage.

## File Storage

- Image metadata (e.g., `dataURL`, `id`) is stored separately in IndexedDB by default.
- Deduplication is done by checking if the image data is already stored; otherwise, it writes a new entry and returns the id.

API:

- `assignFileStorage(storage)` — set backend.
- `saveImageFileMetadata(dataURL)` — write if not present, else returns a computed hashstring id.
- `getImageFileMetadata(fileId)` — read single entry.
- `getAllImageFileMetdata()` — read all entries.
- `deleteAllImageFileMetdata()` - deletes all entries.

## Placeholders

- When deserializing, if the image is not immediately available, a placeholder is generated and shown until `getFile(id)` resolves.
