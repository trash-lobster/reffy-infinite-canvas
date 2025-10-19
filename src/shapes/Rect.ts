import { Shape } from "./Shape";

export class Rect extends Shape {
    private _width: number;
    private _height: number;

    constructor(config: Partial<{x: number, y: number, width: number, height: number}>) {
        super(config.x, config.y);
        this._width = config.width ?? 100;
        this._height = config.height ?? 100;
    }

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
    
    hitTest(x: number, y: number): boolean {
        // Handle negative width/height and include edges with a small epsilon
        const left = Math.min(this.x, this.x + this.width);
        const right = Math.max(this.x, this.x + this.width);
        const top = Math.min(this.y, this.y + this.height);
        const bottom = Math.max(this.y, this.y + this.height);
        const eps = 1e-8;

        if (x < left - eps || x > right + eps) return false;
        if (y < top - eps || y > bottom + eps) return false;
        return true;
    }
}
