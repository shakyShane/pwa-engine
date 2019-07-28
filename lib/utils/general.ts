export function assertUnreachable(msg = "Didn't expect to get here"): never {
    throw new Error(msg);
}
