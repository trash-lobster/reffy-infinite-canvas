import { it, expect, describe } from 'vitest';
import { oppositeCorner, BoundingBoxCollisionType } from '../../../src/util';

describe('Handles', () => {
    it('should return opposite handle type', () => {
        expect(oppositeCorner('TOPLEFT')).toBe('TOPRIGHT');
        expect(oppositeCorner('TOPRIGHT')).toBe('TOPLEFT');
        expect(oppositeCorner('BOTTOMLEFT')).toBe('BOTTOMRIGHT');
        expect(oppositeCorner('BOTTOMRIGHT')).toBe('BOTTOMLEFT');
    })

    it('should return the same handle type', () => {
        expect(oppositeCorner('TOP')).toBe('TOP');
        expect(oppositeCorner('BOTTOM')).toBe('BOTTOM');
        expect(oppositeCorner('LEFT')).toBe('LEFT');
        expect(oppositeCorner('RIGHT')).toBe('RIGHT');
    })
})