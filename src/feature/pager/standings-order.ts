import { Pager } from "./base";
import { binarySearch } from "../../lib/math-util";
import { getTaskInfo } from "../get-task-info";

export class StandingsOrderPager extends Pager {

    constructor(
        readonly paginationFn: (page: number) => Promise<unknown>,
        readonly orderFn: (orderBy: string, desc?: boolean | null) => Promise<unknown>,
        readonly orderBy: string,
        readonly textToOrderingTarget: (text: string, desc: boolean, showInLogScale: boolean, taskInfo: TaskInfo) => AtCoderStandingsEntry,
    ) {
        super(paginationFn, orderFn);
    }

    
    async exec(text: string) {

        const target = this.convertTargetText(
            this.textToOrderingTarget,
            text,
            vueStandings.desc,
            vueStandings.showInLogScale,
            getTaskInfo()
        );

        this.orderFn(this.orderBy);  // Do not wait for DOM updated

        const array = vueStandings.orderedStandings;
        if (array.length === 0) return;
        const index = Math.min(
            binarySearch(array, vueStandings.comp, target),
            array.length - 1
        );
        await this.paginationFn(Math.floor(index / vueStandings.perPage) + 1);
        
    }

}


export class TaskInfo {
    [taskAlphabet: string]: {
        screenName: string;
        maximumScore: number;
    }
}
