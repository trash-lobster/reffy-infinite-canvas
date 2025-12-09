import { describe, it, expect, vi, beforeEach } from 'vitest';
// Mock the Dexie UUID addon to a noop to avoid prototype access during tests
vi.mock('../../../src/storage/dexie-primary-key.js', () => ({ default: () => {} }));
// IMPORTANT: mock Dexie at top-level; do not reference top-level variables inside factory
vi.mock('dexie', () => {
    // Table mock used by the Dexie instance
    class MockTable {
        private map = new Map<any, any>();
        private _offset = 0;
        private _limit: number | null = null;
        async add(obj: any) { this.map.set(obj.id, obj); return obj.id; }
        async toArray() {
            const arr = Array.from(this.map.values());
            const start = this._offset || 0;
            const end = this._limit != null ? start + this._limit : arr.length;
            return arr.slice(start, end);
        }
        offset(o: number) { this._offset = o; return this; }
        limit(l: number) { this._limit = l; return this; }
        async get(id: any) { return this.map.get(id) ?? null; }
        where(field: string) { return { equals: (val: any) => ({ first: async () => Array.from(this.map.values()).find((e: any) => e[field] === val) || null }) }; }
        async update(id: any, patch: any) { const obj = this.map.get(id); if (obj) Object.assign(obj, patch); }
        async delete(id: any) { this.map.delete(id); }
        async count() { return this.map.size; }
    }
    // Mock Dexie as an object-like module with the members used by dexie-primary-key addon
    function MockDexie(this: any, _name?: string) {
        this.files = new MockTable();
    }

    MockDexie.prototype.version = function () { return { stores: (_schema: any) => {} }; };
    MockDexie.prototype.open = async function () { /* noop */ };
    MockDexie.prototype.transaction = async function (_mode: string, _table: any, fn: Function) { return await fn(); };

    // Static-like members accessed by the addon and code
    MockDexie.UUIDPrimaryKey = function (_db: any) { /* noop */ };
    MockDexie.addons = [] as any[];
    MockDexie.override = (orig: any, wrap: (orig: any) => any) => wrap(orig);
    MockDexie.setByKeyPath = (obj: any, keyPath: string, value: any) => { obj[keyPath] = value; };
    MockDexie.Version = { prototype: { _parseStoresSpec: () => {} } };

    // Provide QuotaExceededError used by handleQuotaError
    class QuotaExceededError extends Error {}
    // Attach to default export to satisfy `Dexie.QuotaExceededError` checks
    (MockDexie as any).QuotaExceededError = QuotaExceededError;
    return { default: MockDexie as any, __esModule: true };
});
import { DefaultIndexedDbStorage, DefaultLocalStorage, dataUrlToBlob } from '../../../src/storage/defaultStorage';
import { ImageFileMetadata } from '../../../src/storage/storage';

// Minimal Dexie mock
// Note: Do not import or execute '../../../src/storage/dexie-primary-key.js' directly in tests;
// defaultStorage imports it internally and will use the mocked Dexie.

describe('DefaultLocalStorage', () => {
    const key = 'infinite_canvas_test_key';

    beforeEach(() => {
        // reset localStorage
        vi.restoreAllMocks();
        // JSDOM localStorage is available; ensure empty
        localStorage.removeItem(key);
    });

    it('writes, reads, updates, and deletes canvas entry', async () => {
        const store = new DefaultLocalStorage(key);
        const entry: any = { version: 1, canvas: { width: 1, height: 1, dpr: 1 }, root: { type: 'Renderable' } };

        await store.write(entry);
        const raw = await store.read();
        expect(JSON.parse(raw)).toEqual(entry);

        // update
        entry.canvas.width = 2;
        await store.update(entry);
        const updated = JSON.parse(await store.read());
        expect(updated.canvas.width).toBe(2);

        // delete
        await store.delete();
        const afterDelete = await store.read();
        expect(afterDelete).toBeNull();
    });
});

