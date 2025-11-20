import EventEmitter from "eventemitter3";
import { getWorldCoords } from "../util";
import { Canvas } from "Canvas";
import { ContextMenuEvent } from "../util/customEventType";

export class ContextMenuManager {
    canvas: Canvas;
    eventHub: EventEmitter;

    copy: (e: ClipboardEvent) => Promise<void>;
    paste: (e: ClipboardEvent) => Promise<void>;
    customContextMenu: (e: PointerEvent) => void;
    isMenuActive: boolean;

    constructor(
        canvas: Canvas,
        eventHub: EventEmitter,
        assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void,
    ) {
        this.canvas = canvas;
        this.eventHub = eventHub;

        this.isMenuActive = false;

        this.customContextMenu = (e: PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // only show context menu when there is collision with a child object, otherwise clear it
            const [wx, wy] = getWorldCoords(e.clientX, e.clientY, this.canvas);

            // show different context menu depending on what is being selected
            if (this.canvas._selectionManager.isMultiBoundingBoxHit(wx, wy)) {
                this.eventHub.emit(ContextMenuEvent.Open, e.clientX, e.clientY, 'multi');
            } else if (this.canvas._selectionManager.isBoundingBoxHit(wx, wy)) {
                this.eventHub.emit(ContextMenuEvent.Open, e.clientX, e.clientY);
            } else {
                this.eventHub.emit(ContextMenuEvent.Open, e.clientX, e.clientY, 'canvas');
            }
        }

        this.eventHub.on(ContextMenuEvent.Open, () => {
            this.isMenuActive = true;
        });

        this.eventHub.on(ContextMenuEvent.Close, () => {
            this.isMenuActive = false;
        });

        assignEventListener('contextmenu', this.customContextMenu);
    }
}