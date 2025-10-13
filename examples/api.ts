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
        x: 0,
        y: 0,
        width: 0.3,
        height: 0.5,
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
    // function addImage() {

    //     // rect.addEventListener('pointerdown', () => {
    //     //     rect.draggable = true;
    //     // })

    //     rect.addEventListener('dragstart', (event) => {
    //         console.log('Drag started');
    //         // rect.draggable = true;
    //     });

    //     rect.addEventListener('drag', (event) => {
    //         // // Update position based on movement delta
    //         rect.x += (event as FederatedPointerEvent).dx;
    //         rect.y += (event as FederatedPointerEvent).dy;
    //     });

    //     rect.addEventListener('dragend', (event) => {
    //         console.log('Drag ended');
    //         // Clean up, snap to grid, etc.
    //         // rect.draggable = false;
    //     });

    //     imageCount++;
    // }
    
    // function animate() {
    //     canvas.render();
    //     requestAnimationFrame(animate);
    // }
    
    // animate();
    
    // window.addEventListener('resize', () => {
    //     resize(window.innerWidth, window.innerHeight);
    //     canvas.resize(window.innerWidth, window.innerHeight);
    // });
}

main();