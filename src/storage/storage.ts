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

export type CanvasStorageEntry = {name: string} & SerializedCanvas;

export class CanvasStorageData {
  private _id: string;
  private _content: string; // the file content has to be saved as a json string - saving it as an object leads to circular reference in Dexie

  // writing updates should lead to replacement of the content string value altogether
  private _touch() {
    const entry: SerializedCanvas = JSON.parse(this._content) as SerializedCanvas;
    entry.lastRetrieved = Date.now();
    this._content = JSON.stringify(entry);
    return entry;
  }

  get id() { 
    this._touch();
    return this._id; 
  }

  get content() {
    this._touch();
    return this._content;
  }

  constructor(entry: SerializedCanvas) {
    // serialize the entry into string
    entry.lastRetrieved = Date.now();
    this._content = JSON.stringify(entry);
  }

  static async create(entry: CanvasStorageEntry): Promise<CanvasStorageData> {
    const data = new CanvasStorageData(entry);
    data._id = entry.name;
    return data;
  }
}

/**
 * Writes the canvas data into storage
 */
export abstract class CanvasStorage {
  abstract write(value: CanvasStorageEntry): Promise<string | number>;
  abstract read(name: string): Promise<CanvasStorageData>;
  abstract readAll(): Promise<CanvasStorageData[]>;
  abstract delete(name: string): Promise<CanvasStorageData>;
  abstract deleteAll(): Promise<void>;
  abstract update(newVersion: CanvasStorageEntry): Promise<CanvasStorageData>;
  abstract changeCanvasKey(oldName: string, newName: string): Promise<boolean>;
  abstract checkIfCanvasExistsByName(id: string): Promise<boolean>;
}
