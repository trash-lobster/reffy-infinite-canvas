## Background
This is a typescript project to create an infinite canvas web component and its associated APIs. The aim is for any front end project to simply import and use this infinite canvas and use its API. The final product will be a package.

The infinite canvas is mainly aimed for storing images only. There may be plans to add generation of other shapes in the future, but not for the basic implementation.

The images painted on screen is through WebGL.

State management is done through MobX.

## Project Structure
- `examples` is where we can test and run the infinite canvas
- `src` is where the source code is stored and where the component will be build from
    - `boundingBox` is the bounding box that will be generated when images are selected
    - `camera` is the camera control
    - `manager` manages the different user interaction with the canvas, including keyboard events, pointer events and selections. Individual commands are written to history as well.
    - `serializer` will manage the export/import of the state of the infinite canvas into a JSON format and also.
    - `shaders` are the shaders for the generation of shapes using WebGL.
    - `shapes` is where the different shape entities are laid out. It essentially has a adoption chain where your basic unit is a `Renderable` and `Shape`, `Grid` etc. inherit it.
    - `state` is where we use MobX to manage the different entities' states - producing actions and calculation.
    - `util` is where the utility functions are stored.
    - `API.ts` is where the API methods are export. It is crucial that the API object is connected to the infinite canvas instance created. If a user creates more than one infinite canvas, the API needs to be independent.
    - `Canvas.ts` houses the key canvas class that connects up with the managers.
    - `Component.ts` puts the infinite canvas out as a web component.

## Architecture
The produced code should ideally be as decoupled as possible. If it is sensible, generate all the required functions on initialisation and inject them into the objects that need them, rather than direct reference.

## Code style - to use Prettier in future to enforce instead
- 4 tabs for indentation
- Must end block with ';'