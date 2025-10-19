import EventEmitter from "eventemitter3";
import { Renderable } from "shapes";

export class EventManager {
    _emitter: EventEmitter;
    isRootMove: boolean = true;
    impactedShapes: Renderable[] = [];

    constructor(emitter: EventEmitter) {
        this._emitter = emitter;
    }
    
}