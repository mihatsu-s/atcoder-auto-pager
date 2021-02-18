import { Pager } from "./base";
import { binarySearch } from "../../lib/math-util";

export class ResultsOrderPager extends Pager {

    constructor(
        readonly paginationFn: (page: number) => Promise<unknown>,
        readonly orderFn: (orderBy: string, desc?: boolean | null) => Promise<unknown>,
        readonly orderBy: string,
        readonly textToOrderingTarget: (text: string, desc: boolean) => AtCoderResultsEntry,
    ) {
        super(paginationFn, orderFn);
    }


    async exec(
        text: string,
        paginationFn: (page: number) => Promise<unknown>,
    ) {

        const target = this.convertTargetText(this.textToOrderingTarget, text, vueResults.desc);

        this.orderFn(this.orderBy);  // Do not wait for DOM updated

        const array = vueResults.orderedResults;
        const index = Math.min(
            binarySearch(vueResults.comp, array, target),
            array.length - 1
        );
        await paginationFn(Math.floor(index / vueResults.perPage) + 1);

    }

}
