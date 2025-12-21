import { InfiniteCanvasAPI, InfiniteCanvasElement } from "../src";

const el = document.querySelector("#canvas") as InfiniteCanvasElement;
InfiniteCanvasAPI.forElement(el).then((api) => {
  const openMenuBtn = document.getElementById("open-menu");
  const mobileContainer = document.getElementById("mobile-container");

  if (openMenuBtn && mobileContainer) {
    openMenuBtn.addEventListener("click", () => {
      mobileContainer.classList.toggle("is-open");
    });
  }

  const buttons = {
    "mode-button": api.toggleMode.bind(api),
    "mode-button-mob": api.toggleMode.bind(api),
    "zoom-in-button": api.zoomIn.bind(api),
    "zoom-in-button-mob": api.zoomIn.bind(api),
    "zoom-out-button": api.zoomOut.bind(api),
    "zoom-out-button-mob": api.zoomOut.bind(api),
    "export-canvas-button": api.exportCanvas.bind(api),
    "export-canvas-button-mob": api.exportCanvas.bind(api),
    "clear-canvas-button": api.clearCanvas.bind(api),
    "clear-canvas-button-mob": api.clearCanvas.bind(api),
    "center-canvas-button": api.snapToCenter.bind(api),
    "center-canvas-button-mob": api.snapToCenter.bind(api),
  };

  for (const [key, fn] of Object.entries(buttons)) {
    const btn = document.getElementById(key)!;
    if (!key.includes("-mob")) {
      btn.onclick = () => fn();
    } else {
      btn.onclick = () => {
        fn();
        if (mobileContainer) mobileContainer.classList.toggle("is-open");
      };
    }
  }

  const viewportThumbnailButton = document.getElementById(
    "viewport-thumbnail-button",
  ) as HTMLButtonElement;
  viewportThumbnailButton.onclick = async () => {
    const thumbnail = await api.generateViewportThumbnail(500, 200);
    if (thumbnail) api.addImage(thumbnail);
  };

  const contentThumbnailButton = document.getElementById(
    "content-thumbnail-button",
  ) as HTMLButtonElement;
  contentThumbnailButton.onclick = async () => {
    const thumbnail = await api.generateContentThumbnail(1000, 500);
    if (thumbnail) api.addImage(thumbnail);
  };

  const hiddenInput = document.getElementById(
    "add-image-input",
  ) as HTMLInputElement;

  const triggerBtnMob = document.getElementById(
    "add-image-btn-mob",
  ) as HTMLInputElement;

  const triggerBtn = document.getElementById(
    "add-image-btn",
  ) as HTMLButtonElement;

  triggerBtn.onclick = () => hiddenInput.click();
  triggerBtnMob.onclick = () => hiddenInput.click();

  hiddenInput.onchange = async () => {
    if (!hiddenInput.files || hiddenInput.files.length === 0) return;
    await api.addImageFromLocal(hiddenInput.files);
    hiddenInput.value = "";
  };

  const hiddenImportCanvasInput = document.getElementById(
    "import-canvas-input",
  ) as HTMLInputElement;
  const triggerImportCanvasBtn = document.getElementById(
    "import-canvas-button",
  ) as HTMLButtonElement;

  const triggerImportCanvasBtnMob = document.getElementById(
    "import-canvas-button-mob",
  ) as HTMLButtonElement;

  triggerImportCanvasBtn.onclick = () => hiddenImportCanvasInput.click();
  triggerImportCanvasBtnMob.onclick = () => hiddenImportCanvasInput.click();

  hiddenImportCanvasInput.onchange = async () => {
    if (
      !hiddenImportCanvasInput.files ||
      hiddenImportCanvasInput.files.length === 0 ||
      hiddenImportCanvasInput.files.length > 1
    )
      return;

    await api.importCanvas(hiddenImportCanvasInput.files);
    hiddenInput.value = "";
  };

  el.onCanvasChange = () => console.log("data changed");
});
