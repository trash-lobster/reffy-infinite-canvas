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
        const canvas = document.createElement('canvas');

        this.#canvas = new Canvas(canvas);

        const resizeCanvas = () => {
            if (!this.isConnected) return;
            const dpr = window.devicePixelRatio || 1;
            const w = Math.max(1, window.innerWidth);
            const h = Math.max(1, window.innerHeight);
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
        };

        resizeCanvas();

        this.#resizeObserver = new ResizeObserver(() => resizeCanvas());
        this.#resizeObserver.observe(this);

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
}

declare global {
  interface HTMLElementTagNameMap {
    'infinite-canvas': InfiniteCanvasElement;
  }
}