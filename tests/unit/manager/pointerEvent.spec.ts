import { describe, it, expect, vi, beforeEach } from "vitest";
import EventEmitter from "eventemitter3";
import { PointerEventManager, PointerMode } from "../../../src/manager";
import { ContextMenuEvent, LoaderEvent } from "../../../src/util";
import * as util from "../../../src/util";
import { Img, Rect } from "../../../src/shapes";

vi.mock("../../../src/util", async () => {
  const actual =
    await vi.importActual<typeof import("../../../src/util")>(
      "../../../src/util",
    );
  return {
    ...actual,
    copy: vi.fn(),
  };
});

if (typeof (globalThis as any).ClipboardEvent === "undefined") {
  class ClipboardEventPolyfill extends Event {
    clipboardData: DataTransfer | null;
    constructor(
      type: string,
      init?: { clipboardData?: DataTransfer } & EventInit,
    ) {
      super(type, init);
      this.clipboardData = init?.clipboardData ?? null;
    }
  }
  (globalThis as any).ClipboardEvent =
    ClipboardEventPolyfill as unknown as typeof ClipboardEvent;
}

function makeState() {
  return {
    mode: PointerMode.SELECT,
    lastPointerPos: { x: 0, y: 0 },
    startWorldX: 0,
    startWorldY: 0,
    lastWorldX: 0,
    lastWorldY: 0,
    resizingDirection: null as any,
    toggleMode: vi.fn(function (this: any) {
      this.mode =
        this.mode === PointerMode.SELECT ? PointerMode.PAN : PointerMode.SELECT;
    }),
    initialize: vi.fn(function (this: any, wx: number, wy: number) {
      this.startWorldX = wx;
      this.startWorldY = wy;
      this.lastWorldX = wx;
      this.lastWorldY = wy;
    }),
    updateLastWorldCoord: vi.fn(function (this: any, wx: number, wy: number) {
      this.lastWorldX = wx;
      this.lastWorldY = wy;
    }),
  } as any;
}

