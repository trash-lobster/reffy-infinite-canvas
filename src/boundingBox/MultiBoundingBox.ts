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
import { PositionData } from "./type";
import { 
    OrderedList, 
    createOrderedByStartX, 
    createOrderedByStartY, 
    createOrderedByEndX, 
    createOrderedByEndY,
    getX,
    getY,
    getWidth,
    getHeight,
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
    isRendering = false;

    orderByMinX: OrderedList = createOrderedByStartX();
    orderByMinY: OrderedList = createOrderedByStartY();
    orderByMaxX: OrderedList = createOrderedByEndX();
    orderByMaxY: OrderedList = createOrderedByEndY();

    constructor(shapes?: Rect[]) {
        if (shapes) shapes.forEach(shape => this.add(shape));
        this.addHandles();
    }

    private getHandleConfig(type: string) {
        // calculate it based on world point
        let { x, y, width, height, borderSize, boxSize } = this;
        return {
            TOP:        { x, y, width: width, height: borderSize },
            BOTTOM:     { x, y: y + height, width : width, height: borderSize },
            LEFT:       { x, y, width: borderSize, height: height },
            RIGHT:      { x: x + width , y, width: borderSize, height: height },
            TOPLEFT:    { x: x - boxSize, y: y - boxSize, width: boxSize * 2, height: boxSize * 2 },
            TOPRIGHT:   { x: x - boxSize + width, y: y - boxSize, width: boxSize * 2, height: boxSize * 2 },
            BOTTOMLEFT: { x: x - boxSize, y: y - boxSize + height, width: boxSize * 2, height: boxSize * 2 },
            BOTTOMRIGHT:{ x: x - boxSize + width, y: y - boxSize + height, width: boxSize * 2, height: boxSize * 2 },
        }[type];
    }

    add(shape: Rect) {
        this.targets.add(shape);
        this.orderByMinX.add(shape);
        this.orderByMinY.add(shape);
        this.orderByMaxX.add(shape);
        this.orderByMaxY.add(shape);

        console.log('Add image');
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

    resize(
        dx: number, 
        dy: number, 
        direction: BoundingBoxCollisionType,
    ) {
        // let scaleX = (this.width + dx) / this.width;
        // let scaleY = (this.height + dy) / this.height;

        // let anchorX = this.x;
        // let anchorY = this.y;

        // if (direction.includes('TOP')) {
        //     anchorY = this.y + this.height;
        //     const newHeight = this.height - dy;
        //     scaleY = newHeight / this.height;
        // }

        // if (direction.includes('LEFT')) {
        //     anchorX = this.x + this.width;
        //     const newWidth = this.width - dx;
        //     scaleX = newWidth / this.width;
        // }

        // for (const target of this.targets) {
        //     const offsetX = target.x - anchorX;
        //     const offsetY = target.y - anchorY;

        //     target.x = direction === 'BOTTOM' || direction === 'TOP' ? target.x : anchorX + offsetX * scaleX;
        //     target.y = direction === 'LEFT' || direction === 'RIGHT' ? target.y : anchorY + offsetY * scaleY;
        //     target.width *= direction === 'BOTTOM' || direction === 'TOP' ? 1 : scaleX;
        //     target.height *= direction === 'LEFT' || direction === 'RIGHT' ? 1 :scaleY;
        // }

        // this.height += dy;
        // this.width += dx;
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
        const [scaleX, scaleY] = worldMatrix ? getScalesFromMatrix(worldMatrix) : [1, 1];
        const HIT_MARGIN = 4;

        for (const type of HANDLE_TYPES) {
            const handle = this.handles.get(type);
            const config = this.getHandleConfig(type);
            if (handle && this.expandedHit(config, x, y, HIT_MARGIN, scaleX, scaleY)) {
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

        this.x = getX(minX);
        this.y = getY(minY);

        this.width = getEndX(maxX) - getX(minX);
        this.height = getEndY(maxY) - getY(minY);
    }

    private expandedHit(config: PositionData, x: number, y: number, margin: number, scaleX: number, scaleY: number): boolean {
        return (
            x >= config.x - margin / scaleX &&
            x <= config.x + config.width / scaleX + margin / scaleX &&
            y >= config.y - margin / scaleY &&
            y <= config.y + config.height / scaleY + margin / scaleY
        );
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
                this.isRendering = false;
            }
        }
    }
}