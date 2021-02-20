import { readTaskScore } from "../lib/atcoder/info-reader";
import { internalTimeToJsDate } from "../lib/atcoder/time";
import { fetchText } from "../lib/net-util";
import { TaskInfo } from "./pager/standings-order";

let cache: TaskInfo | null = null;
let previousStandings: AtCoderVueStandings["standings"] | null = null;

let maximumScoreRecord: {
    [taskAlphabet: string]: number | null // null means "attemted and failed to get the score already"
} = {};

async function getAndRecordMaximumScore(taskAlphabet: string, taskScreenName: string) {
    maximumScoreRecord[taskAlphabet] = null;
    const url = location.href.replace(/(?<=\/contests\/[^\/]*\/).*$/, "tasks/" + taskScreenName);
    try {
        const score = readTaskScore(await fetchText(url)) * 100;
        maximumScoreRecord[taskAlphabet] = score;
        if (cache) {
            cache[taskAlphabet].maximumScore = score;
        }
    } catch (e) {
        console.error(`Cannot get the score point from ${url}`);
    }
}

let contestStartTimerEnabled = false;

function generateTaskInfo(standings: AtCoderVueStandings["standings"]): TaskInfo {
    const started = contestIsStarted();
    if (!started) {
        if (!contestStartTimerEnabled) {
            contestStartTimerEnabled = true;
            const timerId = setInterval(() => {
                if (contestIsStarted()) {
                    for (const task of standings.TaskInfo) {
                        getAndRecordMaximumScore(task.Assignment, task.TaskScreenName);
                    }
                    clearInterval(timerId);
                }
            }, 1000);
        }
    }

    const result: TaskInfo = {};
    for (const info of standings.TaskInfo) {
        const alphabet = info.Assignment;
        const screenName = info.TaskScreenName;

        let maximumScore = 0;
        if (started) {
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
        }

        result[alphabet] = { screenName, maximumScore };
    }
    return result;
}

export function getTaskInfo() {
    const currentStandings = vueStandings.standings;
    // Check if standings has been updated
    if (cache && currentStandings === previousStandings) return cache;
    previousStandings = currentStandings;
    return cache = generateTaskInfo(currentStandings);
};


function contestIsStarted() {
    return internalTimeToJsDate(getServerTime()).getTime() >= internalTimeToJsDate(startTime).getTime();
}
