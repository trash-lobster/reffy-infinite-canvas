import { convertToPNG, getWorldCoords } from "../util";
import { Img } from "../shapes";
import { Canvas } from "Canvas";
import { CanvasHistory } from "history";
import { makeMultiAddChildCommand } from "./SceneCommand";

export class FauxClipboardManager {
    private copied: Img[] = [];

    constructor() {
        this.copy = this.copy.bind(this);
        this.paste = this.paste.bind(this);
    }

    // the original copying method involved writing to clipboard API which can take a long time when writing multiple images
    // opted for in canvas only copying, which is faster
    async copy(selected: Img[]) {
        // does not copy to the actual clipboard
        if (selected.length == 0) return;
        this.copied = [...selected];
    }

    // there is no way currently I've found that can allow us to bypass the permission for reading from the navigator's clipboard
    // the additional confirmation is required when pasting from a different origin
    // pasting images copied from the canvas will not trigger the additional permission
    // In Chrome, the interaction is smoother as it would remember the choice when permission is given
    // In Firefox, the interaction requires an additional button press every time.
    /**
     * Checks first if there is anything copied in clipboard
     * @param e 
     * @param canvas 
     * @param history 
     */
    async paste(clientX: number, clientY: number, canvas: Canvas, history: CanvasHistory) {
        // check if there is anything from your clipboard to paste from
        try {
            const items = await navigator.clipboard.read();
            const types = items[0].types;

            const type = types.find(t => 
                t.startsWith('image/') 
                || t.startsWith('text/html')
            );
            
            const [wx, wy] = getWorldCoords(clientX, clientY, canvas);

            console.log(this.copied);
            const newImages = await Promise.all(this.copied.map(async (img) => {
                return await canvas.addToCanvas(img.src, wx, wy);
            }));

            console.log(newImages);

            history.push(makeMultiAddChildCommand(canvas, newImages));

            // if (!type) {
            //     // add images from this.copied
            // } else {
            //     const blob = await items[0].getType(type);
    
            //     let base64: string;
    
            //     if (type.startsWith('text/html')) {
            //         const el = document.createElement('html');
            //         el.innerHTML = await blob.text();
            //         const image = el.getElementsByTagName('img')[0];
            //         base64 = image.src;
            //     } else if (type.startsWith('image/svg')) {
            //         const svgText = await blob.text();
            //         base64 = await convertToPNG(`data:image/svg+xml;base64,${btoa(svgText)}`);
            //     } else {
            //         base64 = await new Promise<string>((resolve, reject) => {
            //             const reader = new FileReader();
            //             reader.onloadend = () => resolve(reader.result as string);
            //             reader.onerror = reject;
            //             reader.readAsDataURL(blob);
            //         });
            //     }
                
            //     const img = await canvas.addToCanvas(base64, wx, wy);
            //     history.push(makeMultiAddChildCommand(canvas, [img]));
            // }
        } catch (ex) {

        }
    }
}