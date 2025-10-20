import { Rect } from "./Rect";
import { Shape, BoundingVal } from "./Shape";

export class BoundingBox extends Shape {
    getPositions(): number[] {
        // Returns the 4 corners of the bounding box in [x0, y0, x1, y1, x2, y2, x3, y3] order (clockwise)
        return [
            this.x, this.y, // Top-left
            this.x + this.width, this.y, // Top-right
            this.x + this.width, this.y + this.height, // Bottom-right
            this.x, this.y + this.height // Bottom-left
        ];
    }

    hitTest(x: number, y: number): boolean {
        // Returns true if (x, y) is inside the bounding box
        return (
            x >= this.x &&
            x <= this.x + this.width &&
            y >= this.y &&
            y <= this.y + this.height
        );
    }

    width: number;
    height: number;
    borderRects: Rect[] = [];
    handles: Rect[] = [];

    constructor(config: Partial<{x: number, y: number, width: number, height: number}>) {
        super(config.x ?? 0, config.y ?? 0);
        this.width = config.width ?? 100;
        this.height = config.height ?? 100;
        // 4 border rects (top, bottom, left, right)
        for (let i = 0; i < 4; i++) {
            const rect = new Rect({ width: 1, height: 1 });
            rect.color = [0.5, 0.8, 1.0, 1.0];
            this.borderRects.push(rect);
        }
        // 8 handle rects
        for (let i = 0; i < 8; i++) {
            const rect = new Rect({ width: 1, height: 1 });
            rect.color = [0.5, 0.8, 1.0, 1.0];
            this.handles.push(rect);
        }
    }

    getVertexCount(): number {
        // Not used for composite, but required by Shape
        return 0;
    }

    getEdge(): BoundingVal {
        return {
            minX: this.x,
            minY: this.y,
            maxX: this.x + this.width,
            maxY: this.y + this.height,
        };
    }

    update(cameraZoom: number) {
        const x = this.x, y = this.y, w = this.width, h = this.height;
        const handlePx = 8;
        const borderPx = 2;
        const dpr = window.devicePixelRatio || 1;
        const handleSize = handlePx / (cameraZoom * dpr);
        const borderSize = borderPx / (cameraZoom * dpr);

        // Border rects: top, bottom, left, right
        // Top
        this.borderRects[0].x = x;
        this.borderRects[0].y = y;
        this.borderRects[0].width = w;
        this.borderRects[0].height = borderSize;
        // Bottom
        this.borderRects[1].x = x;
        this.borderRects[1].y = y + h - borderSize;
        this.borderRects[1].width = w;
        this.borderRects[1].height = borderSize;
        // Left
        this.borderRects[2].x = x;
        this.borderRects[2].y = y;
        this.borderRects[2].width = borderSize;
        this.borderRects[2].height = h;
        // Right
        this.borderRects[3].x = x + w - borderSize;
        this.borderRects[3].y = y;
        this.borderRects[3].width = borderSize;
        this.borderRects[3].height = h;

        // Handle positions (centered exactly on the edges and corners)
        const hs2 = handleSize / 2;
        const positions = [
            [x, y],                 // TL
            [x + w, y],             // TR
            [x, y + h],             // BL
            [x + w, y + h],         // BR
            [x + w / 2, y],         // T
            [x + w / 2, y + h],     // B
            [x, y + h / 2],         // L
            [x + w, y + h / 2],     // R
        ];
        this.handles.forEach((handle, i) => {
            handle.x = positions[i][0] - hs2;
            handle.y = positions[i][1] - hs2;
            handle.width = handleSize;
            handle.height = handleSize;
            handle.renderDirtyFlag = true;
        });
    }

    render(gl: WebGLRenderingContext, program: WebGLProgram): void {
        this.update(1);
        // Render border rects
        for (const border of this.borderRects) {
            border.render(gl, program);
        }
        // Render handles
        for (const handle of this.handles) {
            handle.render(gl, program);
        }
    }
}