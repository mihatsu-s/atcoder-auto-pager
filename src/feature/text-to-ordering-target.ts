import { TaskInfo } from "./pager/standings-order";


export function textToNumber(text: string) {
    let value = NaN;
    if (!text.match(/^,|,$|,,|\..*,|[eE].*,|,.*[eE]/)) {
        value = Number(text.replace(/,/g, ""));
    }

    if (isNaN(value)) {
        throw new Error(`Cannot convert '${text}' to a number.`);
    }
    return value;
}


function mmssToSeconds(text: string): number {
    const parts = text.split(":").map(Number);
    if (
        parts.length !== 2
        || !isFinite(parts[1]) || parts[1] < 0 || parts[1] >= 60
        || !isFinite(parts[0]) || parts[0] % 1 !== 0
    ) {
        throw new Error(`Cannot interpret '${text} as a time'`);
    }
    return parts[0] * 60 + parts[1];
}


/**
 * @returns a value treated as a first entry in the default compareFn
 */
function veryFirstStandingsEntry(desc: boolean): AtCoderStandingsEntry {
    return {
        Rank: desc ? Infinity : -Infinity,
        Rating: desc ? -Infinity : Infinity,
        OldRating: desc ? -Infinity : Infinity,
        TotalResult: {
            Count: 1,
            Score: desc ? -Infinity : Infinity,
            Elapsed: desc ? Infinity: -Infinity,
        },
        TaskResults: {},
    } as any;
}

/**
 * @returns a value treated as a first entry in the default compareFn
 */
function veryFirstResultsEntry(desc: boolean): AtCoderResultsEntry {
    return {
        Rank: desc ? Infinity : -Infinity,
        Place: desc ? Infinity : -Infinity,
        Performance: desc ? -Infinity : Infinity,
        OldRating: desc ? -Infinity : Infinity,
        Difference: desc ? -Infinity : Infinity,
        NewRating: desc ? -Infinity : Infinity,
        Rating: desc ? -Infinity : Infinity,
    } as any;
}


export namespace TextToOrderingTarget {

    type ExtractPropertyNameByType<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T];

    export namespace Standings {

        export function numeric(key: ExtractPropertyNameByType<AtCoderStandingsEntry, number>) {
            return function (text: string, desc: boolean) {
                const res = veryFirstStandingsEntry(desc);
                (res as any)[key] = textToNumber(text);
                return res;
            }
        }

        /**
         * @param taskAlphabet Set null for the total score
         */
        export function score(taskAlphabet: string | null) {
            return function (text: string, desc: boolean, taskInfo: TaskInfo) {

                // set default value
                let elapsed = desc ? -Infinity : Infinity; // most bottom
                let point = 0;
                if (taskAlphabet !== null && taskAlphabet in taskInfo) {
                    point = taskInfo[taskAlphabet].maximumScore;
                } else {
                    // sum of all tasks point
                    for (const alphabet in taskInfo) {
                        point += taskInfo[alphabet].maximumScore;
                    }
                }

                const parts = text.split(/\s/).filter(s => !!s);

                // read a time
                try {
                    elapsed = mmssToSeconds(parts[parts.length - 1]) * 1e9;
                    parts.pop();
                } catch { }
                
                // read a point
                if (parts.length === 1) {
                    point = 0;
                    let pointText = parts[0];

                    try {
                        point = textToNumber(pointText) * 100;
                    } catch (e) {
                        if (taskAlphabet === null) {

                            // convert task alphabets to point

                            function testTaskExistance(alphabet: string) {
                                if (!(alphabet in taskInfo)) {
                                    throw new Error(`Task '${alphabet}' does not exist`);
                                }
                            }

                            function addTaskPoint(alphabet: string) {
                                testTaskExistance(alphabet);
                                point += taskInfo[alphabet].maximumScore;
                            }

                            pointText = pointText.toUpperCase();

                            if (pointText[0] === "-") {
                                const firstTaskAlphabet = Object.keys(taskInfo).sort()[0];
                                pointText = firstTaskAlphabet + pointText;
                            }
                            if (pointText[pointText.length - 1] === "-") {
                                const lastTaskAlphabet = Object.keys(taskInfo).sort((a, b) => a < b ? 1 : a > b ? -1 : 0)[0];
                                pointText += lastTaskAlphabet;
                            }

                            for (let i = 0, imax = pointText.length; i < imax; ++i){
                                if (pointText[i + 1] === "-") {
                                    testTaskExistance(pointText[i]);
                                    testTaskExistance(pointText[i + 2]);
                                    for (let j = pointText.charCodeAt(i), jmax = pointText.charCodeAt(i + 2); j <= jmax; ++j) {
                                        addTaskPoint(String.fromCharCode(j));
                                    }
                                    i += 2;
                                } else {
                                    addTaskPoint(pointText[i]);
                                }
                            }

                        } else {
                            throw e;
                        }
                    }
                } else if (parts.length >= 2) {
                    throw new Error(`'${text}' is not a score specifier (format: '[point] [time]')`);
                }

                const res = veryFirstStandingsEntry(desc);
                if (taskAlphabet === null) {
                    (res.TotalResult as any) = {
                        Count: 1,
                        Score: point,
                        Elapsed: elapsed,
                    }
                } else {
                    (res.TaskResults[taskInfo[taskAlphabet].screenName] as any) = {
                        Count: 1,
                        Score: point,
                        Elapsed: elapsed,
                    };
                }
                return res;

            }
        }

    };

    export namespace Results {

        export function numeric(key: ExtractPropertyNameByType<AtCoderResultsEntry, number>) {
            return function (text: string, desc: boolean) {
                const res = veryFirstResultsEntry(desc);
                (res as any)[key] = textToNumber(text);
                return res;
            }
        }

    };

}
