import { createProgram, m3 } from './util';
import { 
	shapeVert, 
	shapeFrag, 
	imageFrag, 
	imageVert, 
	gridVert, 
	gridFrag,
	boundingBoxFrag,
	boundingBoxVert,
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

export class Canvas extends Renderable {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;
	
	basicShapeProgram: WebGLProgram;
	imageProgram: WebGLProgram;
	gridProgram: WebGLProgram;
	boundingBoxProgram: WebGLProgram;
	
	grid: Grid;
	boundingBox: BoundingBox;
	
	worldMatrix: number[] = m3.identity();

	isGlobalClick = true;

	_emitter: EventEmitter = new EventEmitter();
	_eventManager: EventManager = new EventManager(this._emitter);

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
		this.boundingBoxProgram = createProgram(this.gl, boundingBoxVert, boundingBoxFrag);
	}

	attachEventEmitter(): void {
		super.attachEventEmitter();
		
		if (this.boundingBox) {
			this.boundingBox._emitter = this._emitter;
		}
	}

	updateWorldMatrix() {
		this.grid.updateWorldMatrix(this.worldMatrix);
		this.children.forEach(child => {
			child.updateWorldMatrix(this.worldMatrix);
		})
		if (this.boundingBox) this.boundingBox.updateWorldMatrix(this.worldMatrix);
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
			} else if (renderable instanceof BoundingBox) {
				program = this.boundingBoxProgram;
			} else if (renderable instanceof Shape) {
				program = this.basicShapeProgram;
			}
			
			if (currentProgram !== program) {
				this.gl.useProgram(program);
				currentProgram = program;
			}
			renderable.render(this.gl, currentProgram);
		}
		
		if (this.boundingBox) {
			this.boundingBox.render(this.gl, this.basicShapeProgram);
		}
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

	setBoundingBox(box: BoundingBox) {
		this.boundingBox = box;
		this.boundingBox.parent = this;
		if (!this.boundingBox._emitter) this.boundingBox._emitter = this._emitter;
		this.renderDirtyFlag = true;
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
