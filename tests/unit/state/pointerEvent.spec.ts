import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PointerEventState } from '../../../src/state/pointerEvent';
import { PointerMode } from '../../../src/manager';

describe('PointerEventState', () => {
    let state: PointerEventState;
    let clearSelection: () => void;

    beforeEach(() => {
        clearSelection = vi.fn();
        state = new PointerEventState(PointerMode.SELECT);
    });

    it('initializes with defaults', () => {
        const s = new PointerEventState();
        expect(s.mode).toBe(PointerMode.SELECT);
    });

    it('sets and toggles mode', () => {
        state.setMode(PointerMode.PAN);
        expect(state.mode).toBe(PointerMode.PAN);
        state.toggleMode();
        expect(state.mode).toBe(PointerMode.SELECT);
        state.toggleMode();
        expect(state.mode).toBe(PointerMode.PAN);
    });

    it('sets and clears resizing direction', () => {
        expect(state.isResizing).toBe(false);
        state.setResizingDirection('CENTER');
        expect(state.resizingDirection).toBe('CENTER');
        expect(state.isResizing).toBe(true);
        state.clearResizingDirection();
        expect(state.resizingDirection).toBe(null);
        expect(state.isResizing).toBe(false);
    });

    it('initialize sets world coords and clears resizing', () => {
        state.setResizingDirection('CENTER');
        state.initialize(10, 20);
        expect(state.startWorldX).toBe(10);
        expect(state.startWorldY).toBe(20);
        expect(state.lastWorldX).toBe(10);
        expect(state.lastWorldY).toBe(20);
        expect(state.resizingDirection).toBe(null);
    });

    it('updates last world coord', () => {
        state.initialize(1, 2);
        state.updateLastWorldCoord(5, 7);
        expect(state.lastWorldX).toBe(5);
        expect(state.lastWorldY).toBe(7);
    });

    it('computes dragDXFromStart and dragDYFromStart', () => {
        state.initialize(10, 20);
        state.updateLastWorldCoord(15, 25);
        expect(state.dragDXFromStart).toBe(5);
        expect(state.dragDYFromStart).toBe(5);
    });
});