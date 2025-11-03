import { 
    BASE_BLUE, 
    LIGHT_BLUE, 
    BORDERPX, 
    HANDLEPX, 
    corners, 
    sides,
    BoundingBoxCollisionType,
    applyMatrixToPoint,
    getScalesFromMatrix,
    m3,
    isScalePositive,
    cornerMap,
    oppositeCorner,
} from "../util";
import { Rect } from "../shapes/Rect";
import { Shape } from "../shapes/Shape";
import { BoundingBoxMode } from "./type";

// different from multi bounding box, the corners and handles are separated here because they need to be individually toggled
export class BoundingBox {
    target: Shape;
    width: number;
    height: number;
    sides: Map<string, Rect> = new Map();
    corners: Map<string, Rect> = new Map();
    borderSize: number = 0;
    boxSize: number = 0;
    mode: BoundingBoxMode = BoundingBoxMode.ACTIVE;
    
    constructor(target: Shape, mode?: BoundingBoxMode) {
        this.target = target;
        this.setDimension();
        this.mode = mode ?? BoundingBoxMode.ACTIVE;
        this.borderSize = BORDERPX;
        this.boxSize = HANDLEPX / 2;

        this.addSides();

        if (this.mode === BoundingBoxMode.ACTIVE) {
            this.addCorners();
        }
    }

    private setDimension() {
        const edge = this.target.getEdge();
        this.width = edge.maxX - edge.minX;
        this.height = edge.maxY - edge.minY;
    }

    private getSidesInScreenSpace(type: string, matrix?: number[]) {
        const [scaleX, scaleY] = matrix ? getScalesFromMatrix(matrix) : [1, 1];
        const { width, height, borderSize } = this;
        const [x, y] = applyMatrixToPoint(matrix);
        const [signX, signY] = isScalePositive(matrix);

        return {
            TOP: { 
                x, 
                y, 
                width: width * scaleX * signX, 
                height: borderSize 
            },
            BOTTOM: { 
                x, 
                y: y + height * scaleY * signY, 
                width : width * scaleX * signX, 
                height: borderSize 
            },
            LEFT: { 
                x, 
                y, 
                width: borderSize, 
                height: height * scaleY * signY
            },
            RIGHT: { 
                x: x + width * scaleX * signX , 
                y, 
                width: borderSize, 
                height: height * scaleY * signY 
            }
        }[type];
    }

    private getCornersInScreenSpace(type: string, matrix: number[]) {
        const [scaleX, scaleY] = matrix ? getScalesFromMatrix(matrix) : [1, 1];
        const { width, height, boxSize } = this;
        const [x, y] = applyMatrixToPoint(matrix);
        const [signX, signY] = isScalePositive(matrix);

        return {
            TOPLEFT: {
                x: x - boxSize,
                y: y - boxSize,
                width: boxSize * 2,
                height: boxSize * 2
            },
            TOPRIGHT: { 
                x: x - boxSize + width * scaleX * signX,
                y: y - boxSize, 
                width: boxSize * 2, 
                height: boxSize * 2 
            },
            BOTTOMLEFT: { 
                x: x - boxSize, 
                y: y - boxSize + height * scaleY * signY, 
                width: boxSize * 2, 
                height: boxSize * 2 
            },
            BOTTOMRIGHT: { 
                x: x - boxSize + width * scaleX * signX, 
                y: y - boxSize + height * scaleY * signY, 
                width: boxSize * 2, 
                height: boxSize * 2 
            },
        }[type];
    }

    setPassive() {
        this.mode = BoundingBoxMode.PASSIVE;
        this.removeCorners();
    }

    setActive() {
        this.mode = BoundingBoxMode.ACTIVE;
        this.addCorners();
    }

    getPositions(): number[] {
        return this.target.getPositions() as number[];
    }

    /**
     * x and y should be world position
     */
    hitTest(wx: number, wy: number, worldMatrix: number[]): (BoundingBoxCollisionType | null) {       
        if (this.mode === BoundingBoxMode.PASSIVE) return;
        
        const [ scaleX, scaleY ] = getScalesFromMatrix(this.target.worldMatrix);
        const [ signX, signY ] = isScalePositive(this.target.worldMatrix);   

        // converted to screen space
        const [hx, hy] = applyMatrixToPoint(worldMatrix, wx, wy);

        // ths hit margin should be in screen size
        const HIT_MARGIN = 4;

        for (const type of corners) {
            const corner = this.getCornersInScreenSpace(type, this.target.worldMatrix);
            if (
                hx >= corner.x - HIT_MARGIN &&
                hx <= corner.x + corner.width + HIT_MARGIN &&
                hy >= corner.y - HIT_MARGIN &&
                hy <= corner.y + corner.height + HIT_MARGIN
            ) {
                return type as BoundingBoxCollisionType;
            }
        }
        
        for (const type of sides) {
            const side = this.getSidesInScreenSpace(type, this.target.worldMatrix);
            if (
                hx >= side.x - HIT_MARGIN &&
                hx <= side.x + side.width + HIT_MARGIN &&
                hy >= side.y - HIT_MARGIN &&
                hy <= side.y + side.height + HIT_MARGIN
            ) {
                return type as BoundingBoxCollisionType;
            }
        }

        const [x, y] = applyMatrixToPoint(this.target.worldMatrix);
        
        const w = this.width  * scaleX * signX;
        const h = this.height * scaleY * signY;

        const minX = Math.min(x, x + w);
        const maxX = Math.max(x, x + w);
        const minY = Math.min(y, y + h);
        const maxY = Math.max(y, y + h);

        if (hx >= minX && hx <= maxX && hy >= minY && hy <= maxY) {
            return 'CENTER';
        }
    }

