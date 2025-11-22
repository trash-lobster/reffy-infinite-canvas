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
import { SelectionManager } from "./Selection";
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
    selectionManager: SelectionManager,
    contextMenuManager: ContextMenuManager,
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
}

export class PointerEventManager {
    state: PointerEventState;
    history: CanvasHistory;
    eventHub: EventEmitter;

    getSelected: () => Renderable[];
    isContextMenuActive: boolean;

    onPointerDown: (e: PointerEvent) => void;
    onPointerMoveWhileDown: (e: PointerEvent) => void;
    onPointerUp: (e: PointerEvent) => void;
    
    assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void;

    private currentTransform?:
      { targets: Array<{ ref: Rect; start: TransformSnapshot }> };

    constructor(deps: PointerEventManagerDeps) {
        this.state = deps.state;
        this.history = deps.history;
        this.eventHub = deps.eventHub;
        this.getSelected = () => deps.selectionManager.selected;
        this.isContextMenuActive = deps.contextMenuManager.isActive;

        this.assignEventListener = deps.assignEventListener;

        // bind methods
        this.onPointerDown = (e: PointerEvent) => this.setupOnPointerDown.bind(this)(
            e,
            deps.selectionManager,
            deps.getChildren,
            deps.setCanvasGlobalClick,
            deps.getWorldCoordsFromCanvas,
        );

        this.onPointerMoveWhileDown = (e: PointerEvent) => this.setupOnPointerMoveWhileDown.bind(this)(
            e,
            deps.getWorldCoordsFromCanvas,
            deps.setCursorStyle,
            deps.selectionPointerMove,
        )

        this.onPointerUp = () => this.setupOnPointerUp.bind(this)(
            deps.setCanvasGlobalClick,
            deps.setCursorStyle,
            deps.clearMarquee,
        );

        // register event listeners
        this.addOnPointerMove(
            deps.selectionManager,
            deps.getWorldCoordsFromCanvas,
            deps.setCursorStyle,
        );
        this.addOnWheel(deps.onWheel);
        this.addOnPointerDown(
            deps.selectionManager,
            deps.getChildren,
            deps.setCanvasGlobalClick,
            deps.getWorldCoordsFromCanvas,
        );

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
    private addOnPointerDown(
        selectionManager: SelectionManager,
        getChildren: () => Renderable[],
        setCanvasGlobalClick: (val: boolean) => void,
        getWorldCoords: (x: number, y: number) => number[],
    ) {
        this.assignEventListener('pointerdown', 
            (e: PointerEvent) => this.setupOnPointerDown(
                e, 
                selectionManager,
                getChildren,
                setCanvasGlobalClick,
                getWorldCoords,
            )
        );
    }
    
    private addOnPointerMove(
        selectionManager: SelectionManager,
        getWorldCoords: (x: number, y: number) => number[],
        setCursorStyle: (val: string) => void,
    ) {
        this.assignEventListener('pointermove', (e) => {
            [this.state.lastPointerPos.x, this.state.lastPointerPos.y] = getWorldCoords(e.clientX, e.clientY);

            let hit = selectionManager.hitTestAdjustedCorner(this.state.lastPointerPos.x, this.state.lastPointerPos.y);
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

    private setupOnPointerDown(
        e: PointerEvent, 
        selectionManager: SelectionManager,
        getChildren: () => Renderable[],
        setCanvasGlobalClick: (val: boolean) => void,
        getWorldCoords: (x: number, y: number) => number[],
    ) {
        e.stopPropagation();
        e.preventDefault();
        this.eventHub.emit(ContextMenuEvent.Close);

        const [wx, wy] = getWorldCoords(e.clientX, e.clientY);
        this.state.initialize(wx, wy);

        this.currentTransform = undefined;

        if (this.state.mode === PointerMode.PAN) {
            this.handlePanPointerDown(setCanvasGlobalClick, selectionManager);
        } else if (this.state.mode === PointerMode.SELECT) {
            this.handleSelectPointerDown(e, wx, wy, selectionManager, setCanvasGlobalClick, getChildren);
        }

        document.addEventListener('pointermove', this.onPointerMoveWhileDown);
        document.addEventListener('pointerup', this.onPointerUp);
    }

    private handlePanPointerDown(
        setCanvasGlobalClick: (val: boolean) => void,
        selectionManager: SelectionManager,
    ) {
        setCanvasGlobalClick(true);
        selectionManager.clear();
    }

    private handleSelectPointerDown(
        e: MouseEvent, 
        wx: number, 
        wy: number, 
        selectionManager: SelectionManager,
        setCanvasGlobalClick: (val: boolean) => void,
        getChildren: () => Renderable[],
    ) {
        setCanvasGlobalClick(false);
        if (e.button === 2) {
            if (!selectionManager.hitTest(wx, wy)) {
                selectionManager.clear();
            }

            const child = this.checkCollidingChild(wx, wy, getChildren);
            if (child && !selectionManager.isRectSelected(child as Rect)) {
                selectionManager.add([child as Rect]);
            }
        } else {
            const boundingBoxType = selectionManager.hitTest(wx, wy);
            if (boundingBoxType) {
                this.state.resizingDirection = boundingBoxType;
            } else {
                const child = this.checkCollidingChild(wx, wy, getChildren);
                if (child) {
                    if (!e.shiftKey) {                            
                        selectionManager.clear();
                    }
                    selectionManager.add([child as Rect]);
                } else {
                    selectionManager.clear();
                    if (selectionManager.marqueeBox) {
                        selectionManager.clearMarquee();
                    } else {
                        selectionManager.marqueeBox = {x: wx, y: wy};
                    }
                }
            }

            const selected = selectionManager.selected;
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

    private setupOnPointerMoveWhileDown(
        e: PointerEvent,
        getWorldCoords: (x: number, y: number) => number[],
        setCursorStyle: (val: string) => void,
        selectionPointerMove: (x: number, y: number, dx: number, dy: number, resizeDirection: BoundingBoxCollisionType) => void,
    ) {
        // in move, the buttons property is checked
        if (e.buttons === 2) return;
        const [wx, wy] = getWorldCoords(e.clientX, e.clientY);
        const dx = wx - this.state.lastWorldX;
        const dy = wy - this.state.lastWorldY;
        
        selectionPointerMove(this.state.startWorldX - wx, this.state.startWorldY - wy, dx, dy, this.state.resizingDirection);

        this.state.updateLastWorldCoord(wx, wy);
        setCursorStyle('grabbing'); 
    }

    private setupOnPointerUp(
        setCanvasGlobalClick: (val: boolean) => void,
        setCursorStyle: (val: string) => void,
        closeMarquee: () => void,
    ) {
        document.removeEventListener('pointermove', this.onPointerMoveWhileDown);
        document.removeEventListener('pointerup', this.onPointerUp);
        setCanvasGlobalClick(true);
        setCursorStyle('default');

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

        closeMarquee();

        this.eventHub.emit('save');
    }

    private checkCollidingChild(wx: number, wy: number, getChildren: () => Renderable[]) {
        const children = getChildren();
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