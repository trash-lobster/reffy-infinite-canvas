import { makeObservable, observable, computed, action } from "mobx";
import { m3 } from "../util";

interface CameraStateOption {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zoom: number;
}

export class CameraState {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zoom: number;

    constructor(option: Partial<CameraStateOption> = {}) {
        const {
            x = 0,
            y = 0,
            width = 0,
            height = 0,
            rotation = 0,
            zoom = 1,
        } = option;

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.rotation = rotation;
        this.zoom = zoom;

        makeObservable(this, {
            x: observable,
            y: observable,
            width: observable,
            height: observable,
            rotation: observable,
            zoom: observable,
            setX: action,
            setY: action,
            setPosition: action,
            incrementPosition: action,
            setWidth: action,
            setHeight: action,
            setSize: action,
            setZoom: action,
            setRotation: action,
            stateVector: computed,
        });
    }

    // Actions
    setX(x: number) {
        this.x = x;
    }

    setY(y: number) {
        this.y = y;
    }

    setPosition(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    incrementPosition(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
    }

    setWidth(width: number) {
        this.width = width;
    }

    setHeight(height: number) {
        this.height = height;
    }

    setSize(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    setZoom(zoom: number) {
        this.zoom = zoom;
    }

    setRotation(rotation: number) {
        this.rotation = rotation;
    }

    get dimension() {
        return [this.width, this.height];
    }

    get position() {
        return [this.x, this.y];
    }

    get stateVector() {
        return [this.x, this.y, this.width, this.height, this.rotation, this.zoom];
    }

    get translationMatrix() {
        return m3.translation(this.x, this.y);
    }

    get rotationMatrix() {
        return m3.rotation(this.rotation);
    }

    get scaleMatrix() {
        return m3.scaling(this.zoom, this.zoom);
    }

    get cameraMatrix() {
        const matrix = m3.multiply(this.translationMatrix, this.rotationMatrix);
        return m3.multiply(matrix, this.scaleMatrix);
    }

    get canvasMatrix() {
        return m3.inverse(this.cameraMatrix);
    }
}