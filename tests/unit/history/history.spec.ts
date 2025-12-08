import { describe, it, expect, beforeEach } from 'vitest';
import { CanvasHistory, setNumberProp, setBooleanProp, setXY, Command } from '../../../src/history/history';
import { FlipSnapshot, makeFlipCommand } from '../../../src/manager';

describe('CanvasHistory', () => {
    let history: CanvasHistory;
    let target: any;

    beforeEach(() => {
        history = new CanvasHistory();
        target = { x: 0, y: 0, w: 10, h: 5, flag: false, setTranslation(x: number, y: number) { this.x = x; this.y = y; } };
    });

    it('push executes command immediately and clears redo', () => {
        const cmd = setNumberProp(target, 'w', 20, 'Set width');
        history.push(cmd);
        expect(target.w).toBe(20);
        expect(history.canUndo()).toBe(true);
        expect(history.canRedo()).toBe(false);
    });

    it('undo reverts last command and enables redo', () => {
        history.push(setBooleanProp(target, 'flag', true));
        expect(target.flag).toBe(true);
        history.undo();
        expect(target.flag).toBe(false);
        expect(history.canRedo()).toBe(true);
    });

    it('redo re-applies last undone group and restores undo', () => {
        history.push(setNumberProp(target, 'h', 42));
        history.undo();
        expect(target.h).toBe(5);
        history.redo();
        expect(target.h).toBe(42);
        expect(history.canUndo()).toBe(true);
    });

    it('begin/commit groups multiple commands atomically', () => {
        history.begin('Move + Resize');
        history.push(setXY(target, 5, 7));
        history.push(setNumberProp(target, 'w', 99));
        // Not yet executed
        expect(target.x).toBe(0);
        expect(target.w).toBe(10);
        history.commit();
        // Executed in order
        expect(target.x).toBe(5);
        expect(target.y).toBe(7);
        expect(target.w).toBe(99);
        // Undo should revert both in reverse order
        history.undo();
        expect(target.w).toBe(10);
        expect(target.x).toBe(0);
        expect(target.y).toBe(0);
    });

    it('commit evicts oldest entries when exceeding MAX_HISTORY', () => {
        const MAX_HISTORY = 25;
        // Seed MAX_HISTORY groups
        for (let i = 0; i < MAX_HISTORY; i++) {
            history.begin(`group-${i}`);
            history.push(setNumberProp(target, 'w', i));
            history.commit();
        }
        expect(history.undoStack.length).toBe(MAX_HISTORY);

        // Next commit should evict the first entry via shift inside commit
        history.begin('overflow');
        history.push(setNumberProp(target, 'w', 999));
        history.commit();
        expect(history.undoStack.length).toBe(MAX_HISTORY);

        // Undo all to ensure we have exactly MAX_HISTORY actions accounted for
        let count = 0;
        while (history.canUndo()) { history.undo(); count++; }
        expect(count).toBe(MAX_HISTORY);
    });

    it('cancel drops open group without executing', () => {
        history.begin('noop');
        history.push(setNumberProp(target, 'w', 33));
        history.cancel();
        expect(target.w).toBe(10);
        expect(history.canUndo()).toBe(false);
    });

    it('clear empties stacks and closes group state', () => {
        history.push(setNumberProp(target, 'w', 22));
        history.undo();
        history.clear();
        expect(history.canUndo()).toBe(false);
        expect(history.canRedo()).toBe(false);
        // subsequent push still works
        history.push(setBooleanProp(target, 'flag', true));
        expect(target.flag).toBe(true);
    });

    it('caps undo stack at MAX_HISTORY (25) and evicts oldest', () => {
        // Seed 26 single commands; first should be evicted
        for (let i = 0; i < 26; i++) {
            history.push({
                do() { target.w = i; },
                undo() { target.w = i - 1; },
            } as Command);
        }
        // After 26 pushes, can undo 25 times; undo until empty
        let undoCount = 0;
        while (history.canUndo()) { history.undo(); undoCount++; }
        expect(undoCount).toBe(25);
    });
});

describe('Command helpers', () => {
    it('setNumberProp sets and restores numeric property', () => {
        const obj: any = { n: 1 };
        const cmd = setNumberProp(obj, 'n', 7, 'Set n');
        cmd.do();
        expect(obj.n).toBe(7);
        cmd.undo();
        expect(obj.n).toBe(1);
        expect(cmd.label).toBe('Set n');
    });

    it('setBooleanProp sets and restores boolean property', () => {
        const obj: any = { b: false };
        const cmd = setBooleanProp(obj, 'b', true);
        cmd.do();
        expect(obj.b).toBe(true);
        cmd.undo();
        expect(obj.b).toBe(false);
    });

    it('setXY uses setTranslation when available, else directly sets x/y', () => {
        const withSetter = { x: 0, y: 0, setTranslation(x: number, y: number) { this.x = x; this.y = y; } };
        const withoutSetter = { x: 1, y: 2 } as any;
        const c1 = setXY(withSetter, 10, 11);
        c1.do();
        expect(withSetter.x).toBe(10);
        expect(withSetter.y).toBe(11);
        c1.undo();
        expect(withSetter.x).toBe(0);
        expect(withSetter.y).toBe(0);

        const c2 = setXY(withoutSetter, 3, 4);
        c2.do();
        expect(withoutSetter.x).toBe(3);
        expect(withoutSetter.y).toBe(4);
        c2.undo();
        expect(withoutSetter.x).toBe(1);
        expect(withoutSetter.y).toBe(2);
    });
});
