import { Canvas } from "Canvas";
import { Img, Rect, Shape } from "../shapes";
import { 
    BoundingBoxCollisionType,
    getWorldCoords,
    previewImage
} from "../util";

export interface Point {
    x: number,
    y: number,
}

export enum PointerMode {
    SELECT,
    PAN,
}

const cursorMap: Record<string, string> = {
    TOP: 'ns-resize',
    BOTTOM: 'ns-resize',
    LEFT: 'ew-resize',
    RIGHT: 'ew-resize',
    TOPLEFT: 'nwse-resize',
    BOTTOMRIGHT: 'nwse-resize',
    TOPRIGHT: 'nesw-resize',
    BOTTOMLEFT: 'nesw-resize',
	CENTER: 'grab',
};

export class PointerEventManager {
    canvas: Canvas;
    lastPointerPos: Point = { x: 0, y: 0 };

    #startWorldX: number = 0;
    #startWorldY: number = 0;
    #lastWorldX: number = 0;
    #lastWorldY: number = 0;

    resizingDirection: BoundingBoxCollisionType | null = null;

    #mode: PointerMode = PointerMode.SELECT;

    constructor(canvas: Canvas) {
        this.canvas = canvas;
        
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMoveWhileDown = this.onPointerMoveWhileDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this.addOnPaste();
        this.addOnPointerMove();
        this.addOnWheel();
        this.addOnPointerDown();
        this.canvas.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    changeMode() {
        this.#mode = this.#mode === PointerMode.PAN ? PointerMode.SELECT : PointerMode.PAN;
        this.canvas._selectionManager.clear();
    }
    
    // #region Add events
    private addOnPointerDown() {
        this.canvas.canvas.addEventListener('pointerdown', this.onPointerDown);
    }
    
    // always on
    private addOnPointerMove() {
        this.canvas.canvas.addEventListener('pointermove', (e) => {
            [this.lastPointerPos.x, this.lastPointerPos.y] = getWorldCoords(e.clientX, e.clientY, this.canvas);

            let hit = this.canvas._selectionManager.hitTestAdjustedCorner(this.lastPointerPos.x, this.lastPointerPos.y);
			this.canvas.canvas.style.cursor = cursorMap[hit] || 'default';
        });
    }
    
    private addOnWheel() {
        this.canvas.canvas.addEventListener('wheel', this.canvas._camera.onWheel, { passive: false });
    }

    private addOnPaste() {
        window.addEventListener('paste', async (e) => {
            const files = e.clipboardData.files;
            const html = e.clipboardData.getData('text/html');

            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if(file.type.startsWith('image/')) {
                        try {
                            const src = await previewImage(file);
                            if (typeof src === 'string') {
                                this.canvas.appendChild(new Img({
                                    x: this.lastPointerPos.x,
                                    y: this.lastPointerPos.y,
                                    src: src,
                                }))
                            } else console.log('Image not added');
                        } catch {
                            console.error('Failed to copy image.');
                        }
                    }
                }
            } else if (html) {
                const el = document.createElement('html');
                el.innerHTML = html;
                const images = el.getElementsByTagName('img');
                for (let i = 0; i < images.length; i++) {
                    const image = images[i];
                    this.canvas.appendChild(new Img({
                        x: this.lastPointerPos.x,
                        y: this.lastPointerPos.y,
                        src: image.src,
                    }))
                }
            }
        });
    }
    // #endregion

    private onPointerDown(e: PointerEvent) {
        const [wx, wy] = getWorldCoords(e.clientX, e.clientY, this.canvas);
        this.#startWorldX = wx;
        this.#startWorldY = wy;
        this.#lastWorldY = wy;
        this.#lastWorldX = wx;
        this.resizingDirection = null;

        if (this.#mode === PointerMode.PAN) {
            this.canvas._selectionManager.clear();
            this.canvas.isGlobalClick = true;
        } else if (this.#mode === PointerMode.SELECT) {
            if (e.button === 2) {
                const child = this.checkCollidingChild(wx, wy);
                if (child) {
                    this.canvas._selectionManager.remove([child as Rect]);
                } else if (this.canvas.hitTest(wx, wy)) {
                    this.canvas._selectionManager.clear();
                }
            } else {
                const boundingBoxType = this.canvas._selectionManager.hitTest(wx, wy);
                if (boundingBoxType) {
                    // hit test to first check if the handle is selected
                    if (boundingBoxType !== 'CENTER') {
                        this.resizingDirection = boundingBoxType;
                    }
                    this.canvas.isGlobalClick = false;
                } else {
                    const child = this.checkCollidingChild(wx, wy);
                    if (child) {
                        if (!e.shiftKey) {                            
                            this.canvas._selectionManager.clear();
                        }
                        this.canvas._selectionManager.add([child as Rect]);
                        this.canvas.isGlobalClick = false;
                    } else {
                        this.canvas._selectionManager.clear();
                    }
                }
            }
        }

        document.addEventListener('pointermove', this.onPointerMoveWhileDown);
        document.addEventListener('pointerup', this.onPointerUp);
    }

    private onPointerMoveWhileDown(e: PointerEvent) {
        const [wx, wy] = getWorldCoords(e.clientX, e.clientY, this.canvas);
        const dx = wx - this.#lastWorldX;
        const dy = wy - this.#lastWorldY;

        if (this.canvas.isGlobalClick) {
            this.canvas._camera.updateCameraPos(this.#startWorldX - wx, this.#startWorldY - wy);
        } else if (this.resizingDirection) {
            this.canvas._selectionManager.resize(dx, dy, this.resizingDirection);
        } else {
            this.canvas._selectionManager.move(dx, dy);
        }

        this.#lastWorldX = wx;
        this.#lastWorldY = wy;
        this.canvas.canvas.style.cursor = 'grabbing'; 
    }

    private onPointerUp() {
        document.removeEventListener('pointermove', this.onPointerMoveWhileDown);
        document.removeEventListener('pointerup', this.onPointerUp);
        this.canvas.isGlobalClick = true;
        this.canvas.canvas.style.cursor = 'default';
    }

    private checkCollidingChild(wx: number, wy: number) {
        for (let i = this.canvas.children.length - 1; i >= 0; i--) {
            const child = this.canvas.children[i];
            if (child instanceof Shape) {
                if (child.hitTest && child.hitTest(wx, wy)) {
                    return child;
                }
            }
        }
        return null;
    }
}