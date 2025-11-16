import { CanvasHistory } from './history';
import { Canvas } from './Canvas';
import {LitElement, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import { getWorldCoords, addImages as innerAddImages } from './util';
import { downloadJSON, readJSONFile } from './util/files';
import { serializeCanvas, deserializeCanvas, SerializedCanvas } from './serializer';
import { makeMultiAddChildCommand } from './manager';
import { ContextMenu, ContextMenuProps, ContextMenuType } from './contextMenu';

@customElement('infinite-canvas')
export class InfiniteCanvasElement extends LitElement {

    // wrap to close context menu after selecting an option
    private withContextMenuClear<T extends (...args: any[]) => any>(fn: T): T {
        const self = this;
        return function(this: any, ...args: Parameters<T>): ReturnType<T> {
            const result = fn.apply(self, args);
            self.clearContextMenu();
            return result;
        } as T;
    }

    /**
     * The default ContextMenuOptions for the infinite canvas should have all the functions
     */
    singleImageMenuOptions: ContextMenuProps = {
        optionGroups: [
            {
                childOptions: [
                    {
                        text: "Cut",
                        onClick: () => {
                            this.copyImage.bind(this)();
                            this.withContextMenuClear(this.deleteSelectedImages.bind(this))();
                        }
                    },
                    {
                        text: "Copy",
                        onClick: this.withContextMenuClear(this.copyImage.bind(this))
                    },
                    {
                        text: "Paste",
                        onClick: (e: PointerEvent) => this.withContextMenuClear(this.pasteImage.bind(this))(e)
                    },
                    {
                        text: "Delete",
                        onClick: this.withContextMenuClear(this.deleteSelectedImages.bind(this))
                    },
                ]
            },
            {
                childOptions: [
                    {
                        text: "Flip Vertical",
                        onClick: this.withContextMenuClear(this.flipVertical.bind(this))
                    },
                    {
                        text: "Flip Horizontal",
                        onClick: this.withContextMenuClear(this.flipHorizontal.bind(this))
                    }
                ]
            },
        ]
    };

    multiImageMenuOptions: ContextMenuProps = {
        optionGroups: [
            ...this.singleImageMenuOptions.optionGroups,
            {
                childOptions: [
                    {
                        text: "Align Left",
                        onClick: () => console.log('hey')
                    },
                    {
                        text: "Align Right",
                        onClick: () => console.log('hey')
                    },
                    {
                        text: "Align Top",
                        onClick: () => console.log('hey')
                    },
                    {
                        text: "Align Bottom",
                        onClick: () => console.log('hey')
                    }
                ]
            }
        ]
    }

    canvasImageMenuOptions: ContextMenuProps = {
        optionGroups: [
            {
                childOptions: [
                    {
                        text: "Paste",
                        onClick: (e: PointerEvent) => this.withContextMenuClear(this.pasteImage.bind(this))(e)
                    },
                ]
            },
        ]
    }

    @property({type: String})
    name: string = 'Reffy';

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

        .context-menu-divider {
            height: 1px;
            background: var(--menu-divider, #c7d5eaff);
            margin: 6px 12px;
            border: none;
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
        console.log(this.name);
        this.#history = new CanvasHistory();

        const canvas = document.createElement('canvas');
        this.addContextMenu = this.addContextMenu.bind(this);
        this.clearContextMenu = this.clearContextMenu.bind(this);
        this.isContextMenuActive = this.isContextMenuActive.bind(this);

        this.#canvas = new Canvas(
            canvas, 
            this.#history,
            {
                showMenu: this.addContextMenu,
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

    async copyImage() {
        if (!this.engine) return;
        await this.engine.selectionManager.copy();
    }

    async pasteImage(e: PointerEvent) {
        if (!this.engine) return;
        await this.engine.selectionManager.paste(e);
    }

    flipVertical() {
        if (!this.engine) return;
        this.engine.selectionManager.flipVertical();
    }

    flipHorizontal() {
        if (!this.engine) return;
        this.engine.selectionManager.flipHorizontal();
    }

    deleteSelectedImages() {
        if (!this.engine) return;
        this.engine.selectionManager.deleteSelected();
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

    addContextMenu(x: number, y: number, type: ContextMenuType = 'single') {
        // Create new menu
        const menu = new ContextMenu(
            type === 'single' ? this.singleImageMenuOptions :
                type === 'multi' ? this.multiImageMenuOptions :
                    this.canvasImageMenuOptions
        );
        menu.attachToParent(this.renderRoot as HTMLElement);
        
        // Position the menu
        menu._el.classList.add('context-menu');
        const hostRect = this.getBoundingClientRect();
        const relX = x - hostRect.left;
        const relY = y - hostRect.top;

        // determine the width and height of the bound rect
        const hostWidth = hostRect.right;
        const hostHeight = hostRect.bottom;
        
        // place the menu according to the four quarters so it is always in view
        const menuRect = menu.el.getBoundingClientRect();
        
        // only flip the position of the menu if leaving it where it would have been, would lead to the menu being out of view
        const direction: number[] = [
            relX + menuRect.width > hostWidth ? 1 : 0,
            relY + menuRect.bottom > hostHeight ? 1 : 0,
        ]

        const menuHeight = menuRect.height * direction[1];
        const menuWidth = menuRect.width * direction[0];

        menu._el.style.left = `${relX - menuWidth}px`;
        menu._el.style.top = `${relY - menuHeight}px`;
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