import { BoundingBoxCollisionType } from "util";
import { 
    BoundingBox, 
    MultiBoundingBox, 
    Rect,
} from "../shapes";

export class SelectionManager {
    private _selected: Set<Rect> = new Set();
    private _boundingBox: Set<BoundingBox> = new Set();
    private _multiBoundingBox : MultiBoundingBox;
    renderDirtyFlag = true;
    private zoomFactor = 1;

    private gl: WebGLRenderingContext;
    private rectProgram: WebGLProgram;

    get selected(): Rect[] { return Array.from(this._selected); }
    set selected(shapes: Rect[]) {
        // clear out previous set
        this._selected.clear();

        shapes.forEach(shape => {
            this._selected.add(shape)
            this._boundingBox.add(new BoundingBox(shape));
        });
    }

    /**
     * @param gl 
     * @param program Add reference to program to allow easy linking
     */
    constructor(gl: WebGLRenderingContext, program: WebGLProgram) {
        this.gl = gl;
        this.rectProgram = program;
    }

    // add, remove selected
    add(shapes: Rect[]) {
        shapes.forEach(shape => {
            if (!this._selected.has(shape)) {
                this._selected.add(shape);
                this._boundingBox.add(new BoundingBox(shape));
            }
        })

        if (this._boundingBox.size > 1) {
            this._boundingBox.forEach(box => box.setPassive());
            
            if (!this._multiBoundingBox) {
                console.log('bounding box created');
                this._multiBoundingBox = new MultiBoundingBox();
            }

            this.selected.forEach(shape => this._multiBoundingBox.add(shape));
        }
    }

    remove(shapes: Rect[]) {
        shapes.forEach(shape => {
            if (!this._selected.has(shape)) return;
            this._selected.delete(shape);
            const matchingBoundingBox = this._boundingBox.values().find(box => box.target === shape);
            if (matchingBoundingBox) {
                this._boundingBox.delete(matchingBoundingBox);
            } else {
                console.error('No matching bounding box found');
            }

            if (this._multiBoundingBox) {
                this._multiBoundingBox.remove(shape);
            }
        })

        if (this._boundingBox.size <= 1) {
            this._boundingBox.forEach(box => box.setActive());
            this._multiBoundingBox = null;
        }
    }

    /**
     * Checks first if there is a hit in a multibounding and its handles. If not, check the one bounding box that is active.
     */
    hitTest(wx: number, wy: number): (BoundingBoxCollisionType | null) {
        if (this._multiBoundingBox) {
            const ans = this._multiBoundingBox.hitTest(wx, wy);
            if (ans) {
                return ans;
            }            
        }

        for (const box of this._boundingBox.values()) {
            const ans = box.hitTest(wx, wy);
            if (ans) {
                return ans;
            }
        }

        return null;
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

        if (this._multiBoundingBox) {
            this._multiBoundingBox.render(this.gl, this.rectProgram);
        }
    }

    clear() {
        this._selected.clear();
        this._boundingBox.clear();
    }

    move(dx: number, dy: number) {
        // check if there is multi bounding  box
        if (this._multiBoundingBox) {
            this._multiBoundingBox.move(dx, dy, this.gl);
        } else {
            for (const box of this._boundingBox) {
                box.move(dx, dy, this.gl);
            }
        }
    }
}