import { Canvas } from "../Canvas";
import { Renderable, Shape, Rect, Img, Grid } from "../shapes";

export type SerializedTransform = {
  x: number;
  y: number;
  sx?: number;
  sy?: number;
  // You can add rotation later if you expose it on Renderable
};

export type SerializedNodeBase = {
  id?: number;           // seq if available
  kind: string;          // 'Rect' | 'Img' | 'Grid' | 'Group' | ...
  layer?: number;
  renderOrder?: number;
  transform: SerializedTransform;
  children?: SerializedNode[];
};

export type SerializedRect = SerializedNodeBase & {
  kind: "Rect";
  width: number;
  height: number;
  color?: [number, number, number, number];
};

export type SerializedImg = SerializedNodeBase & {
  kind: "Img";
  width: number;
  height: number;
  color?: [number, number, number, number];
  src?: string; // image URL or data URL if available
};

export type SerializedGrid = SerializedNodeBase & {
  kind: "Grid";
  // add grid-specific props if needed
};

export type SerializedNode = SerializedRect | SerializedImg | SerializedGrid | SerializedNodeBase;

export type SerializedCanvas = {
  version: 1;
  canvas: {
    width: number;
    height: number;
    dpr: number;
  };
  camera?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    zoom: number;
  };
  root: SerializedNode;
};

function transformOf(node: Renderable): SerializedTransform {
  // Assumes Renderable exposes x, y, sx, sy getters
  return {
    x: (node as any).x ?? 0,
    y: (node as any).y ?? 0,
    sx: (node as any).sx ?? 1,
    sy: (node as any).sy ?? 1,
  };
}

function serializeChildren(node: Renderable): SerializedNode[] {
  return node.children.map(serializeNode);
}

export function serializeNode(node: Renderable): SerializedNode {
  // Custom per-type serialization with safe fallbacks
  if (node instanceof Img) {
    const base: SerializedImg = {
      kind: "Img",
      id: (node as any).seq,
      layer: (node as any).layer,
      renderOrder: (node as any).renderOrder,
      transform: transformOf(node),
      width: (node as any).width,
      height: (node as any).height,
      color: (node as any).color,
      src:
        (node as any).src ??
        (node as any)._src ??
        ((node as any)._image && (node as any)._image.src) ??
        undefined,
      children: node.children?.length ? serializeChildren(node) : undefined,
    };
    return base;
  }

  if (node instanceof Rect) {
    const base: SerializedRect = {
      kind: "Rect",
      id: (node as any).seq,
      layer: (node as any).layer,
      renderOrder: (node as any).renderOrder,
      transform: transformOf(node),
      width: (node as any).width,
      height: (node as any).height,
      color: (node as any).color,
      children: node.children?.length ? serializeChildren(node) : undefined,
    };
    return base;
  }

  if (node instanceof Grid) {
    const base: SerializedGrid = {
      kind: "Grid",
      id: (node as any).seq,
      layer: (node as any).layer,
      renderOrder: (node as any).renderOrder,
      transform: transformOf(node),
      children: node.children?.length ? serializeChildren(node) : undefined,
    };
    return base;
  }

  // Fallback generic node
  const generic: SerializedNodeBase = {
    kind: node.constructor?.name || "Renderable",
    id: (node as any).seq,
    layer: (node as any).layer,
    renderOrder: (node as any).renderOrder,
    transform: transformOf(node),
    children: node.children?.length ? serializeChildren(node) : undefined,
  };
  return generic;
}

export function serializeCanvas(canvas: Canvas): SerializedCanvas {
  const cam = (canvas as any)._camera?.state;
  return {
    version: 1,
    canvas: {
      width: canvas.gl.canvas.width,
      height: canvas.gl.canvas.height,
      dpr: window.devicePixelRatio || 1,
    },
    camera: cam
      ? {
          x: cam.x,
          y: cam.y,
          width: cam.width,
          height: cam.height,
          rotation: cam.rotation,
          zoom: cam.zoom,
        }
      : undefined,
    root: serializeNode(canvas),
  };
}

// export function deserializeCanvas(data: SerializedCanvas, canvas: Canvas) {
//   // Basic version check
//   if (data.version !== 1) {
//     // run migration(s)
//     data = migrate(data);
//   }
//   // Clear existing children
//   canvas.children.length = 0;

//   // Restore camera
//   if (data.camera && canvas._camera?.state) {
//     const cs = canvas._camera.state;
//     cs.x = data.camera.x;
//     cs.y = data.camera.y;
//     cs.width = data.camera.width;
//     cs.height = data.camera.height;
//     cs.rotation = data.camera.rotation;
//     cs.zoom = data.camera.zoom;
//   }

//   function build(node: SerializedNode, parent: Canvas | Renderable) {
//     let instance: Renderable;
//     switch (node.kind) {
//       case 'Rect':
//         instance = new Rect({
//           x: node.transform.x,
//           y: node.transform.y,
//           width: node.width,
//           height: node.height,
//           color: node.color
//         });
//         break;
//       case 'Img':
//         instance = new Img({
//           x: node.transform.x,
//           y: node.transform.y,
//           width: node.width,
//           height: node.height,
//           src: node.src
//         });
//         break;
//       case 'Grid':
//         instance = new Grid({
//           x: node.transform.x,
//           y: node.transform.y
//         });
//         break;
//       default:
//         // fallback generic group
//         instance = new Shape({
//           x: node.transform.x,
//           y: node.transform.y,
//         });
//     }

//     if (node.transform.sx != null || node.transform.sy != null) {
//       instance.setScale(node.transform.sx ?? 1, node.transform.sy ?? 1);
//     }

//     (parent as any).appendChild(instance);

//     if (node.children) {
//       for (const child of node.children) build(child, instance);
//     }
//   }

//   build(data.root, canvas);
//   return canvas;
// }
