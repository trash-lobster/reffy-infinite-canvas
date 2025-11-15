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
                },
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

        .context-menu {
            position: absolute;
            background: white;
            min-width: 180px;
            background: var(--menu-bg, #fff);
            border-radius: 6px;
            /* box-shadow: 0 4px 24px rgba(0,0,0,0.16), 0 1.5px 4px rgba(0,0,0,0.08); */
            border: 1px solid var(--menu-border, #9f9f9fff);
            box-sizing: border-box;
            padding: 6px 0;
            display: flex;
            gap: 2px;
            flex-direction: column;
            font-family: system-ui, sans-serif;
            animation: fadeInMenu 0.13s cubic-bezier(.4,0,.2,1);
        }

        @keyframes fadeInMenu {
            from { opacity: 0; transform: translateY(8px);}
            to { opacity: 1; transform: none;}
        }

        .context-menu button {
            all: unset;
            display: flex;
            align-items: center;
            box-sizing: border-box;
            width: 100%;
            padding: 8px 18px;
            font-size: 15px;
            color: var(--menu-fg, #222);
            background: none;
            cursor: pointer;
            transition: background 0.1s, color 0.1s;
            user-select: none;
            outline: none;
        }

        .context-menu button:hover,
        .context-menu button:focus-visible {
            background: var(--menu-hover, #c7d5eaff);
            color: var(--menu-accent, #155290ff);
        }

        .context-menu button:active {
            background: var(--menu-active, #e3eaf3);
        }

        .context-menu button[disabled] {
            color: #aaa;
            cursor: not-allowed;
            background: none;
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
        this.isContextMenuActive = this.isContextMenuActive.bind(this);

        this.#canvas = new Canvas(
            canvas, 
            this.#history,
            {
                showMenu: this.showContextMenu,
                clearMenu: this.clearContextMenu,
                isMenuActive: this.isContextMenuActive,
            }
        );

        if (!this.renderRoot.contains(canvas)) {
            this.renderRoot.appendChild(canvas);
        }

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
    }

    render() {
        this.initCanvas();
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
        const menu = new ContextMenu(options);
        
        // Position the menu
        menu._el.classList.add('context-menu');
        const hostRect = this.getBoundingClientRect();
        const relX = x - hostRect.left;
        const relY = y - hostRect.top;

        menu._el.style.left = `${relX}px`;
        menu._el.style.top = `${relY}px`;
        menu.attachToParent(this.renderRoot as HTMLElement);
    }

    clearContextMenu() {
        // Remove any existing menu
        const oldMenu = this.renderRoot.querySelector('.context-menu');
        if (oldMenu) oldMenu.remove();
    }

    isContextMenuActive() {
        return this.renderRoot.querySelector('.context-menu') !== null;
    }
}

declare global {
  interface HTMLElementTagNameMap {
    'infinite-canvas': InfiniteCanvasElement;
  }
}