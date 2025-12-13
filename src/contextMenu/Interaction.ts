import { ContextMenuEvent } from "../util";
import {
  ContextMenu,
  ContextMenuGroupProps,
  ContextMenuType,
} from "./ContextMenu";

const PADDING = 5;

function withContextMenuClear<T extends (...args: any[]) => any>(fn: T): T {
  const self = this;
  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const result = fn.apply(self, args);
    self.clearContextMenu();
    return result;
  } as T;
}

export function addContextMenu(
  x: number,
  y: number,
  type: ContextMenuType = "single",
) {
  // Create new menu
  const menu = new ContextMenu(
    type === "single"
      ? this.singleImageMenuOptions
      : type === "multi"
        ? this.multiImageMenuOptions
        : this.canvasImageMenuOptions,
    this.rootDiv,
  );
  if (!this.rootDiv) {
    console.error("Can't add to parent div");
    return;
  }

  menu.attachToParent(this.rootDiv as HTMLElement);

  // Position the menu
  const hostRect = this.getBoundingClientRect();

  const relX = x - hostRect.left; // relative x to the client
  const relY = y - hostRect.top; // relative y to the client

  // determine the width and height of the bound rect
  const hostWidth = hostRect.right - hostRect.left;
  const hostHeight = hostRect.bottom - hostRect.top;
  // place the menu according to the four quarters so it is always in view
  const menuRect = menu.el.getBoundingClientRect();

  // only flip the position of the menu if leaving it where it would have been, would lead to the menu being out of view
  const direction: number[] = [
    relX + menuRect.width > hostWidth ? 1 : 0,
    relY + menuRect.height > hostHeight ? 1 : 0,
  ];

  const menuHeight = menuRect.height * direction[1];
  const menuWidth = menuRect.width * direction[0];

  if (menuHeight > hostHeight) {
    const newHeight = hostHeight - 2 * PADDING;
    menu._el.style.height = `${newHeight}px`;
    menu._el.style.top = `${PADDING}px`;
  } else {
    menu._el.style.top = `${relY - menuHeight}px`;
  }

  if (menuWidth > hostWidth) {
    menu._el.style.width = `${hostWidth - 2 * PADDING}px`;
    menu._el.style.left = `${PADDING}px`;
  } else {
    menu._el.style.left = `${relX - menuWidth}px`;
  }
}

export function clearContextMenu() {
  const oldMenu = this.renderRoot.querySelector(".context-menu");
  if (oldMenu) {
    oldMenu.remove();
    this.eventHub.emit(ContextMenuEvent.Close);
  }
}

export function isContextMenuActive() {
  return this.renderRoot.querySelector(".context-menu") !== null;
}

export function createBasicImageMenuOptions() {
  const withClear = withContextMenuClear.bind(this);
  return {
    options: [
      {
        childOptions: [
          {
            text: "Cut",
            onClick: async () => {
              await this.copyImage.bind(this)();
              withClear(this.deleteSelectedImages.bind(this))();
            },
          },
          {
            text: "Copy",
            onClick: withClear(this.copyImage.bind(this)),
          },
          {
            text: "Paste",
            onClick: (e: PointerEvent) =>
              withClear(this.pasteImage.bind(this))(e),
          },
          {
            text: "Delete",
            onClick: withClear(this.deleteSelectedImages.bind(this)),
          },
        ],
      },
      {
        childOptions: [
          {
            text: "Flip Horizontal",
            onClick: withClear(this.flipHorizontal.bind(this)),
          },
          {
            text: "Flip Vertical",
            onClick: withClear(this.flipVertical.bind(this)),
          },
        ],
      },
    ],
  };
}

export function createSingleImageMenuOptions(base?: ContextMenuGroupProps[]) {
  const withClear = withContextMenuClear.bind(this);
  return {
    options: [
      ...(base ?? []),
      {
        childOptions: [
          {
            text: "Send to Front",
            onClick: () =>
              withClear(this.sendShapeToNewZOrder.bind(this))(true),
          },
          {
            text: "Send to Back",
            onClick: () =>
              withClear(this.sendShapeToNewZOrder.bind(this))(false),
          },
        ],
      },
    ],
  };
}

export function createMultiImageMenuOptions(base?: ContextMenuGroupProps[]) {
  const withClear = withContextMenuClear.bind(this);
  return {
    options: [
      ...(base ?? []),
      {
        childOptions: [
          {
            text: "Align",
            onHover: () => {},
            subMenu: {
              options: [
                {
                  childOptions: [
                    {
                      text: "Align Left",
                      onClick: () => withClear(this.align.bind(this))("left"),
                    },
                    {
                      text: "Align Right",
                      onClick: () => withClear(this.align.bind(this))("right"),
                    },
                    {
                      text: "Align Top",
                      onClick: () => withClear(this.align.bind(this))("top"),
                    },
                    {
                      text: "Align Bottom",
                      onClick: () => withClear(this.align.bind(this))("bottom"),
                    },
                  ],
                },
              ],
            },
          },
          {
            text: "Normalize by First",
            onHover: () => {},
            subMenu: {
              options: [
                {
                  childOptions: [
                    {
                      text: "Height",
                      onClick: () =>
                        withClear(this.normalizeSelection.bind(this))(
                          "height",
                          "first",
                        ),
                    },
                    {
                      text: "Width",
                      onClick: () =>
                        withClear(this.normalizeSelection.bind(this))(
                          "width",
                          "first",
                        ),
                    },
                    {
                      text: "Size",
                      onClick: () =>
                        withClear(this.normalizeSelection.bind(this))(
                          "size",
                          "first",
                        ),
                    },
                    {
                      text: "Scale",
                      onClick: () =>
                        withClear(this.normalizeSelection.bind(this))(
                          "scale",
                          "first",
                        ),
                    },
                  ],
                },
              ],
            },
          },
          {
            text: "Normalize by Average",
            onHover: () => {},
            subMenu: {
              options: [
                {
                  childOptions: [
                    {
                      text: "Height",
                      onClick: () =>
                        withClear(this.normalizeSelection.bind(this))(
                          "height",
                          "average",
                        ),
                    },
                    {
                      text: "Width",
                      onClick: () =>
                        withClear(this.normalizeSelection.bind(this))(
                          "width",
                          "average",
                        ),
                    },
                    {
                      text: "Size",
                      onClick: () =>
                        withClear(this.normalizeSelection.bind(this))(
                          "size",
                          "average",
                        ),
                    },
                    {
                      text: "Scale",
                      onClick: () =>
                        withClear(this.normalizeSelection.bind(this))(
                          "scale",
                          "average",
                        ),
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

export function createCanvasImageMenuOptions(base?: ContextMenuGroupProps[]) {
  const withClear = withContextMenuClear.bind(this);
  return {
    options: [
      ...(base ?? []),
      {
        childOptions: [
          {
            text: "Change mode",
            onClick: () => withClear(this.togglePointerMode.bind(this))(),
          },
          {
            text: "Toggle Grid",
            onClick: () => withClear(this.toggleGrid.bind(this))(),
          },
        ],
      },
      {
        childOptions: [
          {
            text: "Save",
            onClick: () => withClear(this.saveToCanvasStorage.bind(this))(),
          },
          {
            text: "Paste",
            onClick: (e: PointerEvent) =>
              withClear(this.pasteImage.bind(this))(e),
          },
        ],
      },
    ],
  };
}
