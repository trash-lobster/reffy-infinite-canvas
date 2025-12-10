import { expect, describe, it, vi, afterEach, beforeEach } from 'vitest';
import { Rect, Shape } from '../../../src/shapes';

afterEach(() => {
    vi.restoreAllMocks();
    Reflect.set(Shape, '_seqCounter', 0);
});

interface RectTestHooks {
    updateUniforms: (gl: WebGLRenderingContext) => void;
    setUpUniforms: (gl: WebGLRenderingContext, program: WebGLProgram) => void;
    setUpVertexData: (gl: WebGLRenderingContext, program: WebGLProgram) => void;
    draw: (fl: WebGLRenderingContext) => void;
    initialized: boolean;
    positionBuffer: WebGLBuffer | null;
}

describe('Shape abstract class constructor', () => {
    it('confirms that setTranslation and setScale are called', () => {
        const setTranslationSpy = vi.spyOn(Rect.prototype as any, 'setTranslation');
        const setScaleSpy = vi.spyOn(Rect.prototype as any, 'setScale');

        const rect: Rect = new Rect({x: 100, y: 200, sx: 2, sy: -1});
        expect(setTranslationSpy).toHaveBeenCalledWith(100, 200);
        expect(setScaleSpy).toHaveBeenCalledWith(2, -1);
    });
});

describe('getter', () => {
    it('tests get renderOrder', () => {
        const rect: Rect = new Rect({x: 100, y: 200, sx: 2, sy: -1});
        expect(rect.renderOrder).toBe(0);
        rect.markDirty = vi.fn();

        rect.renderOrder = 10;
        expect(rect.markDirty).toHaveBeenCalledOnce();
        expect(rect.renderOrder).toBe(10);

        rect.renderOrder = 10;
        expect(rect.markDirty).toHaveBeenCalledOnce();
    });

    it('gets seq', () => {
        const rect: Rect = new Rect({x: 100, y: 200, sx: 2, sy: -1});
        expect(rect.seq).toBe(0);
    });

    it('tests that seq increases on each creation', () => {
        const rect: Rect = new Rect({x: 100, y: 200, sx: 2, sy: -1});
        const rect2 = new Rect({x: 100, y: 200, sx: 2, sy: -1});
        expect(rect2.seq).toBe(1);
    });

    it('tests getZ', () => {
        const rect: Rect = new Rect({x: 100, y: 200, sx: 2, sy: -1});
        expect(rect.getZ()).toBe(0.5);

        rect.renderOrder = 10;
        expect(rect.getZ()).toBe(0.5 + 0.0001 * 10);

        rect.renderOrder = -10;
        expect(rect.getZ()).toBe(0.5 + 0.0001 * -10);
    });
});

describe('shape render', () => {
    const gl = {} as WebGLRenderingContext;
    const program = {} as WebGLProgram;
    let rect: Rect = new Rect({x: 100, y: 200, sx: 2, sy: -1});

    beforeEach(() => {
        vi.clearAllMocks();

        rect.updateWorldMatrix = vi.fn();
        rect.updateVertexData = vi.fn();
        (rect as unknown as RectTestHooks).setUpVertexData = vi.fn();
        (rect as unknown as RectTestHooks).setUpUniforms = vi.fn();
        (rect as unknown as RectTestHooks).updateUniforms = vi.fn();

        gl.useProgram = vi.fn();
        gl.createBuffer = vi.fn();
        gl.bindBuffer = vi.fn();
        gl.bufferData = vi.fn();
        gl.vertexAttribPointer = vi.fn();
        gl.enableVertexAttribArray = vi.fn();
        gl.drawArrays = vi.fn();
        gl.getUniformLocation = vi.fn().mockReturnValueOnce(null);
    });

    it('tests render', () => {
        rect.clearDirty();

        rect.render(gl, program);
        expect(rect.updateWorldMatrix).toHaveBeenCalledWith(undefined);
    });

    it('tests for updateWorldMatrix with parent', () => {
        const parent: Rect = new Rect({x: 100, y: 200, sx: 2, sy: -1});
        parent.setWorldMatrix([1, 0, 0, 0, 1, 0, 0, 0, 1]);
        
        rect.setParent(parent);
        rect.clearDirty();

        rect.render(gl, program);
        expect(rect.updateWorldMatrix).toHaveBeenCalledWith(parent.worldMatrix);
        expect((rect as unknown as RectTestHooks).updateUniforms).toHaveBeenCalledOnce();
    });

    it('tests for initialized process', () => {
        rect.markDirty();
        (rect as unknown as RectTestHooks).initialized = false;

        rect.render(gl, program);
        expect((rect as unknown as RectTestHooks).setUpVertexData).toHaveBeenCalledOnce();
        expect((rect as unknown as RectTestHooks).setUpUniforms).toHaveBeenCalledOnce();
        expect((rect as unknown as RectTestHooks).initialized).toBe(true);
    });

    it('tests that initialized process is not called when initialized to be true', () => {
        rect.markDirty();
        (rect as unknown as RectTestHooks).initialized = true;

        rect.render(gl, program);
        expect((rect as unknown as RectTestHooks).setUpVertexData).not.toHaveBeenCalled();
        expect((rect as unknown as RectTestHooks).setUpUniforms).not.toHaveBeenCalled();
        expect((rect as unknown as RectTestHooks).initialized).toBe(true);
    });

    it('tests that uniform4fv is called when uCVolor is found', () => {
        (rect as unknown as RectTestHooks).initialized = true;

        gl.getUniformLocation = vi.fn().mockReturnValueOnce('true');
        gl.uniform4fv = vi.fn();

        rect.render(gl, program);
        expect(gl.uniform4fv).toHaveBeenCalledWith('true', rect.color);
    });

    it('tests that draw method is called when shape is not culled', () => {
        (rect as unknown as RectTestHooks).initialized = true;
        (rect as unknown as RectTestHooks).draw = vi.fn();
        rect.culled = false;

        rect.render(gl, program);
        expect((rect as unknown as RectTestHooks).draw).toHaveBeenCalledWith(gl);
    });

    it('tests that draw method is not called when shape is culled', () => {
        (rect as unknown as RectTestHooks).initialized = true;
        (rect as unknown as RectTestHooks).draw = vi.fn();
        rect.culled = true;

        rect.render(gl, program);
        expect((rect as unknown as RectTestHooks).draw).not.toHaveBeenCalled();
    });
});

describe('destroy', () => {
    it('tests that positionBuffer is cleared', () => {
        const rect: Rect = new Rect({x: 100, y: 200, sx: 2, sy: -1});
        (rect as unknown as RectTestHooks).positionBuffer = {} as WebGLBuffer;
        (rect as unknown as RectTestHooks).initialized = true;

        rect.destroy();
        expect((rect as unknown as RectTestHooks).positionBuffer).toBe(undefined);
        expect((rect as unknown as RectTestHooks).initialized).toBe(false);
    });

    it('tests that if positionBuffer is not defined, it won\' be cleared', () => {
        const rect: Rect = new Rect({x: 100, y: 200, sx: 2, sy: -1});
        (rect as unknown as RectTestHooks).positionBuffer = null;

        rect.destroy();
        expect((rect as unknown as RectTestHooks).positionBuffer).toBe(null);
    });
});