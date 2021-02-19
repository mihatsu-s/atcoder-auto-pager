declare const Vue: {
    nextTick(fn: () => unknown): void
};



interface AtCoderVueStandings {
    page: number;
    perPage: number;
    watchIndex: number;
    readonly pages: number;
    readonly standings: {
        readonly StandingsData: ReadonlyArray<AtCoderStandingsEntry>;
        readonly TaskInfo: ReadonlyArray<AtCoderTaskInfo>;
    };
    readonly filteredStandings: ReadonlyArray<AtCoderStandingsEntry>;
    readonly orderedStandings: ReadonlyArray<AtCoderStandingsEntry>;
    readonly currentStandings: ReadonlyArray<AtCoderStandingsEntry>;

    orderBy: string;
    desc: boolean;
    showInLogScale: boolean;
    readonly comp: (a: AtCoderStandingsEntry, b: AtCoderStandingsEntry) => number;
}

interface AtCoderStandingsEntry {
    readonly DisplayName: string;
    readonly Rank: number;
    readonly EntireRank: number;
    readonly IsRated: boolean;
    readonly IsTeam: boolean;
    readonly OldRating: number;
    readonly TaskResults: { readonly [problemId: string]: AtCoderTaskResult };
    readonly TotalResult: AtCoderStandingsTotalResult;

    readonly UserName: string;
    readonly UserScreenName: string;
    readonly Affiliation: string;
    readonly AtCoderRank: number;
    readonly Rating: number;
    readonly Competitions: number;
    readonly Country: string;
    readonly EndTime: string;
}

interface AtCoderTaskResult {
    readonly Count: number;
    /** nano seconds */
    readonly Elapsed: number;
    readonly Failure: number;
    readonly Frozen: boolean;
    readonly Penalty: number;
    readonly Pending: boolean;
    /** 100 times the displayed score */
    readonly Score: number;
    readonly Status: number;
}

interface AtCoderStandingsTotalResult {
    readonly Accepted: number;
    readonly Count: number;
    /** nano seconds */
    readonly Elapsed: number;
    readonly Frozen: boolean;
    readonly Penalty: number;
    /** 100 times the displayed score */
    readonly Score: number;
}

interface AtCoderTaskInfo {
    readonly Assignment: string;
    readonly TaskName: string;
    readonly TaskScreenName: string;
}

declare const vueStandings: AtCoderVueStandings;

declare const LOG_BASE: number;



interface AtCoderVueResults {
    page: number;
    perPage: number;
    watchIndex: number;
    readonly filteredResults: ReadonlyArray<AtCoderResultsEntry>;
    readonly orderedResults: ReadonlyArray<AtCoderResultsEntry>;

    orderBy: string;
    desc: boolean;
    readonly comp: (a: AtCoderResultsEntry, b: AtCoderResultsEntry) => number;
}

interface AtCoderResultsEntry {
    readonly DisplayName: string;
    readonly Rank: number;
    readonly Place: number;
    readonly Performance: number;
    readonly OldRating: number;
    readonly NewRating: number;
    readonly Difference: number;
    readonly IsRated: boolean;

    readonly UserName: string;
    readonly UserScreenName: string;
    readonly Affiliation: string;
    readonly AtCoderRank: number;
    readonly Rating: number;
    readonly Competitions: number;
    readonly Country: string;
    readonly EndTime: string;
}

declare const vueResults: AtCoderVueResults;
