import { CameraState } from "../state";
import { reaction } from "mobx";

export const ZOOM_MIN = 0.02;
export const ZOOM_MAX = 20;

export class Camera {
    state: CameraState;
    private updateReaction: () => void;
    getWorldCoords: (x: number, y: number) => number[];
    setWorldMatrix: (matrix: number[]) => void;
    updateWorldMatrix: () => void;

    constructor(
        state: CameraState,
        setWorldMatrix: (matrix: number[]) => void,
        updateWorldMatrix: () => void,
        getWorldCoords: (x: number, y: number) => number[]
    ) {
        this.state = state;

        this.updateCameraPos = this.updateCameraPos.bind(this);
        this.getWorldCoords = getWorldCoords;
        this.setWorldMatrix = setWorldMatrix;
        this.updateWorldMatrix = updateWorldMatrix

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
        this.setWorldMatrix(this.state.canvasMatrix);
        this.updateWorldMatrix();
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
        const [wx0, wy0] = this.getWorldCoords(x, y);
        this.state.setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.state.zoom * scale)));

        const [wx1, wy1] = this.getWorldCoords(x, y);

        this.state.incrementPosition(wx0 - wx1, wy0 - wy1);
    }

    dispose() {
        if (this.updateReaction) {
            this.updateReaction();
            this.updateReaction = undefined;
        }
    }
}