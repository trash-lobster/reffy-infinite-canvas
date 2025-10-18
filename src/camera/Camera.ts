import { Canvas } from "Canvas";
import { m3 } from "../util";

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 10;

export class Camera {
    canvas : Canvas;
    #x: number = 0;
    #y: number = 0;
    #width: number = 0;
    #height: number = 0;
    #rotation: number = 0;
    #zoom: number = 1;

    #startX: number = 0;
    #startY: number = 0;
    #startCamX: number = 0;
    #startCamY: number = 0;
    #startWorldX: number = 0;
    #startWorldY: number = 0;

    get x () { return this.#x };
    set x (val: number) {
        if (this.#x !== val) {
            this.#x = val;
            this.updateCanvasMatrix();
        }
    }

    get y () { return this.#y };
    set y (val: number) {
        if (this.#y !== val) {
            this.#y = val;
            this.updateCanvasMatrix();
        }
    }

    get width () { return this.#width };
    set width (val: number) {
        if (this.#width !== val) {
            this.#width = val;
            this.updateCanvasMatrix();
        }
    }

    get height () { return this.#height };
    set height (val: number) {
        if (this.#height !== val) {
            this.#height = val;
            this.updateCanvasMatrix();
        }
    }

    get rotation () { return this.#rotation };
    set rotation (val: number) {
        if (this.#rotation !== val) {
            this.#rotation = val;
            this.updateCanvasMatrix();
        }
    }

    get zoom () { return this.#zoom };
    set zoom (val: number) {
        if (Math.abs(val) < ZOOM_MIN) {
            val = ZOOM_MIN;
        }

        if (this.#zoom !== val) {
            this.#zoom = val;
            this.updateCanvasMatrix();
        }
    }

    constructor(canvas: Canvas) {
        this.canvas = canvas;
        this.canvas.canvas.addEventListener('pointerdown', (e) => {
            this.#startX = e.clientX;
            this.#startY = e.clientY;
            this.#startCamX = this.x;
            this.#startCamY = this.y;

            const [wx, wy] = this.screenToWorld(e.clientX, e.clientY);
            this.#startWorldX = wx;
            this.#startWorldY = wy;

            document.addEventListener('pointermove', this.onPointerMove);
            const up = () => {
                document.removeEventListener('pointermove', this.onPointerMove);
                document.removeEventListener('pointerup', up);
            };
            document.addEventListener('pointerup', up);
        });
        this.canvas.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    }

    /**
     * Called once to update the `worldMatrix` of the attached canvas.
     */
    private updateCanvasMatrix() {
        const translationMatrix = m3.translation(this.x, this.y);
        const rotationMatrix = m3.rotation(this.rotation);
        const scaleMatrix = m3.scaling(this.zoom, this.zoom);
        
        const matrix = m3.multiply(translationMatrix, rotationMatrix);
        const cameraMatrix = m3.multiply(matrix, scaleMatrix);
        
        // obtaining a proper view matrix
        this.canvas.worldMatrix = m3.inverse(cameraMatrix);
        this.canvas.updateWorldMatrix();
    }

    private screenToWorld(clientX: number, clientY: number): [number, number] {
        const rect = this.canvas.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Device pixels relative to canvas
        const x = (clientX - rect.left) * dpr;
        const y = (clientY - rect.top) * dpr;

        // To clip space (-1..1)
        const w = this.canvas.gl.canvas.width;
        const h = this.canvas.gl.canvas.height;
        const xClip = (x / w) * 2 - 1;
        const yClip = (y / h) * -2 + 1;

        // inv(P * V) * clip -> world
        const proj = m3.projection(w, h);
        const pv = m3.multiply(proj, this.canvas.worldMatrix); // worldMatrix is V
        const invPV = m3.inverse(pv);
        const [wx, wy] = m3.transformPoint(invPV, [xClip, yClip]);

        return [wx, wy];
    }

    private onWheel = (e: WheelEvent) => {
        e.preventDefault();

        // Point under cursor in world space before zoom
        const [wx0, wy0] = this.screenToWorld(e.clientX, e.clientY);

        // Smooth zoom factor (wheel up => zoom in)
        const ZOOM_SPEED = 0.002; // tweak to taste
        const scale = Math.exp(-e.deltaY * ZOOM_SPEED);
        const target = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * scale));

        // Apply zoom (updates view matrix)
        this.zoom = target;

        // Same point after zoom
        const [wx1, wy1] = this.screenToWorld(e.clientX, e.clientY);

        // Shift camera so the world point stays under the cursor
        this.x += (wx0 - wx1);
        this.y += (wy0 - wy1);
    };

    private onPointerMove = (e: PointerEvent) => {
        const dpr = window.devicePixelRatio || 1;
        // Screen-space deltas (CSS px -> device px)
        const dxScreen = (e.clientX - this.#startX) * dpr;
        const dyScreen = (e.clientY - this.#startY) * dpr;

        // Convert screen delta to world delta: undo rotation and scale
        const c = Math.cos(this.rotation), s = Math.sin(this.rotation);
        const invZoom = 1 / this.zoom;
        const dxWorld = ( dxScreen * c + dyScreen * s) * invZoom;
        const dyWorld = (-dxScreen * s + dyScreen * c) * invZoom;

        // Move camera opposite to drag so content follows the cursor
        this.x = this.#startCamX - dxWorld;
        this.y = this.#startCamY - dyWorld;
    }
}