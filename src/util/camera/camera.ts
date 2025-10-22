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