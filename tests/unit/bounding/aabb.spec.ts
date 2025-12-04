import { describe, it, expect } from 'vitest';
import { AABB } from '../../../src/bounding/AABB';

describe('AABB', () => {
    it('creates an instance as expected', () => {
        const box = new AABB(0, 0, 10, 5);
        expect(box.minX).toBe(0);
        expect(box.minY).toBe(0);
        expect(box.maxX).toBe(10);
        expect(box.maxY).toBe(5);
    })

    it('computes area correctly', () => {
        const box = new AABB(0, 0, 10, 5);
        expect(box.getArea()).toBe(50);
    });

    it('detects collision for overlapping boxes', () => {
        const a = new AABB(0, 0, 10, 10);
        const b = new AABB(5, 5, 15, 15);
        expect(AABB.isColliding(a, b)).toBe(true);
    });

    it('detects no collision for separated boxes', () => {
        const a = new AABB(0, 0, 10, 10);
        const b = new AABB(11, 11, 20, 20);
        expect(AABB.isColliding(a, b)).toBe(false);
    });

    it('edge-touching counts as collision', () => {
        const a = new AABB(0, 0, 10, 10);
        const b = new AABB(10, 10, 20, 20);
        expect(AABB.isColliding(a, b)).toBe(true);
    });


});
