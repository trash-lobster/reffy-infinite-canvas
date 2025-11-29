import { AABB } from "../boundingBox";
import { Rect } from "./Rect";

export class Img extends Rect {
    private texcoordBuffer?: WebGLBuffer;
    private texcoordLocation?: number;
    private samplerLocation?: WebGLUniformLocation;
    private texture?: WebGLTexture;
    private lowResTexture? : WebGLTexture;
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
    private useLowRes: boolean = false;
    private lowResNeedsRefresh: boolean = true;
    private bitmap: ImageBitmap;
    private lowResBitmap: ImageBitmap;

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
        this.loadImage(config.src, config.width, config.height);
    }

    get src() { return this._src; }
    set src(val: string) {
        if (this._src !== val) {
            this._src = val;
            this.updateImageTexture(val);
            this.markDirty();
            this.lowResNeedsRefresh = true;
        }
    }
    
    get fileId() { return this._fileId; }
    set fileId(val: string | number) {
        this._fileId = val;
    }

    determineIfLowRes(
        cameraBoundingBox: AABB,
        zoomFactor: number,
        threshold = 0.1
    ) {
        // get both starting point and end point of each axis
        // compare that with the bounding box of the container (0 -> edge)
        // see how much space the visible parts of the image takes up
        const cameraArea = cameraBoundingBox.getArea();
        
        const area = this.getBoundingBox().getArea();

        // Low-res if area ratio is below threshold
        return (area / cameraArea) < (threshold / zoomFactor);
    }

    async setUseLowRes(useLowRes: boolean, gl?: WebGLRenderingContext) {
        // checks for current state to see if we are already using low res so we can avoid doing the extra work
        if (this.useLowRes === useLowRes && !this.lowResNeedsRefresh) return;
        this.useLowRes = useLowRes;
        if (useLowRes && gl) {
            await this.ensureLowResUploaded(gl);
        }
        this.markDirty();
        this.lowResNeedsRefresh = false;
    }

    private loadImage(src: string, width?: number, height?: number) {
        if (this.culled) return;
        this.updateImageTexture(src, width, height);
    }

    private updateImageTexture(src: string, width?: number, height?: number) {
        this._image = new Image();
        this._image.crossOrigin = 'anonymous';
        this._image.onload = async () => {
            this.width = width ?? this._image.naturalWidth;
            this.height = height ?? this._image.naturalHeight;

            try {
                if (this.bitmap) {
                    try { this.bitmap.close(); } catch (e) {}
                    this.bitmap = undefined;
                }
                if (typeof createImageBitmap === 'function') {
                    this.bitmap = await createImageBitmap(this._image);
                }
            } catch (err) {
                console.warn('createImageBitmap failed, falling back to HTMLImageElement', err);
                this.bitmap = undefined;
            }

            if (this.gl && this.program) {
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

    private async ensureLowResUploaded(gl: WebGLRenderingContext) {
        if (this.lowResTexture && !this.lowResNeedsRefresh) return;
        if (!this._image || !this._image.complete) return;

        try {
            const targetMaxSide = 256;
            const naturalW = this._image.naturalWidth;
            const naturalH = this._image.naturalHeight;
            const scale = Math.min(1, targetMaxSide / Math.max(1, Math.max(naturalW, naturalH)));
            const w = Math.max(1, Math.round(naturalW * scale));
            const h = Math.max(1, Math.round(naturalH * scale));

            let canvas: HTMLCanvasElement | OffscreenCanvas;
            if (typeof OffscreenCanvas !== 'undefined') {
                canvas = new OffscreenCanvas(w, h);
            } else {
                canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
            }

            const ctx = (canvas as HTMLCanvasElement).getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
            ctx.clearRect(0, 0, w, h);

            const ratio = Math.min(w / naturalW, h / naturalH);
            const dw = Math.round(naturalW * ratio);
            const dh = Math.round(naturalH * ratio);
            const dx = Math.round((w - dw) / 2);
            const dy = Math.round((h - dh) / 2);

            ctx.drawImage(this._image, 0, 0, naturalW, naturalH, dx, dy, dw, dh);

            this.lowResBitmap = await createImageBitmap(canvas as any);
            this.setLowResTextureFromBitmap(gl, this.lowResBitmap);

        } catch (err) {
            console.error('Failed to create/upload low-res image', err);
        }
    }

    private setLowResTextureFromBitmap(gl: WebGLRenderingContext, bitmap: ImageBitmap) {
        if (this.lowResTexture) {
            try { gl.deleteTexture(this.lowResTexture); } catch (e) {}
            this.lowResTexture = undefined;
        }

        this.lowResTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.lowResTexture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.bindTexture(gl.TEXTURE_2D, null);

        this.markDirty();
    }

    // data upload
    private initialiseTexture() {
        if (!this.gl || !this.program) return;
        if (!this._image || !this._image.complete || this._image.naturalWidth === 0) return;

        this.setUpVertexData(this.gl, this.program);
        this.setUpTexData(this.gl, this.program);
        this.setTexture(this.gl);
            
        super.setUpUniforms(this.gl, this.program);
        this.samplerLocation = this.gl.getUniformLocation(this.program, "u_image");
        if (this.samplerLocation) this.gl.uniform1i(this.samplerLocation, 0);
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
                try { gl.deleteTexture(this.texture); } catch (e) {}
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
        const srcForTex = this.bitmap ?? this._image;
        if (srcForTex) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcForTex);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    updateVertexData(gl: WebGLRenderingContext) {
        super.updateVertexData(gl);

        // Upload texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoordArray, gl.STATIC_DRAW);
    }

    getVertexCount(): number {
        return 6;
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
        if (!this.culled) this.draw(gl);
    }

    protected draw(gl: WebGLRenderingContext) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        
        const size = 2;          // 2 components per iteration since it's a vec2D
        const type = gl.FLOAT;   // the data is 32bit floats
        const normalize = false; // don't normalize the data
        const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
        const offset = 0;        // start at the beginning of the buffer
        
        gl.vertexAttribPointer(this.attributeLocation, size, type, normalize, stride, offset);
        gl.enableVertexAttribArray(this.attributeLocation);
            
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.vertexAttribPointer(
            this.texcoordLocation, size, type, normalize, stride, offset);
        gl.enableVertexAttribArray(this.texcoordLocation);
            
        gl.activeTexture(gl.TEXTURE0);

        try {
            const tex = (this.useLowRes && this.lowResTexture) ? this.lowResTexture : this.texture;
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.drawArrays(gl.TRIANGLES, 0, this.getVertexCount());
        } catch (err) {
            console.error(err);
        }
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
            if (this.lowResTexture) {
                try { this.gl.deleteTexture(this.lowResTexture); } catch (e) {}
                this.lowResTexture = undefined;
            }
        }

        if (this.bitmap) {
            try { this.bitmap.close(); } catch (e) {}
            this.bitmap = undefined;
        }
        if (this.lowResBitmap) {
            try { this.lowResBitmap.close(); } catch (e) {}
            this.lowResBitmap = undefined;
        }

        this.texcoordLocation = undefined;
        this.samplerLocation = undefined;
        try { super.destroy(); } catch (e) {}
    }
}