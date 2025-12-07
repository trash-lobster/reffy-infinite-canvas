import { describe, it, expect, vi } from 'vitest';
import { MarqueeSelectionBox } from '../../../src/bounding';
import { BORDERPX } from '../../../src/util';

const I = [1, 0, 0, 0, 1, 0, 0, 0, 1];

describe('marquee selection render', () => {
    const gl = {} as WebGLRenderingContext;
    const program = {} as WebGLProgram;

    it('calls update and renders all relevant rects', () => {
         const box = new MarqueeSelectionBox(0, 0, I);

        // Spy on update
        const updateSpy = vi.spyOn(box, 'update');

        // Replace render on each side/corner with a spy to avoid touching WebGL
        for (const [, rect] of box.rects.entries()) {
            rect.render = vi.fn();
        }

        box.render(gl, program);

        // update was called
        expect(updateSpy).toHaveBeenCalledTimes(1);

        for (const [, rect] of box.rects.entries()) {
            expect(rect.render).toHaveBeenCalledTimes(1);
            expect(rect.render).toHaveBeenCalledWith(gl, program);
        }
    });
});

describe('marquee destroy', () => {
    it('calls update and renders all relevant rects', () => {
        const box = new MarqueeSelectionBox(0, 0, I);

        // Spy on update
        const updateSpy = vi.spyOn(box, 'destroy');

        // Replace render on each side/corner with a spy to avoid touching WebGL
        for (const [, rect] of box.rects.entries()) {
            rect.destroy = vi.fn();
        }

        box.destroy();

        // update was called
        expect(updateSpy).toHaveBeenCalledTimes(1);

        for (const [, rect] of box.rects.entries()) {
            expect(rect.destroy).toHaveBeenCalledTimes(1);
        }
    });
})

describe('add rects when initialised', () => {
    it('creates TOP rect with positive width', () => {
        const box = new MarqueeSelectionBox(0, 0, I);

        // // expect width and height to be adjusted
        // box.resize(100, 100, I);
        const rect = box.rects.get('TOP');
        expect(rect!.width).toBe(0);
        box.update();

        expect(rect).toBeDefined();
        expect(rect!.width).toBe(BORDERPX);
    })
})

describe('recalculate rect dimensions after adjustment with negative resize', () => {
    it('updates rects with negative width', () => {
        const box = new MarqueeSelectionBox(0, 0, I);

        // // expect width and height to be adjusted
        box.resize(-100, 100, I);
        const top = box.rects.get('TOP');
        const bottom = box.rects.get('BOTTOM');
        box.update();
        expect(top!.width).toBe(-100);
        expect(bottom!.width).toBe(-100);
    })

    it('updates rects with negative height', () => {
        const box = new MarqueeSelectionBox(0, 0, I);

        // // expect width and height to be adjusted
        box.resize(-100, -100, I);
        const left = box.rects.get('LEFT');
        box.update();
        expect(left!.height).toBe(-100);
    })
})

describe('get bounding box', () => {
    it('returns expected normal bounding box', () => {
        const box = new MarqueeSelectionBox(0, 50, I);
        box.resize(100, 200, I);

        const getWorldCoords = (x: number, y: number) => [x, y];

        const aabb = box.getBoundingBox(getWorldCoords);

        expect(aabb.minX).toBe(0);
        expect(aabb.maxX).toBe(100);
        expect(aabb.minY).toBe(50);
        expect(aabb.maxY).toBe(250);
    });

    it('returns bounding box adjusted to negative direction', () => {
        const box = new MarqueeSelectionBox(0, 50, I);
        box.resize(-100, -200, I);

        const getWorldCoords = (x: number, y: number) => [x, y];

        const aabb = box.getBoundingBox(getWorldCoords);

        expect(aabb.minX).toBe(-100);
        expect(aabb.maxX).toBe(0);
        expect(aabb.minY).toBe(-150);
        expect(aabb.maxY).toBe(50);
    });
})