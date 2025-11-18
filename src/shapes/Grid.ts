import { m3 } from "../util";
import { WebGLRenderable } from "./Renderable";

enum GRID_TYPE {
    NONE,
    GRID,
    DOTS
}

export class Grid extends WebGLRenderable {
    private buffer: WebGLBuffer | null = null;
    private vertexCount = 0;

    viewProjectionInvLocation: WebGLUniformLocation;
    zoomScaleLocation: WebGLUniformLocation;
    checkboardStyleLocation: WebGLUniformLocation;

    gridType: GRID_TYPE = GRID_TYPE.GRID;
    zoom: number = 1;

    // Fullscreen big-triangle in clip space: covers [-1,1] without seams
    getPositions() {
        // x,y pairs in clip space
        return new Float32Array([
            -1.0, -1.0,
             3.0, -1.0,
            -1.0,  3.0,
        ]);
    }

    changeGridType(type: GRID_TYPE) {
        this.gridType = type;
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

        const invP = m3.inverse(m3.projection(w, h));   // clip to pixel space
        const invView = m3.inverse(this.worldMatrix);   // camera/view -> world
        const invVP = m3.multiply(invView, invP);       // clip -> world

        if (this.viewProjectionInvLocation) gl.uniformMatrix3fv(this.viewProjectionInvLocation, false, new Float32Array(invVP));
        if (this.zoomScaleLocation)         gl.uniform1f(this.zoomScaleLocation, this.zoom);
        if (this.checkboardStyleLocation)   gl.uniform1f(this.checkboardStyleLocation, this.gridType);

        // a_Position is clip-space position (vec2)
        const loc = gl.getAttribLocation(program, "a_Position");
        if (loc === -1) {
            throw new Error("Attribute a_Position not found in grid program");
        }

        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(loc);

        // Draw the fullscreen triangle
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

        gl.disableVertexAttribArray(loc);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    destroy(): void {
        if (this.buffer) {
            this.buffer = null;
        }
    }

    hitTest(x: number, y: number): boolean {
        return false;
    }

    protected setUpUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
        const I3 = new Float32Array([1,0,0, 0,1,0, 0,0,1]);
        this.viewProjectionInvLocation = gl.getUniformLocation(program, "u_ViewProjectionInvMatrix");
        this.zoomScaleLocation = gl.getUniformLocation(program, "u_ZoomScale");
        this.checkboardStyleLocation = gl.getUniformLocation(program, "u_CheckboardStyle");

        gl.uniformMatrix3fv(this.viewProjectionInvLocation,  false, I3);
        gl.uniform1f(this.zoomScaleLocation, this.zoom);
        gl.uniform1f(this.checkboardStyleLocation, 1.0);   
    }
}