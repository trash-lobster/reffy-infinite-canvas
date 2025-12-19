import { z } from "zod";

const TransformSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    sx: z.number(),
    sy: z.number(),
  })
  .strict();

const ImageFileSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    dataURL: z
      .string()
      .regex(/^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/, "Invalid image data URL"),
    mimetype: z.string().regex(/^image\/[a-z0-9.+-]+$/i, "Invalid image MIME type"),
    created: z.number(),
    lastRetrieved: z.number(),
  })
  .strict();

type NodeSchemaType = z.infer<typeof NodeSchema>;
const NodeSchema: z.ZodType<any> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
        type: z.literal("Rect"),
        id: z.number().int().optional(),
        transform: TransformSchema,
        children: z.array(NodeSchema).optional(),
        layer: z.number().int().optional(),
        renderOrder: z.number().int().optional(),
        width: z.number().positive(),
        height: z.number().positive(),
        color: z.tuple([z.number(), z.number(), z.number(), z.number()]),
      })
      .strict(),
    z.object({
        type: z.literal("Img"),
        id: z.number().int().optional(),
        transform: TransformSchema,
        children: z.array(NodeSchema).optional(),
        layer: z.number().int().optional(),
        renderOrder: z.number().int().optional(),
        width: z.number().positive(),
        height: z.number().positive(),
        fileId: z.union([z.string(), z.number()]).optional(),
      })
      .strict(),
    z.object({
        type: z.literal("Grid"),
        id: z.number().int().optional(),
        style: z.number().int().optional(),
        children: z.array(NodeSchema).optional(),
      })
      .strict(),
    z.object({
        type: z.literal("Renderable"),
        id: z.number().int().optional(),
        transform: TransformSchema.optional(),
        children: z.array(NodeSchema).optional(),
        layer: z.number().int().optional(),
        renderOrder: z.number().int().optional(),
      })
      .strict(),
  ])
);

const CameraSchema = z
  .object({
    zoom: z.number(),
    x: z.number(),
    y: z.number(),
  })
  .strict();

export const SerializedCanvasSchema = z
  .object({
    version: z.literal(1),
    canvas: z
      .object({
        width: z.number().positive(),
        height: z.number().positive(),
        dpr: z.number().positive(),
      })
      .strict(),
    camera: CameraSchema.optional(),
    root: NodeSchema,
    files: z.array(ImageFileSchema).optional(),
    lastRetrieved: z.number().optional().transform((v) => (typeof v === "number" ? v : Date.now())),
  })
  .strict();

export type ParsedSerializedCanvas = z.infer<typeof SerializedCanvasSchema>;

export function parseSerializedCanvas(input: unknown): ParsedSerializedCanvas {
  const result = SerializedCanvasSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid canvas data: ${result.error.message}`);
  }
  return result.data;
}