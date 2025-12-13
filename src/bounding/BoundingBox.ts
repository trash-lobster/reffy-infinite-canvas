import {
  BASE_BLUE,
  LIGHT_BLUE,
  BORDERPX,
  HANDLEPX,
  corners,
  sides,
  BoundingBoxCollisionType,
  applyMatrixToPoint,
  getScalesFromMatrix,
  isScalePositive,
  normalizeSign,
  willFlip,
} from "../util";
import { Rect } from "../shapes/Rect";
import { Shape } from "../shapes/Shape";
import { BoundingBoxMode } from "./type";
import { FlipDirection } from "../manager";

// different from multi bounding box, the corners and handles are separated here because they need to be individually toggled
export class BoundingBox {
  target: Shape;
  width: number;
  height: number;
  sides: Map<string, Rect> = new Map();
  corners: Map<string, Rect> = new Map();
  borderSize: number = 0;
  boxSize: number = 0;
  mode: BoundingBoxMode = BoundingBoxMode.ACTIVE;

  constructor(target: Shape, mode?: BoundingBoxMode) {
    this.target = target;
    this.setDimension();
    this.mode = mode ?? BoundingBoxMode.ACTIVE;
    this.borderSize = BORDERPX;
    this.boxSize = HANDLEPX / 2;

    this.addSides();

    if (this.mode === BoundingBoxMode.ACTIVE) {
      this.addCorners();
    }
  }

  private setDimension() {
    const edge = this.target.getEdge();
    this.width = edge.maxX - edge.minX;
    this.height = edge.maxY - edge.minY;
  }

  private getSidesInScreenSpace(type: string, matrix?: number[]) {
    const [scaleX, scaleY] = matrix ? getScalesFromMatrix(matrix) : [1, 1];
    const { width, height, borderSize } = this;
    const [x, y] = applyMatrixToPoint(matrix);
    const [signX, signY] = isScalePositive(matrix);

    return {
      TOP: {
        x: signX > 0 ? x : x - width * scaleX,
        y,
        width: width * scaleX,
        height: borderSize,
      },
      BOTTOM: {
        x: signX > 0 ? x : x - width * scaleX,
        y: y + height * scaleY * signY,
        width: width * scaleX,
        height: borderSize,
      },
      LEFT: {
        x,
        y: signY > 0 ? y : y - height * scaleY,
        width: borderSize,
        height: height * scaleY,
      },
      RIGHT: {
        x: x + width * scaleX * signX,
        y: signY > 0 ? y : y - height * scaleY,
        width: borderSize,
        height: height * scaleY,
      },
    }[type];
  }

  private getCornersInScreenSpace(type: string, matrix: number[]) {
    const [scaleX, scaleY] = matrix ? getScalesFromMatrix(matrix) : [1, 1];
    const { width, height, boxSize } = this;
    const [x, y] = applyMatrixToPoint(matrix);
    const [signX, signY] = isScalePositive(matrix);

    return {
      TOPLEFT: {
        x: x - boxSize,
        y: y - boxSize,
        width: boxSize * 2,
        height: boxSize * 2,
      },
      TOPRIGHT: {
        x: x - boxSize + width * scaleX * signX,
        y: y - boxSize,
        width: boxSize * 2,
        height: boxSize * 2,
      },
      BOTTOMLEFT: {
        x: x - boxSize,
        y: y - boxSize + height * scaleY * signY,
        width: boxSize * 2,
        height: boxSize * 2,
      },
      BOTTOMRIGHT: {
        x: x - boxSize + width * scaleX * signX,
        y: y - boxSize + height * scaleY * signY,
        width: boxSize * 2,
        height: boxSize * 2,
      },
    }[type];
  }

  setPassive() {
    this.mode = BoundingBoxMode.PASSIVE;
    this.removeCorners();
  }

  setActive() {
    this.mode = BoundingBoxMode.ACTIVE;
    this.addCorners();
  }

  getPositions(): number[] {
    return this.target.getPositions() as number[];
  }

  /**
   * x and y should be world position
   */
  hitTest(
    wx: number,
    wy: number,
    worldMatrix: number[],
  ): BoundingBoxCollisionType | null {
    if (this.mode === BoundingBoxMode.PASSIVE) return;

    const [scaleX, scaleY] = getScalesFromMatrix(this.target.worldMatrix);
    const [signX, signY] = isScalePositive(this.target.worldMatrix);

    // converted to screen space
    const [hx, hy] = applyMatrixToPoint(worldMatrix, wx, wy);

    // ths hit margin should be in screen size
    const HIT_MARGIN = 4;

    for (const type of corners) {
      const corner = this.getCornersInScreenSpace(
        type,
        this.target.worldMatrix,
      );
      if (
        hx >= corner.x - HIT_MARGIN &&
        hx <= corner.x + corner.width + HIT_MARGIN &&
        hy >= corner.y - HIT_MARGIN &&
        hy <= corner.y + corner.height + HIT_MARGIN
      ) {
        return type as BoundingBoxCollisionType;
      }
    }

    for (const type of sides) {
      const side = this.getSidesInScreenSpace(type, this.target.worldMatrix);
      if (
        hx >= side.x - HIT_MARGIN &&
        hx <= side.x + side.width + HIT_MARGIN &&
        hy >= side.y - HIT_MARGIN &&
        hy <= side.y + side.height + HIT_MARGIN
      ) {
        return type as BoundingBoxCollisionType;
      }
    }

    const [x, y] = applyMatrixToPoint(this.target.worldMatrix);

    const w = this.width * scaleX * signX;
    const h = this.height * scaleY * signY;

    const minX = Math.min(x, x + w);
    const maxX = Math.max(x, x + w);
    const minY = Math.min(y, y + h);
    const maxY = Math.max(y, y + h);

    if (hx >= minX && hx <= maxX && hy >= minY && hy <= maxY) {
      return "CENTER";
    }
  }

