import { Canvas } from "Canvas";
import { Img } from "../shapes";
import { getWorldCoords, previewImage, screenToWorld } from "../util";

export interface Point {
    x: number,
    y: number,
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

    constructor(canvas: Canvas) {
        this.canvas = canvas;
        
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMoveWhileDown = this.onPointerMoveWhileDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        this.addOnPaste();
        this.addOnPointerMove();
        this.addOnWheel();
        this.addOnPointerDown();
    }
    
    // #region Add events
    private addOnPointerDown() {
        this.canvas.canvas.addEventListener('pointerdown', this.onPointerDown);
    }
    
    // always on
    private addOnPointerMove() {
        this.canvas.canvas.addEventListener('pointermove', (e) => {
            [this.lastPointerPos.x, this.lastPointerPos.y] = getWorldCoords(e.clientX, e.clientY, this.canvas);
            
            const hit = this.canvas._selectionManager.hitTest(this.lastPointerPos.x, this.lastPointerPos.y);
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

        const isGlobalClick = this.canvas.hitTest(wx, wy);

        document.addEventListener('pointermove', this.onPointerMoveWhileDown);
        document.addEventListener('pointerup', this.onPointerUp);
    }

    private onPointerMoveWhileDown(e: PointerEvent) {
        const [wx, wy] = getWorldCoords(e.clientX, e.clientY, this.canvas);
        const dx = wx - this.#lastWorldX;
        const dy = wy - this.#lastWorldY;

        if (this.canvas.isGlobalClick) {
            this.canvas._camera.updateCameraPos(this.#startWorldX - wx, this.#startWorldY - wy);
        } else {
            // selection manager move
        }

        this.#lastWorldX = wx;
        this.#lastWorldY = wy;
        this.canvas.canvas.style.cursor = 'grabbing'; 
    }

    private onPointerUp(e: PointerEvent) {
        document.removeEventListener('pointermove', this.onPointerMoveWhileDown);
        document.removeEventListener('pointerup', this.onPointerUp);
        this.canvas.isGlobalClick = true;
        this.canvas.canvas.style.cursor = 'default';
    }

}