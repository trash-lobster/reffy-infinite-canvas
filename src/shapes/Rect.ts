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

    getEdge() {
        return {
            minX: Math.min(this.x, this.x + this.width),
            maxX: Math.max(this.x, this.x + this.width),
            minY: Math.min(this.y, this.y + this.height),
            maxY: Math.max(this.y, this.y + this.height),
        }
    }

    hitTest(x: number, y: number): boolean {
        const matrix = m3.multiply(this.parent.worldMatrix, this.localMatrix);
        const scale = getScaleFromMatrix(matrix);

        // Transform the input point to the rectangle's local space
        const [hx, hy] = applyMatrixToPoint(this.parent.worldMatrix, x, y);
        
        const [cx, cy] = applyMatrixToPoint(matrix, this.x, this.y);

        return (
            hx >= cx &&
            hx <= cx + this.width * scale &&
            hy >= cy &&
            hy <= cy + this.height * scale
        );
    }
}
