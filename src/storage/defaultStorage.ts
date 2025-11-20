import './dexie-primary-key.js';
import Dexie, { DexieConstructor, EntityTable } from "dexie";
import { ImageFileMetadata, FileStorage, CanvasStorage, CanvasStorageEntry } from "./storage";

const dbVersion1 = {
    files: '$$id, dataURL, mimetype, created, lastRetrieved',
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

    constructor() {
        super();
        this.dbQueue = new DatabaseQueue();
    }

    private async getIndexDb(): Promise<IndexDb> {
        return handleQuotaError(async (): Promise<IndexDb> => {
            return new Promise(async (resolve, reject) => {
                try {
                    let db = new Dexie('InfiniteCanvas') as IndexDb;
    
                    (Dexie as DexieConstructorWithUUID).UUIDPrimaryKey(db);
    
                    db.version(1).stores(dbVersion1);
    
                    await db.open();
                    resolve(db);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Writes to indexedDB
     * @param data 
     * @param mimetype 
     * @returns the file ID
     */
    async write(data: string): Promise<string | number> {
        const file: ImageFileMetadata = await ImageFileMetadata.create(data);

        return this.dbQueue.add(() =>
            handleQuotaError(async (): Promise<string | number> => {
                const db: IndexDb = await this.getIndexDb();

                return await db
                    .transaction('rw', db.files, async () => {
                        await checkImageLimit(db);

                        return await db.files.add({
                            id: file.id,
                            dataURL: file.dataURL,
                            mimetype: file.mimetype,
                            created: file.created,
                            lastRetrieved: file.lastRetrieved,
                        });
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
            await db.transaction('rw', db.files, async () => {
                await db.files.update(id, {
                    lastRetrieved: Date.now(),
                });
            });

            return await db.files.where('id').equals(id).first();
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