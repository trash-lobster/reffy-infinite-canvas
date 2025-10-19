import EventEmitter from "eventemitter3";
import { Shape } from "shapes";

export class EventManager {
    _emitter: EventEmitter;
    isRootMove: boolean = true;
    private _impactedShapes: Shape[] = [];

    constructor(emitter: EventEmitter) {
        this._emitter = emitter;
    }
    
    get impactedShapes() {
        return this._impactedShapes;
    }

    resetImpactedShapes() {
        this._impactedShapes = [];
    }

    addToImpacted(shape: Shape) {
        this._impactedShapes.push(shape);
    }
}