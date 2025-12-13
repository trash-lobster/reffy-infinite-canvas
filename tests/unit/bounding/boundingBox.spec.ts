import { describe, it, expect, beforeEach, vi } from "vitest";
import { Rect } from "../../../src/shapes/Rect";
import * as BB from "../../../src/bounding/BoundingBox";
import { BoundingBoxMode } from "../../../src/bounding";
import { getScalesFromMatrix, LIGHT_BLUE, m3 } from "../../../src/util";

describe("BoundingBox", () => {
  it("should create a bounding box with expected width and height", () => {
    let box: BB.BoundingBox | null;
    let target = new Rect({
      x: 10,
      y: 90,
      width: 100,
      height: 1000,
    });

    box = new BB.BoundingBox(target);

    expect(box.width).toBe(100);
    expect(box.height).toBe(1000);
  });

  it("should set bounding box as passive, which should remove the corners", () => {
    let box: BB.BoundingBox | null;
    let target = new Rect({
      x: 10,
      y: 90,
      width: 100,
      height: 1000,
    });

    box = new BB.BoundingBox(target);
    box.setPassive();

    const [r, g, b] = LIGHT_BLUE;

    for (const [, side] of box.sides.entries()) {
      const [sa, sb, sc] = side.color;
      expect([sa, sb, sc]).toStrictEqual([r, g, b]);
    }
    for (const [, corner] of box.corners.entries()) {
      const [sa, sb, sc] = corner.color;
      expect([sa, sb, sc]).toStrictEqual([r, g, b]);
    }

    expect(box.mode).toBe(BoundingBoxMode.PASSIVE);
    expect(box.corners.size).toBe(0);
  });

  it("should set bounding box as active, which should add the corners", () => {
    let box: BB.BoundingBox | null;
    let target = new Rect({
      x: 10,
      y: 90,
      width: 100,
      height: 1000,
    });

    box = new BB.BoundingBox(target);
    box.setActive();

    const [r, g, b] = LIGHT_BLUE;

    for (const [, side] of box.sides.entries()) {
      const [sa, sb, sc] = side.color;
      expect([sa, sb, sc]).toStrictEqual([r, g, b]);
    }
    for (const [, corner] of box.corners.entries()) {
      const [sa, sb, sc] = corner.color;
      expect([sa, sb, sc]).toStrictEqual([r, g, b]);
    }

    expect(box.mode).toBe(BoundingBoxMode.ACTIVE);
    expect(box.corners.size).toBe(4);
  });

  it("should return positions", () => {
    const target = new Rect({ x: 0, y: 0, width: 10, height: 10 });
    const box = new BB.BoundingBox(target);
    const points = box.getPositions();

    expect(points).toEqual([0, 0, 0, 10, 10, 0, 10, 0, 0, 10, 10, 10]);
  });
});

const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const EPS = 1e-6;

const MATRICES = [
  { name: "identity", M: I },
  { name: "translate(20, -10)", M: m3.translation(20, -10) },
  { name: "scale(2, 0.5)", M: m3.scaling(2, 0.5) },
  {
    name: "translate + scale",
    M: m3.multiply(m3.translation(-15, 30), m3.scaling(1.5, 1.5)),
  },
];

