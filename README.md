# Reffy Infinite Canvas

A TypeScript Web Component (`<infinite-canvas>`) that provides an infinite, GPU-accelerated canvas for placing and manipulating reference images. Built with Lit + WebGL, the canvas enables selection, context menu, history (undo/redo), and a default persistent storage (IndexedDB + LocalStorage).

- Web Component: `<infinite-canvas>` renders a full-screen canvas and starts a render loop.
- Engine: WebGL-backed renderer with Grid, Img, Rect shapes and z-ordering.
- Interaction: Selection, flip, align, normalize, pointer/key/context menu managers.
- Persistence: Auto-save and manual import/export to JSON; deduplicated image storage via hashing.
- History: Composite commands push for undo/redo across interactions.

Live Demo Site: https://trash-lobster.github.io/reffy-infinite-canvas/

## A word from the developer

Before you carry on to read the rest of the documentation, I would like to first state that this project was heavily influenced by the following open-sourced projects:

- [Excalidraw](https://excalidraw.com/)
- [An infinite canvas tutorial](https://infinitecanvas.cc/)

They are both incredible resources and have sped up my own learning and I highly recommend browsing through their materials. I am still learning as I go and working on this project.

Additionally, I referenced [PureRef](https://www.pureref.com/) for a lot of the available functions. In fact, as the project continued development, it became clear that I wanted to create a version of PureRef, but for the web.

Happy learning!

## Aim of the project

While working on a separate, but related project, I was making a lot of progress leveraging Excalidraw and enjoying the fact that I did not have to think or write my own implementation. However, Excalidraw, despite how fantastic it is, came coupled with a predetermined setup (toolbars and such) and a lot of functions that a pure image reference board would not need.

Thus, I made the challenging decision to try to write my own. Reffy Infinite Canvas aims to expose the APIs, enabling developers to customise their own canvas toolbars.

While not everything is customisable, it does offer more options than Excalidraw, achieving part of the initial goal.

## Installation

```powershell
npm i reffy-infinite-canvas
```

## API

To utilise the API, create the canvas and set up some way for the canvas to be discoverable through JS/TS.

```js
const el = document.querySelector('#canvas') as InfiniteCanvasElement;

InfiniteCanvasAPI.forElement(el).then(api => {
    // example: toggling the grid mode for the canvas
    const modeButton = document.getElementById('mode-button') as HTMLButtonElement;
    modeButton.onclick  = api.toggleMode.bind(api);
};
```

## Image transformation

Available image transformations:

- Flip
- Normalize (by first selected and average)
- Align
- Scale
- Move

## Persistent storage

While there is a default set up for users to pick up and go, you can use the API to connect up a different source to write and read from.

Take a look at the code snippet below for an example set up.

```typescript
// sample code
const el = document.querySelector('#canvas') as InfiniteCanvasElement;

InfiniteCanvasAPI.forElement(el).then(api => {

    const canvasStorage: CanvasStorage = { /** Add your custom canvas storage in here */ };

    const fileStorage: FileStorage = { /** Add your custom local storage for file here */ };

    el.assignCanvasStorage(canvasStorage);
    el.assignFileStorage(fileStorage);
};
```

The design for image storage is styled after Excalidraw. This means breaking the canvas data into two parts.

- `FileStorage` is how we store the image data. In case of multiple copies of the same image, the storage is made more efficient by relying on hashing the image data as the file id, by which the canvas data uses to get the image data.
- `CanvasStorage` is the layout of the canvas. This means camera position, keeping track of the images placed onto the canvas, their positions, and their transformation.

The canvas is reconstructed each time you load the canvas.

When setting up the canvasStorage, you can add the custom canvas storage and add a frequency, measured in ms. The default is 300000 ms (or, 5 minutes).

### TODO:

- Add method to allow custom setting of how frequent auto save should be
