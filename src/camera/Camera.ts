import { Canvas } from "Canvas";
import { m3, previewImage } from "../util";
import { Img, Shape } from "../shapes";

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 8;

export class Camera {
    canvas : Canvas;
    #x: number = 0;
    #y: number = 0;
    #width: number = 0;
    #height: number = 0;
    #rotation: number = 0;
    #zoom: number = 1;

    #startWorldX: number = 0;
    #startWorldY: number = 0;
    #lastWorldX: number = 0;
    #lastWorldY: number = 0;

    get x () { return this.#x };
    set x (val: number) {
        if (this.#x !== val) {
            this.#x = val;
            this.updateViewMatrix();
        }
    }

    get y () { return this.#y };
    set y (val: number) {
        if (this.#y !== val) {
            this.#y = val;
            this.updateViewMatrix();
        }
    }

    get width () { return this.#width };
    set width (val: number) {
        if (this.#width !== val) {
            this.#width = val;
            this.updateViewMatrix();
        }
    }

    get height () { return this.#height };
    set height (val: number) {
        if (this.#height !== val) {
            this.#height = val;
            this.updateViewMatrix();
        }
    }

    get rotation () { return this.#rotation };
    set rotation (val: number) {
        if (this.#rotation !== val) {
            this.#rotation = val;
            this.updateViewMatrix();
        }
    }

    get zoom () { return this.#zoom };
    set zoom (val: number) {
        if (val < ZOOM_MIN) {
            val = ZOOM_MIN;
        } else if (val > ZOOM_MAX) {
            val = ZOOM_MAX;
        }

        if (this.#zoom !== val) {
            this.#zoom = val;
            this.canvas.grid.zoom = val;
            this.updateViewMatrix();
            console.log(val);
        }
    }

    constructor(canvas: Canvas) {
        this.canvas = canvas;

        window.addEventListener('paste', async (e) => {
            const files = e.clipboardData.files;
            if (files) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if(file.type.startsWith('image/')) {
                        try {
                            const src = await previewImage(file);
                            if (typeof src === 'string') {
                                this.canvas.appendChild(new Img({
                                    x: 0,
                                    y: 0,
                                    src: src,
                                }))
                            } else console.log('Image not added');
                        } catch {
                            console.error('Failed to copy image.');
                        }
                    }
                }
            }
        });

        this.canvas.canvas.addEventListener('pointerdown', (e) => {
            const [wx, wy] = this.screenToWorld(e.clientX, e.clientY);
            this.#startWorldX = wx;
            this.#startWorldY = wy;
            this.#lastWorldX = wx;
            this.#lastWorldY = wy;

            this.canvas.hitTest(wx, wy);

            document.addEventListener('pointermove', this.onPointerMove);
            const up = () => {
                document.removeEventListener('pointermove', this.onPointerMove);
                document.removeEventListener('pointerup', up);
                this.canvas.isGlobalClick = true;
                this.canvas._eventManager.resetImpactedShapes();
                this.canvas.canvas.style.cursor = 'default';
            };
            document.addEventListener('pointerup', up);

        });
        this.canvas.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    }

    /**
     * Called once to update the `worldMatrix` of the attached canvas, which is the view matrix.
     */
    private updateViewMatrix() {
        const translationMatrix = m3.translation(this.x, this.y);
        const rotationMatrix = m3.rotation(this.rotation);
        const scaleMatrix = m3.scaling(this.zoom, this.zoom);
        
        const matrix = m3.multiply(translationMatrix, rotationMatrix);
        const cameraMatrix = m3.multiply(matrix, scaleMatrix);
        
        // obtaining a proper view matrix, which is the inverse of camera matrix
        this.canvas.worldMatrix = m3.inverse(cameraMatrix);
        this.canvas.updateWorldMatrix();
    }

    // Render: clip = P · V · world
    // Picking: world = (P · V)⁻¹ · clip
    private screenToWorld(clientX: number, clientY: number): [number, number] {
        const rect = this.canvas.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // Device pixels relative to canvas
        const x = (clientX - rect.left) * dpr;
        const y = (clientY - rect.top) * dpr;

        // Convert to clip space
        const w = this.canvas.gl.canvas.width;
        const h = this.canvas.gl.canvas.height;
        const xClip = (x / w) * 2 - 1;
        const yClip = (y / h) * -2 + 1;

        // inv(P * V) * clip -> world

        // projection matrix transforms pixel space to clip space
        const proj = m3.projection(w, h);
        // view-projection matrix
        const pv = m3.multiply(proj, this.canvas.worldMatrix); // worldMatrix is view matrix and calculates the matrix to map world-space to clip-space

        // used to unproject and retrieve world coords
        const invPV = m3.inverse(pv);
        const [wx, wy] = m3.transformPoint(invPV, [xClip, yClip]);

        return [wx, wy];
    }

    private onWheel = (e: WheelEvent) => {
        e.preventDefault();

        // Point under cursor in world space before zoom
        const [wx0, wy0] = this.screenToWorld(e.clientX, e.clientY);

        // Smooth zoom factor (wheel up => zoom in)
        const ZOOM_SPEED = 0.003;
        const scale = Math.exp(-e.deltaY * ZOOM_SPEED);
        const target = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * scale));

        this.zoom = target;

        // Same point after zoom
        const [wx1, wy1] = this.screenToWorld(e.clientX, e.clientY);

        // Shift camera so the world point stays under the cursor
        this.x += (wx0 - wx1);
        this.y += (wy0 - wy1);
    };

    private onPointerMove = (e: PointerEvent) => {
        const [wx, wy] = this.screenToWorld(e.clientX, e.clientY);
        const dx = wx - this.#lastWorldX;
        const dy = wy - this.#lastWorldY;

        if (this.canvas.isGlobalClick) {
            this.x += this.#startWorldX - wx;
            this.y += this.#startWorldY - wy;
        } else {
            const target = this.canvas._eventManager.impactedShapes.find(
                (child): child is Shape => child instanceof Shape
            );

            if (target) {
                target.x += dx;
                target.y += dy;

                target.updateVertexData(this.canvas.gl);

            }

            if (this.canvas.boundingBox) {
                this.canvas.boundingBox.x += dx;
                this.canvas.boundingBox.y += dy;
                this.canvas.boundingBox.updateVertexData(this.canvas.gl);
            }
        }

        this.#lastWorldX = wx;
        this.#lastWorldY = wy;
        this.canvas.canvas.style.cursor = 'grabbing'
    }
}