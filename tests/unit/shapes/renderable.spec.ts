import { expect, describe, it, vi } from 'vitest';
import { Rect } from '../../../src/shapes';
import EventEmitter from 'eventemitter3';

describe('Renderable constructor', () => {
    it('creates a new renderableState on construct', () => {
        const rect = new Rect({});

        expect(rect.state).not.toBe(undefined);
    });
});

describe('Getter', () => {
    it('returns x, y, sx, sy and angleRadians from state', () => {
        const rect = new Rect({ x: 10, y: 20, sx: 2, sy: -1 });
        expect(rect.x).toBe(10);
        expect(rect.y).toBe(20);
        expect(rect.sx).toBe(2);
        expect(rect.sy).toBe(-1);
        expect(rect.angleRadians).toBe(0);
    });

    it('dirty getter reflects state', () => {
        const rect = new Rect({});
        expect(rect.dirty).toBe(true); // default dirty on new renderable
        rect.clearDirty();
        expect(rect.dirty).toBe(false);
        rect.markDirty();
        expect(rect.dirty).toBe(true);
    });

    it('localMatrix and worldMatrix getters reflect state', () => {
        const rect = new Rect({});
        // update matrices via public methods
        rect.updateLocalMatrix();
        rect.setWorldMatrix([1, 0, 0, 1, 0, 0]);
        expect(Array.isArray(rect.localMatrix)).toBe(true);
        expect(Array.isArray(rect.worldMatrix)).toBe(true);
    });

    it('children and parent getters reflect tree', () => {
        const parent = new Rect({});
        const child = new Rect({});
        parent.appendChild(child);
        expect(parent.children.includes(child)).toBe(true);
        expect(child.parent).toBe(parent);
        child.setParent(null);
        expect(child.parent).toBe(null);
    });
});

describe('Setter', () => {
    it('tests updateTranslation', () => {
        const rect = new Rect({x: 100, y: 200});
        rect.updateTranslation(50, 60);
        expect(rect.x).toBe(150);
        expect(rect.y).toBe(260);
    });

    it('tests updateScale', () => {
        const rect = new Rect({sx: 100, sy: 200});
        rect.updateScale(2, 3);
        expect(rect.sx).toBe(200);
        expect(rect.sy).toBe(600);
    });

    it('tests setAngle', () => {
        const rect = new Rect({});
        expect(rect.angleRadians).toBe(0);
        rect.setAngle(100);
        expect(rect.angleRadians).toBeCloseTo((360 - 100) * Math.PI / 180, 6);
    });

    it('tests flipVertical', () => {
        const rect = new Rect({x: 100, y: 200});
        
        rect.flipVertical(50);
        
        expect(rect.dirty).toBe(true);
        expect(rect.y).toBe(250);
        expect(rect.sy).toBe(-1);
    });

    it('tests flipHorizontal', () => {
        const rect = new Rect({x: 100, y: 200});
        
        rect.flipHorizontal(50);
        
        expect(rect.dirty).toBe(true);
        expect(rect.x).toBe(150);
        expect(rect.sx).toBe(-1);
    });

    it('tests clearChildren', () => {
        const parent = new Rect({});
        const child = new Rect({});

        parent.appendChild(child);
        
        expect(parent.children.length).toBe(1);
        parent.clearChildren();
        expect(parent.children.length).toBe(0);
    });
});

describe('appendChild', () => {
    it('tests when parent has no emitter', () => {
        const parent = new Rect({});
        const child = new Rect({});

        child.setParent = vi.fn();

        const res = parent.appendChild(child);

        expect(child.setParent).toHaveBeenCalledOnce();
        expect(child._emitter).toBe(undefined);
        expect(res).toBe(child);
    });

    it('tests when parent has emitter', () => {
        const parent = new Rect({});
        const child = new Rect({});
        const emitter = new EventEmitter();
        parent._emitter = emitter;
        child.setParent = vi.fn();

        const res = parent.appendChild(child);

        expect(child._emitter).toBe(emitter);
    });
});

