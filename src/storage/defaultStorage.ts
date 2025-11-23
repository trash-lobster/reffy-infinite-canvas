import './dexie-primary-key.js';
import Dexie, { DexieConstructor, EntityTable } from "dexie";
import { ImageFileMetadata, FileStorage, CanvasStorage, CanvasStorageEntry } from "./storage";

const dbVersion1 = {
    files: '$$id, mimetype, created, lastRetrieved',
}

const DB_LIMITS = {
    MAX_IMAGE_ENTRIES: 1000,
} as const;

type DexieConstructorWithUUID = DexieConstructor & {
    UUIDPrimaryKey: Function;
};

interface IndexDb extends Dexie {
    files: EntityTable<ImageFileMetadata, 'id'>;
}

export class DefaultIndexedDbStorage extends FileStorage {
    private dbQueue  = new DatabaseQueue();
    private dbPromise: Promise<IndexDb>;
    private cache = new Map<string | number, ImageFileMetadata>();
    private CACHE_LIMIT = 100;

    constructor() {
        super();
        this.dbQueue = new DatabaseQueue();
        this.dbPromise = this.initDb();
    }

    private async initDb(): Promise<IndexDb> {
        return handleQuotaError(async (): Promise<IndexDb> => {
            let db = new Dexie('InfiniteCanvas') as IndexDb;
            (Dexie as DexieConstructorWithUUID).UUIDPrimaryKey(db);
            db.version(1).stores(dbVersion1);
            await db.open();
            return db;
        });
    }

    private async getIndexDb(): Promise<IndexDb> {
        return this.dbPromise;
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
                    .transaction('rw', db.files, async () => {
                        await checkImageLimit(db);

                        return await db.files.add({
                            id: file.id,
                            blob,
                            dataURL: file.dataURL,
                            mimetype: file.mimetype,
                            created: file.created,
                            lastRetrieved: file.lastRetrieved,
                        } as any);
                    })
                    .catch((error) => {
                        console.error(
                            'Failed to save image blob to local DB:',
                            error,
                        );
                        throw error;
                    });
            }),
        );
    }

    async readAll(): Promise<ImageFileMetadata[]> {
        return handleQuotaError(async (): Promise<ImageFileMetadata[]> => {
            const db: IndexDb = await this.getIndexDb();
            return await db.files.toArray();
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
                return this.cache.get(id) as ImageFileMetadata;
            }

            const startNow = performance.now();
            const entry = await db.files.get(id);
            console.log(`Getting file took ${performance.now() - startNow}`);

            if (!entry) return null;
            this.dbQueue.add(async () => {
                try {
                    await db.files.update(id, { lastRetrieved: Date.now() });
                } catch (e) {
                    console.error('Failed to update lastRetrieved', e);
                }
            }).catch(() => {});

            this.cache.set(id, entry);
            if (this.cache.size > this.CACHE_LIMIT) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            return entry;
        });
    }

    async delete(id: string): Promise<ImageFileMetadata> {
        return this.dbQueue.add(() =>
            handleQuotaError(async (): Promise<ImageFileMetadata> => {
                const db: IndexDb = await this.getIndexDb();

                return await db
                    .transaction('rw', db.files, async () => {
                        const entry = await db.files.where('id').equals(id).first();
                        await db.files.delete(entry.id);
                        return entry;
                    })
                    .catch((error) => {
                        console.error(
                            'Failed to save image blob to local DB:',
                            error,
                        );
                        throw error;
                    });
            }),
        );
    }

    async update(newVersion: ImageFileMetadata): Promise<ImageFileMetadata> {
        return this.dbQueue.add(() =>
            handleQuotaError(async (): Promise<ImageFileMetadata> => {
                const db: IndexDb = await this.getIndexDb();

                await db.transaction('rw', db.files, async () => {
                    await db.files.update(newVersion.id, {
                        dataURL: newVersion.dataURL,
                        mimetype: newVersion.mimetype,
                        lastRetrieved: Date.now(),
                    });
                });

                const updated = await db.files.where('id').equals(newVersion.id).first();
                return updated;
            }),
        );
    }
    
    async checkIfImageStored(url: string): Promise<string | number | null> {
        return handleQuotaError(async (): Promise<string | number | null> => {
            const db: IndexDb = await this.getIndexDb();
            const entry = await db.files.where('dataURL').equals(url).first();
            return entry ? entry.id : null;
        });
    }
}

export class DefaultLocalStorage extends CanvasStorage {
    key: string = 'infinite_canvas';

    async write(value: CanvasStorageEntry): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                localStorage.setItem(this.key, JSON.stringify(value));
                resolve();
            } catch (err) {
                reject(err);
            }
        })
    }

    async read(): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                resolve(localStorage.getItem(this.key));
            } catch (err) {
                reject(err);
            }
        })
    }

    async delete(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                localStorage.removeItem(this.key);
                resolve();
            } catch (err) {
                reject(err);
            }
        })
    }

    async update(value: CanvasStorageEntry): Promise<void> {
        return this.write(value);
    }
}

class QuotaExceededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'QuotaExceededError';
    }
}

class DatabaseLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseLimitError';
    }
}

class DatabaseQueue {
    private queue: Promise<any> = Promise.resolve();

    async add<T>(operation: () => Promise<T>): Promise<T> {
        const result = this.queue.then(() => operation());
        this.queue = result.catch(() => {}); // Keep queue moving even on errors
        return result;
    }
}

const handleQuotaError = async <T>(
    operation: () => Promise<T>,
): Promise<T> => {
    try {
        return await operation();
    } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
            throw new QuotaExceededError(
                'Storage quota exceeded. Please free up space.',
            );
        }
        if (err instanceof Dexie.QuotaExceededError) {
            throw new QuotaExceededError(
                'Database quota exceeded. Please free up space.',
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
    const parts = dataUrl.split(',');
    const meta = parts[0];
    const base64 = parts[1];
    const mimeMatch = meta.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(base64);
    const len = binary.length;
    const u8 = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        u8[i] = binary.charCodeAt(i);
    }
    return new Blob([u8], { type: mime });
}