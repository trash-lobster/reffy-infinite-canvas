import { makeObservable, observable, computed, action } from "mobx";
import { Renderable } from "../shapes";
import { m3 } from '../util';

export class RenderableState {
    translation: number[] = [0, 0];
    angleRadians: number = 0;
    scale: number[] = [1, 1];

    localMatrix: number[] = m3.identity(); // manage local transformation, like rotate, scale and pan
    worldMatrix: number[] = m3.identity(); // holds the transformation combining local transformation and parent transformation

    children: Renderable[] = [];
    parent: Renderable | null = null;
    renderDirtyFlag: boolean = true; // reduces constant work to re-render if there are no changes

    constructor() {
        makeObservable<this, 'renderDirtyFlag'>(this, {
            translation: observable.struct,
            angleRadians: observable,
            scale: observable.struct,
            localMatrix: observable.ref,
            worldMatrix: observable.ref,
            children: observable.shallow,
            parent: observable.ref,
            renderDirtyFlag: observable,

            x: computed,
            y: computed,
            scaleX: computed,
            scaleY: computed,
            dirty: computed,

            setTranslation: action,
            setScale: action,
            setAngle: action,
            appendChild: action,
            removeChild: action,
            clearChildren: action,
            setParent: action,
            markDirty: action,
            clearDirty: action,
            updateLocalMatrix: action,
            updateWorldMatrix: action,
            setWorldMatrix: action,
        });
        this.updateLocalMatrix();
        this.updateWorldMatrix();
    }

    // Computed
    get x() { return this.translation[0]; }
    get y() { return this.translation[1]; }
    get scaleX() { return this.scale[0]; }
    get scaleY() { return this.scale[1]; }
    get dirty() { return this.renderDirtyFlag; }

    // Actions
    setTranslation(x: number, y: number) {
        this.translation[0] = x;
        this.translation[1] = y;
        this.markDirty();
    }

    updateTranslation(x: number, y: number) {
        this.translation[0] += x;
        this.translation[1] += y;
        this.markDirty();
    }

    setScale(sx: number, sy: number) {
        if (sx === this.scale[0] && sy === this.scale[1]) return;
        this.scale[0] = sx;
        this.scale[1] = sy;
        this.markDirty();
    }

    updateScale(x: number, y: number) {
        this.scale[0] *= x;
        this.scale[1] *= y;
        this.markDirty();
    }

    setAngle(rotationDegree: number) {
        const angleInDegrees = 360 - rotationDegree;
        const radians = angleInDegrees * Math.PI / 180;
        
        if (radians === this.angleRadians) return;
        this.angleRadians = radians;
        this.markDirty();
    }

    appendChild(child: Renderable) {
        if (this.children.includes(child)) return;
        this.children.push(child);
        this.markDirty();
    }

    removeChild(child: Renderable) {
        const i = this.children.indexOf(child);
        if (i < 0) return;
        this.children.splice(i, 1);
        child.state.setParent(null);
        this.markDirty();
    }

    clearChildren() {
        if (this.children) {
            this.children = [];
        }
    }

    setParent(parent: Renderable | null) {
        if (this.parent === parent) return;
        this.parent = parent;
        this.markDirty();
    }

    markDirty() {
        if (!this.renderDirtyFlag) {
            this.renderDirtyFlag = true;
            this.updateLocalMatrix();
        }
    }

    clearDirty() {
        if (this.renderDirtyFlag) {
            this.renderDirtyFlag = false;
            this.updateLocalMatrix();
        }
    }

    updateLocalMatrix() {
        const t = m3.translation(this.translation[0], this.translation[1]);
        const r = m3.rotation(this.angleRadians);
        const s = m3.scaling(this.scale[0], this.scale[1]);
        // Order: T * R * S (adjust if needed)
        this.localMatrix = m3.multiply(m3.multiply(t, r), s);
    }

    updateWorldMatrix(parentWorldMatrix?: number[]) {
        this.worldMatrix = parentWorldMatrix
            ? m3.multiply(parentWorldMatrix, this.localMatrix)
            : this.localMatrix.slice();

        const worldMatrix = this.worldMatrix;
        this.children.forEach(child => {
            child.updateWorldMatrix(worldMatrix);
        })
    }

    setWorldMatrix(worldMatrix: number[]) {
        this.worldMatrix = worldMatrix;
    }
}