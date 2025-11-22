import { Img, Rect, Renderable, Shape } from "../shapes";
import {
    BoundingBoxCollisionType,
    ContextMenuEvent,
    copy,
    LoaderEvent,
} from "../util";
import { PointerEventState } from "../state";
import { CanvasHistory } from "../history";
import { makeMultiTransformCommand, TransformSnapshot } from "./TransformCommand";
import EventEmitter from "eventemitter3";
import { ContextMenuManager } from "./ContextMenu";

export interface Point {
    x: number,
    y: number,
}

export enum PointerMode {
    SELECT,
    PAN,
}

const cursorMap: Record<string, string> = {
    TOP: 'ns-resize',
    BOTTOM: 'ns-resize',
    LEFT: 'ew-resize',
    RIGHT: 'ew-resize',
    TOPLEFT: 'nwse-resize',
    BOTTOMRIGHT: 'nwse-resize',
    TOPRIGHT: 'nesw-resize',
    BOTTOMLEFT: 'nesw-resize',
	CENTER: 'grab',
};

interface PointerEventManagerDeps {
    history: CanvasHistory,
    eventHub: EventEmitter,
    state: PointerEventState,
    isContextMenuActive: boolean;
    getSelected: () => Renderable[],
    getChildren: () => Renderable[],
    getWorldMatrix: () => number[],
    getCanvasGlobalClick: () => boolean,
    setCanvasGlobalClick:(val: boolean) => void,
    getWorldCoordsFromCanvas: (x: number, y: number) => number[],
    updateCameraPos: (x: number, y: number) => void,
    onWheel: (e: WheelEvent) => void,
    setCursorStyle: (val: string) => void,
    paste: (x: number, y: number) => Promise<void>,
    clearMarquee: () => void,
    assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void,
    selectionPointerMove: (
        x: number,
        y: number,
        dx: number,
        dy: number,
        resizeDirection: BoundingBoxCollisionType
    ) => void,
    onSelectionPointerDown: (isShiftKey: boolean, child: Shape, wx : number, wy: number) => void,
    checkIfSelectionHit: (x: number, y: number) => BoundingBoxCollisionType | null,
    addSelection: (rects: Rect[]) => void,
    clearSelection: () => void,
    isSelection: (rect: Rect) => boolean,
    hitTestAdjustedCorner: (x: number, y: number) => BoundingBoxCollisionType,
}

export class PointerEventManager {
    state: PointerEventState;
    history: CanvasHistory;
    eventHub: EventEmitter;

    isContextMenuActive: boolean;
    
    getSelected: () => Renderable[];
    onSelectionPointerDown: (isShiftKey: boolean, child: Shape, wx : number, wy: number) => void;
    selectionPointerMove: (x: number, y: number, dx: number, dy: number, resizingDirection: BoundingBoxCollisionType) => void;
    checkIfSelectionHit: (x: number, y: number) => BoundingBoxCollisionType | null;
    addSelection: (rects: Rect[]) => void;
    clearSelection: () => void;
    isSelection: (rect: Rect) => boolean;
    setCursorStyle: (s: string) => void;
    getWorldCoords: (x: number, y: number) => number[];
    getChildren: () => Renderable[];
    setCanvasGlobalClick: (val: boolean) => void;
    closeMarquee: () => void;
    hitTestAdjustedCorner: (x: number, y: number) => BoundingBoxCollisionType;

    assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void;

    private currentTransform?:
      { targets: Array<{ ref: Rect; start: TransformSnapshot }> };

    constructor(deps: PointerEventManagerDeps) {
        Object.assign(this, {
            state: deps.state,
            history: deps.history,
            eventHub: deps.eventHub,
            getSelected: deps.getSelected,
            getChildren: deps.getChildren,
            checkIfSelectionHit: deps.checkIfSelectionHit,
            addSelection: deps.addSelection,
            clearSelection: deps.clearSelection,
            isSelection: deps.isSelection,
            onSelectionPointerDown: deps.onSelectionPointerDown,
            selectionPointerMove: deps.selectionPointerMove,
            assignEventListener: deps.assignEventListener,
            getWorldCoords: deps.getWorldCoordsFromCanvas,
            setCursorStyle: deps.setCursorStyle,
            isContextMenuActive: deps.isContextMenuActive,
            setCanvasGlobalClick: deps.setCanvasGlobalClick,
            closeMarquee: deps.clearMarquee,
            hitTestAdjustedCorner: deps.hitTestAdjustedCorner,
        });

        // bind methods
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMoveWhileDown = this.onPointerMoveWhileDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);

        // register event listeners
        this.addOnPointerMove(
            deps.getWorldCoordsFromCanvas,
            deps.setCursorStyle,
        );

        this.addOnWheel(deps.onWheel);
        this.addOnPointerDown();

        window.addEventListener('copy', async (e) => {
            e.preventDefault();
            if (!this.isContextMenuActive) return;

            await copy(this.getSelected() as Img[]);
        });

