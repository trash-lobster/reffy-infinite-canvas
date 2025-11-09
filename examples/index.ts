export * from '../src/CanvasComponent';

window.addEventListener('DOMContentLoaded', () => {
    const el = document.querySelector('infinite-canvas') as any;
    const btn = document.getElementById('mode-button')!;
    btn.addEventListener('click', () => {
        el.toggleMode();
    });
});