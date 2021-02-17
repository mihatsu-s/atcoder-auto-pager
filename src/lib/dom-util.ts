function sleep(time: number) {
    return new Promise(resolve => {
        setTimeout(resolve, time);
    });
}

export async function asyncQuerySelector(selectors: string) {
    while (true) {
        const result = document.querySelector(selectors);
        if (result) return result;
        await sleep(200);
    }
}

export function waitForVueJsNextTick(): Promise<void> {
    return new Promise(resolve => {
        Vue.nextTick(resolve);
    });
}
