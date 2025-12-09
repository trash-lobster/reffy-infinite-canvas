import { Rect, Renderable } from "shapes";
import { Command } from "../history";
import { MultiBoundingBox } from "../bounding";

export interface FlipSnapshotItem {
    ref: Rect,
    start: FlipSnapshot,
    end?: FlipSnapshot,
}

export interface FlipSnapshot {
    x: number;
    y: number;
    sx: number;
    sy: number;
}

export type FlipDirection = 'vertical' | 'horizontal';

function applyFlip(target: Renderable, t: FlipSnapshot) {
    target.setTranslation(t.x, t.y);
    target.setScale(t.sx, t.sy);
}

export function makeFlipCommand(
    target: Renderable,
    start: FlipSnapshot,
    end: FlipSnapshot,
    label = 'Flip'
): Command {
    return {
        label,
        do() { applyFlip(target, end); },
        undo() { applyFlip(target, start); },
    };
}

export function makeMultiFlipCommand(
    entries: FlipSnapshotItem[],
    direction: FlipDirection,
    multiBoundingBox?: MultiBoundingBox,
): Command {
    return {
        label: 'Flip',
        do() { 
            for (const e of entries) applyFlip(e.ref, e.end);
            if (multiBoundingBox) {
                multiBoundingBox.scale[direction === 'horizontal' ? 0 : 1] *= -1;
            }
        },
        undo() { 
            for (const e of entries) applyFlip(e.ref, e.start);
            if (multiBoundingBox) {
                multiBoundingBox.scale[direction === 'horizontal' ? 0 : 1] *= -1;
            }
        },
    };
}