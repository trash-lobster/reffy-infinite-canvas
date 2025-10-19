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

    new Camera(canvas);

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
    
    const WORLD_HALF_EXTENT = 5000; // world units in each direction from origin
    const randRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    const urls = [
        'https://i.redd.it/74l6fsbegzuf1.jpeg',
        'https://i.redd.it/e7zyleu06xuf1.jpeg',
        'https://i.redd.it/gewlibsk5muf1.jpeg',
    ];

    for (let i = 0; i < 100; i++) {
        const img = new Img({
            x: randRange(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT),
            y: randRange(-WORLD_HALF_EXTENT, WORLD_HALF_EXTENT),
            src: pick(urls),
        })
        canvas.appendChild(img);
    }
    
    canvas.appendChild(triangle);
    canvas.appendChild(rectangle);
    canvas.attachEventEmitter();

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