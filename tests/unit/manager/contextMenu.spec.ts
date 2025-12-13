import EventEmitter from "eventemitter3";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoundingBoxCollisionType, ContextMenuEvent } from "../../../src/util";
import { ContextMenuManager } from "../../../src/manager";

describe("context menu manager", () => {
  let eventHub = new EventEmitter();
  let isMultiBoundingBoxHit: (
    x: number,
    y: number,
  ) => BoundingBoxCollisionType | "";
  let isBoundingBoxHit: (x: number, y: number) => BoundingBoxCollisionType | "";
  let getWorldCoords: (x: number, y: number) => number[];
  let assignEventListener: (
    type: string,
    fn: (() => void) | ((e: any) => void),
    options?: boolean | AddEventListenerOptions,
  ) => void;

  beforeEach(() => {
    eventHub = new EventEmitter();
    assignEventListener = vi.fn();
    getWorldCoords = vi.fn();
  });

  it("constructs context menu manager and called methods", () => {
    isMultiBoundingBoxHit = (x: number, y: number) => "CENTER";
    isBoundingBoxHit = (x: number, y: number) => "";

    eventHub.emit = vi.fn();

    const manager = new ContextMenuManager(
      eventHub,
      isMultiBoundingBoxHit,
      isBoundingBoxHit,
      getWorldCoords,
      assignEventListener,
    );

    expect(manager.isActive).toBeFalsy();
    expect(assignEventListener).toHaveBeenCalledOnce();
    expect(assignEventListener).toHaveBeenCalledWith(
      "contextmenu",
      manager.customContextMenu,
    );
  });

  it("calls the customContextMenu and emits open multi menu", () => {
    isMultiBoundingBoxHit = (x: number, y: number) => "CENTER";
    isBoundingBoxHit = (x: number, y: number) => "";
    getWorldCoords = vi.fn().mockReturnValue([1, 1]);

    eventHub.emit = vi.fn();

    const manager = new ContextMenuManager(
      eventHub,
      isMultiBoundingBoxHit,
      isBoundingBoxHit,
      getWorldCoords,
      assignEventListener,
    );

    const event = new PointerEvent("pointerenter", {
      clientX: 100,
      clientY: 500,
    });
    event.preventDefault = vi.fn();
    event.stopPropagation = vi.fn();

    expect(manager.isActive).toBeFalsy();
    expect(assignEventListener).toHaveBeenCalledOnce();
    expect(assignEventListener).toHaveBeenCalledWith(
      "contextmenu",
      manager.customContextMenu,
    );

    manager.customContextMenu(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(eventHub.emit).toHaveBeenCalledWith(
      ContextMenuEvent.Open,
      100,
      500,
      "multi",
    );
  });

  it("calls the customContextMenu and emits open single menu", () => {
    isMultiBoundingBoxHit = (x: number, y: number) => "";
    isBoundingBoxHit = (x: number, y: number) => "CENTER";
    getWorldCoords = vi.fn().mockReturnValue([1, 1]);

    eventHub.emit = vi.fn();

    const manager = new ContextMenuManager(
      eventHub,
      isMultiBoundingBoxHit,
      isBoundingBoxHit,
      getWorldCoords,
      assignEventListener,
    );

    const event = new PointerEvent("pointerenter", {
      clientX: 100,
      clientY: 500,
    });
    event.preventDefault = vi.fn();
    event.stopPropagation = vi.fn();

    expect(manager.isActive).toBeFalsy();
    expect(assignEventListener).toHaveBeenCalledOnce();
    expect(assignEventListener).toHaveBeenCalledWith(
      "contextmenu",
      manager.customContextMenu,
    );

    manager.customContextMenu(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(eventHub.emit).toHaveBeenCalledWith(ContextMenuEvent.Open, 100, 500);
  });

  it("calls the customContextMenu and emits open canvas", () => {
    isMultiBoundingBoxHit = (x: number, y: number) => "";
    isBoundingBoxHit = (x: number, y: number) => "";
    getWorldCoords = vi.fn().mockReturnValue([1, 1]);

    eventHub.emit = vi.fn();

    const manager = new ContextMenuManager(
      eventHub,
      isMultiBoundingBoxHit,
      isBoundingBoxHit,
      getWorldCoords,
      assignEventListener,
    );

    const event = new PointerEvent("pointerenter", {
      clientX: 100,
      clientY: 500,
    });
    event.preventDefault = vi.fn();
    event.stopPropagation = vi.fn();

    expect(manager.isActive).toBeFalsy();
    expect(assignEventListener).toHaveBeenCalledOnce();
    expect(assignEventListener).toHaveBeenCalledWith(
      "contextmenu",
      manager.customContextMenu,
    );

    manager.customContextMenu(event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(eventHub.emit).toHaveBeenCalledWith(
      ContextMenuEvent.Open,
      100,
      500,
      "canvas",
    );
  });

  it("reacts to context menu opens", () => {
    isMultiBoundingBoxHit = (x: number, y: number) => "";
    isBoundingBoxHit = (x: number, y: number) => "";
    getWorldCoords = vi.fn().mockReturnValue([1, 1]);

    const manager = new ContextMenuManager(
      eventHub,
      isMultiBoundingBoxHit,
      isBoundingBoxHit,
      getWorldCoords,
      assignEventListener,
    );

    expect(manager.isActive).toBe(false);
    eventHub.emit(ContextMenuEvent.Open);
    expect(manager.isActive).toBe(true);
  });

  it("reacts to context menu close when there is an open menu", () => {
    isMultiBoundingBoxHit = (x: number, y: number) => "";
    isBoundingBoxHit = (x: number, y: number) => "";
    getWorldCoords = vi.fn().mockReturnValue([1, 1]);

    const manager = new ContextMenuManager(
      eventHub,
      isMultiBoundingBoxHit,
      isBoundingBoxHit,
      getWorldCoords,
      assignEventListener,
    );

    eventHub.emit(ContextMenuEvent.Open);
    expect(manager.isActive).toBe(true);
    eventHub.emit(ContextMenuEvent.Close);
    expect(manager.isActive).toBe(false);
  });
});
