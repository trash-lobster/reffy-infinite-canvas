import { Rect } from "shapes";
import { applyMatrixToPoint } from "../util";

export class OrderedList {
    private shapes: Rect[] = [];
    private getter: (shape: Rect) => number;

    constructor(
        getter: (shape: Rect) => number,
        // setter: (shape: Rect, val: number) => void,
    ) {
        this.getter = getter;
    }

    add(shape: Rect) {
        const idx = this.findInsertIndex(shape);
        this.shapes.splice(idx, 0, shape);
    }

    remove(shape: Rect) {
        const idx = this.shapes.indexOf(shape);
        if (idx !== -1) this.shapes.splice(idx, 1);
    }

    update(shape: Rect) {
        this.remove(shape);
        this.add(shape);
    }

    private findInsertIndex(shape: Rect): number {
        let low = 0, high = this.shapes.length;
        while ( low < high ) {
            const mid = (low + high) >> 1;
            const midVal = this.getter(this.shapes[mid]);
            const shapeVal = this.getter(shape);
            if (midVal < shapeVal) low = mid + 1;
            else high = mid;
        }
        return low;
    }

    getMin() {
        return this.shapes[0];
    }

    getMax() {
        return this.shapes[this.shapes.length - 1];
    }

    getList() {
        return this.shapes;
    }
}

function getX(shape: Rect) {
    const [tx, ] = applyMatrixToPoint(shape.worldMatrix);
    return tx;
}

function getY(shape: Rect) {
    const [, ty] = applyMatrixToPoint(shape.worldMatrix);
    return ty;
}

function getWidth(shape: Rect) {
    const [startX, ] = applyMatrixToPoint(shape.worldMatrix);
    const [endX, ] = applyMatrixToPoint(shape.worldMatrix, shape.width, 0);
    return endX - startX;
}

function getHeight(shape: Rect) {
    const [, startY] = applyMatrixToPoint(shape.worldMatrix);
    const [, endY] = applyMatrixToPoint(shape.worldMatrix, 0, shape.height);
    return endY - startY;
}


export function createOrderedByStartX() {
    return new OrderedList(getX);
}

export function createOrderedByStartY() {
    return new OrderedList(getY);
}

export function createOrderedByEndX() {
    return new OrderedList(getWidth);
}

export function createOrderedByEndY() {
    return new OrderedList(getHeight);
}
