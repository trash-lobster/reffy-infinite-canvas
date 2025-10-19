import { Shape } from "./Shape";

export class Triangle extends Shape {
    private _base: number[];

    constructor(positions: number[]) {
        super(positions[0], positions[1]);
        this._base = positions.slice(0, 6);
    }
    
    getPositions(): number[] {
        const x = this.x, y = this.y;
        return [
            this._base[0] + x, this._base[1] + y,
            this._base[2] + x, this._base[3] + y,
            this._base[4] + x, this._base[5] + y,
        ];
    }

    getVertexCount(): number {
        return 3;
    }

    hitTest(x: number, y: number) {
        const p = this.getPositions();
        if (!p || p.length < 6) return false;

        const ax = p[0], ay = p[1];
        const bx = p[2], by = p[3];
        const cx = p[4], cy = p[5];

        // Fast reject via AABB (optional)
        const minX = Math.min(ax, bx, cx);
        const maxX = Math.max(ax, bx, cx);
        const minY = Math.min(ay, by, cy);
        const maxY = Math.max(ay, by, cy);
        if (x < minX || x > maxX || y < minY || y > maxY) return false;

        const eps = 1e-8;

        const e1 = this.edge(x, y, ax, ay, bx, by);
        const e2 = this.edge(x, y, bx, by, cx, cy);
        const e3 = this.edge(x, y, cx, cy, ax, ay);

        // Allow points on edges (>= -eps) and require consistent winding
        const hasNeg = (e1 < -eps) || (e2 < -eps) || (e3 < -eps);
        const hasPos = (e1 > eps) || (e2 > eps) || (e3 > eps);

        // If both signs present, point is outside
        if (hasNeg && hasPos) return false;

        // Degenerate triangle guard (area ~ 0)
        const area2 = Math.abs(this.edge(ax, ay, bx, by, cx, cy));
        if (area2 <= eps) return false;

        return true;
    }

    private edge = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
            (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
}