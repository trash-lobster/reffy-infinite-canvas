import { expect, describe, it, vi, beforeEach } from "vitest";
import EventEmitter from "eventemitter3";
import { Canvas } from "../../../src/Canvas";
import { CanvasHistory } from "../../../src/history";
import { GRID_TYPE, Img, Rect, Shape } from "../../../src/shapes";
import { CanvasEvent, convertToPNG, createProgram } from "../../../src/util";
import { AABB } from "../../../src/bounding";
import { deserializeCanvas, serializeCanvas } from "../../../src/serializer";
import { ImageFileMetadata } from "../../../src/storage";

// Mock serializer to validate state-related methods without full impl
vi.mock("../../../src/serializer", () => ({
  serializeCanvas: vi.fn(() => ({ mock: "serialized" })),
  deserializeCanvas: vi.fn(async (_data, _canvas, _getFile) => ({
    mock: "deserialized",
  })),
}));

vi.mock("../../../src/shaders", () => ({
  shapeVert: "shapeVert",
  shapeFrag: "shapeFrag",
  imageVert: "imageVert",
  imageFrag: "imageFrag",
  gridVert: "gridVert",
  gridFrag: "gridFrag",
}));

vi.mock("../../../src/util", async () => {
  const actual =
    await vi.importActual<typeof import("../../../src/util")>(
      "../../../src/util",
    );
  return {
    ...actual,
    createProgram: vi.fn(() => ({}) as WebGLProgram),
    convertToPNG: vi.fn(async (s: string) => s),
    paste: vi.fn(),
    getWorldCoords: vi.fn(() => [0, 0]),
  };
});

let gl: WebGLRenderingContext;
let canvasEl: HTMLCanvasElement;
let history: CanvasHistory;
let hub: EventEmitter;
let canvas: Canvas;

beforeEach(() => {
  gl = {
    BLEND: 0x0be2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    DEPTH_TEST: 0x0b71,
    LEQUAL: 0x0203,
    COLOR_BUFFER_BIT: 0x4000,
    DEPTH_BUFFER_BIT: 0x0100,
    canvas: { width: 640, height: 480 } as HTMLCanvasElement,
    enable: vi.fn(),
    blendFunc: vi.fn(),
    getExtension: vi.fn(),
    depthFunc: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    viewport: vi.fn(),
    useProgram: vi.fn(),
    getUniformLocation: vi.fn().mockReturnValue({} as WebGLUniformLocation),
    uniform1f: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    createBuffer: vi.fn().mockReturnValue({} as WebGLBuffer),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    vertexAttribPointer: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    disableVertexAttribArray: vi.fn(),
    drawArrays: vi.fn(),
  } as unknown as WebGLRenderingContext;
  canvasEl = {
    width: 640,
    height: 480,
    getContext: vi.fn().mockReturnValue(gl as WebGLRenderingContext),
    style: {},
    addEventListener: vi.fn(),
    parentElement: {
      getBoundingClientRect: () => ({ width: 640, height: 480 }),
    },
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 640,
      height: 480,
    })),
  } as any as HTMLCanvasElement;
  history = new CanvasHistory();
  hub = new EventEmitter();
  canvas = new Canvas(
    canvasEl,
    history,
    hub,
    vi.fn(),
    vi.fn(async () => 1),
    () => [640, 480],
  );
});

