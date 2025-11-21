import { Canvas } from "../Canvas";
import { CanvasHistory } from "../history";

export class KeyEventManager {
    history: CanvasHistory;
    assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void;
    deleteSelected: () => void;

    constructor(
        canvas: Canvas,
        assignEventListener: (type: string, fn: (() => void) | ((e: any) => void), options?: boolean | AddEventListenerOptions) => void,
    ) {
        const { history, selectionManager } = canvas;
        this.history = history;
        this.deleteSelected = selectionManager.deleteSelected;
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
            return;
        } 
        
        if (this.isCtrlY(e)) {
            e.preventDefault();
            this.history.redo();
            return;
        }

        if (this.isDelete(e)) {
            this.deleteSelected();
            return;
        }
    }

    private isCtrlZ(e: KeyboardEvent): boolean {
        const key = e.key.toLowerCase();
        return (key === 'z') && (e.ctrlKey || e.metaKey) && !e.shiftKey;
    }

    private isCtrlY(e: KeyboardEvent): boolean {
        const key = e.key.toLowerCase();
        return (key === 'y') && (e.ctrlKey || e.metaKey) && !e.shiftKey;
    }

    private isDelete(e: KeyboardEvent): boolean {
        return e.key === 'Delete';
    }
}