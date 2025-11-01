import { BoundingBoxCollisionType } from "util";
import { 
    BoundingBox, 
    MultiBoundingBox, 
    Rect,
} from "../shapes";
import { Canvas } from "Canvas";

export class SelectionManager {
    private canvas: Canvas;
    private _selected: Set<Rect> = new Set();
    private _boundingBox: Set<BoundingBox> = new Set();
    private _multiBoundingBox : MultiBoundingBox;
    renderDirtyFlag = true;

    private gl: WebGLRenderingContext;
    private rectProgram: WebGLProgram;

    get selected(): Rect[] { return Array.from(this._selected); }
    set selected(shapes: Rect[]) {
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
    constructor(gl: WebGLRenderingContext, program: WebGLProgram, canvas: Canvas) {
        this.gl = gl;
        this.rectProgram = program;
        this.canvas = canvas;
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
                this._multiBoundingBox = new MultiBoundingBox([], this.canvas.worldMatrix);
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
            const ans = this._multiBoundingBox.hitTest(wx, wy, this.canvas.worldMatrix);
            if (ans) {
                return ans;
            }            
        }

        for (const box of this._boundingBox.values()) {
            const ans = box.hitTest(wx, wy, this.canvas.worldMatrix);
            if (ans) {
                return ans;
            }
        }

        return null;
    }

    /**
     * Update the existing bounding boxes
     */
    update() {
        this._boundingBox.forEach(box => box.update());

        if (this._multiBoundingBox) {
            this._multiBoundingBox.update(this.canvas.worldMatrix);
        }
    }

    render() {
        if (this.renderDirtyFlag) {
            this.gl.useProgram(this.rectProgram);
            this._boundingBox.forEach(box => box.render(this.gl, this.rectProgram));
        }

        if (this._multiBoundingBox) {
            this._multiBoundingBox.render(this.gl, this.rectProgram, this.canvas.worldMatrix);
        }
    }

    clear() {
        this._selected.clear();
        this._boundingBox.clear();
        this._multiBoundingBox = null;
    }

    move(dx: number, dy: number) {
        if (this._multiBoundingBox) {
            this._multiBoundingBox.move(dx, dy);
        } else {
            for (const box of this._boundingBox) {
                box.move(dx, dy);
            }
        }
    }

    resize(dx: number, dy: number, direction: BoundingBoxCollisionType) {
        if (this._multiBoundingBox) {
            this._multiBoundingBox.resize(dx, dy, direction);
        }

        for (const box of this._boundingBox) {
            if (this._multiBoundingBox) {
                box.update();
            } else {
                box.resize(dx, dy, direction);
            }
        }
    }
}