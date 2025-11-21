import { expect, it, describe, vi } from 'vitest';
import { createProgram } from '../../../src/util/shaders';

function mockWebGLContext(options: { shaderCompileSuccess?: boolean; programLinkSuccess?: boolean } = {}) {
    const {
        shaderCompileSuccess = true,
        programLinkSuccess = true,
    } = options;

    const shaders: any[] = [];
    const programs: any[] = [];

    return {
        VERTEX_SHADER: 0x8b31,
        FRAGMENT_SHADER: 0x8b30,
        createShader: vi.fn((type) => {
            const shader = { type, deleted: false };
            shaders.push(shader);
            return shader;
        }),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => shaderCompileSuccess),
        deleteShader: vi.fn((shader) => { shader.deleted = true; }),
        createProgram: vi.fn(() => {
            const program = { attached: [], deleted: false };
            programs.push(program);
            return program;
        }),
        attachShader: vi.fn((program, shader) => { program.attached.push(shader); }),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn(() => programLinkSuccess),
        deleteProgram: vi.fn((program) => { program.deleted = true; }),
        detachShader: vi.fn((program, shader) => {
            program.attached = program.attached.filter((s: any) => s !== shader);
        }),
    } as unknown as WebGLRenderingContext;
}

describe('shaders.ts', () => {
    const vertSource = 'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0, 1); }';
    const fragSource = 'void main() { gl_FragColor = vec4(1,0,0,1); }';

    it('creates and links a program successfully', () => {
        const gl = mockWebGLContext();
        const program = createProgram(gl, vertSource, fragSource);
        expect(program).toBeDefined();
        expect(gl.createShader).toHaveBeenCalledTimes(2);
        expect(gl.attachShader).toHaveBeenCalledTimes(2);
        expect(gl.linkProgram).toHaveBeenCalledTimes(1);
        expect(gl.detachShader).toHaveBeenCalledTimes(2);
    });

    it('throws if shader compilation fails', () => {
        const gl = mockWebGLContext({ shaderCompileSuccess: false });
        expect(() => createProgram(gl, vertSource, fragSource)).toThrow('Shader was not created.');
    });

    it('throws if program linking fails', () => {
        const gl = mockWebGLContext({ programLinkSuccess: false });
        expect(() => createProgram(gl, vertSource, fragSource)).toThrow('Program was not created or the link to shaders was not successful.');
    });
});