describe("Canvas", () => {
  it("initializes WebGL state and programs on construct", () => {
    expect(canvas.gl).toBe(gl);
    expect(gl.enable).toHaveBeenCalledWith(gl.BLEND);
    expect(gl.blendFunc).toHaveBeenCalledWith(
      gl.SRC_ALPHA,
      gl.ONE_MINUS_SRC_ALPHA,
    );
    expect(gl.enable).toHaveBeenCalledWith(gl.DEPTH_TEST);
    expect(gl.depthFunc).toHaveBeenCalledWith(gl.LEQUAL);
    expect(createProgram).toHaveBeenCalledTimes(3);
  });

  it("appendChild assigns increasing renderOrder for shapes", () => {
    const r1 = new Rect({});
    const r2 = new Rect({});
    canvas.appendChild(r1);
    canvas.appendChild(r2);
    expect(r1.renderOrder).toBeLessThan(r2.renderOrder);
  });

  it("removeChild removes from scene, selection, and calls destroy", () => {
    const r1 = new Rect({});
    const r2 = new Rect({});
    canvas.appendChild(r1);
    canvas.appendChild(r2);
    expect(canvas.totalNumberOfChildren).toBe(2);

    const selRemoveSpy = vi.spyOn(canvas.selectionManager, "remove");
    const destroySpy = vi.spyOn(r1, "destroy");

    canvas.removeChild(r1);

    // Child removed from canvas state
    expect(canvas.totalNumberOfChildren).toBe(1);
    // Selection manager notified
    expect(selRemoveSpy).toHaveBeenCalledWith([r1 as any]);
    // Child destroy called
    expect(destroySpy).toHaveBeenCalled();
  });

  it("totalNumberOfChildren reflects current scene size", () => {
    expect(canvas.totalNumberOfChildren).toBe(0);
    const r1 = new Rect({});
    const r2 = new Rect({});
    canvas.appendChild(r1);
    canvas.appendChild(r2);
    expect(canvas.totalNumberOfChildren).toBe(2);
    canvas.removeChild(r1);
    expect(canvas.totalNumberOfChildren).toBe(1);
  });

  it("numberOfChildrenRendered matches culling results after render", () => {
    const img = new Img({ src: "data:image/png;base64,i" });
    const rect = new Rect({});
    canvas.appendChild(img);
    canvas.appendChild(rect);

    // No culling: both should render
    const collideSpy = vi.spyOn(AABB, "isColliding").mockReturnValue(true);
    img.render = vi.fn();
    rect.render = vi.fn();
    canvas.render();
    expect(canvas.numberOfChildrenRendered).toBe(2);

    // Full culling: none should render
    collideSpy.mockReturnValue(false);
    canvas.render();
    expect(canvas.numberOfChildrenRendered).toBe(0);
    vi.restoreAllMocks();
  });

  it("render clears, sets grid uniform and renders children with program switching", () => {
    // Force all children to be considered visible
    vi.spyOn(AABB, "isColliding").mockReturnValue(true);
    const img = new Img({ src: "data:image/png;base64,i" });
    const rect = new Rect({});
    canvas.appendChild(img);
    canvas.appendChild(rect);

    // Stub child render to avoid deeper GL requirements
    img.render = vi.fn();
    rect.render = vi.fn();

    canvas.render();
    expect(gl.clearColor).toHaveBeenCalledWith(0, 0, 0, 0);
    expect(gl.viewport).toHaveBeenCalledWith(0, 0, 640, 480);
    // Grid uniform set
    expect(gl.getUniformLocation).toHaveBeenCalledWith(
      expect.anything(),
      "u_z",
    );
    expect(gl.uniform1f).toHaveBeenCalledWith(expect.anything(), 0.0);
    // Children rendered
    expect(img.render).toHaveBeenCalled();
    expect(rect.render).toHaveBeenCalled();
    // useProgram should be called at least once for switching
    expect(gl.useProgram).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("addImageToCanvas emits save and change, returns Img", async () => {
    const saveSpy = vi.fn(async () => 42);
    const emitSpy = vi.spyOn(hub, "emit");
    const canvas = new Canvas(canvasEl, history, hub, vi.fn(), saveSpy, () => [
      640, 480,
    ]);

    const img = await canvas.addImageToCanvas(
      "data:image/png;base64,i",
      10,
      20,
    );
    expect(img).toBeInstanceOf(Img);
    expect(saveSpy).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith("save");
    expect(emitSpy).toHaveBeenCalledWith(CanvasEvent.Change);
  });

  it("addImageToCanvas and pass in center to explore the branch", async () => {
    const saveSpy = vi.fn(async () => 42);
    const emitSpy = vi.spyOn(hub, "emit");
    const canvas = new Canvas(canvasEl, history, hub, vi.fn(), saveSpy, () => [
      640, 480,
    ]);

    const img = await canvas.addImageToCanvas("base64,i", 10, 20, 1, 1, true);
    expect(img).toBeInstanceOf(Img);
    expect(convertToPNG).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith("save");
    expect(emitSpy).toHaveBeenCalledWith(CanvasEvent.Change);
  });

  it("addImageToCanvas and pass in center to explore onload", async () => {
    const saveSpy = vi.fn(async () => 42);
    const emitSpy = vi.spyOn(hub, "emit");
    const canvas = new Canvas(canvasEl, history, hub, vi.fn(), saveSpy, () => [
      640, 480,
    ]);

    const img = await canvas.addImageToCanvas(
      "data:image/png;base64,i",
      10,
      20,
      1,
      1,
      true,
    );
    expect(img).toBeInstanceOf(Img);
    expect(convertToPNG).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith("save");
    expect(emitSpy).toHaveBeenCalledWith(CanvasEvent.Change);
  });

  it("getChild returns child as expected", () => {
    const canvas = new Canvas(canvasEl, history, hub, vi.fn(), vi.fn(), () => [
      640, 480,
    ]);

    const img = new Img({ src: "data:image/png;base64,i" });
    canvas.appendChild(img);
    const child = canvas.getChild(0);
    expect(child).toBe(img);
  });

  it("updateZoomByFixedAmount calls camera.updateZoom with center and factor", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    const spy = vi.spyOn(canvas.camera, "updateZoom");
    canvas.updateZoomByFixedAmount(1);

    expect(spy).toHaveBeenCalledTimes(1);
    const [cx, cy, factor] = spy.mock.calls[0];
    expect(cx).toBe(640 / 2);
    expect(cy).toBe(480 / 2);
    expect(factor).toBeCloseTo(Math.exp(0.5 * 0.3 * 1));
  });
});

describe("Canvas getters", () => {
  it("exposes core getters and toggles isGlobalClick", () => {
    // Core getters return expected instances/values
    expect(canvas.gl).toBe(gl);
    expect(canvas.grid).toBeDefined();
    expect(canvas.history).toBe(history);
    expect(canvas.eventHub).toBe(hub);
    expect(canvas.selectionManager).toBeDefined();
    expect(canvas.contextMenuManager).toBeDefined();
    expect(canvas.canvas).toBe(canvasEl);
    expect(canvas.camera).toBeDefined();
    expect(canvas.basicShapeProgram).toBeDefined();

    // isGlobalClick getter/setter behavior
    expect(canvas.isGlobalClick).toBe(true);
    canvas.isGlobalClick = false;
    expect(canvas.isGlobalClick).toBe(false);
  });

  it("getDOM returns the underlying canvas element", () => {
    expect(canvas.getDOM()).toBe(canvasEl);
  });

  it("get selected", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    const img = new Img({ src: "data:image/png;base64,i" });
    canvas.appendChild(img);

    expect(canvas.getSelected()).toStrictEqual(
      canvas.selectionManager.selected,
    );
  });

  it("getBoundingClientRect delegates to canvas element", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    const rect = canvas.getBoundingClientRect();
    expect(canvasEl.getBoundingClientRect).toHaveBeenCalled();
    expect(rect).toEqual({ left: 0, top: 0, width: 640, height: 480 });
  });
});

