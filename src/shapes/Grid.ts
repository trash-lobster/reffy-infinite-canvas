import { WebGLRenderable } from "./Renderable";

export class Grid extends WebGLRenderable {
private buffer: WebGLBuffer | null = null;
    private vertexCount = 0;

    projectionMatrixLocation: WebGLUniformLocation;
    viewMatrixLocation: WebGLUniformLocation;
    viewProjectionInvLocation: WebGLUniformLocation;
    zoomScaleLocation: WebGLUniformLocation;
    checkboardStyleLocation: WebGLUniformLocation;

    // Fullscreen big-triangle in clip space: covers [-1,1] without seams
    getPositions() {
        // x,y pairs in clip space
        return new Float32Array([
            -1.0, -1.0,
             3.0, -1.0,
            -1.0,  3.0,
        ]);
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram): void {
        if (!this.buffer) {
            this.buffer = gl.createBuffer();
            if (!this.buffer) throw new Error("Failed to create grid buffer");
            const data = this.getPositions();
            this.vertexCount = data.length / 2;

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        }

        // Ensure program is current
        gl.useProgram(program);

        if (!this.initialized) {
            this.setUpVertexData(gl, program);
            this.setUpUniforms(gl, program);
            this.initialized = true;
        }

        // Convert clip [-1,1] to pixel coords using the current drawing buffer size
        const w = gl.drawingBufferWidth;
        const h = gl.drawingBufferHeight;
        const sx = w * 0.5, sy = h * 0.5, tx = w * 0.5, ty = h * 0.5;

        const clipToPixels = new Float32Array([
            sx, 0,  0,
            0,  sy, 0,
            tx, ty, 1,
        ]);

        if (this.viewProjectionInvLocation) gl.uniformMatrix3fv(this.viewProjectionInvLocation, false, clipToPixels);
        if (this.zoomScaleLocation)         gl.uniform1f(this.zoomScaleLocation, 1.0);    // adjust if you have real zoom
        if (this.checkboardStyleLocation)   gl.uniform1f(this.checkboardStyleLocation, 1.0); // 1 = GRID

        // a_Position is clip-space position (vec2)
        const loc = gl.getAttribLocation(program, "a_Position");
        if (loc === -1) {
            throw new Error("Attribute a_Position not found in grid program");
        }

        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        // Draw the fullscreen triangle
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

        gl.disableVertexAttribArray(loc);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    destroy(gl: WebGLRenderingContext): void {
        if (this.buffer) {
            gl.deleteBuffer(this.buffer);
            this.buffer = null;
        }
    }

    protected setUpUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
        const I3 = new Float32Array([1,0,0, 0,1,0, 0,0,1]);
        this.projectionMatrixLocation = gl.getUniformLocation(program, "u_ProjectionMatrix");
        this.viewMatrixLocation = gl.getUniformLocation(program, "u_ViewMatrix");
        this.viewProjectionInvLocation = gl.getUniformLocation(program, "u_ViewProjectionInvMatrix");
        this.zoomScaleLocation = gl.getUniformLocation(program, "u_ZoomScale");
        this.checkboardStyleLocation = gl.getUniformLocation(program, "u_CheckboardStyle");

        gl.uniformMatrix3fv(this.projectionMatrixLocation, false, I3);
        gl.uniformMatrix3fv(this.viewMatrixLocation, false, I3);
        gl.uniformMatrix3fv(this.viewProjectionInvLocation,  false, I3);
        gl.uniform1f(this.zoomScaleLocation, 1.0);
        gl.uniform1f(this.checkboardStyleLocation, 1.0);   
    }
}