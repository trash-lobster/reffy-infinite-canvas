import { CameraState } from "../state";
import { reaction } from "mobx";
import { AABB } from "../bounding";

export const ZOOM_MIN = 0.02;
export const ZOOM_MAX = 20;

export class Camera {
  state: CameraState;
  // these are the origin of the camera viewport
  viewportX: number = 0;
  viewportY: number = 0;
  private updateReaction: () => void;
  getWorldCoords: (x: number, y: number) => number[];
  setWorldMatrix: (matrix: number[]) => void;
  updateWorldMatrix: () => void;

  constructor(
    state: CameraState,
    setWorldMatrix: (matrix: number[]) => void,
    updateWorldMatrix: () => void,
    getWorldCoords: (x: number, y: number) => number[],
  ) {
    this.state = state;

    this.updateCameraPos = this.updateCameraPos.bind(this);
    this.updateZoom = this.updateZoom.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.worldToCamera = this.worldToCamera.bind(this);

    this.getWorldCoords = getWorldCoords;
    this.setWorldMatrix = setWorldMatrix;
    this.updateWorldMatrix = updateWorldMatrix;

    this.updateReaction = reaction(
      () => this.state.stateVector,
      () => this.updateViewMatrix(),
    );

    // reaction does not auto run the function when assigned
    this.updateViewMatrix();
  }

  /**
   * Called once to update the `worldMatrix` of the attached canvas, which is the view matrix.
   */
  private updateViewMatrix() {
    this.setWorldMatrix(this.state.canvasMatrix);
    this.updateWorldMatrix();
  }

  setViewPortDimension(width: number, height: number) {
    if (this.state.width !== width) this.state.setWidth(width);
    if (this.state.height !== height) this.state.setHeight(height);
  }

  getBoundingBox() {
    const [minX, minY] = this.getWorldCoords(this.viewportX, this.viewportY);
    const [maxX, maxY] = this.getWorldCoords(
      this.state.width + this.viewportX,
      this.state.height + this.viewportY,
    );
    return new AABB(minX, minY, maxX, maxY);
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();

    const ZOOM_SPEED = 0.003;
    const scale = Math.exp(-e.deltaY * ZOOM_SPEED);
    this.updateZoom(e.clientX, e.clientY, scale);
  }

  updateCameraPos(dx: number, dy: number) {
    this.state.incrementPosition(dx, dy);
  }

  setCameraPos(x: number, y: number) {
    this.state.setPosition(x, y);
  }

  /**
   * Pass in the center position to resolve the scaling around
   */
  updateZoom(x: number, y: number, scale: number) {
    const [wx0, wy0] = this.getWorldCoords(x, y);
    this.state.setZoom(
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.state.zoom * scale)),
    );

    const [wx1, wy1] = this.getWorldCoords(x, y);

    this.state.incrementPosition(wx0 - wx1, wy0 - wy1);
  }

  worldToCamera(wx: number, wy: number) {
    const m = this.state.cameraMatrix;
    const x = m[0] * wx + m[1] * wy + m[2];
    const y = m[3] * wx + m[4] * wy + m[5];
    return [x, y];
  }

  dispose() {
    if (this.updateReaction) {
      this.updateReaction();
      this.updateReaction = undefined;
    }
  }
}
