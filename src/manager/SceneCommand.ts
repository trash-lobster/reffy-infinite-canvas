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
  parent: Canvas,
  child: Renderable,
  label = "Add Child",
): Command {
  return {
    label,
    do() {
      parent.children.push(child);
    },
    undo() {
      const i = parent.children.indexOf(child);
      if (i >= 0) parent.children.splice(i, 1);
    },
  };
}

export function makeMultiAddChildCommand(
  parent: Canvas,
  children: Renderable[],
  label = "Add Child",
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
  parent: Canvas,
  child: Renderable,
  label = "Remove Child",
): Command {
  let idx = -1;
  return {
    label,
    do() {
      idx = parent.children.indexOf(child);
      if (idx >= 0) parent.children.splice(idx, 1);
    },
    undo() {
      if (idx < 0) {
        parent.children.push(child);
        return;
      }
      parent.children.splice(idx, 0, child);
    },
  };
}

export function makeMultiRemoveChildCommand(
  parent: Canvas,
  children: Renderable[],
  label = "Remove Children",
): Command {
  // Store original indices so we can restore ordering on undo
  let positions: { child: Renderable; idx: number }[] = [];
  return {
    label,
    do() {
      // Build a unique set to avoid duplicate work
      const target = new Set(children);
      positions = [];
      parent.children.forEach((c, i) => {
        if (target.has(c)) positions.push({ child: c, idx: i });
      });
      // Remove in descending index order so earlier indices remain valid
      positions
        .slice()
        .sort((a, b) => b.idx - a.idx)
        .forEach(({ child }) => {
          parent.removeChild(child); // handles selection + GPU cleanup
        });
    },
    undo() {
      // Reinsert in ascending order at original indices
      positions
        .slice()
        .sort((a, b) => a.idx - b.idx)
        .forEach(({ child, idx }) => {
          if (parent.children.includes(child)) return; // already restored
          // Insert at the recorded index preserving draw order
          parent.children.splice(
            Math.min(idx, parent.children.length),
            0,
            child,
          );
          // Re-establish parent link (manual since we bypass appendChild)
          child.addParent(parent);
        });
      parent.markOrderDirty();
    },
  };
}
