import { Rect } from "./Rect";

export class Img extends Rect {
    private texcoordBuffer?: WebGLBuffer;
    private texcoordLocation?: number;
    private samplerLocation?: WebGLUniformLocation;
    private texture: WebGLTexture;

    private texCoordArray: Float32Array = new Float32Array([
        0, 0,  // top-left
        0, 1,  // bottom-left
        1, 0,  // top-right
        1, 0,  // top-right
        0, 1,  // bottom-left
        1, 1   // bottom-right
    ])
    
    private _src: string;
    private _image: HTMLImageElement;

    constructor(config: Partial<{x: number, y: number, src: string, width?: number, height?: number, }>) {
        super(config);
        this._src = config.src;
        
        this._image = new Image();
        this._image.crossOrigin = 'anonymous'; // Enable CORS
        this._image.src = config.src;
        this._image.onload = () => {
            this.renderDirtyFlag = true;
            this.width = config.width ?? this._image.naturalWidth;
            this.height = config.height ?? this._image.naturalHeight;
        };
        this._image.onerror = (error) => {
            console.error('Failed to load image:', this._src, error);
        };
    }

    get src() { return this._src; }
    set src(val: string) {
        if (this._src !== val) {
            this._src = val;
            this.renderDirtyFlag = true;
        }
    }
    
    render(gl: WebGLRenderingContext, program: WebGLProgram) : void {
        this.updateWorldMatrix(this.parent ? this.parent.worldMatrix : undefined);

        if (this.renderDirtyFlag) {

            if (!this.initialized) {
                this.setUpVertexData(gl, program);
                this.setUpTexData(gl, program);
                this.setTexture(gl);
                
                super.setUpUniforms(gl, program);
                this.samplerLocation = gl.getUniformLocation(program, "u_image"); // match your shader name
                if (this.samplerLocation) gl.uniform1i(this.samplerLocation, 0); // texture unit 0

                // Only create texture if image is loaded
                if (this._image.complete && this._image.naturalWidth > 0) {
                    // this.createTexture(gl);
                    this.initialized = true;
                } else {
                    // Image not ready yet, skip initialization
                    return;
                }
            }
            
            this.updateVertexData(gl);
            
            this.renderDirtyFlag = false;
        }
        super.updateUniforms(gl);
        this.draw(gl);
    }
    
    getVertexCount(): number {
        return 6;
    }

    getPositions(): number[] {
        const left = this.x;
        const right = this.x + this.width;
        const top = this.y;
        const bottom = this.y + this.height;

        return [
            left, top,      // top-left
            left, bottom,   // bottom-left  
            right, top,     // top-right
            right, top,     // top-right
            left, bottom,   // bottom-left
            right, bottom   // bottom-right
        ];
    }

    hitTest(x: number, y: number): boolean {
        // Handle negative width/height and include edges with a small epsilon
        const left = Math.min(this.x, this.x + this.width);
        const right = Math.max(this.x, this.x + this.width);
        const top = Math.min(this.y, this.y + this.height);
        const bottom = Math.max(this.y, this.y + this.height);
        const eps = 1e-8;

        if (x < left - eps || x > right + eps) return false;
        if (y < top - eps || y > bottom + eps) return false;
        return true;
    }

    updateVertexData(gl: WebGLRenderingContext) {
        super.updateVertexData(gl);

        // Upload texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoordArray, gl.STATIC_DRAW);
    }

    private setUpTexData(gl: WebGLRenderingContext, program: WebGLProgram) {
        if (!this.texcoordBuffer) {
            this.texcoordBuffer = gl.createBuffer();
        }
        this.texcoordLocation = gl.getAttribLocation(program, "a_texCoord");
    }

    private setTexture(gl: WebGLRenderingContext) {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        
        // Set the parameters so we can render any size image.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        
        // Upload the image into the texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._image);
    }
    
    protected draw(gl: WebGLRenderingContext) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.attributeLocation);

        const size = 2;          // 2 components per iteration since it's a vec2D
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalize = false; // don't normalize the data
        const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;        // start at the beginning of the buffer
        
        gl.vertexAttribPointer(
            this.attributeLocation, size, type, normalize, stride, offset);
            
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.enableVertexAttribArray(this.texcoordLocation);

        gl.vertexAttribPointer(
            this.texcoordLocation, size, type, normalize, stride, offset);
            
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.drawArrays(gl.TRIANGLES, 0, this.getVertexCount());
    }

    destroy(gl: WebGLRenderingContext) {
        if (this.positionBuffer) {
            gl.deleteBuffer(this.positionBuffer);
        }

        if (this.texcoordBuffer) {
            gl.deleteBuffer(this.texcoordBuffer);
        }

        if (this.texture) {
            gl.deleteTexture(this.texture);
        }

        this.initialized = false;
    }
}