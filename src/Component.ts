import { CanvasHistory } from './history';
import { Canvas } from './Canvas';
import {LitElement, css} from 'lit';
import {customElement} from 'lit/decorators.js';

@customElement('infinite-canvas')
export class InfiniteCanvasElement extends LitElement {
    static styles = css`
        :host {
            position: relative;
        }

        canvas {
            width: 100%;
            height: 100%;
            outline: none;
            padding: 0;
            margin: 0;
            touch-action: none;
        }
    `;

    #canvas: Canvas;
    #resizeObserver?: ResizeObserver;
    #history: CanvasHistory;

    connectedCallback() {
        super.connectedCallback();
    }
    disconnectedCallback() {
        this.#resizeObserver?.disconnect();
        this.#resizeObserver = undefined;
        this.#canvas.destroy();
        super.disconnectedCallback();
    }

    private initCanvas() {
        this.#history = new CanvasHistory();

        const canvas = document.createElement('canvas');
        this.#canvas = new Canvas(canvas, this.#history);

        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const w = Math.max(1, window.innerWidth);
            const h = Math.max(1, window.innerHeight);
            canvas.width = w * dpr;
            canvas.height = h * dpr;
        };

        resizeCanvas();

        this.#resizeObserver = new ResizeObserver(() => resizeCanvas());
        this.#resizeObserver.observe(canvas);

        const animate = () => {
            this.#canvas.render();
            requestAnimationFrame(animate);
        };
        animate();

        return this.#canvas.getDOM();
    }

    render() {
        return this.initCanvas();
    }

    // PUBLIC API
    get engine(): Canvas { return this.#canvas }

    toggleMode() {
        if (!this.#canvas) return;
        this.#canvas._pointerEventManager.changeMode();
    }

    zoomIn() {
        if (!this.#canvas) return;

        this.#canvas._camera.updateZoom(
            this.#canvas.canvas.width / 2, 
            this.#canvas.canvas.height / 2,
            Math.exp(-0.5 * 0.3),
        )
    }

    zoomOut() {
        if (!this.#canvas) return;
        this.#canvas._camera.updateZoom(
            this.#canvas.canvas.width / 2, 
            this.#canvas.canvas.height / 2,
            Math.exp(0.5 * 0.3),
        )
    }

    addImages(fileList: FileList) {
        if (!this.#canvas) return;
        
    }
    
}

declare global {
  interface HTMLElementTagNameMap {
    'infinite-canvas': InfiniteCanvasElement;
  }
}