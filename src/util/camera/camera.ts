import { Canvas } from "Canvas";
import { m3 } from "../webgl/m3";

export function getClipSpaceMousePosition(e: MouseEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    const normalizedX = cssX / canvas.clientWidth;
    const normalizedY = cssY / canvas.clientHeight;

    const clipX = normalizedX * 2 - 1;
    const clipY = normalizedY * -2 + 1;

    return [clipX, clipY];
}

export function clipToCSS(clipX: number, clipY: number, canvas: HTMLCanvasElement): [number, number] {
    const x = (clipX + 1) * 0.5 * canvas.clientWidth;
    const y = (1 - clipY) * 0.5 * canvas.clientHeight;
    return [x, y];
}

// Render: clip = P · V · world
// Picking: world = inverse(P · V) · clip
export function screenToWorld(clientX: number, clientY: number, w: number, h: number, canvas: HTMLCanvasElement, worldMatrix: number[]): [number, number] {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Device pixels relative to canvas
    const x = (clientX - rect.left) * dpr;
    const y = (clientY - rect.top) * dpr;

    const xClip = (x / w) * 2 - 1;
    const yClip = (y / h) * -2 + 1;

    // projection matrix transforms pixel space to clip space
    const proj = m3.projection(w, h);
    // view-projection matrix
    const pv = m3.multiply(proj, worldMatrix); // worldMatrix is view matrix and calculates the matrix to map world-space to clip-space

    // used to unproject and retrieve world coords
    const invPV = m3.inverse(pv);
    const [wx, wy] = m3.transformPoint(invPV, [xClip, yClip]);

    return [wx, wy];
}

export function getWorldCoords(x: number, y: number, canvas: Canvas) {
    return screenToWorld(
        x, 
        y,
        canvas.gl.canvas.width,
        canvas.gl.canvas.height,
        canvas.canvas,
        canvas.worldMatrix,
    );
}

export function applyMatrixToPoint(matrix: number[], x: number, y: number): [number, number] {
    // Assumes 3x3 matrix, point as [x, y, 1]
    return [
        matrix[0] * x + matrix[3] * y + matrix[6],
        matrix[1] * x + matrix[4] * y + matrix[7]
    ];
}

export function getScaleFromMatrix(matrix: number[]): number {
    // For uniform scaling, use sqrt(a^2 + b^2) where a = matrix[0], b = matrix[1]
    return Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1]);
}