import { InfiniteCanvasAPI, InfiniteCanvasElement } from '../src';

const el = document.querySelector('#canvas') as InfiniteCanvasElement;
InfiniteCanvasAPI.forElement(el).then(api => {
    const buttons = {
        'mode-button': api.toggleMode.bind(api),
        'zoom-in-button': api.zoomIn.bind(api),
        'zoom-out-button': api.zoomOut.bind(api),
        'export-canvas-button': api.exportCanvas.bind(api),
        'clear-canvas-button': api.clearCanvas.bind(api),
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
        await api.addImageFromLocal(hiddenInput.files);
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
    
        await api.importCanvas(hiddenImportCanvasInput.files);
        hiddenInput.value = '';
    };
})