describe.each(MATRICES)("BoundingBox.hitTest with %s", ({ name, M }) => {
  it("CENTER inside", () => {
    const target = new Rect({ x: 0, y: 0, width: 100, height: 50 });
    target.updateWorldMatrix(M);
    const box = new BB.BoundingBox(target);

    const wx = 50,
      wy = 25;
    expect(box.hitTest(wx, wy, M)).toBe("CENTER");
  });

  it("TOP near top edge", () => {
    const target = new Rect({ x: 0, y: 0, width: 100, height: 50 });
    target.updateWorldMatrix(M);
    const box = new BB.BoundingBox(target);

    expect(box.hitTest(50, 0, M)).toBe("TOP");
  });

  it("RIGHT near right edge", () => {
    const target = new Rect({ x: 0, y: 0, width: 100, height: 50 });
    target.updateWorldMatrix(M);
    const box = new BB.BoundingBox(target);

    expect(box.hitTest(100, 25, M)).toBe("RIGHT");
  });

  it("BOTTOM near bottom edge", () => {
    const target = new Rect({ x: 0, y: 0, width: 100, height: 50 });
    target.updateWorldMatrix(M);
    const box = new BB.BoundingBox(target);

    expect(box.hitTest(50, 50, M)).toBe("BOTTOM");
  });

  it("LEFT near left edge", () => {
    const target = new Rect({ x: 0, y: 0, width: 100, height: 50 });
    target.updateWorldMatrix(M);
    const box = new BB.BoundingBox(target);

    expect(box.hitTest(0, 25, M)).toBe("LEFT");
  });

  it("TOPRIGHT near top right corner", () => {
    const target = new Rect({ x: 0, y: 0, width: 100, height: 50 });
    target.updateWorldMatrix(M);
    const box = new BB.BoundingBox(target);

    expect(box.hitTest(100, 0, M)).toBe("TOPRIGHT");
  });

  it("TOPLEFT near top left corner", () => {
    const target = new Rect({ x: 0, y: 0, width: 100, height: 50 });
    target.updateWorldMatrix(M);
    const box = new BB.BoundingBox(target);

    expect(box.hitTest(0, 0, M)).toBe("TOPLEFT");
  });

  it("BOTTOMRIGHT near bottom right corner", () => {
    const target = new Rect({ x: 0, y: 0, width: 100, height: 50 });
    target.updateWorldMatrix(M);
    const box = new BB.BoundingBox(target);

    expect(box.hitTest(100, 50, M)).toBe("BOTTOMRIGHT");
  });

  it("BOTTOMLEFT near bottom left corner", () => {
    const target = new Rect({ x: 0, y: 0, width: 100, height: 50 });
    target.updateWorldMatrix(M);
    const box = new BB.BoundingBox(target);

    expect(box.hitTest(0, 50, M)).toBe("BOTTOMLEFT");
  });

  it("returns UNDEFINED when the bounding box mode is PASSIVE", () => {
    const target = new Rect({ x: 0, y: 0, width: 100, height: 50 });
    target.updateWorldMatrix(M);
    const box = new BB.BoundingBox(target);
    box.mode = BoundingBoxMode.PASSIVE;

    expect(box.hitTest(0, 25, M)).toBe(undefined);
  });
});

describe("bounding box render", () => {
  const gl = {} as WebGLRenderingContext;
  const program = {} as WebGLProgram;

  let target: Rect;

  beforeEach(() => {
    target = setupTarget();
  });

  it("calls update and renders all sides and corners in ACTIVE mode", () => {
    const box = new BB.BoundingBox(target); // ACTIVE by default

    // Spy on update
    const updateSpy = vi.spyOn(box, "update");

    // Replace render on each side/corner with a spy to avoid touching WebGL
    for (const [, side] of box.sides.entries()) {
      (side as any).render = vi.fn();
    }
    for (const [, corner] of box.corners.entries()) {
      (corner as any).render = vi.fn();
    }

    box.render(gl, program);

    // update was called
    expect(updateSpy).toHaveBeenCalledTimes(1);

    // All sides rendered
    for (const [, side] of box.sides.entries()) {
      expect((side as any).render).toHaveBeenCalledTimes(1);
      expect((side as any).render).toHaveBeenCalledWith(gl, program);
    }

    // All corners rendered
    for (const [, corner] of box.corners.entries()) {
      expect((corner as any).render).toHaveBeenCalledTimes(1);
      expect((corner as any).render).toHaveBeenCalledWith(gl, program);
    }
  });

  it("renders only sides when PASSIVE (no corners)", () => {
    const box = new BB.BoundingBox(target);
    box.setPassive();

    // After setPassive, corners should be cleared
    expect(box.corners.size).toBe(0);

    // Spy on update
    const updateSpy = vi.spyOn(box, "update");

    // Stub side renders
    for (const [, side] of box.sides.entries()) {
      (side as any).render = vi.fn();
    }

    box.render(gl, program);

    // update was called
    expect(updateSpy).toHaveBeenCalledTimes(1);

    // Sides rendered
    for (const [, side] of box.sides.entries()) {
      expect((side as any).render).toHaveBeenCalledTimes(1);
      expect((side as any).render).toHaveBeenCalledWith(gl, program);
    }

    // No corners to render
    expect(box.corners.size).toBe(0);
  });
});

