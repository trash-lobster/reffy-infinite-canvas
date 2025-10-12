import { Canvas } from "../src";

async function main() {
    const el = document.getElementById('canvas') as HTMLCanvasElement;
    
    const canvas = await new Canvas({
        element: el,
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
    }).initialized;
    
    function animate() {
        requestAnimationFrame(animate);
        canvas.render();
    }
    
    animate();
    
    canvas.resize(500, 500);
    canvas.destroy();
}

main();