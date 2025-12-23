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
import { serializeCanvas } from "./serializer";
import EventEmitter from "eventemitter3";
import { AABB } from "./bounding";
import { ImageFileMetadata } from "./storage";

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

  #screenShotCaptureSize: {
    x: number;
    y: number;
    width: number;
    height: number;
  } = null;

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
    getFileFromStorage: (id: string) => Promise<ImageFileMetadata>,
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
    this.getCenterPoint = this.getCenterPoint.bind(this);

    this.assignEventListener = this.assignEventListener.bind(this);
    this.getWorldsCoordsFromCanvas = (x: number, y: number) =>
      getWorldCoords(x, y, this);

    // marquee coordinates are calculated based on viewport, so we need to adjust it by camera viewport spawn point
    const getMarqueeCoords = (x: number, y: number) =>
      getWorldCoords(
        x + this.camera.viewportX,
        y + this.camera.viewportY,
        this,
      );

    this.exportState = this.exportState.bind(this);
    this.clearChildren = this.clearChildren.bind(this);

    this.#selectionManager = new SelectionManager(
      history,
      eventHub,
      this.gl,
      this.#basicShapeProgram,
      () => this.worldMatrix,
      () => this.children,
      this.getWorldsCoordsFromCanvas,
      getMarqueeCoords,
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
      paste: (x: number, y: number) => paste(x, y, this, history, getFileFromStorage),
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

    if (this.#screenShotCaptureSize) {
      this.#gl.viewport(
        this.#screenShotCaptureSize.x,
        this.#screenShotCaptureSize.y,
        this.#screenShotCaptureSize.width,
        this.#screenShotCaptureSize.height,
      );
      this.camera.setViewPortDimension(
        this.#screenShotCaptureSize.width,
        this.#screenShotCaptureSize.height,
      );
    } else {
      const parentBoundingBox =
        this.canvas.parentElement.getBoundingClientRect();
      this.camera.setViewPortDimension(
        parentBoundingBox.width,
        parentBoundingBox.height,
      );
    }

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

      // ignore culling when performing screen shot
      if (
        !this.#screenShotCaptureSize &&
        !AABB.isColliding(cameraBoundingBox, renderable.getBoundingBox())
      ) {
        renderable.culled = true;
      } else {
        rendered++;
        this.renderList.push(renderable);
        renderable.culled = false;
      }
    }

    // should set low res based on what screen area it has taken up
    const [sww, swh] = getWorldCoords(0, 0, this);
    const [ww, wh] = getWorldCoords(
      window.screen.width,
      window.screen.height,
      this,
    );
    const screenAABB = new AABB(sww, swh, ww, wh);

    // ignore low res calculation when performing screenshot, quality is determined by processing anyways
    this.renderList.forEach((child) => {
      if (child instanceof Img) {
        const useLowRes = (child as Img).determineIfLowRes(
          screenAABB,
          this.camera.state.zoom,
        );

        (child as Img).setUseLowRes(
          this.#screenShotCaptureSize ? false : useLowRes,
          this.gl,
        );
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
    this.saveImgFileToStorage(src).then((id) => (newImg.fileId = id));

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

  snapToCenter() {
    // move camera so its focus is on center point
    const [camW, camH] = this.#camera.state.dimension;

    const zoom = this.#camera.state.zoom;
    const center = this.getCenterPoint();
    const diffX = center[0] - (camW * zoom) / 2;
    const diffY = center[1] - (camH * zoom) / 2;

    this.#camera.setCameraPos(diffX, diffY);
  }

  async getViewportThumbnail(width: number, height: number): Promise<string> {
    await new Promise(requestAnimationFrame);

    this.render();
    const src = this.gl.canvas as HTMLCanvasElement;

    if (typeof OffscreenCanvas !== "undefined") {
      const off = new OffscreenCanvas(width, height);
      const ctx = off.getContext("2d");
      if (!ctx) throw new Error("Failed to get 2D context for OffscreenCanvas");
      ctx.imageSmoothingEnabled = true;

      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, width, height);

      const blob = await off.convertToBlob({
        type: "image/jpeg",
        quality: 0.92,
      });

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return dataUrl;
    }

    // Fallback to DOM canvas in environments without OffscreenCanvas
    const out = document.createElement("canvas");
    out.width = width;
    out.height = height;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context for Canvas");
    ctx.imageSmoothingEnabled = true;

    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, width, height);
    return out.toDataURL("image/jpeg");
  }

  async getContentThumbnail(outputDimension?: {
    width: number;
    height: number;
  }): Promise<string> {
    const gl = this.gl;
    const width = outputDimension.width ?? this.canvas.width;
    const height = outputDimension.height ?? this.canvas.height;

    // Create offscreen target
    const fbo = gl.createFramebuffer();
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0,
    );

    // Save camera; compute target framing
    // deselect things as well in the meantime and then reselect it
    const prev = {
      x: this.camera.state.x,
      y: this.camera.state.y,
      zoom: this.camera.state.zoom,
      selected: [...this.selectionManager.selected],
      gridType: this.grid.gridType,
    };
    this.selectionManager.clear();

    const bounds = this.getContentBound();

    if (!bounds) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteTexture(tex);
      gl.deleteFramebuffer(fbo);
      return this.getViewportThumbnail(width, height);
    }

    const { scale, canvasHeight, canvasWidth, contentHeight, contentWidth } =
      this.calculateScaleForThumbnail(bounds, width, height);

    const targetZoom = Math.max(0.0001, scale);
    this.camera.state.setZoom(targetZoom);

    const center = this.getCenterPoint();
    const diffX = center[0] - (this.canvas.width * targetZoom) / 2;
    const diffY = center[1] - (this.canvas.height * targetZoom) / 2;

    this.#camera.setCameraPos(diffX, diffY);

    // Render offscreen
    this.#screenShotCaptureSize = {
      x: (width - canvasWidth) / 2,
      y: (height - canvasHeight) / 2,
      // ensure that the image stays proportioned - the passed in values of height and width must match the AR of the canvas you're using
      height: canvasHeight,
      width: canvasWidth,
    };
    this.grid.gridType = 0;
    this.render(); // draws into FBO, not the visible canvas

    this.#screenShotCaptureSize = null;

    // // Read pixels
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    const rowSize = width * 4;
    const flipped = new Uint8ClampedArray(pixels.length);
    for (let y = 0; y < height; y++) {
      const srcStart = y * rowSize;
      const dstStart = (height - 1 - y) * rowSize;
      flipped.set(pixels.subarray(srcStart, srcStart + rowSize), dstStart);
    }

    // Restore
    this.camera.state.setZoom(prev.zoom);
    this.camera.setCameraPos(prev.x, prev.y);
    this.grid.gridType = prev.gridType;
    this.selectionManager.selected = prev.selected;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.deleteTexture(tex);
    gl.deleteFramebuffer(fbo);

    // // Encode via OffscreenCanvas (fast) into data URL
    const off =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : null;
    if (off) {
      const ctx = off.getContext("2d")!;
      const imgData = new ImageData(flipped, width, height);
      ctx.putImageData(imgData, 0, 0);
      const blob = await off.convertToBlob({
        type: "image/jpeg",
        quality: 0.92,
      });
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } else {
      const out = document.createElement("canvas");
      out.width = width;
      out.height = height;
      const ctx = out.getContext("2d")!;
      const imgData = new ImageData(flipped, width, height);
      ctx.putImageData(imgData, 0, 0);
      return out.toDataURL("image/jpeg");
    }
  }

  /**
   *
   * @param bounds The content box bound dimensions in world space
   * @param width Expected output thumbnail width
   * @param height Expected output thumbnail height
   * @returns
   */
  protected calculateScaleForThumbnail(
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    width: number,
    height: number,
  ) {
    /**
     * calculate this in two folds
     * - first, figure out how the content is captured within the output dimensions
     * - next, calculate the smallest canvas container (with canvas proportion) that can fit the output dimension without compromising its size
     */
    const worldW = bounds.maxX - bounds.minX;
    const worldH = bounds.maxY - bounds.minY;

    const worldAspectRatio = worldW / worldH;
    const canvasAspectRatio = this.canvas.width / this.canvas.height;

    const cameraSpaceH =
      width / worldAspectRatio > height ? height : width / worldAspectRatio;
    const cameraSpaceW =
      height * worldAspectRatio > width ? width : height * worldAspectRatio;

    // make sure that the 'new' canvas proportion will fit the output dimension without making it any smaller
    const canvasH = width > height ? width / canvasAspectRatio : height;
    const canvasW = width > height ? width : height * canvasAspectRatio;

    const contentScale = Math.max(worldW / cameraSpaceW, worldH / cameraSpaceH);
    const canvasScale = Math.max(
      canvasW / this.canvas.width,
      canvasH / this.canvas.height,
    );

    // scale by content scale and canvas scale
    const scale = contentScale * canvasScale;

    return {
      scale,
      canvasHeight: canvasH,
      canvasWidth: canvasW,
      contentWidth: cameraSpaceW,
      contentHeight: cameraSpaceH,
    };
  }

  private getContentBound() {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let found = false;
    for (const child of this.children) {
      if (!(child instanceof Img)) continue;
      const edges = child.getEdge();

      if (
        !isFinite(edges.minX) ||
        !isFinite(edges.minY) ||
        !isFinite(edges.maxX) ||
        !isFinite(edges.maxY)
      ) {
        continue;
      }

      found = true;
      minX = Math.min(minX, edges.minX);
      maxX = Math.max(maxX, edges.maxX);
      minY = Math.min(minY, edges.minY);
      maxY = Math.max(maxY, edges.maxY);
    }

    return found ? { minX, minY, maxX, maxY } : null;
  }

  private getCenterPoint() {
    let minX = Number.MAX_SAFE_INTEGER,
      minY = Number.MAX_SAFE_INTEGER,
      maxX = Number.MIN_SAFE_INTEGER,
      maxY = Number.MIN_SAFE_INTEGER;
    for (const child of this.children) {
      if (!(child instanceof Img)) continue;
      const edges = child.getEdge();
      minX = Math.min(minX, edges.minX);
      maxX = Math.max(maxX, edges.maxX);
      minY = Math.min(minY, edges.minY);
      maxY = Math.max(maxY, edges.maxY);
    }

    return [(minX + maxX) / 2, (minY + maxY) / 2];
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