describe('setParent', () => {
    it('tests that parent and child call reciprocal methods', () => {
        const parent = new Rect({});
        const child = new Rect({});

        parent.addChild = vi.fn();
        child.addParent = vi.fn();

        child.setParent(parent);

        expect(parent.addChild).toHaveBeenCalledOnce();
        expect(child.addParent).toHaveBeenCalledOnce();
    });

    it('tests when parent is null', () => {
        const parent = new Rect({});
        const child = new Rect({});

        parent.addChild = vi.fn();
        child.addParent = vi.fn();

        child.setParent(null);

        expect(parent.addChild).not.toHaveBeenCalled();
        expect(child.addParent).toHaveBeenCalledOnce();
    });

    it('tests when child is already in the parent\'s children list', () => {
        const parent = new Rect({});
        const child = new Rect({});
        const otherChild = new Rect({});
        
        child.setParent(parent);
        otherChild.setParent(parent);

        expect(parent.children.indexOf(child)).toBe(0);

        child.setParent(parent);

        expect(parent.children.indexOf(child)).toBe(1);
    });

    it('tests when child is already in the parent\'s children list', () => {
        const parent = new Rect({});
        const child = new Rect({});
        const otherChild = new Rect({});
        
        child.setParent(parent);
        otherChild.setParent(parent);
        
        expect(parent.children.indexOf(child)).toBe(0);

        child.setParent(parent);

        expect(parent.children.indexOf(child)).toBe(1);
    });
});

describe('updateWorldMatrix', () => {
    it('tests updateWorldMatrix without passing a parentWorldMatrix', () => {
        const rect = new Rect({});
        rect.updateLocalMatrix = vi.fn();
        rect.state.updateWorldMatrix = vi.fn();

        rect.updateWorldMatrix();

        expect(rect.updateLocalMatrix).toHaveBeenCalledOnce();
        expect(rect.state.updateWorldMatrix).toHaveBeenCalledOnce();
    });

    it('tests updateWorldMatrix and pass a parentWorldMatrix', () => {
        const rect = new Rect({});
        rect.updateLocalMatrix = vi.fn();
        rect.state.updateWorldMatrix = vi.fn();

        rect.updateWorldMatrix([1, 2]);

        expect(rect.updateLocalMatrix).toHaveBeenCalledOnce();
        expect(rect.state.updateWorldMatrix).toHaveBeenCalledWith([1, 2]);
    });
});

describe('Events', () => {
    it('adds a function listener and dispatches event', () => {
        const rect = new Rect({});
        const emitter = new EventEmitter();
        rect._emitter = emitter;

        const fn = vi.fn();
        
        rect.addEventListener('test', fn);
        
        const e = new Event('test');
        const res = rect.dispatchEvent(e);
        expect(res).toBe(true);
        expect(fn).toHaveBeenCalledWith(e);
    });

    it('adds an object listener with handleEvent and dispatches', () => {
        const rect = new Rect({});
        const emitter = new EventEmitter();
        rect._emitter = emitter;

        const obj = { handleEvent: vi.fn() } as EventListenerObject;
        rect.addEventListener('hello', obj);

        const e = new Event('hello');
        rect.dispatchEvent(e);
        expect(obj.handleEvent).toHaveBeenCalledWith(e);
    });

    it('propagates defaultPrevented from listener', () => {
        const rect = new Rect({});
        const emitter = new EventEmitter();
        rect._emitter = emitter;

        rect.addEventListener('block', (e: Event) => e.preventDefault());
        const e = new Event('block', {
            cancelable: true,
        });
        const res = rect.dispatchEvent(e);
        expect(res).toBe(false);
    });
});

