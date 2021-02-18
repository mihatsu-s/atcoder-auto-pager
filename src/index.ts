import "./style.css";

import { asyncQuerySelector, waitForVueJsNextTick } from "./lib/dom-util";
import { observeProperties } from "./lib/general-util";
import { TextToOrderingTarget } from "./feature/text-to-ordering-target";
import { Pager, TargetTextConvertionError } from "./feature/pager/base";
import { StandingsOrderPager, TaskInfo } from "./feature/pager/standings-order";
import { ResultsOrderPager } from "./feature/pager/results-order";
import { AcPredictorPager } from "./feature/pager/ac-predictor";
import { getTaskInfo } from "./feature/get-task-info";

namespace CLASS_NAMES {
    export const input = "auto-pager-input";
    export const active = "active";
    export const error = "error";
}

type TableType = "standings" | "results";

(async () => {

    function getPagerFromHeaderCell(headerCell: HTMLElement): Pager | null {

        const title = headerCell.textContent.replace(/\s/g, "");

        if (tableType === "results") {

            if (title === "順位" || title === "Rank") {
                return new ResultsOrderPager(
                    "Place",
                    TextToOrderingTarget.Results.numeric("Place"),
                );
            }

            if (title === "パフォーマンス" || title === "Performance") {
                return new ResultsOrderPager(
                    "Perfoemance",
                    TextToOrderingTarget.Results.numeric("Place"),
                );
            }

            if (title === "旧Rating" || title === "OldRating") {
                return new ResultsOrderPager(
                    "OldRating",
                    TextToOrderingTarget.Results.numeric("OldRating"),
                );
            }

            if (title === "差分" || title === "Diff") {
                return new ResultsOrderPager(
                    "Difference",
                    TextToOrderingTarget.Results.numeric("Difference"),
                );
            }

            if (title === "新Rating" || title === "NewRating") {
                return new ResultsOrderPager(
                    "NewRating",
                    TextToOrderingTarget.Results.numeric("NewRating"),
                );
            }

        } else {

            if (title === "順位" || title === "Rank") {
                return new StandingsOrderPager(
                    "rank",
                    TextToOrderingTarget.Standings.numeric("Rank"),
                    getTaskInfo,
                );
            }

            if (title === "得点" || title === "Score") {
                return new StandingsOrderPager(
                    "score",
                    TextToOrderingTarget.Standings.score(null),
                    getTaskInfo,
                );
            }

            const taskInfo = getTaskInfo();

            if (title in taskInfo) {
                return new StandingsOrderPager(
                    "task-" + taskInfo[title].screenName,
                    TextToOrderingTarget.Standings.score(title),
                    getTaskInfo,
                );
            }

            if (title === "perf") {
                return new AcPredictorPager(headerRow);
            }

        }

        return null;
    }


    function addInputElementToHeaderCell(headerCell: HTMLElement) {
        const document = headerCell.ownerDocument;

        const div = document.createElement("div");
        const input = document.createElement("input");
        div.append(input);
        headerCell.append(div);

        input.classList.add(CLASS_NAMES.input);

        input.addEventListener("click", e => {
            e.stopPropagation();
        });

        return input;
    }


    function columnInit(headerCell: HTMLElement) {

        const pager = getPagerFromHeaderCell(headerCell);
        if (pager === null) return;

        const input = addInputElementToHeaderCell(headerCell);

        input.addEventListener("input", async () => {
            input.classList.remove(CLASS_NAMES.active);
            input.classList.remove(CLASS_NAMES.error);
        });

        input.addEventListener("keypress", async e => {
            if (e.code === "Enter") {
                await execPagerFromInputElement(input, pager);
            }
        });

        if (pager instanceof AcPredictorPager && __perfInputState) {
            perfColumnInputElement = input;

            if (__perfInputState) {
                input.focus();
                input.value = __perfInputState.value;
                input.selectionStart = __perfInputState.selectionStart;
                input.selectionEnd = __perfInputState.selectionEnd;
                input.classList.add(CLASS_NAMES.active);
                __perfInputState = null;
            }
        }

    }


    async function execPagerFromInputElement(input: HTMLInputElement, pager: Pager) {
        if (input.value.replace(/\s/g, "") === "") return;

        try {
            input.classList.add(CLASS_NAMES.active);
            await pager.exec(input.value, goToPage);
        } catch (e) {
            input.classList.remove(CLASS_NAMES.active)
            input.classList.add(CLASS_NAMES.error);
            if (e instanceof TargetTextConvertionError) {
                // TODO: Show error message
                // console.error(e);
            } else {
                throw e;
            }
        }
    }


    async function goToPage(page: number) {
        if (page === vueObject.page) return;
        if (document.activeElement === perfColumnInputElement) {
            keepPerfInputState(perfColumnInputElement);
        }
        vueObject.page = page;
        vueObject.watchIndex = -1;
        await waitForVueJsNextTick();
    }


    let perfColumnInputElement: HTMLInputElement | null = null;
    let __perfInputState: { value: string, selectionStart: number, selectionEnd: number } | null = null;
    function keepPerfInputState(input: HTMLInputElement) {
        __perfInputState = {
            value: input.value,
            selectionStart: input.selectionStart,
            selectionEnd: input.selectionEnd,
        };
    }


    function resetPagers() {
        for (const input of headerRow.querySelectorAll("." + CLASS_NAMES.input) as NodeListOf<HTMLInputElement>) {
            if (input.ownerDocument.activeElement === input) continue;
            input.classList.remove(CLASS_NAMES.active);
            input.classList.remove(CLASS_NAMES.error);
            input.value = "";
        }
    }


    // main

    const headerRow = (await asyncQuerySelector("#vue-standings thead tr, #vue-results thead tr")) as HTMLTableRowElement;

    const tableType: TableType = typeof vueStandings === "undefined" ? "results" : "standings";

    // Prepare the task info 
    if (tableType === "standings") getTaskInfo();

    const vueObject = tableType === "standings" ? vueStandings : vueResults;

    // Launch auto-pager for each column
    headerRow.querySelectorAll("th").forEach(columnInit);
    new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) columnInit(node);
            }
        }
    }).observe(headerRow, { childList: true });


    // Detect pagination
    observeProperties(vueObject, ["page", "orderBy", "desc"], () => {
        resetPagers();
    });

})();
