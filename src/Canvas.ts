import { createProgram, m3 } from './util';
import { vert, frag, imageFrag, imageVert, gridVert, gridFrag } from './shaders';
import { Shape, Img, Renderable, Grid } from './shapes';
import EventEmitter from 'eventemitter3';
import { EventManager } from './events';

export class Canvas extends Renderable {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;
	instancePromise: Promise<this>;
	basicShapeProgram: WebGLProgram;
	imageProgram: WebGLProgram;
	gridProgram: WebGLProgram;
	
	grid: Grid;
	
	worldMatrix: number[] = m3.identity();

	isGlobalClick = true;

	_emitter: EventEmitter = new EventEmitter();
	_eventManager: EventManager = new EventManager(this._emitter);

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
	
	constructor(canvas: HTMLCanvasElement) {
		super([0, 0]);
		this.canvas = canvas;
		this.grid = new Grid([0, 0]);
		this.gl = this.wrapWebGLContext(canvas.getContext('webgl'));
		this.gl.getExtension("OES_standard_derivatives"); // required to enable fwidth
		
		this.basicShapeProgram = createProgram(this.gl, vert, frag);
		this.imageProgram = createProgram(this.gl, imageVert, imageFrag);
		this.gridProgram = createProgram(this.gl, gridVert, gridFrag);
	}

	updateWorldMatrix() {
		this.grid.updateWorldMatrix(this.worldMatrix);
		this.children.forEach(child => {
			child.updateWorldMatrix(this.worldMatrix);
		})
	}

	render() {
		this.gl.clearColor(0, 0, 0, 0);
    	this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

		let currentProgram: WebGLProgram | null = null;

		// render the grid
		currentProgram = this.gridProgram;
		this.grid.render(this.gl, currentProgram);

		for (const renderable of this.children) {
			let program: WebGLProgram;

			if (renderable instanceof Shape) {
				program = this.basicShapeProgram;
			} else if (renderable instanceof Img) {
				program = this.imageProgram;
			}
			
			if (currentProgram !== program) {
				this.gl.useProgram(program);
				currentProgram = program;
			}
			renderable.render(this.gl, currentProgram);
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
		for (const child of this.children) {
			if (!(child instanceof Grid)) {
				if (child.hitTest && child.hitTest(x, y)) {
					this._eventManager.impactedShapes.push(child);
					// child.dispatchEvent(new Event('hover'));
					this.isGlobalClick = false;
				}
			}
		}
		return this.isGlobalClick;
	}

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