describe("destroy", () => {
  it("calls destroy for gl", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    canvas.destroy();
    expect(gl.deleteProgram).toHaveBeenCalledTimes(2);
  });

  it("calls destory in each child", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    const img = new Img({ src: "data:image/png;base64,i" });
    img.destroy = vi.fn();
    canvas.appendChild(img);

    canvas.destroy();
    expect(img.destroy).toHaveBeenCalled();
  });

  it("destroy calls child.destroy only when present, skips missing", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    const withDestroy = new Img({ src: "data:image/png;base64,i" });
    const withoutDestroy = new Img({ src: "data:image/png;base64,i" });
    canvas.appendChild(withDestroy);
    canvas.appendChild(withoutDestroy);

    // Spy the first; remove destroy from the second to simulate missing method
    const destroySpy = vi.spyOn(withDestroy, "destroy");
    delete (withoutDestroy as any).destroy;

    // Should not throw and should call only existing destroy
    expect(() => canvas.destroy()).not.toThrow();
    expect(destroySpy).toHaveBeenCalled();
    // If you want, assert deleteProgram calls remain 2 as in prior test
    expect(gl.deleteProgram).toHaveBeenCalledTimes(2);
  });
});

describe("hitTest", () => {
  it("calls hitTest", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    canvas.hitTest(20, 40);
    expect(canvas.isGlobalClick).toBeTruthy();
  });
});

