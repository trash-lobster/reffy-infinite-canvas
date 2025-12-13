import { describe, it, expect } from "vitest";
import { Rect } from "../../../src/shapes";
import {
  FlipSnapshot,
  makeFlipCommand,
  makeMultiFlipCommand,
  makeMultiOrderCommand,
  makeOrderCommand,
  OrderSnapshot,
} from "../../../src/manager";

describe("Order command", () => {
  it("applies flip and do", () => {
    const renderable = new Rect({});
    const start: OrderSnapshot = { renderOrder: 99 };
    const end: OrderSnapshot = { renderOrder: 1 };

    const command = makeOrderCommand(renderable, start, end);
    command.do();
    expect(renderable.renderOrder).toBe(1);
  });

  it("applies flip and undo", () => {
    const renderable = new Rect({});
    const start: OrderSnapshot = { renderOrder: 99 };
    const end: OrderSnapshot = { renderOrder: 1 };

    const command = makeOrderCommand(renderable, start, end);
    command.undo();
    expect(renderable.renderOrder).toBe(99);
  });
});

describe("Multi order command", () => {
  it("applies flip to multiple entries and flips horizontal scale on do", () => {
    const r1 = new Rect({});
    const r2 = new Rect({});
    const start: OrderSnapshot = { renderOrder: 99 };
    const end: OrderSnapshot = { renderOrder: 1 };
    const start2: OrderSnapshot = { renderOrder: 45 };
    const end2: OrderSnapshot = { renderOrder: 30 };

    const multiBoundingBox: any = { scale: [1, 1] };

    const cmd = makeMultiOrderCommand([
      { ref: r1, start: start, end: end },
      { ref: r2, start: start2, end: end2 },
    ]);

    cmd.do();
    expect(r1.renderOrder).toBe(1);
    expect(r2.renderOrder).toBe(30);

    cmd.undo();
    expect(r1.renderOrder).toBe(99);
    expect(r2.renderOrder).toBe(45);
  });
});
