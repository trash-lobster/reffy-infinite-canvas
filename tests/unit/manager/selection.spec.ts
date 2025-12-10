import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventEmitter from 'eventemitter3';
import { SelectionManager } from '../../../src/manager/Selection';
import { oppositeCorner } from '../../../src/util';

// Hoisted util mock for oppositeCorner while keeping CanvasEvent
const utilMocks = vi.hoisted(() => ({
	oppositeCorner: vi.fn((x: any) => `opp:${x}`),
}));
vi.mock('../../../src/util', async () => {
	const actual = await vi.importActual<typeof import('../../../src/util')>('../../../src/util');
	return { ...actual, oppositeCorner: utilMocks.oppositeCorner };
});
import { CanvasEvent } from '../../../src/util';
import { Rect } from '../../../src/shapes';

// Hoisted bounding mocks
const bounding = vi.hoisted(() => {
	const AABB_isColliding = vi.fn();
	class MockBoundingBox {
		target: any;
		setPassive = vi.fn();
		setActive = vi.fn();
		hitTest = vi.fn().mockReturnValue(null);
		update = vi.fn();
		render = vi.fn();
		move = vi.fn();
		resize = vi.fn();
		flip = vi.fn().mockReturnValue({ tx: 1 });

		constructor(target: any) {
			this.target = target;
			MockBoundingBox.instances.push(this);
		}
		static instances: MockBoundingBox[] = [] as any;
	}
	class MockMultiBoundingBox {
		shapes: any[] = [];
		scale: [number, number] = [1, 1];
		add = vi.fn((shape: any) => { this.shapes.push(shape); });
		remove = vi.fn((shape: any) => { this.shapes = this.shapes.filter(s => s !== shape); });
		hitTest = vi.fn().mockReturnValue(null);
		update = vi.fn();
		render = vi.fn();
		move = vi.fn();
		resize = vi.fn();
		flip = vi.fn().mockReturnValue([{ fx: 1 }]);
		align = vi.fn().mockReturnValue([{ ax: 1 }]);
		normalize = vi.fn().mockReturnValue([{ nx: 1 }]);
	}
	class MockMarqueeSelectionBox {
		constructor(public x: number, public y: number, _m: any) {}
		resize = vi.fn();
		render = vi.fn();
		getBoundingBox = vi.fn().mockReturnValue({ left: 0, top: 0, right: 10, bottom: 10 });
	}
	return { AABB_isColliding, MockBoundingBox, MockMultiBoundingBox, MockMarqueeSelectionBox };
});

vi.mock('../../../src/bounding', () => ({
	AABB: { isColliding: bounding.AABB_isColliding },
	BoundingBox: bounding.MockBoundingBox,
	MultiBoundingBox: bounding.MockMultiBoundingBox,
	MarqueeSelectionBox: bounding.MockMarqueeSelectionBox,
}));

// Hoisted command mocks
const sceneCmd = vi.hoisted(() => ({
 	 makeMultiRemoveChildCommand: vi.fn(() => ({ label: 'Remove', do: vi.fn(), undo: vi.fn() })),
}));
vi.mock('../../../src/manager/SceneCommand', () => sceneCmd);

const flipCmd = vi.hoisted(() => ({
  	makeMultiFlipCommand: vi.fn((transforms: any, dir: any, mbb?: any) => ({ label: 'Flip', transforms, dir, mbb })),
}));
vi.mock('../../../src/manager/FlipCommand', () => flipCmd);

const transformCmd = vi.hoisted(() => ({
  	makeMultiTransformCommand: vi.fn((transforms: any) => ({ label: 'Transform', transforms })),
}));
vi.mock('../../../src/manager/TransformCommand', () => transformCmd);

function makeGL(): WebGLRenderingContext {
	return {
		useProgram: vi.fn(),
		getUniformLocation: vi.fn().mockReturnValue({}),
		uniform1f: vi.fn(),
	} as unknown as WebGLRenderingContext;
}

