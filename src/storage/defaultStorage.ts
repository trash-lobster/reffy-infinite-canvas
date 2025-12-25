import "./dexie-primary-key.js";
import Dexie, { DexieConstructor, EntityTable } from "dexie";
import {
  ImageFileMetadata,
  FileStorage,
  CanvasStorage,
  CanvasStorageEntry,
  CanvasStorageData,
} from "./storage";
import { SerializedNode } from "../serializer";

const dbVersion2 = {
  files: "$$id, mimetype, created, lastRetrieved",
  canvases: "$$id, content",
};

const DB_LIMITS = {
  MAX_IMAGE_ENTRIES: 1000,
} as const;

type DexieConstructorWithUUID = DexieConstructor & {
  UUIDPrimaryKey: Function;
};

interface IndexDb extends Dexie {
  files: EntityTable<ImageFileMetadata, "id">;
  canvases: EntityTable<CanvasStorageData, "id">;
}

export class DefaultFileStorage extends FileStorage {
  private dbQueue = new DatabaseQueue();
  private dbPromise: Promise<IndexDb>;
  private cache = new Map<string | number, ImageFileMetadata>();
  private CACHE_LIMIT = 500;

  constructor() {
    super();
    this.dbQueue = new DatabaseQueue();
    this.dbPromise = this.initDb();
    this.write = this.write.bind(this);
    this.read = this.read.bind(this);
  }

  private async initDb(): Promise<IndexDb> {
    return handleQuotaError(async (): Promise<IndexDb> => {
      let db = new Dexie("InfiniteCanvas") as IndexDb;
      (Dexie as DexieConstructorWithUUID).UUIDPrimaryKey(db);
      db.version(2).stores(dbVersion2);
      await db.open();
      return db;
    });
  }

  private async getIndexDb(): Promise<IndexDb> {
    return this.dbPromise;
  }

  private setCache(id: string | number, entry: ImageFileMetadata) {
    this.cache.delete(id);
    this.cache.set(id, entry);

    if (this.cache.size > this.CACHE_LIMIT) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  private touchCache(id: string | number) {
    const val = this.cache.get(id);
    if (!val) return;

    this.cache.delete(id);
    this.cache.set(id, val);
  }

  /**
   * Writes to indexedDB
   * @param data
   * @param mimetype
   * @returns the file ID
   */
  async write(data: string): Promise<string | number> {
    const file: ImageFileMetadata = await ImageFileMetadata.create(data);
    const blob = dataUrlToBlob(file.dataURL);

    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<string | number> => {
        const db: IndexDb = await this.getIndexDb();

        return await db
          .transaction("rw", db.files, async () => {
            await checkImageLimit(db);

            const id = await db.files.add({
              id: file.id,
              blob,
              dataURL: file.dataURL,
              mimetype: file.mimetype,
              created: file.created,
              lastRetrieved: file.lastRetrieved,
            } as any);

            this.setCache(file.id, file);
            return id;
          })
          .catch((error) => {
            console.error("Failed to save image blob to local DB:", error);
            throw error;
          });
      }),
    );
  }

  async readAll(): Promise<ImageFileMetadata[]> {
    return handleQuotaError(async (): Promise<ImageFileMetadata[]> => {
      const db: IndexDb = await this.getIndexDb();

      const res = await db.files.toArray();
      res.forEach((r) => {
        this.setCache(r.id, r);
      });
      return res;
    });
  }

  async readPage(offset: number, limit: number): Promise<ImageFileMetadata[]> {
    return handleQuotaError(async (): Promise<ImageFileMetadata[]> => {
      const db: IndexDb = await this.getIndexDb();
      return await db.files.offset(offset).limit(limit).toArray();
    });
  }

  async read(id: string | number): Promise<ImageFileMetadata> {
    return handleQuotaError(async (): Promise<ImageFileMetadata> => {
      const db: IndexDb = await this.getIndexDb();

      if (this.cache.has(id)) {
        this.touchCache(id);
        return this.cache.get(id)!;
      }

      const entry = await db.files.get(id);

      if (!entry) return null;
      this.dbQueue
        .add(async () => {
          try {
            await db.files.update(id, { lastRetrieved: Date.now() });
          } catch (e) {
            console.error("Failed to update lastRetrieved", e);
          }
        })
        .catch(() => {});

      this.setCache(id, entry);
      return entry;
    });
  }

  async delete(id: string): Promise<ImageFileMetadata> {
    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<ImageFileMetadata> => {
        const db: IndexDb = await this.getIndexDb();

        const entry = await db
          .transaction("rw", db.files, async () => {
            const existing = await db.files.where("id").equals(id).first();
            if (existing) {
              await db.files.delete(existing.id);
            }
            return existing;
          })
          .catch((error) => {
            console.error("Failed to delete image blob from local DB:", error);
            throw error;
          });

        if (entry) this.cache.delete(entry.id);
        else this.cache.delete(id);

        return entry;
      }),
    );
  }

  async deleteAll(): Promise<void> {
    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<void> => {
        const db: IndexDb = await this.getIndexDb();

        await db
          .transaction("rw", db.files, async () => {
            await db.files.clear();
          })
          .catch((error) => {
            console.error("Failed to clear image blobs from local DB:", error);
            throw error;
          });

        this.cache.clear();
      }),
    );
  }

  async update(newVersion: ImageFileMetadata): Promise<ImageFileMetadata> {
    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<ImageFileMetadata> => {
        const db: IndexDb = await this.getIndexDb();

        await db.transaction("rw", db.files, async () => {
          await db.files.update(newVersion.id, {
            dataURL: newVersion.dataURL,
            mimetype: newVersion.mimetype,
            lastRetrieved: Date.now(),
          });
        });

        const updated = await db.files
          .where("id")
          .equals(newVersion.id)
          .first();

        if (updated) {
          this.setCache(updated.id, updated);
        }
        return updated;
      }),
    );
  }

  async checkIfImageStored(id: string): Promise<string | number | null> {
    return handleQuotaError(async (): Promise<string | number | null> => {
      const db: IndexDb = await this.getIndexDb();
      const entry = await db.files.where("id").equals(id).first();
      return entry ? entry.id : null;
    });
  }

  async removeUnusedImages(
    usedImageIds: string[],
  ): Promise<FileDeletionResult[]> {
    return this.dbQueue.add(async () => {
      const db: IndexDb = await this.getIndexDb();
      const unused = await db.files
        .filter((f) => !usedImageIds.includes(f.id.toString()))
        .toArray();
      const results = await Promise.all(
        unused.map(async (f) => {
          try {
            await db.files.delete(f.id);
            return { id: f.id, ok: true };
          } catch (err) {
            console.error("delete failed for", f.id, err);
            return { id: f.id, ok: false, error: err };
          }
        }),
      );
      return results;
    });
  }
}