        window.addEventListener('paste', async (e) => {
            e.preventDefault();
            deps.eventHub.emit(LoaderEvent.start, 'spinner');
            if (this.isContextMenuActive) return;
            await deps.paste(                
                this.state.lastPointerPos.x,
                this.state.lastPointerPos.y,
            );
            deps.eventHub.emit(LoaderEvent.done);
        });
    }

    changeMode() {
        this.state.toggleMode();
    }
    
    // Add events
    private addOnPointerDown() {
        this.assignEventListener('pointerdown', this.onPointerDown);
    }
    
    private addOnPointerMove(
        getWorldCoords: (x: number, y: number) => number[],
        setCursorStyle: (val: string) => void,
    ) {
        this.assignEventListener('pointermove', (e) => {
            [this.state.lastPointerPos.x, this.state.lastPointerPos.y] = getWorldCoords(e.clientX, e.clientY);

            let hit = this.hitTestAdjustedCorner(this.state.lastPointerPos.x, this.state.lastPointerPos.y);
			setCursorStyle(cursorMap[hit] || 'default');
        });
    }
    
    private addOnWheel(onWheel: (e: WheelEvent) => void) {
        this.assignEventListener('wheel', (e) => {
            if (!this.isContextMenuActive) {
                onWheel(e);
            }
        }, { passive: false });
    }

    private onPointerDown(e: PointerEvent) {
        e.stopPropagation();
        e.preventDefault();
        this.eventHub.emit(ContextMenuEvent.Close);

        const [wx, wy] = this.getWorldCoords(e.clientX, e.clientY);
        this.state.initialize(wx, wy);

        this.currentTransform = undefined;

        if (this.state.mode === PointerMode.PAN) {
            this.handlePanPointerDown();
        } else if (this.state.mode === PointerMode.SELECT) {
            this.handleSelectPointerDown(e, wx, wy);
        }

        document.addEventListener('pointermove', this.onPointerMoveWhileDown);
        document.addEventListener('pointerup', this.onPointerUp);
    }

    private handlePanPointerDown(
    ) {
        this.setCanvasGlobalClick(true);
        this.clearSelection();
    }

    private handleSelectPointerDown(
        e: MouseEvent, 
        wx: number, 
        wy: number, 
    ) {
        this.setCanvasGlobalClick(false);
        const child = this.checkCollidingChild(wx, wy);
        const boundingBoxType = this.checkIfSelectionHit(wx, wy);

        if (e.button === 2) {
            if (!boundingBoxType) {
                this.clearSelection();
            }
            
            if (child && !this.isSelection(child as Rect)) {
                this.addSelection([child as Rect]);
            }
        } else {
            if (boundingBoxType) {
                this.state.resizingDirection = boundingBoxType;
            } else {
                this.onSelectionPointerDown(e.shiftKey, child, wx, wy);
            }

            const selected = this.getSelected() as Rect[];
            if (selected.length) {
                this.currentTransform = {
                    targets: selected.map(ref => ({
                        ref,
                        start: { x: ref.x, y: ref.y, sx: ref.sx, sy: ref.sy },
                    })),
                };
            }
        }
    }

    private onPointerMoveWhileDown(e: PointerEvent) {
        // in move, the buttons property is checked
        if (e.buttons === 2) return;
        const [wx, wy] = this.getWorldCoords(e.clientX, e.clientY);
        const dx = wx - this.state.lastWorldX;
        const dy = wy - this.state.lastWorldY;
        
        this.selectionPointerMove(this.state.startWorldX - wx, this.state.startWorldY - wy, dx, dy, this.state.resizingDirection);

        this.state.updateLastWorldCoord(wx, wy);
        this.setCursorStyle('grabbing'); 
    }

    private onPointerUp() {
        document.removeEventListener('pointermove', this.onPointerMoveWhileDown);
        document.removeEventListener('pointerup', this.onPointerUp);
        this.setCanvasGlobalClick(true);
        this.setCursorStyle('default');

        if (this.currentTransform) {
            const entries = this.currentTransform.targets
              .map(t => ({
                  ref: t.ref,
                  start: t.start,
                  end: { x: t.ref.x, y: t.ref.y, sx: t.ref.sx, sy: t.ref.sy },
              }))
              .filter(e =>
                  e.start.x !== e.end.x ||
                  e.start.y !== e.end.y ||
                  e.start.sx !== e.end.sx ||
                  e.start.sy !== e.end.sy
              );
            if (entries.length) {
                this.history.push(makeMultiTransformCommand(entries));
            }
        }
        this.currentTransform = undefined;
        this.state.resizingDirection = null;

        this.closeMarquee();

        this.eventHub.emit('save');
    }

    private checkCollidingChild(wx: number, wy: number) {
        const children = this.getChildren();
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (child instanceof Shape) {
                if (child.hitTest && child.hitTest(wx, wy)) {
                    return child;
                }
            }
        }
        return null;
    }
}