import { BoundingBoxCollisionType } from "../util";
import { ContextMenuEvent } from "../util/customEventType";
import EventEmitter from "eventemitter3";

export class ContextMenuManager {
    copy: (e: ClipboardEvent) => Promise<void>;
    paste: (e: ClipboardEvent) => Promise<void>;
    customContextMenu: (e: PointerEvent) => void;
    #isMenuActive: boolean = false;

    get isActive() { return this.#isMenuActive; }

    constructor(
        eventHub: EventEmitter,
        isMultiBoundingBoxHit: (x: number, y: number) => BoundingBoxCollisionType | '',
        isBoundingBoxHit: (x: number, y: number) => BoundingBoxCollisionType | '',
        getWorldCoords: (x: number, y: number) => number[],
        assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void,
    ) {
        this.customContextMenu = (e: PointerEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // only show context menu when there is collision with a child object, otherwise clear it
            const [wx, wy] = getWorldCoords(e.clientX, e.clientY);

            // show different context menu depending on what is being selected
            if (isMultiBoundingBoxHit(wx, wy)) {
                eventHub.emit(ContextMenuEvent.Open, e.clientX, e.clientY, 'multi');
            } else if (isBoundingBoxHit(wx, wy)) {
                eventHub.emit(ContextMenuEvent.Open, e.clientX, e.clientY);
            } else {
                eventHub.emit(ContextMenuEvent.Open, e.clientX, e.clientY, 'canvas');
            }
        }

        eventHub.on(ContextMenuEvent.Open, () => {
            this.#isMenuActive = true;
        });

        eventHub.on(ContextMenuEvent.Close, () => {
            this.#isMenuActive = false;
        });

        assignEventListener('contextmenu', this.customContextMenu);
    }
}