export interface FileDeletionResult {
  id: string | number;
  ok: boolean;
  error?: string;
}

export class DefaultCanvasStorage extends CanvasStorage {
  private dbQueue = new DatabaseQueue();
  private dbPromise: Promise<IndexDb>;

  constructor() {
    super();
    this.dbQueue = new DatabaseQueue();
    this.dbPromise = this.initDb();
    this.write = this.write.bind(this);
    this.read = this.read.bind(this);
  }

  private async initDb(): Promise<IndexDb> {
    return handleQuotaError(async (): Promise<IndexDb> => {
      let db = new Dexie("InfiniteCanvas") as IndexDb;
      (Dexie as DexieConstructorWithUUID).UUIDPrimaryKey(db);
      db.version(2).stores(dbVersion2);
      await db.open();
      return db;
    });
  }

  private async getIndexDb(): Promise<IndexDb> {
    return this.dbPromise;
  }

  /**
   * Writes to indexedDB only if the key does not exist already. An error will be thrown if the entry already exists.
   * @param data
   * @param mimetype
   * @returns the file ID
   */
  async write(data: CanvasStorageEntry): Promise<string | number> {
    const canvas: CanvasStorageData = await CanvasStorageData.create(data);

    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<string | number> => {
        const db: IndexDb = await this.getIndexDb();

        return await db
          .transaction("rw", db.canvases, async () => {
            const exists = await db.canvases.get(canvas.id);
            if (exists) throw new Error(`Canvas "${canvas.id}" already exists`);
            const id = await db.canvases.add({
              id: canvas.id,
              content: canvas.content,
            } as any);
            return id;
          })
          .catch((error) => {
            console.error("Failed to save canvas data:", error);
            throw error;
          });
      }),
    );
  }

  async readAll(): Promise<CanvasStorageData[]> {
    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<CanvasStorageData[]> => {
        const db: IndexDb = await this.getIndexDb();

        const res = await db.canvases.toArray();
        return res;
      }),
    );
  }

  /**
   * @param id Passed in as plain text without the canvas identifier modifier
   */
  async read(id: string): Promise<CanvasStorageData> {
    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<CanvasStorageData> => {
        const db: IndexDb = await this.getIndexDb();

        try {
          const entry = await db.canvases.get(id);

          if (!entry) return null;

          return entry;
        } catch (err) {
          console.error("Read operation was not completed", err);
          throw err;
        }
      }),
    );
  }

  /**
   * @param id Passed in as plain text without the canvas identifier modifier
   */
  async delete(id: string): Promise<CanvasStorageData> {
    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<CanvasStorageData> => {
        const db: IndexDb = await this.getIndexDb();

        const entry = await db
          .transaction("rw", db.canvases, async () => {
            const existing = await db.canvases.where("id").equals(id).first();
            if (existing) {
              await db.canvases.delete(existing.id);
            }
            return existing;
          })
          .catch((error) => {
            console.error("Failed to delete canvas data from local DB:", error);
            throw error;
          });

        // if (entry) this.cache.delete(entry.id);
        // else this.cache.delete(id);

        return entry;
      }),
    );
  }

  async deleteAll(): Promise<void> {
    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<void> => {
        const db: IndexDb = await this.getIndexDb();

        await db
          .transaction("rw", db.canvases, async () => {
            await db.canvases.clear();
          })
          .catch((error) => {
            console.error(
              "Failed to clear all canvas data from local DB:",
              error,
            );
            throw error;
          });

        // this.cache.clear();
      }),
    );
  }

  /**
   * If an entry does not exist in the storage already, it will be added.
   */
  async update(newVersion: CanvasStorageEntry): Promise<CanvasStorageData> {
    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<CanvasStorageData> => {
        const canvas: CanvasStorageData =
          await CanvasStorageData.create(newVersion);
        const db: IndexDb = await this.getIndexDb();

        await db
          .transaction("rw", db.canvases, async () => {
            const existing = await db.canvases
              .where("id")
              .equals(canvas.id)
              .first();
            if (!existing) {
              await db.canvases.add({
                id: canvas.id,
                content: canvas.content,
              } as any);
              return;
            }
            await db.canvases.update(canvas.id, {
              content: canvas.content,
            });
          })
          .catch(() => {
            throw new CanvasStorageError(
              "CanvasStorage failed to update the canvas",
            );
          });

        const updated = await db.canvases.where("id").equals(canvas.id).first();

        return updated;
      }),
    );
  }

  /**
   * Both inputs should be the pure canvas name. Converting it to the canvas key is handled internally.
   */
  async changeCanvasKey(oldName: string, newName: string) {
    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<boolean> => {
        try {
          const db: IndexDb = await this.getIndexDb();

          return await db.transaction("rw", db.canvases, async () => {
            const entry = await db.canvases.where("id").equals(oldName).first();
            if (oldName === newName) return true;
            if (!entry) return false;

            const existingNew = await db.canvases.get(newName);
            if (existingNew)
              throw new Error(`Canvas "${newName}" already exists`);
            const content = entry.content;
            await db.canvases.add({
              id: newName,
              content,
            } as any);
            await db.canvases.delete(oldName);
            return true;
          });
        } catch (err) {
          console.error(err);
          return false;
        }
      }),
    );
  }

  async checkIfCanvasExistsByName(id: string): Promise<boolean> {
    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<boolean> => {
        const db: IndexDb = await this.getIndexDb();
        const entry = await db.canvases.where("id").equals(id).first();
        return entry !== null;
      }),
    );
  }

  async getAllUsedImagesId(): Promise<string[]> {
    return this.dbQueue.add(() =>
      handleQuotaError(async (): Promise<string[]> => {
        const db: IndexDb = await this.getIndexDb();
        const filesInUse = new Set<string>();
        const entries = await db.canvases.toArray();
        entries.forEach((f) => {
          const content = CanvasStorageData.parse(f.content);
          if (content && typeof content === "object" && "root" in content) {
            (content.root as SerializedNode).children.forEach((element) => {
              if ("fileId" in element) {
                filesInUse.add(element.fileId.toString());
              }
            });
          }
        });
        return Array.from(filesInUse);
      }),
    );
  }
}

class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

class DatabaseLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseLimitError";
  }
}

class CanvasStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanvasStorageError";
  }
}

class DatabaseQueue {
  private queue: Promise<any> = Promise.resolve();

  async add<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(() => operation());
    this.queue = result.catch((err) => {
      console.error("Database queue failed to complete this operation", err);
    });
    return result;
  }
}

const handleQuotaError = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      throw new QuotaExceededError(
        "Storage quota exceeded. Please free up space.",
      );
    }
    if (err instanceof Dexie.QuotaExceededError) {
      throw new QuotaExceededError(
        "Database quota exceeded. Please free up space.",
      );
    }
    throw err;
  }
};

async function checkImageLimit(db: IndexDb): Promise<void> {
  const count = await db.files.count();
  if (count >= DB_LIMITS.MAX_IMAGE_ENTRIES) {
    throw new DatabaseLimitError(
      `Cannot save image: limit of ${DB_LIMITS.MAX_IMAGE_ENTRIES} reached`,
    );
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const meta = parts[0];
  const base64 = parts[1];
  const mimeMatch = meta.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(base64);
  const len = binary.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8[i] = binary.charCodeAt(i);
  }
  return new Blob([u8], { type: mime });
}
