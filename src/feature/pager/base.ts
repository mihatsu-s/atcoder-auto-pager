export abstract class Pager {
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
