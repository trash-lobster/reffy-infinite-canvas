import { Shape } from "./Shape";
import { arraysEqual } from "../util/checks";

export class Triangle extends Shape {
    $positions: number[];

    constructor(positions: number[]) {
        super();
        this.$positions = positions;
    }

    get positions() {
        return this.$positions;
    }

    set positions(newPos: number[]) {
        if (!arraysEqual(this.$positions, newPos)) {
            this.$positions = newPos;
            this.renderDirtyFlag = true;
        }
    }

    getPositions(): number[] {
        return this.$positions;
    }

    getVertexCount(): number {
        return 4;
    }
}
