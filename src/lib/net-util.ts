export class FetchResponseError extends Error {
    constructor(
        public res: Response
    ) {
        super();
    }
}


export async function fetchText(input: RequestInfo, init?: RequestInit) {
    const res = await fetch(input, init);
    if (res.status !== 200) {
        throw new FetchResponseError(res);
    }
    return await res.text();
}
