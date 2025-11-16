import { Img } from "../shapes";

export async function previewImage(file: File) {
    return new Promise<string | ArrayBuffer>((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        }

        reader.onerror = reject;
        reader.readAsDataURL(file);
    })
}

const PERMISSIBLE_IMAGE_TYPES = [
    'image/webp',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/avif',
    'image/gif',    // will be rendered as a still image
    'image/apng',   // will be rendered as a still image
];

function isPermissibleImageType(fileType: string): boolean {
    return PERMISSIBLE_IMAGE_TYPES.includes(fileType);
}

export async function addImages(files: FileList, addToCanvas: (src: string) => Promise<Img>) {
    const images = [];
    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (isPermissibleImageType(file.type)) {
                try {
                    const src = await previewImage(file);
                    if (typeof src === 'string') {
                        images.push(await addToCanvas(src));
                    } else console.error('Image not added');
                } catch {
                    console.error('Failed to copy image.');
                }
            }
        }
    }
    return images;
}

export function downloadJSON(filename: string, data: unknown) {
    const text = JSON.stringify(data, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export async function readJSONFile<T = unknown>(file: File): Promise<T> {
    const text = await file.text();
    return JSON.parse(text) as T;
}

export async function pasteFromClipboard(data: DataTransfer) {
    let newImages: Img[] = [];

    const files = data.files;
    const html = data.getData('text/html');

    if (html) {
        const el = document.createElement('html');
        el.innerHTML = html;
        const images = el.getElementsByTagName('img');
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const newImg = new Img({
                x: this.state.lastPointerPos.x,
                y: this.state.lastPointerPos.y,
                src: image.src,
            });
            this.canvas.appendChild(newImg);
            newImages.push(newImg);
        }
    } else {
        newImages = await addImages(
            files, 
            async (src: string) => await this.addToCanvas(src, this.state.lastPointerPos.x, this.state.lastPointerPos.y)
        );
    }
}

export function convertToPNG(src: string, quality = 1.0): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL('image/png', quality);
            resolve(pngDataUrl);
        };
        img.onerror = reject;
        img.src = src;
    });
}

export async function mergeMultiImg(imgs: Img[]): Promise<string> {
    const startX = getSmallestImgX(imgs);
    const startY = getSmallestImgY(imgs);
    const endX = getEndX(imgs);
    const endY = getEndY(imgs);

    const canvas = document.createElement('canvas');
    canvas.width = endX - startX;
    canvas.height = endY - startY;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // consider transformation as well
    const promises = imgs.map(async img => {
        return new Promise<void>(async (resolve, reject) => {
            try {                
                const innerImg = new Image();
                innerImg.onload = () => {
                    ctx.drawImage(
                        innerImg,
                        0, 0, img.width, img.height,
                        img.x - startX, img.y - startY, img.width * img.sx, img.height * img.sy
                    )
                    resolve();
                }
                innerImg.onerror = reject;
                innerImg.src = img.src;
            } catch(err) {
                console.error(err);
                reject(err);
            }
        })
    });

    await Promise.all(promises);

    const data = canvas.toDataURL('image/png');
    return data;
}

function getSmallestImgX(imgs: Img[]): number {
    return [...imgs].sort((a, b) => {
        return a.x - b.x;
    })[0].x;
}

function getSmallestImgY(imgs: Img[]): number {
    return [...imgs].sort((a, b) => {
        return a.y - b.y;
    })[0].y;
}

function getEndX(imgs: Img[]): number {
    const endImg = [...imgs].sort((a, b) => {
        return (b.x + b.width * b.sx) - (a.x + a.width * a.sx);
    })[0];
    return endImg.x + endImg.width * endImg.sx;
}

function getEndY(imgs: Img[]): number {
    const endImg = [...imgs].sort((a, b) => {
        return (b.y + b.height * b.sy) - (a.y + a.height * a.sy);
    })[0];
    return endImg.y + endImg.height * endImg.sy;
}
