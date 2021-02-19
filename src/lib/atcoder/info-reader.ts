export function readTaskScore(pageSource: string): number {
    const match = pageSource.match(/(?:配点|Score).*<var>(\d+)<\/var>/);
    if (match) {
        const score = Number(match[1]);
        if (!isNaN(score)) {
            return score;
        }
    }
    throw new Error("Cannot read the score point");
}

export function readRatedRange(pageSource: string): [number, number] {
    const match = pageSource.match(/>[\s\r\n]*(?:Rated対象|Rated Range)[\s\r\n]*:([^<>]*)</);
    if (match) {
        const text = match[1].replace(/[\s\r\n]/g, "").toLowerCase();
        if (text === "-") {
            return [-Infinity, -Infinity];
        } else if (text === "all") {
            return [-Infinity, Infinity];
        }
        const parts = text.split(/-|~/);
        if (parts.length === 2) {
            const parsed = [
                parts[0] === "" ? -Infinity : Number(parts[0]),
                parts[1] === "" ? Infinity : Number(parts[1])
            ] as [number, number];
            if (!isNaN(parsed[0]) && !isNaN(parsed[1])) {
                return parsed;
            }
        }
    }
    throw new Error("Cannot read the rated range");
}
