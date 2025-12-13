# Storage

The project abstracts storage for canvas state and image metadata.

## Canvas Storage

- Canvas state (scene graph, transforms, ordering) can be persisted via storage backends.
- Default local storage is used when none is provided.
- Auto-save can be configured with a frequency; debounced saves are supported to avoid excessive writes.

Key flows:

- `assignCanvasStorage(storage, saveFrequency?)` — set the backend and autosave interval.
- `saveToCanvasStorage()` — immediate save.
- `debounceSaveToCanvasStorage(timeout?)` — schedule a save.
- On load, `restoreStateFromCanvasStorage()` deserializes saved state.

## File Storage

- Image metadata (e.g., `dataURL`, `id`) is stored separately in IndexedDB by default.
- Deduplication is done by checking if the image data is already stored; otherwise, it writes a new entry and returns the id.

API:

- `assignFileStorage(storage)` — set backend.
- `saveImageFileMetadata(dataURL)` — write if not present, else compute a hashed id.
- `getImageFileMetadata(fileId)` — read single entry.
- `getAllImageFileMetdata()` — read all entries.

## Placeholders

- When deserializing, if the image is not immediately available, a placeholder is generated and shown until `getFile(id)` resolves.
