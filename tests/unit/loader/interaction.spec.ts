import { describe, it, expect, beforeEach } from 'vitest';
import { showLoader, hideLoader } from '../../../src/loader/Interaction';
import { TestDiv, makeHost } from './functions';

describe('loader/Interaction', () => {
	let host : TestDiv;

	beforeEach(() => {
		document.body.innerHTML = '';
		host = makeHost();
	});

	it('showLoader attaches a message loader element with correct dimensions', () => {
		showLoader.call(host, 'message', 'Loading...');

		const el = host.renderRoot.querySelector('.canvas-loader') as HTMLElement;
		expect(el).toBeTruthy();

		// Outer element size should reflect hostRect right/bottom
		expect(el.style.width).toBe('320px');
		expect(el.style.height).toBe('240px');

		// Inner element top should be negative bottom
		const inner = el.querySelector('.canvas-loader__inner') as HTMLElement | null;
		if (inner) {
			expect(inner.style.top).toBe('-240px');
		} else {
			// Fallback to private _el if inner is not exposed via class
			const anyEl = el as any;
			if (anyEl._el) {
				expect(anyEl._el.style.top).toBe('-240px');
			}
		}
	});

    it('showLoader attaches a loader element with correct dimensions', () => {
		showLoader.call(host, 'spinner', 'Loading...');

		const el = host.renderRoot.querySelector('.canvas-loader') as HTMLElement;
		expect(el).toBeTruthy();

		// Outer element size should reflect hostRect right/bottom
		expect(el.style.width).toBe('320px');
		expect(el.style.height).toBe('240px');

		// Inner element top should be negative bottom
		const inner = el.querySelector('.canvas-loader__inner') as HTMLElement | null;
		if (inner) {
			expect(inner.style.top).toBe('-240px');
		} else {
			// Fallback to private _el if inner is not exposed via class
			const anyEl = el as any;
			if (anyEl._el) {
				expect(anyEl._el.style.top).toBe('-240px');
			}
		}

        const message = el.querySelector('.canvas-loader-message') as HTMLDivElement;
        expect(message.parentElement).toBe(el);
	});

    it('renders a loader with empty message if no message is passed in', () => {
		showLoader.call(host, 'message', '');

		const el = host.renderRoot.querySelector('.canvas-loader') as HTMLElement;
		expect(el).toBeTruthy();

		// Outer element size should reflect hostRect right/bottom
		expect(el.style.width).toBe('320px');
		expect(el.style.height).toBe('240px');

		// Inner element top should be negative bottom
		const inner = el.querySelector('.canvas-loader__inner') as HTMLElement | null;
		if (inner) {
			expect(inner.style.top).toBe('-240px');
		} else {
			// Fallback to private _el if inner is not exposed via class
			const anyEl = el as any;
			if (anyEl._el) {
				expect(anyEl._el.style.top).toBe('-240px');
			}
		}

        const message = el.querySelector('.canvas-loader-message') as HTMLDivElement;
        expect(message.parentElement).toBe(el);
        expect(message.textContent).toBe('');
	});

	it('hideLoader removes an existing message loader', () => {
		showLoader.call(host, 'message');
		let el = host.renderRoot.querySelector('.canvas-loader');
		expect(el).toBeTruthy();

		hideLoader.call(host);
		el = host.renderRoot.querySelector('.canvas-loader');
		expect(el).toBeNull();
	});

    it('hideLoader removes an existing spinner loader', () => {
		showLoader.call(host, 'spinner');
		let el = host.renderRoot.querySelector('.canvas-loader');
		expect(el).toBeTruthy();

		hideLoader.call(host);
		el = host.renderRoot.querySelector('.canvas-loader');
		expect(el).toBeNull();
	});

	it('hideLoader is safe when no loader exists', () => {
		// No loader attached yet
		hideLoader.call(host);
		// Still no loader
		const el = host.renderRoot.querySelector('.canvas-loader');
		expect(el).toBeNull();
	});
});

