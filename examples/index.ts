import { canvasReady, InfiniteCanvasAPI } from '../src';

const API = new InfiniteCanvasAPI();

canvasReady.then(el => {
    const buttons = {
        'mode-button': API.toggleMode,
        'zoom-in-button': API.zoomIn,
        'zoom-out-button': API.zoomOut,
        'add-image-button': () => console.log('add image')
    };

    for (const [key, fn] of Object.entries(buttons)) {
        const btn = document.getElementById(key)!;
        btn.onclick = () => fn();
    }
});