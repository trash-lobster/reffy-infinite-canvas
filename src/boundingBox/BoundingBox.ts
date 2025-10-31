import { 
    BASE_BLUE, 
    LIGHT_BLUE, 
    BORDERPX, 
    HANDLEPX, 
    corners, 
    sides,
    BoundingBoxCollisionType,
    applyMatrixToPoint,
    getScaleFromMatrix,
    m3,
} from "../util";
import { Rect } from "../shapes/Rect";
import { Shape } from "../shapes/Shape";
import { BoundingBoxMode, PositionData } from "./type";

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
    
    constructor(target: Shape, worldMatrix: number[], mode?: BoundingBoxMode) {
        this.target = target;
        this.setDimension();
        this.mode = mode ?? BoundingBoxMode.ACTIVE;
        this.borderSize = BORDERPX;
        this.boxSize = HANDLEPX / 2;

        this.addSides(worldMatrix);

        if (this.mode === BoundingBoxMode.ACTIVE) {
            this.addCorners(worldMatrix);
        }
    }

    private setDimension() {
        const edge = this.target.getEdge();
        this.width = edge.maxX - edge.minX;
        this.height = edge.maxY - edge.minY;
    }

    private getSidesInScreenSpace(type: string, worldMatrix?: number[]) {
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;
        const { width, height, borderSize } = this;
        const [x, y] = applyMatrixToPoint(worldMatrix, this.target.x, this.target.y);
        return {
            TOP:        { x, y, width: width * scale, height: borderSize },
            BOTTOM:     { x, y: y + height * scale, width : width * scale, height: borderSize },
            LEFT:       { x, y, width: borderSize, height: height * scale },
            RIGHT:      { x: x + width * scale , y, width: borderSize, height: height * scale }
        }[type];
    }

    private getCornersInScreenSpace(type: string, matrix: number[]) {
        const scale = matrix ? getScaleFromMatrix(matrix) : 1;
        const { width, height, boxSize } = this;
        const [x, y] = applyMatrixToPoint(matrix, this.target.x, this.target.y);
        return {
            TOPLEFT:    { 
                x: x - boxSize,
                y: y - boxSize,
                width: boxSize * 2,
                height: boxSize * 2
            },
            TOPRIGHT:   { 
                x: x - boxSize + width * scale, 
                y: y - boxSize, 
                width: boxSize * 2, 
                height: boxSize * 2 
            },
            BOTTOMLEFT: { 
                x: x - boxSize, 
                y: y - boxSize + height * scale, 
                width: boxSize * 2, 
                height: boxSize * 2 
            },
            BOTTOMRIGHT:{ 
                x: x - boxSize + width * scale, 
                y: y - boxSize + height * scale, 
                width: boxSize * 2, 
                height: boxSize * 2 
            },
        }[type];
    }

    setPassive() {
        this.mode = BoundingBoxMode.PASSIVE;
        this.removeCorners();
    }

    setActive(worldMatrix: number[]) {
        this.mode = BoundingBoxMode.ACTIVE;
        this.addCorners(worldMatrix);
    }

    getPositions(): number[] {
        return [
            this.target.x, this.target.y, // Top-left
            this.target.x + this.width, this.target.y, // Top-right
            this.target.x + this.width, this.target.y + this.height, // Bottom-right
            this.target.x, this.target.y + this.height // Bottom-left
        ];
    }

    /**
     * x and y should be world position
     */
    hitTest(wx: number, wy: number, worldMatrix: number[]): (BoundingBoxCollisionType | null) {       
        if (this.mode === BoundingBoxMode.PASSIVE) return;
        const targetMatrix = m3.multiply(worldMatrix, this.target.localMatrix);
        const scale = getScaleFromMatrix(targetMatrix);

        // converted to screen space
        const [hx, hy] = applyMatrixToPoint(worldMatrix, wx, wy);

        // ths hit margin should be in screen size
        const HIT_MARGIN = 4;

        for (const type of corners) {
            const corner = this.getCornersInScreenSpace(type, targetMatrix);
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
            const side = this.getSidesInScreenSpace(type, targetMatrix);
            if (
                hx >= side.x - HIT_MARGIN &&
                hx <= side.x + side.width + HIT_MARGIN &&
                hy >= side.y - HIT_MARGIN &&
                hy <= side.y + side.height + HIT_MARGIN
            ) {
                return type as BoundingBoxCollisionType;
            }
        }

        const [x, y] = applyMatrixToPoint(targetMatrix, this.target.x, this.target.y);
        if (
            hx >= x &&
            hx <= x + this.width * scale &&
            hy >= y &&
            hy <= y + this.height * scale
        ) return 'CENTER';
        
        return null;
    }

    update(worldMatrix: number[]) {
        this.updateSides(worldMatrix);
        this.updateCorners(worldMatrix);
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram, worldMatrix: number[]): void {
        this.update(worldMatrix);

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

            // // move the x and y if the correct one is touched
            // if (direction === 'LEFT' || direction === 'TOPLEFT' || direction === 'BOTTOMLEFT') {                
            //     this.target.x += dx;
            //     this.target.width -= dx;
            //     this.width -= dx;
            // }
            
            // if (direction === 'RIGHT' || direction === 'TOPRIGHT' || direction === 'BOTTOMRIGHT') {
            //     this.target.width += dx;
            //     this.width += dx;
            // }
            
            // if (direction === 'TOP' || direction === 'TOPLEFT' || direction === 'TOPRIGHT') {
            //     this.target.y += dy;
            //     this.target.height -= dy;
            //     this.height -= dy;
            // }

            // if (direction === 'BOTTOM' || direction === 'BOTTOMLEFT' || direction === 'BOTTOMRIGHT') {
            //     this.target.height += dy;
            //     this.height += dy;
            // }

            const absWidth = Math.abs(this.width);
            const absHeight = Math.abs(this.height);

            let scaleX = 1, scaleY = 1;

            if (direction.includes('LEFT') || direction.includes('RIGHT')) {
                scaleX = (absWidth + (direction.includes('LEFT') ? -dx : dx)) / absWidth;
            }
            if (direction.includes('TOP') || direction.includes('BOTTOM')) {
                scaleY = (absHeight + (direction.includes('TOP') ? -dy : dy)) / absHeight;
            }

            this.target.setScale(scaleX, scaleY);

            // // Adjust position if resizing from left/top
            // if (direction.includes('LEFT')) {
            //     this.target.x += dx;
            // }
            // if (direction.includes('TOP')) {
            //     this.target.y += dy;
            // }

            // No need to flip width/height, getEdge will handle scale
            this.setDimension();
        }
    }

    private addCorners(worldMatrix: number[]) {
        const targetMatrix = m3.multiply(worldMatrix, this.target.localMatrix);
        for (const type of corners) {            
            const r = new Rect(this.getCornersInScreenSpace(type, targetMatrix));
            r.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            this.corners.set(type, r);
        }
    }

    private removeCorners() {
        this.corners.clear();
    }

    private updateCorners(worldMatrix?: number[]) {
        const targetMatrix = m3.multiply(worldMatrix, this.target.localMatrix);

        for (const type of corners) {
            const config = this.getCornersInScreenSpace(type, targetMatrix);
            const corner = this.corners.get(type);

            if (corner) {
                corner.x = config.x;
                corner.y = config.y;
                corner.width = config.width;
                corner.height = config.height;
                corner.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            }
        }
    }

    private addSides(worldMatrix: number[]) {
        const targetMatrix = m3.multiply(worldMatrix, this.target.localMatrix);
        for (const type of sides) {            
            const r = new Rect(this.getSidesInScreenSpace(type, targetMatrix));
            r.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            this.sides.set(type, r);
        }
    }

    private updateSides(worldMatrix?: number[]) {
        const targetMatrix = m3.multiply(worldMatrix, this.target.localMatrix);
        for (const type of sides) {
            const config = this.getSidesInScreenSpace(type, targetMatrix);
            const side = this.sides.get(type);

            // only scale the side that should change, e.g. if it grows horizontally, scale only the width with scale and not height
            if (side) {
                side.x = config.x;
                side.y = config.y;
                side.width = config.width;
                side.height = config.height;
                side.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            }
        }
    }
}