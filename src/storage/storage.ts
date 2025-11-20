import { SerializedCanvas } from "serializer";

export interface FileStorageEntry {
    id: string;
    dataURL: string;
    mimetype: string;
    created: number;
    lastRetrieved: number;
}

export function createFileStorageEntry(id: string, data: string, mimetype: string) {
    return {
            id,
            dataURL: data,
            mimetype,
            created: Date.now(),
            lastRetrieved: Date.now(),
    }
}

export abstract class FileStorage {
    abstract write(id: string, data: string, mimetype: string): Promise<string>;
    abstract readAll(): Promise<FileStorageEntry[]>;
    abstract readPage(offset: number, limit: number): Promise<FileStorageEntry[]>;
    abstract read(id: string): Promise<FileStorageEntry>;
    abstract delete(id: string): Promise<FileStorageEntry>
    abstract update(newVersion: FileStorageEntry): Promise<FileStorageEntry>;
    abstract checkIfImageStored(url: string): Promise<boolean>;
}

export type CanvasStorageEntry = SerializedCanvas;

/**
 * Writes the canvas data into storage
 */
export abstract class CanvasStorage {
    abstract write(value: CanvasStorageEntry): Promise<void>;
    abstract read(): Promise<string>;
    abstract delete(): Promise<void>
    abstract update(value: CanvasStorageEntry): Promise<void>;
}