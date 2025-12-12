import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest';
import { Grid } from '../../../src/shapes';
import { GRID_TYPE } from '../../../src/shapes/Grid';

let clearRectSpy: ReturnType<typeof vi.fn>;
let drawImageSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
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
    delete (globalThis as any).OffscreenCanvas;
});

describe('Grid basics', () => {
	it('getPositions returns fullscreen big triangle coords', () => {
		const grid = new Grid();
		const pos = grid.getPositions();
		expect(pos).toBeInstanceOf(Float32Array);
		expect(Array.from(pos)).toEqual([
			-1.0, -1.0,
			 3.0, -1.0,
			-1.0,  3.0,
		]);
	});

	it('changeGridType updates gridType', () => {
		const grid = new Grid();
		expect(grid.gridType).toBe(GRID_TYPE.GRID);
		grid.changeGridType(GRID_TYPE.NONE);
		expect(grid.gridType).toBe(GRID_TYPE.NONE);
	});

	it('hitTest always returns false', () => {
		const grid = new Grid();
		expect(grid.hitTest(0, 0)).toBe(false);
	});
});

describe('Grid render', () => {
	let gl: WebGLRenderingContext;
	let program: WebGLProgram;

	beforeEach(() => {
		gl = {
            ARRAY_BUFFER: 0x8892,
            STATIC_DRAW: 0x88E4,
            TRIANGLES: 0x0004,
            FLOAT: 0x1406,
            drawingBufferWidth: 800,
            drawingBufferHeight: 600,
            createBuffer: vi.fn().mockReturnValue({} as WebGLBuffer),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            useProgram: vi.fn(),
            getAttribLocation: vi.fn().mockReturnValue(2),
            vertexAttribPointer: vi.fn(),
            enableVertexAttribArray: vi.fn(),
            disableVertexAttribArray: vi.fn(),
            drawArrays: vi.fn(),
            uniformMatrix3fv: vi.fn(),
            uniform1f: vi.fn(),
            getUniformLocation: vi.fn().mockImplementation((_p: any, name: string) => ({ name }) as any),
        } as unknown as WebGLRenderingContext;

		program = {} as WebGLProgram;
	});

    it('sets up called when constructed', () => {
		const grid = new Grid();
        (grid as any).setUpVertexData = vi.fn();
		(grid as any).setUpUniforms = vi.fn();

        grid.render(gl, program);
        expect((grid as any).setUpVertexData).toHaveBeenCalledWith(gl, program);
		expect((grid as any).setUpUniforms).toHaveBeenCalledWith(gl, program);
    });

	it('creates buffer once and uploads positions, then draws', () => {
		const grid = new Grid();

		// First render builds buffer and initializes
		grid.render(gl, program);
		expect(gl.createBuffer).toHaveBeenCalled();
		expect(gl.bindBuffer).toHaveBeenCalledWith(gl.ARRAY_BUFFER, (grid as any).buffer);
		expect(gl.bufferData).toHaveBeenCalledWith(gl.ARRAY_BUFFER, expect.any(Float32Array), gl.STATIC_DRAW);
		expect(gl.useProgram).toHaveBeenCalledWith(program);


		// Uniforms forwarded via setUpUniforms and render path
		expect(gl.getUniformLocation).toHaveBeenCalledWith(program, 'u_ViewProjectionInvMatrix');
		expect(gl.getUniformLocation).toHaveBeenCalledWith(program, 'u_ZoomScale');
		expect(gl.getUniformLocation).toHaveBeenCalledWith(program, 'u_CheckboardStyle');

		// Attribute set up and draw
		expect(gl.getAttribLocation).toHaveBeenCalledWith(program, 'a_Position');
		expect(gl.vertexAttribPointer).toHaveBeenCalledWith(2, 2, gl.FLOAT, false, 0, 0);
		expect(gl.enableVertexAttribArray).toHaveBeenCalledWith(2);
		expect(gl.drawArrays).toHaveBeenCalledWith(gl.TRIANGLES, 0, (grid as any).vertexCount);
		expect(gl.disableVertexAttribArray).toHaveBeenCalledWith(2);

		// Second render reuses buffer (no createBuffer), still binds and draws
		vi.clearAllMocks();
		grid.render(gl, program);
		expect(gl.createBuffer).not.toHaveBeenCalled();
		expect(gl.bindBuffer).toHaveBeenCalled();
		expect(gl.drawArrays).toHaveBeenCalled();
	});

    it('throws if buffer is not defined', () => {
        const grid = new Grid();
        gl.createBuffer = vi.fn().mockReturnValue(null);
        expect(() => grid.render(gl, program)).toThrowError("Failed to create grid buffer");
    });

	it('throws if a_Position not found', () => {
		const grid = new Grid();
		gl.getAttribLocation = vi.fn().mockReturnValue(-1);
		expect(() => grid.render(gl, program)).toThrowError('Attribute a_Position not found in grid program');
	});
});

describe('destroy', () => {
    let grid = new Grid();
    
    beforeEach(() => {
        grid = new Grid();
        grid.render({
            createBuffer: vi.fn().mockReturnValue({} as WebGLBuffer),
            bindBuffer: vi.fn(),
            bufferData: vi.fn(),
            useProgram: vi.fn(),
            getAttribLocation: vi.fn().mockReturnValue(2),
            vertexAttribPointer: vi.fn(),
            enableVertexAttribArray: vi.fn(),
            disableVertexAttribArray: vi.fn(),
            drawArrays: vi.fn(),
            uniformMatrix3fv: vi.fn(),
            uniform1f: vi.fn(),
            getUniformLocation: vi.fn().mockImplementation((_p: any, name: string) => ({ name }) as any),
            ARRAY_BUFFER: 0x8892,
            STATIC_DRAW: 0x88E4,
            TRIANGLES: 0x0004,
            FLOAT: 0x1406,
            drawingBufferWidth: 800,
            drawingBufferHeight: 600,
        } as any, {} as WebGLProgram);
    });

	it('clears buffer handle', () => {
		expect((grid as any).buffer).not.toBeNull();
		grid.destroy();
		expect((grid as any).buffer).toBeNull();
	});

    it('tests alternative path', () => {
        (grid as any).buffer = null;
        const bufferSetSpy = vi.spyOn(grid as any, 'buffer', 'set');
        grid.destroy();
        expect(bufferSetSpy).toHaveBeenCalledTimes(0);
    })
});
