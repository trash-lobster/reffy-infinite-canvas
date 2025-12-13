import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  serializeNode,
  serializeCanvas,
  deserializeCanvas,
  SerializedCanvas,
  SerializedImg,
  SerializedRect,
  SerializedGrid,
  SerializedNode,
  SerializedCamera,
} from "../../../src/serializer/serializer";
import { Rect } from "../../../src/shapes/Rect";
import { Img } from "../../../src/shapes/Img";
import { Grid } from "../../../src/shapes/Grid";
import { Canvas } from "../../../src/Canvas";
import { Camera } from "../../../src/camera";
import { CameraState } from "../../../src/state";
import { ImageFileMetadata } from "../../../src/storage";
import { Renderable } from "../../../src/shapes";
import { hashStringToId } from "../../../src/util";

function makeCanvasStub() {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = 640;
  canvasEl.height = 480;

  const gl = { canvas: canvasEl } as WebGLRenderingContext;
  const cameraState = {
    x: 10,
    y: -5,
    zoom: 2,
    setZoom: vi.fn(function (zoom: number) {}),
    setX: vi.fn(function (x: number) {}),
    setY: vi.fn(function (y: number) {}),
  } as unknown as CameraState;
  const camera = {
    state: cameraState,
  } as Camera;

  const grid = { gridType: 1 } as any;

  const canvas = {
    gl,
    camera,
    grid,
    children: [] as Renderable[],
    appendChild: vi.fn(function (this: Canvas, child: Renderable) {
      this.children.push(child);
    }),
  } as any;

  return canvas;
}

const ONE_BY_ONE_PNG =
  "data:image/png;base64," +
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8" +
  "/w8AAgMBgXYp3wAAAABJRU5ErkJggg==";

// Factory so each canvas can get its own ctx if needed
function make2dCtxMock() {
  return {
    // properties
    fillStyle: "#000",
    // drawing ops we use
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    // common no-ops to be safe
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    // ensure TS is happy if typed
  } as unknown as CanvasRenderingContext2D;
}

// Keep references if you want to assert later in tests
const ctxMocks: CanvasRenderingContext2D[] = [];
(globalThis as any).__canvasCtxMocks = ctxMocks;

// Patch HTMLCanvasElement
const canvasProto = HTMLCanvasElement.prototype as any;

if (!canvasProto.getContext || !canvasProto.getContext.__isMock) {
  canvasProto.getContext = vi.fn(function (
    this: HTMLCanvasElement,
    type: string,
  ) {
    if (type === "2d") {
      const ctx = make2dCtxMock();
      ctxMocks.push(ctx);
      return ctx;
    }
    return null;
  });
  canvasProto.getContext.__isMock = true;
}

if (!canvasProto.toDataURL || !canvasProto.toDataURL.__isMock) {
  canvasProto.toDataURL = vi.fn(function (_type?: string) {
    return ONE_BY_ONE_PNG;
  });
  canvasProto.toDataURL.__isMock = true;
}

describe("serializer serializeNode", () => {
  it("serializes Rect with transform, renderOrder, and children", () => {
    const parent = new Rect({ x: 5, y: 7, width: 100, height: 50 });
    parent.setScale(2, 3);
    parent.renderOrder = 10;
    const child = new Rect({ x: 1, y: 2, width: 10, height: 20 });
    parent.appendChild(child);

    const out = serializeNode(parent) as SerializedRect;
    expect(out.type).toBe("Rect");
    expect(out.transform).toEqual({ x: 5, y: 7, sx: 2, sy: 3 });
    expect(out.width).toBe(100);
    expect(out.height).toBe(50);
    expect(out.renderOrder).toBe(10);
    expect(Array.isArray(out.children)).toBe(true);
    expect(out.children!.length).toBe(1);
    expect(out.children![0].type).toBe("Rect");
  });

  it("serializes Img with id, renderOrder, size, fileId", () => {
    const img = new Img({
      x: 0,
      y: 0,
      width: 64,
      height: 64,
      src: "data:image/png;base64,iVBORw0...",
    });
    img.renderOrder = 5;
    img.fileId = 1234;
    img.setScale(1.5, 0.75);

    const out = serializeNode(img) as SerializedImg;
    expect(out.type).toBe("Img");
    expect(out.renderOrder).toBe(5);
    expect(out.width).toBe(64);
    expect(out.height).toBe(64);
    expect(out.fileId).toBe(1234);
    expect(out.transform).toEqual({ x: 0, y: 0, sx: 1.5, sy: 0.75 });
  });

  it("serializes Grid with style", () => {
    const grid = new Grid();
    const out = serializeNode(grid) as SerializedGrid;
    expect(out.type).toBe("Grid");
    expect(out.style).toBe(1);
  });

  it("serializes generic Renderable as fallback", () => {
    const r = new Rect({ x: 0, y: 0, width: 10, height: 10 });
    // Use child to get a nested generic: wrap Rect in a dummy parent to force fallback path
    const generic: any = { children: [r] };
    const out = serializeNode(generic as any);
    expect(out.type).toBe("Renderable");
    expect(Array.isArray(out.children)).toBe(true);
    expect(out.children![0].type).toBe("Rect");
  });
});

