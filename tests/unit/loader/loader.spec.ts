import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestDiv, makeHost } from './functions';
import { showLoader } from '../../../src/loader/Interaction';

describe('loader component', () => {
    let host : TestDiv;

    beforeEach(() => {
        document.body.innerHTML = '';
        host = makeHost();
    });
    
    it('sets message', () => {
        const loader = showLoader.call(host, 'message', 'Loading...');

        const el = host.renderRoot.querySelector('.canvas-loader') as HTMLElement;
		expect(el).toBeTruthy();

        loader.setMessage('test message');

        const message = el.querySelector('.canvas-loader-message') as HTMLDivElement;
        expect(message.parentElement).toBe(el);
        expect(message.textContent).toBe('test message');
    })

    it('sets progress', () => {
        const loader = showLoader.call(host, 'message', 'Loading...');

        const el = host.renderRoot.querySelector('.canvas-loader') as HTMLElement;
		expect(el).toBeTruthy();

        loader.setProgress(100);

        expect(loader.progress).toBe(100);
    })

    it ('removes element from parent', () => {
        const loader = showLoader.call(host, 'message', 'Loading...');
        expect(host.renderRoot.children.length).toBe(1);

        const el = host.renderRoot.querySelector('.canvas-loader') as HTMLElement;
		expect(el).toBeTruthy();

        loader.remove();

        expect(host.renderRoot.children.length).toBe(0);
    })

    it ('won\'t remove parent if there is no parent node', () => {
        const loader = showLoader.call(host, 'message', 'Loading...');
        expect(host.renderRoot.children.length).toBe(1);

        const el = host.renderRoot.querySelector('.canvas-loader') as HTMLElement;
		expect(el).toBeTruthy();

        host.renderRoot.removeChild(el);

        loader.remove();

        expect(host.renderRoot.children.length).toBe(0);
    })
});