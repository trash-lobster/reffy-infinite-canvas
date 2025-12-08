import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addContextMenu, clearContextMenu, isContextMenuActive, createBasicImageMenuOptions, createSingleImageMenuOptions, createMultiImageMenuOptions, createCanvasImageMenuOptions } from '../../../src/contextMenu/Interaction';
import { ContextMenuEvent } from '../../../src/util';

function makeHost() {
	const rootDiv = document.createElement('div');
	rootDiv.style.position = 'relative';
	rootDiv.style.width = '500px';
	rootDiv.style.height = '400px';
	document.body.appendChild(rootDiv);

	const renderRoot = rootDiv;
	const eventHub = { emit: vi.fn() };

	const baseFns = {
		copyImage: vi.fn(async () => {}),
		deleteSelectedImages: vi.fn(async () => {}),
		pasteImage: vi.fn(async (_e?: PointerEvent) => {}),
		flipHorizontal: vi.fn(),
		flipVertical: vi.fn(),
		sendShapeToNewZOrder: vi.fn(),
		align: vi.fn(),
		normalizeSelection: vi.fn(),
		togglePointerMode: vi.fn(),
		toggleGrid: vi.fn(),
		saveToCanvasStorage: vi.fn(),
		clearContextMenu: vi.fn(),
	};

	const host: any = {
		// geometry
		getBoundingClientRect: () => rootDiv.getBoundingClientRect(),
		rootDiv,
		renderRoot,
		eventHub,
		// options
		singleImageMenuOptions: createSingleImageMenuOptions.call(baseFns, createBasicImageMenuOptions.call(baseFns).options),
		multiImageMenuOptions: createMultiImageMenuOptions.call(baseFns, createBasicImageMenuOptions.call(baseFns).options),
		canvasImageMenuOptions: createCanvasImageMenuOptions.call(baseFns, [] as any),
		...baseFns,
	};
	return host;
}

describe('withContextMenuClear behavior via option factories', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('wraps sync handler and calls clearContextMenu afterwards (Copy)', () => {
		const host = makeHost();
		const basic = createBasicImageMenuOptions.call(host);
		const group = basic.options[0];
		const copy = group.childOptions.find((o: any) => o.text === 'Copy') as any;

		expect(typeof copy.onClick).toBe('function');
		copy.onClick.call(host);

		expect(host.copyImage).toHaveBeenCalledTimes(1);
		expect(host.clearContextMenu).toHaveBeenCalledTimes(1);
	});

	it('passes event to handler and still clears (Paste)', () => {
		const host = makeHost();
		const basic = createBasicImageMenuOptions.call(host);
		const group = basic.options[0];
		const paste = group.childOptions.find((o: any) => o.text === 'Paste') as any;

		const evt = new PointerEvent('pointerdown');
		paste.onClick(evt);

		expect(host.pasteImage).toHaveBeenCalledTimes(1);
		expect(host.pasteImage.mock.calls[0][0]).toBe(evt);
		expect(host.clearContextMenu).toHaveBeenCalledTimes(1);
	});

	it('works with wrapped calls returning values (Single: Send to Front)', () => {
		const host = makeHost();
		const single = createSingleImageMenuOptions.call(host);
		const group = single.options[single.options.length - 1];
		const front = group.childOptions.find((o: any) => o.text === 'Send to Front') as any;

		front.onClick();
		expect(host.sendShapeToNewZOrder).toHaveBeenCalledWith(true);
		expect(host.clearContextMenu).toHaveBeenCalledTimes(1);
	});
});

describe('Interaction context menu helpers', () => {
	beforeEach(() => { document.body.innerHTML = ''; });

	it('addContextMenu creates menu and positions within host', () => {
		const host = makeHost();
		addContextMenu.call(host, 50, 50, 'single');
		const menu = host.rootDiv.querySelector('.context-menu') as HTMLElement;
		expect(menu).toBeTruthy();
		// positioned relative to click
		expect(menu.style.left).toMatch(/px/);
		expect(menu.style.top).toMatch(/px/);
	});

	it('isContextMenuActive detects active menu', () => {
		const host = makeHost();
		expect(isContextMenuActive.call(host)).toBe(false);
		addContextMenu.call(host, 10, 10, 'canvas');
		expect(isContextMenuActive.call(host)).toBe(true);
	});

	it('clearContextMenu removes menu and emits close event', () => {
		const host = makeHost();
		addContextMenu.call(host, 10, 10, 'multi');
		clearContextMenu.call(host);
		expect(host.renderRoot.querySelector('.context-menu')).toBeNull();
		expect(host.eventHub.emit).toHaveBeenCalledWith(ContextMenuEvent.Close);
	});

	it('option factories produce expected structure', () => {
		const base = makeHost();
		const basic = createBasicImageMenuOptions.call(base);
		expect(Array.isArray(basic.options)).toBe(true);
		expect(basic.options[0].childOptions.length).toBeGreaterThan(0);

		const single = createSingleImageMenuOptions.call(base, basic.options);
		expect(single.options.length).toBeGreaterThan(basic.options.length);

		const multi = createMultiImageMenuOptions.call(base, basic.options);
		// multi has submenu structure under Align and Normalize
		const hasSub = multi.options.some(g => g.childOptions.some(o => 'subMenu' in o));
		expect(hasSub).toBe(true);

		const canvas = createCanvasImageMenuOptions.call(base, []);
		expect(canvas.options.length).toBeGreaterThan(0);
	});
});

