import { describe, it, expect, vi, afterEach } from "vitest";
import * as Files from "../../../src/util/files";
import { Img } from "../../../src/shapes";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("hashStringToId", () => {
  it("should hash string to hex", async () => {
    const input = "test";
    const fakeHash = new Uint8Array([1, 2, 3, 4]);
    vi.stubGlobal("crypto", {
      subtle: {
        digest: vi.fn().mockResolvedValue(fakeHash.buffer),
      },
    });
    const { hashStringToId } = await import("../../../src/util/files");
    const result = await hashStringToId(input);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });
});

describe("getMimeType", () => {
  it("should return expected mime type from string", () => {
    const mockData = "data:image/png;base64,abc";
    const result = Files.getMimeType(mockData);
    expect(result).toBe("image/png");
  });

  it("should return undefined if string has no matches", () => {
    const mockData = "random test string with no match";
    const result = Files.getMimeType(mockData);
    expect(result).toBe(undefined);
  });
});

describe("addImages", () => {
  it("should return true when passing in correct file type", async () => {
    const imgInstance = new Img({});
    const addToCanvas = vi.fn().mockResolvedValue(imgInstance);

    const file1 = new File(["foo"], "foo.png", { type: "image/png" });
    const file2 = new File(["bar"], "bar.png", { type: "image/png" });
    const fileList = {
      0: file1,
      1: file2,
      length: 2,
      item: (i: number) => ({ type: "image/png" }),
    } as unknown as FileList;

    const result = await Files.addImages(fileList, addToCanvas);

    expect(result).toEqual([imgInstance, imgInstance]);
  });
});

describe("downloadJSON", () => {
  it("should create anchor and trigger download", async () => {
    const { downloadJSON } = await import("../../../src/util/files");
    const appendChild = vi.spyOn(document.body, "appendChild");

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:url"),
      revokeObjectURL: vi.fn(),
    });

    downloadJSON("test.json", {} as any);

    expect(appendChild).toHaveBeenCalled();
  });
});

describe("readJSONFile", () => {
  it("should parse JSON from file", async () => {
    const { readJSONFile } = await import("../../../src/util/files");
    const file = {
      text: vi.fn().mockResolvedValue('{"foo":123}'),
    } as unknown as File;
    const result = await readJSONFile(file);
    expect(result).toEqual({ foo: 123 });
  });
});

describe("convertToPNG", () => {
  it("should resolve with PNG data URL", async () => {
    const { convertToPNG } = await import("../../../src/util/files");
    const src = "data:image/png;base64,abc";

    vi.stubGlobal(
      "Image",
      class {
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
          return this;
        }
        onload: (() => void) | null = null;
        onerror: ((e: any) => void) | null = null;
        readAsDataURL(blob: any) {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      },
    );

    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        clearRect: vi.fn(),
        drawImage: vi.fn(),
      })),
      toDataURL: vi.fn(() => "data:image/png;base64,xyz"),
    };

    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    const result = await convertToPNG(src);
    expect(result).toBe("data:image/png;base64,xyz");
    vi.unstubAllGlobals();
  });
});

describe("mergeMultiImg", () => {
  it("should merge images and return PNG data URL", async () => {
    const { mergeMultiImg } = await import("../../../src/util/files");
    const imgs = [
      { x: 0, y: 0, width: 10, height: 10, sx: 1, sy: 1, src: "img1" },
      { x: 10, y: 10, width: 10, height: 10, sx: 1, sy: 1, src: "img2" },
    ];
    const ctx = { clearRect: vi.fn(), drawImage: vi.fn() };
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toDataURL: vi.fn(() => "data:image/png;base64,merged"),
    };

    vi.stubGlobal(
      "Image",
      class {
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
          return this;
        }
        onload: (() => void) | null = null;
        onerror: ((e: any) => void) | null = null;
        readAsDataURL(blob: any) {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      },
    );

    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });

    const result = await mergeMultiImg(imgs as any);
    expect(result).toBe("data:image/png;base64,merged");
  });
});

describe("mergeImagesToCanvas", () => {
  it("should merge images and return canvas and dimensions", async () => {
    const { mergeImagesToCanvas } = await import("../../../src/util/files");
    const imgs = [
      { x: 0, y: 0, width: 10, height: 10, src: "img1" },
      { x: 10, y: 10, width: 10, height: 10, src: "img2" },
    ];
    const ctx = { drawImage: vi.fn() };
    const canvas = { width: 0, height: 0, getContext: vi.fn(() => ctx) };
    vi.stubGlobal("document", { createElement: vi.fn(() => canvas) });
    vi.stubGlobal(
      "Image",
      class {
        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
          return this;
        }
        onload: (() => void) | null = null;
        onerror: ((e: any) => void) | null = null;
        readAsDataURL(blob: any) {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      },
    );
    const result = await mergeImagesToCanvas(imgs as any);
    expect(result.mergedCanvas).toBe(canvas);
    expect(result.width).toBe(20);
    expect(result.height).toBe(20);
    vi.unstubAllGlobals();
  });
  it("should throw if no images", async () => {
    const { mergeImagesToCanvas } = await import("../../../src/util/files");
    await expect(mergeImagesToCanvas([])).rejects.toThrow(
      "No images to merge.",
    );
  });
});
