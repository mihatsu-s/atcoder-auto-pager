// Compare two values (or array) in lexicographic order

export const equalToAll = Symbol("equalToAll");

export type singleComparable = number | string | typeof equalToAll;
export type Comparable = singleComparable | (singleComparable)[];

export function lt(a: Comparable, b: Comparable) {
    if (typeof a !== "object") a = [a];
    if (typeof b !== "object") b = [b];
    const al = a.length, bl = b.length;
    for (let i = 0, imax = Math.max(al, bl); i < imax; ++i) {
        if (i >= al) return false;
        if (i >= bl) return true;
        const x = a[i], y = b[i];
        if (x !== equalToAll && y !== equalToAll) {
            if (x < y) return true;
            if (x > y) return false;
        }
    }
    return false;
}

export function gt(a: Comparable, b: Comparable) {
    return lt(b, a);
}

export function le(a: Comparable, b: Comparable) {
    return !gt(a, b);
}

export function ge(a: Comparable, b: Comparable) {
    return !lt(a, b);
}
