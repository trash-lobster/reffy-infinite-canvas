import { Canvas } from "Canvas";
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
}