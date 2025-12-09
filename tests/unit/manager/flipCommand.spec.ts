import { describe, it, expect } from 'vitest';
import { Rect } from '../../../src/shapes';
import { FlipSnapshot, makeFlipCommand, makeMultiFlipCommand } from '../../../src/manager';

describe('Flip command', () => {
    it('applies flip and do', () => {
        const renderable = new Rect({});
        const start: FlipSnapshot = { x: 100, y: 50, sx: 12, sy: 32, };
        const end: FlipSnapshot = { x: 200, y: 150, sx: 4, sy: 40, };

        const command = makeFlipCommand(renderable, start, end);
        command.do();
        expect(renderable.x).toBe(200);
        expect(renderable.y).toBe(150);
        expect(renderable.sx).toBe(4);
        expect(renderable.sy).toBe(40);
    });

    it('applies flip and undo', () => {
        const renderable = new Rect({});
        const start: FlipSnapshot = { x: 100, y: 50, sx: 12, sy: 32, };
        const end: FlipSnapshot = { x: 200, y: 150, sx: 4, sy: 40, };

        const command = makeFlipCommand(renderable, start, end);
        command.undo();
        expect(renderable.x).toBe(100);
        expect(renderable.y).toBe(50);
        expect(renderable.sx).toBe(12);
        expect(renderable.sy).toBe(32);
    });    
})

describe('Multi Flip command', () => {
    it('applies flip to multiple entries and flips horizontal scale on do', () => {
        const r1 = new Rect({});
        const r2 = new Rect({});
        const start1: FlipSnapshot = { x: 0, y: 0, sx: 1, sy: 1 };
        const end1: FlipSnapshot = { x: 10, y: 20, sx: 2, sy: 3 };
        const start2: FlipSnapshot = { x: -5, y: -7, sx: 4, sy: 5 };
        const end2: FlipSnapshot = { x: 15, y: 25, sx: 6, sy: 7 };

        const multiBoundingBox: any = { scale: [1, 1] };

        const cmd = makeMultiFlipCommand([
            { ref: r1 as any, start: start1, end: end1 },
            { ref: r2 as any, start: start2, end: end2 },
        ], 'horizontal', multiBoundingBox);

        cmd.do();
        expect(multiBoundingBox.scale[0]).toBe(-1);

        expect(r1.x).toBe(10);
        expect(r1.y).toBe(20);
        expect(r1.sx).toBe(2);
        expect(r1.sy).toBe(3);
        expect(r2.x).toBe(15);
        expect(r2.y).toBe(25);
        expect(r2.sx).toBe(6);
        expect(r2.sy).toBe(7);
        expect(multiBoundingBox.scale[0]).toBe(-1);
        expect(multiBoundingBox.scale[1]).toBe(1);

        cmd.undo();
        expect(multiBoundingBox.scale[0]).toBe(1);
    });

    it('undo restores starts for multiple entries and flips vertical scale back', () => {
        const r1 = new Rect({});
        const r2 = new Rect({});
        const start1: FlipSnapshot = { x: 1, y: 2, sx: 3, sy: 4 };
        const end1: FlipSnapshot = { x: 11, y: 22, sx: 33, sy: 44 };
        const start2: FlipSnapshot = { x: -10, y: -20, sx: 5, sy: 6 };
        const end2: FlipSnapshot = { x: 0, y: 0, sx: 7, sy: 8 };

        const multiBoundingBox: any = { scale: [1, 1] };

        const cmd = makeMultiFlipCommand([
            { ref: r1 as any, start: start1, end: end1 },
            { ref: r2 as any, start: start2, end: end2 },
        ], 'vertical', multiBoundingBox);

        cmd.do();
        expect(multiBoundingBox.scale[1]).toBe(-1);

        cmd.undo();
        expect(r1.x).toBe(1);
        expect(r1.y).toBe(2);
        expect(r1.sx).toBe(3);
        expect(r1.sy).toBe(4);
        expect(r2.x).toBe(-10);
        expect(r2.y).toBe(-20);
        expect(r2.sx).toBe(5);
        expect(r2.sy).toBe(6);
        expect(multiBoundingBox.scale[0]).toBe(1);
        expect(multiBoundingBox.scale[1]).toBe(1);
    });

    it('tests with no multibounding box passed in', () => {
        const r1 = new Rect({});
        const r2 = new Rect({});
        const start1: FlipSnapshot = { x: 0, y: 0, sx: 1, sy: 1 };
        const end1: FlipSnapshot = { x: 10, y: 20, sx: 2, sy: 3 };
        const start2: FlipSnapshot = { x: -5, y: -7, sx: 4, sy: 5 };
        const end2: FlipSnapshot = { x: 15, y: 25, sx: 6, sy: 7 };

        const multiBoundingBox: any = { scale: [1, 1] };

        const cmd = makeMultiFlipCommand([
            { ref: r1 as any, start: start1, end: end1 },
            { ref: r2 as any, start: start2, end: end2 },
        ], 'horizontal');

        cmd.do();
        expect(multiBoundingBox.scale[0]).toBe(1);

        cmd.undo();
        expect(multiBoundingBox.scale[0]).toBe(1);
    });
});