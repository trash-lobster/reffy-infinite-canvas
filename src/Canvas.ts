import { createProgram } from './util';
import { vert, frag } from './sdf';
import { Shape } from './shapes';

export class Canvas {
	canvas: HTMLCanvasElement;
	gl: WebGLRenderingContext;
	instancePromise: Promise<this>;
	program: WebGLProgram;
	shapes: Shape[] = [];
	
	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.gl = canvas.getContext('webgl');
		this.program = createProgram(this.gl, vert, frag);
		this.gl.viewport(0, 0, canvas.width, canvas.height);
		this.gl.clearColor(0, 0, 0, 0);
    	this.gl.clear(this.gl.COLOR_BUFFER_BIT);
	}

	appendChild(shape: Shape) {
		this.shapes.push(shape);
	}

	render() {
		this.gl.clearColor(0, 0, 0, 0);
    	this.gl.clear(this.gl.COLOR_BUFFER_BIT);
		for (const shape of this.shapes) {
			shape.render(this.gl, this.program);
		}
	}
}
