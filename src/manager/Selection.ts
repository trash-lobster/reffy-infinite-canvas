import { BoundingBox, Shape } from "shapes";

export class SelectionManager {
    _selected: Set<Shape>;

    get selected(): Shape[] { return Array.from(this._selected); }
    set selected(shapes: Shape[]) { shapes.forEach(shape => this._selected.add(shape)); }

    add(shape: Shape): boolean {
        if (this._selected.has(shape)) return false;
        this._selected.add(shape);
        return true;
    }

    remove(shape: Shape): boolean {
        return this._selected.delete(shape);
    }

    // create bounding box
    createBoundingBox() {
        let minX = Number.MAX_VALUE,
            minY = Number.MAX_VALUE,
            maxX = Number.MIN_VALUE,
            maxY = Number.MIN_VALUE;

        for (const shape of this._selected.values()) {
            const vals = shape.getEdge();
            minX = Math.min(minX, vals.minX);
            minY = Math.min(minY, vals.minY);
            maxX = Math.max(maxX, vals.maxX);
            maxY = Math.max(maxY, vals.maxY);
        }

        return new BoundingBox({
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        });
    }
}