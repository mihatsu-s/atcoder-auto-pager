export function observeProperties<T extends object, K extends keyof T>(
    obj: T,
    propertyNames: K[],
    callback: Function,
    interval = 100
) {
    function getValues() {
        return propertyNames.map(key => obj[key]);
    }
    function arrayEquals(a: any[], b: any[]) {
        if (a.length !== b.length) return false;
        for (let i = 0, imax = a.length; i < imax; ++i){
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    let previousValue = getValues();
    setInterval(() => {
        const currentValue = getValues();
        if (!arrayEquals(currentValue, previousValue)) {
            callback();
            previousValue = currentValue;
        }
    }, interval);
}
