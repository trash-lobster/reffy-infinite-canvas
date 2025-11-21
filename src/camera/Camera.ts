import { Canvas } from "Canvas";
import { getWorldCoords } from "../util";
import { CameraState } from "../state";
import { reaction } from "mobx";

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 20;

export class Camera {
    canvas : Canvas;
    state: CameraState;
    private updateReaction: () => void;

    constructor(canvas: Canvas, state: CameraState) {
        this.canvas = canvas;
        this.state = state;

        this.updateReaction = reaction(
            () => this.state.stateVector,
            () => this.updateViewMatrix()
        );

        // reaction does not auto run the function when assigned
        this.updateViewMatrix();
    }

    /**
     * Called once to update the `worldMatrix` of the attached canvas, which is the view matrix.
     */
    private updateViewMatrix() {
        this.canvas.setWorldMatrix(this.state.canvasMatrix);
        this.canvas.updateWorldMatrix();
    }

    onWheel = (e: WheelEvent) => {
        e.preventDefault();

        const ZOOM_SPEED = 0.003;
        const scale = Math.exp(-e.deltaY * ZOOM_SPEED);
        this.updateZoom(e.clientX, e.clientY, scale);
    }

    updateCameraPos(dx: number, dy: number) {
        this.state.incrementPosition(dx, dy);
    }

    updateZoom(x: number, y: number, scale: number) {
        const [wx0, wy0] = getWorldCoords(x, y, this.canvas);
        this.state.setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.state.zoom * scale)));

        const [wx1, wy1] = getWorldCoords(x, y, this.canvas);

        this.state.incrementPosition(wx0 - wx1, wy0 - wy1);
    }

    dispose() {
        if (this.updateReaction) {
            this.updateReaction();
            this.updateReaction = undefined;
        }
    }
}