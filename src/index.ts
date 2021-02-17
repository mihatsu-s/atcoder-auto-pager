import "./style.css";
import { asyncQuerySelector, waitForVueJsNextTick } from "./lib/dom-util";
import { binarySearch } from "./lib/math-util"
import { observeProperties } from "./lib/general-util";
import { getTaskScore } from "./lib/atcoder/get-task-score";
import { TaskInfo, TextToOrderingTarget } from "./feature/text-to-ordering-target";

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

    }


    async function execPagerFromInputElement(input: HTMLInputElement, rule: PaginationRule) {
        if (input.value.replace(/\s/g, "") === "") return;

        clearCssOfPagers();

        try {
            await execPager(input.value, rule);
            input.classList.add(CLASS_NAMES.active);
        } catch (e) {
            console.error(e instanceof Error ? e.message : e);
            input.classList.add(CLASS_NAMES.error);
        }
    }


    async function execPager(text: string, rule: PaginationRule) {

        if (rule.type === "standings-order") {

            const target = rule.textToOrderingTarget(text, vueStandings.desc, getTaskInfo());

            if (vueStandings.orderBy !== rule.orderBy) {
                preventReseting();
                vueStandings.orderBy = rule.orderBy;
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
                preventReseting();
                vueResults.orderBy = rule.orderBy;
            }

            const array = vueResults.orderedResults;
            const index = Math.min(
                binarySearch(vueResults.comp, array, target),
                array.length - 1
            );
            await goToPage(Math.floor(index / vueResults.perPage) + 1);

        } else if (rule.type === "ac-predictor") {

            throw new Error("TODO");
            
        }

    }


    async function goToPage(page: number) {
        preventReseting();
        if (page === vueObject.page) return;
        vueObject.page = page;
        vueObject.watchIndex = -1;
        await waitForVueJsNextTick();
    }


    function clearCssOfPagers() {
        for (const input of headerRow.querySelectorAll("." + CLASS_NAMES.input) as NodeListOf<HTMLElement>) {
            input.classList.remove(CLASS_NAMES.active);
            input.classList.remove(CLASS_NAMES.error);
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
    let __updatedByThisProgram = false;
    observeProperties(vueObject, ["page", "orderBy", "desc"], onResetTriggered);
    function onResetTriggered() {
        console.log("!");
        if (__updatedByThisProgram) {
            __updatedByThisProgram = false;
        } else {
            clearCssOfPagers();
        }
    }
    function preventReseting() {
        __updatedByThisProgram = true;
    }

})();
