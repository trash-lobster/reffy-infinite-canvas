import { createProgram, getWorldCoords } from './util';
import { 
	shapeVert, 
	shapeFrag, 
	imageFrag, 
	imageVert, 
	gridVert, 
	gridFrag,
 } from './shaders';
import { 
	Shape, 
	Img, 
	Renderable, 
	Grid,
} from './shapes';
import { SelectionManager, PointerEventManager, KeyEventManager } from './manager';
import { Camera } from './camera';
import { CameraState, PointerEventState } from './state';
import { CanvasHistory } from './history';
import { deserializeCanvas, serializeCanvas, SerializedCanvas } from './serializer';

export class Canvas extends Renderable {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;	
	basicShapeProgram: WebGLProgram;
	imageProgram: WebGLProgram;
	gridProgram: WebGLProgram;
	grid: Grid;

	isGlobalClick = true;

	_selectionManager: SelectionManager;
	_pointerEventManager: PointerEventManager;
	_keyPressManager: KeyEventManager;
	_camera: Camera;

	private orderDirty = true;
    private renderList: Shape[] = [];

    // Call this whenever children/layers/z-order change
    markOrderDirty() { this.orderDirty = true; }
	
	constructor(canvas: HTMLCanvasElement, history: CanvasHistory) {
		super();
		this.canvas = canvas;
		this.grid = new Grid();
		this.gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

		this.gl.getExtension("OES_standard_derivatives"); // required to enable fwidth
		
		this.basicShapeProgram = createProgram(this.gl, shapeVert, shapeFrag);
		this.imageProgram = createProgram(this.gl, imageVert, imageFrag);
		this.gridProgram = createProgram(this.gl, gridVert, gridFrag);
		
		this.engine = this.engine.bind(this);
		this.addToCanvas = this.addToCanvas.bind(this);
		this.assignEventListener = this.assignEventListener.bind(this);
		this.exportState = this.exportState.bind(this);
		this.importState = this.importState.bind(this);
		
		this._selectionManager = new SelectionManager(
			this.gl, 
			this.basicShapeProgram, 
			this, 
			history,
		);

		this._keyPressManager = new KeyEventManager(
			this, 
			history,
			this._selectionManager.deleteSelected,
			this.assignEventListener
		)

		const pointerEventState = new PointerEventState({
			getCanvas: this.engine,
			clearSelection: this._selectionManager.clear,
		})
		this._pointerEventManager = new PointerEventManager(
			this, 
			pointerEventState,
			history,
			this.addToCanvas,
			this.assignEventListener,
		);

		const cameraState = new CameraState({
			getCanvas: this.engine
		})
		this._camera = new Camera(this, cameraState);
	}

	engine() {
		return this;
	}

	appendChild<T extends Renderable>(child: T): T {
		super.appendChild(child);
		this.markOrderDirty();
		return child;
	}

	removeChild(child: Renderable): void {
		this.state.removeChild(child);
		if (this._selectionManager) {
			this._selectionManager.remove([child as any]);
		}
		child.destroy();
		this.markOrderDirty();
	}

	updateWorldMatrix() {
		this.grid.updateWorldMatrix(this.worldMatrix);
		this.children.forEach(child => {
			child.updateWorldMatrix(this.worldMatrix);
		})
		this._selectionManager.update();
	}

	render() {
		if (this.orderDirty) this.rebuildRenderList();

		this.gl.clearColor(0, 0, 0, 0);
    	this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

		let currentProgram: WebGLProgram | null = null;

		// render the grid
		currentProgram = this.gridProgram;
		this.grid.render(this.gl, currentProgram);

		for (const renderable of this.renderList) {
			let program: WebGLProgram;

			if (renderable instanceof Img) {
				program = this.imageProgram;
			} else if (renderable instanceof Shape) {
				program = this.basicShapeProgram;
			}
			
			if (currentProgram !== program) {
				this.gl.useProgram(program);
				currentProgram = program;
			}
			renderable.render(this.gl, currentProgram);
		}
		
		this._selectionManager.render();
	}

	destroy() {
        // Clean up programs
        this.gl.deleteProgram(this.basicShapeProgram);
        this.gl.deleteProgram(this.imageProgram);
        
        // Clean up all renderables
        this.children.forEach(child => {
            if ('destroy' in child) {
                child.destroy();
            }
        });
        
		this.clearChildren();
    }

