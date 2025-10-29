export enum BoundingBoxMode {
    ACTIVE,     // direct interaction allowed
    PASSIVE,    // when just display the rect but not the corner handles - no direct interaction allowed
}

export interface PositionData {
    x: number,
    y: number,
    width: number,
    height: number,
}