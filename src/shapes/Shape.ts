export abstract class Shape {
    renderDirtyFlag: boolean = true;
    private positionBuffer?: WebGLBuffer;

    abstract getPositions(): number[];
    abstract getVertexCount(): number;
    
    render(gl: WebGLRenderingContext, program: WebGLProgram) : void {
        if (this.renderDirtyFlag) {
            this.setUpVertextData(gl, program);
            this.renderDirtyFlag = false;
        }
        this.draw(gl);
    }

    private setUpVertextData(gl: WebGLRenderingContext, program: WebGLProgram) {
        const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
        if (!this.positionBuffer) {
            this.positionBuffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.getPositions()), gl.STATIC_DRAW)
        gl.useProgram(program);

        gl.enableVertexAttribArray(positionAttributeLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);

        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        const size = 2;          // 2 components per iteration
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalize = false; // don't normalize the data
        const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;        // start at the beginning of the buffer
        gl.vertexAttribPointer(
            positionAttributeLocation, size, type, normalize, stride, offset);

        this.setupUniforms(gl, program);
    }

    protected setupUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
        const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    }
    
    private draw(gl: WebGLRenderingContext) {
        gl.drawArrays(gl.TRIANGLES, 0, this.getVertexCount());
    }
}