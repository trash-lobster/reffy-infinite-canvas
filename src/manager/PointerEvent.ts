import { Canvas } from "Canvas";
import { Img, Rect, Shape } from "../shapes";
import {
    getWorldCoords,
    previewImage
} from "../util";
import { PointerEventState } from "../state";

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
    state: PointerEventState;
    canvas: Canvas;
    assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void;

    constructor(
        canvas: Canvas, 
        state: PointerEventState,
        assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void,
    ) {
        this.canvas = canvas;
        this.state = state;
        this.assignEventListener = assignEventListener;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMoveWhileDown = this.onPointerMoveWhileDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this.addOnPaste();
        this.addOnPointerMove();
        this.addOnWheel();
        this.addOnPointerDown();
        this.assignEventListener('contextmenu', (e) => e.preventDefault());
    }

    changeMode() {
        this.state.toggleMode();
    }
    
    // #region Add events
    private addOnPointerDown() {
        this.assignEventListener('pointerdown', this.onPointerDown);
    }
    
    // always on
    private addOnPointerMove() {
        this.assignEventListener('pointermove', (e) => {
            [this.state.lastPointerPos.x, this.state.lastPointerPos.y] = getWorldCoords(e.clientX, e.clientY, this.canvas);

            let hit = this.canvas._selectionManager.hitTestAdjustedCorner(this.state.lastPointerPos.x, this.state.lastPointerPos.y);
			this.canvas.canvas.style.cursor = cursorMap[hit] || 'default';
        });
    }
    
    private addOnWheel() {
        this.assignEventListener('wheel', (e) => {
            if (!this.canvas._selectionManager.marqueeBox) {
                this.canvas._camera.onWheel(e);
            }
        }, { passive: false });
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
                                    x: this.state.lastPointerPos.x,
                                    y: this.state.lastPointerPos.y,
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
                        x: this.state.lastPointerPos.x,
                        y: this.state.lastPointerPos.y,
                        src: image.src,
                    }))
                }
            }
        });
    }
    // #endregion

    private onPointerDown(e: PointerEvent) {
        const [wx, wy] = getWorldCoords(e.clientX, e.clientY, this.canvas);
        this.state.initialize(wx, wy);

        if (this.state.mode === PointerMode.PAN) {
            this.state.clearSelection();
            this.canvas.isGlobalClick = true;
        } else if (this.state.mode === PointerMode.SELECT) {
            this.canvas.isGlobalClick = false;
            if (e.button === 2) {
                const child = this.checkCollidingChild(wx, wy);
                if (child) {
                    this.canvas._selectionManager.remove([child as Rect]);
                } else if (this.canvas.hitTest(wx, wy)) {
                    this.state.clearSelection();
                }
            } else {
                const boundingBoxType = this.canvas._selectionManager.hitTest(wx, wy);
                if (boundingBoxType) {
                    // hit test to first check if the handle is selected
                    if (boundingBoxType !== 'CENTER') {
                        this.state.resizingDirection = boundingBoxType;
                    }
                } else {
                    const child = this.checkCollidingChild(wx, wy);
                    if (child) {
                        if (!e.shiftKey) {                            
                            this.state.clearSelection();
                        }
                        this.canvas._selectionManager.add([child as Rect]);
                    } else {
                        this.state.clearSelection();
                        if (this.canvas._selectionManager.marqueeBox) {
                            // TO REFACTOR:
                            this.canvas._selectionManager.clearMarquee();
                        } else {
                            this.canvas._selectionManager.marqueeBox = {x: wx, y: wy};
                        }
                    }
                }
            }
        }

        document.addEventListener('pointermove', this.onPointerMoveWhileDown);
        document.addEventListener('pointerup', this.onPointerUp);
    }

    private onPointerMoveWhileDown(e: PointerEvent) {
        const [wx, wy] = getWorldCoords(e.clientX, e.clientY, this.canvas);
        const dx = wx - this.state.lastWorldX;
        const dy = wy - this.state.lastWorldY;

        if (this.canvas.isGlobalClick) {
            this.canvas._camera.updateCameraPos(this.state.startWorldX - wx, this.state.startWorldY - wy);
        } else if (this.state.resizingDirection) {
            this.canvas._selectionManager.resize(dx, dy, this.state.resizingDirection);
        } else if (this.canvas._selectionManager.marqueeBox) {
            this.canvas._selectionManager.marqueeBox.resize(dx, dy, this.canvas.worldMatrix);
        } else {
            this.canvas._selectionManager.move(dx, dy);
        }

        this.state.updateLastWorldCoord(wx, wy);
        this.canvas.canvas.style.cursor = 'grabbing'; 
    }

    private onPointerUp() {
        document.removeEventListener('pointermove', this.onPointerMoveWhileDown);
        document.removeEventListener('pointerup', this.onPointerUp);
        this.canvas.isGlobalClick = true;
        this.canvas.canvas.style.cursor = 'default';
        if (this.canvas._selectionManager.marqueeBox) {
            this.canvas._selectionManager.clearMarquee();
        }
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