import { ImageFileMetadata } from "storage";
import { Canvas } from "../Canvas";
import { Renderable, Rect, Img, Grid } from "../shapes";
import { hashStringToId } from "../util";

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
			layer: (node as Img).layer,
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
			layer: (node as Rect).layer,
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
	getFile: (id: string | number) => Promise<ImageFileMetadata>
) {
  	canvas.children.length = 0;
	const promises = [];

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
					src = (await getFile((node as SerializedImg).fileId)).dataURL;
					instance = new Img({
						x: node.transform.x,
						y: node.transform.y,
						src,
						width: (node as SerializedImg).width,
						height: (node as SerializedImg).height,
					});
					(instance as Img).fileId = await hashStringToId(src);
					instance.setScale(node.transform.sx, node.transform.sy);
					canvas.appendChild(instance);
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
			for (const child of node.children) promises.push(build(child, instance));
		}
	}

	await build(data.root, canvas);
	await Promise.all(promises);
  	return canvas;
}
