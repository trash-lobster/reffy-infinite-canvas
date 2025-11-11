import EventEmitter from "eventemitter3";
import { m3 } from "../util";
import { RenderableState } from "../state";

export abstract class Renderable {
    state: RenderableState;
    angleRadians: number = 0;
    scale: number[] = [1, 1];

    get x() { return this.state.x }
    get y() { return this.state.y }

    updateTranslation(x: number, y: number) { this.state.updateTranslation(x, y); }
    setTranslation(x: number, y: number) { this.state.setTranslation(x, y); }

    // manages pan, zoom and rotation
    localMatrix: number[] = m3.identity();
    // the canvas transformation -> transform word coordinates into screen coordinates
    worldMatrix: number[] = m3.identity();

    children: Renderable[] = [];
    parent: Renderable | null = null;
    renderDirtyFlag: boolean = true;

    _emitter: EventEmitter;
    
    constructor() {
        this.state = new RenderableState();
    }

    appendChild<T extends Renderable>(child: T): T {
        child.setParent(this);
		if (!child._emitter && this._emitter) child._emitter = this._emitter;
        return child;
    }

    setParent(parent: Renderable | null) {
        if (this.parent) {
            const i = this.parent.children.indexOf(this);
            if (i >= 0) this.parent.children.splice(i, 1);
        }
        if (parent) parent.children.push(this);
        this.parent = parent;
    }

    updateWorldMatrix(parentWorldMatrix?: number[]) {
        const translationMatrix = m3.translation(this.x, this.y);
        const rotationMatrix = m3.rotation(this.angleRadians);
        const scaleMatrix = m3.scaling(this.scale[0], this.scale[1]);
        
        const matrix = m3.multiply(translationMatrix, rotationMatrix);
        this.localMatrix = m3.multiply(matrix, scaleMatrix);

        this.worldMatrix = parentWorldMatrix
            ? m3.multiply(parentWorldMatrix, this.localMatrix)
            : this.localMatrix.slice();

        const worldMatrix = this.worldMatrix;
        this.children.forEach(child => {
            child.updateWorldMatrix(worldMatrix);
        })
    }

    abstract render(gl: WebGLRenderingContext, program: WebGLProgram): void;
    abstract destroy(gl: WebGLRenderingContext): void;
    abstract hitTest(x: number, y: number): boolean;

    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ) {
         const fn = typeof listener === 'function'
            ? listener as EventListener
            : (listener as EventListenerObject).handleEvent.bind(listener);
        this._emitter.on(type, fn);
    }

    removeEventListener(
        type: string,
        listener?: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ) {

    }

    dispatchEvent(e: Event) {
        this._emitter.emit(e.type, e);
        return !e.defaultPrevented;
    }
}

export abstract class WebGLRenderable extends Renderable {
    protected positionBuffer?: WebGLBuffer;
    protected attributeLocation?: number;
    protected initialized = false;
    protected vertexArray?: Float32Array;
    
    protected resolutionLocation?: WebGLUniformLocation;
    protected matrixLocation?: WebGLUniformLocation;

    abstract getPositions() : number[] | Float32Array;

    updateVertexData(gl: WebGLRenderingContext) {
        const positions = this.getPositions();
        
        if (!this.vertexArray || this.vertexArray.length !== positions.length) {
            this.vertexArray = new Float32Array(positions.length);
        }
        
        this.vertexArray.set(positions);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer!);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexArray, gl.STATIC_DRAW);
    }

    protected setUpVertexData(gl: WebGLRenderingContext, program: WebGLProgram) {
        if (!this.positionBuffer) {
            this.positionBuffer = gl.createBuffer();
        }
        this.attributeLocation = gl.getAttribLocation(program, 'a_position');
    }

    protected setUpUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
        this.resolutionLocation = gl.getUniformLocation(program, "u_resolution");
        this.matrixLocation = gl.getUniformLocation(program, 'u_matrix');
    }
    
    protected updateUniforms(gl: WebGLRenderingContext) {
        gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);
        gl.uniformMatrix3fv(this.matrixLocation, false, this.worldMatrix);
    }
}