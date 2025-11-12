export interface Command {
    label?: string;
    do(): void;
    undo(): void;
}

export class CanvasHistory {
    private _undoStack: Command[][] = [];
    private _redoStack: Command[][] = [];
    private _openGroup: Command[] | null = null;
    private _openLabel?: string;

    get undoStack() { return this._undoStack }

    begin(label?: string) {
        if (this._openGroup) throw new Error("History group already open");
        this._openGroup = [];
        this._openLabel = label;
    }

    push(cmd: Command) {
        if (this._openGroup) {
            this._openGroup.push(cmd);
        } else {
            this._undoStack.push([cmd]);
            cmd.do();
            this._redoStack.length = 0;
        }
    }

    commit() {
        if (!this._openGroup) return;
        const group = this._openGroup;
        this._openGroup = null;
        for (const c of group) c.do();
        this._undoStack.push(group);
        this._redoStack.length = 0;
        this._openLabel = undefined;
    }

    cancel() {
        // Drop current group without executing
        this._openGroup = null;
        this._openLabel = undefined;
    }

    canUndo() { return this._undoStack.length > 0; }
    canRedo() { return this._redoStack.length > 0; }

    undo() {
        const group = this._undoStack.pop();
        if (!group) return;

        for (let i = group.length - 1; i >= 0; i--) group[i].undo();
        this._redoStack.push(group);
    }

    redo() {
        const group = this._redoStack.pop();
        if (!group) return;
        for (const c of group) c.do();
        this._undoStack.push(group);
    }

    clear() {
        this._undoStack.length = 0;
        this._redoStack.length = 0;
        this._openGroup = null;
        this._openLabel = undefined;
    }
}

// Helpers ------------------------------------------------------------
export function setNumberProp<T extends object>(
    target: T,
    key: keyof T,
    next: number,
    label?: string
): Command {
    const k = key as keyof any;
    const prev = (target as any)[k] as number;
    return {
        label,
        do() { (target as any)[k] = next; },
        undo() { (target as any)[k] = prev; },
    };
}

export function setBooleanProp<T extends object>(
    target: T, key: keyof T, next: boolean, label?: string
): Command {
    const k = key as keyof any;
    const prev = (target as any)[k] as boolean;
    return {
        label,
        do() { (target as any)[k] = next; },
        undo() { (target as any)[k] = prev; },
    };
}

// Move (x,y) as one atomic command
export function setXY(
    target: { x: number; y: number; setTranslation?: (x: number, y: number) => void },
    toX: number,
    toY: number,
    label = "Move"
): Command {
    const fromX = target.x;
    const fromY = target.y;
    const setter = target.setTranslation?.bind(target);
    return {
        label,
        do() { setter ? setter(toX, toY) : ((target.x = toX), (target.y = toY)); },
        undo() { setter ? setter(fromX, fromY) : ((target.x = fromX), (target.y = fromY)); },
    };
}