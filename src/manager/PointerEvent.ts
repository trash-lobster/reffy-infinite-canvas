import { Canvas } from "Canvas";
import { Img } from "../shapes";
import { previewImage } from "../util";

export interface Point {
    x: number,
    y: number,
}

export class PointerEventManager {
    canvas: Canvas;
    lastPointerPos: Point = { x: 0, y: 0 };

    constructor(canvas: Canvas) {
        this.canvas = canvas;
        this.addPaste();
    }

    private addPaste() {
        window.addEventListener('paste', async (e) => {
            const files = e.clipboardData.files;
            const html = e.clipboardData.getData('text/html');
            console.log(this.lastPointerPos.x, this.lastPointerPos.y);
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