    update() {
        this.updateSides();
        this.updateCorners();
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram): void {
        this.update();

        for (const [key, handle] of this.sides.entries()) {
            handle.render(gl, program);
        }

        for (const [key, corner] of this.corners.entries()) {
            corner.render(gl, program);
        }
    }

    destroy(gl: WebGLRenderingContext) {
        for (const [_, handle] of this.sides.entries()) {
            handle.destroy(gl);
        }
        
        for (const [key, corner] of this.corners.entries()) {
            corner.destroy(gl);
        }
    }

    move(dx: number, dy: number) {
        this.target.setTranslation(dx, dy);
    }

    resize(
        dx: number, 
        dy: number, 
        direction: BoundingBoxCollisionType
    ) {
        if (this.target instanceof Rect) {
            const baseW = Math.abs(this.width);
            const baseH = Math.abs(this.height);

            // Use the shape's local scale (ignore camera/view)
            const curSX = this.target.scale[0];
            const curSY = this.target.scale[1];

            // // Current world sizes - also allow flipping by determining a non zero threshold
            const min = 1e-6;
            const prevWorldW = baseW * curSX < min && baseW * curSX >= 0 ? min : baseW * curSX > -min && baseW * curSX < 0 ? -min : baseW * curSX;
            const prevWorldH = baseH * curSY < min && baseH * curSY >= 0 ? min : baseH * curSY > -min && baseH * curSY < 0 ? -min : baseH * curSY;

            // // Incremental scale multipliers relative to current size (not base)
            const changeInXScale = dx / prevWorldW;
            const changeInYScale = dy / prevWorldH;
                
            const mulSX = direction.includes('LEFT') ? 1 - changeInXScale : direction.includes('RIGHT')  ? 1 + changeInXScale : 1;
            const mulSY = direction.includes('TOP')  ? 1 - changeInYScale : direction.includes('BOTTOM') ? 1 + changeInYScale : 1 ;        

            if (direction.includes('LEFT')) this.target.translation[0] += dx;
            if (direction.includes('TOP')) this.target.translation[1] += dy;
            
            this.target.setScale(mulSX, mulSY);
        }
    }

    private addCorners() {
        for (const type of corners) {            
            const r = new Rect(this.getCornersInScreenSpace(type, this.target.worldMatrix));
            r.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            this.corners.set(type, r);
        }
    }

    private removeCorners() {
        this.corners.clear();
    }

    private updateCorners() {
        for (const type of corners) {
            const config = this.getCornersInScreenSpace(type, this.target.worldMatrix);
            const corner = this.corners.get(type);

            if (corner) {
                corner.translation[0] = config.x;
                corner.translation[1] = config.y;
                corner.width = config.width;
                corner.height = config.height;
                corner.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            }
        }
    }

    private addSides() {
        for (const type of sides) {            
            const r = new Rect(this.getSidesInScreenSpace(type, this.target.worldMatrix));
            r.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            this.sides.set(type, r);
        }
    }

    private updateSides() {
        for (const type of sides) {
            const config = this.getSidesInScreenSpace(type, this.target.worldMatrix);
            const side = this.sides.get(type);

            // only scale the side that should change, e.g. if it grows horizontally, scale only the width with scale and not height
            if (side) {
                side.translation[0] = config.x;
                side.translation[1] = config.y;
                side.width = config.width;
                side.height = config.height;
                side.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            }
        }
    }
}

const flipH = (d: BoundingBoxCollisionType): BoundingBoxCollisionType => {
    if (d.includes('LEFT'))  return d.replace('LEFT', 'RIGHT') as BoundingBoxCollisionType;
    if (d.includes('RIGHT')) return d.replace('RIGHT', 'LEFT') as BoundingBoxCollisionType;
    return d;
};

const flipV = (d: BoundingBoxCollisionType): BoundingBoxCollisionType => {
    if (d.includes('TOP'))    return d.replace('TOP', 'BOTTOM') as BoundingBoxCollisionType;
    if (d.includes('BOTTOM')) return d.replace('BOTTOM', 'TOP') as BoundingBoxCollisionType;
    return d;
};