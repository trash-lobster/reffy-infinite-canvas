export class AABB {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    // matrix: number[];

    constructor(
        minX: number,
        minY: number,
        maxX: number,
        maxY: number,
    ) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    getArea() {
        return (this.maxY - this.minY) * (this.maxX - this.minX);
    }
    
    isEmpty() {
        return this.minX > this.maxX || this.minY > this.maxY;
    }

    static isColliding(a:AABB, b: AABB): boolean {
        return (
            a.minX <= b.maxX &&
            a.maxX >= b.minX &&
            a.minY <= b.maxY &&
            a.maxY >= b.minY
        );
    }
}