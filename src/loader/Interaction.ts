import { Loader, LoaderType } from "./Loader";

export function showLoader(
    type: LoaderType, 
    message?: string
) {
    const loader = new Loader({ type, message });
    loader.attachToParent(this.renderRoot as HTMLElement);

    const hostRect = this.getBoundingClientRect();
    loader.el.style.width = `${hostRect.right}px`;
    loader.el.style.height = `${hostRect.bottom}px`;
    loader._el.style.top = `${-hostRect.bottom}px`;

    return loader;
}

export function hideLoader() {
    const oldLoader = this.renderRoot.querySelector('.canvas-loader');
    if (oldLoader) {
        oldLoader.remove();
    }
}