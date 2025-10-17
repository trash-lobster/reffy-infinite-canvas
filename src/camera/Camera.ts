import { Canvas } from "Canvas";
import { m3 } from "../util";

export class Camera {
    canvas : Canvas;
    translation: number[] = [0, 0];
    angleRadians: number = 0;
    zoom: number = 1;

    constructor(canvas: Canvas) {
        this.canvas = canvas;
    }

    // TODO: change to inverse camera movement
    translate(x: number, y: number) {
        this.translation[0] = x;
        this.translation[1] = y;

        // update canvas local matrix
        this.updateCanavsMatrix();
    }

    rotate(angle: number) {
        const angleInDegrees = 360 - angle;
        this.angleRadians += angleInDegrees * Math.PI / 180;
        this.updateCanavsMatrix();
    }

    zoomIn(zoomFactor: number) {
        this.zoom += zoomFactor;
        this.updateCanavsMatrix();
    }

    zoomOut(zoomFactor: number) {
        this.zoom -= zoomFactor;
        this.updateCanavsMatrix();
    }

    /**
     * Called once to update the `worldMatrix` of the attached canvas.
     */
    private updateCanavsMatrix() {
        const translationMatrix = m3.translation(this.translation[0], this.translation[1]);
        const rotationMatrix = m3.rotation(this.angleRadians);
        const scaleMatrix = m3.scaling(this.zoom, this.zoom);
        
        const matrix = m3.multiply(translationMatrix, rotationMatrix);
        this.canvas.worldMatrix = m3.multiply(matrix, scaleMatrix);
        this.canvas.updateWorldMatrix();
    }
}