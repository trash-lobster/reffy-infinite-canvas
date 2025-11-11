import { BoundingBoxCollisionType, oppositeCorner } from "../util";
import { Rect } from "../shapes";
import { Canvas } from "Canvas";
import { Point } from "boundingBox/type";
import { 
    BoundingBox, 
    MarqueeSelectionBox, 
    MultiBoundingBox,
} from "../boundingBox";

export class SelectionManager {
    private canvas: Canvas;
    private _selected: Set<Rect> = new Set();
    private _boundingBoxes: Set<BoundingBox> = new Set();
    private _multiBoundingBox : MultiBoundingBox;
    private _marqueeSelectionBox : MarqueeSelectionBox;
    renderDirtyFlag = true;

    private gl: WebGLRenderingContext;
    private rectProgram: WebGLProgram;

    get selected(): Rect[] { return Array.from(this._selected); }
    set selected(shapes: Rect[]) {
        this._selected.clear();

        shapes.forEach(shape => {
            this._selected.add(shape)
            this._boundingBoxes.add(new BoundingBox(shape));
        });
    }

    get marqueeBox(): MarqueeSelectionBox { return this._marqueeSelectionBox };
    set marqueeBox(startingPoint: Point) {
        this._marqueeSelectionBox = new MarqueeSelectionBox(startingPoint.x, startingPoint.y, this.canvas.worldMatrix);
    }

    /**
     * @param gl 
     * @param program Add reference to program to allow easy linking
     */
    constructor(gl: WebGLRenderingContext, program: WebGLProgram, canvas: Canvas) {
        this.gl = gl;
        this.rectProgram = program;
        this.canvas = canvas;
        this.clear = this.clear.bind(this);
    }

    // add, remove selected
    add(shapes: Rect[]) {
        shapes.forEach(shape => {
            if (!this._selected.has(shape)) {
                this._selected.add(shape);
                this._boundingBoxes.add(new BoundingBox(shape));
            }
        })

        if (this._boundingBoxes.size > 1) {
            this._boundingBoxes.forEach(box => box.setPassive());
            
            if (!this._multiBoundingBox) {
                this._multiBoundingBox = new MultiBoundingBox([]);
            }

            this.selected.forEach(shape => this._multiBoundingBox.add(shape));
        }
    }

    remove(shapes: Rect[]) {
        shapes.forEach(shape => {
            if (!this._selected.has(shape)) return;
            this._selected.delete(shape);
            const matchingBoundingBox = Array.from(this._boundingBoxes.values()).find(box => box.target === shape);
            if (matchingBoundingBox) {
                this._boundingBoxes.delete(matchingBoundingBox);
            } else {
                console.error('No matching bounding box found');
            }

            if (this._multiBoundingBox) {
                this._multiBoundingBox.remove(shape);
            }
        })

        if (this._boundingBoxes.size <= 1) {
            this._boundingBoxes.forEach(box => box.setActive());
            this._multiBoundingBox = null;
        }
    }

    /**
     * Checks first if there is a hit in a multibounding and its handles. If not, check the one bounding box that is active.
     */
    hitTest(wx: number, wy: number): (BoundingBoxCollisionType | null) {        
        if (this._multiBoundingBox) {
            const ans = this._multiBoundingBox.hitTest(wx, wy, this.canvas.worldMatrix);
            if (ans) return ans;
        }

        for (const box of this._boundingBoxes.values()) {
            const ans = box.hitTest(wx, wy, this.canvas.worldMatrix);
            if (ans) return ans;
        }

        return null;
    }

    hitTestAdjustedCorner(wx: number, wy: number) {
        if (this._multiBoundingBox) {
            const ans = this._multiBoundingBox.hitTest(wx, wy, this.canvas.worldMatrix);
            if (ans) {
                if (this._multiBoundingBox.scale[0] * this._multiBoundingBox.scale[1] < 0) {
                    return oppositeCorner(ans);
                }
                return ans;
            }
        }

        for (const box of this._boundingBoxes.values()) {
            const ans = box.hitTest(wx, wy, this.canvas.worldMatrix);
            if (ans) {
                if (box.target.sx * box.target.sy < 0) {
                    return oppositeCorner(ans);
                }
                return ans;
            }
        }
    }

    /**
     * Update the existing bounding boxes
     */
    update() {
        this._boundingBoxes.forEach(box => box.update());

        if (this._multiBoundingBox) {
            this._multiBoundingBox.update();
        }
    }

    render() {
        if (this.renderDirtyFlag) {
            this.gl.useProgram(this.rectProgram);
            this._boundingBoxes.forEach(box => box.render(this.gl, this.rectProgram));
        }

        if (this._multiBoundingBox) {
            this._multiBoundingBox.render(this.gl, this.rectProgram);
        }

        if (this._marqueeSelectionBox) {
            this._marqueeSelectionBox.render(this.gl, this.rectProgram);
        }
    }

    clear() {
        this._selected.clear();
        this._boundingBoxes.clear();
        this._multiBoundingBox = null;
    }

    clearMarquee() {
        this._marqueeSelectionBox.hitTest(this.canvas);
        this._marqueeSelectionBox = null;
    }

    move(dx: number, dy: number) {
        if (this._multiBoundingBox) {
            this._multiBoundingBox.move(dx, dy);
        } else {
            for (const box of this._boundingBoxes) {
                box.move(dx, dy);
            }
        }
    }

    /**
     * Based on the corner you're dragging and the sign of the scaleX and scaleY values, there are only four possible sets of changes to the target's translation.
     * 1) absolutely no change
     * 2) x translation change only if negative delta
     * 3) y translation change only if negative delta
     * 4) x and y translation change if negative delta
     * The tricky part is to consider the signs of the scale values and determine which corner is going to inhabit which behaviour.
     * @param dx 
     * @param dy 
     * @param direction 
     */
    resize(dx: number, dy: number, direction: BoundingBoxCollisionType) {
        if (this._multiBoundingBox) {
            this._multiBoundingBox.resize(dx, dy, direction, this.canvas.worldMatrix);
        }

        for (const box of this._boundingBoxes) {
            if (this._multiBoundingBox) {
                box.update();
            } else {
                box.resize(dx, dy, direction);
            }
        }
    }
}