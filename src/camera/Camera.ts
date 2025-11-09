import { Canvas } from "Canvas";
import { getWorldCoords, m3 } from "../util";

export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 8;

export class Camera {
    canvas : Canvas;
    #x: number = 0;
    #y: number = 0;
    #width: number = 0;
    #height: number = 0;
    #rotation: number = 0;
    #zoom: number = 1;

    get x () { return this.#x };
    set x (val: number) {
        if (this.#x !== val) {
            this.#x = val;
            this.updateViewMatrix();
        }
    }

    get y () { return this.#y };
    set y (val: number) {
        if (this.#y !== val) {
            this.#y = val;
            this.updateViewMatrix();
        }
    }

    get width () { return this.#width };
    set width (val: number) {
        if (this.#width !== val) {
            this.#width = val;
            this.updateViewMatrix();
        }
    }

    get height () { return this.#height };
    set height (val: number) {
        if (this.#height !== val) {
            this.#height = val;
            this.updateViewMatrix();
        }
    }

    get rotation () { return this.#rotation };
    set rotation (val: number) {
        if (this.#rotation !== val) {
            this.#rotation = val;
            this.updateViewMatrix();
        }
    }

    get zoom () { return this.#zoom };
    set zoom (val: number) {
        if (val < ZOOM_MIN) {
            val = ZOOM_MIN;
        } else if (val > ZOOM_MAX) {
            val = ZOOM_MAX;
        }

        if (this.#zoom !== val) {
            this.#zoom = val;
            this.canvas.grid.zoom = val;
            this.updateViewMatrix();
        }
    }

    constructor(canvas: Canvas) {
        this.canvas = canvas;
    }

    /**
     * Called once to update the `worldMatrix` of the attached canvas, which is the view matrix.
     */
    private updateViewMatrix() {
        const translationMatrix = m3.translation(this.x, this.y);
        const rotationMatrix = m3.rotation(this.rotation);
        const scaleMatrix = m3.scaling(this.zoom, this.zoom);
        
        const matrix = m3.multiply(translationMatrix, rotationMatrix);
        const cameraMatrix = m3.multiply(matrix, scaleMatrix);
        
        // obtaining a proper view matrix, which is the inverse of camera matrix
        this.canvas.worldMatrix = m3.inverse(cameraMatrix);
        this.canvas.updateWorldMatrix();
    }

    onWheel = (e: WheelEvent) => {
        e.preventDefault();

        const ZOOM_SPEED = 0.003;
        const scale = Math.exp(-e.deltaY * ZOOM_SPEED);
        this.updateZoom(e.clientX, e.clientY, scale);
    }

    updateCameraPos(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
        this.updateViewMatrix();
    }

    updateZoom(x: number, y: number, scale: number) {
        const [wx0, wy0] = getWorldCoords(x, y, this.canvas);
        const target = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * scale));
        this.zoom = target;

        const [wx1, wy1] = getWorldCoords(x, y, this.canvas);

        this.x += (wx0 - wx1);
        this.y += (wy0 - wy1);
    }
}