describe('SelectionManager', () => {
	let history: any;
	let eventHub: EventEmitter;
	let gl: WebGLRenderingContext;
	let program: WebGLProgram;
	let getWorldMatrix: () => number[];
	let getCanvasChildren: () => any[];
	let getWorldCoords: (x: number, y: number) => number[];

	beforeEach(() => {
		vi.clearAllMocks();
		(bounding.MockBoundingBox as any).instances = [];
		history = { push: vi.fn() };
		eventHub = new EventEmitter();
		(eventHub as any).emit = vi.fn();
		gl = makeGL();
		program = {} as any;
		getWorldMatrix = () => [];
		getCanvasChildren = () => [];
		getWorldCoords = (x, y) => [x, y];
	});

	it('add() builds boxes, sets passive, and creates multi', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1: any = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		const r2: any = { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };

		m.add([r1]);
		expect(m.selected).toEqual([r1]);
		expect((bounding.MockBoundingBox as any).instances.length).toBe(1);
		expect(m.multiBoundingBox).toBeFalsy();

		m.add([r2]);
		expect(m.selected).toEqual([r1, r2]);
		expect((bounding.MockBoundingBox as any).instances.length).toBe(2);
		expect(m.multiBoundingBox).toBeTruthy();
		(bounding.MockBoundingBox as any).instances.forEach((bb: any) => expect(bb.setPassive).toHaveBeenCalled());
		expect((m.multiBoundingBox as any).add).toHaveBeenCalledTimes(2);
	});

	it('remove() updates sets, multi clears when <=1 box', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1: any = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		const r2: any = { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r1, r2]);
		expect(m.multiBoundingBox).toBeTruthy();
		m.remove([r1]);
		const instances = (bounding.MockBoundingBox as any).instances as any[];
		expect(instances.length).toBe(2);
		expect(instances[0].setActive.mock.calls.length + instances[1].setActive.mock.calls.length).toBeGreaterThan(0);
		expect(m.multiBoundingBox).toBeFalsy();
	});

	it('deleteSelected() destroys and pushes multi remove', () => {
		const canvas: any = { id: 'c' };
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1: any = { id: 'r1', destroy: vi.fn(), sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		const r2: any = { id: 'r2', destroy: vi.fn(), sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r1, r2]);
		m.deleteSelected(canvas);
		expect(r1.destroy).toHaveBeenCalled();
		expect(r2.destroy).toHaveBeenCalled();
		expect(sceneCmd.makeMultiRemoveChildCommand).toHaveBeenCalledWith(canvas, [r1, r2]);
		expect(history.push).toHaveBeenCalledWith(expect.objectContaining({ label: 'Remove' }));
	});

	it('hitTest prefers multi then single, else null', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1: any = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		const r2: any = { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r1, r2]);
		(m.multiBoundingBox as any).hitTest.mockReturnValue('CENTER');
		expect(m.hitTest(0, 0)).toBe('CENTER');
		(m.multiBoundingBox as any).hitTest.mockReturnValue(null);
		(bounding.MockBoundingBox as any).instances[0].hitTest.mockReturnValue('TOP_LEFT');
		expect(m.hitTest(0, 0)).toBe('TOP_LEFT');
		(bounding.MockBoundingBox as any).instances[0].hitTest.mockReturnValue(null);
		expect(m.hitTest(0, 0)).toBeNull();
	});

	it('isMultiBoundingBoxHit and isBoundingBoxHit', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1: any = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r1]);
		(bounding.MockBoundingBox as any).instances[0].hitTest.mockReturnValue('CENTER');
		expect(m.isBoundingBoxHit(0, 0)).toBeTruthy();
		expect(m.isMultiBoundingBoxHit(0, 0)).toBeFalsy();
		const r2: any = { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r2]);
		(m.multiBoundingBox as any).hitTest.mockReturnValue('CENTER');
		expect(m.isMultiBoundingBoxHit(0, 0)).toBeTruthy();
	});

	it('hitTestAdjustedCorner flips on negative scale', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1: any = { id: 'r1', sx: 1, sy: -1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r1]);
		(bounding.MockBoundingBox as any).instances[0].hitTest.mockReturnValue('TL');
		expect(m.hitTestAdjustedCorner(0, 0)).toBe('opp:TL');
		const r2: any = { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r2]);
		(m.multiBoundingBox as any).hitTest.mockReturnValue('BR');
		(m.multiBoundingBox as any).scale = [-1, 1];
		expect(m.hitTestAdjustedCorner(0, 0)).toBe('opp:BR');
	});

	it('update() and render() call box methods and GL', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1: any = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		const r2: any = { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r1, r2]);
		m.marqueeBox = { x: 1, y: 2 } as any;
		m.update();
		(bounding.MockBoundingBox as any).instances.forEach((bb: any) => expect(bb.update).toHaveBeenCalled());
		m.render();
		expect((gl as any).useProgram).toHaveBeenCalled();
		expect((gl as any).getUniformLocation).toHaveBeenCalled();
		expect((gl as any).uniform1f).toHaveBeenCalledWith(expect.anything(), 1.0);
		(bounding.MockBoundingBox as any).instances.forEach((bb: any) => expect(bb.render).toHaveBeenCalled());
		expect((m.multiBoundingBox as any).render).toHaveBeenCalled();
		expect((m.marqueeBox as any).render).toHaveBeenCalled();
	});

	it('isRectSelected, clear, clearMarquee', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1: any = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r1]);
		expect(m.isRectSelected(r1 as any)).toBe(true);
		m.marqueeBox = { x: 1, y: 2 } as any;
		m.clearMarquee();
		expect(m.marqueeBox).toBeNull();
		m.clear();
		expect(m.selected.length).toBe(0);
		expect(m.multiBoundingBox).toBeNull();
	});

	it('move() emits Change and calls move', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1 = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) } as unknown as Rect;
		m.add([r1]);
		m.move(5, 6);
		expect(bounding.MockBoundingBox.instances[0].move).toHaveBeenCalledWith(5, 6);
		expect(eventHub.emit).toHaveBeenCalledWith(CanvasEvent.Change);
		const r2 = { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) } as unknown as Rect;
		m.add([r2]);
		m.move(1, 2);
		expect(m.multiBoundingBox.move).toHaveBeenCalledWith(1, 2);
		expect(eventHub.emit).toHaveBeenCalledWith(CanvasEvent.Change);
	});

	it('resize() branches and emits Change', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1 = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}), resize: vi.fn() } as unknown as Rect;
		m.add([r1]);
		
		m.resize(3, 4, 'TOPLEFT');
		expect(bounding.MockBoundingBox.instances[0]).toBeTruthy();
		expect(bounding.MockBoundingBox.instances[0].resize).toHaveBeenCalledWith(3, 4, 'TOPLEFT');
		expect(eventHub.emit).toHaveBeenCalledWith(CanvasEvent.Change);
		const r2= { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) } as unknown as Rect;
		m.add([r2]);
		bounding.MockBoundingBox.instances.forEach((bb: any) => bb.resize.mockClear());
		m.getWorldMatrix = vi.fn().mockReturnValue([1,2]);
		m.resize(7, 8, 'BOTTOMRIGHT');
		expect(m.multiBoundingBox.resize).toHaveBeenCalledOnce();
		expect(m.multiBoundingBox.resize).toHaveBeenCalledWith(7, 8, 'BOTTOMRIGHT', m.getWorldMatrix());
		
		bounding.MockBoundingBox.instances.forEach((bb: any) => expect(bb.update).toHaveBeenCalled());
		expect(eventHub.emit).toHaveBeenCalledWith(CanvasEvent.Change);
	});

	it('flip() pushes Flip with correct transforms', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1: any = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r1]);
		m.flip('horizontal' as any);
		expect(flipCmd.makeMultiFlipCommand).toHaveBeenCalledWith([{ tx: 1 }], 'horizontal');
		expect(history.push).toHaveBeenCalledWith(expect.objectContaining({ label: 'Flip' }));
		const r2: any = { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r2]);
		(m.multiBoundingBox as any).flip.mockReturnValue([{ a: 1 }, { b: 2 }]);
		m.flip('vertical' as any);
		expect(flipCmd.makeMultiFlipCommand).toHaveBeenCalledWith([{ a: 1 }, { b: 2 }], 'vertical', m.multiBoundingBox);
		expect(history.push).toHaveBeenCalledWith(expect.objectContaining({ label: 'Flip' }));
	});

	it('alignSelection() and normalize() push Transform', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const r1: any = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		const r2: any = { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) };
		m.add([r1, r2]);
		(m.multiBoundingBox as any).align.mockReturnValue([{ ax: 1 }]);
		m.alignSelection('left');
		expect(transformCmd.makeMultiTransformCommand).toHaveBeenCalledWith([{ ax: 1 }]);
		(m.multiBoundingBox as any).normalize.mockReturnValue([{ nx: 2 }]);
		m.normalize('size');
		expect(transformCmd.makeMultiTransformCommand).toHaveBeenCalledWith([{ nx: 2 }]);
	});

	it('onPointerMove branches: pan, resize, marquee, move', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		const updateCameraPos = vi.fn();
		m.onPointerMove(10, 11, 1, 2, null as any, () => true, updateCameraPos, getWorldMatrix);
		expect(updateCameraPos).toHaveBeenCalledWith(10, 11);
		const resizeSpy = vi.spyOn(m as any, 'resize');
		m.onPointerMove(0, 0, 3, 4, 'TOP_LEFT' as any, () => false, updateCameraPos, getWorldMatrix);
		expect(resizeSpy).toHaveBeenCalledWith(3, 4, 'TOP_LEFT');
		const c1: any = { id: 'c1', getBoundingBox: vi.fn().mockReturnValue({ id: 'b1' }) };
		const c2: any = { id: 'c2', getBoundingBox: vi.fn().mockReturnValue({ id: 'b2' }) };
		getCanvasChildren = () => [c1, c2];
		const m2 = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, getCanvasChildren, getWorldCoords);
		m2.add([c2]);
		m2.marqueeBox = { x: 0, y: 0 } as any;
		bounding.AABB_isColliding.mockImplementation((box: any) => box.id === 'b1');
		const addSpy = vi.spyOn(m2 as any, 'add');
		const removeSpy = vi.spyOn(m2 as any, 'remove');
		m2.onPointerMove(0, 0, 5, 6, null as any, () => false, updateCameraPos, getWorldMatrix);
		expect(addSpy).toHaveBeenCalledWith([c1]);
		expect(removeSpy).toHaveBeenCalledWith([c2]);
		const mvSpy = vi.spyOn(m as any, 'move');
		m.onPointerMove(0, 0, 7, 8, null as any, () => false, updateCameraPos, getWorldMatrix);
		expect(mvSpy).toHaveBeenCalledWith(7, 8);
	});

	it('onSelectionPointerDown with valid child but no shift key', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		m.clear = vi.fn();
		m.add = vi.fn();

		const child = new Rect({});
		m.onSelectionPointerDown(false, child, 10, 10);

		expect(m.clear).toHaveBeenCalledOnce();
		expect(m.add).toHaveBeenCalledWith([child]);
	});

	it('onSelectionPointerDown with shift key and child', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		m.clear = vi.fn();
		m.add = vi.fn();

		const child = new Rect({});
		m.onSelectionPointerDown(true, child, 10, 10);

		expect(m.clear).not.toHaveBeenCalled();
		expect(m.add).toHaveBeenCalledWith([child]);
	});

	it('onSelectionPointerDown with no valid child', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		expect(m.marqueeBox).toBeUndefined();
		m.clear = vi.fn();

		m.onSelectionPointerDown(true, undefined as any, 10, 10);

		expect(m.clear).toHaveBeenCalled();
		expect(m.marqueeBox.x).toBe(10);
		expect(m.marqueeBox.y).toBe(10);
	});

	it('onSelectionPointerDown with no valid child', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		expect(m.marqueeBox).toBeUndefined();
		m.clear = vi.fn();
		m.clearMarquee = vi.fn();

		m.onSelectionPointerDown(true, undefined as any, 10, 10);
		expect(m.clear).toHaveBeenCalled();
		expect(m.marqueeBox.x).toBe(10);
		expect(m.marqueeBox.y).toBe(10);

		m.onSelectionPointerDown(true, undefined as any, 10, 10);
		expect(m.clearMarquee).toHaveBeenCalledOnce();
	});

	it('tests hitTestAdjustedCorner with multiboundingbox flipped scale', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		
		const r1 = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}), resize: vi.fn() } as unknown as Rect;
		m.add([r1]);

		const r2= { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) } as unknown as Rect;
		m.add([r2]);

		m.multiBoundingBox.scale = [1, -1];
		m.multiBoundingBox.hitTest = vi.fn().mockReturnValue('TOPLEFT');

		const result = m.hitTestAdjustedCorner(10, 10);
		expect(m.multiBoundingBox.hitTest).toHaveBeenCalled();
		expect(oppositeCorner).toHaveBeenCalledWith('TOPLEFT');
		expect(result).toBe('opp:TOPLEFT');
	});

	it('tests hitTestAdjustedCorner normally with multiboundingbox', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		
		const r1 = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}), resize: vi.fn() } as unknown as Rect;
		m.add([r1]);

		const r2= { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) } as unknown as Rect;
		m.add([r2]);

		m.multiBoundingBox.scale = [1, 1];
		m.multiBoundingBox.hitTest = vi.fn().mockReturnValue('TOPLEFT');

		const result = m.hitTestAdjustedCorner(10, 10);
		expect(m.multiBoundingBox.hitTest).toHaveBeenCalled();
		expect(oppositeCorner).not.toHaveBeenCalled();
		expect(result).toBe('TOPLEFT');
	});

	it('tests hitTestAdjustedCorner normally with multiboundingbox but fails hitTest', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		
		const r1 = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}), resize: vi.fn() } as unknown as Rect;
		m.add([r1]);

		const r2= { id: 'r2', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}) } as unknown as Rect;
		m.add([r2]);

		m.multiBoundingBox.scale = [1, 1];
		m.multiBoundingBox.hitTest = vi.fn().mockReturnValue('');

		const result = m.hitTestAdjustedCorner(10, 10);
		expect(m.multiBoundingBox.hitTest).toHaveBeenCalled();
		expect(oppositeCorner).not.toHaveBeenCalled();
		expect(result).toBe(undefined);
	});

	it('tests hitTestAdjustedCorner normally with a single boundingBox', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		
		const r1 = { id: 'r1', sx: 1, sy: -1, getBoundingBox: vi.fn().mockReturnValue({}), resize: vi.fn() } as unknown as Rect;
		m.add([r1]);

		m.boundingBoxes.forEach(box => box.hitTest = vi.fn().mockReturnValue('TOPLEFT'));

		const result = m.hitTestAdjustedCorner(10, 10);
		expect(Array.from(m.boundingBoxes)[0].hitTest).toHaveBeenCalled();
		expect(oppositeCorner).toHaveBeenCalledWith('TOPLEFT');
		expect(result).toBe('opp:TOPLEFT');
	});

	it('tests hitTestAdjustedCorner normally with a single boundingBox but fails hitTest', () => {
		const m = new SelectionManager(history, eventHub, gl, program, getWorldMatrix, () => [], getWorldCoords);
		
		const r1 = { id: 'r1', sx: 1, sy: 1, getBoundingBox: vi.fn().mockReturnValue({}), resize: vi.fn() } as unknown as Rect;
		m.add([r1]);

		m.boundingBoxes.forEach(box => box.hitTest = vi.fn().mockReturnValue('TOPLEFT'));

		const result = m.hitTestAdjustedCorner(10, 10);
		expect(Array.from(m.boundingBoxes)[0].hitTest).toHaveBeenCalled();
		expect(oppositeCorner).not.toHaveBeenCalled();
		expect(result).toBe('TOPLEFT');
	});
});
