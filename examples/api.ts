import { Camera, Canvas } from "../src";
import { Img, Rect, Triangle } from "../src/shapes";

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

    const camera = new Camera(canvas);

    const triangle = new Triangle([
        700, 100,
        200, 100,
        150, 200,
    ]);

    const rectangle = new Rect({
        x: 200,
        y: 150,
        width: 200,
        height: 500,
    })

    const otherRect = new Rect({
        x: 550,
        y: 200,
        width: 300,
        height: 500,
    })

    const img = new Img({
        x: 300,
        y: 200,
        width: 300,
        height: 500,
        src: 'https://i.redd.it/74l6fsbegzuf1.jpeg'
    })

    const img2 = new Img({
        x: 700,
        y: 400,
        width: 300,
        height: 500,
        src: 'https://i.redd.it/e7zyleu06xuf1.jpeg'
    })
    
    rectangle.appendChild(otherRect);

    canvas.appendChild(triangle);
    canvas.appendChild(rectangle);
    canvas.appendChild(img);
    canvas.appendChild(img2);

    camera.translate(500, 100);
    camera.zoomIn(-0.5);
    camera.rotate(45);

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

    window.addEventListener('beforeunload', () => {
        canvas.destroy();
    })
}

main();