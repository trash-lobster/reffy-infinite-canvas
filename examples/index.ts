import { InfiniteCanvasElement } from '../src/CanvasComponent';

export * from '../src/CanvasComponent';

window.addEventListener('DOMContentLoaded', () => {
    const el = document.querySelector('infinite-canvas') as InfiniteCanvasElement;
    
    const buttons = {
        'mode-button': () => (el as any).toggleMode(),
        'zoom-in-button': () => (el as any).zoomIn(),
        'zoom-out-button': () => (el as any).zoomOut(),
        'add-image-button': () => console.log('add image')
    };

    for (const [key, fn] of Object.entries(buttons)) {
        const btn = document.getElementById(key)!;
        btn.addEventListener('click', fn);
    }
});
