import { Canvas } from "Canvas";
import { Command } from "../history";
import { Renderable } from "../shapes";

/**
 * what do we care about from the scene?
 * Definitely not camera movement
 * layers maybe?
 * children
 * children's individual transform is handled by the transform commands
 */
export interface SceneSnapshot {
    children: Renderable[];
}

export function makeAddChildCommand(
    parent: Canvas, child: Renderable, label = "Add Child"
): Command {
    return {
        label,
        do() { parent.children.push(child); },
        undo() {
            const i = parent.children.indexOf(child);
            if (i >= 0) parent.children.splice(i, 1);
        },
    };
}

export function makeMultiAddChildCommand(
    parent: Canvas, children: Renderable[], label = "Add Child"
): Command {
    return {
        label,
        do() { 
            for (const child of children) {
                parent.appendChild(child);
            }
         },
        undo() {
            for (const child of children) {
                parent.removeChild(child);
            }

        },
    };
}

export function makeRemoveChildCommand(
    parent: Canvas, child: Renderable, label = "Remove Child"
): Command {
    let idx = -1;
    return {
        label,
        do() {
            idx = parent.children.indexOf(child);
            if (idx >= 0) parent.children.splice(idx, 1);
        },
        undo() {
            if (idx < 0) { parent.children.push(child); return; }
            parent.children.splice(idx, 0, child);
        },
    };
}