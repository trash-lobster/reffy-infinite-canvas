import { Canvas } from "../Canvas";
import { CanvasHistory } from "../history";

export class KeyEventManager {
    canvas: Canvas;
    history: CanvasHistory;
    assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void;

    constructor(
        canvas: Canvas, 
        history: CanvasHistory,
        assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void,
    ) {
        this.canvas = canvas;
        this.history = history;
        this.assignEventListener = assignEventListener;

        this.onKeyPressed = this.onKeyPressed.bind(this);
        this.addOnKeyPressed();
    }

    private addOnKeyPressed() {
        document.addEventListener('keydown', this.onKeyPressed);
    }

    private onKeyPressed(e: KeyboardEvent) {
        if (this.isCtrlZ(e)) {
            e.preventDefault();
            this.history.undo();
        }
    }

    private isCtrlZ(e: KeyboardEvent): boolean {
        const key = e.key.toLowerCase();
        return (key === 'z') && (e.ctrlKey || e.metaKey) && !e.shiftKey;
    }
}