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
];

function isPermissibleImageType(fileType: string): boolean {
    // Some browsers may not use 'image/jpg', but include for completeness
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
                    } else console.log('Image not added');
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

export function convertToPNG(src: string, quality = 1.0): Promise<string> {
    console.log(src);
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL('image/png', quality);
            resolve(pngDataUrl);
        };
        img.onerror = reject;
        img.src = src;
    });
}