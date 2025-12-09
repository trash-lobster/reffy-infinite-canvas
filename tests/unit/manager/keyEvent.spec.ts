import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanvasHistory } from '../../../src/history';
import EventEmitter from 'eventemitter3';
import { KeyEventManager } from '../../../src/manager';
import { CanvasEvent } from '../../../src/util';

describe('Key event manager', () => {
    let history: CanvasHistory;
    let eventHub: EventEmitter;
    let deleteSelected: () => void;
    let assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void;

    beforeEach(() => {
        history = new CanvasHistory();
        eventHub = new EventEmitter();
        deleteSelected = vi.fn();
        assignEventListener =vi.fn();
    });

    it('calls undo', () => {
        const manager = new KeyEventManager(
            history,
            eventHub,
            deleteSelected,
            assignEventListener,
        );

        history.undo = vi.fn();

        document.dispatchEvent(new KeyboardEvent('keydown', {
            ctrlKey: true,
            key: 'z'
        }));

        expect(history.undo).toHaveBeenCalledOnce();
    });

    it('calls undo with meta key', () => {
        const manager = new KeyEventManager(
            history,
            eventHub,
            deleteSelected,
            assignEventListener,
        );

        history.undo = vi.fn();

        document.dispatchEvent(new KeyboardEvent('keydown', {
            metaKey: true,
            key: 'z'
        }));

        expect(history.undo).toHaveBeenCalledOnce();
    });

    it('does not call undo when shift is held', () => {
        const manager = new KeyEventManager(
            history,
            eventHub,
            deleteSelected,
            assignEventListener,
        );

        history.undo = vi.fn();

        document.dispatchEvent(new KeyboardEvent('keydown', {
            ctrlKey: true,
            shiftKey: true,
            key: 'z',
        }));

        expect(history.undo).not.toHaveBeenCalled();
    });

    it('calls redo', () => {
        const manager = new KeyEventManager(
            history,
            eventHub,
            deleteSelected,
            assignEventListener,
        );

        history.redo = vi.fn();

        document.dispatchEvent(new KeyboardEvent('keydown', {
            ctrlKey: true,
            key: 'y'
        }));

        expect(history.redo).toHaveBeenCalledOnce();
    });

    it('calls redo with meta key', () => {
        const manager = new KeyEventManager(
            history,
            eventHub,
            deleteSelected,
            assignEventListener,
        );

        history.redo = vi.fn();

        document.dispatchEvent(new KeyboardEvent('keydown', {
            metaKey: true,
            key: 'y'
        }));

        expect(history.redo).toHaveBeenCalledOnce();
    });

    it('calls delete', () => {
        const manager = new KeyEventManager(
            history,
            eventHub,
            deleteSelected,
            assignEventListener,
        );

        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Delete'
        }));

        expect(deleteSelected).toHaveBeenCalledOnce();
    });

    it('calls save', () => {
        const manager = new KeyEventManager(
            history,
            eventHub,
            deleteSelected,
            assignEventListener,
        );

        eventHub.emit = vi.fn();

        document.dispatchEvent(new KeyboardEvent('keydown', {
            ctrlKey: true,
            key: 's'
        }));

        expect(eventHub.emit).toHaveBeenCalledWith(CanvasEvent.Save);
    });
})