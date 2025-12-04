import { Rect } from "../shapes/Rect";
import { applyMatrixToPoint, BASE_BLUE, BORDERPX, BoundingBoxCollisionType, getScalesFromMatrix, MARQUEE_BLUE, sides } from "../util";
import { AABB } from "./AABB";

const RECT_TYPES = ["CENTER", ...sides] as BoundingBoxCollisionType[];

/**
 * Its properties related to rendering are all stored as camera space value - will need to convert to world coordinates when used
 */
export class MarqueeSelectionBox {
    // move and resize based on drag
    // create the side bars and also a center piece that is coloured with alpha
    x: number;
    y: number;
    width: number = 0;
    height: number = 0;
    rects: Map<string, Rect> = new Map();
    borderSize: number = 0;
    AABB: AABB;

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

    /**
     * Apply bounding box in world dimension
     * @returns 
     */
    getBoundingBox(getWorldCoords: (x: number, y: number) => number[]) {
        const [wx, wy] = getWorldCoords(this.x, this.y);
        const [wW, wH] = getWorldCoords(this.x + this.width, this.y + this.height);

        const minX = Math.min(wx, wW);
        const maxX = Math.max(wx, wW);
        const minY = Math.min(wy, wH);
        const maxY = Math.max(wy, wH);
        
        return new AABB(minX, minY, maxX, maxY);
    }

    resize(dx: number, dy: number, worldMatrix: number[]) {
        const [scaleX, scaleY] = getScalesFromMatrix(worldMatrix);
        this.width += dx * scaleX;
        this.height += dy * scaleY;
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