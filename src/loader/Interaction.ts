import { Loader, LoaderType } from "./Loader";

export function showLoader(type: LoaderType, message?: string) {
  const loader = new Loader({ type, message });
  loader.attachToParent(this.renderRoot as HTMLElement);

  return loader;
}

export function hideLoader() {
  const oldLoader = this.renderRoot.querySelector(".canvas-loader");
  if (oldLoader) {
    oldLoader.remove();
  }
}
