import { Canvas } from "Canvas";
import { m3, screenToWorld } from "../util";
import { Shape } from "../shapes";

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 8;

export class Camera {
    canvas : Canvas;
    #x: number = 0;
    #y: number = 0;
    #width: number = 0;
    #height: number = 0;
    #rotation: number = 0;
    #zoom: number = 1;

    #startWorldX: number = 0;
    #startWorldY: number = 0;
    #lastWorldX: number = 0;
    #lastWorldY: number = 0;

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
            console.log(val);
        }
    }

    constructor(canvas: Canvas) {
        this.canvas = canvas;

        this.canvas.canvas.addEventListener('pointerdown', (e) => {
            const [wx, wy] = this.getWorldCoords(e.clientX, e.clientY);
            this.#startWorldX = wx;
            this.#startWorldY = wy;
            this.#lastWorldX = wx;
            this.#lastWorldY = wy;

            this.canvas.hitTest(wx, wy);

            document.addEventListener('pointermove', this.onPointerMove);
            const up = () => {
                document.removeEventListener('pointermove', this.onPointerMove);
                document.removeEventListener('pointerup', up);
                this.canvas.isGlobalClick = true;
                // this.canvas._eventManager.resetImpactedShapes();
                this.canvas.canvas.style.cursor = 'default';
            };
            document.addEventListener('pointerup', up);

        });
        this.canvas.canvas.addEventListener('wheel', this.onWheel, { passive: false });
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

    private onWheel = (e: WheelEvent) => {
        e.preventDefault();

        // Point under cursor in world space before zoom
        const [wx0, wy0] = this.getWorldCoords(e.clientX, e.clientY);

        // Smooth zoom factor (wheel up => zoom in)
        const ZOOM_SPEED = 0.003;
        const scale = Math.exp(-e.deltaY * ZOOM_SPEED);
        const target = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * scale));

        this.zoom = target;

        // Same point after zoom
        const [wx1, wy1] = this.getWorldCoords(e.clientX, e.clientY);

        // Shift camera so the world point stays under the cursor
        this.x += (wx0 - wx1);
        this.y += (wy0 - wy1);
    };

    private onPointerMove = (e: PointerEvent) => {
        const [wx, wy] = this.getWorldCoords(e.clientX, e.clientY);
        const dx = wx - this.#lastWorldX;
        const dy = wy - this.#lastWorldY;

        if (this.canvas.isGlobalClick) {
            this.x += this.#startWorldX - wx;
            this.y += this.#startWorldY - wy;
        } else {
            const target = this.canvas._eventManager.impactedShapes.find(
                (child): child is Shape => child instanceof Shape
            );

            if (target) {
                target.x += dx;
                target.y += dy;

                target.updateVertexData(this.canvas.gl);

            }
        }

        this.#lastWorldX = wx;
        this.#lastWorldY = wy;
        this.canvas.canvas.style.cursor = 'grabbing'
    }

    private getWorldCoords(x: number, y: number) {
        return screenToWorld(
            x, 
            y,
            this.canvas.gl.canvas.width,
            this.canvas.gl.canvas.height,
            this.canvas.canvas,
            this.canvas.worldMatrix,
        );
    }
}