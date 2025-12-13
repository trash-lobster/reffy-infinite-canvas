import { Canvas } from "Canvas";
import { m3 } from "../webgl/m3";

export function getClipSpaceMousePosition(
  e: MouseEvent,
  canvas: HTMLCanvasElement,
) {
  const rect = canvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const cssY = e.clientY - rect.top;

  const normalizedX = cssX / canvas.clientWidth;
  const normalizedY = cssY / canvas.clientHeight;

  const clipX = normalizedX * 2 - 1;
  const clipY = normalizedY * -2 + 1;

  return [clipX, clipY];
}

export function clipToCSS(
  clipX: number,
  clipY: number,
  canvas: HTMLCanvasElement,
): [number, number] {
  const x = (clipX + 1) * 0.5 * canvas.clientWidth;
  const y = (1 - clipY) * 0.5 * canvas.clientHeight;
  return [x, y];
}

// Render: clip = P · V · world
// Picking: world = inverse(P · V) · clip
export function screenToWorld(
  clientX: number,
  clientY: number,
  w: number,
  h: number,
  canvas: HTMLCanvasElement,
  worldMatrix: number[],
): [number, number] {
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
  const { gl, canvas: innerCanvas } = canvas;
  return screenToWorld(
    x,
    y,
    gl.canvas.width,
    gl.canvas.height,
    innerCanvas,
    canvas.worldMatrix,
  );
}

/**
 * Transforms a point from world space to camera (view) space.
 * @param worldX X coordinate in world space
 * @param worldY Y coordinate in world space
 * @param cameraMatrix The camera/view matrix (usually canvas.worldMatrix)
 * @returns [cameraX, cameraY]
 */
export function worldToCamera(
  worldX: number,
  worldY: number,
  cameraMatrix: number[],
): number[] {
  // The camera matrix maps camera space to world space, so invert it
  const invCamera = m3.inverse(cameraMatrix);
  return m3.transformPoint(invCamera, [worldX, worldY]);
}

export function applyMatrixToPoint(
  matrix: number[],
  x?: number,
  y?: number,
): [number, number] {
  const px = x ?? 0;
  const py = y ?? 0;
  return [
    matrix[0] * px + matrix[3] * py + matrix[6],
    matrix[1] * px + matrix[4] * py + matrix[7],
  ];
}

export function getScaleXFromMatrix(matrix: number[]): number {
  return Math.hypot(matrix[0], matrix[1]);
}

export function getScaleYFromMatrix(matrix: number[]): number {
  return Math.hypot(matrix[3], matrix[4]);
}

export function getScalesFromMatrix(matrix: number[]): [number, number] {
  return [getScaleXFromMatrix(matrix), getScaleYFromMatrix(matrix)];
}

function isPositive(num: number) {
  return num / Math.abs(num);
}

export function isScalePositive(matrix: number[]): number[] {
  return [isPositive(matrix[0]), isPositive(matrix[4])];
}