interface RectTestHooks {
    updateUniforms: (gl: WebGLRenderingContext) => void;
    setUpUniforms: (gl: WebGLRenderingContext, program: WebGLProgram) => void;
    setUpVertexData: (gl: WebGLRenderingContext, program: WebGLProgram) => void;
    draw: (fl: WebGLRenderingContext) => void;
    initialized: boolean;
    positionBuffer: WebGLBuffer | null;
    attributeLocation: number | WebGLUniformLocation;
    matrixLocation: number | WebGLUniformLocation;
    resolutionLocation: number | WebGLUniformLocation;
}

describe('WebGLRenderable internals', () => {
    it('updateVertexData binds buffer and uploads data', () => {
        const rect = new Rect({});
        // Provide positions and a buffer
        rect.getPositions = vi.fn().mockReturnValue([0, 0, 1, 0, 0, 1]);
        const gl = {} as WebGLRenderingContext;
        (rect as unknown as RectTestHooks).positionBuffer = {} as WebGLBuffer;
        (gl as any).ARRAY_BUFFER = 0x8892;
        (gl as any).STATIC_DRAW = 0x88E4;
        gl.bindBuffer = vi.fn();
        gl.bufferData = vi.fn();

        (rect as any).updateVertexData(gl);

        expect(gl.bindBuffer).toHaveBeenCalledWith((gl as any).ARRAY_BUFFER, (rect as any).positionBuffer);
        expect(gl.bufferData).toHaveBeenCalledWith((gl as any).ARRAY_BUFFER, expect.any(Float32Array), (gl as any).STATIC_DRAW);
    });

    it('setUpVertexData creates buffer and sets attribute location', () => {
        const rect = new Rect({});
        const gl = {} as WebGLRenderingContext;
        const program = {} as WebGLProgram;
        gl.createBuffer = vi.fn().mockReturnValue({} as WebGLBuffer);
        gl.getAttribLocation = vi.fn().mockReturnValue(3);

        (rect as unknown as RectTestHooks).setUpVertexData(gl, program);

        expect(gl.createBuffer).toHaveBeenCalled();
        expect((rect as unknown as RectTestHooks).positionBuffer).toBeDefined();
        expect(gl.getAttribLocation).toHaveBeenCalledWith(program, 'a_position');
        expect((rect as unknown as RectTestHooks).attributeLocation).toBe(3);
    });

    it('setUpUniforms stores uniform locations', () => {
        const rect = new Rect({});
        const gl = {} as WebGLRenderingContext;
        const program = {} as WebGLProgram;
        gl.getUniformLocation = vi.fn().mockImplementation((_p: any, name: string) => ({ name }) as any);

        (rect as unknown as RectTestHooks).setUpUniforms(gl, program);

        expect((gl as any).getUniformLocation).toHaveBeenCalledWith(program, 'u_resolution');
        expect((gl as any).getUniformLocation).toHaveBeenCalledWith(program, 'u_matrix');
        expect((rect as unknown as RectTestHooks).resolutionLocation).toBeDefined();
        expect((rect as unknown as RectTestHooks).matrixLocation).toBeDefined();
    });

    it('updateUniforms writes resolution and matrix uniforms', () => {
        const rect = new Rect({});
        const gl = {} as WebGLRenderingContext;
        (gl as any).canvas = { width: 640, height: 480 } as any;
        (gl as any).uniform2f = vi.fn();
        (gl as any).uniformMatrix3fv = vi.fn();

        (rect as unknown as RectTestHooks).resolutionLocation = {} as WebGLUniformLocation;
        (rect as unknown as RectTestHooks).matrixLocation = {} as WebGLUniformLocation;
        rect.setWorldMatrix([1, 0, 0, 1, 0, 0]);

        (rect as unknown as RectTestHooks).updateUniforms(gl);

        expect((gl as any).uniform2f).toHaveBeenCalledWith((rect as any).resolutionLocation, 640, 480);
        expect((gl as any).uniformMatrix3fv).toHaveBeenCalledWith((rect as any).matrixLocation, false, rect.worldMatrix);
    });
});

