import { Canvas } from "Canvas";
import { Rect } from "./Rect";
import { Shape } from "./Shape";

const handleTypes = [
    'TOP',
    'BOTTOM',
    'LEFT',
    'RIGHT',
    'TOPLEFT',
    'TOPRIGHT',
    'BOTTOMLEFT',
    'BOTTOMRIGHT',
];

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
    handles: Map<string, Rect> = new Map();
    borderSize: number = 0;
    boxSize: number = 0;

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
        }),
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

    constructor(target: Shape) {
        this.target = target;
        const edge = this.target.getEdge();
        this.width = edge.maxX - edge.minX;
        this.height = edge.maxY - edge.minY;

        for (const type of handleTypes) {
            if (Object.keys(this.getBoundingBoxSides).includes(type)) {
                const r = new Rect(this.getBoundingBoxSides[type]());
                r.color = BLUE;
                this.handles.set(type, r);
            }
        }
    }

    getPositions(): number[] {
        return [
            this.target.x, this.target.y, // Top-left
            this.target.x + this.width, this.target.y, // Top-right
            this.target.x + this.width, this.target.y + this.height, // Bottom-right
            this.target.x, this.target.y + this.height // Bottom-left
        ];
    }

    hitTest(x: number, y: number): boolean {
        // checks if the mouse position hits any of the values
        for (const [key, handle] of this.handles.entries()) {
            if (handle.hitTest(x, y)) {
                return true; // potentially return the type of handle so we know how to react
            }
        }

        return false;
    }

    update(cameraZoom?: number) {
        this.borderSize = BORDERPX;
        this.boxSize = HANDLEPX / 2;
        if (cameraZoom) {
        }

        for (const type of handleTypes) {
            if (Object.keys(this.getBoundingBoxSides).includes(type)) {
              const side = this.getBoundingBoxSides[type]();
                const handle = this.handles.get(type);
                if (handle) {
                    handle.x = side.x;
                    handle.y = side.y;
                    handle.width = side.width;
                    handle.height = side.height;
                }
            }
        }
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram): void {
        this.update(1);

        for (const [key, handle] of this.handles.entries()) {
            handle.render(gl, program);
        }
    }

    destroy(gl: WebGLRenderingContext) {
        for (const [_, handle] of this.handles.entries()) {
            handle.destroy(gl);
        }
    }
}