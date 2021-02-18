import { Pager } from "./base";
import { linearPrediction } from "../../lib/math-util";
import { textToNumber } from "../text-to-ordering-target";
import { waitForVueJsNextTick } from "../../lib/dom-util";

export class AcPredictorPager extends Pager {

    constructor(
        readonly paginationFn: (page: number) => Promise<unknown>,
        readonly orderFn: (orderBy: string, desc?: boolean | null) => Promise<unknown>,
        readonly headerRow: HTMLTableRowElement,
    ) {
        super(paginationFn, orderFn);
    }


    async exec(
        text: string,
        paginationFn: (page: number) => Promise<unknown>,
    ) {

        const rawTarget = this.convertTargetText(textToNumber, text);

        await this.orderFn("rank");

        const desc = vueStandings.desc;
        const target = rawTarget * (desc ? 1 : -1);  // perf values are always ascending order

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
            const [v0, v1] = this.readCurrentPagePerf(tbody, columnNumber, desc);

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

            await paginationFn(nextPage);
            if (endNext) break;
        }

    }


    readPerfFromTableCell(cell: Node, desc: boolean): number {
        if (!cell) return 0;

        const text = cell.textContent.replace(/\s/g, "");
        const value = Number(text);
        return (isNaN(value) ? 0 : value) * (desc ? 1 : -1);
    }


    readCurrentPagePerf(tbody: HTMLElement, perfColumnIndex: number, desc: boolean): [number, number] {

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
            row => this.readPerfFromTableCell(row.children[perfColumnIndex], desc)
        ) as [number, number];

    }

}
