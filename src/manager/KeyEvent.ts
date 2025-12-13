import { CanvasEvent } from "../util";
import { CanvasHistory } from "../history";
import EventEmitter from "eventemitter3";

export class KeyEventManager {
  history: CanvasHistory;
  assignEventListener: (
    type: string,
    fn: (() => void) | ((e: any) => void),
    options?: boolean | AddEventListenerOptions,
  ) => void;
  deleteSelected: () => void;
  save: () => void;

  constructor(
    history: CanvasHistory,
    eventHub: EventEmitter,
    deleteSelected: () => void,
    assignEventListener: (
      type: string,
      fn: (() => void) | ((e: any) => void),
      options?: boolean | AddEventListenerOptions,
    ) => void,
  ) {
    this.history = history;
    this.deleteSelected = deleteSelected;
    this.save = () => eventHub.emit(CanvasEvent.Save);
    this.assignEventListener = assignEventListener;

    this.onKeyPressed = this.onKeyPressed.bind(this);
    this.addOnKeyPressed();
  }

  private addOnKeyPressed() {
    document.addEventListener("keydown", this.onKeyPressed);
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

    if (this.isSave(e)) {
      e.preventDefault();
      this.save();
      return;
    }
  }

  private isCtrlZ(e: KeyboardEvent): boolean {
    const key = e.key.toLowerCase();
    return key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey;
  }

  private isCtrlY(e: KeyboardEvent): boolean {
    const key = e.key.toLowerCase();
    return key === "y" && (e.ctrlKey || e.metaKey) && !e.shiftKey;
  }

  private isDelete(e: KeyboardEvent): boolean {
    return e.key === "Delete";
  }

  private isSave(e: KeyboardEvent): boolean {
    const key = e.key.toLowerCase();
    return key === "s" && e.ctrlKey;
  }
}
