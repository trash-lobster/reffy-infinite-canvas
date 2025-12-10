import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { Img } from '../../../src/shapes/Img';

interface ImageTestHook {
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    texture: WebGLTexture,
    _image: HTMLImageElement,
    lowResNeedsRefresh: boolean,
    initialized: boolean,
    bitmap: ImageBitmap,
    lowResBitmap: ImageBitmap,
    initialiseTexture: () => void,
    positionBuffer: WebGLUniformLocation | null;
    texcoordBuffer: WebGLUniformLocation | null;
    lowResTexture: WebGLUniformLocation | null;
    attributeLocation: WebGLUniformLocation | null;
    texcoordLocation: WebGLUniformLocation | null;
    draw: (gl: WebGLRenderingContext) => void;
    updateVertexData: (gl: WebGLRenderingContext) => void;
    updateImageTexture: (gl: WebGLRenderingContext) => void;
};

class FakeImage {
    src: string = '';
    crossOrigin: string | null = null;
    onload: ((ev?: any) => void) | null = null;
    onerror: ((err?: any) => void) | null = null;
    naturalWidth = 32;
    naturalHeight = 16;
    complete = true;
}

describe('Img', () => {
	let gl: WebGLRenderingContext;
	let program: WebGLProgram;

	beforeEach(() => {
		gl = {
            ARRAY_BUFFER: 0x8892,
            STATIC_DRAW: 0x88E4,
            TEXTURE_2D: 0x0DE1,
            RGBA: 0x1908,
            UNSIGNED_BYTE: 0x1401,
            CLAMP_TO_EDGE: 0x812F,
            NEAREST: 0x2600,
            LINEAR: 0x2601,
            createBuffer: vi.fn().mockReturnValue({} as WebGLBuffer),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            getAttribLocation: vi.fn().mockReturnValue(5),
            createTexture: vi.fn().mockReturnValue({} as WebGLTexture),
            bindTexture: vi.fn(),
            activeTexture: vi.fn(),
            texParameteri: vi.fn(),
            texImage2D: vi.fn(),
            vertexAttribPointer: vi.fn(),
            enableVertexAttribArray: vi.fn(),
            getUniformLocation: vi.fn().mockReturnValue({} as WebGLUniformLocation),
            uniform1i: vi.fn(),
            uniform2f: vi.fn(),
            uniformMatrix3fv: vi.fn(),
            canvas: { width: 640, height: 480 } as any,
        } as unknown as WebGLRenderingContext;
		program = {} as WebGLProgram;
	});

	it('initialises texture data and uniforms when image is ready', () => {
		const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
		// Provide GL/program and a ready image
		(img as unknown as ImageTestHook).gl = gl;
		(img as unknown as ImageTestHook).program = program;
		(img as unknown as ImageTestHook)._image = { complete: true, naturalWidth: 8, naturalHeight: 8 } as HTMLImageElement;

		(img as unknown as ImageTestHook).initialiseTexture();

		expect((gl as any).getAttribLocation).toHaveBeenCalledWith(program, 'a_texCoord');
		expect((gl as any).getUniformLocation).toHaveBeenCalledWith(program, 'u_image');
		expect((gl as any).uniform1i).toHaveBeenCalledWith(expect.anything(), 0);
	});

	it('updateVertexData uploads texcoords in addition to positions', () => {
		const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
		(img as any).positionBuffer = {} as WebGLBuffer;
		(img as any).texcoordBuffer = {} as WebGLBuffer;

		img.updateVertexData(gl);

		expect((gl as any).bindBuffer).toHaveBeenCalledWith((gl as any).ARRAY_BUFFER, (img as any).texcoordBuffer);
		expect((gl as any).bufferData).toHaveBeenCalledWith((gl as any).ARRAY_BUFFER, (img as any).texCoordArray, (gl as any).STATIC_DRAW);
	});

	it('determineIfLowRes returns true when area ratio below threshold', () => {
		const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=', width: 10, height: 10 });
		const camera = { getArea: () => 10000 } as any;
		// Mock image bounding box area
		(img as any).getBoundingBox = vi.fn().mockReturnValue({ getArea: () => 100 } as any);
		expect(img.determineIfLowRes(camera, 1, 0.1)).toBe(true);
		// Above threshold
		(img as any).getBoundingBox = vi.fn().mockReturnValue({ getArea: () => 2000 } as any);
		expect(img.determineIfLowRes(camera, 1, 0.1)).toBe(false);
	});

	it('setUseLowRes toggles state and avoids extra work when unchanged', async () => {
		const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
		(img as any)._image = { complete: true, naturalWidth: 16, naturalHeight: 16 } as HTMLImageElement;

		await img.setUseLowRes(true, gl);
		expect((img as any).useLowRes).toBe(true);
		// Second call with same state and no refresh should be fast path
		const texCallsBefore = (gl as any).createTexture.mock.calls.length;
		await img.setUseLowRes(true, gl);
		const texCallsAfter = (gl as any).createTexture.mock.calls.length;
		expect(texCallsAfter).toBe(texCallsBefore);
	});

	it('render updates uniforms and draws when not culled', () => {
		const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
		(img as unknown as ImageTestHook).positionBuffer = {} as WebGLBuffer;
		(img as unknown as ImageTestHook).initialized = true;
		img.culled = false;
		(img as unknown as ImageTestHook).draw = vi.fn();

		img.render(gl, program);
		expect((gl as any).uniform2f).toHaveBeenCalled();
		expect((gl as any).uniformMatrix3fv).toHaveBeenCalled();
		expect((img as unknown as ImageTestHook).draw).toHaveBeenCalledWith(gl);
	});

	it('render initializes when not initialized and image ready', () => {
		const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
		// Make image ready and provide program
		(img as unknown as ImageTestHook)._image = { complete: true, naturalWidth: 16, naturalHeight: 16 } as HTMLImageElement;
		(img as unknown as ImageTestHook).program = program;
		// Spy initialiseTexture and updateVertexData paths
		(img as unknown as ImageTestHook).initialiseTexture = vi.fn();
		(img as unknown as ImageTestHook).updateVertexData = vi.fn();

		img.render(gl, program);
		expect((img as unknown as ImageTestHook).initialiseTexture).toHaveBeenCalled();
		expect((img as unknown as ImageTestHook).initialized).toBe(true);
		expect((img as unknown as ImageTestHook).updateVertexData).toHaveBeenCalledWith(gl);
	});

	it('render skips initialization when image not ready', () => {
		const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
		(img as unknown as ImageTestHook)._image = { complete: false, naturalWidth: 0, naturalHeight: 0 } as HTMLImageElement;
		(img as unknown as ImageTestHook).initialiseTexture = vi.fn();

		img.render(gl, program);
		expect((img as unknown as ImageTestHook).initialiseTexture).toHaveBeenCalled();
		// Not ready, initialized remains false
		expect((img as unknown as ImageTestHook).initialized).toBe(false);
	});

	it('destroy clears GPU resources and flags', () => {
		const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
		(img as unknown as ImageTestHook).positionBuffer = {} as WebGLBuffer;
		(img as unknown as ImageTestHook).texcoordBuffer = {} as WebGLBuffer;
		(img as unknown as ImageTestHook).texture = {} as WebGLTexture;
		(img as unknown as ImageTestHook).lowResTexture = {} as WebGLTexture;
        (img as unknown as ImageTestHook).bitmap = {} as ImageBitmap;
        (img as unknown as ImageTestHook).lowResBitmap = {} as ImageBitmap;
		(img as unknown as ImageTestHook).initialized = true;

		img.destroy();
		expect((img as unknown as ImageTestHook).positionBuffer).toBeUndefined();
		expect((img as unknown as ImageTestHook).texcoordBuffer).toBeUndefined();
		expect((img as unknown as ImageTestHook).texture).toBeUndefined();
		expect((img as unknown as ImageTestHook).lowResTexture).toBeUndefined();
        expect((img as unknown as ImageTestHook).bitmap).toBeUndefined();
        expect((img as unknown as ImageTestHook).lowResBitmap).toBeUndefined();
		expect((img as unknown as ImageTestHook).initialized).toBe(false);
	});

    it('destroy clears GPU resources and flags when the resources are undefined', () => {
		const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });

		img.destroy();
		expect((img as unknown as ImageTestHook).positionBuffer).toBeUndefined();
		expect((img as unknown as ImageTestHook).texcoordBuffer).toBeUndefined();
		expect((img as unknown as ImageTestHook).texture).toBeUndefined();
		expect((img as unknown as ImageTestHook).lowResTexture).toBeUndefined();
        expect((img as unknown as ImageTestHook).bitmap).toBeUndefined();
        expect((img as unknown as ImageTestHook).lowResBitmap).toBeUndefined();
	});
});

