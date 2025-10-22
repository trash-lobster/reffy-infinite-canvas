export function createProgram(gl: WebGLRenderingContext, vert: string, frag: string) {
    const vertShader = createShader(gl, gl.VERTEX_SHADER, vert);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, frag);
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    
    if (!success) {
        gl.deleteProgram(program);
        gl.deleteShader(vertShader);
        gl.deleteShader(fragShader);
        throw new Error('Program was not created or the link to shaders was not successful.');
    }
    
    gl.detachShader(program, vertShader);
    gl.detachShader(program, fragShader);
    // gl.deleteShader(vertShader);
    // gl.deleteShader(fragShader);

    return program;
}

function createShader(gl:WebGLRenderingContext, type : GLenum, source: string) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    throw new Error('Shader was not created.');
}
