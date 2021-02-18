import { Pager } from "./base";
import { binarySearch } from "../../lib/math-util";

export class StandingsOrderPager extends Pager {

    constructor(
        readonly orderBy: string,
        readonly textToOrderingTarget: (text: string, desc: boolean, taskInfo: TaskInfo) => AtCoderStandingsEntry,
        readonly taskInfoGettingFn: () => TaskInfo,
    ) {
        super();
    }

    
    async exec(
        text: string,
        paginationFn: (page: number) => Promise<unknown>,
    ) {

        const target = this.convertTargetText(this.textToOrderingTarget, text, vueStandings.desc, this.taskInfoGettingFn());

        if (vueStandings.orderBy !== this.orderBy) {
            vueStandings.orderBy = this.orderBy;
            vueStandings.desc = false;
        }

        const array = vueStandings.orderedStandings;
        const index = Math.min(
            binarySearch(vueStandings.comp, array, target),
            array.length - 1
        );
        await paginationFn(Math.floor(index / vueStandings.perPage) + 1);
        
    }

}


export class TaskInfo {
    [taskAlphabet: string]: {
        screenName: string;
        maximumScore: number;
    }
}