	getDOM() {
		return this.canvas;
	}
	
	assignEventListener(
		type: string, 
		fn: (() => void) | ((e: any) => void), 
		options?: boolean | AddEventListenerOptions
	) {
		this.canvas.addEventListener(type, fn, options);
	}

	hitTest(x: number, y: number) {
		this.isGlobalClick = true;
		return this.isGlobalClick;
	}

	addToCanvas(src: string, x: number, y: number, center: boolean = false) {
		const rect = this.canvas.getBoundingClientRect();
		const clientX = center ? (rect.left + rect.width / 2) : (rect.left + x);
		const clientY = center ? (rect.top + rect.height / 2) : (rect.top + y);

		const [wx, wy] = getWorldCoords(clientX, clientY, this);
		const newImg = new Img({ x: wx, y: wy, src });

		this.appendChild(newImg);

		if (center) {
			const preview = new Image();
			preview.src = src;
			preview.onload = () => {
				const w = preview.naturalWidth || preview.width || 0;
				const h = preview.naturalHeight || preview.height || 0;
				if (w || h) newImg.updateTranslation(-w / 2, -h / 2);
			};
		}

		return newImg;
	}

	exportState() {
		return serializeCanvas(this);
	}

	importState(data: SerializedCanvas) {
		return deserializeCanvas(data, this);
	}

	private collectShapes(node: Renderable, out: Shape[]) {
        if (node instanceof Shape) out.push(node);
        for (const c of node.children) this.collectShapes(c, out);
    }

    private rebuildRenderList() {
        const list: Shape[] = [];
        this.collectShapes(this, list);
        list.sort((a, b) =>
            a.layer - b.layer ||
            a.renderOrder - b.renderOrder ||
            a.seq - b.seq
        );
        this.renderList = list;
        this.orderDirty = false;
    }

	// toJSON() {
    //     return serializeCanvas(this);
    // }

    // exportAsString(space = 2) {
    //     return JSON.stringify(this.toJSON(), null, space);
    // }
	
	private static webglStats = {
        buffersCreated: 0,
        buffersDeleted: 0,
        programsCreated: 0,
        programsDeleted: 0,
        texturesCreated: 0,
        texturesDeleted: 0,
		shadersCreated: 0,
    	shadersDeleted: 0,
    };

	private wrapWebGLContext(gl: WebGLRenderingContext) {
		const originalCreateTexture = gl.createTexture.bind(gl);
		gl.createTexture = () => {
			Canvas.webglStats.texturesCreated++;
			console.log(`Textures created: ${Canvas.webglStats.texturesCreated}`);
			return originalCreateTexture();
		};
		const originalDeleteTexture = gl.deleteTexture.bind(gl);
		gl.deleteTexture = (texture: WebGLTexture | null) => {
			if (texture) {
				Canvas.webglStats.texturesDeleted++;
				console.log(`Textures deleted: ${Canvas.webglStats.texturesDeleted}`);
			}
			return originalDeleteTexture(texture);
		};
		const originalCreateShader = gl.createShader.bind(gl);
		gl.createShader = (type: number) => {
			Canvas.webglStats.shadersCreated++;
			console.log(`Shaders created: ${Canvas.webglStats.shadersCreated}`);
			return originalCreateShader(type);
		};
		const originalDeleteShader = gl.deleteShader.bind(gl);
		gl.deleteShader = (shader: WebGLShader | null) => {
			if (shader) {
				Canvas.webglStats.shadersDeleted++;
				console.log(`Shaders deleted: ${Canvas.webglStats.shadersDeleted}`);
			}
			return originalDeleteShader(shader);
		};

		return gl;
	}

	static getWebGLStats() {
		return {
			...Canvas.webglStats,
			buffersLeaked: Canvas.webglStats.buffersCreated - Canvas.webglStats.buffersDeleted,
			programsLeaked: Canvas.webglStats.programsCreated - Canvas.webglStats.programsDeleted,
			texturesLeaked: Canvas.webglStats.texturesCreated - Canvas.webglStats.texturesDeleted,
			shadersLeaked: Canvas.webglStats.shadersCreated - Canvas.webglStats.shadersDeleted
		};
	}
}
