import { WebGLRenderable } from "./Renderable";

export abstract class Shape extends WebGLRenderable {
    private _x: number;
    private _y: number;
    private _renderOrder: number;

    abstract getVertexCount(): number;

    constructor(x: number, y: number) {
        super();
        this._x = x;
        this._y = x;
    }

    get x() { return this._x; }
    set x(v: number) { if (this._x !== v) { this._x = v; this.renderDirtyFlag = true; } }

    get y() { return this._y; }
    set y(v: number) { if (this._y !== v) { this._y = v; this.renderDirtyFlag = true; } }

    get renderOrder() { return this._renderOrder; }
    set renderOrder(v: number) { if (this._renderOrder !== v) { this._renderOrder = v; this.renderDirtyFlag = true; } }

    setTranslation(x: number, y: number) {
        this.translation = [this.translation[0] + x, this.translation[1] + y];
    }

    setAngle(rotationDegree: number) {
        const angleInDegrees = 360 - rotationDegree;
        this.angleRadians = angleInDegrees * Math.PI / 180;
    }

    setScale(x: number, y?: number) {
        this.scale[0] *= x;
        this.scale[1] = y ? this.scale[1] * y : this.scale[1] * x;
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram) : void {
        // camera's matrix is not updated  
        this.updateWorldMatrix(this.parent ? this.parent.worldMatrix : undefined);
        
        if (this.renderDirtyFlag) {

            if (!this.initialized) {
                this.setUpVertexData(gl, program);
                this.setUpUniforms(gl, program);
                this.initialized = true;
            }

            this.updateVertexData(gl);
            this.renderDirtyFlag = false;
        }

        this.updateUniforms(gl);
        this.draw(gl);
        
        this.children.forEach(child => {
            child.render(gl, program);
        });
    }
    
    protected draw(gl: WebGLRenderingContext) {
        gl.enableVertexAttribArray(this.attributeLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        const size = 2;          // 2 components per iteration since it's a vec2D
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalize = false; // don't normalize the data
        const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            this.attributeLocation, size, type, normalize, stride, offset);
        
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