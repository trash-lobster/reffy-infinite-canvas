import {
    Device,
    BufferUsage,
    WebGLDeviceContribution,
    WebGPUDeviceContribution,
} from '@antv/g-device-api';

export class Canvas {
    element: HTMLCanvasElement = document.createElement('canvas');
    width: number = 0;
    height: number = 0;
    renderer: 'webgl' | 'webgpu' = 'webgl';
    devicePixelRatio: number = 1;
    camera: string = '';
    inputPoints: number[] = [];
    #instancePromise: Promise<this>;
    #device: Device;

    get initialized() {
        return this.#instancePromise.then(() => this);
    }
    
    constructor(canvas? : Partial<Canvas>) {
        Object.assign(this, canvas);
        this.#instancePromise = (async () => {
            this.#device = await this.createDevice();
            return this;
        })();
    }

    render() {
        console.log('rendering canvas');

        if (this.#device) {
            console.log('Device is available:', this.#device);
            console.log('Device limits:', this.#device.queryLimits);
            
            // Try to get device stats or perform a simple operation
            const queryPool = this.#device.createQueryPool(0, 1);
            console.log('Created query pool successfully:', queryPool);
            
            // Clean up the test query pool
            queryPool?.destroy();
        } else {
            console.log('Device not yet initialized');
        }
    }

    destroy() {
        this.#device.destroy();
    }

    resize(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    private async createDevice() {
        let deviceContribution: WebGLDeviceContribution | WebGPUDeviceContribution;
        if (this.renderer === 'webgl') {
            deviceContribution = new WebGLDeviceContribution({
                targets: ['webgl2', 'webgl1'],
            });
        } else {
            deviceContribution = new WebGPUDeviceContribution({
                shaderCompilerPath: '/glsl_wgsl_compiler_bg.wasm',
                // shaderCompilerPath:
                //   'https://unpkg.com/@antv/g-device-api@1.4.9/rust/pkg/glsl_wgsl_compiler_bg.wasm',
            });
        }

        const swapChain = await deviceContribution.createSwapChain(this.element);
        swapChain.configureSwapChain(this.width, this.height);
        return swapChain.getDevice();
    }
}