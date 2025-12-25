import {
  CanvasStorage,
  CanvasStorageEntry,
  DefaultCanvasStorage,
  DefaultFileStorage,
  FileDeletionResult,
  FileStorage,
} from "./storage";
import { InfiniteCanvasElement } from "./Component";
import { SerializedCanvas } from "serializer";

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
    this.snapToCenter = this.snapToCenter.bind(this);
    this.addImage = this.addImage.bind(this);
    this.generateContentThumbnail = this.generateContentThumbnail.bind(this);
    this.generateViewportThumbnail = this.generateViewportThumbnail.bind(this);
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

  static async getAllCanvasNames(canvasStorage?: CanvasStorage) {
    const storage = canvasStorage ?? new DefaultCanvasStorage();
    const data = await storage.readAll();
    return data.map((d) => d.id);
  }

  static async getAllCanvasData(
    canvasStorage?: CanvasStorage,
  ): Promise<CanvasStorageEntry[]> {
    const storage = canvasStorage ?? new DefaultCanvasStorage();
    const data = await storage.readAll();
    return data.map((d) => {
      return {
        name: d.id,
        ...(JSON.parse(d.content) as SerializedCanvas),
      };
    });
  }

  /**
   * Writes an empty entry to the database
   */
  static async registerCanvas(id: string, canvasStorage?: CanvasStorage) {
    const storage: CanvasStorage = canvasStorage ?? new DefaultCanvasStorage();
    return await storage.write({
      name: id,
      version: 1,
      canvas: null,
      camera: null,
      root: null,
      files: [],
      lastRetrieved: Date.now(),
    });
  }

  /**
   * This is a long process that reviews and cleans up the file storage.
   * Only cleans the file storage in IndexedDB.
   * Since the storage uses a queuing system, there is no risk of accidentally deleting new entries.
   * However, please account for the noticeable delay that will incur when your file storage gets too big.
   * Failed deletion does not interupt the deletion
   * @returns {Promise<FileDeletionResult>} The result of the deletion. Check for the ok status and error to see if deletion succeeded or not.
   */
  static async clearFileDataInIDB(): Promise<FileDeletionResult[]> {
    const fileDb = new DefaultFileStorage();
    const canvasDb = new DefaultCanvasStorage();
    const filesInUse = await canvasDb.getAllUsedImagesId();
    return await fileDb.removeUnusedImages(filesInUse);
  }

  /**
   * Without assigning storage, the canvas will write to indexDB
   * @param storage
   * @param saveFrequency How often auto save occurs in ms
   */
  assignCanvasStorage(storage: CanvasStorage, saveFrequency: number = 3000) {
    this.el.assignCanvasStorage(storage, saveFrequency);
    return this;
  }

  assignFileStorage(storage: FileStorage) {
    this.el.assignFileStorage(storage);
    return this;
  }

  async zoomIn() {
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
