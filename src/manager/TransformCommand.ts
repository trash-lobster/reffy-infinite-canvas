import { Shape, Renderable } from "shapes";
import { Command } from "../history";

export interface TransformSnapshotItem {
    ref: Shape,
    start: TransformSnapshot,
    end: TransformSnapshot,
}

export interface TransformSnapshot {
    x: number;
    y: number;
    sx: number;
    sy: number;
}

function applyTransform(target: Renderable, t: TransformSnapshot) {
    target.setTranslation(t.x, t.y);
    target.setScale(t.sx, t.sy);
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