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

enum BoundingBoxMode {
    ACTIVE,     // direct interaction allowed
    PASSIVE,    // when just display the rect but not the corner handles - no direct interaction allowed
}

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

        this.addSides();

        if (this.mode === BoundingBoxMode.ACTIVE) {
            this.addCorners(worldMatrix);
        }
    }

    // TODO: FIX WHY THE POSITION IS OFF WHEN RENDERING THE CORNERS AND SIDE RECTS
    // the world position (x, y)

    private getSideConfig(type: string, scale?: number) {
        const { width, height, borderSize } = this;
        const x = this.target.x, y = this.target.y;
        return {
            TOP:        { x, y, width: width * scale, height: borderSize },
            BOTTOM:     { x, y: y + height - borderSize / scale, width : width * scale, height: borderSize },
            LEFT:       { x, y, width: borderSize, height: height * scale },
            RIGHT:      { x: x + width - borderSize / scale, y, width: borderSize, height: height * scale }
        }[type];
    }

    private getCornerConfig(type: string, scale?: number) {
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

        this.update(worldMatrix);
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;

        // ths hit margin should be in screen size
        const HIT_MARGIN = 4;

        for (const type of corners) {
            const handle = this.corners.get(type);
            if (handle && this.expandedHit(handle, wx, wy, HIT_MARGIN, scale)) {
                return type as BoundingBoxCollisionType;
            }
        }
        
        for (const type of sides) {
            const handle = this.sides.get(type);
            if (handle && this.expandedHit(handle, wx, wy, HIT_MARGIN, scale)) {
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

    private expandedHit(handle: Rect, x: number, y: number, margin: number, scale: number): boolean {
        return (
            x >= handle.x - margin / scale &&
            x <= handle.x + handle.width + margin / scale &&
            y >= handle.y - margin &&
            y <= handle.y + handle.height + margin
        );
    }

    private addCorners(worldMatrix: number[]) {
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;

        for (const type of corners) {            
            const r = new Rect(this.getCornerConfig(type));
            r.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            this.corners.set(type, r);
        }
    }

    private removeCorners() {
        this.corners.clear();
    }

    private updateCorners(worldMatrix?: number[]) {
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;

        for (const type of corners) {
            const config = this.getCornerConfig(type, scale);
            const corner = this.corners.get(type);
            if (corner) {
                let [tx, ty] = [config.x, config.y];
                if (worldMatrix) {
                    [tx, ty] = applyMatrixToPoint(worldMatrix, config.x, config.y);
                }
                corner.x = tx;
                corner.y = ty;
                corner.width = config.width;
                corner.height = config.height;
                corner.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            }
        }
    }

    private addSides() {
        for (const type of sides) {            
            const r = new Rect(this.getSideConfig(type));
            r.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            this.sides.set(type, r);
        }
    }

    private updateSides(worldMatrix?: number[]) {
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;
        console.log(scale);
        for (const type of sides) {
            const config = this.getSideConfig(type, scale);
            const side = this.sides.get(type);
            // only scale the side that should change, e.g. if it grows horizontally, scale only the width with scale and not height
            if (side) {
                let [tx, ty] = [config.x, config.y];
                if (worldMatrix) {
                    [tx, ty] = applyMatrixToPoint(worldMatrix, config.x, config.y);
                    console.log(tx, ty);
                    
                }
                side.x = tx;
                side.y = ty;
                side.width = config.width;
                side.height = config.height;
                side.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
            }
        }
    }
}