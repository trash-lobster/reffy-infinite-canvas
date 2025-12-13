import { SerializedCanvas } from "../serializer";
import { Img } from "../shapes";

export async function previewImage(file: File) {
  return new Promise<string | ArrayBuffer>((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target.result);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PERMISSIBLE_IMAGE_TYPES = [
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
  "image/avif",
  "image/gif", // will be rendered as a still image
  "image/apng", // will be rendered as a still image
];

function isPermissibleImageType(fileType: string): boolean {
  return PERMISSIBLE_IMAGE_TYPES.includes(fileType);
}

export async function hashStringToId(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extract mimetype from base64 string
 */
export function getMimeType(data: string) {
  const match = /^data:([^;]+);base64,/.exec(data);
  return match ? match[1] : undefined;
}

export async function addImages(
  files: FileList,
  addToCanvas: (src: string) => Promise<Img>,
) {
  const images = [];
  if (files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (isPermissibleImageType(file.type)) {
        try {
          const src = await previewImage(file);
          if (typeof src === "string") {
            images.push(await addToCanvas(src));
          } else console.error("Image not added");
        } catch {
          console.error("Failed to copy image.");
        }
      }
    }
  }
  return images;
}

export function downloadJSON(filename: string, data: SerializedCanvas) {
  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
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
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngDataUrl = canvas.toDataURL("image/png", quality);
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

  const canvas = document.createElement("canvas");
  canvas.width = endX - startX;
  canvas.height = endY - startY;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // consider transformation as well
  const promises = imgs.map(async (img) => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const innerImg = new Image();
        innerImg.onload = () => {
          ctx.drawImage(
            innerImg,
            0,
            0,
            img.width,
            img.height,
            img.x - startX,
            img.y - startY,
            img.width * img.sx,
            img.height * img.sy,
          );
          resolve();
        };
        innerImg.onerror = reject;
        innerImg.src = img.src;
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  });

  await Promise.all(promises);

  const data = canvas.toDataURL("image/png");
  return data;
}

export async function mergeImagesToCanvas(
  images: Img[],
): Promise<{ mergedCanvas: HTMLCanvasElement; width: number; height: number }> {
  if (images.length === 0) {
    throw new Error("No images to merge.");
  }

  // Compute bounding box for all images
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const img of images) {
    minX = Math.min(minX, img.x);
    minY = Math.min(minY, img.y);
    maxX = Math.max(maxX, img.x + img.width);
    maxY = Math.max(maxY, img.y + img.height);
  }
  const width = Math.ceil(maxX - minX);
  const height = Math.ceil(maxY - minY);

  // Create offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");

  // Draw each image at its relative position
  await Promise.all(
    images.map((img) => {
      return new Promise<void>((resolve, reject) => {
        const imageEl = new window.Image();
        imageEl.onload = () => {
          ctx.drawImage(
            imageEl,
            img.x - minX,
            img.y - minY,
            img.width,
            img.height,
          );
          resolve();
        };
        imageEl.onerror = reject;
        imageEl.src = img.src;
      });
    }),
  );

  return { mergedCanvas: canvas, width, height };
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
    return b.x + b.width * b.sx - (a.x + a.width * a.sx);
  })[0];
  return endImg.x + endImg.width * endImg.sx;
}

function getEndY(imgs: Img[]): number {
  const endImg = [...imgs].sort((a, b) => {
    return b.y + b.height * b.sy - (a.y + a.height * a.sy);
  })[0];
  return endImg.y + endImg.height * endImg.sy;
}
