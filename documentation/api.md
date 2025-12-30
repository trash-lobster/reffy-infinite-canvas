# Public API

The library exposes a small, imperative API for host apps via the Web Component and `src/API.ts`. The methods exposed through `API.ts` will allow users to attach the methods to other UI elements, e.g. the toggle grid method can be attached to a button.

## API

Constructor:

- Takes in an infinite canvas element to attach the exposed API methods to that element.
- This means that users can have multiple infinite canvas elements and separate API instances for each of them.

`forElement`:

- A static method that takes in an infinite canvas element or a selector string.
- This assigns the API after the canvas has loaded.
- Returns an instance of the API.

Storage helpers:

- These methods are `static`, which enables users to clean up the application's local storage without attaching it to any specific instance of canvas.
- `registerCanvas(id: string, canvasStorage: CanvasStorage)` — Creates a blank canvas object and store it to either the local storage or the given canvas storage implementation.
- `getAllCanvasNames(canvasStorage?)` — Returns the names/ID of the canvases.
- `getAllCanvasData(canvasStorage)` — Returns all canvas stored in the local or passed in DB.
- `deleteCanvas(id)` — Deletes the canvas from local storage. This removes the canvas entirely and there is no restoration set up.
- `clearFileDataInIDB()` — Removes all images from the local fileStorage that is not currently in any canvas.
- `assignCanvasStorage(storage, frequency)` — Set canvas state storage and autosave interval.
- `assignFileStorage(storage)` — Set image file metadata storage.

UI methods:

- `zoomIn()` — Zoom into the canvas by a fixed amount.
- `zoomOut()` — Zoom out from the canvas by a fixed amount.
- `toggleMode()` — Change the canvas navigation mode between `select` and `pan`.
- `snapToCenter()` — Moves the canvas to the center of all your images. This method does not update your zoom level.
- `addImage(src)` — Accepts a base64 string and renders and adds the image to the canvas.
- `addImageFromLocal(fileList)` — Use this to add images from your local file system.
- `exportCanvas(fileName?)` — Export the current canvas in JSON format.
- `importCanvas(fileName?)` — Import one JSON file and check if it is in the right format.
- `clearCanvas()` — Empties out the canvas and deletes all images from it.

Thumbnails:

- `generateViewportThumbnail(width, height)` — Take the current screen and return a snapshot.
- `generateContentThumbnail(width?, height?)` — Accepts the given dimensions and create a thumbnail of the images placed onto the canvas. It will fill out the given dimension without stretching or distorting the thumbnail. Instead, it will pad out the spaces as needed.

## Events

The following events are dispatched across the lifetime of the element:

- `change` — emitted when any change occurs.
- `load` — emitted when the canvas finishes initializing.
- `savecomplete` — emitted when the canvas completes a save.
- `savefail` — emitted when the canvas fails to save.
- `resize` — emitted when the canvas resizes. The canvas already adjusts automatically, but this is available if you want anything additional triggered.

## Usage Examples

Below are quick examples showing how host apps might use the component and the suggested extension API.

### Create and use the Web Component in Vanilla JS

```html
<infinite-canvas id="canvas"></infinite-canvas>
<script type="module">
  import "./dist/index.js";

  const canvasEl = document.getElementById("canvas");
  canvasEl.onCanvasChange = () => console.log("Canvas changed");

  // Toggle grid
  canvasEl.toggleGrid();

  // Zoom
  canvasEl.zoomIn();
  canvasEl.zoomOut();

  // Add images via input
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => canvasEl.addImages(input.files);
  document.body.appendChild(input);
</script>
```

### React

Ensure that you also install `@lit/react` to use this component.

Create this file to make the component available as a React Element.

```ts
import React from "react";
import { createComponent } from "@lit/react";
import { InfiniteCanvasElement } from "@reffy/infinite-canvas";

export const InfiniteCanvas = createComponent({
  tagName: "infinite-canvas",
  elementClass: InfiniteCanvasElement,
  react: React,
  events: {
    onChange: "change",
    onLoad: "load",
    onSaveComplete: "savecomplete",
    onSaveFail: "savefail",
    onResize: "resize",
  },
});
```

Sample usage:

```tsx
export function App() {
  return (
    <>
      <InfiniteCanvas
        id="canvas"
        name="SampleCanvas" // this will be the name that the canvas is saved in local storage
        onChange={() => console.log("change!")}
      />
    </>
  );
}
```
Note that if you want to create a container to limit the size and change the default position of the canvas, please ensure that the container has at least the following css properties. This is necessary for the context menu to show up in the right place. (I will look into how to remove this bug in the future)
```css
display: flex;
align-items: center;
justify-content: center;
```

I recommend setting up a hook to utilise the API methods:

```jsx
import {
    InfiniteCanvasElement,
    InfiniteCanvasAPI,
} from '@reffy/infinite-canvas';
import { CanvasStorage } from '@reffy/infinite-canvas/dist/storage';
import { useState, useEffect } from 'react';

export function useInfiniteCanvas(id: string) {
    const [ready, setReady] = useState(false);
    const [canvasApi, setCanvasApi] = useState<InfiniteCanvasAPI | null>(null);

    useEffect(() => {
        const el = document.getElementById(id);
        if (!el || !(el instanceof InfiniteCanvasElement)) {
            console.warn('Element is not ready yet.');
            return;
        }
        const onLoad = async () => {
            setCanvasApi(await InfiniteCanvasAPI.forElement(el));
            setReady(true);
        };
        el.addEventListener('load', onLoad);
        return () => el.removeEventListener('load', onLoad);
    }, [id]);

    // return only the methods you need
    return {
        assignCanvasStorage: (storage: CanvasStorage, saveFrequency: number) =>
            canvasApi?.assignCanvasStorage(storage, saveFrequency),
        zoomIn: () => canvasApi?.zoomIn(),
        zoomOut: () => canvasApi?.zoomOut(),
        toggleMode: () => canvasApi?.toggleMode(),
        addImage: (data: string) => canvasApi?.addImage(data),
        addImageFromLocal: (fileList: FileList) =>
            canvasApi?.addImageFromLocal(fileList),
        exportCanvas: () => canvasApi?.exportCanvas(id),
        importCanvas: (fileList: FileList) => canvasApi?.importCanvas(fileList),
        clearCanvas: () => canvasApi?.clearCanvas(),
        snapToCenter: () => canvasApi?.snapToCenter(),
        generateThumbnail: (width?: number, height?: number) =>
            canvasApi?.generateContentThumbnail(width, height),
        isReady: ready,
        api: canvasApi,
    };
}
```

```jsx
import React, { useRef } from 'react';
import { useInfiniteCanvas } from '@src/hook/useInfiniteCanvas';

export function CanvasButtons({ id } : { id: string }) {
  const canvasApi = useInfiniteCanvas(id);

  return (
    <div>
      <button
        onClick={canvasApi?.toggleMode}
      >
        Toggle Mode
      </button>
    </div>
  )
}
```