describe('getter and setter', () => {
    it('tests src getter', () => {
        const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });

        expect(img.src).toBe('data:image/png;base64,iVBORw0KGgo=');
    });

    it('tests src setter', () => {
        const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
        (img as unknown as ImageTestHook).updateImageTexture = vi.fn();
        img.markDirty = vi.fn();

        img.src = 'test_src';

        expect(img.src).toBe('test_src');
        expect((img as unknown as ImageTestHook).updateImageTexture).toHaveBeenCalledWith('test_src');
        expect(img.markDirty).toHaveBeenCalledOnce();
    });

    it('tests src setter without calling its function if we are passing the current value', () => {
        const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
        (img as unknown as ImageTestHook).updateImageTexture = vi.fn();
        img.markDirty = vi.fn();

        img.src = 'data:image/png;base64,iVBORw0KGgo=';

        expect(img.src).toBe('data:image/png;base64,iVBORw0KGgo=');
        expect((img as unknown as ImageTestHook).updateImageTexture).not.toHaveBeenCalled();
        expect(img.markDirty).not.toHaveBeenCalled();
    });

    it('tests id getter', () => {
        const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
        img.fileId = '123';

        expect(img.fileId).toBe('123');
    });

    it('gets vertex count', () => {
        const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
        expect(img.getVertexCount()).toBe(6);
    })
});

