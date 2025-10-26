import { Canvas } from "Canvas";
import { Img } from "../shapes";
import { previewImage, screenToWorld } from "../util";

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

    constructor(canvas: Canvas) {
        this.canvas = canvas;
        this.addPaste();
        this.addPointerMove();
    }

    private addPointerMove() {
        this.canvas.canvas.addEventListener('pointermove', (e) => {
            // Convert to clip space
            [this.lastPointerPos.x, this.lastPointerPos.y] = screenToWorld(
                e.clientX, 
                e.clientY, 
                this.canvas.gl.canvas.width,
                this.canvas.gl.canvas.height,
                this.canvas.canvas,
                this.canvas.worldMatrix,
            );

            const hit = this.canvas._selectionManager.hitTest(this.lastPointerPos.x, this.lastPointerPos.y);
			this.canvas.canvas.style.cursor = cursorMap[hit] || 'default';
        });
    }

    private addPaste() {
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
}