describe("bounding box destroy", () => {
  it("calls update and renders all sides and corners in ACTIVE mode", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    // Replace render on each side/corner with a spy
    for (const [, side] of box.sides.entries()) {
      (side as any).destroy = vi.fn();
    }
    for (const [, corner] of box.corners.entries()) {
      (corner as any).destroy = vi.fn();
    }

    box.destroy();

    // All sides rendered
    for (const [, side] of box.sides.entries()) {
      expect((side as any).destroy).toHaveBeenCalledOnce();
    }

    // All corners rendered
    for (const [, corner] of box.corners.entries()) {
      expect((corner as any).destroy).toHaveBeenCalledOnce();
    }
  });
});

describe("bounding box move", () => {
  it("calls update translate on the target when move is invoked", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    target.updateTranslation = vi.fn();

    box.move(10, 10);

    expect(target.updateTranslation).toHaveBeenCalledOnce();
    expect(target.updateTranslation).toHaveBeenCalledWith(10, 10);
  });
});

describe("bounding box resize", () => {
  it("RIGHT: increases scale uniformly and adjusts vertical translation anchor", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    // Baseline
    const sx0 = target.sx;
    const sy0 = target.sy;
    const tx0 = target.x;
    const ty0 = target.y;

    box.resize(50, 0, "RIGHT");

    // scale increased uniformly
    expect(target.sx).toBeGreaterThan(sx0);
    expect(target.sy).toBeCloseTo(target.sx, 6);
    expect(target.x).toBeCloseTo(tx0, 6);
    // y translation adjusts to keep vertical anchoring centered
    expect(target.y).not.toBeCloseTo(ty0, 6);
  });

  it("LEFT: increases/decreases scale and moves left (dx applied), with vertical re-centering", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    const sx0 = target.sx;
    const sy0 = target.sy;
    const tx0 = target.x;
    const ty0 = target.y;

    box.resize(-40, 0, "LEFT");

    expect(Math.abs(target.sx - sx0)).toBeGreaterThan(EPS);
    expect(target.sy).toBeCloseTo(target.sx, 6);
    expect(target.x).toBeCloseTo(tx0 - 40, 6);
    expect(target.y).not.toBeCloseTo(ty0, 6);
  });

  it("TOP: uses dy to scale and updates x translation (horizontal re-centering), y moves by dy", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    const sx0 = target.sx;
    const sy0 = target.sy;
    const tx0 = target.x;
    const ty0 = target.y;

    box.resize(0, -30, "TOP");

    expect(Math.abs(target.sy - sy0)).toBeGreaterThan(EPS);
    expect(target.sx).toBeCloseTo(target.sy, 6);
    expect(target.x).not.toBeCloseTo(tx0, 6);
    expect(target.y).toBeCloseTo(ty0 - 30, 6);
  });

  it("BOTTOM: uses dy to scale and keeps y translation unchanged for dy=0 anchor case", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    const ty0 = target.y;

    box.resize(0, 25, "BOTTOM");
    expect(target.y).toBeCloseTo(ty0, 6);
  });

  it("TOPLEFT: applies dx to both scale and translation, with aspect-ratio-based y offset", () => {
    const target = setupTarget(120, 60); // aspect ratio = 2
    const box = new BB.BoundingBox(target);

    const tx0 = target.x;
    const ty0 = target.y;
    const sx0 = target.sx;

    // Positive dx
    box.resize(20, 0, "TOPLEFT");

    // scale changed uniformly
    expect(Math.abs(target.sx - sx0)).toBeGreaterThan(EPS);
    expect(target.sy).toBeCloseTo(target.sx, 6);

    // x translated by dx
    expect(target.x).toBeCloseTo(tx0 + 20, 6);

    // y translated by dx/aspectRatio * sign(sx)
    const expectedDy = (20 / (120 / 60)) * Math.sign(target.sx); // dx / aspectRatio
    expect(target.y).toBeCloseTo(ty0 + expectedDy, 6);
  });

  it("TOPRIGHT: applies aspect-ratio-based negative y offset and no x translation", () => {
    const target = setupTarget(80, 40); // aspect ratio = 2
    const box = new BB.BoundingBox(target);

    const tx0 = target.x;
    const ty0 = target.y;

    box.resize(30, 0, "TOPRIGHT");

    // x translation remains unchanged for TOPRIGHT
    expect(target.x).toBeCloseTo(tx0, 6);

    // y translation moves by -dx / aspectRatio * sign(sx)
    const expectedDy = (-30 / (80 / 40)) * Math.sign(target.sx);
    expect(target.y).toBeCloseTo(ty0 + expectedDy, 6);
  });

  it("BOTTOMLEFT: applies aspect-ratio-based negative x translation", () => {
    const target = setupTarget(80, 40); // aspect ratio = 2
    const box = new BB.BoundingBox(target);

    const tx0 = target.x;
    const ty0 = target.y;

    box.resize(30, 0, "BOTTOMLEFT");

    // y translation remains unchanged for BOTTOMLEFT
    expect(target.x).toBeCloseTo(30, 6);
    expect(target.y).toBeCloseTo(0, 6);
  });

  it("prevents flipping: negative dx that would cross zero scale does not change scale", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    // Make scale very small so an aggressive resize could flip
    target.setScale(0.001, 0.001);

    const sx0 = target.sx;
    const sy0 = target.sy;

    // Large negative dx on RIGHT would try to reduce scale below 0
    box.resize(-100000, 0, "RIGHT");

    // Guard prevents flip; scale unchanged
    expect(target.sx).toBeCloseTo(sx0, 6);
    expect(target.sy).toBeCloseTo(sy0, 6);
  });

  it("aborts when resulting size would be below EPS", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    // Set extremely small scale
    target.setScale(1e-8, 1e-8);
    const sx0 = target.sx;
    const sy0 = target.sy;

    // Any resize that would shrink further should abort
    box.resize(-1, 0, "LEFT");

    expect(target.sx).toBeCloseTo(sx0, 6);
    expect(target.sy).toBeCloseTo(sy0, 6);
  });
});

