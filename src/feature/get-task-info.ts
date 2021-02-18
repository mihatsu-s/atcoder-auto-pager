import { getTaskScore } from "../lib/atcoder/get-task-score";
import { TaskInfo } from "./pager/standings-order";

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

export function getTaskInfo() {
    const currentStandings = vueStandings.standings;
    // Check if standings has been updated
    if (cache && currentStandings === previousStandings) return cache;
    previousStandings = currentStandings;
    return cache = generateTaskInfo(currentStandings);
};
