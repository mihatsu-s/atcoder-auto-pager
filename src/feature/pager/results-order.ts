import { Pager } from "./base";
import { binarySearch } from "../../lib/math-util";

export class ResultsOrderPager extends Pager {

    constructor(
        readonly orderBy: string,
        readonly textToOrderingTarget: (text: string, desc: boolean) => AtCoderResultsEntry,
    ) {
        super();
    }


    async exec(
        text: string,
        paginationFn: (page: number) => Promise<unknown>,
    ) {

        const target = this.convertTargetText(this.textToOrderingTarget, text, vueResults.desc);

        if (vueResults.orderBy !== this.orderBy) {
            vueResults.orderBy = this.orderBy;
            vueStandings.desc = false;
        }

        const array = vueResults.orderedResults;
        const index = Math.min(
            binarySearch(vueResults.comp, array, target),
            array.length - 1
        );
        await paginationFn(Math.floor(index / vueResults.perPage) + 1);

    }

}
