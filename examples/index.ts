import { canvasReady, InfiniteCanvasAPI } from '../src';

const API = new InfiniteCanvasAPI();

canvasReady.then(el => {
    const buttons = {
        'mode-button': API.toggleMode,
        'zoom-in-button': API.zoomIn,
        'zoom-out-button': API.zoomOut,
        'export-canvas-button': API.exportCanvas,
        'clear-canvas-button': API.clearCanvas,
    };

    for (const [key, fn] of Object.entries(buttons)) {
        const btn = document.getElementById(key)!;
        btn.onclick = () => fn();
    }

    const hiddenInput = document.getElementById('add-image-input') as HTMLInputElement;
    const triggerBtn = document.getElementById('add-image-btn') as HTMLButtonElement;

    triggerBtn.onclick = () => hiddenInput.click();

    hiddenInput.onchange = async () => {
        if (!hiddenInput.files || hiddenInput.files.length === 0) return;
        await API.addImageFromLocal(hiddenInput.files);
        hiddenInput.value = '';
    };

    const hiddenImportCanvasInput = document.getElementById('import-canvas-input') as HTMLInputElement;
    const triggerImportCanvasBtn = document.getElementById('import-canvas-button') as HTMLButtonElement;

    triggerImportCanvasBtn.onclick = () => hiddenImportCanvasInput.click();

    hiddenImportCanvasInput.onchange = async () => {
        if (
            !hiddenImportCanvasInput.files || 
            hiddenImportCanvasInput.files.length === 0 ||
            hiddenImportCanvasInput.files.length > 1
        ) return;

        await API.importCanvas(hiddenImportCanvasInput.files);
        hiddenInput.value = '';
    };
});