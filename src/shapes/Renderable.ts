import { m3 } from "../util";

export abstract class Renderable {
    translation: number[] = [0, 0];
    angleRadians: number = 0;
    scale: number[] = [1, 1];

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

    children: Renderable[] = [];
    parent: Renderable | null = null;

    appendChild<T extends Renderable>(child: T): T {
        child.setParent(this);
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

    abstract render(gl: WebGLRenderingContext, program: WebGLProgram): void;
    abstract destroy(gl: WebGLRenderingContext): void;
}

export abstract class WebGLRenderable extends Renderable {
    renderDirtyFlag: boolean = true;
    protected positionBuffer?: WebGLBuffer;
    protected attributeLocation?: number;
    protected initialized = false;
    protected vertexArray?: Float32Array;

    protected resolutionLocation?: WebGLUniformLocation;
    protected matrixLocation?: WebGLUniformLocation;

    abstract getPositions();

    protected updateVertexData(gl: WebGLRenderingContext) {
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