  update() {
    this.updateSides();
    this.updateCorners();
  }

  render(gl: WebGLRenderingContext, program: WebGLProgram): void {
    this.update();

    for (const [key, handle] of this.sides.entries()) {
      handle.render(gl, program);
    }

    for (const [key, corner] of this.corners.entries()) {
      corner.render(gl, program);
    }
  }

  destroy() {
    for (const [_, handle] of this.sides.entries()) {
      handle.destroy();
    }

    for (const [key, corner] of this.corners.entries()) {
      corner.destroy();
    }
  }

  move(dx: number, dy: number) {
    this.target.updateTranslation(dx, dy);
  }

  resize(dx: number, dy: number, direction: BoundingBoxCollisionType) {
    if (this.target instanceof Rect) {
      const baseW = Math.abs(this.width);
      const baseH = Math.abs(this.height);

      const aspectRatio = baseW / baseH;

      // Use the shape's local scale (ignore camera/view)
      const curSX = this.target.sx;
      const curSY = this.target.sy;

      const EPS = 1e-6;

      // Current effective world sizes (clamped away from 0 to avoid division issue)
      const prevWorldW =
        Math.abs(baseW * curSX) < EPS
          ? EPS * normalizeSign(baseW * curSX || 1, EPS)
          : baseW * curSX;
      const prevWorldH =
        Math.abs(baseH * curSY) < EPS
          ? EPS * normalizeSign(baseH * curSY || 1, EPS)
          : baseH * curSY;

      const changeInXScale = dx / prevWorldW;
      const changeInYScale = dy / prevWorldH;

      const min = EPS;
      const factor =
        direction === "LEFT" ||
        direction === "BOTTOMLEFT" ||
        direction === "TOPLEFT"
          ? 1 - changeInXScale
          : direction === "RIGHT" ||
              direction === "BOTTOMRIGHT" ||
              direction === "TOPRIGHT"
            ? 1 + changeInXScale
            : direction === "TOP"
              ? 1 - changeInYScale
              : 1 + changeInYScale;

      if (willFlip(curSX, factor, min) || willFlip(curSY, factor, min)) return;
      const nextW = baseW * curSX * factor;
      const nextH = baseH * curSY * factor;
      if (Math.abs(nextW) < min || Math.abs(nextH) < min) return;

      this.target.updateScale(factor, factor);

      if (direction === "LEFT") {
        const anchor = baseH * curSY;
        const newOrigin = baseH * this.target.sy;
        this.target.updateTranslation(dx, (anchor - newOrigin) / 2);
      } else if (direction === "RIGHT") {
        const anchor = baseH * curSY;
        const newOrigin = baseH * this.target.sy;
        this.target.updateTranslation(0, (anchor - newOrigin) / 2);
      } else if (direction === "TOP") {
        const anchor = baseW * curSX;
        const newOrigin = baseW * this.target.sx;
        this.target.updateTranslation((anchor - newOrigin) / 2, dy);
      } else if (direction === "BOTTOM") {
        const anchor = baseW * curSX;
        const newOrigin = baseW * this.target.sx;
        this.target.updateTranslation((anchor - newOrigin) / 2, 0);
      } else if (direction === "BOTTOMLEFT") {
        this.target.updateTranslation(dx, 0);
      } else if (direction === "TOPLEFT") {
        this.target.updateTranslation(
          dx,
          (dx / aspectRatio) * Math.sign(this.target.sx),
        );
      } else if (direction === "TOPRIGHT") {
        this.target.updateTranslation(
          0,
          (-dx / aspectRatio) * Math.sign(this.target.sx),
        );
      }
    }
  }

  // a reset method to reset the scale
  reset() {
    this.target.setScale(1, 1);
  }

  flip(direction: FlipDirection) {
    const { x, y, sx, sy } = this.target;
    direction === "vertical"
      ? this.target.flipVertical(this.height)
      : this.target.flipHorizontal(this.width);

    return {
      ref: this.target,
      start: { x, y, sx, sy },
      end: {
        x: this.target.x,
        y: this.target.y,
        sx: this.target.sx,
        sy: this.target.sy,
      },
    };
  }

  private addCorners() {
    for (const type of corners) {
      const r = new Rect(
        this.getCornersInScreenSpace(type, this.target.worldMatrix),
      );
      r.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
      this.corners.set(type, r);
    }
  }

  private removeCorners() {
    this.corners.clear();
  }

  private updateCorners() {
    for (const type of corners) {
      const config = this.getCornersInScreenSpace(
        type,
        this.target.worldMatrix,
      );
      const corner = this.corners.get(type);

      if (corner) {
        corner.setTranslation(config.x, config.y);
        corner.width = config.width;
        corner.height = config.height;
        corner.color =
          this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
      }
    }
  }

  private addSides() {
    for (const type of sides) {
      const r = new Rect(
        this.getSidesInScreenSpace(type, this.target.worldMatrix),
      );
      r.color = this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
      this.sides.set(type, r);
    }
  }

  private updateSides() {
    for (const type of sides) {
      const config = this.getSidesInScreenSpace(type, this.target.worldMatrix);
      const side = this.sides.get(type);

      // only scale the side that should change, e.g. if it grows horizontally, scale only the width with scale and not height
      if (side) {
        side.setTranslation(config.x, config.y);
        side.width = config.width;
        side.height = config.height;
        side.color =
          this.mode === BoundingBoxMode.ACTIVE ? BASE_BLUE : LIGHT_BLUE;
      }
    }
  }
}
