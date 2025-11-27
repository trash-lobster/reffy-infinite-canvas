export function arraysEqual(a, b) {
    if (a == undefined || b == undefined) return false;
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export const isNumber = (a): a is number => typeof a === 'number';
export const isObject = (a): a is object => a instanceof Object;
export const isBoolean = (arg): arg is boolean => arg === !!arg;
export const isFunction = (val): val is Function => typeof val === 'function';
export const isUndefined = (val): val is undefined => val === undefined;
export const isNil = (val): val is null | undefined => val == null;

export const sameSign = (a: number, b: number) => Math.sign(a) === Math.sign(b);

export const normalizeSign = (v: number, EPS: number) => {
    if (Math.abs(v) < EPS) return 0;
    return Math.sign(v);
};

export const willFlip = (current: number, factor: number, EPS: number) => {
    const next = current * factor;
    return normalizeSign(current, EPS) !== normalizeSign(next, EPS);
};