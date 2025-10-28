export function limitedCall(fn: Function, times: number) {
    let called = 0;
    return function (...args) {
        if (called < times) {
            fn(...args);
            called++;
        }
    }
}