describe('updateImageTexture', () => {
	let OriginalImage: any;

	beforeEach(() => {
		// Mock global Image to our controllable FakeImage
		OriginalImage = (globalThis as any).Image;
		(globalThis as any).Image = FakeImage as any;
		vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close: vi.fn() } as unknown as ImageBitmap)));
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

    afterEach(() => {
        // Restore globals
        (globalThis as any).Image = OriginalImage;
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

	it('sets crossOrigin and triggers src assignment', () => {
		const img = new Img({ src: 'initial.png' });
		const inst = (img as unknown as ImageTestHook)._image as FakeImage;
		expect(inst).toBeInstanceOf(FakeImage);
		expect(inst.crossOrigin).toBe('anonymous');
		expect(inst.src).toBe('initial.png');
	});

	it('onload sets width/height from natural size and initialises GL when provided', async () => {
		const img = new Img({ src: 'foo.png' });
		// Provide GL/program and pre-existing texture to verify deletion
		const gl = {
			deleteTexture: vi.fn(),
			createTexture: vi.fn().mockReturnValue({} as WebGLTexture),
			bindTexture: vi.fn(),
			texParameteri: vi.fn(),
			texImage2D: vi.fn(),
			TEXTURE_2D: 0x0DE1,
			RGBA: 0x1908,
			UNSIGNED_BYTE: 0x1401,
			CLAMP_TO_EDGE: 0x812F,
			NEAREST: 0x2600,
			LINEAR: 0x2601,
			getUniformLocation: vi.fn().mockReturnValue({} as WebGLUniformLocation),
			uniform1i: vi.fn(),
		} as unknown as WebGLRenderingContext;

		const program = {} as WebGLProgram;

		(img as unknown as ImageTestHook).gl = gl;
		(img as unknown as ImageTestHook).program = program;
		(img as unknown as ImageTestHook).texture = {} as WebGLTexture;
        (img as unknown as ImageTestHook).initialiseTexture = vi.fn();

		// Grab FakeImage instance and invoke onload
		const inst = (img as unknown as ImageTestHook)._image as FakeImage;
		// Ensure natural sizes
		inst.naturalWidth = 64;
		inst.naturalHeight = 48;
		await (inst.onload as any)();

		expect(img.width).toBe(64);
		expect(img.height).toBe(48);

		expect(gl.deleteTexture).toHaveBeenCalled();
		expect((img as unknown as ImageTestHook).initialized).toBe(true);
		
		expect((img as unknown as ImageTestHook).lowResNeedsRefresh).toBe(true);
	});

    it('onloads and closes and bitmap and recreates it', async () => {
        vi.unstubAllGlobals();
        const img = new Img({ src: 'foo.png' });
		// Provide GL/program and pre-existing texture to verify deletion
		const gl = {
			deleteTexture: vi.fn(),
			createTexture: vi.fn().mockReturnValue({} as WebGLTexture),
			bindTexture: vi.fn(),
			texParameteri: vi.fn(),
			texImage2D: vi.fn(),
			TEXTURE_2D: 0x0DE1,
			RGBA: 0x1908,
			UNSIGNED_BYTE: 0x1401,
			CLAMP_TO_EDGE: 0x812F,
			NEAREST: 0x2600,
			LINEAR: 0x2601,
			getUniformLocation: vi.fn().mockReturnValue({} as WebGLUniformLocation),
			uniform1i: vi.fn(),
		} as unknown as WebGLRenderingContext;

        const bitmap = {
            close: vi.fn(),
        } as unknown as ImageBitmap;

		const program = {} as WebGLProgram;
        
        (img as unknown as ImageTestHook).bitmap = bitmap;
		(img as unknown as ImageTestHook).gl = gl;
		(img as unknown as ImageTestHook).program = program;
		(img as unknown as ImageTestHook).texture = {} as WebGLTexture;
        (img as unknown as ImageTestHook).initialiseTexture = vi.fn();

        const inst = (img as unknown as ImageTestHook)._image as FakeImage;
		// Ensure natural sizes
		inst.naturalWidth = 64;
		inst.naturalHeight = 48;
		await (inst.onload as any)();

        expect(bitmap.close).toHaveBeenCalledOnce();
        expect((img as unknown as ImageTestHook).bitmap).toBe(undefined);
    });

	it('uses provided width/height overrides on load', async () => {
		const img = new Img({ src: 'bar.png', width: 10, height: 20 });
		const inst = (img as unknown as ImageTestHook)._image as FakeImage;
		await (inst.onload as any)();
		expect(img.width).toBe(10);
		expect(img.height).toBe(20);
	});

	it('falls back when createImageBitmap throws and logs a warning', async () => {
		(globalThis as any).createImageBitmap = vi.fn(async () => { throw new Error('boom'); });
		const img = new Img({ src: 'baz.png' });
		const inst = (img as unknown as ImageTestHook)._image as FakeImage;
		await (inst.onload as any)();
		expect((globalThis as any).createImageBitmap).toHaveBeenCalled();
		expect((img as unknown as ImageTestHook).bitmap).toBeUndefined();
		expect(console.warn).toHaveBeenCalled();
	});

	it('onerror logs image load failures', () => {
		const img = new Img({ src: 'err.png' });
		const inst = (img as unknown as ImageTestHook)._image as FakeImage;
		(inst.onerror as any)({ message: 'fail' });
		expect(console.error).toHaveBeenCalledWith('Failed to load image:', 'err.png', expect.anything());
	});
});

