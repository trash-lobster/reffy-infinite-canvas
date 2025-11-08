import { 
    BASE_BLUE, 
    BORDERPX, 
    HANDLEPX, 
    corners,
    sides,
    BoundingBoxCollisionType,
    applyMatrixToPoint,
    getScalesFromMatrix,
} from "../util";
import { Rect } from "../shapes/Rect";
import { 
    OrderedList, 
    createOrderedByStartX, 
    createOrderedByStartY, 
    createOrderedByEndX, 
    createOrderedByEndY,
    getX,
    getY,
    getEndX,
    getEndY
} from "./OrderedList";

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
    scale: number[];

    orderByMinX: OrderedList = createOrderedByStartX();
    orderByMinY: OrderedList = createOrderedByStartY();
    orderByMaxX: OrderedList = createOrderedByEndX();
    orderByMaxY: OrderedList = createOrderedByEndY();

    constructor(shapes?: Rect[]) {
        this.scale = [1, 1];
        if (shapes) shapes.forEach(shape => this.add(shape));
        this.addHandles();
    }

    private getHandleConfig(type: string) {
        let { x, y, width, height, borderSize, boxSize } = this;

        return {
            TOP: {
                x, 
                y, 
                width: width,
                height: borderSize 
            },
            BOTTOM: { 
                x,
                y: y + height,
                width : width, 
                height: borderSize
            },
            LEFT: { 
                x, 
                y, 
                width: borderSize, 
                height: height 
            },
            RIGHT: { 
                x: x + width,
                y, 
                width: borderSize, 
                height: height 
            },
            TOPLEFT: { 
                x: x - boxSize,
                y: y - boxSize, 
                width: boxSize * 2, 
                height: boxSize * 2 
            },
            TOPRIGHT: { 
                x: x - boxSize + width, 
                y: y - boxSize, 
                width: boxSize * 2, 
                height: boxSize * 2 
            },
            BOTTOMLEFT: { 
                x: x - boxSize, 
                y: y - boxSize + height, 
                width: boxSize * 2, 
                height: boxSize * 2 
            },
            BOTTOMRIGHT: { 
                x: x - boxSize + width, 
                y: y - boxSize + height, 
                width: boxSize * 2, 
                height: boxSize * 2 
            },
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

    render(gl: WebGLRenderingContext, program: WebGLProgram): void {
        this.update();

        for (const [key, handle] of this.handles.entries()) {
            handle.render(gl, program);
        }
    }

    update() {
        this.borderSize = BORDERPX;
        this.boxSize = HANDLEPX / 2;

        this.recalculateBounds();
        this.updateHandles();
    }

    destroy(gl: WebGLRenderingContext) {
        for (const [_, handle] of this.handles.entries()) {
            handle.destroy(gl);
        }
    }

    move(dx: number, dy: number) {
        for (const target of this.targets) {
            target.setTranslation(dx, dy);
        }
    }

    // dx and dy are in world units
    resize(
        dx: number, 
        dy: number, 
        direction: BoundingBoxCollisionType,
        parentMatrix: number[],
    ) {
        const prevW = this.width;
        const prevH = this.height;
        
        const anchorX = direction.includes('LEFT') ? this.x + prevW : this.x;
        const anchorY = direction.includes('TOP') ? this.y + prevH : this.y;
        
        const min = 1e-6;
        const prevWorldW = Math.abs(prevW) < min ? (prevW < 0 ? -min : min) : prevW;
        const prevWorldH = Math.abs(prevH) < min ? (prevH < 0 ? -min : min) : prevH;
        
        const [worldScaleX, worldScaleY] = getScalesFromMatrix(parentMatrix);
        const changeInXScale = (dx * worldScaleX) / prevWorldW;
        const changeInYScale = (dy * worldScaleY) / prevWorldH;

        let mulSX = direction.includes('LEFT') ? 1 - changeInXScale : direction.includes('RIGHT')  ? 1 + changeInXScale : 1;
        let mulSY = direction.includes('TOP')  ? 1 - changeInYScale : direction.includes('BOTTOM') ? 1 + changeInYScale : 1;

        mulSX = Math.abs(mulSX) < min ? (mulSX < 0 ? -min : min) : mulSX;
        mulSY = Math.abs(mulSY) < min ? (mulSY < 0 ? -min : min) : mulSY;

        for (const target of this.targets) {
            const tx = target.translation[0];
            const ty = target.translation[1];

            const [wtx, wty] = applyMatrixToPoint(parentMatrix, tx, ty);

            const newWtx = anchorX + (wtx - anchorX) * mulSX;
            const newWty = anchorY + (wty - anchorY) * mulSY;

            const dWx = newWtx - wtx;
            const dWy = newWty - wty;

            const sX = Math.abs(worldScaleX) < min ? (worldScaleX < 0 ? -min : min) : worldScaleX;
            const sY = Math.abs(worldScaleY) < min ? (worldScaleY < 0 ? -min : min) : worldScaleY;
            const dLx = dWx / sX;
            const dLy = dWy / sY;

            target.setScale(mulSX, mulSY);
            target.setTranslation(dLx, dLy);
        }

        this.scale[0] = this.scale[0] * mulSX < 0 ? -1 : 1;
        this.scale[1] = this.scale[1] * mulSY < 0 ? -1 : 1;
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
        const [hx, hy] = applyMatrixToPoint(worldMatrix, x, y);
        const HIT_MARGIN = 4;

        for (const type of HANDLE_TYPES) {
            const config = this.getHandleConfig(type);
            if (
                hx >= config.x - HIT_MARGIN &&
                hx <= config.x + config.width + HIT_MARGIN &&
                hy >= config.y - HIT_MARGIN &&
                hy <= config.y + config.height + HIT_MARGIN
            ) {
                return type as BoundingBoxCollisionType;
            }
        }

        const bx1 = Math.min(this.x, this.x + this.width);
        const bx2 = Math.max(this.x, this.x + this.width);
        const by1 = Math.min(this.y, this.y + this.height);
        const by2 = Math.max(this.y, this.y + this.height);

        if (hx >= bx1 && hx <= bx2 && hy >= by1 && hy <= by2) {
            return 'CENTER';
        }
    }

    private recalculateBounds() {
        const minX = this.scale[0] < 0 ? this.orderByMaxX.getMax() : this.orderByMinX.getMin();
        const minY = this.scale[1] < 0 ? this.orderByMaxY.getMax() : this.orderByMinY.getMin();
        const maxX = this.scale[0] < 0 ? this.orderByMinX.getMin() : this.orderByMaxX.getMax();
        const maxY = this.scale[1] < 0 ? this.orderByMinY.getMin() : this.orderByMaxY.getMax();

        this.x = this.scale[0] < 0 ? getEndX(maxX): getX(minX);
        this.y = this.scale[1] < 0 ? getEndY(maxY): getY(minY);

        this.width = this.scale[0] * (getEndX(maxX) - getX(minX));
        this.height = this.scale[1] * (getEndY(maxY) - getY(minY));
    }

    private addHandles() {
        for (const type of HANDLE_TYPES) {            
            const config = this.getHandleConfig(type);
            const rect = new Rect(config);
            rect.color = BASE_BLUE;
            this.handles.set(type, rect);
        }
    }

    private updateHandles() {
        for (const type of HANDLE_TYPES) {
            const handle = this.handles.get(type);
            const config = this.getHandleConfig(type);

            if (handle) {
                handle.translation[0] = config.x;
                handle.translation[1] = config.y;
                handle.width = config.width;
                handle.height = config.height;
            }
        }
    }
}