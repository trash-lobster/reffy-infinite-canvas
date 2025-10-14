import { Renderable } from "./Renderable";

export class Img implements Renderable{
    renderDirtyFlag: boolean = true;
    private positionBuffer?: WebGLBuffer;
    private attributeLocation?: number;
    private texcoordBuffer?: WebGLBuffer;
    private texcoordLocation?: number;
    private initialized = false;
    private texture: WebGLTexture;
    private vertexArray?: Float32Array;
    private texCoordArray: Float32Array = new Float32Array([
        0, 0,  // top-left
        0, 1,  // bottom-left
        1, 0,  // top-right
        1, 0,  // top-right
        0, 1,  // bottom-left
        1, 1   // bottom-right
    ])
    
    private _src: string;
    private _x: number;
    private _y: number;
    private _width: number;
    private _height: number;
    private _image: HTMLImageElement;

    constructor(config: Partial<{x: number, y: number, width: number, height: number, src: string}>) {
        this._x = config.x ?? 0;
        this._y = config.y ?? 0;
        this._src = config.src;
        this._width = config.width ?? 100;
        this._height = config.height ?? 100;
        
        this._image = new Image();
        this._image.crossOrigin = 'anonymous'; // Enable CORS
        this._image.onload = () => {
            this.renderDirtyFlag = true;
            if (!this._width) {
                this._width = this._image.naturalWidth;
                this._height = this._image.naturalHeight;
            }
        };
        this._image.onerror = (error) => {
            console.error('Failed to load image:', this._src, error);
        };
        this._image.src = config.src;
    }

    get x() { return this._x; }
    set x(value: number) { if (this._x !== value) { this._x = value; this.renderDirtyFlag = true; } }

    get y() { return this._y; }
    set y(value: number) { if (this._y !== value) { this._y = value; this.renderDirtyFlag = true; } }

    get width() { return this._width; }
    set width(value: number) { if (this._width !== value) { this._width = value; this.renderDirtyFlag = true; } }

    get height() { return this._height; }
    set height(value: number) { if (this._height !== value) { this._height = value; this.renderDirtyFlag = true; } }

    get src() { return this._src; }
    set src(val: string) {
        if (this._src !== val) {
            this._src = val;
            this.renderDirtyFlag = true;
        }
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram) : void {
        if (this.renderDirtyFlag) {

            if (!this.initialized) {
                this.setUpVertextData(gl, program);
                this.setUpTexData(gl, program);
                this.setTexture(gl);
                
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
        this.draw(gl, program);
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

    private updateVertexData(gl: WebGLRenderingContext) {
        const positions = this.getPositions();
        
        if (!this.vertexArray || this.vertexArray.length !== positions.length) {
            this.vertexArray = new Float32Array(positions.length);
        }
        
        this.vertexArray.set(positions);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer!);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexArray, gl.STATIC_DRAW);
        
        // Upload texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.texCoordArray, gl.STATIC_DRAW);
    }

    private setUpVertextData(gl: WebGLRenderingContext, program: WebGLProgram) {
        if (!this.positionBuffer) {
            this.positionBuffer = gl.createBuffer();
        }
        this.attributeLocation = gl.getAttribLocation(program, 'a_position');
    }

    protected setupUniforms(gl: WebGLRenderingContext, program: WebGLProgram) {
        const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
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
    
    private draw(gl: WebGLRenderingContext, program: WebGLProgram) {
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
            
        this.setupUniforms(gl, program);

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