import {
  BoundingBoxCollisionType,
  CanvasEvent,
  convertToPNG,
  createProgram,
  getWorldCoords,
  paste,
} from "./util";
import {
  shapeVert,
  shapeFrag,
  imageFrag,
  imageVert,
  gridVert,
  gridFrag,
} from "./shaders";
import { Shape, Img, Renderable, Grid, GRID_TYPE } from "./shapes";
import {
  SelectionManager,
  PointerEventManager,
  KeyEventManager,
  ContextMenuManager,
  makeMultiOrderCommand,
} from "./manager";
import { Camera } from "./camera";
import { CameraState, PointerEventState } from "./state";
import { CanvasHistory } from "./history";
import {
  deserializeCanvas,
  serializeCanvas,
  SerializedCanvas,
} from "./serializer";
import EventEmitter from "eventemitter3";
import { ImageFileMetadata } from "./storage";
import { AABB } from "./bounding";

export class Canvas extends Renderable {
  #canvas: HTMLCanvasElement;
  #eventHub: EventEmitter;
  #history: CanvasHistory;
  #camera: Camera;

  #gl: WebGLRenderingContext;
  #basicShapeProgram: WebGLProgram;
  #imageProgram: WebGLProgram;
  #gridProgram: WebGLProgram;
  #grid: Grid;

  #isGlobalClick = true;

  #selectionManager: SelectionManager;
  #pointerEventManager: PointerEventManager;
  #keyPressManager: KeyEventManager;
  #contextMenuManager: ContextMenuManager;

  writeToStorage: () => void;
  saveImgFileToStorage: (data: string) => Promise<string | number | null>;
  getContainerDimension: () => number[];
  getWorldsCoordsFromCanvas: (x: number, y: number) => number[];

  private orderDirty = true;
  private renderList: Shape[] = [];

  // Call this whenever children/layers/z-order change
  markOrderDirty() {
    this.orderDirty = true;
  }

  get gl() {
    return this.#gl;
  }
  get grid() {
    return this.#grid;
  }
  get history() {
    return this.#history;
  }
  get eventHub() {
    return this.#eventHub;
  }
  get pointerEventManager() {
    return this.#pointerEventManager;
  }
  get selectionManager() {
    return this.#selectionManager;
  }
  get contextMenuManager() {
    return this.#contextMenuManager;
  }
  get canvas() {
    return this.#canvas;
  }
  get camera() {
    return this.#camera;
  }
  get isGlobalClick() {
    return this.#isGlobalClick;
  }
  set isGlobalClick(val: boolean) {
    this.#isGlobalClick = val;
  }
  get basicShapeProgram() {
    return this.#basicShapeProgram;
  }

