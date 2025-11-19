import { Canvas } from "Canvas";
import { Img, Rect, Renderable, Shape } from "../shapes";
import {
    copy,
    getWorldCoords,
    paste,
    worldToCamera,
} from "../util";
import { PointerEventState } from "../state";
import { CanvasHistory } from "../history";
import { makeMultiTransformCommand, TransformSnapshot } from "./TransformCommand";
import { ContextMenuType } from "../contextMenu";

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

export class PointerEventManager {
    state: PointerEventState;
    canvas: Canvas;
    history: CanvasHistory;
    addToCanvas: (src: string, x: number, y: number) => Promise<Img>;
    getSelected: () => Renderable[];

    showContextMenu: (x: number, y: number, type?: ContextMenuType) => void;
    clearContextMenu: () => void;
    isMenuActive: () => boolean;
    
    assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void;

    private currentTransform?:
      { targets: Array<{ ref: Rect; start: TransformSnapshot }> };

    constructor(
        canvas: Canvas, 
        state: PointerEventState,
        history: CanvasHistory,
        addToCanvas: (src: string, x: number, y: number) => Promise<Img>,
        getSelected: () => Renderable[],
        showContextMenu: (x: number, y: number, type?: ContextMenuType) => void,
        clearContextMenu: () => void,
        isMenuActive: () => boolean,
        assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void,
    ) {
        this.canvas = canvas;
        this.state = state;
        this.history = history;
        this.addToCanvas = addToCanvas;
        this.getSelected = getSelected;

        this.showContextMenu = showContextMenu;
        this.clearContextMenu = clearContextMenu;
        this.isMenuActive = isMenuActive;
        this.assignEventListener = assignEventListener;

        // bind methods
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMoveWhileDown = this.onPointerMoveWhileDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.canInteract = this.canInteract.bind(this);

        // register event listeners
        this.addOnPointerMove();
        this.addOnWheel();
        this.addOnPointerDown();

        // custom context menu
        this.assignEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // only show context menu when there is collision with a child object, otherwise clear it
            const [wx, wy] = getWorldCoords(e.clientX, e.clientY, this.canvas);

            // show different context menu depending on what is being selected
            if (this.canvas._selectionManager.isMultiBoundingBoxHit(wx, wy)) {
                showContextMenu(e.clientX, e.clientY, 'multi');
            } else if (this.canvas._selectionManager.isBoundingBoxHit(wx, wy)) {
                showContextMenu(e.clientX, e.clientY);
            } else {
                showContextMenu(e.clientX, e.clientY, 'canvas');
            }
        });

        window.addEventListener('copy', async (e) => {
            e.preventDefault();
            if (!this.canInteract()) return;

            await copy(this.getSelected() as Img[]);
        });

        window.addEventListener('paste', async (e) => {
            e.preventDefault();
            if (!this.canInteract()) return;
            await paste(                
                this.state.lastPointerPos.x,
                this.state.lastPointerPos.y,
                canvas, 
                history,
            );
        });
    }

    changeMode() {
        this.state.toggleMode();
    }

    private canInteract() {
        return !this.isMenuActive();
    }
    
    // #region Add events
    private addOnPointerDown() {
        this.assignEventListener('pointerdown', this.onPointerDown);
    }
    
    // always on
    private addOnPointerMove() {
        this.assignEventListener('pointermove', (e) => {
            [this.state.lastPointerPos.x, this.state.lastPointerPos.y] = getWorldCoords(e.clientX, e.clientY, this.canvas);

            let hit = this.canvas._selectionManager.hitTestAdjustedCorner(this.state.lastPointerPos.x, this.state.lastPointerPos.y);
			this.canvas.canvas.style.cursor = cursorMap[hit] || 'default';
        });
    }
    
    private addOnWheel() {
        this.assignEventListener('wheel', (e) => {
            if (!this.isMenuActive()) {
                this.canvas._camera.onWheel(e);
            }
        }, { passive: false });
    }
    // #endregion

    private onPointerDown(e: PointerEvent) {
        e.stopPropagation();
        e.preventDefault();
        this.clearContextMenu();

        const [wx, wy] = getWorldCoords(e.clientX, e.clientY, this.canvas);
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

    private handlePanPointerDown() {
        this.state.clearSelection();
        this.canvas.isGlobalClick = true;
    }

    private handleSelectPointerDown(e: MouseEvent, wx: number, wy: number) {
        this.canvas.isGlobalClick = false;
        if (e.button === 2) {
            if (!this.canvas._selectionManager.hitTest(wx, wy)) {
                this.state.clearSelection();
            }

            const child = this.checkCollidingChild(wx, wy);
            if (child && !this.canvas._selectionManager.isRectSelected(child as Rect)) {
                this.canvas._selectionManager.add([child as Rect]);
            }
        } else {
            const boundingBoxType = this.canvas._selectionManager.hitTest(wx, wy);
            if (boundingBoxType) {
                this.state.resizingDirection = boundingBoxType;
            } else {
                const child = this.checkCollidingChild(wx, wy);
                if (child) {
                    if (!e.shiftKey) {                            
                        this.state.clearSelection();
                    }
                    this.canvas._selectionManager.add([child as Rect]);
                } else {
                    this.state.clearSelection();
                    if (this.canvas._selectionManager.marqueeBox) {
                        this.canvas._selectionManager.clearMarquee();
                    } else {
                        this.canvas._selectionManager.marqueeBox = {x: wx, y: wy};
                    }
                }
            }

            const selected = this.canvas._selectionManager.selected;
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
        const [wx, wy] = getWorldCoords(e.clientX, e.clientY, this.canvas);
        const dx = wx - this.state.lastWorldX;
        const dy = wy - this.state.lastWorldY;
        
        
        if (this.canvas.isGlobalClick) {
            this.canvas._camera.updateCameraPos(this.state.startWorldX - wx, this.state.startWorldY - wy);
        } else if (this.state.resizingDirection && this.state.resizingDirection !== 'CENTER') {
            this.canvas._selectionManager.resize(dx, dy, this.state.resizingDirection);
        } else if (this.canvas._selectionManager.marqueeBox) {
            this.canvas._selectionManager.marqueeBox.resize(dx, dy, this.canvas.worldMatrix);
        } else {
            this.canvas._selectionManager.move(dx, dy);
        }

        this.state.updateLastWorldCoord(wx, wy);
        this.canvas.canvas.style.cursor = 'grabbing'; 
    }

    private onPointerUp() {
        document.removeEventListener('pointermove', this.onPointerMoveWhileDown);
        document.removeEventListener('pointerup', this.onPointerUp);
        this.canvas.isGlobalClick = true;
        this.canvas.canvas.style.cursor = 'default';

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

        if (this.canvas._selectionManager.marqueeBox) {
            this.canvas._selectionManager.clearMarquee();
        }

        this.canvas.eventEmitter.emit('save');
    }

    private checkCollidingChild(wx: number, wy: number) {
        for (let i = this.canvas.children.length - 1; i >= 0; i--) {
            const child = this.canvas.children[i];
            if (child instanceof Shape) {
                if (child.hitTest && child.hitTest(wx, wy)) {
                    return child;
                }
            }
        }
        return null;
    }
}