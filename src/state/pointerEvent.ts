import { Canvas } from "Canvas";
import { makeObservable, observable, computed, action } from "mobx";
import { BoundingBoxCollisionType } from "../util";
import { Point, PointerMode } from "../manager";

interface PointerEventStateOption {
    getCanvas: () => Canvas;
    clearSelection: () => void;
    mode: PointerMode;
}

export class PointerEventState {
    getCanvas: () => Canvas;
    clearSelection: () => void;

    lastPointerPos: Point = { x: 0, y: 0 };
    startWorldX: number = 0;
    startWorldY: number = 0;
    lastWorldX: number = 0;
    lastWorldY: number = 0;

    mode: PointerMode;

    resizingDirection: BoundingBoxCollisionType | null = null;

    constructor(option: Partial<PointerEventStateOption>) {
        const {
            mode = PointerMode.SELECT,
            getCanvas = () => { throw new Error("getCanvas not implemented"); },
            clearSelection = () => { throw new Error("clearSelection not implemented"); },
        } = option;

        this.getCanvas = getCanvas;
        this.clearSelection = clearSelection;
        this.mode = mode;

        makeObservable(this, {
            // observables
            lastPointerPos: observable,
            startWorldX: observable,
            startWorldY: observable,
            lastWorldX: observable,
            lastWorldY: observable,
            mode: observable,
            resizingDirection: observable,

            // computed
            isResizing: computed,
            dragDXFromStart: computed,
            dragDYFromStart: computed,

            // actions
            setMode: action,
            toggleMode: action,
            setResizingDirection: action,
            clearResizingDirection: action,
            initialize: action,
            updateLastWorldCoord: action,
            // end: action,
        });
    }

    // computed
    get isResizing() {
        return this.resizingDirection !== null;
    }

    get dragDXFromStart() {
        return this.lastWorldX - this.startWorldX;
    }

    get dragDYFromStart() {
        return this.lastWorldY - this.startWorldY;
    }

    // actions
    setMode(mode: PointerMode) {
        this.mode = mode;
    }

    toggleMode() {
        this.mode = this.mode === PointerMode.PAN ? PointerMode.SELECT : PointerMode.PAN;
        // Clear selection when switching mode to avoid mixed interactions
        this.clearSelection();
    }

    setResizingDirection(dir: BoundingBoxCollisionType | null) {
        this.resizingDirection = dir;
    }

    clearResizingDirection() {
        this.resizingDirection = null;
    }

    // Start an interaction at given world coords
    initialize(worldX: number, worldY: number) {
        this.startWorldX = worldX;
        this.startWorldY = worldY;
        this.lastWorldX = worldX;
        this.lastWorldY = worldY;
        this.resizingDirection = null;
    }

    updateLastWorldCoord(x: number, y: number) {
        this.lastWorldX = x;
        this.lastWorldY = y;
    }

    // Update current pointer world coords and apply intent to canvas
    // moveTo(worldX: number, worldY: number) {
    //     const canvas = this.getCanvas();

    //     const dx = worldX - this.lastWorldX;
    //     const dy = worldY - this.lastWorldY;

    //     if (this.mode === PointerMode.PAN) {
    //         canvas._selectionManager?.clear?.();
    //         canvas.isGlobalClick = true;
    //         canvas._camera?.updateCameraPos?.(this.startWorldX - worldX, this.startWorldY - worldY);
    //     } else {
    //         canvas.isGlobalClick = false;
    //         if (this.resizingDirection) {
    //             canvas._selectionManager?.resize?.(dx, dy, this.resizingDirection);
    //         } else if (canvas._selectionManager?.marqueeBox) {
    //             canvas._selectionManager.marqueeBox.resize(dx, dy, canvas.worldMatrix);
    //         } else {
    //             canvas._selectionManager?.move?.(dx, dy);
    //         }
    //     }

    //     this.lastWorldX = worldX;
    //     this.lastWorldY = worldY;
    // }

    // Finish the interaction and cleanup temporary state
    // end() {
    //     const canvas = this.getCanvas();
    //     canvas.isGlobalClick = true;
    //     if (canvas._selectionManager?.marqueeBox) {
    //         canvas._selectionManager.clearMarquee();
    //     }
    //     this.resizingDirection = null;
    // }
}