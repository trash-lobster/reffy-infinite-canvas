import { Rect, Shape } from "shapes";

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
    return shape.x;
}

function getY(shape: Rect) {
    return shape.y;
}

function getWidth(shape: Rect) {
    return shape.x + shape.width;
}

function getHeight(shape: Rect) {
    return shape.y + shape.height;
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
