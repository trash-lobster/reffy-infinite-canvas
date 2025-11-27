import { 
    BASE_BLUE, 
    BORDERPX, 
    HANDLEPX, 
    corners,
    sides,
    BoundingBoxCollisionType,
    applyMatrixToPoint,
    getScalesFromMatrix,
    willFlip,
} from "../util";
import {
    AlignDirection,
    FlipDirection,
    FlipSnapshotItem,
    NormalizeOption,
    NormalizeMode,
    TransformSnapshotItem,
} from "../manager";
import { Rect } from "../shapes";

const HANDLE_TYPES: BoundingBoxCollisionType[] = [...corners, ...sides] as BoundingBoxCollisionType[];

export class MultiBoundingBox {
    targets: Rect[] = [];
    x: number;
    y: number;
    width: number;
    height: number;
    handles: Map<string, Rect> = new Map(); // unlike regular bounding box, since there is no different modes, there is no need to distinguish sidess and corners
    borderSize: number = 0;
    boxSize: number = 0;
    scale: number[];

    constructor(shapes?: Rect[]) {
        this.scale = [1, 1];
        if (shapes) shapes.forEach(shape => this.add(shape));
        this.addHandles();
    }

    add(shape: Rect) {
        if (!this.targets.includes(shape)) {
            this.targets.push(shape);
        }
    }

