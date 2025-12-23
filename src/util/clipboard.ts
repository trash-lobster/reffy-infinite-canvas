import { convertToPNG, getWorldCoords } from ".";
import { Img } from "../shapes";
import { Canvas } from "Canvas";
import { CanvasHistory } from "history";
import { makeMultiAddChildCommand } from "../manager/SceneCommand";
import z from "zod";

interface InfiniteCanvasClipboardElement {
  src: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
}

const ClipboardElementSchema = z
  .object({
    src: z
      .string()
      .regex(
        /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+$/i,
        "Invalid image data URL",
      ),
    x: z.number(),
    y: z.number(),
    sx: z.number(),
    sy: z.number(),
  })
  .strict();

interface InfiniteCanvasClipboard {
  type: "infinite_canvas";
  elements: InfiniteCanvasClipboardElement[];
}

const ClipboardSchema = z
  .object({
    type: z.literal("infinite_canvas"),
    elements: z.array(ClipboardElementSchema).min(1),
  })
  .strict();

const acceptedPasteMimeType = ["image/", "text/plain"];

export const probablySupportsClipboardWriteText = () => {
  return "clipboard" in navigator && "writeText" in navigator.clipboard;
};

// the original copying method involved writing to clipboard API which can take a long time when writing multiple images
// opted for in canvas only copying, which is faster
export async function copy(selected: Img[], clipboardEvent?: ClipboardEvent) {
  const dataStored: InfiniteCanvasClipboard = {
    type: "infinite_canvas",
    elements: selected.map((img) => ({
      src: img.src,
      x: img.x,
      y: img.y,
      sx: img.sx,
      sy: img.sy,
    })),
  };

  const json = JSON.stringify(dataStored);
  
  if (probablySupportsClipboardWriteText()) {
    try {
      await navigator.clipboard.writeText(json);
      return;
    } catch (err) {
      console.error(err);
    }
  }
  
  try {
    if (clipboardEvent) {
      clipboardEvent.clipboardData?.setData("text/plain", json);
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
}

export async function paste(
  clientX: number,
  clientY: number,
  canvas: Canvas,
  history: CanvasHistory,
  isWorldCoord: boolean = true,
) {
  // check if there is anything from your clipboard to paste from
  const items = await navigator.clipboard.read();
  const types = items[0].types;
  
  const [wx, wy] = isWorldCoord
  ? [clientX, clientY]
  : getWorldCoords(clientX, clientY, canvas);
  
  for (const type of types) {
    const allowed = acceptedPasteMimeType.find((allowed) =>
      allowed.endsWith("/") ? type.startsWith(allowed) : type === allowed,
  );
  if (!allowed) continue;
  
  const blob = await items[0].getType(type);
  try {
    if (type === "text/plain") {
      const text = await blob.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON in clipboard");
      }
      const result = ClipboardSchema.safeParse(raw);
        if (!result.success) {
          console.error(result.error);
          return;
        }
        const data = result.data;
        if (data.elements.length === 0) return;

        let minX = Infinity,
          minY = Infinity;

        for (const el of data.elements) {
          if (el.x < minX) minX = el.x;
          if (el.y < minY) minY = el.y;
        }

        const images = await Promise.all(
          data.elements.map((element) =>
            canvas.addImageToCanvas(
              element.src,
              wx + element.x - minX,
              wy + element.y - minY,
              element.sx,
              element.sy,
            ),
          ),
        );

        history.push(makeMultiAddChildCommand(canvas, images));
        return;
      }
    } catch (err) {
      console.error("Failed to parse clipboard data", err);
      continue;
    }

    let base64: string | undefined;

    if (type.startsWith("image/svg")) {
      try {
        const svgText = await blob.text();
        base64 = await convertToPNG(
          `data:image/svg+xml;base64,${btoa(svgText)}`,
        );
      } catch (err) {
        console.error("SVG conversion failed", err);
        continue;
      }
    } else {
      try {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.error("Image read failed", err);
        continue;
      }
    }

    try {
      const img = await canvas.addImageToCanvas(base64!, wx, wy);
      history.push(makeMultiAddChildCommand(canvas, [img]));
      return;
    } catch (err) {
      console.error("Failed to add image to canvas", err);
      continue;
    }
  }
}
