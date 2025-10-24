import { 
    BASE_BLUE, 
    BORDERPX, 
    corners,
    HANDLEPX, 
    sides,
    createOrderedByStartX, 
    createOrderedByStartY, 
    OrderedList,
    createOrderedByEndX,
    createOrderedByEndY,
} from "../util";
import { Rect } from "./Rect";

export class MultiBoundingBox {
    targets: Rect[] = [];
    x: number;
    y: number;
    width: number;
    height: number;
    handles: Map<string, Rect> = new Map(); // unlike regular bounding box, since there is no different modes, there is no need to distinguish sidess and corners
    borderSize: number = 0;
    boxSize: number = 0;

    // organise by the individual values
    orderByMinX: OrderedList;
    orderByMinY: OrderedList;
    orderByMaxX: OrderedList;
    orderByMaxY: OrderedList;

    constructor(shapes?: Rect[]) {
        this.orderByMinX = createOrderedByStartX();
        this.orderByMinY = createOrderedByStartY();
        this.orderByMaxX = createOrderedByEndX();
        this.orderByMaxY = createOrderedByEndY();

        if (shapes) shapes.forEach(shape => this.add(shape));
        this.addHandles();
    }

    getBoundingBoxHandles = {
        TOP: () => ({
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.borderSize,
        }),
        BOTTOM: () => ({
            x: this.x,
            y: this.y + this.height - this.borderSize,
            width: this.width,
            height: this.borderSize,
        }),
        LEFT: () => ({
            x: this.x,
            y: this.y,
            width: this.borderSize,
            height: this.height
        }),
        RIGHT: () => ({
            x: this.x + this.width - this.borderSize,
            y: this.y,
            width: this.borderSize,
            height: this.height
        }),
        TOPLEFT: () => ({
            x: this.x - this.boxSize,
            y: this.y - this.boxSize,
            width: this.boxSize * 2,
            height: this.boxSize * 2,
        }),
        TOPRIGHT: () => ({
            x: this.x - this.boxSize + this.width,
            y: this.y - this.boxSize,
            width: this.boxSize * 2,
            height: this.boxSize * 2,
        }),
        BOTTOMLEFT: () => ({
            x: this.x - this.boxSize,
            y: this.y - this.boxSize + this.height,
            width: this.boxSize * 2,
            height: this.boxSize * 2,
        }),
        BOTTOMRIGHT: () => ({
            x: this.x - this.boxSize + this.width,
            y: this.y - this.boxSize + this.height,
            width: this.boxSize * 2,
            height: this.boxSize * 2,
        }),
    };

    add(shape: Rect) {
        this.targets.push(shape);
        this.orderByMinX.add(shape);
        this.orderByMinY.add(shape);
        this.orderByMaxX.add(shape);
        this.orderByMaxY.add(shape);

        this.recalculateProperties();
    }

    remove(shape: Rect) {
        const idx = this.targets.indexOf(shape);
        this.targets.splice(idx, 0);
        this.orderByMinX.remove(shape);
        this.orderByMinY.remove(shape);
        this.orderByMaxX.remove(shape);
        this.orderByMaxY.remove(shape);

        this.recalculateProperties();
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram): void {
        this.update();

        for (const [key, handle] of this.handles.entries()) {
            handle.render(gl, program);
        }
    }

    update() {
        this.borderSize = BORDERPX;
        this.boxSize = HANDLEPX / 2;

        // if (cameraZoom) {
        // }

        for (const type of [...corners, ...sides]) {
            if (Object.keys(this.getBoundingBoxHandles).includes(type)) {
                const side = this.getBoundingBoxHandles[type]();
                const handle = this.handles.get(type);
                if (handle) {
                    handle.x = side.x;
                    handle.y = side.y;
                    handle.width = side.width;
                    handle.height = side.height;
                }
            }
        }

        this.recalculateProperties();
    }

    destroy(gl: WebGLRenderingContext) {
        for (const [_, handle] of this.handles.entries()) {
            handle.destroy(gl);
        }
    }

    getPositions(): number[] {
        return [
            this.x, this.y, // Top-left
            this.x + this.width, this.y, // Top-right
            this.x + this.width, this.y + this.height, // Bottom-right
            this.x, this.y + this.height // Bottom-left
        ];
    }

    hitHandleTest(x: number, y: number) {
        const HIT_MARGIN = 4;

        for (const type of [...sides, ...corners]) {
            const handle = this.handles.get(type);
            if (handle && this.expandedHit(handle, x, y, HIT_MARGIN)) {
                return type;
            }
        }
        return null;
    }

    hitTest(x: number, y: number) {
        return (
            x >= this.x &&
            x <= this.x + this.width &&
            y >= this.y &&
            y <= this.y + this.height
        );
    }

    // TODO: fix the problem with the width and height
    private recalculateProperties() {
        const minX = this.orderByMinX.getMin();
        const minY = this.orderByMinY.getMin();
        const maxX = this.orderByMaxX.getMax();
        const maxY = this.orderByMaxY.getMax();

        this.x = minX.x;
        this.y = minY.y;

        this.width = maxX.width + maxX.x - minX.x;
        this.height = maxY.height + maxY.y - minY.y;
    }

    private expandedHit(handle: Rect, x: number, y: number, margin: number): boolean {
        return (
            x >= handle.x - margin &&
            x <= handle.x + handle.width + margin &&
            y >= handle.y - margin &&
            y <= handle.y + handle.height + margin
        );
    }

    private addHandles() {
        for (const type of [...corners, ...sides]) {            
            if (Object.keys(this.getBoundingBoxHandles).includes(type)) {
                const r = new Rect(this.getBoundingBoxHandles[type]());
                r.color = BASE_BLUE;
                this.handles.set(type, r);
            }
        }
    }
}