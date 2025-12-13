import { describe, it, expect } from "vitest";
import { Rect } from "../../../src/shapes";
import {
  makeTransformCommand,
  makeMultiTransformCommand,
  TransformSnapshot,
} from "../../../src/manager";

describe("Transform command", () => {
  it("applies transform on do", () => {
    const target = new Rect({});
    const start: TransformSnapshot = { x: 0, y: 0, sx: 1, sy: 1 };
    const end: TransformSnapshot = { x: 10, y: 20, sx: 2, sy: 3 };

    const cmd = makeTransformCommand(target as any, start, end);
    cmd.do();
    expect(target.x).toBe(10);
    expect(target.y).toBe(20);
    expect(target.sx).toBe(2);
    expect(target.sy).toBe(3);
  });

  it("applies transform on undo", () => {
    const target = new Rect({});
    const start: TransformSnapshot = { x: 5, y: 6, sx: 7, sy: 8 };
    const end: TransformSnapshot = { x: 15, y: 16, sx: 27, sy: 28 };

    const cmd = makeTransformCommand(target as any, start, end);
    cmd.undo();
    expect(target.x).toBe(5);
    expect(target.y).toBe(6);
    expect(target.sx).toBe(7);
    expect(target.sy).toBe(8);
  });
});

describe("Multi transform command", () => {
  it("applies transform to multiple entries on do and restores on undo", () => {
    const r1 = new Rect({});
    const r2 = new Rect({});

    const s1: TransformSnapshot = { x: 1, y: 2, sx: 3, sy: 4 };
    const e1: TransformSnapshot = { x: 11, y: 12, sx: 13, sy: 14 };
    const s2: TransformSnapshot = { x: -1, y: -2, sx: 5, sy: 6 };
    const e2: TransformSnapshot = { x: 9, y: 8, sx: 15, sy: 16 };

    const cmd = makeMultiTransformCommand([
      { ref: r1 as any, start: s1, end: e1 },
      { ref: r2 as any, start: s2, end: e2 },
    ]);

    cmd.do();
    expect(r1.x).toBe(11);
    expect(r1.y).toBe(12);
    expect(r1.sx).toBe(13);
    expect(r1.sy).toBe(14);
    expect(r2.x).toBe(9);
    expect(r2.y).toBe(8);
    expect(r2.sx).toBe(15);
    expect(r2.sy).toBe(16);

    cmd.undo();
    expect(r1.x).toBe(1);
    expect(r1.y).toBe(2);
    expect(r1.sx).toBe(3);
    expect(r1.sy).toBe(4);
    expect(r2.x).toBe(-1);
    expect(r2.y).toBe(-2);
    expect(r2.sx).toBe(5);
    expect(r2.sy).toBe(6);
  });
});
