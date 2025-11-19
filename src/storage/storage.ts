import { Canvas } from "../Canvas";
import { SerializedCanvas } from "../serializer";

export abstract class CanvasStorage {
    id: string;
    protected dbName: string;
    timeoutId: number | null;

    abstract updateDbName(newName: string): void;
    abstract register(id?: string): void;
    abstract write(canvas: Canvas): void;
    abstract read(): SerializedCanvas;
    abstract delete(): void;
}