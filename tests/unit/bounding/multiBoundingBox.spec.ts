import { describe, it, expect, vi, beforeEach } from "vitest";
import { Rect } from "../../../src/shapes/Rect";
import { MultiBoundingBox } from "../../../src/bounding";

const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mI = [1, 0, 0, 0, 1, 0, 50, 50, 1];

const min = 1e-6;

describe("add shape", () => {
  it("adds shapes normally if the shapes don't already exist in targets", () => {
    const target = setUpTarget();
    const box = setUpBox([target]);

    expect(box.targets.length).toBe(1);

    const newTarget = setUpTarget();

    box.add(newTarget);
    expect(box.targets.length).toBe(2);
  });

  it("does not add shapes if the shape already exists in targets", () => {
    const target = setUpTarget();
    const box = setUpBox([target]);

    expect(box.targets.length).toBe(1);

    box.add(target);
    expect(box.targets.length).toBe(1);
  });

  it("does not start with any shape if the constructor did not take any shapes", () => {
    const box = setUpBox();

    expect(box.targets.length).toBe(0);
  });
});

describe("remove shape", () => {
  it("removes the shape if the targets contain the shape", () => {
    const target = setUpTarget();
    const box = setUpBox([target]);

    expect(box.targets.length).toBe(1);

    box.remove(target);
    expect(box.targets.length).toBe(0);
  });

  it("does not remove the shape if the targets do not contain the shape", () => {
    const target = setUpTarget();
    const box = setUpBox();

    expect(box.targets.length).toBe(0);

    box.remove(target);
    expect(box.targets.length).toBe(0);
  });
});

describe("render", () => {
  const gl = {} as WebGLRenderingContext;
  const program = {} as WebGLProgram;

  it("checks that the handles are rendered", () => {
    const target = setUpTarget();
    const box = setUpBox([target]);

    for (const [key, handle] of box.handles.entries()) {
      handle.render = vi.fn();
    }

    box.render(gl, program);

    for (const [key, handle] of box.handles.entries()) {
      expect(handle.render).toHaveBeenCalledOnce();
    }
  });
});

describe("destroy", () => {
  it("checks that each handle is destroyed", () => {
    const target = setUpTarget();
    const box = setUpBox([target]);

    for (const [key, handle] of box.handles.entries()) {
      handle.destroy = vi.fn();
    }

    box.destroy();

    for (const [key, handle] of box.handles.entries()) {
      expect(handle.destroy).toHaveBeenCalledOnce();
    }
  });
});

describe("move", () => {
  it("checks that the target has been moved", () => {
    const target = setUpTarget();
    const box = setUpBox([target]);

    target.updateTranslation = vi.fn();

    box.move(100, 100);

    expect(target.updateTranslation).toHaveBeenCalledOnce();
    expect(target.updateTranslation).toHaveBeenCalledWith(100, 100);
  });

  it("checks that the targets have been moved", () => {
    const target = setUpTarget();
    const targetTwo = setUpTarget();
    const box = setUpBox([target, targetTwo]);

    target.updateTranslation = vi.fn();
    targetTwo.updateTranslation = vi.fn();

    box.move(100, 100);

    expect(target.updateTranslation).toHaveBeenCalledOnce();
    expect(target.updateTranslation).toHaveBeenCalledWith(100, 100);

    expect(targetTwo.updateTranslation).toHaveBeenCalledOnce();
    expect(targetTwo.updateTranslation).toHaveBeenCalledWith(100, 100);
  });
});

