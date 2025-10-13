import { Shape } from "shapes";
import { arraysEqual } from "../util/checks";

export class Triangle implements Shape {
    $positions: number[];
    renderDirtyFlag: boolean = true;

    constructor(positions: number[]) {
        this.$positions = positions;
    }

    get positions() {
        return this.$positions;
    }

    set positions(newPos: number[]) {
        if (!arraysEqual(this.$positions, newPos)) {
            this.$positions = newPos;
            this.renderDirtyFlag = true;
        }
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram) {
        if (this.renderDirtyFlag) {
            const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
            const positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW)
            gl.useProgram(program);
            // turn on the attribute
            gl.enableVertexAttribArray(positionAttributeLocation);
            // Bind the position buffer.
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    
            // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
            var size = 2;          // 2 components per iteration
            var type = gl.FLOAT;   // the data is 32bit floats
            var normalize = false; // don't normalize the data
            var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
            var offset = 0;        // start at the beginning of the buffer
            gl.vertexAttribPointer(
                positionAttributeLocation, size, type, normalize, stride, offset);
            this.renderDirtyFlag = false;
        }
        // draw
        var primitiveType = gl.TRIANGLES;
        var offset = 0;
        var count = 3;
        gl.drawArrays(primitiveType, offset, count);
    }
}
