import { Pager } from "./base";
import { binarySearch, linearPrediction } from "../../lib/math-util";
import { textToNumber } from "../text-to-ordering-target";
import { getRankToRatedRankMap } from "../rank-to-rated-rank";


// Get ac-predictor's internal function
let predictor_onRankInput: Function | null = null;
let predictor_onPerfInput: Function | null = null;
const addEventListener_raw = HTMLInputElement.prototype.addEventListener;
(HTMLInputElement.prototype.addEventListener as any) =
    function (this: HTMLInputElement, type: string, fn: Function, ...args: unknown[]) {
        if (this.id === "predictor-input-rank") {
            predictor_onRankInput = fn;
        } else if (this.id === "predictor-input-perf") {
            predictor_onPerfInput = fn;
        }
        addEventListener_raw.call(this, type, fn, ...args);
    }


export class AcPredictorPager extends Pager {

    constructor(
        readonly paginationFn: (page: number) => Promise<unknown>,
        readonly orderFn: (orderBy: string, desc?: boolean | null) => Promise<unknown>,
        readonly headerRow: HTMLTableRowElement,
        readonly beforePaginationFn?: Function,
    ) {
        super(paginationFn, orderFn);
    }


    async exec(text: string) {
        const target = this.convertTargetText(textToNumber, text);
        await this.orderFn("rank");
        if (predictor_onRankInput && predictor_onPerfInput) {
            await this.paginateBasedOnPredictor(target);
        } else {
            await this.paginateBasedOnDOM(target);
        }
    }


    async paginateBasedOnDOM(target: number) {

        if (vueStandings.pages === 0) return;

        const desc = vueStandings.desc;
        if (!desc) target *= -1;

        let columnNumber = -1;
        this.headerRow.querySelectorAll("th").forEach((th, i) => {
            if (th.textContent.replace(/\s/g, "") === "perf") {
                columnNumber = i;
            }
        });
        if (columnNumber < 0) throw new Error('Cannot find perf column');

        const tbody = this.headerRow.parentElement.parentElement.querySelector("tbody");


        // Search page binarily

        let low: { page: number, value: number } | null = null;
        let high: { page: number, value: number } | null = null;
        while (true) {
            let [v0, v1] = this.readCurrentPagePerf(tbody, columnNumber);
            if (!desc) {
                v0 *= -1;
                v1 *= -1;
            }

            if (v0 < target && target <= v1) {
                break;
            } else if (target <= v0) {
                // too high
                if (vueStandings.page === 1) break;
                high = { page: vueStandings.page, value: (v0 + v1) / 2 };
            } else {
                // too low
                if (vueStandings.page === vueStandings.pages) break;
                low = { page: vueStandings.page, value: (v0 + v1) / 2 };
            }

            let nextPage: number;
            let endNext = false;

            if (high && low) {
                if (high.page - low.page <= 1) {
                    // goal
                    nextPage = high.page;
                    endNext = true;
                } else if (/* v0 !== v1 */ false) {
                    // Use linear prediction
                    nextPage = Math.floor(linearPrediction(low.value, low.page, high.value, high.page, target) + 0.5);
                } else {
                    // Use midpoint
                    nextPage = Math.ceil((high.page + low.page) / 2);
                }

                if (nextPage >= high.page) {
                    nextPage = high.page - 1;
                } else if (nextPage <= low.page) {
                    nextPage = low.page + 1;
                }
            } else if (high) {
                nextPage = 1;
            } else if (low) {
                nextPage = vueStandings.pages;
            }

            await this.paginationFn(nextPage);
            if (endNext) break;
        }

    }


    readPerfFromTableCell(cell: Node): number {
        if (!cell) return 0;

        const text = cell.textContent.replace(/\s/g, "");
        const value = Number(text);
        return isNaN(value) ? 0 : value;
    }


    readCurrentPagePerf(tbody: HTMLElement, perfColumnIndex: number): [number, number] {

        const rows: HTMLTableRowElement[] = [];
        let infoRowIndex = -1;
        let warningRowIndex = -1;
        tbody.childNodes.forEach(node => {
            if (node instanceof HTMLTableRowElement
                && !node.classList.contains("standings-fa")
                && !node.classList.contains("standings-statistics")) {

                rows.push(node);
                if (node.classList.contains("info")) infoRowIndex = rows.length - 1;
                if (node.classList.contains("warning")) warningRowIndex = rows.length - 1;
            }
        });
        if (rows.length > vueStandings.perPage || vueStandings.page === vueStandings.pages) {
            if (infoRowIndex < 0 && warningRowIndex >= 0) {
                rows.splice(warningRowIndex, 1);
            } else if (infoRowIndex >= 0) {
                rows.splice(infoRowIndex, 1);
            }
        }

        return [rows[0], rows[rows.length - 1]].map(
            row => this.readPerfFromTableCell(row.children[perfColumnIndex])
        ) as [number, number];

    }


    async paginateBasedOnPredictor(target: number) {
        const standings = vueStandings.orderedStandings;
        if (standings.length === 0) return;
        const desc = vueStandings.desc;

        const ratedRankMap = getRankToRatedRankMap();
        const maxPerf = this.rankToPerf(1);
        const index = binarySearch(standings, entry => {
            const ratedRank = ratedRankMap[entry.EntireRank];
            const perf =
                entry.TotalResult.Count === 0
                    ? -Infinity
                    : Math.round(this.positivizeRating(Math.min(this.rankToPerf(ratedRank), maxPerf)));
            return desc ? (perf >= target) : (perf <= target);
        });

        await this.paginationFn(Math.floor(index / vueStandings.perPage) + 1);
    }


    rankToPerf(rank: number): number {
        if (this.beforePaginationFn) {
            this.beforePaginationFn();
        }

        const predictorElements = [
            "predictor-input-rank",
            "predictor-input-perf",
            "predictor-input-rate",
        ].map(s => this.headerRow.ownerDocument.getElementById(s) as HTMLInputElement);
        const temp = predictorElements.map(e => e.value);
        predictorElements[0].value = rank.toString();
        predictor_onRankInput();
        const result = Number(predictorElements[1].value);
        temp.forEach((v, i) => {
            predictorElements[i].value = v;
        });
        return result;
    }

    perfToRank(perf: number): number {
        if (this.beforePaginationFn) {
            this.beforePaginationFn();
        }

        const predictorElements = [
            "predictor-input-rank",
            "predictor-input-perf",
            "predictor-input-rate",
        ].map(s => this.headerRow.ownerDocument.getElementById(s) as HTMLInputElement);
        const temp = predictorElements.map(e => e.value);
        predictorElements[1].value = perf.toString();
        predictor_onPerfInput();
        const result = Number(predictorElements[0].value);
        temp.forEach((v, i) => {
            predictorElements[i].value = v;
        });
        return result;
    }

    positivizeRating(rating: number): number {
        if (rating >= 400.0) return rating;
        return 400.0 * Math.exp((rating - 400.0) / 400.0);
    }

    unpositivizeRating(rating: number): number {
        if (rating >= 400.0) return rating;
        return 400.0 + 400.0 * Math.log(rating / 400.0);
    }

}
