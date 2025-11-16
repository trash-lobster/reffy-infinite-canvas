// a style for the context menu should be set at the top level context menu and it should trickle down or looked up recurisvely?

export type ContextMenuType = 'single' | 'multi' | 'canvas';

type ContextMenuElCoreOption = {
    text: string;
    parent?: ContextMenuGroup;
    style?: CSSStyleDeclaration;
}

type ContextMenuElOption = 
    ( ContextMenuElCoreOption &  { onClick?: (e?: MouseEvent) => void } ) | 
    ( ContextMenuElCoreOption &  { childOptions: ContextMenuElOption[] } )

export type ContextMenuProps = {
    optionGroups: ContextMenuGroupProps[];
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

    get el() { return this._el; }

    constructor(option: ContextMenuProps) {
        this._el = document.createElement('div');

        option.optionGroups.forEach((o, idx) => {
            this.createOptionGroup(o);
            if (idx !== option.optionGroups.length - 1) {
                this.addDivider();
            }
        });
    }

    attachToParent(parent: Node) {
        parent.appendChild(this.el);
    }

    private createOptionGroup(option: ContextMenuGroupProps) {
        const element = new ContextMenuGroup(option);
        this.options.push(element);
        this.el.appendChild(element.el);
    }

    private addDivider() {
        const divider = document.createElement('div');
        divider.classList.add('context-menu-divider');
        this.el.appendChild(divider);
    }
}

export class ContextMenuGroup {
    _el: HTMLDivElement;
    childOptions: ContextMenuElement[] = [];

    get el() { return this._el; }

    constructor(option: ContextMenuGroupProps) {
        this._el = document.createElement('div');
        this.createOptionElement = this.createOptionElement.bind(this);

        option.childOptions.forEach(o => this.createOptionElement(o));
    }

    attachToParent(parent: Node) {
        parent.appendChild(this.el);
    }

    private createOptionElement(option: ContextMenuElOption) {
        option.parent = this;
        const element = new ContextMenuElement(option);
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
    el: HTMLButtonElement;
    parent: ContextMenuGroup;
    subMenu?: ContextMenu;

    constructor(option: ContextMenuElOption) {
        this.parent = option.parent;
        this.el = document.createElement('button');
        this.el.textContent = option.text;
        
        this.parent.el.appendChild(this.el);
        this.attachEventListener = this.attachEventListener.bind(this);
        this.detachEventListener = this.detachEventListener.bind(this);

        if ('onClick' in option) {
            this.attachEventListener('click', option.onClick);
        }
    }

    attachEventListener(type: string, event: (e: PointerEvent) => void) {
        this.el.addEventListener(type, event);
    }

    detachEventListener(type: string, event: (e: PointerEvent) => void) {
        this.el.removeEventListener(type, event);
    }
}