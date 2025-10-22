import { BoundingBox, Shape } from "../shapes";

export class SelectionManager {
    private _selected: Set<Shape> = new Set();
    private _boundingBox: Set<BoundingBox> = new Set();
    renderDirtyFlag = true;
    private zoomFactor = 1;

    private gl: WebGLRenderingContext;
    private rectProgram: WebGLProgram;

    get selected(): Shape[] { return Array.from(this._selected); }
    set selected(shapes: Shape[]) {
        // clear out previous set
        this._selected.clear();

        shapes.forEach(shape => {
            this._selected.add(shape)
            this._boundingBox.add(new BoundingBox(shape));
        });
    }

    /**
     * 
     * @param gl 
     * @param program Add reference to program to allow easy linking
     */
    constructor(gl: WebGLRenderingContext, program: WebGLProgram) {
        this.gl = gl;
        this.rectProgram = program;
    }

    // add, remove selected
    add(shapes: Shape[]) {
        shapes.forEach(shape => {
            if (!this._selected.has(shape)) {
                this._selected.add(shape);
                this._boundingBox.add(new BoundingBox(shape));
            }
        })
    }

    remove(shapes: Shape[]) {
        shapes.forEach(shape => {
            if (!this._selected.has(shape)) return;
            this._selected.delete(shape);
            const matchingBoundingBox = this._boundingBox.values().find(box => box.target === shape);
            if (matchingBoundingBox) {
                this._boundingBox.delete(matchingBoundingBox);
            } else {
                console.error('No matching bounding box found');
            }
        })
    }

    hitTest(wx: number, wy: number) {
        for (const box of this._boundingBox.values()) {
            const ans = box.hitTest(wx, wy);
            if (ans) {
                return ans;
            }
        }
    }

    /**
     * Update the existing bounding boxes
     */
    update(zoomFactor?: number) {
        if (zoomFactor && zoomFactor !== this.zoomFactor) {
            this.zoomFactor = zoomFactor;
            this.renderDirtyFlag = true;
        }
        this._boundingBox.forEach(box => box.update(zoomFactor));
    }

    render() {
        if (this.renderDirtyFlag) {
            this.gl.useProgram(this.rectProgram);
            this._boundingBox.forEach(box => box.render(this.gl, this.rectProgram));
        }
    }

    clear() {
        this._selected.clear();
        this._boundingBox.clear();
    }
}