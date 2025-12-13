import { BoundingBoxCollisionType, CanvasEvent, oppositeCorner } from "../util";
import { Rect, Renderable, Shape } from "../shapes";
import { Canvas } from "Canvas";
import { Point } from "bounding/type";
import {
  AABB,
  BoundingBox,
  MarqueeSelectionBox,
  MultiBoundingBox,
} from "../bounding";
import { CanvasHistory } from "../history";
import { makeMultiRemoveChildCommand } from "./SceneCommand";
import { FlipDirection, makeMultiFlipCommand } from "./FlipCommand";
import EventEmitter from "eventemitter3";
import { makeMultiTransformCommand } from "./TransformCommand";

export type AlignDirection = "top" | "bottom" | "left" | "right";
export type NormalizeOption = "height" | "width" | "size" | "scale";
export type NormalizeMode = "first" | "average";

export class SelectionManager {
  // #canvas: Canvas;
  #history: CanvasHistory;

  #selected: Set<Rect> = new Set();
  #boundingBoxes: Set<BoundingBox> = new Set();
  #multiBoundingBox: MultiBoundingBox;
  #marqueeSelectionBox: MarqueeSelectionBox;
  #eventHub: EventEmitter;

  get multiBoundingBox() {
    return this.#multiBoundingBox;
  }
  get boundingBoxes() {
    return this.#boundingBoxes;
  }

  #renderDirtyFlag = true;

  #gl: WebGLRenderingContext;
  #rectProgram: WebGLProgram;

  getWorldMatrix: () => number[];
  getCanvasChildren: () => Renderable[];
  getWorldCoords: (x: number, y: number) => number[];

  get selected(): Rect[] {
    return Array.from(this.#selected);
  }
  set selected(shapes: Rect[]) {
    this.#selected.clear();

    shapes.forEach((shape) => {
      this.#selected.add(shape);
      this.#boundingBoxes.add(new BoundingBox(shape));
    });
  }

  get marqueeBox(): MarqueeSelectionBox {
    return this.#marqueeSelectionBox;
  }
  set marqueeBox(startingPoint: Point) {
    this.#marqueeSelectionBox = new MarqueeSelectionBox(
      startingPoint.x,
      startingPoint.y,
      this.getWorldMatrix(),
    );
  }

  constructor(
    history: CanvasHistory,
    eventHub: EventEmitter,
    gl: WebGLRenderingContext,
    basicShapeProgram: WebGLProgram,
    getWorldMatrix: () => number[],
    getCanvasChildren: () => Renderable[],
    getWorldCoords: (x: number, y: number) => number[],
  ) {
    this.#gl = gl;
    this.#rectProgram = basicShapeProgram;
    this.#history = history;
    this.#eventHub = eventHub;
    this.getWorldMatrix = getWorldMatrix;
    this.getCanvasChildren = getCanvasChildren;
    this.getWorldCoords = getWorldCoords;

    const proto = Object.getPrototypeOf(this);
    for (const key of Object.getOwnPropertyNames(proto)) {
      const val = this[key];
      if (typeof val === "function" && key !== "constructor") {
        this[key] = val.bind(this);
      }
    }
  }

