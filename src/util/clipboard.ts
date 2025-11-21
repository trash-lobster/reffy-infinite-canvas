import { convertToPNG, getWorldCoords } from ".";
import { Img } from "../shapes";
import { Canvas } from "Canvas";
import { CanvasHistory } from "history";
import { makeMultiAddChildCommand } from "../manager/SceneCommand";

interface InfiniteCanvasClipboardElement {
    src: string;
    x: number;
    y: number;
    sx: number;
    sy: number;
}

interface InfiniteCanvasClipboard {
    type: 'infinite_canvas',
    elements: InfiniteCanvasClipboardElement[]
}

const acceptedPasteMimeType = [
    "image/",
    "text/plain"
];

export const probablySupportsClipboardWriteText = () => {
    return "clipboard" in navigator && "writeText" in navigator.clipboard;
}

// the original copying method involved writing to clipboard API which can take a long time when writing multiple images
// opted for in canvas only copying, which is faster
export async function copy(
    selected: Img[],
    clipboardEvent?: ClipboardEvent
) {
    const dataStored: InfiniteCanvasClipboard = {
        type: 'infinite_canvas',
        elements: selected.map(img => (
            {
                src: img.src,
                x: img.x,
                y: img.y,
                sx: img.sx,
                sy: img.sy,
            }
        ))
    };

    const json = JSON.stringify(dataStored);
    const clipboardItem = new ClipboardItem({ 'text/plain': new Blob([json], { type: "text/plain" }) });
    
    if (probablySupportsClipboardWriteText()) {
        try {
            await navigator.clipboard.write([clipboardItem]);
            return;
        } catch (err) {
            console.error(err);
        }
    }

    try {
        if (clipboardEvent) {
            clipboardEvent.clipboardData?.setData('text/plain', json);
            return;
        }
    } catch (err) {
        console.error(err);
    }

    if (!copyTextViaExecCommand(json)) {
        throw new Error("Error copying to clipboard.");
    }
}

function copyTextViaExecCommand(text: string | null) {
    // execCommand doesn't allow copying empty strings, so if we're
    // clearing clipboard using this API, we must copy at least an empty char
    if (!text) {
        text = " ";
    }

    const isRTL = document.documentElement.getAttribute("dir") === "rtl";

    const textarea = document.createElement("textarea");

    textarea.style.border = "0";
    textarea.style.padding = "0";
    textarea.style.margin = "0";
    textarea.style.position = "absolute";
    textarea.style[isRTL ? "right" : "left"] = "-9999px";
    const yPosition = window.pageYOffset || document.documentElement.scrollTop;
    textarea.style.top = `${yPosition}px`;
    textarea.style.fontSize = "12pt";

    textarea.setAttribute("readonly", "");
    textarea.value = text;

    document.body.appendChild(textarea);

    let success = false;

    try {
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);

        success = document.execCommand("copy");
    } catch (error: any) {
        console.error(error);
    }

    textarea.remove();

    return success;
};

export async function paste(
    clientX: number, 
    clientY: number, 
    canvas: Canvas, 
    history: CanvasHistory,
    isWorldCoord: boolean = true,
) {
    // check if there is anything from your clipboard to paste from
    try {
        const items = await navigator.clipboard.read();
        const types = items[0].types;
        
        const type = types.find(t =>
            acceptedPasteMimeType.some(allowed =>
                allowed.endsWith('/') // for "image/" and similar
                ? t.startsWith(allowed)
                : t === allowed
            )
        );
        
        if (!type) return;
        
        const [wx, wy] = isWorldCoord ? [clientX, clientY] : getWorldCoords(clientX, clientY, canvas);

        for (const type of types) {
            const blob = await items[0].getType(type);
            try {
                if (type === 'text/plain') {
                    const data: InfiniteCanvasClipboard = JSON.parse(await blob.text());
                    if (data.elements.length === 0) return;
                    const minX = data.elements.sort((a, b) => a.x - b.x)[0].x;
                    const minY = data.elements.sort((a, b) => a.y - b.y)[0].y;
        
                    const images = await Promise.all(
                        data.elements.map((element) => canvas.addImageToCanvas(
                            element.src, 
                            wx + element.x - minX,
                            wy + element.y - minY, 
                            element.sx, 
                            element.sy
                        ))
                    );
        
                    history.push(makeMultiAddChildCommand(canvas, images));
                    return;
                }
        
                let base64: string;
                
                if (type.startsWith('image/svg')) {
                    try {
                        const svgText = await blob.text();
                        base64 = await convertToPNG(`data:image/svg+xml;base64,${btoa(svgText)}`);
                    } catch (err) {
                        console.error(err);
                    }
                } else {
                    base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                }

                const img = await canvas.addImageToCanvas(base64, wx, wy);
                history.push(makeMultiAddChildCommand(canvas, [img]));
                return;
            } catch (err) {
                continue;
            }
        
        }
    } catch (err) {
        console.error(err);
        console.error('Failed to add images');
    }
}

function isValidHttpUrl(s: string) {
    let url;
    
    try {
        url = new URL(s);
    } catch (_) {
        return false;  
    }

    return url.protocol === "http:" || url.protocol === "https:";
}