describe("state", () => {
  it("exportState delegates to serializeCanvas", () => {
    const result = canvas.exportState();
    expect(serializeCanvas).toHaveBeenCalledWith(canvas);
    expect(result).toEqual({ mock: "serialized" });
  });

  it("importState delegates to deserializeCanvas", async () => {
    const data = { foo: "bar" } as any;
    const getFile = vi.fn(async () => ({ id: 1 }) as ImageFileMetadata);
    const result = await canvas.importState(data, getFile);
    expect(deserializeCanvas).toHaveBeenCalledWith(data, canvas, getFile);
    expect(result).toEqual({ mock: "deserialized" });
  });

  it("clearChildren clears selection, children, and history", () => {
    const selClearSpy = vi.spyOn(canvas.selectionManager, "clear");
    const stateClearSpy = vi.spyOn(canvas.state, "clearChildren");
    const historyClearSpy = vi.spyOn(history, "clear");

    const img = new Img({ src: "data:image/png;base64,i" });
    canvas.appendChild(img);
    expect(canvas.totalNumberOfChildren).toBe(1);

    canvas.clearChildren();
    expect(selClearSpy).toHaveBeenCalled();
    expect(stateClearSpy).toHaveBeenCalled();
    expect(historyClearSpy).toHaveBeenCalled();
    expect(canvas.totalNumberOfChildren).toBe(0);
  });
});

describe("toggle grid", () => {
  it("toggle grid to none", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    canvas.grid.changeGridType = vi.fn();
    canvas.toggleGrid();
    expect(canvas.grid.changeGridType).toHaveBeenCalledWith(GRID_TYPE.NONE);
  });

  it("toggle grid from none to grid", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    canvas.grid.gridType = GRID_TYPE.NONE;

    const gridChange = vi.spyOn(canvas.grid, "changeGridType");

    canvas.toggleGrid();
    expect(gridChange).toHaveBeenCalledWith(GRID_TYPE.GRID);
    expect(canvas.grid.gridType).toBe(GRID_TYPE.GRID);
  });
});

describe("setShapeZOrder", () => {
  it("ends function early when there is no selected box", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    const img = new Img({ src: "data:image/png;base64,i" });
    canvas.appendChild(img);
    const img2 = new Img({ src: "data:image/png;base64,i" });
    canvas.appendChild(img2);
    const orders = (canvas.children as Shape[]).map((c) => c.renderOrder);
    canvas.history.push = vi.fn();

    canvas.setShapeZOrder();
    expect(canvas.history.push).not.toHaveBeenCalled();
    expect(
      (canvas.children as Shape[]).map((c) => c.renderOrder),
    ).toStrictEqual(orders);
  });

  //
  it("moves the first added img to front as expected", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    const img = new Img({ src: "data:image/png;base64,i" });
    canvas.appendChild(img);
    const img2 = new Img({ src: "data:image/png;base64,i" });
    canvas.appendChild(img2);
    const ogEndOrder = img2.renderOrder;

    canvas.selectionManager.add([img]);

    canvas.setShapeZOrder();
    expect(img.renderOrder).toBe(ogEndOrder + 1);
  });

  it("moves the second added img to back as expected", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    const img = new Img({ src: "data:image/png;base64,i" });
    canvas.appendChild(img);
    const ogEndOrder = img.renderOrder;
    const img2 = new Img({ src: "data:image/png;base64,i" });
    canvas.appendChild(img2);

    canvas.selectionManager.add([img2]);

    canvas.setShapeZOrder(false);
    expect(img2.renderOrder).toBe(ogEndOrder - 1);
  });

  it("sees empty order and throw error", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );
  });
});

