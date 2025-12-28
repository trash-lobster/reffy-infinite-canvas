import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";

vi.mock("zod", () => {
  const z = {
    number: () => ({}),
    string: () => ({}),
    literal: (_v: any) => ({}),
    union: (_arr: any[]) => ({}),
    object: (_spec: any) => ({
      strict: () => ({
        safeParse: (raw: any) => ({ success: true, data: raw }),
      }),
    }),
    array: (_item: any) => ({
      min: (_n: number) => ({
        strict: () => ({
          safeParse: (raw: any) => ({ success: true, data: raw }),
        }),
      }),
    }),
  };
  return { default: z };
});

import * as clipboard from "../../../src/util/clipboard";
import { Img } from "../../../src/shapes";
import * as Camera from "../../../src/util/camera";
import * as Util from "../../../src/util";

describe("clipboard", () => {
  let originalClipboard: typeof navigator.clipboard;
  let originalExecCommand: typeof document.execCommand;

  beforeAll(() => {
    if (typeof globalThis.ClipboardItem === "undefined") {
      // @ts-ignore
      globalThis.ClipboardItem = class ClipboardItem {
        constructor(items: Record<string, Blob>) {
          this.items = items;
        }
        items: Record<string, Blob>;
      };
    }
  });

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
    originalExecCommand = document.execCommand;

    const mockBlob = {
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          type: "infinite_canvas",
          elements: [{ src: "foo", x: 1, y: 2, sx: 1, sy: 1, fileId: 199 }],
        }),
      ),
    };

    // @ts-ignore
    globalThis.navigator.clipboard = {
      read: vi.fn().mockResolvedValue([
        {
          types: ["text/plain"],
          getType: vi.fn().mockResolvedValue(mockBlob),
        },
      ]),
    };
    document.execCommand = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    // @ts-ignore
    navigator.clipboard = originalClipboard;
    document.execCommand = originalExecCommand;
  });

  it("copy should serialize selected images and call clipboard.writeText", async () => {
    navigator.clipboard.writeText = vi.fn().mockResolvedValueOnce(undefined);
    const img = new Img({ src: "foo", x: 1, y: 2, sx: 1, sy: 1 });
    await clipboard.copy([img]);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("copy should log error when clipboard.write fails", async () => {
    navigator.clipboard.writeText = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const img = new Img({ src: "foo", x: 1, y: 2, sx: 1, sy: 1 });
    await clipboard.copy([img]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("copy should fallback to execCommand if clipboard.write fails", async () => {
    globalThis.navigator.clipboard.writeText = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"));
    const img = new Img({ src: "foo", x: 1, y: 2, sx: 1, sy: 1 });
    await clipboard.copy([img]);
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("copy with cliboardEvent should see clipboard event data be set", async () => {
    const mockClipboardData = {
      setData: vi.fn(),
    };

    const clipboardEvent = {
      clipboardData: mockClipboardData,
    } as unknown as ClipboardEvent;

    const img = new Img({ src: "foo", x: 1, y: 2, sx: 1, sy: 1 });
    await clipboard.copy([img], clipboardEvent);
    expect(clipboardEvent.clipboardData?.setData).toHaveBeenCalled();
  });

  it("paste should add images from clipboard data", async () => {
    const canvas = {
      canvas: {},
      gl: null,
      addImageToCanvas: vi.fn().mockResolvedValue({}),
      getWorldCoords: vi.fn().mockResolvedValue([100, 100]),
    };
    const history = {
      push: vi.fn(),
    };
    const getImageId = vi.fn().mockResolvedValueOnce({
      dataURL: "test data url",
    });
    await clipboard.paste(
      10,
      20,
      canvas as any,
      history as any,
      getImageId,
      true,
    );
    expect(canvas.addImageToCanvas).toHaveBeenCalled();
    expect(history.push).toHaveBeenCalled();
  });

  it("paste should call getWorldCoords if isWorldCoord is false", async () => {
    const worldCoordsSpy = vi
      .spyOn(Camera, "getWorldCoords")
      .mockImplementation((x, y, canvas) => [100, 100]);
    await clipboard.paste(10, 20, {}, {}, vi.fn(), false);
    expect(worldCoordsSpy).toHaveBeenCalled();
  });

  it("paste should return early if the wrong type is read", async () => {
    navigator.clipboard.read = vi.fn().mockResolvedValue([
      {
        types: ["wrong/type"],
        getType: vi.fn().mockResolvedValue(null),
      },
    ]);

    const result = await clipboard.paste(
      10,
      20,
      {} as any,
      {} as any,
      vi.fn(),
      false,
    );
    expect(result).toBeUndefined();
  });

  it("paste finds text/html and does nothing", async () => {
    const el = document.createElement("html");
    const documentSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((type: string) => el);

    const mockHTMLBlock = {
      text: vi.fn().mockResolvedValue('<img src="http://test.com"></img>'),
    };

    navigator.clipboard.read = vi.fn().mockResolvedValue([
      {
        types: ["text/html"],
        getType: vi.fn().mockResolvedValue(mockHTMLBlock),
      },
    ]);

    const canvas = {
      canvas: {},
      gl: null,
      addImageToCanvas: vi
        .fn()
        .mockResolvedValue((base64: string, w: number, y: number) => {}),
    };

    await clipboard.paste(10, 20, canvas as any, {} as any, vi.fn(), false);
    expect(documentSpy).not.toHaveBeenCalled();
    expect(canvas.addImageToCanvas).not.toHaveBeenCalledWith(
      "http://test.com/",
      100,
      100,
    );
    documentSpy.mockRestore();
  });

  it("paste finds image/svg and creats html element", async () => {
    const pngConversionSpy = vi
      .spyOn(Util, "convertToPNG")
      .mockResolvedValue("mockpngstring");

    const mockSVGBlock = {
      text: vi.fn().mockResolvedValue("test"),
    };

    navigator.clipboard.read = vi.fn().mockResolvedValue([
      {
        types: ["image/svg"],
        getType: vi.fn().mockResolvedValue(mockSVGBlock),
      },
    ]);

    await clipboard.paste(10, 20, {}, {} as any, vi.fn(), false);
    expect(pngConversionSpy).toHaveBeenCalled();
    pngConversionSpy.mockRestore();
  });

  it("paste finds other type and return file reader data", async () => {
    vi.stubGlobal(
      "FileReader",
      class {
        result: string | null = "data:image/png;base64,mockdata";
        onloadend: (() => void) | null = null;
        onerror: ((e: any) => void) | null = null;
        readAsDataURL(blob: any) {
          setTimeout(() => {
            if (this.onloadend) this.onloadend();
          }, 0);
        }
      },
    );

    const mockAltBlock = {
      text: vi.fn().mockResolvedValue("test"),
    };

    navigator.clipboard.read = vi.fn().mockResolvedValue([
      {
        types: ["image/mock"],
        getType: vi.fn().mockResolvedValue(mockAltBlock),
      },
    ]);

    const canvas = {
      canvas: {},
      gl: null,
      addImageToCanvas: vi
        .fn()
        .mockResolvedValue((base64: string, w: number, y: number) => {}),
    };

    await clipboard.paste(10, 20, canvas as any, {} as any, vi.fn(), false);
    expect(canvas.addImageToCanvas).toHaveBeenCalledWith(
      "data:image/png;base64,mockdata",
      100,
      100,
    );
    vi.unstubAllGlobals();
  });
});