  // add, remove selected
  add(shapes: Rect[]) {
    shapes.forEach((shape) => {
      if (!this.#selected.has(shape)) {
        this.#selected.add(shape);
        this.#boundingBoxes.add(new BoundingBox(shape));
      }
    });

    if (this.#boundingBoxes.size > 1) {
      this.#boundingBoxes.forEach((box) => box.setPassive());

      if (!this.#multiBoundingBox) {
        this.#multiBoundingBox = new MultiBoundingBox([]);
      }

      this.selected.forEach((shape) => this.#multiBoundingBox.add(shape));
    }
  }

  remove(shapes: Rect[]) {
    shapes.forEach((shape) => {
      if (!this.#selected.has(shape)) return;
      this.#selected.delete(shape);
      const matchingBoundingBox = Array.from(this.#boundingBoxes.values()).find(
        (box) => box.target === shape,
      );
      if (matchingBoundingBox) {
        this.#boundingBoxes.delete(matchingBoundingBox);
      } else {
        console.error("No matching bounding box found");
      }

      if (this.#multiBoundingBox) {
        this.#multiBoundingBox.remove(shape);
      }
    });

    if (this.#boundingBoxes.size <= 1) {
      this.#boundingBoxes.forEach((box) => box.setActive());
      this.#multiBoundingBox = null;
    }
  }

  deleteSelected(canvas: Canvas) {
    const toBeDeleted = [...this.#selected];
    this.remove(toBeDeleted);
    for (const selected of toBeDeleted) {
      selected.destroy();
    }

    this.#history.push(makeMultiRemoveChildCommand(canvas, toBeDeleted));
  }

  /**
   * Checks first if there is a hit in a multibounding and its handles. If not, check the one bounding box that is active.
   */
  hitTest(wx: number, wy: number): BoundingBoxCollisionType | null {
    if (this.#multiBoundingBox) {
      const ans = this.#multiBoundingBox.hitTest(wx, wy, this.getWorldMatrix());
      if (ans) return ans;
    }

    for (const box of this.#boundingBoxes.values()) {
      const ans = box.hitTest(wx, wy, this.getWorldMatrix());
      if (ans) return ans;
    }

    return null;
  }

  isMultiBoundingBoxHit(wx: number, wy: number) {
    return (
      this.#multiBoundingBox &&
      this.#multiBoundingBox.hitTest(wx, wy, this.getWorldMatrix())
    );
  }

  isBoundingBoxHit(wx: number, wy: number) {
    return (
      this.#boundingBoxes.size === 1 &&
      Array.from(this.#boundingBoxes)[0].hitTest(wx, wy, this.getWorldMatrix())
    );
  }

  hitTestAdjustedCorner(wx: number, wy: number) {
    if (this.#multiBoundingBox) {
      const ans = this.#multiBoundingBox.hitTest(wx, wy, this.getWorldMatrix());
      if (ans) {
        if (
          this.#multiBoundingBox.scale[0] * this.#multiBoundingBox.scale[1] <
          0
        ) {
          return oppositeCorner(ans);
        }
        return ans;
      }
    }

    for (const box of this.#boundingBoxes.values()) {
      const ans = box.hitTest(wx, wy, this.getWorldMatrix());
      if (ans) {
        if (box.target.sx * box.target.sy < 0) {
          return oppositeCorner(ans);
        }
        return ans;
      }
    }
  }

  /**
   * Update the existing bounding boxes
   */
  update() {
    this.#boundingBoxes.forEach((box) => box.update());

    if (this.#multiBoundingBox) {
      this.#multiBoundingBox.update();
    }
  }

  render(program: WebGLProgram) {
    // Bind program and set z-up front
    if (
      !this.#marqueeSelectionBox &&
      !this.#multiBoundingBox &&
      this.#boundingBoxes.size === 0
    )
      return;
    this.#gl.useProgram(program);
    const uZLoc = this.#gl.getUniformLocation(program, "u_z");
    if (uZLoc) this.#gl.uniform1f(uZLoc, 1.0);

    // Draw everything using the same bound program
    if (this.#renderDirtyFlag) {
      this.#boundingBoxes.forEach((box) => box.render(this.#gl, program));
    }
    if (this.#multiBoundingBox) {
      this.#multiBoundingBox.render(this.#gl, program);
    }
    if (this.#marqueeSelectionBox) {
      this.#marqueeSelectionBox.render(this.#gl, program);
    }
  }

  isRectSelected(shape: Rect) {
    return this.#selected.has(shape);
  }

  clear() {
    this.#selected.clear();
    this.#boundingBoxes.clear();
    this.#multiBoundingBox = null;
  }

  clearMarquee() {
    if (this.#marqueeSelectionBox) {
      this.#marqueeSelectionBox = null;
    }
  }

  move(dx: number, dy: number) {
    if (this.#multiBoundingBox) {
      this.#multiBoundingBox.move(dx, dy);
    } else {
      for (const box of this.#boundingBoxes) {
        box.move(dx, dy);
      }
    }
    this.#eventHub.emit(CanvasEvent.Change);
  }

  /**
   * Based on the corner you're dragging and the sign of the scaleX and scaleY values, there are only four possible sets of changes to the target's translation.
   * 1) absolutely no change
   * 2) x translation change only if negative delta
   * 3) y translation change only if negative delta
   * 4) x and y translation change if negative delta
   * The tricky part is to consider the signs of the scale values and determine which corner is going to inhabit which behaviour.
   * @param dx
   * @param dy
   * @param direction
   */
  resize(dx: number, dy: number, direction: BoundingBoxCollisionType) {
    if (this.multiBoundingBox) {
      this.multiBoundingBox.resize(dx, dy, direction, this.getWorldMatrix());
    }

    for (const box of this.boundingBoxes) {
      if (this.multiBoundingBox) {
        box.update();
      } else {
        box.resize(dx, dy, direction);
      }
    }
    this.#eventHub.emit(CanvasEvent.Change);
  }

  flip(direction: FlipDirection) {
    if (this.multiBoundingBox) {
      const transformArray = this.multiBoundingBox.flip(
        this.getWorldMatrix(),
        direction,
        this.getWorldCoords,
      );
      this.#history.push(
        makeMultiFlipCommand(transformArray, direction, this.multiBoundingBox),
      );
    } else {
      const transformArray = [];
      for (const box of this.boundingBoxes) {
        transformArray.push(box.flip(direction));
      }

      this.#history.push(makeMultiFlipCommand(transformArray, direction));
    }
    this.#eventHub.emit(CanvasEvent.Change);
  }

  alignSelection(direction: AlignDirection) {
    if (!this.multiBoundingBox) return;
    const transformations = this.multiBoundingBox.align(direction);
    this.#history.push(makeMultiTransformCommand(transformations));
    this.#eventHub.emit(CanvasEvent.Change);
  }

  normalize(type: NormalizeOption, mode: NormalizeMode = "first") {
    if (!this.multiBoundingBox) return;
    const transformations = this.multiBoundingBox.normalize(type, mode);
    this.#history.push(makeMultiTransformCommand(transformations));
    this.#eventHub.emit(CanvasEvent.Change);
  }

  onPointerMove(
    x: number,
    y: number,
    dx: number,
    dy: number,
    resizeDirection: BoundingBoxCollisionType,
    getGlobalClick: () => boolean,
    updateCameraPos: (x: number, y: number) => void,
    getWorldMatrix: () => number[],
  ) {
    if (getGlobalClick()) {
      updateCameraPos(x, y);
    } else if (resizeDirection && resizeDirection !== "CENTER") {
      this.resize(dx, dy, resizeDirection);
    } else if (this.marqueeBox) {
      this.marqueeBox.resize(dx, dy, getWorldMatrix());

      // use the four corners to check if there are any new entry
      const children = this.getCanvasChildren();
      const marqueeBox = this.marqueeBox.getBoundingBox(this.getWorldCoords);
      for (const child of children) {
        const box = (child as Rect).getBoundingBox();
        if (
          AABB.isColliding(box, marqueeBox) &&
          !this.#selected.has(child as Rect)
        ) {
          this.add([child as Rect]);
        } else if (
          !AABB.isColliding(box, marqueeBox) &&
          this.#selected.has(child as Rect)
        ) {
          this.remove([child as Rect]);
        }
      }
    } else {
      this.move(dx, dy);
    }
  }

  onSelectionPointerDown(
    isShiftKey: boolean,
    child: Shape,
    wx: number,
    wy: number,
  ) {
    if (child) {
      if (!isShiftKey) {
        this.clear();
      }
      this.add([child as Rect]);
    } else {
      this.clear();
      if (this.marqueeBox) {
        this.clearMarquee();
      } else {
        this.marqueeBox = { x: wx, y: wy };
      }
    }
  }

  // keep this for exporting as image in the future
  // async copy() {
  //     const images = this.selected as Img[];
  //     if (images.length === 0) return;

  //     let blob: Blob;

  //     if (images.length === 1 && images[0].src.startsWith('data:image/png')) {
  //         // Fast path: already a PNG data URL
  //         const [header, base64] = images[0].src.split(',');
  //         const binary = atob(base64);
  //         const array = new Uint8Array(binary.length);
  //         for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  //         blob = new Blob([array], { type: 'image/png' });
  //     } else {
  //         // Batch draw all images to an offscreen canvas
  //         const { mergedCanvas, width, height } = await mergeImagesToCanvas(images);
  //         blob = await new Promise<Blob>(resolve => mergedCanvas.toBlob(b => resolve(b), 'image/png'));
  //     }

  //     const storedItem = new ClipboardItem({ [blob.type]: blob });
  //     try {
  //         await navigator.clipboard.write([storedItem]);
  //     } catch (err) {
  //         console.error(err);
  //     }
  // }
}