describe('setLowResTextureFromBitMap', () => {
	let clearRectSpy: ReturnType<typeof vi.fn>;
	let drawImageSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		// Force HTMLCanvasElement path and provide a mock 2D context
		Object.defineProperty(globalThis, 'OffscreenCanvas', { value: undefined, configurable: true });
		clearRectSpy = vi.fn();
		drawImageSpy = vi.fn();
		vi.spyOn(document, 'createElement').mockImplementation(((orig => (tag: any): any => {
			if (tag === 'canvas') {
				return {
					width: 0,
					height: 0,
					getContext: vi.fn(() => ({ clearRect: clearRectSpy, drawImage: drawImageSpy }))
				} as any;
			}
			return orig.call(document, tag);
		})(document.createElement as any)) as any);
		vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close: vi.fn() } as unknown as ImageBitmap)));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		// Clean OffscreenCanvas override
		// @ts-ignore
		delete (globalThis as any).OffscreenCanvas;
	});

	it('creates low-res bitmap and uploads texture, using canvas 2D context', async () => {
        const img = new Img({ src: 'foo.png' });
        // Provide GL/program and pre-existing texture to verify deletion
        const gl = {
            deleteTexture: vi.fn(),
            createTexture: vi.fn().mockReturnValue({} as WebGLTexture),
            bindTexture: vi.fn(),
            texParameteri: vi.fn(),
            texImage2D: vi.fn(),
            TEXTURE_2D: 0x0DE1,
            RGBA: 0x1908,
            UNSIGNED_BYTE: 0x1401,
            CLAMP_TO_EDGE: 0x812F,
            NEAREST: 0x2600,
            LINEAR: 0x2601,
            getUniformLocation: vi.fn().mockReturnValue({} as WebGLUniformLocation),
            uniform1i: vi.fn(),
        } as unknown as WebGLRenderingContext;

        const program = {} as WebGLProgram;
        
        (img as unknown as ImageTestHook).gl = gl;
        (img as unknown as ImageTestHook).program = program;
        (img as unknown as ImageTestHook).texture = {} as WebGLTexture;
        (img as unknown as ImageTestHook).initialiseTexture = vi.fn();

        const inst = (img as unknown as ImageTestHook)._image as FakeImage;
		inst.complete = true;

        await img.setUseLowRes(true, gl);
        expect(gl.createTexture).toHaveBeenCalled();
		expect(clearRectSpy).toHaveBeenCalled();
		expect(drawImageSpy).toHaveBeenCalled();
    })
});

