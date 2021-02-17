export async function getTaskScore(taskUrl: string) {
    const res = await fetch(taskUrl);
    if (res.status !== 200) {
        throw new Error(`Failed to GET ${taskUrl}`);
    }

    const source = await res.text();
    const match = source.match(/(?:配点|Score).*<var>(\d+)<\/var>/);
    const score = match ? Number(match[1]) : NaN;
    if (isNaN(score)) {
        throw new Error(`Cannot read the score point from ${taskUrl}`);
    }

    return score;
}
