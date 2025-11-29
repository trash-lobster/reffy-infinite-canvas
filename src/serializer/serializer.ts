import { ImageFileMetadata } from "storage";
import { Canvas } from "../Canvas";
import { Renderable, Rect, Img, Grid } from "../shapes";
import { hashStringToId, performanceTest } from "../util";

/**
 * What should be exposed?
 * the images created - their position, scale and src - maintain the order they have been saved
 * 
 * grid state should be tracked to decide if grid lines are there or not - TO BE IMPLEMENTED
 * 
 * Should camera position be tracked
 * 
 * How often should we write to the chosen method fo storage? When initialising the exporter, we can decide between indexdb and an actual db
 * is there anyway to force a save when the app closes? In what circumstances will that not work? An ungraceful shutdown?
 */

const PLACEHOLDER_IMAGE_SRC = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjYjNiM2IzIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xLjUgNmEyLjI1IDIuMjUgMCAwIDEgMi4yNS0yLjI1aDE2LjVBMi4yNSAyLjI1IDAgMCAxIDIyLjUgNnYxMmEyLjI1IDIuMjUgMCAwIDEtMi4yNSAyLjI1SDMuNzVBMi4yNSAyLjI1IDAgMCAxIDEuNSAxOHpNMyAxNi4wNlYxOGMwIC40MTQuMzM2Ljc1Ljc1Ljc1aDE2LjVBLjc1Ljc1IDAgMCAwIDIxIDE4di0xLjk0bC0yLjY5LTIuNjg5YTEuNSAxLjUgMCAwIDAtMi4xMiAwbC0uODguODc5bC45Ny45N2EuNzUuNzUgMCAxIDEtMS4wNiAxLjA2bC01LjE2LTUuMTU5YTEuNSAxLjUgMCAwIDAtMi4xMiAwem0xMC4xMjUtNy44MWExLjEyNSAxLjEyNSAwIDEgMSAyLjI1IDBhMS4xMjUgMS4xMjUgMCAwIDEtMi4yNSAwIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=";
const PLACEHOLDER_IMAGE_SIZE = 240;

export type SerializedTransform = {
	x: number;
	y: number;
	sx: number;
	sy: number;
};

export type SerializedNodeBase = {
	id?: number;
	type: string;
	transform?: SerializedTransform;
	children?: SerializedNode[];
	layer?: number;
	renderOrder?: number;
};

export type SerializedRect = SerializedNodeBase & {
	type: "Rect";
	width: number;
	height: number;
	color: [number, number, number, number];
};

export type SerializedImg = SerializedNodeBase & {
	type: "Img";
	width: number;
	height: number;
	fileId: number | string;
};

export type SerializedGrid = SerializedNodeBase & {
	type: "Grid";
	style?: number;
}

export type SerializedNode = SerializedRect | SerializedImg | SerializedGrid | SerializedNodeBase;

export type SerializedCanvas = {
	version: 1;
	canvas: {
		width: number;
		height: number;
		dpr: number;
	};
	root: SerializedNode;
	files?: ImageFileMetadata[];
};

function transformOf(node: Renderable): SerializedTransform {
	return {
		x: node.x ?? 0,
		y: node.y ?? 0,
		sx: node.sx ?? 1,
		sy: node.sy ?? 1,
	};
}

function serializeChildren(node: Renderable): SerializedNode[] {
  	return node.children.map(serializeNode);
}

export function serializeNode(node: Renderable): SerializedNode {
	if (node instanceof Img) {
		const base: SerializedImg = {
			type: "Img",
			id: (node as Img).seq,
			renderOrder: (node as Img).renderOrder,
			transform: transformOf(node),
			width: (node as Img).width,
			height: (node as Img).height,
			fileId: (node as Img).fileId,
			children: node.children?.length ? serializeChildren(node) : undefined,
		};
		return base;
	}

	if (node instanceof Rect) {
		const base: SerializedRect = {
			type: "Rect",
			id: (node as Rect).seq,
			renderOrder: (node as Rect).renderOrder,
			transform: transformOf(node),
			width: (node as Rect).width,
			height: (node as Rect).height,
			color: (node as Rect).color,
			children: node.children?.length ? serializeChildren(node) : undefined,
		};
		return base;
	}

	if (node instanceof Grid) {
		const base: SerializedGrid = {
			type: "Grid",
			style: (node as Grid).gridType
		};
		return base;
	}

	const generic: SerializedNodeBase = {
		type: "Renderable",
		children: node.children?.length ? serializeChildren(node) : undefined,
	};
	return generic;
}

