export enum BoundingBoxMode {
    ACTIVE,     // direct interaction allowed
    PASSIVE,    // when just display the rect but not the corner handles - no direct interaction allowed
}

export interface Point {
    x: number,
    y: number,
}

export interface PositionData extends Point {
    width: number,
    height: number,
}