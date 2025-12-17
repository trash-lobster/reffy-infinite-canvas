import { SerializedCanvas } from "serializer";
import { getMimeType, hashStringToId } from "../util";

export class ImageFileMetadata {
  private _id: string | number;
  private _dataURL: string;
  private _mimetype: string;
  private _created: number;
  private _lastRetrieved: number;

  private _touch() {
    this._lastRetrieved = Date.now();
  }

  get id() {
    this._touch();
    return this._id;
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
    return this._lastRetrieved;
  }

  constructor(dataURL: string) {
    this._dataURL = dataURL;
    this._mimetype = getMimeType(dataURL);
    this._created = Date.now();
    this._lastRetrieved = Date.now();
  }

  static async create(dataURL: string): Promise<ImageFileMetadata> {
    const entry = new ImageFileMetadata(dataURL);
    entry._id = await hashStringToId(dataURL);
    return entry;
  }
}

export abstract class FileStorage {
  abstract write(data: string): Promise<string | number>;
  abstract readAll(): Promise<ImageFileMetadata[]>;
  abstract readPage(
    offset: number,
    limit: number,
  ): Promise<ImageFileMetadata[]>;
  abstract read(id: string): Promise<ImageFileMetadata>;
  abstract delete(id: string): Promise<ImageFileMetadata>;
  abstract deleteAll(): Promise<void>;
  abstract update(newVersion: ImageFileMetadata): Promise<ImageFileMetadata>;
  abstract checkIfImageStored(id: string): Promise<string | number | null>;
}

export type CanvasStorageEntry = SerializedCanvas;

/**
 * Writes the canvas data into storage
 */
export abstract class CanvasStorage {
  abstract write(value: CanvasStorageEntry): Promise<void>;
  abstract read(): Promise<string>;
  abstract delete(): Promise<void>;
  abstract update(value: CanvasStorageEntry): Promise<void>;
  abstract changeCanvasKey(oldKey: string, newKey: string): Promise<void>;
}