describe("resize keeps ratio", () => {
  let target = setUpTarget();
  let targetTwo = setUpTarget(50, 50, 100, 100);
  targetTwo.setWorldMatrix(mI);
  let box = setUpBox([target, targetTwo]);

  beforeEach(() => {
    target = setUpTarget();
    targetTwo = setUpTarget(50, 50, 100, 100);
    targetTwo.setWorldMatrix(mI);
    box = setUpBox([target, targetTwo]);
    target.updateScale = vi.fn();
    target.updateTranslation = vi.fn();

    targetTwo.updateScale = vi.fn();
    targetTwo.updateTranslation = vi.fn();
    box.update();
  });

  it("tests TOP resize smaller", () => {
    // this makes the image smaller by dragging down from the top side
    const adjY = 30;
    box.resize(0, adjY, "TOP", I);

    const factor = 1 - adjY / box.height;
    const anchorX = 150 / 2;
    const anchorY = 150;
    const dLx1 = anchorX + ((0 - anchorX) * factor) / 1;
    const dLy1 = anchorY + ((0 - anchorY) * factor) / 1;
    const dLx2 = anchorX + (50 - anchorX) * factor - 50 / 1;
    const dLy2 = anchorY + (50 - anchorY) * factor - 50 / 1;
    expect(target.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(target.updateTranslation).toHaveBeenCalledWith(dLx1, dLy1);
    expect(targetTwo.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(targetTwo.updateTranslation).toHaveBeenCalledWith(dLx2, dLy2);
  });

  it("tests TOP resize bigger", () => {
    const adjY = 30;
    box.resize(0, adjY, "TOP", I);

    const factor = 1 - adjY / box.height;
    const anchorX = 150 / 2;
    const anchorY = 150;
    const dLx1 = anchorX + ((0 - anchorX) * factor) / 1;
    const dLy1 = anchorY + ((0 - anchorY) * factor) / 1;
    const dLx2 = anchorX + (50 - anchorX) * factor - 50 / 1;
    const dLy2 = anchorY + (50 - anchorY) * factor - 50 / 1;
    expect(target.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(target.updateTranslation).toHaveBeenCalledWith(dLx1, dLy1);
    expect(targetTwo.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(targetTwo.updateTranslation).toHaveBeenCalledWith(dLx2, dLy2);
  });

  it("tests BOTTOM resize smaller", () => {
    const adjY = -30;
    box.resize(0, adjY, "BOTTOM", I);

    const factor = 1 + adjY / box.height;
    const anchorX = 150 / 2;
    const anchorY = 0;
    const dLx1 = anchorX + ((0 - anchorX) * factor) / 1;
    const dLy1 = anchorY + ((0 - anchorY) * factor) / 1;
    const dLx2 = anchorX + (50 - anchorX) * factor - 50 / 1;
    const dLy2 = anchorY + (50 - anchorY) * factor - 50 / 1;
    expect(target.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(target.updateTranslation).toHaveBeenCalledWith(dLx1, dLy1);
    expect(targetTwo.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(targetTwo.updateTranslation).toHaveBeenCalledWith(dLx2, dLy2);
  });

  it("tests BOTTOM resize bigger", () => {
    const adjY = 30;
    box.resize(0, adjY, "BOTTOM", I);

    const factor = 1 + adjY / box.height;
    const anchorX = 150 / 2;
    const anchorY = 0;
    const dLx1 = anchorX + ((0 - anchorX) * factor) / 1;
    const dLy1 = anchorY + ((0 - anchorY) * factor) / 1;
    const dLx2 = anchorX + (50 - anchorX) * factor - 50 / 1;
    const dLy2 = anchorY + (50 - anchorY) * factor - 50 / 1;
    expect(target.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(target.updateTranslation).toHaveBeenCalledWith(dLx1, dLy1);
    expect(targetTwo.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(targetTwo.updateTranslation).toHaveBeenCalledWith(dLx2, dLy2);
  });

  it("tests LEFT resize smaller", () => {
    const adjX = 30;
    box.resize(adjX, 0, "LEFT", I);

    const factor = 1 - adjX / box.width;
    const anchorX = 150;
    const anchorY = 150 / 2;
    const dLx1 = anchorX + ((0 - anchorX) * factor) / 1;
    const dLy1 = anchorY + ((0 - anchorY) * factor) / 1;
    const dLx2 = anchorX + (50 - anchorX) * factor - 50 / 1;
    const dLy2 = anchorY + (50 - anchorY) * factor - 50 / 1;
    expect(target.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(target.updateTranslation).toHaveBeenCalledWith(dLx1, dLy1);
    expect(targetTwo.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(targetTwo.updateTranslation).toHaveBeenCalledWith(dLx2, dLy2);
  });

  it("tests LEFT resize bigger", () => {
    const adjX = -30;
    box.resize(adjX, 0, "LEFT", I);

    const factor = 1 - adjX / box.width;
    const anchorX = 150;
    const anchorY = 150 / 2;
    const dLx1 = anchorX + ((0 - anchorX) * factor) / 1;
    const dLy1 = anchorY + ((0 - anchorY) * factor) / 1;
    const dLx2 = anchorX + (50 - anchorX) * factor - 50 / 1;
    const dLy2 = anchorY + (50 - anchorY) * factor - 50 / 1;
    expect(target.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(target.updateTranslation).toHaveBeenCalledWith(dLx1, dLy1);
    expect(targetTwo.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(targetTwo.updateTranslation).toHaveBeenCalledWith(dLx2, dLy2);
  });

  it("tests RIGHT resize smaller", () => {
    const adjX = -30;
    box.resize(adjX, 0, "RIGHT", I);

    const factor = 1 + adjX / box.width;
    const anchorX = 0;
    const anchorY = 150 / 2;
    const dLx1 = anchorX + ((0 - anchorX) * factor) / 1;
    const dLy1 = anchorY + ((0 - anchorY) * factor) / 1;
    const dLx2 = anchorX + (50 - anchorX) * factor - 50 / 1;
    const dLy2 = anchorY + (50 - anchorY) * factor - 50 / 1;
    expect(target.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(target.updateTranslation).toHaveBeenCalledWith(dLx1, dLy1);
    expect(targetTwo.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(targetTwo.updateTranslation).toHaveBeenCalledWith(dLx2, dLy2);
  });

  it("tests RIGHT resize bigger", () => {
    const adjX = 30;
    box.resize(adjX, 0, "RIGHT", I);

    const factor = 1 + adjX / box.width;
    const anchorX = 0;
    const anchorY = 150 / 2;
    const dLx1 = anchorX + ((0 - anchorX) * factor) / 1;
    const dLy1 = anchorY + ((0 - anchorY) * factor) / 1;
    const dLx2 = anchorX + (50 - anchorX) * factor - 50 / 1;
    const dLy2 = anchorY + (50 - anchorY) * factor - 50 / 1;
    expect(target.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(target.updateTranslation).toHaveBeenCalledWith(dLx1, dLy1);
    expect(targetTwo.updateScale).toHaveBeenCalledWith(factor, factor);
    expect(targetTwo.updateTranslation).toHaveBeenCalledWith(dLx2, dLy2);
  });

  it("tests that flip will not occur", () => {
    // the current width is 150, so -170 in the other direction will cause it to exceed its width and flip normally
    box.resize(-170, 0, "RIGHT", I);

    expect(target.updateScale).not.toHaveBeenCalled();
    expect(target.updateTranslation).not.toHaveBeenCalled();
  });

  it("tests positive min dimensions", () => {
    box.width = 1e-7;
    box.height = 1e-7;

    box.resize(-1e-8, 0, "RIGHT", I);
    expect(target.updateScale).not.toHaveBeenCalled();
    expect(target.updateTranslation).not.toHaveBeenCalled();
  });

  it("tests negative min dimensions", () => {
    box.width = -1e-7;
    box.height = -1e-7;

    box.resize(1e-8, 0, "RIGHT", I);
    expect(target.updateScale).not.toHaveBeenCalled();
    expect(target.updateTranslation).not.toHaveBeenCalled();
  });
});

describe("flip", () => {
  let target = setUpTarget();
  let box = setUpBox([target]);
  const getWorldCoords = (x: number, y: number) => [x, y];

  beforeEach(() => {
    target = setUpTarget();
    box = setUpBox([target]);
  });

  it("tests vertical flip", () => {
    target.setTranslation = vi.fn();
    box.update();

    box.flip(I, "vertical", getWorldCoords);

    expect(target.setTranslation).toHaveBeenCalledWith(0, -100);
  });

  it("tests horizontal flip", () => {
    target.setTranslation = vi.fn();
    box.update();

    box.flip(I, "horizontal", getWorldCoords);

    expect(target.setTranslation).toHaveBeenCalledWith(-100, 0);
  });
});

describe("align", () => {
  let a = it("aligns targets to top", () => {
    const a = setUpTarget(0, 10, 100, 100);
    const b = setUpTarget(50, 40, 100, 100);
    const box = setUpBox([a, b]);

    const snapshots = box.align("top");

    // Verify resulting bounding boxes share the same top edge
    const aabbA = a.getBoundingBox();
    const aabbB = b.getBoundingBox();
    expect(aabbA.minY).toBeCloseTo(aabbB.minY, 6);

    // Snapshots should reflect start/end transforms
    expect(Array.isArray(snapshots)).toBe(true);
    expect(snapshots!.length).toBe(2);
    expect(snapshots![0].start).toBeTruthy();
    expect(snapshots![0].end).toBeTruthy();
    expect(snapshots![1].end!.y).toBe(10);
  });

  it("aligns targets to left", () => {
    const a = setUpTarget(10, 0, 100, 100);
    const b = setUpTarget(40, 50, 100, 100);
    const box = setUpBox([a, b]);

    const snapshots = box.align("left");

    const aabbA = a.getBoundingBox();
    const aabbB = b.getBoundingBox();
    expect(aabbA.minX).toBeCloseTo(aabbB.minX, 6);

    expect(Array.isArray(snapshots)).toBe(true);
    expect(snapshots!.length).toBe(2);
  });
});

describe("normalize", () => {
  it("normalizes height to the first target height", () => {
    const a = setUpTarget(0, 0, 100, 50); // reference
    const b = setUpTarget(0, 0, 100, 200); // different height
    const box = setUpBox([a, b]);

    const snapshots = box.normalize("height", "first");

    // After normalization, visual heights should match reference
    const hA = Math.abs(a.height * a.sy);
    const hB = Math.abs(b.height * b.sy);
    expect(hA).toBeCloseTo(hB, 6);

    expect(Array.isArray(snapshots)).toBe(true);
    expect(snapshots!.length).toBe(2);
  });

  it("normalizes height to average height", () => {
    const a = setUpTarget(0, 0, 100, 50); // reference
    const b = setUpTarget(0, 0, 100, 200); // different height
    const box = setUpBox([a, b]);

    const snapshots = box.normalize("height", "average");
    const expectedAvgValue = (50 + 200) / 2;

    // After normalization, visual heights should match reference
    const hA = Math.abs(a.height * a.sy);
    const hB = Math.abs(b.height * b.sy);
    expect(hA).toBeCloseTo(hB, 6);
    expect(hA).toBeCloseTo(expectedAvgValue, 6);

    expect(Array.isArray(snapshots)).toBe(true);
    expect(snapshots!.length).toBe(2);
  });

  it("normalizes width to the average width", () => {
    const a = setUpTarget(0, 0, 50, 100);
    const b = setUpTarget(0, 0, 150, 100);
    const box = setUpBox([a, b]);

    const snapshots = box.normalize("width", "average");

    const wA = Math.abs(a.width * a.sx);
    const wB = Math.abs(b.width * b.sx);
    // Both should be close to each other (average target)
    expect(wA).toBeCloseTo(wB, 6);

    expect(Array.isArray(snapshots)).toBe(true);
    expect(snapshots!.length).toBe(2);
  });

  it("normalizes scale to the first target scale (only keeps shape, not sign)", () => {
    const a = setUpTarget();
    const b = setUpTarget();
    a.setScale(-2, -2); // reference scale and sign
    b.setScale(0.5, 0.5);

    const box = setUpBox([a, b]);

    const snapshots = box.normalize("scale", "first");

    expect(Math.sign(b.sx)).toBe(-1);
    expect(Math.sign(b.sy)).toBe(-1);
    expect(Math.abs(b.sx)).toBeCloseTo(Math.abs(a.sx), 6);
    expect(Math.abs(b.sy)).toBeCloseTo(Math.abs(a.sy), 6);

    expect(Array.isArray(snapshots)).toBe(true);
    expect(snapshots!.length).toBe(2);
  });

  it("normalizes scale to the average scale (only keeps shape, not sign)", () => {
    const a = setUpTarget();
    const b = setUpTarget();
    a.setScale(-2, -2); // reference scale and sign
    b.setScale(0.5, 0.5);

    const box = setUpBox([a, b]);

    const snapshots = box.normalize("scale", "average");

    const expectedAvgValue = (0.5 + 2) / 2;

    expect(Math.sign(b.sx)).toBe(1);
    expect(Math.sign(b.sy)).toBe(1);
    expect(Math.sign(a.sx)).toBe(-1);
    expect(Math.sign(a.sy)).toBe(-1);
    expect(Math.abs(b.sx)).toBeCloseTo(Math.abs(a.sx), 6);
    expect(Math.abs(b.sy)).toBeCloseTo(Math.abs(a.sy), 6);
    expect(Math.abs(b.sx)).toBeCloseTo(expectedAvgValue, 6);
    expect(Math.abs(b.sy)).toBeCloseTo(expectedAvgValue, 6);

    expect(Array.isArray(snapshots)).toBe(true);
    expect(snapshots!.length).toBe(2);
  });

  it("normalizes area (size) to average area across targets", () => {
    const a = setUpTarget(0, 0, 50, 50);
    const b = setUpTarget(0, 0, 200, 50);
    const box = setUpBox([a, b]);

    const snapshots = box.normalize("size", "average");

    // Areas should be close post-normalization
    const areaA = Math.abs(a.width * a.height * a.sx * a.sy);
    const areaB = Math.abs(b.width * b.height * b.sx * b.sy);
    expect(areaA).toBeCloseTo(areaB, 6);

    expect(Array.isArray(snapshots)).toBe(true);
    expect(snapshots!.length).toBe(2);
  });
});

describe("getPositions", () => {
  it("returns the four corner positions in order", () => {
    const box = setUpBox([setUpTarget(0, 0, 100, 100)]);
    box.update();

    const pos = box.getPositions();
    expect(pos.length).toBe(8);
    // Top-left
    expect(pos[0]).toBeCloseTo(box.x, 6);
    expect(pos[1]).toBeCloseTo(box.y, 6);
    // Top-right
    expect(pos[2]).toBeCloseTo(box.x + box.width, 6);
    expect(pos[3]).toBeCloseTo(box.y, 6);
    // Bottom-right
    expect(pos[4]).toBeCloseTo(box.x + box.width, 6);
    expect(pos[5]).toBeCloseTo(box.y + box.height, 6);
    // Bottom-left
    expect(pos[6]).toBeCloseTo(box.x, 6);
    expect(pos[7]).toBeCloseTo(box.y + box.height, 6);
  });
});

describe("hitTest", () => {
  it("returns CENTER when point is inside the box", () => {
    const box = setUpBox([setUpTarget(0, 0, 100, 100)]);
    box.update();

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const result = box.hitTest(centerX, centerY, I);
    expect(result).toBe("CENTER");
  });

  it("returns TOP when near the top side", () => {
    const box = setUpBox([setUpTarget(0, 0, 100, 100)]);
    box.update();
    const result = box.hitTest(box.x + box.width / 2, box.y, I);
    expect(result).toBe("TOP");
  });

  it("returns RIGHT when near the right side", () => {
    const box = setUpBox([setUpTarget(0, 0, 100, 100)]);
    box.update();
    const result = box.hitTest(box.x + box.width, box.y + box.height / 2, I);
    expect(result).toBe("RIGHT");
  });

  it("returns BOTTOM when near the bottom side", () => {
    const box = setUpBox([setUpTarget(0, 0, 100, 100)]);
    box.update();
    const result = box.hitTest(box.x + box.width / 2, box.y + box.height, I);
    expect(result).toBe("BOTTOM");
  });

  it("returns LEFT when near the left side", () => {
    const box = setUpBox([setUpTarget(0, 0, 100, 100)]);
    box.update();
    const result = box.hitTest(box.x, box.y + box.height / 2, I);
    expect(result).toBe("LEFT");
  });

  it("returns corner types near corners", () => {
    const box = setUpBox([setUpTarget(0, 0, 100, 100)]);
    box.update();
    // HIT_MARGIN is applied internally; use exact corner positions
    expect(box.hitTest(box.x, box.y, I)).toBe("TOPLEFT");
    expect(box.hitTest(box.x + box.width, box.y, I)).toBe("TOPRIGHT");
    expect(box.hitTest(box.x, box.y + box.height, I)).toBe("BOTTOMLEFT");
    expect(box.hitTest(box.x + box.width, box.y + box.height, I)).toBe(
      "BOTTOMRIGHT",
    );
  });
});

function setUpBox(targets?: Rect[]) {
  return new MultiBoundingBox(targets);
}

function setUpTarget(x?: number, y?: number, width?: number, height?: number) {
  return new Rect({
    x: x ?? 0,
    y: y ?? 0,
    width: width ?? 100,
    height: height ?? 100,
  });
}