describe("bounding box reset", () => {
  it("resets the target's scale", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);
    target.setScale(10, 10);

    expect(target.sx).toBe(10);
    expect(target.sy).toBe(10);

    box.reset();

    expect(target.sx).toBe(1);
    expect(target.sy).toBe(1);
  });
});

describe("bounding box flip", () => {
  it("calls target's flip vertical method if direction is vertical", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    target.flipVertical = vi.fn();

    box.flip("vertical");

    expect(target.flipVertical).toHaveBeenCalledOnce();
  });

  it("calls target's flip horizontal method if direction is horizontal", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    target.flipHorizontal = vi.fn();

    box.flip("horizontal");

    expect(target.flipHorizontal).toHaveBeenCalledOnce();
  });
});

describe("BoundingBox getSidesInScreenSpace/getCornersInScreenSpace (scale sign branches)", () => {
  it("sides: positive scaleX/scaleY (signX=+1, signY=+1)", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    // 2x, 3x scale at translation (10, 20)
    const M = m3.multiply(m3.translation(10, 20), m3.scaling(2, 3));

    // Access private via any for branch coverage
    const sides = (type: string) => (box as any).getSidesInScreenSpace(type, M);

    const top = sides("TOP");
    expect(top.x).toBeCloseTo(10, 6);
    expect(top.y).toBeCloseTo(20, 6);
    expect(top.width).toBeCloseTo(100 * 2, 6); // width * scaleX
    expect(top.height).toBe(box.borderSize);

    const bottom = sides("BOTTOM");
    expect(bottom.x).toBeCloseTo(10, 6);
    expect(bottom.y).toBeCloseTo(20 + 50 * 3, 6); // y + height * scaleY * signY
    expect(bottom.width).toBeCloseTo(100 * 2, 6);
    expect(bottom.height).toBe(box.borderSize);

    const left = sides("LEFT");
    expect(left.x).toBeCloseTo(10, 6);
    expect(left.y).toBeCloseTo(20, 6);
    expect(left.width).toBe(box.borderSize);
    expect(left.height).toBeCloseTo(50 * 3, 6);

    const right = sides("RIGHT");
    expect(right.x).toBeCloseTo(10 + 100 * 2, 6); // x + width * scaleX * signX
    expect(right.y).toBeCloseTo(20, 6);
    expect(right.width).toBe(box.borderSize);
    expect(right.height).toBeCloseTo(50 * 3, 6);
  });

  it("sides: negative scaleX (signX=-1) and positive scaleY (signY=+1)", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    // scaleX = -2, scaleY = +3, translation (10, 20)
    const M = m3.multiply(m3.translation(10, 20), m3.scaling(-2, 3));

    const sides = (type: string) => (box as any).getSidesInScreenSpace(type, M);

    const top = sides("TOP");
    // signX < 0 => x - width * scaleX (note: width*scaleX is negative, so this adds |width*scaleX|)
    expect(top.x).toBeCloseTo(10 - 100 * 2, 6);
    expect(top.y).toBeCloseTo(20, 6);
    expect(top.width).toBeCloseTo(100 * 2, 6);
    expect(top.height).toBe(box.borderSize);

    const right = sides("RIGHT");
    // x + width * scaleX * signX => 10 + (200 * -1) = -190
    expect(right.x).toBeCloseTo(10 + 100 * 2 * -1, 6);
    expect(right.y).toBeCloseTo(20, 6);
    expect(right.width).toBe(box.borderSize);
    expect(right.height).toBeCloseTo(50 * 3, 6);

    const bottom = sides("BOTTOM");
    expect(bottom.x).toBeCloseTo(10 - 100 * 2, 6);
    expect(bottom.y).toBeCloseTo(20 + 50 * 3, 6);
    expect(bottom.width).toBeCloseTo(100 * 2, 6);
    expect(bottom.height).toBe(box.borderSize);

    const left = sides("LEFT");
    expect(left.x).toBeCloseTo(10, 6);
    // signY > 0: y stays 20
    expect(left.y).toBeCloseTo(20, 6);
    expect(left.width).toBe(box.borderSize);
    expect(left.height).toBeCloseTo(50 * 3, 6);
  });

  it("sides: negative scaleX (signX=-1) and negative scaleY (signY=-1)", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    // scaleX = -2, scaleY = -3, translation (10, 20)
    const M = m3.multiply(m3.translation(10, 20), m3.scaling(-2, -3));

    const sides = (type: string) => (box as any).getSidesInScreenSpace(type, M);

    const top = sides("TOP");
    // signX < 0 => x - width * scaleX (note: width*scaleX is negative, so this adds |width*scaleX|)
    expect(top.x).toBeCloseTo(10 - 100 * 2, 6);
    expect(top.y).toBeCloseTo(20, 6);
    expect(top.width).toBeCloseTo(100 * 2, 6);
    expect(top.height).toBe(box.borderSize);

    const right = sides("RIGHT");
    // x + width * scaleX * signX => 10 + (200 * -1) = -190
    expect(right.x).toBeCloseTo(10 + 100 * 2 * -1, 6);
    expect(right.y).toBeCloseTo(-130, 6);
    expect(right.width).toBe(box.borderSize);
    expect(right.height).toBeCloseTo(150, 6);

    const bottom = sides("BOTTOM");
    expect(bottom.x).toBeCloseTo(10 - 100 * 2, 6);
    expect(bottom.y).toBeCloseTo(20 + 50 * 3 * -1, 6);
    expect(bottom.width).toBeCloseTo(100 * 2, 6);
    expect(bottom.height).toBe(box.borderSize);

    const left = sides("LEFT");
    expect(left.x).toBeCloseTo(10, 6);
    // signY > 0: y stays 20
    expect(left.y).toBeCloseTo(20 - 50 * 3, 6);
    expect(left.width).toBe(box.borderSize);
    expect(left.height).toBeCloseTo(50 * 3, 6);
  });

  it("corners: negative scaleX and negative scaleY (signX=-1, signY=-1)", () => {
    const target = setupTarget();
    const box = new BB.BoundingBox(target);

    // scaleX=-1.5, scaleY=-2, translation (5, 8)
    const M = m3.multiply(m3.translation(5, 8), m3.scaling(-1.5, -2));

    const corners = (type: string) =>
      (box as any).getCornersInScreenSpace(type, M);

    const tl = corners("TOPLEFT");
    expect(tl.x).toBeCloseTo(5 - box.boxSize, 6);
    expect(tl.y).toBeCloseTo(8 - box.boxSize, 6);
    expect(tl.width).toBeCloseTo(box.boxSize * 2, 6);
    expect(tl.height).toBeCloseTo(box.boxSize * 2, 6);

    const tr = corners("TOPRIGHT");
    // x - boxSize + width * scaleX * signX => 5 - bs + (100 * 1.5 * -1) == 5 - bs - 150
    expect(tr.x).toBeCloseTo(5 - box.boxSize + 100 * 1.5 * -1, 6);
    expect(tr.y).toBeCloseTo(8 - box.boxSize, 6);

    const bl = corners("BOTTOMLEFT");
    // y - boxSize + height * scaleY * signY => 8 - bs + (50 * 2 * -1) == 8 - bs - 100
    expect(bl.x).toBeCloseTo(5 - box.boxSize, 6);
    expect(bl.y).toBeCloseTo(8 - box.boxSize + 50 * 2 * -1, 6);

    const br = corners("BOTTOMRIGHT");
    expect(br.x).toBeCloseTo(5 - box.boxSize + 100 * 1.5 * -1, 6);
    expect(br.y).toBeCloseTo(8 - box.boxSize + 50 * 2 * -1, 6);
  });

  it("does not crash when using the target.worldMatrix path (indirect branch via updateSides/UpdateCorners)", () => {
    const target = setupTarget();
    // Give target a flipped worldMatrix
    const M = m3.multiply(m3.translation(12, -4), m3.scaling(-2, 0.5));
    target.updateWorldMatrix(M);

    const box = new BB.BoundingBox(target);
    // Exercise update paths (which internally call getSidesInScreenSpace/getCornersInScreenSpace with matrix)
    (box as any).updateSides();
    (box as any).updateCorners();

    // Sanity: sides/corners computed
    expect(box.sides.size).toBeGreaterThan(0);
    expect(box.corners.size).toBeGreaterThan(0);
    // A couple of spot checks on one side/corner
    const right = box.sides.get("RIGHT")!;
    expect(right).toBeTruthy();
    const topLeft = box.corners.get("TOPLEFT")!;
    expect(topLeft).toBeTruthy();
  });
});

function setupTarget(w = 100, h = 50, x = 0, y = 0) {
  const target = new Rect({ x, y, width: w, height: h });
  target.updateWorldMatrix(I);
  return target;
}
