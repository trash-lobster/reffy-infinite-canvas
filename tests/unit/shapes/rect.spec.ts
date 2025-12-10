import { expect, test, describe, it, vi } from 'vitest';
import { Rect } from '../../../src/shapes';

describe('Rect constructor', () => {
    it('will assign the correct values from construction', () => {
        const x = 100, y = 40, width = 50, height = 60, sx = 1, sy = 0.1;
        const rect = new Rect({ x, y, width, height, sx, sy });

        expect(rect.state.x).toBe(x);
        expect(rect.state.y).toBe(y);
        expect(rect.width).toBe(width);
        expect(rect.height).toBe(height);
        expect(rect.state.scaleX).toBe(sx);
        expect(rect.state.scaleY).toBe(sy);
    });

    it('will assign the correct values from construction without height and width', () => {
        const x = 100, y = 40, sx = 1, sy = 0.1;
        const rect = new Rect({ x, y, sx, sy });

        expect(rect.width).toBe(100);
        expect(rect.height).toBe(100);
    });

    it('tests that markdirty is called when setting width and height', () => {
        const x = 100, y = 40, sx = 1, sy = 0.1;
        const rect = new Rect({ x, y, sx, sy });

        rect.markDirty = vi.fn();

        rect.width = 200;
        rect.height = 200;
        expect(rect.markDirty).toHaveBeenCalledTimes(2);
    });

    it('tests that markdirty is not called when setting width and height that is already the values', () => {
        const x = 100, y = 40, sx = 1, sy = 0.1;
        const rect = new Rect({ x, y, sx, sy });

        rect.markDirty = vi.fn();

        rect.width = 100;
        rect.height = 100;
        expect(rect.markDirty).not.toHaveBeenCalled();
    });
});

describe('getters', () => {
    it('tests that vertexCount returns 6', () => {
        const x = 100, y = 40, sx = 1, sy = 0.1;
        const rect = new Rect({ x, y, sx, sy });

        const res = rect.getVertexCount();
        expect(res).toBe(6);
    });

    it('tests that getPositions returns the correct values', () => {
        const x = 100, y = 40, height = 40, sx = 1, sy = 0.1;
        const rect = new Rect({ x, y, sx, sy, height });

        const res = rect.getPositions();
        expect(res).toStrictEqual([
            0, 0,
            0, 40,
            100, 0,
            100, 0,
            0, 40,
            100, 40,
        ]);
    });

    it('getBoundingBox with no flip', () => {
        const x = 10, y = 20, width = 30, height = 40, sx = 1, sy = 0.1;
        const rect = new Rect({ x, y, sx, sy, width, height });

        const aabb = rect.getBoundingBox();
        expect(aabb.minX).toBe(10);
        expect(aabb.maxX).toBe(40);
        expect(aabb.minY).toBe(20);
        expect(aabb.maxY).toBe(24);
    });

    it('getBoundingBox with flip', () => {
        const x = 10, y = 20, width = 30, height = 40, sx = 1, sy = -1;
        const rect = new Rect({ x, y, sx, sy, width, height });

        const aabb = rect.getBoundingBox();
        expect(aabb.minX).toBe(10);
        expect(aabb.maxX).toBe(40);
        expect(aabb.minY).toBe(-20);
        expect(aabb.maxY).toBe(20);
    });

    it('getEdge', () => {
        const x = 10, y = 20, width = 30, height = 40, sx = 1, sy = 1;
        const rect = new Rect({ x, y, sx, sy, width, height });

        const edges = rect.getEdge();
        expect(edges.minX).toBe(10);
        expect(edges.maxX).toBe(40);
        expect(edges.minY).toBe(20);
        expect(edges.maxY).toBe(60);
    });

    it('getEdge with flipped dimensions', () => {
        const x = 10, y = 20, width = -30, height = -40, sx = 1, sy = 1;
        const rect = new Rect({ x, y, sx, sy, width, height });

        const edges = rect.getEdge();
        expect(edges.minX).toBe(-20);
        expect(edges.maxX).toBe(10);
        expect(edges.minY).toBe(-20);
        expect(edges.maxY).toBe(20);
    });
})

describe('hitTest', () => {
    it('inside hit with positive scales', async () => {        
        const rect = new Rect({ x: 10, y: 20, sx: 1, sy: 1, width: 30, height: 40 });
        const parent = new Rect({ x: 0, y: 0, sx: 1, sy: 1, width: 30, height: 40 });
        parent.setWorldMatrix([1, 0, 0, 0, 1, 0, 0, 0, 1]);
        rect.addParent(parent);
        rect.setWorldMatrix([1, 0, 0, 0, 1, 0, 10, 20, 1]);

        const hit = rect.hitTest(22, 42);
        expect(hit).toBe(true);
    });

    it('outside hit with positive scales', async () => {
        const rect = new Rect({ x: 10, y: 20, sx: 1, sy: 1, width: 30, height: 40 });
        const parent = new Rect({ x: 0, y: 0, sx: 1, sy: 1, width: 30, height: 40 });
        parent.setWorldMatrix([1, 0, 0, 0, 1, 0, 0, 0, 1]);
        rect.addParent(parent);
        rect.setWorldMatrix([1, 0, 0, 0, 1, 0, 10, 20, 1]);

        const hit = rect.hitTest(1000, 1000);
        expect(hit).toBe(false);
    });

    it('inside hit with negative scale sign (flip)', async () => {
        const rect = new Rect({ x: 10, y: 20, sx: 1, sy: -1, width: 30, height: 40 });
        const parent = new Rect({ x: 0, y: 0, sx: 1, sy: 1, width: 30, height: 40 });
        parent.setWorldMatrix([1, 0, 0, 0, 1, 0, 0, 0, 1]);
        rect.addParent(parent);
        rect.setWorldMatrix([1, 0, 0, 0, -1, 0, 10, 20, 1]);

        const hit = rect.hitTest(10, 19);
        expect(hit).toBe(true);
    });

    it('boundary edges inclusive', async () => {
        const rect = new Rect({ x: 10, y: 20, sx: 1, sy: 1, width: 30, height: 40 });
        const parent = new Rect({ x: 0, y: 0, sx: 1, sy: 1, width: 30, height: 40 });
        parent.setWorldMatrix([1, 0, 0, 0, 1, 0, 0, 0, 1]);
        rect.addParent(parent);
        rect.setWorldMatrix([1, 0, 0, 0, 1, 0, 10, 20, 1]);

        const hit = rect.hitTest(40, 60);
        expect(hit).toBe(true);
    });
})