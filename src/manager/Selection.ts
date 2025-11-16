import { 
    BoundingBoxCollisionType, 
    convertToPNG, 
    getWorldCoords, 
    mergeMultiImg, 
    oppositeCorner,
} from "../util";
import { Img, Rect } from "../shapes";
import { Canvas } from "Canvas";
import { Point } from "boundingBox/type";
import { 
    BoundingBox, 
    MarqueeSelectionBox, 
    MultiBoundingBox,
} from "../boundingBox";
import { CanvasHistory } from "../history";
import { makeMultiAddChildCommand, makeMultiRemoveChildCommand } from "./SceneCommand";

export class SelectionManager {
    private canvas: Canvas;
    private _selected: Set<Rect> = new Set();
    private _boundingBoxes: Set<BoundingBox> = new Set();
    private _multiBoundingBox : MultiBoundingBox;
    private _marqueeSelectionBox : MarqueeSelectionBox;
    renderDirtyFlag = true;

    private gl: WebGLRenderingContext;
    private rectProgram: WebGLProgram;
    private history: CanvasHistory;

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
    constructor(gl: WebGLRenderingContext, program: WebGLProgram, canvas: Canvas, history: CanvasHistory) {
        this.gl = gl;
        this.rectProgram = program;
        this.canvas = canvas;
        this.clear = this.clear.bind(this);
        this.deleteSelected = this.deleteSelected.bind(this);
        this.copy = this.copy.bind(this);
        this.paste = this.paste.bind(this);

        this.flipVertical = this.flipVertical.bind(this);
        this.flipHorizontal = this.flipHorizontal.bind(this);

        this.history = history;
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

    deleteSelected() {
        const toBeDeleted = [...this._selected];
        this.remove(toBeDeleted);
        for (const selected of toBeDeleted) {
            selected.destroy();
        }

        this.history.push(makeMultiRemoveChildCommand(this.canvas, toBeDeleted));
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

    isMultiBoundingBoxHit(wx: number, wy: number) {
        return this._multiBoundingBox && this._multiBoundingBox.hitTest(wx, wy, this.canvas.worldMatrix);
    }

    isBoundingBoxHit(wx: number, wy: number) {
        return (
            this._boundingBoxes.size === 1 && 
            Array.from(this._boundingBoxes)[0].hitTest(wx, wy, this.canvas.worldMatrix)
        );
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

    flipVertical() {
        if (this._multiBoundingBox) {

        } else {
            this._boundingBoxes.forEach(v => v.flipVertical());
        }
    }

    flipHorizontal() {
        if (this._multiBoundingBox) {

        } else {
            this._boundingBoxes.forEach(v => v.flipHorizontal());
        }
    }

    async copy() {
        const images = this.selected as Img[];
        if (images.length <= 0) return;
        let src: string;
    
        // multiple images
        if (images.length > 1) {
            src = await mergeMultiImg(images);
        } else {
            const image = images[0];
            src = 
                !image.src.startsWith('data:image/png')
                ? 
                await convertToPNG(image.src) :
                image.src;
        }
        
        const data = await fetch(src);
        const blob = await data.blob();
        const storedItem = new ClipboardItem({
            [blob.type]: blob
        })
    
        try {
            // can only support one item at a time
            await navigator.clipboard.write([storedItem]);
        } catch (err) {
            if (err instanceof DOMException) {
                console.log(err);
            }
            console.error(err);
        }
    }

    // there is no way currently I've found that can allow us to bypass the permission for reading from the navigator's clipboard
    // the additional confirmation is required when pasting from a different origin
    // pasting images copied from the canvas will not trigger the additional permission
    // In Chrome, the interaction is smoother as it would remember the choice when permission is given
    // In Firefox, the interaction requires an additional button press every time.
    async paste(e: PointerEvent) {
        try {
            const items = await navigator.clipboard.read();
            const types = items[0].types;

            const type = types.find(t => 
                t.startsWith('image/') 
                || t.startsWith('text/html')
            );
            if (!type) return;
            const blob = await items[0].getType(type);

            const [wx, wy] = getWorldCoords(e.clientX, e.clientY, this.canvas);
            let base64: string;

            if (type.startsWith('text/html')) {
                const el = document.createElement('html');
                el.innerHTML = await blob.text();
                const image = el.getElementsByTagName('img')[0];
                base64 = image.src;
            } else if (type.startsWith('image/svg')) {
                const svgText = await blob.text();
                base64 = await convertToPNG(`data:image/svg+xml;base64,${btoa(svgText)}`);
            } else {
                base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }
            
            const img = await this.canvas.addToCanvas(base64, wx, wy);
            this.history.push(makeMultiAddChildCommand(this.canvas, [img]));
        } catch (ex) {

        }
    }
}