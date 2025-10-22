import { createProgram, m3 } from './util';
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
	BoundingBox,
} from './shapes';
import EventEmitter from 'eventemitter3';
import { EventManager } from './events';
import { SelectionManager } from './manager';

const cursorMap: Record<string, string> = {
    TOP: 'ns-resize',
    BOTTOM: 'ns-resize',
    LEFT: 'ew-resize',
    RIGHT: 'ew-resize',
    TOPLEFT: 'nwse-resize',
    BOTTOMRIGHT: 'nwse-resize',
    TOPRIGHT: 'nesw-resize',
    BOTTOMLEFT: 'nesw-resize',
};

export class Canvas extends Renderable {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;
	
	basicShapeProgram: WebGLProgram;
	imageProgram: WebGLProgram;
	gridProgram: WebGLProgram;
	
	grid: Grid;
	boundingBox: BoundingBox;
	
	worldMatrix: number[] = m3.identity();

	isGlobalClick = true;

	_emitter: EventEmitter = new EventEmitter();
	_eventManager: EventManager = new EventManager(this._emitter);
	_selectionManager: SelectionManager;

	private orderDirty = true;
    private renderList: Shape[] = [];

    // Call this whenever children/layers/z-order change
    markOrderDirty() { this.orderDirty = true; }
	
	constructor(canvas: HTMLCanvasElement) {
		super();
		this.canvas = canvas;
		this.grid = new Grid();
		this.gl = this.wrapWebGLContext(canvas.getContext('webgl'));
		this.gl.getExtension("OES_standard_derivatives"); // required to enable fwidth
		
		this.basicShapeProgram = createProgram(this.gl, shapeVert, shapeFrag);
		this.imageProgram = createProgram(this.gl, imageVert, imageFrag);
		this.gridProgram = createProgram(this.gl, gridVert, gridFrag);

		this._selectionManager = new SelectionManager(this.gl, this.basicShapeProgram);
		
		canvas.addEventListener('pointermove', (e) => {
			const [wx, wy] = this.screenToWorld(e.clientX, e.clientY);
			const hit = this._selectionManager.hitTest(wx, wy);
			canvas.style.cursor = cursorMap[hit] || 'default';
		});
	}

	appendChild<T extends Renderable>(child: T): T {
		super.appendChild(child);
		this.markOrderDirty();
		return child;
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
                child.destroy(this.gl);
            }
        });
        
        this.children = [];
    }

	hitTest(x: number, y: number) {
		for (let i = this.children.length - 1; i >= 0; i--) {
			const child = this.children[i];
			if (child instanceof Shape) {
				if (child.hitTest && child.hitTest(x, y)) {
					this._eventManager.addToImpacted(child);
					// child.dispatchEvent(new Event('hover'));
					this.isGlobalClick = false;
					this._selectionManager.add([child]);
					break;
				}
			}
		}

		if (this.boundingBox) {
			if (this.boundingBox.hitTest(x, y)) {
				this.isGlobalClick = false;
			}
		}

		return this.isGlobalClick;
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

	private screenToWorld(clientX: number, clientY: number): [number, number] {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Device pixels relative to canvas
        const x = (clientX - rect.left) * dpr;
        const y = (clientY - rect.top) * dpr;

        // Convert to clip space
        const w = this.gl.canvas.width;
        const h = this.gl.canvas.height;
        const xClip = (x / w) * 2 - 1;
        const yClip = (y / h) * -2 + 1;

        // inv(P * V) * clip -> world

        // projection matrix transforms pixel space to clip space
        const proj = m3.projection(w, h);
        // view-projection matrix
        const pv = m3.multiply(proj, this.worldMatrix); // worldMatrix is view matrix and calculates the matrix to map world-space to clip-space

        // used to unproject and retrieve world coords
        const invPV = m3.inverse(pv);
        const [wx, wy] = m3.transformPoint(invPV, [xClip, yClip]);

        return [wx, wy];
    }
	
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
