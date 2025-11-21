import { Canvas } from "Canvas";
import { Rect, Renderable } from "../shapes";
import { applyMatrixToPoint, BASE_BLUE, BORDERPX, BoundingBoxCollisionType, getScalesFromMatrix, MARQUEE_BLUE, sides } from "../util";

const RECT_TYPES = ["CENTER", ...sides] as BoundingBoxCollisionType[];

export class MarqueeSelectionBox {
    // move and resize based on drag
    // create the side bars and also a center piece that is coloured with alpha
    x: number;
    y: number;
    width: number = 0;
    height: number = 0;
    rects: Map<string, Rect> = new Map();
    borderSize: number = 0;

    constructor(x: number, y: number, worldMatrix: number[]) {
        const [hx, hy] = applyMatrixToPoint(worldMatrix, x, y);
        this.x = hx;
        this.y = hy;
        this.addRects();
    }

    private getRectConfig(type: string) { // height and width adjusted to cover up the corner
        let { x, y, width, height, borderSize } = this;
        return {
            TOP: {
                x, 
                y, 
                width: width < 0 ? width : width + borderSize,
                height: borderSize 
            },
            BOTTOM: { 
                x,
                y: y + height,
                width : width < 0 ? width : width + borderSize,
                height: borderSize
            },
            LEFT: { 
                x: height < 0 && width < 0 ? x - borderSize : x,
                y, 
                width: borderSize, 
                height: height < 0 && width < 0 ? height : height + borderSize
            },
            RIGHT: { 
                x: x + width,
                y, 
                width: borderSize, 
                height: height < 0 ? height: height + borderSize
            },
            CENTER: {
                x,
                y,
                width,
                height,
            }
        }[type];
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram): void {
        this.update();

        for (const [_, rect] of this.rects.entries()) {
            rect.render(gl, program);
        }
    }

    update() {
        this.borderSize = BORDERPX;
        this.updateRects();
    }

    destroy() {
        for (const [_, rect] of this.rects.entries()) {
            rect.destroy();
        }
    }

    resize(dx: number, dy: number, worldMatrix: number[]) {
        const [scaleX, scaleY] = getScalesFromMatrix(worldMatrix);
        this.width += dx * scaleX;
        this.height += dy * scaleY;
    }

    hitTest(canvas: Canvas) {
        const covered = [];
        
        const mx1 = Math.min(this.x, this.x + this.width);
        const mx2 = Math.max(this.x, this.x + this.width);
        const my1 = Math.min(this.y, this.y + this.height);
        const my2 = Math.max(this.y, this.y + this.height);
        
        for (const child of canvas.children as Rect[]) {            
            const [wx1, wy1] = applyMatrixToPoint(canvas.worldMatrix, child.x, child.y);
            const [wx2, wy2] = applyMatrixToPoint(
                canvas.worldMatrix,
                child.x + child.width * child.sx,
                child.y + child.height * child.sy
            );

            const cx1 = Math.min(wx1, wx2);
            const cx2 = Math.max(wx1, wx2);
            const cy1 = Math.min(wy1, wy2);
            const cy2 = Math.max(wy1, wy2);

            if (cx1 >= mx1 && cx2 <= mx2 && cy1 >= my1 && cy2 <= my2) {
                covered.push(child);
            }
        }
        
        canvas.selectionManager.add(covered);
    }

    private addRects() {
        for (const type of RECT_TYPES) {            
            const config = this.getRectConfig(type);
            const rect = new Rect(config);
            rect.color = BASE_BLUE;
            this.rects.set(type, rect);
        }        
    }
    
    private updateRects() {
        for (const type of RECT_TYPES) {
            const rect = this.rects.get(type);
            const config = this.getRectConfig(type);
            
            if (rect) {
                // rect.translation[0] = config.x;
                // rect.translation[1] = config.y;
                rect.setTranslation(config.x, config.y);
                rect.width = config.width;
                rect.height = config.height;
                if (type === 'CENTER') {
                    rect.color = MARQUEE_BLUE;
                }
            }
        }
    }
}