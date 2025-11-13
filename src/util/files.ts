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

export async function addImages(files: FileList, addToCanvas: (src: string) => Img) {
    const images = [];
    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if(file.type.startsWith('image/')) {
                try {
                    const src = await previewImage(file);
                    if (typeof src === 'string') {                        
                        images.push(addToCanvas(src));
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