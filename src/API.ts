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
}
