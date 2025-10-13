import { Shape } from "./Shape";

export class Rect extends Shape {
    private _x: number;
    private _y: number;
    private _width: number;
    private _height: number;

    constructor(config: Partial<{x: number, y: number, width: number, height: number}>) {
        super();
        this._x = config.x ?? 0;
        this._y = config.y ?? 0;
        this._width = config.width ?? 100;
        this._height = config.height ?? 100;
    }

    get x() { return this._x; }
    set x(value: number) { if (this._x !== value) { this._x = value; this.renderDirtyFlag = true; } }

    get y() { return this._y; }
    set y(value: number) { if (this._y !== value) { this._y = value; this.renderDirtyFlag = true; } }

    get width() { return this._width; }
    set width(value: number) { if (this._width !== value) { this._width = value; this.renderDirtyFlag = true; } }

    get height() { return this._height; }
    set height(value: number) { if (this._height !== value) { this._height = value; this.renderDirtyFlag = true; } }


    getVertexCount(): number {
        return 6;
    }

    getPositions(): number[] {
        const left = this.x;
        const right = this.x + this.width;
        const top = this.y;
        const bottom = this.y + this.height;

        return [
            left, top,      // top-left
            left, bottom,   // bottom-left  
            right, top,     // top-right
            right, top,     // top-right
            left, bottom,   // bottom-left
            right, bottom   // bottom-right
        ];
    }
}
