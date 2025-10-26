export const sides = [
    'TOP',
    'BOTTOM',
    'LEFT',
    'RIGHT',
];

export const corners = [
    'TOPLEFT',
    'TOPRIGHT',
    'BOTTOMLEFT',
    'BOTTOMRIGHT',
]

export type BoundingBoxCollisionType = 
    | 'TOP'
    | 'BOTTOM'
    | 'LEFT'
    | 'RIGHT'
    | 'TOPRIGHT'
    | 'TOPLEFT'
    | 'BOTTOMRIGHT'
    | 'BOTTOMLEFT'
    | 'CENTER';

export const HANDLEPX = 8;
export const BORDERPX = 2;
