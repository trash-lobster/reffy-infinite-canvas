import { 
    BASE_BLUE, 
    BORDERPX, 
    HANDLEPX, 
    corners,
    sides,
    createOrderedByStartX, 
    createOrderedByStartY, 
    OrderedList,
    createOrderedByEndX,
    createOrderedByEndY,
    BoundingBoxCollisionType,
    applyMatrixToPoint,
    getScaleFromMatrix,
} from "../util";
import { Rect } from "../shapes/Rect";

const HANDLE_TYPES: BoundingBoxCollisionType[] = [...corners, ...sides] as BoundingBoxCollisionType[];

export class MultiBoundingBox {
    targets: Set<Rect> = new Set();
    x: number;
    y: number;
    width: number;
    height: number;
    handles: Map<string, Rect> = new Map(); // unlike regular bounding box, since there is no different modes, there is no need to distinguish sidess and corners
    borderSize: number = 0;
    boxSize: number = 0;
    isRendering = false;

    orderByMinX: OrderedList = createOrderedByStartX();
    orderByMinY: OrderedList = createOrderedByStartY();
    orderByMaxX: OrderedList = createOrderedByEndX();
    orderByMaxY: OrderedList = createOrderedByEndY();

    constructor(shapes?: Rect[], worldMatrix?: number[]) {
        if (shapes) shapes.forEach(shape => this.add(shape));
        this.addHandles(worldMatrix);
    }

    private getHandleConfig(type: string, worldMatrix? : number[]) {
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;
        let { x, y, width, height, borderSize, boxSize } = this;
        [x, y] = applyMatrixToPoint(worldMatrix, x, y);
        return {
            TOP:        { x, y, width: width * scale, height: borderSize },
            BOTTOM:     { x, y: y + height * scale, width : width * scale, height: borderSize },
            LEFT:       { x, y, width: borderSize, height: height * scale },
            RIGHT:      { x: x + width * scale , y, width: borderSize, height: height * scale },
            TOPLEFT:    { x: x - boxSize, y: y - boxSize, width: boxSize * 2, height: boxSize * 2 },
            TOPRIGHT:   { x: x - boxSize + width * scale, y: y - boxSize, width: boxSize * 2, height: boxSize * 2 },
            BOTTOMLEFT: { x: x - boxSize, y: y - boxSize + height * scale, width: boxSize * 2, height: boxSize * 2 },
            BOTTOMRIGHT:{ x: x - boxSize + width * scale, y: y - boxSize + height * scale, width: boxSize * 2, height: boxSize * 2 },
        }[type];
    }

    add(shape: Rect) {
        this.targets.add(shape);
        this.orderByMinX.add(shape);
        this.orderByMinY.add(shape);
        this.orderByMaxX.add(shape);
        this.orderByMaxY.add(shape);
    }

    remove(shape: Rect) {
        this.targets.delete(shape);
        this.orderByMinX.remove(shape);
        this.orderByMinY.remove(shape);
        this.orderByMaxX.remove(shape);
        this.orderByMaxY.remove(shape);
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram, worldMatrix: number[]): void {
        this.update(worldMatrix);

        for (const [key, handle] of this.handles.entries()) {
            handle.render(gl, program);
        }
    }

    update(worldMatrix: number[]) {
        this.borderSize = BORDERPX;
        this.boxSize = HANDLEPX / 2;

        this.recalculateBounds();
        this.updateHandles(worldMatrix);
    }

    destroy(gl: WebGLRenderingContext) {
        for (const [_, handle] of this.handles.entries()) {
            handle.destroy(gl);
        }
    }

    move(dx: number, dy: number) {
        for (const target of this.targets) {
            target.x += dx;
            target.y += dy;
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

    hitTest(x: number, y: number): (BoundingBoxCollisionType | null) {
        const HIT_MARGIN = 4;

        for (const type of HANDLE_TYPES) {
            const handle = this.handles.get(type);
            if (handle && this.expandedHit(handle, x, y, HIT_MARGIN)) {
                return type;
            }
        }

        if (
            x >= this.x &&
            x <= this.x + this.width &&
            y >= this.y &&
            y <= this.y + this.height
        ) return 'CENTER';
        return null;
    }

    private recalculateBounds() {
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

    private addHandles(worldMatrix?: number[]) {
        for (const type of HANDLE_TYPES) {            
            const config = this.getHandleConfig(type, worldMatrix);
            const rect = new Rect(config);
            rect.color = BASE_BLUE;
            this.handles.set(type, rect);
        }
    }

    private updateHandles(worldMatrix?: number[]) {
        for (const type of HANDLE_TYPES) {
            const config = this.getHandleConfig(type, worldMatrix);
            const handle = this.handles.get(type);

            if (handle) {
                handle.x = config.x;
                handle.y = config.y;
                handle.width = config.width;
                handle.height = config.height;
                this.isRendering = false;
            }
        }
    }
}