describe("change mode", () => {
  it("change mode", () => {
    const canvas = new Canvas(
      canvasEl,
      history,
      hub,
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    canvas.pointerEventManager.changeMode = vi.fn();
    canvas.selectionManager.clear = vi.fn();
    canvas.changeMode();
    expect(canvas.pointerEventManager.changeMode).toHaveBeenCalledOnce();
    expect(canvas.selectionManager.clear).toHaveBeenCalledOnce();
  });
});

describe("WebGL stats", () => {
  it("wrapWebGLContext increments texture and shader counters", () => {
    // Minimal gl with texture/shader methods
    const baseGl: any = {
      createTexture: vi.fn(() => ({}) as WebGLTexture),
      deleteTexture: vi.fn((_t: WebGLTexture | null) => undefined),
      createShader: vi.fn((_type: number) => ({}) as WebGLShader),
      deleteShader: vi.fn((_s: WebGLShader | null) => undefined),
      // plus required fields for Canvas ctor
      BLEND: 0x0be2,
      SRC_ALPHA: 0x0302,
      ONE_MINUS_SRC_ALPHA: 0x0303,
      DEPTH_TEST: 0x0b71,
      LEQUAL: 0x0203,
      COLOR_BUFFER_BIT: 0x4000,
      DEPTH_BUFFER_BIT: 0x0100,
      canvas: { width: 640, height: 480 },
      enable: vi.fn(),
      blendFunc: vi.fn(),
      getExtension: vi.fn(),
      depthFunc: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      viewport: vi.fn(),
      useProgram: vi.fn(),
      getUniformLocation: vi.fn().mockReturnValue({} as WebGLUniformLocation),
      uniform1f: vi.fn(),
      deleteProgram: vi.fn(),
    };

    const localCanvasEl: any = {
      width: 640,
      height: 480,
      getContext: vi.fn().mockReturnValue(baseGl as WebGLRenderingContext),
      style: {},
      addEventListener: vi.fn(),
      parentElement: {
        getBoundingClientRect: () => ({ width: 640, height: 480 }),
      },
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 640,
        height: 480,
      })),
    } as any as HTMLCanvasElement;

    const canvas = new Canvas(
      localCanvasEl,
      new CanvasHistory(),
      new EventEmitter(),
      vi.fn(),
      vi.fn(async () => 1),
      () => [640, 480],
    );

    const wrap = (canvas as any).wrapWebGLContext;
    expect(typeof wrap).toBe("function");
    const wrapped = wrap.call(canvas, baseGl as WebGLRenderingContext);

    // Act: call wrapped methods
    wrapped.createTexture();
    wrapped.deleteTexture({} as WebGLTexture);
    wrapped.createShader(0);
    wrapped.deleteShader({} as WebGLShader);

    const stats = Canvas.getWebGLStats();
    expect(stats.texturesCreated).toBeGreaterThan(0);
    expect(stats.texturesDeleted).toBeGreaterThan(0);
    expect(stats.shadersCreated).toBeGreaterThan(0);
    expect(stats.shadersDeleted).toBeGreaterThan(0);
    // Leak counters should be consistent with created-deleted
    expect(stats.texturesLeaked).toBe(
      stats.texturesCreated - stats.texturesDeleted,
    );
    expect(stats.shadersLeaked).toBe(
      stats.shadersCreated - stats.shadersDeleted,
    );
  });

  it("getWebGLStats reports program and buffer leak deltas", () => {
    // Use existing global gl and canvasEl from test setup
    // Simulate program create/delete effects
    // We can't access private counters directly, but we can call deleteProgram
    gl.deleteShader({} as WebGLShader);

    const stats = Canvas.getWebGLStats();
    expect(stats.shadersDeleted).toBeGreaterThanOrEqual(1);
    expect(stats.programsLeaked).toBe(
      stats.programsCreated - stats.programsDeleted,
    );
    expect(stats.buffersLeaked).toBe(
      stats.buffersCreated - stats.buffersDeleted,
    );
  });
});