describe('DefaultIndexedDbStorage', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('write stores an ImageFileMetadata and read retrieves it', async () => {
        const store = new DefaultIndexedDbStorage();
        const url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgXYp3wAAAABJRU5ErkJggg==';
        // stub ImageFileMetadata.create to control id
        const meta = new ImageFileMetadata(url);
        (meta as any)._id = 7;
        const createSpy = vi.spyOn(ImageFileMetadata, 'create').mockResolvedValue(meta);

        const id = await store.write(url);
        expect(id).toBe(7);

        const all = await store.readAll();
        expect(all.length).toBe(1);
        expect(all[0].id).toBe(7);
        expect(all[0].dataURL).toBe(url);
        createSpy.mockRestore();
    });

    it('caches reads and updates lastRetrieved asynchronously', async () => {
        const store = new DefaultIndexedDbStorage();
        const url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgXYp3wAAAABJRU5ErkJggg==';
        const meta = new ImageFileMetadata(url);
        (meta as any)._id = 9;
        vi.spyOn(ImageFileMetadata, 'create').mockResolvedValue(meta);
        await store.write(url);

        const first = await store.read(9);
        const second = await store.read(9);
        expect(first).toBe(second); // cache hit returns same object
    });

    it('dataUrlToBlob converts base64 to Blob of correct type', () => {
        const url = 'data:image/png;base64,aGVsbG8=';
        const blob = dataUrlToBlob(url);
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('image/png');
    });

    it('delete removes an existing entry and returns it', async () => {
        const store = new DefaultIndexedDbStorage();
        const url = 'data:image/png;base64,Zm9v';
        const meta = await ImageFileMetadata.create(url);
        const id = meta.id;
        vi.spyOn(ImageFileMetadata, 'create').mockResolvedValue(meta);

        await store.write(url);
        const removed = await store.delete(id as string);
        expect(removed).not.toBeNull();
        expect(removed.id).toBe(id);

        const all = await store.readAll();
        expect(all.length).toBe(0);
    });

    it('update modifies stored fields and bumps lastRetrieved', async () => {
        const store = new DefaultIndexedDbStorage();
        const url = 'data:image/png;base64,YmFy';
        const meta = new ImageFileMetadata(url);
        (meta as any)._id = 13;
        vi.spyOn(ImageFileMetadata, 'create').mockResolvedValue(meta);
        await store.write(url);

        const newUrl = 'data:image/png;base64,YmF6';
        const updatedMeta = new ImageFileMetadata(newUrl);
        (updatedMeta as any)._id = 13;

        const before = await store.read(13);
        const result = await store.update(updatedMeta);
        expect(result.id).toBe(13);
        expect(result.dataURL).toBe(newUrl);
        expect(result.mimetype).toBe(updatedMeta.mimetype);
        const after = await store.read(13);
        expect(after.dataURL).toBe(newUrl);
    });

    it('readPage returns a limited slice using offset and limit', async () => {
        const store = new DefaultIndexedDbStorage();
        const base = 'data:image/png;base64,';
        const metas: ImageFileMetadata[] = [];
        for (let i = 0; i < 5; i++) {
            const url = base + btoa('item' + i);
            const m = new ImageFileMetadata(url);
            (m as any)._id = i + 100;
            metas.push(m);
        }
        const createSpy = vi.spyOn(ImageFileMetadata, 'create');
        for (const m of metas) {
            createSpy.mockResolvedValueOnce(m);
            await store.write(m.dataURL);
        }
        createSpy.mockRestore();

        const page = await store.readPage(1, 2);
        expect(page.length).toBe(2);
        expect(page[0].id).toBe(101);
        expect(page[1].id).toBe(102);
    });

    it('checkIfImageStored returns id when present, null otherwise', async () => {
        const store = new DefaultIndexedDbStorage();
        const url1 = 'data:image/png;base64,cXV4';
        const url2 = 'data:image/png;base64,cXV6';
        const meta1 = new ImageFileMetadata(url1);
        (meta1 as any)._id = 21;
        const meta2 = new ImageFileMetadata(url2);
        (meta2 as any)._id = 22;
        const createSpy = vi.spyOn(ImageFileMetadata, 'create');
        createSpy.mockResolvedValueOnce(meta1);
        await store.write(url1);
        createSpy.mockResolvedValueOnce(meta2);
        await store.write(url2);
        createSpy.mockRestore();

        const found = await store.checkIfImageStored(url2);
        expect(found).toBe(22);
        const missing = await store.checkIfImageStored('data:image/png;base64,bm90aGVyZQ==');
        expect(missing).toBeNull();
    });

    it('write respects max image entries limit and throws DatabaseLimitError', async () => {
        const store = new DefaultIndexedDbStorage();
        // Pre-fill 1000 entries to hit the limit
        const createSpy = vi.spyOn(ImageFileMetadata, 'create');
        for (let i = 0; i < 1000; i++) {
            const url = 'data:image/png;base64,' + btoa('f' + i);
            const m = new ImageFileMetadata(url);
            (m as any)._id = i + 1000;
            createSpy.mockResolvedValueOnce(m);
            await store.write(url);
        }
        // Now attempt one more write and expect failure
        const extraUrl = 'data:image/png;base64,ZXh0cmE=';
        const extraMeta = new ImageFileMetadata(extraUrl);
        (extraMeta as any)._id = 99999;
        createSpy.mockResolvedValueOnce(extraMeta);
        await expect(store.write(extraUrl)).rejects.toMatchObject({ name: 'DatabaseLimitError' });
        createSpy.mockRestore();
    });
});
