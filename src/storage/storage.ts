import { SerializedCanvas } from "serializer";

// export interface FileStorageEntry {
//     id: string;
//     dataURL: string;
//     mimetype: string;
//     created: number;
//     lastRetrieved: number;
// }

export class FileStorageEntry {
    private _id: string;
    private _dataURL: string;
    private _mimetype: string;
    private _created: number;
    private _lastRetrieved: number;

    private _touch() {
        this._lastRetrieved = Date.now();
    }

    get id() {
        this._touch();
        return this.id;
    }

    get dataURL() {
        this._touch();
        return this._dataURL;
    }

    get mimetype() {
        this._touch();
        return this._mimetype;
    }

    get created() {
        this._touch();
        return this._created;
    }

    get lastRetrieved() {
        this._touch();
        return this._lastRetrieved;
    }

    constructor(id: string, dataURL: string, mimetype: string) {
        this._id = id;
        this._dataURL = dataURL;
        this._mimetype = mimetype;
        this._created = Date.now();
        this._lastRetrieved = Date.now();
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