describe('draw', () => {
	it('binds buffers, sets attributes and draws triangles', () => {
		const img = new Img({ src: 'data:image/png;base64,iVBORw0KGgo=' });
		
		(img as unknown as ImageTestHook).positionBuffer = {} as WebGLBuffer;
		(img as unknown as ImageTestHook).texcoordBuffer = {} as WebGLBuffer;
		(img as unknown as ImageTestHook).attributeLocation = 7;
		(img as unknown as ImageTestHook).texcoordLocation = 9;
		(img as unknown as ImageTestHook).texture = {} as WebGLTexture;

        const gl = {
            bindBuffer: vi.fn(),
            vertexAttribPointer:vi.fn(),
            enableVertexAttribArray: vi.fn(),
            activeTexture: vi.fn(),
            bindTexture: vi.fn(),
            drawArrays: vi.fn(),
            ARRAY_BUFFER: 0x8892,
            TEXTURE_2D: 0x0DE1,
            FLOAT: 0x1406,
            TRIANGLES: 0x0004,
            TEXTURE0: 0x84C0,
        } as unknown as WebGLRenderingContext;

		(img as unknown as ImageTestHook).draw(gl);

		expect(gl.bindBuffer).toHaveBeenNthCalledWith(1, gl.ARRAY_BUFFER, (img as unknown as ImageTestHook).positionBuffer);
		expect(gl.vertexAttribPointer).toHaveBeenCalledWith((img as unknown as ImageTestHook).attributeLocation, 2, gl.FLOAT, false, 0, 0);
		expect(gl.enableVertexAttribArray).toHaveBeenCalledWith((img as unknown as ImageTestHook).attributeLocation);
		expect(gl.bindBuffer).toHaveBeenNthCalledWith(2, gl.ARRAY_BUFFER, (img as unknown as ImageTestHook).texcoordBuffer);
		expect(gl.vertexAttribPointer).toHaveBeenCalledWith((img as unknown as ImageTestHook).texcoordLocation, 2, gl.FLOAT, false, 0, 0);
		expect(gl.enableVertexAttribArray).toHaveBeenCalledWith((img as unknown as ImageTestHook).texcoordLocation);
		expect(gl.activeTexture).toHaveBeenCalledWith(gl.TEXTURE0);
		expect(gl.bindTexture).toHaveBeenCalledWith(gl.TEXTURE_2D, (img as unknown as ImageTestHook).texture);
		expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, img.getVertexCount());
	});
});

