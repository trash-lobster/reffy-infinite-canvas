import { describe, it, expect, vi } from "vitest";
import * as RenderableStateModule from "../../../src/state/renderable";
import { Rect, Renderable } from "../../../src/shapes";
import { m3 } from "../../../src/util";

describe("state/renderable", () => {
  it("initializes with the correct defaults", () => {
    const instance = new RenderableStateModule.RenderableState();

    expect(instance).toBeTruthy();

    expect(typeof instance.x).toBe("number");
    expect(typeof instance.y).toBe("number");
    expect(typeof instance.scaleX).toBe("number");
    expect(typeof instance.scaleY).toBe("number");
    expect(typeof instance.angleRadians).toBe("number");

    expect(instance.renderDirtyFlag).toBe(true);
  });

  it("marks dirty on translation change", () => {
    const instance = new RenderableStateModule.RenderableState();

    expect((instance as any).dirty).toBe(true);

    instance.clearDirty();
    expect((instance as any).dirty).toBe(false);

    instance.setTranslation(10, 20);
    expect((instance as any).dirty).toBe(true);
  });

  it("sets translation by replacing what is already there", () => {
    const instance = new RenderableStateModule.RenderableState();
    instance.setTranslation(10, 20);
    expect(instance.x).toBe(10);
    expect(instance.y).toBe(20);

    instance.setTranslation(30, 40);
    expect(instance.x).toBe(30);
    expect(instance.y).toBe(40);
  });

  it("updates translation by adding to what is already there", () => {
    const instance = new RenderableStateModule.RenderableState();

    instance.clearDirty();
    expect((instance as any).dirty).toBe(false);

    instance.setTranslation(10, 20);
    expect((instance as any).dirty).toBe(true);
    expect(instance.x).toBe(10);
    expect(instance.y).toBe(20);

    instance.updateTranslation(30, 40);
    expect(instance.x).toBe(40);
    expect(instance.y).toBe(60);
  });

  it("sets translation by replacing what is already there", () => {
    const instance = new RenderableStateModule.RenderableState();
    instance.setScale(10, 20);
    expect(instance.scaleX).toBe(10);
    expect(instance.scaleY).toBe(20);
  });

  it("updates scale by multiplying what is already there", () => {
    const instance = new RenderableStateModule.RenderableState();

    instance.clearDirty();
    expect((instance as any).dirty).toBe(false);

    instance.setScale(10, 20);
    expect((instance as any).dirty).toBe(true);
    expect(instance.scaleX).toBe(10);
    expect(instance.scaleY).toBe(20);

    instance.updateScale(2, 3);
    expect(instance.scaleX).toBe(20);
    expect(instance.scaleY).toBe(60);
  });

  it("does not mark dirty if the proposed values to scale are not different", () => {
    const instance = new RenderableStateModule.RenderableState();

    instance.clearDirty();
    expect((instance as any).dirty).toBe(false);

    instance.setScale(10, 20);
    expect(instance.dirty).toBe(true);
    expect(instance.scaleX).toBe(10);
    expect(instance.scaleY).toBe(20);

    instance.clearDirty();
    instance.setScale(10, 20);
    expect(instance.scaleX).toBe(10);
    expect(instance.scaleY).toBe(20);
    expect(instance.dirty).toBe(false);
  });

  it("updates translation and scale values when flipped vertically", () => {
    const instance = new RenderableStateModule.RenderableState();
    instance.flipVertical(100);
    expect(instance.translation[1]).toBe(100);
    expect(instance.scale[1]).toBe(-1);
  });

  it("updates translation and scale values when flipped horizontally", () => {
    const instance = new RenderableStateModule.RenderableState();
    instance.flipHorizontal(100);
    expect(instance.translation[0]).toBe(100);
    expect(instance.scale[0]).toBe(-1);
  });

  it("converts angle in degrees received and stores it as angle in radians", () => {
    const instance = new RenderableStateModule.RenderableState();
    instance.setAngle(90);
    expect(instance.angleRadians).toBe((270 * Math.PI) / 180);
  });

  it("does not mark dirty if the rotation is not different", () => {
    const instance = new RenderableStateModule.RenderableState();

    instance.clearDirty();
    expect((instance as any).dirty).toBe(false);

    instance.setAngle(90);
    expect(instance.angleRadians).toBe((270 * Math.PI) / 180);

    instance.clearDirty();
    instance.setAngle(90);
    expect(instance.angleRadians).toBe((270 * Math.PI) / 180);
    expect(instance.dirty).toBe(false);
  });

  it("returns the correct child at given index", () => {
    const instance = new RenderableStateModule.RenderableState();
    const child = new Rect({});

    instance.children = [new Rect({}), child];

    const ans = instance.getChild(1);
    expect(ans).toBe(child);
  });

  it("returns null if given index does not exist in children array", () => {
    const instance = new RenderableStateModule.RenderableState();

    const ans = instance.getChild(2);
    expect(ans).toBe(undefined);
  });

  it("does not add the same child again", () => {
    const instance = new RenderableStateModule.RenderableState();
    const child = new Rect({});

    instance.children = [child];

    instance.appendChild(child);
    expect(instance.children.length).toBe(1);
  });

  it("add child", () => {
    const instance = new RenderableStateModule.RenderableState();
    const child = new Rect({});

    instance.children = [new Rect({})];

    instance.appendChild(child);
    expect(instance.children.length).toBe(2);
    expect(instance.children[1]).toBe(child);
  });

  it("adds multiple children", () => {
    const instance = new RenderableStateModule.RenderableState();

    expect(instance.children.length).toBe(0);
    instance.appendChildren([new Rect({}), new Rect({})]);

    expect(instance.children.length).toBe(2);
  });

  it("adds multiple children, but ignores children already added", () => {
    const instance = new RenderableStateModule.RenderableState();

    const child = new Rect({});
    instance.children = [child];
    expect(instance.children.length).toBe(1);

    instance.appendChildren([new Rect({}), new Rect({}), child]);

    expect(instance.children.length).toBe(3);
  });

  it("does not remove non-existing child", () => {
    const instance = new RenderableStateModule.RenderableState();
    instance.children = [];
    const ans = instance.removeChild(new Rect({}));
    expect(ans).toBe(undefined);
  });

  it("removes existing child", () => {
    const instance = new RenderableStateModule.RenderableState();
    const child = new Rect({});

    instance.children = [new Rect({}), child];

    const ans = instance.removeChild(child);
    expect(instance.children.length).toBe(1);
    expect(ans).toBe(child);
  });

  it("empties out all the children in the list", () => {
    const instance = new RenderableStateModule.RenderableState();

    instance.children = [new Rect({}), new Rect({})];

    instance.clearChildren();
    expect(instance.children.length).toBe(0);
  });

  it("sets the parent of a child", () => {
    const instance = new RenderableStateModule.RenderableState();
    const parent = new Rect({});

    expect(instance.parent).toBe(null);
    instance.setParent(parent);
    expect(instance.parent).toBe(parent);
  });
});

