export abstract class Shape {
    abstract render(gl: WebGLRenderingContext, program: WebGLProgram) : void;
}