import { WebGLRenderable } from "./Renderable";

export interface BoundingVal {
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
}

export abstract class Shape extends WebGLRenderable {
    private static _seqCounter = 0;
    private readonly _seq = Shape._seqCounter++;

    private _layer = 0;

    private _renderOrder: number = 0;
    abstract getVertexCount(): number;

    constructor(x: number, y: number) {
        super();
        this.setTranslation(x, y);
    }

    get layer() { return this._layer; }
    set layer(v: number) { if (this._layer !== v) { this._layer = v; this.markDirty(); } }

    get renderOrder() { return this._renderOrder; }
    set renderOrder(v: number) { if (this._renderOrder !== v) { this._renderOrder = v; this.markDirty(); } }

    get seq() { return this._seq; }

    abstract getEdge() : BoundingVal;

    setAngle(rotationDegree: number) {
        const angleInDegrees = 360 - rotationDegree;
        this.angleRadians = angleInDegrees * Math.PI / 180;
        this.markDirty();
    }

    color: [number, number, number, number] = [1, 0, 0.5, 1]; // default reddish-purple

    render(gl: WebGLRenderingContext, program: WebGLProgram) : void {
        this.updateWorldMatrix(this.parent ? this.parent.worldMatrix : undefined);
        
        gl.useProgram(program);

        if (this.dirty) {
            if (!this.initialized) {
                this.setUpVertexData(gl, program);
                this.setUpUniforms(gl, program);
                this.initialized = true;
            }
            this.updateVertexData(gl);
            this.clearDirty();
        }
        this.updateUniforms(gl);
        const uColor = gl.getUniformLocation(program, "u_color");
        if (uColor) {
            gl.uniform4fv(uColor, this.color);
        }
        this.draw(gl);
        
        this.children.forEach(child => {
            child.render(gl, program);
        });
    }
    
    protected draw(gl: WebGLRenderingContext) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        
        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        const size = 2;          // 2 components per iteration since it's a vec2D
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalize = false; // don't normalize the data
        const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            this.attributeLocation, size, type, normalize, stride, offset);
        
        gl.enableVertexAttribArray(this.attributeLocation);
        
        gl.drawArrays(gl.TRIANGLES, 0, this.getVertexCount());
    }

    destroy(gl: WebGLRenderingContext) {
        if (this.positionBuffer) {
            gl.deleteBuffer(this.positionBuffer);
            this.positionBuffer = undefined;
        }
        this.initialized = false;
    }
}