describe("RenderableState.updateWorldMatrix", () => {
  it("uses localMatrix when no parentWorldMatrix is provided", () => {
    const state = new RenderableStateModule.RenderableState();
    state.setTranslation(10, 20);
    state.setScale(2, 3);
    state.setAngle(30); // degrees

    // Recompute localMatrix to match the above setters (markDirty triggers updateLocalMatrix)
    state.updateLocalMatrix();

    // Call update without parent
    state.updateWorldMatrix();

    // Expect worldMatrix to equal localMatrix (not by reference, but by value)
    expect(state.worldMatrix).toEqual(state.localMatrix);
    // Different arrays (slice creates a new array)
    expect(state.worldMatrix).not.toBe(state.localMatrix);
  });

  it("multiplies parentWorldMatrix with localMatrix when provided", () => {
    const state = new RenderableStateModule.RenderableState();
    state.setTranslation(5, -7);
    state.setScale(1.5, 0.5);
    state.setAngle(90); // degrees

    state.updateLocalMatrix();

    // Create a parent world matrix (translation + rotation)
    const parentT = m3.translation(100, 50);
    const parentR = m3.rotation(Math.PI / 4);
    const parentWorld = m3.multiply(parentT, parentR);

    // Expected: parent * local
    const expected = m3.multiply(parentWorld, state.localMatrix);

    state.updateWorldMatrix(parentWorld);

    expect(closeArray(state.worldMatrix, expected)).toBe(true);
  });

  it("propagates worldMatrix to children via child.updateWorldMatrix", () => {
    const state = new RenderableStateModule.RenderableState();
    state.setTranslation(3, 4);
    state.setScale(2, 2);
    state.updateLocalMatrix();

    const parentWorld = m3.translation(10, 20);
    const expectedWorld = m3.multiply(parentWorld, state.localMatrix);

    // Mock child with updateWorldMatrix spy
    const child = {
      updateWorldMatrix: vi.fn(),
    } as any;

    state.appendChild(child as any);
    state.updateWorldMatrix(parentWorld);

    expect(child.updateWorldMatrix).toHaveBeenCalledTimes(1);
    // checking what the function was called with first
    const arg = (child.updateWorldMatrix as any).mock.calls[0][0];
    expect(closeArray(arg, expectedWorld)).toBe(true);
  });
});

describe("RenderableState.setWorldMatrix", () => {
  it("sets worldMatrix directly without modifying children", () => {
    const state = new RenderableStateModule.RenderableState();
    const customWorld = [1, 2, 3, 4, 5, 6, 0, 0, 1];

    // Add a child spy
    const child = { updateWorldMatrix: vi.fn() } as any;
    state.appendChild(child as any);

    state.setWorldMatrix(customWorld);

    expect(state.worldMatrix).toBe(customWorld);
    // No propagation happens in setWorldMatrix
    expect(child.updateWorldMatrix).not.toHaveBeenCalled();
  });

  it("can be followed by updateWorldMatrix to propagate", () => {
    const state = new RenderableStateModule.RenderableState();
    const customWorld = m3.translation(50, 75);

    const child = { updateWorldMatrix: vi.fn() } as any;
    state.appendChild(child as any);

    state.setWorldMatrix(customWorld);
    state.updateWorldMatrix(); // no parent; uses localMatrix, but still calls children with current world

    // updateWorldMatrix propagates the computed worldMatrix to children
    expect(child.updateWorldMatrix).toHaveBeenCalledTimes(1);
    const arg = (child.updateWorldMatrix as any).mock.calls[0][0];
    // arg should equal state.worldMatrix at the time of propagation
    expect(closeArray(arg, state.worldMatrix)).toBe(true);
  });
});

// Helper: floating point tolerant comparison
function closeArray(a: number[], b: number[], eps = 1e-6): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > eps) return false;
  }
  return true;
}
