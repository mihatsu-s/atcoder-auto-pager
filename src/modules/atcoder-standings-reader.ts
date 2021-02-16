// Convert table data or input text on AtCoder standings to comparable value

/*
    Values after convertion must have ASCENDING order
    (For instance, the raw "Score" values are in DESCENDING order when they are sorted "ascendingly").
*/

import * as Compare from "./compare";

export function readRank(element: Element): Compare.Comparable {
    return Number(element.textContent.replace(/\(\d+\)/g, ""));
}

export function readScore(element: Element, descending = false): Compare.Comparable {
    if (element.textContent.indexOf(":") >= 0) {
        return [
            -Number(element.querySelector(".standings-score,.standings-ac").textContent.replace(/,/g, "")),
            mmssToSeconds(element.querySelector("p:last-child").textContent)
        ];
    } else if (element.textContent.indexOf("(") >= 0) {
        return [0.1, 1e100];
    } else {
        return [descending ? -Infinity : Infinity, descending ? -Infinity : Infinity];
    }
}

export function readPerf(element: Element): Compare.Comparable {
    const value = Number(element.textContent);
    return isNaN(value) ? Infinity : -value;
}

function mmssToSeconds(text: string): number {
    const parts = text.split(":").map(Number);
    if (
        parts.length !== 2
        || !isFinite(parts[1]) || parts[1] < 0 || parts[1] >= 60
        || !isFinite(parts[0]) || parts[0] % 1 !== 0
    ) throw new Error;
    return parts[0] * 60 + parts[1];
}

function toNumber(text: string): number {
    if (text.match(/(^,|,,|,$|\..*,)/)) throw new Error;
    const value = Number(text.replace(/,/g, ""));
    if (isNaN(value)) throw new Error;
    return value;
}

export function readTextAsRank(text: string): Compare.Comparable {
    return toNumber(text);
}

export function readTextAsScore(text: string, taskName?: string): Compare.Comparable {
    const parts = text.split(/\s/).filter(s => !!s);

    let time = Infinity;
    try {
        time = mmssToSeconds(parts[parts.length - 1]);
        parts.pop();
    } catch { }

    if (parts.length === 0) {
        if (taskValues.size > 0) {
            // Apply the maximum score
            if (taskName) {
                if (taskValues.has(taskName)) {
                    return [-taskValues.get(taskName), time];
                } else {
                    throw new Error;
                }
            } else {
                // Sum of points of all tasks
                let point = 0;
                taskValues.forEach(v => point += v);
                return [-point, time];
            }
        } else {
            // Ignore the displayed score
            return [Compare.equalToAll, time];
        }
    }

    if (parts.length === 1) {
        try {
            return [-toNumber(parts[0]), time];
        } catch { }
    }


    // Calculate point from task names (available on the "Score" column only)

    if (taskName || taskValues.size === 0) throw new Error;

    let point = 0;
    function addPointOfTask(taskName: string) {
        if (!taskValues.has(taskName)) throw new Error;
        point += taskValues.get(taskName);
    }

    const pointString = parts.join("").toUpperCase();
    for (let i = 0; i < pointString.length; ++i) {
        if (i + 2 < pointString.length && pointString[i + 1] === "-") {
            if (!taskValues.has(pointString[i]) || !taskValues.has(pointString[i + 2])) throw new Error;
            for (let c = pointString.charCodeAt(i), cm = pointString.charCodeAt(i + 2); c <= cm; ++c) {
                addPointOfTask(String.fromCharCode(c));
            }
            i += 2;
        } else {
            addPointOfTask(pointString[i]);
        }
    }

    return [-point, time];
}

export function readTextAsPerf(text: string): Compare.Comparable {
    return -toNumber(text);
}


const taskValues = new Map<string, number>();

export async function waitForFetchingPointValues() {

    const iframe = document.createElement("iframe");

    try {

        // Get the point values of tasks from the table of top page 

        const contestPageURL = location.href.match(/^(.*\/contests\/[^\/]+)/)[1];
        iframe.src = contestPageURL;
        iframe.style.display = "none";
        document.body.append(iframe);

        await new Promise(resolve => iframe.contentWindow.addEventListener("DOMContentLoaded", resolve));

        const tables = iframe.contentWindow.document.querySelectorAll("table");
        for (const table of tables) {
            const tbody = table.querySelector("tbody");
            if (!tbody) continue;
            const rows = [...tbody.querySelectorAll("tr")];
            if (rows.length === 0) continue;

            const taskValues0 = new Map<string, number>();
            try {
                for (const row of rows) {
                    const texts = [...row.querySelectorAll("th,td")].map(x => x.textContent.replace(/\s/g, ""));
                    if (texts.length !== 2) throw null;
                    taskValues0.set(texts[0], toNumber(texts[1]));
                }
            } catch {
                continue;
            }

            taskValues0.forEach((value, key) => taskValues.set(key, value));
            break;
        }

        if (taskValues.size === 0) throw "Cannot find the point values table.";

    } catch (e) {

        console.groupCollapsed("[atcoder-standings-quick-pager] Cannot get the point values of tasks.");
        console.error(e);
        console.groupEnd();

        // TODO: Show error message near the input element on the "Score" column

    } finally {

        if (iframe.parentElement) iframe.remove();

    }
}
