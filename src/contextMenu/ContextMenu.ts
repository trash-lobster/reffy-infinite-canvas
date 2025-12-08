// a style for the context menu should be set at the top level context menu and it should trickle down or looked up recurisvely?

export type ContextMenuType = 'single' | 'multi' | 'canvas';

type ContextMenuElCoreOption = {
    text: string;
    parent?: ContextMenuGroup;
    style?: CSSStyleDeclaration;
    subMenu?: ContextMenuProps;
}

type ContextMenuElOption = 
    ( ContextMenuElCoreOption &  { 
        onClick?: (e?: MouseEvent) => void,
        onHover?: (e?: MouseEvent) => void,
    } ) | 
    ( ContextMenuElCoreOption &  { childOptions: ContextMenuElOption[] } )

export type ContextMenuProps = {
    options: ContextMenuGroupProps[];
}

export type ContextMenuGroupProps = {
    childOptions: ContextMenuElOption[];
}

/**
 * When a context menu is opened, its children are displayed
 */
export class ContextMenu {
    _el: HTMLDivElement;
    options: ContextMenuGroup[] = [];
    rootNode: DocumentFragment | HTMLElement;

    get el() { return this._el; }

    constructor(option: ContextMenuProps, rootNode: DocumentFragment | HTMLElement) {
        this.rootNode = rootNode;
        this._el = document.createElement('div');
        this._el.classList.add('context-menu');

        option.options.forEach((o, idx) => {
            this.createOptionGroup(o);
            if (idx !== option.options.length - 1) {
                this.addDivider();
            }
        });

        this._el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    attachToParent(parent: Node) {
        parent.appendChild(this.el);
    }

    private createOptionGroup(option: ContextMenuGroupProps) {
        const element = new ContextMenuGroup(option, this.rootNode);
        this.options.push(element);
        this.el.appendChild(element.el);
    }

    private addDivider() {
        // const divider = document.createElement('div');
        const divider = document.createElement('hr');
        divider.classList.add('context-menu-divider');
        this.el.appendChild(divider);
    }
}

export class ContextMenuGroup {
    _el: HTMLDivElement;
    childOptions: ContextMenuElement[] = [];
    rootNode: DocumentFragment | HTMLElement;

    get el() { return this._el; }

    constructor(option: ContextMenuGroupProps, rootNode: DocumentFragment | HTMLElement) {
        this.rootNode = rootNode;
        this._el = document.createElement('div');        
        this.createOptionElement = this.createOptionElement.bind(this);

        option.childOptions.forEach(o => this.createOptionElement(o));
    }

    attachToParent(parent: Node) {
        parent.appendChild(this.el);
    }

    private createOptionElement(option: ContextMenuElOption) {
        option.parent = this;
        const element = new ContextMenuElement(option, this.rootNode);
        this.childOptions.push(element);
    }
}

/**
 * An element MAY have a submenu that will open up if they are selected (we will consider this in the future)
 * Otherwise, trigger the onclick function instead.
 * In its construction, either a sub menu has to be passed or an onclick must be added 
 */
export class ContextMenuElement {
    displayText: string;
    _el: HTMLButtonElement;
    parent: ContextMenuGroup;
    subMenu?: ContextMenu;
    rootNode: DocumentFragment | HTMLElement;

    get el() { return this._el; }

    constructor(option: ContextMenuElOption, rootNode: DocumentFragment | HTMLElement) {
        this.displayText = option.text;
        this.rootNode = rootNode;
        this.parent = option.parent;
        this._el = document.createElement('button');
        this._el.textContent = option.text;
        this._el.classList.add('context-menu-option');
        
        this.parent.el.appendChild(this._el);

        if ('onClick' in option) {
            this._el.addEventListener('click', option.onClick);
        }

        this._el.addEventListener('pointerenter',
            (e: PointerEvent) => onpointerenter(e, option, this._el, this.rootNode)
        );

        this._el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
}

function onpointerenter(
    e: PointerEvent, 
    parentOption: ContextMenuElOption, 
    parentEl: Node, 
    rootNode: DocumentFragment | HTMLElement,
) {
    if (!rootNode) return;
    const oldMenu = rootNode.querySelector('.sub-context-menu');
    if (oldMenu) oldMenu.remove();

    if (parentOption.subMenu) {
        const newMenu = new ContextMenu(parentOption.subMenu, this);
        rootNode.appendChild(newMenu.el);
        
        newMenu.el.id = `${parentOption.text}-context-menu`;
        newMenu.el.classList.add('sub-context-menu');
        
        // calculate proper position
        const hostRect = (rootNode as any).getBoundingClientRect();
        const parentBoundingBox = (parentEl as HTMLDivElement).getBoundingClientRect();
        const menuRect = newMenu.el.getBoundingClientRect();
        
        const hostWidth = hostRect.right - hostRect.left;
        const hostHeight = hostRect.bottom - hostRect.top;
        
        const menuWidth = parentBoundingBox.right + menuRect.width;
        const menuHeight = parentBoundingBox.top + menuRect.height;

        if (menuHeight > hostHeight) {
            newMenu._el.style.top = `${parentBoundingBox.bottom - menuRect.height}px`;
        } else {
            newMenu._el.style.top = `${parentBoundingBox.top}px`;
        }

        if (menuWidth > hostWidth) {
            newMenu._el.style.left = `${parentBoundingBox.left - menuRect.width}px`;
        } else {
            newMenu._el.style.left = `${parentBoundingBox.right}px`;
        }
    }
}