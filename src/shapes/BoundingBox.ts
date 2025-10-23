import { Rect } from "./Rect";
import { Shape } from "./Shape";

const sides = [
    'TOP',
    'BOTTOM',
    'LEFT',
    'RIGHT',
];

const corners = [
    'TOPLEFT',
    'TOPRIGHT',
    'BOTTOMLEFT',
    'BOTTOMRIGHT',
]

const HANDLEPX = 8;
const BORDERPX = 2;

enum BoundingBoxMode {
    ACTIVE,     // direct interaction allowed
    PASSIVE,    // when just display the rect but not the corner handles - no direct interaction allowed
}

const BLUE: [number, number, number, number] = [0.33, 0.6, 0.95, 1];

export class BoundingBox {
    target: Shape;
    width: number;
    height: number;
    sides: Map<string, Rect> = new Map();
    corners: Map<string, Rect> = new Map();
    borderSize: number = 0;
    boxSize: number = 0;
    mode: BoundingBoxMode = BoundingBoxMode.ACTIVE;

    getBoundingBoxSides = {
        TOP: () => ({
            x: this.target.x,
            y: this.target.y,
            width: this.width,
            height: this.borderSize,
        }),
        BOTTOM: () => ({
            x: this.target.x,
            y: this.target.y + this.height - this.borderSize,
            width: this.width,
            height: this.borderSize,
        }),
        LEFT: () => ({
            x: this.target.x,
            y: this.target.y,
            width: this.borderSize,
            height: this.height
        }),
        RIGHT: () => ({
            x: this.target.x + this.width - this.borderSize,
            y: this.target.y,
            width: this.borderSize,
            height: this.height
        })
    };

    getBoundingBoxCorners = {
        TOPLEFT: () => ({
            x: this.target.x - this.boxSize,
            y: this.target.y - this.boxSize,
            width: this.boxSize * 2,
            height: this.boxSize * 2,
        }),
        TOPRIGHT: () => ({
            x: this.target.x - this.boxSize + this.width,
            y: this.target.y - this.boxSize,
            width: this.boxSize * 2,
            height: this.boxSize * 2,
        }),
        BOTTOMLEFT: () => ({
            x: this.target.x - this.boxSize,
            y: this.target.y - this.boxSize + this.height,
            width: this.boxSize * 2,
            height: this.boxSize * 2,
        }),
        BOTTOMRIGHT: () => ({
            x: this.target.x - this.boxSize + this.width,
            y: this.target.y - this.boxSize + this.height,
            width: this.boxSize * 2,
            height: this.boxSize * 2,
        }),
    }

    constructor(target: Shape, mode?: BoundingBoxMode) {
        this.target = target;
        const edge = this.target.getEdge();
        this.width = edge.maxX - edge.minX;
        this.height = edge.maxY - edge.minY;

        this.mode = mode ?? BoundingBoxMode.ACTIVE;

        for (const type of sides) {            
            if (Object.keys(this.getBoundingBoxSides).includes(type)) {
                const r = new Rect(this.getBoundingBoxSides[type]());
                r.color = BLUE;
                this.sides.set(type, r);
            }
        }

        if (this.mode === BoundingBoxMode.ACTIVE) {
            this.addCorners();
        }
    }
    
    private addCorners() {
        for (const type of corners) {            
            if (Object.keys(this.getBoundingBoxCorners).includes(type)) {
                const r = new Rect(this.getBoundingBoxCorners[type]());
                r.color = BLUE;
                this.corners.set(type, r);
            }
        }
    }

    private removeCorners() {
        this.corners.clear();
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
        return [
            this.target.x, this.target.y, // Top-left
            this.target.x + this.width, this.target.y, // Top-right
            this.target.x + this.width, this.target.y + this.height, // Bottom-right
            this.target.x, this.target.y + this.height // Bottom-left
        ];
    }

    hitHandleTest(x: number, y: number) {
        if (this.mode === BoundingBoxMode.PASSIVE) return;

        const HIT_MARGIN = 4;

        const cornerTypes = ['TOPLEFT', 'TOPRIGHT', 'BOTTOMLEFT', 'BOTTOMRIGHT'];
        for (const type of cornerTypes) {
            const handle = this.sides.get(type);
            if (handle && this._expandedHit(handle, x, y, HIT_MARGIN)) {
                return type;
            }
        }
        
        const edgeTypes = ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'];
        for (const type of edgeTypes) {
            const handle = this.sides.get(type);
            if (handle && this._expandedHit(handle, x, y, HIT_MARGIN)) {
                return type;
            }
        }
        return null;
    }

    hitTest(x: number, y: number) {
        return (
            x >= this.target.x &&
            x <= this.target.x + this.width &&
            y >= this.target.y &&
            y <= this.target.y + this.height
        );
    }

    update(cameraZoom?: number) {
        this.borderSize = BORDERPX;
        this.boxSize = HANDLEPX / 2;
        if (cameraZoom) {
        }

        for (const type of sides) {
            if (Object.keys(this.getBoundingBoxSides).includes(type)) {
              const side = this.getBoundingBoxSides[type]();
                const handle = this.sides.get(type);
                if (handle) {
                    handle.x = side.x;
                    handle.y = side.y;
                    handle.width = side.width;
                    handle.height = side.height;
                }
            }
        }

        for (const type of corners) {
            if (Object.keys(this.getBoundingBoxCorners).includes(type)) {
              const corner = this.getBoundingBoxCorners[type]();
                const handle = this.corners.get(type);
                if (handle) {
                    handle.x = corner.x;
                    handle.y = corner.y;
                    handle.width = corner.width;
                    handle.height = corner.height;
                }
            }
        }
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram): void {
        this.update(1);

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

    private _expandedHit(handle: Rect, x: number, y: number, margin: number): boolean {
        return (
            x >= handle.x - margin &&
            x <= handle.x + handle.width + margin &&
            y >= handle.y - margin &&
            y <= handle.y + handle.height + margin
        );
    }
}