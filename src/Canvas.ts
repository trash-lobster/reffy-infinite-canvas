import { createProgram, m3 } from './util';
import { vert, frag, imageFrag, imageVert } from './shaders';
import { Shape, Img, Renderable } from './shapes';

export class Canvas {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;
	instancePromise: Promise<this>;
	basicShapeProgram: WebGLProgram;
	imageProgram: WebGLProgram;
	renderables: Renderable[] = [];
	
    children: Shape[] = [];

	localMatrix: number[] = [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
    ];

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
		this.canvas = canvas;
		this.gl = this.wrapWebGLContext(canvas.getContext('webgl'));
		this.basicShapeProgram = createProgram(this.gl, vert, frag);
		this.imageProgram = createProgram(this.gl, imageVert, imageFrag);
		// this.gl.viewport(0, 0, canvas.width, canvas.height);
		// this.gl.clearColor(0, 0, 0, 0);
    	// this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}

	appendRenderables(renderable: Shape) {
		this.children.push(renderable);
	}

	updateWorldMatrix() {
		this.children.forEach(child => {
			child.updateWorldMatrix(this.localMatrix);
		})
	}

	render() {
		this.gl.clearColor(0, 0, 0, 0);
    	this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		// rerender()
		this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

		let currentProgram: WebGLProgram | null = null;

		for (const renderable of this.children) {
			let program: WebGLProgram;

			if (renderable instanceof Shape) {
				program = this.basicShapeProgram;
			// } else if (renderable instanceof Img) {
			// 	program = this.imageProgram;
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
        this.renderables.forEach(renderable => {
            if ('destroy' in renderable) {
                renderable.destroy(this.gl);
            }
        });
        
        this.renderables = [];
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
