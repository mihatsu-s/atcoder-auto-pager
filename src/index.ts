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
    export const watching = "watching";
}

type TableType = "standings" | "results";

(async () => {

    function getPagerFromHeaderCell(headerCell: HTMLElement): Pager | null {

        const title = headerCell.textContent.replace(/\s/g, "");

        if (tableType === "results") {

            let rule: {
                orderBy: string,
                converter: (text: string, desc: boolean) => AtCoderResultsEntry,
            } | null = null;

            if (title === "順位" || title === "Rank") {
                rule = {
                    orderBy: "Place",
                    converter: TextToOrderingTarget.Results.numeric("Place"),
                };
            }

            if (title === "パフォーマンス" || title === "Performance") {
                rule = {
                    orderBy: "Performance",
                    converter: TextToOrderingTarget.Results.numeric("Performance"),
                };
            }

            if (title === "旧Rating" || title === "OldRating") {
                rule = {
                    orderBy: "OldRating",
                    converter: TextToOrderingTarget.Results.numeric("OldRating"),
                };
            }

            if (title === "差分" || title === "Diff") {
                rule = {
                    orderBy: "Difference",
                    converter: TextToOrderingTarget.Results.numeric("Difference"),
                };
            }

            if (title === "新Rating" || title === "NewRating") {
                rule = {
                    orderBy: "NewRating",
                    converter: TextToOrderingTarget.Results.numeric("NewRating"),
                };
            }

            if (rule) {
                return new ResultsOrderPager(
                    goToPage,
                    changeOrder,
                    rule.orderBy,
                    rule.converter,
                );
            }

        } else {

            let rule: {
                orderBy: string,
                converter: (text: string, desc: boolean, showInLogScale: boolean, taskInfo: TaskInfo) => AtCoderStandingsEntry,
            } | null = null;

            if (title === "順位" || title === "Rank") {
                rule = {
                    orderBy: "rank",
                    converter: TextToOrderingTarget.Standings.numeric("Rank"),
                };
            }

            if (title === "得点" || title === "Score") {
                rule = {
                    orderBy: "score",
                    converter: TextToOrderingTarget.Standings.score(null),
                };
            }

            const taskInfo = getTaskInfo();

            if (title in taskInfo) {
                rule = {
                    orderBy: "task-" + taskInfo[title].screenName,
                    converter: TextToOrderingTarget.Standings.score(title),
                };
            }

            if (rule) {
                return new StandingsOrderPager(
                    goToPage,
                    changeOrder,
                    rule.orderBy,
                    rule.converter,
                );
            }

            if (title === "perf") {
                return new AcPredictorPager(
                    goToPage,
                    changeOrder,
                    headerRow,
                    () => {
                        if (perfColumnInputElement) {
                            keepPerfInputState(perfColumnInputElement);
                        }
                    },
                );
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
            if (watching && watching.element === input) {
                input.classList.remove(CLASS_NAMES.watching);
                watching = null;
            }
        });

        input.addEventListener("keypress", async e => {
            if (e.code === "Enter") {
                await execPagerFromInputElement(input, pager, tableType === "standings" && e.ctrlKey);
            }
        });

        if (pager instanceof AcPredictorPager) {
            perfColumnInputElement = input;

            if (__perfInputState) {
                input.focus();
                input.value = __perfInputState.value;
                input.selectionStart = __perfInputState.selectionStart;
                input.selectionEnd = __perfInputState.selectionEnd;
                input.classList.add(CLASS_NAMES.active);

                setTimeout(() => {
                    __perfInputState = null;
                }, 0);
            }

            if (watching && watching.perf !== null) {
                input.classList.add(CLASS_NAMES.watching);
                input.value = watching.perf.value;
                watching = {
                    element: input,
                    pager: watching.perf.pager,
                    perf: watching.perf,
                }
            }
        }

    }


    async function execPagerFromInputElement(input: HTMLInputElement, pager: Pager, watch = false) {
        if (input.value.replace(/\s/g, "") === "") return;

        input.classList.remove(CLASS_NAMES.error);
        input.classList.add(CLASS_NAMES.active);
        input.classList.remove(CLASS_NAMES.watching);

        const preWatching = watching;
        if (watch) {
            input.classList.add(CLASS_NAMES.watching);
            watching = {
                element: input,
                pager,
                perf: pager instanceof AcPredictorPager ? { value: input.value, pager } : null,
            };
        } else if (watching && watching.element === input) {
            watching = null;
        }

        try {
            await pager.exec(input.value);
        } catch (e) {
            input.classList.remove(CLASS_NAMES.active);
            input.classList.remove(CLASS_NAMES.watching);
            input.classList.add(CLASS_NAMES.error);

            if (watch) watching = preWatching;

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


    async function changeOrder(orderBy: string, desc: boolean | null = null) {
        if (orderBy === vueObject.orderBy) {
            if (desc === null || desc === vueObject.desc) return;
        } else {
            if (desc === null) desc = false;
        }
        if (document.activeElement === perfColumnInputElement) {
            keepPerfInputState(perfColumnInputElement);
        }
        vueObject.orderBy = orderBy;
        if (desc !== null) vueObject.desc = desc;
        await waitForVueJsNextTick();
    }


    interface Watching {
        element: HTMLInputElement;
        pager: Pager;
        perf: { value: string, pager: Pager } | null;
    }
    let watching: Watching | null = null;


    let perfColumnInputElement: HTMLInputElement | null = null;
    interface __PerfInputState {
        value: string;
        selectionStart: number;
        selectionEnd: number;
    }
    let __perfInputState: __PerfInputState | null = null;
    function keepPerfInputState(input: HTMLInputElement) {
        __perfInputState = {
            value: input.value,
            selectionStart: input.selectionStart,
            selectionEnd: input.selectionEnd,
        };
    }


    function resetPagers() {
        for (const input of headerRow.querySelectorAll("." + CLASS_NAMES.input) as NodeListOf<HTMLInputElement>) {
            if (headerRow.ownerDocument.activeElement === input) continue;
            input.classList.remove(CLASS_NAMES.active);
            input.classList.remove(CLASS_NAMES.error);
            input.classList.remove(CLASS_NAMES.watching);
            input.value = "";
        }

        if (watching && watching.element !== headerRow.ownerDocument.activeElement) {
            watching = null;
        }
    }


    // main

    const headerRow = (await asyncQuerySelector("#vue-standings thead tr, #vue-results thead tr")) as HTMLTableRowElement;

    const tableType: TableType = typeof vueStandings === "undefined" ? "results" : "standings";

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

    if (tableType === "standings") {
        // Detect updating
        observeProperties(vueStandings, ["standings"], () => {
            if (watching) {
                execPagerFromInputElement(watching.element, watching.pager, true);
            }
        });
    }

})();
