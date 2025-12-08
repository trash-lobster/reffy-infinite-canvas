import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextMenu, ContextMenuGroup, ContextMenuElement } from '../../../src/contextMenu/ContextMenu';

function makeRoot(): HTMLDivElement {
    const root = document.createElement('div');
    root.style.position = 'relative';
    root.style.width = '400px';
    root.style.height = '300px';
    document.body.appendChild(root);
    return root;
}

describe('ContextMenu', () => {
    let root: HTMLDivElement;

    beforeEach(() => {
        // reset DOM
        document.body.innerHTML = '';
        root = makeRoot();
    });

    it('renders groups and dividers; attaches to parent', () => {
        const props = {
        options: [
            { childOptions: [{ text: 'A', onClick: vi.fn() }] },
            { childOptions: [{ text: 'B', onClick: vi.fn() }] },
        ],
        };
        const menu = new ContextMenu(props, root);
        menu.attachToParent(root);

        // two groups
        const groups = menu.el.querySelectorAll('.context-menu > div');
        expect(groups.length).toBe(2);
        // one divider
        const dividers = menu.el.querySelectorAll('.context-menu-divider');
        expect(dividers.length).toBe(1);
        // options are buttons
        const buttons = menu.el.querySelectorAll('button.context-menu-option');
        expect(buttons.length).toBe(2);
        expect(buttons[0].textContent).toBe('A');
        expect(buttons[1].textContent).toBe('B');
    });

    it('prevents native contextmenu on menu root', () => {
        const props = { options: [{ childOptions: [{ text: 'A', onClick: vi.fn() }] }] };
        const menu = new ContextMenu(props, root);
        const preventDefault = vi.fn();
        const evt = new MouseEvent('contextmenu');
        Object.defineProperty(evt, 'preventDefault', { value: preventDefault });
        menu.el.dispatchEvent(evt);
        expect(preventDefault).toHaveBeenCalled();
    });
    });

describe('ContextMenuGroup', () => {
    let root: HTMLDivElement;
    beforeEach(() => { document.body.innerHTML = ''; root = makeRoot(); });

    it('creates child option elements and appends to group', () => {
        const groupProps = { childOptions: [ { text: 'X', onClick: vi.fn() }, { text: 'Y', onClick: vi.fn() } ] };
        const group = new ContextMenuGroup(groupProps, root);
        expect(group.childOptions.length).toBe(2);
        const buttons = group.el.querySelectorAll('button.context-menu-option');
        expect(buttons.length).toBe(2);
        expect(buttons[0].textContent).toBe('X');
        expect(buttons[1].textContent).toBe('Y');
    });

    it('add menu element to parent', () => {
        const groupProps = { childOptions: [ { text: 'X', onClick: vi.fn() }, { text: 'Y', onClick: vi.fn() } ] };
        const group = new ContextMenuGroup(groupProps, root);

        group.attachToParent(root);
        expect(root.children.length).toBe(1);
    })
});

describe('ContextMenuElement', () => {
    let root: HTMLDivElement;
    beforeEach(() => { document.body.innerHTML = ''; root = makeRoot(); });

    it('adds click handler when provided', () => {
        const group = new ContextMenuGroup({ childOptions: [] }, root);
        const onClick = vi.fn();
        const el = new ContextMenuElement({ text: 'Click Me', onClick, parent: group }, root);
        el.el.click();
        expect(onClick).toHaveBeenCalled();
    });

    it('shows a sub-menu on hover and positions within host', () => {
        const group = new ContextMenuGroup({ childOptions: [] }, root);
        const subProps = { options: [{ childOptions: [{ text: 'Sub1', onClick: vi.fn() }] }] };
        const el = new ContextMenuElement({ text: 'Parent', parent: group, subMenu: subProps }, root);
        // Attach group to root to ensure geometry works
        root.appendChild(group.el);
        // Trigger hover
        const evt = new PointerEvent('pointerenter');
        el.el.dispatchEvent(evt);
        const sub = root.querySelector('.sub-context-menu') as HTMLElement;
        expect(sub).toBeTruthy();
        expect(sub.id).toBe('Parent-context-menu');
        // has at least one option
        const subButtons = sub.querySelectorAll('button.context-menu-option');
        expect(subButtons.length).toBe(1);
    });
});

describe('onpointerenter', () => {
    let root: HTMLDivElement;
    beforeEach(() => { document.body.innerHTML = ''; root = makeRoot(); });

    it('creates a submenu on hover and positions within host bounds', () => {
        const group = new ContextMenuGroup({ childOptions: [] }, root);
        const subProps = { options: [{ childOptions: [{ text: 'Sub1', onClick: vi.fn() }] }] };
        const el = new ContextMenuElement({ text: 'Parent', parent: group, subMenu: subProps }, root);
        root.appendChild(group.el);

        // Stub geometry to exercise placement logic
        const hostRect = { left: 0, top: 0, right: 160, bottom: 160, width: 160, height: 160 } as any;
        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(hostRect);
        vi.spyOn(el.el, 'getBoundingClientRect').mockReturnValue({ left: 150, top: 150, right: 165, bottom: 165, width: 15, height: 15 } as any);

        const evt = new PointerEvent('pointerenter');
        el.el.dispatchEvent(evt);

        const sub = root.querySelector('.sub-context-menu') as HTMLElement;
        expect(sub).toBeTruthy();
        expect(sub.id).toBe('Parent-context-menu');
        // With our stubs, vertical no-flip and horizontal flip (due to width overflow)
        expect(sub.style.top).toBe('150px');
        expect(sub.style.left).toBe('150px');
    });

    it('replaces existing submenu when hovering a different item', () => {
        const group = new ContextMenuGroup({ childOptions: [] }, root);
        const first = new ContextMenuElement({ text: 'First', parent: group, subMenu: { options: [{ childOptions: [{ text: 'A', onClick: vi.fn() }] }] } }, root);
        const second = new ContextMenuElement({ text: 'Second', parent: group, subMenu: { options: [{ childOptions: [{ text: 'B', onClick: vi.fn() }] }] } }, root);
        root.appendChild(group.el);

        const hostRect = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 } as any;
        vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(hostRect);
        vi.spyOn(first.el, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 10, right: 30, bottom: 30, width: 20, height: 20 } as any);
        vi.spyOn(second.el, 'getBoundingClientRect').mockReturnValue({ left: 40, top: 40, right: 60, bottom: 60, width: 20, height: 20 } as any);

        first.el.dispatchEvent(new PointerEvent('pointerenter'));
        let subs = root.querySelectorAll('.sub-context-menu');
        expect(subs.length).toBe(1);
        expect((subs[0] as HTMLElement).id).toBe('First-context-menu');

        // Hover second; old submenu should be removed and replaced
        second.el.dispatchEvent(new PointerEvent('pointerenter'));
        subs = root.querySelectorAll('.sub-context-menu');
        expect(subs.length).toBe(1);
        expect((subs[0] as HTMLElement).id).toBe('Second-context-menu');
    });
});