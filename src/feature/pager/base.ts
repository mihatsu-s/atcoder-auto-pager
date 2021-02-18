export abstract class Pager {

    constructor(
        readonly paginationFn: (page: number) => Promise<unknown>,
        readonly orderFn: (orderBy: string, desc?: boolean | null) => Promise<unknown>,
    ) {}

    abstract exec(
        text: string,
        paginationFn: (page: number) => Promise<unknown>,
    ): Promise<unknown>;

    convertTargetText<Args extends any[], Res>(fn: (...args: Args) => Res, ...args: Args): Res {
        try {
            return fn(...args);
        } catch (e) {
            throw new TargetTextConvertionError(e);
        }
    }
}

export class TargetTextConvertionError extends Error { }
