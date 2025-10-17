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