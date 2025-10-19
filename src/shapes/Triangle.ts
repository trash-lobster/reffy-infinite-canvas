import { Shape } from "./Shape";
import { arraysEqual } from "../util/checks";
import EventEmitter from 'eventemitter3';

export class Triangle extends Shape {
    $positions: number[];
    private _emitter = new EventEmitter();

    constructor(positions: number[]) {
        super();
        this.$positions = positions;
    }

    get positions() {
        return this.$positions;
    }

    set positions(newPos: number[]) {
        if (!arraysEqual(this.$positions, newPos)) {
            this.$positions = newPos;
            this.renderDirtyFlag = true;
        }
    }

    getPositions(): number[] {
        return this.$positions;
    }

    getVertexCount(): number {
        return 3;
    }

    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ) {
         const fn = typeof listener === 'function'
            ? listener as EventListener
            : (listener as EventListenerObject).handleEvent.bind(listener);
        this._emitter.on(type, fn);
    }

    removeEventListener(
        type: string,
        listener?: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ) {

    }

    dispatchEvent(e: Event) {
        this._emitter.emit(e.type, e);
        return !e.defaultPrevented;
    }

    containsPoints(x: number, y: number) {
        const p = this.$positions;
        if (!p || p.length < 6) return false;

        const ax = p[0], ay = p[1];
        const bx = p[2], by = p[3];
        const cx = p[4], cy = p[5];

        // Fast reject via AABB (optional)
        const minX = Math.min(ax, bx, cx);
        const maxX = Math.max(ax, bx, cx);
        const minY = Math.min(ay, by, cy);
        const maxY = Math.max(ay, by, cy);
        if (x < minX || x > maxX || y < minY || y > maxY) return false;

        const eps = 1e-8;

        const e1 = this.edge(x, y, ax, ay, bx, by);
        const e2 = this.edge(x, y, bx, by, cx, cy);
        const e3 = this.edge(x, y, cx, cy, ax, ay);

        // Allow points on edges (>= -eps) and require consistent winding
        const hasNeg = (e1 < -eps) || (e2 < -eps) || (e3 < -eps);
        const hasPos = (e1 > eps) || (e2 > eps) || (e3 > eps);

        // If both signs present, point is outside
        if (hasNeg && hasPos) return false;

        // Degenerate triangle guard (area ~ 0)
        const area2 = Math.abs(this.edge(ax, ay, bx, by, cx, cy));
        if (area2 <= eps) return false;

        return true;
    }

    private edge = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
            (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
}