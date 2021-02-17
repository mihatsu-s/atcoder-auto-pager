export function binarySearch<T>(
    compareFn: (a: T, b: T) => number,
    array: ReadonlyArray<T>,
    target: T
): number {
    let low = 0, high = array.length;
    if (compareFn(array[0], target) >= 0) return 0;
    while (high - low > 1) {
        const mid = (high + low) >> 1;
        if (compareFn(array[mid], target) >= 0) {
            high = mid;
        } else {
            low = mid;
        }
    }
    return high;
}
