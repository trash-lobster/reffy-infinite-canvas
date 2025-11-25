import { AABB } from "../boundingBox";
import { getScalesFromMatrix, applyMatrixToPoint, isScalePositive } from "../util";
import { Shape } from "./Shape";

export class Rect extends Shape {
    // these are not going to change throughout the lifetime as scale is going to be the one changing their visual
    private _width: number;
    private _height: number;

    constructor(
        config: Partial<{
            x: number, 
            y: number, 
            width: number, 
            height: number,
            sx?: number,
            sy?: number,
        }>
    ) {
        super(config.x, config.y, config.sx, config.sy);
        this._width = config.width ?? 100;
        this._height = config.height ?? 100;
    }

    get width() { return this._width; }
    set width(value: number) { if (this._width !== value) { this._width = value; this.markDirty(); } }

    get height() { return this._height; }
    set height(value: number) { if (this._height !== value) { this._height = value; this.markDirty(); } }

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

    getBoundingBox() {
        // not currently taking account of flips
        const [minX, minY] = [this.state.translation[0], this.state.translation[1]];
        const [maxX, maxY] = [minX + this.width * this.state.scaleX, minY + this.height * this.state.scaleY];
        
        return new AABB(minX, minY, maxX, maxY);
    }

    getEdge() {
        const x = this.x, y = this.y;
        return {
            minX: Math.min(x, x + this.width),
            maxX: Math.max(x, x + this.width),
            minY: Math.min(y, y + this.height),
            maxY: Math.max(y, y + this.height),
        }
    }

    hitTest(x: number, y: number): boolean {                
        const [ scaleX, scaleY ] = getScalesFromMatrix(this.worldMatrix);
        const [ signX, signY ] = isScalePositive(this.worldMatrix);   
        

        // Transform the input point to the rectangle's local space
        const [hx, hy] = applyMatrixToPoint(this.parent.worldMatrix, x, y);        
        const [cx, cy] = applyMatrixToPoint(this.worldMatrix);

        const w = this.width  * scaleX * signX;
        const h = this.height * scaleY * signY;

        const minX = Math.min(cx, cx + w);
        const maxX = Math.max(cx, cx + w);
        const minY = Math.min(cy, cy + h);
        const maxY = Math.max(cy, cy + h);

        return hx >= minX && hx <= maxX && hy >= minY && hy <= maxY;
    }
}
