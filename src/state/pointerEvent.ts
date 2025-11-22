import { BoundingBoxCollisionType } from "../util";
import { PointerMode } from "../manager";
import { Point } from "../boundingBox";

export class PointerEventState {

    lastPointerPos: Point = { x: 0, y: 0 };
    startWorldX: number = 0;
    startWorldY: number = 0;
    lastWorldX: number = 0;
    lastWorldY: number = 0;

    mode: PointerMode;

    resizingDirection: BoundingBoxCollisionType | null = null;

    constructor(mode: PointerMode = PointerMode.SELECT) {
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