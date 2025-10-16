type UniformType = 'matrix' | 'vec2' | 'vec4';
type UniformName = 'resolution' | 'color' | 'matrix';

export function createUniformsSetters(gl: WebGLRenderingContext, program: WebGLProgram, name: UniformName, type: UniformType) {
    const location = gl.getUniformLocation(program, `u_${name}`);

    switch (name) {
        case 'resolution':
            return (width: number, height: number) => {
                gl.uniform2f(location, width, height);
            }
        case 'color':
            return (color: number[]) => {
                gl.uniform4fv(location, color);
            }
        case 'matrix':
            return (matrix: Float32List) => {
                gl.uniformMatrix3fv(location, false, matrix);
            }
    }
}