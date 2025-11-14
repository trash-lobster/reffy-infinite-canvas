// a style for the context menu should be set at the top level context menu and it should trickle down or looked up recurisvely?

type ContextMenuElCoreOption = {
    text: string;
    parent?: ContextMenu;
    style?: CSSStyleDeclaration;
}

type ContextMenuElOption = 
    ( ContextMenuElCoreOption &  { onClick?: (e: MouseEvent) => void } ) | 
    ( ContextMenuElCoreOption &  { childOptions: ContextMenuElOption[] } )

export type ContextMenuOption = {
    parent?: ContextMenuElement;
    childrenOption: ContextMenuElOption[];
}

/**
 * When a context menu is opened, its children are displayed
 */
export class ContextMenu {
    _el: HTMLDivElement;
    parent?: ContextMenuElement;
    options: ContextMenuElement[] = [];

    get el() { return this._el; }

    constructor(option: ContextMenuOption) {
        this._el = document.createElement('div');
        this._el.style.position = 'absolute';
        this._el.style.zIndex = '2';
        this.createOptionElement = this.createOptionElement.bind(this);

        option.childrenOption.forEach(o => this.createOptionElement(o));

        if ('parent' in option) {
            this.parent = option.parent;
            this.parent.el.appendChild(this._el);
        }
        
        this._el.onclick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('click');
        }
    }

    attachToParent(parent: Node) {
        parent.appendChild(this.el);
    }

    private createOptionElement(option: ContextMenuElOption) {
        option.parent = this;
        const element = new ContextMenuElement(option);
        this.options.push(element);
    }
}

/**
 * An element MAY have a submenu that will open up if they are selected
 * Otherwise, trigger the onclick function instead.
 * In its construction, either a sub menu has to be passed or an onclick must be added 
 */
export class ContextMenuElement {
    displayText: string;
    el: HTMLButtonElement;
    onClick?: (e: MouseEvent) => void;
    parent: ContextMenu;
    subMenu?: ContextMenu;

    constructor(option: ContextMenuElOption) {
        this.parent = option.parent;
        this.el = document.createElement('button');
        this.el.textContent = option.text;
        // if ('style' in option) {
        //     this.el.style;
        // }

        if ('onClick' in option) {
            this.onClick = (e: MouseEvent) => {
                e.preventDefault();
                option.onClick(e);
            };
        }
        if ('childOptions' in option) {
            this.subMenu = new ContextMenu({
                childrenOption: option.childOptions,
                parent: this,
            })
        }

        // attach style

        this.parent.el.appendChild(this.el);
    }
}