describe("serializer serializeCanvas", () => {
  it("captures canvas dimensions, dpr, camera, and root", () => {
    const canvas = makeCanvasStub();
    const packed = serializeCanvas(canvas);
    expect(packed.version).toBe(1);
    expect(packed.canvas.width).toBe(640);
    expect(packed.canvas.height).toBe(480);
    expect(packed.canvas.dpr).toBeGreaterThan(0);
    expect(packed.camera!.x).toBe(10);
    expect(packed.camera!.y).toBe(-5);
    expect(packed.camera!.zoom).toBe(2);
    expect(packed.root).toBeTruthy();
  });
});

describe("serializer deserializeCanvas", () => {
  let canvas: any;

  beforeEach(() => {
    canvas = makeCanvasStub();
    Object.setPrototypeOf(canvas, Canvas.prototype);
  });

  it("rebuilds Rect nodes with transform and appends to canvas", async () => {
    const data: SerializedCanvas = {
      version: 1,
      canvas: { width: 640, height: 480, dpr: 1 },
      camera: { x: 0, y: 0, zoom: 1 },
      root: {
        type: "Rect",
        transform: { x: 10, y: 20, sx: 2, sy: 3 },
        width: 100,
        height: 50,
      } as any,
    } as any;

    const getFile = vi.fn(
      async (id: number | string) =>
        ({ id, dataURL: "data:image/png;base64,iVBORw0..." }) as any,
    );
    await deserializeCanvas(data, canvas, getFile);
    expect(canvas.children.length).toBe(1);
    const rect = canvas.children[0];
    expect(rect).toBeInstanceOf(Rect);
    expect(rect.x).toBe(10);
    expect(rect.y).toBe(20);
    expect(rect.sx).toBeCloseTo(2, 6);
    expect(rect.sy).toBeCloseTo(3, 6);
  });

  it("rebuilds Img nodes, preserves renderOrder, calls writeFileToDatabase and loads actual file", async () => {
    const mockDataString =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII";
    const fileId = await hashStringToId(mockDataString);
    const data: SerializedCanvas = {
      version: 1,
      canvas: { width: 640, height: 480, dpr: 1 },
      camera: { x: 0, y: 0, zoom: 1 } as SerializedCamera,
      files: [{ id: fileId, dataURL: mockDataString } as ImageFileMetadata],
      root: {
        type: "Renderable",
        transform: { x: 15, y: 25, sx: 1.2, sy: 0.8 },
        width: 120,
        height: 80,
        fileId,
        renderOrder: 0,
        children: [
          {
            type: "Img",
            width: 120,
            height: 60,
            fileId: fileId,
            transform: { x: 15, y: 25, sx: 1.2, sy: 0.8 },
            renderOrder: 99,
          },
        ],
      } as SerializedNode,
    };

    const writeFileToDatabase = vi.fn();
    const getFile = vi.fn(
      async (id: number | string) =>
        ({
          id,
          dataURL:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX///+/v7+jQ3Y5AAAADklEQVQI12P4AIX8EAgALgAD/aNpbtEAAAAASUVORK5CYII=",
        }) as any,
    );

    await deserializeCanvas(data, canvas, getFile, writeFileToDatabase);
    expect(canvas.children.length).toBe(1);
    const img = canvas.children[0] as Img;
    expect(img).toBeInstanceOf(Img);
    expect(img.renderOrder).toBe(99);
    expect(writeFileToDatabase).toHaveBeenCalled();
    // file loader was requested
    expect(getFile).toHaveBeenCalledWith(fileId);
    // position and scale applied
    expect(img.x).toBe(15);
    expect(img.y).toBe(25);
    expect(img.sx).toBeCloseTo(1.2, 6);
    expect(img.sy).toBeCloseTo(0.8, 6);
  }, 20000);

  it("handles Grid style when parent is Canvas", async () => {
    const data: SerializedCanvas = {
      version: 1,
      canvas: { width: 640, height: 480, dpr: 1 },
      camera: { x: 0, y: 0, zoom: 1 },
      root: { type: "Grid", style: 2 } as any,
    } as any;

    const getFile = vi.fn(async () => ({ id: 1, dataURL: "" }) as any);
    await deserializeCanvas(data, canvas, getFile);
    expect(canvas.grid.gridType).toBe(2);
  });

  it("continues when image file lookup fails (uses placeholder path)", async () => {
    const data: SerializedCanvas = {
      version: 1,
      canvas: { width: 640, height: 480, dpr: 1 },
      camera: { x: 0, y: 0, zoom: 1 },
      files: [],
      root: {
        type: "Img",
        transform: { x: 0, y: 0, sx: 1, sy: 1 },
        width: 10,
        height: 10,
        fileId: 999,
      } as any,
    } as any;

    const getFile = vi.fn(async (fileId: string | number) => {
      throw new Error("not found");
    });
    await deserializeCanvas(data, canvas, getFile);
    // Child should still be appended with placeholder framed image
    expect(canvas.children.length).toBe(1);
    expect(canvas.children[0]).toBeInstanceOf(Img);
  });
});
