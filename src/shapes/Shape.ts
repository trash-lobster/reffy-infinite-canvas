import { Renderable } from "shapes";
import { m3 } from "../util";

export abstract class Shape implements Renderable{
    renderDirtyFlag: boolean = true;
    private positionBuffer?: WebGLBuffer;
    private attributeLocation?: number;
    private initialized = false;
    private vertexArray?: Float32Array;

    resolutionLocation?: WebGLUniformLocation;
    matrixLocation?: WebGLUniformLocation;
    translation: number[] = [0, 0];
    angleRadians: number = 0;
    scale: number[] = [1, 1];
    color: number[] = [1, 0, 0.5, 1];

    localMatrix: number[] = [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
    ];
    worldMatrix: number[] = [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1,
    ];
    children: Shape[] = [];
    parent: Shape | null;

    abstract getPositions(): number[];
    abstract getVertexCount(): number;

    appendChild(child: Shape) {
        this.children.push(child);
    }

    setParent(parent: Shape) {
        if (this.parent) {
            const i = this.parent.children.indexOf(this);
            if (i >= 0) {
                this.parent.children.splice(i, 1);
            }
        }

        if (parent) {
            parent.children.push(this);
        }

        this.parent = parent;
    }

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

    updateWorldMatrix(parentWorldMatrix: number[]) {
        const translationMatrix = m3.translation(this.translation[0], this.translation[1]);
        const rotationMatrix = m3.rotation(this.angleRadians);
        const scaleMatrix = m3.scaling(this.scale[0], this.scale[1]);
        
        // Multiply the matrices.
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

    render(gl: WebGLRenderingContext, program: WebGLProgram) : void {
          this.updateWorldMatrix(this.parent ? this.parent.worldMatrix : undefined);
        
        if (this.renderDirtyFlag) {

            if (!this.initialized) {
                this.setUpVertexData(gl, program);
                this.setupUniforms(gl, program);
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
    
    private updateVertexData(gl: WebGLRenderingContext) {
        const positions = this.getPositions();
        
        if (!this.vertexArray || this.vertexArray.length !== positions.length) {
            this.vertexArray = new Float32Array(positions.length);
        }
        
        this.vertexArray.set(positions);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer!);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexArray, gl.STATIC_DRAW);
    }

    private setUpVertexData(gl: WebGLRenderingContext, program: WebGLProgram) {
        if (!this.positionBuffer) {
            this.positionBuffer = gl.createBuffer();
        }
        this.attributeLocation = gl.getAttribLocation(program, 'a_position');
    }

    protected setupUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
        this.resolutionLocation = gl.getUniformLocation(program, "u_resolution");
        this.matrixLocation = gl.getUniformLocation(program, 'u_matrix');
    }
    
    protected updateUniforms(gl: WebGLRenderingContext) {
        gl.uniform2f(this.resolutionLocation, gl.canvas.width, gl.canvas.height);
        gl.uniformMatrix3fv(this.matrixLocation, false, this.worldMatrix);
    }
    
    private draw(gl: WebGLRenderingContext) {
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