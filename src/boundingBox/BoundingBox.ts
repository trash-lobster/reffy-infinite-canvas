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
        const edge = this.target.getEdge();
        this.width = edge.maxX - edge.minX;
        this.height = edge.maxY - edge.minY;
        this.mode = mode ?? BoundingBoxMode.ACTIVE;
        this.borderSize = BORDERPX;
        this.boxSize = HANDLEPX / 2;

        this.addSides(worldMatrix);

        if (this.mode === BoundingBoxMode.ACTIVE) {
            this.addCorners(worldMatrix);
        }
    }

    // TODO: FIX WHY THE POSITION IS OFF WHEN RENDERING THE CORNERS AND SIDE RECTS
    // the world position (x, y)

    private getSideConfig(type: string, worldMatrix?: number[]) {
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;
        const { width, height, borderSize } = this;
        let x = this.target.x, y = this.target.y;
        return {
            TOP:        { x, y, width: width * scale, height: borderSize },
            BOTTOM:     { x, y: y + height, width : width * scale, height: borderSize },
            LEFT:       { x, y, width: borderSize, height: height * scale },
            RIGHT:      { x: x + width , y, width: borderSize, height: height * scale }
        }[type];
    }

    private getCornerConfig(type: string, worldMatrix: number[]) {
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;
        const { width, height, boxSize } = this;
        let x = this.target.x, y = this.target.y;
        return {
            TOPLEFT:    { x: x - boxSize / scale, y: y - boxSize / scale, width: boxSize * 2, height: boxSize * 2 },
            TOPRIGHT:   { x: x - boxSize / scale + width, y: y - boxSize / scale, width: boxSize * 2, height: boxSize * 2 },
            BOTTOMLEFT: { x: x - boxSize / scale, y: y - boxSize / scale + height, width: boxSize * 2, height: boxSize * 2 },
            BOTTOMRIGHT:{ x: x - boxSize / scale + width, y: y - boxSize / scale + height, width: boxSize * 2, height: boxSize * 2 },
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
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;

        // ths hit margin should be in screen size
        const HIT_MARGIN = 4;

        for (const type of corners) {
            const handle = this.corners.get(type);
            const config = this.getCornerConfig(type, worldMatrix);
            if (handle && this.expandedHit(config, wx, wy, HIT_MARGIN, scale)) {
                return type as BoundingBoxCollisionType;
            }
        }
        
        for (const type of sides) {
            const handle = this.sides.get(type);
            const config = this.getSideConfig(type, worldMatrix);
            if (handle && this.expandedHit(config, wx, wy, HIT_MARGIN, scale)) {
                return type as BoundingBoxCollisionType;
            }
        }

        if (
            wx >= this.target.x &&
            wx <= this.target.x + this.width &&
            wy >= this.target.y &&
            wy <= this.target.y + this.height
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
        this.target.x += dx;
        this.target.y += dy;
    }

    resize(
        dx: number, 
        dy: number, 
        direction: BoundingBoxCollisionType
    ) {
        if (this.target instanceof Rect) {

            // move the x and y if the correct one is touched
            if (direction === 'LEFT' || direction === 'TOPLEFT' || direction === 'BOTTOMLEFT') {                
                this.target.x += dx;
                this.target.width -= dx;
                this.width -= dx;
            }
            
            if (direction === 'RIGHT' || direction === 'TOPRIGHT' || direction === 'BOTTOMRIGHT') {
                this.target.width += dx;
                this.width += dx;
            }
            
            if (direction === 'TOP' || direction === 'TOPLEFT' || direction === 'TOPRIGHT') {
                this.target.y += dy;
                this.target.height -= dy;
                this.height -= dy;
            }

            if (direction === 'BOTTOM' || direction === 'BOTTOMLEFT' || direction === 'BOTTOMRIGHT') {
                this.target.height += dy;
                this.height += dy;
            }
        }
    }

    private expandedHit(config: PositionData, x: number, y: number, margin: number, scale: number): boolean {

        return (
            x >= config.x - margin / scale &&
            x <= config.x + config.width / scale + margin / scale &&
            y >= config.y - margin / scale &&
            y <= config.y + config.height / scale + margin / scale
        );
    }

    private addCorners(worldMatrix: number[]) {
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;

        for (const type of corners) {            
            const r = new Rect(this.getCornerConfig(type, worldMatrix));
            r.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            this.corners.set(type, r);
        }
    }

    private removeCorners() {
        this.corners.clear();
    }

    private updateCorners(worldMatrix?: number[]) {
        for (const type of corners) {
            const config = this.getCornerConfig(type, worldMatrix);
            const corner = this.corners.get(type);
            const [x, y] = applyMatrixToPoint(worldMatrix, config.x, config.y);

            if (corner) {
                corner.x = x;
                corner.y = y;
                corner.width = config.width;
                corner.height = config.height;
                corner.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            }
        }
    }

    private addSides(worldMatrix: number[]) {
        for (const type of sides) {            
            const r = new Rect(this.getSideConfig(type, worldMatrix));
            r.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            this.sides.set(type, r);
        }
    }

    private updateSides(worldMatrix?: number[]) {
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;

        for (const type of sides) {
            const config = this.getSideConfig(type, worldMatrix);
            const side = this.sides.get(type);
            const [x, y] = applyMatrixToPoint(worldMatrix, config.x, config.y);

            // only scale the side that should change, e.g. if it grows horizontally, scale only the width with scale and not height
            if (side) {
                side.x = x;
                side.y = y;
                side.width = config.width;
                side.height = config.height;
                side.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            }
        }
    }
}