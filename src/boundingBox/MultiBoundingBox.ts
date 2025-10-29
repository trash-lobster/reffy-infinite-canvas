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

interface Data {
    x: number,
    y: number,
    width: number,
    height: number,
}

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
        return {
            TOP:        { x, y, width: width * scale, height: borderSize },
            BOTTOM:     { x, y: y + height, width : width * scale, height: borderSize },
            LEFT:       { x, y, width: borderSize, height: height * scale },
            RIGHT:      { x: x + width , y, width: borderSize, height: height * scale },
            TOPLEFT:    { x: x - boxSize / scale, y: y - boxSize / scale, width: boxSize * 2, height: boxSize * 2 },
            TOPRIGHT:   { x: x - boxSize / scale + width, y: y - boxSize / scale, width: boxSize * 2, height: boxSize * 2 },
            BOTTOMLEFT: { x: x - boxSize / scale, y: y - boxSize / scale + height, width: boxSize * 2, height: boxSize * 2 },
            BOTTOMRIGHT:{ x: x - boxSize / scale + width, y: y - boxSize / scale + height, width: boxSize * 2, height: boxSize * 2 },
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

    hitTest(x: number, y: number, worldMatrix: number[]): (BoundingBoxCollisionType | null) {
        const scale = worldMatrix ? getScaleFromMatrix(worldMatrix) : 1;
        const HIT_MARGIN = 4;

        for (const type of HANDLE_TYPES) {
            const handle = this.handles.get(type);
            const config = this.getHandleConfig(type, worldMatrix);
            if (handle && this.expandedHit(config, x, y, HIT_MARGIN, scale)) {
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

    private expandedHit(config: Data, x: number, y: number, margin: number, scale: number): boolean {
        return (
            x >= config.x - margin / scale &&
            x <= config.x + config.width / scale + margin / scale &&
            y >= config.y - margin / scale &&
            y <= config.y + config.height / scale + margin / scale
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
            const [x, y] = applyMatrixToPoint(worldMatrix, config.x, config.y);

            if (handle) {
                handle.x = x;
                handle.y = y;
                handle.width = config.width;
                handle.height = config.height;
                this.isRendering = false;
            }
        }
    }
}