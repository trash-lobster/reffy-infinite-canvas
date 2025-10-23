import { Rect, Shape } from "shapes";

export class OrderedList {
    private shapes: Rect[] = [];
    private getter: (shape: Rect) => number;
    private setter: (shape: Rect, val: number) => void;

    constructor(
        getter: (shape: Rect) => number,
        setter: (shape: Rect, val: number) => void,
    ) {
        this.getter = getter;
        this.setter = setter;
    }

    add(shape: Rect) {
        const idx = this.findInsertIndex(shape);
        this.shapes.splice(idx, 0, shape);
    }

    remove(shape: Rect) {
        const idx = this.shapes.indexOf(shape);
        if (idx !== -1) this.shapes.splice(idx, 1);
    }

    update(shape: Rect, newVal: number) {
        this.remove(shape);
        this.setter(shape, newVal);
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

export function getX(shape: Rect) {
    return shape.x;
}

export function setX(shape: Rect, val: number) {
    shape.x = val;
}

export function getY(shape: Rect) {
    return shape.y;
}

export function setY(shape: Rect, val: number) {
    shape.y = val;
}

export function createOrderedByXShapeList() {
    return new OrderedList(getX, setX);
}

export function createOrderedByYShapeList() {
    return new OrderedList(getY, setY);
}