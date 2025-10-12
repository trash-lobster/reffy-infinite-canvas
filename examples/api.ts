import { Canvas, Circle } from "../src";

async function main() {
    const el = document.getElementById('canvas') as HTMLCanvasElement;
    
    const canvas = await new Canvas({
        canvas: el,
        devicePixelRatio: window.devicePixelRatio,
    }).initialized;

    const circle = new Circle(
        {
            cx: 100,
            cy: 100,
            r: 100,
            fill: 'red'
        }
    );
    canvas.appendChild(circle);

    
    function animate() {
        canvas.render();
        requestAnimationFrame(animate);
    }
    
    animate();
    
    canvas.resize(window.innerWidth, window.innerHeight);
    canvas.destroy();
}

main();