import { AABB } from "../boundingBox/AABB";
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

    culled = false;

    private _renderOrder: number = 0;
    abstract getVertexCount(): number;

    constructor(x: number, y: number, sx: number = 1, sy: number = 1) {
        super();
        this.setTranslation(x, y);
        this.setScale(sx, sy);
    }

    get renderOrder() { return this._renderOrder; }
    set renderOrder(v: number) { if (this._renderOrder !== v) { this._renderOrder = v; this.markDirty(); } }

    get seq() { return this._seq; }

    abstract getEdge() : BoundingVal;
    abstract getBoundingBox(): AABB;

    getZ(): number {
        // Map renderOrder to a [0.0 .. 1.0] ratio where larger renderOrder => larger z.
        // Choose a small step to avoid saturating quickly; clamp to [0.0, 1.0].
        const step = 0.001; // ratio increase per renderOrder
        const z = this.renderOrder * step;
        return Math.max(0.0, Math.min(1.0, z));
    }

    color: [number, number, number, number] = [1, 0, 0.5, 1];

    render(gl: WebGLRenderingContext, program: WebGLProgram) : void {
        this.updateWorldMatrix(this.parent ? this.parent.worldMatrix : undefined);
        gl.useProgram(program);

        if (this.dirty && !this.culled) {
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
        if (!this.culled) this.draw(gl);
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

    destroy() {
        if (this.positionBuffer) {
            this.positionBuffer = undefined;
        }
        this.initialized = false;
    }
}