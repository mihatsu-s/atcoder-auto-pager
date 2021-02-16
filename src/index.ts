import "./style.css";

import * as Compare from "./modules/compare";
import * as StandingsReader from "./modules/atcoder-standings-reader";

function sleep(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function asyncQuerySelector(selectors: string): Promise<Element> {
    while (true) {
        const result = document.querySelector(selectors);
        if (result) return result;
        await sleep(200);
    }
}

function waitForHTMLElementUpdated(target: HTMLElement, options?: MutationObserverInit): Promise<MutationRecord[]> {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver(mutations => {
            observer.disconnect();
            resolve(mutations);
        });
        observer.observe(target, options);
    });
}

const inputClassName = "quick-pager-input";

interface OrderingRule {
    orderingTarget: HTMLElement;
    inputTextToValue: (text: string, columnInfo?: any) => Compare.Comparable;
    tableDataToValue: (node: Node, descending?: boolean) => Compare.Comparable;
    columnInfo?: any;
};


// main

(async () => {
    const table = (await Promise.all([
        asyncQuerySelector("#vue-standings table,#vue-results table"),
        StandingsReader.waitForFetchingPointValues(),
    ]))[0];
    const headerLine: HTMLTableRowElement = table.querySelector("thead tr");
    const tbody = table.querySelector("tbody");
    const pagenationPanel = document.querySelector("ul.pagination") as HTMLUListElement;

    const isStandingsPage = !!document.querySelector("#vue-standings");
    const mutationObserverTarget = tbody;
    const mutationObserverOption: MutationObserverInit =
        isStandingsPage ? { childList: true } : { childList: true, characterData: true, subtree: true };

    let rankColumn: HTMLElement;

    // Keep state of input element at Perf column when the column is reconstructed
    let perfInputState: { text: string, selectionStart: number, selectionEnd: number, active: boolean } | null = null;
    function writePerfInputState(input: HTMLInputElement) {
        perfInputState = {
            text: input.value,
            selectionStart: input.selectionStart,
            selectionEnd: input.selectionEnd,
            active: [...input.classList].some(t => t === "active"),
        };
    }

    function initColumn(th: HTMLElement) {

        let orderingRule: OrderingRule | null = null;
        let isPerf = false;

        const title = th.textContent.replace(/\s/g, "");
        if (title === "順位" || title === "Rank") {
            rankColumn = th;
            orderingRule = {
                orderingTarget: th,
                inputTextToValue: StandingsReader.readTextAsRank,
                tableDataToValue: StandingsReader.readRank,
            };
        } else if (title === "得点" || title === "Score") {
            orderingRule = {
                orderingTarget: th,
                inputTextToValue: StandingsReader.readTextAsScore,
                tableDataToValue: StandingsReader.readScore,
            };
        } else if (title.match(/^[A-Z]$/)) {
            orderingRule = {
                orderingTarget: th,
                inputTextToValue: StandingsReader.readTextAsScore,
                tableDataToValue: StandingsReader.readScore,
                columnInfo: title,
            };
        } else if (title === "perf") {
            isPerf = true;
            orderingRule = {
                orderingTarget: rankColumn,
                inputTextToValue: StandingsReader.readTextAsPerf,
                tableDataToValue: StandingsReader.readPerf,
            }
        } else if (
            title === "パフォーマンス" || title === "Performance"
            || title === "旧Rating" || title === "OldRating"
            || title === "差分" || title === "Diff"
            || title === "新Rating" || title === "NewRating"
        ) {
            orderingRule = {
                orderingTarget: th,
                inputTextToValue: StandingsReader.readTextAsPerf,
                tableDataToValue: StandingsReader.readPerf,
            }
        }

        if (!orderingRule) return;


        const inputContainer = document.createElement("div");
        const input = document.createElement("input");
        input.classList.add(inputClassName);
        inputContainer.append(input);
        th.append(inputContainer);

        if (isPerf && perfInputState) {
            input.focus();
            input.value = perfInputState.text;
            input.selectionStart = perfInputState.selectionStart;
            input.selectionEnd = perfInputState.selectionEnd;
            if (perfInputState.active) input.classList.add("active");
            perfInputState = null;
        }

        async function runQuickPager() {
            if (input.value.replace(/\s/g, "") === "") return;

            const orderingTargetClassNames = [...orderingRule.orderingTarget.classList];
            const orderingTargetAscending = orderingTargetClassNames.some(t => t === "sort-asc");
            const orderingTargetDescending = orderingTargetClassNames.some(t => t === "sort-desc");

            let targetValue: Compare.Comparable;
            try {
                targetValue = orderingRule.inputTextToValue(input.value, orderingRule.columnInfo);
                input.classList.remove("error");
                input.classList.add("active");
            } catch {
                input.classList.remove("active");
                input.classList.add("error");
                return;
            }

            cancelAutoPagination();
            resetAllPager(input);

            // Change the ordering of standings if needed
            if (!orderingTargetAscending && !orderingTargetDescending) {
                if (isPerf) writePerfInputState(input);
                pagingByThisProgram = true;
                orderingRule.orderingTarget.click();
                await waitForHTMLElementUpdated(orderingRule.orderingTarget, { attributes: true });
            }

            let columnNumber = -1;
            while (columnNumber < 0) {
                headerLine.querySelectorAll("th,td").forEach((element, i) => {
                    if (
                        element === th
                        || (isPerf && [...element.classList].some(t => t === "standings-perf"))
                    ) columnNumber = i;
                });
            }

            // paging
            movePageBinarily(
                () => {
                    const entries = getStandingsEntries();
                    if (entries.length === 0) return true;
                    const entry = entries[entries.length - 1];
                    const data = entry.querySelectorAll("th,td")[columnNumber];
                    if (!data) return false;
                    const currentPageValue = orderingRule.tableDataToValue(data, orderingTargetDescending);
                    // console.log("target", targetValue, "currentPage", currentPageValue); // debug
                    return (orderingTargetDescending ? Compare.le : Compare.ge)(currentPageValue, targetValue);
                },
                isPerf ? (() => writePerfInputState(input)) : undefined
            );
        }

        input.addEventListener("click", e => e.stopPropagation());
        input.addEventListener("input", () => {
            input.classList.remove("active");
            input.classList.remove("error");
            // runQuickPager();
        });
        input.addEventListener("keypress", e => {
            if (e.key === "Enter") {
                runQuickPager();
            }
        });
    }

    function getStandingsEntries() {
        return [...tbody.querySelectorAll("tr:not(.info,.warning,.standings-fa,.standings-statistics)")];
    }

    /**
     * Go to the first page that meets the given condition.
     * @param condition Condition must have monotonicity (false at first page and true at last one).
     */
    async function movePageBinarily(condition: () => boolean, beforePaging?: Function) {
        let canceled = false;
        autoPaginationCancelFunction = () => canceled = true;

        let currentPage = Number(pagenationPanel.querySelector(".active").textContent);
        let low = 0, high = Number(pagenationPanel.querySelector("li:last-child").textContent);

        async function clickPaginationButton(element: HTMLElement) {
            if (beforePaging) beforePaging();
            pagingByThisProgram = true;
            currentPage = Number(element.textContent);
            element.click();
            await waitForHTMLElementUpdated(mutationObserverTarget, mutationObserverOption);
        }

        while (high - low > 1) {
            if (canceled) return;

            // Update search range
            if (condition()) high = currentPage; else low = currentPage;
            
            // Select next page
            const idealNextPage = (low + high) / 2;
            let clickElement: HTMLElement | null = null;
            let clickElementScore = -Infinity;
            const candidates = pagenationPanel.querySelectorAll("li:not(.active)");
            for (const li of candidates) {
                const pageNumber = Number(li.textContent);
                if (low < pageNumber && pageNumber < high) {
                    const score = -Math.abs(pageNumber - idealNextPage);
                    if (score > clickElementScore) {
                        clickElementScore = score;
                        clickElement = li.querySelector("a");
                    }
                }
            }

            if (clickElement) {
                await clickPaginationButton(clickElement);
            } else {
                break;
            }
        }

        // Go to "high"(true) page
        if (currentPage === low) {
            for (const a of pagenationPanel.querySelectorAll("a")) {
                if (Number(a.textContent) === high) {
                    await clickPaginationButton(a);
                    break;
                }
            }
        }
    }

    let autoPaginationCancelFunction: Function | null = null;
    function cancelAutoPagination() {
        if (autoPaginationCancelFunction) {
            autoPaginationCancelFunction();
            autoPaginationCancelFunction = null;
        }
    }

    function resetAllPager(exclude?: HTMLElement) {
        headerLine.querySelectorAll("." + inputClassName).forEach((elm: HTMLInputElement) => {
            if (elm !== exclude) {
                elm.value = "";
                elm.classList.remove("active");
                elm.classList.remove("error");
            }
        });
    }

    // Launch quick-pager for each column
    headerLine.childNodes.forEach(node => node instanceof HTMLElement && initColumn(node));
    new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) initColumn(node);
            }
        }
    }).observe(headerLine, { childList: true });

    // When page changed manually, reset all quick-pager
    let pagingByThisProgram = false;
    new MutationObserver(() => {
        if (pagingByThisProgram) {
            pagingByThisProgram = false;
        } else {
            cancelAutoPagination();
            resetAllPager();
        }
    }).observe(mutationObserverTarget, mutationObserverOption);

})();