function makeMultiHost() {
  return {
    align: vi.fn(),
    normalizeSelection: vi.fn(),
    clearContextMenu: vi.fn(),
  } as any;
}

function findOption(groupList: any[], text: string) {
  for (const g of groupList) {
    const found = g.childOptions.find((o: any) => o.text === text);
    if (found) return found;
  }
  return undefined;
}

describe('createMultiImageMenuOptions', () => {
  let host: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    host = makeMultiHost();
  });

  it('produces a group with Align submenu and calls align on click', () => {
    const cfg = createMultiImageMenuOptions.call(host);
    expect(Array.isArray(cfg.options)).toBe(true);

    const alignTop = findOption(cfg.options, 'Align');
    expect(alignTop).toBeDefined();
    expect(alignTop.subMenu).toBeDefined();

    const alignGroup = alignTop.subMenu.options[0];
    const left = alignGroup.childOptions.find((o: any) => o.text === 'Align Left');
    const right = alignGroup.childOptions.find((o: any) => o.text === 'Align Right');
    const top = alignGroup.childOptions.find((o: any) => o.text === 'Align Top');
    const bottom = alignGroup.childOptions.find((o: any) => o.text === 'Align Bottom');

    expect(typeof left.onClick).toBe('function');
    left.onClick();
    expect(host.align).toHaveBeenCalledWith('left');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);

    host.align.mockClear(); host.clearContextMenu.mockClear();
    right.onClick();
    expect(host.align).toHaveBeenCalledWith('right');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);

    host.align.mockClear(); host.clearContextMenu.mockClear();
    top.onClick();
    expect(host.align).toHaveBeenCalledWith('top');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);

    host.align.mockClear(); host.clearContextMenu.mockClear();
    bottom.onClick();
    expect(host.align).toHaveBeenCalledWith('bottom');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);
  });

  it('produces Normalize by First submenu and calls normalizeSelection correctly', () => {
    const cfg = createMultiImageMenuOptions.call(host);
    const normFirstTop = findOption(cfg.options, 'Normalize by First');
    expect(normFirstTop).toBeDefined();
    const group = normFirstTop.subMenu.options[0];

    const height = group.childOptions.find((o: any) => o.text === 'Height');
    const width = group.childOptions.find((o: any) => o.text === 'Width');
    const size = group.childOptions.find((o: any) => o.text === 'Size');
    const scale = group.childOptions.find((o: any) => o.text === 'Scale');

    height.onClick();
    expect(host.normalizeSelection).toHaveBeenCalledWith('height', 'first');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);

    host.normalizeSelection.mockClear(); host.clearContextMenu.mockClear();
    width.onClick();
    expect(host.normalizeSelection).toHaveBeenCalledWith('width', 'first');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);

    host.normalizeSelection.mockClear(); host.clearContextMenu.mockClear();
    size.onClick();
    expect(host.normalizeSelection).toHaveBeenCalledWith('size', 'first');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);

    host.normalizeSelection.mockClear(); host.clearContextMenu.mockClear();
    scale.onClick();
    expect(host.normalizeSelection).toHaveBeenCalledWith('scale', 'first');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);
  });

  it('produces Normalize by Average submenu and calls normalizeSelection correctly', () => {
    const cfg = createMultiImageMenuOptions.call(host);
    const normAvgTop = findOption(cfg.options, 'Normalize by Average');
    expect(normAvgTop).toBeDefined();
    const group = normAvgTop.subMenu.options[0];

    const height = group.childOptions.find((o: any) => o.text === 'Height');
    const width = group.childOptions.find((o: any) => o.text === 'Width');
    const size = group.childOptions.find((o: any) => o.text === 'Size');
    const scale = group.childOptions.find((o: any) => o.text === 'Scale');

    height.onClick();
    expect(host.normalizeSelection).toHaveBeenCalledWith('height', 'average');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);

    host.normalizeSelection.mockClear(); host.clearContextMenu.mockClear();
    width.onClick();
    expect(host.normalizeSelection).toHaveBeenCalledWith('width', 'average');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);

    host.normalizeSelection.mockClear(); host.clearContextMenu.mockClear();
    size.onClick();
    expect(host.normalizeSelection).toHaveBeenCalledWith('size', 'average');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);

    host.normalizeSelection.mockClear(); host.clearContextMenu.mockClear();
    scale.onClick();
    expect(host.normalizeSelection).toHaveBeenCalledWith('scale', 'average');
    expect(host.clearContextMenu).toHaveBeenCalledTimes(1);
  });
});
