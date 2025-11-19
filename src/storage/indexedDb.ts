import { Canvas } from "../Canvas";
import { serializeCanvas, SerializedCanvas } from "../serializer";
import { CanvasStorage } from "./storage";
import { v4 as uuid } from 'uuid';
import Dexie, { type EntityTable } from "dexie";

const indexedDbVersion = 1;

interface CanvasDatabaseEntry {
    id: number;
    data: Blob;
}

export class CanvasDB extends Dexie {
    entry: EntityTable<CanvasDatabaseEntry, 'id'>

    constructor() {
        super('ReffyDB');

    }
}

export class IndexedDBStorage extends CanvasStorage {
    dbName = 'REFFY-STORE';

    private async openDb() {
        // return await openDB(
        //     this.dbName,
        //     indexedDbVersion,
        //     {
        //         upgrade(db) {
        //             db.createObjectStore('reffy');
        //         },
        //     }
        // );

        return 1;
    }

    updateDbName(newName: string): void {
        this.dbName = newName;
    }

    register(id?: string): void {
        this.id = id ?? uuid();
    }

    async write(canvas: Canvas) {
        if (!this.id) this.register();

        try {
            const db = await this.openDb();
            const canvasObject = serializeCanvas(canvas);
            const text = JSON.stringify(canvasObject, null, 2);
            const blob = new Blob([text], { type: 'application/json' });
    
            console.log(text);
    
            // return await db.put('reffy', text);
        } catch (err) {
            console.error(err);
        }
    }
    read(): SerializedCanvas {
        throw new Error("Method not implemented.");
    }
    delete(): void {
        throw new Error("Method not implemented.");
    }
}