export function serializeCanvas(canvas: Canvas, files?: ImageFileMetadata[]): SerializedCanvas {
	const { gl } = canvas;
	return {
		version: 1,
		canvas: {
			width: gl.canvas.width,
			height: gl.canvas.height,
			dpr: window.devicePixelRatio || 1,
		},
		root: serializeNode(canvas),
		files
	};
}

export async function deserializeCanvas(
	data: SerializedCanvas, 
	canvas: Canvas, 
	getFile: (id: string | number) => Promise<ImageFileMetadata>,
	writeFileToDatabase?: (data: string) => void,
) {
	canvas.children.length = 0;
	
	async function build(node: SerializedNode, parent: Canvas | Renderable) {
		let instance: Renderable;
		switch (node.type) {
			case 'Rect':
				instance = new Rect({
					x: node.transform.x,
					y: node.transform.y,
					width: (node as SerializedRect).width,
					height: (node as SerializedRect).height,
				});
				instance.setScale(node.transform.sx, node.transform.sy);
				canvas.appendChild(instance);
				break;
			case 'Img':
				let src: string;
				try {
					src = (
						data.files ? 
						data.files.find(e => e.id === (node as SerializedImg).fileId).dataURL :
						PLACEHOLDER_IMAGE_SRC
					);
										
					if (writeFileToDatabase) {
						writeFileToDatabase(src);
					}
					
                    const width = (node as SerializedImg).width;
                    const height = (node as SerializedImg).height;
                    const framedPlaceholder = await framePlaceholder(src, width * node.transform.sx, height * node.transform.sy);

                    instance = new Img({
                        x: node.transform.x,
                        y: node.transform.y,
                        src: framedPlaceholder,
                        width,
                        height,
                    });

					getFile((node as SerializedImg).fileId)
						.then(file => { (instance as Img).src = file.dataURL; })
						.catch(err => console.error('Image not loaded', err));

					//  skip hashing if it already has a file ID
					(instance as Img).fileId = (node as SerializedImg).fileId ?? await hashStringToId(src);
					instance.setScale(node.transform.sx, node.transform.sy);
					canvas.appendChild(instance);
					if (typeof (node as SerializedImg).renderOrder === 'number') {
						(instance as Img).renderOrder = (node as SerializedImg).renderOrder;
					}
				} catch (err) {
					// delete node from storage? It won't be saved in the next instance, so perhaps it's fine?
					console.error(`Failed to match image to restore with source: ${src}`);
				} finally {
					break;
				}
			case 'Grid':
				if (parent instanceof Canvas) {
					parent.grid.gridType = (node as SerializedGrid).style;
				}
				break;
			default:				
				break;
		}

		if (node.children) {
			for (const child of node.children) await build(child, instance);
		}
	}

	await build(data.root, canvas);
  	return canvas;
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    return new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
    });
}

async function framePlaceholder(
    srcOrBlob: string | Blob,
    tw?: number,
    th?: number,
    bg: string = '#d6d6d6ff'
): Promise<string> {
    let objectUrl: string | null = null;
    let src: string;

    if (srcOrBlob instanceof Blob) {
        objectUrl = URL.createObjectURL(srcOrBlob);
        src = objectUrl;
    } else {
        src = srcOrBlob;
    }

    try {
        const img = await loadImageElement(src);
        const targetW = tw && tw > 0 ? tw : img.naturalWidth;
        const targetH = th && th > 0 ? th : img.naturalHeight;

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, targetW, targetH);

		// if any of the sides is less than the placeholder image size, then use the natural ratio
		const ratio = Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight);
		const ratioedHeight = img.naturalHeight * ratio;
		const ratioedWidth = img.naturalWidth * ratio;

		let dw = PLACEHOLDER_IMAGE_SIZE;
		let dh = PLACEHOLDER_IMAGE_SIZE;

		if ( PLACEHOLDER_IMAGE_SIZE > ratioedHeight || PLACEHOLDER_IMAGE_SIZE > ratioedWidth ) {
			dw = ratioedWidth;
			dh = ratioedHeight;
		}

		const dx = Math.round((targetW - dw) / 2);
        const dy = Math.round((targetH - dh) / 2);

        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, dx, dy, dw, dh);

        return canvas.toDataURL('image/png');
    } finally {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    }
}
