import { load } from "@loaders.gl/core";
import { ImageLoader } from "@loaders.gl/images";
import { Canvas, Circle } from "../src";

async function main() {
    const $canvas = document.getElementById('canvas') as HTMLCanvasElement;

    const resize = (width: number, height: number) => {
        $canvas.width = width * window.devicePixelRatio;
        $canvas.height = height * window.devicePixelRatio;
        $canvas.style.width = `${width}px`;
        $canvas.style.height = `${height}px`;
        $canvas.style.outline = 'none';
        $canvas.style.padding = '0px';
        $canvas.style.margin = '0px';
    };
    resize(window.innerWidth, window.innerHeight);

    
    const canvas = await new Canvas({
        canvas: $canvas,
        devicePixelRatio: window.devicePixelRatio,
    }).initialized;
    
    const image = (await load(
        'https://infinitecanvas.cc/canvas.png',
        // 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAADElEQVQImWNgoBMAAABpAAFEI8ARAAAAAElFTkSuQmCC',
        ImageLoader,
    )) as ImageBitmap;

    const circle = new Circle({
        cx: 100,
        cy: 100,
        r: 50,
        fill: image,
        stroke: 'black',
        strokeWidth: 5,
        strokeOpacity: 0.5,
    });
    canvas.appendChild(circle);
    
    circle.addEventListener('pointerenter', () => {
        circle.fill = 'green';
    });
    
    function animate() {
        canvas.render();
        requestAnimationFrame(animate);
    }
    
    animate();
    
    window.addEventListener('resize', () => {
        resize(window.innerWidth, window.innerHeight);
        canvas.resize(window.innerWidth, window.innerHeight);
    });
}

main();