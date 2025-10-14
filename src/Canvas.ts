import { createProgram, linkProgram } from './util';
import { vert, frag, imageFrag, imageVert } from './sdf';
import { Shape, Img, Renderable } from './shapes';

export class Canvas {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;
	instancePromise: Promise<this>;
	basicShapeProgram: WebGLProgram;
	imageProgram: WebGLProgram;
	renderables: Renderable[] = [];
	
	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.gl = canvas.getContext('webgl');
		this.basicShapeProgram = createProgram(this.gl, vert, frag);
		this.imageProgram = createProgram(this.gl, imageVert, imageFrag);
		this.gl.viewport(0, 0, canvas.width, canvas.height);
		this.gl.clearColor(0, 0, 0, 0);
    	this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}

	appendRenderables(renderable: Renderable) {
		this.renderables.push(renderable);
	}

	render() {
		this.gl.clearColor(0, 0, 0, 0);
    	this.gl.clear(this.gl.COLOR_BUFFER_BIT);

		let currentProgram: WebGLProgram | null = null;

		for (const renderable of this.renderables) {
			let program: WebGLProgram;

			if (renderable instanceof Shape) {
				program = this.basicShapeProgram;
			} else if (renderable instanceof Img) {
				program = this.imageProgram;
			}
			
			if (currentProgram !== program) {
				linkProgram(this.gl, program);
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
}
