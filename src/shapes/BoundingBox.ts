import { Rect } from "./Rect";

export class BoundingBox extends Rect {
    protected uxLocation?: WebGLUniformLocation;
    protected uyLocation?: WebGLUniformLocation;
    protected uwidthLocation?: WebGLUniformLocation;
    protected uheightLocation?: WebGLUniformLocation;

    protected setUpUniforms(gl: WebGLRenderingContext, program: WebGLProgram): void {
        super.setUpUniforms(gl, program);
        this.uxLocation = gl.getUniformLocation(program, "u_x");
        this.uyLocation = gl.getUniformLocation(program, "u_y");
        this.uwidthLocation = gl.getUniformLocation(program, "u_width");
        this.uheightLocation = gl.getUniformLocation(program, "u_height");
    }
    
    protected updateUniforms(gl: WebGLRenderingContext): void {
        super.updateUniforms(gl);
        gl.uniform1f(this.uxLocation, this.x);
        gl.uniform1f(this.uyLocation, this.y);
        gl.uniform1f(this.uwidthLocation, this.width);
        gl.uniform1f(this.uheightLocation, this.height)
    }
}