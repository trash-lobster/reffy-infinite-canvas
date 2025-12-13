import { describe, it, expect } from "vitest";
import {
  applyMatrixToPoint,
  clipToCSS,
  getClipSpaceMousePosition,
  getScalesFromMatrix,
  getScaleXFromMatrix,
  getScaleYFromMatrix,
  isScalePositive,
  screenToWorld,
  worldToCamera,
} from "../../../src/util";

describe("getClipSpaceMousePosition", () => {
  it("returns expected values", () => {
    const canvas = {
      clientWidth: 1000,
      clientHeight: 1000,
      getBoundingClientRect: () => ({
        left: 100,
        top: 100,
      }),
    } as any as HTMLCanvasElement;

    const mouseEvent = {
      clientX: 10,
      clientY: 10,
    } as any as MouseEvent;

    const result = getClipSpaceMousePosition(mouseEvent, canvas);
    expect(result[0]).toBe(-1.18);
    expect(result[1]).toBe(1.18);
  });

  it("tests clipToCSS", () => {
    const canvas = {
      clientWidth: 1000,
      clientHeight: 1000,
    } as any as HTMLCanvasElement;

    const result = clipToCSS(10, 100, canvas);
    expect(result[0]).toBe(5500);
    expect(result[1]).toBe(-49500);
  });

  it("calculates with screenToWorld", () => {
    const canvas = {
      clientWidth: 1000,
      clientHeight: 1000,
      getBoundingClientRect: () => ({
        left: 100,
        top: 100,
      }),
    } as any as HTMLCanvasElement;

    const result = screenToWorld(
      100,
      20,
      100,
      200,
      canvas,
      [1.4142, -1.4142, 0, 1.4142, 1.4142, 0, 100, 50, 1],
    );
    expect(result[0].toFixed(2)).toBe("10.61");
    expect(result[1].toFixed(2)).toBe("-81.32");
  });

  it("tests worldToCamera", () => {
    const result = worldToCamera(
      100,
      100,
      [1.4142, -1.4142, 0, 1.4142, 1.4142, 0, 100, 50, 1],
    );

    expect(result[0].toFixed(2)).toBe("-17.68");
    expect(result[1].toFixed(2)).toBe("17.68");
  });

  it("tests applyMatrixToPoint", () => {
    const result = applyMatrixToPoint([
      1.4142, -1.4142, 0, 1.4142, 1.4142, 0, 100, 50, 1,
    ]);

    expect(result[0]).toBe(100);
    expect(result[1]).toBe(50);
  });

  it("applyMatrixToPoint with scale and translation", () => {
    const matrix = [2, 0, 0, 0, 3, 0, 10, 20, 1];
    const result = applyMatrixToPoint(matrix, 5, 7);
    // x = 2*5 + 0*7 + 10 = 20
    // y = 0*5 + 3*7 + 20 = 41
    expect(result[0]).toBe(20);
    expect(result[1]).toBe(41);
  });
});

describe("Matrix scale extraction", () => {
  it("getScaleXFromMatrix returns correct scale", () => {
    const m = [3, 4, 0, 0, 1, 0, 0, 0, 1];
    // sqrt(3^2 + 4^2) = 5
    expect(getScaleXFromMatrix(m)).toBe(5);
  });

  it("getScaleYFromMatrix returns correct scale", () => {
    const m = [1, 0, 0, 0, -5, 0, 0, 0, 1];
    // sqrt(0^2 + (-5)^2) = 5
    expect(getScaleYFromMatrix(m)).toBe(5);
  });

  it("getScalesFromMatrix returns both scales", () => {
    const m = [6, 8, 0, 0, -3, 0, 0, 0, 1];
    // X: sqrt(6^2 + 8^2) = 10, Y: sqrt(0^2 + (-3)^2) = 3
    expect(getScalesFromMatrix(m)).toEqual([10, 3]);
  });
});

describe("isScalePositive", () => {
  it("returns [1, 1] for positive scales", () => {
    const m = [2, 0, 0, 0, 3, 0, 0, 0, 1];
    expect(isScalePositive(m)).toEqual([1, 1]);
  });

  it("returns [-1, 1] for negative X scale", () => {
    const m = [-2, 0, 0, 0, 3, 0, 0, 0, 1];
    expect(isScalePositive(m)).toEqual([-1, 1]);
  });

  it("returns [1, -1] for negative Y scale", () => {
    const m = [2, 0, 0, 0, -3, 0, 0, 0, 1];
    expect(isScalePositive(m)).toEqual([1, -1]);
  });

  it("returns [-1, -1] for both negative scales", () => {
    const m = [-2, 0, 0, 0, -3, 0, 0, 0, 1];
    expect(isScalePositive(m)).toEqual([-1, -1]);
  });
});
