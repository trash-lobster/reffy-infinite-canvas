export abstract class Renderable {
    abstract render(gl: WebGLRenderingContext, program: WebGLProgram): void;
    abstract destroy(gl: WebGLRenderingContext);
}