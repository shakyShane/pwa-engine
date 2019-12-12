export function cheapClone<T>(input: T): T | undefined {
    try {
        return JSON.parse(JSON.stringify(input));
    } catch (e) {
        console.error(e);
        return undefined;
    }
}
