import { ContextMenu, ContextMenuGroupProps, ContextMenuType } from "./ContextMenu";

function withContextMenuClear<T extends (...args: any[]) => any>(fn: T): T {
    const self = this;
    return function(this: any, ...args: Parameters<T>): ReturnType<T> {
        const result = fn.apply(self, args);
        self.clearContextMenu();
        return result;
    } as T;
}

export function addContextMenu(x: number, y: number, type: ContextMenuType = 'single') {
    // Create new menu
    const menu = new ContextMenu(
        type === 'single' ? this.singleImageMenuOptions :
            type === 'multi' ? this.multiImageMenuOptions :
                this.canvasImageMenuOptions
    );
    menu.attachToParent(this.renderRoot as HTMLElement);
    
    // Position the menu
    const hostRect = this.getBoundingClientRect();
    const relX = x - hostRect.left;
    const relY = y - hostRect.top;

    // determine the width and height of the bound rect
    const hostWidth = hostRect.right;
    const hostHeight = hostRect.bottom;
    
    // place the menu according to the four quarters so it is always in view
    const menuRect = menu.el.getBoundingClientRect();
    
    // only flip the position of the menu if leaving it where it would have been, would lead to the menu being out of view
    const direction: number[] = [
        relX + menuRect.width > hostWidth ? 1 : 0,
        relY + menuRect.bottom > hostHeight ? 1 : 0,
    ]

    const menuHeight = menuRect.height * direction[1];
    const menuWidth = menuRect.width * direction[0];

    menu._el.style.left = `${relX - menuWidth}px`;
    menu._el.style.top = `${relY - menuHeight}px`;
}

export function clearContextMenu() {
    const oldMenu = this.renderRoot.querySelector('.context-menu');
    if (this.isContextMenuActive()) oldMenu.remove();
}

export function isContextMenuActive() {
    return this.renderRoot.querySelector('.context-menu') !== null;
}

export function createSingleImageMenuOptions(base?: ContextMenuGroupProps[]) {
    const withClear = withContextMenuClear.bind(this);
    return {
        optionGroups: [
            ...base ?? [],
            {
                childOptions: [
                    {
                        text: "Cut",
                        onClick: async () => {
                            await this.copyImage.bind(this)();
                            withClear(this.deleteSelectedImages.bind(this))();
                        }
                    },
                    {
                        text: "Copy",
                        onClick: withClear(this.copyImage.bind(this))
                    },
                    {
                        text: "Paste",
                        onClick: (e: PointerEvent) => withClear(this.pasteImage.bind(this))(e)
                    },
                    {
                        text: "Delete",
                        onClick: withClear(this.deleteSelectedImages.bind(this))
                    },
                ]
            },
            {
                childOptions: [
                    {
                        text: "Flip Horizontal",
                        onClick: withClear(this.flipHorizontal.bind(this))
                    },
                    {
                        text: "Flip Vertical",
                        onClick: withClear(this.flipVertical.bind(this))
                    },
                ]
            },
        ]
    };
}

export function createMultiImageMenuOptions(base?: ContextMenuGroupProps[]) {
    const withClear = withContextMenuClear.bind(this);
    return {
        optionGroups: [
            ...base ?? [],
            {
                childOptions: [
                    {
                        text: "Align Left",
                        onClick: () => console.log('hey')
                    },
                    {
                        text: "Align Right",
                        onClick: () => console.log('hey')
                    },
                    {
                        text: "Align Top",
                        onClick: () => console.log('hey')
                    },
                    {
                        text: "Align Bottom",
                        onClick: () => console.log('hey')
                    }
                ]
            }
        ]
    }
}

export function createCanvasImageMenuOptions(base?: ContextMenuGroupProps[]) {
    const withClear = withContextMenuClear.bind(this);
    return {
        optionGroups: [
            ...base ?? [],
            {
                childOptions: [
                    {
                        text: 'Change mode',
                        onClick: () => withClear(this.togglePointerMode.bind(this))()
                    },
                    {
                        text: "Toggle Grid",
                        onClick: () => withClear(this.toggleGrid.bind(this))()
                    },
                ]
            },
            {
                childOptions: [
                    {
                        text: 'Save',
                        onClick: () => withClear(this.saveToCanvasStorage.bind(this))()
                    },
                    {
                        text: "Paste",
                        onClick: (e: PointerEvent) => withClear(this.pasteImage.bind(this))(e)
                    },
                ]
            }
        ]
    };
}