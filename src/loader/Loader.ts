export type LoaderType = 'spinner' | 'message';

export type LoaderProps = {
    type: LoaderType;
    message?: string;
};

export class Loader {
    _el: HTMLDivElement;
    type: LoaderType;
    message?: string;
    progress?: number;

    get el() { return this._el; }

    constructor(props: LoaderProps) {
        this.type = props.type;
        this.message = props.message;

        this._el = document.createElement('div');
        this._el.classList.add('canvas-loader');

        this.render();
    }

    private render() {
        this._el.innerHTML = '';

        if (this.type === 'spinner') {
            const spinner = document.createElement('div');
            spinner.classList.add('canvas-loader-spinner');
            this._el.appendChild(spinner);
            if (this.message) {
                const msg = document.createElement('div');
                msg.classList.add('canvas-loader-message');
                msg.textContent = this.message;
                this._el.appendChild(msg);
            }
        } else if (this.type === 'message') {
            const msg = document.createElement('div');
            msg.classList.add('canvas-loader-message');
            msg.textContent = this.message ?? '';
            this._el.appendChild(msg);
        }
    }

    setMessage(message: string) {
        this.message = message;
        this.render();
    }

    setProgress(progress: number) {
        this.progress = progress;
        this.render();
    }

    attachToParent(parent: Node) {
        parent.appendChild(this.el);
    }

    remove() {
        if (this._el.parentNode) {
            this._el.parentNode.removeChild(this._el);
        }
    }
}