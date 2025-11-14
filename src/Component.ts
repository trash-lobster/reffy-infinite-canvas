import { CanvasHistory } from './history';
import { Canvas } from './Canvas';
import {LitElement, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import { getWorldCoords, addImages as innerAddImages } from './util';
import { downloadJSON, readJSONFile } from './util/files';
import { serializeCanvas, deserializeCanvas, SerializedCanvas } from './serializer';
import { makeMultiAddChildCommand } from './manager';
import { ContextMenu, ContextMenuOption } from './contextMenu';

type AcceptedOptions = ContextMenuOption;

@customElement('infinite-canvas')
export class InfiniteCanvasElement extends LitElement {
    @property({type: Object})
    options: Record<string, AcceptedOptions> = {
        'contextMenu': {
            childrenOption: [
                {
                    text: "Test",
                    onClick: () => console.log('hey')
                }
            ]
        }
    }


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
        this.clearContextMenu = this.clearContextMenu.bind(this);
        this.showContextMenu = this.showContextMenu.bind(this);

        this.#canvas = new Canvas(
            canvas, 
            this.#history,
            {
                showMenu: this.showContextMenu,
                clearMenu: this.clearContextMenu,
            }
        );

        this.dispatchEvent(new Event('load'));

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

    async addImages(fileList: FileList) {
        if (!this.#canvas) return;

		const rect = this.#canvas.canvas.getBoundingClientRect();
		const clientX = rect.left + rect.width / 2;
		const clientY = rect.top + rect.height / 2;

		const [wx, wy] = getWorldCoords(clientX, clientY, this.#canvas);

        const newImages = await innerAddImages(
            fileList, 
            (src: string) => this.#canvas.addToCanvas(src, wx, wy, true),
        );
        this.#history.push(makeMultiAddChildCommand(this.#canvas, newImages));
    }
    
    exportCanvas(filename = 'infinite-canvas.json') {
        if (!this.#canvas) return;
        const data = serializeCanvas(this.#canvas);
        downloadJSON(filename, data);
    }

    async importCanvas(fileList: FileList) {
        if (!this.#canvas) return;
        if (!fileList || fileList.length !== 1) return;
        const file = fileList[0];
        if (!file.type || (!file.type.includes('json') && !file.name.toLowerCase().endsWith('.json'))) return;
        const data = await readJSONFile<SerializedCanvas>(file);
        deserializeCanvas(data, this.#canvas);
        // this.#canvas.markOrderDirty();
    }

    clearCanvas() {
        if (!this.#canvas) return;
        this.#canvas.clearChildren();
    }

    showContextMenu(x: number, y: number) {
        // Remove any existing menu
        this.clearContextMenu();

        // Create new menu
        const options = this.options['contextMenu'];
        // options.parent = document;
        const menu = new ContextMenu(options);
        menu.attachToParent(document.body);
        
        // Position the menu
        menu._el.classList.add('context-menu');
        menu._el.style.left = `${x}px`;
        menu._el.style.top = `${y}px`;
    }

    clearContextMenu() {
        // Remove any existing menu
        const oldMenu = document.querySelector('.context-menu');
        if (oldMenu) oldMenu.remove();
    }
}

declare global {
  interface HTMLElementTagNameMap {
    'infinite-canvas': InfiniteCanvasElement;
  }
}