  constructor(
    canvas: HTMLCanvasElement,
    history: CanvasHistory,
    eventHub: EventEmitter,
    writeToStorage: () => void,
    saveImgFileToStorage: (data: string) => Promise<string | number | null>,
    getContainerDimension: () => number[],
  ) {
    super();
    this.#canvas = canvas;
    this.#eventHub = eventHub;
    this.#history = history;

    this.#grid = new Grid();
    this.#gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
    });
    this.#gl.enable(this.#gl.BLEND);
    this.#gl.blendFunc(this.#gl.SRC_ALPHA, this.#gl.ONE_MINUS_SRC_ALPHA);

    this.#gl.getExtension("OES_standard_derivatives"); // required to enable fwidth

    this.#gl.enable(this.#gl.DEPTH_TEST);
    this.#gl.depthFunc(this.#gl.LEQUAL);

    this.#basicShapeProgram = createProgram(this.#gl, shapeVert, shapeFrag);
    this.#imageProgram = createProgram(this.#gl, imageVert, imageFrag);
    this.#gridProgram = createProgram(this.#gl, gridVert, gridFrag);

    this.writeToStorage = writeToStorage;
    this.saveImgFileToStorage = saveImgFileToStorage;
    this.getContainerDimension = getContainerDimension;

    this.engine = this.engine.bind(this);
    this.getBoundingClientRect = this.getBoundingClientRect.bind(this);
    this.appendChild = this.appendChild.bind(this);
    this.addImageToCanvas = this.addImageToCanvas.bind(this);
    this.setShapeZOrder = this.setShapeZOrder.bind(this);

    this.toggleGrid = this.toggleGrid.bind(this);
    this.changeMode = this.changeMode.bind(this);
    this.getSelected = this.getSelected.bind(this);
    this.updateZoomByFixedAmount = this.updateZoomByFixedAmount.bind(this);

    this.assignEventListener = this.assignEventListener.bind(this);
    this.getWorldsCoordsFromCanvas = (x: number, y: number) =>
      getWorldCoords(x, y, this);

    this.exportState = this.exportState.bind(this);
    this.importState = this.importState.bind(this);
    this.clearChildren = this.clearChildren.bind(this);

    this.#selectionManager = new SelectionManager(
      history,
      eventHub,
      this.gl,
      this.#basicShapeProgram,
      () => this.worldMatrix,
      () => this.children,
      this.getWorldsCoordsFromCanvas,
    );

    const cameraState = new CameraState({});
    this.#camera = new Camera(
      cameraState,
      this.setWorldMatrix,
      this.updateWorldMatrix,
      this.getWorldsCoordsFromCanvas,
    );

    this.#keyPressManager = new KeyEventManager(
      history,
      eventHub,
      () => this.selectionManager.deleteSelected(this),
      this.assignEventListener,
    );

    this.#contextMenuManager = new ContextMenuManager(
      eventHub,
      this.selectionManager.isMultiBoundingBoxHit,
      this.selectionManager.isBoundingBoxHit,
      this.getWorldsCoordsFromCanvas,
      this.assignEventListener,
    );

    const pointerEventState = new PointerEventState();

    const pointerManagerDeps = {
      history,
      eventHub,
      state: pointerEventState,
      isContextMenuActive: () => this.#contextMenuManager.isActive,
      getSelected: () => this.#selectionManager.selected,
      getChildren: () => this.children,
      getWorldMatrix: () => this.worldMatrix,
      getCanvasGlobalClick: () => this.isGlobalClick,
      setCanvasGlobalClick: (val: boolean) => (this.isGlobalClick = val),
      getWorldCoords: this.getWorldsCoordsFromCanvas,
      updateCameraPos: this.camera.updateCameraPos,
      onWheel: this.camera.onWheel,
      setCursorStyle: (val: string) => (canvas.style.cursor = val),
      paste: (x: number, y: number) => paste(x, y, this, history),
      assignEventListener: this.assignEventListener,
      closeMarquee: this.#selectionManager.clearMarquee,
      selectionPointerMove: (
        x: number,
        y: number,
        dx: number,
        dy: number,
        resizeDirection: BoundingBoxCollisionType,
      ) =>
        this.#selectionManager.onPointerMove(
          x,
          y,
          dx,
          dy,
          resizeDirection,
          () => this.isGlobalClick,
          this.camera.updateCameraPos,
          () => this.worldMatrix,
        ),
      onSelectionPointerDown: this.selectionManager.onSelectionPointerDown,
      checkIfSelectionHit: this.selectionManager.hitTest,
      addSelection: this.selectionManager.add,
      clearSelection: this.selectionManager.clear,
      isSelection: this.selectionManager.isRectSelected,
      hitTestAdjustedCorner: this.selectionManager.hitTestAdjustedCorner,
    };

    this.#pointerEventManager = new PointerEventManager(pointerManagerDeps);

    this.#eventHub.on("save", this.writeToStorage);
  }

  engine() {
    return this;
  }

  get totalNumberOfChildren() {
    return this.children.length;
  }

  get numberOfChildrenRendered() {
    return this.renderList.length;
  }

  appendChild<T extends Renderable>(child: T): T {
    super.appendChild(child);
    if (child instanceof Shape) {
      const orders = (this.children as Shape[]).map((s) => s.renderOrder);
      const maxOrder = orders.length ? Math.max(...orders) : 0;

      child.renderOrder = maxOrder + 1;
    }
    this.markOrderDirty();
    return child;
  }

  removeChild(child: Renderable): void {
    this.state.removeChild(child);
    if (this.#selectionManager) {
      this.#selectionManager.remove([child as any]);
    }
    child.destroy();
    this.markOrderDirty();
  }

  getChild(id: number): Renderable {
    return this.state.getChild(id);
  }

  updateWorldMatrix() {
    this.#grid.updateWorldMatrix(this.worldMatrix);
    this.children.forEach((child) => {
      child.updateWorldMatrix(this.worldMatrix);
    });
    this.#selectionManager.update();
  }

  render() {
    this.#gl.clearColor(0, 0, 0, 0);
    this.#gl.clear(this.#gl.COLOR_BUFFER_BIT | this.#gl.DEPTH_BUFFER_BIT);
    this.#gl.viewport(0, 0, this.#gl.canvas.width, this.#gl.canvas.height);

    const parentBoundingBox = this.canvas.parentElement.getBoundingClientRect();
    this.camera.setViewPortDimension(
      parentBoundingBox.width,
      parentBoundingBox.height,
    );

    this.#gl.useProgram(this.#gridProgram);
    const uZGrid = this.#gl.getUniformLocation(this.#gridProgram, "u_z");
    this.#gl.uniform1f(uZGrid, 0.0);
    this.#grid.render(this.#gl, this.#gridProgram);

    const cameraBoundingBox = this.camera.getBoundingBox();

    let totalRenderable = 0;
    let rendered = 0;
    this.renderList = [];

    for (const renderable of this.children as Shape[]) {
      totalRenderable++;

      if (!AABB.isColliding(cameraBoundingBox, renderable.getBoundingBox())) {
        renderable.culled = true;
      } else {
        rendered++;
        this.renderList.push(renderable);
        renderable.culled = false;
      }
    }

    // should set low res based on what screen area it has taken up
    this.renderList.forEach((child) => {
      if (child instanceof Img) {
        const useLowRes = (child as Img).determineIfLowRes(
          cameraBoundingBox,
          this.camera.state.zoom,
        );

        (child as Img).setUseLowRes(useLowRes, this.gl);
      }
    });

    for (const renderable of this.renderList) {
      let program: WebGLProgram;

      if (renderable instanceof Img) {
        program = this.#imageProgram;
      } else if (renderable instanceof Shape) {
        program = this.#basicShapeProgram;
      }

      this.#gl.useProgram(program);

      const uZLoc = this.#gl.getUniformLocation(program, "u_z");
      this.#gl.uniform1f(uZLoc, renderable.getZ());
      renderable.render(this.#gl, program);
    }

    this.#selectionManager.render(this.#basicShapeProgram);
  }

  destroy() {
    // Clean up programs
    this.#gl.deleteProgram(this.#basicShapeProgram);
    this.#gl.deleteProgram(this.#imageProgram);

    // Clean up all renderables
    this.children.forEach((child) => {
      if ("destroy" in child) {
        child.destroy();
      }
    });

    this.clearChildren();
  }

  getDOM() {
    return this.#canvas;
  }

  assignEventListener(
    type: string,
    fn: (() => void) | ((e: any) => void),
    options?: boolean | AddEventListenerOptions,
  ) {
    this.#canvas.addEventListener(type, fn, options);
  }

  hitTest(x: number, y: number) {
    this.#isGlobalClick = true;
    return this.#isGlobalClick;
  }

  async addImageToCanvas(
    src: string,
    x: number,
    y: number,
    sx: number = 1,
    sy: number = 1,
    center: boolean = false,
  ) {
    const newImg = new Img({ x: x, y: y, src, sx, sy });
    newImg.fileId = await this.saveImgFileToStorage(src);

    if (center) {
      const preview = new Image();
      preview.src = !src.startsWith("data:image/png")
        ? await convertToPNG(src)
        : src;

      preview.onload = () => {
        const w = preview.naturalWidth || preview.width || 0;
        const h = preview.naturalHeight || preview.height || 0;
        if (w || h) newImg.updateTranslation(-w / 2, -h / 2);
        newImg.src = preview.src;
        this.appendChild(newImg);
      };
    }

    this.#eventHub.emit("save");
    this.#eventHub.emit(CanvasEvent.Change);
    return newImg;
  }

  exportState() {
    return serializeCanvas(this);
  }

  async importState(
    data: SerializedCanvas,
    getFile: (fileId: string | number) => Promise<ImageFileMetadata>,
  ) {
    return await deserializeCanvas(data, this, getFile);
  }

  clearChildren() {
    this.selectionManager.clear();
    this.state.clearChildren(); // should clear history?
    this.#history.clear();
  }

  toggleGrid() {
    this.#grid.changeGridType(
      this.#grid.gridType === GRID_TYPE.GRID ? GRID_TYPE.NONE : GRID_TYPE.GRID,
    );
  }

  getSelected() {
    return this.#selectionManager.selected as Img[];
  }

  setShapeZOrder(toFront: boolean = true) {
    if (
      this.#selectionManager.multiBoundingBox ||
      this.#selectionManager.boundingBoxes.size != 1
    )
      return;

    const child = Array.from(this.#selectionManager.boundingBoxes)[0].target;

    const snapShotItem = {
      ref: child,
      start: {
        renderOrder: child.renderOrder,
      },
    };

    // Compute new renderOrder based on current scene
    const orders = (this.children as Shape[]).map((s) => s.renderOrder);

    if (orders.length === 0) {
      throw new Error("Order unexpected missing.");
    }

    const maxOrder = Math.max(...orders);
    const minOrder = Math.min(...orders);

    child.renderOrder = toFront ? maxOrder + 1 : minOrder - 1;

    snapShotItem["end"] = {
      renderOrder: child.renderOrder,
    };

    this.markOrderDirty();
    this.#history.push(makeMultiOrderCommand([snapShotItem]));
    this.#eventHub.emit(CanvasEvent.Change);
  }

  changeMode() {
    this.#pointerEventManager.changeMode();
    this.#selectionManager.clear();
  }

  updateZoomByFixedAmount(direction: 1 | -1 = 1) {
    this.#camera.updateZoom(
      this.#canvas.width / 2,
      this.#canvas.height / 2,
      Math.exp(0.5 * 0.3 * direction),
    );
  }

  getBoundingClientRect() {
    return this.#canvas.getBoundingClientRect();
  }

  private static webglStats = {
    buffersCreated: 0,
    buffersDeleted: 0,
    programsCreated: 0,
    programsDeleted: 0,
    texturesCreated: 0,
    texturesDeleted: 0,
    shadersCreated: 0,
    shadersDeleted: 0,
  };

  private wrapWebGLContext(gl: WebGLRenderingContext) {
    const originalCreateTexture = gl.createTexture.bind(gl);
    gl.createTexture = () => {
      Canvas.webglStats.texturesCreated++;
      console.log(`Textures created: ${Canvas.webglStats.texturesCreated}`);
      return originalCreateTexture();
    };
    const originalDeleteTexture = gl.deleteTexture.bind(gl);
    gl.deleteTexture = (texture: WebGLTexture | null) => {
      if (texture) {
        Canvas.webglStats.texturesDeleted++;
        console.log(`Textures deleted: ${Canvas.webglStats.texturesDeleted}`);
      }
      return originalDeleteTexture(texture);
    };
    const originalCreateShader = gl.createShader.bind(gl);
    gl.createShader = (type: number) => {
      Canvas.webglStats.shadersCreated++;
      console.log(`Shaders created: ${Canvas.webglStats.shadersCreated}`);
      return originalCreateShader(type);
    };
    const originalDeleteShader = gl.deleteShader.bind(gl);
    gl.deleteShader = (shader: WebGLShader | null) => {
      if (shader) {
        Canvas.webglStats.shadersDeleted++;
        console.log(`Shaders deleted: ${Canvas.webglStats.shadersDeleted}`);
      }
      return originalDeleteShader(shader);
    };

    return gl;
  }

  static getWebGLStats() {
    return {
      ...Canvas.webglStats,
      buffersLeaked:
        Canvas.webglStats.buffersCreated - Canvas.webglStats.buffersDeleted,
      programsLeaked:
        Canvas.webglStats.programsCreated - Canvas.webglStats.programsDeleted,
      texturesLeaked:
        Canvas.webglStats.texturesCreated - Canvas.webglStats.texturesDeleted,
      shadersLeaked:
        Canvas.webglStats.shadersCreated - Canvas.webglStats.shadersDeleted,
    };
  }
}
