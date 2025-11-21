import {
    arraysEqual,
    isNumber,
    isObject,
    isBoolean,
    isFunction,
    isUndefined,
    isNil,
} from '../../../src/util/checks';

import { describe, it, expect } from 'vitest';

describe('checks utility functions', () => {
    it('arraysEqual should return true for same reference', () => {
        const arr = [1, 2, 3];
        expect(arraysEqual(arr, arr)).toBe(true);
    });

    it('arraysEqual should return true for equal arrays', () => {
        expect(arraysEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it('arraysEqual should return false for different arrays', () => {
        expect(arraysEqual([1, 2, 3], [3, 2, 1])).toBe(false);
        expect(arraysEqual([1, 2], [1, 2, 3])).toBe(false);
        expect(arraysEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it('arraysEqual should handle null/undefined', () => {
        expect(arraysEqual(null, [1, 2, 3])).toBe(false);
        expect(arraysEqual([1, 2, 3], null)).toBe(false);
        expect(arraysEqual(undefined, undefined)).toBe(false);
    });

    it('isNumber should work', () => {
        expect(isNumber(42)).toBe(true);
        expect(isNumber(-1.5)).toBe(true);
        expect(isNumber(NaN)).toBe(true);
        expect(isNumber('42')).toBe(false);
        expect(isNumber(null)).toBe(false);
    });

    it('isObject should work', () => {
        expect(isObject({})).toBe(true);
        expect(isObject([])).toBe(true);
        expect(isObject(new Date())).toBe(true);
        expect(isObject(null)).toBe(false);
        expect(isObject(42)).toBe(false);
    });

    it('isBoolean should work', () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
        expect(isBoolean(1)).toBe(false);
        expect(isBoolean(0)).toBe(false);
        expect(isBoolean('')).toBe(false);
        expect(isBoolean(null)).toBe(false);
    });

    it('isFunction should work', () => {
        expect(isFunction(() => {})).toBe(true);
        expect(isFunction(function () {})).toBe(true);
        expect(isFunction(42)).toBe(false);
    });

    it('isUndefined should work', () => {
        expect(isUndefined(undefined)).toBe(true);
        expect(isUndefined(null)).toBe(false);
        expect(isUndefined(0)).toBe(false);
    });

    it('isNil should work', () => {
        expect(isNil(undefined)).toBe(true);
        expect(isNil(null)).toBe(true);
        expect(isNil(0)).toBe(false);
        expect(isNil('')).toBe(false);
    });
});