describe("PointerEventManager", () => {
  let eventHub: EventEmitter;
  let assignEventListener: (
    type: string,
    fn: any,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  let getWorldCoords: (x: number, y: number) => number[];
  let isContextMenuActive: () => boolean;
  let setCursorStyle: (s: string) => void;
  let setCanvasGlobalClick: (v: boolean) => void;
  let selectionPointerMove: any;
  let onSelectionPointerDown: any;
  let checkIfSelectionHit: any;
  let addSelection: any;
  let clearSelection: any;
  let isSelection: any;
  let getChildren: any;
  let hitTestAdjustedCorner: any;
  let onWheel: (e: WheelEvent) => void;
  let paste: (x: number, y: number) => Promise<void>;
  let history: any;
  let state: any;

  beforeEach(() => {
    vi.clearAllMocks();
    eventHub = new EventEmitter();
    assignEventListener = vi.fn((type: string, fn: any) => {
      // Attach listeners to window/document to simulate dispatch later
      if (type === "pointerdown")
        window.addEventListener("pointerdown", fn as EventListener);
      if (type === "pointermove")
        window.addEventListener("pointermove", fn as EventListener);
      if (type === "wheel")
        window.addEventListener(
          "wheel",
          fn as EventListener,
          { passive: false } as any,
        );
    });
    getWorldCoords = vi.fn().mockImplementation((x, y) => [x + 1, y + 2]);
    isContextMenuActive = vi.fn().mockReturnValue(false);
    setCursorStyle = vi.fn();
    setCanvasGlobalClick = vi.fn();
    selectionPointerMove = vi.fn();
    onSelectionPointerDown = vi.fn();
    checkIfSelectionHit = vi.fn().mockReturnValue(null);
    addSelection = vi.fn();
    clearSelection = vi.fn();
    isSelection = vi.fn().mockReturnValue(false);
    getChildren = vi.fn().mockReturnValue([]);
    hitTestAdjustedCorner = vi.fn().mockReturnValue("CENTER");
    onWheel = vi.fn();
    paste = vi.fn().mockResolvedValue(undefined);
    history = { push: vi.fn() };
    state = makeState();
  });

  it("registers pointer listeners and updates cursor on move", () => {
    const mgr = new PointerEventManager({
      eventHub,
      history,
      state,
      isContextMenuActive,
      getSelected: () => [],
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection,
      isSelection,
      hitTestAdjustedCorner,
    });

    expect(assignEventListener).toHaveBeenCalledWith(
      "pointermove",
      expect.any(Function),
    );

    const move = new PointerEvent("pointermove", { clientX: 10, clientY: 20 });
    window.dispatchEvent(move);
    // getWorldCoords called with raw CSS pixels
    expect(getWorldCoords).toHaveBeenCalledWith(10, 20);
    // cursor set to mapped value for CENTER
    expect(setCursorStyle).toHaveBeenCalledWith("grab");
  });

  it("pointerdown closes context menu, initializes state, and sets up move/up listeners", () => {
    eventHub.emit = vi.fn();
    const mgr = new PointerEventManager({
      eventHub,
      history,
      state,
      isContextMenuActive,
      getSelected: () => [],
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection,
      isSelection,
      hitTestAdjustedCorner,
    });

    const down = new PointerEvent("pointerdown", { clientX: 5, clientY: 7 });
    // Mock prevent/stop
    (down as any).preventDefault = vi.fn();
    (down as any).stopPropagation = vi.fn();
    window.dispatchEvent(down);

    expect(eventHub.emit).toHaveBeenCalledWith(ContextMenuEvent.Close);
    expect(state.startWorldX).toBe(6); // 5 + 1 via getWorldCoords
    expect(state.startWorldY).toBe(9); // 7 + 2 via getWorldCoords
  });

  it("onWheel is invoked when context menu not active", () => {
    const mgr = new PointerEventManager({
      eventHub,
      history,
      state,
      isContextMenuActive,
      getSelected: () => [],
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection,
      isSelection,
      hitTestAdjustedCorner,
    });

    const evt = new WheelEvent("wheel");
    window.dispatchEvent(evt);
    expect(onWheel).toHaveBeenCalledTimes(1);
  });

  it("selection drag creates a multi transform command on pointerup", () => {
    // Simulate selection and movement
    const selectedRect: any = { x: 0, y: 0, sx: 1, sy: 1 };
    const mgr = new PointerEventManager({
      eventHub,
      history,
      state,
      isContextMenuActive,
      getSelected: () => [selectedRect],
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection,
      isSelection: () => true,
      hitTestAdjustedCorner,
    });

    const down = new PointerEvent("pointerdown", { clientX: 1, clientY: 1 });
    window.dispatchEvent(down);
    // Move selection so end snapshot differs
    selectedRect.x = 10;
    selectedRect.y = 20;
    selectedRect.sx = 2;
    selectedRect.sy = 3;

    const up = new PointerEvent("pointerup");
    document.dispatchEvent(up);
    expect(history.push).toHaveBeenCalledTimes(1);
    const arg = history.push.mock.calls[0][0];
    expect(arg.label).toBe("Transform");
    // do/undo functions exist
    expect(typeof arg.do).toBe("function");
    expect(typeof arg.undo).toBe("function");
  });

  it("copy and paste handlers use last pointer world coords and loader events", async () => {
    eventHub.emit = vi.fn();
    const mgr = new PointerEventManager({
      eventHub,
      history,
      state,
      isContextMenuActive,
      getSelected: () => [],
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection,
      isSelection,
      hitTestAdjustedCorner,
    });

    const move = new PointerEvent("pointermove", { clientX: 3, clientY: 4 });
    window.dispatchEvent(move);
    expect(state.lastPointerPos).toEqual({ x: 4, y: 6 });

    const pasteEvt = new ClipboardEvent("paste");
    window.dispatchEvent(pasteEvt);
    expect(eventHub.emit).toHaveBeenCalledWith(LoaderEvent.start, "spinner");
    expect(paste).toHaveBeenCalledWith(4, 6);
  });

  it("pointerdown in PAN mode sets global click and clears selection", () => {
    const clearSel = vi.fn();
    const setGlobal = vi.fn();

    const mgr = new PointerEventManager({
      eventHub,
      history,
      state,
      isContextMenuActive,
      getSelected: () => [],
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick: setGlobal,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection: clearSel,
      isSelection,
      hitTestAdjustedCorner,
    });

    mgr.changeMode();

    const down = new PointerEvent("pointerdown", { clientX: 2, clientY: 3 });
    window.dispatchEvent(down);
    expect(setGlobal).toHaveBeenCalledWith(true);
    expect(clearSel).toHaveBeenCalledTimes(1);
  });

  it("tests right button click", async () => {
    eventHub.emit = vi.fn();
    checkIfSelectionHit = vi.fn().mockReturnValue(false);

    const mgr = new PointerEventManager({
      eventHub,
      history,
      state,
      isContextMenuActive,
      getSelected: () => [],
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection,
      isSelection,
      hitTestAdjustedCorner,
    });

    const rect = new Rect({});
    rect.hitTest = vi.fn().mockReturnValue(true);
    vi.spyOn(mgr, "getChildren").mockReturnValue([rect]);

    const down = new PointerEvent("pointerdown", {
      clientX: 3,
      clientY: 4,
      button: 2,
    });

    window.dispatchEvent(down);
    expect(clearSelection).toHaveBeenCalledOnce();
  });

  it("tests right button click with selection hit", async () => {
    eventHub.emit = vi.fn();
    checkIfSelectionHit = vi.fn().mockReturnValue(true);

    const mgr = new PointerEventManager({
      eventHub,
      history,
      state,
      isContextMenuActive,
      getSelected: () => [],
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection,
      isSelection,
      hitTestAdjustedCorner,
    });

    const rect = new Rect({});
    rect.hitTest = vi.fn().mockReturnValue(true);
    vi.spyOn(mgr, "getChildren").mockReturnValue([rect]);

    const down = new PointerEvent("pointerdown", {
      clientX: 3,
      clientY: 4,
      button: 2,
    });

    window.dispatchEvent(down);
    expect(clearSelection).not.toHaveBeenCalledOnce();
  });

  it("tests left button to check other path", async () => {
    eventHub.emit = vi.fn();
    checkIfSelectionHit = vi.fn().mockReturnValue("center");

    const mgr = new PointerEventManager({
      eventHub,
      history,
      state,
      isContextMenuActive,
      getSelected: () => [],
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection,
      isSelection,
      hitTestAdjustedCorner,
    });

    const rect = new Rect({});
    rect.hitTest = vi.fn().mockReturnValue(true);
    vi.spyOn(mgr, "getChildren").mockReturnValue([rect]);

    const down = new PointerEvent("pointerdown", {
      clientX: 3,
      clientY: 4,
      button: 1,
    });

    window.dispatchEvent(down);
    expect(mgr.state.resizingDirection).toBe("center");
  });

  it("onPointerMoveWhileDown computes deltas, calls selectionPointerMove, updates last world coord and cursor", () => {
    const selMove = vi.fn();
    const setCursor = vi.fn();
    const st = makeState();
    const mgr = new PointerEventManager({
      eventHub,
      history,
      state: st,
      isContextMenuActive,
      getSelected: () => [],
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle: setCursor,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove: selMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection,
      isSelection,
      hitTestAdjustedCorner,
    });

    // Simulate pointer down to initialize state and attach move listeners
    const down = new PointerEvent("pointerdown", { clientX: 10, clientY: 10 });
    window.dispatchEvent(down);
    // After initialize, startWorldX/Y = getWorldCoords(10,10) => [11,12]
    expect(st.startWorldX).toBe(11);
    expect(st.startWorldY).toBe(12);
    expect(st.lastWorldX).toBe(11);
    expect(st.lastWorldY).toBe(12);

    // Move while down with buttons != 2
    const move = new PointerEvent("pointermove", {
      clientX: 14,
      clientY: 15,
      buttons: 1,
    });
    document.dispatchEvent(move);

    // wx,wy = [15,17]; dx=15-11=4, dy=17-12=5
    expect(selMove).toHaveBeenCalledWith(
      11 - 15,
      12 - 17,
      4,
      5,
      st.resizingDirection,
    );
    // last world coord updated
    expect(st.lastWorldX).toBe(15);
    expect(st.lastWorldY).toBe(17);
    // cursor set to grabbing
    expect(setCursor).toHaveBeenCalledWith("grabbing");

    // Ensure right button (buttons=2) short-circuits
    selMove.mockClear();
    const moveRight = new PointerEvent("pointermove", {
      clientX: 20,
      clientY: 25,
      buttons: 2,
    });
    document.dispatchEvent(moveRight);
    expect(selMove).not.toHaveBeenCalled();
  });

  it("constructor registers copy handler that calls util.copy when menu inactive", async () => {
    const selImgs: Img[] = [new Img({})];
    isContextMenuActive = vi.fn().mockReturnValue(false);

    // Capture only the newly-registered copy handler
    const originalAdd = window.addEventListener;
    const copyHandlers: EventListener[] = [];
    const addSpy = vi.spyOn(window, "addEventListener").mockImplementation(((
      type: string,
      listener: EventListener,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type === "copy") {
        copyHandlers.push(listener as EventListener);
        return;
      }
      return originalAdd.call(window, type, listener, options);
    }) as typeof window.addEventListener);

    const mgr = new PointerEventManager({
      eventHub,
      history,
      state,
      isContextMenuActive,
      getSelected: () => selImgs as any,
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection,
      isSelection,
      hitTestAdjustedCorner,
    });

    // Trigger only the just-registered copy handler
    copyHandlers.forEach((h) => h(new Event("copy") as any));
    expect(util.copy).toHaveBeenCalledTimes(1);
    expect(util.copy).toHaveBeenCalledWith(selImgs);
    addSpy.mockRestore();
  });

  it("copy handler does not call util.copy when menu active", async () => {
    isContextMenuActive = vi.fn().mockReturnValue(true);

    // Capture only the newly-registered copy handler
    const originalAdd = window.addEventListener;
    const copyHandlers: EventListener[] = [];
    const addSpy = vi.spyOn(window, "addEventListener").mockImplementation(((
      type: string,
      listener: EventListener,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type === "copy") {
        copyHandlers.push(listener as EventListener);
        return;
      }
      return originalAdd.call(window, type, listener, options);
    }) as typeof window.addEventListener);

    const mgr = new PointerEventManager({
      eventHub,
      history,
      state,
      isContextMenuActive,
      getSelected: () => [{ id: "img2" }] as any,
      getChildren,
      getWorldMatrix: () => [],
      getCanvasGlobalClick: () => false,
      setCanvasGlobalClick,
      getWorldCoords,
      updateCameraPos: vi.fn(),
      onWheel,
      setCursorStyle,
      paste,
      closeMarquee: vi.fn(),
      assignEventListener,
      selectionPointerMove,
      onSelectionPointerDown,
      checkIfSelectionHit,
      addSelection,
      clearSelection,
      isSelection,
      hitTestAdjustedCorner,
    });

    // Trigger only the just-registered copy handler
    copyHandlers.forEach((h) => h(new Event("copy") as any));
    expect(util.copy).not.toHaveBeenCalled();
    addSpy.mockRestore();
  });
});
