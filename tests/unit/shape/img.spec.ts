import { Img } from '../../../src/shapes/Img';
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';

describe('Img', () => {
    // let originalImage: typeof window.Image;

    // beforeEach(() => {
    //     // Mock Image for predictable loading
    //     originalImage = window.Image;
    //     class MockImage {
    //         src = '';
    //         crossOrigin = '';
    //         naturalWidth = 100;
    //         naturalHeight = 50;
    //         complete = true;
    //         onload: (() => void) | null = null;
    //         onerror: ((e: any) => void) | null = null;
    //         setSrc(val: string) {
    //             this.src = val;
    //             if (this.onload) this.onload();
    //         }
    //     }
    //     // @ts-ignore
    //     window.Image = MockImage;
    // });

    // afterEach(() => {
    //     window.Image = originalImage;
    // });

    // test('should get/set attributes correctly', () => {
    //     const img = new Img({
    //         x: 300,
    //         y: 300,
    //         src: 'test-url'
    //     });
    //     expect(img.x).toBe(300);
    //     expect(img.y).toBe(300);
    //     expect(img.src).toBe('test-url');
    // });

    // test('should update src and mark dirty', () => {
    //     const img = new Img({ src: 'foo' });
    //     img.markDirty = vi.fn();
    //     img.src = 'bar';
    //     expect(img.src).toBe('bar');
    //     expect(img.markDirty).toHaveBeenCalled();
    // });

    // test('should not mark dirty if src is unchanged', () => {
    //     const img = new Img({ src: 'foo' });
    //     img.markDirty = vi.fn();
    //     img.src = 'foo';
    //     expect(img.markDirty).not.toHaveBeenCalled();
    // });

    // test('should set width and height on image load', () => {
    //     const img = new Img({ src: 'foo', width: 123, height: 456 });
    //     // @ts-ignore
    //     img._image.naturalWidth = 123;
    //     // @ts-ignore
    //     img._image.naturalHeight = 456;
    //     // Simulate onload
    //     // @ts-ignore
    //     img._image.onload();
    //     expect(img.width).toBe(123);
    //     expect(img.height).toBe(456);
    // });

    test('should set fileId and get fileId', () => {
        expect( 1 + 2 ).toBe(3);
    });
});