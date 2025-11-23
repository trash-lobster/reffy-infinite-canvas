import { Rect } from "./Rect";

export class Img extends Rect {
    private texcoordBuffer?: WebGLBuffer;
    private texcoordLocation?: number;
    private samplerLocation?: WebGLUniformLocation;
    private texture?: WebGLTexture;
    private gl?: WebGLRenderingContext;
    private program?: WebGLProgram;

    private texCoordArray: Float32Array = new Float32Array([
        0, 0,  // top-left
        0, 1,  // bottom-left
        1, 0,  // top-right
        1, 0,  // top-right
        0, 1,  // bottom-left
        1, 1   // bottom-right
    ])
    
    // since these won't change over the lifetime of this object, there is no need for a reactive state store
    private _fileId: string | number;
    private _src: string;
    private _image: HTMLImageElement;

    constructor(config: Partial<{
        x: number, 
        y: number, 
        src: string,
        sx?: number,
        sy?: number,
        width?: number, 
        height?: number, 
    }>) {
        super(config);
        this._src = config.src;
        // add lazy texture loading
        // this.culled = true;
        this.loadImage(config.src, config.width, config.height);
    }

    private loadImage(src: string, width?: number, height?: number) {
        if (this.culled) return;
        this.updateImageTexture(src, width, height);
    }

    get src() { return this._src; }
    set src(val: string) {
        if (this._src !== val) {
            this._src = val;
            this.updateImageTexture(val);
            this.markDirty();
        }
    }

    get fileId() { return this._fileId; }
    set fileId(val: string | number) {
        this._fileId = val;
    }

    private updateImageTexture(src: string, width?: number, height?: number) {
        this._image = new Image();
        this._image.crossOrigin = 'anonymous';
        this._image.onload = () => {
            this.width = width ?? this._image.naturalWidth;
            this.height = height ?? this._image.naturalHeight;
            this.markDirty();

            if (this.gl && this.program) {
                // prefer createImageBitmap if available and source is a Blob/URL you control
                try {
                    if (this.texture && this.gl) {
                        this.gl.deleteTexture(this.texture);
                        this.texture = undefined;
                    }
                    this.initialiseTexture();
                    this.initialized = true;
                    this.markDirty();
                } catch (err) {
                    console.error('Failed to initialise texture on image load', err);
                }
            }
        };
        this._image.onerror = (error) => {
            console.error('Failed to load image:', src, error);
        };
        this._image.src = src;
    }

    private initialiseTexture() {
        if (!this.gl || !this.program) return;
        if (!this._image || !this._image.complete || this._image.naturalWidth === 0) return;

        this.setUpVertexData(this.gl, this.program);
        this.setUpTexData(this.gl, this.program);
        this.setTexture(this.gl);
            
        super.setUpUniforms(this.gl, this.program);
        this.samplerLocation = this.gl.getUniformLocation(this.program, "u_image"); // match your shader name
        if (this.samplerLocation) this.gl.uniform1i(this.samplerLocation, 0); // texture unit 0
    }
    
    render(gl: WebGLRenderingContext, program: WebGLProgram) : void {
        if (this.dirty && !this.culled) {
            this.updateWorldMatrix(this.parent ? this.parent.worldMatrix : undefined);

            if (!this.initialized) {
                this.gl = gl;
                this.program = program;
                this.initialiseTexture();
                
                // Only create texture if image is loaded
                if (this._image.complete && this._image.naturalWidth > 0) {
                    this.initialized = true;
                } else {
                    // Image not ready yet, skip initialization
                    return;
                }
            }
            
            this.updateVertexData(gl);
            this.clearDirty();
        }
        super.updateUniforms(gl);
        this.draw(gl);
    }
    
    getVertexCount(): number {
        return 6;
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
        if (this.texture) {
            try {
                gl.deleteTexture(this.texture);
            } catch (e) {}
            this.texture = undefined;
        }

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        
        // Set the parameters so we can render any size image.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        
        // Upload the image into the texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this._image);
    }
    
    protected draw(gl: WebGLRenderingContext) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        
        const size = 2;          // 2 components per iteration since it's a vec2D
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalize = false; // don't normalize the data
        const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;        // start at the beginning of the buffer
        
        gl.vertexAttribPointer(
            this.attributeLocation, size, type, normalize, stride, offset);
        gl.enableVertexAttribArray(this.attributeLocation);
            
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        
        gl.vertexAttribPointer(
            this.texcoordLocation, size, type, normalize, stride, offset);
        gl.enableVertexAttribArray(this.texcoordLocation);
            
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.drawArrays(gl.TRIANGLES, 0, this.getVertexCount());
    }

    destroy() {
        if (this.gl) {
            if (this.texcoordBuffer) {
                try { this.gl.deleteBuffer(this.texcoordBuffer); } catch (e) {}
                this.texcoordBuffer = undefined;
            }
            if (this.texture) {
                try { this.gl.deleteTexture(this.texture); } catch (e) {}
                this.texture = undefined;
            }
        }

        this.texcoordLocation = undefined;
        this.samplerLocation = undefined;
        try { super.destroy(); } catch (e) {}
    }
}