import { CanvasHistory } from './history';
import { Canvas } from './Canvas';
import {LitElement, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import { CanvasEvent, ContextMenuEvent, copy, getWorldCoords, addImages as innerAddImages, LoaderEvent, paste, SaveEvent } from './util';
import { downloadJSON, hashStringToId, readJSONFile } from './util/files';
import { serializeCanvas, deserializeCanvas, SerializedCanvas } from './serializer';
import { makeMultiAddChildCommand } from './manager';
import { addContextMenu, clearContextMenu, ContextMenuProps, ContextMenuType, createCanvasImageMenuOptions, createMultiImageMenuOptions, createSingleImageMenuOptions, isContextMenuActive } from './contextMenu';
import { CanvasStorage, DefaultIndexedDbStorage, DefaultLocalStorage, FileStorage, ImageFileMetadata } from './storage';
import EventEmitter from 'eventemitter3';
import { hideLoader, showLoader } from './loader';
import Stats from 'stats.js';

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

        .canvas-loader {
            position: absolute;
            top: 0;
            left: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.7);
            z-index: 1000;
            pointer-events: all;
        }

        .canvas-loader-spinner {
            width: 48px;
            height: 48px;
            border: 6px solid #e0e0e0;
            border-top: 6px solid #1976d2;
            border-radius: 50%;
            animation: canvas-loader-spin 1s linear infinite;
            margin-bottom: 16px;
        }

        @keyframes canvas-loader-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .canvas-loader-message {
            font-size: 1.1rem;
            color: #333;
            background: rgba(255,255,255,0.9);
            padding: 8px 16px;
            border-radius: 4px;
            margin-top: 8px;
            text-align: center;
            max-width: 80%;
            word-break: break-word;
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
    
    #onChange?: () => void;

    #singleImageMenuOptions: ContextMenuProps;
    #multiImageMenuOptions: ContextMenuProps;
    #canvasImageMenuOptions: ContextMenuProps;
    addContextMenu: (x: number, y: number, type: ContextMenuType) => void;
    clearContextMenu: () => void;
    isContextMenuActive: () => boolean;

    get singleImageMenuOptions() { return this.#singleImageMenuOptions; }
    get multiImageMenuOptions() { return this.#multiImageMenuOptions; }
    get canvasImageMenuOptions() { return this.#canvasImageMenuOptions; }

    get onCanvasChange() { return this.#onChange; }
    set onCanvasChange(fn: (() => void)) { this.#onChange = fn; }
    get engine(): Canvas { return this.#canvas; }
    get eventHub() { return this.#eventHub; }

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
        try {
            this.initCanvas();
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    private async initCanvas() {
        this.#history = new CanvasHistory();
        this.#eventHub = new EventEmitter();

        const canvas = document.createElement('canvas');

        // persistent state set up
        this.assignFileStorage = this.assignFileStorage.bind(this);
        this.getImageFileMetadata = this.getImageFileMetadata.bind(this);
        this.getAllImageFileMetdata = this.getAllImageFileMetdata.bind(this);
        this.saveImageFileMetadata = this.saveImageFileMetadata.bind(this);
        
        this.restoreStateFromCanvasStorage = this.restoreStateFromCanvasStorage.bind(this);
        this.assignCanvasStorage = this.assignCanvasStorage.bind(this);
        this.saveToCanvasStorage = this.saveToCanvasStorage.bind(this);
        this.debounceSaveToCanvasStorage = this.debounceSaveToCanvasStorage.bind(this);
        
        // import and export
        this.importCanvas = this.importCanvas.bind(this);
        this.exportCanvas = this.exportCanvas.bind(this);

        // context menu set up
        this.addContextMenu = addContextMenu.bind(this);
        this.clearContextMenu = clearContextMenu.bind(this);
        this.isContextMenuActive = isContextMenuActive.bind(this);

        this.#canvas = new Canvas(
            canvas, 
            this.#history,
            this.#eventHub,
            this.debounceSaveToCanvasStorage,
            this.saveImageFileMetadata,
        );

        if (!this.renderRoot.contains(canvas)) {
            this.renderRoot.appendChild(canvas);
        }

        this.registerSignal();

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

        showLoader.bind(this)('spinner');
        try {
            await this.restoreStateFromCanvasStorage();
        } catch (err) {
            console.error('Failed to restore canvas');
        }
        hideLoader.bind(this)();
        
        this.#singleImageMenuOptions = createSingleImageMenuOptions.bind(this)();
        this.#canvasImageMenuOptions = createCanvasImageMenuOptions.bind(this)();
        this.#multiImageMenuOptions = createMultiImageMenuOptions.bind(this)(this.#singleImageMenuOptions.optionGroups);
        
        this.dispatchEvent(new Event('load'));

        const stats = new Stats();
        stats.showPanel(0);

        if (!this.renderRoot.contains(stats.dom)) {
            this.renderRoot.appendChild(stats.dom);
        }

        const animate = () => {
            if (stats) {
                stats.update();
            }
            this.#canvas.render();
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    // Register signal
    private registerSignal() {
        this.#eventHub.on(LoaderEvent.start, showLoader.bind(this), 'spinner');
        this.#eventHub.on(LoaderEvent.done, hideLoader.bind(this));
        this.#eventHub.on(ContextMenuEvent.Open, this.addContextMenu);
        this.#eventHub.on(ContextMenuEvent.Close, this.clearContextMenu);
        this.#eventHub.on(CanvasEvent.Change, () => {
            if (this.#onChange) this.#onChange();
        });
        this.#eventHub.on(SaveEvent.Save, this.saveToCanvasStorage);
        this.#eventHub.on(SaveEvent.SaveCompleted, () => console.log('Done Saving!'));
        this.#eventHub.on(SaveEvent.SaveFailed, () => console.log('Failed to Save!'));
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
    async saveImageFileMetadata(dataURL: string): Promise<string | number | null> {
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
        this.#canvasStorage.write(serializeCanvas(this.engine))
            .then(() => this.#eventHub.emit(SaveEvent.SaveCompleted))
            .catch(() => this.#eventHub.emit(SaveEvent.SaveFailed));
    }

    async restoreStateFromCanvasStorage() {
        if (!this.#canvasStorage) {
            this.#canvasStorage = new DefaultLocalStorage();
        }
        const dataAsString = await this.#canvasStorage.read();
        const data = JSON.parse(dataAsString) as SerializedCanvas;
        if (data) {
            await deserializeCanvas(data, this.#canvas, this.getImageFileMetadata);
        }
    }

    // Canvas API
    togglePointerMode() {
        if (!this.#canvas) return;
        this.#canvas.changeMode();
    }

    toggleGrid() {
        if (!this.engine) return;
        this.engine.toggleGrid();
    }

    zoomIn() {
        if (!this.#canvas) return;
        this.#canvas.updateZoomByFixedAmount(-1);
    }

    zoomOut() {
        if (!this.#canvas) return;
        this.#canvas.updateZoomByFixedAmount();
    }

    async addImages(fileList: FileList) {
        if (!this.engine) return;

		const rect = this.engine.getBoundingClientRect();
		const clientX = rect.left + rect.width / 2;
		const clientY = rect.top + rect.height / 2;

		const [wx, wy] = getWorldCoords(clientX, clientY, this.engine);

        const newImages = await innerAddImages(
            fileList, 
            (src: string) => this.engine.addImageToCanvas(src, wx, wy, 1, 1, true),
        );
        this.#history.push(makeMultiAddChildCommand(this.engine, newImages));
    }

    async copyImage() {
        if (!this.engine) return;
        await copy(
            this.engine.getSelected()
        );
    }

    async pasteImage(e: PointerEvent) {
        if (!this.engine) return;
        this.#eventHub.emit(LoaderEvent.start, 'spinner');
        await paste(e.clientX, e.clientY, this.engine, this.#history, false);
        this.#eventHub.emit(LoaderEvent.done);
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
        this.engine.selectionManager.deleteSelected(this.engine);
    }
    
    async exportCanvas(filename = 'infinite-canvas.json') {
        if (!this.#canvas) return;
        this.#eventHub.emit(LoaderEvent.start, 'spinner');
        const files = await this.getAllImageFileMetdata();
        const data = serializeCanvas(this.#canvas, files);
        downloadJSON(filename, data);
        this.#eventHub.emit(LoaderEvent.done);
    }

    async importCanvas(fileList: FileList) {
        this.#eventHub.emit(LoaderEvent.start, 'spinner');
        if (!this.#canvas) return;
        if (!fileList || fileList.length !== 1) return;
        const file = fileList[0];
        if (!file.type || (!file.type.includes('json') && !file.name.toLowerCase().endsWith('.json'))) return;
        const data = await readJSONFile<SerializedCanvas>(file);
        await deserializeCanvas(data, this.#canvas, this.getImageFileMetadata, this.saveImageFileMetadata);
        this.#eventHub.emit(SaveEvent.Save);
        this.#eventHub.emit(LoaderEvent.done);
    }

    clearCanvas() {
        if (!this.#canvas) return;
        this.#canvas.clearChildren();
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