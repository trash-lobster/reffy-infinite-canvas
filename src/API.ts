import { CanvasStorage } from "./storage";
import { InfiniteCanvasElement } from "./Component";

export class InfiniteCanvasAPI {
  private el: InfiniteCanvasElement;

  constructor(el: InfiniteCanvasElement) {
    if (!el) throw new Error("InfiniteCanvasElement is required");
    this.el = el;

    this.assignCanvasStorage = this.assignCanvasStorage.bind(this);
    this.zoomIn = this.zoomIn.bind(this);
    this.zoomOut = this.zoomOut.bind(this);
    this.toggleMode = this.toggleMode.bind(this);
    this.addImageFromLocal = this.addImageFromLocal.bind(this);
    this.exportCanvas = this.exportCanvas.bind(this);
    this.importCanvas = this.importCanvas.bind(this);
    this.clearCanvas = this.clearCanvas.bind(this);
  }

  static async forElement(
    selectorOrElement: string | InfiniteCanvasElement,
  ): Promise<InfiniteCanvasAPI> {
    let el: InfiniteCanvasElement | null;
    if (typeof selectorOrElement === "string") {
      await customElements.whenDefined("infinite-canvas");
      el = document.querySelector(
        selectorOrElement,
      ) as InfiniteCanvasElement | null;
    } else {
      el = selectorOrElement;
    }
    if (!el) throw new Error("infinite-canvas element not found");
    if (!el.isCanvasReady()) {
      await new Promise<void>((res) =>
        el.addEventListener("load", () => res(), { once: true }),
      );
    }
    return new InfiniteCanvasAPI(el);
  }

  /**
   * Without assigning storage, the canvas will not save any data
   * @param storage
   * @param saveFrequency How often auto save occurs in ms
   */
  assignCanvasStorage(storage: CanvasStorage, saveFrequency: number = 3000) {
    this.el.assignCanvasStorage(storage, saveFrequency);
    return this;
  }

  async zoomIn() {
    console.log("zooming");
    this.el.zoomIn();
  }

  async zoomOut() {
    this.el.zoomOut();
  }

  async toggleMode() {
    this.el.togglePointerMode();
  }

  snapToCenter() {
    this.el.snapToCenter();
  }

  async addImageFromLocal(fileList: FileList) {
    // Validate all files are images before proceeding
    if (!fileList || fileList.length === 0) return;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file || !file.type || !file.type.startsWith("image/")) {
        throw new Error(
          "Only specific image files are supported. Please select image files only.",
        );
      }
    }

    await this.el.addImages(fileList);
  }

  async exportCanvas(filename?: string) {
    this.el.exportCanvas(filename);
  }

  async importCanvas(fileList: FileList) {
    if (!fileList || fileList.length !== 1) return;
    await this.el.importCanvas(fileList);
  }

  async clearCanvas() {
    this.el.clearCanvas();
  }

  async generateViewportThumbnail(width: number, height: number) {
    return await this.el.generateViewportThumbnail(width, height);
  }

  async generateContentThumbnail(width?: number, height?: number) {    
    return await this.el.generateContentThumbnail(width, height);
  }

  async addImage(src: string) {
    return await this.el.addImageFromUrl(src);
  }
}
