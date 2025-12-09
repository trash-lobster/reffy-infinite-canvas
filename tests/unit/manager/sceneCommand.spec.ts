import { describe, it, expect, vi } from 'vitest';
import { Rect, Renderable } from '../../../src/shapes';
import {
    makeAddChildCommand,
    makeMultiAddChildCommand,
    makeRemoveChildCommand,
    makeMultiRemoveChildCommand,
} from '../../../src/manager';

type ParentLike = {
    children: any[];
    appendChild?: (c: any) => void;
    removeChild?: (c: any) => void;
    markOrderDirty?: () => void;
};

describe('Scene add/remove child command', () => {
    it('add child: do adds and undo removes', () => {
        const parent: ParentLike = { children: [] };
        const child = new Rect({});

        const cmd = makeAddChildCommand(parent, child);
        cmd.do();
        expect(parent.children).toContain(child);

        cmd.undo();
        expect(parent.children).not.toContain(child);
    });

    it('add child: tring to undo when child is not in the list would not happen', () => {
        const parent: ParentLike = { children: [] };
        const child = new Rect({});

        const cmd = makeAddChildCommand(parent, child);

        parent.children.splice = vi.fn();

        cmd.undo();
        expect(parent.children.splice).not.toHaveBeenCalled();
    });

    it('remove child: do removes and undo restores at original index', () => {
        const a = new Rect({});
        const b = new Rect({});
        const parent: ParentLike = { children: [a, b] };

        const cmd = makeRemoveChildCommand(parent, b);
        cmd.do();
        expect(parent.children).toEqual([a]);

        cmd.undo();
        expect(parent.children).toEqual([a, b]);
    });

    it('remove child: do removes and undo restores at original index', () => {
        const a = new Rect({});
        const b = new Rect({});
        const parent: ParentLike = { children: [] };

        const cmd = makeRemoveChildCommand(parent, b);

        parent.children.splice = vi.fn();
        parent.children.push = vi.fn();

        cmd.do();
        expect(parent.children.splice).not.toHaveBeenCalled();

        cmd.undo();
        expect(parent.children.push).toHaveBeenCalledWith(b);
    });
});

describe('Scene multi add/remove child command', () => {
    it('multi add uses appendChild on do and removeChild on undo', () => {
        const parent: ParentLike = { children: [] };
        parent.appendChild = vi.fn((c: any) => parent.children.push(c));
        parent.removeChild = vi.fn((c: any) => {
            const i = parent.children.indexOf(c);
            if (i >= 0) parent.children.splice(i, 1);
        });

        const r1 = new Rect({});
        const r2 = new Rect({});

        const cmd = makeMultiAddChildCommand(parent, [r1, r2]);
        cmd.do();
        expect(parent.appendChild).toHaveBeenCalledTimes(2);
        expect(parent.children).toEqual([r1, r2]);

        cmd.undo();
        expect(parent.removeChild).toHaveBeenCalledTimes(2);
        expect(parent.children).toEqual([]);
    });

    it('multi remove removes selected, and undo restores order, calls addParent and markOrderDirty', () => {
        const a = new Rect({});
        const b = new Rect({});
        const c = new Rect({});
        const d = new Rect({});

        // Spy addParent on affected children
        (b).addParent = vi.fn();
        (d).addParent = vi.fn();

        const parent: ParentLike = { children: [a, b, c, d] };
        parent.removeChild = vi.fn((child: any) => {
            const i = parent.children.indexOf(child);
            if (i >= 0) parent.children.splice(i, 1);
        });
        parent.markOrderDirty = vi.fn();

        const cmd = makeMultiRemoveChildCommand(parent, [b, d]);
        cmd.do();
        expect(parent.removeChild).toHaveBeenCalledTimes(2);
        expect(parent.children).toEqual([a, c]);

        cmd.undo();
        expect(parent.children).toEqual([a, b, c, d]);
        expect((b).addParent).toHaveBeenCalledTimes(1);
        expect((d).addParent).toHaveBeenCalledTimes(1);
        expect(parent.markOrderDirty).toHaveBeenCalledTimes(1);
    });

    it('undo skips children already present and inserts remaining at recorded indices', () => {
        const a = new Rect({});
        const b = new Rect({});
        const c = new Rect({});
        const d = new Rect({});

        (b as any).addParent = vi.fn();
        (d as any).addParent = vi.fn();

        const parent: ParentLike = { children: [a, b, c, d] };
        parent.removeChild = vi.fn((child: any) => {
            const i = parent.children.indexOf(child);
            if (i >= 0) parent.children.splice(i, 1);
        });
        parent.markOrderDirty = vi.fn();

        const cmd = makeMultiRemoveChildCommand(parent as any, [b, d]);
        cmd.do();
        // Manually re-add b at the front before undo
        parent.children.splice(0, 0, b);

        cmd.undo();
        // b is not duplicated and d is inserted back at its original index (end)
        expect(parent.children).toEqual([b, a, c, d]);
        expect((b as any).addParent).not.toHaveBeenCalled();
        expect((d as any).addParent).toHaveBeenCalledTimes(1);
        expect(parent.markOrderDirty).toHaveBeenCalledTimes(1);
    });

    it('inserts at end when recorded index exceeds current length', () => {
        const a = new Rect({});
        const b = new Rect({});
        const c = new Rect({});
        const d = new Rect({});
        const e = new Rect({});

        (e as any).addParent = vi.fn();

        const parent: ParentLike = { children: [a, b, c, d, e] };
        parent.removeChild = vi.fn((child: Renderable) => {
            const i = parent.children.indexOf(child);
            if (i >= 0) parent.children.splice(i, 1);
        });
        parent.markOrderDirty = vi.fn();

        const cmd = makeMultiRemoveChildCommand(parent, [e]);
        cmd.do();
        // Simulate shrink: remove b externally so current length < original recorded index for e
        parent.removeChild!(b);

        cmd.undo();
        // e should be appended at end because idx (4) > current length (now 3)
        expect(parent.children[parent.children.length - 1]).toBe(e);
        expect(e.addParent).toHaveBeenCalledTimes(1);
        expect(parent.markOrderDirty).toHaveBeenCalledTimes(1);
    });

    it('ignores duplicate entries in input list (removes/restores once)', () => {
        const a = new Rect({});
        const b = new Rect({});
        const c = new Rect({});
        const d = new Rect({});

        (b as any).addParent = vi.fn();
        (d as any).addParent = vi.fn();

        const parent: ParentLike = { children: [a, b, c, d] };
        parent.removeChild = vi.fn((child: Renderable) => {
            const i = parent.children.indexOf(child);
            if (i >= 0) parent.children.splice(i, 1);
        });
        parent.markOrderDirty = vi.fn();

        const cmd = makeMultiRemoveChildCommand(parent, [b, b, d]);
        cmd.do();
        expect(parent.children).toEqual([a, c]);

        cmd.undo();
        expect(parent.children).toEqual([a, b, c, d]);
        expect(b.addParent).toHaveBeenCalledTimes(1);
        expect(d.addParent).toHaveBeenCalledTimes(1);
        expect(parent.markOrderDirty).toHaveBeenCalledTimes(1);
    });

    it('tests undo', () => {
        const a = new Rect({});
        const b = new Rect({});
        const parent: ParentLike = { children: [a, b] };
        parent.markOrderDirty = vi.fn();

        parent.children.splice = vi.fn();

        const cmd = makeMultiRemoveChildCommand(parent, [a, b]);
        cmd.undo();
        expect(parent.children.splice).not.toHaveBeenCalled();
    })
});
