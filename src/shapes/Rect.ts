import { m3, getScaleFromMatrix, applyMatrixToPoint } from "../util";
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
        const left = 0;
        const top = 0;
        const right = this.width;
        const bottom = this.height;

        return [
            left,  top,      // top-left
            left,  bottom,   // bottom-left  
            right, top,      // top-right
            right, top,      // top-right
            left,  bottom,   // bottom-left
            right, bottom    // bottom-right
        ];
    }

    getEdge() {
        const [x, y] = this.translation;
        return {
            minX: Math.min(x, x + this.width),
            maxX: Math.max(x, x + this.width),
            minY: Math.min(y, y + this.height),
            maxY: Math.max(y, y + this.height),
        }
    }

    hitTest(x: number, y: number): boolean {
        const matrix = m3.multiply(this.parent.worldMatrix, this.localMatrix);
        const scale = getScaleFromMatrix(matrix);

        // Transform the input point to the rectangle's local space
        const [hx, hy] = applyMatrixToPoint(this.parent.worldMatrix, x, y);
        
        const [cx, cy] = applyMatrixToPoint(matrix);

        return (
            hx >= cx &&
            hx <= cx + this.width * scale &&
            hy >= cy &&
            hy <= cy + this.height * scale
        );
    }
}
