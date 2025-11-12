import EventEmitter from "eventemitter3";
import { RenderableState } from "../state";

export abstract class Renderable {
    state: RenderableState;

    get x() { return this.state.x }
    get y() { return this.state.y }
    get sx() { return this.state.scaleX }
    get sy() { return this.state.scaleY }
    get dirty() { return this.state.dirty }
    get localMatrix() { return this.state.localMatrix }
    get worldMatrix() { return this.state.worldMatrix }
    get children() { return this.state.children }
    get parent() { return this.state.parent }
    get angleRadians() { return this.angleRadians }

    updateTranslation(x: number, y: number) { this.state.updateTranslation(x, y); }
    setTranslation(x: number, y: number) { this.state.setTranslation(x, y); }
    updateScale(x: number, y: number) { this.state.updateScale(x, y); }
    setScale(x: number, y: number) { this.state.setScale(x, y); }
    setAngle(rotationDegree: number) { return this.state.setAngle(rotationDegree); }

    markDirty() { this.state.markDirty(); }
    clearDirty() { this.state.clearDirty(); }
    
    updateLocalMatrix() { this.state.updateLocalMatrix() }
    setWorldMatrix(matrix: number[]) { this.state.setWorldMatrix(matrix); }
    
    addChild(child: Renderable) { this.state.appendChild(child); }
    addParent(parent: Renderable | null) { return this.state.setParent(parent); }
    clearChildren() { return this.state.clearChildren(); }

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
        if (parent) parent.addChild(this);
        this.addParent(parent);
    }

    updateWorldMatrix(parentWorldMatrix?: number[]) {
        this.updateLocalMatrix();
        this.state.updateWorldMatrix(parentWorldMatrix);
    }

    abstract render(gl: WebGLRenderingContext, program: WebGLProgram): void;
    abstract destroy(): void;
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