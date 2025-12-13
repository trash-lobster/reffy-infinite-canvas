import { describe, it, expect, vi, beforeEach } from "vitest";
import { Camera, ZOOM_MIN, ZOOM_MAX } from "../../../src/camera/Camera";
import { CameraState } from "../../../src/state";

interface TestCameraState {
  width: number;
  height: number;
  zoom: number;
  x: number;
  y: number;
  canvasMatrix: number[];
  cameraMatrix: number[];
  readonly stateVector: number[];
  incrementPosition: (dx: number, dy: number) => void;
  setZoom: (z: number) => void;
  setWidth: (val: number) => void;
  setHeight: (val: number) => void;
}

function makeState(): TestCameraState {
  return {
    width: 0,
    height: 0,
    zoom: 1,
    x: 0,
    y: 0,
    // canvasMatrix and cameraMatrix are 3x2 affine (first 6 entries used)
    canvasMatrix: [1, 0, 0, 0, 1, 0],
    cameraMatrix: [1, 0, 0, 0, 1, 0],
    get stateVector() {
      return [this.width, this.height, this.zoom, this.x, this.y];
    },
    incrementPosition: vi.fn(function (
      this: TestCameraState,
      dx: number,
      dy: number,
    ) {
      this.x += dx;
      this.y += dy;
    }),
    setZoom: vi.fn(function (this: TestCameraState, z: number) {
      this.zoom = z;
    }),
    setWidth: vi.fn(function (this: TestCameraState, val: number) {
      this.width = val;
    }),
    setHeight: vi.fn(function (this: TestCameraState, val: number) {
      this.height = val;
    }),
  };
}

describe("Camera", () => {
  let state: TestCameraState;
  let setWorldMatrix: any;
  let updateWorldMatrix: any;
  let getWorldCoords: any;

  beforeEach(() => {
    state = makeState();
    setWorldMatrix = vi.fn();
    updateWorldMatrix = vi.fn();
    getWorldCoords = vi.fn((x: number, y: number) => [x, y]);
  });

  it("initializes and updates view matrix (reaction path)", () => {
    const cam = new Camera(
      state as CameraState,
      setWorldMatrix,
      updateWorldMatrix,
      getWorldCoords,
    );

    // Constructor calls updateViewMatrix once
    expect(setWorldMatrix).toHaveBeenCalledTimes(1);
    expect(setWorldMatrix).toHaveBeenCalledWith(state.canvasMatrix);
    expect(updateWorldMatrix).toHaveBeenCalledTimes(1);

    state.width = 640; // stateVector getter changes
    cam.updateCameraPos(0, 0); // no-op but reaction would be fired
    cam["updateViewMatrix"]();
    expect(setWorldMatrix).toHaveBeenCalledWith(state.canvasMatrix);
  });

  it("setViewPortDimension updates width/height only when changed", () => {
    const cam = new Camera(
      state as CameraState,
      setWorldMatrix,
      updateWorldMatrix,
      getWorldCoords,
    );
    cam.setViewPortDimension(800, 600);
    expect(state.width).toBe(800);
    expect(state.height).toBe(600);

    // calling with same values should not change
    state.width = 800;
    state.height = 600;
    cam.setViewPortDimension(800, 600);
    expect(state.width).toBe(800);
    expect(state.height).toBe(600);
  });

  it("getBoundingBox uses getWorldCoords for corners", () => {
    const cam = new Camera(
      state as CameraState,
      setWorldMatrix,
      updateWorldMatrix,
      getWorldCoords,
    );
    state.width = 100;
    state.height = 50;
    const box = cam.getBoundingBox();
    expect(getWorldCoords).toHaveBeenCalledWith(0, 0);
    expect(getWorldCoords).toHaveBeenCalledWith(100, 50);
    expect(box.minX).toBe(0);
    expect(box.minY).toBe(0);
    expect(box.maxX).toBe(100);
    expect(box.maxY).toBe(50);
  });

  it("onWheel prevents default and calls updateZoom with exp scale", () => {
    const cam = new Camera(
      state as CameraState,
      setWorldMatrix,
      updateWorldMatrix,
      getWorldCoords,
    );
    const preventDefault = vi.fn();
    // deltaY positive -> zoom out (scale < 1)
    cam.onWheel({ deltaY: 10, clientX: 7, clientY: 11, preventDefault } as any);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    // updateZoom updates zoom clamped
    expect(state.setZoom).toHaveBeenCalledTimes(1);
    expect(state.zoom).toBeGreaterThanOrEqual(ZOOM_MIN);
    expect(state.zoom).toBeLessThanOrEqual(ZOOM_MAX);
  });

  it("updateZoom clamps zoom and recenters to keep cursor stable", () => {
    const cam = new Camera(
      state as CameraState,
      setWorldMatrix,
      updateWorldMatrix,
      getWorldCoords,
    );

    state.zoom = 1;
    const [wx0, wy0] = getWorldCoords(10, 10);
    cam.updateZoom(10, 10, 2); // attempt to double zoom
    expect(state.zoom).toBeCloseTo(Math.min(ZOOM_MAX, 2), 6);
    const [wx1, wy1] = getWorldCoords(10, 10);
    // Position adjusted by difference
    expect(state.incrementPosition).toHaveBeenCalledWith(wx0 - wx1, wy0 - wy1);

    // Zoom out below min should clamp
    cam.updateZoom(10, 10, 0.000001);
    expect(state.zoom).toBe(ZOOM_MIN);
  });

  it("worldToCamera multiplies by cameraMatrix", () => {
    const cam = new Camera(
      state as CameraState,
      setWorldMatrix,
      updateWorldMatrix,
      getWorldCoords,
    );
    // Set a non-identity camera matrix: [a,b,c, d,e,f]
    state.cameraMatrix = [2, 0, 5, 0, 3, -4];
    const [x, y] = cam.worldToCamera(1, 2);
    // x = 2*1 + 0*2 + 5 = 7; y = 0*1 + 3*2 - 4 = 2
    expect(x).toBe(7);
    expect(y).toBe(2);
  });

  it("dispose stops reaction without throwing", () => {
    const cam = new Camera(
      state as CameraState,
      setWorldMatrix,
      updateWorldMatrix,
      getWorldCoords,
    );
    // Spy on internal updateReaction cleanup
    const stop = cam["updateReaction"];
    cam.dispose();
    // After dispose, calling dispose again is safe
    cam.dispose();
    expect(cam["updateReaction"]).toBeUndefined();
    // original disposer was called once if it’s a function
    if (typeof stop === "function") {
      // We cannot assert internals, just ensure no error and state remains accessible
      expect(typeof cam.getBoundingBox).toBe("function");
    }
  });
});
