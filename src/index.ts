import "./style.css";
import { asyncQuerySelector, waitForVueJsNextTick } from "./lib/dom-util";
import { binarySearch, linearPrediction } from "./lib/math-util"
import { observeProperties } from "./lib/general-util";
import { getTaskScore } from "./lib/atcoder/get-task-score";
import { TaskInfo, TextToOrderingTarget, textToNumber } from "./feature/text-to-ordering-target";

namespace CLASS_NAMES {
    export const input = "auto-pager-input";
    export const active = "active";
    export const error = "error";
}

type TableType = "standings" | "results";

type PaginationRule =
    (
        {
            type: "standings-order",
            orderBy: string,
            textToOrderingTarget: (text: string, desc: boolean, taskInfo: TaskInfo) => AtCoderStandingsEntry,
        } |
        {
            type: "results-order",
            orderBy: string,
            textToOrderingTarget: (text: string, desc: boolean) => AtCoderResultsEntry,
        } |
        { type: "ac-predictor" }
    );

(async () => {

    const getTaskInfo = (() => {

        let cache: TaskInfo | null = null;
        let previousStandings: AtCoderVueStandings["standings"] | null = null;

        let maximumScoreRecord: {
            [taskAlphabet: string]: number | null // null means "attemted and failed to get the score already"
        } = {};

        async function getAndRecordMaximumScore(taskAlphabet: string, taskScreenName: string) {
            maximumScoreRecord[taskAlphabet] = null;
            try {
                const url = location.href.replace(/(?<=\/contests\/[^\/]*\/).*$/, "tasks/" + taskScreenName);
                const score = (await getTaskScore(url)) * 100;
                maximumScoreRecord[taskAlphabet] = score;
                cache[taskAlphabet].maximumScore = score;
            } catch (e) {
                console.error(e instanceof Error ? e.message : e);
            }
        }

        function generateTaskInfo(standings: AtCoderVueStandings["standings"]): TaskInfo {
            const result: TaskInfo = {};
            for (const info of standings.TaskInfo) {
                const alphabet = info.Assignment;
                const screenName = info.TaskScreenName;

                let maximumScore = 0;
                if (alphabet in maximumScoreRecord && maximumScoreRecord[alphabet] !== null) {
                    maximumScore = maximumScoreRecord[alphabet];
                } else {
                    if (!(alphabet in maximumScoreRecord)) {
                        // Do not wait (request only)
                        getAndRecordMaximumScore(alphabet, screenName);
                    }

                    for (const entry of standings.StandingsData) {
                        const taskResults = entry.TaskResults;
                        if (screenName in taskResults) {
                            maximumScore = Math.max(maximumScore, taskResults[screenName].Score);
                        }
                    }
                }

                result[alphabet] = { screenName, maximumScore };
            }
            return result;
        }

        return () => {
            const currentStandings = vueStandings.standings;
            // Check if standings has been updated
            if (cache && currentStandings === previousStandings) return cache;
            previousStandings = currentStandings;
            return cache = generateTaskInfo(currentStandings);
        };

    })();


    function getPaginationRuleFromHeaderCell(headerCell: HTMLElement): PaginationRule | null {

        const title = headerCell.textContent.replace(/\s/g, "");

        if (tableType === "results") {

            if (title === "順位" || title === "Rank") {
                return {
                    type: "results-order",
                    orderBy: "Place",
                    textToOrderingTarget: TextToOrderingTarget.Results.numeric("Place"),
                };
            }

            if (title === "パフォーマンス" || title === "Performance") {
                return {
                    type: "results-order",
                    orderBy: "Performance",
                    textToOrderingTarget: TextToOrderingTarget.Results.numeric("Performance"),
                };
            }

            if (title === "旧Rating" || title === "OldRating") {
                return {
                    type: "results-order",
                    orderBy: "OldRating",
                    textToOrderingTarget: TextToOrderingTarget.Results.numeric("OldRating"),
                };
            }

            if (title === "差分" || title === "Diff") {
                return {
                    type: "results-order",
                    orderBy: "Difference",
                    textToOrderingTarget: TextToOrderingTarget.Results.numeric("Difference"),
                };
            }

            if (title === "新Rating" || title === "NewRating") {
                return {
                    type: "results-order",
                    orderBy: "NewRating",
                    textToOrderingTarget: TextToOrderingTarget.Results.numeric("NewRating"),
                };
            }

        } else {

            if (title === "順位" || title === "Rank") {
                return {
                    type: "standings-order",
                    orderBy: "rank",
                    textToOrderingTarget: TextToOrderingTarget.Standings.numeric("Rank"),
                };
            }

            if (title === "得点" || title === "Score") {
                return {
                    type: "standings-order",
                    orderBy: "score",
                    textToOrderingTarget: TextToOrderingTarget.Standings.score(null),
                };
            }

            const taskInfo = getTaskInfo();

            for (const taskAlphabet in taskInfo) {
                if (title === taskAlphabet) {
                    return {
                        type: "standings-order",
                        orderBy: "task-" + taskInfo[taskAlphabet].screenName,
                        textToOrderingTarget: TextToOrderingTarget.Standings.score(taskAlphabet),
                    };
                }
            }

            if (title === "perf") {
                return { type: "ac-predictor" };
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

        const rule = getPaginationRuleFromHeaderCell(headerCell);
        if (rule === null) return;

        const input = addInputElementToHeaderCell(headerCell);

        input.addEventListener("input", async () => {
            input.classList.remove(CLASS_NAMES.active);
            input.classList.remove(CLASS_NAMES.error);
            await execPagerFromInputElement(input, rule);
        });

        input.addEventListener("keypress", async e => {
            if (e.code === "Enter") {
                await execPagerFromInputElement(input, rule);
            }
        });

        if (rule.type === "ac-predictor" && __perfInputState) {
            input.focus();
            input.value = __perfInputState.value;
            input.selectionStart = __perfInputState.selectionStart;
            input.selectionEnd = __perfInputState.selectionEnd;
            input.classList.add(CLASS_NAMES.active);
            __perfInputState = null;
        }

    }


    async function execPagerFromInputElement(input: HTMLInputElement, rule: PaginationRule) {
        if (input.value.replace(/\s/g, "") === "") return;

        try {
            input.classList.add(CLASS_NAMES.active);
            await execPager(input.value, rule, input);
        } catch (e) {
            console.error(e instanceof Error ? e.message : e);
            input.classList.remove(CLASS_NAMES.active)
            input.classList.add(CLASS_NAMES.error);
        }
    }


    async function execPager(text: string, rule: PaginationRule, inputElement: HTMLInputElement) {

        if (rule.type === "standings-order") {

            const target = rule.textToOrderingTarget(text, vueStandings.desc, getTaskInfo());

            if (vueStandings.orderBy !== rule.orderBy) {
                vueStandings.orderBy = rule.orderBy;
                vueStandings.desc = false;
            }

            const array = vueStandings.orderedStandings;
            const index = Math.min(
                binarySearch(vueStandings.comp, array, target),
                array.length - 1
            );
            await goToPage(Math.floor(index / vueStandings.perPage) + 1);

        } else if (rule.type === "results-order") {

            const target = rule.textToOrderingTarget(text, vueResults.desc);

            if (vueResults.orderBy !== rule.orderBy) {
                vueResults.orderBy = rule.orderBy;
                vueStandings.desc = false;
            }

            const array = vueResults.orderedResults;
            const index = Math.min(
                binarySearch(vueResults.comp, array, target),
                array.length - 1
            );
            await goToPage(Math.floor(index / vueResults.perPage) + 1);

        } else if (rule.type === "ac-predictor") {

            // DOM based searching

            const rawTarget = textToNumber(text);

            let reordered = false;
            if (vueStandings.orderBy !== "rank") {
                vueStandings.orderBy = "rank";
                vueStandings.desc = false;
                reordered = true;
                keepPerfInputState(inputElement);
            }

            const desc = vueStandings.desc;
            const target = rawTarget * (desc ? 1 : -1);  // perf values are always ascending order

            let columnNumber = -1;
            headerRow.querySelectorAll("th").forEach((th, i) => {
                if (th.textContent.replace(/\s/g, "") === "perf") {
                    columnNumber = i;
                }
            });
            if (columnNumber < 0) throw new Error('Cannot find perf column');

            const tbody = document.querySelector("#standings-tbody");


            function readPerfFromTableCell(cell: Node): number {
                const text = cell.textContent.replace(/\s/g, "");
                const value = Number(text);
                return (isNaN(value) ? 0 : value) * (desc ? 1 : -1);
            }


            function readCurrentPagePerf(): [number, number] {

                let rows: NodeListOf<HTMLTableRowElement>;
                const infoRow: HTMLTableRowElement | null = tbody.querySelector("tr.info");
                const warningRow: HTMLTableRowElement | null = tbody.querySelector("tr.warning");
                if (vueStandings.currentStandings.length > vueStandings.perPage
                    || vueStandings.page === vueStandings.pages) {
                    if (infoRow && warningRow) {
                        rows = tbody.querySelectorAll("tr:not(.info,.standings-fa,.standings-statistics)");
                    } else {
                        rows = tbody.querySelectorAll("tr:not(.info,.warning,.standings-fa,.standings-statistics)");
                    }
                } else {
                    rows = tbody.querySelectorAll("tr:not(.standings-fa,.standings-statistics)");
                }

                return [rows[0], rows[rows.length - 1]].map(
                    row => readPerfFromTableCell(row.children[columnNumber])
                ) as [number, number];

            }


            if (reordered) await waitForVueJsNextTick();

            // Search page binarily

            let low: { page: number, value: number } | null = null;
            let high: { page: number, value: number } | null = null;
            while (true) {
                const [v0, v1] = readCurrentPagePerf();

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

                if (nextPage !== vueObject.page) {
                    keepPerfInputState(inputElement);
                    await goToPage(nextPage);
                }
                if (endNext) break;
            }

        }

    }


    async function goToPage(page: number) {
        if (page === vueObject.page) return;
        vueObject.page = page;
        vueObject.watchIndex = -1;
        await waitForVueJsNextTick();
    }


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

    const headerRow = await asyncQuerySelector("#vue-standings thead tr, #vue-results thead tr");

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


    // Detect update and clear CSS of auto-pager
    observeProperties(vueObject, ["page", "orderBy", "desc"], onResetTriggered);
    function onResetTriggered() {
        resetPagers();
    }

})();
