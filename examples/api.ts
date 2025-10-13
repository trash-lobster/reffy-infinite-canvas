import { Canvas } from "../src";
import { Rect, Triangle } from "../src/shapes";

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

    
    const canvas = new Canvas(
        $canvas
    );

    const positions = [
        0, 0,
        0, 0.5,
        0.7, 0,
    ];
    const triangle = new Triangle(positions);
    const rectangle = new Rect({
        x: 200,
        y: 200,
        width: 300,
        height: 500,
    })
    canvas.appendChild(rectangle);

    const render = () => {
        canvas.render();
        requestAnimationFrame(render);
    }

    render();

    // const image = (await load(
    //     'https://i.redd.it/gewlibsk5muf1.jpeg',
    //     // 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAADElEQVQImWNgoBMAAABpAAFEI8ARAAAAAElFTkSuQmCC',
    //     ImageLoader,
    // )) as ImageBitmap;

    let imageCount = 1;
}

main();