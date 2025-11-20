import { CanvasHistory } from './history';
import { Canvas } from './Canvas';
import {LitElement, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import { copy, getWorldCoords, addImages as innerAddImages, paste } from './util';
import { downloadJSON, hashStringToId, readJSONFile } from './util/files';
import { serializeCanvas, deserializeCanvas, SerializedCanvas } from './serializer';
import { makeMultiAddChildCommand } from './manager';
import { ContextMenu, ContextMenuProps, ContextMenuType } from './contextMenu';
import { Img } from './shapes';
import { CanvasStorage, DefaultIndexedDbStorage, DefaultLocalStorage, FileStorage, ImageFileMetadata } from './storage';
import EventEmitter from 'eventemitter3';

@customElement('infinite-canvas')
export class InfiniteCanvasElement extends LitElement {
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
    #eventHub: EventEmitter;
    #resizeObserver?: ResizeObserver;
    #history: CanvasHistory;
    #fileStorage: FileStorage;
    #canvasStorage: CanvasStorage;
    #saveFrequency = 300000;
	#timeoutId: number | null;
    #intervalId: number | null;

    get engine(): Canvas { return this.#canvas }

    // Lifecycle
    connectedCallback() {
        super.connectedCallback();
        this.handleGlobalPointerDown = this.handleGlobalPointerDown.bind(this);
        document.addEventListener('pointerdown', this.handleGlobalPointerDown, true);
    }
    disconnectedCallback() {
        document.removeEventListener('pointerdown', this.handleGlobalPointerDown, true);
        this.#resizeObserver?.disconnect();
        this.#resizeObserver = undefined;
        this.#canvas.destroy();
        super.disconnectedCallback();
    }

    render() {
        this.initCanvas();
    }

    private async initCanvas() {
        this.#history = new CanvasHistory();
        this.#eventHub = new EventEmitter();

        const canvas = document.createElement('canvas');
        this.addContextMenu = this.addContextMenu.bind(this);
        this.clearContextMenu = this.clearContextMenu.bind(this);
        this.isContextMenuActive = this.isContextMenuActive.bind(this);
        
        this.restoreStateFromCanvasStorage = this.restoreStateFromCanvasStorage.bind(this);
        this.getImageFileMetadata = this.getImageFileMetadata.bind(this);
        this.getAllImageFileMetdata = this.getAllImageFileMetdata.bind(this);
        this.saveFile = this.saveFile.bind(this);
        this.saveToCanvasStorage = this.saveToCanvasStorage.bind(this);
        this.debounceSaveToCanvasStorage = this.debounceSaveToCanvasStorage.bind(this);
        this.assignCanvasStorage = this.assignCanvasStorage.bind(this);

        this.#canvas = new Canvas(
            canvas, 
            this.#history,
            this.debounceSaveToCanvasStorage,
            this.saveFile,
            this.#eventHub,
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
            const parent = canvas.parentElement || this; // fallback to host if no parent
            const rect = parent.getBoundingClientRect();
            let w = Math.max(1, rect.width);
            let h = Math.max(1, rect.height);

            // Maintain a fixed aspect ratio, e.g., 16:9
            const aspect = 16 / 9;
            if (w / h > aspect) {
                h = w / aspect;
            } else {
                w = h * aspect;
            }
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
        };

        resizeCanvas();

        this.#resizeObserver = new ResizeObserver(() => resizeCanvas());
        this.#resizeObserver.observe(canvas);

        this.#eventHub.emit('startloading');
        try {
            await this.restoreStateFromCanvasStorage();
        } catch (err) {
            console.error('Failed to restore canvas');
        }
        this.#eventHub.emit('completeloading');

        const animate = () => {
            this.#canvas.render();
            requestAnimationFrame(animate);
        };
        animate();
    }

    // Storage & Persistence
    /**
     * @param storage Canvas storage stores the positions of all the renderables
     * @param saveFrequency How often should auto save execute
     */
	assignCanvasStorage(storage: CanvasStorage, saveFrequency: number = this.#saveFrequency) {
		this.#canvasStorage = storage;
		this.#saveFrequency = saveFrequency;
        this.#intervalId && clearInterval(this.#intervalId);
		this.#intervalId = setInterval(this.saveToCanvasStorage, this.#saveFrequency);
	}

    /**
     * @param storage File storage captures the information about the image data that has previously been added. Made more efficient by using SHA of the image data for storage.
     */
    assignFileStorage(storage: FileStorage) {
        this.#fileStorage = storage;
    }

    /**
     * Duplicate images will not be written to the database
     * @param dataURL 
     * @returns The unique ID that the image has been logged with. This is a hashed version of the image data URL
     */
    async saveFile(dataURL: string): Promise<string | number | null> {
        if (!this.#fileStorage) {
            this.#fileStorage = new DefaultIndexedDbStorage();
        }
        try {
            if (!await this.#fileStorage.checkIfImageStored(dataURL)) {
                return await this.#fileStorage.write(dataURL);
            } else {
                return await hashStringToId(dataURL);
            }
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @param fileId Retrieves the file metadata
     * @returns 
     */
    async getImageFileMetadata(fileId: string) : Promise<ImageFileMetadata> {
        if (!this.#fileStorage) {
            this.#fileStorage = new DefaultIndexedDbStorage();
        }
        try {
            return await this.#fileStorage.read(fileId);
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * @returns All file metadata saved in connected storage
     */
    async getAllImageFileMetdata() : Promise<ImageFileMetadata[]> {
        if (!this.#fileStorage) {
            this.#fileStorage = new DefaultIndexedDbStorage();
        }

        try {
            return await this.#fileStorage.readAll();
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * Schedule the auto save to the canvas storage based on timer
     */
    debounceSaveToCanvasStorage(timeout: number = 1000) {
		if (!this.#canvasStorage) {
            this.#canvasStorage = new DefaultLocalStorage();
        }
		clearTimeout(this.#timeoutId);
		this.#timeoutId = setTimeout(this.saveToCanvasStorage, timeout);
	}
    
    async saveToCanvasStorage() {
		if (!this.#canvasStorage) {
            this.#canvasStorage = new DefaultLocalStorage();
        }
        await this.#canvasStorage.write(serializeCanvas(this.engine));
    }

    async restoreStateFromCanvasStorage() {
        if (!this.#canvasStorage) {
            this.#canvasStorage = new DefaultLocalStorage();
        }
        const dataAsString = await this.#canvasStorage.read();
        const data = JSON.parse(dataAsString) as SerializedCanvas;
        if (data) await deserializeCanvas(data, this.#canvas, this.getImageFileMetadata);
    }

    // Canvas API
    togglePointerMode() {
        if (!this.#canvas) return;
        this.#canvas._pointerEventManager.changeMode();
    }

    toggleGrid() {
        if (!this.engine) return;
        this.engine.toggleGrid();
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
        if (!this.engine) return;

		const rect = this.engine.canvas.getBoundingClientRect();
		const clientX = rect.left + rect.width / 2;
		const clientY = rect.top + rect.height / 2;

		const [wx, wy] = getWorldCoords(clientX, clientY, this.engine);

        const newImages = await innerAddImages(
            fileList, 
            (src: string) => this.engine.addToCanvas(src, wx, wy, 1, 1, true),
        );
        this.#history.push(makeMultiAddChildCommand(this.engine, newImages));
    }

    async copyImage() {
        if (!this.engine) return;
        await copy(
            this.engine._selectionManager.selected as Img[]
        );
    }

    async pasteImage(e: PointerEvent) {
        if (!this.engine) return;
        await paste(e.clientX, e.clientY, this.engine, this.#history, false);
    }

    flipVertical() {
        if (!this.engine) return;
        this.engine.selectionManager.flip('vertical');
    }

    flipHorizontal() {
        if (!this.engine) return;
        this.engine.selectionManager.flip('horizontal');
    }

    deleteSelectedImages() {
        if (!this.engine) return;
        this.engine.selectionManager.deleteSelected();
    }
    
    async exportCanvas(filename = 'infinite-canvas.json') {
        if (!this.#canvas) return;
        const files = await this.getAllImageFileMetdata();
        const data = serializeCanvas(this.#canvas, files);
        downloadJSON(filename, data);
    }

    async importCanvas(fileList: FileList) {
        if (!this.#canvas) return;
        if (!fileList || fileList.length !== 1) return;
        const file = fileList[0];
        if (!file.type || (!file.type.includes('json') && !file.name.toLowerCase().endsWith('.json'))) return;
        const data = await readJSONFile<SerializedCanvas>(file);
        await deserializeCanvas(data, this.#canvas, this.getImageFileMetadata);
    }

    clearCanvas() {
        if (!this.#canvas) return;
        this.#canvas.clearChildren();
    }

    // ContextMenu
    //The default ContextMenuOptions for the infinite canvas should have all the functions
    singleImageMenuOptions: ContextMenuProps = {
        optionGroups: [
            {
                childOptions: [
                    {
                        text: "Cut",
                        onClick: async () => {
                            await this.copyImage.bind(this)();
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
                        text: "Flip Horizontal",
                        onClick: this.withContextMenuClear(this.flipHorizontal.bind(this))
                    },
                    {
                        text: "Flip Vertical",
                        onClick: this.withContextMenuClear(this.flipVertical.bind(this))
                    },
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
                    {
                        text: "Toggle Grid",
                        onClick: () => this.withContextMenuClear(this.toggleGrid.bind(this))()
                    },
                    {
                        text: 'Change mode',
                        onClick: () => this.withContextMenuClear(this.togglePointerMode.bind(this))()
                    }
                ]
            },
        ]
    }

    // wrap to close context menu after selecting an option
    private withContextMenuClear<T extends (...args: any[]) => any>(fn: T): T {
        const self = this;
        return function(this: any, ...args: Parameters<T>): ReturnType<T> {
            const result = fn.apply(self, args);
            self.clearContextMenu();
            return result;
        } as T;
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
        const oldMenu = this.renderRoot.querySelector('.context-menu');
        if (this.isContextMenuActive()) oldMenu.remove();
    }

    isContextMenuActive() {
        return this.renderRoot.querySelector('.context-menu') !== null;
    }

    // Global helper
    private handleGlobalPointerDown = (e: PointerEvent) => {
        if (!this.contains(e.target as Node) && !this.renderRoot.contains(e.target as Node)) {
            this.clearContextMenu();
        }
    };
}

declare global {
  interface HTMLElementTagNameMap {
    'infinite-canvas': InfiniteCanvasElement;
  }
}