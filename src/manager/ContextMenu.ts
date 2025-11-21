import { getWorldCoords } from "../util";
import { Canvas } from "Canvas";
import { ContextMenuEvent } from "../util/customEventType";

export class ContextMenuManager {
    copy: (e: ClipboardEvent) => Promise<void>;
    paste: (e: ClipboardEvent) => Promise<void>;
    customContextMenu: (e: PointerEvent) => void;
    isMenuActive: boolean;

    constructor(
        canvas: Canvas,
        assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void,
    ) {
        const { selectionManager, eventHub } = canvas;

        this.isMenuActive = false;

        this.customContextMenu = (e: PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // only show context menu when there is collision with a child object, otherwise clear it
            const [wx, wy] = getWorldCoords(e.clientX, e.clientY, canvas);

            // show different context menu depending on what is being selected
            if (selectionManager.isMultiBoundingBoxHit(wx, wy)) {
                eventHub.emit(ContextMenuEvent.Open, e.clientX, e.clientY, 'multi');
            } else if (selectionManager.isBoundingBoxHit(wx, wy)) {
                eventHub.emit(ContextMenuEvent.Open, e.clientX, e.clientY);
            } else {
                eventHub.emit(ContextMenuEvent.Open, e.clientX, e.clientY, 'canvas');
            }
        }

        eventHub.on(ContextMenuEvent.Open, () => {
            this.isMenuActive = true;
        });

        eventHub.on(ContextMenuEvent.Close, () => {
            this.isMenuActive = false;
        });

        assignEventListener('contextmenu', this.customContextMenu);
    }
}