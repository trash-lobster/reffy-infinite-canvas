import { Shape, Renderable } from "shapes";
import { Command } from "../history";

export interface OrderSnapshotItem {
    ref: Shape,
    start: OrderSnapshot,
    end?: OrderSnapshot,
}

export interface OrderSnapshot {
    renderOrder: number;
}

function apply(target: Renderable, t: OrderSnapshot) {
    (target as Shape).renderOrder = t.renderOrder;
}

export function makeOrderCommand(
    target: Renderable,
    start: OrderSnapshot,
    end: OrderSnapshot,
    label = 'Order'
): Command {
    return {
        label,
        do() { apply(target, end); },
        undo() { apply(target, start); },
    };
}

export function makeMultiOrderCommand(
    entries: Array<{ ref: any; start: OrderSnapshot; end?: OrderSnapshot }>,
    label = 'Order'
): Command {
    return {
        label,
        do() { for (const e of entries) apply(e.ref, e.end); },
        undo() { for (const e of entries) apply(e.ref, e.start); },
    };
}