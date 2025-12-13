export interface TestDiv {
  renderRoot: HTMLDivElement;
  getBoundingClientRect: () => {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    x: number;
    y: number;
    toJSON(): {};
  };
}

export function makeHost(width = 320, height = 240) {
  const renderRoot = document.createElement("div");
  renderRoot.className = "host-root";
  document.body.appendChild(renderRoot);

  const host: TestDiv = {
    renderRoot,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      x: 0,
      y: 0,
      toJSON() {
        return {};
      },
    }),
  };
  return host;
}
