export abstract class Shape {
    renderDirtyFlag: boolean = true;
    private positionBuffer?: WebGLBuffer;
    private attributeLocation?: number;
    private initialized = false;

    abstract getPositions(): number[];
    abstract getVertexCount(): number;

    render(gl: WebGLRenderingContext, program: WebGLProgram) : void {
        gl.useProgram(program);
        if (this.renderDirtyFlag) {

            if (!this.initialized) {
                this.setUpVertextData(gl, program);
                this.initialized = true;
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getPositions()), gl.STATIC_DRAW);
            this.renderDirtyFlag = false;
        }
        this.draw(gl, program);
    }

    private setUpVertextData(gl: WebGLRenderingContext, program: WebGLProgram) {
        this.positionBuffer = gl.createBuffer();
        this.attributeLocation = gl.getAttribLocation(program, 'a_position');
    }

    protected setupUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
        const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    }
    
    private draw(gl: WebGLRenderingContext, program: WebGLProgram) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.attributeLocation);

        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        const size = 2;          // 2 components per iteration since it's a vec2D
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalize = false; // don't normalize the data
        const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            this.attributeLocation, size, type, normalize, stride, offset);
        this.setupUniforms(gl, program);
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