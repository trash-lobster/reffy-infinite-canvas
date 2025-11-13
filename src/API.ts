import { InfiniteCanvasElement } from './Component';

function getElement(): InfiniteCanvasElement {
    const el = document.querySelector('infinite-canvas') as InfiniteCanvasElement | null;
    if (!el) throw new Error('infinite-canvas element not found');
    return el;
}

export const canvasReady: Promise<InfiniteCanvasElement> = (async () => {
    await customElements.whenDefined('infinite-canvas');
    const el = getElement();
    if ((el as any).engine) return el;
    return new Promise<InfiniteCanvasElement>(res =>
        el.addEventListener('load', () => res(el), { once: true })
    );
})();

export class InfiniteCanvasAPI {
    async zoomIn() {
		const el = await canvasReady;
		el.zoomIn();
    }

    async zoomOut() {
		const el = await canvasReady;
		el.zoomOut();
    }
    
    async toggleMode() {
		const el = await canvasReady;
		el.toggleMode();
    }

    async addImageFromLocal(fileList: FileList) {
		// Validate all files are images before proceeding
		if (!fileList || fileList.length === 0) return;
		for (let i = 0; i < fileList.length; i++) {
			const file = fileList[i];
			if (!file || !file.type || !file.type.startsWith('image/')) {
				throw new Error('Only image files are supported. Please select image files only.');
			}
		}

		const el = await canvasReady;
		await el.addImages(fileList);
    }

	async exportCanvas(filename?: string) {
		const el = await canvasReady;
		el.exportCanvas(filename);
	}

	async importCanvas(fileList: FileList) {
		if (!fileList || fileList.length !== 1) return;
		const el = await canvasReady;
		await el.importCanvas(fileList);
	}
}
