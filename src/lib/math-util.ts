export function binarySearch<T>(
    array: ReadonlyArray<T>,
    condition: ((a: T) => boolean)
): number

export function binarySearch<T>(
    array: ReadonlyArray<T>,
    compareFn: ((a: T, b: T) => number),
    target: T
): number

export function binarySearch<T>(
    array: ReadonlyArray<T>,
    compareFn: ((a: T, b: T) => number) | ((a: T) => boolean),
    target?: T
): number {

    const test = arguments.length >= 3 ?
        (n: number) => (compareFn as ((a: T, b: T) => number))(array[n], target!) >= 0 :
        (n: number) => (compareFn as ((a: T) => boolean))(array[n]);
    
    let low = 0, high = array.length;
    if (test(0)) return 0;
    while (high - low > 1) {
        const mid = (high + low) >> 1;
        if (test(mid)) {
            high = mid;
        } else {
            low = mid;
        }
    }
    return high;
}


export function linearPrediction(x1: number, y1: number, x2: number, y2: number, x: number) {
    return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
}
