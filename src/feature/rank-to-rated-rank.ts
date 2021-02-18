let cache: number[] | null = null;
let previousStandings: AtCoderVueStandings["standings"] | null = null;


export function getRankToRatedRankMap(): number[] {
    const currentStandings = vueStandings.standings;
    // Check if standings has been updated
    if (cache && currentStandings === previousStandings) return cache;
    previousStandings = currentStandings;
    return cache = generateRankToRatedRankMap(currentStandings);
}


function generateRankToRatedRankMap(standings: AtCoderVueStandings["standings"]): number[] {
    const data = standings.StandingsData;
    const size = data.length;
    const result = Array(size) as number[];

    let ratedRank = 0;
    let ratedNumOfCurrentRank = 0;
    let unrateds: number[] = [];
    for (let i = 0; i < size; ++i) {
        const rank = data[i].Rank;

        if (data[i].IsRated && data[i].TotalResult.Count > 0) {
            ratedNumOfCurrentRank += 1;
        } else {
            unrateds.push(rank);
        }

        if (i === size - 1 || data[i + 1].Rank !== rank) {
            if (i === size - 1 && ratedNumOfCurrentRank === 0) {
                ratedNumOfCurrentRank = 1;
            }
            if (ratedNumOfCurrentRank > 0) {
                result[rank] = ((ratedRank + 1) + (ratedRank + ratedNumOfCurrentRank)) / 2;

                const unratedsNum = unrateds.filter(r => r !== rank).length;
                function unratedSubRankToRatedRank(subRank: number): number {
                    return ratedRank;
                    // return ratedRank + subRank / (unratedsNum + 1);
                }

                let unratedSubRank = 0;
                let unratedNumOfCurrentSubRank = 0;
                for (let j = 0; j < unratedsNum; ++j) {
                    const rank = unrateds[j];
                    unratedNumOfCurrentSubRank += 1;
                    if (j === unratedsNum - 1 || unrateds[j + 1] !== rank) {
                        const subRank = ((unratedSubRank + 1) + (unratedSubRank + unratedNumOfCurrentSubRank)) / 2;
                        result[rank] = unratedSubRankToRatedRank(subRank);
                        unratedSubRank += unratedNumOfCurrentSubRank;
                        unratedNumOfCurrentSubRank = 0;
                    }
                }

                unrateds = [];
                ratedRank += ratedNumOfCurrentRank;
                ratedNumOfCurrentRank = 0;
            }
        }
    }

    return result;
}
