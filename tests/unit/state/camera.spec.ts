import { describe, it, expect, beforeEach } from "vitest";
import { CameraState } from "../../../src/state/camera";

// Minimal m3 mock for matrix methods
const m3 = {
  translation: (x: number, y: number) => [`T:${x},${y}`],
  rotation: (r: number) => [`R:${r}`],
  scaling: (sx: number, sy: number) => [`S:${sx},${sy}`],
  multiply: (a: any, b: any) => [`MUL`, ...a, ...b],
  inverse: (m: any) => [`INV`, ...m],
};

describe("CameraState", () => {
  let state: CameraState;

  beforeEach(() => {
    state = new CameraState({
      x: 10,
      y: 20,
      width: 800,
      height: 600,
      rotation: 0.5,
      zoom: 2,
      getCanvas: () => ({}),
    });
  });

  it("initializes with defaults", () => {
    const s = new CameraState();
    expect(s.x).toBe(0);
    expect(s.y).toBe(0);
    expect(s.width).toBe(0);
    expect(s.height).toBe(0);
    expect(s.rotation).toBe(0);
    expect(s.zoom).toBe(1);
    expect(() => s.getCanvas()).toThrow();
  });

  it("sets and gets position", () => {
    state.setX(42);
    state.setY(99);
    expect(state.x).toBe(42);
    expect(state.y).toBe(99);
    state.setPosition(7, 8);
    expect(state.position).toEqual([7, 8]);
    state.incrementPosition(3, 2);
    expect(state.position).toEqual([10, 10]);
  });

  it("sets and gets size", () => {
    state.setWidth(123);
    state.setHeight(456);
    expect(state.width).toBe(123);
    expect(state.height).toBe(456);
    state.setSize(1000, 2000);
    expect(state.dimension).toEqual([1000, 2000]);
  });

  it("sets zoom and rotation", () => {
    state.setZoom(3.5);
    expect(state.zoom).toBe(3.5);
    state.setRotation(1.23);
    expect(state.rotation).toBe(1.23);
  });

  it("returns stateVector", () => {
    expect(state.stateVector).toEqual([
      state.x,
      state.y,
      state.width,
      state.height,
      state.rotation,
      state.zoom,
    ]);
  });

  it("returns translationMatrix", () => {
    expect(state.translationMatrix[6]).toEqual(10);
    expect(state.translationMatrix[7]).toEqual(20);
  });

  it("returns rotationMatrix", () => {
    expect(state.rotationMatrix[0].toFixed(3)).toEqual("0.878");
    expect(state.rotationMatrix[1].toFixed(3)).toEqual("-0.479");
    expect(state.rotationMatrix[3].toFixed(3)).toEqual("0.479");
    expect(state.rotationMatrix[4].toFixed(3)).toEqual("0.878");
  });

  it("returns scaleMatrix", () => {
    expect(state.scaleMatrix[0]).toEqual(2);
    expect(state.scaleMatrix[4]).toEqual(2);
  });

  it("returns cameraMatrix and canvasMatrix", () => {
    const camMat = state.cameraMatrix;
    expect(camMat[0].toFixed(3)).toBe("1.755");
    expect(camMat[1].toFixed(3)).toBe("-0.959");
    expect(camMat[3].toFixed(3)).toBe("0.959");
    expect(camMat[4].toFixed(3)).toBe("1.755");

    const invMat = state.canvasMatrix;
    expect(invMat[0].toFixed(3)).toBe("0.439");
    expect(invMat[1].toFixed(3)).toBe("0.240");
    expect(invMat[3].toFixed(3)).toBe("-0.240");
    expect(invMat[4].toFixed(3)).toBe("0.439");
  });
});
