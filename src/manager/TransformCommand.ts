import { Command } from "../history";

export interface TransformSnapshot {
    x: number;
    y: number;
    sx: number;
    sy: number;
}

function applyTransform(target: any, t: TransformSnapshot) {
    if (typeof target.setTranslation === 'function') target.setTranslation(t.x, t.y);
    else { target.x = t.x; target.y = t.y; }
    if (typeof target.setScale === 'function') target.setScale(t.sx, t.sy);
    else { target.sx = t.sx; target.sy = t.sy; }
}

export function makeTransformCommand(
    target: any,
    start: TransformSnapshot,
    end: TransformSnapshot,
    label = 'Transform'
): Command {
    return {
        label,
        do() { applyTransform(target, end); },
        undo() { applyTransform(target, start); },
    };
}

export function makeMultiTransformCommand(
    entries: Array<{ ref: any; start: TransformSnapshot; end: TransformSnapshot }>,
    label = 'Transform'
): Command {
    return {
        label,
        do() { for (const e of entries) applyTransform(e.ref, e.end); },
        undo() { for (const e of entries) applyTransform(e.ref, e.start); },
    };
}