    remove(shape: Rect) {
        const idx = this.targets.indexOf(shape);
        if (idx != -1) this.targets.splice(idx, 1);
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

    destroy() {
        for (const [_, handle] of this.handles.entries()) {
            handle.destroy();
        }
    }

    move(dx: number, dy: number) {
        for (const target of this.targets) {
            target.updateTranslation(dx, dy);
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

        const isTop = direction.includes('TOP');
        const isBottom = direction.includes('BOTTOM');
        const isLeft = direction.includes('LEFT');
        const isRight = direction.includes('RIGHT');

        const anchorX = isLeft ? this.x + prevW : isRight ? this.x : this.x + prevW / 2;
        const anchorY = isTop ? this.y + prevH : isBottom ? this.y : this.y + prevH / 2;
        
        const min = 1e-6;
        const prevWorldW = Math.abs(prevW) < min ? (prevW < 0 ? -min : min) : prevW;
        const prevWorldH = Math.abs(prevH) < min ? (prevH < 0 ? -min : min) : prevH;
        
        const [worldScaleX, worldScaleY] = getScalesFromMatrix(parentMatrix);
        const changeInXScale = (dx * worldScaleX) / prevWorldW;
        const changeInYScale = (dy * worldScaleY) / prevWorldH;

        const factor = 
            direction.includes('LEFT') ? 1 - changeInXScale :
            direction.includes('RIGHT') ? 1 + changeInXScale :
            direction === 'TOP' ? 1 - changeInYScale :
            1 + changeInYScale;

        if (willFlip(this.scale[0], factor, min) || willFlip(this.scale[1], factor, min)) return;
        const nextW = prevW * factor;
        const nextH = prevH * factor;
        if (Math.abs(nextW) < min || Math.abs(nextH) < min) return;

        for (const target of this.targets) {
            const tx = target.x;
            const ty = target.y;

            const [wtx, wty] = applyMatrixToPoint(parentMatrix, tx, ty);

            const newWtx = anchorX + (wtx - anchorX) * factor;
            const newWty = anchorY + (wty - anchorY) * factor;

            const dWx = newWtx - wtx;
            const dWy = newWty - wty;

            const sX = Math.abs(worldScaleX) < min ? (worldScaleX < 0 ? -min : min) : worldScaleX;
            const sY = Math.abs(worldScaleY) < min ? (worldScaleY < 0 ? -min : min) : worldScaleY;
            const dLx = dWx / sX;
            const dLy = dWy / sY;

            target.updateScale(factor, factor);
            target.updateTranslation(dLx, dLy);
        }
    }

    flip(
        worldMatrix: number[], 
        direction: FlipDirection, 
        getWorldCoords: (x: number, y: number) => number[],
    ) {
        const [worldScaleX, worldScaleY] = getScalesFromMatrix(worldMatrix);

        const transformArray: FlipSnapshotItem[] = [];

        const [wtx, wty] = getWorldCoords(this.x, this.y);
        const bboxCenterX = wtx + this.width / worldScaleX / 2;
        const bboxCenterY = wty + this.height / worldScaleY / 2;

        for (const target of this.targets) {
            const transform: FlipSnapshotItem = {
                ref: target,
                start: { x: target.x, y: target.y, sx: target.sx, sy: target.sy, },
            }

            if (direction === 'vertical') {
                const scaleH = target.height * target.sy;
                target.setTranslation(
                    target.x,
                    bboxCenterY - (target.y - bboxCenterY) - scaleH
                );
                target.flipVertical(target.height);
            } else {
                const scaleW = target.width * target.sx;
                target.setTranslation(
                    bboxCenterX - (target.x - bboxCenterX) - scaleW,
                    target.y
                );
                target.flipHorizontal(target.width);
            }

            transform.end = { x: target.x, y: target.y, sx: target.sx, sy: target.sy, };
            transformArray.push(transform);
        }

        return transformArray;
    }

    align(direction: AlignDirection) {
        if (this.targets.length <= 1) return;

        const transformArray: TransformSnapshotItem[] = [];

        const dir = [
            direction === 'top' ? 1 : direction === 'bottom' ? -1 : 0,
            direction === 'left' ? 1 : direction === 'right' ? -1 : 0
        ]

        let aim = dir[0] !== 0 ? Infinity * dir[0] : Infinity * dir[1];
        
        for (const [k, v] of this.targets.entries()) {
            const box = v.getBoundingBox();
            aim = 
                direction === 'top' || direction === 'left' ? 
                    Math.min(direction === 'top' ? box.minY : box.minX, aim) : 
                    Math.max(direction === 'bottom' ? box.maxY : box.maxX, aim);
        }

        for (const target of this.targets) {
            const transform: TransformSnapshotItem = {
                ref: target,
                start: { x: target.x, y: target.y, sx: target.sx, sy: target.sy, },
            }
            const aabb = target.getBoundingBox();
            target.updateTranslation(
                direction === 'top' || direction === 'bottom' ? 
                    0 : 
                    aim - (direction === 'left' ? aabb.minX : aabb.maxX), 
                direction === 'top' || direction === 'bottom' ? 
                    aim - (direction === 'top' ? aabb.minY : aabb.maxY) :
                    0 
            );
            transform.end = { x: target.x, y: target.y, sx: target.sx, sy: target.sy, };
            transformArray.push(transform);
        }

        return transformArray;
    }

    normalize(type: NormalizeOption, mode: NormalizeMode) {
        const transformArray: TransformSnapshotItem[] = [];

        const reference = this.targets[0];
        const goal = 
            type === 'height' ? mode === 'first' ? 
                (reference.height * reference.sy) : 
                    this.targets.reduce((a, b) => a + Math.abs(b.height * b.sy), 0) / this.targets.length :
            type === 'width' ? mode === 'first' ? 
                reference.width * reference.sx : 
                    this.targets.reduce((a, b) => a + Math.abs(b.width * b.sx), 0) / this.targets.length :
            type === 'scale' ? mode === 'first' ? 
                reference.sx : 
                    this.targets.reduce((a, b) => a + Math.abs(b.sx), 0) / this.targets.length :
            mode === 'first' ? 
                reference.width * reference.height * reference.sx * reference.sy : 
                    this.targets.reduce((a, b) => a + Math.abs(b.sx * b.width * b.height * b.sy), 0) / this.targets.length; // size calculation aims to get the same area for both

        console.log(goal);

        for (const target of this.targets) {
            const transform: TransformSnapshotItem = {
                ref: target,
                start: { x: target.x, y: target.y, sx: target.sx, sy: target.sy, },
            };

            // origin of transformation is the center of the rect
            const center = [
                (target.x + target.width * target.sx) / 2,
                (target.y + target.height * target.sy) / 2,
            ]

            if (type === 'height') {
                const currH = target.height * target.sy;
                const scale = Math.abs(goal / currH);
                target.updateScale(scale, scale);
            } else if (type === 'width') {
                const currw = target.width * target.sx;
                const scale = Math.abs(goal / currw);
                target.updateScale(scale, scale);
            } else if (type === 'scale') {
                // keep existing scale direction
                const signX = Math.sign(target.sx);
                const signY = Math.sign(target.sy);
                target.setScale(goal * signX, goal * signY);
            } else if (type === 'size') {
                // get current area
                const currentArea = target.width * target.height * target.sx * target.sy;
                const scale = Math.sqrt(Math.abs(goal / currentArea));
                target.updateScale(scale, scale);
            }
            
            // the x and y of origin has not change, we need to move this to recenter
            const newCenter = [
                (target.x + target.width * target.sx) / 2,
                (target.y + target.height * target.sy) / 2,
            ]
            target.updateTranslation(center[0] - newCenter[0], center[1] - newCenter[1]);
            transform.end = { x: target.x, y: target.y, sx: target.sx, sy: target.sy, };
            transformArray.push(transform);
        }
        return transformArray;
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

    private getBounds() {
        const arr = Array.from(this.targets);
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const rect of arr) {
            const [ startX, startY] = applyMatrixToPoint(rect.worldMatrix);
            const [ endX, endY] = applyMatrixToPoint(rect.worldMatrix, rect.width, rect.height);


            minX = Math.min(minX, rect.sx < 0 ? endX : startX);
            minY = Math.min(minY, rect.sy < 0 ? endY : startY);
            maxX = Math.max(maxX, rect.sx < 0 ? startX : endX);
            maxY = Math.max(maxY, rect.sy < 0 ? startY : endY);
        }

        return { minX, minY, maxX, maxY };
    }

    private recalculateBounds() {
        const { minX, minY, maxX, maxY } = this.getBounds();

        this.x = this.scale[0] < 0 ? maxX : minX;
        this.y = this.scale[1] < 0 ? maxY : minY;
        this.width = this.scale[0] * (maxX - minX);
        this.height = this.scale[1] * (maxY - minY);
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
                handle.setTranslation(config.x, config.y);
                handle.width = config.width;
                handle.height = config.height;
            }
        }
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
}