export const sides = ["TOP", "BOTTOM", "LEFT", "RIGHT"];

export const corners = ["TOPLEFT", "TOPRIGHT", "BOTTOMLEFT", "BOTTOMRIGHT"];

export type BoundingBoxCollisionType =
  | "TOP"
  | "BOTTOM"
  | "LEFT"
  | "RIGHT"
  | "TOPRIGHT"
  | "TOPLEFT"
  | "BOTTOMRIGHT"
  | "BOTTOMLEFT"
  | "CENTER";

type CornerType = "TOPLEFT" | "TOPRIGHT" | "BOTTOMLEFT" | "BOTTOMRIGHT";

export const cornerMap: Record<CornerType, CornerType> = {
  TOPLEFT: "TOPRIGHT",
  TOPRIGHT: "TOPLEFT",
  BOTTOMLEFT: "BOTTOMRIGHT",
  BOTTOMRIGHT: "BOTTOMLEFT",
};

export function oppositeCorner(
  c: BoundingBoxCollisionType,
): BoundingBoxCollisionType {
  if (cornerMap[c]) return cornerMap[c];
  return c;
}

export const HANDLEPX = 8;
export const BORDERPX = 2;
